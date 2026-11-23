import { useCallback, useEffect, useMemo, useState } from "react";
import { inUse } from "./inUse";
import {
  Banner,
  Button,
  Card,
  CheckboxField,
  DataTable,
  EmptyState,
  FormRow,
  LinkButton,
  ProgressBar,
  SegmentedControl,
  SelectField,
  Stats,
  StatusBadge,
  Tabs,
  TextareaField,
  TextField,
  Toolbar,
  type Column,
} from "../../components";
import { api } from "../../lib/api";
import { buildTree, indentLabel, type CategoryTree } from "../categoryTree";
import { JobProgress } from "./JobProgress";
import type { Ctx } from "./Screens";

/**
 * Descriptions for products the shop already sells. The photo computer (Gleamshelf, `npm run worker`) reads each product's photo, looks the product up and
 * proposes a title, description, series, maker and category; nothing changes on the shop until a person applies a proposal here. Each part has its own
 * tick (the parts asked for in Products > Redo with Gleamshelf start ticked); applying writes the ticked title and description to Square and the series,
 * maker and category to the product. Skipping leaves the product as it was.
 */
interface Proposal {
  /** Older Gleamshelf apps propose no title. */
  title?: string | null;
  description: string;
  series: string | null;
  manufacturer: string | null;
  /** The product line (Gleamshelf apps from November 2026). */
  line?: string | null;
  category: string | null;
  highlights: string[];
  unsupported: string[];
  flags: string[];
  sources: string[];
  lookup: string | null;
  seconds: number | null;
}
type Status = "queued" | "running" | "done" | "failed" | "cancelled" | "applied" | "dismissed";
interface Job {
  id: string;
  productId: string;
  productName: string;
  photoUrl: string | null;
  status: Status;
  progress: number | null;
  step: string | null;
  startedAt: string | null;
  error: string | null;
  proposal: Proposal | null;
  /** What the person asked to redo (Products > Redo with Gleamshelf); null: the description, from this screen. */
  parts?: Part[] | null;
  current: {
    name?: string;
    categoryId?: string | null;
    description: string | null;
    series: string | null;
    manufacturer: string | null;
    line?: string | null;
    category: string | null;
  };
  createdAt: string;
}
interface Worker {
  id: string;
  label: string;
  online: boolean;
  canDescribe: boolean;
  note: string | null;
  lastSeen: string | null;
}
interface Listing {
  jobs: Job[];
  counts: Record<Status, number>;
  missing: number;
  workers: Worker[];
}
/** The parts of a product a proposal can change; "details" is the series and the maker. */
type Part = "title" | "description" | "details" | "category";
interface Edit {
  title: string;
  description: string;
  series: string;
  maker: string;
  line: string;
  categoryId: string;
  /** The parts that will be applied. */
  use: Record<Part, boolean>;
}
type View = "review" | "queue" | "finished";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
/** The shop category whose name matches the proposed one (ignoring case), or null. */
const categoryNamed = (tree: CategoryTree, name: string | null | undefined) => {
  const want = name?.trim().toLowerCase();
  return want ? (tree.flat.find((c) => c.name.trim().toLowerCase() === want) ?? null) : null;
};

/**
 * A proposal as first shown: the proposed title, words and category (the category only when it is one of the shop's), with the parts the person asked
 * for ticked (from this screen: the description, series and maker). A part the proposal has nothing for starts unticked.
 */
const editOf = (j: Job, tree: CategoryTree): Edit => {
  const p = j.proposal;
  const asked = new Set<Part>(j.parts ?? ["description", "details"]);
  const category = categoryNamed(tree, p?.category);
  return {
    title: p?.title ?? j.current.name ?? j.productName,
    description: p?.description ?? "",
    series: p?.series ?? j.current.series ?? "",
    maker: p?.manufacturer ?? j.current.manufacturer ?? "",
    line: p?.line ?? j.current.line ?? "",
    categoryId: category?.id ?? j.current.categoryId ?? "",
    use: {
      title: asked.has("title") && !!p?.title,
      description: asked.has("description") && !!p?.description,
      details: asked.has("details"),
      category: asked.has("category") && !!category,
    },
  };
};

/** The body for applying: only the ticked parts; the series and maker only when they differ from what the product has now. */
function applyBody(j: Job, e: Edit) {
  const body: Record<string, string | null> = {};
  if (e.use.title) body.title = e.title.trim();
  if (e.use.description) body.description = e.description.trim();
  if (e.use.details) {
    if (e.series.trim() !== (j.current.series ?? "")) body.series = e.series.trim() || null;
    if (e.maker.trim() !== (j.current.manufacturer ?? "")) body.manufacturer = e.maker.trim() || null;
    if (e.line.trim() !== (j.current.line ?? "")) body.product_line = e.line.trim() || null;
  }
  if (e.use.category && e.categoryId !== (j.current.categoryId ?? "")) body.category_id = e.categoryId || null;
  return body;
}

export function DescriptionsScreen({ ctx }: { ctx: Ctx }) {
  const [view, setView] = useState<View>("review");
  const [data, setData] = useState<Listing | null>(null);
  const [finished, setFinished] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [howMany, setHowMany] = useState<"50" | "200" | "all">("200");
  const [sending, setSending] = useState(false);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const tree = useMemo(() => buildTree(ctx.data.categories), [ctx.data.categories]);

  const load = useCallback(async () => {
    try {
      setData(await api<Listing>("/admin/describe-jobs"));
      setError(null);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  // while the photo computer has work, look again every ten seconds
  const active = (data?.counts.queued ?? 0) + (data?.counts.running ?? 0) > 0;
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => inUse() && void load(), 30_000);
    return () => window.clearInterval(t);
  }, [active, load]);
  useEffect(() => {
    if (view !== "finished") return;
    api<Listing>("/admin/describe-jobs?status=finished")
      .then((r) => setFinished(r.jobs))
      .catch((e) => setError(errMsg(e)));
  }, [view, data]);

  const review = data?.jobs.filter((j) => j.status === "done") ?? [];
  const queue = data?.jobs.filter((j) => j.status !== "done") ?? [];
  const counts = data?.counts;
  const worker = data?.workers.find((w) => w.canDescribe) ?? data?.workers.find((w) => w.online) ?? data?.workers[0] ?? null;
  const edit = (j: Job) => edits[j.id] ?? editOf(j, tree);
  const setEdit = (j: Job, change: Partial<Edit>) =>
    setEdits((all) => ({ ...all, [j.id]: { ...(all[j.id] ?? editOf(j, tree)), ...change } }));
  const busy = (id: string, on: boolean) =>
    setWorking((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  const drop = (id: string) => {
    setData((d) =>
      d ? { ...d, jobs: d.jobs.filter((j) => j.id !== id), counts: { ...d.counts, done: Math.max(0, d.counts.done - 1) } } : d,
    );
    setPicked((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  const send = async () => {
    setSending(true);
    try {
      const r = await api<{ queued: number; noPhoto: number; alreadyQueued: number }>("/admin/describe-jobs", {
        method: "POST",
        body: JSON.stringify({ missing: true, limit: howMany === "all" ? 2000 : Number(howMany) }),
      });
      const extra = [
        r.noPhoto ? `${plural(r.noPhoto, "product")} without a photo left out` : "",
        r.alreadyQueued ? `${r.alreadyQueued} already in the queue` : "",
      ]
        .filter(Boolean)
        .join("; ");
      ctx.flash(
        r.queued
          ? `${plural(r.queued, "product")} sent to the photo computer${extra ? ` (${extra})` : ""}`
          : `Nothing new to send${extra ? `: ${extra}` : ""}`,
      );
      await load();
      if (r.queued) setView("queue");
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setSending(false);
    }
  };
  const apply = async (j: Job) => {
    const e = edit(j);
    if (e.use.description && e.description.trim().length < 20) {
      ctx.flash(`${j.productName}: write a description of at least a sentence.`);
      return false;
    }
    if (e.use.title && e.title.trim().length < 3) {
      ctx.flash(`${j.productName}: write a title.`);
      return false;
    }
    const body = applyBody(j, e);
    if (!Object.keys(body).length) {
      ctx.flash(`${j.productName}: tick what to apply, or skip it (nothing ticked differs from the product now).`);
      return false;
    }
    busy(j.id, true);
    try {
      await api(`/admin/describe-jobs/${j.id}/apply`, { method: "POST", body: JSON.stringify(body) });
      drop(j.id);
      return true;
    } catch (err) {
      ctx.flash(`${j.productName}: ${errMsg(err)}`);
      return false;
    } finally {
      busy(j.id, false);
    }
  };
  const act = async (j: Job, what: "dismiss" | "cancel" | "retry", done: string) => {
    busy(j.id, true);
    try {
      await api(`/admin/describe-jobs/${j.id}/${what}`, { method: "POST" });
      ctx.flash(done);
      if (what === "dismiss") drop(j.id);
      await load();
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      busy(j.id, false);
    }
  };
  const applyPicked = async () => {
    const list = review.filter((j) => picked.has(j.id));
    setBulk({ done: 0, total: list.length });
    let ok = 0;
    for (const [i, j] of list.entries()) {
      if (await apply(j)) ok++;
      setBulk({ done: i + 1, total: list.length });
    }
    setBulk(null);
    ctx.flash(`${plural(ok, "proposal")} applied${ok < list.length ? `; ${list.length - ok} still waiting` : ""}`);
    await load();
  };
  const clearQueue = async () => {
    try {
      const r = await api<{ cancelled: number }>("/admin/describe-jobs/cancel-queued", { method: "POST" });
      ctx.flash(`${plural(r.cancelled, "product")} taken out of the queue`);
      await load();
    } catch (e) {
      ctx.flash(errMsg(e));
    }
  };

  if (!data)
    return error ? (
      <Banner tone="error" action={{ label: "Retry", onClick: () => void load() }}>
        {error}
      </Banner>
    ) : (
      <EmptyState>Loading…</EmptyState>
    );

  const inQueue = (counts?.queued ?? 0) + (counts?.running ?? 0);
  return (
    <>
      {error && (
        <Banner tone="error" action={{ label: "Retry", onClick: () => void load() }}>
          {error}
        </Banner>
      )}
      {!worker?.online ? (
        <Banner>
          The photo computer is off, so products wait in the queue. Start it in the Gleamshelf folder with <code>npm run worker</code>; it
          works through them one at a time (about a minute each) and you review the proposals here.
        </Banner>
      ) : !worker.canDescribe ? (
        <Banner>
          The photo computer ({worker.label}) is on but can't write descriptions right now{worker.note ? `: ${worker.note}` : ""}.
        </Banner>
      ) : null}

      <Stats
        items={[
          { label: "Without a description", value: data.missing, note: "products shoppers can see" },
          { label: "Waiting for you", value: counts?.done ?? 0, note: "proposals to apply or skip", onClick: () => setView("review") },
          {
            label: "In the queue",
            value: inQueue,
            note: worker?.online ? `${worker.label} is working` : "photo computer off",
            onClick: () => setView("queue"),
          },
          { label: "Applied", value: counts?.applied ?? 0, note: "descriptions now in the shop", onClick: () => setView("finished") },
        ]}
      />

      <Card title="Write descriptions" padded>
        <p style={{ margin: 0 }} className="ui-text2">
          The photo computer reads each product's photo, looks the product up online and proposes a title, description, series, maker and
          category. It runs on the shop's own computer, so it's free. Nothing changes in the shop until you apply a proposal. For a new
          title or category, tick products in Products and press Redo with Gleamshelf.
        </p>
        <Toolbar>
          <SegmentedControl
            label="How many"
            size="sm"
            value={howMany}
            onChange={setHowMany}
            options={[
              { value: "50", label: "50" },
              { value: "200", label: "200" },
              { value: "all", label: "All" },
            ]}
          />
          <Button onClick={send} loading={sending} disabled={!data.missing}>
            {sending
              ? "Sending…"
              : `Describe ${howMany === "all" ? `all ${data.missing}` : Math.min(Number(howMany), data.missing)} without one`}
          </Button>
          {(counts?.queued ?? 0) > 0 && (
            <LinkButton danger onClick={clearQueue}>
              Clear the queue ({counts?.queued})
            </LinkButton>
          )}
        </Toolbar>
      </Card>

      <Tabs
        label="Descriptions"
        value={view}
        onChange={setView}
        items={[
          { key: "review", label: "To review", count: review.length },
          { key: "queue", label: "In the queue", count: queue.length },
          { key: "finished", label: "Done" },
        ]}
      />

      {view === "review" &&
        (review.length === 0 ? (
          <EmptyState title="Nothing to review">
            {inQueue
              ? `The photo computer is working on ${plural(inQueue, "product")}. Proposals appear here as they're ready.`
              : "Send products above, and their proposed descriptions appear here."}
          </EmptyState>
        ) : (
          <>
            <Toolbar>
              <CheckboxField
                label={`Tick all ${review.length}`}
                checked={picked.size === review.length}
                indeterminate={picked.size > 0 && picked.size < review.length}
                onChange={() => setPicked(picked.size === review.length ? new Set() : new Set(review.map((j) => j.id)))}
              />
              <Button size="sm" disabled={!picked.size || !!bulk} loading={!!bulk} onClick={applyPicked}>
                {bulk ? `Applying ${bulk.done} of ${bulk.total}…` : `Apply ${picked.size ? `${picked.size} ` : ""}ticked`}
              </Button>
              <span className="ui-muted ui-sm">Read each one first: the photo computer can misread a box.</span>
            </Toolbar>
            {bulk && <ProgressBar value={(bulk.done / bulk.total) * 100} label="Applying" note={`${bulk.done} of ${bulk.total}`} />}
            {review.map((j) => (
              <ProposalCard
                key={j.id}
                job={j}
                tree={tree}
                edit={edit(j)}
                onEdit={(c) => setEdit(j, c)}
                picked={picked.has(j.id)}
                busy={working.has(j.id)}
                onPick={(on) =>
                  setPicked((s) => {
                    const n = new Set(s);
                    if (on) n.add(j.id);
                    else n.delete(j.id);
                    return n;
                  })
                }
                onApply={async () => {
                  if (await apply(j)) ctx.flash(`Applied to ${j.productName}`);
                }}
                onSkip={() => act(j, "dismiss", "Skipped: the product is unchanged")}
              />
            ))}
          </>
        ))}

      {view === "queue" && (
        <DataTable
          label="Products in the queue"
          rows={queue}
          rowKey={(j) => j.id}
          minWidth={640}
          roomy
          empty="Nothing in the queue. Send products above."
          columns={queueColumns(working, act)}
        />
      )}

      {view === "finished" && (
        <DataTable
          label="Products done"
          rows={finished ?? []}
          rowKey={(j) => j.id}
          loading={finished === null}
          minWidth={560}
          roomy
          empty="Nothing applied or skipped yet."
          columns={finishedColumns(working, act)}
        />
      )}
    </>
  );
}

type Act = (j: Job, what: "dismiss" | "cancel" | "retry", done: string) => Promise<void>;

function Product({ j }: { j: Job }) {
  return (
    <span className="ad-describe__product">
      <span className="sh-thumb" style={{ width: 40, height: 40 }}>
        {j.photoUrl && <img src={j.photoUrl} alt="" loading="lazy" />}
      </span>
      <span className="ui-ellipsis">{j.productName}</span>
    </span>
  );
}

const queueColumns = (working: Set<string>, act: Act): Column<Job>[] => [
  { key: "product", header: "Product", width: "minmax(220px, 2fr)", render: (j) => <Product j={j} /> },
  {
    key: "status",
    header: "Status",
    width: "minmax(220px, 1.4fr)",
    render: (j) =>
      j.status === "running" ? (
        <JobProgress progress={j.progress} step={j.step} startedAt={j.startedAt} />
      ) : j.status === "failed" ? (
        <span className="ui-row-gap">
          <StatusBadge tone="bad">Failed</StatusBadge>
          <span className="ui-sm ui-muted">{j.error}</span>
        </span>
      ) : (
        <StatusBadge>Waiting</StatusBadge>
      ),
  },
  {
    key: "action",
    header: "",
    width: "110px",
    align: "right",
    render: (j) =>
      j.status === "queued" ? (
        <LinkButton disabled={working.has(j.id)} onClick={() => act(j, "cancel", "Taken out of the queue")}>
          Cancel
        </LinkButton>
      ) : j.status === "failed" ? (
        <LinkButton disabled={working.has(j.id)} onClick={() => act(j, "retry", "Back in the queue")}>
          Ask again
        </LinkButton>
      ) : null,
  },
];

const finishedColumns = (working: Set<string>, act: Act): Column<Job>[] => [
  { key: "product", header: "Product", width: "minmax(220px, 2fr)", render: (j) => <Product j={j} /> },
  {
    key: "status",
    header: "Result",
    width: "130px",
    render: (j) => (j.status === "applied" ? <StatusBadge tone="good">Applied</StatusBadge> : <StatusBadge>Skipped</StatusBadge>),
  },
  {
    key: "action",
    header: "",
    width: "110px",
    align: "right",
    render: (j) =>
      j.status === "dismissed" ? (
        <LinkButton disabled={working.has(j.id)} onClick={() => act(j, "retry", "Back in the queue")}>
          Ask again
        </LinkButton>
      ) : null,
  },
];

/**
 * One proposal: the product's photo, what it has now, and the proposed title, description, series and maker, and category, all editable, each with a
 * tick for whether it is applied, with where the facts came from.
 */
function ProposalCard({
  job: j,
  tree,
  edit,
  onEdit,
  picked,
  onPick,
  busy,
  onApply,
  onSkip,
}: {
  job: Job;
  tree: CategoryTree;
  edit: Edit;
  onEdit: (change: Partial<Edit>) => void;
  picked: boolean;
  onPick: (on: boolean) => void;
  busy: boolean;
  onApply: () => void;
  onSkip: () => void;
}) {
  const p = j.proposal!;
  const use = (part: Part, on: boolean) => onEdit({ use: { ...edit.use, [part]: on } });
  const notes = [...p.flags, ...(p.unsupported.length ? [`Not found online: ${p.unsupported.join(", ")}`] : [])];
  return (
    <Card title={j.productName} action={<CheckboxField label="Tick" checked={picked} onChange={(e) => onPick(e.target.checked)} />} padded>
      <div className="ad-describe">
        <div className="ad-describe__photo">
          {j.photoUrl ? <img src={j.photoUrl} alt={j.productName} loading="lazy" /> : <span className="ui-muted ui-sm">No photo</span>}
        </div>
        <div className="ad-describe__main">
          <CheckboxField
            label={p.title ? "Use the new title" : "Use a new title (Gleamshelf proposed none: type one)"}
            checked={edit.use.title}
            onChange={(e) => use("title", e.target.checked)}
          />
          {(edit.use.title || p.title) && (
            <TextField
              label="Title"
              hint={j.current.name && j.current.name !== edit.title ? `now: ${j.current.name}` : undefined}
              maxLength={255}
              value={edit.title}
              disabled={!edit.use.title}
              onChange={(e) => onEdit({ title: e.target.value })}
            />
          )}
          <CheckboxField
            label="Use the new description"
            checked={edit.use.description}
            onChange={(e) => use("description", e.target.checked)}
          />
          <p className="ad-describe__now ui-sm">
            <b>Now:</b> {j.current.description?.trim() ? j.current.description : <span className="ui-muted">no description</span>}
          </p>
          <TextareaField
            label="Proposed description"
            hint="shown to shoppers"
            rows={5}
            maxLength={4000}
            value={edit.description}
            disabled={!edit.use.description}
            onChange={(e) => onEdit({ description: e.target.value })}
          />
          <CheckboxField
            label="Use the series, maker and product line"
            checked={edit.use.details}
            onChange={(e) => use("details", e.target.checked)}
          />
          <FormRow>
            <TextField
              label="Series"
              hint={j.current.series && j.current.series !== edit.series ? `now: ${j.current.series}` : undefined}
              value={edit.series}
              disabled={!edit.use.details}
              onChange={(e) => onEdit({ series: e.target.value })}
            />
            <TextField
              label="Maker"
              hint={p.manufacturer ? "read off the box: check it" : undefined}
              placeholder="e.g. Good Smile Company"
              value={edit.maker}
              disabled={!edit.use.details}
              onChange={(e) => onEdit({ maker: e.target.value })}
            />
            <TextField
              label="Product line"
              hint={j.current.line && j.current.line !== edit.line ? `now: ${j.current.line}` : undefined}
              placeholder="e.g. Relax Time"
              value={edit.line}
              disabled={!edit.use.details}
              onChange={(e) => onEdit({ line: e.target.value })}
            />
          </FormRow>
          <CheckboxField label="Use the category" checked={edit.use.category} onChange={(e) => use("category", e.target.checked)} />
          <SelectField
            label="Category"
            hint={[
              p.category
                ? categoryNamed(tree, p.category)
                  ? `proposed: ${p.category}`
                  : `proposed: ${p.category} (not one of the shop's: pick one)`
                : "none proposed",
              j.current.categoryId !== undefined
                ? `now: ${j.current.categoryId ? (tree.byId.get(j.current.categoryId)?.name ?? "?") : "none"}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            placeholder="— No category —"
            options={tree.flat.map((c) => ({ value: c.id, label: indentLabel(c) }))}
            value={edit.categoryId}
            disabled={!edit.use.category}
            onChange={(e) => onEdit({ categoryId: e.target.value })}
          />
          {(p.lookup || notes.length > 0) && (
            <ul className="ad-describe__notes ui-sm">
              {p.lookup && <li className="ui-muted">{p.lookup}</li>}
              {notes.map((n) => (
                <li key={n}>⚠ {n}</li>
              ))}
            </ul>
          )}
          {p.sources.length > 0 && (
            <div className="ui-sm ui-muted ad-describe__sources">
              Sources:{" "}
              {p.sources.map((s, i) => (
                <span key={s}>
                  {i > 0 && " · "}
                  <a href={s} target="_blank" rel="noreferrer">
                    {host(s)}
                  </a>
                </span>
              ))}
            </div>
          )}
          <div className="ui-form-actions">
            <Button variant="ghost" size="sm" onClick={onSkip} disabled={busy}>
              Skip
            </Button>
            <Button size="sm" onClick={onApply} loading={busy}>
              {busy ? "Applying…" : "Apply"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

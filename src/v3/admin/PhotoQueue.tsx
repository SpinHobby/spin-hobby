import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useEscape } from "../hooks";
import { JobProgress } from "./JobProgress";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

type JobStatus = "queued" | "running" | "done" | "failed" | "applied" | "rejected" | "cancelled";
interface Options { mode: "product" | "character"; stickers: boolean; enlarge: boolean; look: boolean }
interface Batch { id: string; createdAt: string; scope: "main" | "all"; options: Options; counts: Record<JobStatus, number> }
interface Worker { id: string; label: string; lastSeen: string | null; online: boolean; canImprovePhotos: boolean; working: number }
interface Job { id: string; productId: string; productName: string; status: JobStatus; before: string; after: string | null; flags: string[]; notes: string[]; seconds: number | null; error: string | null; progress: number | null; step: string | null; startedAt: string | null }

/** The products that were left out, one line per reason, in words an admin can act on. */
function groupSkipped(skipped: { name: string; reason: string }[]) {
  const words = (reason: string) => (/kept in our database/i.test(reason) ? "their photos are kept in our own database, not in Square, so change them in each product's own photo area" : reason.replace(/\.$/, ""));
  const groups = new Map<string, string[]>();
  for (const s of skipped) groups.set(words(s.reason), [...(groups.get(words(s.reason)) ?? []), s.name]);
  return [...groups].map(([reason, names]) => ({ reason, names }));
}

const sum = (c: Record<JobStatus, number>) => Object.values(c).reduce((a, b) => a + b, 0);
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  return min < 1 ? "just now" : min < 60 ? `${min} min ago` : min < 1440 ? `${Math.floor(min / 60)} h ago` : `${Math.floor(min / 1440)} days ago`;
};
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * "Improve photos": sends the photos of the selected products to the photo computer (the Gleamshelf app on the shop's own computer), which cleans them up at the best
 * quality, usually overnight. Nothing on the website changes until each result has been looked at (Photos screen).
 */
export function ImprovePhotosDialog({ productIds, ctx, onClose }: { productIds: string[]; ctx: Ctx; onClose: () => void }) {
  const [stickers, setStickers] = useState(true);
  const [enlarge, setEnlarge] = useState(true);
  const [look, setLook] = useState(true);
  const [scope, setScope] = useState<"main" | "all">("main");
  const [mode, setMode] = useState<"product" | "character">("product");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ queued: number; alreadyQueued: number; skipped: { name: string; reason: string }[] } | null>(null);
  useEscape(onClose);

  const send = async () => {
    setBusy(true);
    try {
      setDone(await api("/admin/photo-batches", { method: "POST", body: JSON.stringify({ productIds, scope, options: { mode, stickers, enlarge, look } }) }));
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer ad-photoq-dialog" role="dialog" aria-modal="true" aria-label="Improve photos">
        <div className="sh-drawer__head"><span>Improve photos</span><button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="sh-drawer__body ad-photoq">
          {done ? (
            <>
              <p className="ad-photoq__big">{done.queued > 0 ? `${done.queued} photo${done.queued === 1 ? "" : "s"} sent to the photo computer.` : "Nothing new was sent."}</p>
              <p className="ad-muted">
                {done.queued > 0 && "They are done one by one, usually overnight. Open the Photos screen to see how far it has got and to check each result. Nothing on the website changes until you say yes."}
                {done.alreadyQueued > 0 && ` ${done.alreadyQueued} photo${done.alreadyQueued === 1 ? " was" : "s were"} already waiting, so ${done.alreadyQueued === 1 ? "it was" : "they were"} left as it is.`}
              </p>
              {groupSkipped(done.skipped).map((g) => (
                <details key={g.reason} className="ad-photoq__skipped">
                  <summary>{g.names.length} product{g.names.length === 1 ? "" : "s"} left out: {g.reason}</summary>
                  <ul>{g.names.map((n) => <li key={n}>{n}</li>)}</ul>
                </details>
              ))}
              <div className="ad-imports__actions">
                <button type="button" className="sh-btn" onClick={() => { onClose(); ctx.go("Photos"); }}>Go to Photos</button>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Close</button>
              </div>
            </>
          ) : (
            <>
              <p><b>{productIds.length} product{productIds.length === 1 ? "" : "s"}</b> selected. Their photos are cleaned up on the photo computer: the background is removed and the product is placed on a clean white square.</p>
              <p className="ad-muted ad-sm">Nothing on the website changes until you have looked at each new photo and said yes. The old photo is always kept.</p>

              <div className="ad-label">Which photos</div>
              <label className="ad-check"><input type="radio" name="scope" checked={scope === "main"} onChange={() => setScope("main")} /> The main photo of each product</label>
              <label className="ad-check"><input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} /> Every photo of each product</label>

              <div className="ad-label">What to keep</div>
              <label className="ad-check"><input type="radio" name="mode" checked={mode === "product"} onChange={() => setMode("product")} /> The whole box or product <small className="ad-muted">(recommended)</small></label>
              <label className="ad-check"><input type="radio" name="mode" checked={mode === "character"} onChange={() => setMode("character")} /> Only the character on the box cover</label>

              <div className="ad-label">Also</div>
              <label className="ad-check"><input type="checkbox" checked={stickers} onChange={(e) => setStickers(e.target.checked)} /> Take off our price stickers</label>
              <label className="ad-check"><input type="checkbox" checked={enlarge} onChange={(e) => setEnlarge(e.target.checked)} /> Make the picture sharper and bigger <small className="ad-muted">(best quality, takes longer)</small></label>
              <label className="ad-check"><input type="checkbox" checked={look} onChange={(e) => setLook(e.target.checked)} /> Brighter, livelier colours</label>

              <div className="ad-imports__actions">
                <button type="button" className="sh-btn" onClick={send} disabled={busy}>{busy ? "Sending…" : "Send to the photo computer"}</button>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

const LABEL: Record<JobStatus, string> = { queued: "Waiting", running: "Being worked on", done: "Ready to check", failed: "Problem", applied: "In use", rejected: "Not used", cancelled: "Cancelled" };

/** The photo queue: how far each batch has got, and the new photos to check before they are used. */
export function PhotosScreen({ ctx }: { ctx: Ctx }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [help, setHelp] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ batches: Batch[]; workers: Worker[] }>("/admin/photo-batches");
      setBatches(r.batches); setWorkers(r.workers);
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setLoaded(true); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  // while anything is waiting or being worked on, look again every 20 seconds
  const busy = batches.some((b) => b.counts.queued + b.counts.running > 0);
  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(t);
  }, [busy, load]);

  const online = workers.filter((w) => w.online && w.canImprovePhotos);
  const waiting = batches.reduce((n, b) => n + b.counts.queued, 0);

  if (open) return <ReviewScreen batchId={open} ctx={ctx} onBack={() => { setOpen(null); void load(); }} />;

  return (
    <>
      <div className="ad-toolbar">
        <div className="ad-muted ad-sm" style={{ flex: "1 1 320px" }}>
          Better photos for many products at once. In <b>Products</b>, tick the products and press <b>Improve photos</b>. The photo computer works through them one by one (leave it running overnight), and you check the results here before anything changes.
        </div>
        <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setHelp((v) => !v)}>{help ? "Hide set-up" : "Set-up help"}</button>
      </div>

      <section className={`ad-card ad-photoq__status ${online.length ? "is-on" : "is-off"}`}>
        <span className="ad-dot" style={{ background: online.length ? "#3fbf92" : "var(--gold)" }} />
        <div>
          {online.length
            ? <><b>The photo computer is on</b>{online.some((w) => w.working) ? " and working." : " and waiting for photos."} <span className="ad-muted ad-sm">{online.map((w) => w.label).join(", ")}</span></>
            : <><b>The photo computer is off or not connected.</b> {waiting > 0 ? `${waiting} photo${waiting === 1 ? " is" : "s are"} waiting for it. ` : ""}<span className="ad-muted ad-sm">{workers.length ? `Last seen ${ago(workers[0]?.lastSeen ?? null)} (${workers[0]?.label}). ` : ""}Start it on the gaming PC and the waiting photos will be done.</span></>}
        </div>
      </section>

      {help && (
        <section className="ad-card ad-photoq__help">
          <div className="ad-label">Setting up the photo computer (once)</div>
          <ol>
            <li>On the gaming PC, install Gleamshelf (ask whoever set it up for you).</li>
            <li>In <b>Imports</b>, press <b>Connect the app</b> (owner only) and type the address and code it shows into Gleamshelf.</li>
            <li>Start the photo computer and leave the window open: <code>npm run worker</code>. It can run all night and picks up where it stopped.</li>
          </ol>
        </section>
      )}

      {!loaded && <div className="ad-card"><div className="ad-empty">Loading…</div></div>}
      {loaded && batches.length === 0 && <section className="ad-card"><div className="ad-empty">Nothing sent yet. In Products, tick some products and press Improve photos.</div></section>}
      <div className="ad-imports">
        {batches.map((b) => <BatchCard key={b.id} batch={b} onOpen={() => setOpen(b.id)} />)}
      </div>
    </>
  );
}

function BatchCard({ batch: b, onOpen }: { batch: Batch; onOpen: () => void }) {
  const total = sum(b.counts);
  const finished = total - b.counts.queued - b.counts.running;
  const pct = total ? Math.round((finished / total) * 100) : 0;
  return (
    <section className="ad-card ad-photoq__batch">
      <div className="ad-photoq__head">
        <b>{total} photo{total === 1 ? "" : "s"}</b>
        <span className="ad-muted ad-sm">sent {when(b.createdAt)} · {b.scope === "all" ? "every photo" : "main photos"}</span>
      </div>
      <div className="ad-photoq__bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress"><span style={{ width: `${pct}%` }} /></div>
      <div className="ad-chips">
        {(["queued", "running", "done", "applied", "rejected", "failed", "cancelled"] as JobStatus[]).filter((s) => b.counts[s] > 0).map((s) => (
          <span key={s} className={`sh-chip ad-photoq__chip is-${s}`}>{b.counts[s]} {LABEL[s].toLowerCase()}</span>
        ))}
      </div>
      <div className="ad-imports__actions">
        <button type="button" className="sh-btn ad-btn-sm" onClick={onOpen}>{b.counts.done > 0 ? `Check ${b.counts.done} new photo${b.counts.done === 1 ? "" : "s"}` : "Open"}</button>
      </div>
    </section>
  );
}

function ReviewScreen({ batchId, ctx, onBack }: { batchId: string; ctx: Ctx; onBack: () => void }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [onlyLook, setOnlyLook] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  useEscape(() => setZoom(null));

  const load = useCallback(async () => {
    try { setJobs((await api<{ batch: { jobs: Job[] } }>(`/admin/photo-batches/${batchId}`)).batch.jobs); }
    catch (e) { ctx.flash(errMsg(e)); }
  }, [batchId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  const working = jobs?.some((j) => j.status === "queued" || j.status === "running");
  const running = jobs?.some((j) => j.status === "running");
  useEffect(() => {
    if (!working) return;
    // a photo being worked on: look every 5 seconds, so its progress bar moves; otherwise every 20
    const t = window.setInterval(() => void load(), running ? 5_000 : 20_000);
    return () => window.clearInterval(t);
  }, [working, running, load]);

  const ready = useMemo(() => (jobs ?? []).filter((j) => j.status === "done"), [jobs]);
  const shown = (jobs ?? []).filter((j) => !onlyLook || j.flags.length > 0 || j.status === "failed");

  const act = async (job: Job, what: "apply" | "reject" | "retry") => {
    setBusy(job.id);
    try {
      await api(`/admin/photo-batches/photos/${job.id}/${what}`, { method: "POST" });
      if (what === "apply") { ctx.flash(`${job.productName}: new photo is now in use`); ctx.reload(); }
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(null); void load(); }
  };
  const applyAll = async () => {
    if (!window.confirm(`Use ${ready.length} new photo${ready.length === 1 ? "" : "s"}? Each one takes the place of the product's old photo. The old photos are kept and can be brought back from the product's photos.`)) return;
    setBusy("all");
    try {
      const r = await api<{ applied: number; failed: { product: string; error: string }[] }>(`/admin/photo-batches/${batchId}/apply`, { method: "POST", body: JSON.stringify({}) });
      ctx.flash(r.failed.length ? `${r.applied} used, ${r.failed.length} could not be used: ${r.failed[0]!.product}: ${r.failed[0]!.error}` : `${r.applied} new photo${r.applied === 1 ? "" : "s"} in use`);
      ctx.reload();
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(null); void load(); }
  };
  const cancel = async () => {
    try { const r = await api<{ cancelled: number }>(`/admin/photo-batches/${batchId}/cancel`, { method: "POST" }); ctx.flash(`${r.cancelled} waiting photo${r.cancelled === 1 ? "" : "s"} taken out of the queue`); }
    catch (e) { ctx.flash(errMsg(e)); }
    finally { void load(); }
  };

  return (
    <>
      <div className="ad-toolbar">
        <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={onBack}>← All batches</button>
        <div style={{ flex: "1 1 200px" }} />
        <label className="ad-check"><input type="checkbox" checked={onlyLook} onChange={(e) => setOnlyLook(e.target.checked)} /> Only photos that need a look</label>
        {jobs?.some((j) => j.status === "queued") && <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={cancel}>Stop the waiting ones</button>}
        <button type="button" className="sh-btn ad-add-btn" onClick={applyAll} disabled={!ready.length || busy !== null}>{busy === "all" ? "Working…" : `Use all ${ready.length} ready photo${ready.length === 1 ? "" : "s"}`}</button>
      </div>
      {!jobs && <div className="ad-card"><div className="ad-empty">Loading…</div></div>}
      <div className="ad-photoq__grid">
        {shown.map((j) => (
          <section key={j.id} className={`ad-card ad-photoq__job is-${j.status}`}>
            <div className="ad-photoq__pair">
              <figure><img src={j.before} alt={`${j.productName}, before`} loading="lazy" onClick={() => setZoom(j.before)} /><figcaption>Before</figcaption></figure>
              <figure>{j.after ? <img src={j.after} alt={`${j.productName}, after`} loading="lazy" onClick={() => setZoom(j.after)} /> : <div className="ad-photoq__none">{j.status === "applied" ? "In use" : LABEL[j.status]}</div>}<figcaption>After</figcaption></figure>
            </div>
            <div className="ad-photoq__info">
              <b>{j.productName || "Product"}</b>
              {j.status === "running" ? <JobProgress progress={j.progress} step={j.step} startedAt={j.startedAt} /> : <span className={`sh-chip ad-photoq__chip is-${j.status}`}>{LABEL[j.status]}</span>}
              {j.flags.length > 0 && <ul className="ad-imports__flags">{j.flags.map((f) => <li key={f}>{f}</li>)}</ul>}
              {j.error && <div className="ad-imports__flags">{j.error}</div>}
              <div className="ad-imports__actions">
                {j.status === "done" && <><button type="button" className="sh-btn ad-btn-sm" disabled={busy !== null} onClick={() => act(j, "apply")}>Use this photo</button><button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" disabled={busy !== null} onClick={() => act(j, "reject")}>Don't use</button></>}
                {(j.status === "failed" || j.status === "rejected") && <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" disabled={busy !== null} onClick={() => act(j, "retry")}>Try again</button>}
              </div>
            </div>
          </section>
        ))}
        {jobs && shown.length === 0 && <section className="ad-card"><div className="ad-empty">{onlyLook ? "Nothing needs a look." : "No photos."}</div></section>}
      </div>
      {zoom && <div className="ad-photoq__zoom" onClick={() => setZoom(null)} role="dialog" aria-label="Photo"><img src={zoom} alt="" /></div>}
    </>
  );
}

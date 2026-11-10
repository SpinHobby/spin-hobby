import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { Banner, Button, Card, EmptyState, SegmentedControl } from "../../components";
import type { Ctx } from "./Screens";
import { SearchMisses } from "./SearchMisses";

type Kind = "type" | "series" | "maker" | "other";
interface Group {
  id: string;
  kind: Kind;
  terms: string[];
}

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "type", label: "Product types", hint: "figure, plush, acrylic stand" },
  { value: "series", label: "Series & characters", hint: "Frieren, Hatsune Miku" },
  { value: "maker", label: "Makers", hint: "Good Smile, Bandai" },
  { value: "other", label: "Other", hint: "anything else" },
];
const TABS = [{ value: "all" as const, label: "All" }, ...KINDS.map((k) => ({ value: k.value, label: k.label }))];

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
/** Names typed one per line or separated by commas (Japanese "、" too). */
const splitTerms = (text: string) =>
  text
    .split(/[\n,、]/)
    .map((t) => t.trim())
    .filter(Boolean);

/**
 * Admin > Search: the names shoppers use for the same thing. Every name in a group finds what the others find, so "初音ミク" finds
 * products that only say "Hatsune Miku". Changes apply to the next search on the shop. Below: searches that found nothing,
 * each with a button to start a group from it.
 */
export function SearchScreen({ ctx }: { ctx: Ctx }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | Kind>("all");
  const [filter, setFilter] = useState("");
  const [draft, setDraft] = useState<{ kind: Kind; text: string }>({ kind: "series", text: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api<{ groups: Group[] }>("/admin/search-synonyms")
      .then((r) => setGroups(r.groups))
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return (groups ?? []).filter((g) => (tab === "all" || g.kind === tab) && (!f || g.terms.some((t) => t.toLowerCase().includes(f))));
  }, [groups, tab, filter]);

  const add = async () => {
    setBusy(true);
    try {
      const { group } = await api<{ group: Group }>("/admin/search-synonyms", {
        method: "POST",
        body: JSON.stringify({ kind: draft.kind, terms: splitTerms(draft.text) }),
      });
      setGroups((list) => [group, ...(list ?? [])]);
      setDraft((d) => ({ ...d, text: "" }));
      ctx.flash("Group added. The next search on the shop uses it");
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const save = async (g: Group, kind: Kind, text: string) => {
    const { group } = await api<{ group: Group }>(`/admin/search-synonyms/${g.id}`, {
      method: "PUT",
      body: JSON.stringify({ kind, terms: splitTerms(text) }),
    });
    setGroups((list) => list?.map((x) => (x.id === g.id ? group : x)) ?? null);
    ctx.flash("Group saved");
  };

  const remove = async (g: Group) => {
    if (!window.confirm(`Delete the group "${g.terms.join(", ")}"? Searches for these names will only find exact matches.`)) return;
    try {
      await api(`/admin/search-synonyms/${g.id}`, { method: "DELETE" });
      setGroups((list) => list?.filter((x) => x.id !== g.id) ?? null);
      ctx.flash("Group deleted");
    } catch (e) {
      ctx.flash(errMsg(e));
    }
  };

  return (
    <div className="ad-search">
      <p className="ad-muted">
        Names shoppers use for the same thing: English, Japanese, nicknames. Every name in a group finds what the others find, so a search
        for 初音ミク also finds products that only say Hatsune Miku. Plurals (plushies, figures) work on their own and don&apos;t need a
        group. Keep a group to names that truly mean the same thing.
      </p>

      <Card title="New group" padded>
        <div className="ad-search__new">
          <label className="ad-search__terms">
            <span className="ad-sm">Kind</span>
            <select className="sh-input" value={draft.kind} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as Kind }))}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label} ({k.hint})
                </option>
              ))}
            </select>
          </label>
          <label className="ad-search__terms">
            <span className="ad-sm">Names, one per line or separated by commas</span>
            <textarea
              className="sh-input"
              rows={2}
              placeholder="Zenless Zone Zero, ゼンレスゾーンゼロ, zzz"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
            />
          </label>
          <Button disabled={busy || splitTerms(draft.text).length < 2} onClick={() => void add()}>
            {busy ? "Adding…" : "Add group"}
          </Button>
        </div>
      </Card>

      <Card
        title={`Synonym groups${groups ? ` (${groups.length})` : ""}`}
        action={
          <input
            className="sh-input ad-search__filter"
            type="search"
            placeholder="Find a name"
            aria-label="Find a synonym group by name"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        }
        padded
      >
        <SegmentedControl label="Kind" value={tab} onChange={setTab} options={TABS} size="sm" />
        {error && (
          <Banner tone="error" action={{ label: "Retry", onClick: load }}>
            {error}
          </Banner>
        )}
        {groups === null ? (
          !error && <div className="sh-skeleton" style={{ height: 120, marginTop: 12 }} />
        ) : shown.length === 0 ? (
          <EmptyState title="No groups here">{filter ? "No group has that name." : "Add one above."}</EmptyState>
        ) : (
          <div className="ad-search__groups">
            {shown.map((g) => (
              <GroupRow key={g.id} g={g} onSave={save} onRemove={remove} />
            ))}
          </div>
        )}
      </Card>

      <SearchMisses
        flash={ctx.flash}
        onAdd={(query) => {
          setDraft((d) => ({ ...d, text: d.text ? `${d.text}, ${query}` : `${query}, ` }));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

function GroupRow({
  g,
  onSave,
  onRemove,
}: {
  g: Group;
  onSave: (g: Group, kind: Kind, text: string) => Promise<void>;
  onRemove: (g: Group) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<Kind>(g.kind);
  const [text, setText] = useState(g.terms.join(", "));
  const [error, setError] = useState<string | null>(null);

  if (!editing)
    return (
      <div className="ad-line ad-search__group">
        <span className="ad-line__main ad-search__chips">
          {g.terms.map((t) => (
            <span key={t} className="ad-search__chip">
              {t}
            </span>
          ))}
        </span>
        <a className="ad-muted ad-sm" href={`/?q=${encodeURIComponent(g.terms[0])}`} target="_blank" rel="noreferrer">
          Try ↗
        </a>
        <button
          type="button"
          className="sh-btn sh-btn--ghost ad-btn-sm"
          onClick={() => {
            setKind(g.kind);
            setText(g.terms.join(", "));
            setError(null);
            setEditing(true);
          }}
        >
          Edit
        </button>
      </div>
    );

  return (
    <div className="ad-search__edit">
      <select className="sh-input" value={kind} onChange={(e) => setKind(e.target.value as Kind)} aria-label="Kind">
        {KINDS.map((k) => (
          <option key={k.value} value={k.value}>
            {k.label}
          </option>
        ))}
      </select>
      <textarea className="sh-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="Names" />
      {error && <p className="ad-sm ad-search__error">{error}</p>}
      <div className="ad-search__actions">
        <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => void onRemove(g)}>
          Delete group
        </button>
        <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="sh-btn ad-btn-sm"
          onClick={() =>
            onSave(g, kind, text)
              .then(() => setEditing(false))
              .catch((e) => setError(errMsg(e)))
          }
        >
          Save
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components";

interface Miss {
  query: string;
  times: number;
  lastAt: string;
}

const DAYS = 30;

/**
 * Admin > Dashboard: what shoppers searched for in the last 30 days and didn't find. Each one is a product to stock, a name to
 * add to a listing, or a synonym to add (src/modules/catalog/synonyms.ts in the server). "Done" takes it off the list.
 */
export function SearchMisses({ flash }: { flash: (message: string) => void }) {
  const [misses, setMisses] = useState<Miss[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<{ misses: Miss[] }>(`/admin/search-misses?days=${DAYS}`)
      .then((r) => setMisses(r.misses))
      .catch(() => setError(true));
  }, []);
  if (error) return null; // an API without the list yet: nothing rather than an error on the dashboard

  const dismiss = async (query: string) => {
    try {
      await api(`/admin/search-misses?query=${encodeURIComponent(query)}`, { method: "DELETE" });
      setMisses((list) => list?.filter((m) => m.query !== query) ?? null);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't remove it");
    }
  };

  return (
    <Card title={`Searches that found nothing, last ${DAYS} days`} padded>
      <p className="ad-muted ad-sm" style={{ margin: "0 0 12px" }}>
        What shoppers looked for and didn&apos;t find. Stock it, add the name to a listing, or ask a developer to add a synonym. Only the
        words are kept, never who searched.
      </p>
      {misses === null ? (
        <p className="ad-muted ad-sm">Loading…</p>
      ) : misses.length === 0 ? (
        <p className="ad-muted ad-sm">Nothing missed. Every search found something.</p>
      ) : (
        misses.map((m) => (
          <div key={m.query} className="ad-line">
            <a className="ad-line__main" href={`/?q=${encodeURIComponent(m.query)}`} target="_blank" rel="noreferrer">
              {m.query}
            </a>
            <span className="ad-muted ad-sm">
              {m.times} {m.times === 1 ? "time" : "times"} · last{" "}
              {new Date(m.lastAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
            </span>
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => dismiss(m.query)}>
              Done
            </button>
          </div>
        ))
      )}
    </Card>
  );
}

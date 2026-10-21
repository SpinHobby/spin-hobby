import "../styles/components.scss";

/**
 * "Showing 51–100 of 128" with Previous / Next and page numbers, under a long list. `page` starts at 1. The page loads the rows for the
 * page it is given.
 */
export function Pagination({ page, pageSize, total, onPage, label = "Pages" }: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  // the first, the last, and the two either side of this one; gaps become "…"
  const shown = [...new Set([1, page - 1, page, page + 1, pages])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  return (
    <nav className="ui-pager" aria-label={label}>
      <span className="ui-muted ui-sm">Showing {from}–{to} of {total}</span>
      <span className="ui-pager__pages">
        <button type="button" className="sh-chip" onClick={() => onPage(page - 1)} disabled={page <= 1}>‹ Previous</button>
        {shown.map((p, i) => (
          <span key={p} style={{ display: "contents" }}>
            {i > 0 && p - shown[i - 1] > 1 && <span className="ui-muted" aria-hidden>…</span>}
            <button type="button" className={`sh-chip ${p === page ? "is-active" : ""}`} aria-current={p === page ? "page" : undefined} onClick={() => onPage(p)}>{p}</button>
          </span>
        ))}
        <button type="button" className="sh-chip" onClick={() => onPage(page + 1)} disabled={page >= pages}>Next ›</button>
      </span>
    </nav>
  );
}

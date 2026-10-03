import type { buildTree } from "../categoryTree";
import { indentLabel } from "../categoryTree";
import {
  activeFilterCount, EMPTY_FILTERS, parseSort, SORT_OPTIONS, STATE_META, STATE_ORDER,
  type CatalogCounts, type CatalogFilters, type Sort,
} from "./catalog";
import type { AdminState } from "../types";

interface Props {
  filters: CatalogFilters;
  onFilters: (patch: Partial<CatalogFilters>) => void;
  sort: Sort;
  onSort: (sort: Sort) => void;
  counts: CatalogCounts | null;
  tree: ReturnType<typeof buildTree>;
  onAdd: () => void;
}

/** Search, sort, status chips and the secondary filters for the admin product list. */
export function ProductFilters({ filters, onFilters, sort, onSort, counts, tree, onAdd }: Props) {
  const active = activeFilterCount(filters);
  const toggleState = (s: AdminState) =>
    onFilters({ status: filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s] });
  const sortValue = `${sort.key}:${sort.dir}`;
  const hasSortOption = SORT_OPTIONS.some((o) => o.value === sortValue);

  return (
    <>
      <div className="ad-toolbar">
        <input className="ad-search" type="search" placeholder="Search name, series, character, JAN, SKU or Square ID…" value={filters.q}
          onChange={(e) => onFilters({ q: e.target.value })} aria-label="Search products" />
        <select className="sh-input ad-sort-select" value={sortValue} onChange={(e) => onSort(parseSort(e.target.value))} aria-label="Sort products">
          {!hasSortOption && <option value={sortValue}>Custom sort</option>}
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button type="button" className="sh-btn ad-add-btn" onClick={onAdd}>+ Add product</button>
      </div>

      <div className="ad-chips" role="group" aria-label="Filter by status">
        <button type="button" className={`sh-chip ${filters.status.length === 0 ? "is-active" : ""}`} onClick={() => onFilters({ status: [] })}>
          All{counts ? ` · ${counts.total}` : ""}
        </button>
        {STATE_ORDER.map((s) => {
          const n = counts?.states[s] ?? 0;
          const on = filters.status.includes(s);
          if (!n && !on) return null;
          return (
            <button key={s} type="button" className={`sh-chip ${on ? "is-active" : ""}`} aria-pressed={on} title={STATE_META[s].hint} onClick={() => toggleState(s)}>
              {STATE_META[s].label} · {n}
            </button>
          );
        })}
      </div>

      <div className="ad-filterbar">
        {tree.flat.length > 0 && (
          <select className="sh-input ad-cat-filter" value={filters.categoryId} onChange={(e) => onFilters({ categoryId: e.target.value })} aria-label="Filter by category">
            <option value="">All categories</option>
            <option value="none">Uncategorised</option>
            {tree.flat.map((c) => <option key={c.id} value={c.id}>{indentLabel(c)}</option>)}
          </select>
        )}
        <select className="sh-input ad-source-filter" value={filters.source} onChange={(e) => onFilters({ source: e.target.value as CatalogFilters["source"] })} aria-label="Filter by source">
          <option value="">All sources</option>
          <option value="square">From Square{counts ? ` (${counts.square})` : ""}</option>
          <option value="manual">Added manually{counts ? ` (${counts.manual})` : ""}</option>
        </select>
        <span className="ad-price-filter">
          <span className="ad-muted ad-sm">Price $</span>
          <input className="sh-input" inputMode="decimal" placeholder="Min" value={filters.min} aria-label="Minimum price"
            onChange={(e) => onFilters({ min: e.target.value.replace(/[^\d.]/g, "") })} />
          <span className="ad-muted">–</span>
          <input className="sh-input" inputMode="decimal" placeholder="Max" value={filters.max} aria-label="Maximum price"
            onChange={(e) => onFilters({ max: e.target.value.replace(/[^\d.]/g, "") })} />
        </span>
        <label className="ad-check"><input type="checkbox" checked={filters.featured} onChange={(e) => onFilters({ featured: e.target.checked })} /> Featured{counts ? ` · ${counts.featured}` : ""}</label>
        <label className="ad-check"><input type="checkbox" checked={filters.alerts} onChange={(e) => onFilters({ alerts: e.target.checked })} /> Restock alerts{counts ? ` · ${counts.alerts}` : ""}</label>
        <label className="ad-check"><input type="checkbox" checked={filters.noPhoto} onChange={(e) => onFilters({ noPhoto: e.target.checked })} /> No photo{counts ? ` · ${counts.noPhoto}` : ""}</label>
        {active > 0 && <button type="button" className="ad-link" onClick={() => onFilters(EMPTY_FILTERS)}>Clear filters ({active})</button>}
      </div>
    </>
  );
}

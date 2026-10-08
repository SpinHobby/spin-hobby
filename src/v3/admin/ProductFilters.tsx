import { useEffect, useRef, useState } from "react";
import type { buildTree } from "../categoryTree";
import { indentLabel } from "../categoryTree";
import {
  activeFilterCount, EMPTY_FILTERS, parseSort, SORT_OPTIONS, STATE_META, STATE_ORDER,
  type CatalogCounts, type CatalogFilters, type Sort,
} from "./catalog";
import type { AdminState } from "../types";
import { useSeriesList } from "./seriesList";

interface Props {
  filters: CatalogFilters;
  onFilters: (patch: Partial<CatalogFilters>) => void;
  sort: Sort;
  onSort: (sort: Sort) => void;
  counts: CatalogCounts | null;
  tree: ReturnType<typeof buildTree>;
  onAdd: () => void;
  /** Phone layout: the secondary filters fold away behind a button. */
  compact: boolean;
}

/** How many of the folded-away filters are on (the search box and status chips are always visible). */
const hiddenFilterCount = (f: CatalogFilters) => [f.source, f.categoryId, f.seriesId, f.featured, f.alerts, f.noPhoto, f.min.trim() || f.max.trim()].filter(Boolean).length;

/** Search, sort, status chips and the secondary filters for the admin product list. */
export function ProductFilters({ filters, onFilters, sort, onSort, counts, tree, onAdd, compact }: Props) {
  const [panelOpen, setPanelOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const active = activeFilterCount(filters);
  const folded = hiddenFilterCount(filters);
  const toggleState = (s: AdminState) =>
    onFilters({ status: filters.status.includes(s) ? filters.status.filter((x) => x !== s) : [...filters.status, s] });
  const sortValue = `${sort.key}:${sort.dir}`;
  const hasSortOption = SORT_OPTIONS.some((o) => o.value === sortValue);

  // "/" jumps to the search box from anywhere on the screen (like most admin tools), unless you're already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { list: seriesList } = useSeriesList(counts);
  const tags: { key: string; label: string; clear: Partial<CatalogFilters> }[] = [];
  if (filters.categoryId) tags.push({ key: "cat", label: filters.categoryId === "none" ? "Uncategorised" : tree.path(filters.categoryId).join(" › "), clear: { categoryId: "" } });
  if (filters.seriesId) tags.push({ key: "series", label: filters.seriesId === "none" ? "No series" : `Series: ${seriesList.find((s) => s.id === filters.seriesId)?.name ?? "…"}`, clear: { seriesId: "" } });
  if (filters.source) tags.push({ key: "src", label: filters.source === "square" ? "From Square" : "Added manually", clear: { source: "" } });
  if (filters.min.trim() || filters.max.trim()) {
    const lo = filters.min.trim(), hi = filters.max.trim();
    tags.push({ key: "price", label: lo && hi ? `$${lo}–$${hi}` : lo ? `From $${lo}` : `Up to $${hi}`, clear: { min: "", max: "" } });
  }
  if (filters.featured) tags.push({ key: "feat", label: "Featured", clear: { featured: false } });
  if (filters.alerts) tags.push({ key: "alerts", label: "Restock alerts", clear: { alerts: false } });
  if (filters.noPhoto) tags.push({ key: "photo", label: "No photo", clear: { noPhoto: false } });

  const secondary = (
    <div className={`ad-filterbar ${compact ? "is-compact" : ""}`}>
      {tree.flat.length > 0 && (
        <select className="sh-input ad-cat-filter" value={filters.categoryId} onChange={(e) => onFilters({ categoryId: e.target.value })} aria-label="Filter by category">
          <option value="">All categories</option>
          <option value="none">Uncategorised</option>
          {tree.flat.map((c) => <option key={c.id} value={c.id}>{indentLabel(c)}</option>)}
        </select>
      )}
      {seriesList.length > 0 && (
        <select className="sh-input ad-cat-filter" value={filters.seriesId} onChange={(e) => onFilters({ seriesId: e.target.value })} aria-label="Filter by series">
          <option value="">All series</option>
          <option value="none">No series</option>
          {seriesList.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.productCount})</option>)}
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
      <div className="ad-checks">
        <label className="ad-check"><input type="checkbox" checked={filters.featured} onChange={(e) => onFilters({ featured: e.target.checked })} /> Featured{counts ? ` · ${counts.featured}` : ""}</label>
        <label className="ad-check"><input type="checkbox" checked={filters.alerts} onChange={(e) => onFilters({ alerts: e.target.checked })} /> Restock alerts{counts ? ` · ${counts.alerts}` : ""}</label>
        <label className="ad-check"><input type="checkbox" checked={filters.noPhoto} onChange={(e) => onFilters({ noPhoto: e.target.checked })} /> No photo{counts ? ` · ${counts.noPhoto}` : ""}</label>
      </div>
      {!compact && active > 0 && <button type="button" className="ad-link" onClick={() => onFilters(EMPTY_FILTERS)}>Clear filters ({active})</button>}
    </div>
  );

  return (
    <>
      <div className={`ad-toolbar ${compact ? "is-compact" : ""}`}>
        <input ref={searchRef} className="ad-search" type="search" placeholder={compact ? "Search products…" : "Search name, series, character, JAN, SKU or Square ID…   ( / )"}
          value={filters.q} onChange={(e) => onFilters({ q: e.target.value })}
          onKeyDown={(e) => { if (e.key === "Escape" && filters.q) { e.preventDefault(); onFilters({ q: "" }); } }}
          aria-label="Search products" enterKeyHint="search" autoComplete="off" />
        <select className="sh-input ad-sort-select" value={sortValue} onChange={(e) => onSort(parseSort(e.target.value))} aria-label="Sort products">
          {!hasSortOption && <option value={sortValue}>Custom sort</option>}
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {compact && (
          <button type="button" className={`sh-btn sh-btn--ghost ad-filters-btn ${panelOpen ? "is-open" : ""}`} aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
            Filters{folded > 0 && <span className="ad-filters-btn__count">{folded}</span>}
          </button>
        )}
        <button type="button" className="sh-btn ad-add-btn" onClick={onAdd}>+ Add<span className="ad-add-btn__long"> product</span></button>
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
              <i className="ad-chip-dot" style={{ background: STATE_META[s].color }} aria-hidden />{STATE_META[s].label} · {n}
            </button>
          );
        })}
      </div>

      {(!compact || panelOpen) && secondary}

      {/* Folded-away filters stay visible as removable tags, so it's always clear why the list is short. */}
      {compact && !panelOpen && (tags.length > 0 || active > 0) && (
        <div className="ad-tags" aria-label="Active filters">
          {tags.map((t) => (
            <button key={t.key} type="button" className="ad-ftag" onClick={() => onFilters(t.clear)} aria-label={`Remove filter ${t.label}`}>{t.label} <span aria-hidden>×</span></button>
          ))}
          {active > 0 && <button type="button" className="ad-link" onClick={() => onFilters(EMPTY_FILTERS)}>Clear all</button>}
        </div>
      )}
    </>
  );
}

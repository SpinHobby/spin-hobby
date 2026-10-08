import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { api } from "../../lib/api";
import type { AdminState, Product } from "../types";

// ---------------------------------------------------------------- states

/** Badge text, colour and a one-line explanation for each way an item can show up in the admin. */
export const STATE_META: Record<AdminState, { label: string; badge: string; color: string; hint: string }> = {
  in: { label: "In stock", badge: "IN STOCK", color: "var(--teal)", hint: "Live on the storefront and in stock." },
  low: { label: "Low stock", badge: "LOW STOCK", color: "var(--red)", hint: "Live, with few left." },
  out: { label: "Sold out", badge: "SOLD OUT", color: "var(--muted)", hint: "Live but sold out; shoppers can ask for a restock alert." },
  pre: { label: "Pre-order", badge: "PRE-ORDER", color: "var(--blue)", hint: "Open for pre-orders." },
  closed: { label: "Pre-order closed", badge: "CLOSED", color: "#9a6b2f", hint: "The order-by date has passed, so it can't be bought." },
  unavailable: { label: "Unavailable", badge: "UNAVAILABLE", color: "#c27c0e", hint: "Not shown to shoppers: its default variation isn't sellable in Square." },
  hidden: { label: "Hidden", badge: "HIDDEN", color: "#8a8d96", hint: "Hidden from the storefront by availability." },
  retired: { label: "Retired", badge: "RETIRED", color: "#5b5f70", hint: "Deleted in Square. Kept so past orders still resolve." },
};

/** Chip order: what's live first, then the reasons something isn't. */
export const STATE_ORDER: AdminState[] = ["in", "low", "out", "pre", "closed", "unavailable", "hidden", "retired"];

// ---------------------------------------------------------------- filters + sorting

export interface CatalogFilters {
  q: string;
  status: AdminState[];
  source: "" | "square" | "manual";
  categoryId: string; // "" all, "none" uncategorised, or a category id
  seriesId: string; // "" all, "none" no series, or a series id
  featured: boolean;
  alerts: boolean;
  noPhoto: boolean;
  min: string;
  max: string;
}

export const EMPTY_FILTERS: CatalogFilters = { q: "", status: [], source: "", categoryId: "", seriesId: "", featured: false, alerts: false, noPhoto: false, min: "", max: "" };

/** How many featured products the homepage shows (the same number the API uses). */
export const FRONT_PAGE_SLOTS = 8;

export type SortKey = "name" | "price" | "stock" | "category" | "status" | "updated" | "created" | "release" | "alerts" | "front";
export type SortDir = "asc" | "desc";
export interface Sort { key: SortKey; dir: SortDir }
export const DEFAULT_SORT: Sort = { key: "created", dir: "desc" };

const SORT_LABELS: Record<SortKey, [asc: string, desc: string]> = {
  created: ["Oldest added", "Newest added"],
  updated: ["Least recently updated", "Recently updated"],
  name: ["Name A–Z", "Name Z–A"],
  price: ["Price: low to high", "Price: high to low"],
  stock: ["Stock: low to high", "Stock: high to low"],
  category: ["Category A–Z", "Category Z–A"],
  status: ["Status: best first", "Status: worst first"],
  release: ["Release: soonest", "Release: latest"],
  alerts: ["Fewest restock alerts", "Most restock alerts"],
  front: ["Front page order", "Front page order"],
};
export const SORT_OPTIONS = (Object.keys(SORT_LABELS) as SortKey[]).flatMap((key) =>
  (["desc", "asc"] as SortDir[])
    .filter((dir) => !(key === "alerts" && dir === "asc") && !(key === "front" && dir === "desc"))
    .map((dir) => ({ value: `${key}:${dir}`, label: SORT_LABELS[key][dir === "asc" ? 0 : 1] })));

export const parseSort = (value: string): Sort => { const [key, dir] = value.split(":"); return { key: key as SortKey, dir: dir as SortDir }; };

/** How many filters are narrowing the list (the search box counts as one). */
export function activeFilterCount(f: CatalogFilters) {
  return [f.q.trim(), f.status.length, f.source, f.categoryId, f.seriesId, f.featured, f.alerts, f.noPhoto, f.min.trim() || f.max.trim()].filter(Boolean).length;
}

/** Maps the dashboard's old deep links ("Low / sold out") onto the new filters. */
export function filtersFromShortcut(name: string): CatalogFilters | null {
  switch (name) {
    case "In stock": return { ...EMPTY_FILTERS, status: ["in"] };
    case "Low / sold out": return { ...EMPTY_FILTERS, status: ["low", "out"] };
    case "Pre-order": return { ...EMPTY_FILTERS, status: ["pre"] };
    case "Featured": return { ...EMPTY_FILTERS, featured: true };
    default: return null;
  }
}

// ---------------------------------------------------------------- fetching

export interface CatalogCounts {
  total: number;
  states: Record<AdminState, number>;
  manual: number;
  square: number;
  featured: number;
  alerts: number;
  noPhoto: number;
  lastSyncedAt: string | null;
}

export interface CatalogPage { items: Product[]; total: number; counts: CatalogCounts }

export function catalogQuery(f: CatalogFilters, sort: Sort, page: number, pageSize: number) {
  const p = new URLSearchParams({ sort: sort.key, dir: sort.dir, limit: String(pageSize), cursor: String(page * pageSize) });
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.status.length) p.set("status", f.status.join(","));
  if (f.source) p.set("source", f.source);
  if (f.categoryId) p.set("categoryId", f.categoryId);
  if (f.seriesId) p.set("seriesId", f.seriesId);
  if (f.featured) p.set("featured", "1");
  if (f.alerts) p.set("alerts", "1");
  if (f.noPhoto) p.set("noPhoto", "1");
  if (f.min.trim()) p.set("min", f.min.trim());
  if (f.max.trim()) p.set("max", f.max.trim());
  return p.toString();
}

/** Waits `ms` after the value stops changing, so typing in the search box doesn't fire a request per key. */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}

/** Loads one page of the admin catalog for the current filters. Only the latest request's answer is used. */
export function useCatalog(filters: CatalogFilters, sort: Sort, page: number, pageSize: number) {
  const [data, setData] = useState<CatalogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);
  const query = catalogQuery(filters, sort, page, pageSize);

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    api<CatalogPage & { success: true }>(`/admin/catalog?${query}`)
      .then((res) => { if (id === latest.current) { setData(res); setError(""); } })
      .catch((e) => { if (id === latest.current) setError(e instanceof Error ? e.message : "Couldn't load products"); })
      .finally(() => { if (id === latest.current) setLoading(false); });
  }, [query, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  /** Updates a row on screen right away; `refresh()` then brings back the server's derived fields. */
  const patch = useCallback((id: string, change: Partial<Product>) =>
    setData((d) => (d ? { ...d, items: d.items.map((p) => (p.id === id ? { ...p, ...change } : p)) } : d)), []);

  return { data, loading, error, refresh, patch };
}

// ---------------------------------------------------------------- layout + preferences

/** Width of an element, kept current as it resizes (0 until measured). Drives layout by the space the list actually has. */
export function useElementWidth(ref: RefObject<HTMLElement>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

/** Below this the table becomes a list of cards; above it, columns drop away one by one as space shrinks. */
// Widths are what each column set needs (columns + gaps + padding, see admin.scss) so a row never scrolls sideways.
export const CARD_BELOW = 954;
export type Density = "full" | "wide" | "medium" | "narrow" | "cards";
export function densityFor(width: number): Density {
  if (width === 0 || width >= 1354) return "full";
  if (width >= 1194) return "wide";   // drops "Release / order by"
  if (width >= 1084) return "medium"; // ...and "Added"
  if (width >= CARD_BELOW) return "narrow"; // ...and "Category"
  return "cards";
}

const PREFS_KEY = "spinhobby-admin-products";
export interface ProductPrefs { sort: Sort; pageSize: number }
/** Sort order and page size are habits worth remembering; filters are not (a leftover filter looks like missing products). */
export function loadPrefs(): ProductPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null");
    const okSort = raw?.sort && SORT_OPTIONS.some((o) => o.value === `${raw.sort.key}:${raw.sort.dir}`);
    return { sort: okSort ? raw.sort : DEFAULT_SORT, pageSize: [25, 50, 100].includes(raw?.pageSize) ? raw.pageSize : 50 };
  } catch { return { sort: DEFAULT_SORT, pageSize: 50 }; }
}
export function savePrefs(prefs: ProductPrefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* storage blocked */ }
}

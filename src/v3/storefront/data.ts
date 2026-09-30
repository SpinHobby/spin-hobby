import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { normalizeStatus } from "../format";
import { useLocalState } from "../hooks";
import type { Homepage, Product, ProductPage, ProductStatus, ShopCategory, SortKey } from "../types";

// All filtering, sorting, counting and paging happens on the server (GET /products, /products/facets).
// This file only turns what the shopper clicked into query parameters.

export const NAV = ["Home", "New Arrivals", "Pre-Orders", "Figures", "Plushies", "Trading Cards", "Goods", "Books & Media", "Sale"] as const;
export type NavKey = (typeof NAV)[number] | "Category";

/** Storefront menu → server section (see GROUPS in the API's catalog service). */
const NAV_GROUP: Partial<Record<NavKey, string>> = {
  "New Arrivals": "new", "Pre-Orders": "preorders", Sale: "sale",
  Figures: "figures", Plushies: "plushies", "Trading Cards": "cards", Goods: "goods", "Books & Media": "media",
};

export const PRICES = [
  { name: "Any", min: null, max: null },
  { name: "Under $25", min: 0, max: 25 },
  { name: "$25–75", min: 25, max: 75 },
  { name: "$75–150", min: 75, max: 150 },
  { name: "$150+", min: 150, max: null },
] as const;
export type PriceName = (typeof PRICES)[number]["name"];

export const AVAIL = [
  { name: "In stock", statuses: ["in", "low"] as ProductStatus[], color: "var(--teal)" },
  { name: "Pre-order", statuses: ["pre"] as ProductStatus[], color: "var(--blue)" },
  { name: "Sold out", statuses: ["out", "closed"] as (ProductStatus | "closed")[], color: "var(--muted)" },
] as const;
export type AvailName = (typeof AVAIL)[number]["name"];

export type ShopSort = SortKey | "featured";
export const SORTS: { value: ShopSort; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "new", label: "Newest" },
  { value: "release", label: "Release date" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "pop", label: "Popularity" },
];

export interface Filters {
  nav: NavKey;
  category: string; // "All categories" or a Square category name (only when the shop has no category tree)
  categoryId: string | null; // shop category; the server includes all of its subcategories
  avail: Record<AvailName, boolean>;
  price: PriceName;
  sort: ShopSort;
  query: string;
}

export const ALL = "All categories";
export const DEFAULT_AVAIL: Filters["avail"] = { "In stock": true, "Pre-order": true, "Sold out": true };
const PAGE = 24;

function toQuery(f: Filters, wishlistIds: string[] | null) {
  const q = new URLSearchParams({ limit: String(PAGE), sort: f.sort });
  const group = NAV_GROUP[f.nav];
  if (group) q.set("group", group);
  if (f.categoryId) q.set("categoryId", f.categoryId);
  else if (f.category !== ALL) q.set("category", f.category);
  const statuses = AVAIL.filter((a) => f.avail[a.name]).flatMap((a) => a.statuses);
  if (statuses.length < AVAIL.flatMap((a) => a.statuses).length) q.set("status", statuses.length ? statuses.join(",") : "none");
  const price = PRICES.find((p) => p.name === f.price)!;
  if (price.min !== null) q.set("min", String(price.min));
  if (price.max !== null) q.set("max", String(price.max));
  if (f.query.trim()) q.set("q", f.query.trim());
  if (wishlistIds) q.set("ids", wishlistIds.join(","));
  return q;
}

export interface Facets {
  total: number;
  categories: { name: string; count: number }[];
  shopCategories: (ShopCategory & { total: number })[];
  status: { in: number; pre: number; out: number };
}

export type HomeData = Omit<Homepage, "success"> & { promos?: { closingSoon: number; maxDiscountPct: number }; freeShippingThresholdCents?: number };

/** Homepage sections + sidebar counts: loaded once per visit. */
export function useStorefront() {
  const [home, setHome] = useState<HomeData | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let on = true;
    setError(null);
    Promise.all([api<HomeData>("/homepage"), api<Facets>("/products/facets")])
      .then(([h, f]) => { if (on) { setHome(h); setFacets(f); } })
      .catch((e: Error) => { if (on) setError(e.message); });
    return () => { on = false; };
  }, [nonce]);
  return { home, facets, error, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

/** One page of products for the current filters, with "load more". Re-queries when filters change. */
export function useProducts(filters: Filters, wishlistIds: string[] | null) {
  const query = useMemo(() => toQuery(filters, wishlistIds).toString(), [filters, wishlistIds]);
  const [state, setState] = useState<{ items: Product[]; total: number; cursor?: string; loading: boolean; loadingMore: boolean; error: string | null }>(
    { items: [], total: 0, loading: true, loadingMore: false, error: null },
  );
  const latest = useRef(query);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    latest.current = query;
    setState((s) => ({ ...s, loading: true, error: null }));
    // Small debounce so typing in search or toggling filters doesn't fire a request per keystroke.
    const timer = window.setTimeout(() => {
      api<ProductPage>(`/products?${query}`)
        .then((page) => { if (latest.current === query) setState({ items: page.items, total: page.total, cursor: page.cursor, loading: false, loadingMore: false, error: null }); })
        .catch((e: Error) => { if (latest.current === query) setState((s) => ({ ...s, loading: false, error: e.message })); });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query, attempt]);

  const loadMore = useCallback(() => {
    if (!state.cursor || state.loadingMore) return;
    const q = new URLSearchParams(query);
    q.set("cursor", state.cursor);
    setState((s) => ({ ...s, loadingMore: true }));
    api<ProductPage>(`/products?${q}`)
      .then((page) => { if (latest.current === query) setState((s) => ({ ...s, items: [...s.items, ...page.items], cursor: page.cursor, loadingMore: false })); })
      .catch((e: Error) => setState((s) => ({ ...s, loadingMore: false, error: e.message })));
  }, [query, state.cursor, state.loadingMore]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, loadMore, retry };
}

// ---------------------------------------------------------------- cart
export interface CartLine {
  variationId: string;
  itemId: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  isPreorder: boolean;
  maxPerCustomer: number | null;
}

// ---------------------------------------------------------------- product pages
/** /product/<id>/<name-slug>. Only the id matters; the slug is for people reading the link. */
export function productPath(p: Pick<Product, "id" | "name">) {
  const slug = p.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return `/product/${encodeURIComponent(p.id)}${slug ? `/${slug}` : ""}`;
}
export function productIdFromPath(pathname: string): string | null {
  const m = /^\/product\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Most you can put in the cart in one go: the per-customer limit, else stock (in-stock items), else 99. */
export function purchaseCap(p: Product) {
  const stockCap = p.stockCount && normalizeStatus(p.status) !== "pre" ? p.stockCount : 99;
  return Math.max(1, Math.min(p.maxPerCustomer ?? 99, stockCap));
}

export function useCart() {
  const [lines, setLines] = useLocalState<CartLine[]>("spinhobby-cart-v3", []);
  const add = useCallback((p: Product, qty = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.variationId === p.variationId);
      const cap = purchaseCap(p);
      if (existing) {
        return current.map((l) => (l.variationId === p.variationId ? { ...l, quantity: Math.min(l.quantity + qty, cap) } : l));
      }
      return [...current, {
        variationId: p.variationId, itemId: p.id, name: p.name, imageUrl: p.images[0] ?? null,
        unitPriceCents: p.priceCents, quantity: Math.min(qty, cap), isPreorder: p.status === "pre", maxPerCustomer: p.maxPerCustomer,
      }];
    });
  }, [setLines]);
  const setQty = useCallback((variationId: string, quantity: number) => {
    setLines((current) => (quantity <= 0
      ? current.filter((l) => l.variationId !== variationId)
      : current.map((l) => (l.variationId === variationId ? { ...l, quantity: Math.min(quantity, l.maxPerCustomer ?? 99) } : l))));
  }, [setLines]);
  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0), [lines]);
  const has = useCallback((variationId: string) => lines.some((l) => l.variationId === variationId), [lines]);
  const qtyOf = useCallback((variationId: string) => lines.find((l) => l.variationId === variationId)?.quantity ?? 0, [lines]);
  return { lines, add, setQty, count, subtotal, has, qtyOf };
}

// ---------------------------------------------------------------- wishlist
/** Local wishlist for guests; mirrored to /wishlist when signed in. */
export function useWishlist(signedIn: boolean, onError: (message: string) => void) {
  const [ids, setIds] = useLocalState<string[]>("spinhobby-wishlist-v3", []);

  useEffect(() => {
    if (!signedIn) return;
    api<{ items: Product[] }>("/wishlist")
      .then((res) => setIds((local) => Array.from(new Set([...res.items.map((p) => p.id), ...local]))))
      .catch(() => { /* keep the local list */ });
  }, [signedIn, setIds]);

  const toggle = useCallback((p: Product) => {
    const on = ids.includes(p.id);
    setIds((current) => (on ? current.filter((id) => id !== p.id) : [...current, p.id]));
    if (!signedIn) return;
    const request = on
      ? api(`/wishlist/${encodeURIComponent(p.id)}`, { method: "DELETE" })
      : api("/wishlist", { method: "POST", body: JSON.stringify({ squareItemId: p.id }) });
    request.catch((e: Error) => onError(e.message));
  }, [ids, setIds, signedIn, onError]);

  const set = useMemo(() => new Set(ids), [ids]);
  return { ids: set, list: ids, count: ids.length, toggle };
}

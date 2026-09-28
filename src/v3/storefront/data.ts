import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { DEFAULT_EVENTS, DEFAULT_SLIDES, DEMO_PRODUCTS } from "../demo";
import { DEMO_ALLOWED, useLocalState } from "../hooks";
import { normalizeStatus } from "../format";
import type { Homepage, Product, ProductPage, ProductStatus, SortKey } from "../types";

export const NAV = ["Home", "New Arrivals", "Pre-Orders", "Figures", "Plushies", "Trading Cards", "Goods", "Books & Media", "Sale"] as const;
export type NavKey = (typeof NAV)[number] | "Category";

// Square category names aren't fixed, so top-nav groups match by keyword.
const NAV_MATCH: Partial<Record<NavKey, RegExp>> = {
  Figures: /figure|figma|nendoroid|model kit|gunpla|statue/i,
  Plushies: /plush/i,
  "Trading Cards": /card|tcg/i,
  Goods: /badge|acrylic|keychain|blind|apparel|poster|tapestry|goods|sticker|stand/i,
  "Books & Media": /book|doujin|manga|video|music|media|cd|dvd|blu-?ray/i,
};

export const PRICES = [
  { name: "Any", min: 0, max: Infinity },
  { name: "Under $25", min: 0, max: 25 },
  { name: "$25–75", min: 25, max: 75 },
  { name: "$75–150", min: 75, max: 150 },
  { name: "$150+", min: 150, max: Infinity },
] as const;
export type PriceName = (typeof PRICES)[number]["name"];

export const AVAIL = [
  { name: "In stock", statuses: ["in", "low"] as ProductStatus[], color: "var(--teal)" },
  { name: "Pre-order", statuses: ["pre"] as ProductStatus[], color: "var(--blue)" },
  { name: "Sold out", statuses: ["out"] as ProductStatus[], color: "var(--muted)" },
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
  category: string; // "All categories" or a category name
  avail: Record<AvailName, boolean>;
  price: PriceName;
  sort: ShopSort;
  query: string;
}

export const ALL = "All categories";
export const DEFAULT_AVAIL: Filters["avail"] = { "In stock": true, "Pre-order": true, "Sold out": true };

export function inNav(p: Product, nav: NavKey) {
  if (nav === "Home" || nav === "Category") return true;
  if (nav === "New Arrivals") return p.status === "in" || p.status === "low";
  if (nav === "Pre-Orders") return p.status === "pre";
  if (nav === "Sale") return !!p.compareAtCents && p.compareAtCents > p.priceCents;
  const re = NAV_MATCH[nav];
  return re ? re.test(p.category ?? "") : true;
}

export function applyFilters(products: Product[], f: Filters, featured: string[] = []) {
  const q = f.query.trim().toLowerCase();
  const price = PRICES.find((x) => x.name === f.price) ?? PRICES[0];
  const allowed = new Set(AVAIL.filter((a) => f.avail[a.name]).flatMap((a) => a.statuses));
  const list = products.filter((p) => {
    const dollars = p.priceCents / 100;
    return inNav(p, f.nav)
      && (f.category === ALL || p.category === f.category)
      && allowed.has(normalizeStatus(p.status))
      && dollars >= price.min && dollars < price.max
      && (!q || [p.name, p.series, p.character, p.category, p.janCode].some((v) => v?.toLowerCase().includes(q)));
  });
  const order = new Map(products.map((p, i) => [p.id, i])); // API returns newest first
  const rel = (p: Product) => (p.releaseMonth ? Date.parse(p.releaseMonth.slice(0, 7) + "-01") : 0);
  const pick = new Map(featured.map((id, i) => [id, i]));
  const byNew = (a: Product, b: Product) => order.get(a.id)! - order.get(b.id)!;
  const sorters: Record<ShopSort, (a: Product, b: Product) => number> = {
    // Admin-featured products first (in their homepage order), then newest.
    featured: (a, b) => (pick.get(a.id) ?? 1e9) - (pick.get(b.id) ?? 1e9) || byNew(a, b),
    new: byNew,
    release: (a, b) => rel(a) - rel(b),
    price_asc: (a, b) => a.priceCents - b.priceCents,
    price_desc: (a, b) => b.priceCents - a.priceCents,
    pop: (a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9),
  };
  return [...list].sort(sorters[f.sort]);
}

const MAX_PAGES = 20; // 20 × 60 = 1,200 items; plenty for the current catalog

async function loadAllProducts() {
  const items: Product[] = [];
  let cursor: string | undefined = "0";
  for (let page = 0; cursor !== undefined && page < MAX_PAGES; page += 1) {
    const res: ProductPage = await api<ProductPage>(`/products?limit=60&sort=new&cursor=${cursor}`);
    items.push(...res.items);
    cursor = res.cursor;
  }
  return items;
}

export type CatalogState = {
  products: Product[];
  home: Omit<Homepage, "success">;
  loading: boolean;
  error: string | null;
  demo: boolean;
  reload: () => void;
};

const EMPTY_HOME: CatalogState["home"] = { slides: [], featuredItems: [], preorders: [], ranking: [], newInStock: [], events: [] };

export function useCatalog(): CatalogState {
  const [state, setState] = useState<Omit<CatalogState, "reload">>({ products: [], home: EMPTY_HOME, loading: true, error: null, demo: false });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.allSettled([loadAllProducts(), api<Homepage>("/homepage")]).then(([productsRes, homeRes]) => {
      if (!active) return;
      const products = productsRes.status === "fulfilled" ? productsRes.value : [];
      const home = homeRes.status === "fulfilled" ? homeRes.value : EMPTY_HOME;
      const failed = productsRes.status === "rejected";
      const useDemo = DEMO_ALLOWED && products.length === 0;
      setState({
        products: useDemo ? DEMO_PRODUCTS : products,
        home: {
          ...home,
          slides: home.slides?.length ? home.slides : DEFAULT_SLIDES,
          events: home.events?.length ? home.events : DEFAULT_EVENTS,
        },
        loading: false,
        error: failed && !useDemo ? (productsRes.reason as Error)?.message ?? "The catalog could not be loaded." : null,
        demo: useDemo,
      });
    });
    return () => { active = false; };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
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

export function useCart() {
  const [lines, setLines] = useLocalState<CartLine[]>("spinhobby-cart-v3", []);
  const add = useCallback((p: Product) => {
    setLines((current) => {
      const existing = current.find((l) => l.variationId === p.variationId);
      const cap = p.maxPerCustomer ?? (p.stockCount && p.status !== "pre" ? p.stockCount : 99);
      if (existing) {
        return current.map((l) => (l.variationId === p.variationId ? { ...l, quantity: Math.min(l.quantity + 1, cap) } : l));
      }
      return [...current, {
        variationId: p.variationId, itemId: p.id, name: p.name, imageUrl: p.images[0] ?? null,
        unitPriceCents: p.priceCents, quantity: 1, isPreorder: p.status === "pre", maxPerCustomer: p.maxPerCustomer,
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
  return { lines, add, setQty, count, subtotal, has };
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
    if (!signedIn || p.id.startsWith("DEMO_")) return;
    const request = on
      ? api(`/wishlist/${encodeURIComponent(p.id)}`, { method: "DELETE" })
      : api("/wishlist", { method: "POST", body: JSON.stringify({ squareItemId: p.id }) });
    request.catch((e: Error) => onError(e.message));
  }, [ids, setIds, signedIn, onError]);

  return { ids: new Set(ids), count: ids.length, toggle };
}

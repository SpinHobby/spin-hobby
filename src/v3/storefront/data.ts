import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { normalizeStatus } from "../format";
import { useLocalState } from "../hooks";
import type { Homepage, Product, ProductPage, ProductStatus, ShopCategory, SortKey } from "../types";

// All filtering, sorting, counting and paging happens on the server (GET /products, /products/facets).
// This file only turns what the shopper clicked into query parameters.

export const NAV = [
  "Home",
  "New Arrivals",
  "Pre-Orders",
  "Figures",
  "Plushies",
  "Trading Cards",
  "Goods",
  "Books & Media",
  "Sale",
] as const;
export type NavKey = (typeof NAV)[number] | "Category";

/** Storefront menu → server section (see GROUPS in the API's catalog service). */
const NAV_GROUP: Partial<Record<NavKey, string>> = {
  "New Arrivals": "new",
  "Pre-Orders": "preorders",
  Sale: "sale",
  Figures: "figures",
  Plushies: "plushies",
  "Trading Cards": "cards",
  Goods: "goods",
  "Books & Media": "media",
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
  /** A series by its address form ("re-zero"), from a /series/<slug> page. */
  series: string | null;
}

export const ALL = "All categories";
// Sold-out items are hidden until a shopper ticks "Sold out": most of the catalog is out of stock, and the shop should lead with what can be bought.
export const DEFAULT_AVAIL: Filters["avail"] = { "In stock": true, "Pre-order": true, "Sold out": false };
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
  if (f.series) q.set("series", f.series);
  if (wishlistIds) q.set("ids", wishlistIds.join(","));
  return q;
}

export interface Facets {
  total: number;
  categories: { name: string; count: number }[];
  shopCategories: (ShopCategory & { total: number })[];
  status: { in: number; pre: number; out: number };
}

export type HomeData = Omit<Homepage, "success"> & {
  promos?: { closingSoon: number; maxDiscountPct: number };
  freeShippingThresholdCents?: number;
};

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
      .then(([h, f]) => {
        if (on) {
          setHome(h);
          setFacets(f);
        }
      })
      .catch((e: Error) => {
        if (on) setError(e.message);
      });
    return () => {
      on = false;
    };
  }, [nonce]);
  return { home, facets, error, reload: useCallback(() => setNonce((n) => n + 1), []) };
}

/** One page of products for the current filters, with "load more". Re-queries when filters change. */
export function useProducts(filters: Filters, wishlistIds: string[] | null) {
  const query = useMemo(() => toQuery(filters, wishlistIds).toString(), [filters, wishlistIds]);
  const [state, setState] = useState<{
    items: Product[];
    total: number;
    cursor?: string;
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
  }>({ items: [], total: 0, loading: true, loadingMore: false, error: null });
  const latest = useRef(query);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    latest.current = query;
    setState((s) => ({ ...s, loading: true, error: null }));
    // Small debounce so typing in search or toggling filters doesn't fire a request per keystroke.
    const timer = window.setTimeout(() => {
      api<ProductPage>(`/products?${query}`)
        .then((page) => {
          if (latest.current === query)
            setState({ items: page.items, total: page.total, cursor: page.cursor, loading: false, loadingMore: false, error: null });
        })
        .catch((e: Error) => {
          if (latest.current === query) setState((s) => ({ ...s, loading: false, error: e.message }));
        });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [query, attempt]);

  const loadMore = useCallback(() => {
    if (!state.cursor || state.loadingMore) return;
    const q = new URLSearchParams(query);
    q.set("cursor", state.cursor);
    setState((s) => ({ ...s, loadingMore: true }));
    api<ProductPage>(`/products?${q}`)
      .then((page) => {
        if (latest.current === query)
          setState((s) => ({ ...s, items: [...s.items, ...page.items], cursor: page.cursor, loadingMore: false }));
      })
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
  /** The photo is a transparent cut-out (shown on the shop background). */
  imageCutout?: boolean;
  unitPriceCents: number;
  quantity: number;
  isPreorder: boolean;
  maxPerCustomer: number | null;
}

// ---------------------------------------------------------------- product pages
/** /product/<id>/<name-slug>. Only the id matters; the slug is for people reading the link. */
/** Lower-case words joined by dashes, accents dropped, for addresses ("Re:Zero" → "re-zero", "Pokémon" → "pokemon"). Keep in sync with
 * scripts/generate-seo.mjs and the API's slugify (src/modules/catalog/slug.ts), which matches /series/<slug> the same way. */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function productPath(p: Pick<Product, "id" | "name">) {
  const slug = slugify(p.name);
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

function cartLine(p: Product, qty: number): CartLine {
  return {
    variationId: p.variationId,
    itemId: p.id,
    name: p.name,
    imageUrl: p.images[0] ?? null,
    imageCutout: !!p.images[0] && !!p.cutouts?.includes(p.images[0]),
    unitPriceCents: p.priceCents,
    quantity: Math.min(qty, purchaseCap(p)),
    isPreorder: p.status === "pre",
    maxPerCustomer: p.maxPerCustomer,
  };
}

const CART_KEY = "spinhobby-cart-v3";
/** "Buy now" keeps its one item apart from the cart, so buying it doesn't empty or change the cart. */
const BUY_NOW_KEY = "spinhobby-buy-now-v1";
export const BUY_NOW_PATH = "/checkout/now";

/**
 * Starts "Buy now": checkout for just this item (and quantity), leaving the cart as it is. Saved straight away, before the
 * caller goes to BUY_NOW_PATH, so checkout reads it on arrival.
 */
export function startBuyNow(p: Product, qty = 1) {
  try {
    localStorage.setItem(BUY_NOW_KEY, JSON.stringify([cartLine(p, qty)]));
  } catch {
    /* storage blocked: checkout then shows nothing to buy and sends the shopper to the cart */
  }
}

/** The cart, kept in this browser. */
export function useCart() {
  return useLines(CART_KEY);
}
/** The one item from "Buy now", with the same controls as the cart (checkout uses either). */
export function useBuyNow() {
  return useLines(BUY_NOW_KEY);
}

function useLines(key: string) {
  const [lines, setLines] = useLocalState<CartLine[]>(key, []);
  const add = useCallback(
    (p: Product, qty = 1) => {
      setLines((current) => {
        const existing = current.find((l) => l.variationId === p.variationId);
        if (existing) {
          const cap = purchaseCap(p);
          return current.map((l) => (l.variationId === p.variationId ? { ...l, quantity: Math.min(l.quantity + qty, cap) } : l));
        }
        return [...current, cartLine(p, qty)];
      });
    },
    [setLines],
  );
  const setQty = useCallback(
    (variationId: string, quantity: number) => {
      setLines((current) =>
        quantity <= 0
          ? current.filter((l) => l.variationId !== variationId)
          : current.map((l) => (l.variationId === variationId ? { ...l, quantity: Math.min(quantity, l.maxPerCustomer ?? 99) } : l)),
      );
    },
    [setLines],
  );
  const count = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0), [lines]);
  const has = useCallback((variationId: string) => lines.some((l) => l.variationId === variationId), [lines]);
  const qtyOf = useCallback((variationId: string) => lines.find((l) => l.variationId === variationId)?.quantity ?? 0, [lines]);
  return { lines, add, setQty, count, subtotal, has, qtyOf };
}

// ---------------------------------------------------------------- wishlist
/** Local wishlist for guests; mirrored to /wishlist when signed in. */
/** Hearts saved by a guest, in this browser. (The name is kept so guests' existing hearts carry over.) */
const GUEST_WISHLIST_KEY = "spinhobby-wishlist-v3";

/**
 * The shopper's wishlist (the ♡ on products).
 *
 * - **Guests**: kept in this browser, since there is no account to save it to.
 * - **Signed in**: the account's list on the server is the one truth. A heart shows at once and the server is told; if the
 *   server refuses, the heart goes back and the shopper is told why.
 * - **Signing in** moves the guest's hearts into the account, then forgets the browser copy, so they show on every device.
 * - **Signing out** clears what's shown and the browser copy, so the next person on a shared computer doesn't see them (the
 *   account keeps them for next time).
 */
export function useWishlist(userId: string | null, onError: (message: string) => void) {
  const [guest, setGuest] = useLocalState<string[]>(GUEST_WISHLIST_KEY, []);
  const [account, setAccount] = useState<string[]>([]);
  const guestNow = useRef(guest);
  guestNow.current = guest;
  const previousUser = useRef<string | null>(userId);

  useEffect(() => {
    const before = previousUser.current;
    previousUser.current = userId;
    if (!userId) {
      setAccount([]);
      if (before) setGuest([]); // just signed out
      return;
    }
    let live = true;
    (async () => {
      const saved = (await api<{ items: Product[] }>("/wishlist")).items.map((p) => p.id);
      // hearts made before signing in that the account doesn't have yet (a product that's gone is skipped)
      const toMove = guestNow.current.filter((id) => !saved.includes(id));
      const moved = await Promise.all(
        toMove.map((id) =>
          api("/wishlist", { method: "POST", body: JSON.stringify({ squareItemId: id }) })
            .then(() => id)
            .catch(() => null),
        ),
      );
      if (!live) return;
      setAccount([...moved.filter((id): id is string => id !== null), ...saved]);
      setGuest([]);
    })().catch(() => {
      if (live) onError("Your wishlist couldn't be loaded. Try again in a moment.");
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the account changes; the guest list is read at that moment
  }, [userId]);

  const ids = userId ? account : guest;
  const toggle = useCallback(
    (p: Product) => {
      const on = ids.includes(p.id);
      const change = (list: string[]) => (on ? list.filter((id) => id !== p.id) : [p.id, ...list]);
      if (!userId) {
        setGuest(change);
        return;
      }
      setAccount(change);
      const request = on
        ? api(`/wishlist/${encodeURIComponent(p.id)}`, { method: "DELETE" })
        : api("/wishlist", { method: "POST", body: JSON.stringify({ squareItemId: p.id }) });
      request.catch((e: Error) => {
        // the server said no: show the heart as it really is
        setAccount((list) => (on ? [p.id, ...list.filter((id) => id !== p.id)] : list.filter((id) => id !== p.id)));
        onError(e.message);
      });
    },
    [ids, userId, setGuest, onError],
  );

  const set = useMemo(() => new Set(ids), [ids]);
  return { ids: set, list: ids, count: ids.length, toggle };
}

import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Dashboard, HeroSlide, Homepage, Order, Product, ProductPage, Readiness, ShopCategory, StoreEvent, StoreSettings } from "../types";

export type Screen = "Dashboard" | "Products" | "Categories" | "Orders" | "Homepage" | "Settings";
export const SCREENS: Screen[] = ["Dashboard", "Products", "Categories", "Orders", "Homepage", "Settings"];

export const DEFAULT_SETTINGS: StoreSettings = {
  payment_provider: "paypal", shipping_standard_cents: 899, shipping_express_cents: 1999, free_shipping_threshold_cents: 7500,
  low_stock_threshold: 3, fx_cad_usd: 0.73, handling_days_min: 2, handling_days_max: 3,
  maintenance_mode: false, maintenance_message: null,
};

export interface AdminData {
  dashboard: Dashboard | null;
  products: Product[];
  orders: Order[];
  slides: HeroSlide[];
  events: StoreEvent[];
  settings: StoreSettings;
  readiness: Readiness | null;
  categories: ShopCategory[];
  /** What the storefront hero shows when no custom slides exist (from GET /homepage). */
  previewSlides: HeroSlide[];
  loading: boolean;
  errors: string[];
}

async function allAdminProducts() {
  const items: Product[] = [];
  let cursor: string | undefined = "0";
  for (let i = 0; cursor !== undefined && i < 20; i += 1) {
    const page: ProductPage = await api<ProductPage>(`/admin/products?limit=60&cursor=${cursor}`);
    items.push(...page.items);
    cursor = page.cursor;
  }
  // Older server builds don't return is_featured on the list; recover it from the featured filter.
  if (items.length && items.every((p) => p.isFeatured === undefined)) {
    const featured = await api<ProductPage>("/admin/products?filter=featured&limit=60").catch(() => null);
    const ids = new Set(featured?.items.map((p) => p.id) ?? []);
    for (const p of items) p.isFeatured = ids.has(p.id);
  }
  return items;
}

export function useAdminData(enabled: boolean) {
  const [data, setData] = useState<AdminData>({
    dashboard: null, products: [], orders: [], slides: [], events: [], settings: DEFAULT_SETTINGS, readiness: null, categories: [], previewSlides: [], loading: true, errors: [],
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setData((d) => ({ ...d, loading: true }));
    const jobs = [
      api<Dashboard>("/admin/dashboard"),
      allAdminProducts(),
      api<{ items: Order[] }>("/admin/orders?limit=100"),
      api<{ slides: HeroSlide[] }>("/admin/homepage/slides"),
      api<{ events: StoreEvent[] }>("/admin/events"),
      api<{ settings: StoreSettings }>("/admin/settings"),
      api<{ readiness: Readiness }>("/admin/square/readiness"),
      api<{ categories: ShopCategory[] }>("/admin/categories"),
      api<Homepage>("/homepage"),
    ] as const;
    Promise.allSettled(jobs).then(([dash, products, orders, slides, events, settings, readiness, categories, home]) => {
      if (!active) return;
      const errors = [dash, products, orders, slides, events, settings, readiness, categories, home]
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => (r.reason as Error)?.message ?? "Request failed");
      const val = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
      setData({
        dashboard: val(dash),
        products: val(products) ?? [],
        orders: val(orders)?.items ?? [],
        slides: val(slides)?.slides ?? [],
        events: val(events)?.events ?? [],
        settings: val(settings)?.settings ?? DEFAULT_SETTINGS,
        readiness: val(readiness)?.readiness ?? null,
        categories: val(categories)?.categories ?? [],
        previewSlides: (val(home)?.slides ?? []) as HeroSlide[],
        loading: false,
        errors: Array.from(new Set(errors)),
      });
    });
    return () => { active = false; };
  }, [enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { data, setData, reload };
}

export const ORDER_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: "PENDING", bg: "var(--surface2)", fg: "var(--text2)" },
  paid: { label: "TO SHIP", bg: "var(--gold)", fg: "#1d2a53" },
  fulfilled: { label: "TO SHIP", bg: "var(--gold)", fg: "#1d2a53" },
  preorder_reserved: { label: "PRE-ORDER", bg: "var(--blue)", fg: "#fff" },
  shipped: { label: "SHIPPED", bg: "var(--teal)", fg: "#fff" },
  refunded: { label: "REFUNDED", bg: "var(--surface2)", fg: "var(--text2)" },
  cancelled: { label: "CANCELLED", bg: "var(--surface2)", fg: "var(--muted)" },
};

export function customerName(o: Order) {
  const a = o.shipping_address ?? o.billing_address;
  const first = a?.firstName ?? a?.name?.first;
  const last = a?.lastName ?? a?.name?.last;
  if (first || last) return `${first ? first[0] + "." : ""} ${last ?? ""}`.trim();
  return o.billing_email.split("@")[0];
}

export function addressLine(o: Order) {
  const a = o.shipping_address;
  if (!a) return "—";
  return [a.address1 ?? a.address?.primary, a.address2 ?? a.address?.secondary, [a.city, a.province].filter(Boolean).join(", "), a.postalCode, a.country]
    .filter(Boolean).join(", ");
}

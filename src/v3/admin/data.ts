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
  /** Closing-soon pre-orders and the biggest discount in the catalog (from GET /homepage). */
  promos: { closingSoon: number; maxDiscountPct: number };
  loading: boolean;
  errors: string[];
}

/**
 * The products the admin needs up front: the featured ones (Homepage screen) and the pre-orders. The whole catalog
 * can hold thousands of items, so the Products screen pages through it on its own instead of downloading it here.
 */
async function adminProductsUpFront() {
  const [featured, preorders] = await Promise.all([
    api<ProductPage>("/admin/products?filter=featured&limit=60"),
    api<ProductPage>("/admin/products?filter=pre&limit=60"),
  ]);
  const byId = new Map<string, Product>();
  for (const p of [...featured.items, ...preorders.items]) byId.set(p.id, p);
  return [...byId.values()];
}

export function useAdminData(enabled: boolean) {
  const [data, setData] = useState<AdminData>({
    dashboard: null, products: [], orders: [], slides: [], events: [], settings: DEFAULT_SETTINGS, readiness: null, categories: [], previewSlides: [], promos: { closingSoon: 0, maxDiscountPct: 0 }, loading: true, errors: [],
  });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setData((d) => ({ ...d, loading: true }));
    const jobs = [
      api<Dashboard>("/admin/dashboard"),
      adminProductsUpFront(),
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
        promos: val(home)?.promos ?? { closingSoon: 0, maxDiscountPct: 0 },
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

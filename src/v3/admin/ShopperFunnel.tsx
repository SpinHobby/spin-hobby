import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card, Stats } from "../../components";

/** What GET /admin/analytics returns (anonymous daily counts; paid orders come from the orders table). */
interface Analytics {
  days: number;
  totals: { visit: number; product_view: number; add_to_cart: number; checkout_view: number; paid: number };
  topProducts: { id: string; name: string | null; views: number; carts: number }[];
}

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "—");

/**
 * Dashboard: how shoppers moved through the shop over the last 30 days, step by step (visits, product views, add to cart,
 * checkout, paid), with how many made it from each step to the next, and the most viewed products.
 */
export function ShopperFunnel() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<Analytics>("/admin/analytics?days=30")
      .then(setData)
      .catch(() => setError(true));
  }, []);
  if (error) return null; // an API without analytics yet: show nothing rather than an error on the dashboard
  const t = data?.totals;
  const step = (label: string, value: number | undefined, from?: number) => ({
    label,
    value: t ? String(value ?? 0) : "…",
    note: t && from !== undefined ? `${pct(value ?? 0, from)} of the step before` : undefined,
  });
  return (
    <Card title="Shoppers, last 30 days" padded>
      <p className="ad-muted ad-sm" style={{ margin: "0 0 12px" }}>
        Anonymous counts: no cookies, nothing about who. Browsers that ask not to be tracked aren't counted, so the real numbers are a
        little higher. Paid orders count from the day counting began.
      </p>
      <Stats
        items={[
          step("Visits", t?.visit),
          step("Viewed a product", t?.product_view, t?.visit),
          step("Added to cart", t?.add_to_cart, t?.product_view),
          step("Opened checkout", t?.checkout_view, t?.add_to_cart),
          step("Paid orders", t?.paid, t?.checkout_view),
        ]}
      />
      {!!data?.topProducts.length && (
        <>
          <p className="ad-strong ad-sm" style={{ margin: "16px 0 6px" }}>
            Most viewed
          </p>
          {data.topProducts.slice(0, 5).map((p) => (
            <div key={p.id} className="ad-line">
              <span className="ad-line__main">{p.name ?? p.id}</span>
              <span className="ad-muted ad-sm">
                {p.views} {p.views === 1 ? "view" : "views"} · {p.carts} added to cart
              </span>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

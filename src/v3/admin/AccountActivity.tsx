import { useState } from "react";
import { Collapse, EmptyState, LineList, Stats } from "../../components";
import { dateLabel, money } from "../format";
import { ORDER_STATUS } from "./data";

/** What GET /admin/accounts/:id/activity returns. */
export interface Activity {
  summary: {
    orders: number;
    paidOrders: number;
    netSpentCents: number;
    averageOrderCents: number;
    refunds: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    favourites: number;
    alertsWaiting: number;
  };
  phone: string | null;
  orders: ActivityOrder[];
  favourites: { id: string; name: string; added_at: string; price_cents: number | null; status: string; image_url: string | null }[];
  addresses: Address[];
  alerts: { id: string; name: string; product_id: string; created_at: string; notified_at: string | null }[];
}
interface ActivityOrder {
  id: number;
  status: string;
  provider: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  refunded_cents: number;
  shipping_method: string;
  shipping_address: {
    firstName?: string;
    lastName?: string;
    address1?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  } | null;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
  guest: boolean;
  items: { name: string; imageUrl: string | null; unitPriceCents: number; quantity: number; preorder: boolean }[];
  events: { type: string; at: string; data: Record<string, unknown> }[];
}
interface Address {
  id: string;
  first_name: string;
  last_name: string;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
}

export type ActivityTab = "overview" | "orders" | "favourites" | "addresses" | "alerts";

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STOCK: Record<string, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Sold out",
  pre: "Pre-order",
  closed: "Pre-order closed",
  hidden: "Not in the shop",
};
const EVENT: Record<string, string> = {
  created: "Order placed",
  paid: "Paid",
  shipped: "Shipped",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

function OrderStatus({ status }: { status: string }) {
  const st = ORDER_STATUS[status] ?? ORDER_STATUS.pending;
  return (
    <span className="sh-badge" style={{ background: st.bg, color: st.fg }}>
      {st.label}
    </span>
  );
}

function addressText(a: Pick<Address, "address1" | "address2" | "city" | "province" | "postal_code" | "country">) {
  return [a.address1, a.address2, `${a.city}, ${a.province}`, a.postal_code, a.country].filter(Boolean).join(" · ");
}

/** The account's activity, one tab at a time (the drawer's Tabs pick which). */
export function AccountActivity({ tab, activity, email }: { tab: ActivityTab; activity: Activity; email: string }) {
  if (tab === "orders") return <Orders orders={activity.orders} />;
  if (tab === "favourites") return <Favourites rows={activity.favourites} />;
  if (tab === "addresses") return <Addresses rows={activity.addresses} />;
  if (tab === "alerts") return <Alerts rows={activity.alerts} />;
  return <Overview activity={activity} email={email} />;
}

function Overview({ activity, email }: { activity: Activity; email: string }) {
  const s = activity.summary;
  const home = activity.addresses.find((a) => a.is_default) ?? activity.addresses[0];
  return (
    <div className="ad-acct">
      <dl className="ad-acct__facts">
        <dt>Email</dt>
        <dd>
          <a href={`mailto:${email}`}>{email}</a>
        </dd>
        <dt>Phone</dt>
        <dd>{activity.phone ? <a href={`tel:${activity.phone.replace(/[^+\d]/g, "")}`}>{activity.phone}</a> : "—"}</dd>
        <dt>Ships to</dt>
        <dd>{home ? addressText(home) : "No saved address"}</dd>
        <dt>Orders</dt>
        <dd>
          {s.orders
            ? `${dateLabel(s.firstOrderAt)} to ${dateLabel(s.lastOrderAt)}${s.refunds ? ` · ${plural(s.refunds, "refund")}` : ""}`
            : "None yet"}
        </dd>
      </dl>
      <Stats
        items={[
          { label: "Spent", value: money(s.netSpentCents), note: `after refunds, ${plural(s.paidOrders, "paid order")}` },
          { label: "Average order", value: s.paidOrders ? money(s.averageOrderCents) : "—" },
          { label: "Favourites", value: String(s.favourites), note: `${plural(s.alertsWaiting, "restock alert")} waiting` },
        ]}
      />
      {!!activity.orders.length && (
        <section className="ad-acct__section">
          <h3 className="ad-h3">Latest orders</h3>
          <Orders orders={activity.orders.slice(0, 3)} />
        </section>
      )}
    </div>
  );
}

function Orders({ orders }: { orders: ActivityOrder[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!orders.length) return <EmptyState>No orders yet.</EmptyState>;
  return (
    <div className="ad-acts">
      {orders.map((o) => {
        const isOpen = open === o.id;
        const units = o.items.reduce((n, i) => n + i.quantity, 0);
        return (
          <div key={o.id} className={`ad-acts__order ${isOpen ? "is-open" : ""}`}>
            <button type="button" className="ad-acts__head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.id)}>
              <b>#{o.id}</b>
              <span className="ad-muted ad-sm">{dateLabel(o.created_at)}</span>
              <span className="ad-acts__what ad-sm">
                {plural(units, "item")}
                {o.guest && <span className="ad-muted"> · as a guest</span>}
              </span>
              <OrderStatus status={o.status} />
              <b className="ad-acts__total">{money(o.total_cents)}</b>
            </button>
            <Collapse open={isOpen}>
              <div className="ad-acts__body">
                <ul className="ad-acts__items">
                  {o.items.map((i, n) => (
                    <li key={n}>
                      {i.imageUrl ? <img src={i.imageUrl} alt="" loading="lazy" /> : <span className="ad-acts__noimg" />}
                      <span>
                        {i.name}
                        {i.preorder && <span className="ad-muted ad-sm"> · pre-order</span>}
                      </span>
                      <span className="ad-muted ad-sm">
                        {i.quantity} × {money(i.unitPriceCents)}
                      </span>
                    </li>
                  ))}
                </ul>
                <dl className="ad-acct__facts ad-sm">
                  <dt>Subtotal</dt>
                  <dd>{money(o.subtotal_cents)}</dd>
                  <dt>Shipping</dt>
                  <dd>
                    {o.shipping_cents ? money(o.shipping_cents) : "Free"} ({o.shipping_method})
                  </dd>
                  <dt>Tax</dt>
                  <dd>{money(o.tax_cents)}</dd>
                  {o.refunded_cents > 0 && (
                    <>
                      <dt>Refunded</dt>
                      <dd>{money(o.refunded_cents)}</dd>
                    </>
                  )}
                  <dt>Paid with</dt>
                  <dd>{o.provider === "square" ? "Square" : "PayPal"}</dd>
                  {o.shipping_address && (
                    <>
                      <dt>Ship to</dt>
                      <dd>
                        {[o.shipping_address.address1, o.shipping_address.city, o.shipping_address.province, o.shipping_address.postalCode]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </>
                  )}
                  {o.tracking_number && (
                    <>
                      <dt>Tracking</dt>
                      <dd>
                        {o.carrier} {o.tracking_number}
                      </dd>
                    </>
                  )}
                </dl>
                <ol className="ad-acts__timeline ad-sm">
                  {o.events.map((e, n) => (
                    <li key={n}>
                      <span className="ad-muted">{dateLabel(e.at)}</span> {EVENT[e.type] ?? e.type}
                      {typeof e.data.amount_cents === "number" && ` (${money(e.data.amount_cents)})`}
                    </li>
                  ))}
                </ol>
              </div>
            </Collapse>
          </div>
        );
      })}
    </div>
  );
}

function Favourites({ rows }: { rows: Activity["favourites"] }) {
  if (!rows.length) return <EmptyState>No favourites yet.</EmptyState>;
  return (
    <ul className="ad-acts__items ad-acts__items--roomy">
      {rows.map((f) => (
        <li key={f.id}>
          {f.image_url ? <img src={f.image_url} alt="" loading="lazy" /> : <span className="ad-acts__noimg" />}
          <span>
            {f.name}
            <span className="ad-muted ad-sm" style={{ display: "block" }}>
              {STOCK[f.status] ?? f.status} · hearted {dateLabel(f.added_at)}
            </span>
          </span>
          <b className="ad-sm">{f.price_cents != null ? money(f.price_cents) : "—"}</b>
        </li>
      ))}
    </ul>
  );
}

function Addresses({ rows }: { rows: Address[] }) {
  return (
    <LineList
      rows={rows}
      rowKey={(a) => a.id}
      main={(a) => (
        <span>
          <b>
            {a.first_name} {a.last_name}
          </b>
          <span className="ad-muted ad-sm" style={{ display: "block" }}>
            {addressText(a)}
            {a.phone && ` · ${a.phone}`}
          </span>
        </span>
      )}
      value={(a) => (a.is_default ? <span className="ad-sm">Default</span> : null)}
      empty="No saved addresses."
    />
  );
}

function Alerts({ rows }: { rows: Activity["alerts"] }) {
  return (
    <LineList
      rows={rows}
      rowKey={(a) => a.id}
      id={(a) => dateLabel(a.created_at)}
      main={(a) => a.name}
      value={(a) => <span className="ad-muted ad-sm">{a.notified_at ? `Emailed ${dateLabel(a.notified_at)}` : "Waiting for stock"}</span>}
      empty="No restock alerts."
    />
  );
}

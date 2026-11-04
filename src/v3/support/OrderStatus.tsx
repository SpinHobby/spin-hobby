import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import "../../components/styles/tokens.scss";
import "./support.scss";
import { api } from "../../lib/api";
import { dateLabel, price } from "../format";
import { SUPPORT_EMAIL } from "../links";
import { photo } from "../photo";
import { useDocumentHead } from "../seo";

/** What GET /orders/lookup returns: only what a shopper needs to follow their order. */
interface FoundOrder {
  id: number;
  status: string;
  createdAt: string;
  shippingMethod: string;
  subtotalCents: number;
  discountCode?: string | null;
  discountCents?: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  refundedCents: number;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  shipTo: { city: string | null; province: string | null; country: string | null };
  items: { name: string; imageUrl: string | null; quantity: number; unitPriceCents: number; isPreorder: boolean }[];
  events: { type: string; at: string }[];
}

/** The status in a shopper's words, and what happens next. */
const STATUS: Record<string, { label: string; tone: "wait" | "good" | "done"; next: string }> = {
  paid: { label: "Paid", tone: "wait", next: "We're packing it. You'll get an email with tracking when it ships." },
  fulfilled: { label: "Paid", tone: "wait", next: "We're packing it. You'll get an email with tracking when it ships." },
  preorder_reserved: {
    label: "Pre-order reserved",
    tone: "wait",
    next: "Your item is reserved. It ships when it's released, and you'll get an email with tracking then.",
  },
  shipped: { label: "Shipped", tone: "good", next: "It's on its way." },
  refunded: { label: "Refunded", tone: "done", next: "This order was refunded to the card or account you paid with." },
  cancelled: { label: "Cancelled", tone: "done", next: "This order was cancelled." },
};
const EVENT: Record<string, string> = { created: "Order placed", paid: "Paid", shipped: "Shipped", refunded: "Refunded" };

/** A carrier's tracking page, where we know it. */
function trackingUrl(carrier: string | null, number: string) {
  const c = (carrier ?? "").toLowerCase();
  const n = encodeURIComponent(number);
  if (c.includes("canada post")) return `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes("purolator")) return `https://www.purolator.com/en/shipping/tracker?pin=${n}`;
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  return null;
}

/**
 * /order-status: find an order without an account, with its number and the email it was placed with (as on the confirmation
 * email, whose link fills in the number). Shows its status, items, totals and tracking.
 */
export default function OrderStatus() {
  const { pathname, search } = useLocation();
  useDocumentHead({
    title: "Order status | Spin Hobby",
    description: "Check the status of your Spin Hobby order with your order number and email.",
    path: pathname,
  });
  const [number, setNumber] = useState(() => new URLSearchParams(search).get("order")?.replace(/\D/g, "") ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<FoundOrder | null>(null);

  const find = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setOrder(null);
    const n = number.replace(/\D/g, "");
    if (!n || !email.trim()) {
      setError("Enter your order number and the email you used at checkout.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ order: FoundOrder }>(`/orders/lookup?${new URLSearchParams({ order: n, email: email.trim() })}`);
      setOrder(res.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="sp-wrap">
      <Link to="/support" className="sp-back">
        ← Help &amp; support
      </Link>
      <h1>Order status</h1>
      <p className="sp-lead">Enter your order number (it's on your confirmation email, like #123) and the email you used at checkout.</p>

      <form className="sp-card sp-lookup" onSubmit={find}>
        <label>
          <span>Order number</span>
          <input
            className="sh-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        <label>
          <span>Email</span>
          <input
            className="sh-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button type="submit" className="sh-btn" disabled={busy}>
          {busy ? "Looking…" : "Find my order"}
        </button>
        {error && (
          <p className="sp-lookup__error" role="alert">
            {error} Still stuck? Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Order%20status`}>{SUPPORT_EMAIL}</a>.
          </p>
        )}
      </form>

      {order && <OrderCard order={order} />}
    </main>
  );
}

function OrderCard({ order: o }: { order: FoundOrder }) {
  const st = STATUS[o.status] ?? { label: o.status, tone: "wait" as const, next: "" };
  const link = o.trackingNumber ? trackingUrl(o.carrier, o.trackingNumber) : null;
  const where = [o.shipTo.city, o.shipTo.province, o.shipTo.country].filter(Boolean).join(", ");
  return (
    <section className="sp-card sp-order" aria-labelledby="sp-order-title" aria-live="polite">
      <div className="sp-order__head">
        <h2 id="sp-order-title">Order #{o.id}</h2>
        <span className={`sp-order__status is-${st.tone}`}>{st.label}</span>
      </div>
      <p className="sp-hint">
        Placed {dateLabel(o.createdAt)}
        {where && ` · shipping to ${where}`}. {st.next}
      </p>

      {o.trackingNumber && (
        <p className="sp-order__track">
          {o.carrier ?? "Tracking"}:{" "}
          {link ? (
            <a href={link} target="_blank" rel="noreferrer">
              {o.trackingNumber} ↗
            </a>
          ) : (
            <b>{o.trackingNumber}</b>
          )}
        </p>
      )}

      <ul className="sp-order__items">
        {o.items.map((i, n) => (
          <li key={n}>
            {i.imageUrl ? <img {...photo(i.imageUrl, 96)} alt="" loading="lazy" /> : <span className="sp-order__noimg" />}
            <span>
              {i.name}
              {i.isPreorder && <small> · pre-order</small>}
            </span>
            <span className="sp-order__qty">
              {i.quantity} × {price(i.unitPriceCents)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="sp-order__totals">
        <dt>Subtotal</dt>
        <dd>{price(o.subtotalCents)}</dd>
        {!!o.discountCents && (
          <>
            <dt>Discount{o.discountCode ? ` (${o.discountCode})` : ""}</dt>
            <dd>−{price(o.discountCents)}</dd>
          </>
        )}
        <dt>Shipping ({o.shippingMethod})</dt>
        <dd>{o.shippingCents ? price(o.shippingCents) : "Free"}</dd>
        <dt>Tax</dt>
        <dd>{price(o.taxCents)}</dd>
        <dt>
          <b>Total</b>
        </dt>
        <dd>
          <b>{price(o.totalCents)}</b>
        </dd>
        {o.refundedCents > 0 && (
          <>
            <dt>Refunded</dt>
            <dd>{price(o.refundedCents)}</dd>
          </>
        )}
      </dl>

      <ol className="sp-order__timeline">
        {o.events.map((e, n) => (
          <li key={n}>
            <span>{dateLabel(e.at)}</span> {EVENT[e.type] ?? e.type}
          </li>
        ))}
      </ol>
    </section>
  );
}

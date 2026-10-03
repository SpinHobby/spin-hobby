import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import "../tokens.scss";
import "./support.scss";
import { handlingLabel, money } from "../format";
import { DISCORD_URL, EBAY_URL, INSTAGRAM_URL, SUPPORT_EMAIL } from "../links";
import { useDocumentHead } from "../seo";
import { useStoreConfig } from "../storeConfig";

/** Topic buttons open the visitor's mail app with a ready subject line and a prompt for the details we need. */
const TOPICS: { label: string; subject: string; body: string }[] = [
  { label: "Order question", subject: "Order question", body: "Order number:\nEmail used at checkout:\n\nHow can we help?\n" },
  { label: "Pre-order", subject: "Pre-order question", body: "Item:\nOrder number (if you have one):\n\nHow can we help?\n" },
  { label: "Shipping", subject: "Shipping question", body: "Order number (if you have one):\nShip-to country and province/state:\n\nHow can we help?\n" },
  { label: "Damaged or wrong item", subject: "Problem with my order", body: "Order number:\n\nWhat arrived? Please attach photos of the item and the packaging.\n" },
  { label: "Something else", subject: "Question for Spin Hobby", body: "" },
];

const mailto = (subject: string, body = "") =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ""}`;

export default function Support() {
  const { hash, pathname } = useLocation();
  const config = useStoreConfig();

  useDocumentHead({
    title: "Help & Support | Spin Hobby",
    description: "Contact Spin Hobby and find answers on shipping, pre-orders, order status, returns and restock alerts.",
    path: pathname,
  });

  // Footer links point at /support#shipping etc.: open that answer and bring it into view.
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (!target) { window.scrollTo({ top: 0 }); return; }
    if (target instanceof HTMLDetailsElement) target.open = true;
    target.scrollIntoView({ block: "start" });
  }, [hash]);

  const shipping = config
    ? `Standard shipping is ${money(config.shippingStandardCents)} and express is ${money(config.shippingExpressCents)}. Orders of ${money(config.freeShippingThresholdCents)} or more ship free. All prices are in CAD (you can browse in USD, but you're charged in CAD).`
    : "Shipping costs are shown in your cart before you pay, and larger orders ship free.";

  return (
    <>
      <main className="sp-wrap">
        <Link to="/" className="sp-back">← Back to the store</Link>
        <h1>Help &amp; support</h1>
        <p className="sp-lead">Questions about an order, a pre-order or a product? Email us and we'll get back to you.</p>

        <section id="contact" className="sp-card" aria-labelledby="sp-contact">
          <h2 id="sp-contact">Contact us</h2>
          <a className="sp-email" href={mailto("Question for Spin Hobby")}>{SUPPORT_EMAIL}</a>
          <p className="sp-hint">Pick a topic and your mail app opens with the details we usually need. For order questions, include your order number.</p>
          <div className="sp-topics">
            {TOPICS.map((t) => (
              <a key={t.label} className="sp-chip" href={mailto(t.subject, t.body)}>{t.label}</a>
            ))}
          </div>
        </section>

        <section className="sp-card" aria-labelledby="sp-elsewhere">
          <h2 id="sp-elsewhere">Find us elsewhere</h2>
          <ul className="sp-links">
            <li><a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a><span>Drop alerts and chat with the community</span></li>
            <li><a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a><span>New arrivals and convention updates</span></li>
            <li><a href={EBAY_URL} target="_blank" rel="noreferrer">eBay store ↗</a><span>Our listings on eBay Canada</span></li>
            <li><a href="/#events">Events</a><span>Conventions where you can meet us in person</span></li>
          </ul>
        </section>

        <h2 className="sp-h2">Quick answers</h2>
        <div className="sp-faq">
          <details id="shipping">
            <summary>Where do you ship, and what does it cost?</summary>
            <p>We ship across Canada and to the United States. {shipping}</p>
            <p>For US orders, the destination country may charge duties or import taxes on arrival; those aren&apos;t included in what you pay us. See section 5 of our <Link to="/legal/terms">Terms of Service</Link>.</p>
          </details>
          <details id="order-status">
            <summary>When will my order ship, and how do I track it?</summary>
            <p>In-stock orders are packed within {handlingLabel()}. When your order ships we email you the carrier and tracking number.</p>
            <p>If you checked out while signed in, your orders are saved to your account. If you can&apos;t find a tracking email, <a href={mailto("Order status", TOPICS[0].body)}>email us</a> with your order number.</p>
          </details>
          <details id="preorders">
            <summary>How do pre-orders work?</summary>
            <p>Pre-orders are charged when you check out and ship as soon as the item arrives; we email you when it&apos;s on its way. Release dates are set by the maker and can move, so treat them as estimates.</p>
            <p>Cancellation terms for pre-orders are in section 6 of our <Link to="/legal/terms">Terms of Service</Link>.</p>
          </details>
          <details id="restock">
            <summary>An item is sold out. Will it come back?</summary>
            <p>Open the product and choose <b>Notify me</b>. Enter your email and we&apos;ll let you know when it&apos;s back in stock. You can also join our <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a> for drop alerts.</p>
          </details>
          <details id="returns">
            <summary>My item arrived damaged or isn&apos;t what I ordered</summary>
            <p>We&apos;re sorry about that! <a href={mailto("Problem with my order", TOPICS[3].body)}>Email us</a> with your order number and photos of the item and packaging, and we&apos;ll work out a replacement or refund. Our full returns terms are in section 6 of the <Link to="/legal/terms">Terms of Service</Link>.</p>
          </details>
          <details id="payment">
            <summary>Is paying on the site safe?</summary>
            <p>Payments are handled by Square and PayPal. Your card details go straight to them and are never stored on our servers. More in our <Link to="/legal/privacy">Privacy Policy</Link>.</p>
          </details>
        </div>
      </main>
    </>
  );
}

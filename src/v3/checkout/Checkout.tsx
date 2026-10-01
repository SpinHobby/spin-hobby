import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../tokens.scss";
import "./checkout.scss";
import { api } from "../../lib/api";
import { money } from "../format";
import { useAuth, useLocalState, useTheme } from "../hooks";
import { SUPPORT_EMAIL } from "../links";
import { loadStoreConfig } from "../storeConfig";
import { useCart } from "../storefront/data";
import { PayPalPay, SquarePay, type CheckoutConfig } from "./Payments";
import { POSTAL_RE, PROVINCES, STATES } from "./regions";

const LOGO = "/logo/logo%20cropped.png";
const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";

interface Address {
  firstName: string; lastName: string; address1: string; address2: string;
  city: string; province: string; postalCode: string; country: "CA" | "US"; phone: string;
}
const EMPTY_ADDRESS: Address = { firstName: "", lastName: "", address1: "", address2: "", city: "", province: "AB", postalCode: "", country: "CA", phone: "" };

interface QuoteLine { variationId: string; itemId: string; name: string; imageUrl: string | null; unitPriceCents: number; quantity: number; isPreorder: boolean; lineCents: number }
interface Quote {
  lines: QuoteLine[]; subtotalCents: number; shippingCents: number; taxCents: number; totalCents: number;
  warnings: { variationId: string; code: string; message: string }[];
}

// Fallback when the server doesn't expose /checkout/config yet. Only PayPal can work without it,
// and only if the client ID matches the server's PAYPAL_CLIENT_ID.
const ENV_PAYPAL_ID: string | undefined = import.meta.env.VITE_PAYPAL_CLIENT_ID;

function addressErrors(a: Address) {
  const e: Partial<Record<keyof Address, string>> = {};
  if (!a.firstName.trim()) e.firstName = "Required";
  if (!a.lastName.trim()) e.lastName = "Required";
  if (!a.address1.trim()) e.address1 = "Required";
  if (!a.city.trim()) e.city = "Required";
  if (!POSTAL_RE[a.country].test(a.postalCode.trim())) e.postalCode = a.country === "CA" ? "Use A1A 1A1" : "Use 12345";
  return e;
}

export default function Checkout() {
  useTheme();
  const auth = useAuth();
  const cart = useCart();
  const [email, setEmail] = useLocalState("spinhobby-checkout-email", "");
  const [ship, setShip] = useLocalState<Address>("spinhobby-checkout-address", EMPTY_ADDRESS);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBill] = useState<Address>(EMPTY_ADDRESS);
  const [touched, setTouched] = useState(false);          // a payment attempt: show every problem
  const [blurred, setBlurred] = useState<Set<string>>(new Set()); // fields the shopper has left: show their problems
  const leave = (field: string) => setBlurred((b) => (b.has(field) ? b : new Set(b).add(field)));
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);
  const [payError, setPayError] = useState("");
  const [done, setDone] = useState<{ orderId: number; status: string } | null>(null);
  const orderIdRef = useRef<number | null>(null);

  useEffect(() => { if (!email && auth.email) setEmail(auth.email); }, [auth.email, email, setEmail]);

  useEffect(() => {
    loadStoreConfig().then((c) => {
      if (c) setConfig(c);
      else if (ENV_PAYPAL_ID) {
        setConfig({ provider: "paypal", paypalClientId: ENV_PAYPAL_ID, paypalEnv: "sandbox", squareApplicationId: null, squareLocationId: null, squareEnv: "sandbox", shippingStandardCents: 899, shippingExpressCents: 1999, freeShippingThresholdCents: 7500 });
      } else {
        setConfigError("Online payment isn't available right now.");
      }
    });
  }, []);

  const quoteInput = useMemo(() => ({
    items: cart.lines.map((l) => ({ variationId: l.variationId, quantity: l.quantity })),
    shippingMethod: method, country: ship.country, province: ship.province,
  }), [cart.lines, method, ship.country, ship.province]);

  useEffect(() => {
    if (!cart.lines.length) { setQuote(null); return; }
    let active = true;
    setQuoting(true);
    const timer = window.setTimeout(() => {
      api<Quote & { success: true }>("/cart/quote", { method: "POST", body: JSON.stringify(quoteInput) })
        .then((q) => { if (active) { setQuote(q); setQuoteError(""); } })
        .catch((e: Error) => { if (active) { setQuote(null); setQuoteError(e.message); } })
        .finally(() => { if (active) setQuoting(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [quoteInput, cart.lines.length]);

  const shipErrors = addressErrors(ship);
  const billErrors = billingSame ? {} : addressErrors(bill);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formValid = emailOk && !Object.keys(shipErrors).length && !Object.keys(billErrors).length;
  const quoteOk = !!quote && quote.lines.length > 0 && quote.warnings.length === 0;
  const canPay = formValid && quoteOk && !quoting;
  // Payment is on the page from the start; this says what still stands between the shopper and it.
  const missing = [!emailOk && "your email", Object.keys(shipErrors).length > 0 && "your shipping address", Object.keys(billErrors).length > 0 && "your billing address"].filter((m): m is string => Boolean(m));
  const hint = quoting ? "Updating totals…"
    : missing.length ? `Fill in ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0]} above to pay.`
    : quote?.warnings.length ? "Update your cart to continue."
    : !quote && !quoteError ? "Working out your totals…" : "";

  const applyQuote = () => {
    if (!quote) return;
    const q = new Map(quote.lines.map((l) => [l.variationId, l.quantity]));
    for (const l of cart.lines) cart.setQty(l.variationId, q.get(l.variationId) ?? 0);
  };

  const toServerAddress = (a: Address) => ({
    firstName: a.firstName.trim(), lastName: a.lastName.trim(), address1: a.address1.trim(), address2: a.address2.trim() || undefined,
    city: a.city.trim(), province: a.province, postalCode: a.postalCode.trim().toUpperCase(), country: a.country, phone: a.phone.trim() || undefined,
  });

  const createIntent = useCallback(async () => {
    setPayError("");
    setTouched(true);
    if (!canPay) throw new Error("Complete your details first.");
    const res = await api<{ orderId: number; provider: "paypal" | "square"; paypalOrderId?: string; amountCents?: number }>("/checkout/intent", {
      method: "POST",
      body: JSON.stringify({ quote: quoteInput, email: email.trim(), shipping: toServerAddress(ship), billing: toServerAddress(billingSame ? ship : bill) }),
    });
    orderIdRef.current = res.orderId;
    return res;
  }, [canPay, quoteInput, email, ship, bill, billingSame]);

  const finish = (orderId: number, status: string) => {
    for (const l of cart.lines) cart.setQty(l.variationId, 0);
    setDone({ orderId, status });
    window.history.replaceState(null, "", `/checkout/success?order=${orderId}`);
    window.scrollTo({ top: 0 });
  };

  const onPayPalCreate = async () => {
    try {
      const res = await createIntent();
      if (!res.paypalOrderId) throw new Error("PayPal checkout isn't active. Refresh and try again.");
      return res.paypalOrderId;
    } catch (e) { setPayError(e instanceof Error ? e.message : "Checkout failed."); throw e; }
  };
  const onPayPalApprove = async (paypalOrderId: string) => {
    try {
      const res = await api<{ orderId: number; status: string }>("/paypal/capture", { method: "POST", body: JSON.stringify({ paypalOrderId }) });
      finish(res.orderId, res.status);
    } catch (e) { setPayError(e instanceof Error ? e.message : "Payment couldn't be captured."); }
  };

  const onSquarePay = async (tokenize: (amountCents: number) => Promise<{ sourceId: string; verificationToken?: string }>) => {
    setTouched(true);
    if (!canPay || !quote) { setPayError("Complete your details first."); return; }
    try {
      const token = await tokenize(quote.totalCents); // card errors surface before an order is created
      const intent = await createIntent();
      const res = await api<{ orderId: number; status: string }>("/square/payments", {
        method: "POST", body: JSON.stringify({ orderId: intent.orderId, email: email.trim(), sourceId: token.sourceId, verificationToken: token.verificationToken }),
      });
      finish(res.orderId, res.status);
    } catch (e) { setPayError(e instanceof Error ? e.message : "Payment failed."); }
  };

  if (done) return <Success orderId={done.orderId} preorder={done.status === "preorder_reserved"} email={email} />;
  const returning = window.location.pathname.startsWith("/checkout/success") ? Number(new URLSearchParams(window.location.search).get("order")) : 0;
  if (returning) return <Success orderId={returning} preorder={false} email={email} />;

  const regions = ship.country === "CA" ? PROVINCES : STATES;
  const show = (errs: Partial<Record<keyof Address, string>>, prefix: string, k: keyof Address) => (touched || blurred.has(`${prefix}.${k}`) ? errs[k] : undefined);
  const freeLeft = config ? Math.max(config.freeShippingThresholdCents - (quote?.subtotalCents ?? cart.subtotal), 0) : 0;

  return (
    <div className="sh co">
      <header className="co-head">
        <div className="co-wrap co-head__row">
          <a href="/" className="co-logo"><img src={LOGO} alt="Spin Hobby" /></a>
          <span className="co-head__secure">🔒 Secure checkout</span>
          <a href="/" className="co-head__back">← Continue shopping</a>
        </div>
      </header>

      {cart.lines.length === 0 ? (
        <div className="co-wrap co-empty">
          <img src={MASCOT} alt="" />
          <h1 className="sh-display">Your cart is empty</h1>
          <p>Add something from the shop and come back here to check out.</p>
          <a href="/" className="sh-btn">Back to the shop</a>
        </div>
      ) : (
        <div className="co-wrap co-grid">
          <main className="co-form">
            <h1 className="sh-display co-title">Checkout</h1>

            <section className="co-card">
              <h2>Contact</h2>
              <Field label="Email" error={(touched || blurred.has("email")) && !emailOk ? "Enter a valid email" : undefined}>
                <input className="sh-input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => leave("email")} placeholder="you@example.com" />
              </Field>
              <p className="co-note">Your receipt and shipping updates go here.{!auth.email && " Sign in from the shop to save orders to your account."}</p>
            </section>

            <section className="co-card">
              <h2>Shipping address</h2>
              <AddressForm value={ship} onChange={setShip} errors={(k) => show(shipErrors, "shipping", k)} onBlur={(k) => leave(`shipping.${k}`)} regions={regions} prefix="shipping" />
            </section>

            <section className="co-card">
              <h2>Shipping method</h2>
              <div className="co-methods">
                {(["standard", "express"] as const).map((m) => {
                  const price = m === "express" ? config?.shippingExpressCents : (quote?.subtotalCents ?? cart.subtotal) >= (config?.freeShippingThresholdCents ?? 7500) ? 0 : config?.shippingStandardCents;
                  return (
                    <label key={m} className={`co-method ${method === m ? "is-active" : ""}`}>
                      <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                      <span className="co-method__main">
                        <b>{m === "express" ? "Express" : "Standard"}</b>
                        <span>{m === "express" ? "2–3 business days, tracked" : "5–7 business days, tracked"}</span>
                      </span>
                      <b>{price === undefined ? "—" : price === 0 ? "Free" : money(price)}</b>
                    </label>
                  );
                })}
              </div>
              {method === "standard" && freeLeft > 0 && <p className="co-note">Add {money(freeLeft)} more for free standard shipping.</p>}
            </section>

            <section className="co-card">
              <h2>Billing address</h2>
              <label className="co-check"><input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />Same as shipping address</label>
              {!billingSame && <AddressForm value={bill} onChange={setBill} errors={(k) => show(billErrors, "billing", k)} onBlur={(k) => leave(`billing.${k}`)} regions={bill.country === "CA" ? PROVINCES : STATES} prefix="billing" />}
            </section>

            <section className="co-card">
              <h2>Payment</h2>
              {configError ? (
                <div className="co-alert">{configError} Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we'll send you an invoice.</div>
              ) : !config ? (
                <div className="sh-skeleton" style={{ height: 48 }} />
              ) : (
                <>
                  {!formValid && touched && <div className="co-alert">Check the highlighted fields above.</div>}
                  {config.provider === "paypal" && config.paypalClientId ? (
                    <PayPalPay clientId={config.paypalClientId} disabled={!canPay} createOrder={onPayPalCreate} onApprove={onPayPalApprove} onError={setPayError} />
                  ) : config.provider === "square" ? (
                    <SquarePay config={config} disabled={!quoteOk || quoting} amountLabel={quote ? money(quote.totalCents) : "—"} pay={onSquarePay} onError={setPayError}
                      billing={{ givenName: ship.firstName, familyName: ship.lastName, email, countryCode: ship.country, city: ship.city, postalCode: ship.postalCode, addressLines: [ship.address1, ship.address2].filter(Boolean) }} />
                  ) : (
                    <div className="co-alert">Online payment isn't available right now. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</div>
                  )}
                  {!canPay && hint && ((config.provider === "paypal" && config.paypalClientId) || config.provider === "square") && <p className="co-note co-hint" aria-live="polite">{hint}</p>}
                  {payError && <div className="co-alert co-alert--error" role="alert">{payError}</div>}
                </>
              )}
              <p className="co-note">Charged in CAD. Pre-order items are charged now and ship on release.</p>
            </section>
          </main>

          <aside className="co-summary">
            <div className="co-card co-card--sticky">
              <h2>Order summary</h2>
              {cart.lines.map((l) => {
                // Quantities come straight from the cart so the steppers respond at once; prices from the server's quote once it lands.
                const unit = quote?.lines.find((q) => q.variationId === l.variationId)?.unitPriceCents ?? l.unitPriceCents;
                return (
                  <div key={l.variationId} className="co-line">
                    <div className={`sh-thumb ${l.imageUrl ? "" : "sh-ph sh-ph--sm"}`} style={{ width: 56, height: 56 }}>
                      {l.imageUrl && <img src={l.imageUrl} alt="" />}
                    </div>
                    <div className="co-line__main">
                      <span>{l.name}</span>
                      {l.isPreorder && <span className="co-pre">Pre-order</span>}
                      <div className="co-qty" aria-label={`Quantity for ${l.name}`}>
                        <button type="button" onClick={() => cart.setQty(l.variationId, l.quantity - 1)} aria-label="Decrease">−</button>
                        <span>{l.quantity}</span>
                        <button type="button" onClick={() => cart.setQty(l.variationId, l.quantity + 1)} aria-label="Increase"
                          disabled={l.maxPerCustomer != null && l.quantity >= l.maxPerCustomer}>+</button>
                        <button type="button" className="co-qty__remove" onClick={() => cart.setQty(l.variationId, 0)}>Remove</button>
                      </div>
                    </div>
                    <b>{money(unit * l.quantity)}</b>
                  </div>
                );
              })}
              {quote && quote.warnings.length > 0 && (
                <div className="co-alert co-alert--warn">
                  <b>Your cart changed</b>
                  <ul>{quote.warnings.map((w) => <li key={w.variationId + w.code}>{w.message}</li>)}</ul>
                  <button type="button" className="sh-btn sh-btn--ghost" onClick={applyQuote}>Update my cart</button>
                </div>
              )}
              {quoteError && <div className="co-alert co-alert--error">{quoteError}</div>}
              <div className="co-totals">
                <Row label="Subtotal" value={quote ? money(quote.subtotalCents) : money(cart.subtotal)} />
                <Row label={`Shipping (${method === "express" ? "Express" : "Standard"})`} value={quote ? (quote.shippingCents ? money(quote.shippingCents) : "Free") : "—"} />
                <Row label="Tax" value={quote ? money(quote.taxCents) : "—"} />
                <Row label="Total" value={quote ? money(quote.totalCents) : "—"} strong />
              </div>
              {quoting && <p className="co-note">Updating totals…</p>}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`co-row ${strong ? "co-row--total" : ""}`}><span>{label}</span><span>{value}</span></div>;
}

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`co-field ${error ? "has-error" : ""} ${className}`}>
      <span>{label}{error && <em>{error}</em>}</span>
      {children}
    </label>
  );
}

function AddressForm({ value, onChange, errors, onBlur, regions, prefix }: {
  value: Address; onChange: (a: Address) => void; errors: (k: keyof Address) => string | undefined; onBlur: (k: keyof Address) => void; regions: [string, string][]; prefix: string;
}) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...value, [k]: e.target.value } as Address;
    if (k === "country") next.province = e.target.value === "CA" ? "AB" : "WA";
    onChange(next);
  };
  const ac = (s: string) => `${prefix} ${s}`;
  const left = (k: keyof Address) => () => onBlur(k);
  return (
    <div className="co-address">
      <Field label="Country" className="co-span2">
        <select className="sh-input" value={value.country} onChange={set("country")} autoComplete={ac("country")}>
          <option value="CA">Canada</option><option value="US">United States</option>
        </select>
      </Field>
      <Field label="First name" error={errors("firstName")}><input className="sh-input" value={value.firstName} onChange={set("firstName")} onBlur={left("firstName")} autoComplete={ac("given-name")} /></Field>
      <Field label="Last name" error={errors("lastName")}><input className="sh-input" value={value.lastName} onChange={set("lastName")} onBlur={left("lastName")} autoComplete={ac("family-name")} /></Field>
      <Field label="Address" error={errors("address1")} className="co-span2"><input className="sh-input" value={value.address1} onChange={set("address1")} onBlur={left("address1")} autoComplete={ac("address-line1")} /></Field>
      <Field label="Apartment, suite (optional)" className="co-span2"><input className="sh-input" value={value.address2} onChange={set("address2")} autoComplete={ac("address-line2")} /></Field>
      <Field label="City" error={errors("city")}><input className="sh-input" value={value.city} onChange={set("city")} onBlur={left("city")} autoComplete={ac("address-level2")} /></Field>
      <Field label={value.country === "CA" ? "Province" : "State"}>
        <select className="sh-input" value={value.province} onChange={set("province")} autoComplete={ac("address-level1")}>
          {regions.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
      </Field>
      <Field label={value.country === "CA" ? "Postal code" : "ZIP code"} error={errors("postalCode")}><input className="sh-input" value={value.postalCode} onChange={set("postalCode")} onBlur={left("postalCode")} autoComplete={ac("postal-code")} /></Field>
      <Field label="Phone (optional)"><input className="sh-input" type="tel" value={value.phone} onChange={set("phone")} autoComplete={ac("tel")} /></Field>
    </div>
  );
}

function Success({ orderId, preorder, email }: { orderId: number; preorder: boolean; email: string }) {
  return (
    <div className="sh co">
      <header className="co-head"><div className="co-wrap co-head__row"><a href="/" className="co-logo"><img src={LOGO} alt="Spin Hobby" /></a></div></header>
      <div className="co-wrap co-empty co-success">
        <img src={MASCOT} alt="" />
        <span className="sh-eyebrow" style={{ color: "var(--teal)" }}>Order confirmed</span>
        <h1 className="sh-display">Thank you! Order #{orderId}</h1>
        <p>{preorder
          ? "Your pre-order is reserved. We'll ship it as soon as it's released and email tracking to "
          : "We're packing it up now. Tracking will be emailed to "}<b>{email || "your inbox"}</b>.</p>
        <p className="co-note">Questions? Email <a href={`mailto:${SUPPORT_EMAIL}?subject=Order%20%23${orderId}`}>{SUPPORT_EMAIL}</a> with your order number.</p>
        <a href="/" className="sh-btn">Keep shopping</a>
      </div>
    </div>
  );
}

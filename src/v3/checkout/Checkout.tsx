import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import "../../components/styles/tokens.scss";
import "./checkout.scss";
import { track } from "../../lib/analytics";
import { api } from "../../lib/api";
import { price } from "../format";
import { useAuth, useLocalState, useTheme } from "../hooks";
import { SUPPORT_EMAIL } from "../links";
import { useDocumentHead } from "../seo";
import { loadStoreConfig } from "../storeConfig";
import { BUY_NOW_PATH, useBuyNow, useCart } from "../storefront/data";
import { PayPalPay, SquarePay, type CheckoutConfig } from "./Payments";
import { POSTAL_RE, PROVINCES, STATES } from "./regions";
import { photo } from "../photo";
import { CheckoutAddOns } from "../storefront/Suggestions";
import type { Product } from "../types";

const LOGO = "/logo/logo%20cropped.png";
const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";

interface Address {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
  country: "CA" | "US";
  phone: string;
}
const EMPTY_ADDRESS: Address = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  province: "AB",
  postalCode: "",
  country: "CA",
  phone: "",
};

interface QuoteLine {
  variationId: string;
  itemId: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  isPreorder: boolean;
  lineCents: number;
}
interface Quote {
  lines: QuoteLine[];
  subtotalCents: number;
  /** What the discount code took off the goods. */
  discountCents: number;
  /** The code that applied, or null. */
  discount: { code: string; label: string } | null;
  /** Why the typed code doesn't apply, or null. */
  discountMessage: string | null;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
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
  const location = useLocation();
  useDocumentHead({ title: "Checkout | Spin Hobby", description: "Checkout", path: location.pathname, noindex: true });
  const auth = useAuth();
  // "Buy now" (/checkout/now) checks out its one item instead of the cart, and the cart is left as it is.
  const buyingNow = location.pathname.startsWith(BUY_NOW_PATH);
  const fullCart = useCart();
  const single = useBuyNow();
  const cart = buyingNow ? single : fullCart;
  // one anonymous "checkout opened" per visit to this page with something in the cart (src/lib/analytics.ts)
  const hasItems = cart.lines.length > 0;
  useEffect(() => {
    if (hasItems) track("checkout_view");
  }, [hasItems]);
  const [email, setEmail] = useLocalState("spinhobby-checkout-email", "");
  const [ship, setShip] = useLocalState<Address>("spinhobby-checkout-address", EMPTY_ADDRESS);
  const [method, setMethod] = useState<"standard" | "express">("standard");
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBill] = useState<Address>(EMPTY_ADDRESS);
  const [touched, setTouched] = useState(false); // a payment attempt: show every problem
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
  const [summaryOpen, setSummaryOpen] = useState(false); // phones: the order summary folds away above the form
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState(""); // sent with every quote while it applies
  const [codeMessage, setCodeMessage] = useState("");

  useEffect(() => {
    if (!email && auth.email) setEmail(auth.email);
  }, [auth.email, email, setEmail]);

  // A cart reminder email's link (/checkout?restore=<token>): put that cart back, then drop the token from the address.
  const restoreToken = new URLSearchParams(location.search).get("restore");
  const [restoring, setRestoring] = useState(!!restoreToken);
  const { add: addToCart, qtyOf: cartQtyOf, setQty: setCartQty } = fullCart;
  useEffect(() => {
    if (!restoreToken) return;
    let live = true;
    api<{ items: { product: Product; quantity: number }[] }>(`/checkout/cart-reminder/${encodeURIComponent(restoreToken)}`)
      .then((r) => {
        if (!live) return;
        for (const { product, quantity } of r.items) {
          const have = cartQtyOf(product.variationId);
          if (!have) addToCart(product, quantity);
          else if (have < quantity) setCartQty(product.variationId, quantity);
        }
      })
      .catch(() => undefined) // expired or stopped: the cart stays as it is
      .finally(() => {
        if (!live) return;
        setRestoring(false);
        window.history.replaceState(null, "", location.pathname);
      });
    return () => {
      live = false;
    };
    // once per link
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoreToken]);

  // "Email me my cart if I don't finish": never ticked for the shopper. While ticked, the cart is saved for one reminder.
  const [remind, setRemind] = useLocalState("spinhobby-cart-reminder", false);
  const remindEmail = email.trim().toLowerCase();
  const remindLines = useMemo(() => cart.lines.map((l) => ({ variationId: l.variationId, quantity: l.quantity })), [cart.lines]);
  const remindSent = useRef<string>("");
  useEffect(() => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remindEmail)) return;
    const lines = remind ? remindLines : [];
    const key = `${remindEmail}|${JSON.stringify(lines)}`;
    // nothing to tell the server: unticked and never saved, or the same as last time
    if (remindSent.current === key || (!remind && !remindSent.current)) return;
    const timer = window.setTimeout(() => {
      remindSent.current = key;
      void api("/checkout/cart-reminder", { method: "POST", body: JSON.stringify({ email: remindEmail, lines }) }).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [remind, remindEmail, remindLines]);

  useEffect(() => {
    loadStoreConfig().then((c) => {
      if (c) setConfig(c);
      else if (ENV_PAYPAL_ID) {
        setConfig({
          provider: "paypal",
          paypalClientId: ENV_PAYPAL_ID,
          paypalEnv: "sandbox",
          squareApplicationId: null,
          squareLocationId: null,
          squareEnv: "sandbox",
          shippingStandardCents: 899,
          shippingExpressCents: 1999,
          freeShippingThresholdCents: 7500,
        });
      } else {
        setConfigError("Online payment isn't available right now.");
      }
    });
  }, []);

  const quoteInput = useMemo(
    () => ({
      items: cart.lines.map((l) => ({ variationId: l.variationId, quantity: l.quantity })),
      shippingMethod: method,
      country: ship.country,
      province: ship.province,
      ...(appliedCode ? { discountCode: appliedCode } : {}),
    }),
    [cart.lines, method, ship.country, ship.province, appliedCode],
  );

  useEffect(() => {
    if (!cart.lines.length) {
      setQuote(null);
      return;
    }
    let active = true;
    setQuoting(true);
    const timer = window.setTimeout(() => {
      api<Quote & { success: true }>("/cart/quote", { method: "POST", body: JSON.stringify(quoteInput) })
        .then((q) => {
          if (active) {
            setQuote(q);
            setQuoteError("");
            // a code that doesn't (or no longer) applies is dropped with its reason, so it never blocks paying
            if (q.discountMessage) {
              setCodeMessage(q.discountMessage);
              setAppliedCode("");
            } else if (q.discount) setCodeMessage("");
          }
        })
        .catch((e: Error) => {
          if (active) {
            setQuote(null);
            setQuoteError(e.message);
          }
        })
        .finally(() => {
          if (active) setQuoting(false);
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [quoteInput, cart.lines.length]);

  const shipErrors = addressErrors(ship);
  const billErrors = billingSame ? {} : addressErrors(bill);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const formValid = emailOk && !Object.keys(shipErrors).length && !Object.keys(billErrors).length;
  const quoteOk = !!quote && quote.lines.length > 0 && quote.warnings.length === 0;
  const canPay = formValid && quoteOk && !quoting;
  // Payment is on the page from the start; this says what still stands between the shopper and it.
  const missing = [
    !emailOk && "your email",
    Object.keys(shipErrors).length > 0 && "your shipping address",
    Object.keys(billErrors).length > 0 && "your billing address",
  ].filter((m): m is string => Boolean(m));
  const hint = quoting
    ? "Updating totals…"
    : missing.length
      ? `Fill in ${missing.length > 1 ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}` : missing[0]} above to pay.`
      : quote?.warnings.length
        ? "Update your cart to continue."
        : !quote && !quoteError
          ? "Working out your totals…"
          : "";

  const applyQuote = () => {
    if (!quote) return;
    const q = new Map(quote.lines.map((l) => [l.variationId, l.quantity]));
    for (const l of cart.lines) cart.setQty(l.variationId, q.get(l.variationId) ?? 0);
  };

  const toServerAddress = (a: Address) => ({
    firstName: a.firstName.trim(),
    lastName: a.lastName.trim(),
    address1: a.address1.trim(),
    address2: a.address2.trim() || undefined,
    city: a.city.trim(),
    province: a.province,
    postalCode: a.postalCode.trim().toUpperCase(),
    country: a.country,
    phone: a.phone.trim() || undefined,
  });

  const createIntent = useCallback(async () => {
    setPayError("");
    setTouched(true);
    if (!canPay) throw new Error("Complete your details first.");
    const res = await api<{ orderId: number; provider: "paypal" | "square" | "test"; paypalOrderId?: string; amountCents?: number }>(
      "/checkout/intent",
      {
        method: "POST",
        body: JSON.stringify({
          quote: quoteInput,
          email: email.trim(),
          shipping: toServerAddress(ship),
          billing: toServerAddress(billingSame ? ship : bill),
        }),
      },
    );
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
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Checkout failed.");
      throw e;
    }
  };
  const onPayPalApprove = async (paypalOrderId: string) => {
    try {
      const res = await api<{ orderId: number; status: string }>("/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ paypalOrderId }),
      });
      finish(res.orderId, res.status);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment couldn't be captured.");
    }
  };

  const onSquarePay = async (tokenize: (amountCents: number) => Promise<{ sourceId: string; verificationToken?: string }>) => {
    setTouched(true);
    if (!canPay || !quote) {
      setPayError("Complete your details first.");
      return;
    }
    try {
      const token = await tokenize(quote.totalCents); // card errors surface before an order is created
      const intent = await createIntent();
      const res = await api<{ orderId: number; status: string }>("/square/payments", {
        method: "POST",
        body: JSON.stringify({
          orderId: intent.orderId,
          email: email.trim(),
          sourceId: token.sourceId,
          verificationToken: token.verificationToken,
        }),
      });
      finish(res.orderId, res.status);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment failed.");
    }
  };

  /** A local copy of the shop with no payment keys: the order completes as a paid one would, with no money involved. */
  const onTestPay = async () => {
    setTouched(true);
    if (!canPay) {
      setPayError("Complete your details first.");
      return;
    }
    try {
      const intent = await createIntent();
      const res = await api<{ orderId: number; status: string }>("/checkout/test-payment", {
        method: "POST",
        body: JSON.stringify({ orderId: intent.orderId, email: email.trim() }),
      });
      finish(res.orderId, res.status);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "The test payment failed.");
    }
  };

  if (done) return <Success orderId={done.orderId} preorder={done.status === "preorder_reserved"} email={email} />;
  const returning = location.pathname.startsWith("/checkout/success")
    ? Number(new URLSearchParams(window.location.search).get("order"))
    : 0;
  if (returning) return <Success orderId={returning} preorder={false} email={email} />;

  const regions = ship.country === "CA" ? PROVINCES : STATES;
  const show = (errs: Partial<Record<keyof Address, string>>, prefix: string, k: keyof Address) =>
    touched || blurred.has(`${prefix}.${k}`) ? errs[k] : undefined;
  // free shipping is judged on the goods after any discount (as the server prices it)
  const goods = (quote?.subtotalCents ?? cart.subtotal) - (quote?.discountCents ?? 0);
  const freeLeft = config ? Math.max(config.freeShippingThresholdCents - goods, 0) : 0;

  const shipOk = Object.keys(shipErrors).length === 0;
  const itemCount = cart.lines.reduce((n, l) => n + l.quantity, 0);
  const threshold = config?.freeShippingThresholdCents ?? 7500;
  const subtotal = quote?.subtotalCents ?? cart.subtotal;
  const totalLabel = quote ? price(quote.totalCents) : "—";

  // Nothing left to buy now (paid already, or opened later): the cart's checkout instead.
  if (buyingNow && cart.lines.length === 0) return <Navigate to="/checkout" replace />;
  if (restoring) {
    return (
      <div className="sh co">
        <div className="co-empty">
          <img src={MASCOT} alt="" />
          <h1 className="sh-display">Getting your cart back…</h1>
        </div>
      </div>
    );
  }
  if (cart.lines.length === 0) {
    return (
      <div className="sh co">
        <header className="co-bar">
          <div className="co-bar__row">
            <a href="/" className="co-logo">
              <img src={LOGO} alt="Spin Hobby" />
            </a>
          </div>
        </header>
        <div className="co-empty">
          <img src={MASCOT} alt="" />
          <h1 className="sh-display">Your cart is empty</h1>
          <p>Add something from the shop and come back here to check out.</p>
          <a href="/" className="sh-btn">
            Back to the shop
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="sh co">
      <div className="co-split">
        <main className="co-main">
          <div className="co-main__inner">
            <header className="co-top">
              <a href="/" className="co-logo">
                <img src={LOGO} alt="Spin Hobby" />
              </a>
              <a href="/" className="co-back">
                ← Continue shopping
              </a>
            </header>

            <div className="co-heading">
              <h1 className="sh-display co-title">Checkout</h1>
              <ol className="co-steps" aria-label="Progress">
                <li className={emailOk ? "is-done" : ""}>
                  <span>{emailOk ? "✓" : "1"}</span>Contact
                </li>
                <li className={shipOk ? "is-done" : ""}>
                  <span>{shipOk ? "✓" : "2"}</span>Shipping
                </li>
                <li className={canPay ? "is-done" : ""}>
                  <span>{canPay ? "✓" : "3"}</span>Payment
                </li>
              </ol>
            </div>

            <section className="co-section" aria-labelledby="co-h-contact">
              <h2 id="co-h-contact">
                <i>1</i>Contact
              </h2>
              <div className="co-fields">
                <Field
                  label="Email"
                  className="co-c4"
                  error={(touched || blurred.has("email")) && !emailOk ? "Enter a valid email" : undefined}
                >
                  <input
                    className="sh-input"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => leave("email")}
                    placeholder="you@example.com"
                  />
                </Field>
                <Field label="Phone (optional)" className="co-c2">
                  <input
                    className="sh-input"
                    type="tel"
                    autoComplete="tel"
                    value={ship.phone}
                    onChange={(e) => setShip({ ...ship, phone: e.target.value })}
                  />
                </Field>
              </div>
              <p className="co-note">
                Your receipt and shipping updates go here.{!auth.email && " Sign in from the shop to save orders to your account."}
              </p>
              <label className="co-check co-remind">
                <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} />
                <span>
                  Email me my cart if I don't finish <span className="co-note">(one reminder a few hours later; stop any time)</span>
                </span>
              </label>
            </section>

            <section className="co-section" aria-labelledby="co-h-ship">
              <h2 id="co-h-ship">
                <i>2</i>Shipping
              </h2>
              <AddressForm
                value={ship}
                onChange={setShip}
                errors={(k) => show(shipErrors, "shipping", k)}
                onBlur={(k) => leave(`shipping.${k}`)}
                regions={regions}
                prefix="shipping"
                phone={false}
              />
              <h3>Delivery</h3>
              <div className="co-methods">
                {(["standard", "express"] as const).map((m) => {
                  const cost = m === "express" ? config?.shippingExpressCents : goods >= threshold ? 0 : config?.shippingStandardCents;
                  return (
                    <label key={m} className={`co-method ${method === m ? "is-active" : ""}`}>
                      <input type="radio" name="method" checked={method === m} onChange={() => setMethod(m)} />
                      <span className="co-method__main">
                        <b>{m === "express" ? "Express" : "Standard"}</b>
                        <span>{m === "express" ? "2–3 business days, tracked" : "5–7 business days, tracked"}</span>
                      </span>
                      <b className="co-method__price">{cost === undefined ? "—" : cost === 0 ? "Free" : price(cost)}</b>
                    </label>
                  );
                })}
              </div>
              {method === "standard" && freeLeft > 0 && <p className="co-note">Add {price(freeLeft)} more for free standard shipping.</p>}
            </section>

            <section className="co-section" aria-labelledby="co-h-pay">
              <h2 id="co-h-pay">
                <i>3</i>Payment
              </h2>
              <div className="co-accepted" aria-label="Accepted payment methods">
                {(config?.provider === "test"
                  ? ["Test payment"]
                  : config?.provider === "square"
                    ? ["Visa", "Mastercard", "Amex", "Debit"]
                    : ["PayPal", "Visa", "Mastercard", "Amex"]
                ).map((m) => (
                  <span key={m}>{m}</span>
                ))}
                <span className="co-accepted__note">All transactions are encrypted.</span>
              </div>
              {configError ? (
                <div className="co-alert">
                  {configError} Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we'll send you an invoice.
                </div>
              ) : !config ? (
                <div className="sh-skeleton" style={{ height: 48 }} />
              ) : (
                <div className="co-paybox">
                  {!formValid && touched && <div className="co-alert">Check the highlighted fields above.</div>}
                  {config.provider === "paypal" && config.paypalClientId ? (
                    <PayPalPay
                      clientId={config.paypalClientId}
                      disabled={!canPay}
                      createOrder={onPayPalCreate}
                      onApprove={onPayPalApprove}
                      onError={setPayError}
                    />
                  ) : config.provider === "test" ? (
                    <div className="co-testpay">
                      <p className="co-note">
                        <b>Test payment.</b> This is a local copy of the shop with no payment keys, so no card is asked for and no money
                        moves. The order is completed like a paid one.
                      </p>
                      <button type="button" className="sh-btn co-testpay__btn" disabled={!canPay} onClick={() => void onTestPay()}>
                        Place order: {totalLabel} (test, no money)
                      </button>
                    </div>
                  ) : config.provider === "square" ? (
                    <SquarePay
                      config={config}
                      disabled={!quoteOk || quoting}
                      amountLabel={totalLabel}
                      pay={onSquarePay}
                      onError={setPayError}
                      billing={{
                        givenName: ship.firstName,
                        familyName: ship.lastName,
                        email,
                        countryCode: ship.country,
                        city: ship.city,
                        postalCode: ship.postalCode,
                        addressLines: [ship.address1, ship.address2].filter(Boolean),
                      }}
                    />
                  ) : (
                    <div className="co-alert">
                      Online payment isn't available right now. Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
                    </div>
                  )}
                  {!canPay &&
                    hint &&
                    ((config.provider === "paypal" && config.paypalClientId) ||
                      config.provider === "square" ||
                      config.provider === "test") && (
                      <p className="co-note co-hint" aria-live="polite">
                        {hint}
                      </p>
                    )}
                  {payError && (
                    <div className="co-alert co-alert--error" role="alert">
                      {payError}
                    </div>
                  )}
                </div>
              )}
              <h3>Billing address</h3>
              <label className="co-check">
                <input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
                Same as the shipping address
              </label>
              {!billingSame && (
                <AddressForm
                  value={bill}
                  onChange={setBill}
                  errors={(k) => show(billErrors, "billing", k)}
                  onBlur={(k) => leave(`billing.${k}`)}
                  regions={bill.country === "CA" ? PROVINCES : STATES}
                  prefix="billing"
                  phone={false}
                />
              )}
              <p className="co-note">Charged in CAD. Pre-order items are charged now and ship on release.</p>
            </section>

            <footer className="co-foot">
              <a href="/terms">Terms of service</a>
              <a href="/privacy">Privacy policy</a>
              <a href={`mailto:${SUPPORT_EMAIL}`}>Need help? {SUPPORT_EMAIL}</a>
            </footer>
          </div>
        </main>

        <aside className="co-aside" aria-label="Order summary">
          <div className="co-aside__inner">
            <button type="button" className="co-aside__toggle" onClick={() => setSummaryOpen((o) => !o)} aria-expanded={summaryOpen}>
              <span>
                {summaryOpen ? "Hide" : "Show"} order summary <i>{summaryOpen ? "▴" : "▾"}</i>
              </span>
              <b>{totalLabel}</b>
            </button>
            <div className={`co-aside__body ${summaryOpen ? "is-open" : ""}`}>
              <div className="co-summary-head">
                <h2>Order summary</h2>
                <span className="co-note">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
              </div>
              {buyingNow && (
                <p className="co-note co-buynow">
                  Buying just this item. Your cart is kept for later
                  {fullCart.count > 0 && (
                    <>
                      {" "}
                      (<a href="/checkout">check out the cart instead</a>)
                    </>
                  )}
                  .
                </p>
              )}
              <div className="co-lines">
                {cart.lines.map((l) => {
                  // Quantities come straight from the cart so the steppers respond at once; prices from the server's quote once it lands.
                  const unit = quote?.lines.find((q) => q.variationId === l.variationId)?.unitPriceCents ?? l.unitPriceCents;
                  return (
                    <div key={l.variationId} className="co-line">
                      <div className={`sh-thumb ${l.imageUrl ? "" : "sh-ph sh-ph--sm"}`} style={{ width: 68, height: 68 }}>
                        {l.imageUrl && <img {...photo(l.imageUrl, 136)} alt="" />}
                      </div>
                      <div className="co-line__main">
                        <span className="co-line__name">{l.name}</span>
                        {l.isPreorder && <span className="co-pre">Pre-order</span>}
                        <div className="co-qty" aria-label={`Quantity for ${l.name}`}>
                          <button type="button" onClick={() => cart.setQty(l.variationId, l.quantity - 1)} aria-label="Decrease">
                            −
                          </button>
                          <span>{l.quantity}</span>
                          <button
                            type="button"
                            onClick={() => cart.setQty(l.variationId, l.quantity + 1)}
                            aria-label="Increase"
                            disabled={l.maxPerCustomer != null && l.quantity >= l.maxPerCustomer}
                          >
                            +
                          </button>
                          <button type="button" className="co-qty__remove" onClick={() => cart.setQty(l.variationId, 0)}>
                            Remove
                          </button>
                        </div>
                      </div>
                      <b className="co-line__price">{price(unit * l.quantity)}</b>
                    </div>
                  );
                })}
              </div>
              {quote && quote.warnings.length > 0 && (
                <div className="co-alert co-alert--warn">
                  <b>Your cart changed</b>
                  <ul>
                    {quote.warnings.map((w) => (
                      <li key={w.variationId + w.code}>{w.message}</li>
                    ))}
                  </ul>
                  <button type="button" className="sh-btn sh-btn--ghost" onClick={applyQuote}>
                    Update my cart
                  </button>
                </div>
              )}
              {quoteError && <div className="co-alert co-alert--error">{quoteError}</div>}
              <div className="co-meter">
                <span>
                  {goods >= threshold ? (
                    <b>You've unlocked free standard shipping 🎉</b>
                  ) : (
                    <>
                      Add <b>{price(threshold - goods)}</b> more for free standard shipping
                    </>
                  )}
                </span>
                <div className="co-meter__bar">
                  <i style={{ width: `${Math.min(goods / threshold, 1) * 100}%` }} />
                </div>
              </div>
              {!buyingNow && <CheckoutAddOns itemIds={cart.lines.map((l) => l.itemId)} currency="CAD" onAdd={(p) => fullCart.add(p, 1)} />}
              <DiscountBox
                applied={quote?.discount ?? null}
                value={codeInput}
                onChange={setCodeInput}
                message={codeMessage}
                busy={quoting && !!appliedCode && !quote?.discount}
                onApply={() => {
                  const code = codeInput.trim();
                  if (!code) return;
                  setCodeMessage("");
                  setAppliedCode(code);
                }}
                onRemove={() => {
                  setAppliedCode("");
                  setCodeInput("");
                  setCodeMessage("");
                }}
              />
              <div className="co-totals">
                <Row label="Subtotal" value={price(subtotal)} />
                {!!quote?.discountCents && (
                  <Row label={`Discount${quote.discount ? ` (${quote.discount.code})` : ""}`} value={`−${price(quote.discountCents)}`} />
                )}
                <Row
                  label={`Shipping (${method === "express" ? "Express" : "Standard"})`}
                  value={quote ? (quote.shippingCents ? price(quote.shippingCents) : "Free") : "—"}
                />
                <Row label="Tax" value={quote ? price(quote.taxCents) : "—"} />
                <Row label="Total" value={totalLabel} strong />
                {quoting && <p className="co-note">Updating totals…</p>}
              </div>
              <ul className="co-trust">
                <li>
                  <span>🔒</span>Encrypted, secure checkout
                </li>
                <li>
                  <span>📦</span>Tracked shipping across Canada and the US
                </li>
                <li>
                  <span>🎁</span>Pre-orders are reserved now and ship on release
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** "Discount code" in the order summary: type a code and apply it, or see the one that applies and remove it. */
function DiscountBox({
  applied,
  value,
  onChange,
  message,
  busy,
  onApply,
  onRemove,
}: {
  applied: { code: string; label: string } | null;
  value: string;
  onChange: (v: string) => void;
  message: string;
  busy: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
  if (applied)
    return (
      <div className="co-code is-applied">
        <span>
          ✓ <b>{applied.code}</b> · {applied.label}
        </span>
        <button type="button" className="co-link" onClick={onRemove}>
          Remove
        </button>
      </div>
    );
  return (
    <div className="co-code">
      <form
        className="co-code__row"
        onSubmit={(e) => {
          e.preventDefault();
          onApply();
        }}
      >
        <input
          className="sh-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Discount code"
          aria-label="Discount code"
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={40}
        />
        <button type="submit" className="sh-btn sh-btn--ghost" disabled={!value.trim() || busy}>
          {busy ? "Checking…" : "Apply"}
        </button>
      </form>
      {message && (
        <p className="co-code__msg" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`co-row ${strong ? "co-row--total" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`co-field ${error ? "has-error" : ""} ${className}`}>
      <span>
        {label}
        {error && <em>{error}</em>}
      </span>
      {children}
    </label>
  );
}

function AddressForm({
  value,
  onChange,
  errors,
  onBlur,
  regions,
  prefix,
  phone = true,
}: {
  value: Address;
  onChange: (a: Address) => void;
  errors: (k: keyof Address) => string | undefined;
  onBlur: (k: keyof Address) => void;
  regions: [string, string][];
  prefix: string;
  phone?: boolean;
}) {
  const set = (k: keyof Address) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...value, [k]: e.target.value } as Address;
    if (k === "country") next.province = e.target.value === "CA" ? "AB" : "WA";
    onChange(next);
  };
  const ac = (s: string) => `${prefix} ${s}`;
  const left = (k: keyof Address) => () => onBlur(k);
  return (
    <div className="co-fields">
      <Field label="Country" className="co-c6">
        <select className="sh-input" value={value.country} onChange={set("country")} autoComplete={ac("country")}>
          <option value="CA">Canada</option>
          <option value="US">United States</option>
        </select>
      </Field>
      <Field label="First name" className="co-c3" error={errors("firstName")}>
        <input
          className="sh-input"
          value={value.firstName}
          onChange={set("firstName")}
          onBlur={left("firstName")}
          autoComplete={ac("given-name")}
        />
      </Field>
      <Field label="Last name" className="co-c3" error={errors("lastName")}>
        <input
          className="sh-input"
          value={value.lastName}
          onChange={set("lastName")}
          onBlur={left("lastName")}
          autoComplete={ac("family-name")}
        />
      </Field>
      <Field label="Address" className="co-c6" error={errors("address1")}>
        <input
          className="sh-input"
          value={value.address1}
          onChange={set("address1")}
          onBlur={left("address1")}
          autoComplete={ac("address-line1")}
          placeholder="Street and number"
        />
      </Field>
      <Field label="Apartment, suite, etc. (optional)" className="co-c6">
        <input className="sh-input" value={value.address2} onChange={set("address2")} autoComplete={ac("address-line2")} />
      </Field>
      <Field label="City" className="co-c2" error={errors("city")}>
        <input className="sh-input" value={value.city} onChange={set("city")} onBlur={left("city")} autoComplete={ac("address-level2")} />
      </Field>
      <Field label={value.country === "CA" ? "Province" : "State"} className="co-c2">
        <select className="sh-input" value={value.province} onChange={set("province")} autoComplete={ac("address-level1")}>
          {regions.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </Field>
      <Field label={value.country === "CA" ? "Postal code" : "ZIP code"} className="co-c2" error={errors("postalCode")}>
        <input
          className="sh-input"
          value={value.postalCode}
          onChange={set("postalCode")}
          onBlur={left("postalCode")}
          autoComplete={ac("postal-code")}
        />
      </Field>
      {phone && (
        <Field label="Phone (optional)" className="co-c6">
          <input className="sh-input" type="tel" value={value.phone} onChange={set("phone")} autoComplete={ac("tel")} />
        </Field>
      )}
    </div>
  );
}

function Success({ orderId, preorder, email }: { orderId: number; preorder: boolean; email: string }) {
  return (
    <div className="sh co">
      <header className="co-bar">
        <div className="co-bar__row">
          <a href="/" className="co-logo">
            <img src={LOGO} alt="Spin Hobby" />
          </a>
        </div>
      </header>
      <div className="co-empty co-success">
        <img src={MASCOT} alt="" />
        <span className="sh-eyebrow" style={{ color: "var(--teal)" }}>
          Order confirmed
        </span>
        <h1 className="sh-display">Thank you! Order #{orderId}</h1>
        <p>
          {preorder
            ? "Your pre-order is reserved. We'll ship it as soon as it's released and email tracking to "
            : "We're packing it up now. Tracking will be emailed to "}
          <b>{email || "your inbox"}</b>.
        </p>
        <p className="co-note">
          Follow it any time on <a href={`/order-status?order=${orderId}`}>Order status</a>. Questions? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Order%20%23${orderId}`}>{SUPPORT_EMAIL}</a> with your order number.
        </p>
        <a href="/" className="sh-btn">
          Keep shopping
        </a>
      </div>
    </div>
  );
}

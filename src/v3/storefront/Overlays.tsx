import { FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { SignInPanel } from "../SignIn";
import { greetingName, paymentLabel, price, normalizeStatus, storeFormat, type Currency } from "../format";
import { useEscape } from "../hooks";
import type { AppUser, Product } from "../types";
import type { CartLine } from "./data";
import { isCutout, photo } from "../photo";
import type { ProductPage as ProductList } from "../types";
import { PriceTag } from "./ProductViews";
import { useAddOns } from "./suggestionData";
import { isOn } from "../../features";

/**
 * Up to three add-ons for the cart. Short of free shipping: in stock, not in the cart already, and priced to just cover what's
 * missing (the cheapest that does first), topped up with the next best; items bought with what's in the cart come first among
 * equals. Free shipping reached: cheap items other collectors bought with these (useAddOns).
 */
function useShippingPicks(lines: CartLine[], remaining: number) {
  const [pool, setPool] = useState<Product[]>([]);
  const together = useAddOns(lines.map((l) => l.itemId));
  useEffect(() => {
    let live = true;
    api<ProductList>(`/products?${new URLSearchParams({ limit: "40", sort: "featured" })}`)
      .then((r) => live && setPool(r.items))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const inCart = new Set(lines.map((l) => l.variationId));
  if (remaining <= 0) return together.filter((p) => !inCart.has(p.variationId));
  const seen = new Set<string>();
  const ok = [...together, ...pool].filter((p) => {
    if (seen.has(p.id) || inCart.has(p.variationId) || !["in", "low"].includes(normalizeStatus(p.status)) || !(p.priceCents > 0))
      return false;
    seen.add(p.id);
    return true;
  });
  const covers = ok.filter((p) => p.priceCents >= remaining).sort((x, y) => x.priceCents - y.priceCents);
  const rest = ok.filter((p) => p.priceCents < remaining).sort((x, y) => y.priceCents - x.priceCents);
  return [...covers, ...rest].slice(0, 3);
}

export function CartDrawer({
  lines,
  subtotal,
  currency,
  onQty,
  onAdd,
  onOpen,
  onClose,
}: {
  lines: CartLine[];
  subtotal: number;
  currency: Currency;
  onQty: (variationId: string, qty: number) => void;
  onAdd: (p: Product) => void;
  onOpen: (p: Product) => void;
  onClose: () => void;
}) {
  useEscape(onClose);
  const threshold = storeFormat.freeShippingThresholdCents;
  const remaining = Math.max(threshold - subtotal, 0);
  const progress = threshold ? Math.min(subtotal / threshold, 1) : 1;
  const picks = useShippingPicks(lines, remaining);
  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer" role="dialog" aria-modal="true" aria-label="Cart">
        <div className="sh-drawer__head">
          <span>
            Your cart <span className="sf-muted sf-drawer-count">· {lines.reduce((s, l) => s + l.quantity, 0)}</span>
          </span>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="sh-drawer__body sf-cart-empty">
            <img src="/assets/transparent%20mascot%20chibi%20rotated.png" alt="" />
            <strong>Your cart is empty</strong>
            <span>New figures, plushies and goods land every week.</span>
            <button type="button" className="sh-btn" onClick={onClose}>
              Keep shopping
            </button>
          </div>
        ) : (
          <>
            <div className="sh-drawer__body">
              <div className={`sf-ship-meter ${remaining > 0 ? "" : "is-done"}`}>
                <span>
                  {remaining > 0 ? (
                    <>
                      Add <b>{price(remaining, currency)}</b> for free shipping
                    </>
                  ) : (
                    <b>You've unlocked free shipping 🎉</b>
                  )}
                </span>
                <div className="sf-ship-meter__bar">
                  <i style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
              {lines.map((l) => (
                <div className="sf-cart-line" key={l.variationId}>
                  <div className={`sh-thumb ${l.imageUrl ? "" : "sh-ph sh-ph--sm"}`} style={{ width: 56, height: 56 }}>
                    {l.imageUrl && <img {...photo(l.imageUrl, 112, !!l.imageCutout)} alt="" />}
                  </div>
                  <div className="sf-cart-line__main">
                    <div className="sf-cart-line__name">{l.name}</div>
                    {l.isPreorder && <span className="sf-cart-line__pre">Pre-order</span>}
                    <div className="sf-stepper" aria-label={`Quantity for ${l.name}`}>
                      <button type="button" onClick={() => onQty(l.variationId, l.quantity - 1)} aria-label="Decrease">
                        −
                      </button>
                      <span>{l.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQty(l.variationId, l.quantity + 1)}
                        aria-label="Increase"
                        disabled={l.maxPerCustomer != null && l.quantity >= l.maxPerCustomer}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <PriceTag cents={l.unitPriceCents * l.quantity} currency={currency} />
                </div>
              ))}
              {picks.length > 0 && (
                <section className="sf-picks" aria-labelledby="picks-title">
                  <div id="picks-title" className="sf-picks__title">
                    {remaining <= 0
                      ? "Often bought with these"
                      : picks[0].priceCents >= remaining
                        ? "Add one for free shipping"
                        : "Popular add-ons"}
                  </div>
                  {picks.map((p) => (
                    <div key={p.id} className="sf-pick">
                      <button type="button" className="sf-pick__open" onClick={() => onOpen(p)} aria-label={`View ${p.name}`}>
                        <span className={`sh-thumb ${p.images[0] ? "" : "sh-ph sh-ph--sm"}`} style={{ width: 44, height: 44 }}>
                          {p.images[0] && <img {...photo(p.images[0], 88, isCutout(p, p.images[0]))} alt="" />}
                        </span>
                        <span className="sf-pick__name">{p.name}</span>
                      </button>
                      <button type="button" className="sf-pick__add" onClick={() => onAdd(p)} aria-label={`Add ${p.name} to cart`}>
                        + {price(p.priceCents, currency)}
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </div>
            <div className="sf-cart-foot">
              <div className="sf-cart-foot__row">
                <span>Subtotal</span>
                <PriceTag cents={subtotal} currency={currency} />
              </div>
              <span className="sf-muted">
                {currency === "USD"
                  ? `USD prices are estimates: you're charged ${price(subtotal)} in Canadian dollars, plus shipping and taxes at checkout.`
                  : "Shipping and taxes are calculated at checkout."}
              </span>
              <a href="/checkout" className="sh-btn sf-cart-foot__cta sf-center">
                🔒 Secure checkout · {price(subtotal, currency)}
              </a>
              <span className="sf-muted sf-center">Secure payment by {paymentLabel()}. Your cart is saved on this device.</span>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

export function NotifyDialog({
  product,
  email,
  onClose,
  onDone,
}: {
  product: Product;
  email: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [value, setValue] = useState(email ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEscape(onClose);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/alerts", { method: "POST", body: JSON.stringify({ email: value.trim(), variationId: product.variationId }) });
      onDone(`We'll email ${value.trim()} when it's back`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the alert.");
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <form className="sf-dialog" role="dialog" aria-modal="true" aria-labelledby="notify-title" onSubmit={submit}>
        <div className="sf-dialog__head">
          <span className="sh-eyebrow" style={{ color: "var(--blue)" }}>
            Restock alert
          </span>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <h2 id="notify-title" className="sh-display">
          {product.name}
        </h2>
        <p className="sf-muted">Sold out right now. Leave your email and we'll let you know the moment it's restocked.</p>
        <input
          ref={inputRef}
          className="sh-input"
          type="email"
          required
          placeholder="you@example.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {error && <span className="sf-error">{error}</span>}
        <button className="sh-btn" disabled={busy}>
          {busy ? "Saving…" : "Notify me"}
        </button>
      </form>
    </>
  );
}

export function AccountMenu({ email, user, onSignOut }: { email: string | null; user: AppUser | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  useEscape(open ? () => setOpen(false) : null);

  // Whatever the screen width, keep the popover on screen: if it hangs past an edge, shift it back (the sheet layout
  // for narrow screens is fixed and never needs this).
  const menuRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = menuRef.current;
      if (!el || getComputedStyle(el).position !== "absolute") return;
      el.style.transform = "";
      const r = el.getBoundingClientRect();
      const margin = 8;
      const shift = r.left < margin ? margin - r.left : r.right > window.innerWidth - margin ? window.innerWidth - margin - r.right : 0;
      if (shift) el.style.transform = `translateX(${Math.round(shift)}px)`;
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, email]);

  // Close the menu once a sign-in from it succeeds; the storefront shows the welcome.
  useEffect(() => {
    if (email) setOpen(false);
  }, [email]);

  const isStaff = user?.role === "staff" || user?.role === "owner";
  const name = greetingName(user);

  return (
    <div className="sf-account" ref={ref}>
      <button
        type="button"
        className={`sf-head-link ${email ? "sf-account__btn" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={email ? `Account: signed in as ${email}` : "Sign in"}
      >
        {email ? (
          <>
            <span className="sf-avatar" aria-hidden>
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="sf-account__hi">Hi, {name}</span>
          </>
        ) : (
          "Sign in"
        )}
      </button>
      {open && (
        <div className="sf-menu" role="menu" ref={menuRef}>
          <button type="button" className="sf-menu__close" onClick={() => setOpen(false)} aria-label="Close">
            ×
          </button>
          {email ? (
            <>
              <div className="sf-menu__who">
                <span className="sf-avatar sf-avatar--lg" aria-hidden>
                  {name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <b>{name}</b>
                  <span>{email}</span>
                </div>
              </div>
              {isStaff && (
                <a role="menuitem" href="/admin">
                  Store admin ↗
                </a>
              )}
              {isOn("account") && (
                <a role="menuitem" href="/account">
                  Your Account
                </a>
              )}
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <div className="sf-menu__label">Sign in or create an account to sync your wishlist and track orders</div>
              <div className="sf-menu__signin">
                <SignInPanel compact allowSignup />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Shown for a few seconds right after someone signs in or creates an account. */
export function WelcomeCard({ user, isNew, onClose }: { user: AppUser; isNew: boolean; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(t);
  }, [onClose]);
  useEscape(onClose);
  const name = greetingName(user);
  const isStaff = user.role === "staff" || user.role === "owner";
  return (
    <div className="sf-welcome" role="status" aria-live="polite">
      <span className="sf-avatar sf-avatar--lg" aria-hidden>
        {name.charAt(0).toUpperCase()}
      </span>
      <div className="sf-welcome__body">
        <b>{isNew ? `Welcome to Spin Hobby, ${name}!` : `Welcome back, ${name}!`}</b>
        <span>
          {isNew
            ? "Your account is ready. Wishlist items and orders are now saved to it."
            : "You're signed in. Your wishlist and orders are synced."}
        </span>
        {isStaff && <a href="/admin">Go to store admin →</a>}
      </div>
      <button type="button" className="sf-welcome__close" onClick={onClose} aria-label="Dismiss">
        ×
      </button>
    </div>
  );
}

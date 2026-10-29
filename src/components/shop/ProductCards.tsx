/**
 * The shop's product cards, shared so every page shows products the same way (the homepage, a category, search, the wishlist,
 * an account page). Each takes a `Product` and the shop's `CardActions` (add to cart, wishlist, open...). See README.md and
 * http://localhost:3000/ui-kit (Shop tab) for each one live.
 *
 * - Each card's main button adds to the cart; with the page's `onBuyNow`, a "Buy now" button under it goes straight to checkout
 *   with just that item (the cart is left as it is).
 * - ProductCard: the main card. `layout="vertical"` (default: the photo on top, for grids) or `layout="horizontal"` (the photo on
 *   the left, for lists like the wishlist), where `meta`, `actions` and `onRemove` add a page's own line and buttons.
 * - PreorderCard: the slim card in the homepage's "New pre-orders" row.
 * - ProductRow: one line in the shop's list view.
 * - MiniRow: a small line with a thumbnail (weekly ranking, just arrived).
 * - CardAction: a pill (or round icon) button for a horizontal card's `actions` ("Add a note", "Move", share...).
 * - PriceTag, ProductImage, ProductLink: the pieces the cards are made of, for building something new.
 */
import {
  dayLabel,
  discountPct,
  price,
  priceParts,
  monthLabel,
  normalizeStatus,
  STATUS_META,
  statusLabel,
  statusShort,
  type Currency,
} from "../../v3/format";
import type { MouseEvent, ReactNode } from "react";
import type { Product } from "../../v3/types";
import { productPath } from "../../v3/storefront/data";
import { isCutout, photo } from "../../v3/photo";
import { closingLabel } from "../../v3/storefront/nudges";
import "../../v3/storefront/storefront.scss";
import "../styles/shop.scss";

export interface CardActions {
  currency: Currency;
  inCart: (p: Product) => boolean;
  wished: (p: Product) => boolean;
  onAdd: (p: Product) => void;
  /** Straight to checkout with just this item, leaving the cart alone. Leave it out and cards show no "Buy now" button. */
  onBuyNow?: (p: Product) => void;
  onNotify: (p: Product) => void;
  onWish: (p: Product) => void;
  onOpen: (p: Product) => void;
}

/** A real link to the product page (so new-tab and copy-link work); plain clicks stay in the app. */
export function ProductLink({
  p,
  a,
  className = "",
  label,
  children,
}: {
  p: Product;
  a: CardActions;
  className?: string;
  label?: string;
  children: ReactNode;
}) {
  const open = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    a.onOpen(p);
  };
  return (
    <a href={productPath(p)} className={`sf-open ${className}`} onClick={open} aria-label={label}>
      {children}
    </a>
  );
}

/** The product's first photo. With `hover`, a second photo (if there is one) fades in when a mouse rests on it. */
export function ProductImage({
  p,
  className = "",
  label = true,
  hover = false,
}: {
  p: Product;
  className?: string;
  label?: boolean;
  hover?: boolean;
}) {
  const src = p.images[0];
  const alt = hover ? p.images[1] : undefined;
  return (
    <div className={`sf-img ${src ? "" : "sh-ph"} ${alt ? "has-alt" : ""} ${className}`}>
      {src ? (
        <img {...photo(src, 480, isCutout(p, src))} alt={p.name} loading="lazy" />
      ) : (
        label && (
          <span className="sf-img__ph" aria-hidden>
            [ product image ]
          </span>
        )
      )}
      {alt && <img className="sf-img__alt" {...photo(alt, 480, isCutout(p, alt))} alt="" loading="lazy" aria-hidden />}
    </div>
  );
}

/** A small corner chip with a real reason to look: a pre-order that closes soon, or a place in this week's ranking. */
function Highlight({ p, inline = false }: { p: Product; inline?: boolean }) {
  const cls = `sf-card__chip ${inline ? "sf-card__chip--inline" : ""}`;
  const closing = normalizeStatus(p.status) === "pre" ? closingLabel(p.orderByDate) : null;
  if (closing) return <span className={`${cls} sf-card__chip--closing`}>⏳ {closing}</span>;
  if (p.rank && p.rank <= 5 && normalizeStatus(p.status) !== "out") return <span className={cls}>🔥 #{p.rank} this week</span>;
  return null;
}

function Thumb({ p, size }: { p: Product; size: number }) {
  const src = p.images[0];
  return (
    <div className={`sh-thumb ${src ? "" : "sh-ph sh-ph--sm"}`} style={{ width: size, height: size }}>
      {src && <img {...photo(src, size * 2, isCutout(p, src))} alt="" loading="lazy" />}
    </div>
  );
}

function buttonState(p: Product, a: CardActions) {
  const s = normalizeStatus(p.status);
  if (s === "out") return { label: "Notify me", cls: "is-out", onClick: () => a.onNotify(p) };
  if (a.inCart(p)) return { label: "Added ✓", cls: "is-added", onClick: () => a.onAdd(p) };
  return { label: s === "pre" ? "Pre-order" : "Add to cart", cls: "", onClick: () => a.onAdd(p) };
}

/** "Buy now" (like Amazon's): checkout for this one item. Not for sold-out items, or where the page gives no `onBuyNow`. */
function BuyNow({ p, a, inline = false }: { p: Product; a: CardActions; inline?: boolean }) {
  const s = normalizeStatus(p.status);
  if (!a.onBuyNow || s === "out") return null;
  const go = a.onBuyNow;
  return (
    <button
      type="button"
      className={`sf-buy sf-buy--now ${inline ? "sf-buy--inline" : ""}`}
      onClick={() => go(p)}
      aria-label={`Buy ${p.name} now`}
    >
      {s === "pre" ? "Pre-order now" : "Buy now"}
    </button>
  );
}

export interface ProductCardProps {
  p: Product;
  a: CardActions;
  /** `vertical` (default): photo on top, for grids. `horizontal`: photo on the left, for lists such as the wishlist. */
  layout?: "vertical" | "horizontal";
  /** Horizontal only: a small line under the status, e.g. "Added Aug 31, 2026" or the shopper's note. */
  meta?: ReactNode;
  /** Horizontal only: more buttons after the main one (use CardAction), e.g. "Add a note", "Move", share. */
  actions?: ReactNode;
  /** Horizontal only: shows a remove (bin) button at the end instead of the wishlist heart. */
  onRemove?: (p: Product) => void;
}

export function ProductCard(props: ProductCardProps) {
  return props.layout === "horizontal" ? <HorizontalCard {...props} /> : <VerticalCard p={props.p} a={props.a} />;
}

/** The grid card: photo on top, then series, name, price, status and the main button. */
function VerticalCard({ p, a }: { p: Product; a: CardActions }) {
  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);
  const btn = buttonState(p, a);
  const wished = a.wished(p);
  return (
    <article className={`sf-card ${s === "out" ? "is-dim" : ""}`}>
      <div className="sf-card__media">
        <ProductLink p={p} a={a} className="sf-card__open" label={p.name}>
          <ProductImage p={p} hover />
        </ProductLink>
        <span className="sh-badge sf-card__badge" style={{ background: meta.color }}>
          {meta.badge}
        </span>
        {off > 0 && <span className="sf-card__off">-{off}%</span>}
        <Highlight p={p} />
        <button
          type="button"
          className={`sf-card__wish ${wished ? "is-on" : ""}`}
          onClick={() => a.onWish(p)}
          aria-pressed={wished}
          aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
        >
          {wished ? "♥" : "♡"}
        </button>
      </div>
      <div className="sf-card__body">
        <span className="sf-card__series">{p.series ?? p.category ?? "Spin Hobby"}</span>
        <h3 className="sf-card__name" title={p.name}>
          <ProductLink p={p} a={a}>
            {p.name}
          </ProductLink>
        </h3>
        <div className="sf-card__price">
          <PriceTag cents={p.priceCents} currency={a.currency} />
          {off > 0 && <s>{price(p.compareAtCents, a.currency, { code: false })}</s>}
        </div>
        <span className="sf-card__status" style={{ color: meta.color }}>
          {statusLabel(p)}
        </span>
      </div>
      <div className="sf-card__foot">
        <button type="button" className={`sf-buy ${btn.cls}`} onClick={btn.onClick}>
          {btn.label}
        </button>
        <BuyNow p={p} a={a} />
      </div>
    </article>
  );
}

/**
 * The list card: photo on the left; series, name, status and the page's own `meta` line; the price on the right; the main button,
 * the page's `actions` and the wishlist heart (or remove, with `onRemove`) along the bottom. On a phone the price moves under
 * the name and the buttons wrap.
 */
function HorizontalCard({ p, a, meta, actions, onRemove }: ProductCardProps) {
  const s = normalizeStatus(p.status);
  const status = STATUS_META[s];
  const off = discountPct(p);
  const btn = buttonState(p, a);
  const wished = a.wished(p);
  return (
    <article className={`sf-hcard ${s === "out" ? "is-dim" : ""}`}>
      <div className="sf-hcard__media">
        <ProductLink p={p} a={a} className="sf-card__open" label={p.name}>
          <ProductImage p={p} hover />
        </ProductLink>
        <span className="sh-badge sf-card__badge" style={{ background: status.color }}>
          {status.badge}
        </span>
        {off > 0 && <span className="sf-card__off">-{off}%</span>}
      </div>
      <div className="sf-hcard__body">
        <div className="sf-hcard__info">
          <span className="sf-card__series">{p.series ?? p.category ?? "Spin Hobby"}</span>
          <h3 className="sf-hcard__name" title={p.name}>
            <ProductLink p={p} a={a}>
              {p.name}
            </ProductLink>
          </h3>
          <span className="sf-hcard__status" style={{ color: status.color }}>
            {statusLabel(p)}
          </span>
          <Highlight p={p} inline />
          {meta && <div className="sf-hcard__meta">{meta}</div>}
        </div>
        <div className="sf-hcard__price">
          <PriceTag cents={p.priceCents} currency={a.currency} />
          {off > 0 && <s>{price(p.compareAtCents, a.currency, { code: false })}</s>}
        </div>
        <div className="sf-hcard__actions">
          <button type="button" className={`sf-buy sf-buy--inline ${btn.cls}`} onClick={btn.onClick}>
            {btn.label}
          </button>
          <BuyNow p={p} a={a} inline />
          {actions}
          <span className="sf-hcard__end">
            {onRemove ? (
              <CardAction icon label={`Remove ${p.name}`} onClick={() => onRemove(p)}>
                <BinIcon />
              </CardAction>
            ) : (
              <CardAction
                icon
                label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                pressed={wished}
                onClick={() => a.onWish(p)}
                className={wished ? "is-wished" : ""}
              >
                {wished ? "♥" : "♡"}
              </CardAction>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * A button for a horizontal card's `actions`: a quiet pill with words ("Add a note", "Move ▾"), or with `icon` a round button
 * holding just an icon (share, remove), where `label` says what it does for screen readers and as a tooltip.
 */
export function CardAction({
  children,
  onClick,
  icon = false,
  label,
  pressed,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  icon?: boolean;
  label?: string;
  pressed?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`sf-card-action ${icon ? "sf-card-action--icon" : ""} ${className}`}
      onClick={onClick}
      aria-label={label}
      title={icon ? label : undefined}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}

const BinIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" />
  </svg>
);

export function ProductRow({ p, a }: { p: Product; a: CardActions }) {
  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);
  const btn = buttonState(p, a);
  return (
    <div className={`sf-row ${s === "out" ? "is-dim" : ""}`}>
      <ProductLink p={p} a={a} label={p.name}>
        <Thumb p={p} size={72} />
      </ProductLink>
      <div className="sf-row__main">
        <div className="sf-row__meta">{[p.series, p.category].filter(Boolean).join(" · ")}</div>
        <div className="sf-row__name">
          <ProductLink p={p} a={a}>
            {p.name}
          </ProductLink>
        </div>
        <div className="sf-row__status" style={{ color: meta.color }}>
          {meta.badge} · {statusLabel(p)}
        </div>
      </div>
      <div className="sf-row__price">
        <PriceTag cents={p.priceCents} currency={a.currency} />
        {off > 0 && <s>{price(p.compareAtCents, a.currency, { code: false })}</s>}
      </div>
      <button type="button" className={`sf-buy sf-buy--inline ${btn.cls}`} onClick={btn.onClick}>
        {btn.label}
      </button>
      <BuyNow p={p} a={a} inline />
      <button
        type="button"
        className={`sf-row__wish ${a.wished(p) ? "is-on" : ""}`}
        onClick={() => a.onWish(p)}
        aria-pressed={a.wished(p)}
        aria-label="Toggle wishlist"
      >
        {a.wished(p) ? "♥" : "♡"}
      </button>
    </div>
  );
}

export function PreorderCard({ p, a }: { p: Product; a: CardActions }) {
  return (
    <article className="sf-pre">
      <ProductLink p={p} a={a} className="sf-pre__media" label={p.name}>
        <ProductImage p={p} hover />
        <span className="sh-badge sf-card__badge" style={{ background: "var(--blue)" }}>
          PRE-ORDER
        </span>
        <Highlight p={p} />
      </ProductLink>
      <div className="sf-pre__body">
        <ProductLink p={p} a={a} className="sf-pre__name">
          {p.name}
        </ProductLink>
        <PriceTag cents={p.priceCents} currency={a.currency} />
        {discountPct(p) > 0 && <s className="sf-muted">{price(p.compareAtCents, a.currency, { code: false })}</s>}
        <span className="sf-muted">Release {monthLabel(p.releaseMonth)}</span>
        {p.orderByDate && <span className="sf-pre__by">Order by {dayLabel(p.orderByDate)}</span>}
      </div>
    </article>
  );
}

export function MiniRow({ p, a, rank, quickAdd }: { p: Product; a: CardActions; rank?: number; quickAdd?: boolean }) {
  const s = normalizeStatus(p.status);
  const rankColor = rank === 1 ? "var(--gold)" : rank && rank <= 3 ? "var(--blue)" : "var(--muted)";
  const added = a.inCart(p);
  return (
    <div className="sf-mini">
      {rank !== undefined && (
        <span className="sf-mini__rank" style={{ color: rankColor }}>
          {rank}
        </span>
      )}
      <ProductLink p={p} a={a} label={p.name}>
        <Thumb p={p} size={48} />
      </ProductLink>
      <div className="sf-mini__main">
        <ProductLink p={p} a={a} className="sf-mini__name">
          {p.name}
        </ProductLink>
        <div className="sf-mini__status" style={{ color: STATUS_META[s].color }}>
          {statusShort(p)}
        </div>
      </div>
      {quickAdd && s !== "out" ? (
        <button
          type="button"
          className={`sf-mini__add ${added ? "is-added" : ""}`}
          onClick={() => a.onAdd(p)}
          aria-label={`Add ${p.name} to cart`}
        >
          {added ? "Added ✓" : `${price(p.priceCents, a.currency)} +`}
        </button>
      ) : (
        <span className="sf-mini__price">{price(p.priceCents, a.currency)}</span>
      )}
    </div>
  );
}

/** A shopper-facing price with its currency in smaller type: "$55.00 CAD", or "≈ $40.15 USD" (an estimate; checkout is in CAD). */
export function PriceTag({ cents, currency }: { cents: number; currency: Currency }) {
  const p = priceParts(cents, currency);
  return (
    <strong
      className="sf-price"
      title={p.approx ? "An estimate in US dollars. You're charged in Canadian dollars at checkout." : "Canadian dollars"}
    >
      {p.approx && "≈ "}
      {p.amount} <span className="sf-price__code">{p.code}</span>
    </strong>
  );
}

import { dayLabel, discountPct, money, monthLabel, normalizeStatus, STATUS_META, statusLabel, statusShort, type Currency } from "../format";
import type { MouseEvent, ReactNode } from "react";
import type { Product } from "../types";
import { productPath } from "./data";
import { photo } from "../photo";

export interface CardActions {
  currency: Currency;
  inCart: (p: Product) => boolean;
  wished: (p: Product) => boolean;
  onAdd: (p: Product) => void;
  onNotify: (p: Product) => void;
  onWish: (p: Product) => void;
  onOpen: (p: Product) => void;
}

/** A real link to the product page (so new-tab and copy-link work); plain clicks stay in the app. */
export function ProductLink({ p, a, className = "", label, children }: { p: Product; a: CardActions; className?: string; label?: string; children: ReactNode }) {
  const open = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    a.onOpen(p);
  };
  return <a href={productPath(p)} className={`sf-open ${className}`} onClick={open} aria-label={label}>{children}</a>;
}

export function ProductImage({ p, className = "", label = true }: { p: Product; className?: string; label?: boolean }) {
  const src = p.images[0];
  return (
    <div className={`sf-img ${src ? "" : "sh-ph"} ${className}`}>
      {src ? <img {...photo(src, 480)} alt={p.name} loading="lazy" /> : label && <span className="sf-img__ph" aria-hidden>[ product image ]</span>}
    </div>
  );
}

function Thumb({ p, size }: { p: Product; size: number }) {
  const src = p.images[0];
  return (
    <div className={`sh-thumb ${src ? "" : "sh-ph sh-ph--sm"}`} style={{ width: size, height: size }}>
      {src && <img {...photo(src, size * 2)} alt="" loading="lazy" />}
    </div>
  );
}

function buttonState(p: Product, a: CardActions) {
  const s = normalizeStatus(p.status);
  if (s === "out") return { label: "Notify me", cls: "is-out", onClick: () => a.onNotify(p) };
  if (a.inCart(p)) return { label: "Added ✓", cls: "is-added", onClick: () => a.onAdd(p) };
  return { label: s === "pre" ? "Pre-order" : "Add to cart", cls: "", onClick: () => a.onAdd(p) };
}

export function ProductCard({ p, a }: { p: Product; a: CardActions }) {
  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);
  const btn = buttonState(p, a);
  const wished = a.wished(p);
  return (
    <article className={`sf-card ${s === "out" ? "is-dim" : ""}`}>
      <div className="sf-card__media">
        <ProductLink p={p} a={a} className="sf-card__open" label={p.name}><ProductImage p={p} /></ProductLink>
        <span className="sh-badge sf-card__badge" style={{ background: meta.color }}>{meta.badge}</span>
        {off > 0 && <span className="sf-card__off">-{off}%</span>}
        <button type="button" className={`sf-card__wish ${wished ? "is-on" : ""}`} onClick={() => a.onWish(p)}
          aria-pressed={wished} aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}>
          {wished ? "♥" : "♡"}
        </button>
      </div>
      <div className="sf-card__body">
        <span className="sf-card__series">{p.series ?? p.category ?? "Spin Hobby"}</span>
        <h3 className="sf-card__name" title={p.name}><ProductLink p={p} a={a}>{p.name}</ProductLink></h3>
        <div className="sf-card__price">
          <strong>{money(p.priceCents, a.currency)}</strong>
          {off > 0 && <s>{money(p.compareAtCents, a.currency)}</s>}
        </div>
        <span className="sf-card__status" style={{ color: meta.color }}>{statusLabel(p)}</span>
      </div>
      <div className="sf-card__foot">
        <button type="button" className={`sf-buy ${btn.cls}`} onClick={btn.onClick}>{btn.label}</button>
      </div>
    </article>
  );
}

export function ProductRow({ p, a }: { p: Product; a: CardActions }) {
  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);
  const btn = buttonState(p, a);
  return (
    <div className={`sf-row ${s === "out" ? "is-dim" : ""}`}>
      <ProductLink p={p} a={a} label={p.name}><Thumb p={p} size={72} /></ProductLink>
      <div className="sf-row__main">
        <div className="sf-row__meta">{[p.series, p.category].filter(Boolean).join(" · ")}</div>
        <div className="sf-row__name"><ProductLink p={p} a={a}>{p.name}</ProductLink></div>
        <div className="sf-row__status" style={{ color: meta.color }}>{meta.badge} · {statusLabel(p)}</div>
      </div>
      <div className="sf-row__price">
        <strong>{money(p.priceCents, a.currency)}</strong>
        {off > 0 && <s>{money(p.compareAtCents, a.currency)}</s>}
      </div>
      <button type="button" className={`sf-buy sf-buy--inline ${btn.cls}`} onClick={btn.onClick}>{btn.label}</button>
      <button type="button" className={`sf-row__wish ${a.wished(p) ? "is-on" : ""}`} onClick={() => a.onWish(p)}
        aria-pressed={a.wished(p)} aria-label="Toggle wishlist">{a.wished(p) ? "♥" : "♡"}</button>
    </div>
  );
}

export function PreorderCard({ p, a }: { p: Product; a: CardActions }) {
  return (
    <article className="sf-pre">
      <ProductLink p={p} a={a} className="sf-pre__media" label={p.name}>
        <ProductImage p={p} />
        <span className="sh-badge sf-card__badge" style={{ background: "var(--blue)" }}>PRE-ORDER</span>
      </ProductLink>
      <div className="sf-pre__body">
        <ProductLink p={p} a={a} className="sf-pre__name">{p.name}</ProductLink>
        <strong>{money(p.priceCents, a.currency)}</strong>
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
      {rank !== undefined && <span className="sf-mini__rank" style={{ color: rankColor }}>{rank}</span>}
      <ProductLink p={p} a={a} label={p.name}><Thumb p={p} size={48} /></ProductLink>
      <div className="sf-mini__main">
        <ProductLink p={p} a={a} className="sf-mini__name">{p.name}</ProductLink>
        <div className="sf-mini__status" style={{ color: STATUS_META[s].color }}>{statusShort(p)}</div>
      </div>
      {quickAdd && s !== "out" ? (
        <button type="button" className={`sf-mini__add ${added ? "is-added" : ""}`} onClick={() => a.onAdd(p)} aria-label={`Add ${p.name} to cart`}>
          {added ? "Added ✓" : `${money(p.priceCents, a.currency)} +`}
        </button>
      ) : (
        <span className="sf-mini__price">{money(p.priceCents, a.currency)}</span>
      )}
    </div>
  );
}

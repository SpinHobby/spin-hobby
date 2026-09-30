import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { dayLabel, discountPct, money, monthLabel, normalizeStatus, STATUS_META, statusLabel } from "../format";
import { useEscape } from "../hooks";
import { freeShippingLabel } from "../storeConfig";
import type { Product } from "../types";
import { purchaseCap } from "./data";
import type { CardActions } from "./ProductViews";

/** Product popup: photos, price, status, description, quantity and add to cart. */
export function ProductDialog({ product, a, inCartQty, onAddQty, onViewCart, onClose }: {
  product: Product; a: CardActions; inCartQty: number;
  onAddQty: (p: Product, qty: number) => void; onViewCart: () => void; onClose: () => void;
}) {
  // Show the card's data right away, then fill in the description and fresh stock.
  const [p, setP] = useState<Product>(product);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [photo, setPhoto] = useState(0);
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscape(onClose);

  useEffect(() => {
    let live = true;
    setP(product); setPhoto(0); setQty(1); setJustAdded(false); setLoadingDetail(true);
    api<{ item: Product }>(`/square/catalog/${encodeURIComponent(product.id)}`)
      .then((res) => live && setP({ ...product, ...res.item }))
      .catch(() => undefined)
      .finally(() => live && setLoadingDetail(false));
    return () => { live = false; };
  }, [product]);

  // Focus the dialog and stop the page behind it from scrolling.
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);
  const images = p.images;
  const room = Math.max(0, purchaseCap(p) - inCartQty);
  const wished = a.wished(p);
  const step = (dir: number) => setPhoto((i) => (i + dir + images.length) % images.length);

  const add = () => {
    onAddQty(p, Math.min(qty, room));
    setJustAdded(true);
    setQty(1);
  };

  return (
    <>
      <div className="sh-overlay sf-pd-overlay" onClick={onClose} />
      <div className="sf-pd" role="dialog" aria-modal="true" aria-labelledby="pd-title"
        onKeyDown={(e) => { if (images.length > 1 && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !(e.target instanceof HTMLInputElement)) step(e.key === "ArrowLeft" ? -1 : 1); }}>
        <button ref={closeRef} type="button" className="sh-icon-btn sf-pd__close" onClick={onClose} aria-label="Close">×</button>

        <div className="sf-pd__gallery">
          <div className={`sf-pd__photo ${images.length ? "" : "sh-ph"}`}>
            {images.length ? <img src={images[photo]} alt={`${p.name}, photo ${photo + 1} of ${images.length}`} /> : <span className="sf-img__ph" aria-hidden>[ product image ]</span>}
            <span className="sh-badge sf-card__badge" style={{ background: meta.color }}>{meta.badge}</span>
            {images.length > 1 && (
              <>
                <button type="button" className="sf-pd__arrow sf-pd__arrow--prev" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
                <button type="button" className="sf-pd__arrow sf-pd__arrow--next" onClick={() => step(1)} aria-label="Next photo">›</button>
              </>
            )}
          </div>
          {images.length > 1 && (
            <div className="sf-pd__thumbs">
              {images.map((src, i) => (
                <button key={src + i} type="button" className={i === photo ? "is-active" : ""} onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo}>
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sf-pd__info">
          <span className="sf-pd__eyebrow">{[p.series, p.category].filter(Boolean).join(" · ") || "Spin Hobby"}</span>
          <h2 id="pd-title" className="sh-display sf-pd__name">{p.name}</h2>

          <div className="sf-pd__price">
            <strong>{money(p.priceCents, a.currency)}</strong>
            {off > 0 && <><s>{money(p.compareAtCents, a.currency)}</s><span className="sf-pd__off">-{off}%</span></>}
          </div>
          <div className="sf-pd__status" style={{ color: meta.color }}><span className="sf-dot" style={{ background: meta.color }} />{statusLabel(p)}</div>

          {s === "pre" && (
            <div className="sf-pd__pre">
              {p.releaseMonth && <div><span>Release</span><b>{monthLabel(p.releaseMonth)}</b></div>}
              {p.orderByDate && <div><span>Order by</span><b>{dayLabel(p.orderByDate)}</b></div>}
              <p>Charged now, ships when it's released.</p>
            </div>
          )}

          {s === "out" ? (
            <button type="button" className="sf-buy sf-pd__buy" onClick={() => a.onNotify(p)}>Notify me when it's back</button>
          ) : room === 0 && !justAdded ? (
            <div className="sf-pd__limit">You have the most you can buy ({inCartQty}) in your cart. <button type="button" className="sf-link" onClick={onViewCart}>View cart</button></div>
          ) : room === 0 ? null : (
            <div className="sf-pd__buyrow">
              <div className="sf-pd__qty" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
                <span aria-live="polite">{Math.min(qty, room)}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(room, q + 1))} disabled={qty >= room} aria-label="Increase quantity">+</button>
              </div>
              <button type="button" className="sf-buy sf-pd__buy" onClick={add}>
                {s === "pre" ? "Pre-order" : "Add to cart"} · {money(p.priceCents * Math.min(qty, room), a.currency)}
              </button>
            </div>
          )}
          {justAdded && (
            <div className="sf-pd__added" role="status">
              <span>✓ Added to cart{inCartQty > 1 ? ` (${inCartQty} in cart)` : ""}{room === 0 ? " · that's the limit" : ""}</span>
              <button type="button" className="sf-link" onClick={onViewCart}>View cart →</button>
            </div>
          )}

          <button type="button" className={`sf-pd__wish ${wished ? "is-on" : ""}`} onClick={() => a.onWish(p)} aria-pressed={wished}>
            <span className="sf-red">{wished ? "♥" : "♡"}</span> {wished ? "Saved to wishlist" : "Save to wishlist"}
          </button>

          <ul className="sf-pd__facts">
            {p.maxPerCustomer && <li>Limit {p.maxPerCustomer} per customer</li>}
            <li>Free shipping on orders {freeShippingLabel()}+ · Canada & US</li>
          </ul>

          {p.description ? (
            <div className="sf-pd__desc"><h3>About this item</h3><p>{p.description}</p></div>
          ) : loadingDetail ? <div className="sh-skeleton" style={{ height: 48 }} /> : null}
        </div>
      </div>
    </>
  );
}

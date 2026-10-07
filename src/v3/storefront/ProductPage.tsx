import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import type { CategoryTree } from "../categoryTree";
import { dayLabel, discountPct, handlingLabel, money, monthLabel, normalizeStatus, STATUS_META, statusLabel, type Currency } from "../format";
import { useEscape } from "../hooks";
import { SUPPORT_EMAIL } from "../links";
import { SITE_URL, useDocumentHead } from "../seo";
import { freeShippingLabel } from "../storeConfig";
import type { Product, ProductPage as ProductList } from "../types";
import { productPath, purchaseCap } from "./data";
import { ProductCard, type CardActions } from "./ProductViews";
import { photo } from "../photo";

function productJsonLd(p: Product) {
  const availability = normalizeStatus(p.status) === "out" ? "https://schema.org/OutOfStock"
    : normalizeStatus(p.status) === "pre" ? "https://schema.org/PreOrder"
    : "https://schema.org/InStock";
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: p.images,
    ...(p.description ? { description: p.description } : {}),
    ...(p.janCode ? { sku: p.janCode } : {}),
    ...(p.series ? { brand: { "@type": "Brand", name: p.series } } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: p.currency,
      price: (p.priceCents / 100).toFixed(2),
      availability,
      url: `${SITE_URL}${productPath(p)}`,
    },
  };
}

const RELATED = 8;

/** Full product page at /product/<id>: gallery, buy box, details and "You may also like". */
export function ProductPage({ id, initial, a, tree, cartQty, onAddQty, onViewCart, onCategory, onHome, onToast }: {
  id: string; initial: Product | null; a: CardActions; tree: CategoryTree; cartQty: (variationId: string) => number;
  onAddQty: (p: Product, qty: number) => void; onViewCart: () => void;
  onCategory: (categoryId: string) => void; onHome: () => void; onToast: (message: string) => void;
}) {
  // Show what the card already knew straight away, then fill in description, JAN code and fresh stock.
  const [p, setP] = useState<Product | null>(initial?.id === id ? initial : null);
  const [missing, setMissing] = useState(false);
  const [related, setRelated] = useState<Product[] | null>(null);

  useEffect(() => {
    let live = true;
    setMissing(false);
    setP((cur) => (cur?.id === id ? cur : initial?.id === id ? initial : null));
    api<{ item: Product }>(`/square/catalog/${encodeURIComponent(id)}`)
      .then((res) => live && setP((cur) => ({ ...(cur ?? {}), ...res.item })))
      .catch(() => live && setMissing(true));
    return () => { live = false; };
  }, [id, initial]);

  // Related: same category, then same series, then featured. Uses the normal product search.
  const categoryId = p?.categoryId ?? null;
  const series = p?.series ?? null;
  const hasProduct = !!p;
  useEffect(() => {
    if (!hasProduct) return;
    let live = true;
    setRelated(null);
    const search = (params: Record<string, string>) =>
      api<ProductList>(`/products?${new URLSearchParams({ limit: "12", sort: "featured", ...params })}`).then((r) => r.items).catch(() => [] as Product[]);
    Promise.all([
      categoryId ? search({ categoryId }) : Promise.resolve([]),
      series ? search({ q: series }) : Promise.resolve([]),
      search({}),
    ]).then((lists) => {
      if (!live) return;
      const seen = new Set([id]);
      const picked: Product[] = [];
      for (const item of lists.flat()) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        picked.push(item);
      }
      // Keep the order (most related first) but push sold-out items to the end.
      const avail = picked.filter((x) => normalizeStatus(x.status) !== "out");
      setRelated([...avail, ...picked.filter((x) => normalizeStatus(x.status) === "out")].slice(0, RELATED));
    });
    return () => { live = false; };
  }, [id, hasProduct, categoryId, series]);

  // A canonical-looking URL (with the name slug) once the name is known.
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!p) return;
    const path = productPath(p);
    if (location.pathname !== path) navigate(path + location.search, { replace: true, state: location.state });
  }, [p, location.pathname, location.search, location.state, navigate]);

  useDocumentHead({
    title: p ? `${p.name} | Spin Hobby` : "Spin Hobby",
    description: (p?.description && p.description.slice(0, 160))
      || (p ? `${p.name} — official anime figures, plushies and goods from Spin Hobby.` : "Official anime figures, plushies and goods, shipped across Canada and the US."),
    path: p ? productPath(p) : location.pathname,
    image: p?.images[0] ?? null,
    jsonLd: p ? productJsonLd(p) : null,
  });

  if (missing && !p) {
    return (
      <div className="sf-pp sf-pp--missing">
        <h1 className="sh-display">This product isn't available</h1>
        <p className="sf-muted">It may have sold out and been removed, or the link is wrong.</p>
        <button type="button" className="sh-btn" onClick={onHome}>Back to the shop</button>
      </div>
    );
  }
  if (!p) return <ProductSkeleton />;

  const crumbs = p.categoryId && tree.byId.has(p.categoryId)
    ? [...tree.path(p.categoryId).map((name, i, all) => ({ name, id: ancestorId(tree, p.categoryId!, all.length - 1 - i) }))]
    : [];

  return (
    <div className="sf-pp">
      <nav className="sf-crumbs" aria-label="Breadcrumb">
        <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }}>Shop</a>
        {crumbs.map((c) => (
          <span key={c.id}><span aria-hidden>›</span><a href="/" onClick={(e) => { e.preventDefault(); onCategory(c.id); }}>{c.name}</a></span>
        ))}
        <span><span aria-hidden>›</span><span aria-current="page">{p.name}</span></span>
      </nav>

      <div className="sf-pp__top">
        <Gallery p={p} />
        <BuyBox p={p} a={a} inCartQty={cartQty(p.variationId)} onAddQty={onAddQty} onViewCart={onViewCart} onToast={onToast}
          onCategory={p.categoryId && tree.byId.has(p.categoryId) ? () => onCategory(p.categoryId!) : undefined} />
      </div>

      <Details p={p} currency={a.currency} />

      <section className="sf-pp__related" aria-labelledby="related-title">
        <div className="sf-section-head"><h2 id="related-title" className="sh-display">You may also like</h2></div>
        {related === null ? (
          <div className="sf-pp__related-row">{Array.from({ length: 4 }, (_, i) => <div key={i} className="sh-skeleton sf-pp__related-skel" />)}</div>
        ) : related.length ? (
          <div className="sf-pp__related-row">{related.map((r) => <ProductCard key={r.id} p={r} a={a} />)}</div>
        ) : (
          <p className="sf-muted">More coming soon. <a href="/" onClick={(e) => { e.preventDefault(); onHome(); }}>Browse the shop →</a></p>
        )}
      </section>
    </div>
  );
}

/** The id of the ancestor `up` levels above `id` (0 = itself). */
function ancestorId(tree: CategoryTree, id: string, up: number) {
  let at = id;
  for (let i = 0; i < up; i++) at = tree.byId.get(at)?.parentId ?? at;
  return at;
}

// ---------------------------------------------------------------- gallery
function Gallery({ p }: { p: Product }) {
  const images = p.images;
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => setI(0), [p.id]);
  const go = (n: number) => setI((n + images.length) % images.length);

  // Phones swipe a scroll-snap strip; keep the dots in step with it.
  const onScroll = () => {
    const el = stripRef.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };
  const jump = (n: number) => {
    setI(n);
    const el = stripRef.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);

  if (!images.length) {
    return (
      <div className="sf-pp__gallery">
        <div className="sf-pp__main sh-ph"><span className="sf-img__ph" aria-hidden>[ product image ]</span>
          <span className="sh-badge sf-card__badge" style={{ background: meta.color }}>{meta.badge}</span></div>
      </div>
    );
  }

  return (
    <div className="sf-pp__gallery">
      {images.length > 1 && (
        <div className="sf-pp__thumbs" role="tablist" aria-label="Photos">
          {images.map((src, n) => (
            <button key={src + n} type="button" role="tab" aria-selected={n === i} className={n === i ? "is-active" : ""} onClick={() => jump(n)} aria-label={`Photo ${n + 1}`}>
              <img {...photo(src, 160)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="sf-pp__stage">
        <div className="sf-pp__main" ref={stripRef} onScroll={onScroll}>
          {images.map((src, n) => (
            <button key={src + n} type="button" className={`sf-pp__slide ${n === i ? "is-active" : ""}`} onClick={() => { setI(n); setZoom(true); }} aria-label={`Enlarge photo ${n + 1}`}>
              <img {...photo(src, 1000)} alt={n === 0 ? p.name : `${p.name}, photo ${n + 1}`} loading={n === 0 ? "eager" : "lazy"} />
            </button>
          ))}
        </div>
        <span className="sh-badge sf-card__badge" style={{ background: meta.color }}>{meta.badge}</span>
        {off > 0 && <span className="sf-card__off">-{off}%</span>}
        {images.length > 1 && (
          <>
            <button type="button" className="sf-pp__arrow sf-pp__arrow--prev" onClick={() => jump((i - 1 + images.length) % images.length)} aria-label="Previous photo">‹</button>
            <button type="button" className="sf-pp__arrow sf-pp__arrow--next" onClick={() => jump((i + 1) % images.length)} aria-label="Next photo">›</button>
            <div className="sf-pp__dots" aria-hidden>{images.map((_, n) => <span key={n} className={n === i ? "is-active" : ""} />)}</div>
          </>
        )}
        <span className="sf-pp__zoomhint" aria-hidden>⤢ Click to enlarge</span>
      </div>
      {zoom && <Lightbox images={images} index={i} name={p.name} onIndex={go} onClose={() => setZoom(false)} />}
    </div>
  );
}

function Lightbox({ images, index, name, onIndex, onClose }: { images: string[]; index: number; name: string; onIndex: (n: number) => void; onClose: () => void }) {
  useEscape(onClose);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keys = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") onIndex(index - 1); if (e.key === "ArrowRight") onIndex(index + 1); };
    window.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", keys); };
  }, [index, onIndex]);
  return (
    <div className="sf-lightbox" role="dialog" aria-modal="true" aria-label={`${name} photos`} onClick={onClose}>
      <img {...photo(images[index], 1600)} alt={`${name}, photo ${index + 1} of ${images.length}`} onClick={(e) => e.stopPropagation()} />
      <button ref={closeRef} type="button" className="sf-lightbox__close" onClick={onClose} aria-label="Close">×</button>
      {images.length > 1 && (
        <>
          <button type="button" className="sf-lightbox__arrow sf-lightbox__arrow--prev" onClick={(e) => { e.stopPropagation(); onIndex(index - 1); }} aria-label="Previous photo">‹</button>
          <button type="button" className="sf-lightbox__arrow sf-lightbox__arrow--next" onClick={(e) => { e.stopPropagation(); onIndex(index + 1); }} aria-label="Next photo">›</button>
          <span className="sf-lightbox__count">{index + 1} / {images.length}</span>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- buy box
function BuyBox({ p, a, inCartQty, onAddQty, onViewCart, onToast, onCategory }: {
  p: Product; a: CardActions; inCartQty: number; onAddQty: (p: Product, qty: number) => void;
  onViewCart: () => void; onToast: (message: string) => void; onCategory?: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [buyVisible, setBuyVisible] = useState(true);
  const buyRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setQty(1); setJustAdded(false); }, [p.id]);

  // Phones get a sticky "Add to cart" bar once the main button scrolls out of view.
  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setBuyVisible(entry.isIntersecting || entry.boundingClientRect.top > 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const s = normalizeStatus(p.status);
  const meta = STATUS_META[s];
  const off = discountPct(p);
  const room = Math.max(0, purchaseCap(p) - inCartQty);
  const n = Math.max(1, Math.min(qty, room));
  const wished = a.wished(p);
  const buyLabel = s === "pre" ? "Pre-order" : "Add to cart";

  const add = () => {
    onAddQty(p, n);
    setJustAdded(true);
    setQty(1);
    onToast(`${n > 1 ? `${n} × ` : ""}${p.name} added to cart`);
  };
  const share = async () => {
    const url = window.location.origin + productPath(p);
    try {
      if (navigator.share) { await navigator.share({ title: p.name, url }); return; }
      await navigator.clipboard.writeText(url);
      onToast("Link copied");
    } catch { /* dismissed */ }
  };

  return (
    <div className="sf-pp__buy">
      <div className="sf-pp__eyebrow">
        {p.series && <span>{p.series}</span>}
        {p.category && (onCategory
          ? <button type="button" className="sf-link" onClick={onCategory}>{p.category}</button>
          : <span>{p.category}</span>)}
      </div>
      <h1 className="sh-display sf-pp__name">{p.name}</h1>
      {p.janCode && <div className="sf-pp__sku">JAN {p.janCode}</div>}

      <div className="sf-pp__pricebox">
        <div className="sf-pp__price">
          <strong>{money(p.priceCents, a.currency)}</strong>
          {a.currency === "USD" && <span className="sf-muted sf-small">approx.</span>}
          {off > 0 && <s>{money(p.compareAtCents, a.currency)}</s>}
          {off > 0 && <span className="sf-pp__off">Save {off}%</span>}
        </div>
        <div className="sf-pp__status" style={{ color: meta.color }}><span className="sf-dot" style={{ background: meta.color }} />{statusLabel(p)}</div>
      </div>

      {s === "pre" && (
        <div className="sf-pp__notice sf-pp__notice--pre">
          <div className="sf-pp__pre-dates">
            {p.releaseMonth && <div><span>Expected release</span><b>{monthLabel(p.releaseMonth)}</b></div>}
            {p.orderByDate && <div><span>Order by</span><b>{dayLabel(p.orderByDate)}</b></div>}
          </div>
          <p>Pre-orders are charged now and ship as soon as they arrive. We'll email you when it's on its way. Release dates are set by the maker and can move.</p>
        </div>
      )}

      <div ref={buyRef}>
        {s === "out" ? (
          <div className="sf-pp__notice">
            <p><b>Sold out.</b> Get an email the moment it's restocked.</p>
            <button type="button" className="sf-buy sf-pp__cta" onClick={() => a.onNotify(p)}>Notify me when it's back</button>
          </div>
        ) : room === 0 && !justAdded ? (
          <div className="sf-pp__notice">You already have the most you can buy ({inCartQty}) in your cart. <button type="button" className="sf-link" onClick={onViewCart}>View cart</button></div>
        ) : room === 0 ? null : (
          <div className="sf-pp__buyrow">
            <div className="sf-pp__qty" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty(Math.max(1, n - 1))} disabled={n <= 1} aria-label="Decrease quantity">−</button>
              <span aria-live="polite">{n}</span>
              <button type="button" onClick={() => setQty(Math.min(room, n + 1))} disabled={n >= room} aria-label="Increase quantity">+</button>
            </div>
            <button type="button" className="sf-buy sf-pp__cta" onClick={add}>{buyLabel} · {money(p.priceCents * n, a.currency)}</button>
          </div>
        )}
      </div>

      {justAdded && (
        <div className="sf-pp__added" role="status">
          <span>✓ In your cart{inCartQty > 1 ? ` (${inCartQty})` : ""}{room === 0 ? " · that's the limit" : ""}</span>
          <span className="sf-pp__added-links">
            <button type="button" className="sf-link" onClick={onViewCart}>View cart</button>
            <a className="sh-btn sf-pp__checkout" href="/checkout">Checkout →</a>
          </span>
        </div>
      )}

      <div className="sf-pp__secondary">
        <button type="button" className={`sf-pp__ghost ${wished ? "is-on" : ""}`} onClick={() => a.onWish(p)} aria-pressed={wished}>
          <span className="sf-red">{wished ? "♥" : "♡"}</span> {wished ? "In your wishlist" : "Add to wishlist"}
        </button>
        <button type="button" className="sf-pp__ghost" onClick={share}>↗ Share</button>
      </div>

      <ul className="sf-pp__perks">
        <li><span aria-hidden>🚚</span><div><b>Free shipping over {freeShippingLabel()}</b><span>Tracked, across Canada & the US</span></div></li>
        <li><span aria-hidden>📦</span><div><b>{s === "pre" ? "Ships on release" : `Ships in ${handlingLabel()}`}</b><span>Carefully packed for collectors</span></div></li>
        <li><span aria-hidden>🔒</span><div><b>Secure checkout</b><span>Pay by card, charged in CAD</span></div></li>
        <li><span aria-hidden>💬</span><div><b>Questions?</b><span><a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(p.name)}`}>{SUPPORT_EMAIL}</a></span></div></li>
      </ul>

      {!buyVisible && s !== "out" && room > 0 && (
        <div className="sf-pp__sticky" aria-hidden={buyVisible}>
          <div><b>{p.name}</b><span>{money(p.priceCents, a.currency)}</span></div>
          <button type="button" className="sf-buy" onClick={add}>{buyLabel}</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- details
function Details({ p, currency }: { p: Product; currency: Currency }) {
  const rows: [string, string][] = [
    ["Series", p.series ?? ""],
    ["Character", p.character ?? ""],
    ["Category", p.category ?? ""],
    ["Release", p.releaseMonth ? monthLabel(p.releaseMonth) : ""],
    ["Order by", normalizeStatus(p.status) === "pre" && p.orderByDate ? dayLabel(p.orderByDate) : ""],
    ["JAN code", p.janCode ?? ""],
    ["Limit", p.maxPerCustomer ? `${p.maxPerCustomer} per customer` : ""],
    ["Price", `${money(p.priceCents, currency)}${currency === "USD" ? " (approx.)" : ""}`],
  ];
  const shown = rows.filter(([, v]) => v);
  return (
    <section className="sf-pp__details" aria-labelledby="about-title">
      <div className="sf-pp__desc">
        <h2 id="about-title" className="sh-display">About this item</h2>
        {p.description ? <p>{p.description}</p> : <p className="sf-muted">No description yet. Email us if you'd like more photos or details.</p>}
      </div>
      <dl className="sf-pp__specs">
        {shown.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className="sf-pp" aria-busy="true">
      <div className="sh-skeleton" style={{ height: 14, width: 220 }} />
      <div className="sf-pp__top">
        <div className="sh-skeleton" style={{ aspectRatio: "1", borderRadius: 18 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="sh-skeleton" style={{ height: 14, width: 120 }} />
          <div className="sh-skeleton" style={{ height: 34, width: "80%" }} />
          <div className="sh-skeleton" style={{ height: 28, width: 160 }} />
          <div className="sh-skeleton" style={{ height: 52 }} />
        </div>
      </div>
    </div>
  );
}

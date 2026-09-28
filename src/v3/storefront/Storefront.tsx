import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../tokens.scss";
import "./storefront.scss";
import { dayLabel, discountPct, normalizeStatus, type Currency } from "../format";
import { useAuth, useEscape, useLocalState, useTheme, useToast } from "../hooks";
import type { Product, StoreEvent } from "../types";
import { freeShippingLabel, useStoreConfig } from "../storeConfig";
import {
  ALL, applyFilters, AVAIL, DEFAULT_AVAIL, NAV, PRICES, SORTS, useCart, useCatalog, useWishlist,
  type Filters, type NavKey, type ShopSort,
} from "./data";
import { AccountMenu, CartDrawer, NotifyDialog } from "./Overlays";
import { DISCORD_URL, EBAY_URL, SUPPORT_EMAIL } from "../links";
import { MiniRow, PreorderCard, ProductCard, ProductRow, type CardActions } from "./ProductViews";

const LOGO = "/logo/logo%20cropped.png";
const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";
const PAGE = 48;
const EVENT_COLORS = ["var(--red)", "var(--blue)", "var(--gold)", "var(--teal)"];

function eventDates(e: StoreEvent) {
  if (!e.start_date) return null;
  const start = dayLabel(e.start_date);
  if (!e.end_date || e.end_date === e.start_date) return start;
  const end = dayLabel(e.end_date);
  return start.split(" ")[0] === end.split(" ")[0] ? `${start}–${end.split(" ")[1]}` : `${start} – ${end}`;
}

export default function Storefront() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast, flash } = useToast(2400);
  const auth = useAuth();
  const catalog = useCatalog();
  const cart = useCart();
  const wishlist = useWishlist(!!auth.session, flash);
  const [currency, setCurrency] = useLocalState<Currency>("spinhobby-currency", "CAD");
  useStoreConfig(); // applies admin shipping / handling / FX settings to all copy

  const [filters, setFilters] = useState<Filters>({ nav: "Home", category: ALL, avail: DEFAULT_AVAIL, price: "Any", sort: "featured", query: "" });
  const [draftQuery, setDraftQuery] = useState("");
  const [view, setView] = useLocalState<"grid" | "list">("spinhobby-view", "grid");
  const [wishOnly, setWishOnly] = useState(false);
  const [visible, setVisible] = useState(PAGE);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notify, setNotify] = useState<Product | null>(null);
  const shopRef = useRef<HTMLElement>(null);

  const { products, home } = catalog;
  useEffect(() => setVisible(PAGE), [filters, wishOnly]);
  useEscape(filtersOpen ? () => setFiltersOpen(false) : null);

  const scrollShop = useCallback(() => {
    window.setTimeout(() => {
      const el = shopRef.current;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
    }, 30);
  }, []);

  const setNav = (nav: NavKey) => {
    setWishOnly(false);
    setFilters((f) => ({ ...f, nav, category: ALL }));
    if (nav === "Home") window.scrollTo({ top: 0, behavior: "smooth" });
    else scrollShop();
  };
  const setCategory = (category: string) => {
    setWishOnly(false);
    setFilters((f) => ({ ...f, category, nav: category === ALL ? "Home" : "Category" }));
    setFiltersOpen(false);
    scrollShop();
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, query: draftQuery }));
    if (draftQuery.trim()) scrollShop();
  };
  const clearFilters = () => {
    setWishOnly(false);
    setDraftQuery("");
    setFilters((f) => ({ ...f, nav: "Home", category: ALL, avail: DEFAULT_AVAIL, price: "Any", query: "" }));
  };

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return [...counts].sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const featuredIds = useMemo(() => (home.featuredItems.length ? home.featuredItems : products.filter((p) => p.isFeatured)).map((p) => p.id), [home.featuredItems, products]);
  const results = useMemo(() => {
    const list = applyFilters(products, filters, featuredIds);
    return wishOnly ? list.filter((p) => wishlist.ids.has(p.id)) : list;
  }, [products, filters, featuredIds, wishOnly, wishlist.ids]);

  const isHome = filters.nav === "Home" && filters.category === ALL && !filters.query.trim() && !wishOnly;
  const hasFilters = filters.price !== "Any" || Object.values(filters.avail).some((v) => !v) || filters.category !== ALL;

  const preorders = useMemo(() => (home.preorders.length ? home.preorders
    : products.filter((p) => p.status === "pre").sort((a, b) => String(a.orderByDate).localeCompare(String(b.orderByDate)))).slice(0, 12), [home.preorders, products]);
  const ranking = useMemo(() => (home.ranking.length ? home.ranking
    : products.filter((p) => p.rank != null).sort((a, b) => a.rank! - b.rank!)).slice(0, 5), [home.ranking, products]);
  const arrived = useMemo(() => (home.newInStock.length ? home.newInStock
    : products.filter((p) => p.status === "in" || p.status === "low")).slice(0, 5), [home.newInStock, products]);
  const closingSoon = useMemo(() => {
    const limit = Date.now() + 30 * 86_400_000;
    return products.filter((p) => p.status === "pre" && p.orderByDate && Date.parse(p.orderByDate) <= limit && Date.parse(p.orderByDate) >= Date.now() - 86_400_000).length;
  }, [products]);
  const maxOff = useMemo(() => products.reduce((m, p) => Math.max(m, discountPct(p)), 0), [products]);

  const actions: CardActions = {
    currency,
    inCart: (p) => cart.has(p.variationId),
    wished: (p) => wishlist.ids.has(p.id),
    onAdd: (p) => {
      if (normalizeStatus(p.status) === "out") { setNotify(p); return; }
      cart.add(p);
      flash(p.status === "pre" ? "Pre-order added to cart" : "Added to cart");
    },
    onNotify: setNotify,
    onWish: wishlist.toggle,
  };

  const shopTitle = wishOnly ? "Your wishlist" : filters.category !== ALL ? filters.category
    : filters.query.trim() ? `Results for “${filters.query.trim()}”` : filters.nav === "Home" ? "All products" : filters.nav;

  return (
    <div className="sh sf" data-view={view}>
      <a className="sf-skip" href="#shop">Skip to products</a>

      {/* Utility bar */}
      <div className="sf-utility">
        <div className="sf-wrap sf-utility__inner">
          <span><span className="sf-gold">●</span> Free shipping on orders {freeShippingLabel()}+ · Canada &amp; US</span>
          <div className="sf-utility__links">
            <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a>
            <a href={EBAY_URL} target="_blank" rel="noreferrer">eBay store ↗</a>
            <a href="#events">Events</a>
            <a href={`mailto:${SUPPORT_EMAIL}`}>Support</a>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sf-header">
        <div className="sf-wrap sf-header__row">
          <a href="/" className="sf-logo" onClick={(e) => { e.preventDefault(); clearFilters(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <img src={LOGO} alt="Spin Hobby" />
          </a>
          <form className="sf-search" role="search" onSubmit={submitSearch}>
            <label className="sh-visually-hidden" htmlFor="sf-cat">Category</label>
            <select id="sf-cat" value={filters.category} onChange={(e) => setCategory(e.target.value)}>
              <option value={ALL}>{ALL}</option>
              {categories.map(([c]) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="sh-visually-hidden" htmlFor="sf-q">Search</label>
            <input id="sf-q" type="search" placeholder="Search by product, character, series or JAN code…" value={draftQuery}
              onChange={(e) => { setDraftQuery(e.target.value); if (!e.target.value) setFilters((f) => ({ ...f, query: "" })); }} />
            <button type="submit">Search</button>
          </form>
          <div className="sf-header__actions">
            <button type="button" className="sh-icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle dark mode">{theme === "dark" ? "☀" : "☾"}</button>
            <AccountMenu email={auth.email} user={auth.user} onSignOut={auth.signOut} onError={flash} />
            <button type="button" className={`sf-head-link sf-wish ${wishOnly ? "is-on" : ""}`} aria-pressed={wishOnly}
              onClick={() => { setWishOnly((w) => !w); scrollShop(); }} aria-label={`Wishlist, ${wishlist.count} items`}>
              <span className="sf-red">♥</span>{wishlist.count}
            </button>
            <button type="button" className="sf-cart-btn" onClick={() => setCartOpen(true)} aria-label={`Cart, ${cart.count} items`}>Cart · {cart.count}</button>
          </div>
        </div>
        <nav className="sf-wrap sf-nav" aria-label="Shop sections">
          {NAV.map((n) => (
            <button key={n} type="button" className={filters.nav === n && !wishOnly ? "is-active" : ""} aria-current={filters.nav === n ? "page" : undefined} onClick={() => setNav(n)}>{n}</button>
          ))}
        </nav>
      </header>

      <div className="sf-wrap sf-body">
        {/* Sidebar (becomes a slide-over sheet on small screens) */}
        {filtersOpen && <div className="sh-overlay sf-sidebar-overlay" onClick={() => setFiltersOpen(false)} />}
        <aside className={`sf-sidebar ${filtersOpen ? "is-open" : ""}`} aria-label="Filters">
          <div className="sf-sidebar__mobile-head">
            <strong>Filters</strong>
            <button type="button" className="sh-icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button>
          </div>
          <div className="sf-panel sf-cats">
            <div className="sh-eyebrow sf-cats__label">Categories</div>
            {[[ALL, products.length] as [string, number], ...categories].map(([c, count]) => (
              <button key={c} type="button" className={filters.category === c ? "is-active" : ""} onClick={() => setCategory(c)}>
                <span>{c}</span><span className="sf-cats__count">{count || "—"}</span>
              </button>
            ))}
          </div>
          <div className="sf-panel sf-filters">
            <div className="sh-eyebrow">Availability</div>
            {AVAIL.map((a) => (
              <label key={a.name} className="sf-check">
                <input type="checkbox" checked={filters.avail[a.name]} onChange={() => setFilters((f) => ({ ...f, avail: { ...f.avail, [a.name]: !f.avail[a.name] } }))} />
                <span className="sf-dot" style={{ background: a.color }} />
                <span className="sf-check__name">{a.name}</span>
                <span className="sf-muted sf-small">{products.filter((p) => (a.statuses as string[]).includes(normalizeStatus(p.status))).length}</span>
              </label>
            ))}
            <div className="sh-eyebrow sf-filters__price">Price</div>
            <div className="sf-pills">
              {PRICES.map((pr) => (
                <button key={pr.name} type="button" className={filters.price === pr.name ? "is-active" : ""} aria-pressed={filters.price === pr.name}
                  onClick={() => setFilters((f) => ({ ...f, price: pr.name }))}>{pr.name}</button>
              ))}
            </div>
            {hasFilters && <button type="button" className="sf-clear" onClick={clearFilters}>Clear all filters</button>}
          </div>
          <a className="sf-discord" href={DISCORD_URL} target="_blank" rel="noreferrer">
            <img src={MASCOT} alt="" />
            <strong>Restock alerts on Discord</strong>
            <span>Join the server →</span>
          </a>
        </aside>

        <main className="sf-main">
          {catalog.demo && (
            <div className="sf-demo-note" role="note">
              <b>Preview data</b> The live Square catalog is empty, so sample products are shown. This only happens in development or preview builds.
            </div>
          )}

          {isHome && (
            <>
              <HeroRow slides={home.slides.map((sl) => (sl.id.startsWith("default-") ? { ...sl, headline: sl.headline.replace("$75+", `${freeShippingLabel()}+`) } : sl))} closingSoon={closingSoon} maxOff={maxOff} onPreorders={() => setNav("Pre-Orders")} onSale={() => setNav("Sale")} />

              {preorders.length > 0 && (
                <section aria-labelledby="pre-title">
                  <div className="sf-section-head">
                    <h2 id="pre-title" className="sh-display">New pre-orders <span className="sf-jp">予約受付中</span></h2>
                    <button type="button" className="sf-link" onClick={() => setNav("Pre-Orders")}>See all →</button>
                  </div>
                  <div className="sf-pre-row">{preorders.map((p) => <PreorderCard key={p.id} p={p} a={actions} />)}</div>
                </section>
              )}

              {(ranking.length > 0 || arrived.length > 0) && (
                <section className="sf-duo">
                  {ranking.length > 0 && (
                    <div className="sf-panel sf-list-card">
                      <div className="sf-list-card__head"><h2 className="sh-display">Weekly ranking</h2><span className="sf-muted sf-small">Updated Mondays</span></div>
                      {ranking.map((p, i) => <MiniRow key={p.id} p={p} a={actions} rank={p.rank ?? i + 1} />)}
                    </div>
                  )}
                  {arrived.length > 0 && (
                    <div className="sf-panel sf-list-card">
                      <div className="sf-list-card__head"><h2 className="sh-display">Just arrived</h2><span className="sf-muted sf-small">Ready to ship</span></div>
                      {arrived.map((p) => <MiniRow key={p.id} p={p} a={actions} quickAdd />)}
                    </div>
                  )}
                </section>
              )}
            </>
          )}

          <section id="shop" ref={shopRef} className="sf-shop" aria-labelledby="shop-title">
            <div className="sf-shop__head">
              <h2 id="shop-title" className="sh-display">{shopTitle} <span className="sf-count">{catalog.loading ? "" : `${results.length} items`}</span></h2>
              <div className="sf-shop__tools">
                <button type="button" className="sf-filter-btn" onClick={() => setFiltersOpen(true)}>Filters{hasFilters ? " •" : ""}</button>
                <label className="sf-muted sf-sort-label" htmlFor="sf-sort">Sort</label>
                <select id="sf-sort" className="sf-select" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ShopSort }))}>
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="sf-seg" role="group" aria-label="Layout">
                  <button type="button" className={view === "grid" ? "is-active" : ""} aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button>
                  <button type="button" className={view === "list" ? "is-active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
                </div>
              </div>
            </div>

            {catalog.loading ? (
              <div className="sf-grid" aria-busy="true" aria-label="Loading products">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="sf-card sf-card--skeleton"><div className="sh-skeleton" style={{ aspectRatio: "1" }} /><div className="sh-skeleton" style={{ height: 14, margin: "12px 12px 6px" }} /><div className="sh-skeleton" style={{ height: 14, width: "50%", margin: "0 12px 14px" }} /></div>
                ))}
              </div>
            ) : catalog.error ? (
              <div className="sf-empty">
                <strong>We couldn't load the shop right now</strong>
                <span>{catalog.error}</span>
                <button type="button" className="sh-btn" onClick={catalog.reload}>Try again</button>
              </div>
            ) : products.length === 0 ? (
              <div className="sf-empty">
                <img src={MASCOT} alt="" className="sf-empty__mascot" />
                <strong>New stock is on its way</strong>
                <span>Our catalog is syncing from the shop. Join Discord for restock alerts while you wait.</span>
                <a className="sh-btn sh-btn--gold" href={DISCORD_URL} target="_blank" rel="noreferrer">Join the Discord</a>
              </div>
            ) : results.length === 0 ? (
              <div className="sf-empty">
                <strong>{wishOnly ? "Your wishlist is empty" : "Nothing matches these filters"}</strong>
                <span>{wishOnly ? "Tap ♡ on any product to save it here." : "Try another category or clear filters. New stock is added weekly."}</span>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={clearFilters}>Clear filters</button>
              </div>
            ) : view === "grid" ? (
              <div className="sf-grid">{results.slice(0, visible).map((p) => <ProductCard key={p.id} p={p} a={actions} />)}</div>
            ) : (
              <div className="sf-panel sf-list">{results.slice(0, visible).map((p) => <ProductRow key={p.id} p={p} a={actions} />)}</div>
            )}
            {!catalog.loading && results.length > visible && (
              <div className="sf-more">
                <span className="sf-muted">Showing {visible} of {results.length}</span>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={() => setVisible((v) => v + PAGE)}>Show more</button>
              </div>
            )}
          </section>

          <section id="events" className="sf-panel sf-events" aria-labelledby="events-title">
            <div className="sf-events__head">
              <h2 id="events-title" className="sh-display">Meet us at the con</h2>
              <span className="sf-muted">{home.events.some((e) => e.start_date) ? "Alberta conventions" : "Alberta conventions · 2027 dates TBA"}</span>
            </div>
            <div className="sf-events__list">
              {home.events.map((e, i) => (
                <span key={e.id} className="sf-event">
                  <span className="sf-dot" style={{ background: EVENT_COLORS[i % EVENT_COLORS.length] }} />
                  {e.name}
                  {eventDates(e) && <span className="sf-muted sf-event__date">{eventDates(e)}{e.city ? ` · ${e.city}` : ""}</span>}
                </span>
              ))}
            </div>
          </section>
        </main>
      </div>

      <Footer currency={currency} onCurrency={setCurrency} onNav={setNav} onToast={flash} />

      {cartOpen && <CartDrawer lines={cart.lines} subtotal={cart.subtotal} currency={currency} onQty={cart.setQty} onClose={() => setCartOpen(false)} />}
      {notify && <NotifyDialog product={notify} email={auth.email} onClose={() => setNotify(null)} onDone={(m) => { setNotify(null); flash(m); }} />}
      {toast && <div className="sh-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

export function HeroRow({ slides, closingSoon, maxOff, onPreorders, onSale }: {
  slides: { id: string; headline: string; subheading: string | null; image_url: string | null; link_url: string | null }[];
  closingSoon: number; maxOff: number; onPreorders: () => void; onSale: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (!autoplay || hovered || count < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => window.clearInterval(timer);
  }, [autoplay, hovered, count]);

  const slide = slides[Math.min(index, count - 1)];
  if (!slide) return null;
  const Banner = slide.link_url ? "a" : "div";

  return (
    <div className="sf-hero">
      <Banner className="sf-hero__banner" {...(slide.link_url ? { href: slide.link_url } : {})}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} aria-roledescription="carousel">
        {slide.image_url ? (
          <img className="sf-hero__photo" src={slide.image_url} alt="" />
        ) : (
          <>
            <div className="sf-hero__sun" />
            <img className="sf-hero__mascot" src={MASCOT} alt="Spin Hobby mascot" />
          </>
        )}
        <div className="sf-hero__copy" aria-live="polite">
          <div className="sf-hero__eyebrow">Welcome to Spin Hobby</div>
          <h1 className="sh-display">{slide.headline}</h1>
          {slide.subheading && <p>{slide.subheading}</p>}
          {count > 1 && (
            <div className="sf-hero__dots" role="tablist" aria-label="Slides">
              {slides.map((s, i) => (
                <button key={s.id} type="button" role="tab" aria-selected={i === index} aria-label={`Slide ${i + 1}`} className={i === index ? "is-active" : ""}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAutoplay(false); setIndex(i); }} />
              ))}
            </div>
          )}
        </div>
      </Banner>
      <div className="sf-promos">
        <button type="button" className="sf-promo" onClick={onPreorders}>
          <span className="sf-promo__eyebrow" style={{ color: "var(--blue)" }}>{closingSoon ? "Pre-orders closing soon" : "Pre-orders"}</span>
          <span className="sf-promo__title sh-display">{closingSoon ? `${closingSoon} item${closingSoon === 1 ? "" : "s"} close in the next 30 days →` : "Reserve upcoming releases →"}</span>
        </button>
        {maxOff > 0 ? (
          <button type="button" className="sf-promo sf-promo--sale" onClick={onSale}>
            <span className="sf-promo__eyebrow">Sale</span>
            <span className="sf-promo__title sh-display">Up to {maxOff}% off selected items →</span>
          </button>
        ) : (
          <a className="sf-promo sf-promo--gold" href={DISCORD_URL} target="_blank" rel="noreferrer">
            <span className="sf-promo__eyebrow">Community</span>
            <span className="sf-promo__title sh-display">Restock alerts &amp; drops on Discord →</span>
          </a>
        )}
      </div>
    </div>
  );
}

function Footer({ currency, onCurrency, onNav, onToast }: {
  currency: Currency; onCurrency: (c: Currency) => void; onNav: (n: NavKey) => void; onToast: (m: string) => void;
}) {
  const [email, setEmail] = useState("");
  const go = (n: NavKey) => (e: React.MouseEvent) => { e.preventDefault(); onNav(n); };
  return (
    <footer className="sf-footer">
      <div className="sf-wrap sf-footer__grid">
        <div className="sf-footer__brand">
          <img src={LOGO} alt="Spin Hobby" />
          <p>Official anime figures, plushies &amp; more. We bring the fun to everyone — since 2022.</p>
        </div>
        <div className="sf-footer__col">
          <span className="sf-footer__h">Shop</span>
          <a href="#shop" onClick={go("New Arrivals")}>New arrivals</a>
          <a href="#shop" onClick={go("Pre-Orders")}>Pre-orders</a>
          <a href="#shop" onClick={go("Sale")}>Sale</a>
          <a href={EBAY_URL} target="_blank" rel="noreferrer">eBay store</a>
        </div>
        <div className="sf-footer__col">
          <span className="sf-footer__h">Help</span>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Pre-order%20policy`}>Pre-order policy</a>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Shipping`}>Shipping &amp; duties</a>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=Order%20status`}>Order status</a>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
        </div>
        <div className="sf-footer__col">
          <span className="sf-footer__h">Stay in the loop</span>
          <form className="sf-footer__form" onSubmit={(e) => { e.preventDefault(); onToast("Thanks! Join our Discord for drop alerts."); setEmail(""); }}>
            <label className="sh-visually-hidden" htmlFor="sf-news">Email</label>
            <input id="sf-news" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button type="submit">Join</button>
          </form>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord community</a>
        </div>
      </div>
      <div className="sf-wrap sf-footer__bottom">
        <span>© {new Date().getFullYear()} Spin Hobby · spinhobby.com</span>
        <span className="sf-currency">
          Prices in
          <button type="button" className={currency === "CAD" ? "is-active" : ""} onClick={() => onCurrency("CAD")}>CAD</button>
          <button type="button" className={currency === "USD" ? "is-active" : ""} onClick={() => onCurrency("USD")}>USD</button>
        </span>
      </div>
    </footer>
  );
}

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../components/styles/tokens.scss";
import "./storefront.scss";
import { handlingLabel, price, normalizeStatus, type Currency } from "../format";
import { EVENTS } from "../events/data";
import { eventDateShort, isPastEvent } from "../events/dates";
import { useAuth, useEscape, useLocalState, useTheme, useToast } from "../hooks";
import { useContentSwap, useEnterAnimation, useScrollFade, useSlidingIndicator } from "../../components/hooks";
import "../../components/styles/motion.scss";
import { useDocumentHead } from "../seo";
import type { Product } from "../types";
import { freeShippingLabel, useStoreConfig } from "../storeConfig";
import {
  ALL,
  AVAIL,
  DEFAULT_AVAIL,
  NAV,
  PRICES,
  SORTS,
  productIdFromPath,
  productPath,
  useCart,
  useProducts,
  useStorefront,
  useWishlist,
  type Filters,
  type NavKey,
  type ShopSort,
} from "./data";
import { AccountMenu, CartDrawer, NotifyDialog, WelcomeCard } from "./Overlays";
import { ProductPage } from "./ProductPage";
import { consumeSignupFlag } from "../../lib/api";
import { CategoryNav } from "./CategoryNav";
import { buildTree, indentLabel } from "../categoryTree";
import { DISCORD_URL, EBAY_URL, INSTAGRAM_URL, SHOW_EBAY_STORE } from "../links";
import { MiniRow, PreorderCard, ProductCard, ProductRow, type CardActions } from "./ProductViews";
import { addedMessage, shippingGap } from "./nudges";
import {
  SECTIONS,
  breadcrumbJsonLd,
  categoryBySlug,
  categoryCopy,
  categoryPath,
  homeCopy,
  landingFromPath,
  sectionCopy,
  sectionPath,
  seriesCopy,
  seriesPath,
  titleFromSlug,
} from "./landing";
import { slugify } from "./data";

const LOGO = "/logo/logo%20cropped.png";
const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";
const EVENT_COLORS = ["var(--red)", "var(--blue)", "var(--gold)", "var(--teal)"];

export default function Storefront() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast, flash } = useToast(2400);
  const auth = useAuth();
  const store = useStorefront();
  const cart = useCart();
  const wishlist = useWishlist(!!auth.session, flash);
  const [currency, setCurrency] = useLocalState<Currency>("spinhobby-currency", "CAD");
  useStoreConfig(); // applies admin shipping / handling / FX settings to all copy

  const [filters, setFilters] = useState<Filters>({
    nav: "Home",
    category: ALL,
    categoryId: null,
    avail: DEFAULT_AVAIL,
    price: "Any",
    sort: "featured",
    query: "",
    series: null,
  });
  const [draftQuery, setDraftQuery] = useState("");
  // How the shop lists products: cards, smaller cards (more per screen), or rows.
  const [view, setView] = useLocalState<"grid" | "compact" | "list">("spinhobby-view", "grid");
  const [wishOnly, setWishOnly] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notify, setNotify] = useState<Product | null>(null);
  const shopRef = useRef<HTMLElement>(null);

  // The cart button gives a little bounce whenever something is added, so the shopper sees where it went.
  const [bump, setBump] = useState(0);
  const lastCount = useRef(cart.count);
  useEffect(() => {
    if (cart.count > lastCount.current) setBump((b) => b + 1);
    lastCount.current = cart.count;
  }, [cart.count]);
  const gap = shippingGap(cart.subtotal);

  // Greet people when they go from signed out to signed in (password, sign-up, or back from Google/Discord).
  const [welcome, setWelcome] = useState<{ isNew: boolean } | null>(null);
  const signedInId = auth.user?.id ?? null;
  const prevSignedInId = useRef(signedInId);
  useEffect(() => {
    if (signedInId && !prevSignedInId.current) setWelcome({ isNew: consumeSignupFlag() });
    if (!signedInId) setWelcome(null);
    prevSignedInId.current = signedInId;
  }, [signedInId]);
  const closeWelcome = useCallback(() => setWelcome(null), []);

  // Product pages live at /product/<id> and share the header, cart and footer with the shop.
  // Back returns to the same scroll position in the shop.
  const location = useLocation();
  const navigate = useNavigate();
  const productId = productIdFromPath(location.pathname);
  const initialProduct = (location.state as { product?: Product } | null)?.product ?? null;
  const scrollMemory = useRef(new Map<string, number>()).current;

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    const legacy = new URLSearchParams(window.location.search).get("product"); // old ?product= popup links
    if (legacy && !productIdFromPath(window.location.pathname)) {
      navigate(`/product/${encodeURIComponent(legacy)}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (productId) {
      window.scrollTo(0, 0);
      return;
    }
    const y = scrollMemory.get(location.key) ?? 0;
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, [location.key, productId, scrollMemory]);

  const openProduct = useCallback(
    (p: Product) => {
      scrollMemory.set(location.key, window.scrollY);
      navigate(productPath(p), { state: { product: p } });
    },
    [navigate, location.key, scrollMemory],
  );
  /** Header and footer controls act on the shop, so leave the product page first. */
  const leaveProduct = () => {
    if (!productId) return;
    navigate("/");
  };
  /** Go to a shop address (a section, category or series page), remembering where we were for Back. */
  const go = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    scrollMemory.set(location.key, window.scrollY);
    navigate(path);
  };

  const home = store.home;
  // Category tree + counts come from the server (counts include subcategories).
  const tree = useMemo(() => buildTree(home?.categories ?? []), [home?.categories]);

  // The address decides which section, category or series the shop shows (each has its own page for search engines).
  const landing = useMemo(() => (productId ? null : landingFromPath(location.pathname)), [productId, location.pathname]);
  const landingCategory = landing?.kind === "category" ? categoryBySlug(tree, landing.slug) : null;
  // a search typed on a landing page goes back to the main shop with it
  const pendingQuery = useRef<string | null>(null);
  useEffect(() => {
    if (productId) return;
    setWishOnly(false);
    if (landing?.kind === "section")
      setFilters((f) => ({ ...f, nav: landing.nav, category: ALL, categoryId: null, query: "", series: null }));
    else if (landing?.kind === "series")
      setFilters((f) => ({ ...f, nav: "Home", category: ALL, categoryId: null, query: "", series: landing.slug }));
    else if (landing?.kind === "category") {
      if (landingCategory)
        setFilters((f) => ({ ...f, nav: "Category", category: ALL, categoryId: landingCategory.id, query: "", series: null }));
    } else {
      const q = pendingQuery.current ?? "";
      pendingQuery.current = null;
      setDraftQuery(q);
      setFilters((f) => ({ ...f, nav: "Home", category: f.categoryId ? ALL : f.category, categoryId: null, query: q, series: null }));
    }
  }, [productId, landing, landingCategory]);

  const facets = store.facets;
  const results = useProducts(filters, wishOnly ? wishlist.list : null);

  const seriesName =
    landing?.kind === "series"
      ? (results.items.find((p) => p.series && slugify(p.series) === landing.slug)?.series ?? titleFromSlug(landing.slug))
      : null;
  const page =
    landing?.kind === "section"
      ? sectionCopy(landing.nav)
      : landing?.kind === "category"
        ? landingCategory
          ? categoryCopy(tree, landingCategory.id)
          : null
        : landing?.kind === "series"
          ? seriesCopy(seriesName!, landing.slug)
          : null;
  const intro = homeCopy();
  useDocumentHead({
    enabled: !productId,
    title: page?.title ?? intro.title,
    description: page?.description ?? intro.description,
    path: page ? (page.canonical ?? page.crumbs[page.crumbs.length - 1].path) : "/",
    jsonLd: page ? breadcrumbJsonLd(page.crumbs) : null,
  });

  // Same split as the Events page. With nothing upcoming, show the latest events (newest first) so the strip isn't empty.
  const { stripEvents, stripIsPast } = useMemo(() => {
    const upcoming = EVENTS.filter((e) => !isPastEvent(e));
    if (upcoming.length) return { stripEvents: upcoming.slice(0, 8), stripIsPast: false };
    return {
      stripEvents: EVENTS.filter((e) => isPastEvent(e))
        .reverse()
        .slice(0, 6),
      stripIsPast: true,
    };
  }, []);
  // Arriving from another page at /#events: the section only exists once the data has loaded, so the
  // browser's own jump finds nothing. Scroll to it once, when the page has its final shape.
  const hashScrolled = useRef(false);
  useEffect(() => {
    if (!location.hash || hashScrolled.current || !home || results.loading) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return;
    hashScrolled.current = true;
    target.scrollIntoView({ block: "start" });
  }, [location.hash, home, results.loading]);
  useEscape(filtersOpen ? () => setFiltersOpen(false) : null);
  const scrollShop = useCallback(() => {
    window.setTimeout(() => {
      const el = shopRef.current;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 130, behavior: "smooth" });
    }, 30);
  }, []);

  const setNav = (nav: NavKey) => {
    setWishOnly(false);
    go(sectionPath(nav));
  };
  /** value: ALL, "id:<shop category id>", or a Square category name (flat fallback). */
  const setCategory = (value: string) => {
    setWishOnly(false);
    setFiltersOpen(false);
    const id = value.startsWith("id:") ? value.slice(3) : null;
    if (id) {
      go(categoryPath(tree, id));
      return;
    }
    if (value === ALL) {
      go("/");
      return;
    }
    leaveProduct();
    setFilters((f) => ({ ...f, category: value, categoryId: null, nav: "Category" }));
    scrollShop();
  };
  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (productId || landing) {
      pendingQuery.current = draftQuery;
      go("/");
    } else setFilters((f) => ({ ...f, query: draftQuery }));
    if (draftQuery.trim()) scrollShop();
  };
  const clearFilters = () => {
    setWishOnly(false);
    setDraftQuery("");
    setFilters((f) => ({
      ...f,
      nav: "Home",
      category: ALL,
      categoryId: null,
      avail: DEFAULT_AVAIL,
      price: "Any",
      query: "",
      series: null,
    }));
    if (location.pathname !== "/") go("/");
  };

  const hasTree = tree.flat.length > 0;
  const categoryTotals = useMemo(() => new Map((facets?.shopCategories ?? []).map((c) => [c.id, c.total])), [facets]);
  const categories = useMemo(() => (facets?.categories ?? []).map((c) => [c.name, c.count] as [string, number]), [facets]);
  const availCounts: Record<string, number> = {
    "In stock": facets?.status.in ?? 0,
    "Pre-order": facets?.status.pre ?? 0,
    "Sold out": facets?.status.out ?? 0,
  };

  const isHome =
    filters.nav === "Home" && filters.category === ALL && !filters.categoryId && !filters.query.trim() && !filters.series && !wishOnly;
  const hasFilters =
    filters.price !== "Any" ||
    AVAIL.some((a) => filters.avail[a.name] !== DEFAULT_AVAIL[a.name]) ||
    filters.category !== ALL ||
    !!filters.categoryId;

  const preorders = home?.preorders ?? [];
  const ranking = home?.ranking ?? [];
  const arrived = home?.newInStock ?? [];
  const closingSoon = home?.promos?.closingSoon ?? 0;
  const maxOff = home?.promos?.maxDiscountPct ?? 0;
  const storeEmpty = facets !== null && facets.total === 0;

  const actions: CardActions = {
    currency,
    inCart: (p) => cart.has(p.variationId),
    wished: (p) => wishlist.ids.has(p.id),
    onAdd: (p) => {
      if (normalizeStatus(p.status) === "out") {
        setNotify(p);
        return;
      }
      cart.add(p);
      flash(
        addedMessage(
          p.status === "pre" ? "Pre-order added to cart" : "Added to cart",
          cart.subtotal,
          cart.subtotal + p.priceCents,
          currency,
        ),
      );
    },
    onNotify: setNotify,
    onWish: wishlist.toggle,
    onOpen: openProduct,
  };

  const popularSeries = useMemo(() => {
    const seen = new Map<string, number>();
    for (const p of [...(home?.ranking ?? []), ...(home?.preorders ?? []), ...(home?.newInStock ?? []), ...(home?.featuredItems ?? [])]) {
      if (p.series) seen.set(p.series, (seen.get(p.series) ?? 0) + 1);
    }
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([name]) => name);
  }, [home]);

  const shopTitle = wishOnly
    ? "Your wishlist"
    : filters.categoryId
      ? tree.path(filters.categoryId).join(" › ")
      : filters.category !== ALL
        ? filters.category
        : filters.query.trim()
          ? `Results for “${filters.query.trim()}”`
          : filters.nav === "Home"
            ? "All products"
            : filters.nav;

  // Motion: the section underline glides to the chosen tab; a new page fades up (a whole product page, or only the shop column
  // when the address changes inside the shop, so the sidebar stays put).
  const activeNav = !wishOnly && !productId && !filters.query && !filters.series ? filters.nav : null;
  const navInd = useSlidingIndicator<HTMLElement>(activeNav);
  const pageRef = useEnterAnimation<HTMLDivElement>(productId ?? "shop");
  const mainRef = useEnterAnimation<HTMLElement>(location.pathname);
  // Changing tab, category, search or wishlist: the old products fade out, then the new ones rise in one after another.
  const swap = useContentSwap(`${location.pathname}|${wishOnly}|${filters.query}`, results.items);
  const listMotion = `ui-stagger ${swap.phase !== "shown" ? "ui-leaving" : results.loading ? "is-refreshing" : ""}`;
  // the sidebar scrolls without a bar; its edges fade while there is more
  const sidebarRef = useScrollFade<HTMLElement>();

  return (
    <div className="sh sf" data-view={view}>
      <a className="sf-skip" href="#shop">
        Skip to products
      </a>

      {/* Utility bar */}
      <div className="sf-utility">
        <div className="sf-wrap sf-utility__inner">
          {/* once the cart has something, say how close it is to free shipping (a goal close at hand is motivating) */}
          <span className="sf-utility__ship" key={cart.count ? (gap ? "gap" : "free") : "none"}>
            {!cart.count ? (
              <>
                <span className="sf-gold">●</span> Free shipping on orders over {freeShippingLabel()} · Canada &amp; US
              </>
            ) : gap ? (
              <>
                <span className="sf-gold">●</span> You're <b>{price(gap, currency)}</b> away from free shipping
              </>
            ) : (
              <>
                <span className="sf-gold">✓</span> Your order ships free
              </>
            )}
          </span>
          {/* site links only: Discord and Instagram are the icons beside the search */}
          <div className="sf-utility__links">
            {SHOW_EBAY_STORE && (
              <a href={EBAY_URL} target="_blank" rel="noreferrer">
                eBay store ↗
              </a>
            )}
            <Link to="/events">Events</Link>
            <Link to="/support">Support</Link>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sf-header">
        <div className="sf-wrap sf-header__row">
          <a
            href="/"
            className="sf-logo"
            onClick={(e) => {
              e.preventDefault();
              clearFilters();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img src={LOGO} alt="Spin Hobby" />
          </a>
          <form className="sf-search" role="search" onSubmit={submitSearch}>
            <label className="sh-visually-hidden" htmlFor="sf-cat">
              Category
            </label>
            <select
              id="sf-cat"
              value={filters.categoryId ? `id:${filters.categoryId}` : filters.category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value={ALL}>{ALL}</option>
              {hasTree
                ? tree.flat
                    .filter((n) => categoryTotals.get(n.id))
                    .map((n) => (
                      <option key={n.id} value={`id:${n.id}`}>
                        {indentLabel(n)}
                      </option>
                    ))
                : categories.map(([c]) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
            </select>
            <label className="sh-visually-hidden" htmlFor="sf-q">
              Search
            </label>
            <input
              id="sf-q"
              type="search"
              placeholder="Search by product, character, series or JAN code…"
              value={draftQuery}
              onChange={(e) => {
                setDraftQuery(e.target.value);
                if (!e.target.value) setFilters((f) => ({ ...f, query: "" }));
              }}
            />
            <button type="submit">Search</button>
          </form>
          <div className="sf-header__actions">
            <a className="sh-icon-btn" href={DISCORD_URL} target="_blank" rel="noreferrer" title="Discord" aria-label="Join our Discord">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419z" />
              </svg>
            </a>
            <a
              className="sh-icon-btn"
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              title="Instagram"
              aria-label="Follow us on Instagram"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
              </svg>
            </a>
            <button type="button" className="sh-icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle dark mode">
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <AccountMenu email={auth.email} user={auth.user} onSignOut={auth.signOut} />
            <button
              type="button"
              className={`sf-head-link sf-wish ${wishOnly ? "is-on" : ""}`}
              aria-pressed={wishOnly}
              onClick={() => {
                leaveProduct();
                setWishOnly((w) => !w);
                scrollShop();
              }}
              aria-label={`Wishlist, ${wishlist.count} items`}
            >
              <span className="sf-red">♥</span>
              {wishlist.count}
            </button>
            <button
              type="button"
              className={`sf-cart-btn ${bump ? (bump % 2 ? "is-bump-a" : "is-bump-b") : ""}`}
              onClick={() => setCartOpen(true)}
              aria-label={`Cart, ${cart.count} items`}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 6h15l-1.5 9h-12z" />
                <path d="M6 6 5 3H2" />
                <circle cx="9" cy="20" r="1.4" />
                <circle cx="18" cy="20" r="1.4" />
              </svg>
              <span className="sf-cart-btn__label">Cart</span>
              <span key={bump} className="sf-cart-btn__n">
                {cart.count}
              </span>
            </button>
          </div>
        </div>
        <nav ref={navInd.ref} className="sf-wrap sf-nav" aria-label="Shop sections">
          <span className={`sf-nav__ind ${navInd.ready ? "is-ready" : ""}`} style={navInd.style} aria-hidden />
          {NAV.map((n) => (
            <a
              key={n}
              href={sectionPath(n)}
              className={activeNav === n ? "is-active" : ""}
              data-on={activeNav === n}
              aria-current={filters.nav === n && !productId ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                setNav(n);
              }}
            >
              {n}
            </a>
          ))}
        </nav>
      </header>

      <div ref={pageRef}>
        {productId ? (
          <div className="sf-wrap">
            <ProductPage
              id={productId}
              initial={initialProduct}
              a={actions}
              tree={tree}
              cartQty={cart.qtyOf}
              cartSubtotal={cart.subtotal}
              onAddQty={(p, qty) => cart.add(p, qty)}
              onViewCart={() => setCartOpen(true)}
              onToast={flash}
              onCategory={(id) => setCategory(`id:${id}`)}
              onHome={() => {
                clearFilters();
                window.scrollTo({ top: 0 });
              }}
            />
          </div>
        ) : (
          <div className="sf-wrap sf-body">
            {/* Sidebar (becomes a slide-over sheet on small screens) */}
            {filtersOpen && <div className="sh-overlay sf-sidebar-overlay" onClick={() => setFiltersOpen(false)} />}
            <aside ref={sidebarRef} className={`sf-sidebar ui-scroll-fade ${filtersOpen ? "is-open" : ""}`} aria-label="Filters">
              <div className="sf-sidebar__mobile-head">
                <strong>Filters</strong>
                <button type="button" className="sh-icon-btn" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  ×
                </button>
              </div>
              {hasTree ? (
                <CategoryNav
                  tree={tree}
                  totals={categoryTotals}
                  allCount={facets?.total ?? 0}
                  selectedId={filters.categoryId}
                  hrefFor={(id) => (id ? categoryPath(tree, id) : "/")}
                  onSelect={(id) => setCategory(id ? `id:${id}` : ALL)}
                />
              ) : (
                <div className="sf-panel sf-cats">
                  <div className="sh-eyebrow sf-cats__label">Categories</div>
                  {[[ALL, facets?.total ?? 0] as [string, number], ...categories].map(([c, count]) => (
                    <button key={c} type="button" className={filters.category === c ? "is-active" : ""} onClick={() => setCategory(c)}>
                      <span>{c}</span>
                      <span className="sf-cats__count">{count || "—"}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="sf-panel sf-filters">
                <div className="sh-eyebrow">Availability</div>
                {AVAIL.map((a) => (
                  <label key={a.name} className="sf-check">
                    <input
                      type="checkbox"
                      checked={filters.avail[a.name]}
                      onChange={() => setFilters((f) => ({ ...f, avail: { ...f.avail, [a.name]: !f.avail[a.name] } }))}
                    />
                    <span className="sf-dot" style={{ background: a.color }} />
                    <span className="sf-check__name">{a.name}</span>
                    <span className="sf-muted sf-small">{availCounts[a.name]}</span>
                  </label>
                ))}
                <div className="sh-eyebrow sf-filters__price">Price (CAD)</div>
                <div className="sf-pills">
                  {PRICES.map((pr) => (
                    <button
                      key={pr.name}
                      type="button"
                      className={filters.price === pr.name ? "is-active" : ""}
                      aria-pressed={filters.price === pr.name}
                      onClick={() => setFilters((f) => ({ ...f, price: pr.name }))}
                    >
                      {pr.name}
                    </button>
                  ))}
                </div>
                {hasFilters && (
                  <button type="button" className="sf-clear" onClick={clearFilters}>
                    Clear all filters
                  </button>
                )}
              </div>
              <a className="sf-discord" href={DISCORD_URL} target="_blank" rel="noreferrer">
                <img src={MASCOT} alt="" />
                <strong>Join our Discord community</strong>
                <span>Chat with fellow fans →</span>
              </a>
            </aside>

            <main ref={mainRef} className="sf-main">
              {store.error && (
                <div className="sf-demo-note" role="alert">
                  <b>Can't reach the shop right now.</b> {store.error}{" "}
                  <button type="button" className="sf-link" onClick={store.reload}>
                    Try again
                  </button>
                </div>
              )}

              {isHome && home && (
                <>
                  <HeroRow
                    heading={intro.h1}
                    slides={home.slides}
                    closingSoon={closingSoon}
                    maxOff={maxOff}
                    onPreorders={() => setNav("Pre-Orders")}
                    onSale={() => setNav("Sale")}
                  />
                  <TrustStrip />

                  {preorders.length > 0 && (
                    <section aria-labelledby="pre-title">
                      <div className="sf-section-head">
                        <h2 id="pre-title" className="sh-display">
                          New pre-orders <span className="sf-jp">予約受付中</span>
                        </h2>
                        <button type="button" className="sf-link" onClick={() => setNav("Pre-Orders")}>
                          See all →
                        </button>
                      </div>
                      <div className="sf-pre-row">
                        {preorders.map((p) => (
                          <PreorderCard key={p.id} p={p} a={actions} />
                        ))}
                      </div>
                    </section>
                  )}

                  {(ranking.length > 0 || arrived.length > 0) && (
                    <section className="sf-duo">
                      {ranking.length > 0 && (
                        <div className="sf-panel sf-list-card">
                          <div className="sf-list-card__head">
                            <h2 className="sh-display">Weekly ranking</h2>
                            <span className="sf-muted sf-small">Updated Mondays</span>
                          </div>
                          {ranking.map((p, i) => (
                            <MiniRow key={p.id} p={p} a={actions} rank={p.rank ?? i + 1} />
                          ))}
                        </div>
                      )}
                      {arrived.length > 0 && (
                        <div className="sf-panel sf-list-card">
                          <div className="sf-list-card__head">
                            <h2 className="sh-display">Just arrived</h2>
                            <span className="sf-muted sf-small">Ready to ship</span>
                          </div>
                          {arrived.map((p) => (
                            <MiniRow key={p.id} p={p} a={actions} quickAdd />
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}

              {page && !wishOnly && (
                <header className="sf-landing">
                  <nav className="sf-crumbs" aria-label="Breadcrumb">
                    <a
                      href="/"
                      onClick={(e) => {
                        e.preventDefault();
                        clearFilters();
                      }}
                    >
                      Shop
                    </a>
                    {page.crumbs.map((c, i) => (
                      <span key={c.path}>
                        <span aria-hidden>›</span>
                        {i === page.crumbs.length - 1 ? (
                          <span aria-current="page">{c.name}</span>
                        ) : (
                          <a
                            href={c.path}
                            onClick={(e) => {
                              e.preventDefault();
                              go(c.path);
                            }}
                          >
                            {c.name}
                          </a>
                        )}
                      </span>
                    ))}
                  </nav>
                  <h1 className="sh-display">{page.h1}</h1>
                  <p>{page.intro}</p>
                </header>
              )}

              <section id="shop" ref={shopRef} className="sf-shop" aria-labelledby="shop-title">
                <div className="sf-shop__head">
                  <h2 id="shop-title" className="sh-display">
                    <span className={page && !wishOnly && !filters.query ? "sh-visually-hidden" : ""}>
                      {page && !wishOnly ? `Shop ${page.h1.toLowerCase()}` : shopTitle}
                    </span>{" "}
                    <span className="sf-count">{results.loading ? "" : `${results.total} item${results.total === 1 ? "" : "s"}`}</span>
                  </h2>
                  <div className="sf-shop__tools">
                    <button type="button" className="sf-filter-btn" onClick={() => setFiltersOpen(true)}>
                      Filters{hasFilters ? " •" : ""}
                    </button>
                    <label className="sf-muted sf-sort-label" htmlFor="sf-sort">
                      Sort
                    </label>
                    <select
                      id="sf-sort"
                      className="sf-select"
                      value={filters.sort}
                      onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as ShopSort }))}
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <div className="sf-seg" role="group" aria-label="Layout">
                      <button
                        type="button"
                        className={view === "grid" ? "is-active" : ""}
                        aria-pressed={view === "grid"}
                        onClick={() => setView("grid")}
                      >
                        Grid
                      </button>
                      <button
                        type="button"
                        className={view === "compact" ? "is-active" : ""}
                        aria-pressed={view === "compact"}
                        onClick={() => setView("compact")}
                        title="Smaller cards, more products per screen"
                      >
                        Compact
                      </button>
                      <button
                        type="button"
                        className={view === "list" ? "is-active" : ""}
                        aria-pressed={view === "list"}
                        onClick={() => setView("list")}
                      >
                        List
                      </button>
                    </div>
                  </div>
                </div>

                {(results.loading && !results.items.length) || swap.phase === "slow" ? (
                  <div className={`sf-grid ${view === "compact" ? "sf-grid--compact" : ""}`} aria-busy="true" aria-label="Loading products">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className="sf-card sf-card--skeleton">
                        <div className="sh-skeleton" style={{ aspectRatio: "1" }} />
                        <div className="sh-skeleton" style={{ height: 14, margin: "12px 12px 6px" }} />
                        <div className="sh-skeleton" style={{ height: 14, width: "50%", margin: "0 12px 14px" }} />
                      </div>
                    ))}
                  </div>
                ) : results.error ? (
                  <div className="sf-empty">
                    <strong>We couldn't load the shop right now</strong>
                    <span>{results.error}</span>
                    <button type="button" className="sh-btn" onClick={results.retry}>
                      Try again
                    </button>
                  </div>
                ) : storeEmpty ? (
                  <div className="sf-empty">
                    <img src={MASCOT} alt="" className="sf-empty__mascot" />
                    <strong>New stock is on its way</strong>
                    <span>Our catalog is syncing from the shop. Come say hi in our Discord community while you wait.</span>
                    <a className="sh-btn sh-btn--gold" href={DISCORD_URL} target="_blank" rel="noreferrer">
                      Join the Discord
                    </a>
                  </div>
                ) : results.items.length === 0 ? (
                  <div className="sf-empty">
                    <strong>{wishOnly ? "Your wishlist is empty" : "Nothing matches these filters"}</strong>
                    <span>
                      {wishOnly
                        ? "Tap ♡ on any product to save it here."
                        : "Try another category or clear filters. New stock is added weekly."}
                    </span>
                    <button type="button" className="sh-btn sh-btn--ghost" onClick={clearFilters}>
                      Clear filters
                    </button>
                  </div>
                ) : view !== "list" ? (
                  <div key={swap.round} className={`sf-grid ${view === "compact" ? "sf-grid--compact" : ""} ${listMotion}`}>
                    {results.items.map((p) => (
                      <ProductCard key={p.id} p={p} a={actions} />
                    ))}
                  </div>
                ) : (
                  <div key={swap.round} className={`sf-panel sf-list ${listMotion}`}>
                    {results.items.map((p) => (
                      <ProductRow key={p.id} p={p} a={actions} />
                    ))}
                  </div>
                )}
                {!results.loading && results.cursor && (
                  <div className="sf-more">
                    <span className="sf-muted">
                      Showing {results.items.length} of {results.total}
                    </span>
                    <button type="button" className="sh-btn sh-btn--ghost" onClick={results.loadMore} disabled={results.loadingMore}>
                      {results.loadingMore ? "Loading…" : "Show more"}
                    </button>
                  </div>
                )}
              </section>

              {isHome && (
                <section className="sf-panel sf-about" aria-labelledby="about-shop-title">
                  <h2 id="about-shop-title" className="sh-display">
                    Your Canadian shop for authentic anime merch
                  </h2>
                  <p>{intro.intro}</p>
                  <div className="sf-about__links">
                    <span className="sh-eyebrow">Shop by type</span>
                    {SECTIONS.map((sct) => (
                      <a
                        key={sct.path}
                        href={sct.path}
                        onClick={(e) => {
                          e.preventDefault();
                          setNav(sct.nav);
                        }}
                      >
                        {sct.h1}
                      </a>
                    ))}
                  </div>
                  {popularSeries.length > 0 && (
                    <div className="sf-about__links">
                      <span className="sh-eyebrow">Popular series</span>
                      {popularSeries.map((name) => (
                        <a
                          key={name}
                          href={seriesPath(name)}
                          onClick={(e) => {
                            e.preventDefault();
                            go(seriesPath(name));
                          }}
                        >
                          {name}
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section id="events" className="sf-panel sf-events" aria-labelledby="events-title">
                <div className="sf-events__head">
                  <h2 id="events-title" className="sh-display">
                    Meet us at the con
                  </h2>
                  <Link to="/events" className="sf-events__all">
                    See all events →
                  </Link>
                </div>
                {stripIsPast && (
                  <p className="sf-events__note">
                    No upcoming events right now. New dates are announced on Discord and Instagram. Recent events:
                  </p>
                )}
                <div className="sf-events__list">
                  {stripEvents.map((e, i) => (
                    <span key={e.name + e.start} className={`sf-event ${stripIsPast ? "is-past" : ""}`}>
                      <span className="sf-dot" style={{ background: EVENT_COLORS[i % EVENT_COLORS.length] }} />
                      {e.name}
                      <span className="sf-muted sf-event__date">
                        {eventDateShort(e.start, e.end)} · {e.city}
                      </span>
                    </span>
                  ))}
                </div>
              </section>
            </main>
          </div>
        )}
      </div>

      <Footer currency={currency} onCurrency={setCurrency} onNav={setNav} />

      {cartOpen && (
        <CartDrawer
          lines={cart.lines}
          subtotal={cart.subtotal}
          currency={currency}
          onQty={cart.setQty}
          onAdd={(p) => cart.add(p)}
          onOpen={(p) => {
            setCartOpen(false);
            openProduct(p);
          }}
          onClose={() => setCartOpen(false)}
        />
      )}
      {notify && (
        <NotifyDialog
          product={notify}
          email={auth.email}
          onClose={() => setNotify(null)}
          onDone={(m) => {
            setNotify(null);
            flash(m);
          }}
        />
      )}
      {welcome && auth.user && <WelcomeCard user={auth.user} isNew={welcome.isNew} onClose={closeWelcome} />}
      {toast && !cartOpen && (
        <div key={toast} className="sh-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

/** Four reasons to buy here, right under the hero: what a first-time visitor wants to know before trusting a shop. */
function TrustStrip() {
  const items = [
    { icon: "✦", title: "100% authentic", text: "Officially licensed goods only" },
    { icon: "🚚", title: `Free shipping over ${freeShippingLabel()}`, text: "Tracked, Canada & US" },
    { icon: "📦", title: `Ships in ${handlingLabel()}`, text: "Packed with care for collectors" },
    { icon: "🔒", title: "Secure checkout", text: "Card or PayPal" },
  ];
  return (
    <ul className="sf-trust" aria-label="Why shop with us">
      {items.map((t) => (
        <li key={t.title}>
          <span aria-hidden>{t.icon}</span>
          <div>
            <b>{t.title}</b>
            <span>{t.text}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HeroRow({
  heading = homeCopy().h1,
  slides,
  closingSoon,
  maxOff,
  onPreorders,
  onSale,
}: {
  heading?: string;
  slides: { id: string; headline: string; subheading: string | null; image_url: string | null; link_url: string | null }[];
  closingSoon: number;
  maxOff: number;
  onPreorders: () => void;
  onSale: () => void;
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
      <Banner
        className="sf-hero__banner"
        {...(slide.link_url ? { href: slide.link_url } : {})}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-roledescription="carousel"
      >
        {slide.image_url ? (
          <img key={slide.id} className="sf-hero__photo" src={slide.image_url} alt="" />
        ) : (
          <>
            <div className="sf-hero__sun" />
            <img className="sf-hero__mascot" src={MASCOT} alt="Spin Hobby mascot" />
          </>
        )}
        <div className="sf-hero__copy" aria-live="polite">
          {/* the page's one h1: what the shop is, for people and search engines; the slide headline changes */}
          <h1 className="sf-hero__eyebrow">{heading}</h1>
          <div key={slide.id} className="sf-hero__text">
            <h2 className="sh-display">{slide.headline}</h2>
            {slide.subheading && <p>{slide.subheading}</p>}
          </div>
          {count > 1 && (
            <div className="sf-hero__dots" role="tablist" aria-label="Slides">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Slide ${i + 1}`}
                  className={i === index ? "is-active" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAutoplay(false);
                    setIndex(i);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Banner>
      <div className="sf-promos">
        <button type="button" className="sf-promo" onClick={onPreorders}>
          <span className="sf-promo__eyebrow" style={{ color: "var(--blue)" }}>
            {closingSoon ? "Pre-orders closing soon" : "Pre-orders"}
          </span>
          <span className="sf-promo__title sh-display">
            {closingSoon ? `${closingSoon} item${closingSoon === 1 ? "" : "s"} close in the next 30 days →` : "Reserve upcoming releases →"}
          </span>
        </button>
        {maxOff > 0 ? (
          <button type="button" className="sf-promo sf-promo--sale" onClick={onSale}>
            <span className="sf-promo__eyebrow">Sale</span>
            <span className="sf-promo__title sh-display">Up to {maxOff}% off selected items →</span>
          </button>
        ) : (
          <a className="sf-promo sf-promo--gold" href={DISCORD_URL} target="_blank" rel="noreferrer">
            <span className="sf-promo__eyebrow">Community</span>
            <span className="sf-promo__title sh-display">Join our Discord community →</span>
          </a>
        )}
      </div>
    </div>
  );
}

function Footer({ currency, onCurrency, onNav }: { currency: Currency; onCurrency: (c: Currency) => void; onNav: (n: NavKey) => void }) {
  const go = (n: NavKey) => (e: React.MouseEvent) => {
    e.preventDefault();
    onNav(n);
  };
  return (
    <footer className="sf-footer">
      <div className="sf-wrap sf-footer__grid">
        <div className="sf-footer__brand">
          <img src={LOGO} alt="Spin Hobby" />
          <p>Official anime figures, plushies &amp; more. We bring the fun to everyone — since 2022.</p>
        </div>
        <div className="sf-footer__col">
          <span className="sf-footer__h">Shop</span>
          {SECTIONS.map((sct) => (
            <a key={sct.path} href={sct.path} onClick={go(sct.nav)}>
              {sct.h1}
            </a>
          ))}
          {SHOW_EBAY_STORE && (
            <a href={EBAY_URL} target="_blank" rel="noreferrer">
              eBay store
            </a>
          )}
          <Link to="/events">Events</Link>
        </div>
        <div className="sf-footer__col">
          <span className="sf-footer__h">Help</span>
          <Link to="/support#preorders">Pre-order policy</Link>
          <Link to="/support#shipping">Shipping &amp; duties</Link>
          <Link to="/support#order-status">Order status</Link>
          <Link to="/support#contact">Contact</Link>
          <a href="/legal/terms">Terms of Service</a>
          <a href="/legal/privacy">Privacy Policy</a>
        </div>
        <div className="sf-footer__col">
          <span className="sf-footer__h">Community</span>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">
            Join our Discord community
          </a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </div>
      </div>
      <div className="sf-wrap sf-footer__bottom">
        <span>© {new Date().getFullYear()} Spin Hobby · spinhobby.com</span>
        <span className="sf-currency">
          Prices in
          <button type="button" className={currency === "CAD" ? "is-active" : ""} onClick={() => onCurrency("CAD")}>
            CAD
          </button>
          <button type="button" className={currency === "USD" ? "is-active" : ""} onClick={() => onCurrency("USD")}>
            USD
          </button>
          {currency === "USD" && <span className="sf-currency__note">USD is an estimate · you pay in CAD</span>}
        </span>
      </div>
    </footer>
  );
}

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, signIn } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import "./storefront.scss";

type Product = {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  status?: "in" | "pre" | "out" | string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  releaseDate?: string | null;
  variationId?: string | null;
};

type ApiProduct = {
  id: string;
  name: string;
  category?: string | null;
  status?: string | null;
  priceCents?: number | null;
  compareAtCents?: number | null;
  images?: string[] | null;
  releaseMonth?: string | null;
  variationId?: string | null;
};

type Homepage = {
  slides?: { eyebrow?: string; title?: string; description?: string; image_url?: string }[];
  newInStock?: ApiProduct[];
  preorders?: ApiProduct[];
  ranking?: ApiProduct[];
};

const tabs = ["All", "New Arrivals", "Pre-Orders", "Top Ranked"];
const categoryOptions = ["Figures", "Model Kits", "Trading Cards", "Plush", "Collectibles"];

const money = (value?: number | null) =>
  new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(value ?? 0);

const productFromApi = (item: ApiProduct): Product => ({
  id: item.id,
  name: item.name,
  category: item.category,
  status: item.status,
  price: (item.priceCents ?? 0) / 100,
  compareAtPrice: item.compareAtCents ? item.compareAtCents / 100 : null,
  imageUrl: item.images?.[0] ?? null,
  releaseDate: item.releaseMonth ?? null,
  variationId: item.variationId ?? null,
});

function ProductCard({ item, onAdd }: { item: Product; onAdd: (item: Product) => void }) {
  const unavailable = item.status === "out";
  return (
    <article className="product-card">
      <div className="product-card__image">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <span>Spin Hobby</span>}
        <span className={`status status--${item.status ?? "in"}`}>
          {item.status === "pre" ? "Pre-order" : item.status === "out" ? "Sold out" : "In stock"}
        </span>
      </div>
      <div className="product-card__body">
        <p>{item.brand || item.category || "Spin Hobby"}</p>
        <h3>{item.name}</h3>
        <div className="product-card__footer">
          <strong>{money(item.price)}</strong>
          <button type="button" disabled={unavailable} onClick={() => onAdd(item)}>
            {unavailable ? "Notify me" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function StorefrontV3() {
  const [homepage, setHomepage] = useState<Homepage>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState("All");
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cart, setCart] = useState<Product[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      api<Homepage>("/homepage").catch(() => ({})),
      api<{ items?: ApiProduct[] }>("/products?limit=36").catch(() => ({ items: [] })),
    ]).then(([home, catalog]) => {
      if (!active) return;
      setHomepage(home);
      setProducts((catalog.items ?? []).map(productFromApi));
      setIsLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setEmail(session?.user.email ?? null));
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((item) => {
      const categoryMatch = category === "All" || item.category === category;
      const tabMatch = tab === "All" || (tab === "Pre-Orders" && item.status === "pre") || (tab === "New Arrivals" && item.status === "in");
      const queryMatch = !normalized || [item.name, item.brand, item.category].some((value) => value?.toLowerCase().includes(normalized));
      return categoryMatch && tabMatch && queryMatch;
    });
  }, [products, category, tab, query]);

  const addToCart = (item: Product) => {
    if (item.status === "out") {
      setMessage("Sign in to get a restock notification for this item.");
      return;
    }
    setCart((current) => [...current, item]);
    setMessage(`${item.name} was added to your local cart.`);
  };

  const login = async (provider: "google" | "discord") => {
    try {
      await signIn(provider);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in is not ready yet.");
    }
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const hero = homepage.slides?.[0];
  const preorderProducts = (homepage.preorders ?? []).map(productFromApi);
  const rankedProducts = (homepage.ranking ?? []).map(productFromApi);

  return (
    <div className="storefront">
      <div className="utility"><span>Free Canada-wide shipping on orders over $150</span><span>Edmonton, Alberta · <a href="mailto:hello@spinhobby.ca">Need help?</a></span></div>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Spin Hobby home"><img src="/logo/logo%20cropped.png" alt="Spin Hobby" /></a>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen}>Menu</button>
        <nav className={menuOpen ? "nav nav--open" : "nav"}>
          <a href="#catalog">Shop</a><a href="#preorders">Pre-orders</a><a href="#rankings">Rankings</a><a href="#community">Community</a>
        </nav>
        <div className="header-actions">
          <button className="header-link" onClick={() => login("google")}>{email ? email.split("@")[0] : "Sign in"}</button>
          <button className="cart-button" onClick={() => setMessage(cart.length ? `${cart.length} item${cart.length === 1 ? "" : "s"} saved in your local cart.` : "Your cart is empty.")}>Cart <b>{cart.length}</b></button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__copy">
            <p className="eyebrow">{hero?.eyebrow ?? "Edmonton’s hobby destination"}</p>
            <h1>{hero?.title ?? "Collect what moves you."}</h1>
            <p>{hero?.description ?? "Figures, model kits, cards, and collectibles picked for people who love the hobby as much as we do."}</p>
            <div className="hero__buttons"><a href="#catalog" className="button button--primary">Shop new arrivals</a><a href="#preorders" className="button button--ghost">Explore pre-orders</a></div>
          </div>
          <div className="hero__art">
            {hero?.image_url ? <img src={hero.image_url} alt="Featured Spin Hobby collection" /> : <><img src="/assets/transparent%20mascot%20chibi%20rotated.png" alt="Spin Hobby mascot" /><div className="hero__halo" /></>}
          </div>
        </section>

        <section className="trust-row"><span>Authentic products</span><span>Protected pre-orders</span><span>Local pickup in Edmonton</span><span>Collector-first support</span></section>

        <section className="feature-section" id="preorders">
          <div className="section-heading"><div><p className="eyebrow">Reserve the next release</p><h2>Pre-orders worth watching</h2></div><a href="#catalog">View all products →</a></div>
          <div className="product-strip">
            {(preorderProducts.length ? preorderProducts : products.filter((item) => item.status === "pre").slice(0, 4)).map((item) => <ProductCard key={item.id} item={item} onAdd={addToCart} />)}
            {!isLoading && !(preorderProducts.length || products.some((item) => item.status === "pre")) && <div className="empty-card"><strong>Pre-orders are being synced from Square.</strong><span>Check back soon for upcoming releases.</span></div>}
          </div>
        </section>

        <section className="catalog" id="catalog">
          <aside className="filters">
            <p className="eyebrow">Find your next favourite</p><h2>Browse the collection</h2>
            <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search figures, cards, kits…" /></label>
            <div className="filter-group"><span>Category</span>{["All", ...categoryOptions].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
            <div className="filter-group"><span>Availability</span><button>In stock</button><button>Pre-order</button><button>Coming soon</button></div>
          </aside>
          <div className="catalog__content">
            <form onSubmit={submitSearch} className="mobile-search"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" /><button>Search</button></form>
            <div className="catalog-tabs">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
            <div className="catalog-meta"><span>{isLoading ? "Loading collection…" : `${visibleProducts.length} collectible${visibleProducts.length === 1 ? "" : "s"}`}</span><button>Sort: Featured ↓</button></div>
            {visibleProducts.length ? <div className="catalog-grid">{visibleProducts.map((item) => <ProductCard key={item.id} item={item} onAdd={addToCart} />)}</div> : !isLoading && <div className="catalog-empty"><p className="eyebrow">A fresh collection is on its way</p><h3>Our catalog is syncing from Square.</h3><p>Browse collections now and return shortly for live inventory, prices, and checkout.</p><button className="button button--primary" onClick={() => setMessage("We’ll share new releases here as soon as the inventory sync completes.")}>Keep me posted</button></div>}
          </div>
        </section>

        <section className="rankings" id="rankings"><div><p className="eyebrow">Community radar</p><h2>What collectors are watching</h2><p>Rankings update from live storefront activity as products arrive.</p></div><ol>{rankedProducts.slice(0, 3).map((item, index) => <li key={item.id}><b>0{index + 1}</b><span>{item.name}</span><em>{money(item.price)}</em></li>)}{!rankedProducts.length && <li><b>01</b><span>Live rankings will appear here after the first catalog sync.</span><em>Coming soon</em></li>}</ol></section>

        <section className="newsletter" id="community"><div><p className="eyebrow">Join the spin</p><h2>New drops, event nights, and collector news.</h2></div><form onSubmit={(event) => { event.preventDefault(); setMessage("Thanks — you’re on the list."); }}><input type="email" placeholder="Your email address" required /><button className="button button--primary">Subscribe</button></form></section>
      </main>
      <footer><img src="/logo/logo%20cropped.png" alt="Spin Hobby" /><p>© {new Date().getFullYear()} Spin Hobby · Edmonton, Alberta</p><div><a href="/admin">Store admin</a><a href="mailto:hello@spinhobby.ca">Contact</a></div></footer>
      {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage("")}>×</button></div>}
      <div className="auth-dock"><span>Sign in with</span><button onClick={() => login("google")}>Google</button><button onClick={() => login("discord")}>Discord</button></div>
    </div>
  );
}

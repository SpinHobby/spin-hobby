import { Pagination, Button } from "@/components";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CardAction, ProductCard, type CardActions } from "@/components/shop/ProductCards";
import { useAuth } from "../hooks";
import { ALL, DEFAULT_AVAIL, productPath, useCart, useProducts, useWishlist, type Filters } from "@/v3/storefront/data";
import "./wishlist.scss";

// same starting filters as Storefront.tsx; defined outside the component so the object stays the same between renders
const FILTERS: Filters = {
  nav: "Home",
  category: ALL,
  categoryId: null,
  avail: DEFAULT_AVAIL,
  price: "Any",
  sort: "featured",
  query: "",
  series: null,
};

export function Wishlist() {
  const navigate = useNavigate();
  const auth = useAuth();
  const wishlist = useWishlist(auth.user?.id ?? null, () => {});
  const cart = useCart();

  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "row">("row");
  const PAGE = 5;

  // the saved ids -> the real products (the same way Storefront.tsx does it)
  const results = useProducts(FILTERS, wishlist.list);
  // keep only items still saved, so a removed item disappears right away
  const items = wishlist.list.length ? results.items.filter((p) => wishlist.ids.has(p.id)) : [];

  const a: CardActions = {
    currency: "CAD",
    inCart: (p) => cart.has(p.variationId),
    wished: (p) => wishlist.ids.has(p.id),
    onAdd: (p) => cart.add(p),
    onNotify: () => {},
    onWish: wishlist.toggle, // the heart: add or remove
    onOpen: (p) => navigate(productPath(p), { state: { product: p } }),
  };

  const visible = items.slice((page - 1) * PAGE, page * PAGE);
  const totalCents = items.reduce((sum, p) => sum + p.priceCents, 0);

  return (
    <>
      <div className="sf-hero__banner">
        <div className="sf-hero__copy">
          <h1 className="sf-hero__eyebrow">SAVED FOR YOU</h1>
          <h2 className="">{items.length} items you love, waiting for you</h2>
          <p>Wishlist total: ${(totalCents / 100).toFixed(2)}</p>
        </div>
        <Button type="button" className="sf-cart-btn" variant="gold">
          Add all to cart
        </Button>
      </div>
      <div className="sf-hcard__actions wishlist-product">
        <div className="ad-chips" role="group" aria-label="Filter by status">
          <button type="button" className="sh-chip is-active">
            All · [counts]
          </button>
          <button type="button" className="sh-chip">
            Price drops · [counts]
          </button>
          <button type="button" className="sh-chip">
            Low stock · [counts]
          </button>
        </div>
        <div className="sf-hcard__end wishlist-views">
          <button type="button" className={`sh-chip views-grid ${view === "grid" ? "is-active" : ""}`} onClick={() => setView("grid")}>
            Grid
          </button>
          <button type="button" className={`sh-chip views-row ${view === "row" ? "is-active" : ""}`} onClick={() => setView("row")}>
            Row
          </button>
        </div>
      </div>

      {items.length === 0 && <p className="ui-muted">{results.loading ? "Loading…" : "Tap ♡ on any product to save it here."}</p>}

      <div className="ui-kit-shop-list">
        {view === "grid" && (
          <div className="ui-kit-shop-grid">
            {visible.map((p) => (
              <ProductCard key={p.id} p={p} a={a} />
            ))}
          </div>
        )}

        {view === "row" && (
          <div className="ui-kit-shop-list">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                p={p}
                a={a}
                layout="horizontal"
                meta="Added recently"
                actions={
                  <>
                    <CardAction onClick={() => {}}>Add a note</CardAction>
                    <CardAction icon label={`Share ${p.name}`} onClick={() => {}}>
                      ↗
                    </CardAction>
                  </>
                }
                onRemove={(x) => wishlist.toggle(x)} // the bin: remove
              />
            ))}
          </div>
        )}
      </div>
      <Pagination page={page} pageSize={PAGE} total={items.length} onPage={setPage} />
    </>
  );
}

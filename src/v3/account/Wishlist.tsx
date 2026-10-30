import { Pagination, Button } from "@/components";
import { useState } from "react";
import { CardAction, ProductCard, type CardActions } from "@/components/shop/ProductCards";
import type { Product } from "@/v3/types";
import "./wishlist.scss";

const base = { variationId: "", character: null, images: [], currency: "CAD" as const, maxPerCustomer: null, createdAt: null };
const PRODUCTS: Product[] = [
  {
    ...base,
    id: "s1",
    name: "Frieren 1/7 Scale Figure",
    series: "Frieren: Beyond Journey's End",
    category: "Scale Figures",
    priceCents: 25900,
    compareAtCents: null,
    status: "pre",
    stockCount: null,
    releaseMonth: "2027-02-01",
    orderByDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    rank: 3,
  },
  {
    ...base,
    id: "s2",
    name: "Nendoroid Hatsune Miku: Snow Miku 2026 Ver.",
    series: "Vocaloid",
    category: "Nendoroids",
    priceCents: 8400,
    compareAtCents: 9900,
    status: "low",
    stockCount: 2,
    releaseMonth: null,
    orderByDate: null,
    rank: null,
  },
  {
    ...base,
    id: "s3",
    name: "Bond Forger Big Plush (40 cm)",
    series: "Spy × Family",
    category: "Character Plush",
    priceCents: 5500,
    compareAtCents: null,
    status: "in",
    stockCount: 12,
    releaseMonth: null,
    orderByDate: null,
    rank: 1,
  },
  {
    ...base,
    id: "s4",
    name: "One Piece Card Game: Premium Card Collection",
    series: "One Piece",
    category: "Trading Cards",
    priceCents: 5900,
    compareAtCents: null,
    status: "out",
    stockCount: 0,
    releaseMonth: null,
    orderByDate: null,
    rank: null,
  },
];

export function Wishlist() {
  const [page, setPage] = useState(1);
  const [removed, setRemoved] = useState<string[]>([]);
  const [cart, setCart] = useState<string[]>([]);

  // Switching between "Grid" and "Row" views
  const [view, setView] = useState<"grid" | "row">("row");

  const PAGE = 5;

  const a: CardActions = {
    currency: "CAD",
    inCart: (p) => cart.includes(p.id),
    wished: () => true,
    onAdd: (p) => setCart((c) => (c.includes(p.id) ? c : [...c, p.id])),
    onNotify: () => {},
    onWish: (p) => setRemoved((r) => [...r, p.id]),
    onOpen: () => {},
  };

  const items = PRODUCTS.filter((p) => !removed.includes(p.id));
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
                onRemove={(x) => setRemoved((r) => [...r, x.id])}
              />
            ))}
          </div>
        )}
      </div>
      <Pagination page={page} pageSize={PAGE} total={items.length} onPage={(newPage) => setPage(newPage)} />
    </>
  );
}

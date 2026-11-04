import { useMemo, useState, type ReactNode } from "react";
import { Card } from "../layout/Card";
import { CardAction, MiniRow, PreorderCard, ProductCard, ProductRow, type CardActions } from "../shop/ProductCards";
import type { Product } from "../../v3/types";

/** Made-up products: every status a card can show (in stock, low, pre-order, sold out, on sale, ranked). */
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

/** The shop's actions, faked: the cart and wishlist live in this page only. */
function useFakeShop(onDone: (m: string) => void): CardActions {
  const [cart, setCart] = useState<string[]>([]);
  const [wish, setWish] = useState<string[]>(["s2"]);
  return useMemo(
    () => ({
      currency: "CAD",
      inCart: (p) => cart.includes(p.id),
      wished: (p) => wish.includes(p.id),
      onAdd: (p) => {
        setCart((c) => (c.includes(p.id) ? c : [...c, p.id]));
        onDone(`${p.name} added to the cart (made up)`);
      },
      onBuyNow: (p) => onDone(`Would go to checkout with just ${p.name} (made up)`),
      onNotify: (p) => onDone(`We'd email you when ${p.name} is back (made up)`),
      onWish: (p) => setWish((w) => (w.includes(p.id) ? w.filter((x) => x !== p.id) : [...w, p.id])),
      onOpen: (p) => onDone(`Would open ${p.name}`),
    }),
    [cart, wish, onDone],
  );
}

function Sample({ name, note, children }: { name: string; note: ReactNode; children: ReactNode }) {
  return (
    <Card title={<code>{name}</code>} padded>
      <p className="ui-muted ui-sm" style={{ margin: 0 }}>
        {note}
      </p>
      {children}
    </Card>
  );
}

/** /ui-kit's Shop tab: the product cards from src/components/shop, with made-up products. */
export function ShopTab({ onDone }: { onDone: (m: string) => void }) {
  const a = useFakeShop(onDone);
  const [removed, setRemoved] = useState<string[]>([]);
  const added = (days: number) =>
    new Date(Date.now() - days * 86_400_000).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  return (
    <>
      <Sample
        name={'ProductCard layout="vertical"'}
        note="The grid card (the default): photo on top. Used in the shop's grid and on the homepage. Shows every status: pre-order closing soon, low stock and on sale, ranked, sold out."
      >
        <div className="ui-kit-shop-grid">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} p={p} a={a} />
          ))}
        </div>
      </Sample>

      <Sample
        name={'ProductCard layout="horizontal"'}
        note="The list card: photo on the left, price on the right, buttons along the bottom. Without extras it ends with the wishlist heart. On a phone the photo shrinks, the price moves under the name and the buttons wrap."
      >
        <div className="ui-kit-shop-list">
          <ProductCard p={PRODUCTS[0]} a={a} layout="horizontal" />
        </div>
      </Sample>

      <Sample
        name="Wishlist row (ProductCard horizontal + meta + actions + onRemove)"
        note={
          <>
            How a wishlist page uses it: <code>meta</code> for the line under the status, <code>actions</code> for the page's own buttons
            (made with <code>CardAction</code>), and <code>onRemove</code> for the bin at the end. The buttons here only show a message.
          </>
        }
      >
        <div className="ui-kit-shop-list">
          {PRODUCTS.filter((p) => !removed.includes(p.id)).map((p, i) => (
            <ProductCard
              key={p.id}
              p={p}
              a={a}
              layout="horizontal"
              meta={`Added ${added(i * 9 + 2)}`}
              actions={
                <>
                  <CardAction onClick={() => onDone("Add a note (made up)")}>Add a note</CardAction>
                  <CardAction onClick={() => onDone("Move to another list (made up)")}>Move ▾</CardAction>
                  <CardAction icon label={`Share ${p.name}`} onClick={() => onDone("Share (made up)")}>
                    ↗
                  </CardAction>
                </>
              }
              onRemove={(x) => {
                setRemoved((r) => [...r, x.id]);
                onDone(`${x.name} removed (made up)`);
              }}
            />
          ))}
          {removed.length > 0 && (
            <button type="button" className="ui-link" onClick={() => setRemoved([])}>
              Bring the removed ones back
            </button>
          )}
        </div>
      </Sample>

      <Sample name="PreorderCard" note="The slim card in the homepage's New pre-orders row (in a ScrollRow there).">
        <div className="ui-kit-shop-grid">
          <PreorderCard p={PRODUCTS[0]} a={a} />
        </div>
      </Sample>

      <Sample name="ProductRow" note="One line in the shop's List view.">
        <div className="sf-panel sf-list">
          {PRODUCTS.slice(1, 3).map((p) => (
            <ProductRow key={p.id} p={p} a={a} />
          ))}
        </div>
      </Sample>

      <Sample name="MiniRow" note="A small line with a thumbnail: the homepage's Weekly ranking (rank) and Just arrived (quickAdd).">
        <div style={{ maxWidth: 420 }}>
          <MiniRow p={PRODUCTS[2]} a={a} rank={1} />
          <MiniRow p={PRODUCTS[1]} a={a} quickAdd />
        </div>
      </Sample>
    </>
  );
}

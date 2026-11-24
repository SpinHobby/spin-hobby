import type { Product } from "../../v3/types";
import { productPath } from "../../v3/storefront/data";
import { AskToFind } from "./AskToFind";
import { ProductImage } from "./ProductCards";
import { shortName } from "./productName";

/**
 * "Recently sold": what left the shop lately, greyed, each with "Ask us to find one". It shows the shop really sells, and turns a
 * missed item into a request the shop can answer (Admin > Requests). Nothing shows when nothing has sold.
 */
export function RecentlySold({ items }: { items: Product[] }) {
  if (!items.length) return null;
  return (
    <section className="sf-sold" aria-labelledby="sold-title">
      <div className="sf-section-head">
        <h2 id="sold-title" className="sh-display">
          Recently sold
        </h2>
        <span className="sf-muted sf-sold__hint">Missed one? Ask, and we'll look for another.</span>
      </div>
      <ul className="sf-sold__list">
        {items.map((p) => (
          <li key={p.id} className="sf-sold__item">
            <a href={productPath(p)} className="sf-sold__photo" aria-label={p.name}>
              <ProductImage p={p} label={false} />
              <span className="sf-sold__tag">Sold</span>
            </a>
            <span className="sf-sold__name" title={p.name}>
              {shortName(p)}
            </span>
            <AskToFind product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

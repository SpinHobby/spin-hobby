import { ScrollRow } from "../../components/layout/ScrollRow";
import { ProductCard, type CardActions } from "./ProductViews";
import { clearViewed, useRecentlyViewed } from "./recentData";

/**
 * "Recently viewed": what this shopper opened lately, from their own browser only. Shown on the homepage (a Page layout block) and
 * under a product; nothing at all until they've looked at something.
 */
export function RecentlyViewed({ a, exclude, className = "" }: { a: CardActions; exclude?: string; className?: string }) {
  const items = useRecentlyViewed(exclude);
  if (!items.length) return null;
  return (
    <section className={`sf-recent ${className}`} aria-labelledby="recent-title">
      <div className="sf-section-head">
        <h2 id="recent-title" className="sh-display">
          Recently viewed
        </h2>
        <button type="button" className="sf-link" onClick={clearViewed} title="Only kept in this browser">
          Clear
        </button>
      </div>
      <ScrollRow className="sf-pre-row" label="Recently viewed">
        {items.map((p) => (
          <ProductCard key={p.id} p={p} a={a} />
        ))}
      </ScrollRow>
    </section>
  );
}

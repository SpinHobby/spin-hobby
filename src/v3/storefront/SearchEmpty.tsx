import type { Product } from "../types";
import { SUPPORT_EMAIL } from "../links";
import { MASCOTS } from "../mascots";
import { ProductCard, type CardActions } from "./ProductViews";

const PICKS = 5;

/**
 * A search that found nothing: the spelling fix when the server has one, tips on what to type, a way to ask the shop to find
 * the item, and the week's most popular products so the page is never a dead end.
 */
export function SearchEmpty({
  query,
  didYouMean,
  popular,
  a,
  onSearch,
}: {
  query: string;
  didYouMean?: string;
  popular: Product[];
  a: CardActions;
  onSearch: (text: string) => void;
}) {
  const ask = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Can you find: ${query}`)}&body=${encodeURIComponent(
    `Hi Spin Hobby,\n\nI searched for "${query}" and couldn't find it. Can you get it?\n\n`,
  )}`;
  const picks = popular.slice(0, PICKS);
  return (
    <div className="sf-noresults">
      <div className="sf-empty">
        <img src={MASCOTS.clover} alt="" className="sf-empty__mascot" />
        <strong>No results for “{query}”</strong>
        {didYouMean && (
          <span className="sf-noresults__fix">
            Did you mean{" "}
            <button type="button" className="sf-noresults__suggest" onClick={() => onSearch(didYouMean)}>
              {didYouMean}
            </button>
            ?
          </span>
        )}
        <span>Check the spelling, try fewer words, or search by series, character, maker or the JAN code on the box.</span>
        <div className="sf-noresults__actions">
          <button type="button" className="sh-btn sh-btn--ghost" onClick={() => onSearch("")}>
            Clear search
          </button>
          <a className="sh-btn" href={ask}>
            Ask us to find it
          </a>
        </div>
      </div>
      {picks.length > 0 && (
        <section aria-labelledby="sf-noresults-popular">
          <h3 id="sf-noresults-popular" className="sf-noresults__title">
            Popular this week
          </h3>
          <div className="sf-grid">
            {picks.map((p) => (
              <ProductCard key={p.id} p={p} a={a} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

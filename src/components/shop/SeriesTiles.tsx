import { GUESSED_FOCUS, focusStyle, photo, type PhotoFrame } from "../../v3/photo";

/** A series on the home page, as the shop sends it (`topSeries`): its newest product's photo and where the face is in it. */
export interface TopSeries {
  name: string;
  count: number;
  productId: string;
  image: string;
  cutout?: boolean;
  focus?: PhotoFrame | null;
}

/**
 * "Shop by series": large photo tiles, one per series with things to buy now, the biggest first. Most shoppers come for a series,
 * and a face they know is found faster than its name in a list. Each tile is a link to the series page; `onOpen` lets the shop
 * handle it without a page load. Nothing shows with fewer than three series.
 */
export function SeriesTiles({
  series,
  hrefFor,
  onOpen,
}: {
  series: TopSeries[];
  hrefFor: (name: string) => string;
  onOpen?: (name: string) => void;
}) {
  if (series.length < 3) return null;
  // whole rows of six on a computer; a phone shows two across, so an even number
  const shown = series.slice(0, series.length >= 12 ? 12 : series.length >= 6 ? 6 : series.length - (series.length % 2));
  return (
    <section className="sf-series" aria-labelledby="series-title">
      <div className="sf-section-head">
        <h2 id="series-title" className="sh-display">
          Shop by series
        </h2>
        <span className="sf-series__hint">Pick the one you follow</span>
      </div>
      <ul className="sf-series__list">
        {shown.map((s, i) => (
          <li key={s.name}>
            <a
              className="sf-series__tile"
              href={hrefFor(s.name)}
              style={{ "--i": i } as React.CSSProperties}
              onClick={(e) => {
                if (!onOpen || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onOpen(s.name);
              }}
            >
              <img
                {...(() => {
                  const base = photo(s.image, 480, !!s.cutout, s.productId);
                  return { ...base, style: { ...base.style, ...focusStyle(s.focus ?? GUESSED_FOCUS) } };
                })()}
                alt=""
                loading="lazy"
              />
              <span className="sf-series__name">
                {s.name}
                <small>
                  {s.count} item{s.count === 1 ? "" : "s"}
                </small>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

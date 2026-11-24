import { useEffect, useRef, useState } from "react";
import { focusPhoto } from "../../v3/photo";
import { productPath } from "../../v3/storefront/data";
import { backdropOf, type BannerAd } from "./adRules";

const MASCOT = "/assets/transparent%20mascot%20chibi%20rotated.png";
/** How long one ad stays before the next comes in by itself. */
const STAY_MS = 7000;
/** How long the old pictures take to leave (keep in step with `sf-ad-out` in shop.scss). */
const LEAVE_MS = 320;

const lessMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The pictures behind one ad. `leaving` is the ad being replaced: it plays its way out, then is removed. */
function Backdrop({ ad, leaving = false }: { ad: BannerAd; leaving?: boolean }) {
  const back = backdropOf(ad);
  return (
    <div className={`sf-ads__back ${leaving ? "is-leaving" : ""}`} aria-hidden={leaving || undefined}>
      {back.kind === "photo" && <img className="sf-hero__photo" src={back.url} alt="" />}
      {back.kind === "mascot" && (
        <>
          <div className="sf-hero__sun" />
          <img className="sf-hero__mascot" src={MASCOT} alt="Spin Hobby mascot" />
        </>
      )}
      {back.kind === "products" && (
        <div className="sf-ads__tiles" data-count={back.products.length}>
          {back.products.map((p, i) => (
            <a
              key={p.id}
              className="sf-ads__tile"
              href={productPath(p)}
              title={p.name}
              tabIndex={leaving ? -1 : undefined}
              style={{ "--i": i } as React.CSSProperties}
            >
              <img {...focusPhoto(p, p.images[0], 480)} alt={p.name} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The home page banner: between one and ten ads a shopper can switch between (arrows, dots). Each ad has its own pictures behind it:
 * product photos, one photo, or the mascot. On a switch the old pictures leave, the new ones arrive one after another, then the words.
 * It moves on by itself slowly, waits while pointed at or focused, and does neither when the device asks for less motion.
 */
export function BannerAds({ ads, heading }: { ads: BannerAd[]; heading?: string }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<BannerAd | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [held, setHeld] = useState(false);
  const count = ads.length;
  const at = Math.min(index, count - 1);
  const atRef = useRef(at);
  atRef.current = at;

  const go = (to: number, byHand = false) => {
    const next = ((to % count) + count) % count;
    if (byHand) setAutoplay(false);
    if (next === atRef.current) return;
    if (!lessMotion()) setLeaving(ads[atRef.current] ?? null);
    setIndex(next);
  };
  const goRef = useRef(go);
  goRef.current = go;

  useEffect(() => {
    if (!autoplay || held || count < 2 || lessMotion()) return;
    const timer = window.setTimeout(() => goRef.current(atRef.current + 1), STAY_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, held, count, at]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const ad = ads[at];
  if (!ad) return null;
  const button = ad.button_text?.trim();

  return (
    <div
      className="sf-hero__banner sf-ads"
      data-back={backdropOf(ad).kind}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      role="group"
      aria-roledescription="carousel"
      aria-label="Announcements"
    >
      {leaving && leaving.id !== ad.id && <Backdrop key={`out-${leaving.id}`} ad={leaving} leaving />}
      <Backdrop key={ad.id} ad={ad} />
      {/* no button: the whole ad is the link, under the pictures and the controls */}
      {ad.link_url && !button && <a className="sf-ads__cover" href={ad.link_url} aria-label={ad.headline} />}
      <div className="sf-hero__copy" aria-live="polite">
        {/* the page's one h1: what the shop is, for people and search engines; the ad's headline changes */}
        {heading && <h1 className="sf-hero__eyebrow">{heading}</h1>}
        <div key={ad.id} className="sf-hero__text">
          {ad.label?.trim() && <span className="sf-ads__label">{ad.label.trim()}</span>}
          <h2 className="sh-display">{ad.headline}</h2>
          {ad.subheading && <p>{ad.subheading}</p>}
          {button && ad.link_url && (
            <a className="sh-btn sf-ads__button" href={ad.link_url}>
              {button}
            </a>
          )}
        </div>
        {count > 1 && (
          <div className="sf-ads__nav">
            <button type="button" className="sf-ads__arrow" aria-label="Previous announcement" onClick={() => go(at - 1, true)}>
              ‹
            </button>
            <div className="sf-hero__dots" role="tablist" aria-label="Announcements">
              {ads.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === at}
                  aria-label={`Announcement ${i + 1} of ${count}: ${s.headline}`}
                  className={i === at ? "is-active" : ""}
                  onClick={() => go(i, true)}
                />
              ))}
            </div>
            <button type="button" className="sf-ads__arrow" aria-label="Next announcement" onClick={() => go(at + 1, true)}>
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

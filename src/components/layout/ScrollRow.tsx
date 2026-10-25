import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "../hooks";
import "../styles/motion.scss";

/**
 * A row of cards that scrolls sideways (new pre-orders, related products). ‹ › buttons glide to the next or previous set of whole
 * cards, and each hides when there's nothing more that way; the cut-off side fades out instead of showing a scrollbar. Phones swipe
 * instead (the buttons only show where there's a mouse). `className` goes on the track that holds the cards: they sit side by side,
 * 170–190 px wide, unless it lays them out differently.
 */
export function ScrollRow({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const before = el.scrollLeft > 2;
    const after = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setMore((m) => (m.before === before && m.after === after ? m : { before, after }));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [update]);
  useEffect(update, [children, update]); // cards added or removed

  /** Move by as many whole cards as fit, so each click shows a fresh set that starts at a card's edge. */
  const step = (direction: 1 | -1) => {
    const el = track.current;
    const cards = el ? (Array.from(el.children) as HTMLElement[]) : [];
    if (!el || !cards.length) return;
    const stride = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;
    const perView = Math.max(1, Math.floor((el.clientWidth + (stride - cards[0].offsetWidth)) / stride));
    const at = Math.round(el.scrollLeft / stride);
    el.scrollTo({ left: Math.max(0, (at + direction * perView) * stride), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  return (
    <div className="ui-scrollrow" data-before={more.before || undefined} data-after={more.after || undefined}>
      <div ref={track} className={`ui-scrollrow__track ${className ?? ""}`} role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <button
        type="button"
        className="ui-scrollrow__btn ui-scrollrow__btn--prev"
        onClick={() => step(-1)}
        aria-label={`Previous ${label.toLowerCase()}`}
        tabIndex={more.before ? 0 : -1}
        aria-hidden={!more.before}
      >
        ‹
      </button>
      <button
        type="button"
        className="ui-scrollrow__btn ui-scrollrow__btn--next"
        onClick={() => step(1)}
        aria-label={`More ${label.toLowerCase()}`}
        tabIndex={more.after ? 0 : -1}
        aria-hidden={!more.after}
      >
        ›
      </button>
    </div>
  );
}

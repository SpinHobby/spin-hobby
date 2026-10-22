import type { Product } from "../types";
import { FRONT_PAGE_SLOTS } from "./catalog";

/** "#3": where a featured product sits on the homepage. Grey past the last slot, a dash when shoppers can't see it at all. */
export function FrontRank({ p }: { p: Product }) {
  if (!p.isFeatured) return null;
  if (p.frontPage == null) return <span className="ad-rank ad-rank--off" title="Featured, but hidden or unavailable, so it takes no place on the homepage">—</span>;
  const shown = p.frontPage <= FRONT_PAGE_SLOTS;
  return (
    <span className={`ad-rank ${shown ? "" : "ad-rank--off"}`}
      title={shown ? `Position ${p.frontPage} on the homepage` : `Featured, but the homepage only shows the first ${FRONT_PAGE_SLOTS}. It moves up as products above it are removed or moved down.`}>
      #{p.frontPage}
    </span>
  );
}

/** Move a featured product up or down the homepage order. */
export function MoveArrows({ name, first, last, busy, onMove }: { name: string; first: boolean; last: boolean; busy: boolean; onMove: (direction: -1 | 1) => void }) {
  return (
    <span className="ad-arrows" onClick={(e) => e.stopPropagation()}>
      <button type="button" disabled={first || busy} aria-label={`Move ${name} up the homepage`} onClick={() => onMove(-1)}>▲</button>
      <button type="button" disabled={last || busy} aria-label={`Move ${name} down the homepage`} onClick={() => onMove(1)}>▼</button>
    </span>
  );
}

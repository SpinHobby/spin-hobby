import type { EventInfo } from "./data";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null;
}

/** "2026-04-23", "2026-04-26" → "April 23–26, 2026"; one day → "April 4, 2026". */
export function eventDateLabel(start: string, end?: string) {
  const s = parts(start);
  if (!s) return start;
  const e = end && end !== start ? parts(end) : null;
  if (!e) return `${MONTHS[s.m]} ${s.d}, ${s.y}`;
  if (s.y === e.y && s.m === e.m) return `${MONTHS[s.m]} ${s.d}–${e.d}, ${s.y}`;
  if (s.y === e.y) return `${MONTHS[s.m]} ${s.d} – ${MONTHS[e.m]} ${e.d}, ${s.y}`;
  return `${MONTHS[s.m]} ${s.d}, ${s.y} – ${MONTHS[e.m]} ${e.d}, ${e.y}`;
}

/** Short form for tight spaces: "Apr 23–26". */
export function eventDateShort(start: string, end?: string) {
  const s = parts(start);
  if (!s) return start;
  const mon = (i: number) => MONTHS[i].slice(0, 3);
  const e = end && end !== start ? parts(end) : null;
  if (!e) return `${mon(s.m)} ${s.d}`;
  return s.m === e.m ? `${mon(s.m)} ${s.d}–${e.d}` : `${mon(s.m)} ${s.d} – ${mon(e.m)} ${e.d}`;
}

/** Today in the visitor's timezone as YYYY-MM-DD (en-CA formats that way). */
export const todayISO = () => new Date().toLocaleDateString("en-CA");

/** An event is over once its last day is before today. */
export const isPastEvent = (e: Pick<EventInfo, "start" | "end">, today = todayISO()) => (e.end ?? e.start) < today;

/** "Genesis Centre · Calgary, AB", whichever parts exist. */
export const eventPlace = (e: Pick<EventInfo, "venue" | "city">) => [e.venue, e.city].filter(Boolean).join(" · ");

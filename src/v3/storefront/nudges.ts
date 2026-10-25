// Small, honest nudges that help shoppers decide: how far they are from free shipping, and how long a pre-order stays open.
// Everything here comes from real data (the cart, the store's settings, the product's order-by date). Never invent urgency
// (fake timers, "12 people are viewing this"): shoppers notice, and it costs the shop their trust.
import { price, storeFormat, type Currency } from "../format";

/** Cents still needed for free shipping (0 once reached, or when the store has no threshold). */
export function shippingGap(subtotalCents: number) {
  const threshold = storeFormat.freeShippingThresholdCents;
  return threshold ? Math.max(threshold - subtotalCents, 0) : 0;
}

/** The toast after adding to the cart: says how close the cart now is to free shipping, or that it just got there. */
export function addedMessage(base: string, beforeCents: number, afterCents: number, currency: Currency) {
  const gap = shippingGap(afterCents);
  if (gap > 0) return `${base} · ${price(gap, currency)} away from free shipping`;
  if (shippingGap(beforeCents) > 0) return `${base} · you've unlocked free shipping 🎉`;
  return base;
}

/** Whole days left to pre-order (0 = the last day), or null without a date or once it has passed. */
export function daysToOrderBy(orderByDate: string | null | undefined, now = new Date()) {
  if (!orderByDate) return null;
  const end = new Date(`${orderByDate.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  const ms = end.getTime() - now.getTime();
  if (ms < 0) return null;
  return Math.floor(ms / 86_400_000);
}

/** "Last day to order", "Closes in 3 days": only when a pre-order closes within `within` days. */
export function closingLabel(orderByDate: string | null | undefined, within = 7) {
  const d = daysToOrderBy(orderByDate);
  if (d === null || d > within) return null;
  return d === 0 ? "Last day to order" : `Closes in ${d} day${d === 1 ? "" : "s"}`;
}

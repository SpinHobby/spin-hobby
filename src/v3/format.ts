import type { Product, ProductStatus } from "./types";

export type Currency = "CAD" | "USD";

/** Store-wide display settings. Defaults mirror store_settings; replaced by /checkout/config on load. */
export const storeFormat = { fxCadUsd: 0.73, handlingDaysMin: 2, handlingDaysMax: 3, freeShippingThresholdCents: 7500 };

export function handlingLabel() {
  const { handlingDaysMin: a, handlingDaysMax: b } = storeFormat;
  return a === b ? `${a} day${a === 1 ? "" : "s"}` : `${a}–${b} days`;
}

export function money(cents: number | null | undefined, currency: Currency = "CAD", fx = storeFormat.fxCadUsd) {
  const value = (cents ?? 0) / 100;
  const converted = currency === "USD" ? value * fx : value;
  return (currency === "USD" ? "US$" : "$") + converted.toFixed(2);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2027-03" | "2027-03-01" → "Mar 2027" */
export function monthLabel(value: string | null | undefined) {
  if (!value) return "TBA";
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

/** ISO timestamp → "Oct 8, 2026", in the viewer's own time zone (the day something was added, for the admin list). */
export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

/** ISO date → "Oct 20" */
export function dayLabel(value: string | null | undefined) {
  if (!value) return "TBA";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`;
}

export function relativeAge(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function shortDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export function normalizeStatus(status: Product["status"]): ProductStatus {
  if (status === "in" || status === "low" || status === "pre" || status === "out") return status;
  return "out"; // "closed" pre-orders and anything unknown can't be bought
}

export const STATUS_META: Record<ProductStatus, { badge: string; color: string }> = {
  in: { badge: "IN STOCK", color: "var(--teal)" },
  low: { badge: "LOW STOCK", color: "var(--red)" },
  pre: { badge: "PRE-ORDER", color: "var(--blue)" },
  out: { badge: "SOLD OUT", color: "var(--muted)" },
};

// Copy rules from server/src/lib/status.ts in the handoff.
export function statusLabel(p: Product) {
  const s = normalizeStatus(p.status);
  const n = p.stockCount;
  switch (s) {
    case "in": return n ? `${n} in stock · ships in ${handlingLabel()}` : `In stock · ships in ${handlingLabel()}`;
    case "low": return `Only ${n ?? "a few"} left`;
    case "pre": return `Release ${monthLabel(p.releaseMonth)} · order by ${dayLabel(p.orderByDate)}`;
    case "out": return p.status === "closed" ? "Pre-order closed" : "Sold out · restock alerts available";
  }
}

export function statusShort(p: Product) {
  const s = normalizeStatus(p.status);
  switch (s) {
    case "in": return "In stock";
    case "low": return `Only ${p.stockCount ?? "a few"} left`;
    case "pre": return `Pre-order · ${monthLabel(p.releaseMonth)}`;
    case "out": return "Sold out";
  }
}

export function discountPct(p: Product) {
  if (!p.compareAtCents || p.compareAtCents <= p.priceCents) return 0;
  return Math.round((1 - p.priceCents / p.compareAtCents) * 100);
}

/** What to call someone in greetings: their first name, else the start of their email. */
export function greetingName(user: { firstName?: string | null; email: string } | null | undefined) {
  if (!user) return "";
  if (user.firstName) return user.firstName;
  const local = user.email.split("@")[0].split(/[._+-]/)[0] || user.email.split("@")[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

export function initials(email: string | null | undefined) {
  if (!email) return "SH";
  const name = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim().split(/\s+/);
  return ((name[0]?.[0] ?? "S") + (name[1]?.[0] ?? name[0]?.[1] ?? "H")).toUpperCase();
}

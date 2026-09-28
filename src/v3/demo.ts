// Placeholder data from the design handoff prototypes. Only used when DEMO_ALLOWED
// (local dev or VITE_DEMO_DATA=true) AND the live catalog is empty — never shown to
// customers in production.
import type { Dashboard, HeroSlide, Order, Product, StoreEvent } from "./types";

type Raw = [string, string, number, Product["status"], number | null, string | null, string | null, number, number];

const RAW: Raw[] = [
  ["Character Name 1/7 Scale Figure", "Scale Figures", 229, "pre", null, "2027-03", "2026-10-20", 0, 1],
  ["Character Name 1/6 Scale Figure — Bunny Ver.", "Scale Figures", 289, "pre", null, "2027-05", "2026-11-04", 0, 4],
  ["Character Name 1/7 Scale Figure — Summer", "Scale Figures", 199, "in", 3, null, null, 15, 9],
  ["Character Name Prize Figure", "Prize Figures", 39, "in", 12, null, null, 0, 2],
  ["Character Name Prize Figure — Noodle Stopper", "Prize Figures", 34, "in", 20, null, null, 0, 11],
  ["Character Name Prize Figure — Luminasta", "Prize Figures", 42, "pre", null, "2027-01", "2026-10-14", 0, 7],
  ["Character Name Chibi Figure", "Chibi Figures", 64, "low", 2, null, null, 0, 3],
  ["Character Name Chibi Figure — Winter", "Chibi Figures", 68, "pre", null, "2027-02", "2026-10-28", 0, 12],
  ["Plastic Model Kit — HG 1/144", "Model Kits", 58, "in", 5, null, null, 10, 14],
  ["Plastic Model Kit — MG 1/100", "Model Kits", 96, "pre", null, "2027-04", "2026-11-12", 0, 16],
  ["Mascot Plushie — 20cm", "Plushies", 32, "in", 8, null, null, 0, 5],
  ["Big Plushie Cushion — 40cm", "Plushies", 55, "pre", null, "2026-12", "2026-10-10", 0, 8],
  ["Acrylic Stand — Key Art Ver.", "Badges & Acrylics", 24, "in", null, null, null, 0, 13],
  ["Can Badge Set (6 pcs)", "Badges & Acrylics", 18, "out", 0, null, null, 0, 6],
  ["Rubber Keychain — Random Blind", "Keychains", 9, "in", 30, null, null, 0, 17],
  ["Acrylic Keychain — Chibi Ver.", "Keychains", 14, "low", 4, null, null, 0, 18],
  ["Trading Card Booster Box", "Trading Cards", 89, "low", 3, null, null, 0, 10],
  ["Trading Card Starter Deck", "Trading Cards", 19, "in", 15, null, null, 0, 19],
  ["Blind Box — Vol. 1 (random)", "Blind Boxes", 14, "in", 40, null, null, 0, 15],
  ["Blind Box — Full Set of 8", "Blind Boxes", 104, "pre", null, "2027-01", "2026-10-18", 0, 20],
  ["Doujin Illustration Book", "Books & Doujin", 28, "in", 6, null, null, 0, 21],
  ["Official Art Book Vol. 2", "Books & Doujin", 45, "out", 0, null, null, 0, 22],
  ["Original Soundtrack CD", "Video & Music", 38, "in", 7, null, null, 20, 23],
  ["B2 Wall Tapestry", "Apparel & Posters", 35, "pre", null, "2026-12", "2026-10-25", 0, 24],
];

export const DEMO_PRODUCTS: Product[] = RAW.map(([name, category, dollars, status, stockCount, releaseMonth, orderByDate, discount, rank], i) => {
  const compareAtCents = discount ? dollars * 100 : null;
  const priceCents = discount ? Math.round(dollars * (100 - discount)) : dollars * 100;
  return {
    id: `DEMO_ITEM_${i + 1}`,
    variationId: `DEMO_VAR_${i + 1}`,
    name, category, status, stockCount, releaseMonth, orderByDate, rank,
    series: i % 5 === 3 ? "Circle Name" : "Series Title",
    character: null,
    images: [],
    priceCents, compareAtCents,
    currency: "CAD",
    maxPerCustomer: status === "pre" ? 2 : null,
    createdAt: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
    janCode: "45" + String(80000000000 + i * 7919).slice(0, 11),
    availability: status === "pre" ? "preorder" : "auto",
    isFeatured: [0, 3, 6].includes(i),
    alertsWaiting: status === "out" ? 17 - i % 5 : status === "low" ? 5 : 0,
  };
});

export const DEFAULT_SLIDES: HeroSlide[] = [
  ["New arrivals every week", "Fresh figures, badges and plushies added regularly."],
  ["Free shipping on orders $75+", "Across Canada & the US, tracked."],
  ["Join our Discord community", "Restock alerts and exclusive drops first."],
].map(([headline, subheading], i) => ({ id: `default-${i}`, headline, subheading, image_url: null, link_url: null, sort_order: i, is_visible: true }));

export const DEFAULT_EVENTS: StoreEvent[] = ["Edmonton Collector Con", "Calgary Expo", "Otafest", "Animethon", "Edmonton Expo"]
  .map((name, i) => ({ id: `default-${i}`, name, city: null, start_date: null, end_date: null, booth_info: null, is_visible: true, sort_order: i }));

const NAMES = ["A. Nguyen", "M. Tremblay", "K. Sato", "J. Singh", "R. Chen", "L. Martin", "D. Kim", "S. Roy", "T. Wong", "P. Dubois"];
const CITIES = [["Calgary", "AB"], ["Edmonton", "AB"], ["Vancouver", "BC"], ["Toronto", "ON"], ["Seattle", "WA"]];
const STATUSES: Order["status"][] = ["paid", "paid", "paid", "preorder_reserved", "paid", "shipped", "shipped", "preorder_reserved", "refunded", "shipped"];

export const DEMO_ORDERS: Order[] = NAMES.map((name, i) => {
  const picks = [DEMO_PRODUCTS[(i * 3) % 12], ...(i % 3 === 0 ? [DEMO_PRODUCTS[(i + 4) % 12]] : [])];
  const items = picks.map((p, k) => ({
    id: i * 10 + k, square_item_id: p.id, square_variation_id: p.variationId, name: p.name, image_url: null,
    unit_price_cents: p.priceCents, quantity: k ? 2 : 1, is_preorder: p.status === "pre",
  }));
  const subtotal = items.reduce((sum, it) => sum + it.unit_price_cents * it.quantity, 0);
  const shipping = subtotal >= 7500 ? 0 : 899;
  const [first, last] = name.split(" ");
  const [city, province] = CITIES[i % 5];
  const created = new Date(Date.now() - (i === 0 ? 2 * 3_600_000 : i * 86_400_000));
  return {
    id: 1052 - i, status: STATUSES[i], provider: i % 4 === 2 ? "square" : "paypal",
    subtotal_cents: subtotal, shipping_cents: shipping, tax_cents: 0, total_cents: subtotal + shipping,
    shipping_method: "standard", tracking_number: null, carrier: null, shipped_at: null,
    billing_email: name.toLowerCase().replace(/[^a-z]/g, "") + "@example.com",
    shipping_address: { firstName: first, lastName: last, address1: `${100 + i * 12} Main St`, city, province, postalCode: "T5J 0N3", country: province === "WA" ? "US" : "CA" },
    created_at: created.toISOString(), order_items: items,
  };
});

export function demoDashboard(products: Product[], orders: Order[]): Dashboard {
  const toShip = orders.filter((o) => o.status === "paid");
  const low = products.filter((p) => p.status === "low" || p.status === "out");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    success: true,
    salesTodayCents: orders.filter((o) => new Date(o.created_at) >= today).reduce((s, o) => s + o.total_cents, 0),
    toShip: toShip.length,
    oldestToShipDays: toShip.length ? Math.floor((Date.now() - Math.min(...toShip.map((o) => +new Date(o.created_at)))) / 86_400_000) : 0,
    openPreorders: products.filter((p) => p.status === "pre").length,
    reservedUnits: 50,
    lowStock: low.length,
    alertsWaiting: products.reduce((s, p) => s + (p.alertsWaiting ?? 0), 0),
    toShipList: toShip,
    lowStockList: low.map((p) => ({ id: p.id, name: p.name, variation_id: p.variationId, stock_count: p.stockCount, status: p.status, order_by_date: null })),
    closingPreorders: products.filter((p) => p.status === "pre").sort((a, b) => String(a.orderByDate).localeCompare(String(b.orderByDate)))
      .map((p) => ({ id: p.id, name: p.name, variation_id: p.variationId, stock_count: null, status: p.status, order_by_date: p.orderByDate })),
  };
}

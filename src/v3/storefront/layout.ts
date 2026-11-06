/**
 * The storefront layout the owner picks in Admin > Homepage > Page layout. The API always sends it complete (defaults filled in), and
 * the server checks every value (spin-hobby-server src/modules/admin/settings/layout.ts); keep the two in step.
 */
export type LayoutSection = "hero" | "trust" | "preorders" | "lists" | "recent" | "shop" | "about" | "events";
export type ProductView = "grid" | "compact" | "list";

export interface StorefrontLayout {
  /** Homepage blocks in order; a hidden one isn't shown. The product grid ("shop") is never hidden. */
  sections: { id: LayoutSection; visible: boolean }[];
  /** How products are listed until a shopper picks a view themselves. */
  productView: ProductView;
  /** Product cards per row on a wide screen ("auto": as many as fit). Phones always show two. */
  columns: "auto" | 3 | 4 | 5 | 6;
  /** Square photos, or taller than wide (3:4). */
  imageShape: "square" | "portrait";
  /** Where categories and filters sit on a computer; "hidden" puts them behind the Filters button, as on a phone. */
  sidebar: "left" | "right" | "hidden";
  /** How wide the page gets on a big screen. */
  width: "standard" | "wide" | "full";
  /** The thin bar at the very top (free shipping, account links). */
  announcementBar: boolean;
  /** The header logo: the original badge picture, or the clean wordmark (ShopLogo.tsx). */
  logo: "badge" | "wordmark";
}

export const DEFAULT_LAYOUT: StorefrontLayout = {
  sections: (["hero", "trust", "preorders", "lists", "recent", "shop", "about", "events"] as const).map((id) => ({ id, visible: true })),
  productView: "grid",
  columns: "auto",
  imageShape: "square",
  sidebar: "left",
  width: "standard",
  announcementBar: true,
  logo: "badge",
};

/** What each block is called in the admin. */
export const SECTION_LABELS: Record<LayoutSection, { name: string; hint: string }> = {
  hero: { name: "Hero banner", hint: "The big slides at the top (Hero slides below)" },
  trust: { name: "Why shop with us", hint: "Four short reasons to trust the shop" },
  preorders: { name: "New pre-orders", hint: "A scrolling row of the newest pre-orders" },
  lists: { name: "Weekly ranking + Just arrived", hint: "Two side-by-side lists" },
  recent: { name: "Recently viewed", hint: "What this shopper looked at lately (only shows once they have)" },
  shop: { name: "Product grid", hint: "The catalog itself; it can move but never hides" },
  about: { name: "About the shop", hint: "Shop by type and popular series links" },
  events: { name: "Meet us at the con", hint: "Upcoming events; hiding it hides it on every page" },
};

/** The attributes that switch the storefront's layout CSS (storefront.scss, "Page layout"). */
export function layoutAttrs(layout: StorefrontLayout) {
  return {
    "data-columns": String(layout.columns),
    "data-shape": layout.imageShape,
    "data-sidebar": layout.sidebar,
    "data-width": layout.width,
  };
}

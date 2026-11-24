import type { Product } from "../../v3/types";

/** How many product photos sit behind one ad. Keep in step with spin-hobby-server src/modules/admin/homepage/banner.ts. */
export const BACKDROP_PHOTOS = 5;
/** The most ads the banner holds. */
export const MAX_ADS = 10;
/** The most products an admin picks for one ad. */
export const MAX_PICKED = 12;

export type AdBackdrop = "products" | "photo" | "chosen";

/** One ad of the home page banner, as the shop sends it (snake_case: the hero_slides table). */
export interface BannerAd {
  id: string;
  headline: string;
  subheading: string | null;
  image_url: string | null;
  link_url: string | null;
  /** The small tag above the headline ("Pre-orders"). */
  label?: string | null;
  button_text?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  backdrop?: AdBackdrop;
  product_ids?: string[];
  /** The products whose photos show behind the ad (sent by the shop for the home page). */
  products?: Product[];
}

/** What shows behind an ad: its own photo, product photos, or the mascot when the shop has nothing to show. */
export function backdropOf(ad: BannerAd): { kind: "photo"; url: string } | { kind: "products"; products: Product[] } | { kind: "mascot" } {
  // a shop older than the `backdrop` field: a slide with a photo shows it
  if (ad.image_url && (ad.backdrop ?? "photo") === "photo") return { kind: "photo", url: ad.image_url };
  const products = (ad.products ?? []).filter((p) => p.images.length > 0).slice(0, BACKDROP_PHOTOS);
  return products.length ? { kind: "products", products } : { kind: "mascot" };
}

/** Whether an ad shows at `now`: inside its dates (the Visible switch is separate). */
export function adTiming(ad: Pick<BannerAd, "starts_at" | "ends_at">, now = new Date()): "live" | "waiting" | "ended" {
  if (ad.ends_at && new Date(ad.ends_at) <= now) return "ended";
  if (ad.starts_at && new Date(ad.starts_at) > now) return "waiting";
  return "live";
}

/**
 * The products behind each ad, worked out the way the shop does for the home page (banner.ts `dealBackdrops`), for the Admin's
 * preview: picked products in the order picked; the others share the recent products, each taking the next few.
 */
export function dealBackdrops(ads: BannerAd[], all: Product[], pool: Product[]): Product[][] {
  const byId = new Map(all.map((p) => [p.id, p]));
  let next = 0;
  return ads.map((ad) => {
    if ((ad.backdrop ?? (ad.image_url ? "photo" : "products")) === "photo") return [];
    const picked =
      ad.backdrop === "chosen" ? (ad.product_ids ?? []).flatMap((id) => byId.get(id) ?? []).filter((p) => p.images.length) : [];
    if (picked.length) return picked;
    if (!pool.length) return [];
    const dealt: Product[] = [];
    for (let i = 0; i < Math.min(BACKDROP_PHOTOS, pool.length); i += 1) dealt.push(pool[(next + i) % pool.length]);
    next += dealt.length;
    return dealt;
  });
}

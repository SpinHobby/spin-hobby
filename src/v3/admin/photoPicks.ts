/** The draft's photos; the maker's are `official`, `official2`, `official3`... (other angles and backgrounds of the same product). */
export type PhotoKey = "studio" | "background" | "original" | "cropped" | "official" | `official${number}`;
export interface OfferedPhoto {
  key: PhotoKey;
  url: string;
  /** A person edited it in the photo editor. */ edited?: boolean;
}
export interface PhotoPick {
  key: PhotoKey;
  square: boolean;
  ebay: boolean;
}

/**
 * The photos a draft starts with picked: the transparent cut-out for the website when there is one (it follows the shop background), else the
 * cleaned photo; nothing for eBay.
 */
export function defaultPicks(offered: OfferedPhoto[]): PhotoPick[] {
  const main: PhotoKey = offered.some((p) => p.key === "background") ? "background" : "studio";
  const ordered = [...offered].sort((a, b) => (a.key === main ? -1 : b.key === main ? 1 : 0));
  return ordered.map((p) => ({ key: p.key, square: p.key === main, ebay: false }));
}

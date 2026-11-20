/** The draft's photos; the maker's are `official`, `official2`, `official3`... (other angles and backgrounds of the same product). */
export type PhotoKey = "clean" | "studio" | "background" | "original" | "cropped" | "official" | `official${number}`;
export interface OfferedPhoto {
  key: PhotoKey;
  url: string;
  /** A person edited it in the photo editor. */ edited?: boolean;
}
export interface PhotoPick {
  key: PhotoKey;
  /** Goes to Square (the till); on the website too unless `website` is false. */
  square: boolean;
  /** A Square photo also shown on the website (false: kept in Square only, e.g. for eBay later). */
  website: boolean;
  ebay: boolean;
}

/**
 * The photos a draft starts with picked: the clean product photo when there is one (the admin asked for it), else the transparent cut-out for the
 * website (it follows the shop background), else the cleaned photo; nothing for eBay.
 */
export function defaultPicks(offered: OfferedPhoto[]): PhotoPick[] {
  const has = (key: PhotoKey) => offered.some((p) => p.key === key);
  const main: PhotoKey = has("clean") ? "clean" : has("background") ? "background" : "studio";
  const ordered = [...offered].sort((a, b) => (a.key === main ? -1 : b.key === main ? 1 : 0));
  return ordered.map((p) => ({ key: p.key, square: p.key === main, website: p.key === main, ebay: false }));
}

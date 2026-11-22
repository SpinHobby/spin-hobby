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
 * The photos a draft starts with picked (2026-11-20): every photo goes to Square and eBay, and only the main one shows on the website. The main one is
 * the clean product photo when there is one (the admin asked for it), else the transparent cut-out (it follows the shop background), else the
 * cleaned photo. The maker's official photos start unticked: they are used only when someone ticks them.
 */
export function defaultPicks(offered: OfferedPhoto[]): PhotoPick[] {
  const has = (key: PhotoKey) => offered.some((p) => p.key === key);
  const main: PhotoKey = has("clean") ? "clean" : has("background") ? "background" : "studio";
  const ordered = [...offered].sort((a, b) => (a.key === main ? -1 : b.key === main ? 1 : 0));
  // the maker's photos belong to the maker: never used without a click
  return ordered.map((p) => {
    const ours = !p.key.startsWith("official");
    return { key: p.key, square: ours, website: p.key === main, ebay: ours };
  });
}

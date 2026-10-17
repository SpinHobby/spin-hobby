export type PhotoKey = "studio" | "background" | "original" | "cropped" | "official";
export interface OfferedPhoto { key: PhotoKey; url: string }
export interface PhotoPick { key: PhotoKey; square: boolean; ebay: boolean }

/** The photos a draft starts with picked: the cleaned photo for the website (on the default background when the shop has one); nothing for eBay. */
export function defaultPicks(offered: OfferedPhoto[], defaultBackground: string | null): PhotoPick[] {
  const main: PhotoKey = defaultBackground && offered.some((p) => p.key === "background") ? "background" : "studio";
  const ordered = [...offered].sort((a, b) => (a.key === main ? -1 : b.key === main ? 1 : 0));
  return ordered.map((p) => ({ key: p.key, square: p.key === main, ebay: false }));
}

/**
 * The storefront looks the owner picks in Admin > Homepage > Theme. Colours live in src/components/styles/themes.scss; the server
 * keeps the same ids (src/modules/admin/settings/themes.ts) and refuses others.
 */
export const THEMES = [
  { id: "classic", name: "Classic", description: "Navy and gold, the Spin Hobby look." },
  { id: "water-glass", name: "Water Glass", description: "Frosted see-through panels over cool aqua water light." },
  { id: "sakura", name: "Sakura", description: "Soft cherry-blossom pinks with deep rose." },
  { id: "matcha", name: "Matcha", description: "Calm green tea and warm cream." },
  { id: "manga", name: "Manga", description: "Black ink, halftone dots and comic-panel outlines." },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "classic";
export const isThemeId = (value: unknown): value is ThemeId => THEMES.some((t) => t.id === value);
export const themeName = (id: string) => THEMES.find((t) => t.id === id)?.name ?? "Classic";

/** The theme last seen on this device, so a return visit doesn't flash the classic colours first. */
export const SEEN_KEY = "spinhobby-theme";
/** A theme being tried with ?theme=<id> (Admin's "Preview"), for this tab only, until "Stop previewing". */
export const PREVIEW_KEY = "spinhobby-theme-preview";

export function readStored(storage: () => Storage, key: string): ThemeId | null {
  try {
    const v = storage().getItem(key);
    return isThemeId(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeStored(storage: () => Storage, key: string, value: ThemeId | null) {
  try {
    if (value) storage().setItem(key, value);
    else storage().removeItem(key);
  } catch {
    /* private window: nothing kept */
  }
}

import { apiFile } from "../../lib/api";

/** About what each AI step costs (what the server reports afterwards is the real figure). */
export const COST_CENTS = { stickers: 1.4, text: 1.9, both: 2.1 } as const;

export interface PolishUsage { inputTokens: number; outputTokens: number; costUsd: number; monthSpendUsd: number; monthStopUsd: number }
export interface PolishReport { backgroundRemoved: boolean; stickersFilled: number; usage?: PolishUsage }
export interface StickerBox { x: number; y: number; width: number; height: number }

/**
 * Tidies a photo on the server: shop price stickers painted over and/or a green backdrop removed (a transparent
 * PNG comes back). The backdrop step is free. Painting over stickers uses the AI to find them, unless their boxes
 * are already known (from the combined title + sticker request), in which case it is free too.
 */
export async function polishPhoto(photo: Blob, options: { removeBackground: boolean; removeStickers: boolean; stickers?: StickerBox[] }) {
  const form = new FormData();
  form.append("photo", photo, "photo.png");
  form.append("removeBackground", String(options.removeBackground));
  form.append("removeStickers", String(options.removeStickers));
  if (options.stickers) form.append("stickers", JSON.stringify(options.stickers));
  const { blob, headers } = await apiFile("/cashier/polish", { method: "POST", body: form });
  let report: PolishReport = { backgroundRemoved: false, stickersFilled: 0 };
  try { report = JSON.parse(headers.get("x-polish") ?? "{}") as PolishReport; } catch { /* no report */ }
  return { blob, report };
}

/** "about 1.4¢" for the button, in cents, or "free". */
export const costLabel = (cents: number) => (cents === 0 ? "free" : `about ${cents.toFixed(1)}¢`);

/** What a chosen combination of steps costs, using the cheapest way of asking (title + stickers together in one request). */
export function estimateCents(options: { removeStickers: boolean; text: boolean }) {
  if (options.removeStickers && options.text) return COST_CENTS.both;
  if (options.removeStickers) return COST_CENTS.stickers;
  if (options.text) return COST_CENTS.text;
  return 0;
}

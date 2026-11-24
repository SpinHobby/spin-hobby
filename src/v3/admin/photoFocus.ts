import { api } from "../../lib/api";
import type { PhotoFrame } from "../photo";

/** A product's face points, by photo address (photo.ts "Face focus"). */
export type FocusMap = Record<string, PhotoFrame>;

const base = (productId: string) => `/admin/products/${encodeURIComponent(productId)}/photo-focus`;

/** The face points an admin has set on this product's photos. */
export const loadFocus = (productId: string) => api<{ focus: FocusMap }>(base(productId)).then((r) => r.focus);

/** Saves where the face is in one photo; resolves to all of the product's points. */
export const saveFocus = (productId: string, url: string, focus: PhotoFrame) =>
  api<{ focus: FocusMap }>(base(productId), { method: "PUT", body: JSON.stringify({ url, ...focus }) }).then((r) => r.focus);

/** Forgets one photo's point (the shop guesses again); resolves to the product's remaining points. */
export const clearFocus = (productId: string, url: string) =>
  api<{ focus: FocusMap }>(`${base(productId)}?url=${encodeURIComponent(url)}`, { method: "DELETE" }).then((r) => r.focus);

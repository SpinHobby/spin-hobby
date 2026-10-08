import { api } from "../../lib/api";
import type { Product } from "../types";

/** True for a product kept in our own database (hand-entered), false for one that comes from Square. */
export const isLocal = (p: Product) => p.source === "manual";

/** Is the product on the website right now? */
export const isShown = (p: Product) => p.state !== "hidden" && p.state !== "retired" && p.isVisible !== false;

/** Products added with "Add product" have ids starting `manual-`; those are the ones that can move into Square (the server enforces the same rule). */
export const canMoveToSquare = (p: Product) => isLocal(p) && p.id.startsWith("manual-") && p.state !== "retired";

export interface MoveResult { id: string; name: string; photosMoved: number; photosRemoved: number; alreadyMoved: boolean }

/** Show or hide request shared by the list and the drawer. */
export async function setVisible(id: string, visible: boolean) {
  await api(`/admin/products/${encodeURIComponent(id)}/visibility`, { method: "PUT", body: JSON.stringify({ visible }) });
}

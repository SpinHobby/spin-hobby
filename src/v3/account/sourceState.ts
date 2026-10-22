import { api } from "../../lib/api";
import type { Product } from "../types";

/** True for a product kept in our own database (hand-entered), false for one that comes from Square. */
export const isLocal = (p: Product) => p.source === "manual";

/** Is the product on the website right now? */
export const isShown = (p: Product) => p.state !== "hidden" && p.state !== "retired" && p.isVisible !== false;

/** Any product kept in our own database that has not already moved can be moved into Square (the server checks the same). */
export const canMoveToSquare = (p: Product) => isLocal(p) && p.state !== "retired";

export interface MoveResult { id: string; name: string; photosMoved: number; photosRemoved: number; alreadyMoved: boolean }

/** Show or hide request shared by the list and the drawer. */
export async function setVisible(id: string, visible: boolean) {
  await api(`/admin/products/${encodeURIComponent(id)}/visibility`, { method: "PUT", body: JSON.stringify({ visible }) });
}

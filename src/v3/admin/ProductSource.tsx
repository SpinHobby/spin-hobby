import { useState } from "react";
import { api } from "../../lib/api";
import { useEscape } from "../hooks";
import type { Product } from "../types";
import { canMoveToSquare, isLocal, isShown, type MoveResult } from "./sourceState";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

const PHOTO_TEXT = {
  square: "Photos on Square",
  storage: "Photos in our storage",
  external: "Photos elsewhere",
  none: "No photo",
} as const;

/** Where the product lives (Square or our database) and where its photos are kept, with a "Move to Square" button for local ones. */
export function SourceBadge({ p, canMove, onMove }: { p: Product; canMove: boolean; onMove: () => void }) {
  const local = isLocal(p);
  return (
    <span className="ad-src-cell">
      <span className={`ad-src ${local ? "ad-src--local" : "ad-src--square"}`} title={local ? "Kept in our own database" : "Comes from Square"}>
        {local ? "Our database" : "Square"}
      </span>
      <span className="ad-src__photos">{PHOTO_TEXT[p.photoSource ?? (p.images.length ? "external" : "none")]}</span>
      {canMoveToSquare(p) && (
        <button type="button" className="ad-src__move" disabled={!canMove} aria-label={`Move ${p.name} to Square`}
          title={canMove ? "Create this product in Square and free the space its photos use here" : "Only the owner can move products into Square"}
          onClick={(e) => { e.stopPropagation(); onMove(); }}>
          Move to Square →
        </button>
      )}
    </span>
  );
}

/** Shows or hides a product on the website. Square products are hidden in Square as well. */
export function VisibilityToggle({ p, busy, onToggle }: { p: Product; busy: boolean; onToggle: () => void }) {
  const retired = p.state === "retired";
  const on = isShown(p);
  return (
    <button type="button" role="switch" aria-checked={on} className={`sh-toggle ${on ? "is-on" : ""}`} disabled={retired || busy}
      aria-label={`${on ? "Hide" : "Show"} ${p.name} on the website`}
      title={retired ? "Retired products can't be shown" : on ? "Shown on the website. Click to hide" : "Hidden from the website. Click to show"}
      onClick={(e) => { e.stopPropagation(); onToggle(); }} />
  );
}

/** Asks before moving a product into Square, and says exactly what will happen. */
export function MoveToSquareDialog({ p, onClose, onMoved, flash }: { p: Product; onClose: () => void; onMoved: (result: MoveResult) => void; flash: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEscape(() => { if (!busy) onClose(); });
  const photos = p.images.length;

  const move = async () => {
    setBusy(true); setError("");
    try {
      const res = await api<MoveResult & { success: true }>(`/admin/products/${encodeURIComponent(p.id)}/transfer-to-square`, { method: "POST" });
      flash(res.alreadyMoved ? "That product was already in Square" : `Moved to Square${res.photosRemoved ? `, ${res.photosRemoved} photo${res.photosRemoved === 1 ? "" : "s"} removed from our storage` : ""}`);
      onMoved(res);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="ad-modal-backdrop" onClick={() => { if (!busy) onClose(); }}>
      <div className="ad-modal" role="alertdialog" aria-modal="true" aria-labelledby="move-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="move-title" className="ad-h3">Move “{p.name}” to Square?</h2>
        <ul className="ad-modal__list">
          <li><b>Creates it in Square</b> with its name, description, price{p.category ? `, category “${p.category}”` : ""}{p.stockCount != null ? ` and a starting stock of ${p.stockCount}` : ""}.</li>
          <li>{photos ? <><b>Copies {photos} photo{photos === 1 ? "" : "s"}</b> to Square, then <b>deletes the files from our storage</b> to free the space.</> : "It has no photos to copy."}</li>
          <li><b>Keeps</b> series, JAN code, featured status, shop category, wishlists and restock alerts.</li>
          <li>Square gives it a <b>new ID</b>. The old one stays on past orders.</li>
          <li>From then on you edit its name, price, photos and stock in Square, and the product here is removed so it only exists once.</li>
        </ul>
        <p className="ad-muted ad-sm">Before anything is deleted here, the Square copy is checked against this product (name, price, stock and photos). If the check or any step fails, the copy is removed from Square again and the product stays exactly as it is.</p>
        {error && <div className="ad-error" role="alert">{error}</div>}
        <div className="ad-modal__actions">
          <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="sh-btn" onClick={move} disabled={busy}>{busy ? "Moving… this can take a minute" : "Move to Square"}</button>
        </div>
      </div>
    </div>
  );
}

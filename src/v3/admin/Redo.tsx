import { useState } from "react";
import { api } from "../../lib/api";
import { useEscape } from "../hooks";
import { GleamshelfStatusLine } from "./Gleamshelf";
import { useGleamshelfComputers } from "./gleamshelfComputers";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The parts of a product Gleamshelf can write again (the server's describe job parts; "details" is the series and the maker). */
export type RedoPart = "title" | "description" | "details" | "category";
const PARTS: { part: RedoPart; label: string; note: string }[] = [
  { part: "title", label: "Title", note: "the product's name in the shop and in Square" },
  { part: "description", label: "Description", note: "shown to shoppers" },
  { part: "details", label: "Series and maker", note: "used by the shop's filters and search" },
  { part: "category", label: "Category", note: "which shop category it is in" },
];

/**
 * Products > "Redo with Gleamshelf": the ticked products go back to Gleamshelf on the shop's computer for what the person picks: cleaner
 * photos (the Improve photos options come next) and a new title, description, series and maker, or category (one describe job per product,
 * remembering which parts were asked for). Nothing changes until each result is checked: photos in Photos, words in Descriptions.
 */
export function RedoDialog({
  productIds,
  ctx,
  onClose,
  onPhotos,
}: {
  productIds: string[];
  ctx: Ctx;
  onClose: () => void;
  /** Opens the photo options for the same products (Improve photos), in place of this dialog. */
  onPhotos: () => void;
}) {
  const computers = useGleamshelfComputers();
  const [photos, setPhotos] = useState(false);
  const [parts, setParts] = useState<Set<RedoPart>>(new Set(["title", "description"]));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ queued: number; noPhoto: number; alreadyQueued: number } | null>(null);
  useEscape(onClose);

  const toggle = (p: RedoPart, on: boolean) =>
    setParts((s) => {
      const n = new Set(s);
      if (on) n.add(p);
      else n.delete(p);
      return n;
    });
  // in the order the review shows them
  const chosen = PARTS.map((p) => p.part).filter((p) => parts.has(p));

  const send = async () => {
    if (!chosen.length) {
      if (photos) onPhotos();
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ queued: number; noPhoto: number; alreadyQueued: number }>("/admin/describe-jobs", {
        method: "POST",
        body: JSON.stringify({ ids: productIds, parts: chosen, limit: Math.min(2000, productIds.length) }),
      });
      if (photos) {
        ctx.flash(r.queued ? `${plural(r.queued, "product")} sent for new words. Now the photo options.` : "Now the photo options.");
        onPhotos();
        return;
      }
      setDone(r);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer ad-photoq-dialog" role="dialog" aria-modal="true" aria-label="Redo with Gleamshelf">
        <div className="sh-drawer__head">
          <span>Redo with Gleamshelf</span>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sh-drawer__body ad-photoq">
          <div className="ad-redo__status">
            <GleamshelfStatusLine computers={computers} ctx={ctx} />
          </div>
          {done ? (
            <>
              <p className="ad-photoq__big">
                {done.queued > 0 ? `${plural(done.queued, "product")} sent to Gleamshelf.` : "Nothing new was sent."}
              </p>
              <p className="ad-muted">
                {done.queued > 0 &&
                  "Gleamshelf reads each product's main photo and looks it up online. Check each proposal in Descriptions: nothing changes until you apply it."}
                {done.alreadyQueued > 0 &&
                  ` ${plural(done.alreadyQueued, "product")} ${done.alreadyQueued === 1 ? "was" : "were"} already waiting or waiting to be checked, so left as ${done.alreadyQueued === 1 ? "it is" : "they are"}.`}
                {done.noPhoto > 0 && ` ${plural(done.noPhoto, "product")} left out: no photo, or not shown on the website.`}
              </p>
              <div className="ad-imports__actions">
                <button
                  type="button"
                  className="sh-btn"
                  onClick={() => {
                    onClose();
                    ctx.go("Descriptions");
                  }}
                >
                  Go to Descriptions
                </button>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <p>
                <b>{plural(productIds.length, "product")}</b> selected. Gleamshelf, on the shop&rsquo;s own computer, does them again: pick
                what.
              </p>
              <div className="ad-redo__parts">
                <label className="ad-check">
                  <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} /> <b>Photos</b>{" "}
                  <small className="ad-muted">(cleaned up; the photo options come next, and each new photo is checked in Photos)</small>
                </label>
                {PARTS.map((p) => (
                  <label key={p.part} className="ad-check">
                    <input type="checkbox" checked={parts.has(p.part)} onChange={(e) => toggle(p.part, e.target.checked)} />{" "}
                    <b>{p.label}</b> <small className="ad-muted">({p.note})</small>
                  </label>
                ))}
              </div>
              <p className="ad-muted ad-sm">
                Words are written from each product&rsquo;s main photo and what the web says about it, then checked in Descriptions before
                anything changes. Products without a photo, or hidden from the website, are left out.
              </p>
              <div className="ad-imports__actions">
                <button type="button" className="sh-btn" onClick={send} disabled={busy || (!photos && !chosen.length)}>
                  {busy ? "Sending…" : chosen.length ? (photos ? "Send, then photo options" : "Send to Gleamshelf") : "Photo options"}
                </button>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

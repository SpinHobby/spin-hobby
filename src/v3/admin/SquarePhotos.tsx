import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { AtelierResult } from "@atelier/react";
import { api, apiBlob } from "../../lib/api";
import type { Product } from "../types";
import { prepareImage, preparedFromBlob } from "./image";
import { PolishOptions, type PolishChoice } from "./PolishOptions";
import { polishPhoto } from "./polish";
import type { Ctx } from "./Screens";

const PhotoEditor = lazy(() => import("./PhotoEditor"));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Photo { id: string; url: string }
interface PhotoLists { shown: Photo[]; hidden: Photo[] }

/**
 * The photos of a Square product, edited here and saved to Square (nothing is stored on our side).
 * Hiding a photo only takes it off the product; editing saves a NEW photo and hides the original; a photo is
 * deleted for good only from the "Delete" button on a hidden photo.
 */
export function SquarePhotos({ ctx, p, onChanged }: { ctx: Ctx; p: Product; onChanged: (urls: string[]) => void }) {
  const base = `/admin/products/${encodeURIComponent(p.id)}/photos`;
  const [lists, setLists] = useState<PhotoLists | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<{ photo: Photo; source: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const [polishing, setPolishing] = useState<Photo | null>(null);
  const [choice, setChoice] = useState<PolishChoice>({ removeBackground: true, removeStickers: false, text: false });

  const apply = useCallback((next: PhotoLists) => { setLists({ shown: next.shown, hidden: next.hidden }); onChanged(next.shown.map((x) => x.url)); }, [onChanged]);
  useEffect(() => {
    let current = true;
    api<PhotoLists>(base).then((r) => { if (current) setLists({ shown: r.shown, hidden: r.hidden }); }).catch((e) => { if (current) setError(errMsg(e)); });
    return () => { current = false; };
  }, [base]);

  const run = async (label: string, work: () => Promise<PhotoLists>) => {
    setBusy(label); setError("");
    try { apply(await work()); ctx.reload(); } catch (e) { setError(errMsg(e)); } finally { setBusy(""); }
  };
  const setOrder = (ids: string[], label: string) => run(label, () => api<PhotoLists>(base, { method: "PUT", body: JSON.stringify({ ids }) }));

  if (!lists) return <section className="ad-photos-sq"><div className="ad-label" style={{ margin: 0 }}>Photos</div><span className="ad-muted ad-sm">{error || "Loading photos…"}</span></section>;
  const { shown, hidden } = lists;
  const ids = shown.map((x) => x.id);
  const move = (i: number, to: number) => { const next = [...ids]; const [x] = next.splice(i, 1); next.splice(to, 0, x); void setOrder(next, "Saving order…"); };

  const addFiles = async (files: FileList) => {
    for (const file of Array.from(files).filter((f) => f.type.startsWith("image/"))) {
      await run("Adding photo…", async () => {
        const prepared = await prepareImage(file, 1600, 0.9);
        return api<PhotoLists>(base, { method: "POST", body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type }) });
      });
    }
    if (input.current) input.current.value = "";
  };

  const openEditor = async (photo: Photo) => {
    setBusy("Opening photo…"); setError("");
    try {
      const blob = await apiBlob(`/admin/photo-proxy?url=${encodeURIComponent(photo.url)}`);
      setEditing({ photo, source: URL.createObjectURL(blob) });
    } catch (e) { setError(errMsg(e)); } finally { setBusy(""); }
  };
  const saveEdit = async (result: AtelierResult) => {
    const target = editing; setEditing(null);
    if (!target) return;
    URL.revokeObjectURL(target.source);
    await run("Saving the edited photo as a new photo…", async () => {
      const prepared = await preparedFromBlob(result.blob, result.width, result.height);
      return api<PhotoLists>(base, { method: "POST", body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type, replaces: target.photo.id }) });
    });
    ctx.flash("Saved as a new photo. The original is kept (hidden).");
  };

  /** Tidies one photo and saves the result as a NEW photo in its place; the original is hidden, never deleted. */
  const runPolish = async () => {
    const target = polishing;
    if (!target) return;
    await run("Polishing the photo…", async () => {
      const original = await apiBlob(`/admin/photo-proxy?url=${encodeURIComponent(target.url)}`);
      const { blob, report } = await polishPhoto(original, { removeBackground: choice.removeBackground, removeStickers: choice.removeStickers });
      const prepared = await preparedFromBlob(blob, 0, 0);
      const result = await api<PhotoLists>(base, { method: "POST", body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type, replaces: target.id }) });
      const notes = [choice.removeBackground ? (report.backgroundRemoved ? "backdrop removed" : "no green backdrop found") : "", choice.removeStickers ? (report.stickersFilled ? `${report.stickersFilled} sticker painted over` : "no sticker found") : ""].filter(Boolean);
      ctx.flash(`Saved as a new photo (${notes.join(", ")}). The original is kept, hidden.${report.usage ? ` About $${report.usage.costUsd.toFixed(3)}.` : ""}`);
      return result;
    });
    setPolishing(null);
  };

  return (
    <section className="ad-photos-sq" aria-label="Photos">
      <div className="ad-between">
        <span className="ad-label" style={{ margin: 0 }}>Photos <span className="ad-muted">· saved in Square</span></span>
        <button type="button" className="ad-link" onClick={() => input.current?.click()} disabled={!!busy}>+ Add photo</button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} />
      {shown.length === 0 && <span className="ad-muted ad-sm">No photos shown. Add one{hidden.length ? " or show a hidden one below" : ""}.</span>}
      {shown.length > 0 && (
        <div className="ad-photos__grid">
          {shown.map((photo, i) => (
            <div key={photo.id} className="ad-photos__item">
              <img src={photo.url} alt="" />
              {i === 0 && <span className="ad-photos__cover">Main</span>}
              <div className="ad-photos__actions">
                <button type="button" onClick={() => openEditor(photo)} disabled={!!busy} title="Edit (saved as a new photo; the original is kept)" aria-label="Edit photo">✎</button>
                <button type="button" onClick={() => setPolishing(polishing?.id === photo.id ? null : photo)} disabled={!!busy} title="Polish: remove green backdrop or shop sticker (saved as a new photo)" aria-label="Polish photo">✨</button>
                {i > 0 && <button type="button" onClick={() => move(i, 0)} disabled={!!busy} title="Make main photo">★</button>}
                {i > 0 && <button type="button" onClick={() => move(i, i - 1)} disabled={!!busy} title="Move earlier" aria-label="Move earlier">◀</button>}
                {i < shown.length - 1 && <button type="button" onClick={() => move(i, i + 1)} disabled={!!busy} title="Move later" aria-label="Move later">▶</button>}
                <button type="button" onClick={() => setOrder(ids.filter((x) => x !== photo.id), "Hiding photo…")} disabled={!!busy} title="Hide from the product (kept in Square)" aria-label="Hide photo">🙈</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {polishing && (
        <div className="ad-polish-box">
          <div className="ad-label" style={{ margin: 0 }}>Polish this photo <span className="ad-muted">· saved as a new photo, the original is kept hidden</span></div>
          <PolishOptions choice={choice} onChange={setChoice} showText={false} busy={!!busy} onRun={runPolish} runLabel="Polish" />
        </div>
      )}
      {hidden.length > 0 && (
        <div className="ad-photos-sq__hidden">
          <div className="ad-muted ad-sm">Hidden photos (kept in Square, not shown to shoppers)</div>
          <div className="ad-photos__grid">
            {hidden.map((photo) => (
              <div key={photo.id} className="ad-photos__item is-hidden">
                <img src={photo.url} alt="" />
                <div className="ad-photos__actions">
                  <button type="button" onClick={() => setOrder([...ids, photo.id], "Showing photo…")} disabled={!!busy} title="Show on the product again" aria-label="Show photo">👁</button>
                  {confirmDelete === photo.id
                    ? <button type="button" className="is-danger" onClick={() => { setConfirmDelete(null); void run("Deleting photo…", () => api<PhotoLists>(`${base}/${encodeURIComponent(photo.id)}`, { method: "DELETE" })); }} disabled={!!busy}>Delete for good?</button>
                    : <button type="button" onClick={() => setConfirmDelete(photo.id)} disabled={!!busy} title="Delete from Square for good" aria-label="Delete photo">🗑</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {busy && <span className="ad-muted ad-sm" role="status">{busy}</span>}
      {error && <span className="ad-error" role="alert">{error}</span>}
      {editing && (
        <Suspense fallback={null}>
          <PhotoEditor url={editing.source} folder="products" onCancel={() => { URL.revokeObjectURL(editing.source); setEditing(null); }} onDone={saveEdit} />
        </Suspense>
      )}
    </section>
  );
}

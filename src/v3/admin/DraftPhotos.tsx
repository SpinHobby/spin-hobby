import { Suspense, lazy, useState } from "react";
import type { GleamResult } from "@gleamshelf/react";
import { api, apiBlob } from "../../lib/api";
import { BackgroundPreview } from "./Backgrounds";
import { preparedFromBlob } from "./image";
import { EditorBoundary } from "./EditorBoundary";
import { PhotoViewer } from "./PhotoViewer";
import type { Background } from "./photoBackgrounds";
import type { OfferedPhoto, PhotoKey, PhotoPick } from "./photoPicks";

const PhotoEditor = lazy(() => import("./PhotoEditor"));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

const LABELS: Record<"studio" | "background" | "cropped" | "original" | "official", { title: string; hint: string }> = {
  studio: { title: "Cleaned photo", hint: "made by the photo computer: background removed, stickers off, sharpened" },
  background: { title: "Transparent cut-out", hint: "just the product, shown on your shop background, which you can change for every product at once" },
  cropped: { title: "Cropped", hint: "your photo cropped to the product, nothing else changed (no AI)" },
  original: { title: "As taken", hint: "your photo exactly as it was uploaded" },
  official: { title: "Official photo", hint: "" },
};
/** The name a photo is shown with; the maker's extra photos are numbered ("Official photo 2"). */
const labelOf = (key: PhotoKey) => {
  const n = /^official(\d+)$/.exec(key)?.[1];
  return n ? { title: `Official photo ${n}`, hint: "" } : LABELS[key as keyof typeof LABELS];
};

/**
 * Every photo a draft offers, each with where it goes: the website (and the till, through Square) and eBay (not connected yet: what is picked is kept
 * for when it is). The first photo picked for the website is the main one; any can be made main.
 */
export function DraftPhotos({ draftId, onEdited, offered, picks, onPicks, shopBackground, official, title, busy }: {
  draftId: string;
  /** The draft after a photo was edited or an edit undone. */
  onEdited: (draft: unknown) => void;
  offered: OfferedPhoto[];
  picks: PhotoPick[];
  onPicks: (next: PhotoPick[]) => void;
  /** The shop background the transparent cut-out is shown on (null: white). */
  shopBackground: Background | null;
  official: { pageUrl: string; site: string } | null;
  title: string;
  busy: boolean;
}) {
  const url = (key: PhotoKey) => offered.find((p) => p.key === key)?.url ?? null;
  const set = (key: PhotoKey, change: Partial<PhotoPick>) => onPicks(picks.map((p) => (p.key === key ? { ...p, ...change } : p)));
  const makeMain = (key: PhotoKey) => {
    const me = picks.find((p) => p.key === key)!;
    onPicks([{ ...me, square: true }, ...picks.filter((p) => p.key !== key)]);
  };
  const mainKey = picks.find((p) => p.square)?.key ?? null;
  // the photo shown big: its address, and which draft photo it is (to crop it; the background one is only shown)
  const [zoom, setZoom] = useState<{ url: string; key: PhotoKey } | null>(null);
  const [editing, setEditing] = useState<{ key: PhotoKey; source: string } | null>(null);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const isEdited = (key: PhotoKey) => offered.find((p) => p.key === key)?.edited ?? false;

  // the photo goes to the editor through the server (a maker's photo cannot be read by the page directly)
  const openEditor = async (key: PhotoKey) => {
    setWorking("Opening the photo…"); setError("");
    try { setEditing({ key, source: URL.createObjectURL(await apiBlob(`/admin/imports/${draftId}/photos/${key}/file`)) }); }
    catch (e) { setError(errMsg(e)); } finally { setWorking(""); }
  };
  const saveEdit = async (result: GleamResult) => {
    const target = editing; setEditing(null);
    if (!target) return;
    URL.revokeObjectURL(target.source);
    setWorking("Saving the edit…");
    try {
      const prepared = await preparedFromBlob(result.blob, result.width, result.height);
      onEdited((await api<{ draft: unknown }>(`/admin/imports/${draftId}/photos/${target.key}`, { method: "PUT", body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type }) })).draft);
    } catch (e) { setError(errMsg(e)); } finally { setWorking(""); }
  };
  /** A crop made in the viewer, kept as the photo's edit (undo brings back the photo as offered). */
  const saveCrop = async (key: PhotoKey, blob: Blob) => {
    const prepared = await preparedFromBlob(blob, 0, 0);
    onEdited((await api<{ draft: unknown }>(`/admin/imports/${draftId}/photos/${key}`, { method: "PUT", body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type }) })).draft);
  };
  const undo = async (key: PhotoKey) => {
    setWorking("Undoing the edit…"); setError("");
    try { onEdited((await api<{ draft: unknown }>(`/admin/imports/${draftId}/photos/${key}/edit`, { method: "DELETE" })).draft); }
    catch (e) { setError(errMsg(e)); } finally { setWorking(""); }
  };

  return (
    <div className="ad-draftphotos">
      {picks.map((p) => {
        const label = labelOf(p.key);
        const src = url(p.key);
        return (
          <div key={p.key} className={`ad-draftphotos__item ${p.square || p.ebay ? "is-picked" : ""}`}>
            <div className="ad-draftphotos__pic">
              {p.key === "background"
                ? <BackgroundPreview cutoutUrl={src} background={shopBackground} alt={`${title}, on the shop background`} onClick={() => src && setZoom({ url: src, key: p.key })} />
                : src ? <img src={src} alt={`${title}: ${label.title}`} loading="lazy" onClick={() => setZoom({ url: src, key: p.key })} title="Click to see it bigger and crop" style={{ cursor: "zoom-in" }} /> : null}
              {mainKey === p.key && <span className="ad-photos__cover">Main</span>}
              {isEdited(p.key) && <span className="ad-draftphotos__edited">Edited</span>}
            </div>
            <div className="ad-draftphotos__text">
              <b>{label.title}</b>
              <span className="ad-muted ad-sm">
                {p.key.startsWith("official") && official
                  ? <>from <a href={official.pageUrl} target="_blank" rel="noreferrer">{official.site}</a>. It belongs to the maker: use it only if that is OK for your shop.</>
                  : label.hint}
                {p.key === "background" && <> (now: <b>{shopBackground?.name ?? "white"}</b>)</>}
              </span>
            </div>
            <div className="ad-draftphotos__where">
              <label className="ad-check"><input type="checkbox" checked={p.square} disabled={busy} onChange={(e) => set(p.key, { square: e.target.checked })} /> Website &amp; Square</label>
              <label className="ad-check"><input type="checkbox" checked={p.ebay} disabled={busy} onChange={(e) => set(p.key, { ebay: e.target.checked })} /> eBay</label>
              {p.square && mainKey !== p.key && <button type="button" className="ad-link" disabled={busy} onClick={() => makeMain(p.key)}>Make main</button>}
              {p.key !== "background" && <button type="button" className="ad-link" disabled={busy || !!working} onClick={() => void openEditor(p.key)}>Edit / crop</button>}
              {isEdited(p.key) && <button type="button" className="ad-link" disabled={busy || !!working} onClick={() => void undo(p.key)}>Undo edit</button>}
            </div>
          </div>
        );
      })}
      {working && <span className="ad-muted ad-sm" role="status">{working}</span>}
      {error && <span className="ad-error" role="alert">{error}</span>}
      <p className="ad-muted ad-sm" style={{ margin: 0 }}>Click a photo to see it bigger and crop it. Photos picked for eBay are kept with the product and used when it is listed there.</p>
      {zoom && (
        <PhotoViewer
          src={zoom.url}
          alt={title}
          load={zoom.key === "background" ? undefined : () => apiBlob(`/admin/imports/${draftId}/photos/${zoom.key}/file`)}
          onSave={zoom.key === "background" ? undefined : (blob) => saveCrop(zoom.key, blob)}
          onClose={() => setZoom(null)}
        />
      )}
      {editing && (
        <EditorBoundary onClose={() => { URL.revokeObjectURL(editing.source); setEditing(null); }}>
          <Suspense fallback={null}>
            <PhotoEditor url={editing.source} folder="products" onCancel={() => { URL.revokeObjectURL(editing.source); setEditing(null); }} onDone={(r) => void saveEdit(r)} />
          </Suspense>
        </EditorBoundary>
      )}
    </div>
  );
}

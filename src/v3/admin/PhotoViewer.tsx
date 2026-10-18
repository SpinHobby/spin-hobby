import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "../hooks";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Rect { x: number; y: number; w: number; h: number }

/** The part of `blob` inside `r` (fractions of its width and height), as a new picture of the same kind. */
async function cropBlob(blob: Blob, r: Rect): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const sx = Math.round(r.x * bitmap.width), sy = Math.round(r.y * bitmap.height);
  const sw = Math.max(1, Math.round(r.w * bitmap.width)), sh = Math.max(1, Math.round(r.h * bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d")!.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  bitmap.close();
  const type = blob.type === "image/png" ? "image/png" : "image/jpeg";
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!out) throw new Error("The crop could not be made.");
  return out;
}

/**
 * A photo, big, at its own shape (never stretched), over the whole page. With `load` and `onSave` it also crops: drag a box, Crop, and Undo /
 * Redo step through the crops; Save keeps the result. The crops are made from the picture's own pixels, nothing else changes.
 */
export function PhotoViewer({ src, alt = "", load, onSave, onClose }: {
  src: string;
  alt?: string;
  /** The picture's bytes (read through the server, so the page may crop it). Without it, the viewer only shows the photo. */
  load?: () => Promise<Blob>;
  onSave?: (blob: Blob) => Promise<void>;
  onClose: () => void;
}) {
  const [steps, setSteps] = useState<{ blob: Blob; url: string }[]>([]);
  const [at, setAt] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [box, setBox] = useState<Rect | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const img = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEscape(onClose);

  // the starting picture, when cropping is possible
  useEffect(() => {
    if (!load) return;
    let alive = true;
    load().then((blob) => { if (alive) { setSteps([{ blob, url: URL.createObjectURL(blob) }]); setAt(0); } }).catch((e) => setError(errMsg(e)));
    return () => { alive = false; };
    // loaded once, when the viewer opens: the caller's function may be a new one on every render
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // object URLs are freed when the viewer closes
  const urls = useRef<string[]>([]);
  urls.current = steps.map((s) => s.url);
  useEffect(() => () => { for (const u of urls.current) URL.revokeObjectURL(u); }, []);

  const shown = steps[at]?.url ?? src;
  const canCrop = !!load && !!onSave && steps.length > 0;

  const point = (e: ReactPointerEvent) => {
    const r = img.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const down = (e: ReactPointerEvent) => {
    if (!cropping) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = point(e);
    setBox(null);
  };
  const move = (e: ReactPointerEvent) => {
    if (!cropping || !drag.current) return;
    const p = point(e), s = drag.current;
    setBox({ x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => { drag.current = null; };

  const applyCrop = async () => {
    if (!box || box.w < 0.02 || box.h < 0.02) { setError("Drag a bigger box over the part to keep."); return; }
    setBusy("Cropping…"); setError("");
    try {
      const blob = await cropBlob(steps[at]!.blob, box);
      // a new crop after undoing drops the steps that were undone (as in any editor)
      const kept = steps.slice(0, at + 1);
      for (const s of steps.slice(at + 1)) URL.revokeObjectURL(s.url);
      setSteps([...kept, { blob, url: URL.createObjectURL(blob) }]);
      setAt(kept.length);
      setBox(null);
      setCropping(false);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(""); }
  };
  const save = async () => {
    if (!onSave || at === 0) return;
    setBusy("Saving…"); setError("");
    try { await onSave(steps[at]!.blob); onClose(); } catch (e) { setError(errMsg(e)); } finally { setBusy(""); }
  };

  return createPortal(
    <div className="ad-viewer" role="dialog" aria-modal="true" aria-label={alt || "Photo"} onClick={(e) => { if (e.target === e.currentTarget && !cropping) onClose(); }}>
      {canCrop && (
        <div className="ad-viewer__bar" onClick={(e) => e.stopPropagation()}>
          <button type="button" className={`sh-btn ad-btn-sm ${cropping ? "" : "sh-btn--ghost"}`} onClick={() => { setCropping((c) => !c); setBox(null); setError(""); }} disabled={!!busy}>{cropping ? "Cancel crop" : "Crop"}</button>
          {cropping && <button type="button" className="sh-btn ad-btn-sm" onClick={() => void applyCrop()} disabled={!box || !!busy}>Apply crop</button>}
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setAt((i) => i - 1)} disabled={at === 0 || !!busy} aria-label="Undo" title="Undo">↶ Undo</button>
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setAt((i) => i + 1)} disabled={at >= steps.length - 1 || !!busy} aria-label="Redo" title="Redo">↷ Redo</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="sh-btn ad-btn-sm" onClick={() => void save()} disabled={at === 0 || !!busy}>{busy === "Saving…" ? "Saving…" : "Save"}</button>
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={onClose} disabled={busy === "Saving…"}>Close</button>
        </div>
      )}
      <div className={`ad-viewer__stage ${cropping ? "is-cropping" : ""}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onClick={(e) => e.stopPropagation()}>
        <img ref={img} src={shown} alt={alt} draggable={false} onClick={() => { if (!canCrop) onClose(); }} />
        {box && (
          <div className="ad-viewer__box" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }} />
        )}
      </div>
      {(cropping || error || busy) && (
        <div className="ad-viewer__note" onClick={(e) => e.stopPropagation()}>
          {error || busy || "Drag over the part of the photo to keep, then Apply crop."}
        </div>
      )}
    </div>,
    document.body,
  );
}

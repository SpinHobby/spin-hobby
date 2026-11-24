import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "../../components";
import { GUESSED_FOCUS, focusStyle, type PhotoFrame } from "../photo";
import { clearFocus, loadFocus, saveFocus, type FocusMap } from "./photoFocus";

const MAX_ZOOM = 3;
const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * Marks where the face is in one product photo. The whole photo shows on the left: click or drag to put the ring on the face (or use
 * the arrow keys), and set how close with the slider. The picture on the right is how the photo shows behind a home page banner ad.
 * Saves by itself (photoFocus.ts); "Let the shop guess" forgets the mark.
 */
export function PhotoFocusEditor({
  productId,
  url,
  onSaved,
  onClose,
}: {
  productId: string;
  url: string;
  /** Called with the product's points after a save or a reset. */
  onSaved?: (focus: FocusMap) => void;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState<PhotoFrame | null | undefined>(undefined); // undefined: still loading
  const [focus, setFocus] = useState<PhotoFrame>(GUESSED_FOCUS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dragging = useRef(false);

  useEffect(() => {
    let current = true;
    loadFocus(productId)
      .then((map) => {
        if (!current) return;
        setSaved(map[url] ?? null);
        if (map[url]) setFocus(map[url]);
      })
      .catch(() => current && setSaved(null));
    return () => {
      current = false;
    };
  }, [productId, url]);

  const point = (e: PointerEvent<HTMLDivElement>) => {
    const img = e.currentTarget.querySelector("img");
    if (!img) return;
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return;
    setFocus((f) => ({ ...f, x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) }));
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 2;
    const by: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = by[e.key];
    if (!d) return;
    e.preventDefault();
    setFocus((f) => ({ ...f, x: clamp(f.x + d[0]), y: clamp(f.y + d[1]) }));
  };
  const run = async (job: () => Promise<FocusMap>) => {
    setBusy(true);
    setError("");
    try {
      onSaved?.(await job());
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ad-frame ad-focus" role="group" aria-label="Mark the face">
      <p className="ad-muted ad-sm" style={{ margin: 0 }}>
        Click the character's face. Where this photo is shown large and cropped (behind a home page banner ad), it is framed on that point.
        Product cards are not changed: they keep showing the whole product.{" "}
        {saved === null && "No mark saved yet: the ring is the shop's guess."}
      </p>
      <div className="ad-frame__row">
        <div
          className="ad-focus__whole"
          tabIndex={0}
          aria-label="The whole photo. Click the face, or move the ring with the arrow keys"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            dragging.current = true;
            point(e);
          }}
          onPointerMove={(e) => dragging.current && point(e)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          onKeyDown={key}
        >
          <span className="ad-focus__photo">
            <img src={url} alt="" draggable={false} />
            <i className="ad-focus__ring" style={{ left: `${focus.x}%`, top: `${focus.y}%` }} aria-hidden />
          </span>
        </div>
        <div className="ad-frame__side">
          <span className="ad-label" style={{ margin: 0 }}>
            Behind a banner ad
          </span>
          <span className="ad-focus__tile">
            <img src={url} alt="" style={focusStyle(focus)} />
          </span>
          <label className="ad-frame__zoom">
            <span className="ad-label" style={{ margin: 0 }}>
              How close {focus.zoom.toFixed(2)}×
            </span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={focus.zoom}
              onChange={(e) => setFocus((f) => ({ ...f, zoom: Math.round(Number(e.target.value) * 100) / 100 }))}
            />
          </label>
        </div>
      </div>
      {error && (
        <span className="ad-error" role="alert">
          {error}
        </span>
      )}
      <div className="ad-frame__actions">
        <button type="button" className="ad-link" onClick={() => void run(() => clearFocus(productId, url))} disabled={busy || !saved}>
          Let the shop guess
        </button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => void run(() => saveFocus(productId, url, focus))} loading={busy}>
          Save face
        </Button>
      </div>
    </div>
  );
}

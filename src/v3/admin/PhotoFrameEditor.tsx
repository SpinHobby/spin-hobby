import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "../../components";
import { defaultFrame, dragFrame, frameStyle, lookAtUrl, usePhotoFit, type PhotoFrame } from "../photo";

const MAX_ZOOM = 3;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 100) / 100;
const same = (a: PhotoFrame, b: PhotoFrame) => a.x === b.x && a.y === b.y && a.zoom === b.zoom;

/**
 * Moves and zooms one product photo inside its square, as the shop shows it: photos always fill their card, so this picks the part
 * that shows. Drag the photo (or use the arrow keys), zoom with the slider, then Save. The preview uses the same styles as the shop.
 */
export function PhotoFrameEditor({
  url,
  initial,
  background,
  busy,
  error,
  onSave,
  onCancel,
}: {
  url: string;
  initial: PhotoFrame | undefined;
  /** A transparent cut-out's backdrop, as on the shop. */
  background?: string;
  busy: boolean;
  /** Why the last save failed, if it did. */
  error?: string;
  onSave: (frame: PhotoFrame) => void;
  onCancel: () => void;
}) {
  // flat bars around the picture are cropped as on the shop; a cut-out has none (its see-through parts show the backdrop)
  const fit = usePhotoFit(background ? null : url);
  useEffect(() => {
    if (!background) lookAtUrl(url);
  }, [url, background]);
  const start = defaultFrame(fit); // where the shop starts this photo when no position is saved (tall pictures: at the top)
  const [edited, setEdited] = useState<PhotoFrame | null>(initial ?? null);
  const frame = edited ?? start;
  const setFrame = (next: PhotoFrame | ((f: PhotoFrame) => PhotoFrame)) =>
    setEdited((f) => (typeof next === "function" ? next(f ?? start) : next));
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; start: PhotoFrame } | null>(null);

  // The picture follows the pointer (photo.ts dragFrame, the same as a shopper's drag on the product page).
  const moveBy = (dx: number, dy: number, from: PhotoFrame) => setFrame(dragFrame(fit, from, dx, dy, box.current?.clientWidth || 1));
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, start: frame };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d) moveBy(e.clientX - d.x, e.clientY - d.y, d.start);
  };
  const up = () => {
    drag.current = null;
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
    setFrame((f) => ({ ...f, x: clamp(f.x + d[0], 0, 100), y: clamp(f.y + d[1], 0, 100) }));
  };
  const centred = same(frame, start);
  const look = { ...(frameStyle(frame, fit) as CSSProperties), ...(background ? { background } : {}) };

  return (
    <div className="ad-frame" role="group" aria-label="Position the photo">
      <p className="ad-muted ad-sm" style={{ margin: 0 }}>
        Photos fill their square on the shop (white bars around a picture are cut off). Drag the photo to choose the part that shows first,
        and zoom in if it needs it. Shoppers can drag it on the product page to see the rest.
      </p>
      <div className="ad-frame__row">
        <div
          ref={box}
          className="ad-frame__box"
          tabIndex={0}
          aria-label="Photo. Drag, or use the arrow keys, to move it"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        >
          <img src={url} alt="" draggable={false} style={look} />
        </div>
        <div className="ad-frame__side">
          <span className="ad-label" style={{ margin: 0 }}>
            As a small thumbnail
          </span>
          <span className="sh-thumb" style={{ width: 64, height: 64 }}>
            <img src={url} alt="" style={look} />
          </span>
          <label className="ad-frame__zoom">
            <span className="ad-label" style={{ margin: 0 }}>
              Zoom {frame.zoom.toFixed(2)}×
            </span>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.05}
              value={frame.zoom}
              onChange={(e) => setFrame((f) => ({ ...f, zoom: round(Number(e.target.value)) }))}
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
        <button type="button" className="ad-link" onClick={() => setEdited(start)} disabled={busy || centred}>
          Reset
        </button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" onClick={() => onSave(frame)} loading={busy}>
          Save position
        </Button>
      </div>
    </div>
  );
}

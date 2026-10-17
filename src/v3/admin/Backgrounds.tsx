import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { prepareImage } from "./image";
import type { Ctx } from "./Screens";
import type { Background, useBackgrounds } from "./photoBackgrounds";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * What the finished photo will look like: the cut-out on the background, laid out like the server does it (centred inside an 8% margin, a soft
 * shadow). With no background it shows `fallbackUrl`, the photo computer's own white photo.
 */
export function BackgroundPreview({ cutoutUrl, background, fallbackUrl, alt, onClick, onWhite }: { cutoutUrl: string | null; background: Background | null; fallbackUrl: string | null; alt: string; onClick?: () => void; /** With no background, the cut-out on white (as a background change makes it) rather than the fallback photo. */ onWhite?: boolean }) {
  if (!cutoutUrl || (!background && !onWhite)) return fallbackUrl ? <img src={fallbackUrl} alt={alt} loading="lazy" onClick={onClick} /> : <div className="ad-photoq__none">No photo</div>;
  return (
    <div className="ad-bgpreview" style={background ? { backgroundImage: `url("${background.imageUrl}")` } : undefined} onClick={onClick} role="img" aria-label={`${alt}, on ${background?.name ?? "white"}`}>
      <img src={cutoutUrl} alt="" loading="lazy" />
    </div>
  );
}

/** The background to put a photo on: white (as the photo computer made it) or one of the shop's backgrounds. `null` is white. */
export function BackgroundChoice({ backgrounds, value, onChange, disabled, label = "Background" }: { backgrounds: Background[]; value: string | null; onChange: (id: string | null) => void; disabled?: boolean; label?: string }) {
  return (
    <div className="ad-bgchoice" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={value === null} className={`ad-bgchoice__swatch is-white ${value === null ? "is-on" : ""}`} onClick={() => onChange(null)} disabled={disabled} title="White">
        <span>White</span>
      </button>
      {backgrounds.map((b) => (
        <button key={b.id} type="button" role="radio" aria-checked={value === b.id} className={`ad-bgchoice__swatch ${value === b.id ? "is-on" : ""}`} onClick={() => onChange(b.id)} disabled={disabled} title={b.name}
          style={{ backgroundImage: `url("${b.imageUrl}")` }}>
          <span>{b.name}</span>
        </button>
      ))}
    </div>
  );
}

/** The library: upload backgrounds, choose the one used by default, rename, delete. Photos already made are never changed by this. */
export function BackgroundsLibrary({ ctx, backgrounds, onChanged }: { ctx: Ctx; backgrounds: ReturnType<typeof useBackgrounds>; onChanged?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const run = async (label: string, work: () => Promise<unknown>) => {
    setBusy(label);
    try { await work(); await backgrounds.reload(); onChanged?.(); }
    catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(""); }
  };
  const upload = async (files: FileList) => {
    for (const file of Array.from(files).filter((f) => f.type.startsWith("image/"))) {
      await run(`Adding ${file.name}…`, async () => {
        const prepared = await prepareImage(file, 2000, 0.9);
        await api("/admin/photo-backgrounds", { method: "POST", body: JSON.stringify({ name: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim(), contentType: prepared.type, data: prepared.dataUrl }) });
      });
    }
    if (input.current) input.current.value = "";
  };
  const rename = (b: Background) => {
    const name = window.prompt("Name of this background", b.name);
    if (name === null || !name.trim() || name.trim() === b.name) return;
    void run("Renaming…", () => api(`/admin/photo-backgrounds/${b.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }));
  };
  const setDefault = (id: string | null) => run("Saving…", () => api("/admin/photo-backgrounds/default", { method: "PUT", body: JSON.stringify({ id }) }));

  return (
    <section className="ad-card ad-bglib" aria-label="Photo backgrounds">
      <div className="ad-between">
        <div>
          <div className="ad-label" style={{ margin: 0 }}>Photo backgrounds</div>
          <p className="ad-muted ad-sm" style={{ margin: "4px 0 0" }}>
            Your own backgrounds for product photos, kept on our side (not in Square). The photo computer sends each product cut out on a transparent background, so you can put it on any of these when you use a photo, and change it later from the product's photos. The <b>default</b> is picked first.
          </p>
        </div>
        <button type="button" className="sh-btn ad-btn-sm" onClick={() => input.current?.click()} disabled={!!busy}>+ Upload background</button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
      <div className="ad-bglib__grid">
        <div className={`ad-bglib__item ${backgrounds.defaultId === null ? "is-default" : ""}`}>
          <div className="ad-bglib__thumb is-white">White</div>
          <div className="ad-bglib__meta"><b>White</b>{backgrounds.defaultId === null ? <span className="sh-chip">Default</span> : <button type="button" className="ad-link" onClick={() => void setDefault(null)} disabled={!!busy}>Make default</button>}</div>
        </div>
        {backgrounds.list.map((b) => (
          <div key={b.id} className={`ad-bglib__item ${b.isDefault ? "is-default" : ""}`}>
            <div className="ad-bglib__thumb" style={{ backgroundImage: `url("${b.imageUrl}")` }} />
            <div className="ad-bglib__meta">
              <b title={b.name}>{b.name}</b>
              {b.isDefault ? <span className="sh-chip">Default</span> : <button type="button" className="ad-link" onClick={() => void setDefault(b.id)} disabled={!!busy}>Make default</button>}
            </div>
            <div className="ad-bglib__actions">
              <button type="button" className="ad-link" onClick={() => rename(b)} disabled={!!busy}>Rename</button>
              {confirmDelete === b.id
                ? <button type="button" className="ad-link is-danger" onClick={() => { setConfirmDelete(null); void run("Deleting…", () => api(`/admin/photo-backgrounds/${b.id}`, { method: "DELETE" })); }} disabled={!!busy}>Delete for good?</button>
                : <button type="button" className="ad-link" onClick={() => setConfirmDelete(b.id)} disabled={!!busy}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
      {backgrounds.loaded && backgrounds.list.length === 0 && <span className="ad-muted ad-sm">No backgrounds yet. Upload a photo of a table, a backdrop or a colour you like (at least 600 pixels on each side).</span>}
      {busy && <span className="ad-muted ad-sm" role="status">{busy}</span>}
    </section>
  );
}

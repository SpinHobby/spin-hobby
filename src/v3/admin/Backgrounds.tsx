import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { prepareImage } from "./image";
import type { Ctx } from "./Screens";
import type { Background, useBackgrounds } from "./photoBackgrounds";
import { PolyHavenMaker } from "./PolyHavenMaker";
import { STARTER_BACKGROUNDS, starterUrl, type StarterBackground } from "./starterBackgrounds";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * A transparent product photo as shoppers see it: the cut-out on the shop background (white when there is none), laid out like the server does it
 * (centred inside an 8% margin). Without a cut-out it shows `fallbackUrl`.
 */
export function BackgroundPreview({
  cutoutUrl,
  background,
  fallbackUrl,
  alt,
  onClick,
}: {
  cutoutUrl: string | null;
  background: Background | null;
  fallbackUrl?: string | null;
  alt: string;
  onClick?: () => void;
}) {
  if (!cutoutUrl)
    return fallbackUrl ? (
      <img src={fallbackUrl} alt={alt} loading="lazy" onClick={onClick} />
    ) : (
      <div className="ad-photoq__none">No photo</div>
    );
  return (
    <div
      className="ad-bgpreview"
      style={background ? { backgroundImage: `url("${background.imageUrl}")` } : undefined}
      onClick={onClick}
      role="img"
      aria-label={`${alt}, on ${background?.name ?? "white"}`}
    >
      <img src={cutoutUrl} alt="" loading="lazy" />
    </div>
  );
}

/**
 * The shop background: one setting behind every transparent product photo on the website. Upload backgrounds (a seasonal one for Halloween, snow
 * for December), switch with one click, rename, delete. Photos are never re-made: they are transparent, and the website draws the background behind
 * them. Older photos with a background baked in can be made transparent here too.
 */
export function BackgroundsLibrary({
  ctx,
  backgrounds,
  onChanged,
}: {
  ctx: Ctx;
  backgrounds: ReturnType<typeof useBackgrounds>;
  onChanged?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const run = async (label: string, work: () => Promise<unknown>, done?: string) => {
    setBusy(label);
    try {
      await work();
      await backgrounds.reload();
      onChanged?.();
      if (done) ctx.flash(done);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const upload = async (files: FileList) => {
    for (const file of Array.from(files).filter((f) => f.type.startsWith("image/"))) {
      await run(`Adding ${file.name}…`, async () => {
        const prepared = await prepareImage(file, 2000, 0.9);
        await api("/admin/photo-backgrounds", {
          method: "POST",
          body: JSON.stringify({
            name: file.name
              .replace(/\.[^.]+$/, "")
              .replace(/[_-]+/g, " ")
              .trim(),
            contentType: prepared.type,
            data: prepared.dataUrl,
          }),
        });
      });
    }
    if (input.current) input.current.value = "";
  };
  // a picture added to the library like an upload (the same size and quality)
  const post = async (name: string, file: File) => {
    const prepared = await prepareImage(file, 2000, 0.9);
    await api("/admin/photo-backgrounds", {
      method: "POST",
      body: JSON.stringify({ name, contentType: prepared.type, data: prepared.dataUrl }),
    });
  };
  const added = (name: string) => `${name} added: choose "Use for all products" to show it`;
  const addStarter = (b: StarterBackground) =>
    run(
      `Adding ${b.name}…`,
      async () => {
        const res = await fetch(starterUrl(b));
        if (!res.ok) throw new Error(`Could not load ${b.name}`);
        await post(b.name, new File([await res.blob()], `${b.file}.jpg`, { type: "image/jpeg" }));
      },
      added(b.name),
    );
  const [making, setMaking] = useState(false);
  const addMade = (name: string, make: () => Promise<File>) => run(`Making ${name}…`, async () => post(name, await make()), added(name));
  const inLibrary = new Set(backgrounds.list.map((b) => b.name.trim().toLowerCase()));
  const starters = STARTER_BACKGROUNDS.filter((b) => !inLibrary.has(b.name.toLowerCase()));
  const rename = (b: Background) => {
    const name = window.prompt("Name of this background", b.name);
    if (name === null || !name.trim() || name.trim() === b.name) return;
    void run("Renaming…", () => api(`/admin/photo-backgrounds/${b.id}`, { method: "PATCH", body: JSON.stringify({ name: name.trim() }) }));
  };
  const use = (id: string | null, name: string) =>
    run(
      "Switching…",
      () => api("/admin/photo-backgrounds/default", { method: "PUT", body: JSON.stringify({ id }) }),
      `Every product photo now shows on ${name}`,
    );
  const makeTransparent = () =>
    run("Making the older photos transparent…", async () => {
      const r = await api<{ done: number; failed: number }>("/admin/photo-backgrounds/make-transparent", { method: "POST" });
      ctx.flash(
        `${r.done} photo${r.done === 1 ? "" : "s"} made transparent${r.failed ? `, ${r.failed} could not be (try again later)` : ""}`,
      );
    });
  const { transparent, older } = backgrounds.photos;

  return (
    <section className="ad-card ad-bglib" aria-label="Shop background">
      <div className="ad-between">
        <div>
          <div className="ad-label" style={{ margin: 0 }}>
            Shop background
          </div>
          <p className="ad-muted ad-sm" style={{ margin: "4px 0 0" }}>
            Photos from the photo computer are saved <b>transparent</b> (just the product), and the website shows every one of them on the
            background <b>in use</b> here. Switch it any time, for example a Halloween one in October: every product changes at once,
            nothing is re-uploaded.
            {transparent > 0 && (
              <>
                {" "}
                {transparent} product photo{transparent === 1 ? "" : "s"} use{transparent === 1 ? "s" : ""} it now.
              </>
            )}
          </p>
        </div>
        <button type="button" className="sh-btn ad-btn-sm" onClick={() => input.current?.click()} disabled={!!busy}>
          + Upload background
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void upload(e.target.files)} />
      <div className="ad-bglib__grid">
        <div className={`ad-bglib__item ${backgrounds.defaultId === null ? "is-default" : ""}`}>
          <div className="ad-bglib__thumb is-white">White</div>
          <div className="ad-bglib__meta">
            <b>White</b>
            {backgrounds.defaultId === null ? (
              <span className="sh-chip">In use</span>
            ) : (
              <button type="button" className="ad-link" onClick={() => void use(null, "white")} disabled={!!busy}>
                Use for all products
              </button>
            )}
          </div>
        </div>
        {backgrounds.list.map((b) => (
          <div key={b.id} className={`ad-bglib__item ${b.isDefault ? "is-default" : ""}`}>
            <div className="ad-bglib__thumb" style={{ backgroundImage: `url("${b.imageUrl}")` }} />
            <div className="ad-bglib__meta">
              <b title={b.name}>{b.name}</b>
              {b.isDefault ? (
                <span className="sh-chip">In use</span>
              ) : (
                <button type="button" className="ad-link" onClick={() => void use(b.id, b.name)} disabled={!!busy}>
                  Use for all products
                </button>
              )}
            </div>
            <div className="ad-bglib__actions">
              <button type="button" className="ad-link" onClick={() => rename(b)} disabled={!!busy}>
                Rename
              </button>
              {confirmDelete === b.id ? (
                <button
                  type="button"
                  className="ad-link is-danger"
                  onClick={() => {
                    setConfirmDelete(null);
                    void run("Deleting…", () => api(`/admin/photo-backgrounds/${b.id}`, { method: "DELETE" }));
                  }}
                  disabled={!!busy}
                >
                  {b.isDefault ? "Delete it (products go back to white)?" : "Delete for good?"}
                </button>
              ) : (
                <button type="button" className="ad-link" onClick={() => setConfirmDelete(b.id)} disabled={!!busy}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {backgrounds.loaded && backgrounds.list.length === 0 && (
        <span className="ad-muted ad-sm">
          No backgrounds yet. Add a ready-made one below, or upload your own photo of a table, a backdrop or a seasonal scene (at least 600
          pixels on each side).
        </span>
      )}
      {backgrounds.loaded && starters.length > 0 && (
        <div className="ad-bglib__starters">
          <div className="ad-label" style={{ margin: 0 }}>
            Ready-made backgrounds
          </div>
          <p className="ad-muted ad-sm" style={{ margin: 0 }}>
            Real photos of tables and walls, and plain studio tones, free for the shop to use. Add any to your library above; your own
            uploads go there too.
          </p>
          <div className="ad-bglib__grid">
            {starters.map((b) => (
              <div key={b.file} className="ad-bglib__item">
                <div className="ad-bglib__thumb" style={{ backgroundImage: `url("${starterUrl(b, true)}")` }} />
                <div className="ad-bglib__meta">
                  <b title={b.name}>{b.name}</b>
                  <button type="button" className="ad-link" onClick={() => void addStarter(b)} disabled={!!busy}>
                    + Add to library
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {backgrounds.loaded && (
        <div className="ad-bglib__starters">
          <div className="ad-between">
            <div>
              <div className="ad-label" style={{ margin: 0 }}>
                Make one from Poly Haven
              </div>
              <p className="ad-muted ad-sm" style={{ margin: "4px 0 0" }}>
                Hundreds more free rooms, walls and tables from Poly Haven's online library: choose one, turn it and brighten it, then add
                it to your library.
              </p>
            </div>
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setMaking((m) => !m)} aria-expanded={making}>
              {making ? "Close" : "Open"}
            </button>
          </div>
          {making && <PolyHavenMaker busy={!!busy} add={addMade} />}
        </div>
      )}
      {older > 0 && (
        <div className="ad-bglib__older" role="status">
          <span>
            <b>
              {older} older photo{older === 1 ? " has" : "s have"} a background baked in
            </b>
            , so {older === 1 ? "it does" : "they do"} not change with the shop background.
          </span>
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => void makeTransparent()} disabled={!!busy}>
            Make {older === 1 ? "it" : "them"} transparent
          </button>
        </div>
      )}
      {busy && (
        <span className="ad-muted ad-sm" role="status">
          {busy}
        </span>
      )}
    </section>
  );
}

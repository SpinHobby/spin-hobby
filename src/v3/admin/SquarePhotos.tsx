import { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import type { GleamResult } from "@gleamshelf/react";
import { api, apiBlob } from "../../lib/api";
import type { Product } from "../types";
import { EditorBoundary } from "./EditorBoundary";
import { prepareImage, preparedFromBlob } from "./image";
import { useBackgrounds } from "./photoBackgrounds";
import { PolishOptions, type PolishChoice } from "./PolishOptions";
import { polishPhoto } from "./polish";
import type { Ctx } from "./Screens";

const PhotoEditor = lazy(() => import("./PhotoEditor"));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Photo {
  id: string;
  url: string;
}
interface PhotoLists {
  shown: Photo[];
  hidden: Photo[];
}
/** A photo made from a photo-computer cut-out: transparent (shown on the shop background), or older, with a background baked in (it can be made transparent). */
interface Cutout {
  imageId: string;
  cutoutUrl: string;
  transparent: boolean;
}

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
  const [polishOpen, setPolishOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<PolishChoice>({ removeBackground: true, removeStickers: false, text: false });
  const [cutouts, setCutouts] = useState<Cutout[]>([]);
  // the photos picked for eBay, in order (eBay is not connected yet: they are kept for when it is)
  const [ebay, setEbay] = useState<string[]>([]);
  const backgrounds = useBackgrounds();

  const apply = useCallback(
    (next: PhotoLists) => {
      setLists({ shown: next.shown, hidden: next.hidden });
      onChanged(next.shown.map((x) => x.url));
    },
    [onChanged],
  );
  useEffect(() => {
    let current = true;
    api<PhotoLists & { cutouts?: Cutout[]; ebay?: string[] }>(base)
      .then((r) => {
        if (current) {
          setLists({ shown: r.shown, hidden: r.hidden });
          setCutouts(r.cutouts ?? []);
          setEbay(r.ebay ?? []);
        }
      })
      .catch((e) => {
        if (current) setError(errMsg(e));
      });
    return () => {
      current = false;
    };
  }, [base]);

  const run = async (label: string, work: () => Promise<PhotoLists>) => {
    setBusy(label);
    setError("");
    try {
      apply(await work());
      ctx.reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const setOrder = (ids: string[], label: string) =>
    run(label, () => api<PhotoLists>(base, { method: "PUT", body: JSON.stringify({ ids }) }));

  if (!lists)
    return (
      <section className="ad-photos-sq">
        <div className="ad-label" style={{ margin: 0 }}>
          Photos
        </div>
        <span className="ad-muted ad-sm">{error || "Loading photos…"}</span>
      </section>
    );
  const { shown, hidden } = lists;
  const ids = shown.map((x) => x.id);
  const move = (i: number, to: number) => {
    const next = [...ids];
    const [x] = next.splice(i, 1);
    next.splice(to, 0, x);
    void setOrder(next, "Saving order…");
  };

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
    setBusy("Opening photo…");
    setError("");
    try {
      const blob = await apiBlob(`/admin/photo-proxy?url=${encodeURIComponent(photo.url)}`);
      setEditing({ photo, source: URL.createObjectURL(blob) });
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const saveEdit = async (result: GleamResult) => {
    const target = editing;
    setEditing(null);
    if (!target) return;
    URL.revokeObjectURL(target.source);
    await run("Saving the edited photo as a new photo…", async () => {
      const prepared = await preparedFromBlob(result.blob, result.width, result.height);
      return api<PhotoLists>(base, {
        method: "POST",
        body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type, replaces: target.photo.id }),
      });
    });
    ctx.flash("Saved as a new photo. The original is kept (hidden).");
  };

  /** Makes an older cut-out photo transparent: a new photo takes its place (the old one, made from the same cut-out, is deleted). */
  const makeTransparent = async (imageId: string) => {
    await run("Making the photo transparent…", async () => {
      const r = await api<PhotoLists & { cutouts: Cutout[] }>(`${base}/${encodeURIComponent(imageId)}/transparent`, { method: "POST" });
      setCutouts(r.cutouts);
      return { shown: r.shown, hidden: r.hidden };
    });
    ctx.flash("The photo is transparent: it now shows on the shop background.");
  };
  const cutoutOf = (id: string) => cutouts.find((c) => c.imageId === id) ?? null;
  const toggleEbay = async (url: string) => {
    const next = ebay.includes(url) ? ebay.filter((u) => u !== url) : [...ebay, url];
    setBusy("Saving eBay photos…");
    setError("");
    try {
      setEbay(
        (
          await api<{ ebay: string[] }>(`/admin/products/${encodeURIComponent(p.id)}/channel-photos/ebay`, {
            method: "PUT",
            body: JSON.stringify({ urls: next }),
          })
        ).ebay,
      );
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  /**
   * Tidies the selected photos (the main photo when none is selected). Each result is saved as a NEW photo in the
   * original's place and the original is hidden, never deleted. The free backdrop step runs on every selected photo;
   * painting over a shop sticker (AI) only looks at the main photo.
   */
  const runPolish = async () => {
    const ids = shown.map((x) => x.id);
    const chosen = ids.filter((id) => selected.has(id));
    const targets = choice.removeBackground ? (chosen.length ? chosen : ids.slice(0, 1)) : [];
    if (choice.removeStickers && ids[0] && !targets.includes(ids[0])) targets.unshift(ids[0]);
    if (!targets.length) return;
    let latest: PhotoLists | null = null;
    await run("Polishing…", async () => {
      let backdrops = 0;
      let missing = 0;
      let stickers = 0;
      let spent = 0;
      for (const [n, id] of targets.entries()) {
        setBusy(targets.length > 1 ? `Polishing photo ${n + 1} of ${targets.length}…` : "Polishing the photo…");
        const photo = (latest ?? lists).shown.find((x) => x.id === id);
        if (!photo) continue;
        const main = id === ids[0] && choice.removeStickers;
        const original = await apiBlob(`/admin/photo-proxy?url=${encodeURIComponent(photo.url)}`);
        const { blob, report } = await polishPhoto(original, {
          removeBackground: choice.removeBackground && (chosen.length ? chosen.includes(id) : id === ids[0]),
          removeStickers: main,
        });
        const prepared = await preparedFromBlob(blob, 0, 0);
        latest = await api<PhotoLists>(base, {
          method: "POST",
          body: JSON.stringify({ data: prepared.dataUrl, contentType: prepared.type, replaces: id }),
        });
        if (choice.removeBackground) {
          if (report.backgroundRemoved) backdrops += 1;
          else missing += 1;
        }
        stickers += report.stickersFilled;
        spent += report.usage?.costUsd ?? 0;
      }
      const notes = [
        choice.removeBackground ? `backdrop removed from ${backdrops}${missing ? `, ${missing} had no green backdrop` : ""}` : "",
        choice.removeStickers ? (stickers ? "sticker painted over on the main photo" : "no sticker found") : "",
      ].filter(Boolean);
      ctx.flash(`Saved as new photos (${notes.join("; ")}). The originals are kept, hidden.${spent ? ` About $${spent.toFixed(3)}.` : ""}`);
      return latest ?? lists;
    });
    setSelected(new Set());
    setPolishOpen(false);
  };

  return (
    <section className="ad-photos-sq" aria-label="Photos">
      <div className="ad-between">
        <span className="ad-label" style={{ margin: 0 }}>
          Photos <span className="ad-muted">· saved in Square</span>
        </span>
        <span style={{ display: "inline-flex", gap: 14 }}>
          <button type="button" className="ad-link" onClick={() => setPolishOpen((v) => !v)} disabled={!!busy || shown.length === 0}>
            ✨ Polish photos
          </button>
          <button type="button" className="ad-link" onClick={() => input.current?.click()} disabled={!!busy}>
            + Add photo
          </button>
        </span>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && void addFiles(e.target.files)} />
      {shown.length === 0 && (
        <span className="ad-muted ad-sm">No photos shown. Add one{hidden.length ? " or show a hidden one below" : ""}.</span>
      )}
      {shown.length > 0 && (
        <div className="ad-photos__grid">
          {shown.map((photo, i) => (
            <div key={photo.id} className="ad-photos__item">
              {/* a transparent photo is shown as shoppers see it, on the shop background */}
              <img
                src={photo.url}
                alt=""
                style={
                  cutoutOf(photo.id)?.transparent
                    ? { background: `${backgrounds.shop ? `url("${backgrounds.shop.imageUrl}") center / cover no-repeat, ` : ""}#fff` }
                    : undefined
                }
              />
              {cutoutOf(photo.id)?.transparent && (
                <span
                  className="ad-photos__clear"
                  title={`Transparent: shown on the shop background (${backgrounds.shop?.name ?? "white"})`}
                >
                  Transparent
                </span>
              )}
              {polishOpen && (
                <label className="ad-photos__pick" title="Select this photo">
                  <input
                    type="checkbox"
                    checked={selected.has(photo.id)}
                    aria-label={`Select photo ${i + 1}`}
                    onChange={() =>
                      setSelected((cur) => {
                        const next = new Set(cur);
                        if (next.has(photo.id)) next.delete(photo.id);
                        else next.add(photo.id);
                        return next;
                      })
                    }
                  />
                </label>
              )}
              {i === 0 && <span className="ad-photos__cover">Main</span>}
              <button
                type="button"
                className={`ad-photos__ebay ${ebay.includes(photo.url) ? "is-on" : ""}`}
                onClick={() => void toggleEbay(photo.url)}
                disabled={!!busy}
                title={
                  ebay.includes(photo.url) ? "Picked for eBay (click to unpick)" : "Pick for eBay (not connected yet: kept for when it is)"
                }
                aria-pressed={ebay.includes(photo.url)}
              >
                eBay{ebay.includes(photo.url) ? ` ${ebay.indexOf(photo.url) + 1}` : ""}
              </button>
              <div className="ad-photos__actions">
                <button
                  type="button"
                  onClick={() => openEditor(photo)}
                  disabled={!!busy}
                  title="Edit (saved as a new photo; the original is kept)"
                  aria-label="Edit photo"
                >
                  ✎
                </button>
                {cutoutOf(photo.id) && !cutoutOf(photo.id)!.transparent && (
                  <button
                    type="button"
                    onClick={() => void makeTransparent(photo.id)}
                    disabled={!!busy}
                    title="Make transparent: show it on the shop background like the other photos"
                    aria-label="Make transparent"
                  >
                    ◐
                  </button>
                )}
                {i > 0 && (
                  <button type="button" onClick={() => move(i, 0)} disabled={!!busy} title="Make main photo">
                    ★
                  </button>
                )}
                {i > 0 && (
                  <button type="button" onClick={() => move(i, i - 1)} disabled={!!busy} title="Move earlier" aria-label="Move earlier">
                    ◀
                  </button>
                )}
                {i < shown.length - 1 && (
                  <button type="button" onClick={() => move(i, i + 1)} disabled={!!busy} title="Move later" aria-label="Move later">
                    ▶
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setOrder(
                      ids.filter((x) => x !== photo.id),
                      "Hiding photo…",
                    )
                  }
                  disabled={!!busy}
                  title="Hide from the product (kept in Square)"
                  aria-label="Hide photo"
                >
                  🙈
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {(ebay.length > 0 || shown.length > 0) && (
        <div className="ad-muted ad-sm">
          <b>eBay</b> · not connected yet.{" "}
          {ebay.length
            ? `${ebay.length} photo${ebay.length === 1 ? "" : "s"} picked, kept for when it is.`
            : "Tap “eBay” on a photo to pick it for eBay."}
          {ebay.filter((u) => !shown.some((x) => x.url === u) && !hidden.some((x) => x.url === u)).length > 0 && (
            <span className="ad-photos__ebayonly">
              {ebay
                .filter((u) => !shown.some((x) => x.url === u) && !hidden.some((x) => x.url === u))
                .map((u) => (
                  <span key={u} className="ad-photos__ebaythumb">
                    <img src={u} alt="" />
                    <button type="button" onClick={() => void toggleEbay(u)} disabled={!!busy} aria-label="Unpick for eBay">
                      ×
                    </button>
                  </span>
                ))}{" "}
              <span>for eBay only</span>
            </span>
          )}
        </div>
      )}
      {polishOpen && (
        <div className="ad-polish-box">
          <div className="ad-label" style={{ margin: 0 }}>
            Polish photos <span className="ad-muted">· each is saved as a new photo, the original is kept hidden</span>
          </div>
          <PolishOptions
            choice={choice}
            onChange={setChoice}
            showText={false}
            busy={!!busy}
            onRun={runPolish}
            runLabel="Polish"
            selection={{
              count: shown.filter((x) => selected.has(x.id)).length,
              total: shown.length,
              onAll: () => setSelected(new Set(shown.map((x) => x.id))),
              onNone: () => setSelected(new Set()),
            }}
          />
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
                  <button
                    type="button"
                    onClick={() => setOrder([...ids, photo.id], "Showing photo…")}
                    disabled={!!busy}
                    title="Show on the product again"
                    aria-label="Show photo"
                  >
                    👁
                  </button>
                  {confirmDelete === photo.id ? (
                    <button
                      type="button"
                      className="is-danger"
                      onClick={() => {
                        setConfirmDelete(null);
                        void run("Deleting photo…", () => api<PhotoLists>(`${base}/${encodeURIComponent(photo.id)}`, { method: "DELETE" }));
                      }}
                      disabled={!!busy}
                    >
                      Delete for good?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(photo.id)}
                      disabled={!!busy}
                      title="Delete from Square for good"
                      aria-label="Delete photo"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {busy && (
        <span className="ad-muted ad-sm" role="status">
          {busy}
        </span>
      )}
      {error && (
        <span className="ad-error" role="alert">
          {error}
        </span>
      )}
      {editing && (
        <EditorBoundary
          onClose={() => {
            URL.revokeObjectURL(editing.source);
            setEditing(null);
          }}
        >
          <Suspense fallback={null}>
            <PhotoEditor
              url={editing.source}
              folder="products"
              onCancel={() => {
                URL.revokeObjectURL(editing.source);
                setEditing(null);
              }}
              onDone={saveEdit}
            />
          </Suspense>
        </EditorBoundary>
      )}
    </section>
  );
}

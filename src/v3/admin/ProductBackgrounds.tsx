import { useCallback, useEffect, useState } from "react";
import { api, apiBlob } from "../../lib/api";
import { isSquarePhoto } from "../photo";
import { boxArtFrom } from "./boxArt";
import { prepareImage } from "./image";
import type { Ctx } from "./Screens";
import { useBackgrounds } from "./photoBackgrounds";
import { useProductBackground, type BackgroundMode, type BackgroundRule, type ProductBackground } from "./productBackground";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Overview {
  rule: BackgroundRule;
  products: { transparent: number; withBoxArt: number; withOwnChoice: number; white: number; library: number; boxArt: number };
}

/** A choice as the value of a <select>: "rule", "shop", "white", "box_art" or "library:<id>". */
const valueOf = (mode: BackgroundMode | null, backgroundId: string | null) =>
  mode === null ? "rule" : mode === "library" ? `library:${backgroundId}` : mode;
const choiceOf = (value: string): { mode: BackgroundMode | null; backgroundId: string | null } =>
  value === "rule"
    ? { mode: null, backgroundId: null }
    : value.startsWith("library:")
      ? { mode: "library", backgroundId: value.slice(8) }
      : { mode: value as BackgroundMode, backgroundId: null };

/** Makes box art from one of a product's photos (loaded through the shop, as the photo editor does) and saves it. */
async function makeBoxArt(itemId: string, photoUrl: string): Promise<ProductBackground> {
  // a Square photo comes through the shop (a browser may not read another website's picture); one we keep ourselves is read directly
  const photo = isSquarePhoto(photoUrl)
    ? await apiBlob(`/admin/photo-proxy?url=${encodeURIComponent(photoUrl)}`)
    : await fetch(photoUrl).then((r) => {
        if (!r.ok) throw new Error("That photo could not be loaded.");
        return r.blob();
      });
  const art = await boxArtFrom(photo);
  const r = await api<{ background: ProductBackground }>(`/admin/products/${encodeURIComponent(itemId)}/box-art`, {
    method: "PUT",
    body: JSON.stringify({ contentType: art.type, data: art.dataUrl }),
  });
  return r.background;
}

/**
 * The background behind one product's transparent photos: the shop's rule, the shop background, white, one of the library, or its own box
 * art (made here from one of its photos, or uploaded). Changing it re-makes nothing, so it can be changed again at any time.
 */
export function ProductBackgroundPicker({
  ctx,
  itemId,
  state,
  onState,
  backgrounds,
  photos,
}: {
  ctx: Ctx;
  itemId: string;
  state: ProductBackground;
  onState: (next: ProductBackground) => void;
  backgrounds: ReturnType<typeof useBackgrounds>;
  /** The product's photos that are not transparent cut-outs: one of them is the photo of its box. */
  photos: { id: string; url: string }[];
}) {
  const [busy, setBusy] = useState("");
  const [from, setFrom] = useState(photos[0]?.url ?? "");
  const base = `/admin/products/${encodeURIComponent(itemId)}`;
  const run = async (label: string, work: () => Promise<ProductBackground>, done?: string) => {
    setBusy(label);
    try {
      onState(await work());
      if (done) ctx.flash(done);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const choose = (value: string) =>
    run("Saving…", async () => {
      const r = await api<{ background: ProductBackground }>(`${base}/background`, {
        method: "PUT",
        body: JSON.stringify(choiceOf(value)),
      });
      return r.background;
    });
  const upload = (file: File) =>
    run(
      "Saving the box art…",
      async () => {
        const prepared = await prepareImage(file, 1600, 0.9);
        const r = await api<{ background: ProductBackground }>(`${base}/box-art`, {
          method: "PUT",
          body: JSON.stringify({ contentType: prepared.type, data: prepared.dataUrl }),
        });
        return r.background;
      },
      "Box art saved",
    );
  const shopName = backgrounds.shop?.name ?? "white";
  const ruleText = state.rule === "box_art" ? `box art where there is one, else ${shopName}` : shopName;
  const source = photos.find((p) => p.url === from) ?? photos[0];

  return (
    <div className="ad-pbg" aria-label="Background">
      <label className="ad-pbg__row">
        <span className="ad-label" style={{ margin: 0 }}>
          Background
        </span>
        <select value={valueOf(state.mode, state.backgroundId)} onChange={(e) => void choose(e.target.value)} disabled={!!busy}>
          <option value="rule">Same as the shop ({ruleText})</option>
          <option value="shop">Shop background ({shopName})</option>
          <option value="white">White</option>
          <option value="box_art" disabled={!state.boxArtUrl}>
            Its box art{state.boxArtUrl ? "" : " (none yet)"}
          </option>
          {backgrounds.list.map((b) => (
            <option key={b.id} value={`library:${b.id}`}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <div className="ad-pbg__row">
        {state.boxArtUrl && (
          <span className="ad-pbg__art" style={{ backgroundImage: `url("${state.boxArtUrl}")` }} role="img" aria-label="Box art" />
        )}
        {photos.length > 0 && (
          <>
            {photos.length > 1 && (
              <select value={source?.url ?? ""} onChange={(e) => setFrom(e.target.value)} disabled={!!busy} aria-label="Photo of the box">
                {photos.map((p, i) => (
                  <option key={p.id} value={p.url}>
                    Photo {i + 1}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="ad-link"
              disabled={!!busy || !source}
              onClick={() => source && void run("Making the box art…", () => makeBoxArt(itemId, source.url), "Box art made")}
            >
              {state.boxArtUrl ? "Make the box art again" : "Make box art from the box photo"}
            </button>
          </>
        )}
        <label className="ad-link">
          Upload box art
          <input
            type="file"
            accept="image/*"
            hidden
            disabled={!!busy}
            onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])}
          />
        </label>
        {state.boxArtUrl && (
          <button
            type="button"
            className="ad-link"
            disabled={!!busy}
            onClick={() =>
              void run(
                "Removing…",
                async () => (await api<{ background: ProductBackground }>(`${base}/box-art`, { method: "DELETE" })).background,
              )
            }
          >
            Remove box art
          </button>
        )}
      </div>
      <span className="ad-muted ad-sm" role="status">
        {busy ||
          "What shows behind this product's transparent photos on the shop. Box art is the artwork of its own box, softened. You can change this again whenever you like; no photo is re-made."}
      </span>
    </div>
  );
}

/**
 * The Background control for a product whose photos we keep ourselves (added by hand, not in Square): the same picker, with the product's
 * photos that are not transparent cut-outs to make box art from. A Square product has it inside its Photos section.
 */
export function ProductBackgroundSection({
  ctx,
  itemId,
  images,
  cutouts,
}: {
  ctx: Ctx;
  itemId: string;
  images: string[];
  cutouts: string[];
}) {
  const backgrounds = useBackgrounds();
  const [state, setState] = useProductBackground(itemId);
  if (!state || !(cutouts.length > 0 || state.boxArtUrl)) return null;
  return (
    <ProductBackgroundPicker
      ctx={ctx}
      itemId={itemId}
      state={state}
      onState={setState}
      backgrounds={backgrounds}
      photos={images.filter((url) => !cutouts.includes(url)).map((url) => ({ id: url, url }))}
    />
  );
}

/**
 * Every product's background at once: the shop's rule (for products with no choice of their own), the same choice for all products, and
 * box art made for every product that has a photo of its box. All of it can be changed again later.
 */
export function ProductBackgroundsPanel({ ctx, backgrounds }: { ctx: Ctx; backgrounds: ReturnType<typeof useBackgrounds> }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [candidates, setCandidates] = useState<{ itemId: string; name: string; photoUrl: string }[]>([]);
  const [busy, setBusy] = useState("");
  const [all, setAll] = useState("box_art");
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      const [o, c] = await Promise.all([
        api<Overview>("/admin/product-backgrounds"),
        api<{ items: { itemId: string; name: string; photoUrl: string }[] }>("/admin/product-backgrounds/box-art-candidates"),
      ]);
      setOverview({ rule: o.rule, products: o.products });
      setCandidates(c.items);
    } catch {
      /* the panel just stays empty */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (label: string, work: () => Promise<string | void>) => {
    setBusy(label);
    try {
      const done = await work();
      await load();
      if (done) ctx.flash(done);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy("");
    }
  };
  const setRule = (rule: BackgroundRule) =>
    run("Saving…", async () => {
      await api("/admin/product-backgrounds/rule", { method: "PUT", body: JSON.stringify({ rule }) });
    });
  const applyAll = () =>
    run("Changing every product…", async () => {
      const r = await api<{ changed: number; skipped: number }>("/admin/product-backgrounds/many", {
        method: "POST",
        body: JSON.stringify(choiceOf(all)),
      });
      setConfirm(false);
      return all === "rule"
        ? `${r.changed} product${r.changed === 1 ? "" : "s"} follow the shop's rule again`
        : `${r.changed} product${r.changed === 1 ? "" : "s"} changed${r.skipped ? `, ${r.skipped} without box art kept what they had` : ""}`;
    });
  const makeAll = () =>
    run("Making box art…", async () => {
      let made = 0;
      let failed = 0;
      // one after the other: each is a photo opened and a picture saved
      for (const [i, c] of candidates.entries()) {
        setBusy(`Making box art: ${i + 1} of ${candidates.length} (${c.name})`);
        try {
          await makeBoxArt(c.itemId, c.photoUrl);
          made++;
        } catch {
          failed++;
        }
      }
      return `Box art made for ${made} product${made === 1 ? "" : "s"}${failed ? `, ${failed} could not be made` : ""}`;
    });

  if (!overview) return null;
  const { products } = overview;
  const shopName = backgrounds.shop?.name ?? "white";
  return (
    <section className="ad-card ad-pbgall" aria-label="Each product's background">
      <div>
        <div className="ad-label" style={{ margin: 0 }}>
          Each product's background
        </div>
        <p className="ad-muted ad-sm" style={{ margin: "4px 0 0" }}>
          A product can show on its own background instead of the shop's: white, one from the list above, or its <b>box art</b> (the artwork
          of its own box, softened). Set it here for every product, or for one product in its Photos. Nothing is re-made, so you can change
          it back at any time. {products.transparent} product{products.transparent === 1 ? " has" : "s have"} a transparent photo,{" "}
          {products.withBoxArt} {products.withBoxArt === 1 ? "has" : "have"} box art, and {products.withOwnChoice}{" "}
          {products.withOwnChoice === 1 ? "has" : "have"} a choice of {products.withOwnChoice === 1 ? "its" : "their"} own.
        </p>
      </div>
      <label className="ad-pbg__row">
        <span>Products with no choice of their own show on</span>
        <select value={overview.rule} onChange={(e) => void setRule(e.target.value as BackgroundRule)} disabled={!!busy}>
          <option value="shop">the shop background ({shopName})</option>
          <option value="box_art">their box art where they have it, else the shop background</option>
        </select>
      </label>
      <div className="ad-pbg__row">
        <span>Give every product</span>
        <select
          value={all}
          onChange={(e) => {
            setAll(e.target.value);
            setConfirm(false);
          }}
          disabled={!!busy}
          aria-label="Background for every product"
        >
          <option value="box_art">its box art, where it has one</option>
          <option value="shop">the shop background ({shopName})</option>
          <option value="white">white</option>
          {backgrounds.list.map((b) => (
            <option key={b.id} value={`library:${b.id}`}>
              {b.name}
            </option>
          ))}
          <option value="rule">no choice of its own (the rule above decides)</option>
        </select>
        {confirm ? (
          <button type="button" className="sh-btn ad-btn-sm" onClick={() => void applyAll()} disabled={!!busy}>
            Yes, change every product
          </button>
        ) : (
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setConfirm(true)} disabled={!!busy}>
            Apply to all products
          </button>
        )}
      </div>
      {candidates.length > 0 && (
        <div className="ad-pbg__row">
          <span>
            <b>
              {candidates.length} product{candidates.length === 1 ? " has" : "s have"} a photo of{" "}
              {candidates.length === 1 ? "its" : "their"} box and no box art yet.
            </b>
          </span>
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => void makeAll()} disabled={!!busy}>
            Make box art for {candidates.length === 1 ? "it" : "them"}
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

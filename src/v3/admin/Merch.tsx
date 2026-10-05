import { DragEvent, Suspense, lazy, useRef, useState } from "react";
import type { AtelierResult } from "@atelier/react";
import { api } from "../../lib/api";
import { money, statusLabel } from "../format";
import { useEscape } from "../hooks";
import { ProductCard, type CardActions } from "../storefront/ProductViews";
import type { Product } from "../types";
import { formatBytes, prepareImage, preparedFromBlob, uploadPrepared } from "./image";
import { CategorySelect } from "./Categories";
import type { Ctx } from "./Screens";

const PREVIEW: CardActions = { currency: "CAD", inCart: () => false, wished: () => false, onAdd: () => {}, onNotify: () => {}, onWish: () => {}, onOpen: () => {} };
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
// The photo editor is only downloaded when someone opens it.
const PhotoEditor = lazy(() => import("./PhotoEditor"));

// ---------------------------------------------------------------- photos

/** Drop or pick photos; each is shrunk in the browser, then uploaded. First photo is the cover. */
export function PhotoUploader({ urls, onChange, folder = "products", max = 6, single = false }: {
  urls: string[]; onChange: (urls: string[]) => void; folder?: "products" | "slides"; max?: number; single?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const limit = single ? 1 : max;

  /** Uploads the edited photo and puts it in place of the one that was opened. */
  const saveEdit = async (index: number, result: AtelierResult) => {
    setEditing(null);
    setError(""); setNote("");
    setBusy("Uploading edited photo…");
    try {
      const url = await uploadPrepared(await preparedFromBlob(result.blob, result.width, result.height), folder);
      onChange(urls.map((u, k) => (k === index ? url : u)));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy("");
    }
  };

  const add = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, Math.max(limit - (single ? 0 : urls.length), 0));
    if (!list.length) { if (files.length) setError("Choose image files."); return; }
    setError(""); setNote("");
    const added: string[] = [];
    let before = 0;
    let after = 0;
    try {
      for (const [i, file] of list.entries()) {
        setBusy(`Optimizing ${list.length > 1 ? `${i + 1}/${list.length}` : "photo"}…`);
        const prepared = await prepareImage(file, folder === "slides" ? 1600 : 1200);
        setBusy(`Uploading ${list.length > 1 ? `${i + 1}/${list.length}` : "photo"}…`);
        added.push(await uploadPrepared(prepared, folder));
        before += prepared.originalBytes;
        after += prepared.blob.size;
      }
      onChange(single ? added.slice(0, 1) : [...urls, ...added]);
      setNote(`${formatBytes(before)} → ${formatBytes(after)}`);
    } catch (e) {
      setError(errMsg(e));
      if (added.length) onChange(single ? added.slice(0, 1) : [...urls, ...added]);
    } finally {
      setBusy("");
      if (input.current) input.current.value = "";
    }
  };

  const drop = (e: DragEvent) => { e.preventDefault(); setDragging(false); if (!busy) add(e.dataTransfer.files); };
  const move = (i: number) => { const next = [...urls]; const [x] = next.splice(i, 1); next.unshift(x); onChange(next); };
  const remove = (i: number) => onChange(urls.filter((_, k) => k !== i));
  const full = urls.length >= limit && !single;

  return (
    <div className="ad-photos">
      {urls.length > 0 && (
        <div className={`ad-photos__grid ${single ? "is-single" : ""}`}>
          {urls.map((url, i) => (
            <div key={url} className="ad-photos__item">
              <img src={url} alt="" />
              {!single && i === 0 && <span className="ad-photos__cover">Cover</span>}
              <div className="ad-photos__actions">
                <button type="button" onClick={() => setEditing(i)} disabled={!!busy} title="Edit photo" aria-label="Edit photo">✎</button>
                {!single && i > 0 && <button type="button" onClick={() => move(i)} title="Make cover photo">★</button>}
                <button type="button" onClick={() => remove(i)} aria-label="Remove photo">×</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!full && (
        <button type="button" className={`ad-drop ${dragging ? "is-over" : ""}`} disabled={!!busy}
          onClick={() => input.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
          <span className="ad-drop__icon" aria-hidden>{busy ? "⏳" : "📷"}</span>
          <span className="ad-drop__title">{busy || (single ? (urls.length ? "Replace photo" : "Add photo") : "Add photos")}</span>
          {!busy && <span className="ad-drop__hint">Drop here or click · resized automatically before upload</span>}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" multiple={!single} hidden onChange={(e) => e.target.files && add(e.target.files)} />
      {note && !error && <span className="ad-photos__note">Optimized {note}</span>}
      {error && <span className="ad-error">{error}</span>}
      {editing !== null && urls[editing] && (
        <Suspense fallback={null}>
          <PhotoEditor url={urls[editing]} folder={folder} onCancel={() => setEditing(null)} onDone={(r) => saveEdit(editing, r)} />
        </Suspense>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- stock

export function StockField({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const tracked = value !== null;
  const set = (n: number) => onChange(Math.max(0, Math.min(100000, Math.round(n || 0))));
  return (
    <div className="ad-stock">
      <div className="ad-stock__row">
        <div className="ad-stepper" aria-disabled={!tracked}>
          <button type="button" onClick={() => set((value ?? 0) - 1)} disabled={!tracked || (value ?? 0) <= 0} aria-label="One less">−</button>
          <input inputMode="numeric" value={tracked ? String(value) : "∞"} disabled={!tracked} aria-label="Units in stock"
            onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")))} />
          <button type="button" onClick={() => set((value ?? 0) + 1)} disabled={!tracked} aria-label="One more">+</button>
        </div>
        <span className="ad-muted ad-sm">{!tracked ? "Always available" : value === 0 ? "Sold out" : `${value} in stock`}</span>
      </div>
      <label className="ad-check-inline">
        <input type="checkbox" checked={!tracked} onChange={(e) => onChange(e.target.checked ? null : 1)} />
        Don't track stock (made to order / unlimited)
      </label>
    </div>
  );
}

// ---------------------------------------------------------------- add product

interface Draft {
  name: string; price: string; compareAt: string; stock: number | null; photos: string[];
  preorder: boolean; release: string; orderBy: string; series: string; jan: string; maxPer: string; featured: boolean; description: string;
  categoryId: string | null;
}
const EMPTY: Draft = { name: "", price: "", compareAt: "", stock: 1, photos: [], preorder: false, release: "", orderBy: "", series: "", jan: "", maxPer: "", featured: false, description: "", categoryId: null };

const toCents = (v: string) => (v.trim() ? Math.round(Number(v) * 100) : null);

export function AddProductDrawer({ ctx, onClose }: { ctx: Ctx; onClose: () => void }) {
  useEscape(onClose);
  const [d, setD] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const price = toCents(d.price);
  const compare = toCents(d.compareAt);
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.name.trim()) errors.name = "Required";
  if (!price || !Number.isFinite(price) || price <= 0) errors.price = "Enter a price";
  if (compare !== null && (!Number.isFinite(compare) || (price && compare <= price))) errors.compareAt = "Must be higher than the price";
  if (d.preorder && !d.orderBy) errors.orderBy = "Required for pre-orders";
  if (d.maxPer && (!Number.isInteger(Number(d.maxPer)) || Number(d.maxPer) < 1)) errors.maxPer = "Whole number";
  const valid = Object.keys(errors).length === 0;
  const show = (k: keyof Draft) => (touched ? errors[k] : undefined);

  const preview: Product = {
    id: "preview", variationId: "preview-v", name: d.name || "Product name", series: d.series || null, character: null, category: ctx.data.categories.find((c) => c.id === d.categoryId)?.name ?? null,
    images: d.photos, priceCents: price && price > 0 ? price : 0, compareAtCents: compare && price && compare > price ? compare : null, currency: "CAD",
    status: d.preorder ? "pre" : d.stock === null ? "in" : d.stock <= 0 ? "out" : d.stock <= ctx.data.settings.low_stock_threshold ? "low" : "in",
    stockCount: d.stock, releaseMonth: d.release || null, orderByDate: d.orderBy || null, rank: null, maxPerCustomer: d.maxPer ? Number(d.maxPer) : null,
  };

  const save = async (addAnother: boolean) => {
    setTouched(true);
    if (!valid) return;
    setSaving(true);
    const body = {
      name: d.name.trim(), priceCents: price, compareAtCents: compare, stockCount: d.stock,
      imageUrls: d.photos, availability: d.preorder ? "preorder" : "auto", releaseMonth: d.release || null, orderByDate: d.orderBy || null,
      series: d.series.trim() || null, janCode: d.jan.trim() || null, maxPerCustomer: d.maxPer ? Number(d.maxPer) : null,
      isFeatured: d.featured, description: d.description.trim() || null, categoryId: d.categoryId,
    };
    try {
      await api("/admin/products", { method: "POST", body: JSON.stringify(body) });
      ctx.reload();
      ctx.flash(`${body.name} added to the shop`);
      if (addAnother) { setD({ ...EMPTY, categoryId: d.categoryId }); setTouched(false); }
      else onClose();
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer ad-drawer--wide" role="dialog" aria-modal="true" aria-label="Add product">
        <div className="sh-drawer__head"><span>Add product</span><button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="sh-drawer__body ad-add">
          <div className="ad-add__form">
            <section className="ad-add__section">
              <div className="ad-label">Photos</div>
              <PhotoUploader urls={d.photos} onChange={(v) => set("photos", v)} />
            </section>

            <section className="ad-add__section">
              <label className={`ad-field ${show("name") ? "has-error" : ""}`}>
                <span className="ad-field__top">Name {show("name") && <em>{show("name")}</em>}</span>
                <input className="sh-input" autoFocus placeholder="e.g. Rem 1/7 Scale Figure" value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={200} />
              </label>
              <div className="ad-grid2">
                <CategorySelect ctx={ctx} value={d.categoryId} onChange={(id) => set("categoryId", id)} />
                <label className="ad-field">Series
                  <input className="sh-input" placeholder="e.g. Re:Zero" value={d.series} onChange={(e) => set("series", e.target.value)} maxLength={120} />
                </label>
              </div>
            </section>

            <section className="ad-add__section">
              <div className="ad-grid2">
                <label className={`ad-field ${show("price") ? "has-error" : ""}`}>
                  <span className="ad-field__top">Price (CAD) {show("price") && <em>{show("price")}</em>}</span>
                  <div className="ad-money"><span>$</span><input className="sh-input" inputMode="decimal" placeholder="0.00" value={d.price} onChange={(e) => set("price", e.target.value.replace(/[^\d.]/g, ""))} /></div>
                </label>
                <label className={`ad-field ${show("compareAt") ? "has-error" : ""}`}>
                  <span className="ad-field__top">Original price {show("compareAt") ? <em>{show("compareAt")}</em> : <small>for a sale</small>}</span>
                  <div className="ad-money"><span>$</span><input className="sh-input" inputMode="decimal" placeholder="optional" value={d.compareAt} onChange={(e) => set("compareAt", e.target.value.replace(/[^\d.]/g, ""))} /></div>
                </label>
              </div>
            </section>

            <section className="ad-add__section">
              <div className="ad-seg" role="group" aria-label="Availability">
                <button type="button" className={!d.preorder ? "is-active" : ""} onClick={() => set("preorder", false)}>In stock now</button>
                <button type="button" className={d.preorder ? "is-active" : ""} onClick={() => set("preorder", true)}>Pre-order</button>
              </div>
              {d.preorder ? (
                <div className="ad-grid2">
                  <label className="ad-field">Release month<input className="sh-input" type="month" value={d.release} onChange={(e) => set("release", e.target.value)} /></label>
                  <label className={`ad-field ${show("orderBy") ? "has-error" : ""}`}>
                    <span className="ad-field__top">Order by {show("orderBy") && <em>{show("orderBy")}</em>}</span>
                    <input className="sh-input" type="date" value={d.orderBy} onChange={(e) => set("orderBy", e.target.value)} />
                  </label>
                </div>
              ) : (
                <div className="ad-field">Stock<StockField value={d.stock} onChange={(v) => set("stock", v)} /></div>
              )}
            </section>

            <button type="button" className="ad-link ad-add__more" onClick={() => setShowMore((v) => !v)}>{showMore ? "− Fewer details" : "+ More details (description, JAN, limits, featured)"}</button>
            {showMore && (
              <section className="ad-add__section">
                <label className="ad-field">Description<textarea className="sh-input" rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={2000} /></label>
                <div className="ad-grid2">
                  <label className="ad-field">JAN code<input className="sh-input" inputMode="numeric" value={d.jan} onChange={(e) => set("jan", e.target.value)} maxLength={20} /></label>
                  <label className={`ad-field ${show("maxPer") ? "has-error" : ""}`}>
                    <span className="ad-field__top">Max per customer {show("maxPer") && <em>{show("maxPer")}</em>}</span>
                    <input className="sh-input" inputMode="numeric" placeholder="No limit" value={d.maxPer} onChange={(e) => set("maxPer", e.target.value.replace(/\D/g, ""))} />
                  </label>
                </div>
                <label className="ad-check-inline"><input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} />Feature on the homepage and at the top of the catalog</label>
              </section>
            )}
          </div>

          <aside className="ad-add__preview">
            <div className="ad-preview">
              <div className="ad-preview__label"><span className="ad-dot" style={{ background: "var(--teal)" }} />Storefront preview</div>
              <div className="sf ad-preview__stage"><div className="ad-preview__card"><ProductCard p={preview} a={PREVIEW} /></div></div>
              <div className="ad-preview__meta"><span><b>Shoppers see:</b> {price ? `${money(price)} · ` : ""}{statusLabel(preview)}</span></div>
            </div>
          </aside>
        </div>
        <div className="sh-drawer__foot">
          {touched && !valid && <span className="ad-error" style={{ marginRight: "auto" }}>Fix the highlighted fields</span>}
          <button type="button" className="sh-btn sh-btn--ghost" onClick={() => save(true)} disabled={saving}>Save & add another</button>
          <button type="button" className="sh-btn" onClick={() => save(false)} disabled={saving}>{saving ? "Saving…" : "Add to shop"}</button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------- inline stock for the products table

export function InlineStock({ ctx, p, onChange }: { ctx: Ctx; p: Product; onChange?: (stockCount: number | null) => void }) {
  const [busy, setBusy] = useState(false);
  const change = async (delta: number) => {
    const next = Math.max(0, (p.stockCount ?? 0) + delta);
    setBusy(true);
    const update = (stockCount: number | null) => { onChange?.(stockCount); ctx.setData((x) => ({ ...x, products: x.products.map((q) => (q.id === p.id ? { ...q, stockCount, status: stockCount === null ? "in" : stockCount <= 0 ? "out" : stockCount <= x.settings.low_stock_threshold ? "low" : "in" } : q)) })); };
    const previous = p.stockCount;
    update(next);
    try {
      await api(`/admin/products/${encodeURIComponent(p.id)}/catalog`, { method: "PATCH", body: JSON.stringify({ stockCount: next }) });
    } catch (e) {
      update(previous);
      ctx.flash(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  if (p.stockCount === null) return <span className="ad-strong">∞</span>;
  return (
    <span className="ad-inline-stock" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => change(-1)} disabled={busy || (p.stockCount ?? 0) <= 0} aria-label={`One less ${p.name}`}>−</button>
      <b>{p.stockCount}</b>
      <button type="button" onClick={() => change(1)} disabled={busy} aria-label={`One more ${p.name}`}>+</button>
    </span>
  );
}

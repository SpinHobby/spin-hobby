import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Listing { status: "draft" | "active" | "out_of_stock" | "ended" | "error"; sku: string; listingId: string | null; url: string | null; title: string; categoryId: string; condition: string; aspects: Record<string, string[]>; priceCents: number; quantity: number; pushedAt: string | null; error: string | null }
interface ProductEbay { connected: boolean; ready: boolean; canList: boolean; listing: Listing | null; draft: { title: string; description: string | null; priceCents: number | null; stock: number | null; photos: string[]; aspects: Record<string, string[]> } }
interface Category { id: string; name: string; path: string }
interface Aspect { name: string; required: boolean; recommended: boolean; freeText: boolean; values: string[] }

const CONDITIONS: [string, string][] = [["NEW", "New (sealed)"], ["NEW_OTHER", "New, box opened or damaged"], ["LIKE_NEW", "Like new"], ["USED_EXCELLENT", "Used, excellent"], ["USED_VERY_GOOD", "Used, very good"], ["USED_GOOD", "Used, good"]];
const STATUS: Record<Listing["status"], string> = { draft: "Not published", active: "On eBay", out_of_stock: "Sold out (Square has none)", ended: "Ended", error: "Problem" };
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} days ago`;
};

/**
 * A product's eBay listing, in its drawer: list it (the same title, description, photos and price, plus what eBay asks for: a category, the
 * condition and the category's item specifics), revise it, or end it. The quantity is never typed: it is Square's count, kept in step.
 */
export function EbayListing({ ctx, productId }: { ctx: Ctx; productId: string }) {
  const [data, setData] = useState<ProductEbay | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", price: "", condition: "NEW", categoryId: "", categoryName: "" });
  const [aspects, setAspects] = useState<Aspect[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Category[]>([]);

  const load = useCallback(async () => {
    try { setData(await api<ProductEbay>(`/admin/ebay/products/${encodeURIComponent(productId)}`)); } catch (e) { setError(errMsg(e)); }
  }, [productId]);
  useEffect(() => { void load(); }, [load]);

  const loadAspects = async (categoryId: string, start: Record<string, string[]>) => {
    try {
      const list = (await api<{ aspects: Aspect[] }>(`/admin/ebay/categories/${categoryId}/aspects`)).aspects;
      setAspects(list.filter((a) => a.required || a.recommended).slice(0, 14));
      setValues(Object.fromEntries(Object.entries(start).map(([k, v]) => [k, v.join(", ")])));
    } catch (e) { setError(errMsg(e)); }
  };
  const search = async (q: string) => {
    if (q.trim().length < 2) return;
    try { setFound((await api<{ categories: Category[] }>(`/admin/ebay/categories?q=${encodeURIComponent(q)}`)).categories.slice(0, 8)); } catch (e) { setError(errMsg(e)); }
  };

  const start = async () => {
    if (!data) return;
    const l = data.listing;
    setForm({
      title: l?.title ?? data.draft.title,
      description: data.draft.description ?? "",
      price: ((l?.priceCents ?? data.draft.priceCents ?? 0) / 100).toFixed(2),
      condition: l?.condition ?? "NEW",
      categoryId: l?.categoryId ?? "",
      categoryName: l?.categoryId ? `#${l.categoryId}` : "",
    });
    setOpen(true);
    setError("");
    if (l?.categoryId) await loadAspects(l.categoryId, l.aspects);
    else {
      setValues(Object.fromEntries(Object.entries(data.draft.aspects).map(([k, v]) => [k, v.join(", ")])));
      setQuery(data.draft.title);
      await search(data.draft.title);
    }
  };
  const pick = async (c: Category) => {
    setForm((f) => ({ ...f, categoryId: c.id, categoryName: c.path }));
    setFound([]);
    await loadAspects(c.id, { ...data!.draft.aspects, ...Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.split(",").map((x) => x.trim()).filter(Boolean)])) });
  };

  const missing = aspects.filter((a) => a.required && !values[a.name]?.trim()).map((a) => a.name);
  const save = async () => {
    setError("");
    const cents = Math.round(Number(form.price) * 100);
    if (!form.categoryId) { setError("Choose an eBay category"); return; }
    if (!Number.isFinite(cents) || cents < 99) { setError("Enter a price of at least $0.99"); return; }
    if (missing.length) { setError(`eBay needs: ${missing.join(", ")}`); return; }
    setBusy(data?.listing ? "Updating the eBay listing…" : "Listing on eBay…");
    try {
      const body = {
        title: form.title, description: form.description || null, categoryId: form.categoryId, condition: form.condition, priceCents: cents,
        aspects: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.split(",").map((x) => x.trim()).filter(Boolean)]).filter(([, v]) => v.length)),
      };
      setData(await api<ProductEbay>(`/admin/ebay/products/${encodeURIComponent(productId)}`, { method: "PUT", body: JSON.stringify(body) }));
      setOpen(false);
      ctx.flash(data?.listing ? "eBay listing updated" : "Listed on eBay");
    } catch (e) { setError(errMsg(e)); } finally { setBusy(""); }
  };
  const end = async () => {
    if (!window.confirm("End this eBay listing? eBay stops selling it. You can list it again later.")) return;
    setBusy("Ending…");
    try { setData(await api<ProductEbay>(`/admin/ebay/products/${encodeURIComponent(productId)}/end`, { method: "POST" })); ctx.flash("eBay listing ended"); }
    catch (e) { setError(errMsg(e)); } finally { setBusy(""); }
  };

  if (!data) return error ? <section className="ad-ebaybox"><span className="ad-label" style={{ margin: 0 }}>eBay</span> <span className="ad-error">{error}</span></section> : null;
  const l = data.listing;
  const live = l && (l.status === "active" || l.status === "out_of_stock");
  return (
    <section className="ad-ebaybox" aria-label="eBay">
      <div className="ad-between">
        <span className="ad-label" style={{ margin: 0 }}>eBay {l && <span className={`sh-chip ad-ebaybox__state is-${l.status}`}>{STATUS[l.status]}</span>}</span>
        <span style={{ display: "inline-flex", gap: 12 }}>
          {l?.url && live && <a className="ad-link" href={l.url} target="_blank" rel="noreferrer">View on eBay ↗</a>}
          {data.connected && data.ready && data.canList && !open && <button type="button" className="ad-link" onClick={() => void start()} disabled={!!busy}>{live ? "Edit listing" : l ? "List again" : "List on eBay"}</button>}
          {live && !open && <button type="button" className="ad-link" style={{ color: "var(--red)" }} onClick={() => void end()} disabled={!!busy}>End</button>}
        </span>
      </div>
      {!data.connected && <span className="ad-muted ad-sm">eBay is not connected. An owner can connect it in Settings → eBay.</span>}
      {data.connected && !data.ready && <span className="ad-muted ad-sm">Finish the eBay setup in Settings (policies and location) to list products.</span>}
      {data.connected && !data.canList && <span className="ad-muted ad-sm">Only products kept in Square can go on eBay (their stock is what stays in step).</span>}
      {l && live && (
        <span className="ad-muted ad-sm">
          {l.quantity} on eBay (Square's count, kept in step · last sent {ago(l.pushedAt)}) · ${(l.priceCents / 100).toFixed(2)} · SKU {l.sku}
        </span>
      )}
      {l?.error && <span className="ad-sm" style={{ color: "var(--red)" }}>{l.error}</span>}

      {open && (
        <div className="ad-ebaybox__form">
          <label className="ad-field"><span className="ad-field__top">Title <small className="ad-muted">{form.title.length}/80</small></span>
            <input className="sh-input" maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <div className="ad-field">
            <span className="ad-field__top">Category</span>
            {form.categoryId && <div className="ad-sm"><b>{form.categoryName}</b> <button type="button" className="ad-link" onClick={() => setForm({ ...form, categoryId: "", categoryName: "" })}>change</button></div>}
            {!form.categoryId && (
              <>
                <span style={{ display: "flex", gap: 8 }}>
                  <input className="sh-input" placeholder="Search eBay categories (e.g. anime figure)" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void search(query); } }} />
                  <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => void search(query)}>Search</button>
                </span>
                {found.map((c) => <button key={c.id} type="button" className="ad-ebaybox__cat" onClick={() => void pick(c)}>{c.path}</button>)}
              </>
            )}
          </div>
          <div className="ad-imports__row">
            <label className="ad-field"><span className="ad-field__top">Condition</span>
              <select className="sh-input" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{CONDITIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
            <label className="ad-field"><span className="ad-field__top">Price (CAD)</span>
              <input className="sh-input" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            <div className="ad-field"><span className="ad-field__top">Quantity</span><span className="ad-sm" style={{ paddingTop: 8 }}>{data.draft.stock ?? 0} (Square's count, always in step)</span></div>
          </div>
          {aspects.length > 0 && (
            <div className="ad-ebaybox__aspects">
              <span className="ad-field__top">Item specifics <small className="ad-muted">(* eBay requires it; separate several with commas)</small></span>
              {aspects.map((a) => (
                <label key={a.name} className={`ad-field ${a.required && !values[a.name]?.trim() ? "has-error" : ""}`}>
                  <span className="ad-field__top">{a.name}{a.required ? " *" : ""}</span>
                  <input className="sh-input" list={`asp-${productId}-${a.name}`} value={values[a.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [a.name]: e.target.value }))} />
                  <datalist id={`asp-${productId}-${a.name}`}>{a.values.map((v) => <option key={v} value={v} />)}</datalist>
                </label>
              ))}
            </div>
          )}
          <label className="ad-field"><span className="ad-field__top">Description</span>
            <textarea className="sh-input" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <div className="ad-muted ad-sm">{data.draft.photos.length ? `${data.draft.photos.length} photo${data.draft.photos.length === 1 ? "" : "s"} go to eBay: the ones picked for eBay (the “eBay” chips above), or else the product's photos.` : "No photo eBay can use yet: add one above first."}</div>
          <div className="ad-imports__actions">
            <button type="button" className="sh-btn ad-btn-sm" onClick={() => void save()} disabled={!!busy}>{busy || (live ? "Update listing" : "List on eBay")}</button>
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setOpen(false)} disabled={!!busy}>Cancel</button>
          </div>
        </div>
      )}
      {error && <span className="ad-error" role="alert">{error}</span>}
    </section>
  );
}

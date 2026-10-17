import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { BackgroundChoice, BackgroundPreview } from "./Backgrounds";
import { useBackgrounds, type Background } from "./photoBackgrounds";
import { ListingUploads } from "./ListingUploads";
import { SeriesSelect } from "./SeriesSelect";
import { findSeries, similarSeries, useSeriesList } from "./seriesList";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

type Status = "draft" | "added" | "rejected";
interface Draft {
  id: string; status: Status; title: string; description: string | null; category: string | null; series: string | null;
  imageUrl: string | null; cutoutUrl?: string | null; productId: string | null; matches?: ProductMatch[]; rejectReason: string | null; createdAt: string;
  details: { official?: { imageUrl: string; pageUrl: string; site: string } | null; market?: Market | null; flags?: string[]; highlights?: string[]; unsupported?: string[]; sources?: string[]; lookup?: { state: string; read: string | null; detail: string } | null };
}
interface ProductMatch { id: string; name: string; stockCount: number | null; imageUrl: string | null; hidden: boolean; score: number }
interface MarketListing { title: string; url: string; site: string; price: number; currency: "CAD" | "USD"; cad: number; condition: "new" | "used" | null; canadian: boolean }
interface Market { low: number; median: number; high: number; count: number; canadian: number; rate: number; rateIsEstimate: boolean; note: string | null; listings: MarketListing[] }
const cad = (n: number) => `$${n.toFixed(2)}`;
interface Connection { id: string; label: string; createdAt: string; lastUsedAt: string | null; revoked: boolean }

const LABEL: Record<Status, string> = { draft: "To review", added: "Added", rejected: "Rejected" };

/**
 * Drafts sent by Gleamshelf, the photo studio app (it cuts out, cleans and describes a product photo on the shop's own computer). Gleamshelf never
 * guesses a price or stock: a person types them here, then adds the product (the same add as Products) or rejects the draft.
 */
export function ImportsScreen({ ctx }: { ctx: Ctx }) {
  const [status, setStatus] = useState<Status>("draft");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [counts, setCounts] = useState<Record<Status, number>>({ draft: 0, added: 0, rejected: 0 });
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [connect, setConnect] = useState(false);
  const [upload, setUpload] = useState(false);
  const series = useSeriesList();
  const backgrounds = useBackgrounds();

  const load = useCallback(async () => {
    try {
      const r = await api<{ imports: Draft[]; counts: Record<Status, number>; categories: string[] }>(`/admin/imports?status=${status}`);
      setDrafts(r.imports); setCounts(r.counts); setCategories(r.categories);
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setLoaded(true); }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <div className="ad-toolbar">
        <div className="ad-muted ad-sm" style={{ flex: "1 1 320px" }}>
          Product drafts from <b>Gleamshelf</b>: a cleaned photo, a title, description, category and series, written on the shop's own computer from what is printed on the box and what the web says about it. Check each against the box, <b>type the price and stock</b>, then add it.
        </div>
        <button type="button" className="sh-btn ad-btn-sm" onClick={() => setUpload((v) => !v)}>{upload ? "Hide" : "Make drafts from photos"}</button>
        {ctx.isOwner && <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setConnect((v) => !v)}>{connect ? "Hide" : "Connect the app"}</button>}
      </div>
      {upload && <ListingUploads ctx={ctx} onChanged={() => { void load(); }} />}
      {connect && ctx.isOwner && <ConnectPanel ctx={ctx} />}

      <div className="ad-chips" role="group" aria-label="Drafts">
        {(Object.keys(LABEL) as Status[]).map((s) => (
          <button key={s} type="button" className={`sh-chip ${status === s ? "is-active" : ""}`} onClick={() => setStatus(s)}>{LABEL[s]} · {counts[s]}</button>
        ))}
      </div>

      {!loaded && <div className="ad-card"><div className="ad-empty">Loading…</div></div>}
      {loaded && drafts.length === 0 && (
        <section className="ad-card"><div className="ad-empty">
          {status === "draft" ? "Nothing to review. Drafts appear here when the Gleamshelf app sends them." : `No ${LABEL[status].toLowerCase()} drafts.`}
        </div></section>
      )}
      <div className="ad-imports">
        {drafts.map((d) => (
          d.status === "draft"
            ? <DraftCard key={d.id} draft={d} categories={categories} series={series.list} backgrounds={backgrounds.list} ctx={ctx} onDone={() => { void load(); series.reload(); }} />
            : <DoneCard key={d.id} draft={d} />
        ))}
      </div>
    </>
  );
}

/**
 * What this product asks for in North America, read from real listings (Canada first, US prices converted to CAD): a range and the links behind it. Asking prices, not sold prices,
 * and never a price to use blindly: "Use" appears only when at least three listings agree, and it only fills the price box for the person to check.
 */
function MarketPrice({ market, onUse }: { market: Market; onUse: (price: string) => void }) {
  const enough = market.count >= 3;
  return (
    <div className="ad-imports__market">
      <div>
        <b>North American market price</b>: {cad(market.low)}{market.high !== market.low ? ` – ${cad(market.high)}` : ""} CAD
        <span className="ad-muted"> · {enough ? `typically ${cad(market.median)}` : "too few to suggest a price"} · {market.count} listing{market.count === 1 ? "" : "s"}{market.canadian ? `, ${market.canadian} Canadian` : ""}</span>
        {enough && <button type="button" className="sh-chip" onClick={() => onUse(market.median.toFixed(2))}>Use {cad(market.median)}</button>}
      </div>
      {market.note && <div className="ad-muted ad-sm">{market.note}</div>}
      <details className="ad-sm">
        <summary>See the listings (asking prices{market.rate ? `, US dollars at ${market.rate.toFixed(2)}${market.rateIsEstimate ? ", an estimate" : ""}` : ""})</summary>
        <ul>{market.listings.map((l) => (
          <li key={l.url}><a href={l.url} target="_blank" rel="noreferrer">{l.site}</a> {l.currency === "USD" ? `US$${l.price.toFixed(2)} ≈ ${cad(l.cad)}` : cad(l.cad)}{l.condition === "used" ? " · used" : ""}{l.canadian ? " · Canada" : ""} <span className="ad-muted">{l.title}</span></li>
        ))}</ul>
      </details>
    </div>
  );
}

function Evidence({ d }: { d: Draft }) {
  const lookup = d.details.lookup;
  const flags = d.details.flags ?? [];
  const sources = d.details.sources ?? [];
  return (
    <div className="ad-imports__evidence">
      {lookup && (
        <div className={`ad-imports__found is-${lookup.state}`}>
          <b>{lookup.state === "found" ? "✓ Product found online" : lookup.state === "off" ? "Web lookup off" : "✗ Not found online"}</b>
          {lookup.read && <span> · read as {lookup.read}</span>}
        </div>
      )}
      {flags.length > 0 && <ul className="ad-imports__flags">{flags.map((f) => <li key={f}>{f}</li>)}</ul>}
      {(d.details.unsupported?.length ?? 0) > 0 && <div className="ad-muted ad-sm">Not found, add by hand: {d.details.unsupported!.join("; ")}</div>}
      {sources.length > 0 && (
        <div className="ad-muted ad-sm">Facts from: {sources.slice(0, 4).map((u, i) => { let host = u; try { host = new URL(u).hostname.replace(/^www\./, ""); } catch { /* keep */ } return <span key={u}>{i > 0 && ", "}<a href={u} target="_blank" rel="noreferrer">{host}</a></span>; })}</div>
      )}
    </div>
  );
}

function DraftCard({ draft, categories, series, backgrounds, ctx, onDone }: { draft: Draft; categories: string[]; series: ReturnType<typeof useSeriesList>["list"]; backgrounds: Background[]; ctx: Ctx; onDone: () => void }) {
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description ?? "");
  const [category, setCategory] = useState(draft.category ?? "");
  const [seriesName, setSeriesName] = useState(draft.series ?? "");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [hidden, setHidden] = useState(true);
  // which photo goes on the product: the shop's own (the default), the maker's official one, or both; the official one is never used without a click
  const [photo, setPhoto] = useState<"own" | "official" | "both">("own");
  const official = draft.details.official ?? null;
  // the background the shop's own photo goes on (null: white, as the photo computer made it); the shop's default until someone picks another
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const background = draft.cutoutUrl ? (picked !== undefined ? picked : (backgrounds.find((b) => b.isDefault)?.id ?? null)) : null;
  const backgroundRow = backgrounds.find((b) => b.id === background) ?? null;
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const cents = Math.round(Number(price) * 100);
  const stockNum = stock.trim() === "" ? null : Number(stock);
  const errors: Record<string, string> = {};
  if (!title.trim()) errors.title = "Required";
  if (!price || !Number.isFinite(cents) || cents <= 0) errors.price = "Enter a price";
  if (stockNum !== null && (!Number.isInteger(stockNum) || stockNum < 0)) errors.stock = "Whole number";

  const add = async () => {
    setTouched(true);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await api(`/admin/imports/${draft.id}/add`, { method: "POST", body: JSON.stringify({
        name: title.trim(), description: description.trim() || null, category: category.trim() || null, series: seriesName.trim() || null,
        priceCents: cents, stockCount: stockNum, hidden, imageUrls: [], photo: official ? photo : "own", ...(draft.cutoutUrl ? { backgroundId: background } : {}),
      }) });
      ctx.flash(`${title.trim()} added${hidden ? " (hidden from the website)" : ""}`);
      ctx.reload();
      onDone();
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(false); }
  };
  const restock = async (m: ProductMatch) => {
    setTouched(true);
    if (stockNum === null || stockNum < 1 || errors.stock) { ctx.flash("Type how many you have in “In stock” first"); return; }
    setBusy(true);
    try {
      const r = await api<{ stockCount: number }>(`/admin/imports/${draft.id}/restock`, { method: "POST", body: JSON.stringify({ productId: m.id, quantity: stockNum }) });
      ctx.flash(`Added ${stockNum} to ${m.name} (now ${r.stockCount} in stock)`);
      ctx.reload();
      onDone();
    } catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(false); }
  };
  const reject = async () => {
    const reason = window.prompt("Why reject it? (optional)", "") ?? null;
    if (reason === null) return;
    setBusy(true);
    try { await api(`/admin/imports/${draft.id}/reject`, { method: "POST", body: JSON.stringify({ reason: reason.trim() || null }) }); onDone(); }
    catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(false); }
  };

  const shown = (k: string) => (touched ? errors[k] : undefined);
  return (
    <section className="ad-card ad-imports__card">
      <div className="ad-imports__photo">
        {draft.imageUrl
          ? <div className={official && photo === "official" ? "is-unused" : ""}><BackgroundPreview cutoutUrl={draft.cutoutUrl ?? null} background={backgroundRow} fallbackUrl={draft.imageUrl} alt={draft.title} /></div>
          : <div className="ad-empty">No photo</div>}
        {draft.cutoutUrl && backgrounds.length > 0 && photo !== "official" && (
          <BackgroundChoice backgrounds={backgrounds} value={background} onChange={setPicked} disabled={busy} label="Background for our photo" />
        )}
        {official && (
          <div className="ad-imports__official">
            <img src={official.imageUrl} alt={`Official photo of ${draft.title}`} className={photo === "own" ? "is-unused" : ""} />
            <div className="ad-muted ad-sm">Official photo from <a href={official.pageUrl} target="_blank" rel="noreferrer">{official.site}</a>. It belongs to the maker: use it only if that is OK for your shop.</div>
            <div className="ad-imports__photochoice" role="radiogroup" aria-label="Photo to use">
              {([["own", "Our photo"], ["official", "Official photo"], ["both", "Both"]] as const).map(([value, label]) => (
                <label key={value} className="ad-check"><input type="radio" name={`photo-${draft.id}`} checked={photo === value} onChange={() => setPhoto(value)} /> {label}</label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="ad-imports__form">
        <label className={`ad-field ${shown("title") ? "has-error" : ""}`}><span className="ad-field__top">Title {shown("title") && <small>{errors.title}</small>}</span>
          <input className="sh-input" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="ad-field"><span className="ad-field__top">Description</span>
          <textarea className="sh-input" rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="ad-imports__row">
          <label className="ad-field"><span className="ad-field__top">Category</span>
            <input className="sh-input" list={`cat-${draft.id}`} value={category} maxLength={120} onChange={(e) => setCategory(e.target.value)} />
            <datalist id={`cat-${draft.id}`}>{categories.map((c) => <option key={c} value={c} />)}</datalist></label>
          <SeriesSelect value={seriesName} onChange={setSeriesName} list={series} />
        </div>
        {seriesName.trim() && !findSeries(seriesName, series) && (
          <div className="ad-imports__newseries" role="status">
            <b>New series: “{seriesName.trim()}”</b> is not in your series list, so adding this product will create it.
            {similarSeries(seriesName, series).length > 0 && (
              <span> Is it the same as <span className="ad-imports__similar">{similarSeries(seriesName, series).map((s) => (
                <button key={s.id} type="button" className="sh-chip" onClick={() => setSeriesName(s.name)}>Use “{s.name}”</button>
              ))}</span></span>
            )}
          </div>
        )}
        {(draft.matches?.length ?? 0) > 0 && (
          <div className="ad-imports__dupes" role="status">
            <b>Already in the shop?</b> This looks like a product you already list. If it is the same item, add these to its stock instead of making a second listing.
            {draft.matches!.map((m) => (
              <div key={m.id} className="ad-imports__dupe">
                {m.imageUrl ? <img src={m.imageUrl} alt="" /> : <span className="ad-imports__dupe-noimg" />}
                <span className="ad-imports__dupe-name">{m.name}<small className="ad-muted"> · {m.stockCount ?? 0} in stock{m.hidden ? " · hidden" : ""}</small></span>
                <button type="button" className="sh-btn ad-btn-sm" disabled={busy} onClick={() => restock(m)}>Add {stockNum && stockNum > 0 ? stockNum : ""} to its stock</button>
              </div>
            ))}
          </div>
        )}
        <Evidence d={draft} />
        {draft.details.market && <MarketPrice market={draft.details.market} onUse={setPrice} />}
        <div className="ad-imports__row ad-imports__buy">
          <label className={`ad-field ${shown("price") ? "has-error" : ""}`}><span className="ad-field__top">Price (CAD) {shown("price") && <small>{errors.price}</small>}</span>
            <input className="sh-input" inputMode="decimal" placeholder="e.g. 45.00" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
          <label className={`ad-field ${shown("stock") ? "has-error" : ""}`}><span className="ad-field__top">In stock {shown("stock") && <small>{errors.stock}</small>}</span>
            <input className="sh-input" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} /></label>
          <label className="ad-check"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Keep off the website until I check it</label>
        </div>
        <div className="ad-imports__actions">
          <button type="button" className="sh-btn ad-add-btn" onClick={add} disabled={busy}>{busy ? "Working…" : "Add to the shop"}</button>
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={reject} disabled={busy}>Reject</button>
        </div>
      </div>
    </section>
  );
}

function DoneCard({ draft }: { draft: Draft }) {
  return (
    <section className="ad-card ad-imports__card ad-imports__card--done">
      <div className="ad-imports__form">
        <b>{draft.title}</b>
        <div className="ad-muted ad-sm">{draft.status === "added" ? "Added to the shop" : `Rejected${draft.rejectReason ? `: ${draft.rejectReason}` : ""}`} · {new Date(draft.createdAt).toLocaleDateString()}</div>
      </div>
    </section>
  );
}

function ConnectPanel({ ctx }: { ctx: Ctx }) {
  const [code, setCode] = useState<{ code: string; expiresAt: string; server: string } | null>(null);
  const [apps, setApps] = useState<Connection[]>([]);
  const refresh = useCallback(() => api<{ connections: Connection[] }>("/admin/imports/connections").then((r) => setApps(r.connections.filter((c) => !c.revoked))).catch(() => undefined), []);
  useEffect(() => { void refresh(); }, [refresh]);
  const show = async () => {
    try { setCode(await api<{ code: string; expiresAt: string; server: string }>("/admin/imports/pairing", { method: "POST" })); }
    catch (e) { ctx.flash(errMsg(e)); }
  };
  const disconnect = async (id: string) => {
    if (!window.confirm("Disconnect this app? It will stop being able to send drafts.")) return;
    try { await api(`/admin/imports/connections/${id}`, { method: "DELETE" }); void refresh(); }
    catch (e) { ctx.flash(errMsg(e)); }
  };
  return (
    <section className="ad-card ad-imports__connect">
      <div>
        <div className="ad-label">Connect a Gleamshelf app</div>
        <p className="ad-muted ad-sm">In the Gleamshelf app, choose <b>Connect to a shop</b> and enter the address and the code shown below. The code works once, for 10 minutes.</p>
        <button type="button" className="sh-btn ad-btn-sm" onClick={show}>Show a new code</button>
        {code && <div className="ad-imports__code" aria-live="polite">{code.code}<small>address {code.server} · expires {new Date(code.expiresAt).toLocaleTimeString()}</small></div>}
      </div>
      <div>
        <div className="ad-label">Connected apps</div>
        {apps.length === 0 && <div className="ad-muted ad-sm">None yet.</div>}
        {apps.map((a) => (
          <div key={a.id} className="ad-imports__app">
            <span><b>{a.label}</b> <span className="ad-muted ad-sm">{a.lastUsedAt ? `last used ${new Date(a.lastUsedAt).toLocaleString()}` : "never used"}</span></span>
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => disconnect(a.id)}>Disconnect</button>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Dispatch, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { dayLabel, discountPct, money, monthLabel, relativeAge, shortDate, statusLabel } from "../format";
import { ProductCard, type CardActions } from "../storefront/ProductViews";
import { HeroRow } from "../storefront/Storefront";
import { useEscape } from "../hooks";
import type { Availability, HeroSlide, Order, Product, StoreEvent, StoreSettings } from "../types";
import { AddProductDrawer, InlineStock, PhotoUploader, StockField } from "./Merch";
import { ProductFilters } from "./ProductFilters";
import {
  activeFilterCount, densityFor, EMPTY_FILTERS, filtersFromShortcut, loadPrefs, savePrefs, STATE_META, useCatalog, useDebounced, useElementWidth,
  type CatalogFilters, type Sort, type SortDir, type SortKey,
} from "./catalog";
import { CategorySelect } from "./Categories";
import { buildTree, indentLabel } from "../categoryTree";
import { addressLine, customerName, ORDER_STATUS, type AdminData, type Screen } from "./data";
import { photo } from "../photo";

export interface Ctx {
  data: AdminData;
  setData: Dispatch<SetStateAction<AdminData>>;
  reload: () => void;
  isOwner: boolean;
  flash: (m: string) => void;
  go: (s: Screen, extra?: { productFilter?: string; orderTab?: string }) => void;
  productFilter: string;
  setProductFilter: (f: string) => void;
  orderTab: string;
  setOrderTab: (t: string) => void;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function Card({ title, action, children, className = "" }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`ad-card ${className}`}>
      <div className="ad-card__head"><span>{title}</span>{action}</div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="ad-empty">{children}</div>;
}

function Thumb({ src, size = 44 }: { src?: string | null; size?: number }) {
  return (
    <div className={`sh-thumb ${src ? "" : "sh-ph sh-ph--xs"}`} style={{ width: size, height: size, borderRadius: 9 }}>
      {src && <img {...photo(src, size * 2)} alt="" loading="lazy" />}
    </div>
  );
}

const PREVIEW_ACTIONS: CardActions = {
  currency: "CAD", inCart: () => false, wished: () => false, onAdd: () => {}, onNotify: () => {}, onWish: () => {}, onOpen: () => {},
};

/** Mirrors the server's product_status() so previews match what shoppers will see after saving. */
function previewStatus(availability: Availability, stock: number | null, orderBy: string | null, lowThreshold: number): Product["status"] {
  if (availability === "preorder") return orderBy && Date.parse(orderBy) < Date.now() - 86_400_000 ? "closed" : "pre";
  if (stock == null) return "in";
  if (stock <= 0) return "out";
  return stock <= lowThreshold ? "low" : "in";
}

function StorefrontPreview({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`ad-preview ${className}`}>
      <div className="ad-preview__label"><span className="ad-dot" style={{ background: "var(--teal)" }} />{label}</div>
      <div className="sf ad-preview__stage">{children}</div>
    </div>
  );
}

// ================================================================ Dashboard
export function DashboardScreen({ ctx }: { ctx: Ctx }) {
  const d = ctx.data.dashboard;
  const loading = ctx.data.loading;
  const toShip = ctx.data.orders.filter((o) => o.status === "paid" || o.status === "fulfilled");
  const ordersToday = d?.ordersToday ?? 0;
  const kpis = [
    { label: "Today's sales", value: money(d?.salesTodayCents ?? 0), note: `${ordersToday} order${ordersToday === 1 ? "" : "s"} today`, color: "var(--muted)", go: () => ctx.go("Orders") },
    { label: "Orders to ship", value: String(d?.toShip ?? 0), note: d?.toShip ? `Oldest ${d.oldestToShipDays} day${d.oldestToShipDays === 1 ? "" : "s"}` : "All caught up", color: d?.toShip ? "var(--red)" : "var(--teal)", go: () => ctx.go("Orders", { orderTab: "To ship" }) },
    { label: "Open pre-orders", value: String(d?.preorderProducts ?? 0), note: `${d?.reservedUnits ?? 0} units reserved`, color: "var(--blue)", go: () => ctx.go("Products", { productFilter: "Pre-order" }) },
    { label: "Low / sold out", value: String(d?.lowStock ?? 0), note: `${d?.alertsWaiting ?? 0} restock alerts waiting`, color: "var(--teal)", go: () => ctx.go("Products", { productFilter: "Low / sold out" }) },
  ];
  const openOrder = (id: number) => { ctx.go("Orders"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("ad:open-order", { detail: id })), 0); };

  return (
    <>
      <div className="ad-kpis">
        {kpis.map((k) => (
          <button key={k.label} type="button" className="ad-kpi" onClick={k.go}>
            <span className="ad-kpi__label">{k.label}</span>
            {loading ? <span className="sh-skeleton" style={{ height: 34, width: "60%" }} /> : <span className="ad-kpi__value sh-display">{k.value}</span>}
            <span className="ad-kpi__note" style={{ color: k.color }}>{k.note}</span>
          </button>
        ))}
      </div>
      <div className="ad-dash">
        <Card title="Orders to ship" action={<button type="button" className="ad-link" onClick={() => ctx.go("Orders")}>All orders →</button>}>
          {toShip.length === 0 ? <Empty>{loading ? "Loading…" : "Nothing waiting to ship. Nice."}</Empty> : toShip.slice(0, 6).map((o) => (
            <button key={o.id} type="button" className="ad-line ad-line--btn" onClick={() => openOrder(o.id)}>
              <span className="ad-line__id">#{o.id}</span>
              <span className="ad-line__main">{customerName(o)} · {(o.order_items ?? []).map((i) => i.name).join(", ") || o.billing_email}</span>
              <span className="ad-muted ad-sm">{relativeAge(o.created_at)}</span>
              <span className="ad-line__total">{money(o.total_cents)}</span>
            </button>
          ))}
        </Card>
        <div className="ad-stack">
          <Card title="Low stock" action={<button type="button" className="ad-link" onClick={() => ctx.go("Products", { productFilter: "Low / sold out" })}>View →</button>}>
            {(d?.lowStockList ?? []).length === 0 ? <Empty>{loading ? "Loading…" : "Stock levels look healthy."}</Empty> : d!.lowStockList.slice(0, 5).map((p) => {
              const full = ctx.data.products.find((x) => x.id === p.id);
              const qty = p.stock_count ?? 0;
              return (
                <div key={p.id} className="ad-line">
                  <span className="ad-line__main">{p.name}</span>
                  <span className="ad-strong ad-sm" style={{ color: qty <= 0 ? "var(--muted)" : "var(--red)" }}>{qty <= 0 ? "Sold out" : `${qty} left`}</span>
                  {full?.alertsWaiting !== undefined && <span className="ad-muted ad-sm">{full.alertsWaiting} alerts</span>}
                </div>
              );
            })}
          </Card>
          <Card title="Pre-orders closing soon" action={<button type="button" className="ad-link" onClick={() => ctx.go("Products", { productFilter: "Pre-order" })}>View →</button>}>
            {(d?.closingPreorders ?? []).length === 0 ? <Empty>{loading ? "Loading…" : "No pre-orders with an order-by date."}</Empty> : d!.closingPreorders.slice(0, 4).map((p) => (
              <div key={p.id} className="ad-line">
                <span className="ad-line__main">{p.name}</span>
                <span className="ad-strong ad-sm" style={{ color: "var(--red)" }}>closes {dayLabel(p.order_by_date)}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}

// ================================================================ Products
async function patchProduct(ctx: Ctx, id: string, body: Record<string, unknown>) {
  await api(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
}

const PAGE_SIZES = [25, 50, 100];
const ago = (iso: string) => { const a = relativeAge(iso); return a === "just now" ? a : `${a} ago`; };
/** The first click on a column sorts the natural way: A→Z, cheapest and lowest stock first, newest first. */
const FIRST_DIR: Record<SortKey, SortDir> = { name: "asc", category: "asc", price: "asc", stock: "asc", status: "asc", release: "asc", updated: "desc", created: "desc", alerts: "desc" };
const stockStatus = (stock: number | null, low: number) => (stock === null ? "in" : stock <= 0 ? "out" : stock <= low ? "low" : "in");

function SortHeader({ label, k, sort, onSort }: { label: string; k: SortKey; sort: Sort; onSort: (s: Sort) => void }) {
  const on = sort.key === k;
  return (
    <span role="columnheader" aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={`ad-sort ${on ? "is-active" : ""}`} onClick={() => onSort(on ? { key: k, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: k, dir: FIRST_DIR[k] })}>
        {label}<span aria-hidden>{on ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}</span>
      </button>
    </span>
  );
}

/** One product as a tappable card, for narrow screens where a table would force sideways scrolling. */
function ProductCardRow({ ctx, p, tree, selected, open, onSelect, onOpen, onFeature, onStock }: {
  ctx: Ctx; p: Product; tree: ReturnType<typeof buildTree>; selected: boolean; open: boolean;
  onSelect: () => void; onOpen: () => void; onFeature: () => void; onStock: (stock: number | null) => void;
}) {
  const st = STATE_META[p.state ?? "in"];
  const place = p.categoryId ? tree.path(p.categoryId).join(" › ") : p.category ?? "";
  const sub = [p.series, p.janCode, p.sku].filter(Boolean).join(" · ");
  const stock = p.source === "manual" && p.state !== "retired" ? <InlineStock ctx={ctx} p={p} onChange={onStock} /> : p.stockCount == null ? "∞" : p.stockCount;
  return (
    <div role="listitem" tabIndex={0} className={`ad-pcard ${open ? "is-selected" : ""} ${selected ? "is-checked" : ""} ${p.state === "retired" ? "is-retired" : ""}`}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onOpen(); }} aria-label={`${p.name}, ${st.label}. Tap to edit.`}>
      <label className="ad-pcard__check" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${p.name}`} />
      </label>
      <Thumb src={p.images[0]} size={60} />
      <div className="ad-pcard__body">
        <div className="ad-pcard__name">{p.name}</div>
        {(sub || p.source === "manual" || (p.variationCount ?? 0) > 1) && (
          <div className="ad-pcard__sub">
            {p.source === "manual" && <span className="ad-tag-manual">Manual</span>}
            {(p.variationCount ?? 0) > 1 && <span className="ad-tag-var">{p.variationCount} variations</span>}
            {sub}
          </div>
        )}
        <div className="ad-pcard__facts">
          <b>{p.priceCents == null ? "—" : money(p.priceCents)}</b>
          <span className="ad-pcard__stock">Stock {stock}{(p.alertsWaiting ?? 0) > 0 && <span className="ad-alert-pill">🔔 {p.alertsWaiting}</span>}</span>
          <span className="sh-badge" style={{ background: st.color }}>{st.badge}</span>
        </div>
        {(place || p.updatedAt || (p.status === "pre" && p.state === "pre")) && (
          <div className="ad-pcard__meta">
            {[place, p.status === "pre" && p.state === "pre" ? `${monthLabel(p.releaseMonth)} · order by ${dayLabel(p.orderByDate)}` : "", p.updatedAt ? `Updated ${ago(p.updatedAt)}` : ""].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
      <button type="button" className={`ad-star ${p.isFeatured ? "is-on" : ""}`} aria-pressed={!!p.isFeatured} aria-label={p.isFeatured ? `Remove ${p.name} from featured` : `Feature ${p.name}`}
        onClick={(e) => { e.stopPropagation(); onFeature(); }}>{p.isFeatured ? "★" : "☆"}</button>
    </div>
  );
}

export function ProductsScreen({ ctx }: { ctx: Ctx }) {
  const [filters, setFilters] = useState<CatalogFilters>(() => filtersFromShortcut(ctx.productFilter) ?? EMPTY_FILTERS);
  const [prefs] = useState(loadPrefs);
  const [sort, setSort] = useState<Sort>(prefs.sort);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(prefs.pageSize);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // kept across pages and filter changes
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const drawerDirty = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const tree = useMemo(() => buildTree(ctx.data.categories), [ctx.data.categories]);

  // Layout follows the room the list actually has (the sidebar takes some), not the window: cards when it's tight,
  // otherwise columns drop away one by one instead of forcing a sideways scroll.
  const width = useElementWidth(listRef);
  const density = densityFor(width);
  const compact = density === "cards";

  // The dashboard's shortcuts ("Low / sold out") are one-shot: used for the first view, then cleared so they
  // don't re-apply on the next visit.
  const shortcut = ctx.productFilter;
  const clearShortcut = ctx.setProductFilter;
  useEffect(() => { if (shortcut !== "All") clearShortcut("All"); }, [shortcut, clearShortcut]);
  useEffect(() => { savePrefs({ sort, pageSize }); }, [sort, pageSize]);

  const q = useDebounced(filters.q);
  const min = useDebounced(filters.min);
  const max = useDebounced(filters.max);
  const effective = useMemo(() => ({ ...filters, q, min, max }), [filters, q, min, max]);
  const { data, loading, error, refresh, patch } = useCatalog(effective, sort, page, pageSize);

  const changeFilters = (change: Partial<CatalogFilters>) => { setFilters((f) => ({ ...f, ...change })); setPage(0); };
  const changeSort = (next: Sort) => { setSort(next); setPage(0); };
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const counts = data?.counts ?? null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = activeFilterCount(filters) > 0;

  // After deleting or filtering away the last rows of a page, step back instead of showing an empty page.
  useEffect(() => { if (data && !rows.length && total > 0 && page > 0) setPage(Math.max(0, pages - 1)); }, [data, rows.length, total, page, pages]);

  // Turning the page brings the top of the list back into view, like any paginated list.
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) { firstPage.current = false; return; }
    listRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [page]);

  const allSelected = rows.length > 0 && rows.every((p) => selected.has(p.id));
  const toggleSelect = (id: string) => setSelected((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const toggleAll = () => setSelected((cur) => { const next = new Set(cur); for (const p of rows) { if (allSelected) next.delete(p.id); else next.add(p.id); } return next; });
  const bulkMove = async () => {
    if (!bulkTarget) return;
    const categoryId = bulkTarget === "none" ? null : bulkTarget;
    setBulkBusy(true);
    try {
      const res = await api<{ updated: number }>("/admin/products/bulk-category", { method: "POST", body: JSON.stringify({ ids: [...selected], categoryId }) });
      ctx.flash(`Moved ${res.updated} product${res.updated === 1 ? "" : "s"} ${categoryId ? `to ${tree.path(categoryId).join(" › ")}` : "out of their category"}`);
      setSelected(new Set()); setBulkTarget("");
      refresh();
      ctx.reload();
    } catch (e) { ctx.flash(errMsg(e)); } finally { setBulkBusy(false); }
  };
  const open = rows.find((p) => p.id === openId) ?? null;

  // Keep the dashboard's and homepage's copy of the product in step with what was just changed here.
  const update = (id: string, change: Partial<Product>) => {
    patch(id, change);
    ctx.setData((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...change } : p)) }));
  };

  const toggleFeatured = async (p: Product) => {
    const next = !p.isFeatured;
    update(p.id, { isFeatured: next });
    try { await patchProduct(ctx, p.id, { is_featured: next }); ctx.flash(next ? "Featured on homepage" : "Removed from featured"); refresh(); }
    catch (e) { update(p.id, { isFeatured: !next }); ctx.flash(errMsg(e)); }
  };

  const onStock = (p: Product) => (stockCount: number | null) => {
    const status = stockStatus(stockCount, ctx.data.settings.low_stock_threshold);
    // Local only: the stock change is still being saved, so re-reading the list now could bring back the old number.
    update(p.id, { stockCount, status, ...(p.state === "in" || p.state === "low" || p.state === "out" ? { state: status } : {}) });
  };

  const from = total ? page * pageSize + 1 : 0;
  const to = page * pageSize + rows.length;
  const search = filters.q.trim();

  const empty = !data && !error ? (
    <div className="ad-skeletons" aria-hidden>{Array.from({ length: 6 }, (_, i) => <div key={i} className="ad-skel" />)}</div>
  ) : error && !data ? (
    <Empty>{error} <button type="button" className="ad-link" onClick={refresh}>Try again</button></Empty>
  ) : rows.length === 0 ? (
    <Empty>
      {filtered
        ? <>{search ? <>No products match “{search}”{activeFilterCount({ ...filters, q: "" }) ? " with these filters" : ""}. </> : <>No products match these filters. </>}
            <button type="button" className="ad-link" onClick={() => changeFilters(EMPTY_FILTERS)}>Clear {search ? "search and filters" : "filters"}</button>
            {search && <div className="ad-muted ad-sm" style={{ marginTop: 6 }}>Tip: you can search by name, series, JAN, SKU or Square ID.</div>}</>
        : <>No products yet. <button type="button" className="ad-link" onClick={() => setAdding(true)}>Add one by hand</button> or run “Sync with Square”.</>}
    </Empty>
  ) : null;

  return (
    <>
      <ProductFilters filters={filters} onFilters={changeFilters} sort={sort} onSort={changeSort} counts={counts} tree={tree} onAdd={() => setAdding(true)} compact={compact} />
      {selected.size > 0 && (
        <div className={`ad-bulk ${compact ? "is-sticky" : ""}`} role="region" aria-label="Bulk actions">
          <span>{selected.size} selected</span>
          <select className="sh-input" value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)} aria-label="Move to category">
            <option value="">Move to category…</option>
            <option value="none">— Remove from category —</option>
            {tree.flat.map((c) => <option key={c.id} value={c.id}>{indentLabel(c)}</option>)}
          </select>
          <button type="button" className="sh-btn ad-btn-sm" disabled={!bulkTarget || bulkBusy} onClick={bulkMove}>{bulkBusy ? "Moving…" : "Move"}</button>
          <button type="button" className="ad-link" onClick={() => setSelected(new Set())}>Clear</button>
          {!tree.flat.length && <span className="ad-muted ad-sm">Create categories first in the Categories screen.</span>}
        </div>
      )}
      <div className="ad-summary-line" aria-live="polite">
        <span>
          {data ? (total === 0 ? "No items" : `Showing ${from}–${to} of ${total} item${total === 1 ? "" : "s"}`) : "Loading…"}
          {filtered && counts ? ` (filtered from ${counts.total})` : ""}
        </span>
        {counts?.lastSyncedAt && <span className="ad-muted">Square last synced {ago(counts.lastSyncedAt)}</span>}
      </div>
      <div ref={listRef} className={compact ? "ad-cards-wrap" : "ad-table-wrap"}>
        {compact ? (
          <div className={`ad-cards ${loading && data ? "is-loading" : ""}`} role="list" aria-label="Products" aria-busy={loading}>
            {rows.length > 0 && (
              <label className="ad-cards__all"><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Select all on this page</label>
            )}
            {empty}
            {rows.map((p) => (
              <ProductCardRow key={p.id} ctx={ctx} p={p} tree={tree} selected={selected.has(p.id)} open={openId === p.id}
                onSelect={() => toggleSelect(p.id)} onOpen={() => setOpenId(p.id)} onFeature={() => toggleFeatured(p)} onStock={onStock(p)} />
            ))}
          </div>
        ) : (
          <div className={`ad-table ad-table--products ${loading && data ? "is-loading" : ""}`} data-density={density} role="table" aria-label="Products" aria-busy={loading}>
            <div className="ad-tr ad-th" role="row">
              <span className="ad-checkcell"><input type="checkbox" checked={allSelected} aria-label="Select all on this page" onChange={toggleAll} /></span>
              <span />
              <SortHeader label="Product" k="name" sort={sort} onSort={changeSort} />
              <span className="c-cat"><SortHeader label="Category" k="category" sort={sort} onSort={changeSort} /></span>
              <SortHeader label="Price" k="price" sort={sort} onSort={changeSort} />
              <SortHeader label="Stock" k="stock" sort={sort} onSort={changeSort} />
              <SortHeader label="Status" k="status" sort={sort} onSort={changeSort} />
              <span className="c-rel"><SortHeader label="Release / order by" k="release" sort={sort} onSort={changeSort} /></span>
              <span className="c-upd"><SortHeader label="Updated" k="updated" sort={sort} onSort={changeSort} /></span>
              <span>Featured</span>
            </div>
            {empty}
            {rows.map((p) => {
              const st = STATE_META[p.state ?? "in"];
              const place = p.categoryId ? tree.path(p.categoryId).join(" › ") : p.category ?? "—";
              return (
                <div key={p.id} role="row" tabIndex={0} className={`ad-tr ad-tr--click ${openId === p.id ? "is-selected" : ""} ${p.state === "retired" ? "is-retired" : ""}`}
                  title="Click to edit" onClick={() => setOpenId(p.id)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) setOpenId(p.id); }}>
                  <span className="ad-checkcell" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} aria-label={`Select ${p.name}`} />
                  </span>
                  <Thumb src={p.images[0]} />
                  <div className="ad-cell-main">
                    <div className="ad-strong ad-ellipsis">{p.name}</div>
                    <div className="ad-muted ad-sm ad-ellipsis">
                      {p.source === "manual" && <span className="ad-tag-manual">Manual</span>}
                      {(p.variationCount ?? 0) > 1 && <span className="ad-tag-var">{p.variationCount} variations</span>}
                      {[p.series, p.janCode, p.sku].filter(Boolean).join(" · ") || (p.source === "manual" || (p.variationCount ?? 0) > 1 ? "" : "—")}
                    </div>
                  </div>
                  <span className="ad-text2 ad-ellipsis c-cat" title={place}>{place}</span>
                  <span className="ad-strong">{p.priceCents == null ? "—" : money(p.priceCents)}</span>
                  <span className="ad-strong" style={{ color: p.state === "retired" || p.state === "hidden" ? undefined : st.color }}>
                    {p.source === "manual" && p.state !== "retired" ? <InlineStock ctx={ctx} p={p} onChange={onStock(p)} /> : p.stockCount == null ? "∞" : p.stockCount}
                    {(p.alertsWaiting ?? 0) > 0 && <span className="ad-alert-pill" title={`${p.alertsWaiting} customer(s) waiting for a restock alert`}>🔔 {p.alertsWaiting}</span>}
                  </span>
                  <span><span className="sh-badge" style={{ background: st.color }} title={st.hint}>{st.badge}</span></span>
                  <span className="ad-text2 ad-sm c-rel">{p.status === "pre" && p.state === "pre" ? `${monthLabel(p.releaseMonth)} · by ${dayLabel(p.orderByDate)}` : "—"}</span>
                  <span className="ad-text2 ad-sm c-upd" title={p.updatedAt ? new Date(p.updatedAt).toLocaleString() : undefined}>{p.updatedAt ? ago(p.updatedAt) : "—"}</span>
                  <span onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={`sh-toggle ${p.isFeatured ? "is-on" : ""}`} aria-pressed={!!p.isFeatured} aria-label={`Feature ${p.name}`} onClick={() => toggleFeatured(p)} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {total > 0 && (
        <div className="ad-pager">
          <label className="ad-muted ad-sm">Per page{" "}
            <select className="sh-input" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} aria-label="Items per page">
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="ad-pager__nav">
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" disabled={page === 0} onClick={() => setPage((n) => n - 1)}>‹ Prev</button>
            <span className="ad-sm">Page {page + 1} of {pages}</span>
            <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" disabled={page + 1 >= pages} onClick={() => setPage((n) => n + 1)}>Next ›</button>
          </span>
        </div>
      )}
      <p className="ad-foot-note">Every item from Square is listed here, including ones that are hidden, sold out or deleted in Square (shown as Retired, kept so past orders still resolve). Square products: name, price, photos and stock come from Square Dashboard. Products you add here (tagged Manual) are fully editable here, with − / + to adjust stock right in the table.</p>
      {compact && selected.size > 0 && <div className="ad-bulk-spacer" aria-hidden />}
      {open && <ProductDrawer key={open.id} ctx={ctx} p={open} onClose={() => { setOpenId(null); if (drawerDirty.current) { drawerDirty.current = false; refresh(); } }}
        onSaved={(change) => { drawerDirty.current = true; update(open.id, change); }} />}
      {adding && <AddProductDrawer ctx={ctx} onClose={() => { setAdding(false); refresh(); }} />}
    </>
  );
}

function ProductDrawer({ ctx, p, onClose, onSaved }: { ctx: Ctx; p: Product; onClose: () => void; onSaved: (patch: Partial<Product>) => void }) {
  useEscape(onClose);
  const [form, setForm] = useState({
    availability: (p.availability ?? (p.status === "pre" ? "preorder" : "auto")) as Availability,
    release: p.releaseMonth?.slice(0, 7) ?? "",
    orderBy: p.orderByDate?.slice(0, 10) ?? "",
    compareAt: p.compareAtCents ? (p.compareAtCents / 100).toFixed(2) : "",
    maxPer: p.maxPerCustomer ? String(p.maxPerCustomer) : "",
    series: p.series ?? "",
    jan: p.janCode ?? "",
    categoryId: p.categoryId ?? "",
  });
  const manual = p.source === "manual";
  const [catalog, setCatalog] = useState({ name: p.name, price: (p.priceCents / 100).toFixed(2), stock: p.stockCount, photos: p.images });
  const [busy, setBusy] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const squareUrl = `https://app.squareup.com/dashboard/items/library/${encodeURIComponent(p.id)}`;

  const save = async () => {
    const compare = form.compareAt.trim() ? Math.round(Number(form.compareAt) * 100) : null;
    const maxPer = form.maxPer.trim() ? Number(form.maxPer) : null;
    if (compare !== null && (!Number.isFinite(compare) || compare < 0)) { ctx.flash("Compare-at price must be a number"); return; }
    if (maxPer !== null && (!Number.isInteger(maxPer) || maxPer < 1)) { ctx.flash("Max per customer must be a whole number"); return; }
    if (form.availability === "preorder" && !form.orderBy) { ctx.flash("Pre-orders need an order-by date"); return; }
    const priceCents = Math.round(Number(catalog.price) * 100);
    if (manual && (!catalog.name.trim() || !Number.isFinite(priceCents) || priceCents <= 0)) { ctx.flash("Name and a price above $0 are required"); return; }
    setBusy(true);
    try {
      if (manual) {
        await api(`/admin/products/${encodeURIComponent(p.id)}/catalog`, { method: "PATCH", body: JSON.stringify({
          name: catalog.name.trim(), priceCents, stockCount: catalog.stock, imageUrls: catalog.photos,
        }) });
      }
      if (manual) onSaved({ name: catalog.name.trim(), priceCents, stockCount: catalog.stock, images: catalog.photos });
      await patchProduct(ctx, p.id, {
        availability: form.availability,
        release_month: form.release ? `${form.release}-01` : "",
        order_by_date: form.orderBy || "",
        compare_at_cents: compare ?? "",
        max_per_customer: maxPer ?? "",
        series: form.series.trim(),
        jan_code: form.jan.trim(),
        category_id: form.categoryId || null,
      });
      onSaved({
        availability: form.availability, releaseMonth: form.release || null, orderByDate: form.orderBy || null, compareAtCents: compare,
        maxPerCustomer: maxPer, series: form.series.trim() || null, janCode: form.jan.trim() || null, categoryId: form.categoryId || null,
      });
      ctx.flash("Product saved");
      onClose();
      ctx.reload(); // status is derived server-side
    } catch (e) { ctx.flash(errMsg(e)); } finally { setBusy(false); }
  };

  const archive = async () => {
    if (!confirmArchive) { setConfirmArchive(true); return; }
    setBusy(true);
    try {
      await api(`/admin/products/${encodeURIComponent(p.id)}`, { method: "DELETE" });
      ctx.setData((d) => ({ ...d, products: d.products.filter((x) => x.id !== p.id) }));
      ctx.flash(`${p.name} removed from the shop`);
      onClose();
    } catch (e) { ctx.flash(errMsg(e)); setBusy(false); }
  };

  const notify = async () => {
    setNotifying(true);
    try {
      const res = await api<{ sent: number }>(`/admin/products/${encodeURIComponent(p.id)}/notify-restock`, { method: "POST" });
      onSaved({ alertsWaiting: 0 });
      ctx.flash(`Emailed ${res.sent} customer${res.sent === 1 ? "" : "s"}`);
    } catch (e) { ctx.flash(errMsg(e)); } finally { setNotifying(false); }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer" role="dialog" aria-modal="true" aria-label="Edit storefront details">
        <div className="sh-drawer__head"><span>Edit storefront details</span><button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="sh-drawer__body">
          {manual ? (
            <section className="ad-manual">
              <div className="ad-between"><span className="ad-label" style={{ margin: 0 }}>Product</span><span className="ad-tag-manual">Added manually</span></div>
              <PhotoUploader urls={catalog.photos} onChange={(photos) => setCatalog((c) => ({ ...c, photos }))} />
              <label className="ad-field">Name<input className="sh-input" value={catalog.name} onChange={(e) => setCatalog((c) => ({ ...c, name: e.target.value }))} maxLength={200} /></label>
              <label className="ad-field">Price (CAD)<div className="ad-money"><span>$</span><input className="sh-input" inputMode="decimal" value={catalog.price} onChange={(e) => setCatalog((c) => ({ ...c, price: e.target.value.replace(/[^\d.]/g, "") }))} /></div></label>
              <div className="ad-field">Stock<StockField value={catalog.stock} onChange={(stock) => setCatalog((c) => ({ ...c, stock }))} /></div>
            </section>
          ) : (
            <div className="ad-summary">
              <Thumb src={p.images[0]} size={84} />
              <div>
                <div className="ad-strong" style={{ fontSize: 15, fontWeight: 800 }}>{p.name}</div>
                <div className="ad-muted" style={{ fontSize: 13, marginTop: 2 }}>{p.category ?? "Uncategorised"} · {money(p.priceCents)} · stock {p.stockCount == null ? "∞" : p.stockCount}</div>
                {(p.sku || p.syncedAt) && <div className="ad-muted ad-sm" style={{ marginTop: 2 }}>{[p.sku && `SKU ${p.sku}`, p.syncedAt && `synced ${ago(p.syncedAt)}`].filter(Boolean).join(" · ")}</div>}
                <a href={squareUrl} target="_blank" rel="noreferrer" className="ad-link ad-sm" style={{ display: "inline-block", marginTop: 6 }}>Edit in Square ↗</a>
              </div>
            </div>
          )}
          {(p.state === "retired" || p.state === "unavailable") && (
            <div className="ad-callout"><span><b>{STATE_META[p.state].label}.</b> {STATE_META[p.state].hint}</span></div>
          )}
          {(p.variations?.length ?? 0) > 1 && (
            <section className="ad-vars" aria-label="Variations">
              <div className="ad-label" style={{ margin: 0 }}>Variations ({p.variations?.length})</div>
              {p.variations?.map((v) => (
                <div key={v.id} className="ad-vars__row">
                  <span className="ad-ellipsis"><b>{v.name || "Regular"}</b>{v.isDefault && <span className="ad-tag-var" style={{ marginLeft: 6 }}>Default</span>}{!v.sellable && <span className="ad-tag-var" style={{ marginLeft: 6 }}>Not for sale</span>}</span>
                  <span className="ad-muted ad-sm ad-ellipsis">{v.sku ?? "no SKU"}</span>
                  <span>{money(v.priceCents)}</span>
                  <span>{v.stockCount == null ? "∞" : v.stockCount}</span>
                </div>
              ))}
              <div className="ad-muted ad-sm">The storefront sells the default variation. Manage the others in Square.</div>
            </section>
          )}
          {(() => {
            const compare = form.compareAt.trim() ? Math.round(Number(form.compareAt) * 100) : null;
            const liveStock = manual ? catalog.stock : p.stockCount;
            const livePrice = manual ? Math.round(Number(catalog.price) * 100) || 0 : p.priceCents;
            const preview: Product = {
              ...p, ...(manual ? { name: catalog.name || p.name, images: catalog.photos, priceCents: livePrice, stockCount: liveStock } : {}),
              category: form.categoryId ? ctx.data.categories.find((c) => c.id === form.categoryId)?.name ?? null : p.categoryId ? null : p.category,
              series: form.series.trim() || null, janCode: form.jan.trim() || null,
              compareAtCents: compare && Number.isFinite(compare) ? compare : null,
              releaseMonth: form.release || null, orderByDate: form.orderBy || null,
              status: previewStatus(form.availability, liveStock, form.orderBy || null, ctx.data.settings.low_stock_threshold),
            };
            return form.availability === "hidden" ? (
              <div className="ad-callout"><span>Hidden products don't appear anywhere on the storefront.</span></div>
            ) : (
              <StorefrontPreview label="Storefront preview · updates as you edit">
                <div className="ad-preview__card"><ProductCard p={preview} a={PREVIEW_ACTIONS} /></div>
                <div className="ad-preview__meta">
                  <span><b>Shoppers see:</b> {statusLabel(preview)}</span>
                  {discountPct(preview) > 0 && <span>Shows a <b>-{discountPct(preview)}%</b> sale chip and appears under <b>Sale</b>.</span>}
                  {preview.status === "pre" && <span>Appears in <b>New pre-orders</b>{form.orderBy ? ` until ${dayLabel(form.orderBy)}` : ""}.</span>}
                  {p.isFeatured && <span>Featured: listed first in the catalog.</span>}
                </div>
              </StorefrontPreview>
            );
          })()}
          <CategorySelect ctx={ctx} label="Shop category" value={form.categoryId || null} onChange={(id) => setForm((f) => ({ ...f, categoryId: id ?? "" }))} />
          <label className="ad-field">Availability
            <select className="sh-input" value={form.availability} onChange={set("availability")}>
              <option value="auto">Auto (from Square stock)</option>
              <option value="preorder">Pre-order</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <div className="ad-grid2">
            <label className="ad-field">Release month<input className="sh-input" type="month" value={form.release} onChange={set("release")} /></label>
            <label className="ad-field">Order-by date<input className="sh-input" type="date" value={form.orderBy} onChange={set("orderBy")} /></label>
            <label className="ad-field">Compare-at price<input className="sh-input" inputMode="decimal" placeholder="e.g. 199.00" value={form.compareAt} onChange={set("compareAt")} /></label>
            <label className="ad-field">Max per customer<input className="sh-input" inputMode="numeric" placeholder="No limit" value={form.maxPer} onChange={set("maxPer")} /></label>
            <label className="ad-field">Series<input className="sh-input" value={form.series} onChange={set("series")} /></label>
            <label className="ad-field">JAN code<input className="sh-input" inputMode="numeric" value={form.jan} onChange={set("jan")} /></label>
          </div>
          {p.alertsWaiting !== undefined && (
            <div className="ad-callout">
              <span><b>{p.alertsWaiting}</b> customer{p.alertsWaiting === 1 ? "" : "s"} waiting for restock</span>
              <button type="button" className="ad-link" disabled={!p.alertsWaiting || notifying} onClick={notify}>{notifying ? "Sending…" : "Email them"}</button>
            </div>
          )}
        </div>
        <div className="sh-drawer__foot">
          {manual && (
            <button type="button" className="sh-btn sh-btn--danger" style={{ marginRight: "auto" }} onClick={archive} disabled={busy}>
              {confirmArchive ? "Confirm remove" : "Remove from shop"}
            </button>
          )}
          <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="sh-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </aside>
    </>
  );
}

// ================================================================ Orders
const ORDER_TABS: Record<string, (o: Order) => boolean> = {
  All: () => true,
  "To ship": (o) => o.status === "paid" || o.status === "fulfilled",
  "Pre-order": (o) => o.status === "preorder_reserved",
  Shipped: (o) => o.status === "shipped",
  Refunded: (o) => o.status === "refunded",
};

export function OrdersScreen({ ctx }: { ctx: Ctx }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handler = (e: Event) => setOpenId((e as CustomEvent<number>).detail);
    window.addEventListener("ad:open-order", handler);
    return () => window.removeEventListener("ad:open-order", handler);
  }, []);
  const orders = ctx.data.orders;
  const q = query.trim().toLowerCase().replace(/^#/, "");
  const rows = orders.filter(ORDER_TABS[ctx.orderTab] ?? (() => true))
    .filter((o) => !q || String(o.id).includes(q) || o.billing_email.includes(q) || customerName(o).toLowerCase().includes(q));
  const open = orders.find((o) => o.id === openId) ?? null;

  return (
    <>
      <div className="ad-toolbar">
        <input className="ad-search" type="search" placeholder="Search order #, email or name…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search orders" />
        <div className="ad-chips">
          {Object.keys(ORDER_TABS).map((n) => (
            <button key={n} type="button" className={`sh-chip ${ctx.orderTab === n ? "is-active" : ""}`} onClick={() => ctx.setOrderTab(n)}>{n} · {orders.filter(ORDER_TABS[n]).length}</button>
          ))}
        </div>
      </div>
      <div className="ad-table-wrap">
        <div className="ad-table ad-table--orders" role="table" aria-label="Orders">
          <div className="ad-tr ad-th" role="row"><span>Order</span><span>Customer</span><span>Items</span><span>Placed</span><span>Pay</span><span>Status</span><span className="ad-right">Total</span></div>
          {ctx.data.loading ? <Empty>Loading orders…</Empty> : rows.length === 0 ? <Empty>{orders.length ? "No orders in this view." : "No orders yet. Paid web orders appear here automatically."}</Empty> : rows.map((o) => {
            const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
            return (
              <div key={o.id} role="row" tabIndex={0} className={`ad-tr ad-tr--click ${openId === o.id ? "is-selected" : ""}`} onClick={() => setOpenId(o.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(o.id); }}>
                <span className="ad-strong" style={{ fontWeight: 800 }}>#{o.id}</span>
                <div className="ad-cell-main"><div className="ad-ellipsis" style={{ fontWeight: 600 }}>{customerName(o)}</div><div className="ad-muted ad-sm ad-ellipsis">{o.billing_email}</div></div>
                <span className="ad-text2 ad-ellipsis">{(o.order_items ?? []).map((i) => i.name).join(", ") || "—"}</span>
                <span className="ad-text2">{shortDate(o.created_at)}</span>
                <span className="ad-text2 ad-sm">{o.provider === "square" ? "Square" : "PayPal"}</span>
                <span><span className="sh-badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span></span>
                <span className="ad-right" style={{ fontWeight: 800 }}>{money(o.total_cents)}</span>
              </div>
            );
          })}
        </div>
      </div>
      {open && <OrderDrawer key={open.id} ctx={ctx} o={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

const CARRIERS = ["Canada Post", "UPS", "Purolator", "FedEx", "USPS", "Other"];

function OrderDrawer({ ctx, o, onClose }: { ctx: Ctx; o: Order; onClose: () => void }) {
  useEscape(onClose);
  const [tracking, setTracking] = useState(o.tracking_number ?? "");
  const [carrier, setCarrier] = useState(o.carrier ?? "Canada Post");
  const [busy, setBusy] = useState<"" | "ship" | "refund" | "slip">("");
  const [confirmRefund, setConfirmRefund] = useState(false);
  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.pending;
  const canShip = o.status === "paid" || o.status === "fulfilled";
  const canRefund = ["paid", "preorder_reserved", "shipped", "fulfilled"].includes(o.status);
  const provider = o.provider === "square" ? "Square" : "PayPal";
  const update = (patch: Partial<Order>) => ctx.setData((d) => ({ ...d, orders: d.orders.map((x) => (x.id === o.id ? { ...x, ...patch } : x)) }));

  const ship = async () => {
    if (!tracking.trim()) { ctx.flash("Add a tracking number first"); return; }
    setBusy("ship");
    try {
      await api(`/admin/orders/${o.id}/ship`, { method: "POST", body: JSON.stringify({ trackingNumber: tracking.trim(), carrier }) });
      update({ status: "shipped", tracking_number: tracking.trim(), carrier, shipped_at: new Date().toISOString() });
      ctx.flash(`Order #${o.id} marked shipped`);
      onClose();
    } catch (e) { ctx.flash(errMsg(e)); } finally { setBusy(""); }
  };

  const refund = async () => {
    if (!confirmRefund) { setConfirmRefund(true); return; }
    setBusy("refund");
    try {
      const res = await api<{ status: Order["status"] }>(`/admin/orders/${o.id}/refund`, { method: "POST", body: "{}" });
      update({ status: res.status });
      ctx.flash(`Refund issued via ${provider}`);
      onClose();
    } catch (e) { ctx.flash(errMsg(e)); setConfirmRefund(false); } finally { setBusy(""); }
  };

  const packingSlip = async () => {
    const win = window.open("", "_blank");
    if (!win) { ctx.flash("Allow pop-ups to open the packing slip"); return; }
    setBusy("slip");
    try {
      const html = (await api<{ html: string }>(`/admin/orders/${o.id}/packing-slip`)).html;
      win.document.open(); win.document.write(html); win.document.close();
      win.focus();
    } catch (e) { win.close(); ctx.flash(errMsg(e)); } finally { setBusy(""); }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer" role="dialog" aria-modal="true" aria-label={`Order ${o.id}`}>
        <div className="sh-drawer__head"><span>Order #{o.id}</span><button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="sh-drawer__body" style={{ gap: 16 }}>
          <div className="ad-between">
            <span className="sh-badge" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
            <span className="ad-muted" style={{ fontSize: 13 }}>{shortDate(o.created_at)} · via {provider}</span>
          </div>
          <div>
            <div className="ad-label">Customer</div>
            <div className="ad-strong">{customerName(o)}</div>
            <div className="ad-text2" style={{ fontSize: 13.5 }}><a href={`mailto:${o.billing_email}`}>{o.billing_email}</a></div>
            <div className="ad-text2" style={{ fontSize: 13.5, marginTop: 4 }}>{addressLine(o)}</div>
            {o.shipping_address?.phone && <div className="ad-text2" style={{ fontSize: 13.5 }}><a href={`tel:${o.shipping_address.phone}`}>{o.shipping_address.phone}</a></div>}
            {o.billing_address && addressLine({ ...o, shipping_address: o.billing_address }) !== addressLine(o) && (
              <div className="ad-muted" style={{ fontSize: 12.5, marginTop: 6 }}>Billing: {addressLine({ ...o, shipping_address: o.billing_address })}</div>
            )}
          </div>
          <div>
            <div className="ad-label">Items</div>
            {(o.order_items ?? []).map((it) => (
              <div key={it.id} className="ad-item">
                <Thumb src={it.image_url} size={40} />
                <span style={{ flex: 1 }}>{it.name}{it.is_preorder && <span className="ad-pre-tag">Pre-order</span>}</span>
                <span className="ad-muted">× {it.quantity}</span>
                <span className="ad-strong">{money(it.unit_price_cents * it.quantity)}</span>
              </div>
            ))}
            <div className="ad-between ad-text2" style={{ paddingTop: 10, fontSize: 13.5 }}><span>Shipping ({o.shipping_method === "express" ? "Express" : "Standard"})</span><span>{o.shipping_cents ? money(o.shipping_cents) : "Free"}</span></div>
            {o.tax_cents > 0 && <div className="ad-between ad-text2" style={{ paddingTop: 6, fontSize: 13.5 }}><span>Tax</span><span>{money(o.tax_cents)}</span></div>}
            <div className="ad-between" style={{ paddingTop: 6, fontWeight: 800, fontSize: 16 }}><span>Total</span><span>{money(o.total_cents)}</span></div>
          </div>
          {o.status === "shipped" && o.tracking_number ? (
            <div className="ad-callout"><span>Shipped with <b>{o.carrier ?? "carrier"}</b> · {o.tracking_number}</span></div>
          ) : (
            <div className="ad-grid2 ad-grid2--track">
              <label className="ad-field">Carrier
                <select className="sh-input" value={carrier} onChange={(e) => setCarrier(e.target.value)} disabled={!canShip}>{CARRIERS.map((c) => <option key={c}>{c}</option>)}</select>
              </label>
              <label className="ad-field">Tracking number
                <input className="sh-input" placeholder="Canada Post / UPS tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} disabled={!canShip} />
              </label>
            </div>
          )}
        </div>
        <div className="sh-drawer__foot" style={{ justifyContent: "space-between" }}>
          <button type="button" className="sh-btn sh-btn--danger" onClick={refund} disabled={!canRefund || !ctx.isOwner || busy !== ""}
            title={!ctx.isOwner ? "Only the owner can issue refunds" : undefined}>
            {busy === "refund" ? "Refunding…" : confirmRefund ? `Confirm refund ${money(o.total_cents)}` : "Refund"}
          </button>
          <div className="ad-row-gap">
            <button type="button" className="sh-btn sh-btn--ghost" onClick={packingSlip} disabled={busy !== ""}>Packing slip</button>
            <button type="button" className="sh-btn" onClick={ship} disabled={!canShip || busy !== ""}>{busy === "ship" ? "Saving…" : "Mark shipped"}</button>
          </div>
        </div>
      </aside>
    </>
  );
}

// ================================================================ Homepage
export function HomepageScreen({ ctx }: { ctx: Ctx }) {
  const slides = ctx.data.slides;
  const setSlides = (next: HeroSlide[]) => ctx.setData((d) => ({ ...d, slides: next }));
  const featured = ctx.data.products.filter((p) => p.isFeatured).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const saveSlide = async (s: HeroSlide, patch: Partial<HeroSlide>) => {
    const next = { ...s, ...patch };
    setSlides(slides.map((x) => (x.id === s.id ? next : x)));
    if (s.id.startsWith("default-")) return;
    try {
      await api(`/admin/homepage/slides/${s.id}`, { method: "PUT", body: JSON.stringify({ headline: next.headline, subheading: next.subheading, imageUrl: next.image_url, linkUrl: next.link_url, isVisible: next.is_visible, sortOrder: next.sort_order }) });
      ctx.flash("Slide saved");
    } catch (e) { ctx.flash(errMsg(e)); }
  };

  const move = async (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setSlides(next.map((s, k) => ({ ...s, sort_order: k })));
    try { await api("/admin/homepage/slides/reorder", { method: "PUT", body: JSON.stringify({ ids: next.map((s) => s.id) }) }); }
    catch (e) { ctx.flash(errMsg(e)); ctx.reload(); }
  };

  const addSlide = async () => {
    const draft = { headline: "New slide headline", subheading: "Subheading", image_url: null, link_url: null, is_visible: false, sort_order: slides.length };
    try {
      const res = await api<{ slide: HeroSlide }>("/admin/homepage/slides", { method: "POST", body: JSON.stringify({ headline: draft.headline, subheading: draft.subheading, isVisible: false, sortOrder: draft.sort_order }) });
      setSlides([...slides, res.slide]);
      ctx.flash("Slide added (hidden until you switch it on)");
    } catch (e) { ctx.flash(errMsg(e)); }
  };

  const removeSlide = async (s: HeroSlide) => {
    setSlides(slides.filter((x) => x.id !== s.id));
    try { await api(`/admin/homepage/slides/${s.id}`, { method: "DELETE" }); ctx.flash("Slide removed"); }
    catch (e) { ctx.flash(errMsg(e)); ctx.reload(); }
  };

  const visibleSlides = slides.filter((sl) => sl.is_visible);
  const closingSoon = ctx.data.products.filter((p) => p.status === "pre" && p.orderByDate && Date.parse(p.orderByDate) <= Date.now() + 30 * 86_400_000 && Date.parse(p.orderByDate) >= Date.now() - 86_400_000).length;
  const maxOff = ctx.data.products.reduce((m, p) => Math.max(m, discountPct(p)), 0);

  const moveFeatured = async (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= featured.length) return;
    const next = [...featured];
    [next[i], next[j]] = [next[j], next[i]];
    const order = new Map(next.map((p, k) => [p.id, k]));
    ctx.setData((d) => ({ ...d, products: d.products.map((p) => (order.has(p.id) ? { ...p, sortOrder: order.get(p.id) } : p)) }));
    try { await Promise.all([next[i], next[j]].map((p) => patchProduct(ctx, p.id, { sort_order: order.get(p.id) }))); }
    catch (e) { ctx.flash(errMsg(e)); ctx.reload(); }
  };

  return (
    <>
    <StorefrontPreview label={visibleSlides.length ? `Storefront hero · ${visibleSlides.length} visible slide${visibleSlides.length === 1 ? "" : "s"}` : "Storefront hero · no visible slides, so the default welcome slides show"} className="ad-preview--hero">
      <HeroRow key={visibleSlides.map((sl) => sl.id + sl.headline + sl.subheading + sl.image_url).join("|")}
        slides={visibleSlides.length ? visibleSlides : ctx.data.previewSlides} closingSoon={closingSoon} maxOff={maxOff} onPreorders={() => {}} onSale={() => {}} />
    </StorefrontPreview>
    <div className="ad-two">
      <Card title="Hero slides" action={<button type="button" className="sh-btn ad-btn-sm" onClick={addSlide}>+ Add slide</button>}>
        {slides.length === 0 && <Empty>No slides yet. The storefront shows its default welcome slides until you add one.</Empty>}
        {slides.map((s, i) => <SlideRow key={s.id} s={s} first={i === 0} last={i === slides.length - 1} onMove={(d) => move(i, d)} onSave={(patch) => saveSlide(s, patch)} onRemove={() => removeSlide(s)} />)}
      </Card>
      <div className="ad-stack">
        <Card title={<>Featured products <span className="ad-muted" style={{ fontWeight: 600, fontSize: 13 }}>· toggle in Products</span></>}>
          {featured.length === 0 ? <Empty>No featured products. Switch on “Featured” in Products.</Empty> : featured.map((p, i) => (
            <div key={p.id} className="ad-line">
              <span className="ad-slide__order ad-slide__order--row">
                <button type="button" onClick={() => moveFeatured(i, -1)} disabled={i === 0} aria-label={`Move ${p.name} up`}>▲</button>
                <button type="button" onClick={() => moveFeatured(i, 1)} disabled={i === featured.length - 1} aria-label={`Move ${p.name} down`}>▼</button>
              </span>
              <span className="ad-muted" style={{ fontWeight: 800, width: 18 }}>{i + 1}</span>
              <span className="ad-line__main">{p.name}</span>
              <span className="ad-strong">{money(p.priceCents)}</span>
            </div>
          ))}
          <div className="ad-muted ad-sm" style={{ padding: "10px 18px" }}>Shown first, in this order, when shoppers browse the catalog (the default “Featured” sort).</div>
        </Card>
        <EventsCard ctx={ctx} />
      </div>
    </div>
    </>
  );
}

function SlideRow({ s, first, last, onMove, onSave, onRemove }: {
  s: HeroSlide; first: boolean; last: boolean; onMove: (d: number) => void; onSave: (patch: Partial<HeroSlide>) => void; onRemove: () => void;
}) {
  const [headline, setHeadline] = useState(s.headline);
  const [sub, setSub] = useState(s.subheading ?? "");
  const [link, setLink] = useState(s.link_url ?? "");
  const url = (v: string) => v.trim() || null;
  return (
    <div className="ad-slide" style={{ opacity: s.is_visible ? 1 : 0.55 }}>
      <div className="ad-slide__order">
        <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label="Move up">▲</button>
        <button type="button" onClick={() => onMove(1)} disabled={last} aria-label="Move down">▼</button>
      </div>
      <div className="ad-slide__photo">
        <PhotoUploader single folder="slides" urls={s.image_url ? [s.image_url] : []}
          onChange={(urls) => onSave({ image_url: urls[0] ?? null })} />
        {!s.image_url && <span className="ad-muted ad-sm">No photo: the mascot shows instead</span>}
      </div>
      <div className="ad-slide__fields">
        <input className="sh-input ad-slide__headline" value={headline} onChange={(e) => setHeadline(e.target.value)} aria-label="Headline" maxLength={160}
          onBlur={() => headline.trim() && headline !== s.headline && onSave({ headline: headline.trim() })} />
        <input className="sh-input ad-slide__sub" value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Subheading" placeholder="Subheading" maxLength={300}
          onBlur={() => sub !== (s.subheading ?? "") && onSave({ subheading: sub || null })} />
        <input className="sh-input ad-slide__sub" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link when clicked" placeholder="Link when clicked (optional)"
          onBlur={() => url(link) !== s.link_url && onSave({ link_url: url(link) })} />
        <button type="button" className="ad-remove" onClick={onRemove}>Remove</button>
      </div>
      <button type="button" className={`sh-toggle ${s.is_visible ? "is-on" : ""}`} style={{ marginTop: 6 }} aria-pressed={s.is_visible} aria-label="Visible on storefront" onClick={() => onSave({ is_visible: !s.is_visible })} />
    </div>
  );
}

function EventsCard({ ctx }: { ctx: Ctx }) {
  const events = ctx.data.events;
  const setEvents = (next: StoreEvent[]) => ctx.setData((d) => ({ ...d, events: next }));

  const save = async (e: StoreEvent, patch: Partial<StoreEvent>) => {
    const next = { ...e, ...patch };
    if (next.start_date && next.end_date && next.end_date < next.start_date) { ctx.flash("End date must be after the start date"); return; }
    setEvents(events.map((x) => (x.id === e.id ? next : x)));
    const body = JSON.stringify({ name: next.name, city: next.city, startDate: next.start_date, endDate: next.end_date, boothInfo: next.booth_info, isVisible: next.is_visible, sortOrder: next.sort_order });
    try {
      if (e.id.startsWith("default-") || e.id.startsWith("new-")) {
        const res = await api<{ event: StoreEvent }>("/admin/events", { method: "POST", body });
        setEvents(events.map((x) => (x.id === e.id ? res.event : x)));
      } else {
        await api(`/admin/events/${e.id}`, { method: "PUT", body });
      }
      ctx.flash("Event saved");
    } catch (err) { ctx.flash(errMsg(err)); }
  };

  const remove = async (e: StoreEvent) => {
    setEvents(events.filter((x) => x.id !== e.id));
    if (e.id.startsWith("default-") || e.id.startsWith("new-")) return;
    try { await api(`/admin/events/${e.id}`, { method: "DELETE" }); ctx.flash("Event removed"); } catch (err) { ctx.flash(errMsg(err)); ctx.reload(); }
  };

  const add = () => setEvents([...events, { id: `new-${Date.now()}`, name: "", city: null, start_date: null, end_date: null, booth_info: null, is_visible: true, sort_order: events.length }]);

  return (
    <Card title="Events" action={<button type="button" className="ad-link" onClick={add}>+ Add event</button>}>
      {events.length === 0 && <Empty>No events yet.</Empty>}
      {events.map((e) => <EventRow key={e.id} e={e} onSave={(patch) => save(e, patch)} onRemove={() => remove(e)} />)}
      <div className="ad-muted ad-sm" style={{ padding: "10px 18px" }}>Drives the storefront “Meet us at the con” strip. Events without dates show as “dates TBA”.</div>
    </Card>
  );
}

function EventRow({ e, onSave, onRemove }: { e: StoreEvent; onSave: (patch: Partial<StoreEvent>) => void; onRemove: () => void }) {
  const [name, setName] = useState(e.name);
  const [city, setCity] = useState(e.city ?? "");
  const named = name.trim();
  return (
    <div className="ad-event">
      <input className="ad-event__name" value={name} placeholder="Event name" aria-label="Event name" onChange={(x) => setName(x.target.value)}
        onBlur={() => named && name !== e.name && onSave({ name: named })} />
      <input className="ad-event__name ad-event__city" value={city} placeholder="City" aria-label="City" onChange={(x) => setCity(x.target.value)}
        onBlur={() => named && city !== (e.city ?? "") && onSave({ name: named, city: city.trim() || null })} />
      <input className="sh-input ad-event__date" type="date" aria-label="Start date" value={e.start_date ?? ""} onChange={(x) => named && onSave({ name: named, start_date: x.target.value || null })} />
      <input className="sh-input ad-event__date" type="date" aria-label="End date" value={e.end_date ?? ""} onChange={(x) => named && onSave({ name: named, end_date: x.target.value || null })} />
      <button type="button" className="ad-x" onClick={onRemove} aria-label={`Remove ${e.name}`}>×</button>
    </div>
  );
}

// ================================================================ Settings
export function SettingsScreen({ ctx }: { ctx: Ctx }) {
  const s = ctx.data.settings;
  const r = ctx.data.readiness;
  const [form, setForm] = useState(() => toForm(s));
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(toForm(s)), [s]);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(s));

  const put = async (patch: Partial<StoreSettings>) => {
    const res = await api<{ settings: StoreSettings }>("/admin/settings", { method: "PUT", body: JSON.stringify(patch) });
    ctx.setData((d) => ({ ...d, settings: res.settings }));
  };

  const toggleMaintenance = async () => {
    if (!ctx.isOwner) { ctx.flash("Only the owner can change this"); return; }
    try {
      await put({ maintenance_mode: !s.maintenance_mode });
      ctx.flash(s.maintenance_mode ? "Site is back online" : "Site is now showing the maintenance page");
    } catch (e) { ctx.flash(errMsg(e)); }
  };

  const pickProvider = async (id: "paypal" | "square", name: string) => {
    if (!ctx.isOwner) { ctx.flash("Only the owner can change payments"); return; }
    if (id === s.payment_provider) return;
    try { await put({ payment_provider: id }); ctx.flash(`Checkout now uses ${name}`); } catch (e) { ctx.flash(errMsg(e)); }
  };

  const save = async () => {
    const cents = (v: string) => Math.round(Number(v) * 100);
    const numeric = {
      shipping_standard_cents: cents(form.standard), shipping_express_cents: cents(form.express), free_shipping_threshold_cents: cents(form.free),
      low_stock_threshold: Number(form.low), fx_cad_usd: Number(form.fx), handling_days_min: Number(form.hMin), handling_days_max: Number(form.hMax),
    };
    if (Object.values(numeric).some((v) => !Number.isFinite(v) || v < 0)) { ctx.flash("Check the numbers. Values must be zero or more"); return; }
    if (numeric.handling_days_max < numeric.handling_days_min) { ctx.flash("Handling max must be at least the min"); return; }
    const patch: Partial<StoreSettings> = { ...numeric, maintenance_message: form.maintenanceMessage.trim() || null };
    setSaving(true);
    try { await put(patch); ctx.flash("Settings saved"); } catch (e) { ctx.flash(errMsg(e)); } finally { setSaving(false); }
  };

  // [label, passes, needed before Square can take payments]. The webhook only keeps stock fresh, so it is recommended, not required.
  const checks: [string, boolean | undefined, boolean][] = [
    ["Square app & location connected", r?.appAndLocationConnected, true],
    ["Catalog + inventory syncing", r?.catalogAndInventorySyncing, true],
    ["Live mode (real cards are charged)", r?.liveMode, false],
    ["3-D Secure (verifyBuyer) enabled", r?.threeDSecureEnabled, false],
    ["Webhook signature key set (keeps stock up to date)", r?.webhookKeySet, false],
  ];
  const squareReady = checks.every(([, ok, needed]) => ok || !needed);
  const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })), disabled: !ctx.isOwner });

  return (
    <>
      {!ctx.isOwner && <div className="ad-banner">Settings are read-only for staff accounts.</div>}
      <section className="ad-card ad-pad" style={{ marginBottom: 16, borderColor: s.maintenance_mode ? "var(--red)" : undefined }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="ad-h3">Maintenance mode</div>
            <div className="ad-muted" style={{ fontSize: 13 }}>
              {s.maintenance_mode
                ? "The storefront and checkout are showing the maintenance page to everyone right now. Admin stays reachable."
                : "Takes the storefront and checkout offline for shoppers and shows a maintenance page instead. Admin stays reachable either way."}
            </div>
          </div>
          <button
            type="button"
            className="sh-btn"
            style={s.maintenance_mode ? { background: "var(--red)" } : undefined}
            disabled={!ctx.isOwner}
            onClick={toggleMaintenance}
          >
            {s.maintenance_mode ? "Turn maintenance mode off" : "Turn maintenance mode on"}
          </button>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, fontSize: 14 }}>
          <span>Message shown to shoppers (optional)</span>
          <textarea
            className="sh-input"
            style={{ width: "100%", resize: "vertical" }}
            rows={2}
            placeholder="Spin Hobby is currently down for maintenance. We'll be back shortly."
            value={form.maintenanceMessage}
            onChange={(e) => setForm((f) => ({ ...f, maintenanceMessage: e.target.value }))}
            disabled={!ctx.isOwner}
          />
        </label>
      </section>
      <div className="ad-two">
        <section className="ad-card ad-pad">
          <div><div className="ad-h3">Payment provider</div><div className="ad-muted" style={{ fontSize: 13 }}>Checkout switches instantly. Both use the same order flow.</div></div>
          <div className="ad-providers">
            {([["paypal", "PayPal", "Live"], ["square", "Square Payments", squareReady ? "Ready to enable" : "Not ready yet"]] as const).map(([id, name, idle]) => {
              const active = s.payment_provider === id;
              return (
                <button key={id} type="button" className={`ad-provider ${active ? "is-active" : ""}`} onClick={() => pickProvider(id, name)} aria-pressed={active} disabled={!ctx.isOwner}>
                  <span className="ad-provider__name">{name}</span>
                  <span className="ad-provider__state" style={{ color: active ? "var(--teal)" : "var(--muted)" }}>{active ? "Active at checkout" : idle}</span>
                </button>
              );
            })}
          </div>
          <div className="ad-checks">
            <div className="ad-strong" style={{ fontWeight: 800, fontSize: 13.5 }}>Square Payments readiness</div>
            {checks.map(([label, ok]) => (
              <div key={label} className="ad-check"><span style={{ background: ok ? "var(--teal)" : "var(--gold)" }}>{ok ? "✓" : "!"}</span>{label}</div>
            ))}
            {!squareReady && <div className="ad-muted ad-sm" style={{ marginTop: 4 }}>Keep PayPal active until the first two checks pass.</div>}
            {squareReady && !r?.webhookKeySet && <div className="ad-muted ad-sm" style={{ marginTop: 4 }}>Recommended: add Square's webhook so stock sold in the store shows up here right away.</div>}
          </div>
        </section>
        <div className="ad-stack">
          <section className="ad-card ad-pad">
            <div className="ad-h3">Shipping (CAD)</div>
            <label className="ad-kv"><span>Standard (5–7 days)</span><input className="sh-input" inputMode="decimal" {...field("standard")} /></label>
            <label className="ad-kv"><span>Express (2–3 days)</span><input className="sh-input" inputMode="decimal" {...field("express")} /></label>
            <label className="ad-kv"><span>Free standard shipping over</span><input className="sh-input" inputMode="decimal" {...field("free")} /></label>
          </section>
          <section className="ad-card ad-pad">
            <div className="ad-h3">Storefront</div>
            <label className="ad-kv"><span>Low-stock threshold</span><input className="sh-input" inputMode="numeric" {...field("low")} /></label>
            <label className="ad-kv"><span>CAD → USD display rate</span><input className="sh-input" inputMode="decimal" {...field("fx")} /></label>
            <div className="ad-kv"><span>Handling time (days)</span>
              <span className="ad-range"><input className="sh-input" inputMode="numeric" aria-label="Minimum days" {...field("hMin")} />–<input className="sh-input" inputMode="numeric" aria-label="Maximum days" {...field("hMax")} /></span>
            </div>
          </section>
          <SettingsPreview form={form} />
          {ctx.isOwner && (
            <div className="ad-save-bar">
              {dirty && <span className="ad-muted ad-sm">Unsaved changes</span>}
              <button type="button" className="sh-btn sh-btn--ghost" disabled={!dirty || saving} onClick={() => setForm(toForm(s))}>Reset</button>
              <button type="button" className="sh-btn" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : "Save settings"}</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SettingsPreview({ form }: { form: ReturnType<typeof toForm> }) {
  const free = Number(form.free);
  const fx = Number(form.fx);
  const days = form.hMin === form.hMax ? form.hMin : `${form.hMin}–${form.hMax}`;
  const low = Number(form.low);
  return (
    <StorefrontPreview label="How shoppers see these settings">
      <div className="ad-preview__bar"><span style={{ color: "var(--gold)" }}>●</span> Free shipping on orders ${Number.isFinite(free) ? (Number.isInteger(free) ? free : free.toFixed(2)) : "—"}+ · Canada &amp; US</div>
      <div className="ad-preview__lines">
        <span style={{ color: "var(--teal)" }}>In stock · ships in {days} days</span>
        <span style={{ color: "var(--red)" }}>Only {Number.isFinite(low) && low > 0 ? low : "a few"} left <span className="ad-muted">(LOW STOCK at {Number.isFinite(low) ? low : "—"} or fewer)</span></span>
        <span>$100.00 CAD shows as <b>US${Number.isFinite(fx) ? (100 * fx).toFixed(2) : "—"}</b> when a shopper picks USD</span>
      </div>
    </StorefrontPreview>
  );
}

function toForm(s: StoreSettings) {
  return {
    standard: (s.shipping_standard_cents / 100).toFixed(2), express: (s.shipping_express_cents / 100).toFixed(2),
    free: (s.free_shipping_threshold_cents / 100).toFixed(2), low: String(s.low_stock_threshold), fx: String(Number(s.fx_cad_usd)),
    hMin: String(s.handling_days_min), hMax: String(s.handling_days_max),
    maintenanceMessage: s.maintenance_message ?? "",
  };
}

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { dayLabel, money, monthLabel, normalizeStatus, relativeAge, shortDate, STATUS_META } from "../format";
import { useEscape } from "../hooks";
import type { Availability, HeroSlide, Order, Product, StoreEvent, StoreSettings } from "../types";
import { addressLine, customerName, ORDER_STATUS, type AdminData, type Screen } from "./data";

export interface Ctx {
  data: AdminData;
  setData: Dispatch<SetStateAction<AdminData>>;
  reload: () => void;
  demo: boolean;
  isOwner: boolean;
  flash: (m: string) => void;
  go: (s: Screen, extra?: { productFilter?: string; orderTab?: string }) => void;
  productFilter: string;
  setProductFilter: (f: string) => void;
  orderTab: string;
  setOrderTab: (t: string) => void;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function adminStatus(p: Product) {
  if (p.availability === "hidden") return { badge: "HIDDEN", color: "#8a8d96" };
  return STATUS_META[normalizeStatus(p.status)];
}

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
      {src && <img src={src} alt="" loading="lazy" />}
    </div>
  );
}

// ================================================================ Dashboard
export function DashboardScreen({ ctx }: { ctx: Ctx }) {
  const d = ctx.data.dashboard;
  const loading = ctx.data.loading;
  const toShip = ctx.data.orders.filter((o) => o.status === "paid" || o.status === "fulfilled");
  const ordersToday = ctx.data.orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length;
  const kpis = [
    { label: "Today's sales", value: money(d?.salesTodayCents ?? 0), note: `${ordersToday} order${ordersToday === 1 ? "" : "s"} today`, color: "var(--muted)", go: () => ctx.go("Orders") },
    { label: "Orders to ship", value: String(d?.toShip ?? 0), note: d?.toShip ? `Oldest ${d.oldestToShipDays} day${d.oldestToShipDays === 1 ? "" : "s"}` : "All caught up", color: d?.toShip ? "var(--red)" : "var(--teal)", go: () => ctx.go("Orders", { orderTab: "To ship" }) },
    { label: "Open pre-orders", value: String(ctx.data.products.filter((p) => p.status === "pre").length), note: `${d?.reservedUnits ?? 0} units reserved`, color: "var(--blue)", go: () => ctx.go("Products", { productFilter: "Pre-order" }) },
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
const PRODUCT_FILTERS: Record<string, (p: Product) => boolean> = {
  All: () => true,
  "In stock": (p) => p.status === "in",
  "Low / sold out": (p) => p.status === "low" || p.status === "out",
  "Pre-order": (p) => p.status === "pre",
  Featured: (p) => !!p.isFeatured,
};

async function patchProduct(ctx: Ctx, id: string, body: Record<string, unknown>) {
  if (!ctx.demo) await api(`/admin/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function ProductsScreen({ ctx }: { ctx: Ctx }) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const products = ctx.data.products;
  const q = query.trim().toLowerCase();
  const rows = products
    .filter(PRODUCT_FILTERS[ctx.productFilter] ?? (() => true))
    .filter((p) => !q || [p.name, p.series, p.janCode, p.category].some((v) => v?.toLowerCase().includes(q)));
  const open = products.find((p) => p.id === openId) ?? null;

  const update = (id: string, patch: Partial<Product>) => ctx.setData((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const toggleFeatured = async (p: Product) => {
    const next = !p.isFeatured;
    update(p.id, { isFeatured: next });
    try { await patchProduct(ctx, p.id, { is_featured: next }); ctx.flash(next ? "Featured on homepage" : "Removed from featured"); }
    catch (e) { update(p.id, { isFeatured: !next }); ctx.flash(errMsg(e)); }
  };

  return (
    <>
      <div className="ad-toolbar">
        <input className="ad-search" type="search" placeholder="Search name, series, JAN…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search products" />
        <div className="ad-chips">
          {Object.keys(PRODUCT_FILTERS).map((n) => (
            <button key={n} type="button" className={`sh-chip ${ctx.productFilter === n ? "is-active" : ""}`} onClick={() => ctx.setProductFilter(n)}>
              {n} · {products.filter(PRODUCT_FILTERS[n]).length}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-table-wrap">
        <div className="ad-table ad-table--products" role="table" aria-label="Products">
          <div className="ad-tr ad-th" role="row">
            <span /><span>Product</span><span>Category</span><span>Price</span><span>Stock</span><span>Status</span><span>Release / order by</span><span>Featured</span>
          </div>
          {ctx.data.loading ? <Empty>Loading products…</Empty> : rows.length === 0 ? (
            <Empty>{products.length ? "No products match." : "No products yet. Run “Sync with Square” to import the catalog."}</Empty>
          ) : rows.map((p) => {
            const st = adminStatus(p);
            return (
              <div key={p.id} role="row" tabIndex={0} className={`ad-tr ad-tr--click ${openId === p.id ? "is-selected" : ""}`}
                onClick={() => setOpenId(p.id)} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(p.id); }}>
                <Thumb src={p.images[0]} />
                <div className="ad-cell-main">
                  <div className="ad-strong ad-ellipsis">{p.name}</div>
                  <div className="ad-muted ad-sm ad-ellipsis">{[p.series, p.janCode].filter(Boolean).join(" · ") || "—"}</div>
                </div>
                <span className="ad-text2">{p.category ?? "—"}</span>
                <span className="ad-strong">{money(p.priceCents)}</span>
                <span className="ad-strong" style={{ color: st.color }}>{p.stockCount == null ? "∞" : p.stockCount}</span>
                <span><span className="sh-badge" style={{ background: st.color }}>{st.badge}</span></span>
                <span className="ad-text2 ad-sm">{p.status === "pre" ? `${monthLabel(p.releaseMonth)} · by ${dayLabel(p.orderByDate)}` : "—"}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <button type="button" className={`sh-toggle ${p.isFeatured ? "is-on" : ""}`} aria-pressed={!!p.isFeatured} aria-label={`Feature ${p.name}`} onClick={() => toggleFeatured(p)} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="ad-foot-note">Name, price, photos and stock are managed in Square Dashboard and sync automatically. Storefront fields (pre-order, dates, series, sale price, featured) are edited here.</p>
      {open && <ProductDrawer key={open.id} ctx={ctx} p={open} onClose={() => setOpenId(null)} onSaved={(patch) => update(open.id, patch)} />}
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
  });
  const [busy, setBusy] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const squareUrl = `https://app.squareup.com/dashboard/items/library/${encodeURIComponent(p.id)}`;

  const save = async () => {
    const compare = form.compareAt.trim() ? Math.round(Number(form.compareAt) * 100) : null;
    const maxPer = form.maxPer.trim() ? Number(form.maxPer) : null;
    if (compare !== null && (!Number.isFinite(compare) || compare < 0)) { ctx.flash("Compare-at price must be a number"); return; }
    if (maxPer !== null && (!Number.isInteger(maxPer) || maxPer < 1)) { ctx.flash("Max per customer must be a whole number"); return; }
    if (form.availability === "preorder" && !form.orderBy) { ctx.flash("Pre-orders need an order-by date"); return; }
    setBusy(true);
    try {
      await patchProduct(ctx, p.id, {
        availability: form.availability,
        release_month: form.release ? `${form.release}-01` : "",
        order_by_date: form.orderBy || "",
        compare_at_cents: compare ?? "",
        max_per_customer: maxPer ?? "",
        series: form.series.trim(),
        jan_code: form.jan.trim(),
      });
      onSaved({
        availability: form.availability, releaseMonth: form.release || null, orderByDate: form.orderBy || null, compareAtCents: compare,
        maxPerCustomer: maxPer, series: form.series.trim() || null, janCode: form.jan.trim() || null,
        ...(ctx.demo ? { status: form.availability === "preorder" ? "pre" : p.status === "pre" ? "in" : p.status } : {}),
      });
      ctx.flash("Product saved");
      onClose();
      if (!ctx.demo) ctx.reload(); // status is derived server-side
    } catch (e) { ctx.flash(errMsg(e)); } finally { setBusy(false); }
  };

  const notify = async () => {
    setNotifying(true);
    try {
      const res = ctx.demo ? { sent: p.alertsWaiting ?? 0 } : await api<{ sent: number }>(`/admin/products/${encodeURIComponent(p.id)}/notify-restock`, { method: "POST" });
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
          <div className="ad-summary">
            <Thumb src={p.images[0]} size={84} />
            <div>
              <div className="ad-strong" style={{ fontSize: 15, fontWeight: 800 }}>{p.name}</div>
              <div className="ad-muted" style={{ fontSize: 13, marginTop: 2 }}>{p.category ?? "Uncategorised"} · {money(p.priceCents)} · stock {p.stockCount == null ? "∞" : p.stockCount}</div>
              <a href={squareUrl} target="_blank" rel="noreferrer" className="ad-link ad-sm" style={{ display: "inline-block", marginTop: 6 }}>Edit in Square ↗</a>
            </div>
          </div>
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
      if (!ctx.demo) await api(`/admin/orders/${o.id}/ship`, { method: "POST", body: JSON.stringify({ trackingNumber: tracking.trim(), carrier }) });
      update({ status: "shipped", tracking_number: tracking.trim(), carrier, shipped_at: new Date().toISOString() });
      ctx.flash(`Order #${o.id} marked shipped`);
      onClose();
    } catch (e) { ctx.flash(errMsg(e)); } finally { setBusy(""); }
  };

  const refund = async () => {
    if (!confirmRefund) { setConfirmRefund(true); return; }
    setBusy("refund");
    try {
      const res = ctx.demo ? { status: "refunded" as const } : await api<{ status: Order["status"] }>(`/admin/orders/${o.id}/refund`, { method: "POST", body: "{}" });
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
      const html = ctx.demo
        ? `<!doctype html><title>Packing slip #${o.id}</title><body style="font:14px system-ui;margin:32px"><h1>Spin Hobby · Packing slip #${o.id}</h1><p>${addressLine(o)}</p><ul>${(o.order_items ?? []).map((i) => `<li>${i.name} × ${i.quantity}</li>`).join("")}</ul></body>`
        : (await api<{ html: string }>(`/admin/orders/${o.id}/packing-slip`)).html;
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
  const featured = ctx.data.products.filter((p) => p.isFeatured);

  const saveSlide = async (s: HeroSlide, patch: Partial<HeroSlide>) => {
    const next = { ...s, ...patch };
    setSlides(slides.map((x) => (x.id === s.id ? next : x)));
    if (ctx.demo || s.id.startsWith("default-")) return;
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
    if (ctx.demo) return;
    try { await api("/admin/homepage/slides/reorder", { method: "PUT", body: JSON.stringify({ ids: next.map((s) => s.id) }) }); }
    catch (e) { ctx.flash(errMsg(e)); ctx.reload(); }
  };

  const addSlide = async () => {
    const draft = { headline: "New slide headline", subheading: "Subheading", image_url: null, link_url: null, is_visible: false, sort_order: slides.length };
    if (ctx.demo) { setSlides([...slides, { id: `demo-${Date.now()}`, ...draft }]); return; }
    try {
      const res = await api<{ slide: HeroSlide }>("/admin/homepage/slides", { method: "POST", body: JSON.stringify({ headline: draft.headline, subheading: draft.subheading, isVisible: false, sortOrder: draft.sort_order }) });
      setSlides([...slides, res.slide]);
      ctx.flash("Slide added (hidden until you switch it on)");
    } catch (e) { ctx.flash(errMsg(e)); }
  };

  const removeSlide = async (s: HeroSlide) => {
    setSlides(slides.filter((x) => x.id !== s.id));
    if (ctx.demo) return;
    try { await api(`/admin/homepage/slides/${s.id}`, { method: "DELETE" }); ctx.flash("Slide removed"); }
    catch (e) { ctx.flash(errMsg(e)); ctx.reload(); }
  };

  return (
    <div className="ad-two">
      <Card title="Hero slides" action={<button type="button" className="sh-btn ad-btn-sm" onClick={addSlide}>+ Add slide</button>}>
        {slides.length === 0 && <Empty>No slides yet. The storefront shows its default welcome slides until you add one.</Empty>}
        {slides.map((s, i) => <SlideRow key={s.id} s={s} first={i === 0} last={i === slides.length - 1} onMove={(d) => move(i, d)} onSave={(patch) => saveSlide(s, patch)} onRemove={() => removeSlide(s)} />)}
      </Card>
      <div className="ad-stack">
        <Card title={<>Featured products <span className="ad-muted" style={{ fontWeight: 600, fontSize: 13 }}>· toggle in Products</span></>}>
          {featured.length === 0 ? <Empty>No featured products. Switch on “Featured” in Products.</Empty> : featured.map((p, i) => (
            <div key={p.id} className="ad-line"><span className="ad-muted" style={{ fontWeight: 800, width: 18 }}>{i + 1}</span><span className="ad-line__main">{p.name}</span><span className="ad-strong">{money(p.priceCents)}</span></div>
          ))}
        </Card>
        <EventsCard ctx={ctx} />
      </div>
    </div>
  );
}

function SlideRow({ s, first, last, onMove, onSave, onRemove }: {
  s: HeroSlide; first: boolean; last: boolean; onMove: (d: number) => void; onSave: (patch: Partial<HeroSlide>) => void; onRemove: () => void;
}) {
  const [headline, setHeadline] = useState(s.headline);
  const [sub, setSub] = useState(s.subheading ?? "");
  const [image, setImage] = useState(s.image_url ?? "");
  const [showImage, setShowImage] = useState(false);
  return (
    <div className="ad-slide" style={{ opacity: s.is_visible ? 1 : 0.55 }}>
      <div className="ad-slide__order">
        <button type="button" onClick={() => onMove(-1)} disabled={first} aria-label="Move up">▲</button>
        <button type="button" onClick={() => onMove(1)} disabled={last} aria-label="Move down">▼</button>
      </div>
      <button type="button" className={`ad-slide__img ${s.image_url ? "" : "sh-ph sh-ph--xs"}`} onClick={() => setShowImage((v) => !v)} title="Set image URL">
        {s.image_url ? <img src={s.image_url} alt="" /> : "[ image ]"}
      </button>
      <div className="ad-slide__fields">
        <input className="sh-input ad-slide__headline" value={headline} onChange={(e) => setHeadline(e.target.value)} aria-label="Headline"
          onBlur={() => headline.trim() && headline !== s.headline && onSave({ headline: headline.trim() })} />
        <input className="sh-input ad-slide__sub" value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Subheading"
          onBlur={() => sub !== (s.subheading ?? "") && onSave({ subheading: sub || null })} />
        {showImage && (
          <div className="ad-row-gap">
            <input className="sh-input ad-slide__sub" placeholder="https://… image URL (leave blank for mascot)" value={image} onChange={(e) => setImage(e.target.value)} aria-label="Image URL" />
            <button type="button" className="sh-btn ad-btn-sm" onClick={() => { onSave({ image_url: image.trim() || null }); setShowImage(false); }}>Save</button>
          </div>
        )}
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
    if (ctx.demo) return;
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
    if (ctx.demo || e.id.startsWith("default-") || e.id.startsWith("new-")) return;
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
  return (
    <div className="ad-event">
      <input className="ad-event__name" value={name} placeholder="Event name" aria-label="Event name" onChange={(x) => setName(x.target.value)}
        onBlur={() => name.trim() && name !== e.name && onSave({ name: name.trim() })} />
      <input className="sh-input ad-event__date" type="date" aria-label="Start date" value={e.start_date ?? ""} onChange={(x) => name.trim() && onSave({ name: name.trim(), start_date: x.target.value || null })} />
      <input className="sh-input ad-event__date" type="date" aria-label="End date" value={e.end_date ?? ""} onChange={(x) => name.trim() && onSave({ name: name.trim(), end_date: x.target.value || null })} />
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
    if (!ctx.demo) {
      const res = await api<{ settings: StoreSettings }>("/admin/settings", { method: "PUT", body: JSON.stringify(patch) });
      ctx.setData((d) => ({ ...d, settings: res.settings }));
    } else {
      ctx.setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
    }
  };

  const pickProvider = async (id: "paypal" | "square", name: string) => {
    if (!ctx.isOwner) { ctx.flash("Only the owner can change payments"); return; }
    if (id === s.payment_provider) return;
    try { await put({ payment_provider: id }); ctx.flash(`Checkout now uses ${name}`); } catch (e) { ctx.flash(errMsg(e)); }
  };

  const save = async () => {
    const cents = (v: string) => Math.round(Number(v) * 100);
    const patch: Partial<StoreSettings> = {
      shipping_standard_cents: cents(form.standard), shipping_express_cents: cents(form.express), free_shipping_threshold_cents: cents(form.free),
      low_stock_threshold: Number(form.low), fx_cad_usd: Number(form.fx), handling_days_min: Number(form.hMin), handling_days_max: Number(form.hMax),
    };
    if (Object.values(patch).some((v) => !Number.isFinite(v as number) || (v as number) < 0)) { ctx.flash("Check the numbers. Values must be zero or more"); return; }
    if (patch.handling_days_max! < patch.handling_days_min!) { ctx.flash("Handling max must be at least the min"); return; }
    setSaving(true);
    try { await put(patch); ctx.flash("Settings saved"); } catch (e) { ctx.flash(errMsg(e)); } finally { setSaving(false); }
  };

  const checks: [string, boolean | undefined][] = [
    ["Square app & location connected", r?.appAndLocationConnected],
    ["Catalog + inventory syncing", r?.catalogAndInventorySyncing],
    ["Webhook signature key set", r?.webhookKeySet],
    ["Sandbox test payments passed", r?.sandboxPaymentsConfigured],
    ["3-D Secure (verifyBuyer) enabled", r?.threeDSecureEnabled],
    ["Apple Pay domain verified", r?.applePayDomainVerified],
  ];
  const squareReady = checks.every(([, ok]) => ok);
  const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value })), disabled: !ctx.isOwner });

  return (
    <>
      {!ctx.isOwner && <div className="ad-banner">Settings are read-only for staff accounts.</div>}
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
            {!squareReady && <div className="ad-muted ad-sm" style={{ marginTop: 4 }}>Keep PayPal active until every check passes.</div>}
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

function toForm(s: StoreSettings) {
  return {
    standard: (s.shipping_standard_cents / 100).toFixed(2), express: (s.shipping_express_cents / 100).toFixed(2),
    free: (s.free_shipping_threshold_cents / 100).toFixed(2), low: String(s.low_stock_threshold), fx: String(Number(s.fx_cad_usd)),
    hMin: String(s.handling_days_min), hMax: String(s.handling_days_max),
  };
}

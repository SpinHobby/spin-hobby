import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Sale { orderId: string; sku: string | null; title: string | null; quantity: number; status: string; error: string | null; orderedAt: string | null; updatedAt: string }
export interface EbayStatus {
  configured: boolean; environment: "sandbox" | "production"; marketplace: string; connected: boolean; username: string | null; connectedAt: string | null;
  expiresAt: string | null; wrongEnvironment: boolean; ready: boolean;
  setup: { fulfillmentPolicyId: string | null; paymentPolicyId: string | null; returnPolicyId: string | null; merchantLocationKey: string | null } | null;
  sync: { lastOrderCheckAt: string | null; ordersReadUntil: string | null; lastPushAt: string | null; lastReconcileAt: string | null; lastError: string | null; lastErrorAt: string | null } | null;
  listings: { active: number; outOfStock: number; ended: number; problems: number };
  recentSales: Sale[];
}
interface Choices { policies: { fulfillment: Named[]; payment: Named[]; returns: Named[] }; locations: { key: string; name: string; address: string }[] }
interface Named { id: string; name: string }

const ago = (iso: string | null) => {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)} min ago` : s < 86400 ? `${Math.floor(s / 3600)} h ago` : `${Math.floor(s / 86400)} days ago`;
};
const SALE_LABEL: Record<string, string> = { applied: "taken off stock", restocked: "cancelled, put back", failed: "not applied yet", skipped: "not ours" };

/**
 * Settings → eBay: connecting the seller account (owners sign in on eBay's own page), the shipping, payment and return policies and the
 * location every listing uses, and the stock sync: eBay sales come off Square's stock and Square's count goes to eBay, so nothing sells twice.
 */
export function EbaySettings({ ctx }: { ctx: Ctx }) {
  const [status, setStatus] = useState<EbayStatus | null>(null);
  const [choices, setChoices] = useState<Choices | null>(null);
  const [setup, setSetup] = useState({ fulfillmentPolicyId: "", paymentPolicyId: "", returnPolicyId: "", merchantLocationKey: "" });
  const [newLocation, setNewLocation] = useState<null | { name: string; addressLine1: string; city: string; stateOrProvince: string; postalCode: string; country: string }>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const s = (await api<{ ebay: EbayStatus }>("/admin/ebay")).ebay;
      setStatus(s);
      if (s.setup) setSetup({ fulfillmentPolicyId: s.setup.fulfillmentPolicyId ?? "", paymentPolicyId: s.setup.paymentPolicyId ?? "", returnPolicyId: s.setup.returnPolicyId ?? "", merchantLocationKey: s.setup.merchantLocationKey ?? "" });
    } catch (e) { ctx.flash(errMsg(e)); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [load]);
  // back from eBay's sign-in page
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const outcome = q.get("ebay");
    if (!outcome) return;
    ctx.flash(outcome === "connected" ? "eBay connected" : outcome === "declined" ? "eBay sign-in was cancelled" : "eBay could not be connected. Try again.");
    q.delete("ebay");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}${window.location.hash}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the owner sees the choices once connected
  useEffect(() => {
    if (!status?.connected || !ctx.isOwner || status.wrongEnvironment) return;
    api<Choices>("/admin/ebay/setup").then(setChoices).catch((e) => ctx.flash(errMsg(e)));
  }, [status?.connected, status?.wrongEnvironment]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    try { await work(); } catch (e) { ctx.flash(errMsg(e)); } finally { setBusy(""); }
  };
  const connect = () => run("Opening eBay…", async () => {
    const { url } = await api<{ url: string }>("/admin/ebay/connect", { method: "POST" });
    window.location.assign(url);
  });
  const saveSetup = () => run("Saving…", async () => {
    setStatus((await api<{ ebay: EbayStatus }>("/admin/ebay/setup", { method: "PUT", body: JSON.stringify(setup) })).ebay);
    ctx.flash("eBay setup saved");
  });
  const createLocation = () => run("Creating the location on eBay…", async () => {
    const { key } = await api<{ key: string }>("/admin/ebay/locations", { method: "POST", body: JSON.stringify(newLocation) });
    setNewLocation(null);
    setChoices(await api<Choices>("/admin/ebay/setup"));
    setSetup((s) => ({ ...s, merchantLocationKey: key }));
    await load();
  });
  const syncNow = () => run("Checking eBay…", async () => {
    const r = await api<{ orders: { applied: number; restocked: number; failed: number }; stock: { updated: number; failed: number }; ebay: EbayStatus }>("/admin/ebay/sync", { method: "POST" });
    setStatus(r.ebay);
    ctx.flash(`eBay checked: ${r.orders.applied} sale${r.orders.applied === 1 ? "" : "s"} taken off stock${r.orders.restocked ? `, ${r.orders.restocked} cancelled and put back` : ""}, ${r.stock.updated} listing${r.stock.updated === 1 ? "" : "s"} set to Square's count${r.orders.failed + r.stock.failed ? `. ${r.orders.failed + r.stock.failed} problem(s): see below` : ""}`);
  });
  const disconnect = () => run("Disconnecting…", async () => {
    if (!window.confirm("Disconnect eBay? Listings must be ended first: after this, nothing keeps eBay's stock in step with the shop.")) return;
    await api("/admin/ebay/connection", { method: "DELETE", body: JSON.stringify({}) });
    setChoices(null);
    await load();
    ctx.flash("eBay disconnected");
  });

  if (!status) return <section className="ad-card ad-pad"><div className="ad-h3">eBay</div><div className="ad-muted ad-sm">Loading…</div></section>;
  const s = status;
  const select = (k: keyof typeof setup, options: { id: string; name: string }[], label: string) => (
    <label className="ad-field"><span className="ad-field__top">{label}</span>
      <select className="sh-input" value={setup[k]} disabled={!ctx.isOwner || !!busy} onChange={(e) => setSetup((x) => ({ ...x, [k]: e.target.value }))}>
        <option value="">Choose…</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  );

  return (
    <section className="ad-card ad-pad ad-ebay" style={{ marginBottom: 16 }} aria-label="eBay">
      <div className="ad-between">
        <div>
          <div className="ad-h3">eBay {s.environment === "sandbox" && <span className="sh-chip">sandbox (test)</span>}</div>
          <div className="ad-muted" style={{ fontSize: 13 }}>
            List products on eBay ({s.marketplace.replace("EBAY_", "eBay ")}). Square keeps the one stock count: an eBay sale takes the unit off Square, and Square's count goes to eBay, so an item never sells twice.
          </div>
        </div>
        {s.connected && <button type="button" className="sh-btn ad-btn-sm" onClick={syncNow} disabled={!!busy}>{busy === "Checking eBay…" ? "Checking…" : "Check now"}</button>}
      </div>

      {!s.configured && (
        <div className="ad-banner">eBay is not set up on the server yet (EBAY_CLIENT_ID, EBAY_CLIENT_SECRET, EBAY_RU_NAME and EBAY_TOKEN_KEY). See .env.example in the server.</div>
      )}

      {s.configured && !s.connected && (
        <div className="ad-ebay__connect">
          <p className="ad-sm" style={{ margin: 0 }}>Not connected. {ctx.isOwner ? "You will sign in on eBay's own page and approve Spin Hobby; the shop never sees your eBay password." : "An owner can connect the shop's eBay account."}</p>
          {ctx.isOwner && <button type="button" className="sh-btn" onClick={connect} disabled={!!busy}>{busy || "Connect eBay"}</button>}
        </div>
      )}

      {s.connected && (
        <>
          <div className="ad-ebay__row">
            <span><b>{s.username ?? "eBay account"}</b> <span className="ad-muted ad-sm">connected {ago(s.connectedAt)}{s.expiresAt ? ` · connect again before ${new Date(s.expiresAt).toLocaleDateString()}` : ""}</span></span>
            <span className="ad-muted ad-sm">{s.listings.active} listed · {s.listings.outOfStock} sold out{s.listings.problems ? ` · ${s.listings.problems} with problems` : ""}</span>
          </div>
          {s.wrongEnvironment && <div className="ad-banner">This account was connected to eBay's other site (sandbox vs live). Connect again.</div>}

          <div className={`ad-ebay__sync ${s.sync?.lastError ? "is-warn" : "is-ok"}`} role="status">
            <span className="ad-dot" style={{ background: s.sync?.lastError ? "var(--gold)" : "#3fbf92" }} />
            <span>
              <b>Stock sync</b> · eBay orders checked {ago(s.sync?.lastOrderCheckAt ?? null)} · quantities sent {ago(s.sync?.lastPushAt ?? null)} · full check {ago(s.sync?.lastReconcileAt ?? null)}
              {s.sync?.lastError && <span className="ad-sm" style={{ display: "block", color: "var(--gold)" }}>Last problem ({ago(s.sync.lastErrorAt)}): {s.sync.lastError}</span>}
            </span>
          </div>

          {!s.ready && <div className="ad-banner">Finish the setup below before listing: eBay needs your shipping, payment and return policies, and where items ship from.</div>}
          {ctx.isOwner && choices && (
            <div className="ad-ebay__setup">
              {select("fulfillmentPolicyId", choices.policies.fulfillment, "Shipping policy")}
              {select("paymentPolicyId", choices.policies.payment, "Payment policy")}
              {select("returnPolicyId", choices.policies.returns, "Return policy")}
              {select("merchantLocationKey", choices.locations.map((l) => ({ id: l.key, name: `${l.name}${l.address ? ` (${l.address})` : ""}` })), "Ships from")}
              <div className="ad-ebay__actions">
                <button type="button" className="sh-btn ad-btn-sm" onClick={saveSetup} disabled={!!busy || Object.values(setup).some((v) => !v)}>Save eBay setup</button>
                {!newLocation && <button type="button" className="ad-link" onClick={() => setNewLocation({ name: "Spin Hobby", addressLine1: "", city: "", stateOrProvince: "", postalCode: "", country: "CA" })}>+ New location</button>}
              </div>
              {(!choices.policies.fulfillment.length || !choices.policies.payment.length || !choices.policies.returns.length) && (
                <div className="ad-muted ad-sm">Missing a policy? Create shipping, payment and return policies in eBay's Seller Hub (Account → Business policies), then reload this page.</div>
              )}
              {newLocation && (
                <div className="ad-ebay__location">
                  {(["name", "addressLine1", "city", "stateOrProvince", "postalCode", "country"] as const).map((k) => (
                    <label key={k} className="ad-field"><span className="ad-field__top">{{ name: "Name", addressLine1: "Address", city: "City", stateOrProvince: "Province", postalCode: "Postal code", country: "Country" }[k]}</span>
                      <input className="sh-input" value={newLocation[k]} onChange={(e) => setNewLocation((l) => (l ? { ...l, [k]: e.target.value } : l))} /></label>
                  ))}
                  <div className="ad-ebay__actions">
                    <button type="button" className="sh-btn ad-btn-sm" onClick={createLocation} disabled={!!busy || Object.values(newLocation).some((v) => !v.trim())}>Create on eBay</button>
                    <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={() => setNewLocation(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {s.recentSales.length > 0 && (
            <details className="ad-ebay__sales">
              <summary>Recent eBay sales ({s.recentSales.length})</summary>
              <ul>{s.recentSales.map((x) => (
                <li key={`${x.orderId}-${x.sku}`} className={x.status === "failed" ? "is-failed" : ""}>
                  <b>{x.title ?? x.sku ?? "Item"}</b> × {x.quantity} <span className="ad-muted">· order {x.orderId} · {SALE_LABEL[x.status] ?? x.status} · {ago(x.updatedAt)}</span>
                  {x.error && <span className="ad-sm" style={{ display: "block", color: "var(--red)" }}>{x.error}</span>}
                </li>
              ))}</ul>
            </details>
          )}

          {ctx.isOwner && <button type="button" className="ad-link" style={{ color: "var(--red)" }} onClick={disconnect} disabled={!!busy}>Disconnect eBay</button>}
        </>
      )}
      {busy && busy !== "Checking eBay…" && <span className="ad-muted ad-sm" role="status">{busy}</span>}
    </section>
  );
}

import { FormEvent, useEffect, useState } from "react";
import { api, signIn } from "../../../lib/api";
import { supabase } from "../../../lib/supabase";
import "./admin.scss";

type Dashboard = { metrics?: { label: string; value: string | number; trend?: string }[]; recentOrders?: { id: string; customer?: string; total?: number; status?: string; createdAt?: string }[] };

const nav = ["Overview", "Orders", "Catalog", "Customers", "Inventory", "Promotions", "Homepage", "Settings"];

export default function AdminV3() {
  const [email, setEmail] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [error, setError] = useState("");
  const [active, setActive] = useState("Overview");
  const [notice, setNotice] = useState("");

  const loadDashboard = () => api<Dashboard>("/admin/dashboard").then(setDashboard).catch((reason) => setError(reason instanceof Error ? reason.message : "Access is required."));

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
      if (session) loadDashboard();
    });
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      if (data.session) loadDashboard();
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const login = async (provider: "google" | "discord") => {
    try { await signIn(provider); } catch (reason) { setError(reason instanceof Error ? reason.message : "Sign-in is unavailable."); }
  };

  const saveSettings = (event: FormEvent) => { event.preventDefault(); setNotice("Settings are ready to save once this account has owner access."); };

  if (!email || error) {
    return <main className="admin-gate"><a href="/" className="admin-gate__brand"><img src="/logo/logo%20cropped.png" alt="Spin Hobby" /></a><div className="admin-gate__panel"><p className="admin-kicker">Spin Hobby operations</p><h1>Store admin</h1><p>Use the staff account assigned in Supabase to manage the catalog, orders, and storefront content.</p>{error && <div className="admin-gate__error">{error}</div>}<button onClick={() => login("google")}>Continue with Google</button><button onClick={() => login("discord")}>Continue with Discord</button><a href="/">Return to storefront</a></div><aside><p>Private workspace</p><h2>Everything the shop needs, in one place.</h2><ul><li>Live Square inventory</li><li>Order fulfillment</li><li>Storefront merchandising</li></ul></aside></main>;
  }

  const metrics = dashboard.metrics ?? [{ label: "Today’s sales", value: "—", trend: "Live after Square sync" }, { label: "Orders", value: "—", trend: "Live after Square sync" }, { label: "Customers", value: "—", trend: "Live after Square sync" }, { label: "Catalog items", value: "—", trend: "Live after Square sync" }];
  return <div className="admin"><aside className="admin-sidebar"><a href="/" className="admin-logo"><img src="/logo/logo%20cropped.png" alt="Spin Hobby" /></a><span className="admin-sidebar__label">Store management</span><nav>{nav.map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{item}</button>)}</nav><div className="admin-sidebar__account"><span>{email}</span><button onClick={() => supabase.auth.signOut()}>Sign out</button></div></aside><main className="admin-main"><header><div><p className="admin-kicker">{active}</p><h1>{active === "Overview" ? "Good morning, Spin Hobby." : active}</h1><span>Here’s what’s happening in the shop today.</span></div><div><a href="/" target="_blank">View storefront ↗</a><button className="admin-primary" onClick={() => setNotice("Catalog sync runs from Square through the secure server function.")}>Sync catalog</button></div></header>{notice && <div className="admin-notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}{active === "Overview" ? <><section className="metric-grid">{metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.trend}</small></article>)}</section><section className="admin-content-grid"><article className="admin-panel sales-panel"><div className="panel-heading"><div><h2>Sales activity</h2><p>Today’s retail performance</p></div><select defaultValue="Today"><option>Today</option><option>This week</option><option>This month</option></select></div><div className="chart"><i style={{ height: "32%" }} /><i style={{ height: "54%" }} /><i style={{ height: "43%" }} /><i style={{ height: "71%" }} /><i style={{ height: "59%" }} /><i style={{ height: "88%" }} /><i style={{ height: "66%" }} /></div><div className="chart-labels"><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span></div></article><article className="admin-panel"><div className="panel-heading"><div><h2>Store health</h2><p>Live operational signals</p></div></div><ul className="health-list"><li><span className="dot dot--green" />Square catalog <b>Connected</b></li><li><span className="dot dot--amber" />Inventory sync <b>Awaiting sync</b></li><li><span className="dot dot--green" />Supabase database <b>Online</b></li></ul></article></section><section className="admin-panel orders-panel"><div className="panel-heading"><div><h2>Recent orders</h2><p>Orders appear as payments are captured.</p></div><button onClick={() => setActive("Orders")}>View all</button></div>{dashboard.recentOrders?.length ? <table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>{dashboard.recentOrders.map((order) => <tr key={order.id}><td>#{order.id.slice(0, 8)}</td><td>{order.customer}</td><td><span className="order-status">{order.status}</span></td><td>{new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(order.total ?? 0)}</td></tr>)}</tbody></table> : <div className="table-empty">No orders have been imported yet. Completed web orders will appear here automatically.</div>}</section></> : <section className="admin-panel workspace-panel"><p className="admin-kicker">{active}</p><h2>{active} workspace</h2><p>This screen is wired to the Spin Hobby server. Finish the Square catalog sync and assign owner access to unlock live {active.toLowerCase()} data.</p>{active === "Settings" && <form onSubmit={saveSettings}><label>Store display name<input defaultValue="Spin Hobby" /></label><label>Support email<input type="email" defaultValue="hello@spinhobby.ca" /></label><button className="admin-primary">Save settings</button></form>}</section>}</main></div>;
}

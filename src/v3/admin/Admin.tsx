import { useCallback, useMemo, useState } from "react";
import "../tokens.scss";
import "../storefront/storefront.scss"; // previews render real storefront components
import "./admin.scss";
import { api, signIn } from "../../lib/api";
import { initials, relativeAge } from "../format";

function syncAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${relativeAge(iso)} ago`;
}
import { DEMO_ALLOWED, useAuth, useTheme, useToast } from "../hooks";
import { SCREENS, useAdminData, type Screen } from "./data";
import { DashboardScreen, HomepageScreen, OrdersScreen, ProductsScreen, SettingsScreen, type Ctx } from "./Screens";

const LOGO = "/logo/logo%20cropped.png";

export default function Admin() {
  const demo = DEMO_ALLOWED && new URLSearchParams(window.location.search).has("demo");
  const auth = useAuth();
  const { theme, toggle } = useTheme();
  const { toast, flash } = useToast();
  const isStaff = demo || auth.user?.role === "staff" || auth.user?.role === "owner";
  const isOwner = demo || auth.user?.role === "owner";
  const { data, setData, reload } = useAdminData(isStaff, demo);

  const [screen, setScreenState] = useState<Screen>(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return (SCREENS as string[]).includes(hash) ? (hash as Screen) : "Dashboard";
  });
  const [productFilter, setProductFilter] = useState("All");
  const [orderTab, setOrderTab] = useState("All");
  const [syncing, setSyncing] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const go = useCallback((next: Screen, extra?: { productFilter?: string; orderTab?: string }) => {
    setScreenState(next);
    if (extra?.productFilter) setProductFilter(extra.productFilter);
    if (extra?.orderTab) setOrderTab(extra.orderTab);
    setNavOpen(false);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  }, []);

  const toShipCount = useMemo(() => data.orders.filter((o) => o.status === "paid" || o.status === "fulfilled").length, [data.orders]);
  const lowCount = useMemo(() => data.products.filter((p) => p.status === "low" || p.status === "out").length, [data.products]);

  if (!demo && !auth.ready) {
    return <div className="sh ad-gate"><div className="ad-gate__card"><img src={LOGO} alt="Spin Hobby" /><div className="sh-skeleton" style={{ height: 14, width: "70%" }} /></div></div>;
  }
  if (!demo && (!auth.session || !isStaff)) {
    return <Gate signedInAs={auth.session ? auth.email : null} onSignOut={auth.signOut} />;
  }

  const syncNow = async () => {
    if (!isOwner) { flash("Only the owner can run a full Square sync"); return; }
    setSyncing(true);
    try {
      if (!demo) await api("/admin/square/sync", { method: "POST" });
      flash("Synced catalog & inventory from Square");
      if (demo) setData((d) => ({ ...d, readiness: d.readiness && { ...d.readiness, lastSyncAt: new Date().toISOString() } }));
      else reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const ctx: Ctx = { data, setData, reload, demo, isOwner, flash, go, productFilter, setProductFilter, orderTab, setOrderTab };
  const lastSync = data.readiness?.lastSyncAt;
  const connected = !!data.readiness?.appAndLocationConnected;

  return (
    <div className="sh ad">
      {navOpen && <div className="sh-overlay ad-nav-overlay" onClick={() => setNavOpen(false)} />}
      <aside className={`ad-side ${navOpen ? "is-open" : ""}`}>
        <div className="ad-side__brand">
          <a href="/"><img src={LOGO} alt="Spin Hobby" /></a>
          <span className="ad-tag">ADMIN</span>
        </div>
        <nav className="ad-side__nav" aria-label="Admin">
          {SCREENS.map((n) => {
            const badge = n === "Orders" ? toShipCount : n === "Products" ? lowCount : 0;
            return (
              <button key={n} type="button" className={screen === n ? "is-active" : ""} aria-current={screen === n ? "page" : undefined} onClick={() => go(n)}>
                <span className="ad-side__item"><span className="ad-side__dot" />{n}</span>
                {badge > 0 && <span className="ad-side__badge">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="ad-side__foot">
          <div className="ad-side__status">
            <span className="ad-dot" style={{ background: connected ? "#3fbf92" : "#f06a6e" }} />
            <span>{connected ? `Square connected · synced ${syncAgo(lastSync)}` : "Square not connected"}</span>
          </div>
          <div className="ad-side__status">
            <span className="ad-dot" style={{ background: "var(--gold)" }} />
            <span>Payments: {data.settings.payment_provider === "square" ? "Square" : "PayPal"}</span>
          </div>
          <button type="button" className="ad-side__sync" onClick={syncNow} disabled={syncing}>{syncing ? "Syncing…" : "Sync with Square"}</button>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-top">
          <button type="button" className="sh-icon-btn ad-burger" onClick={() => setNavOpen(true)} aria-label="Open menu">☰</button>
          <h1 className="sh-display">{screen}</h1>
          <button type="button" className="ad-theme" onClick={toggle} aria-label="Toggle dark mode">{theme === "dark" ? "☀" : "☾"}</button>
          <a href="/" target="_blank" rel="noreferrer" className="ad-top__store">View store ↗</a>
          <div className="ad-user" title={auth.email ?? "Demo"}>
            <span className="ad-avatar">{demo ? "SH" : initials(auth.email)}</span>
            <span className="ad-user__role">{demo ? "Demo" : auth.user?.role === "owner" ? "Owner" : "Staff"}</span>
            {!demo && <button type="button" className="ad-user__out" onClick={auth.signOut}>Sign out</button>}
          </div>
        </header>

        <main className="ad-content">
          {demo && <div className="ad-banner">Demo mode: sample data, and changes are not saved.</div>}
          {data.errors.length > 0 && (
            <div className="ad-banner ad-banner--error" role="alert">
              <span>Some data couldn't load: {data.errors.join(" · ")}</span>
              <button type="button" onClick={reload}>Retry</button>
            </div>
          )}
          {screen === "Dashboard" && <DashboardScreen ctx={ctx} />}
          {screen === "Products" && <ProductsScreen ctx={ctx} />}
          {screen === "Orders" && <OrdersScreen ctx={ctx} />}
          {screen === "Homepage" && <HomepageScreen ctx={ctx} />}
          {screen === "Settings" && <SettingsScreen ctx={ctx} />}
        </main>
      </div>

      {toast && <div className="sh-toast" role="status" aria-live="polite">{toast}</div>}
    </div>
  );
}

function Gate({ signedInAs, onSignOut }: { signedInAs: string | null; onSignOut: () => void }) {
  const [error, setError] = useState("");
  const login = (provider: "google" | "discord") => signIn(provider).catch((e: Error) => setError(e.message));
  return (
    <div className="sh ad-gate">
      <div className="ad-gate__card">
        <div className="ad-gate__brand"><img src={LOGO} alt="Spin Hobby" /><span className="ad-tag">ADMIN</span></div>
        {signedInAs ? (
          <>
            <h1 className="sh-display">No admin access</h1>
            <p><b>{signedInAs}</b> is signed in but isn't a staff or owner account. Ask the store owner to set your role in Supabase.</p>
            <button type="button" className="sh-btn" onClick={onSignOut}>Sign in with another account</button>
          </>
        ) : (
          <>
            <h1 className="sh-display">Staff sign in</h1>
            <p>Manage products, orders, homepage content and payments for spinhobby.com.</p>
            <button type="button" className="sh-btn" onClick={() => login("google")}>Continue with Google</button>
            <button type="button" className="sh-btn sh-btn--ghost" onClick={() => login("discord")}>Continue with Discord</button>
          </>
        )}
        {error && <span className="ad-error">{error}</span>}
        <a href="/" className="ad-gate__back">← Back to the store</a>
      </div>
    </div>
  );
}

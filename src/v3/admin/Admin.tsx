import { useCallback, useState } from "react";
import "../../components/styles/tokens.scss";
import "../storefront/storefront.scss"; // previews render real storefront components
// the shared panel styles load before the admin's own, which refine a few of them
import "../../components/styles/components.scss";
import "./admin.scss";
import { Banner, PanelLayout, PanelStatus } from "../../components";
import { api } from "../../lib/api";
import { SignInPanel } from "../SignIn";
import { initials, relativeAge } from "../format";

function syncAgo(iso: string | null | undefined) {
  if (!iso) return "never";
  const min = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  return `${relativeAge(iso)} ago`;
}
import { useAuth, useTheme, useToast } from "../hooks";
import { useDocumentHead } from "../seo";
import { useStoreConfig } from "../storeConfig";
import { SCREENS, useAdminData, type Screen } from "./data";
import { CategoriesScreen } from "./Categories";
import { ImportsScreen } from "./Imports";
import { PhotosScreen } from "./PhotoQueue";
import { DescriptionsScreen } from "./Descriptions";
import { DashboardScreen, HomepageScreen, OrdersScreen, ProductsScreen, SettingsScreen, type Ctx } from "./Screens";

const LOGO = "/logo/logo%20cropped.png";

export default function Admin() {
  useDocumentHead({ title: "Admin | Spin Hobby", description: "Admin", path: "/admin", noindex: true });
  // what checkout really uses: on a local copy with no payment keys that is a test payment, whatever the setting says
  const checkoutProvider = useStoreConfig()?.provider;
  const auth = useAuth();
  const { theme, toggle } = useTheme();
  const { toast, flash } = useToast();
  const isStaff = auth.user?.role === "staff" || auth.user?.role === "owner";
  const isOwner = auth.user?.role === "owner";
  const { data, setData, reload } = useAdminData(isStaff);

  const [screen, setScreenState] = useState<Screen>(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    return (SCREENS as string[]).includes(hash) ? (hash as Screen) : "Dashboard";
  });
  const [productFilter, setProductFilter] = useState("All");
  const [orderTab, setOrderTab] = useState("All");
  const [syncing, setSyncing] = useState(false);

  const go = useCallback((next: Screen, extra?: { productFilter?: string; orderTab?: string }) => {
    setScreenState(next);
    if (extra?.productFilter) setProductFilter(extra.productFilter);
    if (extra?.orderTab) setOrderTab(extra.orderTab);
    window.history.replaceState(null, "", `#${next}`); // PanelLayout scrolls to the top and eases the new screen in
  }, []);

  // Sidebar badges come straight from the server's dashboard numbers.
  const toShipCount = data.dashboard?.toShip ?? 0;
  const lowCount = data.dashboard?.lowStock ?? 0;

  if (!auth.ready) {
    return (
      <div className="sh ad-gate">
        <div className="ad-gate__card">
          <img src={LOGO} alt="Spin Hobby" />
          <div className="sh-skeleton" style={{ height: 14, width: "70%" }} />
        </div>
      </div>
    );
  }
  if (!auth.session || !isStaff) {
    return <Gate signedInAs={auth.session ? auth.email : null} onSignOut={auth.signOut} />;
  }

  const syncNow = async () => {
    if (!isOwner) {
      flash("Only the owner can run a full Square sync");
      return;
    }
    setSyncing(true);
    try {
      await api("/admin/square/sync", { method: "POST" });
      flash("Synced catalog & inventory from Square");
      reload();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const ctx: Ctx = { data, setData, reload, isOwner, flash, go, productFilter, setProductFilter, orderTab, setOrderTab };
  const lastSync = data.readiness?.lastSyncAt;
  const connected = !!data.readiness?.appAndLocationConnected;

  return (
    <PanelLayout
      tag="ADMIN"
      navLabel="Admin"
      tabs={SCREENS.map((n) => ({ key: n, label: n, badge: n === "Orders" ? toShipCount : n === "Products" ? lowCount : 0 }))}
      active={screen}
      onSelect={(n) => go(n)}
      title={screen}
      footer={
        <>
          <PanelStatus color={connected ? "#3fbf92" : "#f06a6e"}>
            {connected
              ? lastSync
                ? `Square connected · synced ${syncAgo(lastSync)}`
                : "Square connected · not synced yet"
              : "Square not connected"}
          </PanelStatus>
          <PanelStatus color="var(--gold)">
            Payments:{" "}
            {checkoutProvider === "test" ? "test payments (no money)" : data.settings.payment_provider === "square" ? "Square" : "PayPal"}
          </PanelStatus>
          <button type="button" className="ui-side__sync" onClick={syncNow} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync with Square"}
          </button>
        </>
      }
      topActions={
        <>
          <button type="button" className="ui-theme" onClick={toggle} aria-label="Toggle dark mode">
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <a href="/" target="_blank" rel="noreferrer" className="ui-top__store">
            View store ↗
          </a>
          <div className="ui-user" title={auth.email ?? "Demo"}>
            <span className="ui-avatar">{initials(auth.email)}</span>
            <span className="ui-user__role">{auth.user?.role === "owner" ? "Owner" : "Staff"}</span>
            <button type="button" className="ui-user__out" onClick={auth.signOut}>
              Sign out
            </button>
          </div>
        </>
      }
      banner={
        data.errors.length > 0 && (
          <Banner tone="error" action={{ label: "Retry", onClick: reload }}>
            Some data couldn't load: {data.errors.join(" · ")}
          </Banner>
        )
      }
      toast={toast}
    >
      {screen === "Dashboard" && <DashboardScreen ctx={ctx} />}
      {screen === "Products" && <ProductsScreen ctx={ctx} />}
      {screen === "Imports" && <ImportsScreen ctx={ctx} />}
      {screen === "Photos" && <PhotosScreen ctx={ctx} />}
      {screen === "Descriptions" && <DescriptionsScreen ctx={ctx} />}
      {screen === "Categories" && <CategoriesScreen ctx={ctx} />}
      {screen === "Orders" && <OrdersScreen ctx={ctx} />}
      {screen === "Homepage" && <HomepageScreen ctx={ctx} />}
      {screen === "Settings" && <SettingsScreen ctx={ctx} />}
    </PanelLayout>
  );
}

function Gate({ signedInAs, onSignOut }: { signedInAs: string | null; onSignOut: () => void }) {
  return (
    <div className="sh ad-gate">
      <div className="ad-gate__card">
        <div className="ad-gate__brand">
          <img src={LOGO} alt="Spin Hobby" />
          <span className="ad-tag">ADMIN</span>
        </div>
        {signedInAs ? (
          <>
            <h1 className="sh-display">No admin access yet</h1>
            <p>
              You're signed in as <b>{signedInAs}</b>, but this account isn't staff or owner. Ask the store owner to add your email to the
              admin list, then sign in again.
            </p>
            <button type="button" className="sh-btn" onClick={onSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <h1 className="sh-display">Staff sign in</h1>
            <p>Manage products, orders, homepage content and payments for spinhobby.com.</p>
            <SignInPanel returnPath="/admin" />
          </>
        )}
        <a href="/" className="ad-gate__back">
          ← Back to the store
        </a>
      </div>
    </div>
  );
}

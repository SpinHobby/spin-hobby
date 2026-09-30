import { lazy, Suspense, useEffect, useState } from "react";
import Storefront from "./v3/storefront/Storefront";
import MaintenancePage from "./v3/MaintenancePage";
import { loadStoreConfig, type StoreConfig } from "./v3/storeConfig";

// The admin bundle is only downloaded by staff visiting /admin.
const Admin = lazy(() => import("./v3/admin/Admin"));
const Checkout = lazy(() => import("./v3/checkout/Checkout"));
const Legal = lazy(() => import("./v3/legal/Legal"));

export default function App() {
  const path = window.location.pathname;
  const isAdmin = path.startsWith("/admin");
  const isLegal = path.startsWith("/legal") || path.startsWith("/terms") || path.startsWith("/privacy");
  // undefined = still checking; null = config fetch failed, fail open rather
  // than blocking the whole storefront on a flag we couldn't read.
  const [config, setConfig] = useState<StoreConfig | null | undefined>(undefined);

  useEffect(() => {
    if (isAdmin || isLegal) return; // staff must always reach /admin; legal pages stay up too
    loadStoreConfig().then(setConfig);
  }, [isAdmin, isLegal]);

  // Admin and the legal pages always render immediately, regardless of
  // maintenance mode or the config fetch above.
  if (isAdmin) {
    return <Suspense fallback={null}><Admin /></Suspense>;
  }
  if (isLegal) {
    return <Suspense fallback={null}><Legal /></Suspense>;
  }
  if (config === undefined) {
    return null;
  }
  if (config?.maintenanceMode) {
    return <MaintenancePage message={config.maintenanceMessage} />;
  }
  if (window.location.pathname.startsWith("/checkout")) {
    return <Suspense fallback={null}><Checkout /></Suspense>;
  }
  return <Storefront />;
}

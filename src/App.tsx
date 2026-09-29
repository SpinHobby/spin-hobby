import { lazy, Suspense, useEffect, useState } from "react";
import Storefront from "./v3/storefront/Storefront";
import MaintenancePage from "./v3/MaintenancePage";
import { loadStoreConfig, type StoreConfig } from "./v3/storeConfig";

// The admin bundle is only downloaded by staff visiting /admin.
const Admin = lazy(() => import("./v3/admin/Admin"));
const Checkout = lazy(() => import("./v3/checkout/Checkout"));

export default function App() {
  const isAdmin = window.location.pathname.startsWith("/admin");
  // undefined = still checking; null = config fetch failed, fail open rather
  // than blocking the whole storefront on a flag we couldn't read.
  const [config, setConfig] = useState<StoreConfig | null | undefined>(undefined);

  useEffect(() => {
    if (isAdmin) return; // staff must always reach /admin to flip the flag back off
    loadStoreConfig().then(setConfig);
  }, [isAdmin]);

  // Admin always renders immediately, regardless of maintenance mode or the
  // config fetch above.
  if (isAdmin) {
    return <Suspense fallback={null}><Admin /></Suspense>;
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

import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Storefront from "./v3/storefront/Storefront";
import MaintenancePage from "./v3/MaintenancePage";
import { loadStoreConfig, type StoreConfig } from "./v3/storeConfig";
import SiteLayout from "./v3/SiteLayout";
import { isRecoveryLink } from "./lib/api";

// The admin bundle is only downloaded by staff visiting /admin.
const Admin = lazy(() => import("./v3/admin/Admin"));
const Checkout = lazy(() => import("./v3/checkout/Checkout"));
const Legal = lazy(() => import("./v3/legal/Legal"));
const Support = lazy(() => import("./v3/support/Support"));
const ResetPassword = lazy(() => import("./v3/ResetPassword"));

// A password-reset email can only point at one address (Supabase's Site URL unless the redirect is
// allow-listed), so wherever its link lands, finish on the reset page before anything else runs.
if (isRecoveryLink() && !window.location.pathname.startsWith("/reset-password")) {
  window.history.replaceState(null, "", `/reset-password${window.location.hash}`);
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
        {/* Plain content pages share one header + footer; everything else brings its own chrome. */}
        <Route element={<SiteLayout />}>
          <Route path="/legal/*" element={<Legal />} />
          <Route path="/support" element={<Support />} />
        </Route>
        <Route path="/reset-password" element={<Suspense fallback={null}><ResetPassword /></Suspense>} />
        <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
        <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
        <Route path="/*" element={<GatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Everything other than admin/legal/support: gated by maintenance mode. */
function GatedApp() {
  // undefined = still checking; null = config fetch failed, fail open rather
  // than blocking the whole storefront on a flag we couldn't read.
  const [config, setConfig] = useState<StoreConfig | null | undefined>(undefined);

  useEffect(() => {
    loadStoreConfig().then(setConfig);
  }, []);

  if (config === undefined) {
    return null;
  }
  if (config?.maintenanceMode) {
    return <MaintenancePage message={config.maintenanceMessage} />;
  }
  return (
    <Routes>
      <Route path="/checkout/*" element={<Suspense fallback={null}><Checkout /></Suspense>} />
      <Route path="/*" element={<Storefront />} />
    </Routes>
  );
}

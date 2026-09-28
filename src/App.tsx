import { lazy, Suspense } from "react";
import Storefront from "./v3/storefront/Storefront";

// The admin bundle is only downloaded by staff visiting /admin.
const Admin = lazy(() => import("./v3/admin/Admin"));

export default function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <Suspense fallback={null}><Admin /></Suspense>;
  }
  return <Storefront />;
}

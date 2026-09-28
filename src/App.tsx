import { lazy, Suspense } from "react";
import Storefront from "./v3/storefront/Storefront";

// The admin bundle is only downloaded by staff visiting /admin.
const Admin = lazy(() => import("./v3/admin/Admin"));
const Checkout = lazy(() => import("./v3/checkout/Checkout"));

export default function App() {
  if (window.location.pathname.startsWith("/admin")) {
    return <Suspense fallback={null}><Admin /></Suspense>;
  }
  if (window.location.pathname.startsWith("/checkout")) {
    return <Suspense fallback={null}><Checkout /></Suspense>;
  }
  return <Storefront />;
}

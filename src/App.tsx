import StorefrontV3 from "./view/pages/StorefrontV3";
import AdminV3 from "./view/pages/AdminV3";

export default function App() {
  return window.location.pathname.startsWith("/admin") ? <AdminV3 /> : <StorefrontV3 />;
}

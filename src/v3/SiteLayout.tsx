import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import "./tokens.scss";
import "./siteLayout.scss";
import { useTheme } from "./hooks";
import SiteFooter from "./SiteFooter";

const LOGO = "/logo/logo%20cropped.png";

/**
 * Header + footer for the plain content pages (support, terms, privacy). Add a page to the layout route in
 * App.tsx and it gets both. The storefront, checkout, admin, sign-in and maintenance pages are deliberately
 * outside it: they have their own chrome.
 */
export default function SiteLayout() {
  const { theme, toggle } = useTheme();
  return (
    <div className="sh sl">
      <header className="sl-header">
        <a href="/" className="sl-logo"><img src={LOGO} alt="Spin Hobby" /></a>
        <button type="button" className="sh-icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle dark mode">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>
      <div className="sl-main">
        <Suspense fallback={null}><Outlet /></Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}

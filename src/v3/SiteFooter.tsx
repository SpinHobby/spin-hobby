import { Link } from "react-router-dom";
import "./siteFooter.scss";
import { DISCORD_URL, EBAY_URL, INSTAGRAM_URL } from "./links";

const LOGO = "/logo/logo%20cropped.png";

/** Footer for the standalone pages (support, legal). The storefront has its own richer one. */
export default function SiteFooter() {
  return (
    <footer className="sh-footer">
      <div className="sh-footer__grid">
        <div className="sh-footer__brand">
          <img src={LOGO} alt="Spin Hobby" />
          <p>Official anime figures, plushies &amp; more. We bring the fun to everyone — since 2022.</p>
        </div>
        <nav className="sh-footer__col" aria-label="Shop">
          <span className="sh-footer__h">Shop</span>
          <a href="/">Back to the store</a>
          <a href={EBAY_URL} target="_blank" rel="noreferrer">eBay store ↗</a>
        </nav>
        <nav className="sh-footer__col" aria-label="Help">
          <span className="sh-footer__h">Help</span>
          <Link to="/support">Help &amp; support</Link>
          <Link to="/support#shipping">Shipping &amp; duties</Link>
          <Link to="/legal/terms">Terms of Service</Link>
          <Link to="/legal/privacy">Privacy Policy</Link>
        </nav>
        <nav className="sh-footer__col" aria-label="Community">
          <span className="sh-footer__h">Community</span>
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord</a>
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram</a>
        </nav>
      </div>
      <div className="sh-footer__bottom">
        <span>© {new Date().getFullYear()} Spin Hobby · spinhobby.com</span>
      </div>
    </footer>
  );
}

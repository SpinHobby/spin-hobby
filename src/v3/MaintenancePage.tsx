import "./tokens.scss";
import "./maintenance.scss";
import { useTheme } from "./hooks";
import { EBAY_URL } from "./links";

const LOGO = "/logo/logo%20cropped.png";

export default function MaintenancePage({ message }: { message?: string | null }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="sh mp">
      <button type="button" className="sh-icon-btn mp-theme" onClick={toggle} title="Toggle theme" aria-label="Toggle dark mode">
        {theme === "dark" ? "☀" : "☾"}
      </button>
      <div className="mp-card">
        <img src={LOGO} alt="Spin Hobby" className="mp-logo" />
        <div className="mp-icon">🔧</div>
        <h1>We'll be right back</h1>
        <p>{message?.trim() || "Spin Hobby is currently down for maintenance. We'll be back shortly — thanks for your patience."}</p>
        <button type="button" className="mp-retry" onClick={() => window.location.reload()}>Retry now</button>
        <a href={EBAY_URL} target="_blank" rel="noopener noreferrer" className="mp-ebay">
          Or shop our eBay store in the meantime →
        </a>
      </div>
    </div>
  );
}

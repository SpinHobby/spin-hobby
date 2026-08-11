import { useEffect, useState } from "react";
import axios from "axios";
import { subscribeBackendStatus } from "../../../utils/maintenanceStatus";
import "./maintenanceNotice.scss";

const serverUrl =
  process.env.NODE_ENV === "production"
    ? "https://spin-hobby-server.onrender.com/"
    : "http://localhost:8001/";

const POLL_INTERVAL_MS = 15000;

export default function MaintenanceNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeBackendStatus(setVisible), []);

  // Quietly reload once the backend responds again, since most pages only
  // fetch their data once on mount and won't recover on their own.
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      axios
        .get(`${serverUrl}api/square/config`)
        .then(() => window.location.reload())
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="maintenance-overlay">
      <div className="maintenance-card">
        <div className="maintenance-icon">🔧</div>
        <h2>We'll be right back</h2>
        <p>
          Spin Hobby is currently being updated. This usually takes a minute
          or two — the page will refresh automatically once we're back, or
          you can retry now.
        </p>
        <button
          className="maintenance-retry-btn"
          onClick={() => window.location.reload()}
        >
          Retry Now
        </button>
      </div>
    </div>
  );
}

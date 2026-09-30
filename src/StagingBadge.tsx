import { useState } from "react";

/** Always-visible corner badge on the staging site, on every page including admin and checkout. */
export function StagingBadge() {
  const [small, setSmall] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setSmall((s) => !s)}
      title={small ? "Staging site" : "Click to shrink"}
      style={{
        position: "fixed", left: 12, bottom: 12, zIndex: 9999, border: "2px solid #171a2b", borderRadius: 10,
        background: "#f3b72f", color: "#171a2b", font: "800 12px/1.3 system-ui, sans-serif", letterSpacing: "0.04em",
        padding: small ? "4px 8px" : "8px 12px", boxShadow: "0 6px 18px rgba(0,0,0,.25)", cursor: "pointer", textAlign: "left", maxWidth: "calc(100vw - 24px)",
      }}
    >
      STAGING
      {!small && <span style={{ display: "block", fontWeight: 600, letterSpacing: 0 }}>Test data · sandbox payments · not the live store</span>}
    </button>
  );
}

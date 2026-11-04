import { useEffect, useState } from "react";
import { onServerState, serverState, type ServerState } from "./lib/serverStatus";
import { IS_STAGING } from "./staging";

/**
 * A banner while the shop server is slow to answer or cannot be reached: on staging that is nearly always Render's free plan waking from sleep,
 * which takes up to a minute; on the live site (which never sleeps) it is a slow moment, worded as one. It counts the seconds, so a person can tell waiting from broken, and goes away by itself once the server answers.
 */
export function ServerStatus() {
  const [{ state, since }, setStatus] = useState<{ state: ServerState; since: number | null }>(serverState);
  const [, tick] = useState(0);
  useEffect(() => onServerState((s, at) => setStatus({ state: s, since: at })), []);
  useEffect(() => {
    if (state === "ok") return;
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);
  if (state === "ok") return null;

  const seconds = since ? Math.max(0, Math.round((Date.now() - since) / 1000)) : 0;
  const long = seconds > 90;
  // Staging sleeps on Render's free plan, so there it is "waking up"; the live server doesn't sleep, so it never says that.
  const title = long
    ? IS_STAGING
      ? "The shop server is not answering"
      : "The shop isn't answering"
    : state === "slow"
      ? IS_STAGING
        ? "Waking up the shop server…"
        : "Taking longer than usual…"
      : IS_STAGING
        ? "Starting the shop server…"
        : "Reconnecting to the shop…";
  const detail = IS_STAGING
    ? long
      ? "It has been more than a minute and a half. It may be down: try again in a few minutes, or check Render."
      : "The staging server sleeps when nobody has used it for a while and takes up to a minute to wake. Pages load by themselves once it is up."
    : long
      ? "Please try again in a few minutes."
      : "Pages finish loading by themselves once it answers.";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10000,
        width: "min(560px, calc(100vw - 32px))",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 14px",
        borderRadius: 12,
        boxShadow: "0 10px 28px rgba(0,0,0,.28)",
        background: long ? "#3a1620" : "#171a2b",
        color: "#fff",
        border: `1px solid ${long ? "#e5687a" : "#f3b72f"}`,
        font: "500 14px/1.4 system-ui, sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 16,
          height: 16,
          marginTop: 2,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,.25)",
          borderTopColor: long ? "#e5687a" : "#f3b72f",
          animation: long ? undefined : "sh-server-spin .9s linear infinite",
        }}
      />
      <span style={{ minWidth: 0 }}>
        <b>{title}</b> <span style={{ opacity: 0.75 }}>{seconds}s</span>
        <span style={{ display: "block", opacity: 0.8, fontSize: 13 }}>{detail}</span>
      </span>
      <style>{"@keyframes sh-server-spin { to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}

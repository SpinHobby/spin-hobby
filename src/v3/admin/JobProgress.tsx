import { useEffect, useState } from "react";
import { Spinner } from "../../components";

/** m:ss (or h:mm:ss) since `from`. */
const elapsed = (from: string | null, now: number) => {
  if (!from) return "";
  const s = Math.max(0, Math.floor((now - Date.parse(from)) / 1000));
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/**
 * A photo the photo computer is working on: a spinner, a bar with the percentage, the step it is on in plain words, and the time it has been at it (ticking
 * every second), so nobody wonders whether it is stuck. The percentage comes from the photo computer itself.
 */
export function JobProgress({ progress, step, startedAt }: { progress: number | null; step: string | null; startedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const pct = Math.max(0, Math.min(100, progress ?? 0));
  return (
    <div
      className="ad-jobprogress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={step ?? "Being worked on"}
    >
      <span className="ad-jobprogress__spinner" aria-hidden="true">
        <Spinner size="sm" />
      </span>
      <div className="ad-jobprogress__main">
        <div className="ad-jobprogress__bar">
          <span style={{ width: `${Math.max(pct, 2)}%` }} />
        </div>
        <div className="ad-jobprogress__text">
          <b>{pct}%</b> · {step ?? "Starting…"}
          {startedAt ? <span className="ad-muted"> · {elapsed(startedAt, now)}</span> : null}
        </div>
      </div>
    </div>
  );
}

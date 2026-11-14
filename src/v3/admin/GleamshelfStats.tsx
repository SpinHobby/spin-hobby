import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components";

type Field = "title" | "description" | "series" | "category" | "photos";

interface Stats {
  received: number;
  added: number;
  restocked: number;
  rejected: number;
  waiting: number;
  oldestWaitingDays: number | null;
  reviewed: number;
  unedited: number;
  changes: Record<Field, number>;
  priced: number;
  priceInMarket: number;
  medianHoursToDecide: number | null;
  photos: { finished: number; used: number; failed: number; medianSeconds: number | null };
  weeks: { week: string; received: number; added: number }[];
}

const DAYS = 30;
const FIELD_NAMES: Record<Field, string> = {
  title: "title",
  description: "description",
  series: "series",
  category: "category",
  photos: "photos",
};
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
const hours = (h: number | null) =>
  h == null ? "–" : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;

/**
 * Admin > Dashboard: how much listing work Gleamshelf takes off the shop in the last 30 days. Drafts received and decided, the share
 * added exactly as Gleamshelf wrote them, what people change most, prices inside Gleamshelf's market range, the wait from photo to
 * decision, and the photo queue. Developers: GET /admin/imports/stats?days=30 (server src/modules/admin/imports/imports-stats.service.ts);
 * "unedited" is recorded when a draft is added (imports.added log, data.review), so adds from before that are left out of the share.
 */
export function GleamshelfStats() {
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<Stats>(`/admin/imports/stats?days=${DAYS}`)
      .then(setS)
      .catch(() => setError(true));
  }, []);
  if (error) return null; // an API without the numbers yet: nothing rather than an error on the dashboard

  const decided = s ? s.added + s.restocked + s.rejected : 0;
  const topChanges = s
    ? (Object.entries(s.changes) as [Field, number][])
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];
  const peak = s ? Math.max(1, ...s.weeks.map((w) => Math.max(w.received, w.added))) : 1;

  return (
    <Card title={`Gleamshelf, last ${DAYS} days`} padded>
      <p className="ad-muted ad-sm" style={{ margin: "0 0 12px" }}>
        How much listing work the photo app saves. &ldquo;Added unedited&rdquo; means staff added the draft exactly as Gleamshelf wrote it
        (price and stock aside). Only counts are kept, never who did what.
      </p>
      {s === null ? (
        <p className="ad-muted ad-sm">Loading…</p>
      ) : s.received === 0 && decided === 0 && s.photos.finished === 0 ? (
        <p className="ad-muted ad-sm">No Gleamshelf drafts or photos yet. Connect the app in Admin &gt; Imports.</p>
      ) : (
        <>
          <div className="ad-line">
            <span className="ad-line__main">Drafts received</span>
            <span className="ad-strong">{s.received}</span>
          </div>
          <div className="ad-line">
            <span className="ad-line__main">Added · restocked · rejected</span>
            <span className="ad-strong">
              {s.added} · {s.restocked} · {s.rejected}
            </span>
          </div>
          <div className="ad-line">
            <span className="ad-line__main">Added unedited</span>
            <span className="ad-strong">{pct(s.unedited, s.reviewed)}</span>
            <span className="ad-muted ad-sm">
              {s.unedited} of {s.reviewed}
            </span>
          </div>
          {topChanges.length > 0 && (
            <div className="ad-line">
              <span className="ad-line__main">Changed most</span>
              <span className="ad-muted ad-sm">{topChanges.map(([f, n]) => `${FIELD_NAMES[f]} (${n})`).join(", ")}</span>
            </div>
          )}
          <div className="ad-line">
            <span className="ad-line__main">Price inside Gleamshelf&apos;s market range</span>
            <span className="ad-strong">{pct(s.priceInMarket, s.priced)}</span>
            <span className="ad-muted ad-sm">
              {s.priceInMarket} of {s.priced}
            </span>
          </div>
          <div className="ad-line">
            <span className="ad-line__main">Photo to decision (median)</span>
            <span className="ad-strong">{hours(s.medianHoursToDecide)}</span>
          </div>
          <div className="ad-line">
            <span className="ad-line__main">Waiting in the inbox</span>
            <span className="ad-strong">{s.waiting}</span>
            {s.oldestWaitingDays != null && <span className="ad-muted ad-sm">oldest {s.oldestWaitingDays} d</span>}
          </div>
          <div className="ad-line">
            <span className="ad-line__main">Photo queue: finished · used · failed</span>
            <span className="ad-strong">
              {s.photos.finished} · {s.photos.used} · {s.photos.failed}
            </span>
            {s.photos.medianSeconds != null && <span className="ad-muted ad-sm">{s.photos.medianSeconds} s a photo</span>}
          </div>
          <div
            style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 56, marginTop: 12 }}
            aria-label="Drafts received and added per week"
          >
            {s.weeks.map((w) => (
              <div
                key={w.week}
                title={`Week of ${w.week}: ${w.received} received, ${w.added} added`}
                style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 2, height: "100%" }}
              >
                <span
                  style={{ flex: 1, height: `${(w.received / peak) * 100}%`, minHeight: 2, background: "var(--muted)", opacity: 0.4 }}
                />
                <span style={{ flex: 1, height: `${(w.added / peak) * 100}%`, minHeight: 2, background: "var(--teal)" }} />
              </div>
            ))}
          </div>
          <p className="ad-muted ad-sm" style={{ margin: "6px 0 0" }}>
            Last 8 weeks: grey received, teal added or restocked.
          </p>
        </>
      )}
    </Card>
  );
}

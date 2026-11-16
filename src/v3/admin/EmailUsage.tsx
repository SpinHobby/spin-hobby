import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components";

interface Usage {
  transport: "resend" | "mailpit" | "off";
  today: number;
  month: number;
  /** 0 = no limit (a paid Resend plan). */
  dailyLimit: number;
  monthlyLimit: number;
  waiting: { total: number; byKind: Record<"code" | "order" | "welcome" | "news", number>; oldestAt: string | null };
}

/** The next midnight UTC (when Resend's day turns over) in the viewer's own clock, e.g. "7:00 p.m.". */
const resetTime = () => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" });
};

/** Warn from this share of a limit: news emails stop at 80%, so the owner hears about it just before. */
const WARN = 0.7;
/** [one, many] for each kind of waiting email. */
const KIND_LABEL = {
  code: ["sign-up code", "sign-up codes"],
  order: ["order email", "order emails"],
  welcome: ["welcome email", "welcome emails"],
  news: ["news email or reminder", "news emails and reminders"],
} as const;

function Meter({ label, used, limit, resets }: { label: string; used: number; limit: number; resets: string }) {
  if (!limit) return <p className="ad-sm" style={{ margin: "0 0 10px" }}>{`${label}: ${used} sent (no limit)`}</p>;
  const share = Math.min(1, used / limit);
  const level = share >= 1 ? "is-full" : share >= WARN ? "is-warn" : "";
  return (
    <div className={`ad-email-meter ${level}`}>
      <div className="ad-email-meter__text ad-sm">
        <span>{label}</span>
        <span className="ad-strong">
          {used.toLocaleString("en-CA")} of {limit.toLocaleString("en-CA")}
        </span>
      </div>
      <div className="ad-email-meter__bar" role="meter" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used} aria-label={label}>
        <span style={{ width: `${share * 100}%` }} />
      </div>
      <span className="ad-muted ad-sm">{resets}</span>
    </div>
  );
}

/**
 * Admin > Dashboard: emails sent against Resend's plan limits (today, this month), and emails waiting for the limit to reset. Near
 * the limit the server holds news and reminders first and keeps sending codes and order emails; waiting ones go out by themselves
 * after the reset, codes first (server: src/integrations/email/email-quota.service.ts, docs/EMAIL.md).
 */
export function EmailUsage() {
  const [u, setU] = useState<Usage | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    api<Usage>("/admin/email-usage")
      .then(setU)
      .catch(() => setError(true));
  }, []);
  if (error || !u) return null; // an API without it yet: nothing rather than an error on the dashboard
  if (u.transport !== "resend")
    return (
      <Card title="Email" padded>
        <p className="ad-muted ad-sm" style={{ margin: 0 }}>
          {u.transport === "mailpit"
            ? "Emails go to the local test inbox (Mailpit), so there are no limits here."
            : "Email isn't set up on this server (RESEND_API_KEY and FROM_EMAIL), so no emails go out."}
        </p>
      </Card>
    );

  const near = [u.dailyLimit && u.today >= u.dailyLimit * WARN, u.monthlyLimit && u.month >= u.monthlyLimit * WARN].some(Boolean);
  const kinds = (Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).filter((k) => u.waiting.byKind[k] > 0);
  return (
    <Card title="Email (Resend plan limits)" padded>
      <p className="ad-muted ad-sm" style={{ margin: "0 0 12px" }}>
        Near a limit, news and reminders wait first; sign-up codes and order emails keep going until the limit itself. Waiting emails go out
        by themselves after the limit resets, codes first.
      </p>
      {near && (
        <p className="ad-email-alert ad-sm" role="status">
          Close to the email limit. To send more, upgrade the Resend plan, then raise RESEND_DAILY_LIMIT and RESEND_MONTHLY_LIMIT on the
          server.
        </p>
      )}
      <Meter label="Today" used={u.today} limit={u.dailyLimit} resets={`Resets at ${resetTime()} your time (midnight UTC)`} />
      <Meter label="This month" used={u.month} limit={u.monthlyLimit} resets="Resets on the 1st (UTC)" />
      <p className="ad-sm" style={{ margin: "10px 0 0" }}>
        {u.waiting.total === 0 ? (
          <span className="ad-muted">No emails waiting.</span>
        ) : (
          <>
            <span className="ad-strong" style={{ color: "var(--red)" }}>
              {u.waiting.total} waiting
            </span>{" "}
            ({kinds.map((k) => `${u.waiting.byKind[k]} ${KIND_LABEL[k][u.waiting.byKind[k] === 1 ? 0 : 1]}`).join(", ")})
            {u.waiting.oldestAt &&
              `. Oldest since ${new Date(u.waiting.oldestAt).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
          </>
        )}
      </p>
    </Card>
  );
}

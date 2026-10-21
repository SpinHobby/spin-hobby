import type { ReactNode } from "react";
import "../styles/components.scss";

/**
 * A notice across the top of the content. `tone`: `info` (gold: worth knowing), `success` (green: it worked), `error` (red: it didn't).
 * Optional `action` (Retry, Undo) and `onDismiss` (a × to hide it).
 */
export function Banner({ tone = "info", action, onDismiss, children }: {
  tone?: "info" | "success" | "error";
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`ui-banner ui-banner--${tone}`} role={tone === "error" ? "alert" : "status"}>
      <span>{children}</span>
      <span className="ui-row-gap">
        {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
        {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss">×</button>}
      </span>
    </div>
  );
}

/**
 * What a list or card says when it has nothing to show. Say what would make something appear. With a `title` it becomes a bigger,
 * friendlier block (a whole empty page), optionally with an `action` button.
 */
export function EmptyState({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
  if (!title && !action) return <div className="ui-empty">{children}</div>;
  return (
    <div className="ui-empty ui-empty--big">
      {title && <div className="ui-empty__title">{title}</div>}
      <div>{children}</div>
      {action && <div className="ui-empty__action">{action}</div>}
    </div>
  );
}

/** A grey shimmering block shown while something loads. */
export function Skeleton({ width = "100%", height = 14 }: { width?: number | string; height?: number }) {
  return <div className="sh-skeleton" style={{ width, height }} aria-hidden />;
}

/** A small turning circle for "working on it". Prefer Skeleton for content that is loading, and Button's `loading` for a button. */
export function Spinner({ size = "md", label = "Loading" }: { size?: "sm" | "md" | "lg"; label?: string }) {
  return <span className={`ui-spinner ui-spinner--${size}`} role="status" aria-label={label} />;
}

/** How far along something is (an upload, a photo being processed): `value` from 0 to 100, with an optional label and note. */
export function ProgressBar({ value, label, note, tone = "primary" }: { value: number; label?: ReactNode; note?: ReactNode; tone?: "primary" | "good" | "warn" }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-progress">
      {(label || note) && <div className="ui-between ui-sm"><span className="ui-strong">{label}</span><span className="ui-muted">{note ?? `${Math.round(v)}%`}</span></div>}
      <div className="ui-progress__track" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`ui-progress__bar ui-progress__bar--${tone}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

const TONES = {
  neutral: { bg: "var(--surface2)", fg: "var(--text2)" },
  good: { bg: "color-mix(in srgb, var(--teal) 16%, var(--surface))", fg: "var(--teal)" },
  warn: { bg: "color-mix(in srgb, var(--gold) 22%, var(--surface))", fg: "color-mix(in srgb, var(--gold) 45%, var(--text))" },
  bad: { bg: "color-mix(in srgb, var(--red) 14%, var(--surface))", fg: "var(--red)" },
  info: { bg: "color-mix(in srgb, var(--blue) 14%, var(--surface))", fg: "var(--blue)" },
} as const;

/** A small coloured label for a status ("Paid", "Shipped", "Refunded"). Pick the tone by meaning: good, warn, bad, info, neutral. */
export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  const t = TONES[tone];
  return <span className="sh-badge" style={{ background: t.bg, color: t.fg }}>{children}</span>;
}

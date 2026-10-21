import type { ReactNode } from "react";
import "./ui.scss";

/** A notice across the top of the content: something to know (gold) or something that went wrong (red), with an optional action. */
export function Banner({ tone = "info", action, children }: { tone?: "info" | "error"; action?: { label: string; onClick: () => void }; children: ReactNode }) {
  return (
    <div className={`ui-banner ${tone === "error" ? "ui-banner--error" : ""}`} role={tone === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {action && <button type="button" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

/** What a list or card says when it has nothing to show ("No orders yet."). Say what would make something appear. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="ui-empty">{children}</div>;
}

/** A grey shimmering block shown while something loads. */
export function Skeleton({ width = "100%", height = 14 }: { width?: number | string; height?: number }) {
  return <div className="sh-skeleton" style={{ width, height }} aria-hidden />;
}

const TONES = {
  neutral: { bg: "var(--surface2)", fg: "var(--text2)" },
  good: { bg: "color-mix(in srgb, var(--teal) 16%, var(--surface))", fg: "var(--teal)" },
  warn: { bg: "color-mix(in srgb, var(--gold) 22%, var(--surface))", fg: "#8a5a00" },
  bad: { bg: "color-mix(in srgb, var(--red) 14%, var(--surface))", fg: "var(--red)" },
  info: { bg: "color-mix(in srgb, var(--blue) 14%, var(--surface))", fg: "var(--blue)" },
} as const;

/** A small coloured label for a status ("Paid", "Shipped", "Refunded"). Pick the tone by meaning, not by colour. */
export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  const t = TONES[tone];
  return <span className="sh-badge" style={{ background: t.bg, color: t.fg }}>{children}</span>;
}

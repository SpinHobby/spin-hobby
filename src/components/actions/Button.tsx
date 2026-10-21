import type { ButtonHTMLAttributes, ReactNode } from "react";
import "../styles/components.scss";

type Native = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * The shop's button.
 * - `variant`: `primary` (filled: the one main action on a screen), `ghost` (outlined: the others), `danger` (deletes, refunds, cannot be
 *   undone), `gold` (a highlight, rarely).
 * - `size`: `sm` inside cards, lists and toolbars, `md` normally, `lg` for a page's single big action.
 * - `loading`: shows a spinner and blocks clicks while something is being saved. Keep the label ("Saving…").
 * - `icon`: something small before the label (an emoji or an SVG). `fullWidth` stretches it across its container.
 */
export function Button({ variant = "primary", size = "md", loading = false, fullWidth = false, icon, className = "", type = "button", disabled, children, ...rest }: Native & {
  variant?: "primary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}) {
  const v = variant === "primary" ? "" : `sh-btn--${variant}`;
  return (
    <button {...rest} type={type} disabled={disabled || loading} aria-busy={loading || undefined}
      className={`sh-btn ui-btn ${v} ${size === "sm" ? "ui-btn-sm" : size === "lg" ? "ui-btn-lg" : ""} ${fullWidth ? "ui-btn--full" : ""} ${className}`}>
      {loading ? <span className="ui-spinner ui-spinner--sm" aria-hidden /> : icon && <span className="ui-btn__icon" aria-hidden>{icon}</span>}
      {children}
    </button>
  );
}

/** A button that looks like a link: small secondary actions inside text or a row ("Edit", "See all"). `danger` makes it red ("Remove"). */
export function LinkButton({ danger = false, className = "", type = "button", ...rest }: Native & { danger?: boolean }) {
  return <button {...rest} type={type} className={`ui-link ${danger ? "ui-link--danger" : ""} ${className}`} />;
}

/** A round button with only an icon (×, ☰, ☀). `label` is required: it is what a screen reader says, and the tooltip. */
export function IconButton({ label, icon, size = "md", className = "", type = "button", ...rest }: Omit<Native, "children"> & {
  label: string;
  icon: ReactNode;
  size?: "sm" | "md";
}) {
  return (
    <button {...rest} type={type} aria-label={label} title={label} className={`ui-iconbtn ${size === "sm" ? "ui-iconbtn--sm" : ""} ${className}`}>
      <span aria-hidden>{icon}</span>
    </button>
  );
}

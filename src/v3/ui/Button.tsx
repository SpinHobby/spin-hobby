import type { ButtonHTMLAttributes } from "react";

/**
 * The shop's button. `primary` (filled) for the one main action on a screen, `ghost` (outlined) for the others, `danger` for something that
 * deletes, refunds or cannot be undone. `small` inside cards, lists and toolbars.
 */
export function Button({ variant = "primary", small = false, className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  small?: boolean;
}) {
  const v = variant === "ghost" ? "sh-btn--ghost" : variant === "danger" ? "sh-btn--danger" : "";
  return <button {...rest} type={type} className={`sh-btn ${v} ${small ? "ui-btn-sm" : ""} ${className}`} />;
}

/** A button that looks like a link: for small secondary actions inside text or a row ("Edit", "Remove"). */
export function LinkButton({ className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} type={type} className={`ui-link ${className}`} />;
}

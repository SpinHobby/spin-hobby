import type { ReactNode } from "react";
import { useEscape } from "../hooks";
import "../styles/tokens.scss";
import "../styles/components.scss";

/**
 * A panel that slides in from the right over the page, for the details of one item (an order, an address to edit). Closes on ×, on
 * Escape and on a click outside it. Put the main buttons in `footer`; `footerSpread` puts the first on the left (Refund) and the rest on
 * the right. `size="lg"` for a wide one (a product editor).
 */
export function Drawer({
  title,
  onClose,
  footer,
  footerSpread = false,
  size = "md",
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  footerSpread?: boolean;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  useEscape(onClose);
  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside
        className={`sh-drawer ${size === "lg" ? "ui-drawer--lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        <div className="sh-drawer__head">
          <span>{title}</span>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sh-drawer__body">{children}</div>
        {footer && (
          <div className="sh-drawer__foot" style={footerSpread ? { justifyContent: "space-between" } : undefined}>
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}

import type { ReactNode } from "react";
import { useEscape } from "../hooks";
import "../tokens.scss";

/**
 * A panel that slides in from the right over the page, for the details of one item (an order, an address to edit). Closes on ×, on Escape,
 * and on a click outside it. Put the main buttons in `footer`.
 */
export function Drawer({ title, onClose, footer, footerSpread = false, children }: {
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  /** Footer buttons at both ends (a risky action on the left, the main ones on the right) instead of all on the right. */
  footerSpread?: boolean;
  children: ReactNode;
}) {
  useEscape(onClose);
  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
        <div className="sh-drawer__head"><span>{title}</span><button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="sh-drawer__body">{children}</div>
        {footer && <div className="sh-drawer__foot" style={footerSpread ? { justifyContent: "space-between" } : undefined}>{footer}</div>}
      </aside>
    </>
  );
}

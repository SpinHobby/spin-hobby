import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "../actions/Button";
import { useEscape } from "../hooks";
import "../styles/components.scss";

/**
 * A box in the middle of the screen that asks for attention (a short form, a choice). Render it only while it is open. Closes on ×,
 * Escape and a click outside (unless `dismissable={false}`, for something that must be answered). `size`: `sm` 400px, `md` 520px, `lg` 720px.
 */
export function Dialog({
  title,
  onClose,
  footer,
  size = "md",
  dismissable = true,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  dismissable?: boolean;
  children: ReactNode;
}) {
  useEscape(dismissable ? onClose : null);
  const box = useRef<HTMLDivElement>(null);
  // keyboard users land inside the dialog, not behind it
  useEffect(() => {
    box.current?.focus();
  }, []);
  return (
    <div
      className="ui-dialog-backdrop"
      onClick={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        tabIndex={-1}
        className={`ui-dialog ui-dialog--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        <div className="ui-dialog__head">
          <span>{title}</span>
          {dismissable && (
            <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>
        <div className="ui-dialog__body">{children}</div>
        {footer && <div className="ui-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * "Are you sure?" before something that cannot be undone. Say exactly what will happen in `message`, and name the action on the button
 * ("Delete address", not "OK"). `danger` makes the button red; `busy` shows it working.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Dialog>
  );
}

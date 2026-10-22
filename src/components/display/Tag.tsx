import type { ReactNode } from "react";
import "../styles/components.scss";

/**
 * A small label for something chosen or attached ("Figures", "Pre-order", an active filter). With `onRemove` it gets a × to take it off
 * (a filter, a category on a product).
 */
export function Tag({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <span className="ui-tag-chip">
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel ?? `Remove ${typeof children === "string" ? children : ""}`.trim()}
        >
          ×
        </button>
      )}
    </span>
  );
}

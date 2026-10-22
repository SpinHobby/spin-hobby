import type { ReactNode } from "react";
import { useSlidingIndicator } from "../hooks";
import "../styles/components.scss";

export interface TabItem<K extends string = string> {
  key: K;
  label: ReactNode;
  count?: number;
  disabled?: boolean;
}

/**
 * Tabs across the top of a section, to switch between views of the same thing (an order: Details | Messages | History). For the page's
 * main sections use PanelLayout's tabs instead. `variant`: `underline` (default) or `pills`.
 */
export function Tabs<K extends string>({
  items,
  value,
  onChange,
  label,
  variant = "underline",
}: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: NoInfer<K>) => void;
  label: string;
  variant?: "underline" | "pills";
}) {
  const ind = useSlidingIndicator<HTMLDivElement>(value);
  return (
    <div ref={ind.ref} className={`ui-tabs ui-tabs--${variant}`} role="tablist" aria-label={label}>
      <span className={`ui-ind ui-tabs__ind ${ind.ready ? "is-ready" : ""}`} style={ind.style} aria-hidden />
      {items.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          data-on={value === t.key}
          disabled={t.disabled}
          className={value === t.key ? "is-on" : ""}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.count !== undefined && <span className="ui-tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

import type { ReactNode } from "react";
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
export function Tabs<K extends string>({ items, value, onChange, label, variant = "underline" }: {
  items: TabItem<K>[];
  value: K;
  onChange: (key: NoInfer<K>) => void;
  label: string;
  variant?: "underline" | "pills";
}) {
  return (
    <div className={`ui-tabs ui-tabs--${variant}`} role="tablist" aria-label={label}>
      {items.map((t) => (
        <button key={t.key} type="button" role="tab" aria-selected={value === t.key} disabled={t.disabled}
          className={value === t.key ? "is-on" : ""} onClick={() => onChange(t.key)}>
          {t.label}{t.count !== undefined && <span className="ui-tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

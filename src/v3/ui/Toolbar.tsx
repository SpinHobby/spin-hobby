import type { ReactNode } from "react";
import "./ui.scss";

/** A row above a list: a search box, filter chips and buttons, wrapping onto more lines on a narrow screen. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="ui-toolbar">{children}</div>;
}

/** The search box of a list. Filtering is up to the page: pass what was typed to your own filter. */
export function SearchInput({ value, onChange, placeholder = "Search…", label }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** What screen readers announce ("Search orders"). */
  label: string;
}) {
  return (
    <input className="ui-search" type="search" placeholder={placeholder} value={value} aria-label={label} enterKeyHint="search" autoComplete="off"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Escape" && value) { e.preventDefault(); onChange(""); } }} />
  );
}

export interface ChipOption<K extends string = string> {
  key: K;
  label: string;
  /** Shown after the label ("Shipped · 4"). */
  count?: number;
}

/** Filter chips: one is chosen at a time (All, To ship, Shipped...). */
export function FilterChips<K extends string>({ options, value, onChange, label }: {
  options: ChipOption<K>[];
  value: K;
  onChange: (key: NoInfer<K>) => void;
  label: string;
}) {
  return (
    <div className="ui-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.key} type="button" className={`sh-chip ${value === o.key ? "is-active" : ""}`} aria-pressed={value === o.key} onClick={() => onChange(o.key)}>
          {o.label}{o.count !== undefined ? ` · ${o.count}` : ""}
        </button>
      ))}
    </div>
  );
}

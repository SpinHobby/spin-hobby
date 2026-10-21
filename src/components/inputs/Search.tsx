import { useEffect, useRef, type ReactNode } from "react";
import "../styles/components.scss";

/** A row above a list: a search box, filter chips and buttons, wrapping onto more lines on a narrow screen. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="ui-toolbar">{children}</div>;
}

/**
 * The search box of a list (filtering is up to the page). Escape clears it. `shortcut` lets "/" jump to it from anywhere on the page,
 * as in most admin tools (only use it for the page's main search).
 */
export function SearchInput({ value, onChange, placeholder = "Search…", label, shortcut = false }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** What screen readers announce ("Search orders"). */
  label: string;
  shortcut?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut]);
  return (
    <input ref={ref} className="ui-search" type="search" placeholder={shortcut ? `${placeholder}   ( / )` : placeholder} value={value} aria-label={label}
      enterKeyHint="search" autoComplete="off"
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

/** Filter chips, one chosen at a time (All, To ship, Shipped...). For several at once, use FilterChipsMulti. */
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

/** Filter chips where several can be on together (In stock + Pre-order); none on means "everything". */
export function FilterChipsMulti<K extends string>({ options, value, onChange, label, allLabel = "All" }: {
  options: ChipOption<K>[];
  value: K[];
  onChange: (keys: NoInfer<K>[]) => void;
  label: string;
  /** The chip that clears the others. Pass null to leave it out. */
  allLabel?: string | null;
}) {
  const toggle = (k: K) => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  return (
    <div className="ui-chips" role="group" aria-label={label}>
      {allLabel !== null && <button type="button" className={`sh-chip ${value.length === 0 ? "is-active" : ""}`} aria-pressed={value.length === 0} onClick={() => onChange([])}>{allLabel}</button>}
      {options.map((o) => (
        <button key={o.key} type="button" className={`sh-chip ${value.includes(o.key) ? "is-active" : ""}`} aria-pressed={value.includes(o.key)} onClick={() => toggle(o.key)}>
          {o.label}{o.count !== undefined ? ` · ${o.count}` : ""}
        </button>
      ))}
    </div>
  );
}

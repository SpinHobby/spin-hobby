import { useEffect, useRef, useState, type ReactNode } from "react";
import "../styles/components.scss";

export interface MenuItem {
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Red: something that removes or cannot be undone. */
  danger?: boolean;
}

/**
 * A button that opens a short list of actions ("⋯" on a row: Edit, Duplicate, Delete). Closes on a choice, on Escape and on a click
 * elsewhere. `align="right"` opens it leftwards, for a button near the right edge.
 */
export function Menu({ label, trigger, items, align = "left" }: {
  /** What screen readers call the button ("More actions for order 1042"). */
  label: string;
  /** What the button shows (default "⋯"). */
  trigger?: ReactNode;
  items: MenuItem[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="ui-menu" ref={root}>
      <button type="button" className="ui-menu__trigger" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>{trigger ?? "⋯"}</button>
      {open && (
        <div className={`ui-menu__list ui-menu__list--${align}`} role="menu">
          {items.map((it, i) => (
            <button key={i} type="button" role="menuitem" disabled={it.disabled} className={it.danger ? "is-danger" : ""}
              onClick={() => { setOpen(false); it.onSelect(); }}>{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

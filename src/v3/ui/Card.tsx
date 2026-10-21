import type { ReactNode } from "react";
import "./ui.scss";

/**
 * A white (or dark) box with rounded corners. With a `title` it gets a header row, with an optional `action` on its right ("See all",
 * a button). Put lists and tables straight inside; use `padded` for forms and text so they get breathing room. A padded card stacks its
 * children with even gaps, so wrap a sentence in a <p> (otherwise a <b> or <code> inside it starts a new line).
 */
export function Card({ title, action, padded = false, className = "", children }: {
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`ui-card ${className}`}>
      {title !== undefined && <div className="ui-card__head"><span>{title}</span>{action}</div>}
      {padded ? <div className="ui-pad">{children}</div> : children}
    </section>
  );
}

/** Cards side by side on wide screens, stacked on narrow ones. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="ui-two">{children}</div>;
}

/** Small summary numbers in a row ("3 orders to ship", "$120 today"). Each one can be a button that goes somewhere. */
export function Stats({ items }: { items: { label: string; value: ReactNode; note?: ReactNode; onClick?: () => void }[] }) {
  return (
    <div className="ui-kpis">
      {items.map((s) => {
        const body = <><span className="ui-kpi__label">{s.label}</span><span className="sh-display ui-kpi__value">{s.value}</span>{s.note && <span className="ui-kpi__note">{s.note}</span>}</>;
        return s.onClick
          ? <button key={s.label} type="button" className="ui-kpi" onClick={s.onClick}>{body}</button>
          : <div key={s.label} className="ui-kpi">{body}</div>;
      })}
    </div>
  );
}

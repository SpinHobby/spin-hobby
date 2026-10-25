import { useState, type ReactNode } from "react";
import "../styles/motion.scss";

/**
 * Content that slides open and shut instead of jumping (a category's subcategories, "More details"). `open` shows it. Closed content
 * is hidden from the keyboard and screen readers too. The children are only built the first time it opens, then kept, so closing and
 * reopening is instant.
 */
export function Collapse({ open, children, id, className }: { open: boolean; children: ReactNode; id?: string; className?: string }) {
  const [seen, setSeen] = useState(open);
  if (open && !seen) setSeen(true);
  return (
    <div id={id} className={`ui-collapse ${open ? "is-open" : ""} ${className ?? ""}`} aria-hidden={open ? undefined : true}>
      <div className="ui-collapse__inner">{seen && children}</div>
    </div>
  );
}

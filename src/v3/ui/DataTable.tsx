import type { ReactNode } from "react";
import { EmptyState } from "./Feedback";
import "./ui.scss";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** The column's width as a CSS grid track: "80px", "1fr", "minmax(200px, 2fr)". */
  width: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

/**
 * A list of items as rows with columns (orders, products, addresses). Clicking a row (or pressing Enter on it) calls `onRowClick`, usually
 * to open a Drawer with the details. On a narrow screen the table scrolls sideways rather than squashing its columns.
 *
 *   <DataTable label="Orders" columns={columns} rows={orders} rowKey={(o) => o.id} onRowClick={(o) => setOpen(o.id)} empty="No orders yet." />
 */
export function DataTable<T>({ label, columns, rows, rowKey, onRowClick, selectedKey, loading = false, empty, minWidth = 720, roomy = false }: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: NoInfer<T>) => void;
  /** The row shown as selected (the one whose drawer is open). */
  selectedKey?: string | number | null;
  loading?: boolean;
  /** What to say when there are no rows. */
  empty: ReactNode;
  /** Below this width the table scrolls sideways. */
  minWidth?: number;
  /** A little more space in each row. */
  roomy?: boolean;
}) {
  const grid = { gridTemplateColumns: columns.map((c) => c.width).join(" ") };
  const align = (c: Column<T>) => (c.align === "right" ? "ui-right" : undefined);
  return (
    <div className="ui-table-wrap">
      <div className={`ui-table ${roomy ? "ui-table--roomy" : ""}`} role="table" aria-label={label} style={{ minWidth }}>
        <div className="ui-tr ui-th" role="row" style={grid}>
          {columns.map((c) => <span key={c.key} role="columnheader" className={align(c)}>{c.header}</span>)}
        </div>
        {loading ? <EmptyState>Loading…</EmptyState> : rows.length === 0 ? <EmptyState>{empty}</EmptyState> : rows.map((row) => {
          const key = rowKey(row);
          const clickable = !!onRowClick;
          return (
            <div key={key} role="row" style={grid} tabIndex={clickable ? 0 : undefined}
              className={`ui-tr ${clickable ? "ui-tr--click" : ""} ${selectedKey === key ? "is-selected" : ""}`}
              onClick={clickable ? () => onRowClick(row) : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}>
              {columns.map((c) => <span key={c.key} role="cell" className={align(c)} style={{ minWidth: 0 }}>{c.render(row)}</span>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A simple list of lines inside a Card ("Recent orders"): a short id, the main text, and a value on the right. */
export function LineList<T>({ rows, rowKey, id, main, value, onClick, empty }: {
  rows: T[];
  rowKey: (row: T) => string | number;
  id?: (row: T) => ReactNode;
  main: (row: T) => ReactNode;
  value?: (row: T) => ReactNode;
  onClick?: (row: NoInfer<T>) => void;
  empty: ReactNode;
}) {
  if (!rows.length) return <EmptyState>{empty}</EmptyState>;
  return (
    <div>
      {rows.map((row) => {
        const body = <>{id && <span className="ui-line__id">{id(row)}</span>}<span className="ui-line__main">{main(row)}</span>{value && <span className="ui-line__total">{value(row)}</span>}</>;
        return onClick
          ? <button key={rowKey(row)} type="button" className="ui-line ui-line--btn" onClick={() => onClick(row)}>{body}</button>
          : <div key={rowKey(row)} className="ui-line">{body}</div>;
      })}
    </div>
  );
}

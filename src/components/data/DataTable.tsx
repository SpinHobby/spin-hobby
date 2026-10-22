import type { ReactNode } from "react";
import { EmptyState } from "../feedback/Feedback";
import "../styles/components.scss";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** The column's width as a CSS grid track: "80px", "1fr", "minmax(200px, 2fr)". */
  width: string;
  align?: "left" | "right";
  /** Lets the header sort the list (the page does the sorting: see `sort` / `onSort`). */
  sortable?: boolean;
  render: (row: T) => ReactNode;
}

export interface SortState {
  key: string;
  dir: "asc" | "desc";
}

/**
 * Rows and columns (orders, products, addresses). Options:
 * - `onRowClick`: clicking a row (or Enter on it) opens it, usually in a Drawer; `selectedKey` marks the open one.
 * - `sort` + `onSort`: sortable headers (columns with `sortable: true`); the page sorts its rows.
 * - `selection` + `onSelectionChange`: a tick box on each row and "tick all" in the header, for actions on several rows.
 * - `loading`, `empty`: what shows while loading and when there is nothing.
 * - `minWidth`: below it the table scrolls sideways instead of squashing. `roomy`: a little more space per row.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  sort,
  onSort,
  selection,
  onSelectionChange,
  loading = false,
  empty,
  minWidth = 720,
  roomy = false,
}: {
  label: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: NoInfer<T>) => void;
  selectedKey?: string | number | null;
  sort?: SortState;
  onSort?: (sort: SortState) => void;
  selection?: Set<string | number>;
  onSelectionChange?: (selection: Set<string | number>) => void;
  loading?: boolean;
  empty: ReactNode;
  minWidth?: number;
  roomy?: boolean;
}) {
  const selectable = !!selection && !!onSelectionChange;
  const grid = { gridTemplateColumns: [...(selectable ? ["28px"] : []), ...columns.map((c) => c.width)].join(" ") };
  const align = (c: Column<T>) => (c.align === "right" ? "ui-right" : undefined);
  const keys = rows.map(rowKey);
  const allOn = selectable && keys.length > 0 && keys.every((k) => selection!.has(k));
  const someOn = selectable && keys.some((k) => selection!.has(k));
  const toggle = (k: string | number) => {
    const next = new Set(selection);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onSelectionChange!(next);
  };
  const header = (c: Column<T>) => {
    if (!c.sortable || !onSort) return c.header;
    const on = sort?.key === c.key;
    const next: SortState = { key: c.key, dir: on && sort!.dir === "asc" ? "desc" : "asc" };
    return (
      <button
        type="button"
        className={`ui-sort ${on ? "is-on" : ""}`}
        onClick={() => onSort(next)}
        aria-label={`Sort by ${typeof c.header === "string" ? c.header : c.key}`}
      >
        {c.header}
        <span aria-hidden>{on ? (sort!.dir === "asc" ? " ↑" : " ↓") : " ↕"}</span>
      </button>
    );
  };
  return (
    <div className="ui-table-wrap">
      <div className={`ui-table ${roomy ? "ui-table--roomy" : ""}`} role="table" aria-label={label} style={{ minWidth }}>
        <div className="ui-tr ui-th" role="row" style={grid}>
          {selectable && (
            <input
              type="checkbox"
              aria-label="Tick all"
              checked={allOn}
              ref={(el) => {
                if (el) el.indeterminate = someOn && !allOn;
              }}
              onChange={() => onSelectionChange!(allOn ? new Set() : new Set(keys))}
            />
          )}
          {columns.map((c) => (
            <span
              key={c.key}
              role="columnheader"
              className={align(c)}
              aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
            >
              {header(c)}
            </span>
          ))}
        </div>
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : rows.length === 0 ? (
          <EmptyState>{empty}</EmptyState>
        ) : (
          rows.map((row) => {
            const key = rowKey(row);
            const clickable = !!onRowClick;
            return (
              <div
                key={key}
                role="row"
                style={grid}
                tabIndex={clickable ? 0 : undefined}
                className={`ui-tr ${clickable ? "ui-tr--click" : ""} ${selectedKey === key || selection?.has(key) ? "is-selected" : ""}`}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget) onRowClick(row);
                      }
                    : undefined
                }
              >
                {selectable && (
                  <input
                    type="checkbox"
                    aria-label="Tick this row"
                    checked={selection!.has(key)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(key)}
                  />
                )}
                {columns.map((c) => (
                  <span key={c.key} role="cell" className={align(c)} style={{ minWidth: 0 }}>
                    {c.render(row)}
                  </span>
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** A simple list of lines inside a Card ("Recent orders"): a short id, the main text, and a value on the right. */
export function LineList<T>({
  rows,
  rowKey,
  id,
  main,
  value,
  onClick,
  empty,
}: {
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
        const body = (
          <>
            {id && <span className="ui-line__id">{id(row)}</span>}
            <span className="ui-line__main">{main(row)}</span>
            {value && <span className="ui-line__total">{value(row)}</span>}
          </>
        );
        return onClick ? (
          <button key={rowKey(row)} type="button" className="ui-line ui-line--btn" onClick={() => onClick(row)}>
            {body}
          </button>
        ) : (
          <div key={rowKey(row)} className="ui-line">
            {body}
          </div>
        );
      })}
    </div>
  );
}

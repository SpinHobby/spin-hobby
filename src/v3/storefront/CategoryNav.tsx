import { useEffect } from "react";
import type { CategoryNode, CategoryTree } from "../categoryTree";
import { useLocalState } from "../hooks";

/** Expand/collapse category tree for the storefront sidebar. Counts include subcategories. */
export function CategoryNav({
  tree,
  totals,
  allCount,
  selectedId,
  onSelect,
  hrefFor,
}: {
  tree: CategoryTree;
  totals: Map<string, number>;
  allCount: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Each category's own address, so the names are real links (search engines follow them; ctrl-click opens a tab). */
  hrefFor?: (id: string | null) => string;
}) {
  const link = (id: string | null, after?: () => void) => ({
    href: hrefFor?.(id) ?? "#",
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      onSelect(id);
      after?.();
    },
  });
  const [open, setOpen] = useLocalState<string[]>("spinhobby-category-open", []);
  const openSet = new Set(open);

  // Selecting something deep (e.g. from the header menu) opens the branch that contains it.
  useEffect(() => {
    if (!selectedId) return;
    const ancestors: string[] = [];
    for (let at = tree.byId.get(selectedId)?.parentId; at; at = tree.byId.get(at)?.parentId ?? null) ancestors.push(at);
    if (ancestors.some((id) => !open.includes(id))) setOpen((o) => [...new Set([...o, ...ancestors])]);
  }, [selectedId, tree, open, setOpen]);

  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const shown = (n: CategoryNode) => (totals.get(n.id) ?? 0) > 0; // shoppers don't see empty categories
  const anyOpen = open.length > 0;

  const render = (nodes: CategoryNode[]) => (
    <ul className="sf-tree" role="group">
      {nodes.filter(shown).map((n) => {
        const kids = n.children.filter(shown);
        const isOpen = openSet.has(n.id);
        return (
          <li key={n.id} role="treeitem" aria-expanded={kids.length ? isOpen : undefined} aria-selected={selectedId === n.id}>
            <div className={`sf-tree__row ${selectedId === n.id ? "is-active" : ""}`} style={{ paddingLeft: 4 + n.depth * 14 }}>
              {kids.length ? (
                <button
                  type="button"
                  className={`sf-tree__chev ${isOpen ? "is-open" : ""}`}
                  onClick={() => toggle(n.id)}
                  aria-label={`${isOpen ? "Collapse" : "Expand"} ${n.name}`}
                >
                  ›
                </button>
              ) : (
                <span className="sf-tree__chev sf-tree__chev--leaf" aria-hidden />
              )}
              <a
                className="sf-tree__name"
                {...link(n.id, () => {
                  if (kids.length && !isOpen) toggle(n.id);
                })}
              >
                <span>{n.name}</span>
                <span className="sf-cats__count">{totals.get(n.id)}</span>
              </a>
            </div>
            {kids.length > 0 && isOpen && render(kids)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="sf-panel sf-cats">
      <div className="sf-cats__head">
        <span className="sh-eyebrow sf-cats__label">Categories</span>
        {tree.flat.some((n) => n.children.length) && (
          <button
            type="button"
            className="sf-cats__toggle"
            onClick={() => setOpen(anyOpen ? [] : tree.flat.filter((n) => n.children.length).map((n) => n.id))}
          >
            {anyOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>
      <div role="tree" aria-label="Categories">
        <div className={`sf-tree__row ${!selectedId ? "is-active" : ""}`}>
          <span className="sf-tree__chev sf-tree__chev--leaf" aria-hidden />
          <a className="sf-tree__name" {...link(null)}>
            <span>All categories</span>
            <span className="sf-cats__count">{allCount}</span>
          </a>
        </div>
        {render(tree.roots)}
      </div>
    </div>
  );
}

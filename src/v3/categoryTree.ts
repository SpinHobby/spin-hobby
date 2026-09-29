import type { ShopCategory } from "./types";

export interface CategoryNode extends ShopCategory { children: CategoryNode[]; depth: number }

export interface CategoryTree {
  roots: CategoryNode[];
  byId: Map<string, CategoryNode>;
  /** The category and every category beneath it. */
  descendants: (id: string) => Set<string>;
  /** Names from the top-level category down to this one. */
  path: (id: string | null | undefined) => string[];
  /** Depth-first list for <select> menus. */
  flat: CategoryNode[];
}

export function buildTree(categories: ShopCategory[]): CategoryTree {
  const byId = new Map<string, CategoryNode>(categories.map((c) => [c.id, { ...c, children: [], depth: 0 }]));
  const roots: CategoryNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node); else roots.push(node);
  }
  const order = (a: CategoryNode, b: CategoryNode) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  const flat: CategoryNode[] = [];
  const walk = (nodes: CategoryNode[], depth: number) => {
    nodes.sort(order);
    for (const n of nodes) { n.depth = depth; flat.push(n); walk(n.children, depth + 1); }
  };
  walk(roots, 0);

  const cache = new Map<string, Set<string>>();
  const descendants = (id: string) => {
    let set = cache.get(id);
    if (!set) {
      set = new Set<string>();
      const stack = [id];
      while (stack.length) {
        const at = stack.pop()!;
        if (set.has(at)) continue;
        set.add(at);
        for (const child of byId.get(at)?.children ?? []) stack.push(child.id);
      }
      cache.set(id, set);
    }
    return set;
  };
  const path = (id: string | null | undefined) => {
    const names: string[] = [];
    for (let at = id ? byId.get(id) : undefined, guard = 0; at && guard < 50; at = at.parentId ? byId.get(at.parentId) : undefined, guard++) names.unshift(at.name);
    return names;
  };
  return { roots, byId, descendants, path, flat };
}

export const indentLabel = (n: CategoryNode) => `${" ".repeat(n.depth)}${n.depth ? "↳ " : ""}${n.name}`;

import { FormEvent, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { buildTree, indentLabel, type CategoryNode } from "../categoryTree";
import { useLocalState } from "../hooks";
import type { ShopCategory } from "../types";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const STARTER: [string, string[]][] = [
  ["Figures", ["Scale Figures", "Prize Figures", "Chibi Figures", "Model Kits"]],
  ["Plushies", []],
  ["Goods", ["Badges & Acrylics", "Keychains", "Blind Boxes", "Apparel & Posters"]],
  ["Trading Cards", []],
  ["Books & Media", ["Books & Doujin", "Video & Music"]],
];

/** Category tree editor. Everything is saved immediately through the API. */
export function CategoriesScreen({ ctx }: { ctx: Ctx }) {
  const categories = ctx.data.categories;
  const tree = useMemo(() => buildTree(categories), [categories]);
  const [open, setOpen] = useLocalState<string[]>("spinhobby-admin-category-open", []);
  const [adding, setAdding] = useState<string | "root" | null>(null); // parent id being added to
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const t = new Map<string, number>();
    for (const c of categories) for (let at: ShopCategory | undefined = c; at; at = at.parentId ? tree.byId.get(at.parentId) : undefined) t.set(at.id, (t.get(at.id) ?? 0) + (c.productCount ?? 0));
    return t;
  }, [categories, tree]);

  const refresh = async (alsoProducts = false) => {
    const res = await api<{ categories: ShopCategory[] }>("/admin/categories");
    ctx.setData((d) => ({ ...d, categories: res.categories }));
    if (alsoProducts) ctx.reload();
  };
  const run = async (fn: () => Promise<unknown>, done?: string, alsoProducts = false) => {
    setBusy(true);
    try { await fn(); await refresh(alsoProducts); if (done) ctx.flash(done); }
    catch (e) { ctx.flash(errMsg(e)); }
    finally { setBusy(false); }
  };

  const create = (name: string, parentId: string | null) => run(async () => {
    await api("/admin/categories", { method: "POST", body: JSON.stringify({ name, parentId }) });
    if (parentId && !open.includes(parentId)) setOpen([...open, parentId]);
  }, `Added “${name}”`);

  const starter = () => run(async () => {
    for (const [parent, children] of STARTER) {
      const { category } = await api<{ category: ShopCategory }>("/admin/categories", { method: "POST", body: JSON.stringify({ name: parent }) });
      for (const child of children) await api("/admin/categories", { method: "POST", body: JSON.stringify({ name: child, parentId: category.id }) });
    }
  }, "Starter categories added");

  const toggleAll = () => setOpen(open.length ? [] : tree.flat.filter((n) => n.children.length).map((n) => n.id));

  return (
    <>
      <div className="ad-toolbar">
        <div className="ad-muted ad-sm" style={{ flex: "1 1 320px" }}>
          Categories and subcategories appear in the storefront sidebar and menu. Put products in them from <b>Products</b> (open a product, or select several and use <b>Move to category</b>).
        </div>
        {tree.flat.some((n) => n.children.length) && <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={toggleAll}>{open.length ? "Collapse all" : "Expand all"}</button>}
        <button type="button" className="sh-btn ad-add-btn" onClick={() => setAdding("root")} disabled={busy}>+ Add category</button>
      </div>

      <section className="ad-card">
        {adding === "root" && <NewCategoryRow depth={0} onCancel={() => setAdding(null)} onSave={(name) => { setAdding(null); create(name, null); }} />}
        {tree.roots.length === 0 && adding !== "root" && (
          <div className="ad-empty">
            <p style={{ margin: "0 0 10px" }}>No categories yet. The storefront uses Square's category names until you add some.</p>
            <button type="button" className="sh-btn" onClick={starter} disabled={busy}>Add starter categories</button>
            <span className="ad-muted ad-sm" style={{ display: "block", marginTop: 8 }}>Figures, Plushies, Goods, Trading Cards, Books & Media, with subcategories. You can rename or delete any of them.</span>
          </div>
        )}
        <ul className="ad-cats" role="tree">
          {tree.roots.map((n, i) => (
            <CategoryRow key={n.id} n={n} siblings={tree.roots} index={i} ctx={ctx} tree={tree} totals={totals} open={open} setOpen={setOpen}
              adding={adding} setAdding={setAdding} create={create} run={run} busy={busy} />
          ))}
        </ul>
      </section>
    </>
  );
}

function NewCategoryRow({ depth, onSave, onCancel }: { depth: number; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); if (name.trim()) onSave(name.trim()); };
  return (
    <form className="ad-cat ad-cat--new" style={{ paddingLeft: 18 + depth * 24 }} onSubmit={submit}>
      <span className="ad-cat__chev" aria-hidden>+</span>
      <input className="sh-input" autoFocus placeholder={depth ? "Subcategory name" : "Category name"} value={name} maxLength={80}
        onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Escape" && onCancel()} />
      <button className="sh-btn ad-btn-sm" disabled={!name.trim()}>Add</button>
      <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" onClick={onCancel}>Cancel</button>
    </form>
  );
}

function CategoryRow({ n, siblings, index, ctx, tree, totals, open, setOpen, adding, setAdding, create, run, busy }: {
  n: CategoryNode; siblings: CategoryNode[]; index: number; ctx: Ctx; tree: ReturnType<typeof buildTree>; totals: Map<string, number>;
  open: string[]; setOpen: (v: string[]) => void; adding: string | null; setAdding: (v: string | null) => void;
  create: (name: string, parentId: string | null) => void; run: (fn: () => Promise<unknown>, done?: string, alsoProducts?: boolean) => void; busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(n.name);
  const [moving, setMoving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isOpen = open.includes(n.id);
  const hasKids = n.children.length > 0;
  const subtree = tree.descendants(n.id);
  const toggle = () => setOpen(isOpen ? open.filter((x) => x !== n.id) : [...open, n.id]);
  const put = (body: Record<string, unknown>, done?: string, alsoProducts = false) =>
    run(() => api(`/admin/categories/${n.id}`, { method: "PUT", body: JSON.stringify(body) }), done, alsoProducts);

  const rename = (e?: FormEvent) => {
    e?.preventDefault();
    setEditing(false);
    if (name.trim() && name.trim() !== n.name) put({ name: name.trim() }, "Renamed", true); else setName(n.name);
  };
  const move = (dir: number) => {
    const j = index + dir;
    if (j < 0 || j >= siblings.length) return;
    const ids = siblings.map((s) => s.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => api("/admin/categories/reorder", { method: "PUT", body: JSON.stringify({ ids }) }));
  };
  const remove = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    run(async () => {
      const res = await api<{ deletedCategories: number; uncategorisedProducts: number }>(`/admin/categories/${n.id}`, { method: "DELETE" });
      ctx.flash(`Deleted ${res.deletedCategories} categor${res.deletedCategories === 1 ? "y" : "ies"}${res.uncategorisedProducts ? ` · ${res.uncategorisedProducts} products now uncategorised` : ""}`);
    }, undefined, true);
  };

  return (
    <li role="treeitem" aria-expanded={hasKids ? isOpen : undefined}>
      <div className={`ad-cat ${n.isVisible === false ? "is-hidden" : ""}`} style={{ paddingLeft: 18 + n.depth * 24 }}>
        {hasKids
          ? <button type="button" className={`ad-cat__chev ${isOpen ? "is-open" : ""}`} onClick={toggle} aria-label={`${isOpen ? "Collapse" : "Expand"} ${n.name}`}>›</button>
          : <span className="ad-cat__chev" aria-hidden />}
        {editing ? (
          <form onSubmit={rename} className="ad-cat__edit">
            <input className="sh-input" autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={() => rename()}
              onKeyDown={(e) => { if (e.key === "Escape") { setName(n.name); setEditing(false); } }} aria-label="Category name" />
          </form>
        ) : (
          <button type="button" className="ad-cat__name" onClick={() => setEditing(true)} title="Click to rename">
            {n.name}{n.isVisible === false && <span className="ad-cat__hidden">Hidden</span>}
          </button>
        )}
        <span className="ad-cat__count" title={`${n.productCount ?? 0} directly in this category`}>
          {totals.get(n.id) ?? 0} product{(totals.get(n.id) ?? 0) === 1 ? "" : "s"}
        </span>
        <div className="ad-cat__actions">
          <button type="button" className="ad-link" onClick={() => { setAdding(n.id); if (!isOpen) setOpen([...open, n.id]); }} disabled={busy}>+ Sub</button>
          <span className="ad-slide__order ad-slide__order--row">
            <button type="button" onClick={() => move(-1)} disabled={busy || index === 0} aria-label={`Move ${n.name} up`}>▲</button>
            <button type="button" onClick={() => move(1)} disabled={busy || index === siblings.length - 1} aria-label={`Move ${n.name} down`}>▼</button>
          </span>
          {moving ? (
            <select className="sh-input ad-cat__move" autoFocus defaultValue={n.parentId ?? ""} onBlur={() => setMoving(false)}
              onChange={(e) => { setMoving(false); put({ parentId: e.target.value || null }, "Moved"); }} aria-label={`Move ${n.name} to`}>
              <option value="">Top level</option>
              {tree.flat.filter((c) => !subtree.has(c.id)).map((c) => <option key={c.id} value={c.id}>{indentLabel(c)}</option>)}
            </select>
          ) : <button type="button" className="ad-link" onClick={() => setMoving(true)} disabled={busy}>Move to…</button>}
          <button type="button" className={`sh-toggle ${n.isVisible !== false ? "is-on" : ""}`} aria-pressed={n.isVisible !== false}
            aria-label={`Show ${n.name} on the storefront`} title="Show on storefront" onClick={() => put({ isVisible: n.isVisible === false }, n.isVisible === false ? "Visible on the storefront" : "Hidden from the storefront")} />
          <button type="button" className={`ad-link ad-cat__delete ${confirmDelete ? "is-confirm" : ""}`} onClick={remove} onBlur={() => setConfirmDelete(false)} disabled={busy}>
            {confirmDelete ? (subtree.size > 1 ? `Delete + ${subtree.size - 1} sub?` : "Confirm delete") : "Delete"}
          </button>
        </div>
      </div>
      {(isOpen || adding === n.id) && (
        <ul role="group">
          {adding === n.id && <NewCategoryRow depth={n.depth + 1} onCancel={() => setAdding(null)} onSave={(v) => { setAdding(null); create(v, n.id); }} />}
          {isOpen && n.children.map((c, i) => (
            <CategoryRow key={c.id} n={c} siblings={n.children} index={i} ctx={ctx} tree={tree} totals={totals} open={open} setOpen={setOpen}
              adding={adding} setAdding={setAdding} create={create} run={run} busy={busy} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Indented category picker used by the product forms. */
export function CategorySelect({ ctx, value, onChange, label = "Category" }: { ctx: Ctx; value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const tree = useMemo(() => buildTree(ctx.data.categories), [ctx.data.categories]);
  return (
    <label className="ad-field">{label}
      <select className="sh-input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— No category —</option>
        {tree.flat.map((c) => <option key={c.id} value={c.id}>{indentLabel(c)}</option>)}
      </select>
      {!tree.flat.length && <span className="ad-muted ad-sm" style={{ fontWeight: 500 }}>Create categories in the Categories screen first.</span>}
    </label>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { buildTree, indentLabel } from "../categoryTree";
import { useEscape } from "../hooks";
import type { ShopCategory } from "../types";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface StandardNode {
  name: string;
  exists: boolean;
  children: { name: string; exists: boolean }[];
}

/** Shows the ready-made category tree (modelled on AmiAmi's), marking what the shop already has, and adds the rest. */
export function StandardTreeDialog({ ctx, onClose, onAdded }: { ctx: Ctx; onClose: () => void; onAdded: () => void }) {
  const [tree, setTree] = useState<StandardNode[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEscape(onClose);
  useEffect(() => {
    api<{ tree: StandardNode[] }>("/admin/categories/standard")
      .then((r) => setTree(r.tree))
      .catch((e) => ctx.flash(errMsg(e)));
  }, [ctx]);
  const missing = (tree ?? []).reduce((n, t) => n + (t.exists ? 0 : 1) + t.children.filter((c) => !c.exists).length, 0);

  const add = async () => {
    setBusy(true);
    try {
      const res = await api<{ created: string[] }>("/admin/categories/standard", { method: "POST" });
      ctx.flash(
        res.created.length ? `Added ${res.created.length} categor${res.created.length === 1 ? "y" : "ies"}` : "Nothing was missing",
      );
      onAdded();
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer ad-sort-dialog" role="dialog" aria-modal="true" aria-label="Standard categories">
        <div className="sh-drawer__head">
          <span>Standard categories</span>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sh-drawer__body ad-sort">
          <p>
            A category list for an anime shop, laid out like AmiAmi’s. Categories you already have are kept as they are; only the missing
            ones (marked <b>new</b>) are added.
          </p>
          <p className="ad-muted ad-sm">
            Shoppers only see a category once it has products in it. You can rename, hide or delete any category afterwards.
          </p>
          {!tree ? (
            <p className="ad-muted">Loading…</p>
          ) : (
            <ul className="ad-std">
              {tree.map((t) => (
                <li key={t.name}>
                  <b>{t.name}</b> {t.exists ? <span className="ad-std__have">you have it</span> : <span className="ad-std__new">new</span>}
                  <ul>
                    {t.children.map((c) => (
                      <li key={c.name}>
                        {c.name} {c.exists ? <span className="ad-std__have">you have it</span> : <span className="ad-std__new">new</span>}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
          <div className="ad-imports__actions">
            <button type="button" className="sh-btn" disabled={!tree || busy || missing === 0} onClick={add}>
              {busy ? "Adding…" : missing ? `Add ${missing} categor${missing === 1 ? "y" : "ies"}` : "You have them all"}
            </button>
            <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

interface Suggestion {
  id: string;
  name: string;
  image: string | null;
  squareCategory: string | null;
  currentCategoryId: string | null;
  suggestedCategoryId: string | null;
  choices: string[];
  reason: string | null;
}
type Tab = "suggested" | "pick" | "none";
const PAGE = 150;

/**
 * Sorts products into categories: each product comes with a suggested category (from its name and Square category)
 * that a person can change or untick. Only the ticked rows are applied.
 */
export function SortProductsDialog({ ctx, onClose, onApplied }: { ctx: Ctx; onClose: () => void; onApplied: () => void }) {
  const [all, setAll] = useState(false);
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("suggested");
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  useEscape(onClose);
  const tree = useMemo(() => buildTree(ctx.data.categories as ShopCategory[]), [ctx.data.categories]);

  const load = useCallback(async () => {
    setItems(null);
    try {
      const res = await api<{ items: Suggestion[] }>(`/admin/categories/suggestions${all ? "?all=1" : ""}`);
      // a product already in its suggested category needs nothing
      const list = res.items.filter((i) => !(i.currentCategoryId && i.currentCategoryId === i.suggestedCategoryId));
      setItems(list);
      setChosen(Object.fromEntries(list.filter((i) => i.suggestedCategoryId).map((i) => [i.id, i.suggestedCategoryId!])));
      setTicked(new Set(list.filter((i) => i.suggestedCategoryId).map((i) => i.id)));
      setShown(PAGE);
    } catch (e) {
      ctx.flash(errMsg(e));
    }
  }, [all, ctx]);
  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(
    () => ({
      suggested: (items ?? []).filter((i) => i.suggestedCategoryId),
      pick: (items ?? []).filter((i) => !i.suggestedCategoryId && i.choices.length),
      none: (items ?? []).filter((i) => !i.suggestedCategoryId && !i.choices.length),
    }),
    [items],
  );
  const rows = groups[tab];
  const ready = [...ticked].filter((id) => chosen[id]);

  const choose = (id: string, categoryId: string) => {
    setChosen((c) => ({ ...c, [id]: categoryId }));
    setTicked((t) => {
      const n = new Set(t);
      if (categoryId) n.add(id);
      else n.delete(id);
      return n;
    });
  };
  const tick = (id: string) =>
    setTicked((t) => {
      const n = new Set(t);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const tickAll = (on: boolean) =>
    setTicked((t) => {
      const n = new Set(t);
      for (const r of rows) {
        if (on && chosen[r.id]) n.add(r.id);
        else if (!on) n.delete(r.id);
      }
      return n;
    });

  const apply = async () => {
    setBusy(true);
    try {
      const res = await api<{ updated: number }>("/admin/categories/assign", {
        method: "POST",
        body: JSON.stringify({ assignments: ready.map((id) => ({ id, categoryId: chosen[id] })) }),
      });
      ctx.flash(`Put ${res.updated} product${res.updated === 1 ? "" : "s"} in their categories`);
      onApplied();
      await load();
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const name = (id: string) => tree.path(id).join(" › ");
  const short = (id: string) => tree.byId.get(id)?.name ?? "";

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside
        className="sh-drawer ad-sort-dialog ad-sort-dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-label="Sort products into categories"
      >
        <div className="sh-drawer__head">
          <span>Sort products into categories</span>
          <button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="sh-drawer__body ad-sort">
          <p className="ad-muted ad-sm">
            Each product comes with a suggestion from its name and its Square category. Change any you disagree with, untick the ones to
            leave alone, then apply. Nothing changes until you press the button.
          </p>
          <label className="ad-check">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Also re-sort products that already have a
            category
          </label>
          {!items ? (
            <p className="ad-muted">Looking at the products…</p>
          ) : items.length === 0 ? (
            <p>Every product is in a category. 🎉</p>
          ) : (
            <>
              <div className="ad-chips" role="tablist">
                {(
                  [
                    ["suggested", "Suggested"],
                    ["pick", "Pick one"],
                    ["none", "No idea"],
                  ] as [Tab, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    className={`sh-chip ${tab === k ? "is-active" : ""}`}
                    onClick={() => {
                      setTab(k);
                      setShown(PAGE);
                    }}
                  >
                    {label} · {groups[k].length}
                  </button>
                ))}
              </div>
              <p className="ad-muted ad-sm">
                {tab === "suggested" && "The words that led to each suggestion are shown under it."}
                {tab === "pick" && "Figures whose character could be a girl (Bishoujo) or not (Character): one click each."}
                {tab === "none" && "Nothing in the name or Square category points anywhere: pick a category, or leave them for now."}
                {rows.length > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <button type="button" className="ad-link" onClick={() => tickAll(true)}>
                      Tick all
                    </button>{" "}
                    ·{" "}
                    <button type="button" className="ad-link" onClick={() => tickAll(false)}>
                      Untick all
                    </button>
                  </>
                )}
              </p>
              <ul className="ad-sort__list">
                {rows.slice(0, shown).map((r) => (
                  <li key={r.id} className={`ad-sort__row ${ticked.has(r.id) && chosen[r.id] ? "is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={ticked.has(r.id) && !!chosen[r.id]}
                      disabled={!chosen[r.id]}
                      onChange={() => tick(r.id)}
                      aria-label={`Apply to ${r.name}`}
                    />
                    {r.image ? <img src={r.image} alt="" className="ad-sort__img" /> : <span className="ad-sort__img" />}
                    <div className="ad-sort__main">
                      <div className="ad-strong ad-ellipsis" title={r.name}>
                        {r.name}
                      </div>
                      <div className="ad-muted ad-sm ad-ellipsis">
                        {r.currentCategoryId ? `Now: ${name(r.currentCategoryId)}` : "No category"}
                        {r.squareCategory ? ` · Square: ${r.squareCategory}` : ""}
                        {r.reason ? ` · ${r.reason}` : ""}
                      </div>
                    </div>
                    <div className="ad-sort__pick">
                      {r.choices.length > 0 &&
                        r.choices.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`sh-chip ${chosen[r.id] === c ? "is-active" : ""}`}
                            onClick={() => choose(r.id, c)}
                          >
                            {short(c).replace(/ Figures$/, "")}
                          </button>
                        ))}
                      <select
                        className="sh-input"
                        value={chosen[r.id] ?? ""}
                        onChange={(e) => choose(r.id, e.target.value)}
                        aria-label={`Category for ${r.name}`}
                      >
                        <option value="">Choose…</option>
                        {tree.flat.map((c) => (
                          <option key={c.id} value={c.id}>
                            {indentLabel(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
              {rows.length > shown && (
                <button type="button" className="ad-link" onClick={() => setShown((n) => n + PAGE)}>
                  Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown}
                </button>
              )}
            </>
          )}
          <div className="ad-imports__actions ad-sort__apply">
            <button type="button" className="sh-btn" disabled={busy || ready.length === 0} onClick={apply}>
              {busy ? "Saving…" : `Put ${ready.length} product${ready.length === 1 ? "" : "s"} in their categories`}
            </button>
            <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

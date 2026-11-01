import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components";
import type { StoreSettings } from "../types";
import { DEFAULT_LAYOUT, SECTION_LABELS, type StorefrontLayout } from "../storefront/layout";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/** [value, label] choices for each setting, in the order the dropdowns show them. */
const CHOICES = {
  productView: [
    ["grid", "Grid"],
    ["compact", "Compact (smaller cards)"],
    ["list", "List (rows)"],
  ],
  columns: [
    ["auto", "As many as fit"],
    [3, "3 per row"],
    [4, "4 per row"],
    [5, "5 per row"],
    [6, "6 per row"],
  ],
  imageShape: [
    ["square", "Square"],
    ["portrait", "Tall (3:4, for figures)"],
  ],
  sidebar: [
    ["left", "On the left"],
    ["right", "On the right"],
    ["hidden", "Behind a Filters button"],
  ],
  width: [
    ["standard", "Standard (1400px)"],
    ["wide", "Wide (1680px)"],
    ["full", "Full window"],
  ],
} as const;

/**
 * Admin > Homepage > Page layout: the order and visibility of the homepage blocks, and how the shop lists products (default view,
 * columns, photo shape, where the filters sit, page width, top bar). Owner only; saved for every shopper.
 */
export function PageLayoutCard({ ctx }: { ctx: Ctx }) {
  const saved = ctx.data.settings.storefront_layout ?? DEFAULT_LAYOUT;
  const [form, setForm] = useState<StorefrontLayout>(saved);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(saved), [saved]);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof StorefrontLayout>(key: K, value: StorefrontLayout[K]) => setForm((f) => ({ ...f, [key]: value }));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...form.sections];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    set("sections", next);
  };
  const toggle = (i: number) =>
    set(
      "sections",
      form.sections.map((s, k) => (k === i ? { ...s, visible: !s.visible } : s)),
    );

  const save = async (layout: StorefrontLayout) => {
    setSaving(true);
    try {
      const res = await api<{ settings: StoreSettings }>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ storefront_layout: layout }),
      });
      ctx.setData((d) => ({ ...d, settings: res.settings }));
      ctx.flash("Page layout saved. Shoppers see it on their next visit");
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const select = <K extends keyof typeof CHOICES>(key: K, label: string) => (
    <label className="ad-kv">
      <span>{label}</span>
      <select
        className="sh-input ad-layout__select"
        value={String(form[key])}
        disabled={!ctx.isOwner}
        onChange={(e) => {
          const choice = CHOICES[key].find(([v]) => String(v) === e.target.value);
          if (choice) set(key, choice[0] as StorefrontLayout[K]);
        }}
      >
        {CHOICES[key].map(([v, name]) => (
          <option key={String(v)} value={String(v)}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Card
      title="Page layout"
      action={
        ctx.isOwner && (
          <button type="button" className="sh-btn sh-btn--ghost ad-btn-sm" disabled={saving} onClick={() => setForm(DEFAULT_LAYOUT)}>
            Use the default
          </button>
        )
      }
    >
      <div className="ad-layout">
        <div className="ad-layout__col">
          <p className="ad-muted ad-sm" style={{ margin: 0 }}>
            The order of the homepage, top to bottom. Use the arrows to move a block, the switch to show or hide it.
          </p>
          {form.sections.map((s, i) => (
            <div key={s.id} className={`ad-line ad-layout__block ${s.visible ? "" : "is-hidden"}`}>
              <span className="ad-slide__order ad-slide__order--row">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={!ctx.isOwner || i === 0}
                  aria-label={`Move ${SECTION_LABELS[s.id].name} up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={!ctx.isOwner || i === form.sections.length - 1}
                  aria-label={`Move ${SECTION_LABELS[s.id].name} down`}
                >
                  ▼
                </button>
              </span>
              <span className="ad-line__main">
                <b>{SECTION_LABELS[s.id].name}</b>
                <span className="ad-muted ad-sm">{SECTION_LABELS[s.id].hint}</span>
              </span>
              <label className="ad-layout__show">
                <input
                  type="checkbox"
                  checked={s.visible}
                  disabled={!ctx.isOwner || s.id === "shop"}
                  onChange={() => toggle(i)}
                  aria-label={`Show ${SECTION_LABELS[s.id].name}`}
                />
                {s.visible ? "Shown" : "Hidden"}
              </label>
            </div>
          ))}
        </div>
        <div className="ad-layout__col">
          {select("productView", "Products are listed as")}
          {select("columns", "Cards per row (computer)")}
          {select("imageShape", "Product photo shape")}
          {select("sidebar", "Categories and filters")}
          {select("width", "Page width")}
          <label className="ad-kv">
            <span>Top bar (free shipping, Events, Support)</span>
            <input
              type="checkbox"
              checked={form.announcementBar}
              disabled={!ctx.isOwner}
              onChange={(e) => set("announcementBar", e.target.checked)}
            />
          </label>
          <p className="ad-muted ad-sm" style={{ margin: 0 }}>
            Shoppers can still switch between Grid, Compact and List; this picks what they see first. Phones always show two cards per row
            and keep the filters behind a button.
          </p>
          <LayoutSketch layout={form} />
          {ctx.isOwner ? (
            <div className="ad-save-bar">
              {dirty && <span className="ad-muted ad-sm">Unsaved changes</span>}
              <button type="button" className="sh-btn sh-btn--ghost" disabled={!dirty || saving} onClick={() => setForm(saved)}>
                Reset
              </button>
              <button type="button" className="sh-btn" disabled={!dirty || saving} onClick={() => save(form)}>
                {saving ? "Saving…" : "Save layout"}
              </button>
            </div>
          ) : (
            <p className="ad-muted ad-sm">Only the owner can change the page layout.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/** A small wireframe of the homepage as the form stands, so the owner sees the result before saving. */
function LayoutSketch({ layout }: { layout: StorefrontLayout }) {
  const cols = layout.columns === "auto" ? 4 : layout.columns;
  const sidebar = layout.sidebar !== "hidden" && <div className="ad-sketch__side" aria-hidden />;
  return (
    <div className={`ad-sketch ad-sketch--${layout.width}`} aria-label="Sketch of the homepage layout" role="img">
      {layout.announcementBar && <div className="ad-sketch__bar" />}
      <div className="ad-sketch__header" />
      <div className={`ad-sketch__body ${layout.sidebar === "right" ? "is-right" : ""}`}>
        {sidebar}
        <div className="ad-sketch__main">
          {layout.sections
            .filter((s) => s.visible)
            .map((s) =>
              s.id === "shop" ? (
                <div
                  key={s.id}
                  className="ad-sketch__grid"
                  style={{
                    gridTemplateColumns: `repeat(${layout.productView === "list" ? 1 : layout.productView === "compact" ? cols + 2 : cols}, 1fr)`,
                  }}
                >
                  {Array.from(
                    { length: layout.productView === "list" ? 3 : (layout.productView === "compact" ? cols + 2 : cols) * 2 },
                    (_, i) => (
                      <span
                        key={i}
                        className={layout.productView === "list" ? "is-row" : ""}
                        style={
                          layout.productView === "list" ? undefined : { aspectRatio: layout.imageShape === "portrait" ? "3 / 4" : "1" }
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <div key={s.id} className={`ad-sketch__block ad-sketch__block--${s.id}`}>
                  {SECTION_LABELS[s.id].name}
                </div>
              ),
            )}
        </div>
      </div>
    </div>
  );
}

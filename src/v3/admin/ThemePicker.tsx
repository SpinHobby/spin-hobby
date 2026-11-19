import { useState } from "react";
import { api } from "../../lib/api";
import { Card } from "../../components";
import type { StoreSettings } from "../types";
import { DEFAULT_THEME, isThemeId, THEMES, themeName, type ThemeId } from "../storefront/themes";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * Admin > Homepage > Theme: the storefront's look in one click. Each tile is a small shop drawn in the theme's own colours;
 * clicking one switches the live shop for every shopper (owner only). Preview opens the shop in that theme in a new tab, for
 * this browser only, so it can be tried first.
 */
export function ThemePicker({ ctx }: { ctx: Ctx }) {
  const current: ThemeId = isThemeId(ctx.data.settings.storefront_theme) ? ctx.data.settings.storefront_theme : DEFAULT_THEME;
  const [saving, setSaving] = useState<ThemeId | null>(null);

  const apply = async (id: ThemeId) => {
    if (id === current || !ctx.isOwner) return;
    setSaving(id);
    try {
      const res = await api<{ settings: StoreSettings }>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ storefront_theme: id }),
      });
      ctx.setData((d) => ({ ...d, settings: res.settings }));
      ctx.flash(`The shop now uses ${themeName(id)}. Shoppers see it on their next page`);
    } catch (e) {
      ctx.flash(errMsg(e));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card title="Theme" padded>
      <p className="ad-muted ad-sm" style={{ margin: "0 0 12px" }}>
        The shop&apos;s colours and style. Click a theme to switch the live shop; Preview tries it in a new tab first, only for you.
        Shoppers&apos; light and dark mode still work in every theme. Admin always keeps its own colours.
      </p>
      <div className="ad-shopthemes" role="radiogroup" aria-label="Shop theme">
        {THEMES.map((t) => (
          <div key={t.id} className={`ad-shoptheme ${t.id === current ? "is-current" : ""}`}>
            <button
              type="button"
              role="radio"
              aria-checked={t.id === current}
              className="ad-shoptheme__pick"
              disabled={!ctx.isOwner || saving !== null}
              onClick={() => void apply(t.id)}
            >
              <span className="sh-theme-sample" data-sample={t.id} aria-hidden>
                <span className="sh-theme-sample__bar" />
                <span className="sh-theme-sample__hero">{t.name}</span>
                <span className="sh-theme-sample__cards">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="sh-theme-sample__card">
                      <span className="sh-theme-sample__buy" />
                    </span>
                  ))}
                </span>
              </span>
              <span className="ad-shoptheme__name">
                {t.name}
                {t.id === current && <span className="ad-shoptheme__badge">In use</span>}
                {saving === t.id && <span className="ad-muted ad-sm"> Switching…</span>}
              </span>
              <span className="ad-muted ad-sm">{t.description}</span>
            </button>
            <a className="ad-shoptheme__preview ad-sm" href={`/?theme=${t.id}`} target="_blank" rel="noreferrer">
              Preview ↗
            </a>
          </div>
        ))}
      </div>
      {!ctx.isOwner && <p className="ad-muted ad-sm">Only the owner can change the theme. Preview works for everyone.</p>}
    </Card>
  );
}

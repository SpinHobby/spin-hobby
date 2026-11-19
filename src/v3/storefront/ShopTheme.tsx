import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loadStoreConfig } from "../storeConfig";
import { DEFAULT_THEME, isThemeId, PREVIEW_KEY, readStored, SEEN_KEY, themeName, writeStored, type ThemeId } from "./themes";
import "./shopTheme.scss";

const session = () => window.sessionStorage;
const local = () => window.localStorage;

/**
 * Puts the shop's theme on the page (<html data-shop-theme>) on every shopper page, never in Admin. ?theme=<id> previews another
 * theme in this tab (Admin > Homepage > Theme > Preview) with a small "Stop previewing" pill; ?theme=off ends it.
 */
export function ShopTheme() {
  const location = useLocation();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<ThemeId>(() => readStored(local, SEEN_KEY) ?? DEFAULT_THEME);
  const [preview, setPreview] = useState<ThemeId | null>(() => readStored(session, PREVIEW_KEY));

  useEffect(() => {
    loadStoreConfig().then((c) => {
      const t = isThemeId(c?.theme) ? c.theme : DEFAULT_THEME;
      setSaved(t);
      writeStored(local, SEEN_KEY, t);
    });
  }, []);

  // ?theme=sakura starts a preview, ?theme=off ends it; the parameter is then taken out of the address
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const asked = params.get("theme");
    if (asked === null) return;
    const next = isThemeId(asked) ? asked : null;
    setPreview(next);
    writeStored(session, PREVIEW_KEY, next);
    params.delete("theme");
    const rest = params.toString();
    navigate({ pathname: location.pathname, search: rest ? `?${rest}` : "", hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, navigate]);

  const inAdmin = /^\/(admin|ui-kit)(\/|$)/.test(location.pathname);
  const shown = preview ?? saved;
  useEffect(() => {
    const html = document.documentElement;
    if (inAdmin || shown === DEFAULT_THEME) delete html.dataset.shopTheme;
    else html.dataset.shopTheme = shown;
  }, [inAdmin, shown]);

  if (!preview || inAdmin) return null;
  return (
    <div className="sh shop-theme-pill" role="status">
      Previewing <b>{themeName(preview)}</b>
      <button
        type="button"
        onClick={() => {
          setPreview(null);
          writeStored(session, PREVIEW_KEY, null);
        }}
      >
        Stop previewing
      </button>
    </div>
  );
}

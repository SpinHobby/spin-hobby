import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/** A short message shown for a moment (pass `toast` to PanelLayout, call `flash("Saved")`). */
export function useToast(duration = 2200) {
  const [toast, setToast] = useState("");
  const timer = useRef<number>();
  const flash = useCallback(
    (message: string) => {
      setToast(message);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(""), duration);
    },
    [duration],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, flash };
}

/** Calls `onEscape` when Escape is pressed (null: not listening). Drawers and dialogs close with it. */
export function useEscape(onEscape: (() => void) | null) {
  useEffect(() => {
    if (!onEscape) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
}

const THEME_KEY = "spinhobby-theme"; // same key the existing app + index.html use

export type Theme = "light" | "dark";

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light or dark, remembered on this device (the ☀/☾ button). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}

/** True when the person asked their device for less motion: skip decorative animation then. */
export function prefersReducedMotion() {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * A highlight that glides to the chosen item of a list (the side panel's tabs, Tabs, SegmentedControl). Put `ref` on the list, mark
 * the chosen item with `data-on="true"`, and render `<span className="ui-ind ..." style={style} />` inside the list. `axis` is the
 * direction the list runs. The first placement doesn't animate (`ready` turns on after it), so nothing slides in from a corner.
 */
export function useSlidingIndicator<T extends HTMLElement>(active: unknown, axis: "x" | "y" = "x") {
  const ref = useRef<T>(null);
  const [style, setStyle] = useState<CSSProperties>({ opacity: 0 });
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const place = () => {
      const on = list.querySelector<HTMLElement>('[data-on="true"]');
      if (!on) {
        setStyle({ opacity: 0 });
        return;
      }
      setStyle(
        axis === "y"
          ? { transform: `translateY(${on.offsetTop}px)`, height: on.offsetHeight, opacity: 1 }
          : { transform: `translateX(${on.offsetLeft}px)`, width: on.offsetWidth, opacity: 1 },
      );
    };
    place();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    ro?.observe(list);
    return () => ro?.disconnect();
  }, [active, axis]);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return { ref, style, ready };
}

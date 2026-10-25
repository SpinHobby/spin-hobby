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
 * Swapping a list for a new one (another tab's products) as "old fades out, new rises in" instead of the old list sitting there until
 * the new one pops in. `key` names what is being shown (the address); `content` is the data on screen (the items array). When `key`
 * changes, `phase` is "leaving" until `content` is replaced (put `ui-leaving` on the list then), and "slow" if that takes a while
 * (show a loading placeholder instead). `round` goes up each time new content arrives: use it as the list's `key` so every item
 * plays its entrance again (with `ui-stagger` on the list, one after another).
 */
export function useContentSwap(key: unknown, content: unknown, { slowAfter = 400, giveUpAfter = 5000 } = {}) {
  const [phase, setPhase] = useState<"shown" | "leaving" | "slow">("shown");
  const [round, setRound] = useState(0);
  const shownKey = useRef(key);
  const stale = useRef<unknown>(undefined);
  useLayoutEffect(() => {
    if (shownKey.current === key) return;
    shownKey.current = key;
    stale.current = content;
    setPhase("leaving");
    // only a change of `key` starts a swap; `content` is read as it is at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  useLayoutEffect(() => {
    if (phase === "shown" || content === stale.current) return;
    setPhase("shown");
    setRound((r) => r + 1);
  }, [content, phase]);
  const waiting = phase !== "shown";
  useEffect(() => {
    if (!waiting) return;
    const slow = window.setTimeout(() => setPhase((p) => (p === "leaving" ? "slow" : p)), slowAfter);
    const giveUp = window.setTimeout(() => setPhase("shown"), giveUpAfter); // nothing new came (an error, or the same data)
    return () => {
      window.clearTimeout(slow);
      window.clearTimeout(giveUp);
    };
  }, [waiting, slowAfter, giveUpAfter]);
  return { phase, round };
}

/**
 * A scrolling box without a scrollbar: its top and bottom edges fade out while there is more to scroll that way, which says "more
 * here" more quietly than a bar. Put the returned ref on the box and the `ui-scroll-fade` class on it (styles/motion.scss).
 */
export function useScrollFade<T extends HTMLElement>() {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = null;
    if (!el) return;
    const update = () => {
      el.toggleAttribute("data-fade-top", el.scrollTop > 2);
      el.toggleAttribute("data-fade-bottom", el.scrollTop + el.clientHeight < el.scrollHeight - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    // the box or what's inside it changes size (a window resize, a section opening)
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);
    cleanup.current = () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, []);
}

/**
 * A short fade-and-rise on the element each time `key` changes (a new page or section), so the change reads as moving somewhere
 * rather than a flash. Put the returned `ref` on the content that changes, not on what stays put (the header, a sidebar). The first
 * showing doesn't animate. `rise` is how far it travels up, in pixels.
 */
export function useEnterAnimation<T extends HTMLElement>(key: unknown, rise = 10) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el?.animate || prefersReducedMotion()) return;
    el.animate(
      [
        { opacity: 0, transform: `translateY(${rise}px)` },
        { opacity: 1, transform: "none" },
      ],
      {
        duration: 320,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
    );
  }, [key, rise]);
  return ref;
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

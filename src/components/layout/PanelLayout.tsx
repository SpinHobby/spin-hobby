import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion, useSlidingIndicator } from "../hooks";
import "../styles/tokens.scss";
import "../styles/components.scss";

export interface PanelTab<K extends string = string> {
  key: K;
  label: string;
  /** A count shown beside the tab (hidden at 0). */
  badge?: number;
}

/**
 * A page with a dark panel of tabs on the left, a bar across the top, and the chosen tab's content. The admin is built with it; so is any page
 * that works the same way (an account page: Orders, Wishlist, Addresses, Profile). On a phone the panel slides in from a ☰ button.
 *
 *   <PanelLayout tag="MY ACCOUNT" tabs={tabs} active={tab} onSelect={setTab} title="Orders">…</PanelLayout>
 */
export function PanelLayout<K extends string>({
  tabs,
  active,
  onSelect,
  title,
  tag,
  brandHref = "/",
  logo = "/logo/logo%20cropped.png",
  navLabel,
  footer,
  topActions,
  banner,
  toast,
  children,
}: {
  tabs: PanelTab<K>[];
  active: K;
  onSelect: (key: NoInfer<K>) => void;
  /** The page heading in the top bar (usually the active tab's label). */
  title: ReactNode;
  /** The small gold label beside the logo ("ADMIN", "MY ACCOUNT"). */
  tag?: string;
  brandHref?: string;
  logo?: string;
  /** What screen readers call the tab list. */
  navLabel?: string;
  /** Status lines or a button at the bottom of the panel. */
  footer?: ReactNode;
  /** Buttons and links on the right of the top bar (theme toggle, user menu...). */
  topActions?: ReactNode;
  /** A notice above the content (see Banner). */
  banner?: ReactNode;
  /** A short message at the bottom of the screen (from useToast). */
  toast?: ReactNode;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const ind = useSlidingIndicator<HTMLElement>(active, "y");
  // The new tab's content eases in (a short fade and rise), so switching feels like moving, not flashing.
  const content = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (prefersReducedMotion()) return;
    content.current?.animate?.(
      [
        { opacity: 0, transform: "translateY(8px)" },
        { opacity: 1, transform: "none" },
      ],
      { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }, [active]);
  const select = (key: K) => {
    onSelect(key);
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  };
  return (
    <div className="sh ui-panel">
      {navOpen && <div className="sh-overlay ui-nav-overlay" onClick={() => setNavOpen(false)} />}
      <aside className={`ui-side ${navOpen ? "is-open" : ""}`}>
        <div className="ui-side__brand">
          <a href={brandHref}>
            <img src={logo} alt="Spin Hobby" />
          </a>
          {tag && <span className="ui-tag">{tag}</span>}
        </div>
        <nav ref={ind.ref} className="ui-side__nav" aria-label={navLabel ?? tag ?? "Sections"}>
          <span className={`ui-ind ui-side__ind ${ind.ready ? "is-ready" : ""}`} style={ind.style} aria-hidden />
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              data-on={active === t.key}
              className={active === t.key ? "is-active" : ""}
              aria-current={active === t.key ? "page" : undefined}
              onClick={() => select(t.key)}
            >
              <span className="ui-side__item">
                <span className="ui-side__dot" />
                {t.label}
              </span>
              {!!t.badge && t.badge > 0 && <span className="ui-side__badge">{t.badge}</span>}
            </button>
          ))}
        </nav>
        {footer && <div className="ui-side__foot">{footer}</div>}
      </aside>

      <div className="ui-main">
        <header className="ui-top">
          <button type="button" className="sh-icon-btn ui-burger" onClick={() => setNavOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <h1 className="sh-display">{title}</h1>
          {topActions}
        </header>
        <main ref={content} className="ui-content">
          {banner}
          {children}
        </main>
      </div>
      {toast && (
        <div key={String(toast)} className="sh-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}

/** One status line at the bottom of the panel: a coloured dot and a short text. */
export function PanelStatus({ color, children }: { color: string; children: ReactNode }) {
  return (
    <div className="ui-side__status">
      <span className="ui-dot" style={{ background: color }} />
      <span>{children}</span>
    </div>
  );
}

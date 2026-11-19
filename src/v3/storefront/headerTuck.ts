import { useEffect, useState, type RefObject } from "react";

const PHONE = "(max-width: 640px)";
/** Scrolled this far down before the logo row tucks away, so the top of the page always shows the whole header. */
const TUCK_AFTER = 240;
/** Pixels of scroll in one direction before the header changes, so a shaky thumb doesn't make it flicker. */
const JITTER = 6;

/**
 * Phones: the header (logo, cart, search, sections) is a quarter of the screen. Scrolling down slides the logo row away and keeps
 * the search and sections; scrolling up brings it back. Returns the header's style: `--tuck` is the logo row's height, and
 * `tucked` adds the class that slides it up.
 */
export function useHeaderTuck(header: RefObject<HTMLElement | null>, search: RefObject<HTMLElement | null>) {
  const [tucked, setTucked] = useState(false);
  const [tuck, setTuck] = useState(0);

  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    let last = window.scrollY;
    let frame = 0;
    const measure = () => {
      const h = header.current?.getBoundingClientRect().top ?? 0;
      const s = search.current?.getBoundingClientRect().top ?? 0;
      setTuck(phone.matches ? Math.max(0, Math.round(s - h - 6)) : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (!phone.matches || y < TUCK_AFTER) setTucked(false);
        else if (y > last + JITTER) setTucked(true);
        else if (y < last - JITTER) setTucked(false);
        else return;
        last = y;
      });
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    phone.addEventListener("change", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      phone.removeEventListener("change", measure);
    };
  }, [header, search]);

  return { tucked: tucked && tuck > 0, tuck };
}

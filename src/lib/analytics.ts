// The website's own analytics: anonymous counts of each shopping step (a visit, a product viewed, added to the cart, checkout opened),
// sent to our API in small batches. No cookies, no ids, nothing that identifies a person; paid orders are counted by the API itself.
// Admin pages aren't counted, nor browsers that ask not to be tracked (Do Not Track / Global Privacy Control). Also reports errors
// from shoppers' browsers to the API, which passes them to the server's error reporting.
import { API_URL } from "./api";

type Step = "visit" | "product_view" | "add_to_cart" | "checkout_view";

const optedOut = () => {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
};
// npm run dev sends nothing (VITE_ANALYTICS_IN_DEV=1 to try it), so local clicking doesn't fill the funnel with half its steps
const inDev = import.meta.env.DEV && !import.meta.env.VITE_ANALYTICS_IN_DEV;
const counted = () => !inDev && !location.pathname.startsWith("/admin") && !optedOut();

const queue: { name: Step; productId?: string }[] = [];
let timer: number | undefined;

function send(path: string, body: unknown) {
  // keepalive lets it finish even when the page is closing
  void fetch(`${API_URL}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  }).catch(() => undefined);
}

function flush() {
  window.clearTimeout(timer);
  timer = undefined;
  while (queue.length) send("/analytics/events", { events: queue.splice(0, 20) });
}

/** Counts one shopping step (with its product, for views and add-to-carts). Batched; sent within a few seconds or when the page closes. */
export function track(name: Step, productId?: string) {
  if (!counted()) return;
  queue.push(productId ? { name, productId } : { name });
  timer ??= window.setTimeout(flush, 3000);
}

/** One visit per browser tab session. */
function countVisit() {
  try {
    if (sessionStorage.getItem("spinhobby-visit")) return;
    sessionStorage.setItem("spinhobby-visit", "1");
  } catch {
    /* storage blocked: count it anyway */
  }
  track("visit");
}

let reported = 0;
/** Sends an error from this browser to the API (at most 5 per page, so a loop can't flood it). */
function reportError(message: string, stack?: string) {
  if (reported >= 5 || !message) return;
  reported++;
  send("/client-errors", {
    message: message.slice(0, 500),
    stack: stack?.slice(0, 4000),
    page: location.pathname,
    release: import.meta.env.VITE_RELEASE || undefined,
  });
}

/** Starts counting (a visit) and catching errors. Called once when the site opens. */
export function startAnalytics() {
  if (inDev) return;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
  if (counted()) countVisit();
  window.addEventListener("error", (e) => reportError(e.message, e.error instanceof Error ? e.error.stack : undefined));
  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    reportError(r instanceof Error ? r.message : String(r ?? "Unhandled rejection"), r instanceof Error ? r.stack : undefined);
  });
}

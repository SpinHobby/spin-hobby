// Whether the shop server is answering. The staging server runs on Render's free plan, which sleeps after a while with no visitors and takes
// up to a minute to wake: without a word on screen the site just looks broken. Every request is watched here, and the banner (ServerStatus.tsx)
// says when the server is slow to answer (waking up) or cannot be reached, and when it is back.

export type ServerState = "ok" | "slow" | "down";

/** A request still waiting after this long is taken as the server waking up. */
const SLOW_MS = 3_000;
/** How often the server is asked whether it is up again, while it is not answering. */
const PING_MS = 4_000;
/** How long a page read waits for a sleeping server before giving up. */
const WAKE_LIMIT_MS = 120_000;

let state: ServerState = "ok";
let since: number | null = null;
let pending = 0;
let slowTimer: ReturnType<typeof setTimeout> | null = null;
let pinging: Promise<void> | null = null;
const listeners = new Set<(s: ServerState, since: number | null) => void>();

function set(next: ServerState) {
  if (next === state) return;
  // the clock starts when the server first stops answering promptly, and keeps running from "slow" into "down"
  if (next === "ok") since = null;
  else since ??= Date.now();
  state = next;
  listeners.forEach((fn) => fn(state, since));
}

export function serverState() {
  return { state, since };
}

export function onServerState(fn: (s: ServerState, since: number | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Asks the server's health check until it answers, then marks it up. One loop at a time, however many requests are waiting. */
function waitUntilUp(apiUrl: string): Promise<void> {
  pinging ??= (async () => {
    const start = Date.now();
    while (Date.now() - start < WAKE_LIMIT_MS) {
      const ok = await fetch(`${apiUrl}/health/live`, { cache: "no-store" })
        .then((r) => r.ok)
        .catch(() => false);
      if (ok) {
        set("ok");
        return;
      }
      await sleep(PING_MS);
    }
  })().finally(() => {
    pinging = null;
  });
  return pinging;
}

/** Proxy answers while a server boots (and a gateway with nothing behind it): the request never reached the shop server. */
const BOOTING = new Set([502, 503, 504]);

/**
 * `fetch` that keeps the banner up to date. A read (GET or HEAD) that fails because the server is asleep or booting waits for it and is tried
 * again; anything that changes data is never sent twice, it fails with a plain message instead.
 */
export async function watchedFetch(apiUrl: string, url: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const isRead = method === "GET" || method === "HEAD";
  const start = Date.now();
  pending++;
  slowTimer ??= setTimeout(() => {
    slowTimer = null;
    if (pending > 0 && state === "ok") set("slow");
  }, SLOW_MS);
  try {
    for (;;) {
      let response: Response | null = null;
      try {
        response = await fetch(url, init);
      } catch {
        response = null;
      }
      // the shop server's own errors are JSON (a 503 "Square is not connected" is an answer, not a server waking up); the proxy's are not
      const booting =
        !!response && BOOTING.has(response.status) && !(response.headers.get("content-type") ?? "").includes("application/json");
      if (response && !booting) {
        set("ok");
        return response;
      }
      set("down");
      if (!isRead || Date.now() - start > WAKE_LIMIT_MS) {
        if (response) return response;
        throw new Error("unreachable");
      }
      await waitUntilUp(apiUrl);
      if (state !== "ok") {
        if (response) return response;
        throw new Error("unreachable");
      }
    }
  } finally {
    pending--;
    if (pending === 0 && slowTimer) {
      clearTimeout(slowTimer);
      slowTimer = null;
    }
  }
}

/** Checks the server once when the site opens, so a sleeping staging server starts waking (and the banner shows) before the first click. */
export function wakeServer(apiUrl: string) {
  void watchedFetch(apiUrl, `${apiUrl}/health/live`, { cache: "no-store" }).catch(() => undefined);
}

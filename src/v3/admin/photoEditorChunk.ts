/**
 * The photo editor's code, loaded once and kept. A release deletes the previous build's files, so a page left open across a release could
 * no longer fetch the editor when Edit was pressed ("The photo editor could not open", 2026-11-19). The admin starts this as soon as a
 * staff member is in, so the editor is already in the page before any later release.
 */
let loading: Promise<typeof import("./PhotoEditor")> | null = null;

export function loadPhotoEditor() {
  loading ??= import("./PhotoEditor").catch((e: unknown) => {
    loading = null; // a dropped connection: the next try fetches it again
    throw e;
  });
  return loading;
}

/** Fetches the editor once the page is idle, so it does not slow the admin's first screen. */
export function preloadPhotoEditor() {
  const start = () => void loadPhotoEditor().catch(() => {});
  if ("requestIdleCallback" in window) window.requestIdleCallback(start, { timeout: 5000 });
  else setTimeout(start, 2000);
}

import { useEffect, useState } from "react";
import type { BlendAnswer, BlendRequest } from "./blend.worker";

/**
 * Product photos blended into the shop background (blendCore.ts), made in a worker and kept for the visit as object URLs. Until a blend is
 * ready, or when one cannot be made, a photo shows as before: the transparent picture over the background.
 */

let worker: Worker | null | undefined;
let nextId = 1;
const waiting = new Map<number, (blob: Blob | null) => void>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return (worker = null);
    worker = new Worker(new URL("./blend.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<BlendAnswer>) => {
      waiting.get(e.data.id)?.(e.data.blob);
      waiting.delete(e.data.id);
    };
    worker.onerror = () => {
      worker = null;
      waiting.forEach((done) => done(null));
      waiting.clear();
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Blends made this visit (key: photo, background, size, fit), oldest first; the oldest are let go past this many. */
const KEEP = 240;
const made = new Map<string, Promise<string | null>>();

/** Square sizes a blend is made at: the next one up from the width asked for, so a page's few sizes share blends. */
const SIZES = [160, 240, 480, 800, 1200, 1600];
const sizeFor = (width: number) => SIZES.find((s) => s >= width) ?? SIZES[SIZES.length - 1];

/** An object URL of `cut` blended into `bg` (null when it could not be made). */
export function blended(cut: string, bg: string, width: number, fit: "cover" | "pad" = "cover"): Promise<string | null> {
  const size = sizeFor(width);
  const key = `${cut}|${bg}|${size}|${fit}`;
  const known = made.get(key);
  if (known) return known;
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = nextId++;
  const p = new Promise<Blob | null>((resolve) => {
    waiting.set(id, resolve);
    w.postMessage({ id, cut: new URL(cut, location.href).href, bg: new URL(bg, location.href).href, size, fit } satisfies BlendRequest);
  }).then((blob) => (blob ? URL.createObjectURL(blob) : null));
  made.set(key, p);
  if (made.size > KEEP) {
    const oldest = made.keys().next().value!;
    void made.get(oldest)?.then((url) => url && URL.revokeObjectURL(url));
    made.delete(oldest);
  }
  return p;
}

/**
 * Shows the blended copy of a transparent product photo in `el` once it is ready (`bg`: the background it is shown on; null: plain
 * white, where the photo shows as it is). Safe to call on every render: it remembers what the <img> shows, and puts the original back
 * when the background goes.
 */
export function blendInto(el: HTMLImageElement | null, bg: string | null, width: number) {
  if (!el) return;
  const now = el.getAttribute("src");
  if (!now) return;
  const original = now.startsWith("blob:") ? (el.dataset.blendOf ?? null) : now;
  if (!original) return;
  if (!bg) {
    if (now !== original) restore(el, original);
    return;
  }
  const key = `${original}|${bg}|${width}`;
  if (el.dataset.blendKey === key) return;
  el.dataset.blendKey = key;
  void blended(original, bg, width).then((url) => {
    // still the same photo on the same background (the <img> may have been given another one meanwhile)
    if (!url || el.dataset.blendKey !== key) return;
    const src = el.getAttribute("src");
    if (src !== original && !src?.startsWith("blob:")) return;
    el.dataset.blendOf = original;
    // a photo offered at several widths would keep showing one of those: the blend replaces them all
    if (el.hasAttribute("srcset")) {
      el.dataset.blendSrcset = el.getAttribute("srcset") ?? "";
      el.removeAttribute("srcset");
    }
    el.src = url;
  });
}

function restore(el: HTMLImageElement, original: string) {
  delete el.dataset.blendKey;
  if (el.dataset.blendSrcset) el.setAttribute("srcset", el.dataset.blendSrcset);
  delete el.dataset.blendSrcset;
  el.src = original;
}

/** For a picture React draws itself (the admin's previews): the blended copy's address once ready, else null. */
export function useBlended(cut: string | null, bg: string | null, width: number, fit: "cover" | "pad" = "cover"): string | null {
  const [state, setState] = useState<{ key: string; url: string | null } | null>(null);
  const key = cut && bg ? `${cut}|${bg}|${width}|${fit}` : null;
  useEffect(() => {
    if (!cut || !bg || !key) return;
    let live = true;
    void blended(cut, bg, width, fit).then((url) => live && setState({ key, url }));
    return () => {
      live = false;
    };
  }, [cut, bg, width, fit, key]);
  return state && state.key === key ? state.url : null;
}

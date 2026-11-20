import { useSyncExternalStore, type CSSProperties, type SyntheticEvent } from "react";

/**
 * Product photos synced from Square are large originals (about 1920 px, ~500 KB each). Netlify's image service
 * (/.netlify/images) shrinks them to the size actually shown, which makes pages many times lighter.
 * Only Square's picture host goes through it (it must also be listed under `[images]` in netlify.toml);
 * our own images are used as they are.
 */
const SQUARE_PHOTOS = /^https:\/\/items-images-[a-z]+\.s3\.[a-z0-9-]+\.amazonaws\.com\//;

/** The shop background: every transparent product photo is shown on it (null: plain white). Set once the store settings arrive. */
let shopBackground: string | null = null;
export function setShopBackground(url: string | null) {
  shopBackground = url;
}

/**
 * Where a photo sits in its square. Product photos always fill their square (cropped, never shrunk with a margin); an admin can move one
 * (x, y: the point kept in view, 0-100 % across and down) and zoom in (1 = none). Saved per product and photo (Admin > product > Photos).
 */
export interface PhotoFrame {
  x: number;
  y: number;
  zoom: number;
}

/** The frame an admin gave `url` on this product, if any. */
export const frameOf = (p: { frames?: Record<string, PhotoFrame> }, url: string | null | undefined): PhotoFrame | undefined =>
  url ? p.frames?.[url] : undefined;

/**
 * Style for a product photo's <img> that applies its frame. Only CSS variables (--fx, --fy, --fz): the stylesheets turn them into
 * object-position, transform-origin and scale (see .sf-img img), so a card's hover zoom still works on top.
 * Once the photo has been looked at (`fitOf`), flat bars around the picture are cropped away and x, y move within the picture only.
 */
export function frameStyle(frame: PhotoFrame | undefined, fit?: PhotoFit | null): Record<string, string> {
  if (fit) return fitVars(fit, frame ?? defaultFrame(fit));
  if (!frame) return {};
  return { "--fx": `${frame.x}%`, "--fy": `${frame.y}%`, "--fz": String(frame.zoom) };
}

/* ---------- Bars around a photo ----------
 * Many supplier photos are a tall or wide picture pasted onto a white square (2026-11-19: Black Hanekawa Ver.2, a pink strip with white
 * sides). Filling the square with that file still shows the white, so the browser looks at each photo once, finds flat bars of one colour
 * that end in a straight edge, and crops them away. A figure shot on a white backdrop is left alone: its edge is the figure's outline,
 * not a straight line. Tall pictures then start at the top, where a figure's face is; an admin can move that (PhotoFrameEditor) and a
 * shopper can drag the product page photo to see the rest. */

/** What a photo is: its width / height and the picture inside it without bars (fractions of the file, 0-1), or null when it has none. */
export interface PhotoFit {
  aspect: number;
  box: { x: number; y: number; w: number; h: number } | null;
}

const fits = new Map<string, PhotoFit>();
const fitListeners = new Set<() => void>();

/** What is known about `url` so far (undefined until a copy of it has loaded once). */
export const fitOf = (url: string | null | undefined): PhotoFit | undefined => (url ? fits.get(url) : undefined);

/** `fitOf` that re-renders the component once the photo has been looked at. */
export function usePhotoFit(url: string | null | undefined): PhotoFit | undefined {
  return useSyncExternalStore(
    (on) => {
      fitListeners.add(on);
      return () => fitListeners.delete(on);
    },
    () => fitOf(url),
  );
}

function rememberFit(url: string, fit: PhotoFit) {
  fits.set(url, fit);
  fitListeners.forEach((on) => on());
}

/** Where a tall picture starts when no admin has placed it: near its top (0 = top, 100 = bottom), where a figure's face is. */
const FACE_FIRST_Y = 5;

/** The frame used when an admin has not set one: tall pictures start at the top, everything else in the middle. */
export function defaultFrame(fit: PhotoFit | undefined | null): PhotoFrame {
  if (!fit) return { x: 50, y: 50, zoom: 1 };
  const { w, h } = pictureSize(fit);
  return { x: 50, y: h > w * 1.1 ? FACE_FIRST_Y : 50, zoom: 1 };
}

/** The picture's size without bars, in units where the file is `aspect` wide and 1 high. */
function pictureSize(fit: PhotoFit) {
  const b = fit.box ?? { x: 0, y: 0, w: 1, h: 1 };
  return { x: b.x * fit.aspect, y: b.y, w: b.w * fit.aspect, h: b.h };
}

/**
 * The CSS variables that show the square part of the picture chosen by `frame`. The stylesheets cover the square with the file
 * (object-fit: cover), place it at --fx/--fy and scale it by --fz around that same point; on each axis that shows a window of the file
 * whose start is f × (1 − window), so f is worked back from where the window should start. Without bars this gives the frame unchanged.
 */
function fitVars(fit: PhotoFit, frame: PhotoFrame): Record<string, string> {
  const fileW = fit.aspect;
  const p = pictureSize(fit);
  const side = Math.min(p.w, p.h) / Math.max(1, frame.zoom); // the square that shows, in file units
  const start = (from: number, size: number, at: number) => from + (Math.min(100, Math.max(0, at)) / 100) * Math.max(0, size - side);
  const f = (begin: number, file: number) => (file - side > 1e-6 ? (begin / (file - side)) * 100 : 50);
  const fx = f(start(p.x, p.w, frame.x), fileW);
  const fy = f(start(p.y, p.h, frame.y), 1);
  const z = Math.min(fileW, 1) / side;
  const r = (n: number) => String(Math.round(n * 1000) / 1000);
  return { "--fx": `${r(fx)}%`, "--fy": `${r(fy)}%`, "--fz": r(z) };
}

/**
 * Moves `frame` by a drag of (dx, dy) screen pixels over a square `size` pixels wide, so the picture follows the pointer. Returns the
 * frame unchanged on an axis with nothing more to show.
 */
export function dragFrame(fit: PhotoFit | undefined | null, frame: PhotoFrame, dx: number, dy: number, size: number): PhotoFrame {
  const p = fit ? pictureSize(fit) : { w: 1, h: 1 };
  const side = Math.min(p.w, p.h) / Math.max(1, frame.zoom);
  // one screen pixel is side / size file units; the frame's 0-100 spans (picture − side) file units
  const step = (span: number) => (span - side > 1e-6 ? ((side / size) * 100) / (span - side) : 0);
  const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
  return { ...frame, x: clamp(frame.x - dx * step(p.w)), y: clamp(frame.y - dy * step(p.h)) };
}

/** Which ways a photo can be dragged in its square: the picture is taller or wider than the part that shows. */
export function canDrag(fit: PhotoFit | undefined | null, zoom = 1): { x: boolean; y: boolean } {
  if (!fit) return { x: zoom > 1, y: zoom > 1 };
  const p = pictureSize(fit);
  const side = Math.min(p.w, p.h) / Math.max(1, zoom);
  return { x: p.w - side > side * 0.02, y: p.h - side > side * 0.02 };
}

/** A pixel counts as part of a bar when every channel is within this much of the bar's colour (JPEG noise on flat white). */
const BAR_TOLERANCE = 16;

/**
 * Finds flat bars along the sides of a loaded photo. Throws when the browser may not read its pixels (another site's photo without
 * permission). Each side: rows or columns that are all (98 %+) the colour at that side's middle count as bar; the first one that
 * isn't must be mostly (60 %+) picture, a straight edge, or the side is left as it is.
 */
export function measureBars(img: HTMLImageElement): PhotoFit {
  const aspect = img.naturalWidth / img.naturalHeight;
  const W = aspect >= 1 ? 200 : Math.max(8, Math.round(200 * aspect));
  const H = aspect >= 1 ? Math.max(8, Math.round(200 / aspect)) : 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { aspect, box: null };
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const at = (x: number, y: number) => (y * W + x) * 4;
  const same = (i: number, c: number) =>
    Math.abs(px[i] - px[c]) <= BAR_TOLERANCE &&
    Math.abs(px[i + 1] - px[c + 1]) <= BAR_TOLERANCE &&
    Math.abs(px[i + 2] - px[c + 2]) <= BAR_TOLERANCE;

  let left = 0;
  let right = W; // exclusive
  let top = 0;
  let bottom = H;
  // share of a column (x) or row (y) between the current bounds that is NOT the bar colour `c`
  const colOff = (x: number, c: number) => {
    let n = 0;
    for (let y = top; y < bottom; y++) if (!same(at(x, y), c)) n++;
    return n / Math.max(1, bottom - top);
  };
  const rowOff = (y: number, c: number) => {
    let n = 0;
    for (let x = left; x < right; x++) if (!same(at(x, y), c)) n++;
    return n / Math.max(1, right - left);
  };
  const scan = (from: number, to: number, dir: number, off: (i: number) => number) => {
    let i = from;
    while (i !== to && off(i) <= 0.02) i += dir;
    if (i === from || i === to) return from; // no bar, or nothing but bar
    // a straight edge, softened over a few pixels when the photo was shrunk (Elsa Granhiert's card, 2026-11-20)
    for (let k = 0; k < 4 && i !== to; k++, i += dir) if (off(i) >= 0.6) return i;
    return from;
  };
  // twice: bars on all four sides only show their straight edges once the other pair is cut off
  for (let pass = 0; pass < 2; pass++) {
    const midY = Math.floor((top + bottom) / 2);
    const midX = Math.floor((left + right) / 2);
    const l = scan(left, right - 1, 1, (x) => colOff(x, at(left, midY)));
    const r = scan(right - 1, left, -1, (x) => colOff(x, at(right - 1, midY)));
    left = l;
    right = r === right - 1 ? right : r + 1;
    const t = scan(top, bottom - 1, 1, (y) => rowOff(y, at(midX, top)));
    const b = scan(bottom - 1, top, -1, (y) => rowOff(y, at(midX, bottom - 1)));
    top = t;
    bottom = b === bottom - 1 ? bottom : b + 1;
  }
  // step one more pixel in on every cut side, so a blurred edge never leaves a thin line of the bar
  if (left > 0) left++;
  if (right < W) right--;
  if (top > 0) top++;
  if (bottom < H) bottom--;
  const box = { x: left / W, y: top / H, w: (right - left) / W, h: (bottom - top) / H };
  // ignore slivers (under 3 %) and anything that leaves too little picture to be right
  if ((box.w > 0.97 && box.h > 0.97) || box.w < 0.15 || box.h < 0.15) return { aspect, box: null };
  return { aspect, box };
}

/** Looks at a photo that just loaded (once per address); `el` gets the cropped frame straight away. */
function lookAtPhoto(url: string, el: HTMLImageElement, frame: PhotoFrame | undefined) {
  if (!el.naturalWidth) return;
  const known = fits.get(url);
  if (known) {
    // the same photo again (a card and its thumbnail, say): it gets the crop worked out the first time
    applyVars(el, frameStyle(frame, known));
    return;
  }
  let fit: PhotoFit;
  try {
    fit = measureBars(el);
  } catch {
    // another site's photo the browser won't let us read (Square's original, when the image service is down): it stays as it is
    rememberFit(url, { aspect: el.naturalWidth / el.naturalHeight, box: null });
    return;
  }
  rememberFit(url, fit);
  applyVars(el, frameStyle(frame, fit));
}

/**
 * Sets a photo's frame on a photo already on the page. Its zoom animation (cards zoom on hover) is paused for the change: with it, Chrome
 * kept drawing the photo around its old centre (the Hanekawa card showed her middle, not her face, 2026-11-20).
 */
function applyVars(el: HTMLImageElement, vars: Record<string, string>) {
  if (Object.entries(vars).every(([k, v]) => el.style.getPropertyValue(k) === v)) return;
  const transition = el.style.transition;
  el.style.transition = "none";
  for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  void el.offsetWidth; // apply now, before the animation comes back
  el.style.transition = transition;
}

/**
 * Looks at `url` without showing it (the admin's editor shows Square's original, which the browser may not read): loads the image
 * service's small copy, which comes from this site.
 */
export function lookAtUrl(url: string) {
  if (fits.has(url) || typeof Image === "undefined") return;
  const img = new Image();
  img.onload = () => lookAtPhoto(url, img, undefined);
  img.onerror = () => {
    if (img.src !== new URL(url, location.href).href) img.src = url; // the image service failed: try the original once
  };
  img.src = resized(url, 400);
}

/** The frame an admin gave `url` on this product, if any. */
/** Props for a product photo: `photo()` plus the photo's frame and cut-out background. */
export function productPhoto(p: { cutouts?: string[]; frames?: Record<string, PhotoFrame> }, url: string, width: number) {
  return framedPhoto(url, width, isCutout(p, url), frameOf(p, url));
}

/** `photo()` with a frame (for a photo known only by its address, like a cart line's). */
export function framedPhoto(url: string, width: number, cutout = false, frame?: PhotoFrame) {
  const base = photo(url, width, cutout);
  return {
    ...base,
    style: { ...base.style, ...frameStyle(frame, cutout ? undefined : fitOf(url)) } as CSSProperties,
    // a cut-out has no bars: its see-through parts show the shop background
    onLoad: cutout ? undefined : (e: SyntheticEvent<HTMLImageElement>) => lookAtPhoto(url, e.currentTarget, frame),
    // a photo the browser already had can finish loading before the page listens for it: look at it as soon as it is on the page
    ref: cutout
      ? undefined
      : (el: HTMLImageElement | null) => {
          if (el?.complete) lookAtPhoto(url, el, frame);
        },
  };
}

/** Whether `url` is one of the product's transparent cut-out photos. */
export const isCutout = (p: { cutouts?: string[] }, url: string | null | undefined) => !!url && !!p.cutouts?.includes(url);

/** The address of `url` shrunk to `width` pixels wide (or `url` itself when it is not a Square photo). */
/** The widths a product photo is offered at, for the browser to choose from (the shop keeps photos up to 3072 px: spin-hobby-server). */
export const PHOTO_WIDTHS = [480, 800, 1200, 1600, 2048, 2560, 3072];

/** How many times wider than its square the photo's file is drawn, once its bars are cropped and its frame zoomed (1 for a square photo). */
export function frameScale(fit: PhotoFit | undefined | null, frame: PhotoFrame | undefined | null): number {
  if (!fit) return Math.max(1, frame?.zoom ?? 1);
  const p = pictureSize(fit);
  const side = Math.min(p.w, p.h) / Math.max(1, frame?.zoom ?? 1);
  return Math.max(1, fit.aspect / side);
}

/**
 * `srcSet` and `sizes` for a product photo drawn `shownWidth` CSS pixels wide (a CSS length like "min(100vw, 760px)" works too) and zoomed
 * `scale` times: the browser fetches the copy that is sharp on this screen (its pixel density included), not one fixed size. The product
 * page asked for 1000 px whatever it showed, so a zoomed crop on a 2x screen was stretched about twice (spin-hobby#110, 2026-11-20).
 * Nothing for a photo the resizing service does not serve: its `src` is the photo itself.
 */
export function photoSources(url: string, shownWidth: number | string, scale = 1): { srcSet?: string; sizes?: string } {
  if (!SQUARE_PHOTOS.test(url)) return {};
  const shown =
    typeof shownWidth === "number" ? `${Math.ceil(shownWidth * scale)}px` : `calc(${shownWidth} * ${Math.round(scale * 1000) / 1000})`;
  return { srcSet: PHOTO_WIDTHS.map((w) => `${resized(url, w)} ${w}w`).join(", "), sizes: shown };
}

export function resized(url: string, width: number): string {
  if (!SQUARE_PHOTOS.test(url)) return url;
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${Math.round(width)}&fm=webp&q=78`;
}

/**
 * Props for an <img> showing a product photo at about `width` pixels wide (use ~2x the size on screen for sharp
 * photos on phones). If the resizing service ever fails, the image falls back to the original photo, so a shopper
 * never sees a broken picture. A transparent cut-out (`cutout`) is drawn on the shop background: the picture's own
 * background shows through its see-through parts only, so changing the shop background changes every such photo.
 */
export function photo(url: string, width: number, cutout = false) {
  return {
    src: resized(url, width),
    ...(cutout ? { style: { background: `${shopBackground ? `url("${shopBackground}") center / cover no-repeat, ` : ""}#fff` } } : {}),
    onError: (e: SyntheticEvent<HTMLImageElement>) => {
      if (e.currentTarget.getAttribute("src") !== url) e.currentTarget.src = url;
    },
  };
}

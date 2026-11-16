import type { CSSProperties, SyntheticEvent } from "react";

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
 */
export function frameStyle(frame: PhotoFrame | undefined): Record<string, string> {
  if (!frame) return {};
  return { "--fx": `${frame.x}%`, "--fy": `${frame.y}%`, "--fz": String(frame.zoom) };
}

/** Props for a product photo: `photo()` plus the photo's frame and cut-out background. */
export function productPhoto(p: { cutouts?: string[]; frames?: Record<string, PhotoFrame> }, url: string, width: number) {
  return framedPhoto(url, width, isCutout(p, url), frameOf(p, url));
}

/** `photo()` with a frame (for a photo known only by its address, like a cart line's). */
export function framedPhoto(url: string, width: number, cutout = false, frame?: PhotoFrame) {
  const base = photo(url, width, cutout);
  return { ...base, style: { ...base.style, ...frameStyle(frame) } as CSSProperties };
}

/** Whether `url` is one of the product's transparent cut-out photos. */
export const isCutout = (p: { cutouts?: string[] }, url: string | null | undefined) => !!url && !!p.cutouts?.includes(url);

/** The address of `url` shrunk to `width` pixels wide (or `url` itself when it is not a Square photo). */
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

import type { SyntheticEvent } from "react";

/**
 * Product photos synced from Square are large originals (about 1920 px, ~500 KB each). Netlify's image service
 * (/.netlify/images) shrinks them to the size actually shown, which makes pages many times lighter.
 * Only Square's picture host goes through it (it must also be listed under `[images]` in netlify.toml);
 * our own images are used as they are.
 */
const SQUARE_PHOTOS = /^https:\/\/items-images-[a-z]+\.s3\.[a-z0-9-]+\.amazonaws\.com\//;

/** The address of `url` shrunk to `width` pixels wide (or `url` itself when it is not a Square photo). */
export function resized(url: string, width: number): string {
  if (!SQUARE_PHOTOS.test(url)) return url;
  return `/.netlify/images?url=${encodeURIComponent(url)}&w=${Math.round(width)}&fm=webp&q=78`;
}

/**
 * Props for an <img> showing a product photo at about `width` pixels wide (use ~2x the size on screen for sharp
 * photos on phones). If the resizing service ever fails, the image falls back to the original photo, so a shopper
 * never sees a broken picture.
 */
export function photo(url: string, width: number) {
  return {
    src: resized(url, width),
    onError: (e: SyntheticEvent<HTMLImageElement>) => {
      if (e.currentTarget.getAttribute("src") !== url) e.currentTarget.src = url;
    },
  };
}

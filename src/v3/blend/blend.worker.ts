/**
 * Blends product photos into the shop background off the page's main thread (see blendCore.ts): downloads the photo and the background,
 * draws both into a square, blends them and hands back a JPEG. Any failure (a photo the browser may not read, an old browser) answers
 * null, and the page keeps showing the photo on its plain background as before.
 */
import { blendOnBackground, type Rgba } from "./blendCore";

export interface BlendRequest {
  id: number;
  /** The transparent product photo. */
  cut: string;
  bg: string;
  size: number;
  /** "cover": the photo is already the padded square the shop keeps. "pad": a bare cut-out, padded and centred here first (the admin's preview). */
  fit: "cover" | "pad";
}

export interface BlendAnswer {
  id: number;
  blob: Blob | null;
}

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<BlendRequest>) => void) | null;
  postMessage(answer: BlendAnswer): void;
};

const backgrounds = new Map<string, Promise<ImageBitmap>>();

async function bitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  return createImageBitmap(await res.blob());
}

function background(url: string) {
  let p = backgrounds.get(url);
  if (!p) {
    p = bitmap(url);
    p.catch(() => backgrounds.delete(url));
    backgrounds.set(url, p);
    if (backgrounds.size > 8) backgrounds.delete(backgrounds.keys().next().value!);
  }
  return p;
}

/** Same padding as the shop's own photos (spin-hobby-server compose-photo.ts PHOTO_PADDING). */
const PADDING = 0.08;

function pixels(img: ImageBitmap, size: number, fit: "cover" | "pad"): Rgba {
  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.imageSmoothingQuality = "high";
  if (fit === "cover") {
    const s = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  } else {
    const inner = size * (1 - 2 * PADDING);
    const k = inner / Math.max(img.width, img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  }
  return { w: size, h: size, d: ctx.getImageData(0, 0, size, size).data };
}

scope.onmessage = async (e) => {
  const { id, cut, bg, size, fit } = e.data;
  try {
    const [cutImg, bgImg] = await Promise.all([bitmap(cut), background(bg)]);
    const out = blendOnBackground(pixels(cutImg, size, fit), pixels(bgImg, size, "cover"));
    cutImg.close();
    if (!out) return scope.postMessage({ id, blob: null });
    const canvas = new OffscreenCanvas(size, size);
    canvas.getContext("2d")?.putImageData(new ImageData(out.d, size, size), 0, 0);
    scope.postMessage({ id, blob: await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 }) });
  } catch {
    scope.postMessage({ id, blob: null });
  }
};

import { api } from "../../lib/api";

export interface PreparedImage { blob: Blob; dataUrl: string; type: string; width: number; height: number; originalBytes: number }

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    // Respects EXIF orientation, so phone photos aren't sideways.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Shrinks a photo in the browser: longest side ≤ maxSize, WebP (JPEG fallback). A 4 MB phone photo ends up ~100–250 KB. */
export async function prepareImage(file: File, maxSize = 1200, quality = 0.82): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decode(file);
  } catch {
    throw new Error("This photo format isn't supported here. Try a JPEG or PNG.");
  }
  const w = "naturalWidth" in source ? source.naturalWidth : source.width;
  const h = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSize / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if ("close" in source) source.close();

  let blob = await toBlob(canvas, "image/webp", quality);
  if (!blob || blob.type !== "image/webp") {
    // Older Safari can't encode WebP; JPEG needs an opaque background.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    blob = await toBlob(canvas, "image/jpeg", quality);
  }
  if (!blob) throw new Error("Your browser couldn't process this photo.");
  return { blob, dataUrl: await toDataUrl(blob), type: blob.type, width: canvas.width, height: canvas.height, originalBytes: file.size };
}

/** Wraps an image the photo editor already sized and encoded, so it uploads like any prepared image. */
export async function preparedFromBlob(blob: Blob, width: number, height: number): Promise<PreparedImage> {
  return { blob, dataUrl: await toDataUrl(blob), type: blob.type, width, height, originalBytes: blob.size };
}

/** Uploads an already-prepared image to the product-images bucket and returns its public URL. */
export async function uploadPrepared(image: PreparedImage, folder: "products" | "slides"): Promise<string> {
  const res = await api<{ url: string }>("/admin/uploads", {
    method: "POST",
    body: JSON.stringify({ data: image.dataUrl, contentType: image.type, folder }),
  });
  return res.url;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

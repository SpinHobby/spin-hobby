// iPhone photos are HEIC, which most browsers (Chrome, Firefox, Edge) cannot open. They are decoded here instead, with heic-decode (libheif, LGPL-3.0), which is
// only downloaded the first time a HEIC file is picked, so the admin stays small for everyone else.

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

/** True for a HEIC/HEIF photo, judged by the file's own first bytes (its "ftyp" box), not its name. AVIF, which browsers open themselves, is not HEIC. */
export function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 16 || ascii(bytes, 4, 8) !== "ftyp") return false;
  const size = Math.min(bytes.length, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0), 256);
  const brands = [ascii(bytes, 8, 12)];
  for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(bytes, i, i + 4));
  if (brands.includes("avif") || brands.includes("avis")) return false;
  return brands.some((b) => HEIC_BRANDS.has(b));
}

/** The picture in a file, upright, ready to draw: a HEIC photo through the decoder, anything else the browser opens itself. */
export async function openPicture(file: File): Promise<ImageBitmap> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  if (isHeic(head) || /\.hei[cf]$/i.test(file.name)) {
    const { default: decode } = await import("heic-decode");
    const { width, height, data } = await decode({ buffer: new Uint8Array(await file.arrayBuffer()) });
    return createImageBitmap(new ImageData(new Uint8ClampedArray(data), width, height));
  }
  return createImageBitmap(file);
}

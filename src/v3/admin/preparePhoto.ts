import { openPicture } from "./heic";

const MAX_BYTES = 4.8 * 1024 * 1024;

/** A photo as a JPEG that is small enough to send: phone photos are big, and iPhone ones are HEIC, which is converted here. Null if it cannot be read. */
export async function preparePhoto(file: File): Promise<File | null> {
  try {
    const bitmap = await openPicture(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let blob: Blob | null = null;
    for (const quality of [0.92, 0.85, 0.78, 0.7]) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= MAX_BYTES) break;
    }
    if (!blob || blob.size > MAX_BYTES) return null;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return null;
  }
}

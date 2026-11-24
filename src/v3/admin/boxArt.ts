/**
 * Box art: a background made from a product's own box. The shop's photo of the box is cropped to the box's artwork, softened until the
 * printed picture is only colour and light, and shaded a little at the foot, so the product's transparent photo reads clearly in front of
 * it. Made here in the browser and only stored by the server (which never makes pictures). No AI: it is the box's own print, blurred.
 */

/** The side of the finished background, in pixels. */
const SIDE = 1200;
/** The artwork is looked at, and softened, at this size: small enough that scaling it back up is the blur. */
const LOOK = 96;
/** How few pixels the artwork is taken down to before it is scaled back up: the fewer, the softer. */
const SOFT = 12;

/**
 * The part of a picture that is not its plain backdrop (0-1 fractions of the picture): rows and columns that differ from the corners'
 * colour. A photo of a box on white or on a green cloth gives the box; a picture with no plain border gives the whole of it.
 */
export function contentBox(pixels: Uint8ClampedArray, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const at = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return [pixels[i]!, pixels[i + 1]!, pixels[i + 2]!];
  };
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)];
  const backdrop = [0, 1, 2].map((c) => corners.reduce((sum, p) => sum + p[c]!, 0) / corners.length);
  // the corners must agree with each other, or there is no plain backdrop to take away
  const plain = corners.every((p) => p.every((v, c) => Math.abs(v - backdrop[c]!) < 40));
  const whole = { x: 0, y: 0, w: 1, h: 1 };
  if (!plain) return whole;
  const differs = (x: number, y: number) => at(x, y).some((v, c) => Math.abs(v - backdrop[c]!) > 48);
  let left = width,
    right = -1,
    top = height,
    bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (differs(x, y)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
  if (right < left || bottom < top) return whole;
  const w = (right - left + 1) / width,
    h = (bottom - top + 1) / height;
  // a sliver is not a box: keep the whole picture
  return w < 0.2 || h < 0.2 ? whole : { x: left / width, y: top / height, w, h };
}

const canvasOf = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot make pictures here.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
};

/** The box art for a photo of a box, as a JPEG data address ready to send. */
export async function boxArtFrom(photo: Blob): Promise<{ type: string; dataUrl: string }> {
  let source: ImageBitmap;
  try {
    source = await createImageBitmap(photo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This photo could not be opened to make box art from it.");
  }
  try {
    // find the box in the photo
    const look = canvasOf(LOOK, LOOK);
    look.ctx.drawImage(source, 0, 0, LOOK, LOOK);
    const box = contentBox(look.ctx.getImageData(0, 0, LOOK, LOOK).data, LOOK, LOOK);
    // its artwork: the middle of the box, without the edges, flaps and labels round it, as a square
    const inset = 0.1;
    const bx = (box.x + box.w * inset) * source.width,
      by = (box.y + box.h * inset) * source.height,
      bw = box.w * (1 - 2 * inset) * source.width,
      bh = box.h * (1 - 2 * inset) * source.height;
    const side = Math.min(bw, bh);
    const sx = bx + (bw - side) / 2,
      sy = by + (bh - side) / 2;
    // softened by going down to a few pixels and back up in steps
    // (28 pixels left the printed figure standing behind the real one as a ghost; 12 leaves colour and light only)
    const small = canvasOf(SOFT, SOFT);
    small.ctx.drawImage(source, sx, sy, side, side, 0, 0, SOFT, SOFT);
    const mid = canvasOf(140, 140);
    mid.ctx.drawImage(small.canvas, 0, 0, 140, 140);
    const out = canvasOf(SIDE, SIDE);
    out.ctx.drawImage(mid.canvas, 0, 0, SIDE, SIDE);
    // a touch lighter overall, and a shade at the foot for the product to stand on
    out.ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    out.ctx.fillRect(0, 0, SIDE, SIDE);
    const shade = out.ctx.createLinearGradient(0, SIDE * 0.55, 0, SIDE);
    shade.addColorStop(0, "rgba(0, 0, 0, 0)");
    shade.addColorStop(1, "rgba(0, 0, 0, 0.22)");
    out.ctx.fillStyle = shade;
    out.ctx.fillRect(0, 0, SIDE, SIDE);
    return { type: "image/jpeg", dataUrl: out.canvas.toDataURL("image/jpeg", 0.86) };
  } finally {
    source.close();
  }
}

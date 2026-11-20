import { code128Widths } from "./code128";

// Sticker sheets for a Cricut "Print Then Cut": each sheet is one PNG the size of Cricut's largest print-then-cut area
// (6.75 × 9.25 in) at 300 dpi. The labels are white and the space between them is transparent, so Design Space draws a
// cut line around each label by itself.

export const DPI = 300;
export const SHEET = { width: 6.75, height: 9.25 }; // inches
const GAP = 0.1; // inches between labels (and nothing at the sheet edge: Cricut adds its own margins)

export type LabelSize = "small" | "large" | "tag";
export const SIZES: Record<LabelSize, { width: number; height: number; name: string }> = {
  small: { width: 2.1, height: 1.2, name: "Small, 2.1 × 1.2 in" },
  large: { width: 3, height: 1.6, name: "Large, 3 × 1.6 in" },
  // a price tag for the Brother QL-810 (300 dpi, black): DK-22205 62 mm continuous tape cut every 29 mm, or DK-1209 pre-cut labels
  tag: { width: 62 / 25.4, height: 29 / 25.4, name: "Price tag, Brother QL-810 (62 × 29 mm)" },
};

export interface StickerLabel {
  name: string;
  series: string | null;
  /** Printed under the barcode (or alone when there is no barcode). */
  code: string | null;
  /** What the bars encode; null for no barcode. */
  barcode: string | null;
  /** Price tags: the price as printed ("$50", "$49.99"). */
  price?: string | null;
  /** Price tags: a social handle under the barcode ("@spinhobby"), when the admin typed one. */
  handle?: string | null;
}

/** Labels that fit on one sheet in this size. */
export function perSheet(size: LabelSize) {
  if (size === "tag") return 1;
  const { cols, rows } = grid(size);
  return cols * rows;
}

function grid(size: LabelSize) {
  const s = SIZES[size];
  return {
    cols: Math.floor((SHEET.width + GAP) / (s.width + GAP)),
    rows: Math.floor((SHEET.height + GAP) / (s.height + GAP)),
  };
}

const MASCOT_URL = "/assets/transparent%20mascot%20chibi%20rotated.png";
// Head and shoulders of the chibi mascot (the full drawing has stray strokes near the hem).
const MASCOT_CROP = { x: 50, y: 0, w: 675, h: 675 }; // in the picture's own pixels (776 × 918)

let mascot: Promise<HTMLImageElement> | null = null;
function loadMascot() {
  mascot ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      mascot = null;
      reject(new Error("Couldn't load the mascot picture"));
    };
    img.src = MASCOT_URL;
  });
  return mascot;
}

const UI_FONT = `"Plus Jakarta Sans", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
const NAVY = "#1d2a53";
const MUTED = "#6b6f80";

/** Draws sheets of labels; returns one canvas per sheet. */
export async function renderSheets(labels: StickerLabel[], size: LabelSize): Promise<HTMLCanvasElement[]> {
  const [art] = await Promise.all([
    loadMascot(),
    document.fonts?.load(`700 30px ${UI_FONT}`).catch(() => undefined),
    document.fonts?.load(`500 20px ${UI_FONT}`).catch(() => undefined),
  ]);
  const tag = size === "tag";
  const { cols, rows } = tag ? { cols: 1, rows: 1 } : grid(size);
  const each = cols * rows;
  const w = Math.round(SIZES[size].width * DPI);
  const h = Math.round(SIZES[size].height * DPI);
  const gap = Math.round(GAP * DPI);
  const sheets: HTMLCanvasElement[] = [];
  for (let start = 0; start < labels.length; start += each) {
    const canvas = document.createElement("canvas");
    canvas.width = tag ? w : Math.round(SHEET.width * DPI);
    canvas.height = tag ? h : Math.round(SHEET.height * DPI);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser can't draw the labels");
    labels.slice(start, start + each).forEach((label, i) => {
      const x = (i % cols) * (w + gap);
      const y = Math.floor(i / cols) * (h + gap);
      if (tag) drawPriceTag(ctx, label, x, y, w, h, art);
      else drawLabel(ctx, label, x, y, w, h, art);
    });
    sheets.push(canvas);
  }
  return sheets;
}

function drawLabel(ctx: CanvasRenderingContext2D, label: StickerLabel, x: number, y: number, w: number, h: number, art: HTMLImageElement) {
  const s = h / 360; // the layout is drawn for a 1.2 in tall label and scaled
  const pad = Math.round(18 * s);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.round(24 * s));
  ctx.fill();
  ctx.clip();

  // Mascot, top left
  const art_h = Math.round(180 * s);
  ctx.drawImage(art, MASCOT_CROP.x, MASCOT_CROP.y, MASCOT_CROP.w, MASCOT_CROP.h, x + pad, y + pad, art_h, art_h);

  // Name (two lines at most), then the series when there is room, then where to find it online
  const tx = x + pad + art_h + Math.round(12 * s);
  const tw = x + w - pad - tx;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#171a2b";
  const nameSize = Math.round(29 * s);
  ctx.font = `700 ${nameSize}px ${UI_FONT}`;
  const lines = wrap(ctx, label.name, tw, 2);
  let ty = y + pad;
  for (const line of lines) {
    ctx.fillText(line, tx, ty, tw);
    ty += Math.round(nameSize * 1.18);
  }
  if (lines.length < 2 && label.series) {
    ctx.font = `500 ${Math.round(22 * s)}px ${UI_FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(wrap(ctx, label.series, tw, 1)[0] ?? "", tx, ty + Math.round(2 * s), tw);
  }
  ctx.fillStyle = MUTED;
  ctx.font = `500 ${Math.round(21 * s)}px ${UI_FONT}`;
  const siteY = y + pad + art_h - Math.round(32 * s);
  ctx.fillText("Available on", tx, siteY - Math.round(25 * s), tw);
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${Math.round(31 * s)}px ${UI_FONT}`;
  ctx.fillText("spinhobby.com", tx, siteY, tw);

  // Barcode across the bottom, with the code printed under it
  const widths = label.barcode ? code128Widths(label.barcode) : null;
  const barTop = y + pad + art_h + Math.round(8 * s);
  const codeSize = Math.round(25 * s);
  const barH = y + h - pad - codeSize - Math.round(4 * s) - barTop;
  const unit = widths ? barUnit(widths, w - 2 * pad) : 0;
  if (widths && unit) {
    const modules = widths.reduce((a, b) => a + b, 0) + 20;
    let bx = x + Math.round((w - (modules - 20) * unit) / 2);
    ctx.fillStyle = "#000000";
    widths.forEach((n, i) => {
      if (i % 2 === 0) ctx.fillRect(bx, barTop, n * unit, barH);
      bx += n * unit;
    });
  }
  if (label.code) {
    ctx.fillStyle = "#171a2b";
    ctx.font = `700 ${codeSize}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.fillText(label.code, x + w / 2, y + h - pad - codeSize, w - 2 * pad);
    ctx.textAlign = "start";
  }
  ctx.restore();
}

/** Where a price tag's two columns are, in pixels from its left edge: the price on the left, what to scan on the right. */
function tagColumns(w: number, h: number) {
  const pad = Math.round(h * 0.05);
  const leftW = Math.round(w * 0.43);
  return { pad, left: { x: pad, w: leftW - pad }, right: { x: leftW + pad, w: w - leftW - 2 * pad } };
}

/**
 * A price tag for the Brother QL-810 (black on white, 62 × 29 mm): the price as big as it fits, the mascot and spinhobby.com under it;
 * the product's name, the barcode of its SKU (the cashier's Square app scans it to ring the item up) and the code itself, and a social
 * handle when one is given. About a third of the old sticker, which carried two QR codes for Instagram and Facebook.
 */
function drawPriceTag(
  ctx: CanvasRenderingContext2D,
  label: StickerLabel,
  x: number,
  y: number,
  w: number,
  h: number,
  art: HTMLImageElement,
) {
  const { pad, left, right } = tagColumns(w, h);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  // the price: as large as fits the left column and the top 58% of the tag
  const price = label.price ?? "";
  let size = Math.round(h * 0.58);
  ctx.font = `800 ${size}px ${UI_FONT}`;
  while (size > 20 && ctx.measureText(price).width > left.w) {
    size -= 4;
    ctx.font = `800 ${size}px ${UI_FONT}`;
  }
  ctx.fillText(price, x + left.x, y + pad - Math.round(size * 0.08), left.w);

  // the mascot and the website along the bottom of the left column
  const artSize = Math.round(h * 0.34);
  const artY = y + h - pad - artSize;
  ctx.drawImage(art, MASCOT_CROP.x, MASCOT_CROP.y, MASCOT_CROP.w, MASCOT_CROP.h, x + left.x, artY, artSize, artSize);
  const siteX = x + left.x + artSize + Math.round(pad * 0.6);
  ctx.font = `800 ${Math.round(h * 0.085)}px ${UI_FONT}`;
  ctx.fillText("spinhobby.com", siteX, artY + artSize * 0.5 - h * 0.045, x + left.x + left.w - siteX);

  // a thin line between the columns
  ctx.fillRect(x + right.x - Math.round(pad * 0.6), y + pad, Math.max(1, Math.round(h / 300)), h - 2 * pad);

  // right column: the name, the barcode and its code, the handle
  const nameSize = Math.round(h * 0.075);
  ctx.font = `700 ${nameSize}px ${UI_FONT}`;
  const names = wrap(ctx, label.name, right.w, 2);
  let ty = y + pad;
  for (const line of names) {
    ctx.fillText(line, x + right.x, ty, right.w);
    ty += Math.round(nameSize * 1.15);
  }
  const codeSize = Math.round(h * 0.07);
  const handleSize = label.handle ? Math.round(h * 0.065) : 0;
  const barTop = ty + Math.round(pad * 0.4);
  const barBottom = y + h - pad - codeSize - (handleSize ? handleSize + Math.round(pad * 0.4) : 0) - Math.round(pad * 0.3);
  const widths = label.barcode ? code128Widths(label.barcode) : null;
  const unit = widths ? barUnit(widths, right.w) : 0;
  if (widths && unit && barBottom - barTop > h * 0.15) {
    const modules = widths.reduce((a, b) => a + b, 0);
    let bx = x + right.x + Math.round((right.w - modules * unit) / 2);
    widths.forEach((n, i) => {
      if (i % 2 === 0) ctx.fillRect(bx, barTop, n * unit, barBottom - barTop);
      bx += n * unit;
    });
  }
  ctx.textAlign = "center";
  if (label.code) {
    ctx.font = `700 ${codeSize}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
    ctx.fillText(label.code, x + right.x + right.w / 2, barBottom + Math.round(pad * 0.3), right.w);
  }
  if (label.handle) {
    ctx.font = `600 ${handleSize}px ${UI_FONT}`;
    ctx.fillText(label.handle, x + right.x + right.w / 2, y + h - pad - handleSize, right.w);
  }
  ctx.restore();
}

/** Thinnest bar width in pixels so the barcode (with 10 modules of quiet space each side) fits; 0 when the bars would be too thin to scan. */
function barUnit(widths: number[], room: number) {
  const unit = Math.min(4, Math.floor(room / (widths.reduce((a, b) => a + b, 0) + 20)));
  return unit >= MIN_BAR ? unit : 0;
}

/** Thinnest bar a cheap scanner reads reliably from an inkjet sticker: 2 px at 300 dpi (0.17 mm). */
const MIN_BAR = 2;

/** Whether this code fits as a scannable barcode on a label of this size (otherwise only the text is printed). */
export function barcodeFits(code: string, size: LabelSize) {
  const widths = code128Widths(code);
  const w = Math.round(SIZES[size].width * DPI);
  const pad = Math.round(18 * ((SIZES[size].height * DPI) / 360));
  const room = size === "tag" ? tagColumns(w, Math.round(SIZES.tag.height * DPI)).right.w : w - 2 * pad;
  return !!widths && barUnit(widths, room) > 0;
}

/** Splits text into at most `max` lines that fit `width`; the last line ends in "…" when text is left over. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  let i = 0;
  for (; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    lines.push(line);
    line = words[i];
    if (lines.length === max) break;
  }
  if (lines.length < max && line) {
    lines.push(line);
    i = words.length;
  }
  const leftOver = i < words.length;
  const last = lines.length - 1;
  if (last >= 0 && (leftOver || ctx.measureText(lines[last]).width > width)) {
    let cut = lines[last];
    while (cut && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1);
    lines[last] = `${cut.trimEnd()}…`;
  }
  return lines;
}

/** The sheet as a PNG that says it is 300 dpi, so apps that read it open it at the right size. */
export async function sheetPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't make the picture");
  const png = new Uint8Array(await blob.arrayBuffer());
  return new Blob([withDpi(png, DPI)], { type: "image/png" });
}

/** Inserts a pHYs chunk (pixels per metre) right after the PNG header chunk. */
export function withDpi(png: Uint8Array, dpi: number): Uint8Array<ArrayBuffer> {
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const ihdrEnd = 8 + 25; // signature + IHDR (length, type, 13 bytes of data, CRC)
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, ihdrEnd));
  out.set(chunk, ihdrEnd);
  out.set(png.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return out;
}

let table: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

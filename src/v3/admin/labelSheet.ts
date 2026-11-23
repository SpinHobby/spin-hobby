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
  // a price tag for the Brother QL-810 (300 dpi, black): DK-2205 62 mm continuous tape; the printer adds its 3 mm unprintable margin at each end
  tag: { width: 62 / 25.4, height: 20 / 25.4, name: "Price tag, Brother QL-810 (62 × 20 mm)" },
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
  /** Price tags: the price in red (sale items, on black-and-red tape); black otherwise. */
  redPrice?: boolean;
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

/** The mascot as line art (a friend's drawing, the old sticker's): head and ears, black lines on transparent, for the label printer. */
const LINE_MASCOT_URL = "/assets/mascot/line-head.png";
let lineMascot: Promise<HTMLImageElement> | null = null;
function loadLineMascot(): Promise<HTMLImageElement> {
  lineMascot ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      lineMascot = null;
      reject(new Error("Couldn't load the mascot drawing"));
    };
    img.src = LINE_MASCOT_URL;
  });
  return lineMascot;
}

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
/** The label printer's red: pure red, which the Brother driver prints in its red on two-colour tape. */
const TAG_RED = "#ff0000";
const MUTED = "#6b6f80";

/** Draws sheets of labels; returns one canvas per sheet. */
export async function renderSheets(labels: StickerLabel[], size: LabelSize): Promise<HTMLCanvasElement[]> {
  const [art] = await Promise.all([
    size === "tag" ? loadLineMascot() : loadMascot(),
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

/**
 * A tag is laid out as if 5% taller at the top and bottom, then that much is cut off: the label printer already leaves 3 mm blank at
 * each end of the tape, so the tag's own top and bottom padding would only make the cut tag longer.
 */
function tagTrim(h: number) {
  return Math.round(h * 0.05);
}

/** Where a price tag's two columns are, in pixels from its left edge: the price on the left, what to scan on the right (h: the layout height). */
function tagColumns(w: number, h: number) {
  const pad = Math.round(h * 0.055);
  const leftW = Math.round(w * 0.3);
  const gap = Math.round(pad * 0.7);
  return { pad, left: { x: pad, w: leftW - pad }, right: { x: leftW + gap, w: w - leftW - gap - pad } };
}

/**
 * A price tag for the Brother QL-810 (62 × 20 mm): on the left the mascot's line drawing from the ears down to the chest, filling the column,
 * the price over the empty corner beside her ears and spinhobby.com across her chest (both white-edged so they read over the lines); on the
 * right the product's name, the barcode of its SKU (the cashier's Square app scans it), the code, and the social handle with Instagram and
 * Facebook marks when one is given.
 */
function drawPriceTag(
  ctx: CanvasRenderingContext2D,
  label: StickerLabel,
  x: number,
  tagY: number,
  w: number,
  tagH: number,
  art: HTMLImageElement,
) {
  // laid out on a taller tag, its top and bottom padding cut off (see tagTrim)
  const trim = tagTrim(tagH);
  const y = tagY - trim;
  const h = tagH + 2 * trim;
  const { pad, left, right } = tagColumns(w, h);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, tagY, w, tagH);
  ctx.beginPath();
  ctx.rect(x, tagY, w, tagH);
  ctx.clip();
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";

  // the mascot first, bottom-aligned and as big as the column allows: her chin sits about 72% down the drawing, so at this size the whole
  // face stays above the website line across her chest
  const artSize = Math.min(left.w, Math.round(h * 0.8));
  const artX = x + left.x + Math.round((left.w - artSize) / 2);
  const artY = y + h - artSize;
  ctx.drawImage(art, artX, artY, artSize, artSize);

  // the price over the top of the column, white-edged where it crosses her ears
  const price = label.price ?? "";
  let size = Math.round(h * 0.42);
  ctx.font = `800 ${size}px ${UI_FONT}`;
  while (size > 20 && ctx.measureText(price).width > left.w) {
    size -= 4;
    ctx.font = `800 ${size}px ${UI_FONT}`;
  }
  const priceY = y + pad - Math.round(size * 0.06);
  ctx.lineWidth = Math.round(size * 0.14);
  ctx.strokeStyle = "#ffffff";
  ctx.strokeText(price, x + left.x, priceY, left.w);
  // black, or red for a sale (the QL-810 prints black and red on DK-2251 tape: pure red becomes its red)
  ctx.fillStyle = label.redPrice ? TAG_RED : "#000000";
  ctx.fillText(price, x + left.x, priceY, left.w);

  // the website across her chest
  const siteSize = Math.round(h * 0.11);
  ctx.font = `800 ${siteSize}px ${UI_FONT}`;
  ctx.textAlign = "center";
  const siteY = y + h - pad - siteSize;
  ctx.lineWidth = Math.round(siteSize * 0.45);
  ctx.strokeText("spinhobby.com", x + left.x + left.w / 2, siteY, left.w);
  ctx.fillStyle = "#000000";
  ctx.fillText("spinhobby.com", x + left.x + left.w / 2, siteY, left.w);
  ctx.textAlign = "start";

  // right column: the name, the barcode and its code, the handle
  const nameSize = Math.round(h * 0.1);
  ctx.font = `700 ${nameSize}px ${UI_FONT}`;
  const names = wrap(ctx, label.name, right.w, 2);
  let ty = y + pad;
  // centred over the barcode
  ctx.textAlign = "center";
  for (const line of names) {
    ctx.fillText(line, x + right.x + right.w / 2, ty, right.w);
    ty += Math.round(nameSize * 1.15);
  }
  ctx.textAlign = "start";
  const codeSize = Math.round(h * 0.09);
  const handleSize = label.handle ? Math.round(h * 0.09) : 0;
  const barTop = ty + Math.round(pad * 0.4);
  const barBottom = y + h - pad - codeSize - (handleSize ? handleSize + Math.round(pad * 0.5) : 0) - Math.round(pad * 0.3);
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
  ctx.textAlign = "start";
  if (label.handle) {
    // the Instagram and Facebook marks, then the handle, centred as one line
    ctx.font = `600 ${handleSize}px ${UI_FONT}`;
    const icon = Math.round(handleSize * 1.1);
    const gap = Math.round(handleSize * 0.35);
    const textW = Math.min(ctx.measureText(label.handle).width, right.w - 2 * (icon + gap));
    const lineW = icon + gap + icon + gap + textW;
    let lx = x + right.x + Math.round((right.w - lineW) / 2);
    const ly = y + h - pad - icon;
    drawInstagramMark(ctx, lx, ly, icon);
    lx += icon + gap;
    drawFacebookMark(ctx, lx, ly, icon);
    lx += icon + gap;
    ctx.fillStyle = "#000000";
    ctx.fillText(label.handle, lx, ly + Math.round((icon - handleSize) / 2), textW);
  }
  ctx.restore();
}

/** Instagram's mark in black: a rounded square outline, a ring and a dot. */
function drawInstagramMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.lineWidth = Math.max(1, s * 0.11);
  const inset = ctx.lineWidth / 2;
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, s - 2 * inset, s - 2 * inset, s * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, s * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + s * 0.74, y + s * 0.26, s * 0.065, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Facebook's mark in black: a filled circle with a white "f". */
function drawFacebookMark(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.arc(x + s / 2, y + s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(s * 0.82)}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("f", x + s * 0.55, y + s * 0.92);
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
  const tagH = Math.round(SIZES.tag.height * DPI);
  const room = size === "tag" ? tagColumns(w, tagH + 2 * tagTrim(tagH)).right.w : w - 2 * pad;
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

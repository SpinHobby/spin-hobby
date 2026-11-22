/**
 * Price tags as a P-touch Editor file (.lbx), so a batch prints in one go from P-touch Editor: open the file, File > Print, "All Sheets".
 *
 * An .lbx is a zip of label.xml (the layout), prop.xml (its properties) and the pictures it uses. Each tag is one layout sheet holding the
 * tag's picture (as drawn for the browser), on 62 mm continuous tape (DK-2205) for the Brother QL-810W. P-touch Editor keeps at most 16
 * sheets in a file, so a bigger batch is split over several files.
 *
 * The layout follows a file P-touch Editor 5.4 saved for the shop's QL-810W (printer id 14644; media 259 is 62 mm continuous tape, as in
 * P-touch Editor's own QL templates). The printer can't print the 3 mm at each end of a label or the edges of the tape, so each label is
 * a little longer than the tag (cut at about 33.5 mm) and the tag is drawn at 95% to fit the printable width.
 */

/** P-touch Editor's limit on layout sheets in one file. */
export const SHEETS_PER_FILE = 16;

const pt = (n: number) => `${Math.round(n * 10) / 10}pt`;

/** 62 mm tape, and what the QL-810W leaves unprinted (as P-touch Editor sets it for 62 mm tape). */
const TAPE = 175.7;
const MARGIN = { left: 4.3, right: 4.4, top: 8.4, bottom: 8.4 };

/** Where a tag of this many pixels goes on its label, in points: as wide as the printable width allows. */
export function tagPlacement(widthPx: number, heightPx: number) {
  const width = TAPE - MARGIN.left - MARGIN.right;
  const height = (width * heightPx) / widthPx;
  return { x: MARGIN.left, y: MARGIN.top, width, height, length: height + MARGIN.top + MARGIN.bottom };
}

const XMLNS =
  'xmlns:pt="http://schemas.brother.info/ptouch/2007/lbx/main" xmlns:style="http://schemas.brother.info/ptouch/2007/lbx/style" ' +
  'xmlns:text="http://schemas.brother.info/ptouch/2007/lbx/text" xmlns:draw="http://schemas.brother.info/ptouch/2007/lbx/draw" ' +
  'xmlns:image="http://schemas.brother.info/ptouch/2007/lbx/image" xmlns:barcode="http://schemas.brother.info/ptouch/2007/lbx/barcode" ' +
  'xmlns:database="http://schemas.brother.info/ptouch/2007/lbx/database" xmlns:table="http://schemas.brother.info/ptouch/2007/lbx/table" ' +
  'xmlns:cable="http://schemas.brother.info/ptouch/2007/lbx/cable"';

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** label.xml for tags of this many pixels at this resolution, one sheet each, the n-th using picture Object{n}.bmp. */
export function labelXml(count: number, widthPx: number, heightPx: number, dpi: number, names: string[] = []): string {
  const p = tagPlacement(widthPx, heightPx);
  const orgW = (widthPx / dpi) * 72;
  const orgH = (heightPx / dpi) * 72;
  const sheet = (i: number) =>
    `<style:sheet name="Sheet ${i + 1}">` +
    `<style:paper media="0" width="${pt(TAPE)}" height="${pt(p.length)}" marginLeft="${pt(MARGIN.left)}" marginTop="${pt(MARGIN.top)}" ` +
    `marginRight="${pt(MARGIN.right)}" marginBottom="${pt(MARGIN.bottom)}" orientation="portrait" autoLength="false" monochromeDisplay="true" ` +
    `printColorDisplay="false" printColorsID="0" paperColor="#FFFFFF" paperInk="#000000" split="1" format="259" backgroundTheme="0" ` +
    `printerID="14644" printerName="Brother QL-810W"/>` +
    `<style:cutLine regularCut="0pt" freeCut=""/>` +
    `<style:backGround x="${pt(p.x)}" y="${pt(p.y)}" width="${pt(p.width)}" height="${pt(p.length - MARGIN.top - MARGIN.bottom)}" ` +
    `brushStyle="NULL" brushId="0" userPattern="NONE" userPatternId="0" color="#000000" printColorNumber="1" backColor="#FFFFFF" backPrintColorNumber="0"/>` +
    `<pt:objects><image:image>` +
    `<pt:objectStyle x="${pt(p.x)}" y="${pt(p.y)}" width="${pt(p.width)}" height="${pt(p.height)}" backColor="#FFFFFF" backPrintColorNumber="0" ` +
    `ropMode="COPYPEN" angle="0" anchor="TOPLEFT" flip="NONE"><pt:pen style="NULL" widthX="0.5pt" widthY="0.5pt" color="#000000" printColorNumber="1"/>` +
    `<pt:brush style="NULL" color="#000000" printColorNumber="1" id="0"/>` +
    `<pt:expanded objectName="Tag${i + 1}" ID="0" lock="0" templateMergeTarget="LABELLIST" templateMergeType="NONE" templateMergeID="0" linkStatus="NONE" linkID="0"/>` +
    `</pt:objectStyle>` +
    `<image:imageStyle originalName="${escape(names[i] ?? `tag-${i + 1}.png`)}" alignInText="LEFT" firstMerge="true" fileName="Object${i}.bmp">` +
    `<image:transparent flag="false" color="#FFFFFF"/>` +
    `<image:trimming flag="false" shape="RECTANGLE" trimOrgX="0pt" trimOrgY="0pt" trimOrgWidth="${pt(orgW)}" trimOrgHeight="${pt(orgH)}"/>` +
    `<image:orgPos x="${pt(p.x)}" y="${pt(p.y)}" width="${pt(p.width)}" height="${pt(p.height)}"/>` +
    `<image:effect effect="NONE" brightness="50" contrast="50" photoIndex="4"/>` +
    `<image:mono operationKind="BINARY" reverse="0" ditherKind="MESH" threshold="128" gamma="100" ditherEdge="0" rgbconvProportionRed="30" ` +
    `rgbconvProportionGreen="59" rgbconvProportionBlue="11" rgbconvProportionReversed="0"/>` +
    `</image:imageStyle></image:image></pt:objects></style:sheet>`;
  return (
    `<?xml version="1.0" encoding="UTF-8"?><pt:document ${XMLNS} version="1.7" generator="P-touch Editor 5.4.015 Windows">` +
    `<pt:body currentSheet="Sheet 1" direction="LTR">${Array.from({ length: count }, (_, i) => sheet(i)).join("")}</pt:body></pt:document>`
  );
}

export function propXml(title: string, now = new Date()): string {
  const at = now.toISOString().replace(/\.\d+Z$/, "Z");
  return (
    `<?xml version="1.0" encoding="UTF-8"?><meta:properties xmlns:meta="http://schemas.brother.info/ptouch/2007/lbx/meta" ` +
    `xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><meta:appName>P-touch Editor</meta:appName>` +
    `<dc:title>${escape(title)}</dc:title><dc:subject></dc:subject><dc:creator>Spin Hobby</dc:creator><meta:keyword></meta:keyword>` +
    `<dc:description></dc:description><meta:template></meta:template><dcterms:created>${at}</dcterms:created><dcterms:modified>${at}</dcterms:modified>` +
    `<meta:lastPrinted></meta:lastPrinted><meta:modifiedBy>Spin Hobby</meta:modifiedBy><meta:revision>1</meta:revision><meta:editTime>0</meta:editTime>` +
    `<meta:numPages>1</meta:numPages><meta:numWords>0</meta:numWords><meta:numChars>0</meta:numChars><meta:security>0</meta:security>` +
    `<meta:transferScript></meta:transferScript></meta:properties>`
  );
}

/** A 24-bit Windows bitmap of RGBA pixels (as P-touch Editor stores pictures), transparent parts made white. */
export function bmp24(rgba: Uint8ClampedArray, width: number, height: number, dpi: number): Uint8Array {
  const row = Math.ceil((width * 3) / 4) * 4;
  const size = 54 + row * height;
  const out = new Uint8Array(size);
  const v = new DataView(out.buffer);
  out[0] = 0x42;
  out[1] = 0x4d;
  v.setUint32(2, size, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true); // positive: rows from the bottom up
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, row * height, true);
  const ppm = Math.round(dpi / 0.0254);
  v.setInt32(38, ppm, true);
  v.setInt32(42, ppm, true);
  for (let y = 0; y < height; y++) {
    const o = 54 + (height - 1 - y) * row;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = rgba[i + 3] / 255;
      const mix = (c: number) => Math.round(c * a + 255 * (1 - a));
      out[o + x * 3] = mix(rgba[i + 2]);
      out[o + x * 3 + 1] = mix(rgba[i + 1]);
      out[o + x * 3 + 2] = mix(rgba[i]);
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Raw deflate where the browser has it (most of a tag is white, so it shrinks a lot); null to store the file as it is. */
async function deflateRaw(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

/** A zip of these files (deflated where the browser can, stored otherwise). */
export async function zip(files: { name: string; data: Uint8Array }[], deflate = deflateRaw): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const packed = await deflate(f.data);
    const body = packed && packed.length < f.data.length ? packed : f.data;
    const method = body === f.data ? 0 : 8;
    const crc = crc32(f.data);
    const head = new Uint8Array(30 + name.length);
    const h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(8, method, true);
    h.setUint16(12, 0x21, true); // 1980-01-01
    h.setUint32(14, crc, true);
    h.setUint32(18, body.length, true);
    h.setUint32(22, f.data.length, true);
    h.setUint16(26, name.length, true);
    head.set(name, 30);
    const dir = new Uint8Array(46 + name.length);
    const d = new DataView(dir.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(10, method, true);
    d.setUint16(14, 0x21, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, body.length, true);
    d.setUint32(24, f.data.length, true);
    d.setUint16(28, name.length, true);
    d.setUint32(42, offset, true);
    dir.set(name, 46);
    local.push(head, body);
    central.push(dir);
    offset += head.length + body.length;
  }
  const dirSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, dirSize, true);
  e.setUint32(16, offset, true);
  const out = new Uint8Array(offset + dirSize + 22);
  let at = 0;
  for (const part of [...local, ...central, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

/** One tag's pixels, from its picture's URL. */
async function pixels(url: string): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw the tags");
  ctx.drawImage(img, 0, 0);
  return { data: ctx.getImageData(0, 0, c.width, c.height).data, width: c.width, height: c.height };
}

/**
 * The tags (picture URLs, as drawn at `dpi`) as P-touch Editor files, at most 16 tags each; `names` are what P-touch Editor shows for
 * each picture.
 */
export async function ptouchFiles(urls: string[], dpi: number, names: string[] = []): Promise<Blob[]> {
  const files: Blob[] = [];
  for (let start = 0; start < urls.length; start += SHEETS_PER_FILE) {
    const chunk = urls.slice(start, start + SHEETS_PER_FILE);
    const pics = await Promise.all(chunk.map(pixels));
    const { width, height } = pics[0];
    const enc = new TextEncoder();
    const bytes = await zip([
      { name: "label.xml", data: enc.encode(labelXml(chunk.length, width, height, dpi, names.slice(start, start + SHEETS_PER_FILE))) },
      ...pics.map((p, i) => ({ name: `Object${i}.bmp`, data: bmp24(p.data, p.width, p.height, dpi) })),
      { name: "prop.xml", data: enc.encode(propXml("Spin Hobby price tags")) },
    ]);
    files.push(new Blob([bytes as BlobPart], { type: "application/octet-stream" }));
  }
  return files;
}

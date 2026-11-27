/**
 * Shop backgrounds made from Poly Haven's free library (CC0, free for commercial use, no key): its 360-degree indoor photos and its wall and
 * wood textures are listed live from api.polyhaven.com, so new ones appear without us keeping a copy. A photo is turned into a background
 * here in the browser, the same way scripts/backgrounds/make_backgrounds.py made the ready-made ones: a view cut out of the 360-degree room
 * (or a blurred wall), a real table in perspective in front, a soft contact shadow, gentle light and a little film grain.
 * Poly Haven asks for a "Powered by Poly Haven" credit wherever its API is used live; the admin shows it next to the browser.
 */

const API = "https://api.polyhaven.com";

export interface HavenAsset {
  id: string;
  name: string;
  thumb: string;
  categories: string[];
  downloads: number;
}

interface RawAsset {
  name: string;
  categories: string[];
  download_count: number;
  thumbnail_url?: string;
}

const lists = new Map<string, Promise<HavenAsset[]>>();

async function list(query: string): Promise<HavenAsset[]> {
  const room = query.includes("t=hdris");
  const res = await fetch(`${API}/assets?${query}`);
  if (!res.ok) throw new Error("Poly Haven did not answer. Try again in a minute.");
  const raw = (await res.json()) as Record<string, RawAsset>;
  return Object.entries(raw)
    .map(([id, a]) => ({
      id,
      name: a.name,
      // a room's own thumbnail is shiny test balls; its main picture shows the room itself
      thumb: room
        ? `https://cdn.polyhaven.com/asset_img/primary/${id}.png?height=256&format=webp`
        : (a.thumbnail_url ?? `https://cdn.polyhaven.com/asset_img/thumbs/${id}.png?width=256&height=256&format=webp`),
      categories: a.categories ?? [],
      downloads: a.download_count ?? 0,
    }))
    .sort((a, b) => b.downloads - a.downloads);
}

const cached = (query: string) => {
  let p = lists.get(query);
  if (!p) {
    p = list(query);
    p.catch(() => lists.delete(query));
    lists.set(query, p);
  }
  return p;
};

/** Indoor 360-degree photos (cafés, living rooms, studios, Christmas sets), most downloaded first. */
export const listRooms = () => cached("t=hdris&c=indoor");

const DIRTY = ["dirty", "rock", "terrain", "aerial", "roofing", "road", "asphalt", "moon"];
const SHABBY = /dirt|medieval|rust|damaged|moss|old|worn|broken|graffiti|castle|ruin/i;
const clean = (a: HavenAsset) => !SHABBY.test(a.name) && !a.categories.some((c) => DIRTY.includes(c) || c.startsWith("collection:"));

/** Wall textures (plaster, paint, brick, wood panels), without the dirty, outdoor-only ones. */
export const listWalls = async () => (await cached("t=textures&c=wall")).filter(clean);

/** Table tops: wood and fabric textures, without the dirty or raw outdoor ones. */
export const listTables = async () => {
  const [wood, fabric] = await Promise.all([cached("t=textures&c=wood"), cached("t=textures&c=fabric")]);
  const seen = new Set<string>();
  return [...wood, ...fabric].filter((a) => clean(a) && !seen.has(a.id) && seen.add(a.id) && !a.categories.includes("bark"));
};

/** The download link of a 360-degree room (the ready-to-view JPG, 8192 × 4096) or a texture's colour map (2K JPG). */
async function fileUrl(id: string, kind: "room" | "texture"): Promise<string> {
  const res = await fetch(`${API}/files/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Poly Haven did not answer. Try again in a minute.");
  const files = (await res.json()) as {
    tonemapped?: { url: string };
    Diffuse?: Record<string, { jpg?: { url: string } }>;
  };
  const url = kind === "room" ? files.tonemapped?.url : (files.Diffuse?.["2k"]?.jpg?.url ?? files.Diffuse?.["1k"]?.jpg?.url);
  if (!url) throw new Error("This one has no picture to use. Choose another.");
  return url;
}

// ---- pixels ----

/** RGBA pixels, like ImageData but usable without a canvas. */
export interface Px {
  w: number;
  h: number;
  d: Uint8ClampedArray<ArrayBuffer>;
}

const px = (w: number, h: number): Px => ({ w, h, d: new Uint8ClampedArray(w * h * 4) });

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Your browser could not draw the background.");
  return { c, ctx };
}

/** Draws any image at a size (smoothly scaled) and reads its pixels. */
function read(img: CanvasImageSource, w: number, h: number): Px {
  const { ctx } = canvas(w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return { w, h, d: ctx.getImageData(0, 0, w, h).data };
}

function toCanvas(p: Px) {
  const { c, ctx } = canvas(p.w, p.h);
  ctx.putImageData(new ImageData(p.d, p.w, p.h), 0, 0);
  return c;
}

const scaled = (p: Px, w: number, h: number) => read(toCanvas(p), w, h);

const images = new Map<string, Promise<Px>>();

/** A Poly Haven picture, loaded once per page: rooms are kept at 4096 × 2048 (they are blurred anyway), textures as they come. */
export function loadAsset(id: string, kind: "room" | "texture"): Promise<Px> {
  const key = `${kind}:${id}`;
  let p = images.get(key);
  if (!p) {
    p = (async () => {
      const res = await fetch(await fileUrl(id, kind));
      if (!res.ok) throw new Error("Could not download it from Poly Haven. Try again.");
      const bmp = await createImageBitmap(await res.blob());
      const w = kind === "room" ? Math.min(4096, bmp.width) : bmp.width;
      const h = Math.round((bmp.height * w) / bmp.width);
      const out = read(bmp, w, h);
      bmp.close();
      return out;
    })();
    p.catch(() => images.delete(key));
    images.set(key, p);
  }
  return p;
}

/** Saturation, contrast and brightness, like PIL's ImageEnhance (1 = unchanged). */
export function adjust(p: Px, sat: number, bright: number, contrast: number): Px {
  const out = px(p.w, p.h);
  const s = p.d;
  const o = out.d;
  let sum = 0;
  for (let i = 0; i < s.length; i += 4) sum += 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
  const mean = sum / (s.length / 4);
  for (let i = 0; i < s.length; i += 4) {
    const l = 0.299 * s[i] + 0.587 * s[i + 1] + 0.114 * s[i + 2];
    for (let c = 0; c < 3; c++) {
      let v = l + (s[i + c] - l) * sat;
      v = mean + (v - mean) * contrast;
      o[i + c] = v * bright;
    }
    o[i + 3] = 255;
  }
  return out;
}

/** A Gaussian-like blur (three box blurs), sigma in pixels. */
export function blur(p: Px, sigma: number): Px {
  if (sigma < 0.5) return p;
  // box widths that together approximate a Gaussian of this sigma
  const n = 3;
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  const radii = [0, 1, 2].map((i) => ((i < m ? wl : wl + 2) - 1) / 2);
  const a = Float32Array.from(p.d);
  const b = new Float32Array(a.length);
  for (const r of radii) {
    boxPass(a, b, p.w, p.h, r, true);
    boxPass(b, a, p.w, p.h, r, false);
  }
  const out = px(p.w, p.h);
  out.d.set(a);
  return out;
}

function boxPass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const step = horizontal ? 4 : w * 4;
  const scale = 1 / (2 * r + 1);
  for (let line = 0; line < lines; line++) {
    const start = horizontal ? line * w * 4 : line * 4;
    for (let c = 0; c < 4; c++) {
      const at = (k: number) => src[start + Math.min(len - 1, Math.max(0, k)) * step + c];
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += at(k);
      for (let k = 0; k < len; k++) {
        dst[start + k * step + c] = acc * scale;
        acc += at(k + r + 1) - at(k - r);
      }
    }
  }
}

/** Bilinear sample of a texture that repeats (u, v in pixels, wrapped). */
function sampleWrap(t: Px, u: number, v: number, o: Uint8ClampedArray, oi: number) {
  const x0 = Math.floor(u);
  const y0 = Math.floor(v);
  const fx = u - x0;
  const fy = v - y0;
  const xa = ((x0 % t.w) + t.w) % t.w;
  const ya = ((y0 % t.h) + t.h) % t.h;
  const xb = (xa + 1) % t.w;
  const yb = (ya + 1) % t.h;
  const d = t.d;
  const i00 = (ya * t.w + xa) * 4;
  const i10 = (ya * t.w + xb) * 4;
  const i01 = (yb * t.w + xa) * 4;
  const i11 = (yb * t.w + xb) * 4;
  for (let c = 0; c < 3; c++) {
    const top = d[i00 + c] + (d[i10 + c] - d[i00 + c]) * fx;
    const bot = d[i01 + c] + (d[i11 + c] - d[i01 + c]) * fx;
    o[oi + c] = top + (bot - top) * fy;
  }
  o[oi + 3] = 255;
}

/** A normal camera view out of a 360-degree photo: yaw turns left/right, a positive pitch looks down, fov is the view's width in degrees. */
export function roomView(pano: Px, yawDeg: number, pitchDeg: number, fovDeg: number, size: number): Px {
  const out = px(size, size);
  const f = size / 2 / Math.tan((fovDeg * Math.PI) / 360);
  const p = (pitchDeg * Math.PI) / 180;
  const y = (yawDeg * Math.PI) / 180;
  const cp = Math.cos(p);
  const sp = Math.sin(p);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const pw = pano.w;
  const ph = pano.h;
  for (let j = 0; j < size; j++) {
    const ry = -(j - size / 2);
    for (let i = 0; i < size; i++) {
      const rx = i - size / 2;
      // pitch (about x), then yaw (about y)
      const y1 = cp * ry - sp * f;
      const z1 = sp * ry + cp * f;
      const x2 = cy * rx + sy * z1;
      const z2 = -sy * rx + cy * z1;
      const n = Math.hypot(x2, y1, z2);
      const lon = Math.atan2(x2, z2);
      const lat = Math.asin(y1 / n);
      const u = (lon / (2 * Math.PI) + 0.5) * pw;
      const v = Math.min(ph - 1.001, Math.max(0, (0.5 - lat / Math.PI) * ph));
      sampleWrap(pano, u, v, out.d, (j * size + i) * 4);
    }
  }
  return out;
}

/** Solves the 3×3 perspective map that takes output corners `dst` to texture corners `src` (8 unknowns). */
function homography(dst: [number, number][], src: [number, number][]) {
  const m: number[][] = [];
  const b: number[] = [];
  dst.forEach(([x, y], k) => {
    const [u, v] = src[k];
    m.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    m.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  });
  // Gaussian elimination with partial pivoting
  for (let c = 0; c < 8; c++) {
    let best = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(m[r][c]) > Math.abs(m[best][c])) best = r;
    [m[c], m[best]] = [m[best], m[c]];
    [b[c], b[best]] = [b[best], b[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const k = m[r][c] / m[c][c];
      for (let cc = c; cc < 8; cc++) m[r][cc] -= k * m[c][cc];
      b[r] -= k * b[c];
    }
  }
  return b.map((v, i) => v / m[i][i]);
}

const turned = (t: Px): Px => {
  // a quarter turn, so the wood grain runs away from the camera
  const out = px(t.h, t.w);
  for (let y = 0; y < t.h; y++)
    for (let x = 0; x < t.w; x++) {
      const s = (y * t.w + x) * 4;
      const o = ((t.w - 1 - x) * t.h + y) * 4;
      out.d[o] = t.d[s];
      out.d[o + 1] = t.d[s + 1];
      out.d[o + 2] = t.d[s + 2];
      out.d[o + 3] = 255;
    }
  return out;
};

/** A table top seen from a little above: the near edge spans the picture, the far edge (at the wall) is narrower and softer. */
export function tablePlane(tex: Px, rotate: boolean, size: number, horizon: number): Px {
  const t = rotate ? turned(tex) : tex;
  const k = size / 2000;
  const bw = t.w * 3;
  const bh = t.h * 2;
  const h = homography(
    [
      [-700 * k, horizon],
      [size + 700 * k, horizon],
      [size + 250 * k, size],
      [-250 * k, size],
    ],
    [
      [0, 0],
      [bw, 0],
      [bw, bh],
      [0, bh],
    ],
  );
  const out = px(size, size);
  for (let y = horizon; y < size; y++)
    for (let x = 0; x < size; x++) {
      const w = h[6] * x + h[7] * y + 1;
      sampleWrap(t, (h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w, out.d, (y * size + x) * 4);
    }
  const soft = blur(out, 7 * k);
  const depth = size - horizon;
  for (let y = horizon; y < size; y++) {
    const keepSoft = (1 - Math.min(1, (y - horizon) / depth)) ** 1.6;
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) out.d[i + c] = soft.d[i + c] * keepSoft + out.d[i + c] * (1 - keepSoft);
    }
  }
  return out;
}

function underTable(back: Px, table: Px, horizon: number) {
  back.d.set(table.d.subarray(horizon * back.w * 4), horizon * back.w * 4);
}

/** A soft dark band on the wall just above the table, and on the table just in front of the wall. */
function contactShadow(p: Px, horizon: number, depth: number) {
  const k = p.w / 2000;
  for (let y = 0; y < p.h; y++) {
    const above = y <= horizon ? Math.exp(-(horizon - y) / (60 * k)) : 0;
    const below = y > horizon ? Math.exp(-(y - horizon) / (90 * k)) : 0;
    const shade = 1 - depth * (above + 0.7 * below);
    for (let i = y * p.w * 4, end = i + p.w * 4; i < end; i += 4) {
      p.d[i] *= shade;
      p.d[i + 1] *= shade;
      p.d[i + 2] *= shade;
    }
  }
}

/** Light falling off from the middle, and a slightly darker top. */
function light(p: Px, strength: number, topDark: number) {
  const n = p.w;
  for (let y = 0; y < p.h; y++) {
    const yy = y / n;
    const top = 1 - (topDark * Math.min(0.35, Math.max(0, 0.35 - yy))) / 0.35;
    for (let x = 0; x < n; x++) {
      const r = Math.hypot((x / n - 0.5) * 1.1, yy - 0.42);
      const gain = (1 + strength * (0.55 - r)) * top;
      const i = (y * n + x) * 4;
      p.d[i] *= gain;
      p.d[i + 1] *= gain;
      p.d[i + 2] *= gain;
    }
  }
}

/** A little film grain (the same noise on all three colours), so flat areas do not band. */
function grain(p: Px, amount: number) {
  let s = 7;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < p.d.length; i += 4) {
    const g = Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand()) * amount;
    p.d[i] += g;
    p.d[i + 1] += g;
    p.d[i + 2] += g;
  }
}

/** Where the table meets the wall: 59% down, so a padded product's base sits low on the table. */
const HORIZON = 0.59;

export interface RoomRecipe {
  kind: "room";
  room: Px;
  table: Px | null;
  yaw: number;
  pitch: number;
  blur: number;
  turnTable: boolean;
  brightness: number;
}

export interface SceneRecipe {
  kind: "scene";
  wall: Px;
  table: Px;
  blur: number;
  turnTable: boolean;
  brightness: number;
}

export interface StudioRecipe {
  kind: "studio";
  colour: [number, number, number];
}

export type Recipe = RoomRecipe | SceneRecipe | StudioRecipe;

/** Makes the background at `size` pixels square (a small one for the preview, 2000 to add to the library). */
export function compose(r: Recipe, size: number): Px {
  const k = size / 2000;
  const horizon = Math.round(size * HORIZON);
  if (r.kind === "studio") return studio(r.colour, size);
  const table = (t: Px) => tablePlane(adjust(t, 0.9, r.brightness, 0.9), r.turnTable, size, horizon);
  let img: Px;
  if (r.kind === "room") {
    img = blur(adjust(roomView(r.room, r.yaw, r.pitch, 62, size), 1, r.brightness, 1), r.blur * k);
    if (r.table) underTable(img, table(r.table), horizon);
    contactShadow(img, horizon, r.table ? 0.12 : 0);
    light(img, 0.12, 0.05);
  } else {
    img = blur(scaled(adjust(r.wall, 0.6, r.brightness * 1.04, 0.6), size, size), r.blur * k);
    underTable(img, table(r.table), horizon);
    contactShadow(img, horizon, 0.16);
    light(img, 0.22, 0.1);
  }
  grain(img, 2);
  return img;
}

/** A plain paper sweep in one colour: wall curving into floor with no edge, a pool of light where the product stands. */
function studio([r, g, b]: [number, number, number], size: number): Px {
  const out = px(size, size);
  const top = [r, g, b];
  const bottom = top.map((c) => c * 0.88);
  const floor = top.map((c) => c + (255 - c) * 0.35);
  for (let y = 0; y < size; y++) {
    const yy = y / size;
    let t = Math.min(1, Math.max(0, (yy - 0.45) / 0.4));
    t = t * t * (3 - 2 * t);
    for (let x = 0; x < size; x++) {
      const pool = Math.exp(-(((x / size - 0.5) / 0.32) ** 2 + ((yy - 0.86) / 0.12) ** 2));
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) out.d[i + c] = (top[c] * (1 - t) + bottom[c] * t) * (1 - 0.5 * pool) + floor[c] * 0.5 * pool;
      out.d[i + 3] = 255;
    }
  }
  light(out, 0.12, 0.06);
  grain(out, 1.6);
  return out;
}

/** Draws a made background into a visible canvas (the preview). */
export function paint(p: Px, target: HTMLCanvasElement) {
  target.width = p.w;
  target.height = p.h;
  target.getContext("2d")?.putImageData(new ImageData(p.d, p.w, p.h), 0, 0);
}

/** The made background as a JPEG file, ready to upload like the admin's own photos. */
export function toFile(p: Px, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    toCanvas(p).toBlob(
      (blob) =>
        blob ? resolve(new File([blob], `${name}.jpg`, { type: "image/jpeg" })) : reject(new Error("Could not save the background.")),
      "image/jpeg",
      0.9,
    ),
  );
}

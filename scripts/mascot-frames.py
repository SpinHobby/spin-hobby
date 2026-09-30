"""
Builds the cursor-tracking mascot frames for the storefront hero from a generated clip in which
the mascot turns to follow an imaginary cursor against a flat red background.

    python3 -m venv .venv && .venv/bin/pip install numpy opencv-python-headless Pillow
    .venv/bin/python scripts/mascot-frames.py ~/Downloads/character.mp4

Writes public/mascot-frames/*.webp (red keyed out, cropped to the character) and
src/v3/storefront/mascotFrames.generated.ts (each frame's gaze direction on a unit circle,
measured from where the irises sit relative to the head). The browser component picks the frame
whose direction is nearest the cursor and mirrors frames to cover the other side.

Frames are only used while the eyes are open and the mouth keeps the smile of the first frame, so
blinks and expression drift are skipped. If the clip shows a mouse-cursor arrow, it is located by
matching the arrow's own pixels (so it is found on top of the character too): painted out where it
is clear of her, and the frame skipped where it overlaps her.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / "public" / "mascot-frames"
DATA_FILE = ROOT / "src" / "v3" / "storefront" / "mascotFrames.generated.ts"
OUT_WIDTH = 340          # ~1.4x the CSS width the hero uses
WEBP_QUALITY = 72
WEBP_ALPHA_QUALITY = 50  # the alpha channel compresses lossily too; edges stay clean at this size
INBETWEENS = 2           # synthesized frames between each pair of kept frames (optical-flow warps)
MIN_STEP = 0.02          # gaze change (unit circle) that keeps the next clip frame
PIX_STEP = 1.6           # or this much mean picture change (0-255, on a 160px thumbnail): arm movement during a hold
MAX_FRAMES = 90
EYES_OPEN = 0.33         # iris area vs the first frame (looking down hides part of the iris; a blink hides all)
MOUTH_SAME = 0.5         # mouth-interior pixels vs the first frame
CURSOR_MATCH = 0.8       # masked template-match score that counts as the cursor
CURSOR_PRESENT = 0.52    # weaker score: the arrow while it fades in or out (translucent)


def read_frames(path):
    cap = cv2.VideoCapture(str(path))
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(f)
    if not frames:
        sys.exit(f"Could not read any frames from {path}")
    return frames


def background_of(bgr):
    border = np.concatenate([bgr[:12].reshape(-1, 3), bgr[-12:].reshape(-1, 3), bgr[:, :12].reshape(-1, 3), bgr[:, -12:].reshape(-1, 3)])
    return np.median(border, axis=0)


def masks(bgr):
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    red = ((h <= 8) | (h >= 172)) & (s > 150) & (v > 120)
    white = (s < 40) & (v > 225)
    iris = (h >= 100) & (h <= 135) & (s > 90) & (v > 70)
    mouthy = ((h <= 12) | (h >= 160)) & (s > 60) & (s < 175) & (v > 120)
    dark_or_red = (v < 140) | (((h <= 6) | (h >= 172)) & (s > 100))
    return red, white, iris, mouthy, dark_or_red


def components(nonred):
    """Main character component plus the other islands (area, left, top, width, height, label)."""
    n, lab, stats, _ = cv2.connectedComponentsWithStats(nonred.astype(np.uint8), 8)
    order = sorted(range(1, n), key=lambda k: -stats[k, cv2.CC_STAT_AREA])
    islands = [(int(stats[k, cv2.CC_STAT_AREA]), int(stats[k, cv2.CC_STAT_LEFT]), int(stats[k, cv2.CC_STAT_TOP]), int(stats[k, cv2.CC_STAT_WIDTH]), int(stats[k, cv2.CC_STAT_HEIGHT]), k) for k in order[1:]]
    return lab, order[0], islands


def analyse(bgr):
    """Iris midpoint, iris area (blinks), head bounds, mouth openness and stray islands for one frame."""
    red, white, iris, mouthy, _ = masks(bgr)
    lab, main, islands = components(~red)
    char = lab == main
    ys, xs = np.where(char)
    box = (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max()))

    n, _, stats, cents = cv2.connectedComponentsWithStats(iris.astype(np.uint8), 8)
    blobs = sorted([(stats[k, cv2.CC_STAT_AREA], cents[k]) for k in range(1, n) if stats[k, cv2.CC_STAT_AREA] > 150], key=lambda b: -b[0])[:2]
    mid, area, mouth = None, int(sum(b[0] for b in blobs)), None
    if len(blobs) == 2:
        mid = ((blobs[0][1][0] + blobs[1][1][0]) / 2, (blobs[0][1][1] + blobs[1][1][1]) / 2)
        gap = abs(blobs[0][1][0] - blobs[1][1][0])
        # The open mouth is one pink patch below the eye line. The irises slide sideways when she looks
        # to the side, so the window is wide, and the largest patch is taken so cheek blush is ignored.
        y0, y1 = int(mid[1] + gap * 0.15), int(mid[1] + gap * 0.95)
        x0, x1 = int(mid[0] - gap * 0.7), int(mid[0] + gap * 0.7)
        region = np.zeros(red.shape, bool)
        region[max(y0, 0):y1, max(x0, 0):x1] = True
        n2, _, st2, _ = cv2.connectedComponentsWithStats((mouthy & region).astype(np.uint8), 8)
        mouth = int(max([st2[k, cv2.CC_STAT_AREA] for k in range(1, n2)], default=0))
    white_frac = [(float(white[lab == k].mean()) if a else 0.0) for a, _, _, _, _, k in islands]
    return {"mid": mid, "area": area, "box": box, "mouth": mouth, "char": char, "islands": islands, "white_frac": white_frac, "lab": lab}


def find_cursor(bgr, tpl, mask):
    """Best masked match of an arrow template anywhere in the frame: (score, x, y)."""
    res = cv2.matchTemplate(bgr, tpl, cv2.TM_CCOEFF_NORMED, mask=mask)
    res = np.nan_to_num(res, nan=-1.0, posinf=-1.0, neginf=-1.0)
    _, score, _, (x, y) = cv2.minMaxLoc(res)
    return float(score), x, y


def cursor_templates(frames, info):
    """
    Every distinct drawing of the mouse-cursor arrow, each with its pixel mask. Generated clips redraw the
    arrow between passes (different size or shading), so one template is not enough. Candidates are clean
    white islands away from the character; a candidate that an existing template already recognises is skipped.
    """
    H = frames[0].shape[0]
    candidates = []
    for i, d in enumerate(info):
        for (area, left, top, w, h, k), wf in zip(d["islands"], d["white_frac"]):
            if 1200 <= area <= 8000 and top < 0.6 * H and wf > 0.3 and w < 1.2 * h:
                candidates.append((area, i, (left, top, w, h), k))
    templates = []
    for area, i, (left, top, w, h), k in sorted(candidates):
        if any(find_cursor(frames[i], t, m)[0] >= CURSOR_MATCH for t, m in templates):
            continue
        m = 2
        y0, x0 = max(top - m, 0), max(left - m, 0)
        tpl = frames[i][y0:top + h + m, x0:left + w + m].copy()
        mask = cv2.dilate((info[i]["lab"][y0:top + h + m, x0:left + w + m] == k).astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
        templates.append((tpl, mask))
        print(f"cursor template {len(templates)}: frame {i}, {tpl.shape[1]}x{tpl.shape[0]} at ({left},{top}), {area} px")
        if len(templates) >= 4:
            break
    return templates


def clean(bgr, d, hit, bg):
    """
    Removes the cursor and stray islands. Away from the character the arrow's box is painted with the
    background; on top of her it is inpainted from its surroundings (a few pixels at the size the hero
    shows her). Returns (image, cursor was inpainted over the character).
    """
    out = bgr.copy()
    H = out.shape[0]
    overlapped = False
    near = cv2.dilate(d["char"].astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    if hit is not None:
        score, x, y, tpl, tmask = hit
        th, tw = tpl.shape[:2]
        if near[y:y + th, x:x + tw].any():
            overlapped = True
            mask = np.zeros(out.shape[:2], np.uint8)
            mask[y:y + th, x:x + tw] = cv2.dilate(tmask, np.ones((5, 5), np.uint8))
            # First decide which of the hidden pixels are her and which are background, by inpainting the
            # silhouette itself; then fill colour only from character pixels (red near the arrow is replaced
            # by the local character colour first), so no red bleeds into her; background pixels go back to red.
            red, _, _, _, _ = masks(out)
            silhouette = cv2.inpaint((~red).astype(np.uint8) * 255, mask, 6, cv2.INPAINT_TELEA) > 127
            ring = (cv2.dilate(mask, np.ones((31, 31), np.uint8)) > 0) & (mask == 0)
            char_ring = ring & ~red
            if char_ring.any():
                local = out[char_ring].mean(axis=0)
                src = out.copy()
                src[ring & red] = local
                filled = cv2.inpaint(src, mask, 4, cv2.INPAINT_TELEA)
                hidden = mask > 0
                out[hidden & silhouette] = filled[hidden & silhouette]
                out[hidden & ~silhouette] = bg
            else:
                out[mask > 0] = bg
        else:
            out[y:y + th, x:x + tw] = bg
    # Stray islands: click ripples and cursor remnants go; small bits low in the frame are lace and feet.
    _, _, _, _, dark_or_red = masks(out)
    red, _, _, _, _ = masks(out)
    lab, _, islands = components(~red)
    for area, left, top, w, h, k in islands:
        if area < 700 and top >= 0.7 * H:
            continue
        blob = (lab == k).astype(np.uint8)
        out[blob > 0] = bg
        # The arrow's dark anti-aliased outline can be classed as background-red and stay behind: clear the rim too.
        rim = (cv2.dilate(blob, np.ones((7, 7), np.uint8)) > 0) & dark_or_red & ~d["char"]
        out[rim] = bg
    return out, overlapped


def key_out(bgr, bg):
    """Alpha from colour distance to the background; spill removed by un-premultiplying."""
    dist = np.linalg.norm(bgr.astype(np.float32) - bg.astype(np.float32), axis=2)
    alpha = np.clip((dist - 30.0) / (90.0 - 30.0), 0.0, 1.0)
    a = alpha[..., None]
    fg = np.where(a > 0, (bgr.astype(np.float32) - (1 - a) * bg.astype(np.float32)) / np.maximum(a, 1e-3), 0)
    return np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)


_dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)


def _premult(rgba):
    a = rgba[..., 3:4].astype(np.float32) / 255
    return np.dstack([rgba[..., :3].astype(np.float32) * a, a * 255])


def _flow_gray(rgba):
    """Luminance over a mid-grey backdrop, so edges against transparency are real edges for the flow."""
    p = _premult(rgba)
    a = p[..., 3:4] / 255
    return cv2.cvtColor((p[..., :3] + (1 - a) * 128).astype(np.uint8), cv2.COLOR_BGR2GRAY)


def flows(a, b):
    """Dense optical flow both ways between two keyed frames."""
    ga, gb = _flow_gray(a), _flow_gray(b)
    return _dis.calc(ga, gb, None), _dis.calc(gb, ga, None)


def inbetween(a, b, fab, fba, t):
    """
    The frame a fraction t of the way from a to b: each frame is warped toward that moment along its
    flow and the two are blended (premultiplied, so transparent areas never bleed colour).
    """
    h, w = a.shape[:2]
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    pa, pb = _premult(a), _premult(b)
    wa = cv2.remap(pa, xs - t * fab[..., 0], ys - t * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    wb = cv2.remap(pb, xs + (1 - t) * fba[..., 0], ys + (1 - t) * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    out = (1 - t) * wa + t * wb
    alpha = out[..., 3:4] / 255
    rgb = np.where(alpha > 0, out[..., :3] / np.maximum(alpha, 1e-3), 0)
    return np.dstack([np.clip(rgb, 0, 255), out[..., 3]]).astype(np.uint8)


def main(clip):
    frames = read_frames(clip)
    H, W = frames[0].shape[:2]
    bg = background_of(frames[0])
    info = [analyse(f) for f in frames]
    rest = info[0]
    if rest["mid"] is None:
        sys.exit("The first frame must show both eyes open, looking at the camera.")

    templates = cursor_templates(frames, info)
    hits = [None] * len(frames)
    for i, f in enumerate(frames):
        for tpl, mask in templates:
            score, x, y = find_cursor(f, tpl, mask)
            if score >= CURSOR_PRESENT and (hits[i] is None or score > hits[i][0]):
                hits[i] = (score, x, y, tpl, mask)
    cleaned = [clean(f, d, h, bg) for f, d, h in zip(frames, info, hits)]

    def gaze(i):
        d = info[i]
        head_cx = (d["box"][0] + d["box"][2]) / 2
        rest_cx = (rest["box"][0] + rest["box"][2]) / 2
        return ((d["mid"][0] - head_cx) - (rest["mid"][0] - rest_cx), d["mid"][1] - rest["mid"][1])

    reasons = {"blink": [], "mouth": []}
    usable = []
    for i, d in enumerate(info):
        if d["mid"] is None or d["area"] < EYES_OPEN * rest["area"]:
            reasons["blink"].append(i)
        elif d["mouth"] is None or d["mouth"] < MOUTH_SAME * rest["mouth"]:
            reasons["mouth"].append(i)
        else:
            usable.append(i)
    inpainted = [i for i, c in enumerate(cleaned) if c[1]]
    print(f"{len(frames)} frames {W}x{H}: {len(usable)} usable; skipped {len(reasons['blink'])} blinking, {len(reasons['mouth'])} mouth changed")
    print(f"  cursor seen in {sum(1 for h in hits if h)} frames, inpainted over the character in {len(inpainted)}: {inpainted[:8]}{'...' if len(inpainted) > 8 else ''}")
    print(f"  mouth changed: {reasons['mouth'][:6]}{'...' if len(reasons['mouth']) > 6 else ''}")

    vectors = {i: gaze(i) for i in usable}
    scale = max(np.hypot(*v) for v in vectors.values())
    unit = {i: (v[0] / scale, v[1] / scale) for i, v in vectors.items()}
    # Small greyscale thumbnails to measure how much the picture changes between frames: the head can
    # hold still while an arm moves, and that movement must be kept too or it pops between frames.
    thumb = [cv2.cvtColor(cv2.resize(c[0], (160, 90), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32) for c in cleaned]
    change = lambda a, b: float(np.abs(thumb[a] - thumb[b]).mean())
    # Frames stay in clip order so the browser can scrub through real in-betweens. Only frames that
    # barely differ from the previous kept one (holds) are dropped; a gap in the clip (a blink) is
    # bridged by the frames either side of it, which are still close in time.
    kept = []
    for i in usable[1:]:
        if len(kept) >= MAX_FRAMES - 1:
            break
        prev = kept[-1] if kept else 0  # until something is kept, compare against the neutral frame itself
        if np.hypot(unit[i][0] - unit[prev][0], unit[i][1] - unit[prev][1]) >= MIN_STEP or change(i, prev) >= PIX_STEP:
            kept.append(i)
    # The neutral frame goes where the clip comes back closest to neutral. The frames before that point
    # and after it then form two branches leaving the neutral pose in different directions, instead of
    # one long detour through every pose. A clip that never returns gets the neutral frame at the start.
    mag = [float(np.hypot(*unit[i])) for i in kept]
    passes = [j for j in range(1, len(kept) - 1) if mag[j] <= mag[j - 1] and mag[j] <= mag[j + 1] and mag[j] < 0.6]
    split = min(passes, key=lambda j: mag[j]) if passes else 0
    # Each branch is turned so that its end nearest the neutral pose is the one next to the neutral frame.
    before, after = kept[:split], kept[split:]
    if before and mag[0] < mag[split - 1]:
        before = before[::-1]
    if after and mag[-1] < mag[split]:
        after = after[::-1]
    kept = before + [0] + after
    centre = len(before)
    print(f"keeping {len(kept)} frames in clip order, neutral at path index {centre}: {kept}")
    steps = [(change(kept[j], kept[j + 1]), j) for j in range(len(kept) - 1)]
    worst = sorted(steps, reverse=True)[:4]
    print("  biggest picture changes between neighbouring path steps (mean 0-255): " + ", ".join(f"{c:.1f} at {j}->{j + 1} (frames {kept[j]}->{kept[j + 1]})" for c, j in worst))

    # One crop for every frame so nothing shifts between poses: union of the character bounds, full height.
    x0 = max(min(info[i]["box"][0] for i in kept) - 24, 0)
    x1 = min(max(info[i]["box"][2] for i in kept) + 24, W)
    out_h = round(OUT_WIDTH * H / (x1 - x0))
    face = ((rest["mid"][0] - x0) / (x1 - x0), rest["mid"][1] / H)

    keyed = [cv2.resize(key_out(cleaned[i][0][:, x0:x1], bg), (OUT_WIDTH, out_h), interpolation=cv2.INTER_AREA) for i in kept]

    # Synthesize in-betweens along the path so the browser has ~(INBETWEENS + 1)x the clip's frame rate to
    # scrub through; their gaze directions are interpolated. The neutral frame's index moves accordingly.
    sequence = []  # (image, gaze)
    for j, img in enumerate(keyed):
        sequence.append((img, unit[kept[j]]))
        if j + 1 < len(keyed):
            fab, fba = flows(img, keyed[j + 1])
            for s in range(1, INBETWEENS + 1):
                t = s / (INBETWEENS + 1)
                g = tuple((1 - t) * unit[kept[j]][k] + t * unit[kept[j + 1]][k] for k in (0, 1))
                sequence.append((inbetween(img, keyed[j + 1], fab, fba, t), g))
    centre_out = centre * (INBETWEENS + 1)

    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    for old in FRAMES_DIR.glob("*.webp"):
        old.unlink()
    entries = []
    for n, (img, g) in enumerate(sequence):
        name = f"f{n:03d}.webp"
        Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGRA2RGBA)).save(FRAMES_DIR / name, "WEBP", quality=WEBP_QUALITY, alpha_quality=WEBP_ALPHA_QUALITY, method=5)
        entries.append({"file": name, "x": round(float(g[0]), 3), "y": round(float(g[1]), 3)})
    total = sum(p.stat().st_size for p in FRAMES_DIR.glob("*.webp"))
    print(f"wrote {len(entries)} frames ({len(kept)} from the clip + {INBETWEENS} in-betweens per pair) to {FRAMES_DIR} ({total // 1024} kB total, {OUT_WIDTH}x{out_h}), background {bg.astype(int).tolist()} (BGR)")

    data = {"dir": "/mascot-frames", "width": OUT_WIDTH, "height": out_h, "face": {"x": round(face[0], 3), "y": round(face[1], 3)}, "center": centre_out, "substeps": INBETWEENS + 1, "frames": entries}
    DATA_FILE.write_text(
        "// Generated by scripts/mascot-frames.py - do not edit by hand.\n"
        "// Frames along the pose path (clip frames plus synthesized in-betweens), each with its gaze direction\n"
        "// on a unit circle (x right, y down). `center` is the neutral frame, where the mirrored path joins the\n"
        "// original; `substeps` is how many path steps make up one clip frame.\n"
        f"export const MASCOT_FRAMES = {json.dumps(data, indent=2)} as const;\n"
    )
    print(f"wrote {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: mascot-frames.py <clip.mp4>")
    main(Path(sys.argv[1]).expanduser())

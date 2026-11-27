"""Starter shop backgrounds: real photo textures (Poly Haven, CC0) set as a table against a wall, and plain studio sweeps.
Usage: python3 -I make_backgrounds.py <textures dir> <out dir>"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SIZE = 2000
HORIZON = 1180  # where the table meets the wall (59%): a padded figure's feet sit low on the table
src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)


def tex(name, sat=0.85, bright=1.0, contrast=0.9):
    im = Image.open(src / f"{name}.jpg").convert("RGB")
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Contrast(im).enhance(contrast)
    return ImageEnhance.Brightness(im).enhance(bright)


def perspective_coeffs(dst, srcpts):
    # PIL's PERSPECTIVE maps output (dst) points to input (src) points
    m = []
    for (x, y), (u, v) in zip(dst, srcpts):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(m, dtype=float)
    b = np.array(srcpts, dtype=float).reshape(8)
    return np.linalg.solve(a, b).tolist()


def tiled(im, nx, ny):
    w, h = im.size
    t = Image.new("RGB", (w * nx, h * ny))
    for i in range(nx):
        for j in range(ny):
            t.paste(im, (i * w, j * h))
    return t


def table_plane(im, rotate=False):
    if rotate:
        im = im.rotate(90, expand=True)
    big = tiled(im, 3, 2)
    w, h = big.size
    depth = SIZE - HORIZON
    # near edge spans the picture, the far edge (at the wall) is narrower: a table seen from a little above
    dst = [(-700, HORIZON), (SIZE + 700, HORIZON), (SIZE + 250, SIZE), (-250, SIZE)]
    srcpts = [(0, 0), (w, 0), (w, h), (0, h)]
    plane = big.transform((SIZE, SIZE), Image.PERSPECTIVE, perspective_coeffs(dst, srcpts), Image.BICUBIC)
    # further away is softer (depth of field)
    soft = plane.filter(ImageFilter.GaussianBlur(7))
    ramp = np.clip((np.arange(SIZE) - HORIZON) / depth, 0, 1)[:, None]
    mask = Image.fromarray(np.repeat((255 * (1 - ramp) ** 1.6).astype(np.uint8), SIZE, axis=1))
    return Image.composite(soft, plane, mask)


def wall(im, blur=10):
    w = im.resize((SIZE, SIZE), Image.LANCZOS).filter(ImageFilter.GaussianBlur(blur))
    return w


def light(img, centre=(0.5, 0.42), strength=0.22, top_dark=0.10):
    a = np.asarray(img).astype(float) / 255
    yy, xx = np.mgrid[0:SIZE, 0:SIZE] / SIZE
    r = np.sqrt(((xx - centre[0]) * 1.1) ** 2 + (yy - centre[1]) ** 2)
    gain = 1 + strength * (0.55 - r)
    gain *= 1 - top_dark * np.clip(0.35 - yy, 0, 0.35) / 0.35
    a = np.clip(a * gain[..., None], 0, 1)
    return Image.fromarray((a * 255).astype(np.uint8))


def contact_shadow(img, depth=0.16):
    a = np.asarray(img).astype(float)
    y = np.arange(SIZE)
    # a soft dark band on the wall just above the table, and the table just in front of the wall
    above = np.exp(-np.clip(HORIZON - y, 0, None) / 60) * (y <= HORIZON)
    below = np.exp(-np.clip(y - HORIZON, 0, None) / 90) * (y > HORIZON)
    shade = 1 - depth * (above + 0.7 * below)
    return Image.fromarray(np.clip(a * shade[:, None, None], 0, 255).astype(np.uint8))


def grain(img, amount=2.0, seed=7):
    rng = np.random.default_rng(seed)
    a = np.asarray(img).astype(float) + rng.normal(0, amount, (SIZE, SIZE, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def scene(file, wall_tex, table_tex, rotate_table=False, wall_blur=10):
    img = wall(wall_tex, wall_blur)
    plane = table_plane(table_tex, rotate_table)
    mask = Image.new("L", (SIZE, SIZE), 0)
    mask.paste(255, (0, HORIZON, SIZE, SIZE))
    img = Image.composite(plane, img, mask)
    img = contact_shadow(img)
    img = light(img)
    img = grain(img)
    img.save(out / file, quality=88, optimize=True, progressive=True)


def sweep(file, top, bottom, floor_light):
    yy, xx = np.mgrid[0:SIZE, 0:SIZE] / SIZE
    t = np.clip((yy - 0.45) / 0.4, 0, 1)
    t = t * t * (3 - 2 * t)  # the curve of a paper sweep: wall to floor with no edge
    top, bottom, floor_light = (np.array(c, float) for c in (top, bottom, floor_light))
    base = top[None, None] * (1 - t[..., None]) + bottom[None, None] * t[..., None]
    pool = np.exp(-(((xx - 0.5) / 0.32) ** 2 + ((yy - 0.86) / 0.12) ** 2))[..., None]
    a = base * (1 - 0.5 * pool) + floor_light[None, None] * 0.5 * pool
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    img = light(img, strength=0.12, top_dark=0.06)
    img = grain(img, 1.6)
    img.save(out / file, quality=90, optimize=True, progressive=True)


def cream(im, tone=(242, 236, 224), keep=0.35):
    # the linen's weave kept, its blue dye taken out and a cream cloth's tone put in
    g = np.asarray(im.convert("L")).astype(float) / 255
    g = 1 - keep * (1 - g / g.mean())
    a = np.clip(g[..., None] * np.array(tone, float)[None, None], 0, 255)
    return Image.fromarray(a.astype(np.uint8))


scene("pale-maple-table.jpg", tex("white_stucco", 0.6, 1.04, 0.6), tex("white_maple_veneer", 0.75, 1.0), rotate_table=True, wall_blur=22)
scene("oak-table.jpg", tex("painted_plaster_wall", 0.5, 1.1, 0.55), tex("white_oak_veneer", 0.9, 1.08), wall_blur=24)
scene("walnut-table.jpg", tex("beige_wall_001", 0.7, 1.08, 0.6), tex("european_walnut_veneer_04", 0.95, 0.92), rotate_table=True, wall_blur=22)
scene("hinoki-table.jpg", tex("white_stucco", 0.6, 1.0, 0.6), tex("hinoki_planks", 0.85, 1.1, 0.85), rotate_table=True, wall_blur=22)
scene("linen-cloth.jpg", tex("beige_wall_001", 0.55, 1.18, 0.6), cream(Image.open(src / "rough_linen.jpg")), wall_blur=24)
sweep("studio-warm-white.jpg", (247, 244, 238), (236, 231, 222), (252, 250, 246))
sweep("studio-light-grey.jpg", (226, 228, 230), (205, 208, 211), (238, 239, 240))
sweep("studio-charcoal.jpg", (58, 60, 63), (34, 35, 37), (78, 80, 84))
print("done")

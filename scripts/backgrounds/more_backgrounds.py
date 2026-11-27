"""More starter backgrounds: rooms (a view cut from a Poly Haven 360-degree photo, CC0, blurred like a shallow-focus product shot, with a
real wood table in front), more table-and-wall textures, and soft colour studios.
Usage: python3 -I more_backgrounds.py <textures dir> <rooms dir> <out dir>   (imports make_backgrounds.py from its own folder)"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

sys.argv = [sys.argv[0], sys.argv[1], sys.argv[3], sys.argv[2]]
rooms = Path(sys.argv[3])
sys.path.insert(0, str(Path(__file__).parent))
import make_backgrounds as mb  # noqa: E402  (writes the first set too; harmless, same files)

SIZE, HORIZON = mb.SIZE, mb.HORIZON


def view(pano_file, yaw_deg, pitch_deg=-4, fov_deg=72, size=1400):
    """A normal camera view out of an equirectangular 360-degree photo."""
    pano = np.asarray(Image.open(pano_file).convert("RGB"))
    h, w = pano.shape[:2]
    f = (size / 2) / np.tan(np.radians(fov_deg) / 2)
    xs, ys = np.meshgrid(np.arange(size) - size / 2, np.arange(size) - size / 2)
    d = np.stack([xs, -ys, np.full_like(xs, f)], -1)
    d /= np.linalg.norm(d, axis=-1, keepdims=True)
    p, y = np.radians(pitch_deg), np.radians(yaw_deg)
    rx = np.array([[1, 0, 0], [0, np.cos(p), -np.sin(p)], [0, np.sin(p), np.cos(p)]])
    ry = np.array([[np.cos(y), 0, np.sin(y)], [0, 1, 0], [-np.sin(y), 0, np.cos(y)]])
    d = d @ (ry @ rx).T
    lon = np.arctan2(d[..., 0], d[..., 2])
    lat = np.arcsin(np.clip(d[..., 1], -1, 1))
    u = ((lon / (2 * np.pi) + 0.5) * w).astype(int) % w
    v = np.clip(((0.5 - lat / np.pi) * h).astype(int), 0, h - 1)
    return Image.fromarray(pano[v, u]).resize((SIZE, SIZE), Image.LANCZOS)


def room(file, pano, yaw, table, rotate_table=False, blur=14, pitch=16, fov=62, sat=1.0):
    behind = view(rooms / f"{pano}.jpg", yaw, pitch, fov).filter(ImageFilter.GaussianBlur(blur))
    behind = ImageEnhance.Color(behind).enhance(sat)
    img = behind
    plane = mb.table_plane(table, rotate_table)
    mask = Image.new("L", (SIZE, SIZE), 0)
    mask.paste(255, (0, HORIZON, SIZE, SIZE))
    img = Image.composite(plane, img, mask)
    img = mb.contact_shadow(img, 0.12)
    img = mb.light(img, strength=0.12, top_dark=0.05)
    img = mb.grain(img)
    img.save(mb.out / file, quality=88, optimize=True, progressive=True)


tex = mb.tex
room("christmas-library.jpg", "christmas_photo_studio_01", 22, tex("european_walnut_veneer_04", 0.95, 0.95), rotate_table=True)
room("christmas-fireplace.jpg", "christmas_photo_studio_05", 22, tex("white_oak_veneer", 0.9, 1.08))
room("cafe.jpg", "comfy_cafe", 32, tex("white_oak_veneer", 0.9, 1.05))
room("cozy-lounge.jpg", "lythwood_lounge", -140, tex("european_walnut_veneer_04", 0.95, 0.92), rotate_table=True, sat=0.75)
mb.scene("tatami-room.jpg", tex("bamboo_wall", 0.7, 1.05, 0.6), tex("tatami_mat", 0.85, 1.05), rotate_table=True, wall_blur=20)
mb.scene("brick-and-walnut.jpg", tex("whitewashed_brick", 0.6, 1.05, 0.6), tex("european_walnut_veneer_04", 0.95, 0.92), rotate_table=True, wall_blur=16)
mb.scene("white-brick-oak.jpg", tex("white_bricks", 0.5, 1.08, 0.55), tex("grey_oak_veneer_01", 0.9, 1.05), rotate_table=True, wall_blur=16)
mb.sweep("studio-sage.jpg", (214, 222, 208), (192, 202, 186), (230, 236, 226))
mb.sweep("studio-blush.jpg", (240, 222, 220), (224, 202, 200), (248, 236, 234))
mb.sweep("studio-sand.jpg", (232, 222, 204), (214, 202, 182), (244, 238, 226))
mb.sweep("studio-slate.jpg", (112, 120, 128), (82, 88, 96), (140, 148, 156))
print("more done")

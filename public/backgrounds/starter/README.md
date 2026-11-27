# Ready-made shop backgrounds

The admin's **Photos → Backgrounds → Ready-made backgrounds** list (`src/v3/admin/starterBackgrounds.ts`). Each is a 2000 px square
JPEG with a 360 px `.thumb.jpg` for the admin. Adding one copies it into the shop's own background library, like an upload.

## Where the pictures come from

No AI pictures. The tables and walls are real photo textures from [Poly Haven](https://polyhaven.com), licensed
[CC0](https://polyhaven.com/license) (free for commercial use, no credit needed). The studio sweeps are plain tones made by the script.

| Background | Wall | Table |
| --- | --- | --- |
| Pale maple table | white_stucco | white_maple_veneer |
| Oak table | painted_plaster_wall | white_oak_veneer |
| Walnut table | beige_wall_001 | european_walnut_veneer_04 |
| Hinoki table | white_stucco | hinoki_planks |
| Linen tablecloth | beige_wall_001 | rough_linen (re-toned from blue to cream) |
| White brick, oak table | white_bricks | grey_oak_veneer_01 |
| Brick, walnut table | whitewashed_brick | european_walnut_veneer_04 |
| Tatami room | bamboo_wall | tatami_mat |

The rooms are a normal camera view cut from a Poly Haven 360-degree photo (its tonemapped JPG, also CC0), blurred like a shallow-focus
product shot, with a real wood table in front:

| Background | Room (Poly Haven HDRI) | View | Table |
| --- | --- | --- | --- |
| Café | comfy_cafe | yaw 32 | white_oak_veneer |
| Cozy lounge | lythwood_lounge | yaw -140, colour 0.75 | european_walnut_veneer_04 |
| Christmas fireplace | christmas_photo_studio_05 | yaw 22 | white_oak_veneer |
| Christmas library | christmas_photo_studio_01 | yaw 22 | european_walnut_veneer_04 |

## Making them again, or more

1. Download each texture's 2K diffuse JPEG (`https://api.polyhaven.com/files/<id>`, `Diffuse` → `2k` → `jpg`) into one folder, named `<id>.jpg`.
2. `python3 scripts/backgrounds/make_backgrounds.py <that folder> <output folder>` (needs Pillow and NumPy). For the rooms and the
   second set, also download each room's tonemapped JPG (`https://api.polyhaven.com/files/<id>`, `tonemapped`) into a rooms folder and run
   `python3 scripts/backgrounds/more_backgrounds.py <textures folder> <rooms folder> <output folder>`.
3. Copy the results here, make the 360 px thumbnails, and add a line to `starterBackgrounds.ts`.

The wall is blurred like an out-of-focus room, the table set in perspective with its far side softer, with a soft shadow where they meet;
the horizon sits at 59% so a padded figure stands on the table.

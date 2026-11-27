/**
 * Ready-made shop backgrounds that come with the shop, in public/backgrounds/starter (2000 px squares, with a .thumb.jpg for the admin). Each is
 * added to the library with one click and is then like any uploaded one: used for all products, chosen per product, renamed or deleted. The
 * tables and walls are real photos (Poly Haven textures, CC0: free for commercial use, no credit needed), set in perspective and softly lit;
 * the rooms are views cut from Poly Haven's 360-degree photos (CC0), blurred like a shallow-focus product shot, with a real table in front;
 * the studio ones are plain tones. No AI pictures. Made by a script kept with the images' notes (public/backgrounds/starter/README.md).
 */
export interface StarterBackground {
  file: string;
  name: string;
}

export const STARTER_BACKGROUNDS: StarterBackground[] = [
  { file: "studio-warm-white", name: "Studio warm white" },
  { file: "studio-light-grey", name: "Studio light grey" },
  { file: "studio-charcoal", name: "Studio charcoal" },
  { file: "pale-maple-table", name: "Pale maple table" },
  { file: "oak-table", name: "Oak table" },
  { file: "walnut-table", name: "Walnut table" },
  { file: "hinoki-table", name: "Hinoki table" },
  { file: "linen-cloth", name: "Linen tablecloth" },
  { file: "studio-sage", name: "Studio sage" },
  { file: "studio-blush", name: "Studio blush" },
  { file: "studio-sand", name: "Studio sand" },
  { file: "studio-slate", name: "Studio slate" },
  { file: "white-brick-oak", name: "White brick, oak table" },
  { file: "brick-and-walnut", name: "Brick, walnut table" },
  { file: "tatami-room", name: "Tatami room" },
  { file: "cafe", name: "Café" },
  { file: "cozy-lounge", name: "Cozy lounge" },
  { file: "christmas-fireplace", name: "Christmas fireplace" },
  { file: "christmas-library", name: "Christmas library" },
];

export const starterUrl = (b: StarterBackground, thumb = false) => `/backgrounds/starter/${b.file}${thumb ? ".thumb" : ""}.jpg`;

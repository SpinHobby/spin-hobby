/**
 * The short name a product card shows. The series already sits on its own line above, so a figure whose character the shop knows is
 * named by the character and the version on its box ("Rem, Flower Dress"), not by its whole title; a figure with no version known
 * keeps its full name, so two figures of one character never read the same. Anything else the shop sells is named
 * by the character and what it is ("Pekora plush"). A product whose character or kind the shop does not know keeps its full name:
 * nothing is guessed. The full name stays in the link's label and the title that shows on pointing at it.
 */
export interface NamedProduct {
  name: string;
  character?: string | null;
  version?: string | null;
  productType?: string | null;
  category?: string | null;
}

const FIGURE = /figure|nendoroid|statue|figma|figuarts/i;

export function shortName(p: NamedProduct): string {
  const character = p.character?.trim();
  if (!character) return p.name;
  const kind = p.productType?.trim() || null;
  // a figure: by its product type when the shop has it, else by its category
  if (FIGURE.test(kind ?? p.category ?? "")) {
    // without its version the full name stays: one character often has several figures in the shop, and three cards reading
    // "Hatsune Miku" cannot be told apart (seen in the weekly ranking, 2026-11-24)
    const version = p.version?.trim();
    return version ? `${character}, ${version}` : p.name;
  }
  // other goods need the kind, or "Rem" could be a keychain or a towel
  return kind ? `${character} ${kind.toLowerCase()}` : p.name;
}

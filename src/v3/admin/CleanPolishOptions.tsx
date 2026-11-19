import type { CleanPolish } from "./cleanPolish";
const BACKDROPS: { key: CleanPolish["backdrop"]; label: string; hint: string }[] = [
  { key: "artwork", label: "Box-art colours", hint: "a soft, blurred backdrop in the colours of the box" },
  { key: "dark", label: "Dark spotlight", hint: "near black, a soft spotlight and a reflection on a glossy floor" },
  { key: "white", label: "White", hint: "plain white with a soft shadow" },
];

/** The clean photo's choices, shown under "Polish into a clean product photo" when it is ticked. */
export function CleanPolishOptions({
  polish,
  onChange,
  official,
  name,
}: {
  polish: CleanPolish;
  onChange: (next: CleanPolish) => void;
  /** Whether the maker's official photos are looked up (drafts can turn the lookup off; the photo queue always looks). */
  official?: boolean;
  /** Prefix for the radio groups, so two panels on one page do not share them. */
  name: string;
}) {
  const set = (patch: Partial<CleanPolish>) => onChange({ ...polish, ...patch });
  const figureAlone = polish.printed === "figure";
  return (
    <div className="ad-polish-clean" role="group" aria-label="Clean product photo options">
      <p className="ad-muted ad-sm">
        The photo computer looks at each photo and decides whether it is a <b>printed box</b> (the character is artwork on the cover) or a{" "}
        <b>window box, bag or blister</b> (the real figure is behind plastic). Each photo says which it decided.
      </p>

      <div className="ad-label">Printed box</div>
      <label className="ad-check">
        <input type="radio" name={`${name}-printed`} checked={!figureAlone} onChange={() => set({ printed: "boxart" })} /> The character
        with the box art around it, polished <small className="ad-muted">(recommended: the scene as it appears on the box)</small>
      </label>
      <label className="ad-check">
        <input type="radio" name={`${name}-printed`} checked={figureAlone} onChange={() => set({ printed: "figure" })} /> The character
        alone, on the backdrop below
      </label>
      {!figureAlone && (
        <label className="ad-check ad-check--sub">
          <input type="checkbox" checked={polish.removeText} onChange={(e) => set({ removeText: e.target.checked })} /> Take off the title,
          logos and other printed text <small className="ad-muted">(untick to keep the box&apos;s own lettering)</small>
        </label>
      )}

      <div className="ad-label">Window box, bag or blister</div>
      <p className="ad-muted ad-sm">Always the figure alone, out of its packaging, on the backdrop below.</p>
      <label className="ad-check">
        <input type="checkbox" checked={polish.makerPhotos} onChange={(e) => set({ makerPhotos: e.target.checked })} /> Draw the figure from
        the maker&apos;s official photos{" "}
        <small className="ad-muted">(the plastic hides its legs and blurs its face; without them the AI guesses what it cannot see)</small>
      </label>
      {polish.makerPhotos && official === false && (
        <div className="ad-uploads__warn">
          Tick &ldquo;Find the maker&apos;s official photos&rdquo; too: without the lookup there are none to draw from.
        </div>
      )}

      <div className="ad-label">Backdrop behind a figure alone</div>
      {BACKDROPS.map((b) => (
        <label key={b.key} className="ad-check">
          <input type="radio" name={`${name}-backdrop`} checked={polish.backdrop === b.key} onChange={() => set({ backdrop: b.key })} />{" "}
          {b.label} <small className="ad-muted">({b.hint})</small>
        </label>
      ))}
      <p className="ad-muted ad-sm">
        The green cloth behind our photos is never kept. Every clean photo is drawn by AI: check the face, colours and small parts against
        the real figure before using it.
      </p>
    </div>
  );
}

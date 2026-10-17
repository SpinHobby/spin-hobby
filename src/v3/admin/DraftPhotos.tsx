import { BackgroundChoice, BackgroundPreview } from "./Backgrounds";
import type { Background } from "./photoBackgrounds";
import type { OfferedPhoto, PhotoKey, PhotoPick } from "./photoPicks";

const LABEL: Record<PhotoKey, { title: string; hint: string }> = {
  studio: { title: "Cleaned photo", hint: "made by the photo computer: background removed, stickers off, sharpened" },
  background: { title: "On a background", hint: "the cut-out product on one of your backgrounds" },
  cropped: { title: "Cropped", hint: "your photo cropped to the product, nothing else changed (no AI)" },
  original: { title: "As taken", hint: "your photo exactly as it was uploaded" },
  official: { title: "Official photo", hint: "" },
};

/**
 * Every photo a draft offers, each with where it goes: the website (and the till, through Square) and eBay (not connected yet: what is picked is kept
 * for when it is). The first photo picked for the website is the main one; any can be made main.
 */
export function DraftPhotos({ offered, picks, onPicks, backgrounds, background, onBackground, official, title, busy }: {
  offered: OfferedPhoto[];
  picks: PhotoPick[];
  onPicks: (next: PhotoPick[]) => void;
  backgrounds: Background[];
  background: string | null;
  onBackground: (id: string | null) => void;
  official: { pageUrl: string; site: string } | null;
  title: string;
  busy: boolean;
}) {
  const url = (key: PhotoKey) => offered.find((p) => p.key === key)?.url ?? null;
  const studio = url("studio");
  const set = (key: PhotoKey, change: Partial<PhotoPick>) => onPicks(picks.map((p) => (p.key === key ? { ...p, ...change } : p)));
  const makeMain = (key: PhotoKey) => {
    const me = picks.find((p) => p.key === key)!;
    onPicks([{ ...me, square: true }, ...picks.filter((p) => p.key !== key)]);
  };
  const mainKey = picks.find((p) => p.square)?.key ?? null;
  const backgroundRow = backgrounds.find((b) => b.id === background) ?? null;

  return (
    <div className="ad-draftphotos">
      {picks.map((p) => {
        const label = LABEL[p.key];
        const src = url(p.key);
        return (
          <div key={p.key} className={`ad-draftphotos__item ${p.square || p.ebay ? "is-picked" : ""}`}>
            <div className="ad-draftphotos__pic">
              {p.key === "background"
                ? <BackgroundPreview cutoutUrl={src} background={backgroundRow} fallbackUrl={studio} alt={`${title}, on a background`} onWhite />
                : src ? <img src={src} alt={`${title}: ${label.title}`} loading="lazy" /> : null}
              {mainKey === p.key && <span className="ad-photos__cover">Main</span>}
            </div>
            <div className="ad-draftphotos__text">
              <b>{label.title}</b>
              <span className="ad-muted ad-sm">
                {p.key === "official" && official
                  ? <>from <a href={official.pageUrl} target="_blank" rel="noreferrer">{official.site}</a>. It belongs to the maker: use it only if that is OK for your shop.</>
                  : label.hint}
              </span>
            </div>
            {p.key === "background" && backgrounds.length > 0 && (
              <BackgroundChoice backgrounds={backgrounds} value={background} onChange={onBackground} disabled={busy} label="Background" />
            )}
            <div className="ad-draftphotos__where">
              <label className="ad-check"><input type="checkbox" checked={p.square} disabled={busy} onChange={(e) => set(p.key, { square: e.target.checked })} /> Website &amp; Square</label>
              <label className="ad-check"><input type="checkbox" checked={p.ebay} disabled={busy} onChange={(e) => set(p.key, { ebay: e.target.checked })} /> eBay</label>
              {p.square && mainKey !== p.key && <button type="button" className="ad-link" disabled={busy} onClick={() => makeMain(p.key)}>Make main</button>}
            </div>
          </div>
        );
      })}
      <p className="ad-muted ad-sm" style={{ margin: 0 }}>eBay is not connected yet: photos picked for eBay are kept with the product, ready for when it is.</p>
    </div>
  );
}

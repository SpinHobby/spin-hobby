import { COST_CENTS, costLabel, estimateCents } from "./polish";

export interface PolishChoice { removeBackground: boolean; removeStickers: boolean; text: boolean }
/**
 * Choose what to do to a photo, with the price of each step shown before anything runs. Steps that cost money
 * are never on by default; combining the title with sticker removal is cheaper than doing the two separately.
 */
export function PolishOptions({ choice, onChange, showText, busy, onRun, runLabel = "Apply", selection, backdropOnly = false }: {
  choice: PolishChoice; onChange: (next: PolishChoice) => void; showText: boolean; busy: boolean; onRun: () => void; runLabel?: string;
  /** Which photos the free backdrop step will run on, with shortcuts to pick them all or none. */
  selection?: { count: number; total: number; onAll: () => void; onNone: () => void };
  /** Hide the steps that apply to the cover photo only (for a panel that works on selected photos alone). */
  backdropOnly?: boolean;
}) {
  const set = (patch: Partial<PolishChoice>) => onChange({ ...choice, ...patch });
  const stickers = choice.removeStickers && !backdropOnly;
  const cents = estimateCents({ removeStickers: stickers, text: showText && choice.text });
  const any = choice.removeBackground || stickers || (showText && choice.text);
  return (
    <div className="ad-polish" role="group" aria-label="Photo and text options">
      <label className="ad-check-inline">
        <input type="checkbox" checked={choice.removeBackground} onChange={(e) => set({ removeBackground: e.target.checked })} />
        Remove the green backdrop (transparent background){selection ? " from the selected photos" : ""} <span className="ad-polish__price ad-polish__price--free">free</span>
      </label>
      {selection && (
        <div className="ad-polish__select">
          <span className="ad-muted ad-sm">{selection.count === 0 ? "No photo selected: the cover photo is used." : `${selection.count} of ${selection.total} photo${selection.total === 1 ? "" : "s"} selected.`}</span>
          <button type="button" className="ad-link" onClick={selection.onAll} disabled={selection.count === selection.total}>Select all</button>
          <button type="button" className="ad-link" onClick={selection.onNone} disabled={selection.count === 0}>Select none</button>
        </div>
      )}
      {!backdropOnly && (
        <label className="ad-check-inline">
          <input type="checkbox" checked={choice.removeStickers} onChange={(e) => set({ removeStickers: e.target.checked })} />
          Paint over the shop price sticker (AI finds it, cover photo only) <span className="ad-polish__price">{costLabel(COST_CENTS.stickers)}</span>
        </label>
      )}
      {showText && (
        <label className="ad-check-inline">
          <input type="checkbox" checked={choice.text} onChange={(e) => set({ text: e.target.checked })} />
          Write the title, description, category and series (AI, from the cover photo) <span className="ad-polish__price">{costLabel(COST_CENTS.text)}</span>
        </label>
      )}
      {showText && stickers && choice.text && (
        <span className="ad-muted ad-sm">Both together are done in one request, which is cheaper than doing them separately ({costLabel(COST_CENTS.both)}).</span>
      )}
      <div className="ad-polish__run">
        <button type="button" className="sh-btn" disabled={!any || busy} onClick={onRun}>
          {busy ? "Working…" : `${runLabel} · ${costLabel(cents)}`}
        </button>
      </div>
    </div>
  );
}

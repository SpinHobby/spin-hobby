import { COST_CENTS, costLabel, estimateCents } from "./polish";

export interface PolishChoice { removeBackground: boolean; removeStickers: boolean; text: boolean }
/**
 * Choose what to do to a photo, with the price of each step shown before anything runs. Steps that cost money
 * are never on by default; combining the title with sticker removal is cheaper than doing the two separately.
 */
export function PolishOptions({ choice, onChange, showText, busy, onRun, runLabel = "Apply" }: {
  choice: PolishChoice; onChange: (next: PolishChoice) => void; showText: boolean; busy: boolean; onRun: () => void; runLabel?: string;
}) {
  const set = (patch: Partial<PolishChoice>) => onChange({ ...choice, ...patch });
  const cents = estimateCents({ removeStickers: choice.removeStickers, text: showText && choice.text });
  const any = choice.removeBackground || choice.removeStickers || (showText && choice.text);
  return (
    <div className="ad-polish" role="group" aria-label="Photo and text options">
      <label className="ad-check-inline">
        <input type="checkbox" checked={choice.removeBackground} onChange={(e) => set({ removeBackground: e.target.checked })} />
        Remove the green backdrop (transparent background) <span className="ad-polish__price ad-polish__price--free">free</span>
      </label>
      <label className="ad-check-inline">
        <input type="checkbox" checked={choice.removeStickers} onChange={(e) => set({ removeStickers: e.target.checked })} />
        Paint over the shop price sticker (AI finds it) <span className="ad-polish__price">{costLabel(COST_CENTS.stickers)}</span>
      </label>
      {showText && (
        <label className="ad-check-inline">
          <input type="checkbox" checked={choice.text} onChange={(e) => set({ text: e.target.checked })} />
          Write the title, description, category and series (AI) <span className="ad-polish__price">{costLabel(COST_CENTS.text)}</span>
        </label>
      )}
      {showText && choice.removeStickers && choice.text && (
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

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useEscape } from "../hooks";
import { barcodeFits, perSheet, renderSheets, sheetPng, SIZES, type LabelSize, type StickerLabel } from "./labelSheet";
import type { Ctx } from "./Screens";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

interface Label { id: string; name: string; series: string | null; code: string | null; upc: string | null; inSquare: boolean; stock: number | null }

/** The most stickers of one product when printing one per unit, so a typo in stock can't print a hundred sheets. */
const MAX_COPIES = 50;

/**
 * What goes on one product's sticker. The barcode is the SKU when it fits; a SKU too long for a scannable barcode at
 * this size falls back to the product's barcode number in Square (its POS finds items by that too); otherwise the
 * SKU is printed as text only.
 */
function sticker(l: Label, size: LabelSize): StickerLabel {
  if (l.code && barcodeFits(l.code, size)) return { name: l.name, series: l.series, code: l.code, barcode: l.code };
  if (l.upc && barcodeFits(l.upc, size)) return { name: l.name, series: l.series, code: l.upc, barcode: l.upc };
  return { name: l.name, series: l.series, code: l.code, barcode: null };
}

/**
 * Shelf stickers for the selected products, as sheets for a Cricut "Print Then Cut". Each sticker has the mascot,
 * "Available on spinhobby.com" and the product's SKU as a barcode, which the cashier scans or types in Square's POS.
 */
export function LabelsDialog({ productIds, ctx, onClose }: { productIds: string[]; ctx: Ctx; onClose: () => void }) {
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [assigned, setAssigned] = useState(0);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState<LabelSize>("small");
  const [perUnit, setPerUnit] = useState(false);
  const [sheets, setSheets] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState("");
  useEscape(onClose);

  const make = async () => {
    setBusy(true);
    try {
      const res = await api<{ labels: Label[]; assigned: number }>("/admin/products/labels", { method: "POST", body: JSON.stringify({ ids: productIds }) });
      setLabels(res.labels);
      setAssigned(res.assigned);
    } catch (e) { ctx.flash(errMsg(e)); } finally { setBusy(false); }
  };

  const printed = useMemo(() => (labels ?? []).flatMap((l) => {
    const copies = perUnit ? Math.min(Math.max(l.stock ?? 1, 1), MAX_COPIES) : 1;
    const one = sticker(l, size);
    return Array.from({ length: copies }, () => one);
  }), [labels, perUnit, size]);

  // Redraw the sheets whenever the labels, size or copies change.
  useEffect(() => {
    if (!printed.length) return;
    let cancelled = false;
    const urls: string[] = [];
    setDrawing(true);
    setDrawError("");
    renderSheets(printed, size)
      .then(async (canvases) => {
        for (const c of canvases) urls.push(URL.createObjectURL(await sheetPng(c)));
        if (!cancelled) setSheets(urls);
      })
      .catch((e) => { if (!cancelled) setDrawError(errMsg(e)); })
      .finally(() => { if (!cancelled) setDrawing(false); });
    return () => { cancelled = true; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [printed, size]);

  const download = (url: string, i: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `spinhobby-labels-${new Date().toISOString().slice(0, 10)}-sheet-${i + 1}.png`;
    a.click();
  };
  const downloadAll = async () => {
    for (const [i, url] of sheets.entries()) {
      download(url, i);
      await new Promise((r) => setTimeout(r, 400)); // browsers drop downloads fired all at once
    }
  };

  const noCode = (labels ?? []).filter((l) => !l.code);
  const notInSquare = (labels ?? []).filter((l) => l.code && !l.inSquare);
  const tooLong = (labels ?? []).filter((l) => l.code && !sticker(l, size).barcode);
  const capped = perUnit && (labels ?? []).some((l) => (l.stock ?? 0) > MAX_COPIES);

  return (
    <>
      <div className="sh-overlay" onClick={onClose} />
      <aside className="sh-drawer ad-labels-dialog" role="dialog" aria-modal="true" aria-label="Sticker labels">
        <div className="sh-drawer__head"><span>Sticker labels</span><button type="button" className="sh-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
        <div className="sh-drawer__body ad-labels">
          {!labels ? (
            <>
              <p><b>{productIds.length} product{productIds.length === 1 ? "" : "s"}</b> selected. Each sticker shows the mascot, “Available on spinhobby.com” and a barcode with the product’s code.</p>
              <p className="ad-muted ad-sm">The cashier scans the barcode, or types the code into the search box, in Square to find the exact listing. Square looks items up by SKU, so a product without one is given a short shop code (like SH-7K2QX9), saved to its SKU in Square. Products that already have a SKU keep it.</p>
              <div className="ad-imports__actions">
                <button type="button" className="sh-btn" disabled={busy} onClick={make}>{busy ? "Getting the codes…" : "Make labels"}</button>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <p className="ad-labels__big">{printed.length} sticker{printed.length === 1 ? "" : "s"} on {Math.max(1, Math.ceil(printed.length / perSheet(size)))} sheet{Math.ceil(printed.length / perSheet(size)) === 1 ? "" : "s"}</p>
              {assigned > 0 && <p className="ad-muted ad-sm">{assigned} product{assigned === 1 ? " was" : "s were"} given a new shop code, saved in Square.</p>}
              {noCode.length > 0 && (
                <details className="ad-photoq__skipped" open>
                  <summary>{noCode.length} without a code (deleted in Square): the sticker has no barcode</summary>
                  <ul>{noCode.map((l) => <li key={l.id}>{l.name}</li>)}</ul>
                </details>
              )}
              {tooLong.length > 0 && (
                <details className="ad-photoq__skipped">
                  <summary>{tooLong.length} SKU{tooLong.length === 1 ? " is" : "s are"} too long for a barcode at this size and {tooLong.length === 1 ? "has" : "have"} no barcode number in Square: the code is printed as text{size === "small" ? " (try Large)" : ""}</summary>
                  <ul>{tooLong.map((l) => <li key={l.id}>{l.name}: {l.code}</li>)}</ul>
                </details>
              )}
              {notInSquare.length > 0 && (
                <details className="ad-photoq__skipped">
                  <summary>{notInSquare.length} only on the website (not in Square): the cashier can’t ring {notInSquare.length === 1 ? "it" : "them"} up in Square</summary>
                  <ul>{notInSquare.map((l) => <li key={l.id}>{l.name}</li>)}</ul>
                </details>
              )}

              <div className="ad-label">Size</div>
              {(Object.keys(SIZES) as LabelSize[]).map((k) => (
                <label key={k} className="ad-check"><input type="radio" name="label-size" checked={size === k} onChange={() => setSize(k)} /> {SIZES[k].name} <small className="ad-muted">({perSheet(k)} per sheet)</small></label>
              ))}
              <div className="ad-label">How many</div>
              <label className="ad-check"><input type="radio" name="label-copies" checked={!perUnit} onChange={() => setPerUnit(false)} /> One per product</label>
              <label className="ad-check"><input type="radio" name="label-copies" checked={perUnit} onChange={() => setPerUnit(true)} /> One per unit in stock <small className="ad-muted">(at least one each{capped ? `, at most ${MAX_COPIES}` : ""})</small></label>

              <div className="ad-labels__sheets" aria-busy={drawing}>
                {drawing && !sheets.length && <div className="ad-muted">Drawing the sheets…</div>}
                {drawError && <div className="ad-error">{drawError}</div>}
                {sheets.map((url, i) => (
                  <figure key={url} className="ad-labels__sheet">
                    <img src={url} alt={`Sheet ${i + 1}`} />
                    <figcaption><button type="button" className="ad-link" onClick={() => download(url, i)}>Download sheet {i + 1}</button></figcaption>
                  </figure>
                ))}
              </div>
              <div className="ad-imports__actions">
                <button type="button" className="sh-btn" disabled={!sheets.length || drawing} onClick={downloadAll}>Download {sheets.length > 1 ? `all ${sheets.length} sheets` : "the sheet"}</button>
                <button type="button" className="sh-btn sh-btn--ghost" onClick={onClose}>Done</button>
              </div>

              <details className="ad-labels__howto" open>
                <summary>Cutting them on the Cricut</summary>
                <ol>
                  <li>In Cricut Design Space: <b>New project → Upload → Upload image</b>, pick a sheet, choose <b>Complex</b>, press <b>Continue</b> (the background is already see-through), then choose <b>Print Then Cut image</b> and <b>Upload</b>.</li>
                  <li>Add it to the canvas and set its width to exactly <b>6.75 in</b> (keep the padlock closed, so the height becomes 9.25 in). This keeps the barcodes the right size.</li>
                  <li>Press <b>Make it</b>, then <b>Send to printer</b>: load sticker paper, turn <b>Add bleed</b> on and <b>Use system dialog</b> on, and print at 100% (actual size, no “fit to page”).</li>
                  <li>Put the printed sheet on the mat (top left), pick <b>Sticker Paper</b> as the material and let the Cricut cut around each sticker.</li>
                </ol>
                <p className="ad-muted ad-sm">Try one sticker at the till first: scan it in Square and check the right product comes up.</p>
              </details>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

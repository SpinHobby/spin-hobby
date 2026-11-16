import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/** A product's own rewards rule, as GET/PUT /admin/rewards/products/:id return it (null: normal points, nothing asked). */
interface Rule {
  multiplier: number;
  endsAt: string | null;
  note: string | null;
  minEarnedPoints: number | null;
  minOtherCents: number | null;
}
type Kind = "normal" | "bonus" | "none";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const kindOf = (r: Rule | null): Kind => (!r || r.multiplier === 1 ? "normal" : r.multiplier === 0 ? "none" : "bonus");
/** A saved end time as the date picker's day, in the browser's time zone. */
const toDay = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Admin > product > Rewards points: how this product earns (normal, a bonus such as ×2 until a date, or none for a rare piece) and
 * what it asks of a buyer (points from past orders, or other items in the same order), for a hyped release sold at MSRP. Saved on its
 * own, apart from the product's other fields. Owners change it; staff can see it.
 */
export function ProductPoints({ productId, isOwner }: { productId: string; isOwner: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [kind, setKind] = useState<Kind>("normal");
  const [multiplier, setMultiplier] = useState("2");
  const [ends, setEnds] = useState("");
  const [minPoints, setMinPoints] = useState("");
  const [minOther, setMinOther] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const show = (r: Rule | null) => {
    setKind(kindOf(r));
    setMultiplier(r && r.multiplier > 1 ? String(r.multiplier) : "2");
    setEnds(toDay(r?.endsAt ?? null));
    setMinPoints(r?.minEarnedPoints ? String(r.minEarnedPoints) : "");
    setMinOther(r?.minOtherCents ? (r.minOtherCents / 100).toFixed(2) : "");
    setNote(r?.note ?? "");
  };

  useEffect(() => {
    let current = true;
    setLoaded(false);
    api<{ rule: Rule | null }>(`/admin/rewards/products/${encodeURIComponent(productId)}`)
      .then((r) => {
        if (!current) return;
        show(r.rule);
        setLoaded(true);
      })
      .catch(() => current && setLoaded(true)); // shows "Normal"; saving still works
    return () => {
      current = false;
    };
  }, [productId]);

  const save = async () => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await api<{ rule: Rule | null }>(`/admin/rewards/products/${encodeURIComponent(productId)}`, {
        method: "PUT",
        body: JSON.stringify({
          multiplier: kind === "normal" ? 1 : kind === "none" ? 0 : Number(multiplier),
          endsAt: kind === "bonus" && ends ? new Date(`${ends}T23:59:59`).toISOString() : null,
          note: note.trim() || null,
          minEarnedPoints: minPoints ? Number(minPoints) : null,
          minOtherCents: minOther ? Math.round(Number(minOther) * 100) : null,
        }),
      });
      show(r.rule);
      setMsg({ ok: true, text: "Rewards points saved." });
    } catch (e) {
      setMsg({ ok: false, text: errMsg(e) });
    } finally {
      setBusy(false);
    }
  };

  const off = !isOwner || !loaded || busy;
  return (
    <fieldset className="ad-points" disabled={!isOwner}>
      <legend className="ad-label">Rewards points</legend>
      <p className="ad-muted ad-sm" style={{ margin: 0 }}>
        How this product earns points, and who can buy it. Requirements keep a hyped release sold at MSRP away from scalpers.
        {!isOwner && " Only the owner can change this."}
      </p>
      <div className="ad-grid2">
        <label className="ad-field">
          Points
          <select className="sh-input" value={kind} onChange={(e) => setKind(e.target.value as Kind)} disabled={off}>
            <option value="normal">Normal</option>
            <option value="bonus">Bonus (promotion)</option>
            <option value="none">No points</option>
          </select>
        </label>
        {kind === "bonus" && (
          <>
            <label className="ad-field">
              Times the normal points
              <input
                className="sh-input"
                inputMode="decimal"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="2"
                disabled={off}
              />
            </label>
            <label className="ad-field">
              Bonus ends (optional)
              <input className="sh-input" type="date" value={ends} onChange={(e) => setEnds(e.target.value)} disabled={off} />
            </label>
          </>
        )}
        <label className="ad-field">
          Points from past orders needed
          <input
            className="sh-input"
            inputMode="numeric"
            placeholder="Anyone can buy it"
            value={minPoints}
            onChange={(e) => setMinPoints(e.target.value.replace(/\D/g, ""))}
            disabled={off}
          />
        </label>
        <label className="ad-field">
          Other items in the same order
          <input
            className="sh-input"
            inputMode="decimal"
            placeholder="No minimum"
            value={minOther}
            onChange={(e) => setMinOther(e.target.value.replace(/[^\d.]/g, ""))}
            disabled={off}
          />
        </label>
        <label className="ad-field">
          Note for the team (optional)
          <input
            className="sh-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Double points week"
            disabled={off}
          />
        </label>
      </div>
      <p className="ad-muted ad-sm" style={{ margin: 0 }}>
        "Points from past orders" counts only points earned on shop orders, less refunds, so points from games or gifts can't unlock it.
        "Other items" is in dollars, not counting other products that have requirements. Requirements apply even while rewards are off.
      </p>
      {isOwner && (
        <div className="ad-points__actions">
          <button type="button" className="sh-btn sh-btn--ghost" onClick={save} disabled={off}>
            {busy ? "Saving…" : "Save rewards points"}
          </button>
          {msg && (
            <span className={msg.ok ? "ad-muted ad-sm" : "ad-error"} role={msg.ok ? "status" : "alert"}>
              {msg.text}
            </span>
          )}
        </div>
      )}
    </fieldset>
  );
}

import { useEffect, useState } from "react";
import { api, getSession, onSessionChange } from "../../lib/api";
import { dateLabel, price } from "../format";

/** GET /products/:id/points */
interface ProductPoints {
  enabled: boolean;
  points?: number;
  multiplier?: number;
  endsAt?: string | null;
  requirement: { minEarnedPoints: number | null; minOtherCents: number | null } | null;
  /** The signed-in customer's points from past orders (only when the product asks for some). */
  earned: number | null;
  /** Whether the signed-in customer confirmed their email (only when the product asks for points); limited items need it. */
  emailConfirmed?: boolean | null;
}

const pts = (n: number) => n.toLocaleString("en-CA");

/**
 * The product page's rewards line: what one unit earns ("★ Earn 117 points", a bonus, or none), and what the product asks of a buyer
 * (points from past orders, or other items in the same order). The cart and checkout enforce the same rules on the server.
 */
export function ProductPointsLine({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductPoints | null>(null);
  // signing in or out changes whether "you can buy it" can be shown
  const [who, setWho] = useState(() => getSession()?.user.id ?? null);
  useEffect(() => onSessionChange((s) => setWho(s?.user.id ?? null)), []);
  useEffect(() => {
    let current = true;
    setData(null);
    api<ProductPoints>(`/products/${encodeURIComponent(productId)}/points`)
      .then((r) => current && setData(r))
      .catch(() => undefined); // nothing shown is better than a wrong promise
    return () => {
      current = false;
    };
  }, [productId, who]);
  if (!data) return null;

  const req = data.requirement;
  const bonus = data.enabled && (data.multiplier ?? 1) > 1;
  return (
    <>
      {req && (
        <div className="sf-pp__notice sf-pp-req" role="note">
          <b>Who can buy this</b>
          <ul>
            {req.minEarnedPoints && (
              <li>
                Customers with {pts(req.minEarnedPoints)} points from past orders.{" "}
                {data.earned !== null ? (
                  data.earned >= req.minEarnedPoints ? (
                    data.emailConfirmed === false ? (
                      <>
                        You have {pts(data.earned)}. <a href="/rewards">Confirm your email</a> to buy it.
                      </>
                    ) : (
                      <span className="sf-pp-req__ok">You have {pts(data.earned)}: you can buy it.</span>
                    )
                  ) : (
                    <>You have {pts(data.earned)}.</>
                  )
                ) : (
                  <>Sign in to check yours.</>
                )}
              </li>
            )}
            {req.minOtherCents && <li>With at least {price(req.minOtherCents)} of other items in the same order.</li>}
          </ul>
        </div>
      )}
      {data.enabled && data.multiplier === 0 && <p className="sf-pp-points sf-pp-points--none">No rewards points on this item.</p>}
      {data.enabled && !!data.points && (
        <p className="sf-pp-points">
          <span aria-hidden>★</span> Earn <b>{pts(data.points)} points</b>
          {bonus && (
            <span className="sf-pp-points__bonus">
              {" "}
              ({data.multiplier}× points{data.endsAt ? ` until ${dateLabel(data.endsAt)}` : ""})
            </span>
          )}{" "}
          <a href="/rewards">Rewards</a>
        </p>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/** What rewards points are called in the header. If the points get a name of their own, change it here. */
export const POINTS_SHORT = "pts";

/**
 * The storefront header's points: a small "★ 720 pts" link to /rewards, beside the account button. Shown only to a signed-in customer
 * while rewards are on (Admin > Rewards); one quick read of GET /account/rewards/balance when the email changes.
 */
export function PointsChip({ email }: { email: string | null }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  useEffect(() => {
    setBalance(null);
    if (!email) return;
    let current = true;
    api<{ enabled: boolean; balance: number; pending?: number }>("/account/rewards/balance")
      .then((r) => {
        if (!current) return;
        setBalance(r.enabled ? r.balance : null);
        setPending(r.pending ?? 0);
      })
      .catch(() => undefined); // no chip is better than a broken one
    return () => {
      current = false;
    };
  }, [email]);
  if (balance === null) return null;
  const n = balance.toLocaleString("en-CA");
  return (
    <a
      className="sf-head-link sf-points"
      href="/rewards"
      title={`${n} rewards points${pending ? ` (+${pending.toLocaleString("en-CA")} on the way)` : ""}`}
      aria-label={`Rewards: ${n} points`}
    >
      <span aria-hidden>★</span>
      {n}
      <span className="sf-points__unit">{POINTS_SHORT}</span>
    </a>
  );
}

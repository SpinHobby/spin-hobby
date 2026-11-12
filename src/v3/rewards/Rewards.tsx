import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import "./rewards.scss";
import { api } from "../../lib/api";
import { dateLabel, money } from "../format";
import { useAuth } from "../hooks";
import { useDocumentHead } from "../seo";
import { SignInPanel } from "../SignIn";

/** GET /account/rewards */
export interface RewardsSummary {
  enabled: boolean;
  balance: number;
  /** Points from orders that haven't shipped, or are still inside their return window. */
  pending: number;
  worthCents: number;
  rates: { pointsPerDollar: number; centsPer100Points: number; minRedeemPoints: number; returnWindowDays: number };
  entries: {
    id: string;
    app: string;
    appName: string;
    points: number;
    reason: string;
    createdAt: string;
    /** On the way: not usable yet; `availableAt` is null until the order ships. */
    pending: boolean;
    availableAt: string | null;
  }[];
  links: { app: string; name: string; linkedAt: string }[];
  codes: { code: string; valueCents: number; points: number; endsAt: string | null }[];
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
const pts = (n: number) => n.toLocaleString("en-CA");
const worth = (points: number, centsPer100: number) => Math.floor((Math.max(0, points) * centsPer100) / 100);

/**
 * /rewards: a signed-in customer's points, one balance shared by the shop and every Spin Hobby app. Shows the balance and history,
 * turns points into a one-time discount code, and links other apps with a short code. The rules live on the server (docs/REWARDS.md).
 */
export default function Rewards() {
  const { pathname } = useLocation();
  useDocumentHead({
    title: "Rewards | Spin Hobby",
    description: "Earn points on every Spin Hobby order and in Spin Hobby apps, and use them for money off.",
    path: pathname,
  });
  const auth = useAuth();
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<RewardsSummary>("/account/rewards")
      .then(setData)
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(() => {
    if (auth.session) load();
  }, [auth.session, load]);

  return (
    <main className="rw-wrap">
      <p className="sh-eyebrow">Rewards</p>
      <h1>Points on everything you buy</h1>
      {!auth.ready ? null : !auth.session ? (
        <>
          <p className="rw-lead">
            Sign in or create an account to earn points on your orders, and in Spin Hobby apps, and use them for money off.
          </p>
          <div className="rw-signin">
            <SignInPanel allowSignup returnPath="/rewards" />
          </div>
        </>
      ) : error ? (
        <p className="rw-error" role="alert">
          {error}{" "}
          <button type="button" className="rw-link" onClick={load}>
            Try again
          </button>
        </p>
      ) : !data ? (
        <div className="sh-skeleton" style={{ height: 120 }} />
      ) : (
        <Signed data={data} reload={load} />
      )}
    </main>
  );
}

function Signed({ data, reload }: { data: RewardsSummary; reload: () => void }) {
  const { rates } = data;
  return (
    <>
      <p className="rw-lead">
        {data.enabled ? (
          <>
            You get {pts(rates.pointsPerDollar)} point{rates.pointsPerDollar === 1 ? "" : "s"} for every dollar you spend on goods, and
            points from Spin Hobby apps you link. {pts(100)} points are worth {money(rates.centsPer100Points)} off. Points from an order can
            be used {rates.returnWindowDays ? `${rates.returnWindowDays} days after it ships` : "once it ships"}.
          </>
        ) : (
          <>Rewards are paused right now. Your points are safe and you can use them when rewards are back.</>
        )}
      </p>

      <section className="rw-balance" aria-label="Your points">
        <div>
          <span className="rw-balance__n">{pts(data.balance)}</span>
          <span className="rw-balance__label">points</span>
        </div>
        <span className="rw-balance__worth">worth {money(data.worthCents)}</span>
        {data.pending > 0 && (
          <span className="rw-balance__pending">+ {pts(data.pending)} on the way, from orders not yet shipped or still returnable</span>
        )}
      </section>

      {data.enabled && <Redeem data={data} onDone={reload} />}

      {data.codes.length > 0 && (
        <>
          <h2 className="rw-h2">Your codes</h2>
          <ul className="rw-codes">
            {data.codes.map((c) => (
              <li key={c.code}>
                <CopyCode code={c.code} />
                <span>
                  {money(c.valueCents)} off one order{c.endsAt ? `, until ${dateLabel(c.endsAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Apps data={data} onChanged={reload} />

      <h2 className="rw-h2">History</h2>
      {data.entries.length === 0 ? (
        <p className="rw-muted">No points yet. Your next order will start you off.</p>
      ) : (
        <ul className="rw-history">
          {data.entries.map((e) => (
            <li key={e.id}>
              <span>
                <b>{e.reason}</b>
                <span className="rw-muted">
                  {e.appName} · {dateLabel(e.createdAt)}
                  {e.pending && (
                    <span className="rw-pending">
                      {" "}
                      · On the way, {e.availableAt ? `usable from ${dateLabel(e.availableAt)}` : "usable after it ships"}
                    </span>
                  )}
                </span>
              </span>
              <b className={e.points < 0 ? "rw-minus" : "rw-plus"}>{e.points > 0 ? `+${pts(e.points)}` : pts(e.points)}</b>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Redeem({ data, onDone }: { data: RewardsSummary; onDone: () => void }) {
  const { rates } = data;
  // the most that can be used, in whole hundreds
  const most = Math.floor(Math.max(0, data.balance) / 100) * 100;
  const [points, setPoints] = useState(String(Math.max(rates.minRedeemPoints, Math.min(most, rates.minRedeemPoints))));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ code: string; valueCents: number } | null>(null);
  const n = Number(points) || 0;

  if (data.balance < rates.minRedeemPoints && !made)
    return (
      <p className="rw-muted">
        You can use points once you have {pts(rates.minRedeemPoints)} ({money(worth(rates.minRedeemPoints, rates.centsPer100Points))} off).
      </p>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await api<{ code: string; valueCents: number }>("/account/rewards/redeem", {
        method: "POST",
        body: JSON.stringify({ points: n }),
      });
      setMade(r);
      onDone();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (made)
    return (
      <div className="rw-made" role="status">
        <p>Here is your code for {money(made.valueCents)} off. Type it at checkout. It works once.</p>
        <CopyCode code={made.code} />
        <button type="button" className="rw-link" onClick={() => setMade(null)}>
          Done
        </button>
      </div>
    );

  return (
    <form className="rw-redeem" onSubmit={submit}>
      <label>
        <span>Points to use</span>
        <input
          className="sh-input"
          inputMode="numeric"
          value={points}
          onChange={(e) => setPoints(e.target.value.replace(/\D/g, ""))}
          aria-describedby="rw-redeem-worth"
        />
      </label>
      <span id="rw-redeem-worth" className="rw-muted">
        = {money(worth(n, rates.centsPer100Points))} off
      </span>
      <button className="sh-btn" disabled={busy || n < rates.minRedeemPoints || n > data.balance}>
        {busy ? "Making code…" : "Get a code"}
      </button>
      {error && (
        <span className="rw-error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

function Apps({ data, onChanged }: { data: RewardsSummary; onChanged: () => void }) {
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeCode = async () => {
    setError(null);
    setBusy(true);
    try {
      setCode(await api<{ code: string; expiresAt: string }>("/account/rewards/link-code", { method: "POST" }));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const unlink = async (app: string, name: string) => {
    if (!window.confirm(`Unlink ${name}? It won't be able to give or use your points until you link it again.`)) return;
    try {
      await api(`/account/rewards/links/${encodeURIComponent(app)}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <>
      <h2 className="rw-h2">Spin Hobby apps</h2>
      <p className="rw-muted">
        Link an app (like Gleamshelf or one of our games) to earn and use these same points there. The app never sees your email.
      </p>
      {data.links.length > 0 && (
        <ul className="rw-history">
          {data.links.map((l) => (
            <li key={l.app}>
              <span>
                <b>{l.name}</b>
                <span className="rw-muted">Linked {dateLabel(l.linkedAt)}</span>
              </span>
              <button type="button" className="rw-link" onClick={() => unlink(l.app, l.name)}>
                Unlink
              </button>
            </li>
          ))}
        </ul>
      )}
      {code ? (
        <div className="rw-made" role="status">
          <p>Type this code into the app within 15 minutes:</p>
          <CopyCode code={code.code} />
          <button
            type="button"
            className="rw-link"
            onClick={() => {
              setCode(null);
              onChanged();
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <button type="button" className="sh-btn sh-btn--ghost" onClick={makeCode} disabled={busy}>
          {busy ? "Making a code…" : "Link an app"}
        </button>
      )}
      {error && (
        <p className="rw-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="rw-code">
      <code>{code}</code>
      <button
        type="button"
        className="rw-link"
        onClick={() =>
          navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

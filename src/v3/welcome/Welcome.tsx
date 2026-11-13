import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth, useEscape } from "../hooks";
import type { AppUser } from "../types";
import { EmailCode } from "./EmailCode";
import { reloadUser } from "./reloadUser";
import "./welcome.scss";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * Right after signing up: 1) confirm the email with the code we sent, 2) a few optional details (phone, pre-order news, the series
 * they collect). Everything can be skipped; shopping never waits for it. Closing it in any way marks the welcome as seen, so it
 * doesn't come back on every page; the email can still be confirmed later from Rewards or a limited item.
 */
export function Welcome({ user, onClose }: { user: AppUser; onClose: () => void }) {
  const [step, setStep] = useState<"code" | "details">(user.emailVerified ? "details" : "code");
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [news, setNews] = useState(false);
  const [series, setSeries] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ series: string[] }>("/follows/series")
      .then((r) => setSeries(r.series.slice(0, 16)))
      .catch(() => setSeries([]));
  }, []);

  // Any way out (Skip, ×, Escape, the backdrop) marks the welcome as seen.
  const finish = async (body: object = {}) => {
    try {
      await api("/account/profile", { method: "PATCH", body: JSON.stringify(body) });
      await reloadUser();
    } catch {
      /* seen or not, the customer carries on shopping */
    }
    onClose();
  };
  useEscape(() => void finish());

  const toggle = (name: string) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/account/profile", {
        method: "PATCH",
        body: JSON.stringify({ firstName: firstName.trim() || undefined, phone: phone.trim() }),
      });
      const follow = (kind: "all" | "series", name = "") =>
        api("/follows", { method: "POST", body: JSON.stringify({ email: user.email, kind, name }) });
      if (news) await follow("all");
      for (const name of picked) await follow("series", name);
      await reloadUser();
      onClose();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  const name = user.firstName?.trim();
  return (
    <>
      <div className="sh-overlay sh-welcome-backdrop" onClick={() => void finish()} />
      <div className="sh-welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="sh-welcome__head">
          <span className="sh-eyebrow">{step === "code" ? "Step 1 of 2" : user.emailVerified ? "Almost done" : "Step 2 of 2"}</span>
          <button type="button" className="sh-icon-btn" onClick={() => void finish()} aria-label="Close">
            ×
          </button>
        </div>

        {step === "code" ? (
          <>
            <h2 id="welcome-title" className="sh-display">
              {name ? `Welcome, ${name}! Confirm your email` : "Welcome! Confirm your email"}
            </h2>
            <p>You can shop right away. Confirming your email lets you use rewards points and buy limited releases.</p>
            <EmailCode email={user.email} sent onConfirmed={() => setStep("details")} />
            <button type="button" className="sh-welcome__later" onClick={() => setStep("details")}>
              Do this later
            </button>
          </>
        ) : (
          <form className="sh-welcome__form" onSubmit={save}>
            <h2 id="welcome-title" className="sh-display">
              {user.emailVerified ? "Email confirmed. A few optional details" : "A few optional details"}
            </h2>
            <label className="sh-welcome__field">
              First name
              <input
                className="sh-input"
                autoComplete="given-name"
                maxLength={80}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label className="sh-welcome__field">
              Phone (optional)
              <input
                className="sh-input"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="416 555 0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <small>Only for delivery questions. We never call to sell.</small>
            </label>
            <label className="sh-welcome__check">
              <input type="checkbox" checked={news} onChange={(e) => setNews(e.target.checked)} />
              <span>Email me new pre-orders once a week. Stop any time.</span>
            </label>
            {series.length > 0 && (
              <fieldset className="sh-welcome__series">
                <legend>What do you collect? We'll email you when new pre-orders arrive.</legend>
                <div>
                  {series.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`sh-chip ${picked.has(s) ? "is-active" : ""}`}
                      aria-pressed={picked.has(s)}
                      onClick={() => toggle(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {error && (
              <span className="sh-code__error" role="alert">
                {error}
              </span>
            )}
            <button className="sh-btn" disabled={busy}>
              {busy ? "Saving…" : "Save and start shopping"}
            </button>
            <button type="button" className="sh-welcome__later" onClick={() => void finish()} disabled={busy}>
              Skip
            </button>
          </form>
        )}
      </div>
    </>
  );
}

/**
 * Shows the welcome step on pages outside the shop (Rewards, support…) for an account that hasn't seen it yet; the shop has its
 * own (Storefront.tsx), which also greets returning customers.
 */
export function WelcomeGate() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  if (!user || user.welcomed !== false || done) return null;
  return <Welcome user={user} onClose={() => setDone(true)} />;
}

import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import { reloadUser } from "./reloadUser";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

/**
 * "Enter the 6-digit code we emailed": the box, Confirm, and Send a new code. Used by the welcome step after sign-up, and wherever a
 * confirmed email is needed (Rewards, a limited item). `sent` says a code already went out (sign-up sends the first one).
 */
export function EmailCode({ email, sent = false, onConfirmed }: { email: string; sent?: boolean; onConfirmed: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState(sent ? `We sent a 6-digit code to ${email}.` : "");
  const [hasCode, setHasCode] = useState(sent);

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      const r = await api<{ verified: boolean }>("/auth/email-code", { method: "POST" });
      if (r.verified) {
        await reloadUser();
        onConfirmed();
        return;
      }
      setHasCode(true);
      setNote(`We sent a new code to ${email}. It works for 30 minutes.`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/auth/email-code/confirm", { method: "POST", body: JSON.stringify({ code }) });
      await reloadUser();
      onConfirmed();
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  };

  if (!hasCode)
    return (
      <div className="sh-code">
        <p className="sh-code__note">We'll email a 6-digit code to {email}.</p>
        <button type="button" className="sh-btn" onClick={send} disabled={busy}>
          {busy ? "Sending…" : "Email me a code"}
        </button>
        {error && (
          <span className="sh-code__error" role="alert">
            {error}
          </span>
        )}
      </div>
    );

  return (
    <form className="sh-code" onSubmit={confirm}>
      {note && <p className="sh-code__note">{note}</p>}
      <input
        className="sh-input sh-code__input"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]{6,7}"
        maxLength={7}
        required
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
        aria-label="6-digit code"
        autoFocus
      />
      <button className="sh-btn" disabled={busy || code.replace(/\D/g, "").length !== 6}>
        {busy ? "Checking…" : "Confirm email"}
      </button>
      {error && (
        <span className="sh-code__error" role="alert">
          {error}
        </span>
      )}
      <span className="sh-code__again">
        No email? Check spam, or{" "}
        <button type="button" className="sh-signin__inline" onClick={send} disabled={busy}>
          send a new code
        </button>
        .
      </span>
    </form>
  );
}

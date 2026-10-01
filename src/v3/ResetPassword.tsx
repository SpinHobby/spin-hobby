import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./tokens.scss";
import "./legal/legal.scss";
import { completeOAuthRedirect, updatePassword } from "../lib/api";
import { useTheme } from "./hooks";

const LOGO = "/logo/logo%20cropped.png";

type Status = "checking" | "ready" | "expired" | "done";

/** Where Supabase sends the browser back to after a password-recovery email link. */
export default function ResetPassword() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    completeOAuthRedirect().then((result) => {
      setStatus(result?.type === "recovery" && !result.error ? "ready" : "expired");
    });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await updatePassword(password);
      setStatus("done");
      window.setTimeout(() => navigate("/admin"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sh lg">
      <header className="lg-header">
        <a href="/" className="lg-logo"><img src={LOGO} alt="Spin Hobby" /></a>
        <button type="button" className="sh-icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle dark mode">
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      <div className="lg-wrap">
        {status === "checking" && <p>Checking your link…</p>}

        {status === "expired" && (
          <>
            <h1>This link has expired</h1>
            <p className="lg-updated">Password-reset links are only valid for a short time. Ask for a new one from the sign-in screen.</p>
            <a className="lg-back" href="/admin">← Back to sign in</a>
          </>
        )}

        {status === "ready" && (
          <>
            <h1>Set a new password</h1>
            <p className="lg-updated">Choose a new password for your account.</p>
            <form className="sh-signin__form" onSubmit={submit} style={{ maxWidth: 360 }}>
              <input className="sh-input" type="password" required minLength={8} autoComplete="new-password"
                placeholder="New password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} aria-label="New password" />
              <button className="sh-btn" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
            </form>
            {error && <div className="sh-signin__error" role="alert">{error}</div>}
          </>
        )}

        {status === "done" && (
          <>
            <h1>Password updated</h1>
            <p className="lg-updated">Taking you to the admin sign-in…</p>
          </>
        )}
      </div>
    </div>
  );
}

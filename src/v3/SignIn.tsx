import { FormEvent, useEffect, useState } from "react";
import PasswordInput from "./PasswordInput";
import { authProviders, requestPasswordReset, signIn, signInWithPassword, signUpWithPassword, type AuthProviders, type OAuthProvider } from "../lib/api";

const LABEL: Record<OAuthProvider, string> = { google: "Continue with Google", discord: "Continue with Discord" };

/** Sign-in options that adapt to whichever providers are enabled in Supabase Auth. */
export function SignInPanel({ returnPath, compact = false, allowSignup = false }: { returnPath?: string; compact?: boolean; allowSignup?: boolean }) {
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => { authProviders().then(setProviders); }, []);

  const oauth = (p: OAuthProvider) => { setError(""); signIn(p, returnPath).catch((e: Error) => setError(e.message)); };

  const submitForgot = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await requestPasswordReset(email, `${window.location.origin}/reset-password`);
      setForgotSent(true);
    } catch (err) { setError(friendly(err)); }
    finally { setBusy(false); }
  };

  // Email + password only: no emails are sent (Supabase's built-in mailer is heavily rate-limited).
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (signingUp) await signUpWithPassword(email, password, firstName);
      else await signInWithPassword(email, password); // useAuth picks up the new session
    } catch (err) { setError(friendly(err)); }
    finally { setBusy(false); }
  };
  const switchMode = () => { setMode((m) => (m === "signin" ? "signup" : "signin")); setError(""); };

  if (!providers) return <div className="sh-skeleton" style={{ height: 44 }} />;
  const oauthOn = (["google", "discord"] as OAuthProvider[]).filter((p) => providers[p]);
  const canSignup = allowSignup && providers.password && Boolean(providers.signup);
  const signingUp = canSignup && mode === "signup";
  // Staging: the admin username goes in the email box (sign-up still needs a real email).
  const usernameOk = Boolean(providers.username) && !signingUp;

  if (forgot) {
    return (
      <div className={`sh-signin ${compact ? "sh-signin--compact" : ""}`}>
        {forgotSent ? (
          <div className="sh-signin__sent">Check your email for a reset link.</div>
        ) : (
          <form className="sh-signin__form" onSubmit={submitForgot}>
            <input className="sh-input" type="email" required autoComplete="email"
              placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
            <button className="sh-btn" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          </form>
        )}
        <div className="sh-signin__switch">
          <button type="button" onClick={() => { setForgot(false); setForgotSent(false); setError(""); }}>← Back to sign in</button>
        </div>
        {error && <div className="sh-signin__error" role="alert">{error}</div>}
      </div>
    );
  }

  return (
    <div className={`sh-signin ${compact ? "sh-signin--compact" : ""}`}>
      {oauthOn.map((p, i) => (
        <button key={p} type="button" className={`sh-btn ${i ? "sh-btn--ghost" : ""} sh-signin__oauth`} onClick={() => oauth(p)}>
          {p === "google" && <GoogleMark />}{LABEL[p]}
        </button>
      ))}
      {providers.password && (
        <>
          {oauthOn.length > 0 && <div className="sh-signin__or"><span>or</span></div>}
          <form className="sh-signin__form" onSubmit={submit}>
            {signingUp && (
              <input className="sh-input" type="text" autoComplete="given-name" placeholder="First name (optional)" maxLength={80} value={firstName} onChange={(e) => setFirstName(e.target.value)} aria-label="First name" />
            )}
            <input className="sh-input" type={usernameOk ? "text" : "email"} required autoComplete={usernameOk ? "username" : "email"}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" enterKeyHint="next"
              placeholder={usernameOk ? "Email or username" : "you@example.com"} value={email} onChange={(e) => setEmail(e.target.value)} aria-label={usernameOk ? "Email or username" : "Email"} />
            <PasswordInput required enterKeyHint="go" autoCapitalize="none" autoCorrect="off" spellCheck={false} minLength={signingUp ? 8 : undefined} autoComplete={signingUp ? "new-password" : "current-password"}
              placeholder={signingUp ? "Password (8+ characters)" : "Password"} value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" />
            <button className={`sh-btn ${oauthOn.length ? "sh-btn--ghost" : ""}`} disabled={busy}>
              {signingUp ? (busy ? "Creating account…" : "Create account") : (busy ? "Signing in…" : "Sign in")}
            </button>
          </form>
          {!signingUp && (
            <div className="sh-signin__switch">
              <button type="button" onClick={() => { setForgot(true); setError(""); }}>Forgot password?</button>
            </div>
          )}
          {canSignup && (
            <div className="sh-signin__switch">
              {signingUp ? "Already have an account?" : "New to Spin Hobby?"}{" "}
              <button type="button" onClick={switchMode}>{signingUp ? "Sign in" : "Create an account"}</button>
            </div>
          )}
        </>
      )}
      {!providers.password && oauthOn.length === 0 && <div className="sh-signin__error">Sign-in isn't set up yet.</div>}
      {providers.dev && <div className="sh-signin__sent">Local dev: <b>owner@spinhobby.test</b> / <b>spinhobby</b></div>}
      {error && <div className="sh-signin__error" role="alert">{error}</div>}
    </div>
  );
}

function friendly(err: unknown) {
  const m = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/email not confirmed/i.test(m)) return "This account isn't activated yet. Ask the store owner to confirm it.";
  if (/rate limit|too many/i.test(m) && !/sign-ups/i.test(m)) return "Too many attempts. Wait a few minutes and try again.";
  return m;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden style={{ background: "#fff", borderRadius: 4, padding: 1 }}>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z" />
      <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banner, Button, Card, Field, Form, TextField } from "@/components";
import { updatePassword } from "@/lib/api";
import PasswordInput from "../PasswordInput";
import type { AppUser } from "../types";

// The server's rule too (MIN_PASSWORD_LENGTH in the server's new-password.ts); checked here so the message shows before sending.
const MIN_PASSWORD_LENGTH = 8;

/** The Profile tab: who you are, a new password, and signing out. */
export function Profile({ user, onSignOut }: { user: AppUser; onSignOut: () => void }) {
  const navigate = useNavigate();

  return (
    <>
      {/* Read-only for now: editing the name waits for the server's PUT /account/profile (spin-hobby-server #99). */}
      <Card title="Your details" padded>
        <TextField label="First name" value={user.firstName ?? ""} placeholder="Not set" readOnly />
        <TextField label="Email" type="email" value={user.email} readOnly />
      </Card>

      <ChangePassword email={user.email} />

      <Card title="Sign out" padded>
        <p>Sign out of your account on this device.</p>
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              onSignOut();
              navigate("/", { replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>
    </>
  );
}

function ChangePassword({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [result, setResult] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (password.length < MIN_PASSWORD_LENGTH) next.password = `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`;
    else if (confirm !== password) next.confirm = "The passwords don't match.";
    setErrors(next);
    setResult(null);
    if (next.password || next.confirm) return;

    setSaving(true);
    try {
      await updatePassword(password);
      setPassword("");
      setConfirm("");
      setResult({ tone: "success", message: "Password updated. Use it next time you sign in." });
    } catch (err) {
      // The server words an expired session for the reset-link page ("Your reset link has expired"), which makes no sense here.
      const expired = (err as { payload?: { code?: string } }).payload?.code === "session_expired";
      const message = expired
        ? "You've been signed out. Sign in again to change your password."
        : err instanceof Error
          ? err.message
          : "Your password could not be changed.";
      setResult({ tone: "error", message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change password" padded>
      {result && (
        <Banner tone={result.tone} onDismiss={() => setResult(null)}>
          {result.message}
        </Banner>
      )}
      <Form
        onSubmit={submit}
        actions={
          <Button type="submit" loading={saving}>
            {saving ? "Saving…" : "Save password"}
          </Button>
        }
      >
        {/* Lets a password manager save the new password against this account. */}
        <input type="email" autoComplete="username" value={email} readOnly hidden />
        <Field label="New password" hint={`${MIN_PASSWORD_LENGTH}+ characters`} error={errors.password}>
          <PasswordInput
            aria-label="New password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password || undefined}
          />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput
            aria-label="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-invalid={!!errors.confirm || undefined}
          />
        </Field>
      </Form>
    </Card>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BORDER_D,
  eyebrow,
  FormMessage,
  headingStyle,
  inputStyle,
  noteStyle,
  primaryButtonStyle,
  TXT_D1,
  TXT_D2,
} from "../_shared";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/* ---------------------------------------------------------------------------
   Request a password-reset email.

   Always reports success, even when the address has no account — otherwise
   this page becomes a way to enumerate which partners are registered.

   The email links back to /client-portal/auth/callback, which exchanges the
   code for a session and forwards to the set-a-new-password page.
--------------------------------------------------------------------------- */

export default function ResetForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/client-portal/auth/callback?next=/client-portal/reset-password/update`,
      });
      // Rate-limit errors are worth surfacing; "no such user" is not, and
      // Supabase does not report it anyway.
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <>
        <span style={eyebrow(TXT_D2)}>Access</span>
        <h1 style={headingStyle}>Check your email</h1>
        <p style={noteStyle}>
          If an account exists for <strong style={{ color: TXT_D1 }}>{email}</strong>, a reset link is on its way.
        </p>
        <div style={{ marginTop: 28, borderTop: `1px solid ${BORDER_D}`, paddingTop: 20 }}>
          <Link href="/client-portal" className="dt-underline" style={{ fontSize: 14, color: TXT_D1, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <span style={eyebrow(TXT_D2)}>Access</span>
      <h1 style={headingStyle}>Reset password</h1>
      <p style={noteStyle}>Enter your work email and we&apos;ll send a link to reset your password.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          type="email"
          name="email"
          required
          placeholder="Work email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        {!configured && (
          <FormMessage tone="error">
            Password reset is not available yet — Supabase is not configured on this deployment.
          </FormMessage>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <button type="submit" className="dt-signal-fill" disabled={busy || !configured} style={primaryButtonStyle}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </>
  );
}

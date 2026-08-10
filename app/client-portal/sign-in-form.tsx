"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BORDER_D,
  eyebrow,
  FormMessage,
  headingStyle,
  inputStyle,
  outlineButtonStyle,
  primaryButtonStyle,
  TXT_D1,
  TXT_D2,
} from "./_shared";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/* ---------------------------------------------------------------------------
   Sign in. One login page for everyone — admins and all three partner types.

   It deliberately does NOT branch on role here. Sign-in always lands on
   /client-portal/dashboard and the server component there redirects admins
   onward, so typing the URL directly behaves the same as signing in. Putting
   the branch in the client would give two places for it to disagree.
--------------------------------------------------------------------------- */

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/client-portal/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <span style={eyebrow(TXT_D2)}>Access</span>
      <h1 style={headingStyle}>Sign in</h1>

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
        <input
          type="password"
          name="password"
          required
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {!configured && (
          <FormMessage tone="error">
            Sign-in is not available yet — Supabase is not configured on this deployment.
          </FormMessage>
        )}
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <button type="submit" className="dt-signal-fill" disabled={busy || !configured} style={primaryButtonStyle}>
          {busy ? "Signing in…" : "Continue"}
        </button>
        <Link href="/client-portal/register" className="dt-outline" style={outlineButtonStyle}>
          Register
        </Link>
      </form>

      <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${BORDER_D}`, paddingTop: 20 }}>
        <Link href="/client-portal/reset-password" className="dt-underline" style={{ fontSize: 14, color: TXT_D2, textDecoration: "none" }}>
          Forgot password?
        </Link>
        <Link href="/contact" className="dt-underline" style={{ fontSize: 14, color: TXT_D1, textDecoration: "underline", textUnderlineOffset: 3 }}>
          Request access
        </Link>
      </div>
    </>
  );
}

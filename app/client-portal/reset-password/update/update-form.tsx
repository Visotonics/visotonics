"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  eyebrow,
  FormMessage,
  headingStyle,
  inputStyle,
  noteStyle,
  primaryButtonStyle,
  TXT_D2,
} from "../../_shared";
import { createClient } from "@/lib/supabase/client";

/* ---------------------------------------------------------------------------
   Set a new password. Only reachable with the recovery session the callback
   route established — the page itself redirects signed-out visitors away.
--------------------------------------------------------------------------- */

export default function UpdateForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
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
      <h1 style={headingStyle}>New password</h1>
      <p style={noteStyle}>Choose a new password for your account.</p>

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          type="password"
          required
          minLength={8}
          placeholder="New password (8 characters minimum)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Confirm new password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={inputStyle}
        />
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <button type="submit" className="dt-signal-fill" disabled={busy} style={primaryButtonStyle}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BORDER_D,
  CANVAS_DARK,
  eyebrow,
  FormMessage,
  headingStyle,
  inputStyle,
  noteStyle,
  primaryButtonStyle,
  TXT_D1,
  TXT_D2,
} from "../_shared";
import { PARTNER_TYPES, PARTNER_TYPE_LABELS } from "@/lib/partner";

/* ---------------------------------------------------------------------------
   Register.

   The form posts to /api/partner-register rather than calling Supabase from
   the browser: `role` and `status` are set server-side with the service-role
   key, so there is nothing a partner can send that would approve their own
   account. See that route for the reasoning.

   Four fields. Partner type is collected HERE again as of 2026-08-10: it
   spent two days as a post-approval onboarding screen and that screen was
   removed to take a step out of onboarding. See DECISIONS.md for the
   reversal. The labels come from lib/partner's PARTNER_TYPE_LABELS — never
   retype them here, or a rename lands in one place and not the other.

   The <select> is styled to match `inputStyle`, plus `appearance: none` and
   an inline-SVG chevron as a data URI. A native dark-mode select renders its
   own control in the platform's chrome colour, which on this sheet reads as
   a hole in the drawing.
--------------------------------------------------------------------------- */

/* An unfilled select is a placeholder, not a value — it takes the muted ink
   until something is chosen, exactly as a text input's placeholder does. */
const selectStyle = (chosen: boolean): React.CSSProperties => ({
  ...inputStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: 44,
  color: chosen ? TXT_D1 : "rgba(166,173,184,0.85)",
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23A6ADB8' stroke-width='1.5' stroke-linecap='square'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
});

/* The popup list is drawn by the OS, not by us; on Windows/Chrome it takes
   these two values and without them it renders white-on-white. */
const optionStyle: React.CSSProperties = { background: CANVAS_DARK, color: TXT_D1 };

export default function RegisterForm() {
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [partnerType, setPartnerType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/partner-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, email, password, partnerType }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <>
        <span style={eyebrow(TXT_D2)}>Access</span>
        <h1 style={headingStyle}>Check your email</h1>
        <p style={noteStyle}>
          Confirm your address using the link we sent to <strong style={{ color: TXT_D1 }}>{email}</strong>.
          Your account then waits for approval by the Visotonics team — we&apos;ll be in touch once it&apos;s active.
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
      <h1 style={headingStyle}>Create account</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          type="text"
          name="company"
          required
          placeholder="Company name"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          style={inputStyle}
        />
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
          minLength={8}
          placeholder="Password (8 characters minimum)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <select
          name="partnerType"
          required
          aria-label="Partner type"
          value={partnerType}
          onChange={(e) => setPartnerType(e.target.value)}
          style={selectStyle(!!partnerType)}
        >
          <option value="" disabled style={optionStyle}>
            Partner type
          </option>
          {PARTNER_TYPES.map((t) => (
            <option key={t} value={t} style={optionStyle}>
              {PARTNER_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {error && <FormMessage tone="error">{error}</FormMessage>}
        <button type="submit" className="dt-signal-fill" disabled={busy} style={primaryButtonStyle}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>

      <div style={{ marginTop: 28, display: "flex", alignItems: "center", justifyContent: "center", borderTop: `1px solid ${BORDER_D}`, paddingTop: 20 }}>
        <span style={{ fontSize: 14, color: TXT_D2 }}>
          Already have an account?{" "}
          <Link href="/client-portal" className="dt-underline" style={{ color: TXT_D1, textDecoration: "underline", textUnderlineOffset: 3 }}>
            Sign in
          </Link>
        </span>
      </div>
    </>
  );
}

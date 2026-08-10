"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  INDUSTRIES,
  INDUSTRY_LABELS,
  PLATFORMS,
  PLATFORM_LABELS,
} from "@/lib/deal";
import { capLabel, HAIR, MONO, SANS, SIGNAL, TXT_1, TXT_2 } from "@/components/portal/app-shell";

/* ---------------------------------------------------------------------------
   Register a deal — the form.

   A PAGE rather than a dropdown on the dashboard. Six fields including a
   free-text note is not a menu; a partner filling this in is describing an
   opportunity, and squeezing that into a popover would produce the shortest
   possible answer in the one field that wants a real one.

   House language throughout (docs/07-design-language.md): field labels are
   MONO because they read as instrument annotation; the values a human types
   are SANS; the money field is MONO because a monetary figure is instrument
   output. Square corners, house ink, no #E2EAF4.

   COLOUR BUDGET. Blue is the system observing — it rules the eyebrow and
   marks the focused field. SIGNAL orange appears EXACTLY ONCE, as the 2px
   edge on the submit button, because submitting is the conclusion this whole
   screen exists to reach. The error message is the one exception the house
   already makes elsewhere (FormMessage does the same on the auth sheets) and
   it is never on screen at the same time as a successful conclusion.

   Nothing here is trusted: /api/deal-register re-validates every field
   against its own lists, generates the reference, and forces status to
   'submitted'. This is the half the partner can see.
--------------------------------------------------------------------------- */

const FIELD_BG = "var(--canvas-dark)";
const FIELD_BORDER = "rgba(244,245,247,0.14)";

const fieldStyle: React.CSSProperties = {
  height: 48,
  width: "100%",
  boxSizing: "border-box",
  background: FIELD_BG,
  border: `1px solid ${FIELD_BORDER}`,
  borderRadius: 0,
  padding: "0 16px",
  color: TXT_1,
  fontFamily: SANS,
  fontSize: 15,
};

/* Anything that reads as instrument output is mono — an email address and a
   monetary figure both do, so they are typed in the face they will be read
   back in. */
const monoField: React.CSSProperties = { ...fieldStyle, fontFamily: MONO, fontSize: 14 };

const selectStyle = (chosen: boolean): React.CSSProperties => ({
  ...fieldStyle,
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  paddingRight: 44,
  color: chosen ? TXT_1 : "rgba(166,173,184,0.85)",
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'><path d='M1 1.5L6 6.5L11 1.5' stroke='%23A6ADB8' stroke-width='1.5' stroke-linecap='square'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
});

const optionStyle: React.CSSProperties = { background: "#0A0B0E", color: TXT_1 };

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <span style={capLabel}>{label}</span>
        {hint && <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(166,173,184,0.55)" }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export default function DealForm() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [industry, setIndustry] = useState("");
  const [platform, setPlatform] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/deal-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          industry,
          platform,
          estimatedValueUsd: value,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not register the deal.");
        return;
      }
      setReference(data.reference as string);
      // The dashboard reads this deal on its next render.
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ---- submitted ------------------------------------------------------- */
  if (reference) {
    return (
      <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 300 }}>
          <div style={{ height: 1, background: "#5CC8FF" }} />
          <div style={{ ...capLabel, fontSize: 13, color: "rgba(92,200,255,0.85)" }}>Submitted for approval</div>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_1 }}>
          {customerName}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={capLabel}>Reference</span>
          <span style={{ fontFamily: MONO, fontSize: 18, letterSpacing: "0.04em", color: TXT_1 }}>{reference}</span>
        </div>
        <p style={{ margin: 0, maxWidth: "56ch", fontFamily: SANS, fontSize: 15, lineHeight: 1.6, color: TXT_2 }}>
          Partnerships will review it. Quote that reference in any correspondence about this
          opportunity — it is how we identify it.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/client-portal/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 46,
              padding: "0 22px",
              border: `1px solid ${FIELD_BORDER}`,
              fontFamily: SANS,
              fontSize: 14,
              color: TXT_1,
              textDecoration: "none",
            }}
          >
            Back to overview
          </Link>
          <button
            type="button"
            onClick={() => {
              setReference(null);
              setCustomerName("");
              setCustomerEmail("");
              setIndustry("");
              setPlatform("");
              setValue("");
              setNotes("");
            }}
            style={{
              height: 46,
              padding: "0 22px",
              background: "transparent",
              border: `1px solid ${FIELD_BORDER}`,
              borderRadius: 0,
              fontFamily: SANS,
              fontSize: 14,
              color: TXT_2,
              cursor: "pointer",
            }}
          >
            Register another
          </button>
        </div>
      </div>
    );
  }

  /* ---- the form -------------------------------------------------------- */
  return (
    <form onSubmit={onSubmit} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
      <Field label="Customer name">
        <input
          type="text"
          required
          maxLength={200}
          placeholder="The end customer, not your own company"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          style={fieldStyle}
        />
      </Field>

      <Field label="Customer email">
        <input
          type="email"
          required
          maxLength={320}
          placeholder="contact@customer.com"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          style={monoField}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
        <Field label="Industry">
          <select
            required
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={selectStyle(!!industry)}
          >
            <option value="" disabled style={optionStyle}>
              Select an industry
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i} style={optionStyle}>
                {INDUSTRY_LABELS[i]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Platform">
          <select
            required
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            style={selectStyle(!!platform)}
          >
            <option value="" disabled style={optionStyle}>
              Select a platform
            </option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p} style={optionStyle}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Estimated value" hint="USD">
        <input
          type="number"
          required
          min={0}
          step={1000}
          inputMode="decimal"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ ...monoField, fontVariantNumeric: "tabular-nums" }}
        />
      </Field>

      <Field label="Notes" hint="Optional">
        <textarea
          rows={5}
          maxLength={4000}
          placeholder="Anything partnerships should know — timing, incumbent, site, who else is involved."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ ...fieldStyle, height: "auto", padding: 16, lineHeight: 1.6, resize: "vertical" }}
        />
      </Field>

      {error && (
        <p role="alert" style={{ margin: 0, fontFamily: MONO, fontSize: 13, lineHeight: 1.5, color: SIGNAL }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", borderTop: `1px solid ${HAIR}`, paddingTop: 24 }}>
        {/* The one SIGNAL on the screen. Submitting IS the conclusion here. */}
        <button
          type="submit"
          disabled={busy}
          className="dt-signal-fill"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            height: 46,
            padding: "0 24px 0 26px",
            background: "rgba(244,245,247,0.08)",
            border: "none",
            borderRadius: 0,
            fontFamily: SANS,
            fontSize: 14,
            fontWeight: 600,
            color: TXT_1,
            cursor: busy ? "default" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: SIGNAL }} />
          {busy ? "Submitting…" : "Submit for approval"}
        </button>
        <Link
          href="/client-portal/dashboard"
          style={{ fontFamily: SANS, fontSize: 14, color: TXT_2, textDecoration: "none" }}
        >
          Cancel
        </Link>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(166,173,184,0.55)" }}>
          Reference issued on submission
        </span>
      </div>
    </form>
  );
}

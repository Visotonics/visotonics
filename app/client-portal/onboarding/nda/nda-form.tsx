"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BLUE,
  FormMessage,
  INK,
  INK_35,
  INK_45,
  INK_60,
  mono,
  PAPER,
  PAPER_INK,
  PillEdge,
  pillStyle,
  Register,
  RULE,
  RULE_SOFT,
  sans,
  SURFACE_DARK,
} from "../../_shared";
import SignOutButton from "../../sign-out-button";
import { NDA_BODY, NDA_CLAUSES, NDA_PDF_PATH, NDA_VERSION } from "@/lib/nda";

/* ---------------------------------------------------------------------------
   Step 2 of onboarding — the NDA.

   Layout is study 1C · LEDGER RAIL from the Claude Design project: the
   agreement printed on paper down the left, a narrow rail on the right that
   records acknowledgements as they happen, signature block beneath the
   document, CTA pinned to the foot of the rail.

   DELIBERATE DEVIATION FROM THE DESIGN, at Apratim's request: 1c reduced each
   clause to a short key with an "ACKNOWLEDGED / —" state word beside it. We
   keep our own treatment instead — a real checkbox against the full clause
   sentence. The design's version is tidier, but a partner is signing these
   sentences and must be able to read them at the moment they tick, not match
   a shorthand against a document panel. The rail is widened to carry the
   longer text.

   Everything else follows 1c: blue is instrumentation, and the only orange on
   the screen is the CTA's edge once the form is actually complete.
--------------------------------------------------------------------------- */

export default function NdaForm({ company, email }: { company: string; email: string }) {
  const router = useRouter();
  const [agreed, setAgreed] = useState<Record<string, boolean>>({});
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState("");

  const count = NDA_CLAUSES.filter((c) => agreed[c.key]).length;
  const allTicked = count === NDA_CLAUSES.length;
  const canSubmit = allTicked && fullName.trim().length >= 2;

  const fieldStyle = (name: string): React.CSSProperties => ({
    background: SURFACE_DARK,
    border: `1px solid ${focus === name ? BLUE : "rgba(226,234,244,0.14)"}`,
    borderRadius: 2,
    padding: "12px 14px",
    fontFamily: sans,
    fontSize: 15,
    color: "#fff",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  });

  const label = (text: string) => (
    <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(226,234,244,0.5)" }}>
      {text}
    </div>
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError("Acknowledge every clause and type your full name to sign.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/partner-nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim(),
          agreed: NDA_CLAUSES.filter((c) => agreed[c.key]).map((c) => c.key),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not record your signature.");
        return;
      }
      router.replace("/client-portal/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 440px", minHeight: 760, color: INK }}
    >
      {/* ---- left: the agreement, on paper ---- */}
      <div style={{ padding: "88px 72px 72px", minWidth: 0 }}>
        <Register width={260}>Onboarding · Step 2 / 2</Register>

        <h1 style={{ margin: "64px 0 0", fontFamily: sans, fontSize: 38, fontWeight: 500, letterSpacing: "-0.02em", color: "#fff", maxWidth: "18ch", lineHeight: 1.1 }}>
          Mutual non-disclosure agreement
        </h1>

        <div style={{ position: "relative", marginTop: 56 }}>
          <a
            href={NDA_PDF_PATH}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 2,
              fontFamily: mono,
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "rgba(10,11,14,0.65)",
              border: "1px solid rgba(10,11,14,0.22)",
              background: "rgba(255,255,255,0.6)",
              padding: "6px 12px",
              textDecoration: "none",
            }}
          >
            PDF ↓
          </a>
          <div
            className="doc-scroll"
            style={{
              height: 400,
              overflowY: "auto",
              background: PAPER,
              border: "1px solid rgba(226,234,244,0.2)",
              padding: "44px 48px",
              color: PAPER_INK,
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(22,24,29,0.5)" }}>
              {NDA_VERSION}
            </div>
            {NDA_BODY.map((s) => (
              <div key={s.heading}>
                <div style={{ marginTop: 28, fontFamily: sans, fontSize: 17, fontWeight: 600 }}>{s.heading}</div>
                <p style={{ margin: "12px 0 0", color: "rgba(22,24,29,0.78)" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ---- signature block, under the document ---- */}
        <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 560 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {label("Full legal name")}
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={() => setFocus("name")}
              onBlur={() => setFocus("")}
              autoComplete="name"
              style={fieldStyle("name")}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {label("Title")}
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              onFocus={() => setFocus("title")}
              onBlur={() => setFocus("")}
              autoComplete="organization-title"
              style={fieldStyle("title")}
            />
          </div>
        </div>
        <p style={{ margin: "16px 0 0", fontFamily: mono, fontSize: 12, lineHeight: 1.6, color: INK_45, maxWidth: "62ch" }}>
          Typing your name is your electronic signature, on behalf of {company} ({email}).
        </p>
      </div>

      {/* ---- right: the acknowledgement rail ---- */}
      <div style={{ borderLeft: `1px solid rgba(226,234,244,0.1)`, padding: "88px 40px 72px", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(226,234,244,0.5)" }}>
          Acknowledgements
        </div>
        <div style={{ marginTop: 8, fontFamily: mono, fontSize: 12, color: allTicked ? BLUE : INK_45 }}>
          {count} of {NDA_CLAUSES.length} recorded
        </div>

        <div style={{ marginTop: 32, borderTop: `1px solid ${RULE}` }}>
          {NDA_CLAUSES.map((c) => {
            const on = !!agreed[c.key];
            return (
              <label
                key={c.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "16px 1fr",
                  gap: 14,
                  alignItems: "start",
                  padding: "18px 0",
                  borderBottom: `1px solid ${RULE_SOFT}`,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setAgreed((p) => ({ ...p, [c.key]: e.target.checked }))}
                  style={{ marginTop: 2, width: 16, height: 16, accentColor: BLUE, flex: "0 0 auto", cursor: "pointer" }}
                />
                <span style={{ fontFamily: sans, fontSize: 13.5, lineHeight: 1.55, color: on ? INK : INK_60, transition: "color 140ms linear" }}>
                  {c.label}
                </span>
              </label>
            );
          })}
        </div>

        <div style={{ flex: 1, minHeight: 32 }} />

        {error && (
          <div style={{ marginTop: 24 }}>
            <FormMessage tone="error">{error}</FormMessage>
          </div>
        )}

        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 16 }}>
          <button type="submit" disabled={busy || !canSubmit} style={{ ...pillStyle(canSubmit && !busy), width: "100%" }}>
            <PillEdge enabled={canSubmit && !busy} />
            {busy ? "Recording…" : "Sign and continue"}
          </button>
          <div style={{ fontFamily: mono, fontSize: 12, color: INK_35, textAlign: "center" }}>
            {canSubmit
              ? "Ready to execute"
              : `${count}/${NDA_CLAUSES.length} acknowledged · signature block incomplete`}
          </div>
        </div>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${RULE_SOFT}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: INK_35 }}>
            Resume later
          </span>
          <SignOutButton />
        </div>
      </div>
    </form>
  );
}

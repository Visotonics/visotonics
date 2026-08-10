"use client";

import { useState, type CSSProperties, type FormEvent } from "react";

/* ---------------------------------------------------------------------------
   /contact
   Ported from Claude Design: Hero-DraftingTable.dc.html, Section 11 ·
   Contact · Variant D · minimal, no frame · 1440×900.

   Submits to /api/lead (source: "contact") — the same Resend-backed pipeline
   the campaign landing pages use, instead of the old mailto: composer. Name,
   email and phone are all required (every form on the site collects both an
   email and a phone number now); subject/message optional.
--------------------------------------------------------------------------- */

const CANVAS_DARK = "#0A0B0E";
const TXT_D1 = "#F4F5F7";
const TXT_D2 = "#A6ADB8";
const TXT_D3 = "#6B7078";
const SIGNAL = "#ED510C";

const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

const fieldLabel: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: TXT_D3,
};

const underlineInput: CSSProperties = {
  height: 56,
  boxSizing: "border-box",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(244,245,247,0.2)",
  padding: 0,
  color: TXT_D1,
  fontFamily: sans,
  fontSize: 24,
  width: "100%",
  outline: "none",
};

const sendButton: CSSProperties = {
  marginTop: 8,
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
  alignSelf: "flex-start",
  fontFamily: sans,
  fontWeight: 600,
  color: TXT_D1,
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

type Status = "idle" | "sending" | "done" | "error";

function useContactSubmit() {
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const data = new FormData(e.currentTarget);
    const payload = {
      source: "contact" as const,
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      subject: String(data.get("subject") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };
    if (!payload.name || !payload.email || !payload.phone) return;

    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return { status, handleSubmit };
}

function StatusNote({ status, fontSize }: { status: Status; fontSize: number }) {
  if (status === "idle") return null;
  const text =
    status === "sending"
      ? "Sending…"
      : status === "done"
        ? "Message sent — we'll be in touch."
        : "Something went wrong — please try again.";
  return (
    <span style={{ fontFamily: mono, fontSize, color: status === "error" ? SIGNAL : TXT_D2 }}>
      {text}
    </span>
  );
}

export default function ContactPage() {
  const { status, handleSubmit } = useContactSubmit();
  const sending = status === "sending";
  const done = status === "done";

  return (
    <section style={{ background: CANVAS_DARK }}>
      {/* DESKTOP */}
      <div className="hidden md:flex" style={{ maxWidth: 1440, margin: "0 auto", minHeight: 900, boxSizing: "border-box", padding: 96, flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>Let&apos;s talk</span>
        <h1 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 56, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>Tell us about your site.</h1>

        <form onSubmit={handleSubmit} style={{ marginTop: 64, maxWidth: 720, display: "flex", flexDirection: "column", gap: 40 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={fieldLabel}>Name</span>
            <input type="text" name="name" autoComplete="name" required disabled={done} style={underlineInput} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={fieldLabel}>Work email</span>
            <input type="email" name="email" autoComplete="email" required disabled={done} style={underlineInput} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={fieldLabel}>Phone</span>
            <input type="tel" name="phone" autoComplete="tel" required disabled={done} style={underlineInput} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={fieldLabel}>Subject</span>
            <input type="text" name="subject" disabled={done} style={underlineInput} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span style={fieldLabel}>What do you want to solve?</span>
            <input type="text" name="message" disabled={done} style={underlineInput} />
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <button type="submit" disabled={sending || done} className="dt-underline" style={{ ...sendButton, fontSize: 20, opacity: sending || done ? 0.6 : 1 }}>
              {done ? "Sent" : "Send message"} <span style={{ fontFamily: mono, color: SIGNAL }}>→</span>
            </button>
            <StatusNote status={status} fontSize={14} />
          </div>
        </form>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ padding: "56px 24px 64px" }}>
        <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>Let&apos;s talk</span>
        <h1 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 36, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>Tell us about your site.</h1>

        <form onSubmit={handleSubmit} style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 32 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={fieldLabel}>Name</span>
            <input type="text" name="name" autoComplete="name" required disabled={done} style={{ ...underlineInput, height: 48, fontSize: 18 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={fieldLabel}>Work email</span>
            <input type="email" name="email" autoComplete="email" required disabled={done} style={{ ...underlineInput, height: 48, fontSize: 18 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={fieldLabel}>Phone</span>
            <input type="tel" name="phone" autoComplete="tel" required disabled={done} style={{ ...underlineInput, height: 48, fontSize: 18 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={fieldLabel}>Subject</span>
            <input type="text" name="subject" disabled={done} style={{ ...underlineInput, height: 48, fontSize: 18 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={fieldLabel}>What do you want to solve?</span>
            <input type="text" name="message" disabled={done} style={{ ...underlineInput, height: 48, fontSize: 18 }} />
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
            <button type="submit" disabled={sending || done} className="dt-underline" style={{ ...sendButton, fontSize: 18, opacity: sending || done ? 0.6 : 1 }}>
              {done ? "Sent" : "Send message"} <span style={{ fontFamily: mono, color: SIGNAL }}>→</span>
            </button>
            <StatusNote status={status} fontSize={13} />
          </div>
        </form>
      </div>
    </section>
  );
}

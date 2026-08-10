import type { CSSProperties } from "react";

/* ---------------------------------------------------------------------------
   Client Portal (Login / Register) — shared drafting-sheet primitives.
   Ported from Claude Design: Hero-DraftingTable.dc.html, Section 8
   (Login Variant B, Register). Same tokens as the home port / Viso Yard.
--------------------------------------------------------------------------- */

export const CANVAS_DARK = "#0A0B0E";
export const SURFACE_DARK = "#101216";
export const TXT_D1 = "#F4F5F7";
export const TXT_D2 = "#A6ADB8";
export const GRID_D = "rgba(244,245,247,0.08)";
export const CROSS_D = "rgba(244,245,247,0.3)";
export const BORDER_D = "rgba(244,245,247,0.10)";
export const BORDER_D_INPUT = "rgba(244,245,247,0.14)";
export const BORDER_D_OUTLINE = "rgba(244,245,247,0.28)";
export const SIGNAL = "#ED510C";

/* ---------------------------------------------------------------------------
   Claude Design "Visotonics Portal Restyling" tokens — imported 2026-08-08
   from studies 1c / 3c / 4c / 5c.

   The important idea, and the reason the portal now has TWO accents:

     BLUE  = instrumentation. The system reading, measuring, in progress.
             Eyebrow rules, step numerals, checkmarks, "under review".
     AMBER = a decision has been recorded.
     SIGNAL orange = the conclusion, and ONLY the conclusion. At most one
             per screen — the enabled CTA's edge, the live action, the
             rejection rule. If orange appears twice on a screen, one of
             them is wrong.

   Zero orange while something is pending: a pending application has not
   concluded, so it gets blue only.
--------------------------------------------------------------------------- */
export const BLUE = "#5CC8FF";
export const BLUE_DIM = "rgba(92,200,255,0.85)";
export const AMBER = "#FFB020";
/** The design's body ink — cooler than TXT_D1, used on the new sheets. */
export const INK = "#E2EAF4";
export const INK_60 = "rgba(226,234,244,0.6)";
export const INK_45 = "rgba(226,234,244,0.45)";
export const INK_35 = "rgba(226,234,244,0.35)";
export const RULE = "rgba(226,234,244,0.12)";
export const RULE_SOFT = "rgba(226,234,244,0.08)";
/** Paper the NDA document panel is printed on. */
export const PAPER = "#ecedef";
export const PAPER_INK = "#16181d";

export const mono = "var(--font-plex-mono)";
export const sans = "var(--font-archivo)";

export const eyebrow = (color: string): CSSProperties => ({
  fontFamily: mono,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
});

export const inputStyle: CSSProperties = {
  height: 52,
  boxSizing: "border-box",
  background: CANVAS_DARK,
  border: `1px solid ${BORDER_D_INPUT}`,
  borderRadius: 6,
  padding: "0 16px",
  color: TXT_D1,
  fontFamily: sans,
  fontSize: 16,
  width: "100%",
};

export const primaryButtonStyle: CSSProperties = {
  marginTop: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  background: SIGNAL,
  color: CANVAS_DARK,
  border: "none",
  borderRadius: 6,
  fontFamily: sans,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

export const outlineButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 52,
  background: "transparent",
  color: TXT_D1,
  border: `1px solid ${BORDER_D_OUTLINE}`,
  borderRadius: 6,
  fontFamily: sans,
  fontSize: 16,
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

export const headingStyle: CSSProperties = {
  margin: "16px 0 0",
  fontFamily: sans,
  fontSize: 32,
  fontWeight: 600,
  letterSpacing: "-0.02em",
  color: TXT_D1,
};

export const noteStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: 15,
  lineHeight: 1.6,
  color: TXT_D2,
};

// Inline form feedback. Errors take signal orange; the success/pending state
// stays in the muted text colour so it doesn't read as an alarm.
export function FormMessage({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.5, color: tone === "error" ? SIGNAL : TXT_D2 }}
    >
      {children}
    </p>
  );
}

/* The design's eyebrow: a 1px blue rule with a mono caption under it. Reads
   as a register/instrument label rather than a heading. */
export function Register({
  children,
  width,
  color = BLUE,
  nowrap,
}: {
  children: React.ReactNode;
  width?: number | string;
  color?: string;
  nowrap?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width }}>
      <div style={{ height: 1, background: color }} />
      <div
        style={{
          fontFamily: mono,
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: color === BLUE ? BLUE_DIM : color,
          whiteSpace: nowrap ? "nowrap" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* Pill controls. The design's CTA is white-on-dark when live, with a 2px
   SIGNAL edge — the single orange on the screen. Disabled it goes to a faint
   wash with no orange at all, because nothing has concluded yet. */
export function pillStyle(enabled: boolean): React.CSSProperties {
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    border: "none",
    borderRadius: 999,
    padding: "15px 32px 15px 34px",
    fontFamily: sans,
    fontSize: 15,
    fontWeight: 500,
    background: enabled ? "#ffffff" : "rgba(226,234,244,0.08)",
    color: enabled ? CANVAS_DARK : INK_35,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

/** The 2px left edge inside a pill. Orange only when the action is live. */
export function PillEdge({ enabled }: { enabled: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 2,
        background: enabled ? SIGNAL : "rgba(226,234,244,0.14)",
      }}
    />
  );
}

/** Outline pill — secondary actions (Back, Sign out, Contact partnerships). */
export const ghostPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
  border: `1px solid rgba(226,234,244,0.14)`,
  borderRadius: 999,
  padding: "10px 22px",
  fontFamily: sans,
  fontSize: 14,
  color: "rgba(226,234,244,0.7)",
  textDecoration: "none",
  cursor: "pointer",
};

/** The short tick-ended measure rule that sits under a heading. */
export function TickRule({ width = 300, label }: { width?: number | string; label?: string }) {
  const tick = <div style={{ width: 1, height: 7, background: "rgba(226,234,244,0.3)" }} />;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width, marginTop: 20 }}>
      {tick}
      <div style={{ flex: 1, height: 1, background: "rgba(226,234,244,0.16)" }} />
      {label && (
        <>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.06em", color: INK_45 }}>{label}</div>
          <div style={{ flex: 1, height: 1, background: "rgba(226,234,244,0.16)" }} />
        </>
      )}
      {tick}
    </div>
  );
}

// The 5 page-wide verticals: margins at 64 / (100%-64), interiors dividing
// the inset content into 4 equal columns — same coordinates as every other
// drafting sheet on the site so the grid reads continuous.
const V_X = ["64px", "calc(64px + (100% - 128px) * 0.25)", "50%", "calc(64px + (100% - 128px) * 0.75)", "calc(100% - 64px)"];
export function Verticals({ color }: { color: string }) {
  return (
    <>
      {V_X.map((x, i) => (
        <div key={i} aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, background: color }} />
      ))}
    </>
  );
}

// L-corner registration brackets, four canvas corners.
export function CornerBrackets({ color }: { color: string }) {
  return (
    <>
      <div style={{ position: "absolute", left: 16, top: 16, width: 16, height: 16, borderLeft: `1px solid ${color}`, borderTop: `1px solid ${color}` }} />
      <div style={{ position: "absolute", right: 16, top: 16, width: 16, height: 16, borderRight: `1px solid ${color}`, borderTop: `1px solid ${color}` }} />
      <div style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 16, borderLeft: `1px solid ${color}`, borderBottom: `1px solid ${color}` }} />
      <div style={{ position: "absolute", right: 16, bottom: 16, width: 16, height: 16, borderRight: `1px solid ${color}`, borderBottom: `1px solid ${color}` }} />
    </>
  );
}

// 3px signal-orange registration dot.
export function Dot({ style }: { style: CSSProperties }) {
  return <div aria-hidden="true" style={{ position: "absolute", width: 3, height: 3, background: SIGNAL, ...style }} />;
}

/* The drafting-sheet canvas every portal page sits on. Extracted from the
   three original auth pages, which each carried an identical copy of this
   chrome — the dashboard and admin shells reuse it rather than a fourth and
   fifth copy. `width` widens the card for the dashboard/admin surfaces,
   which are tables and content blocks rather than 440px auth forms. */
export function PortalSheet({
  width = 440,
  bleed = false,
  children,
}: {
  width?: number;
  /** Drops the card's own padding so rules can run edge to edge. The
   *  imported designs rely on this — their row separators and column
   *  dividers span the full sheet, with content inset by its own 80px.
   *  Children take responsibility for their padding when bleed is set. */
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section style={{ position: "relative", background: CANVAS_DARK, minHeight: 720 }}>
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div className="hidden md:block" style={{ position: "absolute", inset: 0 }}>
          <Verticals color={GRID_D} />
        </div>
        <CornerBrackets color={CROSS_D} />
        {/* The signal-orange registration dot is suppressed on bleed sheets.
            The imported designs reserve orange for the conclusion and allow
            exactly one per screen — a decorative dot in the chrome spends
            that budget on nothing, and on the pending state it breaks the
            "no orange until something has concluded" rule outright. */}
        {!bleed && <Dot style={{ left: "50%", bottom: 148 }} />}
      </div>

      <div style={{ position: "relative", zIndex: 1, minHeight: 720, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 20px", boxSizing: "border-box" }}>
        <div
          style={{
            width: "100%",
            maxWidth: width,
            boxSizing: "border-box",
            background: bleed ? CANVAS_DARK : SURFACE_DARK,
            border: `1px solid ${bleed ? "rgba(226,234,244,0.1)" : BORDER_D}`,
            borderRadius: bleed ? 0 : 8,
            padding: bleed ? 0 : 48,
            overflow: bleed ? "hidden" : undefined,
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

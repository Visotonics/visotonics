import type { CSSProperties } from "react";

/* ---------------------------------------------------------------------------
   Convert — closing bookend. Clone of the approved HOME convert component
   (app/page.tsx › Convert), unchanged, per the handoff. Kept self-contained
   (its own constants + primitives) so it stays a faithful copy.
--------------------------------------------------------------------------- */

const DARK = "#0A0B0E";
const TXT_D1 = "#F4F5F7";
const TXT_D2 = "#A6ADB8";
const TXT_L1 = "#13151A";
const GRID_D = "rgba(244,245,247,0.08)";
const CROSS_D = "rgba(244,245,247,0.4)";
const SIGNAL = "#ED510C";
const sans = "var(--font-archivo)";

const SHEET: CSSProperties = { position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto" };

function Cross({ color, style }: { color: string; style: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", width: 9, height: 9, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 1, background: color }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 4, width: 1, background: color }} />
    </div>
  );
}
function Dot({ style }: { style: CSSProperties }) {
  return <div aria-hidden="true" style={{ position: "absolute", width: 3, height: 3, background: SIGNAL, ...style }} />;
}
const V_X = ["64px", "calc(64px + (100% - 128px) * 0.25)", "50%", "calc(64px + (100% - 128px) * 0.75)", "calc(100% - 64px)"];
function Verticals({ color }: { color: string }) {
  return (
    <>
      {V_X.map((x, i) => (
        <div key={i} aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, background: color }} />
      ))}
    </>
  );
}

export function Convert() {
  return (
    <section style={{ background: DARK }}>
      {/* DESKTOP */}
      <div className="hidden md:block" style={{ ...SHEET, height: 720 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Verticals color={GRID_D} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 64, height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 1, background: GRID_D }} />
          <Cross color={CROSS_D} style={{ left: 60, top: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: 60 }} />
          <Cross color={CROSS_D} style={{ left: 60, bottom: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", bottom: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.25 - 4px)", top: "calc(50% - 4px)" }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.75 - 4px)", top: "calc(50% - 4px)" }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.25 - 4px)", top: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.75 - 4px)", bottom: 60 }} />
          <Dot style={{ left: "50%", top: "calc(50% - 1px)" }} />
        </div>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 640px 340px at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0) 70%)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 64px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 84, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "20ch" }}>
            Join 25+ sites running 400,000 reads a day.
          </h2>
          <span style={{ display: "block", marginTop: 24, fontSize: 29, lineHeight: 1.5, color: TXT_D2 }}>Bring your CCTV feed. We&apos;ll read it live.</span>
          <div style={{ marginTop: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <a href="/contact" className="dt-fill" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 77, padding: "0 32px", background: TXT_D1, color: TXT_L1, borderRadius: 999, fontFamily: sans, fontSize: 24, fontWeight: 500, textDecoration: "none" }}>Talk to us</a>
            <a href="/platform/viso-yard" className="dt-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 76, padding: "0 32px", background: "transparent", color: TXT_D1, border: `1px solid rgba(244,245,247,0.28)`, borderRadius: 999, fontFamily: sans, fontSize: 24, fontWeight: 500, textDecoration: "none" }}>Explore the platform</a>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", height: 520 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 130, height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 390, height: 1, background: GRID_D }} />
          <Cross color={CROSS_D} style={{ left: 16, top: 16 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 25px)", top: 16 }} />
          <Cross color={CROSS_D} style={{ left: 16, bottom: 16 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 25px)", bottom: 16 }} />
          <div style={{ position: "absolute", left: "50%", top: 389, width: 3, height: 3, background: SIGNAL }} />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 34, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, textWrap: "balance" }}>Join 25+ sites running 400,000 reads a day.</h2>
          <span style={{ display: "block", marginTop: 16, fontSize: 17, lineHeight: 1.5, color: TXT_D2 }}>Bring your CCTV feed. We&apos;ll read it live.</span>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, width: "100%", maxWidth: 280 }}>
            <a href="/contact" className="dt-fill" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, background: TXT_D1, color: TXT_L1, borderRadius: 999, fontFamily: sans, fontSize: 17, fontWeight: 500, textDecoration: "none" }}>Talk to us</a>
            <a href="/platform/viso-yard" className="dt-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, background: "transparent", color: TXT_D1, border: `1px solid rgba(244,245,247,0.28)`, borderRadius: 999, fontFamily: sans, fontSize: 17, fontWeight: 500, textDecoration: "none" }}>Explore the platform</a>
          </div>
        </div>
      </div>
    </section>
  );
}

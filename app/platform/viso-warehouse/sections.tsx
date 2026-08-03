import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion";
import {
  ANCHOR_OFFSET,
  BORDER_D,
  CANVAS_LIGHT,
  CROSS_D,
  Cross,
  Dot,
  GRID_D,
  GRID_L,
  SIGNAL,
  SURFACE_DARK,
  TXT_D1,
  TXT_D2,
  TXT_L1,
  TXT_L2,
  Verticals,
  eyebrow,
  mono,
  sans,
} from "../viso-yard/_shared";
import { Schematic } from "../viso-yard/_media";
// lazy: keeps three.js out of this page's critical bundle — see _vision/lazy
import { WorkVisionScene } from "@/components/vision/_vision/lazy";

/* ---------------------------------------------------------------------------
   Viso Warehouse — section modules. Ported from the VisoWarehouse-Overview
   canvas as responsive flow layout (same translation approach as Viso Yard):
   copy verbatim, proportions preserved, drafting-sheet chrome via viso-yard
   /_shared, schematics inlined via <Schematic>.

   Cargo Vision and Document Vision are identical to the Viso Yard pages, so
   they are re-exported from there (per the handoff) rather than duplicated.
--------------------------------------------------------------------------- */

export { SectionCargo, SectionDocument } from "../viso-yard/sections";

/* =========================================================================
   00 · PRODUCTS OVERVIEW — same card-grid pattern as Viso Yard: one card per
   system, flagship schematic drawing itself in on view (DrawSchematic 3-act
   animation), sits between the hero and 01 Cargo. Desktop-only (mobile keeps
   its manifest list instead, same as Yard).
   ========================================================================= */
const PRODUCTS_OVERVIEW: { n: string; name: string; desc: string; id: string; file: string; label: string; wide?: string }[] = [
  { n: "01", name: "Cargo Vision", desc: "Count with proof", id: "cargo-vision", file: "visotonics-cargo-schematic.svg", label: "Cargo live-count schematic" },
  { n: "02", name: "Audit Vision", desc: "Event-linked proof", id: "audit-vision", file: "audit-schematic.svg", label: "Audit trail schematic" },
  { n: "03", name: "Dimension Vision", desc: "Volumetric capture", id: "dimension-vision", file: "visotonics-dimension-schematic-dark.svg", label: "Dimension overview schematic" },
  { n: "04", name: "Document Vision", desc: "Key-value extraction", id: "document-vision", file: "visotonics-document-schematic.svg", label: "Document key-value extraction schematic" },
  // Work Vision made the same wide/spanned size as Secure Vision below, so
  // the two matching-height cards close out the grid as a pair.
  { n: "05", name: "Work Vision", desc: "Attendance from the cameras", id: "work-vision", file: "work-vision-schematic-desktop.svg", label: "Work-vision shift-register schematic", wide: "1046 / 340" },
  { n: "06", name: "Secure Vision", desc: "Alerts and logs", id: "secure-vision", file: "warehouse-secure-schematic-desktop.svg", label: "Secure-vision alert schematic", wide: "1046 / 340" },
];

/* ONE TILE = ONE DRAWING. Identical to Viso Yard's ProductCard — see that
   file for the reasoning: no 8px radius, no hairline box, no caption block
   under the artwork; the number + name sit ABOVE the drawing as a figure
   label (every one of these schematics has its own typesetting in at least
   one corner, so a title laid ON the artwork always collides with something),
   and the slot is 16:9 contain with a 28px pad so the margin reads as margin.
   Keep this in step with viso-yard/sections.tsx. */
function ProductCard({ p }: { p: (typeof PRODUCTS_OVERVIEW)[number] }) {
  return (
    <a
      href={`#${p.id}`}
      className="group"
      style={{ display: "block", textDecoration: "none", gridColumn: p.wide ? "1 / -1" : undefined }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, padding: "14px 20px 14px 20px", background: SURFACE_DARK }}>
        <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: TXT_D2 }}>{p.n}</span>
        <span style={{ fontFamily: sans, fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em", color: TXT_D1 }}>{p.name}</span>
      </div>
      <div style={{ position: "relative", width: "100%", aspectRatio: p.wide ?? "16 / 9", background: SURFACE_DARK, overflow: "hidden", padding: 28, boxSizing: "border-box" }}>
        <Schematic file={p.file} label={p.label} fit="contain" style={{ position: "absolute", inset: 28 }} />
      </div>
    </a>
  );
}

export function SectionProductsOverview() {
  return (
    <section className="hidden md:block" style={{ position: "relative" }}>
      {/* FULL SCREEN WIDTH — mounted OUTSIDE the page's 1620 rail row (see
          page.tsx BAND 2) so this grid can reach both edges of the viewport.
          One 24px value does every gap, exactly as Viso Yard. */}
      <div style={{ position: "relative", padding: "48px 24px 72px" }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 24 }}>
          {PRODUCTS_OVERVIEW.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

const CROSS_INK = "rgba(90,95,106,0.6)"; // corner ink on light bands
const MUTED = "#6C7480";

// dark-section eyebrow-row chrome: gridline through the eyebrow + one orange dot
function EyebrowRule({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: mobile ? 64 : 120, height: 1, background: GRID_D, zIndex: 0 }} />
      <Dot style={{ left: mobile ? 23 : 63, top: mobile ? 63 : 119, zIndex: 1 }} />
    </>
  );
}

// hairline media frame (r-2) that inlines a schematic
function MediaFrame({ file, label, style }: { file: string; label: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", background: SURFACE_DARK, border: `1px solid ${BORDER_D}`, borderRadius: 8, overflow: "hidden", ...style }}>
      <Schematic file={file} label={label} fit="width" style={{ display: "block", width: "100%" }} />
    </div>
  );
}

/* =========================================================================
   02 · AUDIT VISION [AUD]  (dark) — event-linked proof
   ========================================================================= */
const AUDIT_STEPS = [
  ["01", "Detect, don’t trigger", "no barcode. no button. the system sees it."],
  ["02", "Bind to the ID", "into the tamper-evident logbook"],
  ["03", "Retrieve in seconds", "search → clip → secure link"],
];
const AUDIT_SPECS = [
  ["TRIGGERED BY DETECTION", "NOT BY A SCAN"],
  ["BOUND TO THE ID", "TAMPER-EVIDENT LOG"],
  ["FOUND BY SEARCH", "THE ID IS THE INDEX"],
];
export function SectionAudit() {
  return (
    <section id="audit-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 128 }}>
        <EyebrowRule />
        <div style={{ position: "relative", zIndex: 1, padding: "104px 64px 0" }}>
          <span style={{ ...eyebrow(TXT_D2), display: "block", paddingLeft: 11 }}>02 — AUDIT VISION · ID-LINKED VIDEO PROOF · NO BARCODE, NO TRIGGER-MAN</span>
          <div style={{ marginTop: 40, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 90 }}>
            <h2 style={{ margin: 0, paddingLeft: 13, width: 572, fontFamily: sans, fontSize: 56, lineHeight: 1.06, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
              The dispute arrives.<br />The clip already exists.
            </h2>
            <p style={{ flex: "0 0 472px", width: 472, margin: 0, fontFamily: sans, fontSize: 22, lineHeight: 1.5, color: TXT_D2 }}>
              Every order packed, verified or returned is recorded and bound to its ID — automatically, because the system can see the work happening. Search the ID, get the moment.
            </p>
          </div>

          <div style={{ marginTop: 96, border: `1px solid ${BORDER_D}`, background: SURFACE_DARK, borderRadius: 8, overflow: "hidden" }}>
            <Schematic file="audit-schematic.svg" label="Audit trail — a detected event bound to an order ID, retrievable by search as a clip" fit="width" style={{ display: "block", width: "100%" }} />
          </div>

          <div style={{ marginTop: 96, borderTop: `1px solid rgba(244,245,247,0.18)`, borderBottom: `1px solid rgba(244,245,247,0.18)`, display: "flex", justifyContent: "space-between", gap: 24 }}>
            <div style={{ flex: "0 0 566px" }}>
              {AUDIT_STEPS.map(([n, t, d], i) => (
                <div key={n} style={{ display: "flex", alignItems: "baseline", gap: 24, padding: "20px 0 20px 12px", borderBottom: i < AUDIT_STEPS.length - 1 ? `1px solid ${BORDER_D}` : undefined }}>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2, flex: "0 0 26px" }}>{n}</span>
                  <span style={{ fontFamily: sans, fontSize: 20, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1, flex: "0 0 190px" }}>{t}</span>
                  <span style={{ fontFamily: mono, fontSize: 14, lineHeight: 1.6, color: TXT_D2 }}>{d}</span>
                </div>
              ))}
            </div>
            <div style={{ flex: "0 0 467px" }}>
              {AUDIT_SPECS.map(([k, v], i) => (
                <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "20px 0", borderBottom: i < AUDIT_SPECS.length - 1 ? `1px solid ${BORDER_D}` : undefined }}>
                  <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D1 }}>{k}</span>
                  <span style={{ fontFamily: mono, fontSize: 14, color: TXT_D2, textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ margin: "64px 0 0", maxWidth: 1000, paddingLeft: 43, fontFamily: mono, fontSize: 24, lineHeight: 1.6, color: TXT_D2 }}>
            WHY THIS ISN’T CCTV — Continuous surveillance footage is only useful if someone scrubs it. Event-linked footage is a database.
          </p>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px 40px" }}>
        <EyebrowRule mobile />
        <span style={{ ...eyebrow(TXT_D2), display: "block", fontSize: 11 }}>02 — AUDIT VISION · ID-LINKED VIDEO PROOF · NO BARCODE, NO TRIGGER-MAN</span>
        <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 36, lineHeight: 1.06, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
          The dispute arrives.<br />The clip already exists.
        </h2>
        <p style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 19, lineHeight: 1.5, color: TXT_D2 }}>
          Every order packed, verified or returned is recorded and bound to its ID — automatically, because the system can see the work happening. Search the ID, get the moment.
        </p>
        <div style={{ position: "relative", marginTop: 40, aspectRatio: "340 / 420", background: SURFACE_DARK, border: `1px solid ${BORDER_D}`, borderRadius: 8, boxSizing: "border-box", overflow: "hidden" }}>
          <Schematic file="audit-schematic-mobile.svg" label="Audit trail — event bound to an order ID, retrievable by search" fit="contain" style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ marginTop: 40, borderTop: `1px solid rgba(244,245,247,0.18)` }}>
          {AUDIT_STEPS.map(([n, t, d], i) => (
            <div key={n} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 0", borderBottom: `1px solid ${i < AUDIT_STEPS.length - 1 ? BORDER_D : "rgba(244,245,247,0.18)"}` }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2 }}>{n}</span>
                <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>{t}</span>
              </span>
              <span style={{ fontFamily: mono, fontSize: 13, lineHeight: 1.6, color: TXT_D2 }}>{d}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, borderTop: `1px solid rgba(244,245,247,0.18)`, borderBottom: `1px solid rgba(244,245,247,0.18)` }}>
          {AUDIT_SPECS.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "16px 0", borderBottom: i < AUDIT_SPECS.length - 1 ? `1px solid ${BORDER_D}` : undefined }}>
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D1 }}>{k}</span>
              <span style={{ fontFamily: mono, fontSize: 13, color: TXT_D2, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: "40px 0 0", fontFamily: mono, fontSize: 14, lineHeight: 1.6, color: TXT_D2 }}>
          WHY THIS ISN’T CCTV — Continuous surveillance footage is only useful if someone scrubs it. Event-linked footage is a database.
        </p>
      </div>
    </section>
  );
}

/* =========================================================================
   03 · DIMENSION VISION [DIM]  (light band) — volumetric capture
   ========================================================================= */
const DIMENSION_SPECS = [
  ["CAPTURED, NOT ESTIMATED", "AND NEVER TWO ANSWERS FROM TWO PEOPLE"],
  ["EVIDENCE ATTACHED", "THE ANNOTATED IMAGE RIDES WITH THE NUMBER"],
  ["IRREGULARS INCLUDED", "SACKS, DRUMS, SOFT PACKS, CYLINDERS"],
];
export function SectionDimension() {
  return (
    <section
      id="dimension-vision"
      className={`${ANCHOR_OFFSET} on-light`}
      style={{ position: "relative", background: CANVAS_LIGHT, boxSizing: "border-box", overflow: "hidden" }}
    >
      <Cross color={CROSS_INK} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_INK} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />
      <Cross color={CROSS_INK} style={{ left: -4, bottom: -4, zIndex: 3 }} />
      <Cross color={CROSS_INK} style={{ left: "calc(100% - 5px)", bottom: -4, zIndex: 3 }} />
      <div aria-hidden="true" className="hidden md:block" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Verticals color={GRID_L} />
      </div>

      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ position: "relative", zIndex: 1, maxWidth: 1232, margin: "0 auto", padding: "128px 64px 96px", boxSizing: "border-box" }}>
        <span style={{ ...eyebrow(TXT_L2), display: "block", fontSize: 14 }}>03 — DIMENSION VISION · VOLUMETRIC CAPTURE · CAMERA, NOT TAPE MEASURE</span>
        <div style={{ marginTop: 64, display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ flex: "0 0 395px" }}>
            <h2 style={{ margin: 0, fontFamily: sans, fontSize: 56, lineHeight: 1.06, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>The tape measure retires.</h2>
            <p style={{ margin: "32px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.4, color: TXT_L2 }}>
              Cartons, sacks, drums and pallets — including the irregular shapes a tape measure was never going to agree on — captured as volumetric data with an annotated image attached.
            </p>
          </div>
          <div style={{ flex: "1 1 auto", border: `1px solid ${GRID_L}`, boxSizing: "border-box" }}>
            <Schematic file="visotonics-dimension-schematic.svg" label="Dimension overview — front and side elevations with L/W/H callouts, captured from camera view" fit="width" style={{ display: "block", width: "100%" }} />
          </div>
        </div>

        <div style={{ marginTop: 96, borderTop: `1px solid rgba(90,95,106,0.4)`, borderBottom: `1px solid rgba(90,95,106,0.4)` }}>
          {DIMENSION_SPECS.map(([k, v], i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, height: 48, borderBottom: i < DIMENSION_SPECS.length - 1 ? `1px solid ${GRID_L}` : undefined }}>
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_L1 }}>{k}</span>
              <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", color: TXT_L2, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "48px 24px 56px" }}>
        <span style={{ ...eyebrow(TXT_L2), display: "block", fontSize: 12 }}>03 — DIMENSION VISION · VOLUMETRIC CAPTURE · CAMERA, NOT TAPE MEASURE</span>
        <h2 style={{ margin: "28px 0 0", fontFamily: sans, fontSize: 36, lineHeight: 1.06, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>The tape measure retires.</h2>
        <p style={{ margin: "20px 0 0", fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: TXT_L2 }}>
          Cartons, sacks, drums and pallets — including the irregular shapes a tape measure was never going to agree on — captured as volumetric data with an annotated image attached.
        </p>
        <div style={{ marginTop: 40, border: `1px solid ${GRID_L}`, boxSizing: "border-box" }}>
          <Schematic file="visotonics-dimension-schematic-mobile.svg" label="Dimension overview — front elevation with L/W/H callouts" fit="width" style={{ display: "block", width: "100%" }} />
        </div>
        <div style={{ marginTop: 40, borderTop: `1px solid rgba(90,95,106,0.4)`, borderBottom: `1px solid rgba(90,95,106,0.4)` }}>
          {DIMENSION_SPECS.map(([k, v], i) => (
            <div key={k} style={{ padding: "14px 0", borderBottom: i < DIMENSION_SPECS.length - 1 ? `1px solid ${GRID_L}` : undefined }}>
              <span style={{ display: "block", fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_L1 }}>{k}</span>
              <span style={{ display: "block", marginTop: 4, fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", color: TXT_L2 }}>{v}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   05 · WORK VISION [WRK]  (dark) — attendance without the queue
   ========================================================================= */
/* Ported from Claude Design canvas VisoWarehouse-Section05-WorkVision-
   Explorations.dc.html, option 1d "Centered Monument" — fully symmetrical,
   breaks from the sheet's usual left-margin convention on purpose. */
export function SectionWork({ n = "05" }: { n?: string }) {
  return (
    <section id="work-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", padding: "88px 64px 96px", textAlign: "center" }}>
        <span style={eyebrow(TXT_D2)}>{n} — WORK VISION · ZERO-INTERRUPTION PRESENCE</span>
        <h2 style={{ margin: "60px auto 0", maxWidth: 800, fontFamily: sans, fontSize: 60, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
          Nobody stops.<br />Nobody even notices.
        </h2>
        <p style={{ margin: "40px auto 0", maxWidth: 600, fontFamily: sans, fontSize: 18, lineHeight: 1.6, color: TXT_D2 }}>
          No cards to tap, no scanners to use, no habit to change. Standard CCTV captures the work as it already happens — and turns it into an exact record.
        </p>

        <div style={{ margin: "72px auto 0", maxWidth: 800, display: "flex" }}>
          <div style={{ flex: 1, padding: "0 24px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D1 }}>DETECT</div>
            <p style={{ margin: "10px 0 0", fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: TXT_D2 }}>Presence read from existing camera streams, no new hardware.</p>
          </div>
          <div style={{ flex: 1, padding: "0 24px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D1 }}>RESOLVE</div>
            <p style={{ margin: "10px 0 0", fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: TXT_D2 }}>Worker, zone and duration confirmed in the same pass.</p>
          </div>
          <div style={{ flex: 1, padding: "0 24px" }}>
            <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D1 }}>LOG</div>
            <p style={{ margin: "10px 0 0", fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: TXT_D2 }}>Entry and exit written to the second, without a checkpoint.</p>
          </div>
        </div>

        <p style={{ margin: "56px 0 0", fontFamily: mono, fontSize: 12, letterSpacing: "0.05em", color: MUTED }}>ZERO TRAINING REQUIRED — NOBODY CHANGES A SINGLE HABIT</p>

        <div aria-hidden="true" style={{ margin: "40px 0 0", height: 1, background: BORDER_D }} />

        <span style={{ display: "block", marginTop: 40, fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>LIVE DEMO — SHIFT REGISTER</span>
        {/* The live aisle, not the flat schematic. 16/9 at 1200 — the exact box
            the scene was authored and reviewed in (see the lab twin), and the
            framing is derived from the live aspect, so reshaping it re-frames
            the shot. 1200 rather than the SVG's 676: this scene has to carry a
            legible shift register AND three pole cameras resolving to one
            identity, and at 676 the register type is the size of a caption.
            Wider than the band's 800 copy measure on purpose — the demo is the
            evidence, not an illustration beside the argument.

            NO bleed, unlike the other flagships. The register block is pinned
            to the overlay's own bottom-left while the overlay stays on the real
            slot; bleeding the canvas would push the walker away from the type
            that captions them. The scene's author called this out explicitly. */}
        <div style={{ position: "relative", width: "100%", maxWidth: 1200, margin: "36px auto 0", aspectRatio: "16 / 9" }}>
          <WorkVisionScene bare />
        </div>

        <span style={{ display: "block", marginTop: 72, fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>WORK VISION · LIVE IN DAYS, NOT MONTHS</span>

        <div style={{ marginTop: 48, display: "flex", justifyContent: "center", alignItems: "baseline", gap: 18 }}>
          <span style={{ fontFamily: mono, fontSize: 64, fontWeight: 500, color: TXT_D1, lineHeight: 1 }}>4</span>
          <span style={{ fontFamily: sans, fontSize: 26, fontWeight: 600, color: TXT_D1 }}>days from install to verified presence.</span>
        </div>

        <p style={{ margin: "36px auto 0", maxWidth: 500, fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: TXT_D2 }}>
          Rapid software integration with the cameras already on your floor. Zero operations downtime, zero new hardware, zero hardware procurement cycle.
        </p>

        <div style={{ margin: "48px auto 0", maxWidth: 600, display: "flex" }}>
          <div style={{ flex: 1, padding: "0 16px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>CONNECT</div>
          </div>
          <div style={{ flex: 1, padding: "0 16px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>CALIBRATE</div>
          </div>
          <div style={{ flex: 1, padding: "0 16px" }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>VERIFY</div>
          </div>
        </div>

        <div aria-hidden="true" style={{ margin: "76px 0 0", height: 1, background: BORDER_D }} />
        <p style={{ margin: "40px auto 0", maxWidth: 800, fontFamily: sans, fontSize: 20, lineHeight: 1.5, color: TXT_D2 }}>
          A scanner is a checkpoint, and a checkpoint is a queue. The cameras don’t need anyone to stop.
        </p>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px", textAlign: "center" }}>
        <span style={{ ...eyebrow(TXT_D2), fontSize: 11 }}>{n} — WORK VISION · ZERO-INTERRUPTION PRESENCE</span>
        <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 38, lineHeight: 1.14, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>
          Nobody stops.<br />Nobody even notices.
        </h2>
        <p style={{ margin: "20px 0 0", fontFamily: sans, fontSize: 16, lineHeight: 1.6, color: TXT_D2 }}>
          No cards to tap, no scanners to use, no habit to change. Standard CCTV captures the work as it already happens — and turns it into an exact record.
        </p>

        <div style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: `1px solid ${BORDER_D}`, borderBottom: `1px solid ${BORDER_D}` }}>
          <div style={{ padding: "18px 10px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>DETECT</div>
            <p style={{ margin: "8px 0 0", fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: TXT_D2 }}>Presence read from existing streams, no new hardware.</p>
          </div>
          <div style={{ padding: "18px 10px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>RESOLVE</div>
            <p style={{ margin: "8px 0 0", fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: TXT_D2 }}>Worker, zone and duration confirmed.</p>
          </div>
          <div style={{ padding: "18px 10px" }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>LOG</div>
            <p style={{ margin: "8px 0 0", fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: TXT_D2 }}>Entry and exit to the second, no checkpoint.</p>
          </div>
        </div>

        <p style={{ margin: "28px 0 0", fontFamily: mono, fontSize: 11, letterSpacing: "0.05em", color: MUTED }}>ZERO TRAINING REQUIRED — NOBODY CHANGES A SINGLE HABIT</p>

        <div aria-hidden="true" style={{ marginTop: 32, height: 1, background: BORDER_D }} />

        <span style={{ display: "block", marginTop: 32, fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>LIVE DEMO — SHIFT REGISTER</span>
        {/* Same 16/9 and same no-bleed as desktop — the aspect drives the
            framing and the register is pinned to the overlay, so the mobile
            twin narrows without reshaping or bleeding. */}
        <div style={{ position: "relative", marginTop: 16, width: "100%", aspectRatio: "16 / 9" }}>
          <WorkVisionScene bare />
        </div>

        <span style={{ display: "block", marginTop: 40, fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>WORK VISION · LIVE IN DAYS, NOT MONTHS</span>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 53, fontWeight: 500, color: TXT_D1, lineHeight: 1 }}>4</span>
          <span style={{ fontFamily: sans, fontSize: 23, fontWeight: 600, color: TXT_D1, textAlign: "left" }}>days from install to verified presence.</span>
        </div>

        <p style={{ margin: "18px 0 0", fontFamily: sans, fontSize: 14, lineHeight: 1.6, color: TXT_D2 }}>
          Rapid software integration with the cameras already on your floor. Zero operations downtime, zero new hardware, zero hardware procurement cycle.
        </p>

        <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderTop: `1px solid ${BORDER_D}`, borderBottom: `1px solid ${BORDER_D}` }}>
          <div style={{ padding: "14px 8px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>CONNECT</div>
          </div>
          <div style={{ padding: "14px 8px", borderRight: `1px solid ${BORDER_D}` }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>CALIBRATE</div>
          </div>
          <div style={{ padding: "14px 8px" }}>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>VERIFY</div>
          </div>
        </div>

        <p style={{ margin: "28px 0 0", fontFamily: sans, fontSize: 17, lineHeight: 1.5, color: TXT_D2 }}>
          A scanner is a checkpoint, and a checkpoint is a queue. The cameras don’t need anyone to stop.
        </p>
        <div aria-hidden="true" style={{ marginTop: 28, height: 1, background: BORDER_D }} />
      </div>
    </section>
  );
}

/* =========================================================================
   06 · SECURE VISION [SEC]  (dark) — alerts and logs, does not deter
   ========================================================================= */
const SECURE_LEDGER = [
  ["EVENT — DETECTED", "continuous, on every feed"],
  ["CONTEXT — TRIAGED", "night · rain · fog · dust · motion blur"],
  ["ALERT — RAISED", "to your systems, over webhook"],
  ["CLIP — ATTACHED", "the moment, not the timeline"],
  ["CASE — LOGGED", "tamper-evident"],
];
export function SectionSecure({ n = "06" }: { n?: string }) {
  return (
    <section id="secure-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 96 }}>
        <EyebrowRule />
        <div style={{ position: "relative", zIndex: 1, padding: "104px 64px 0" }}>
          <span style={{ ...eyebrow(TXT_D2), display: "block", paddingLeft: 41 }}>{n} — SECURE VISION · ALERTS AND LOGS · DOES NOT DETER</span>
          <div style={{ marginTop: 40, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 64 }}>
            <h2 style={{ margin: 0, paddingLeft: 41, width: 837, fontFamily: sans, fontSize: 56, lineHeight: 1.06, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>An alarm that cries wolf is worse than no alarm.</h2>
            <p style={{ flex: "0 0 523px", width: 523, margin: 0, fontFamily: sans, fontSize: 20, lineHeight: 1.5, color: TXT_D2 }}>
              A guard cannot watch forty feeds. So most feeds are watched by nobody. The platform watches all of them — and it already knows the difference between a real event and a flapping tarp, because it reads through night, rain, fog, dust and motion blur.
            </p>
          </div>

          <MediaFrame file="warehouse-secure-schematic-desktop.svg" label="Signal trace — continuous feed with nuisance events filtered below threshold and one real event opening a case" style={{ margin: "56px 41px 0", borderRadius: 0 }} />

          <div style={{ margin: "72px 41px 0", borderTop: `1px solid rgba(244,245,247,0.18)`, borderBottom: `1px solid rgba(244,245,247,0.18)` }}>
            {SECURE_LEDGER.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, height: 48, borderBottom: i < SECURE_LEDGER.length - 1 ? `1px solid ${BORDER_D}` : undefined }}>
                <span style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.06em", color: TXT_D1 }}>{k}</span>
                <span style={{ fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: TXT_D2, textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>

          <p style={{ margin: "56px 41px 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>
            It alerts and logs. It does not deter — your alarm, your lights or your PA.
          </p>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px 40px" }}>
        <EyebrowRule mobile />
        <span style={{ ...eyebrow(TXT_D2), display: "block", fontSize: 11 }}>{n} — SECURE VISION · ALERTS AND LOGS · DOES NOT DETER</span>
        <h2 style={{ margin: "36px 0 0", fontFamily: sans, fontSize: 40, lineHeight: 1.04, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>An alarm that cries wolf is worse than no alarm.</h2>
        <p style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>
          A guard cannot watch forty feeds. So most feeds are watched by nobody. The platform watches all of them — and it already knows the difference between a real event and a flapping tarp, because it reads through night, rain, fog, dust and motion blur.
        </p>
        <MediaFrame file="warehouse-secure-schematic-mobile.svg" label="Signal trace — nuisance events filtered below threshold and one real event opening a case" style={{ marginTop: 40, borderRadius: 0 }} />
        <div style={{ marginTop: 40, borderTop: `1px solid rgba(244,245,247,0.18)`, borderBottom: `1px solid rgba(244,245,247,0.18)` }}>
          {SECURE_LEDGER.map(([k, v], i) => (
            <div key={k} style={{ padding: "14px 0", borderBottom: i < SECURE_LEDGER.length - 1 ? `1px solid ${BORDER_D}` : undefined }}>
              <span style={{ display: "block", fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: TXT_D1 }}>{k}</span>
              <span style={{ display: "block", marginTop: 4, fontFamily: mono, fontSize: 12, letterSpacing: "0.04em", color: TXT_D2 }}>{v}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: "40px 0 0", fontFamily: sans, fontSize: 16, lineHeight: 1.5, color: TXT_D2 }}>
          It alerts and logs. It does not deter — your alarm, your lights, your PA. We don’t sell you a strobe.
        </p>
      </div>
    </section>
  );
}

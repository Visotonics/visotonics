import type { CSSProperties } from "react";
import { Reveal } from "@/components/motion";
import {
  ANCHOR_OFFSET,
  BORDER_D,
  BORDER_D_STRONG,
  CANVAS_LIGHT,
  CROSS_D,
  Cross,
  Dot,
  GRID_D,
  GRID_D_DIM,
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
} from "./_shared";

// band-corner registration crosses use a slightly stronger dark ink on light
const CROSS_INK = "rgba(19,21,26,0.45)";
import { Schematic } from "./_media";
// lazy: keeps three.js out of this page's critical bundle — see _vision/lazy
import { ContainerVisionScene, GateVisionScene, TankVisionScene, YardVisionScene } from "@/components/vision/_vision/lazy";

/* ---------------------------------------------------------------------------
   Viso Yard — section modules. Ported from the approved Design exports as
   responsive flow layout (same translation approach as the home port): copy is
   verbatim, proportions preserved, drafting-sheet chrome via _shared. Demo slots
   inline the approved SVG via <Schematic> (a swappable media slot).
--------------------------------------------------------------------------- */

const CONTAINER_STEPS: { n: string; lines: string[]; alignEnd: boolean }[] = [
  { n: "01", lines: ["Capture from existing CCTV"], alignEnd: false },
  { n: "02", lines: ["Detect and segment every defect", "→ type, dimension, location, area [mm²]"], alignEnd: true },
  { n: "03", lines: ["Diff any two checkpoints (gate in, crane on/off, gate out)"], alignEnd: false },
  { n: "04", lines: ["Report in under a minute"], alignEnd: true },
];

/* =========================================================================
   00 · PRODUCTS OVERVIEW — 3×3 card grid, one per system, flagship schematic
   drawing itself in on view (same DrawSchematic 3-act animation used by each
   product's own section below). Sits between the hero and 01 Container.
   ========================================================================= */
const PRODUCTS_OVERVIEW: { n: string; name: string; desc: string; id: string; file: string; label: string; wide?: string }[] = [
  { n: "01", name: "Container Vision", desc: "Damage survey", id: "container-vision", file: "visotonics-container-schematic.svg", label: "Container damage-survey schematic" },
  { n: "02", name: "Tank Vision", desc: "Tank health", id: "tank-vision", file: "visotonics-tank-schematic-dark.svg", label: "Tank health schematic" },
  { n: "03", name: "Gate Vision", desc: "Identity at the gate", id: "gate-vision", file: "visotonics-gate-schematic.svg", label: "Gate identity-read schematic" },
  { n: "04", name: "Yard Vision", desc: "Live location", id: "yard-vision", file: "hero-card-01-yard.svg", label: "Yard live-location schematic" },
  { n: "05", name: "Crane Vision", desc: "Chain of custody", id: "crane-vision", file: "visotonics-crane-schematic-card.svg", label: "Crane-lift capture schematic" },
  { n: "06", name: "Cargo Vision", desc: "Count with proof", id: "cargo-vision", file: "visotonics-cargo-schematic.svg", label: "Cargo live-count schematic" },
  { n: "07", name: "Document Vision", desc: "Key-value extraction", id: "document-vision", file: "visotonics-document-schematic.svg", label: "Document key-value extraction schematic" },
  { n: "08", name: "Work Vision", desc: "Attendance from the cameras", id: "work-vision", file: "work-vision-schematic-desktop.svg", label: "Work-vision shift-register schematic" },
  // Secure's schematic is ultra-wide (viewBox 1046×340, ~3:1) — a 4:3 card
  // letterboxes it down to a thin strip, so it spans both columns at its own
  // wider aspect ratio instead of sharing a slot sized for the other eight.
  { n: "09", name: "Secure Vision", desc: "Alerts and logs", id: "secure-vision", file: "warehouse-secure-schematic-desktop.svg", label: "Secure-vision alert schematic", wide: "1046 / 340" },
];

function ProductCard({ p }: { p: (typeof PRODUCTS_OVERVIEW)[number] }) {
  return (
    <a
      href={`#${p.id}`}
      className="hover:border-white/25"
      style={{ display: "flex", flexDirection: "column", background: SURFACE_DARK, border: `1px solid ${BORDER_D}`, borderRadius: 8, overflow: "hidden", textDecoration: "none", transition: "border-color var(--duration-dur-1) var(--ease-standard)", gridColumn: p.wide ? "1 / -1" : undefined }}
    >
      {/* full-bleed media — schematic centred on its own #101216 canvas so the
          contain-letterboxing is seamless; 4:3 contains every viewBox uncropped
          (wide container/document, portrait crane) except Work/Secure, which
          get their own native aspect ratio across the full spanned width */}
      <div style={{ position: "relative", width: "100%", aspectRatio: p.wide ?? "4 / 3", borderBottom: `1px solid ${BORDER_D}` }}>
        <Schematic file={p.file} label={p.label} fit="contain" style={{ position: "absolute", inset: 0 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "24px 28px 28px" }}>
        <div className="flex items-baseline" style={{ gap: 12 }}>
          <span style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.04em", color: TXT_D2 }}>{p.n}</span>
          <span style={{ fontFamily: sans, fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>{p.name}</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 14, letterSpacing: "0.02em", color: TXT_D2 }}>— {p.desc}</span>
      </div>
    </a>
  );
}

export function SectionProductsOverview() {
  return (
    <section className="hidden md:block" style={{ position: "relative" }}>
      {/* the page's background Verticals split the 64px-inset sheet into 4
          equal columns (lines at 64px / 25% / 50% / 75% / 100%-64px); each
          card column occupies 2 of those. x=24 is the inset applied on BOTH
          sides of each card column relative to its own pair of gridlines —
          64+24 from the outer lines, and a 2×24=48 gap so each card's inner
          edge sits the same 24px off the centre line too. */}
      <div style={{ position: "relative", padding: "40px 88px 72px" }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 48 }}>
          {PRODUCTS_OVERVIEW.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   01 · CONTAINER VISION [DMG]  (dark) — flagship strong-rule frame
   ========================================================================= */
export function SectionContainer() {
  return (
    <section id="container-vision" className={ANCHOR_OFFSET} style={{ position: "relative" }}>
      {/* flagship strong-rule frame (Section 01 only): full-width top + bottom */}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: BORDER_D_STRONG, zIndex: 2 }} />
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 1, background: BORDER_D_STRONG, zIndex: 2 }} />
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: -4, bottom: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", bottom: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative" }}>
        {/* horizontal gridline through the eyebrow row + the section's one orange dot */}
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 120, height: 1, background: GRID_D, zIndex: 0 }} />
        <Dot style={{ left: 63, top: 119, zIndex: 1 }} />

        {/* lead: eyebrow + claim + mechanism steps */}
        <div style={{ position: "relative", zIndex: 1, padding: "104px 64px 0" }}>
          <p style={{ ...eyebrow(TXT_D2), margin: 0, paddingLeft: 24 }}>
            01 — CONTAINER VISION · PATENTED DAMAGE DETECTION
          </p>
          <h2
            style={{
              margin: "80px 0 0",
              paddingLeft: 6,
              maxWidth: 1312,
              fontFamily: sans,
              fontSize: 136,
              lineHeight: 1.01,
              fontWeight: 600,
              letterSpacing: "-0.035em",
              textTransform: "uppercase",
              color: TXT_D1,
            }}
          >
            Every dent, rust &amp; crack. Documented automatically.
          </h2>

          <div style={{ margin: "112px 0 96px", display: "flex", flexDirection: "column", gap: 28 }}>
            {CONTAINER_STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 20,
                  flexDirection: s.alignEnd ? "row-reverse" : "row",
                }}
              >
                <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2, flex: "0 0 auto" }}>
                  {s.n}
                </span>
                <span style={{ fontSize: 28, lineHeight: 1.5, color: TXT_D2, textAlign: s.alignEnd ? "right" : "left" }}>
                  {s.lines.map((l, i) => (
                    <span key={i} style={{ display: "block" }}>
                      {l}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* demo slot — full-bleed technical drawing, gridlines dim to 0.03 */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            <Verticals color={GRID_D_DIM} />
          </div>
          {/* No page-level mono labels here: the original flagship SVG carried
              its own "VSTU 907032 1 / MM² ANNOTATED / ISO 6346" caption as
              separate absolutely-positioned spans, but ContainerVisionScene
              already renders that same data inside its own overlay — keeping
              both left a stale duplicate floating at the SVG's old pixel
              offsets once the box's real height changed. */}
          {/* No vertical margin: the scene paints its own dark-blue cyclorama,
              so it runs edge-to-edge and the band's rules land on the frame's
              own top/bottom edges. The flat SVG needed the inset; this doesn't. */}
          <div style={{ position: "relative", zIndex: 1, width: "100%", aspectRatio: "1600 / 680" }}>
            <ContainerVisionScene bare bleed={230} />
          </div>
        </div>

        {/* proof zone — one relative container, elements absolutely positioned
            per the export (48-pair on grid cols 3–4, proof headline lower-left,
            hairline datum at 420, outcome + footnote below it). Lefts are % of
            the 1293px export container so they track the grid as the sheet
            scales. */}
        <div style={{ position: "relative", zIndex: 1, margin: "96px 64px 0", borderTop: `1px solid ${BORDER_D}`, height: 550, marginBottom: 120 }}>
          {/* PAIR 2 — TURNAROUND: cols 3–4 */}
          <span style={{ position: "absolute", left: "55%", top: 52, whiteSpace: "nowrap", fontFamily: sans, fontSize: 112, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>48</span>
          <span style={{ position: "absolute", left: "55.15%", top: 168, whiteSpace: "nowrap", fontFamily: sans, fontSize: 40, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>hours</span>
          <span style={{ position: "absolute", left: "67.7%", top: 79, fontFamily: sans, fontSize: 68, lineHeight: 1, fontWeight: 400, color: TXT_D2 }}>⟶</span>
          <span style={{ position: "absolute", left: "81.1%", top: 52, whiteSpace: "nowrap", fontFamily: sans, fontSize: 112, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>48</span>
          <span style={{ position: "absolute", left: "81.3%", top: 168, whiteSpace: "nowrap", fontFamily: sans, fontSize: 40, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>seconds</span>
          <span style={{ position: "absolute", left: "81.6%", top: 238, whiteSpace: "nowrap", fontFamily: mono, fontSize: 16, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>TURNAROUND TIME</span>

          {/* hairline between numbers zone and proof copy */}
          <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 420, height: 1, background: BORDER_D }} />

          {/* PROOF HEADLINE — title scale, lower-left */}
          <p style={{ position: "absolute", left: 14, top: 300, margin: 0, width: 716, fontFamily: sans, fontSize: 32, lineHeight: 1.4, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>
            Patented damage detection technology, <br />chosen by industrial leaders like Adani, DP World, Hind Terminals.
          </p>

          {/* OUTCOME */}
          <p style={{ position: "absolute", left: 13, top: 440, margin: 0, width: 880, fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>
            Damage above your threshold emails the concerned authority automatically.
          </p>

          {/* FOOTNOTE */}
          <p style={{ position: "absolute", left: 13, top: 494, margin: 0, width: 880, fontSize: 15, lineHeight: 1.6, color: TXT_D2 }}>
            Decodes images where generic OCR and leading vision models fail in our benchmarks — including low-light, motion blur, and partial occlusion.
          </p>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 64, height: 1, background: GRID_D, zIndex: 0 }} />
        <Dot style={{ left: 23, top: 63, zIndex: 1 }} />

        <div style={{ position: "relative", zIndex: 1, padding: "56px 24px 0 40px" }}>
          <p style={{ ...eyebrow(TXT_D2), margin: 0, fontSize: 11 }}>01 — CONTAINER VISION · PATENTED DAMAGE DETECTION</p>
          <h2 style={{ margin: "48px 0 0", fontFamily: sans, fontSize: 41, lineHeight: 1.02, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
            Every dent, rust &amp; crack. Documented automatically.
          </h2>
          <div style={{ margin: "48px 0 56px", display: "flex", flexDirection: "column", gap: 20 }}>
            {[
              { n: "01", t: "Capture from existing CCTV" },
              { n: "02", t: "Detect and segment every defect (type, dimension, location, mm² area)" },
              { n: "03", t: "Diff any two checkpoints (gate in, crane on/off, gate out)" },
              { n: "04", t: "Report in under a minute" },
            ].map((s) => (
              <div key={s.n} style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2, flex: "0 0 auto" }}>{s.n}</span>
                <span style={{ fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>{s.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Same as desktop: no page-level mono caption (the scene renders that
            data itself) and no inset, so the frame fills the band. */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "1600 / 680" }}>
            <ContainerVisionScene bare bleed={130} />
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 1, margin: "56px 24px 0", borderTop: `1px solid ${BORDER_D}`, paddingTop: 40, paddingBottom: 64 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 24 }}>
            <span style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: sans, fontSize: 48, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>48</span>
              <span style={{ fontFamily: sans, fontSize: 22, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>hours</span>
            </span>
            <span style={{ fontFamily: sans, fontSize: 26, lineHeight: 1, color: TXT_D2, marginTop: 12 }}>⟶</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: sans, fontSize: 48, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>48</span>
              <span style={{ fontFamily: sans, fontSize: 22, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>seconds</span>
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>TURNAROUND</span>
            </span>
          </div>
          <p style={{ margin: "72px 0 0", fontFamily: sans, fontSize: 22, lineHeight: 1.4, fontWeight: 500, letterSpacing: "-0.01em", color: TXT_D1 }}>
            Patented damage detection technology, chosen by industrial leaders like Adani, DP World, Hind Terminals.
          </p>
          <p style={{ margin: "28px 0 0", fontSize: 14, lineHeight: 1.5, color: TXT_D2 }}>
            Damage above your threshold emails the concerned authority automatically.
          </p>
          <p style={{ margin: "36px 0 0", fontSize: 8, lineHeight: 1.6, color: TXT_D2 }}>
            Decodes images where generic OCR and leading vision models fail in our benchmarks — including low-light, motion blur, and partial occlusion.
          </p>
        </div>
      </div>
    </section>
  );
}

/* light-band chrome shared by Tank + Platform: corner ink crosses, light
   gridlines, the eyebrow-row horizontal rule, and the one orange dot. */
function LightBandChrome() {
  return (
    <>
      <Cross color={CROSS_INK} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_INK} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />
      <Cross color={CROSS_INK} style={{ left: -4, bottom: -4, zIndex: 3 }} />
      <Cross color={CROSS_INK} style={{ left: "calc(100% - 5px)", bottom: -4, zIndex: 3 }} />
      {/* desktop: five sheet verticals + eyebrow rule at 120 + dot at 63,119 */}
      <div aria-hidden="true" className="hidden md:block" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <Verticals color={GRID_L} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 120, height: 1, background: GRID_L }} />
      </div>
      <div className="hidden md:block"><Dot style={{ left: 63, top: 119, zIndex: 1 }} /></div>
      {/* mobile: two margin verticals at 24 + eyebrow rule at 64 + dot at 23,63 */}
      <div aria-hidden="true" className="md:hidden" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 24, width: 1, background: GRID_L }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, right: 24, width: 1, background: GRID_L }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 64, height: 1, background: GRID_L }} />
      </div>
      <div className="md:hidden"><Dot style={{ left: 23, top: 63, zIndex: 1 }} /></div>
    </>
  );
}

/* =========================================================================
   02 · TANK VISION [TNK]  (light) — the small breather
   ========================================================================= */
export function SectionTank() {
  return (
    <section
      id="tank-vision"
      className={`${ANCHOR_OFFSET} on-light`}
      style={{ position: "relative", background: CANVAS_LIGHT, boxSizing: "border-box", overflow: "hidden" }}
    >
      <LightBandChrome />

      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ position: "relative", zIndex: 1, minHeight: 1104, padding: "112px 64px 0" }}>
        <p style={{ ...eyebrow(TXT_L2), margin: 0, paddingLeft: 24 }}>02 — TANK VISION</p>
        <h2 style={{ margin: "42px 0 0", paddingLeft: 6, maxWidth: 1040, fontFamily: sans, fontSize: 56, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>
          Tank health detection, from the cameras you already have.
        </h2>
        {/* demo slot — the 3D scene in the box the ink drawing used to hold, at
            the same aspect and bleed as Container Vision's so both flagships
            sit in the page the same way. No slot border, generous void. */}
        <div style={{ position: "relative", zIndex: 1, marginTop: 76, marginLeft: 3, width: "calc(100% - 6px)", aspectRatio: "1600 / 680" }}>
          <TankVisionScene bare bleed={230} />
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "56px 24px 56px 40px" }}>
        <p style={{ ...eyebrow(TXT_L2), margin: 0, fontSize: 11 }}>02 — TANK VISION</p>
        <h2 style={{ margin: "32px 0 0", fontFamily: sans, fontSize: 32, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>
          Tank health detection, from the cameras you already have.
        </h2>
        {/* same slot on mobile, at the schematic's aspect rather than a flat
            letterbox the scene was never framed for */}
        <div style={{ position: "relative", marginTop: 40, aspectRatio: "1600 / 680", boxSizing: "border-box" }}>
          <TankVisionScene bare bleed={130} />
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   PLATFORM BAND  (light) — one record, four checkpoints (the timeline)
   No rail id. Orange detection is DRAWN here (see census flag in the report).
   ========================================================================= */

// the 4 checkpoint stations sit at the midpoints of the 4 grid columns
const STATIONS = ["GATE IN", "CRANE ON", "CRANE OFF", "GATE OUT"];
const stationX = (i: number) => `calc(64px + (100% - 128px) * ${0.125 + 0.25 * i})`;
const gridX = (frac: number) => `calc(64px + (100% - 128px) * ${frac})`;

function CheckpointBox({ detection = false }: { detection?: boolean }) {
  const b = "1px solid rgba(19,21,26,0.8)";
  return (
    <div aria-hidden="true" style={{ position: "absolute", top: 458, left: -36, width: 72, height: 44 }}>
      <div style={{ position: "absolute", inset: 0, border: b }} />
      <div style={{ position: "absolute", left: -3, top: -3, width: 7, height: 7, borderTop: b, borderLeft: b }} />
      <div style={{ position: "absolute", right: -3, top: -3, width: 7, height: 7, borderTop: b, borderRight: b }} />
      <div style={{ position: "absolute", left: -3, bottom: -3, width: 7, height: 7, borderBottom: b, borderLeft: b }} />
      <div style={{ position: "absolute", right: -3, bottom: -3, width: 7, height: 7, borderBottom: b, borderRight: b }} />
      {detection ? (
        <div style={{ position: "absolute", left: 34, top: 6, width: 26, height: 22, border: `1.5px solid ${SIGNAL}`, background: "rgba(237,81,12,0.14)" }} />
      ) : null}
    </div>
  );
}

export function PlatformBand() {
  const LEDGER = [
    "CHECKPOINT DIFF — auditable damage attribution between any two checkpoints",
    "TAMPER-EVIDENT LOGBOOK — per container movement",
    "CHAIN OF CUSTODY — vessel → yard → gate",
  ];
  return (
    <section className="on-light" style={{ position: "relative", background: CANVAS_LIGHT, boxSizing: "border-box", overflow: "hidden" }}>
      <LightBandChrome />

      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ position: "relative", zIndex: 1, height: 840 }}>
        <p style={{ ...eyebrow(TXT_L2), position: "absolute", left: 88, top: 112, margin: 0 }}>THE PLATFORM — ONE RECORD, FOUR CHECKPOINTS</p>
        <h2 style={{ position: "absolute", left: 70, top: 166, margin: 0, width: 1200, fontFamily: sans, fontSize: 56, lineHeight: 1.04, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>
          Every movement, on the record.
        </h2>

        {/* timeline datum */}
        <div aria-hidden="true" style={{ position: "absolute", left: 64, right: 64, top: 430, height: 1, background: TXT_L1 }} />
        {/* diff markers on the datum (grid cols 2 & 4) */}
        <Cross color={TXT_L1} style={{ left: `calc(${gridX(0.25)} - 4px)`, top: 426, zIndex: 2 }} />
        <Cross color={TXT_L1} style={{ left: `calc(${gridX(0.75)} - 4px)`, top: 426, zIndex: 2 }} />

        {/* stations */}
        {STATIONS.map((label, i) => (
          <div key={label} style={{ position: "absolute", left: stationX(i), top: 0, bottom: 0, width: 0 }}>
            <div style={{ position: "absolute", top: 396, left: -80, width: 160, textAlign: "center", fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: TXT_L1 }}>
              {label}
            </div>
            <div aria-hidden="true" style={{ position: "absolute", top: 424, left: 0, width: 1, height: 13, background: TXT_L1 }} />
            <CheckpointBox detection={label === "CRANE OFF"} />
          </div>
        ))}

        {/* orange leader + attribution label off CRANE OFF (drawn detection UI) */}
        <div aria-hidden="true" style={{ position: "absolute", left: `calc(${stationX(2)} + 11px)`, top: 486, width: 1, height: 40, background: SIGNAL, zIndex: 1 }} />
        <div style={{ position: "absolute", left: stationX(2), top: 532, transform: "translateX(-50%)", whiteSpace: "nowrap", fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.06em", color: SIGNAL, zIndex: 1 }}>
          NEW DAMAGE — ATTRIBUTED TO CRANE OFF → GATE OUT
        </div>

        {/* ledger */}
        <div style={{ position: "absolute", left: 88, right: 64, top: 640, display: "flex", flexDirection: "column", gap: 26, zIndex: 1 }}>
          {LEDGER.map((l) => (
            <span key={l} style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: TXT_L2 }}>{l}</span>
          ))}
        </div>
      </Reveal>

      {/* MOBILE — timeline stacks vertically */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "56px 24px 56px 40px" }}>
        <p style={{ ...eyebrow(TXT_L2), margin: 0, fontSize: 11 }}>THE PLATFORM — ONE RECORD, FOUR CHECKPOINTS</p>
        <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 32, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>
          Every movement, on the record.
        </h2>
        <div style={{ margin: "40px 0 0", display: "flex", flexDirection: "column" }}>
          {STATIONS.map((label, i) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 16, paddingLeft: 4 }}>
              <span style={{ position: "relative", flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span aria-hidden="true" style={{ width: 10, height: 10, border: "1px solid rgba(19,21,26,0.8)", background: label === "CRANE OFF" ? "rgba(237,81,12,0.14)" : "transparent", borderColor: label === "CRANE OFF" ? SIGNAL : "rgba(19,21,26,0.8)" }} />
                {i < STATIONS.length - 1 ? <span aria-hidden="true" style={{ width: 1, height: 40, background: TXT_L1 }} /> : null}
              </span>
              <span style={{ paddingBottom: i < STATIONS.length - 1 ? 40 : 0, fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", color: TXT_L1 }}>
                {label}
                {label === "CRANE OFF" ? (
                  <span style={{ display: "block", marginTop: 6, fontSize: 12, letterSpacing: "0.06em", color: SIGNAL }}>NEW DAMAGE — ATTRIBUTED TO CRANE OFF → GATE OUT</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 20 }}>
          {LEDGER.map((l) => (
            <span key={l} style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: TXT_L2, lineHeight: 1.5 }}>{l}</span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

const MUTED = "#6C7480";

// dark-section eyebrow-row chrome: horizontal gridline through the eyebrow +
// the section's one orange registration dot at the left-margin intersection.
function EyebrowRule({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: mobile ? 64 : 120, height: 1, background: GRID_D, zIndex: 0 }} />
      <Dot style={{ left: mobile ? 23 : 63, top: mobile ? 63 : 119, zIndex: 1 }} />
    </>
  );
}

// hairline media frame (r-2) that inlines a schematic — reused across sections
function MediaFrame({ file, label, style }: { file: string; label: string; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", background: SURFACE_DARK, border: `1px solid ${BORDER_D}`, borderRadius: 12, overflow: "hidden", ...style }}>
      <Schematic file={file} label={label} fit="width" style={{ display: "block", width: "100%" }} />
    </div>
  );
}

/* =========================================================================
   03 · GATE VISION [OCR]  (dark) — metric-led
   ========================================================================= */
const GATE_LEDGER = [
  "Read every ID (container, ISO, trailer, wagon) on the move",
  "Decode where generic OCR fails (night, rain, fog, dust)",
  "Log the verified event (ID + seal check + timestamp)",
];
export function SectionGate() {
  return (
    <section id="gate-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 96 }}>
        <EyebrowRule />
        {/* lead: metric + dek */}
        <div style={{ position: "relative", zIndex: 1, padding: "104px 64px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 48 }}>
            <div style={{ paddingLeft: 8 }}>
              <p style={{ ...eyebrow(TXT_D2), margin: "0 0 100px" }}>03 — GATE VISION</p>
              <span style={{ display: "block", fontFamily: sans, fontSize: 208, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>~100%</span>
              <span style={{ display: "block", marginTop: 20, paddingLeft: 8, fontFamily: mono, fontSize: 21, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>ID READ ACCURACY</span>
            </div>
            <p style={{ margin: "96px 0 0", width: 483, textAlign: "right", fontFamily: sans, fontSize: 56, lineHeight: 1.45, fontWeight: 400, color: TXT_D2 }}>
              On moving trucks- in night, rain, fog and dust.
            </p>
          </div>

          {/* mechanism ledger */}
          <div style={{ marginTop: 64, borderTop: `1px solid ${BORDER_D}` }}>
            {GATE_LEDGER.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", padding: "34px 8px", borderBottom: `1px solid ${BORDER_D}` }}>
                <span style={{ flex: "0 0 104px", paddingLeft: 4, fontFamily: mono, fontSize: 16, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2 }}>{String(i + 1).padStart(2, "0")}</span>
                <span style={{ fontFamily: sans, fontSize: 28, lineHeight: 1.4, color: TXT_D1 }}>{t}</span>
              </div>
            ))}
          </div>

          {/* demo slot — the 3D scene inside the same r-2 media frame the
              schematic used, so the section's chrome is unchanged */}
          <div style={{ position: "relative", marginTop: 48, aspectRatio: "1600 / 680" }}>
            <GateVisionScene bare bleed={230} />
          </div>

          {/* proof — absolute composition per the export: giant number owns the
              block at left, the two sentences sit on grid cols 3 and 4 (lefts
              as % of the 1293px export container so they track the grid). */}
          <div style={{ position: "relative", marginTop: 96, borderTop: `1px solid ${BORDER_D}`, height: 264 }}>
            <span style={{ position: "absolute", left: 19, top: 15, fontFamily: sans, fontSize: 136, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>400,000</span>
            <span style={{ position: "absolute", left: 27, top: 180, fontFamily: mono, fontSize: 20, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>DAILY READS · ACROSS 25+ YARDS</span>
            <p style={{ position: "absolute", left: "52.4%", top: 43, margin: 0, width: 289, fontFamily: sans, fontSize: 24, lineHeight: 1.5, fontWeight: 400, color: TXT_D2 }}>The engine behind every gate on the platform.</p>
            <p style={{ position: "absolute", left: "78.7%", top: 42, margin: 0, width: 248, fontFamily: sans, fontSize: 24, lineHeight: 1.6, fontWeight: 400, color: TXT_D2 }}>Beats Google Vision API accuracy,<br />at a lower cost in our benchmarks.</p>
          </div>

          {/* outcome */}
          <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER_D}`, paddingTop: 34 }}>
            <p style={{ margin: 0, paddingLeft: 8, fontFamily: sans, fontSize: 14, lineHeight: 1.5, color: TXT_D2 }}>JSON to your system via API in real time; email on exceptions.</p>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px 40px" }}>
        <EyebrowRule mobile />
        <p style={{ ...eyebrow(TXT_D2), margin: 0, fontSize: 11 }}>03 — GATE VISION</p>
        <span style={{ display: "block", marginTop: 34, fontFamily: sans, fontSize: 76, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>~100%</span>
        <span style={{ display: "block", marginTop: 8, fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>ID READ ACCURACY</span>
        <p style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>On moving trucks, in night, rain, fog and dust.</p>
        <div style={{ marginTop: 44, borderTop: `1px solid ${BORDER_D}` }}>
          {GATE_LEDGER.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 4px", borderBottom: `1px solid ${BORDER_D}` }}>
              <span style={{ flex: "0 0 22px", fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.4, color: TXT_D1 }}>{t}</span>
            </div>
          ))}
        </div>
        {/* the mobile export's fixed-height slot, now holding the 3D scene.
            Kept at the schematic's aspect rather than the export's flat 240px
            so the scene isn't squeezed into a letterbox it was never framed for. */}
        <div style={{ position: "relative", marginTop: 32, aspectRatio: "1600 / 680", boxSizing: "border-box" }}>
          <GateVisionScene bare bleed={130} />
        </div>
        <div style={{ marginTop: 48, borderTop: `1px solid ${BORDER_D}`, paddingTop: 40 }}>
          <span style={{ display: "block", fontFamily: sans, fontSize: 52, lineHeight: 1, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>400,000</span>
          <span style={{ display: "block", marginTop: 12, fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>DAILY READS · ACROSS 25+ YARDS</span>
          <p style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.6, color: TXT_D2 }}>Beats Google Vision API accuracy at lower cost in our benchmarks.</p>
          <p style={{ margin: "12px 0 0", fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: TXT_D2 }}>The engine behind every gate on the platform.</p>
        </div>
        <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER_D}`, paddingTop: 28 }}>
          <p style={{ margin: 0, fontFamily: sans, fontSize: 10, lineHeight: 1.5, color: TXT_D2, textAlign: "center" }}>JSON to your system via API in real time; email on exceptions.</p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   04 · YARD VISION [TWN]  (dark) — map-led, hangs from a strong top rule only
   ========================================================================= */
const YARD_LEGEND = [
  ["01", "ONE-TIME SURVEY"],
  ["02", "PLACEMENT PLANNING — RECOMMENDED SLOT PER INBOUND"],
  ["03", "LIVE LOCATOR — EVERY MOVE INTO THE TWIN"],
];
const YARD_ROWS = ["A", "B", "C", "D", "E"];
const YARD_BAYS = ["01", "02", "03", "04", "05", "06", "07", "08"];
export function SectionYard() {
  const cell = (marked: boolean, h: number) => ({
    height: h,
    border: marked ? `1.5px solid ${SIGNAL}` : "1px solid rgba(244,245,247,0.14)",
    background: marked ? "rgba(237,81,12,0.14)" : "transparent",
    boxSizing: "border-box" as const,
  });
  return (
    <section id="yard-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D_STRONG}` }}>
      {/* strong top rule only — no bottom rule */}
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 140 }}>
        {/* eyebrow-row gridline only — §04's registration mark is the 8px
            square in the eyebrow (7a export has no grid dot) */}
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 120, height: 1, background: GRID_D, zIndex: 0 }} />
        <span style={{ position: "absolute", top: 44, right: 64, zIndex: 1, fontFamily: mono, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>04 · MAP-LED</span>

        <div style={{ position: "relative", zIndex: 1, padding: "104px 64px 0" }}>
          <p style={{ ...eyebrow(TXT_D2), margin: 0, display: "flex", alignItems: "center", gap: 14, paddingLeft: 6 }}>
            <span aria-hidden="true" style={{ width: 8, height: 8, background: SIGNAL }} />
            04 — YARD VISION
          </p>
          <h2 style={{ margin: "48px 0 0", width: 1080, fontFamily: sans, fontSize: 62, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
            One survey.<br />Then the yard runs on a live twin.
          </h2>

          <div aria-hidden="true" style={{ height: 130 }} />

          {/* legend stays — it is the only thing naming the three beats the
              animation plays, in the order it plays them */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 34 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, textAlign: "right", paddingRight: 20 }}>
              {YARD_LEGEND.map(([n, t]) => (
                <span key={n} style={{ fontFamily: mono, fontSize: 18, letterSpacing: "0.06em", color: TXT_D2 }}>
                  <span style={{ color: MUTED }}>{n}</span> {t}
                </span>
              ))}
            </div>
          </div>

          {/* demo slot — the aerial replaces the flat DOM slot map that used to
              sit here, at the same aspect and bleed as the other three flagships
              so all four sit in the page the same way.

              THE MAP IS GONE ON DESKTOP ON PURPOSE. It carried exactly what the
              scene now carries — five rows, eight bays, D-06 marked in the signal
              colour — and two grids saying the same thing at once read as
              redundancy rather than as reinforcement. What the map had and the
              scene does not is axis labels, and the scene does not need them: the
              callout states the address in words ("row D · bay 06 · tier 1"), so
              the slot reference is self-explaining rather than something you have
              to cross-reference against a legend.

              The map is KEPT on mobile — see the mobile branch below. */}
          <div style={{ position: "relative", zIndex: 1, marginLeft: 3, width: "calc(100% - 6px)", aspectRatio: "1600 / 680" }}>
            <YardVisionScene bare bleed={230} />
          </div>

          <div aria-hidden="true" style={{ height: 150 }} />

          {/* metric + outcome */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 26, paddingLeft: 6 }}>
            <span style={{ width: 321, textAlign: "center", fontFamily: sans, fontSize: 112, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_D1 }}>80%</span>
            <div style={{ width: 620, alignSelf: "center" }}>
              <span style={{ display: "block", fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>OF ASSET-TRACKING TIME SAVED</span>
              <p style={{ margin: "18px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>Ask for a container, get its precise location and recommended slot, fully automated.</p>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "48px 24px 56px" }}>
        <p style={{ ...eyebrow(TXT_D2), margin: 0, fontSize: 11, display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, background: SIGNAL }} />
          04 — YARD VISION
        </p>
        <h2 style={{ margin: "28px 0 0", fontFamily: sans, fontSize: 32, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>One survey. Then the yard runs on a live twin.</h2>
        <div style={{ margin: "44px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {YARD_LEGEND.map(([n, t]) => (
            <span key={n} style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.04em", color: TXT_D2 }}><span style={{ color: MUTED }}>{n}</span> {t}</span>
          ))}
        </div>
        {/* MOBILE KEEPS THE FLAT MAP. Not an oversight and not a fallback: an
            aerial of 55 containers at 375px puts each box at roughly 20px, where
            the stack heights, the empty slot and the bracket all stop resolving —
            everything the 3D exists to show is exactly what dies at that width.
            The map says the same thing legibly at any size, and costs no WebGL
            context on the device least able to afford one. */}
        <div style={{ margin: "32px 0 0" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <div style={{ width: 16 }} />
            {YARD_BAYS.map((b) => <div key={b} style={{ flex: 1, textAlign: "center", fontFamily: mono, fontSize: 9, color: MUTED }}>{b}</div>)}
          </div>
          {YARD_ROWS.map((r) => (
            <div key={r} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <div style={{ width: 16, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 9, color: MUTED }}>{r}</div>
              {YARD_BAYS.map((b) => <div key={b} style={{ flex: 1, ...cell(r === "D" && b === "06", 40) }} />)}
            </div>
          ))}
          <span style={{ display: "block", margin: "14px 0 0 22px", fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: SIGNAL }}>D-06 — LOCATED</span>
        </div>
        <div style={{ marginTop: 48 }}>
          <span style={{ display: "block", fontFamily: sans, fontSize: 56, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>80%</span>
          <span style={{ display: "block", marginTop: 12, fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>OF ASSET-TRACKING TIME SAVED</span>
          <p style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 16, lineHeight: 1.5, color: TXT_D2 }}>Ask for a container, get its precise location and recommended slot — fully automated.</p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   05 · CRANE VISION [LFT]  (dark) — vertical demo slot + copy column
   ========================================================================= */
const CRANE_LEDGER = [
  "Multi-camera capture per lift",
  "Sharpest-frame selection — crane vibration never becomes inspection error",
  "Severity heatmap; high severity alerts a surveyor for immediate review",
];
const CRANE_SPECS = ["ALL FACES CAPTURED PER LIFT", "VIBRATION-COMPENSATED", "MOTION-BLUR-CORRECTED", "SEVERITY-CLASSIFIED HEATMAP", "TIME-STAMPED AT DISCHARGE/LOAD"];
export function SectionCrane() {
  return (
    <section id="crane-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 96 }}>
        <EyebrowRule />
        <div style={{ position: "relative", zIndex: 1, padding: "128px 64px 0" }}>
          <p style={{ ...eyebrow(TXT_D2), margin: 0, paddingLeft: 13 }}>05 — CRANE VISION</p>
          <h2 style={{ margin: "38px 0 0", paddingLeft: 13, width: 943, fontFamily: sans, fontSize: 88, lineHeight: 1.02, fontWeight: 600, letterSpacing: "-0.03em", color: TXT_D1 }}>
            Every face, every lift, time-stamped.
          </h2>
        </div>

        <div style={{ position: "relative", zIndex: 1, margin: "48px 64px 0", display: "flex", gap: 64, alignItems: "flex-start", borderBottom: `1px solid ${BORDER_D}`, paddingBottom: 96 }}>
          {/* vertical demo slot ~1:2.2 */}
          <div style={{ flex: "0 0 420px" }}>
            <MediaFrame file="visotonics-crane-schematic.svg" label="Crane-lift capture schematic — multi-camera, vibration-compensated, severity heatmap" />
          </div>
          {/* copy column */}
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: `1px solid ${BORDER_D}` }}>
              {CRANE_LEDGER.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "30px 8px", borderBottom: `1px solid ${BORDER_D}` }}>
                  <span style={{ flex: "0 0 80px", paddingLeft: 4, fontFamily: mono, fontSize: 16, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: sans, fontSize: 24, lineHeight: 1.4, color: TXT_D1 }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 48, borderTop: `1px solid ${BORDER_D}` }}>
              {CRANE_SPECS.map((s) => (
                <div key={s} style={{ padding: "20px 8px", borderBottom: `1px solid ${BORDER_D}`, fontFamily: mono, fontSize: 16, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>{s}</div>
              ))}
            </div>
            <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER_D}`, paddingTop: 28 }}>
              <p style={{ margin: 0, paddingLeft: 8, fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D2 }}>A definitive record at the exact moment of discharge or load — chain of custody from vessel to yard.</p>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px 40px" }}>
        <EyebrowRule mobile />
        <p style={{ ...eyebrow(TXT_D2), margin: 0, fontSize: 11 }}>05 — CRANE VISION</p>
        <h2 style={{ margin: "40px 0 0", fontFamily: sans, fontSize: 40, lineHeight: 1.04, fontWeight: 600, letterSpacing: "-0.03em", color: TXT_D1 }}>Every face, every lift, time-stamped.</h2>
        {/* fixed-height portrait contain slot, per the mobile export */}
        <div style={{ position: "relative", marginTop: 40, height: 752, background: SURFACE_DARK, border: `1px solid ${BORDER_D}`, borderRadius: 12, boxSizing: "border-box", overflow: "hidden" }}>
          <Schematic file="visotonics-crane-schematic.svg" label="Crane-lift capture schematic" fit="contain" style={{ width: "100%", height: "100%" }} />
        </div>
        <div style={{ marginTop: 44, borderTop: `1px solid ${BORDER_D}` }}>
          {CRANE_LEDGER.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "22px 4px", borderBottom: `1px solid ${BORDER_D}` }}>
              <span style={{ flex: "0 0 22px", fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2 }}>{String(i + 1).padStart(2, "0")}</span>
              <span style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.4, color: TXT_D1 }}>{t}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER_D}` }}>
          {CRANE_SPECS.map((s) => (
            <div key={s} style={{ padding: "16px 4px 16px 12px", borderBottom: `1px solid ${BORDER_D}`, fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>{s}</div>
          ))}
        </div>
        <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER_D}`, paddingTop: 28 }}>
          <p style={{ margin: 0, textAlign: "center", fontFamily: sans, fontSize: 16, lineHeight: 1.5, color: TXT_D2 }}>A definitive record at the exact moment of discharge or load — chain of custody from vessel to yard.</p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   06 · CARGO VISION [CNT]  (dark) — three-zone, large voids
   ========================================================================= */
const CARGO_MATERIALS = [
  ["01", "CARTONS"], ["02", "GUNNY BAGS"], ["03", "JUMBO BAGS"],
  ["04", "PALLETS"], ["05", "DRUMS"], ["06", "BARRELS"],
];
export function SectionCargo({ n = "06" }: { n?: string }) {
  return (
    <section id="cargo-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 96 }}>
        <EyebrowRule />
        <div style={{ position: "relative", zIndex: 1, padding: "112px 64px 0 88px" }}>
          <span style={{ display: "block", ...eyebrow(TXT_D2) }}>{n} — CARGO VISION</span>
          <h2 style={{ margin: "56px 0 0", fontFamily: sans, fontSize: 102, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.025em", color: TXT_D1 }}>
            Every case counted,<br />with video proof attached.
          </h2>
        </div>

        <div aria-hidden="true" style={{ height: 72 }} />

        {/* centered demo slot (4:3) + caption */}
        <div style={{ position: "relative", zIndex: 1, margin: "0 64px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MediaFrame file="visotonics-cargo-schematic.svg" label="Cargo destuff live-count schematic — cartons, bags, pallets, drums counted on video with proof" style={{ width: "100%", borderRadius: 8 }} />
          <p style={{ margin: "24px 0 0", textAlign: "center", fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: TXT_D2 }}>Automatic, accurate count with video proof per session.</p>
        </div>

        <div aria-hidden="true" style={{ height: 72 }} />

        {/* index band */}
        <div style={{ position: "relative", zIndex: 1, margin: "0 64px", padding: "0 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr 1fr", gap: 56, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 58, paddingLeft: 6 }}>
            {CARGO_MATERIALS.slice(0, 3).map(([n, t]) => (
              <div key={n} style={{ display: "flex", gap: 20 }}>
                <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", color: MUTED }}>{n}</span>
                <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 58, paddingLeft: 26 }}>
            {CARGO_MATERIALS.slice(3).map(([n, t]) => (
              <div key={n} style={{ display: "flex", gap: 20 }}>
                <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", color: MUTED }}>{n}</span>
                <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>{t}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, paddingLeft: 46, width: 258, fontFamily: sans, fontSize: 22, lineHeight: 1.6, color: TXT_D1 }}>
            Detect every item on video during stuffing/destuffing. Inspect for damage in the same pass. Alert the command center in real time, even offline.
          </p>
          <div>
            <span style={{ display: "block", fontFamily: sans, fontSize: 78, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>60%</span>
            <span style={{ display: "block", marginTop: 14, fontFamily: mono, fontSize: 17, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2 }}>REDUCTION IN INVENTORY SHRINKAGE</span>
            <p style={{ margin: "20px 0 0", fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: TXT_D2 }}>Works where your connectivity doesn&apos;t — full detection and alerting on board, offline.</p>
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px 40px" }}>
        <EyebrowRule mobile />
        <span style={{ display: "block", ...eyebrow(TXT_D2), fontSize: 11 }}>{n} — CARGO VISION</span>
        <h2 style={{ margin: "40px 0 0", fontFamily: sans, fontSize: 32, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>Every case counted, with video proof attached.</h2>
        <div aria-hidden="true" style={{ height: 32 }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <MediaFrame file="visotonics-cargo-schematic.svg" label="Cargo destuff live-count schematic" style={{ width: "100%", borderRadius: 8 }} />
          <p style={{ margin: "20px 0 0", textAlign: "center", fontFamily: sans, fontSize: 12, lineHeight: 1.5, color: TXT_D2 }}>Automatic, accurate count with video proof per session.</p>
        </div>
        <div aria-hidden="true" style={{ height: 32 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <div>
            <span style={{ display: "block", fontFamily: sans, fontSize: 72, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>60%</span>
            <span style={{ display: "block", marginTop: 12, fontFamily: mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>REDUCTION IN INVENTORY SHRINKAGE</span>
            <p style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: TXT_D2 }}>Works where your connectivity doesn&apos;t — full detection and alerting on board, offline.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {[CARGO_MATERIALS.slice(0, 3), CARGO_MATERIALS.slice(3)].map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {col.map(([n, t]) => (
                  <div key={n} style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: MUTED }}>{n}</span>
                    <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D2 }}>{t}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: TXT_D1 }}>Detect every item on video during stuffing/destuffing. Inspect for damage in the same pass. Alert the command center in real time, even offline.</p>
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   07 · DOCUMENT VISION [DOC]  (dark) — centered, no eyebrow-row gridline
   ========================================================================= */
export function SectionDocument({ n = "07" }: { n?: string }) {
  return (
    <section id="document-vision" className={ANCHOR_OFFSET} style={{ position: "relative", borderTop: `1px solid ${BORDER_D}`, borderBottom: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: 60, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: 60, bottom: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", bottom: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", zIndex: 1, padding: "100px 0" }}>
        <p style={{ ...eyebrow(TXT_D2), margin: "0 0 0 88px", display: "flex", alignItems: "center", gap: 14 }}>
          <span aria-hidden="true" style={{ width: 8, height: 8, background: SIGNAL }} />
          {n} — DOCUMENT VISION · KEY-VALUE EXTRACTION, WHERE GENERIC OCR FAILS
        </p>
        <h2 style={{ margin: "56px 0 0", textAlign: "center", fontFamily: sans, fontSize: 64, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
          Bill of Lading in. Structured data out.
        </h2>
        <div aria-hidden="true" style={{ height: 96 }} />
        <MediaFrame file="visotonics-document-schematic.svg" label="Bill of Lading to structured-data transformation — key-value extraction where generic OCR fails" style={{ width: 864, margin: "0 auto", borderRadius: 8 }} />
        <div aria-hidden="true" style={{ height: 96 }} />
        <p style={{ margin: 0, textAlign: "center", fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: TXT_D2 }}>Reads documents where generic OCR fails in our benchmarks.</p>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "48px 24px 56px" }}>
        <p style={{ ...eyebrow(TXT_D2), margin: 0, fontSize: 11, display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-hidden="true" style={{ width: 7, height: 7, background: SIGNAL }} />
          {n} — DOCUMENT VISION · KEY-VALUE EXTRACTION
        </p>
        <h2 style={{ margin: "28px 0 0", textAlign: "center", fontFamily: sans, fontSize: 30, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>Bill of Lading in. Structured data out.</h2>
        <div style={{ position: "relative", marginTop: 44, background: SURFACE_DARK, border: `1px solid ${BORDER_D}`, borderRadius: 8, overflow: "hidden" }}>
          <span style={{ position: "absolute", left: 12, top: 10, zIndex: 2, fontFamily: mono, fontSize: 10, letterSpacing: "0.06em", color: MUTED }}>BOL → STRUCTURED</span>
          <Schematic file="visotonics-document-schematic.svg" label="Bill of Lading to structured-data transformation" style={{ display: "block", width: "100%" }} />
        </div>
        <p style={{ margin: "44px 0 0", textAlign: "center", fontFamily: sans, fontSize: 15, lineHeight: 1.5, color: TXT_D2 }}>Reads documents where generic OCR fails — in our benchmarks.</p>
      </div>
    </section>
  );
}

/* =========================================================================
   08 / 09 · REGISTER CLOSE  (dark) — final band, two ruled rows + colophon
   Anchor ids #work-vision (08) and #secure-vision (09) live on the two rows.
   ========================================================================= */
const REGISTER_ROWS = [
  { id: "work-vision", label: "08 — WORK VISION [WRK]" },
  { id: "secure-vision", label: "09 — SECURE VISION [SEC]" },
];
function EndMark() {
  return (
    <span aria-hidden="true" style={{ position: "relative", width: 9, height: 9, opacity: 0.5 }}>
      <span style={{ position: "absolute", left: 0, right: 0, top: 4, height: 1, background: TXT_D2 }} />
      <span style={{ position: "absolute", top: 0, bottom: 0, left: 4, width: 1, background: TXT_D2 }} />
    </span>
  );
}
export function RegisterClose() {
  return (
    <section style={{ position: "relative", borderTop: `1px solid ${BORDER_D}` }}>
      <Cross color={CROSS_D} style={{ left: 60, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: -4, zIndex: 3 }} />

      {/* one responsive DOM so the 08/09 anchor ids exist once and stay
          visible at every breakpoint. Desktop: full-width baseline rows,
          140px void. Mobile (7f export): right-aligned colophon label,
          stacked rows, tighter margins. */}
      <div className="relative z-[1] px-6 py-12 md:px-0 md:pt-[100px] md:pb-[120px]">
        <span className="block text-right md:hidden" style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>
          08/09 · COLOPHON
        </span>
        <div className="mt-8 md:mt-0 md:mx-16" style={{ borderTop: `1px solid ${BORDER_D}` }}>
          {REGISTER_ROWS.map((r) => (
            <div
              key={r.id}
              id={r.id}
              className={`${ANCHOR_OFFSET} flex flex-col gap-[10px] p-[22px_4px] md:flex-row md:items-baseline md:justify-between md:gap-8 md:p-[30px_8px]`}
              style={{ borderBottom: `1px solid ${BORDER_D}` }}
            >
              <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: TXT_D1 }}>{r.label}</span>
              <span className="text-[12px] md:text-[13px]" style={{ fontFamily: mono, letterSpacing: "0.06em", color: TXT_D2 }}>runs on the same platform and cameras</span>
            </div>
          ))}
        </div>

        <div className="mt-14 flex items-center justify-center gap-4 md:mt-[140px] md:gap-5">
          <EndMark />
          <span className="text-[12px] md:text-[13px]" style={{ fontFamily: mono, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: TXT_D2, opacity: 0.5 }}>— END OF REGISTER · VISO YARD —</span>
          <EndMark />
        </div>
      </div>
    </section>
  );
}

import { readFileSync } from "node:fs";
import path from "node:path";
import type { CSSProperties } from "react";
import { CountUp, Reveal, UnderlineDraw } from "@/components/motion";
import { TestimonialPagerDesktop, TestimonialPagerMobile } from "@/components/testimonial-pager";
import { DrawSchematic } from "@/components/draw-schematic";
import DecryptedText from "@/components/decrypted-text";
// lazy: keeps three.js out of the homepage's critical bundle — see _vision/lazy
import { DataCard, FactoryCard, LeadCardScene, WarehouseCard, YardCard } from "@/components/vision/_vision/lazy";

// inlined (not <Image>) so the lead-card schematic can draw itself in via
// DrawSchematic, same reveal used for every flagship SVG on the platform
// pages — preserveAspectRatio stands in for the old object-fit: cover/top.
const LEADCARD_SVG_RAW = readFileSync(path.join(process.cwd(), "public", "assets", "home-leadcard-schematic.svg"), "utf8");
function leadcardSvg(preserveAspectRatio: string) {
  return LEADCARD_SVG_RAW.replace(/<svg\b/, `<svg preserveAspectRatio="${preserveAspectRatio}" style="display:block;width:100%;height:100%"`);
}

/* ---------------------------------------------------------------------------
   Visotonics home page — Drafting Table
   Ported from Claude Design: Hero-DraftingTable.dc.html (frames 1a desktop / 1b mobile).
   Scroll order (per request): hero → statement → how-it-works → metrics
   → proof+partners → testimonials → convert.
   Nav + footer are supplied by app/layout.tsx (SiteNav / SiteFooter).
   Signal #ED510C is used only for registration dots. Reduced-motion is handled
   globally in globals.css (all durations → 0).
--------------------------------------------------------------------------- */

const DARK = "#0A0B0E";
const DARK_SURFACE = "#101216";
const LIGHT = "#ECEDEF";
const LIGHT_SURFACE = "#F6F7F8";
const TXT_D1 = "#F4F5F7";
const TXT_D2 = "#A6ADB8";
const TXT_L1 = "#13151A";
const TXT_L2 = "#6B7078";
const GRID_D = "rgba(244,245,247,0.08)";
const GRID_L = "rgba(19,21,26,0.06)";
const CROSS_D = "rgba(244,245,247,0.4)";
const CROSS_L = "rgba(19,21,26,0.30)";
const BORDER_D = "rgba(244,245,247,0.10)";
const RULE_L = "#D4D6DB";
const SIGNAL = "#ED510C";

const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

/* ---- drafting-sheet primitives -------------------------------------------- */

// 9px registration cross, anchored to a corner / rule endpoint.
function Cross({ color, style }: { color: string; style: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", width: 9, height: 9, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 1, background: color }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 4, width: 1, background: color }} />
    </div>
  );
}

// 3px signal-orange registration dot.
function Dot({ style }: { style: CSSProperties }) {
  return <div aria-hidden="true" style={{ position: "absolute", width: 3, height: 3, background: SIGNAL, ...style }} />;
}

/* SIGNAL CROSS — an orange registration cross, 11px, for the points that
   MATTER. The sheet already has white 9px crosses at every rule endpoint;
   those are structure. This is the accent's smallest legitimate unit and it is
   used sparingly, at the intersections the eye is already travelling through. */
function SignalCross({ style }: { style: CSSProperties }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", width: 11, height: 11, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 5, height: 1, background: SIGNAL }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 5, width: 1, background: SIGNAL }} />
    </div>
  );
}

/* DIMENSION CALLOUT — the drafting sheet's own way of saying "this is the
   measured thing", in the accent, spanning something real.

   This is the single highest-value accent move available on the hero, and the
   reason is that it is not decoration: a dimension line is what a drafting
   sheet DOES. It puts colour at page scale, it points at the headline rather
   than sitting next to it, and it is the first thing on the page that is
   neither type nor a 3px dot. Extension ticks at each end, a rule between, and
   a mono label sitting on the rule with the background knocked out behind it. */
function DimensionSpan({
  label, left, right, top, background,
}: { label: string; left: number | string; right: number | string; top: number | string; background: string }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left, right, top, height: 9 }}>
      {/* the measured rule */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 1, background: SIGNAL, opacity: 0.55 }} />
      {/* extension ticks, one at each end */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1, height: 9, background: SIGNAL }} />
      <div style={{ position: "absolute", right: 0, top: 0, width: 1, height: 9, background: SIGNAL }} />
      {/* the label, knocking a hole in the rule the way a real callout does */}
      <span
        style={{
          position: "absolute", left: "50%", top: -3, transform: "translateX(-50%)",
          padding: "0 8px", background,
          fontFamily: mono, fontSize: 10, letterSpacing: "0.14em", lineHeight: "15px",
          color: SIGNAL, whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// The 5 page-wide verticals: margins at 64 / (100%-64), interiors dividing the
// inset content into 4 equal columns. Same coordinates in every section so the
// sheet reads continuous.
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

// full-width horizontal rule + a registration cross at each endpoint (on the margins)
function HRule({ top, color, cross }: { top: number | string; color: string; cross: string }) {
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top, height: 1, background: color }} />
      <Cross color={cross} style={{ left: 60, top: `calc(${typeof top === "number" ? `${top}px` : top} - 4px)` }} />
      <Cross color={cross} style={{ left: "calc(100% - 68px)", top: `calc(${typeof top === "number" ? `${top}px` : top} - 4px)` }} />
    </>
  );
}

const SHEET: CSSProperties = { position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto" };

/* shared text styles */
const eyebrow = (color: string): CSSProperties => ({
  fontFamily: mono,
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color,
});

/* =========================================================================
   1 · HERO  (dark)
   ========================================================================= */

const HERO_CARDS = [
  { num: "01", name: "Viso Yard", desc: "Container, gate, crane, yard & cargo inspection", href: "/platform/viso-yard", img: "/assets/hero-card-01-yard.svg" },
  { num: "02", name: "Viso Warehouse", desc: "Counting, audit & dimensioning", href: "/platform/viso-warehouse", img: "/assets/hero-card-02-warehouse.svg" },
  { num: "03", name: "Viso Factory", desc: "Production & process monitoring", href: "/platform/viso-factory", img: "/assets/hero-card-03-factory.svg" },
  { num: "04", name: "Viso Data", desc: "Compression, trace & detection AI", href: "/platform/viso-data", img: "/assets/hero-card-04-data.svg" },
];

const CARD_SCENES = [YardCard, WarehouseCard, FactoryCard, DataCard];

const HERO_CARD_CSS = `
/* CARD CHROME REACTS WITH THE SCENE.

   Scoped to a lab-only class and injected here rather than added to globals.css:
   dt-card is shared with the production homepage, and everything in this work
   stays in labs until signed off.

   :focus-visible is paired with :hover throughout for the same reason the scene
   listens to focusin — these are anchors, and a keyboard user must get the same
   response. */
.lab-hc {
  transition: border-color 280ms ease, background-color 280ms ease;
}
/* !important is load-bearing here, not laziness. Both cards set border and
   background as INLINE styles, and an inline declaration beats any class
   selector — without this the rule silently loses and the border never changes.
   Caught by reading back getComputedStyle rather than trusting the screenshot,
   where the leader line drawing was masking the fact that nothing else moved. */
.lab-hc:hover,
.lab-hc:focus-visible {
  border-color: rgba(237, 81, 12, 0.55) !important;
  background-color: #13161C !important;
}
/* the part number's leader rule DRAWS toward the panel on hover: short and
   faint at rest, running the full width and bright on interaction */
.lab-hc .lab-lead {
  transform: scaleX(0.42);
  transform-origin: left center;
  opacity: 0.22;
  transition: transform 340ms cubic-bezier(0.2, 0.75, 0.2, 1), opacity 260ms ease;
}
.lab-hc:hover .lab-lead,
.lab-hc:focus-visible .lab-lead {
  transform: scaleX(1);
  opacity: 0.9;
}
.lab-hc .lab-num { opacity: 0.72; transition: opacity 240ms ease; }
.lab-hc:hover .lab-num,
.lab-hc:focus-visible .lab-num { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .lab-hc, .lab-hc .lab-lead, .lab-hc .lab-num { transition: none; }
  .lab-hc .lab-lead { transform: scaleX(1); opacity: 0.6; }
}
`;

function Hero() {
  return (
    <section style={{ background: DARK, borderTop: `1px solid ${GRID_D}` }}>
      <style>{HERO_CARD_CSS}</style>
      {/* DESKTOP */}
      <div className="hidden md:block" style={{ ...SHEET, minHeight: 828 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Verticals color={GRID_D} />
          <HRule top={336} color={GRID_D} cross={CROSS_D} />
          <HRule top={384} color={GRID_D} cross={CROSS_D} />
          <Cross color={CROSS_D} style={{ left: 60, top: 4 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: 4 }} />
          <Cross color={CROSS_D} style={{ left: 60, top: "calc(100% - 13px)" }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: "calc(100% - 13px)" }} />
          {/* signal-orange registration dots at gridline intersections */}
          <Dot style={{ left: "calc(64px + (100% - 128px) * 0.75)", top: 1 }} />
          <Dot style={{ left: "calc(64px + (100% - 128px) * 0.25)", top: 383 }} />
          <Dot style={{ left: "50%", top: "calc(100% - 1px)" }} />
          {/* the accent now MARKS the sheet's real intersections, at 11px rather
              than 3px — where the interior verticals meet the two rules that
              bracket the log row. Two points, both already on the eye's path
              from the headline down to the cards. */}
          <SignalCross style={{ left: "calc(64px + (100% - 128px) * 0.25 - 5px)", top: 331 }} />
          <SignalCross style={{ left: "calc(64px + (100% - 128px) * 0.75 - 5px)", top: 379 }} />
        </div>

        {/* THE HEADLINE IS DIMENSIONED. Spans the log row, directly under the
            slab, so it reads as a measurement OF the headline rather than as a
            band of its own. Inset to the same 25%/75% verticals the sheet
            already uses, so it lands on the grid instead of floating. */}
        <DimensionSpan
          label="ONE VISION LAYER"
          left="calc(64px + (100% - 128px) * 0.25)"
          right="calc(64px + (100% - 128px) * 0.25)"
          top={332}
          background={DARK}
        />

        {/* top band — slab headline */}
        <div style={{ position: "relative", zIndex: 1, padding: "72px 64px 0", height: 336, boxSizing: "border-box", display: "flex", justifyContent: "center" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: sans,
              fontSize: 85,
              lineHeight: 1.02,
              fontWeight: 600,
              letterSpacing: "0.01em",
              color: TXT_D1,
              maxWidth: 1257,
              textAlign: "center",
            }}
          >
            <DecryptedText text="Vision-AI Platform" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
            <br />
            <DecryptedText text="for Industrial Operations" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
          </h1>
        </div>

        {/* log row */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            height: 48,
            padding: "0 88px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ ...eyebrow("rgba(244,245,247,0.3)"), whiteSpace: "nowrap" }}>OUR PLATFORM&nbsp;— YOUR CAMERAS</span>
          <span style={{ ...eyebrow("rgba(244,245,247,0.3)"), whiteSpace: "nowrap" }}>PATENTED TECHNOLOGY</span>
        </div>

        {/* card band

            TIER 2 — BREAKING THE TILING. Two changes, both structural rather
            than decorative:

            1. NEGATIVE TOP MARGIN. The band is pulled up 14px so the animation
               panels CROSS the horizontal rule above them instead of sitting
               tidily beneath it. Four rectangles arranged politely inside their
               cells is what made the row read as pasted-in images; one element
               breaking one rule is enough to make the page read as composed.
               14px, not 34: the first attempt crossed the rule AND swallowed the
               log row's two labels, which sit in the 48px between the rules.
               The overlap has to clear the rule and nothing else.
            2. CARD 01 WAS WIDER — 1.34fr against three 1fr columns, on the
               argument that four equal columns have no hierarchy and Yard is
               the flagship module. REVERSED 2026-07-27 by explicit user call:
               all four cards are even, and the hierarchy is carried by the
               scenes themselves rather than by column width. Point 1, the
               rule-overlap, stays. */}
        <div style={{ position: "relative", zIndex: 2, padding: "0 64px 44px", marginTop: -14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
            {HERO_CARDS.map((c, i) => (
              <a
                key={c.num}
                href={c.href}
                className="dt-card lab-hc"
                style={{
                  position: "relative",
                  boxSizing: "border-box",
                  background: DARK_SURFACE,
                  border: `1px solid ${GRID_D}`,
                  marginLeft: i === 0 ? 0 : -1,
                  padding: 24,
                  minHeight: 397,
                  display: "flex",
                  flexDirection: "column",
                  color: TXT_D1,
                  textDecoration: "none",
                }}
              >
                {/* PART NUMBER, in the accent. Four accent points for free, and
                    a numbered part on a drawing is exactly what this is — the
                    grey was saying nothing. The leader tick ties the number to
                    the panel below it so the panel stops reading as a pasted
                    image sitting in a box. */}
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="lab-num" style={{ ...eyebrow(SIGNAL), fontSize: 13 }}>{c.num}</span>
                  <span aria-hidden="true" className="lab-lead" style={{ flex: 1, height: 1, background: SIGNAL }} />
                </span>
                <div style={{ flex: 1, margin: "16px 0", borderRadius: 6, overflow: "hidden", minHeight: 0, display: "flex", position: "relative" }}>
                  {(() => {
                    const S = CARD_SCENES[i];
                    return <S />;
                  })()}
                </div>
                <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.name}</span>
                  {/* two reserved lines (2 x 18 x 1.5) so a one-line description
                      cannot make its card's flex-1 media panel taller than Yard's */}
                  <span style={{ fontSize: 18, lineHeight: 1.5, color: TXT_D2, minHeight: 54 }}>{c.desc}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: GRID_D }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, padding: "40px 20px", borderBottom: `1px solid ${GRID_D}`, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontFamily: sans, fontSize: 44, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>
            <DecryptedText text="Vision-AI Platform" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
            <br />
            <DecryptedText text="for Industrial Operations" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
          </h1>
        </div>
        <div style={{ position: "relative", zIndex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6, borderBottom: `1px solid ${GRID_D}` }}>
          <span style={{ ...eyebrow("rgba(244,245,247,0.3)"), fontSize: 11, letterSpacing: "0.06em" }}>OUR PLATFORM&nbsp;— YOUR CAMERAS</span>
          <span style={{ ...eyebrow("rgba(244,245,247,0.3)"), fontSize: 11, letterSpacing: "0.06em" }}>PATENTED TECHNOLOGY</span>
        </div>
        <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {HERO_CARDS.map((c, i) => (
            <a
              key={c.num}
              href={c.href}
              style={{
                position: "relative",
                boxSizing: "border-box",
                borderRight: i % 2 === 0 ? `1px solid ${GRID_D}` : undefined,
                borderBottom: i < 2 ? `1px solid ${GRID_D}` : undefined,
                background: DARK_SURFACE,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 16,
                minHeight: 320,
                color: TXT_D1,
                textDecoration: "none",
              }}
            >
              <span style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ ...eyebrow(TXT_D2), fontSize: 13 }}>{c.num}</span>
              </span>
              <div style={{ flex: 1, minHeight: 160, borderRadius: 6, overflow: "hidden", background: "#101216", display: "flex", position: "relative" }}>
                {(() => {
                  const S = CARD_SCENES[i];
                  return <S />;
                })()}
              </div>
              <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.name}</span>
                <span style={{ fontSize: 14, lineHeight: 1.5, color: TXT_D2 }}>{c.desc}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   2 · STATEMENT  (light)
   ========================================================================= */

function Statement() {
  return (
    <section className="on-light" style={{ background: LIGHT }}>
      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ ...SHEET, height: 900 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Verticals color={GRID_L} />
          {/* L-corner registration brackets, four section corners only */}
          <div style={{ position: "absolute", left: 16, top: 16, width: 16, height: 16, borderLeft: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 16, top: 16, width: 16, height: 16, borderRight: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 16, borderLeft: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 16, bottom: 16, width: 16, height: 16, borderRight: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          {/* single signal dot on a gridline */}
          <Dot style={{ left: "calc(64px + (100% - 128px) * 0.25)", bottom: 148 }} />
          {/* mono-label callouts in the margins */}
          <div style={{ position: "absolute", left: 76, top: 653, fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: TXT_D2 }}>ISO 6346</div>
          <div style={{ position: "absolute", right: 340, top: 806, fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: TXT_D2 }}>DET_CONF 0.99</div>
          <div style={{ position: "absolute", left: 848, top: 150, fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: TXT_D2 }}>SCAN 04</div>
          {/* blueprint dimension line, left margin */}
          <div style={{ position: "absolute", left: 32, top: 300, bottom: 300, width: 1, background: "rgba(19,21,26,0.20)" }} />
          <div style={{ position: "absolute", left: 28, top: 300, width: 9, height: 1, background: "rgba(19,21,26,0.20)" }} />
          <div style={{ position: "absolute", left: 28, bottom: 300, width: 9, height: 1, background: "rgba(19,21,26,0.20)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 64px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: "clamp(32px, 5vw, 64px)", lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1, textAlign: "center", maxWidth: 1000, textWrap: "balance" }}>
            <DecryptedText text="Proprietary AI models delivering high accuracy in complex, chaotic, and edge-case environments." animateOn="view" sequential revealDirection="center" speed={4} encryptedClassName="v-enc" />
          </h2>
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", height: 480 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", left: 12, top: 12, width: 12, height: 12, borderLeft: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 12, top: 12, width: 12, height: 12, borderRight: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: 12, bottom: 12, width: 12, height: 12, borderLeft: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 12, bottom: 12, width: 12, height: 12, borderRight: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: "50%", bottom: 64, width: 3, height: 3, background: SIGNAL }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1, textAlign: "center", textWrap: "balance" }}>
            <DecryptedText text="Proprietary AI models delivering high accuracy in complex, chaotic, and edge-case environments." animateOn="view" sequential revealDirection="center" speed={4} encryptedClassName="v-enc" />
          </h2>
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   3 · HOW IT WORKS  (dark)
   ========================================================================= */

const HIW_CARDS = [
  { num: "01", col: 3, row: 1, title: "Detect and segment", body: "Type, size, location and area, to the mm-squared." },
  { num: "02", col: 4, row: 1, title: "Checkpoint diff", body: "Any two moments compared, damage attributed." },
  { num: "03", col: 3, row: 2, title: "Tamper-evident logbook", body: "A time-stamped record for every movement." },
  { num: "04", col: 4, row: 2, title: "Report in under a minute", body: "Survey PDF and structured data, straight to your system." },
];
const HIW_CARD_BG = "linear-gradient(180deg, rgba(244,245,247,0.06), rgba(244,245,247,0) 40%), #101216";

function HowItWorks() {
  return (
    <section style={{ background: DARK }}>
      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ ...SHEET, minHeight: 940 }}>
        {/* NO DRAWN CHROME IN THIS SECTION. It previously carried the full
            drafting kit — sheet verticals, an h-rule, four corner crosses, a
            signal centre divider, a dimension span under the plate and an
            accent spine with a tick per list item. Against a 1312px white
            animation plate that is a lot of hairlines competing with the one
            thing the section is actually about, and none of them were load-
            bearing: the plate and the type already align to the same 64px
            margin without a line drawn to prove it. The section is now
            plate + type on an unruled black field. */}
        <div style={{ position: "relative", zIndex: 1, padding: "112px 64px 96px" }}>
          {/* TYPE FIRST, THEN THE PLATE. The heading used to sit in a 624px
              half-column beside/below the animation at 58px, which capped it
              at ~15ch and broke it over three short lines; the standfirst was
              19px in a 40ch measure. Both now run across the full 1312px
              sheet, so the heading reads in two long lines at 84px and the
              standfirst at 26px — the section states what it is before it
              shows it. */}
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 84, lineHeight: 1.02, fontWeight: 600, letterSpacing: "-0.025em", color: TXT_D1, maxWidth: "22ch" }}>
            One vision layer across the operation.
          </h2>
          <p style={{ margin: "28px 0 0", fontSize: 26, lineHeight: 1.5, color: TXT_D2, maxWidth: "62ch" }}>
            No new hardware. The platform runs on the cameras already watching your yard, warehouse and factory.
          </p>

          {/* THE PLATE — the animation, full sheet width, below the type.
              It used to sit in a half-width column at 600px tall, which gave a
              wide, flat site scene a near-square 588×564 frame: the drawing
              shrank to fit the narrow axis and left roughly 250px of dead
              near-white at the top and bottom of the loudest element on a
              black page — while the text column ran ~190px past the bottom of
              the animation column, so the two-column row never closed. Full
              width in a landscape frame is the scene's own aspect, so the
              site is drawn at scale and the white carries content edge to
              edge. The type then reads as notes under a plate, which is the
              same drafting-sheet logic the rest of the section is built on. */}
          <div style={{ position: "relative", marginTop: 72, background: LIGHT_SURFACE, borderRadius: 8, padding: 18, display: "flex", height: 720, boxSizing: "border-box" }}>
            <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: 6, overflow: "hidden", display: "flex" }}>
              <LeadCardScene />
            </div>
          </div>
          {/* THE FOUR, FOUR-UP. They were a vertical stack in one 624px column
              — a signal spine, a signal tick per item, signal numerals and a
              hairline rule between each — five decorations on four short
              lines of text, which is what made the list read as clutter. They
              are four peers, so they run as four equal columns of the sheet
              with nothing drawn between them; the gap does the separating and
              the numeral is demoted to a quiet mono label. */}
          <div style={{ marginTop: 80, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", columnGap: 48, alignItems: "start" }}>
            {HIW_CARDS.map((c) => (
              <div key={c.num}>
                <span style={{ display: "block", fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: TXT_D2 }}>{c.num}</span>
                <span style={{ display: "block", marginTop: 18, fontSize: 23, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.title}</span>
                <span style={{ display: "block", marginTop: 12, fontSize: 17, lineHeight: 1.55, color: TXT_D2 }}>{c.body}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", padding: "48px 20px 40px" }}>
        {/* same removals as desktop — no centre rule, no signal dot, no eyebrow */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ margin: "0 0 20px", fontFamily: sans, fontSize: 34, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.025em", color: TXT_D1 }}>
            One vision layer across the operation.
          </h2>
          <p style={{ margin: "0 0 28px", fontSize: 18, lineHeight: 1.55, color: TXT_D2 }}>
            No new hardware. The platform runs on the cameras already watching your yard, warehouse and factory.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* the card's own headline + copy moved up to the section head, so
                the card is the scene and nothing else */}
            <div style={{ boxSizing: "border-box", background: LIGHT_SURFACE, borderRadius: 8, padding: 12, display: "flex" }}>
              <div style={{ position: "relative", flex: 1, aspectRatio: "4 / 3", borderRadius: 6, overflow: "hidden", display: "flex" }}>
                <LeadCardScene />
              </div>
            </div>
            {HIW_CARDS.map((c) => (
              <div key={c.num} style={{ boxSizing: "border-box", background: HIW_CARD_BG, border: `1px solid ${BORDER_D}`, borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.title}</span>
                  <span style={{ ...eyebrow(TXT_D2), fontSize: 12 }}>{c.num}</span>
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.5, color: TXT_D2 }}>{c.body}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   4 · METRICS  (light)
   ========================================================================= */

const METRICS = [
  { n: "90%", label: "lower inspection cost" },
  { n: "99%", label: "reporting-time reduction" },
  { n: "70%", label: "faster gate turnaround" },
  { n: "60%", label: "less inventory shrinkage" },
];

function Metrics() {
  return (
    <section className="on-light" style={{ background: LIGHT }}>
      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ ...SHEET, minHeight: 1040 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", left: 16, top: 16, width: 16, height: 16, borderLeft: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 16, top: 16, width: 16, height: 16, borderRight: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 16, borderLeft: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 16, bottom: 16, width: 16, height: 16, borderRight: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "96px 64px 64px" }}>
          <span style={{ ...eyebrow(TXT_L2), display: "block", padding: "0 4px" }}>MEASURED ACROSS LIVE SITES</span>
          <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 54, lineHeight: 1.08, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1, maxWidth: "18.68ch" }}>
            Same cameras. Different economics.
          </h2>

          <div style={{ marginTop: 48 }}>
            {METRICS.map((m, i) => (
              <div
                key={m.n}
                style={{
                  position: "relative",
                  borderTop: `1px solid ${RULE_L}`,
                  borderBottom: i === METRICS.length - 1 ? `1px solid ${RULE_L}` : undefined,
                  padding: "32px 0",
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontFamily: sans, fontSize: 102, lineHeight: 0.9, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_L1 }}><CountUp value={m.n} /></span>
                <span style={{ fontSize: 24, lineHeight: 1.4, color: TXT_L2 }}>{m.label}</span>
                {i === METRICS.length - 1 ? <Dot style={{ left: 0, bottom: -2 }} /> : null}
              </div>
            ))}
            <div style={{ marginTop: 24, fontFamily: mono, fontSize: 15, letterSpacing: "0.02em", color: TXT_L2 }}>
              Aggregate across container, gate, yard &amp; cargo deployments.
            </div>
          </div>
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", padding: "48px 20px 40px" }}>
        <span style={{ ...eyebrow(TXT_L2), display: "block", fontSize: 12 }}>MEASURED ACROSS LIVE SITES</span>
        <h2 style={{ margin: "16px 0 32px", fontFamily: sans, fontSize: 30, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>
          Same cameras. Different economics.
        </h2>
        {METRICS.map((m, i) => (
          <div
            key={m.n}
            style={{
              position: "relative",
              borderTop: `1px solid ${RULE_L}`,
              borderBottom: i === METRICS.length - 1 ? `1px solid ${RULE_L}` : undefined,
              padding: "20px 0",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <span style={{ fontFamily: sans, fontSize: 52, lineHeight: 0.9, fontWeight: 500, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: TXT_L1 }}><CountUp value={m.n} /></span>
            <span style={{ fontSize: 15, lineHeight: 1.4, color: TXT_L2, textAlign: "right" }}>{m.label}</span>
            {i === METRICS.length - 1 ? <Dot style={{ left: 0, bottom: -2 }} /> : null}
          </div>
        ))}
        <div style={{ marginTop: 16, fontFamily: mono, fontSize: 12, lineHeight: 1.5, letterSpacing: "0.02em", color: TXT_L2 }}>
          Aggregate across container, gate, yard &amp; cargo deployments.
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   5 · PROOF + PARTNERS  (light)
   ========================================================================= */

const DEPLOYED = [
  { src: "adani", alt: "Adani", h: 44 },
  { src: "dp_world", alt: "DP World", h: 70 },
  { src: "hind_terminals", alt: "Hind Terminals", h: 26 },
  { src: "jnpa", alt: "JNPA", h: 72 },
  { src: "cochin_shipyard", alt: "Cochin Shipyard", h: 72 },
];
const RECOGNISED = [
  { src: "iit_kharagpur", alt: "IIT Kharagpur", h: 46 },
  { src: "iit_kanpur", alt: "IIT Kanpur", h: 46 },
  { src: "iim_kozhikode", alt: "IIM Kozhikode", h: 46 },
  { src: "nasscom", alt: "NASSCOM", h: 22 },
  { src: "meity_startup_hub", alt: "MeitY Startup Hub", h: 44 },
  { src: "nvidia", alt: "NVIDIA", h: 44 },
  { src: "microsoft_for_startups", alt: "Microsoft for Startups", h: 20 },
  { src: "startupindia", alt: "Startup India", h: 26 },
];

function Logo({ src, alt, h }: { src: string; alt: string; h: number }) {
  // Plain <img> (as in the design): logos have varying intrinsic aspect ratios,
  // so we let the browser scale width from the natural aspect at a fixed height.
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`/assets/logos-light/${src}.png`}
      alt={alt}
      style={{ display: "block", height: h, width: "auto", objectFit: "contain" }}
    />
  );
}

function ProofPartners() {
  return (
    <section className="on-light" style={{ background: LIGHT }}>
      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ ...SHEET }}>
        <div style={{ position: "relative", zIndex: 1, padding: "96px 64px", display: "flex", flexDirection: "column" }}>
          {/* header band */}
          <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "48px 0" }}>
            <Dot style={{ left: -2, top: -2 }} />
            <Cross color={CROSS_L} style={{ right: -4, top: -5 }} />
            <span style={{ ...eyebrow(TXT_L2), fontSize: 16, display: "block" }}>PROVEN WHERE IT&apos;S HARDEST</span>
            <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 54, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1, maxWidth: "22ch" }}>
              Trusted by Industry Leaders
            </h2>
            <div style={{ marginTop: 48, display: "flex", alignItems: "flex-start", gap: 80 }}>
              <div>
                <span style={{ display: "block", fontFamily: sans, fontSize: "clamp(120px, 16.1vw, 232px)", lineHeight: 0.82, fontWeight: 500, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: TXT_L1 }}><CountUp value="400,000" /></span>
                <span style={{ display: "block", marginTop: 56, ...eyebrow(TXT_L2), fontSize: 26, fontStyle: "italic" }}>IMAGE READS A DAY&nbsp;·&nbsp;ACROSS LIVE SITES</span>
              </div>
              <span style={{ flex: 1, alignSelf: "center", fontFamily: sans, fontSize: 34, lineHeight: 1.35, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_L1, maxWidth: "16.11ch", paddingBottom: 84, paddingLeft: 65 }}>
                Inspection and monitoring of assets in night, rain, fog and dust.
              </span>
            </div>
          </div>

          {/* deployed band */}
          <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "48px 0" }}>
            <Cross color={CROSS_L} style={{ left: -4, top: -5 }} />
            <Cross color={CROSS_L} style={{ right: -4, top: -5 }} />
            <span style={{ ...eyebrow(TXT_L2), fontSize: 15, display: "block" }}>DEPLOYED AT</span>
            <div style={{ marginTop: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 56 }}>
              {DEPLOYED.map((l) => <Logo key={l.src} {...l} />)}
            </div>
          </div>

          {/* recognition band */}
          <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "48px 0" }}>
            <Cross color={CROSS_L} style={{ left: -4, top: -5 }} />
            <Cross color={CROSS_L} style={{ right: -4, top: -5 }} />
            <span style={{ ...eyebrow(TXT_L2), fontSize: 15, display: "block" }}>BACKED &amp; RECOGNISED BY</span>
            <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", rowGap: 28, columnGap: 48 }}>
              {RECOGNISED.map((l) => <Logo key={l.src} {...l} />)}
            </div>
          </div>

          {/* footnote band */}
          <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "28px 0 0" }}>
            <Cross color={CROSS_L} style={{ left: -4, top: -5 }} />
            <Dot style={{ right: -2, top: -2 }} />
            <span style={{ display: "block", fontSize: 16, lineHeight: 1.6, color: TXT_L2 }}>CII Best Industry AI Application 2025&nbsp;·&nbsp;Patented Technology</span>
          </div>
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", padding: "48px 20px 32px" }}>
        <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "24px 0 32px" }}>
          <Dot style={{ left: -2, top: -2 }} />
          <span style={{ ...eyebrow(TXT_L2), display: "block", fontSize: 12 }}>PROVEN WHERE IT&apos;S HARDEST</span>
          <h2 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 30, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1 }}>Trusted by Industry Leaders</h2>
          <span style={{ display: "block", marginTop: 28, fontFamily: sans, fontSize: 72, lineHeight: 0.9, fontWeight: 500, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: TXT_L1 }}><CountUp value="400,000" /></span>
          <span style={{ display: "block", marginTop: 16, ...eyebrow(TXT_L2), fontSize: 13, fontStyle: "italic" }}>IMAGE READS A DAY&nbsp;·&nbsp;ACROSS LIVE SITES</span>
          <span style={{ display: "block", marginTop: 24, fontFamily: sans, fontSize: 20, lineHeight: 1.4, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_L1, maxWidth: "24ch" }}>Inspection and monitoring of assets in night, rain, fog and dust.</span>
        </div>
        <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "24px 0 32px" }}>
          <span style={{ ...eyebrow(TXT_L2), display: "block", fontSize: 12 }}>DEPLOYED AT</span>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 24, columnGap: 32 }}>
            {DEPLOYED.map((l) => <Logo key={l.src} src={l.src} alt={l.alt} h={Math.round(l.h * 0.68)} />)}
          </div>
        </div>
        <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "24px 0 32px" }}>
          <span style={{ ...eyebrow(TXT_L2), display: "block", fontSize: 12 }}>BACKED &amp; RECOGNISED BY</span>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 20, columnGap: 28 }}>
            {RECOGNISED.map((l) => <Logo key={l.src} src={l.src} alt={l.alt} h={Math.round(l.h * 0.68)} />)}
          </div>
        </div>
        <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "20px 0 0" }}>
          <Dot style={{ right: -2, top: -2 }} />
          <span style={{ display: "block", fontSize: 13, lineHeight: 1.6, color: TXT_L2 }}>CII Best Industry AI Application 2025&nbsp;·&nbsp;Patented Technology</span>
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   6 · TESTIMONIALS  (dark) — PLACEHOLDER
   The design's quote/attribution are unverified draft copy; per the standing
   rule the testimonial content ships as an obvious bracketed, mono-log
   placeholder. Section framing (eyebrow, headline, CTA, pager) is kept.
   ========================================================================= */

function Testimonials() {
  return (
    <section style={{ background: DARK }}>
      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ ...SHEET, minHeight: 740 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Verticals color={GRID_D} />
          <HRule top={72} color={GRID_D} cross={CROSS_D} />
          <Cross color={CROSS_D} style={{ left: 60, top: 4 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: 4 }} />
          <Cross color={CROSS_D} style={{ left: 60, top: "calc(100% - 13px)" }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: "calc(100% - 13px)" }} />
          <Dot style={{ left: "calc(64px + (100% - 128px) * 0.75)", top: 71 }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "98px 64px 64px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
            <div style={{ maxWidth: 940 }}>
              <span style={{ ...eyebrow(TXT_D2), display: "block" }}>CUSTOMER PROOF</span>
              <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 56, lineHeight: 1.1, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "24ch" }}>
                See how industrial sites run inspection <span style={{ color: TXT_D2 }}>— without stopping the operations.</span>
              </h2>
            </div>
            {/* <a href="/resources/case-studies" className="dt-outline" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", height: 47, padding: "0 24px", background: "transparent", color: TXT_D1, border: `1px solid rgba(244,245,247,0.28)`, borderRadius: 8, fontSize: 18, fontWeight: 500, textDecoration: "none" }}>
              See case studies
            </a> */}
          </div>

          <div style={{ marginTop: 40, borderTop: `1px solid ${BORDER_D}`, paddingTop: 40, display: "grid", gridTemplateColumns: "3fr 1fr", gap: 0 }}>
            <TestimonialPagerDesktop />
          </div>
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", padding: "48px 20px 40px" }}>
        <span style={{ ...eyebrow(TXT_D2), display: "block", fontSize: 12 }}>CUSTOMER PROOF</span>
        <h2 style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 28, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>
          See how industrial sites run inspection <span style={{ color: TXT_D2 }}>— without stopping the operations.</span>
        </h2>
        <div style={{ margin: "24px 0 0", borderTop: `1px solid ${BORDER_D}`, paddingTop: 24 }}>
          <TestimonialPagerMobile />
          {/* <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <a href="/resources/case-studies" className="dt-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 48, background: "transparent", color: TXT_D1, border: `1px solid rgba(244,245,247,0.28)`, borderRadius: 8, fontSize: 15, fontWeight: 500, textDecoration: "none" }}>See case studies</a>
          </div> */}
        </div>
      </Reveal>
    </section>
  );
}

/* =========================================================================
   7 · CONVERT  (dark, checkered) — closing bookend
   ========================================================================= */

function Convert() {
  return (
    <section style={{ background: DARK }}>
      {/* DESKTOP */}
      <Reveal as="div" className="hidden md:block" style={{ ...SHEET, height: 720 }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Verticals color={GRID_D} />
          <div style={{ position: "absolute", left: 0, right: 0, top: 64, height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 1, background: GRID_D }} />
          {/* corner crosses */}
          <Cross color={CROSS_D} style={{ left: 60, top: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: 60 }} />
          <Cross color={CROSS_D} style={{ left: 60, bottom: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", bottom: 60 }} />
          {/* internal gridline-intersection crosses (checkered) */}
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.25 - 4px)", top: "calc(50% - 4px)" }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.75 - 4px)", top: "calc(50% - 4px)" }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.25 - 4px)", top: 60 }} />
          <Cross color={CROSS_D} style={{ left: "calc(64px + (100% - 128px) * 0.75 - 4px)", bottom: 60 }} />
          <Dot style={{ left: "50%", top: "calc(50% - 1px)" }} />
        </div>
        {/* neutral vignette */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 640px 340px at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0) 70%)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 64px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 84, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "20ch" }}>
            Join industry leaders running AI-enabled sites with 400,000+ daily reads.
          </h2>
          <span style={{ display: "block", marginTop: 24, fontSize: 29, lineHeight: 1.5, color: TXT_D2 }}>Bring CCTV feed, We&apos;ll read it live.</span>
          <div style={{ marginTop: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <a href="/contact" className="dt-fill" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 77, padding: "0 32px", background: TXT_D1, color: TXT_L1, borderRadius: 999, fontFamily: sans, fontSize: 24, fontWeight: 500, textDecoration: "none" }}>Talk to us</a>
            <a href="/platform/viso-yard" className="dt-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 76, padding: "0 32px", background: "transparent", color: TXT_D1, border: `1px solid rgba(244,245,247,0.28)`, borderRadius: 999, fontFamily: sans, fontSize: 24, fontWeight: 500, textDecoration: "none" }}>Explore the platform</a>
          </div>
        </div>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", height: 520 }}>
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
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 34, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, textWrap: "balance" }}>Join industry leaders running AI-enabled sites with 400,000+ daily reads.</h2>
          <span style={{ display: "block", marginTop: 16, fontSize: 17, lineHeight: 1.5, color: TXT_D2 }}>Bring CCTV feed, We&apos;ll read it live.</span>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 12, width: "100%", maxWidth: 280 }}>
            <a href="/contact" className="dt-fill" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, background: TXT_D1, color: TXT_L1, borderRadius: 999, fontFamily: sans, fontSize: 17, fontWeight: 500, textDecoration: "none" }}>Talk to us</a>
            <a href="/platform/viso-yard" className="dt-outline" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 52, background: "transparent", color: TXT_D1, border: `1px solid rgba(244,245,247,0.28)`, borderRadius: 999, fontFamily: sans, fontSize: 17, fontWeight: 500, textDecoration: "none" }}>Explore the platform</a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ========================================================================= */

export default function Home() {
  return (
    <>
      <Hero />
      <Statement />
      {/* METRICS MOVED ABOVE HOW-IT-WORKS. Per explicit direction: the numbers
          now land before the section that carries the big lead-card animation,
          so the page argues (same cameras, different economics) before it
          demonstrates. Note the 400,000 figure lives in ProofPartners, not
          Metrics — if that should move too it is a separate reorder. */}
      <Metrics />
      <HowItWorks />
      <ProofPartners />
      <Testimonials />
      <Convert />
    </>
  );
}

import type { CSSProperties } from "react";
import { CountUp, Reveal, UnderlineDraw } from "@/components/motion";
import { TestimonialPagerDesktop, TestimonialPagerMobile } from "@/components/testimonial-pager";
import DecryptedText from "@/components/decrypted-text";
import StatementVideo from "@/components/statement-video";
// lazy: keeps three.js out of the homepage's critical bundle — see _vision/lazy
import { DataCard, FactoryCard, LeadCardScene, WarehouseCard, YardCard } from "@/components/vision/_vision/lazy";

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
// accent stops (blue accent system — dark backgrounds get ACCENT_D, light get ACCENT_L)
const ACCENT_D = "#5CC8FF";
const ACCENT_L = "#1B7FC4";
// grids/crosses — hue-shifted to the accent, alpha unchanged from the previous neutral values
const GRID_D = "rgba(92,200,255,0.08)";
const GRID_L = "rgba(27,127,196,0.06)";
const CROSS_D = "rgba(92,200,255,0.4)";
const CROSS_L = "rgba(27,127,196,0.30)";
// hero-only, higher-weight variants of the two lines above — see the
// "raise the alpha of the existing blue" item in docs/15-hero-visual-critique.md.
// Kept local to Hero() rather than raising GRID_D/CROSS_D globally: those two
// drive drafting furniture on every other section of the page, and this pass
// is scoped to the hero band only.
const HERO_GRID_D = "rgba(92,200,255,0.16)";
const HERO_CROSS_D = "rgba(92,200,255,0.7)";
const BORDER_D = "rgba(244,245,247,0.10)";
const RULE_L = "#D4D6DB";
const SIGNAL = "#ED510C";
// ProofPartners-only: the ORIGINAL neutral value, so that section renders
// identically to before even though CROSS_L above changed hue for every
// other section (logos are handled separately from the accent system).
const PP_CROSS_L = "rgba(19,21,26,0.30)";

const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

/* ---- drafting-sheet primitives -------------------------------------------- */

// 9px registration cross, anchored to a corner / rule endpoint.
function Cross({ color, style, className }: { color: string; style: CSSProperties; className?: string }) {
  return (
    <div aria-hidden="true" className={className} style={{ position: "absolute", width: 9, height: 9, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 4, height: 1, background: color }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 4, width: 1, background: color }} />
    </div>
  );
}

// 3px registration dot, signal-orange unless told otherwise.
function Dot({ style, color }: { style: CSSProperties; color?: string }) {
  // `color` defaults to the accent — every existing caller marks a real point.
  // The hero passes a neutral instead; see the note in Hero().
  return <div aria-hidden="true" style={{ position: "absolute", width: 3, height: 3, background: color ?? SIGNAL, ...style }} />;
}

/* MAJOR CROSS — an 11px registration cross for the intersections that carry
   more weight than the 9px ones at every rule endpoint. The SIZE is the
   hierarchy; the colour was doing the same job twice. Defaults to the accent
   for any future caller that genuinely marks a conclusion — the hero passes a
   neutral, see the note in Hero(). */
function SignalCross({ style, color = SIGNAL }: { style: CSSProperties; color?: string }) {
  return (
    <div aria-hidden="true" style={{ position: "absolute", width: 11, height: 11, ...style }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 5, height: 1, background: color }} />
      <div style={{ position: "absolute", top: 0, bottom: 0, left: 5, width: 1, background: color }} />
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
  label, left, right, top, color = SIGNAL, strong = false,
}: { label: string; left: number | string; right: number | string; top: number | string; color?: string; strong?: boolean }) {
  // `strong` is the hero-only weight bump called for in
  // docs/15-hero-visual-critique.md ("give DimensionSpan more visual
  // weight") — every other caller keeps the original quiet instrument-label
  // size so nothing outside the hero shifts.
  const tickHeight = strong ? 11 : 9;
  const ruleTop = strong ? 5 : 4;
  const labelLineHeight = strong ? 17 : 15;
  /* THE ACCENT RULE IS THIS COMPONENT'S OWN, and it stays. What was removed
     from the hero band is the faint GRID rule (HRule) that used to run the
     full width of the sheet *behind* this callout — two lines stacked on one
     another at the same y, the grid one continuing out past both ends. That
     read as clutter behind the text. The bright accent segments either side
     of the label are the callout itself and are what dimensions the
     headline, so they are drawn here.

     The segments are two REAL flex children with the label between them,
     not one continuous rule with an opaque patch painted over the middle.
     The old patch was hard-coded to the page background colour and broke
     the moment anything (the headline glow) lightened the real background
     under it. A genuine DOM gap has no colour to match. */
  return (
    <div aria-hidden="true" style={{ position: "absolute", left, right, top, height: tickHeight }}>
      {/* extension ticks, one at each end — they terminate the rule, so they
          belong with it */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1, height: tickHeight, background: color }} />
      <div style={{ position: "absolute", right: 0, top: 0, width: 1, height: tickHeight, background: color }} />
      <div
        style={{
          position: "absolute", left: 0, right: 0, top: ruleTop, height: labelLineHeight,
          transform: "translateY(-50%)",
          display: "flex", alignItems: "center",
        }}
      >
        <div style={{ flex: 1, height: 1, background: color, opacity: strong ? 0.85 : 0.55 }} />
        <span
          style={{
            flexShrink: 0,
            padding: strong ? "0 10px" : "0 8px",
            fontFamily: mono, fontSize: strong ? 12 : 10, fontWeight: strong ? 600 : 400, letterSpacing: "0.14em", lineHeight: `${labelLineHeight}px`,
            color, whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <div style={{ flex: 1, height: 1, background: color, opacity: strong ? 0.85 : 0.55 }} />
      </div>
    </div>
  );
}

// The 5 page-wide verticals: margins at 64 / (100%-64), interiors dividing the
// inset content into 4 equal columns. Same coordinates in every section so the
// sheet reads continuous.
const V_X = ["64px", "calc(64px + (100% - 128px) * 0.25)", "50%", "calc(64px + (100% - 128px) * 0.75)", "calc(100% - 64px)"];
function Verticals({ color, className }: { color: string; className?: string }) {
  return (
    <>
      {V_X.map((x, i) => (
        <div key={i} aria-hidden="true" className={className} style={{ position: "absolute", top: 0, bottom: 0, left: x, width: 1, background: color }} />
      ))}
    </>
  );
}

// full-width horizontal rule + a registration cross at each endpoint (on the margins)
function HRule({ top, color, cross, className }: { top: number | string; color: string; cross: string; className?: string }) {
  return (
    <>
      <div aria-hidden="true" className={className} style={{ position: "absolute", left: 0, right: 0, top, height: 1, background: color }} />
      <Cross color={cross} className={className} style={{ left: 60, top: `calc(${typeof top === "number" ? `${top}px` : top} - 4px)` }} />
      <Cross color={cross} className={className} style={{ left: "calc(100% - 68px)", top: `calc(${typeof top === "number" ? `${top}px` : top} - 4px)` }} />
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
  transition: background-color 280ms ease;
}
.lab-hc:hover,
.lab-hc:focus-visible {
  background-color: #13161C !important;
}
/* PERIMETER PULSE — replaces the old top-border-only gradient trick. A
   conic-gradient sweep, masked down to a 1.5px ring around the card so only
   the ring itself is visible (the fill is knocked out with a mask-composite
   exclude between a content-box layer and a border-box layer), rotated by an
   animated custom property. Blue accent family only, per the standing rule
   against orange as page decoration.

   Two speeds, one mechanism: REST runs slow and dim (a "the system is alive"
   idle heartbeat), HOVER runs faster and brighter (the card acknowledging
   attention). Both are the same @keyframes — only duration and opacity
   change — so hover never looks like a different effect switching on, just
   the same one turning its volume up. */
@property --wire-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}
.lab-hc { position: relative; }
.lab-hc::after {
  content: "";
  position: absolute;
  inset: 0;
  padding: 2px;
  box-sizing: border-box;
  pointer-events: none;
  border-radius: inherit;
  background: conic-gradient(from var(--wire-angle, 0deg),
    rgba(92,200,255,0) 0deg,
    rgba(92,200,255,0.9) 28deg,
    rgba(92,200,255,0) 70deg,
    rgba(92,200,255,0) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.75;
}
@media (prefers-reduced-motion: no-preference) {
  .lab-hc::after {
    animation: wireCardPulse 7s linear infinite;
  }
  .lab-hc:hover::after,
  .lab-hc:focus-visible::after {
    opacity: 1;
    animation-duration: 2.4s;
  }
}
@keyframes wireCardPulse {
  to { --wire-angle: 360deg; }
}
/* Reduced motion: no rotation, just a calm static ring — the accent stays
   present rather than disappearing outright. */
@media (prefers-reduced-motion: reduce) {
  .lab-hc::after {
    background: rgba(92, 200, 255, 0.4);
    opacity: 1;
  }
  .lab-hc:hover::after,
  .lab-hc:focus-visible::after {
    background: rgba(92, 200, 255, 0.75);
  }
}
/* the part number's leader rule DRAWS toward the panel on hover: short and
   faint at rest, running the full width and bright on interaction */
.lab-hc .lab-lead {
  transform: scaleX(0.55);
  transform-origin: left center;
  opacity: 0.45;
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
      {/* BAND 1 — THE HEADLINE, AND THE CARDS DIRECTLY UNDER IT.

          REVERTED 2026-08-10, by request, to the original arrangement: the
          animations sit at the top of the page immediately below the heading
          line, not below the fold.

          The intervening design made this band exactly one screen tall
          (100vh - 72px nav) holding the headline ALONE, on the reasoning that
          the page opened on five competing objects and the scenes were doing
          their loudest work before anyone had read what the company does.
          That reasoning is recorded here rather than deleted, because it is
          the argument to answer if this is ever revisited.

          384 is not an arbitrary compact value — it restores the original
          slab's proportion exactly. The old hero was an 828px sheet whose
          second rule sat at 384 with the cards starting just under it, so a
          384-tall headline band puts the callout rule (drawn at 100% - 48)
          back at y=336 — the original's FIRST rule position — and starts the
          cards where they always used to start. Nothing else about the cards,
          their full-bleed treatment or the page's colour system changes. */}
      <div className="hidden md:flex" style={{ ...SHEET, minHeight: 384, flexDirection: "column" }}>
        {/* DEPTH — a stationary radial glow centred behind the headline. Pure
            CSS, no JS, no motion. Reads as "light coming from the system"
            rather than a flat #0A0B0E slab; kept in the sanctioned accent
            blue (ACCENT_D) at low alpha so it stays atmosphere, not a wash —
            see the hero's one hard rule against orange as decoration. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: `radial-gradient(ellipse 900px 420px at 50% 46%, rgba(92,200,255,0.07), rgba(92,200,255,0.02) 45%, transparent 72%)`,
          }}
        />
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          {/* ACTIVATE ON MOUNT — the hero is above the fold, so the scroll-
              into-view trigger the rest of the page's grids use (.wire-
              activate, keyed off Reveal's data-revealed) never fires here.
              .hero-wire-activate is the same one-shot flash, just triggered
              by a flat animation-delay after mount instead of intersection,
              and resting at full opacity (1) rather than 0.55 since this
              grid was never dimmed at rest to begin with. */}
          <Verticals color={HERO_GRID_D} className="hero-wire-activate" />
          {/* One rule, 48px off the bottom of the screen, carrying the callout.
              Percentages rather than the old hard-coded 336/384: the band's
              height is now viewport-derived, so anything positioned in px from
              the top detaches from it the moment the window resizes. */}
          {/* NO GRID RULE ON THIS BAND — only its two endpoint crosses.
              The callout (DimensionSpan, below) draws its own bright accent
              rule either side of the label; the faint full-width grid rule
              that used to run at this same y sat directly behind that text
              and continued past both ends of it, so the band carried two
              stacked lines and the label read as sitting on clutter. The
              crosses stay: they mark where the rule's endpoints are, which
              is still true — the callout is measured between them. */}
          <Cross color={HERO_CROSS_D} className="hero-wire-activate" style={{ left: 60, top: "calc(100% - 52px)" }} />
          <Cross color={HERO_CROSS_D} className="hero-wire-activate" style={{ left: "calc(100% - 68px)", top: "calc(100% - 52px)" }} />
          <Cross color={HERO_CROSS_D} className="hero-wire-activate" style={{ left: 60, top: 4 }} />
          <Cross color={HERO_CROSS_D} className="hero-wire-activate" style={{ left: "calc(100% - 68px)", top: 4 }} />
          {/* THE GRID COMING ALIVE — one calm, slow scan travelling the length
              of the callout rule, once every 9s. Not a pulse: a single
              soft-edged bar crossing left to right and holding briefly at each
              end. Respects prefers-reduced-motion (see .hero-scanline in
              globals.css, which zeroes the animation there). */}
          <div className="hero-scanline" style={{ position: "absolute", top: "calc(100% - 49px)", left: 60, right: 68, height: 2, overflow: "hidden" }}>
            <div className="hero-scanline-bar" />
          </div>
          {/* SILENT CHROME — the hero's drafting furniture is drawn in neutral,
              not in the accent.

              This block, the dimension span below it and the four card part
              numbers used to put roughly fourteen separate orange marks in one
              viewport: crosses, dots, a callout rule with two ticks and a
              label, four numerals and four leader rules. Not one of them marked
              a RESULT — every one was on the page's own styling conceit, which
              is the opposite of what the accent means everywhere else on this
              site (inside every card scene, orange is reserved for the moment
              the system concludes something).

              The cost was ranking. Each of the four scenes below runs its own
              blue-observing-to-orange-concluding beat; that is the product, and
              a numbering system above it was outranking it in the same colour.

              Nothing is removed structurally — the crosses, dots and callout
              are all still here, still on the same intersections, still at the
              same 11px/3px sizes. SIZE carries the hierarchy now, which is what
              it should have been carrying all along. The only orange left in
              this section is inside the scenes. */}
          {/* NO DOTS OR MAJOR CROSSES ON THIS BAND. There were five, placed on
              intersections of the two old rules. With one rule left, the only
              interior intersections are at the 25% and 75% verticals — which is
              exactly where the dimension span puts its own extension ticks, so
              a dot there lands inside a tick rather than marking anything. The
              rule's two endpoint crosses (from HRule) and the callout are the
              whole furniture budget for a screen holding one headline. */}
        </div>

        {/* THE HEADLINE IS DIMENSIONED. Spans the log row, directly under the
            slab, so it reads as a measurement OF the headline rather than as a
            band of its own. Inset to the same 25%/75% verticals the sheet
            already uses, so it lands on the grid instead of floating. */}
        {/* The callout now carries the copy the log row used to hold in two
            separate corner labels ("OUR PLATFORM — YOUR CAMERAS" left,
            "PATENTED TECHNOLOGY" right). Those are one sentence, and splitting
            them across 1200px of empty rule meant neither half was read as part
            of the other. Measured between the 25% and 75% verticals, on the
            rule, they read as one statement being dimensioned — which is what
            the callout is for. `top` is the rule's 100%-48 less the 4px that
            centres the 9px span on it. */}
        <DimensionSpan
          label="OUR PLATFORM · OUR PATENTED TECHNOLOGY · YOUR CAMERAS"
          left="calc(64px + (100% - 128px) * 0.25)"
          right="calc(64px + (100% - 128px) * 0.25)"
          top="calc(100% - 53px)"
          color={HERO_CROSS_D}
          strong
        />

        {/* The headline takes the whole band and centres in it. flex:1 rather
            than a fixed height so it stays optically centred at any viewport
            height; the 48px bottom padding is the callout strip it must not
            sit on top of. */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, padding: "0 64px 48px", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* EYEBROW REMOVED 2026-08-12, by request — not further shrunk, gone
              entirely. The headline now centres alone in the band; no
              replacement spacing needed since flex centring already absorbs
              the change in content height. */}
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

      </div>

      {/* BAND 2 — THE CARDS, FULL BLEED, BELOW THE FOLD.

          This band is deliberately OUTSIDE the SHEET wrapper above. Inside it
          the row was capped at 1440 and inset a further 64px each side, so on
          any wide screen the four scenes sat in a letterboxed strip with dead
          page either side. Out here the grid is the width of the screen, the
          columns butt directly against each other, and the animations run to
          all four edges of their own cell — the same treatment as the Viso Yard
          tile band.

          What went with the margins: the 24px card padding, the 6px radius on
          each scene panel, the -14px rule-crossing trick (there is no rule left
          to cross), and the 397px minHeight. The scene is now sized by its own
          4:3 cell, not by whatever was left after padding and two lines of
          reserved description text. */}
      <div className="hidden md:grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", borderTop: `1px solid ${GRID_D}` }}>
        {HERO_CARDS.map((c, i) => (
          <a
            key={c.num}
            href={c.href}
            className="dt-card lab-hc"
            style={{
              position: "relative",
              boxSizing: "border-box",
              background: DARK,
              /* Right edge only, and none on the last card. A border on every
                 side doubled every internal edge, which is what the old
                 marginLeft:-1 was there to collapse. Butted cells with one
                 shared hairline need neither. */
              borderRight: i === HERO_CARDS.length - 1 ? undefined : `1px solid ${GRID_D}`,
              /* The old top-border-only gradient trick (a faint full-width
                 base line with a brighter blue crown) is gone — replaced by
                 the .lab-hc::after perimeter pulse in HERO_CARD_CSS, which
                 runs a conic-gradient ring around all four edges instead of
                 just the top. See that block for rest vs hover behaviour. */
              display: "flex",
              flexDirection: "column",
              color: TXT_D1,
              textDecoration: "none",
            }}
          >
            {/* Title above the animation, as on the Viso Yard tiles — the part
                number and name on one line, the description under it. The
                leader rule that used to run from the number across the card is
                gone: it tied a number to a panel directly beneath it, which is
                a journey the eye does not need help with. */}
            <div style={{ padding: "20px 22px 18px" }}>
              <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span className="lab-num" style={{ ...eyebrow(TXT_D2), fontSize: 12 }}>{c.num}</span>
                <span style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.name}</span>
              </span>
              {/* two reserved lines so a one-line description cannot shorten
                  its card's title block and push that scene out of line with
                  the other three */}
              <span style={{ display: "block", marginTop: 8, fontSize: 16, lineHeight: 1.5, color: TXT_D2, minHeight: 48 }}>{c.desc}</span>
            </div>
            {/* The animation, edge to edge. No padding, no radius, and sized by
                its own aspect rather than by flex:1 — at full-bleed width the
                cell is wide enough that 4:3 gives the scenes more height than
                the old fixed 397px card ever did. */}
            <div
              style={{
                position: "relative", width: "100%", aspectRatio: "4 / 3", overflow: "hidden", display: "flex",
                /* STATIC CARD TREATMENT — present the instant the card paints,
                   before the lazy WebGL scene mounts. Fixes the "blank grey
                   box" cold-load moment (docs/15-hero-visual-critique.md,
                   finding 5) with a faint accent-blue corner-bracket glow
                   rather than new imagery. The scene, once mounted, paints
                   over this — it's a loading-state floor, not competing
                   decoration. */
                background: `radial-gradient(ellipse 140% 90% at 50% 0%, rgba(92,200,255,0.08), transparent 60%)`,
              }}
            >
              <span aria-hidden="true" style={{ position: "absolute", zIndex: 1, left: 10, top: 10, width: 18, height: 18, borderLeft: `1.5px solid ${HERO_CROSS_D}`, borderTop: `1.5px solid ${HERO_CROSS_D}`, opacity: 0.8 }} />
              <span aria-hidden="true" style={{ position: "absolute", zIndex: 1, right: 10, top: 10, width: 18, height: 18, borderRight: `1.5px solid ${HERO_CROSS_D}`, borderTop: `1.5px solid ${HERO_CROSS_D}`, opacity: 0.8 }} />
              <span aria-hidden="true" style={{ position: "absolute", zIndex: 1, left: 10, bottom: 10, width: 18, height: 18, borderLeft: `1.5px solid ${HERO_CROSS_D}`, borderBottom: `1.5px solid ${HERO_CROSS_D}`, opacity: 0.8 }} />
              <span aria-hidden="true" style={{ position: "absolute", zIndex: 1, right: 10, bottom: 10, width: 18, height: 18, borderRight: `1.5px solid ${HERO_CROSS_D}`, borderBottom: `1.5px solid ${HERO_CROSS_D}`, opacity: 0.8 }} />
              {(() => {
                const S = CARD_SCENES[i];
                return <S />;
              })()}
            </div>
          </a>
        ))}
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: GRID_D }} />
        </div>
        {/* EYEBROW REMOVED 2026-08-12, by request. The 40px top padding it
            used to sit inside moves onto the headline block below, so the
            headline keeps the same distance from the nav it always had. */}
        <div style={{ position: "relative", zIndex: 1, padding: "40px 16px 40px", borderBottom: `1px solid ${GRID_D}`, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontFamily: sans, fontSize: 34, lineHeight: 1.12, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>
            <DecryptedText text="Vision-AI" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
            <br />
            <DecryptedText text="Platform for" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
            <br />
            <DecryptedText text="Industrial Operations" animateOn="view" revealDirection="center" speed={45} maxIterations={14} encryptedClassName="v-enc" />
          </h1>
        </div>
        {/* one line, matching the desktop callout's consolidated copy */}
        <div style={{ position: "relative", zIndex: 1, padding: "14px 20px", borderBottom: `1px solid ${GRID_D}`, textAlign: "center" }}>
          <span style={{ ...eyebrow(ACCENT_D), fontSize: 11, letterSpacing: "0.06em" }}>OUR PLATFORM · OUR PATENTED TECHNOLOGY</span>
          <br />
          <span style={{ ...eyebrow(ACCENT_D), fontSize: 11, letterSpacing: "0.06em" }}>· YOUR CAMERAS</span>
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
                borderTop: `2px solid rgba(92,200,255,0.45)`,
                background: DARK,
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
              <div style={{ flex: 1, minHeight: 160, borderRadius: 6, overflow: "hidden", background: DARK, display: "flex", position: "relative" }}>
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
        {/* Background-footage slot. Renders its media layer first and the
            existing content after, so the brackets/dot/type all keep their own
            z-index and paint above it. Poster-only until the real loop ships. */}
        <StatementVideo>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <Verticals color={GRID_L} className="wire-activate" />
          {/* L-corner registration brackets, four section corners only */}
          <div style={{ position: "absolute", left: 16, top: 16, width: 16, height: 16, borderLeft: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 16, top: 16, width: 16, height: 16, borderRight: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: 16, bottom: 16, width: 16, height: 16, borderLeft: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 16, bottom: 16, width: 16, height: 16, borderRight: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          {/* single signal dot on a gridline */}
          <Dot color={ACCENT_L} style={{ left: "calc(64px + (100% - 128px) * 0.25)", bottom: 148 }} />
          {/* mono-label callouts in the margins */}
          <div style={{ position: "absolute", left: 76, top: 653, fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: ACCENT_L }}>ISO 6346</div>
          <div style={{ position: "absolute", right: 340, top: 806, fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: ACCENT_L }}>DET_CONF 0.99</div>
          <div style={{ position: "absolute", left: 848, top: 150, fontFamily: mono, fontSize: 13, letterSpacing: "0.06em", color: ACCENT_L }}>SCAN 04</div>
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
        </StatementVideo>
      </Reveal>

      {/* MOBILE */}
      <Reveal as="div" className="md:hidden" style={{ position: "relative", height: 480 }}>
        <StatementVideo>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", left: 12, top: 12, width: 12, height: 12, borderLeft: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 12, top: 12, width: 12, height: 12, borderRight: `1px solid ${CROSS_L}`, borderTop: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: 12, bottom: 12, width: 12, height: 12, borderLeft: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", right: 12, bottom: 12, width: 12, height: 12, borderRight: `1px solid ${CROSS_L}`, borderBottom: `1px solid ${CROSS_L}` }} />
          <div style={{ position: "absolute", left: "50%", bottom: 64, width: 3, height: 3, background: ACCENT_L }} />
        </div>
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 26, lineHeight: 1.3, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_L1, textAlign: "center", textWrap: "balance" }}>
            <DecryptedText text="Proprietary AI models delivering high accuracy in complex, chaotic, and edge-case environments." animateOn="view" sequential revealDirection="center" speed={4} encryptedClassName="v-enc" />
          </h2>
        </div>
        </StatementVideo>
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
              dead surface at the top and bottom of the loudest element on the
              page — while the text column ran ~190px past the bottom of the
              animation column, so the two-column row never closed. Full width
              in a landscape frame is the scene's own aspect, so the site is
              drawn at scale and the plate carries content edge to edge. The
              type then reads as notes under a plate, which is the same
              drafting-sheet logic the rest of the section is built on. */}
          {/* THE PLATE IS DARK. It ran on LIGHT_SURFACE and the white was the
              single loudest complaint about this page; the scene inside it has
              been re-keyed to the page canvas itself, so this must be DARK
              (#0A0B0E) — not DARK_SURFACE — or the panel edge shows as a seam
              against the section behind it. LeadCardScene's own CARD_SURFACE
              placeholder and cyclorama both track this value — change one and
              change the others. */}
          {/* NO INSET AND NO RADIUS. The scene sat inside 18px of padding with
              an 8px outer radius and a 6px inner one — a frame around a frame,
              on an element whose own backdrop is already the surface colour, so
              the padding was an 18px band of exactly the same colour as the
              thing it was insetting. It bought nothing visually and cost the
              scene 36px of width and height. The plate is now the render
              surface itself: the canvas runs to all four edges. */}
          <div style={{ position: "relative", marginTop: 72, background: DARK, display: "flex", height: 720, overflow: "hidden", boxSizing: "border-box" }}>
            <LeadCardScene />
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
                <span style={{ display: "block", fontFamily: mono, fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", color: ACCENT_D }}>{c.num}</span>
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
            {/* same removal as desktop — no inset, no radius */}
            {/* dark, for the same reason as the desktop plate above */}
            <div style={{ boxSizing: "border-box", background: DARK, display: "flex" }}>
              <div style={{ position: "relative", flex: 1, aspectRatio: "4 / 3", overflow: "hidden", display: "flex" }}>
                <LeadCardScene />
              </div>
            </div>
            {HIW_CARDS.map((c) => (
              <div key={c.num} style={{ boxSizing: "border-box", background: HIW_CARD_BG, border: `1px solid ${BORDER_D}`, borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.title}</span>
                  <span style={{ ...eyebrow(ACCENT_D), fontSize: 12 }}>{c.num}</span>
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
          <span style={{ ...eyebrow(ACCENT_L), display: "block", padding: "0 4px" }}>MEASURED ACROSS LIVE SITES</span>
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
                {i === METRICS.length - 1 ? <Dot color={ACCENT_L} style={{ left: 0, bottom: -2 }} /> : null}
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
        <span style={{ ...eyebrow(ACCENT_L), display: "block", fontSize: 12 }}>MEASURED ACROSS LIVE SITES</span>
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
            {i === METRICS.length - 1 ? <Dot color={ACCENT_L} style={{ left: 0, bottom: -2 }} /> : null}
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

// REPROCESSED colour logos: real full-colour marks (public/assets/logos-color/),
// tight-crop true-alpha PNGs prepared with scripts/trim-logos.mjs. `h` values
// are re-tuned against the actual reprocessed aspect ratios, not copied from
// the old mono row — a full-colour mark is not always the same shape as its
// flattened mono counterpart.
const DEPLOYED = [
  { src: "adani", alt: "Adani", h: 43 },
  { src: "dp_world", alt: "DP World", h: 70 },
  { src: "hind_terminals", alt: "Hind Terminals", h: 32 },
  { src: "jnpa", alt: "JNPA", h: 72 },
  { src: "cochin_shipyard", alt: "Cochin Shipyard", h: 72 },
];
const RECOGNISED = [
  { src: "iit_kharagpur", alt: "IIT Kharagpur", h: 46 },
  { src: "iit_kanpur", alt: "IIT Kanpur", h: 46 },
  { src: "iim_kozhikode", alt: "IIM Kozhikode", h: 46 },
  { src: "nasscom", alt: "NASSCOM", h: 22 },
  { src: "meity_startup_hub", alt: "MeitY Startup Hub", h: 48 },
  { src: "nvidia", alt: "NVIDIA", h: 44 },
  // No colour source file exists for Microsoft for Startups (not in the
  // supplied coloured-logos folder). Left pointing at the old flattened-mono
  // asset rather than fabricating a placeholder — a deliberately mixed
  // mono+colour row entry.
  { src: "microsoft_for_startups", alt: "Microsoft for Startups", h: 20, mono: true },
  { src: "startupindia", alt: "Startup India", h: 26 },
];

function Logo({
  src, alt, h, mono,
}: {
  src: string; alt: string; h: number; mono?: boolean;
}) {
  // Plain <img> (as in the design): logos have varying intrinsic aspect ratios,
  // so we let the browser scale width from the natural aspect at a fixed height.
  // A defensive max-width clamp: none of the current colour logos actually
  // reach it at their chosen `h`, but it stops any single wide logo from
  // dominating the fixed 5-across DEPLOYED row, which has no wrap and no
  // width cap of its own.
  const folder = mono ? "logos-light" : "logos-color";

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`/assets/${folder}/${src}.png`}
      alt={alt}
      style={{ display: "block", height: h, width: "auto", maxWidth: 200, objectFit: "contain" }}
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
            <Cross color={PP_CROSS_L} className="wire-activate" style={{ right: -4, top: -5 }} />
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
            <Cross color={PP_CROSS_L} className="wire-activate" style={{ left: -4, top: -5 }} />
            <Cross color={PP_CROSS_L} className="wire-activate" style={{ right: -4, top: -5 }} />
            <span style={{ ...eyebrow(TXT_L2), fontSize: 15, display: "block" }}>DEPLOYED AT</span>
            <div style={{ marginTop: 44, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 56 }}>
              {DEPLOYED.map((l) => <Logo key={l.src} {...l} />)}
            </div>
          </div>

          {/* recognition band */}
          <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "48px 0" }}>
            <Cross color={PP_CROSS_L} className="wire-activate" style={{ left: -4, top: -5 }} />
            <Cross color={PP_CROSS_L} className="wire-activate" style={{ right: -4, top: -5 }} />
            <span style={{ ...eyebrow(TXT_L2), fontSize: 15, display: "block" }}>BACKED &amp; RECOGNISED BY</span>
            <div style={{ marginTop: 36, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", rowGap: 28, columnGap: 48 }}>
              {RECOGNISED.map((l) => <Logo key={l.src} {...l} />)}
            </div>
          </div>

          {/* footnote band */}
          <div style={{ position: "relative", borderTop: `1px solid ${RULE_L}`, padding: "28px 0 0" }}>
            <Cross color={PP_CROSS_L} className="wire-activate" style={{ left: -4, top: -5 }} />
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
          <Verticals color={GRID_D} className="wire-activate" />
          <HRule top={72} color={GRID_D} cross={CROSS_D} className="wire-activate" />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: 60, top: 4 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(100% - 68px)", top: 4 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: 60, top: "calc(100% - 13px)" }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(100% - 68px)", top: "calc(100% - 13px)" }} />
          <Dot color={ACCENT_D} style={{ left: "calc(64px + (100% - 128px) * 0.75)", top: 71 }} />
        </div>

        <div style={{ position: "relative", zIndex: 1, padding: "98px 64px 64px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 32 }}>
            <div style={{ maxWidth: 940 }}>
              <span style={{ ...eyebrow(ACCENT_D), display: "block" }}>CUSTOMER PROOF</span>
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
        <span style={{ ...eyebrow(ACCENT_D), display: "block", fontSize: 12 }}>CUSTOMER PROOF</span>
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
          <Verticals color={GRID_D} className="wire-activate" />
          <div style={{ position: "absolute", left: 0, right: 0, top: 64, height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: GRID_D }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 1, background: GRID_D }} />
          {/* corner crosses */}
          <Cross color={CROSS_D} className="wire-activate" style={{ left: 60, top: 60 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(100% - 68px)", top: 60 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: 60, bottom: 60 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(100% - 68px)", bottom: 60 }} />
          {/* internal gridline-intersection crosses (checkered) */}
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(64px + (100% - 128px) * 0.25 - 4px)", top: "calc(50% - 4px)" }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(64px + (100% - 128px) * 0.75 - 4px)", top: "calc(50% - 4px)" }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(64px + (100% - 128px) * 0.25 - 4px)", top: 60 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(64px + (100% - 128px) * 0.75 - 4px)", bottom: 60 }} />
          <Dot color={ACCENT_D} style={{ left: "50%", top: "calc(50% - 1px)" }} />
        </div>
        {/* neutral vignette */}
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", background: "radial-gradient(ellipse 640px 340px at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0) 70%)" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 64px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 84, lineHeight: 1.05, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, maxWidth: "20ch" }}>
            Join industry leaders running AI-enabled sites with 400,000+ daily reads.
          </h2>
          <span style={{ display: "block", marginTop: 24, fontSize: 29, lineHeight: 1.5, color: TXT_D2 }}>Bring your CCTV feed. We&apos;ll read it live.</span>
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
          <Cross color={CROSS_D} className="wire-activate" style={{ left: 16, top: 16 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(100% - 25px)", top: 16 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: 16, bottom: 16 }} />
          <Cross color={CROSS_D} className="wire-activate" style={{ left: "calc(100% - 25px)", bottom: 16 }} />
          <div style={{ position: "absolute", left: "50%", top: 389, width: 3, height: 3, background: ACCENT_D }} />
        </div>
        <div style={{ position: "absolute", inset: 0, zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px", boxSizing: "border-box" }}>
          <h2 style={{ margin: 0, fontFamily: sans, fontSize: 34, lineHeight: 1.15, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1, textWrap: "balance" }}>Join industry leaders running AI-enabled sites with 400,000+ daily reads.</h2>
          <span style={{ display: "block", marginTop: 16, fontSize: 17, lineHeight: 1.5, color: TXT_D2 }}>Bring your CCTV feed. We&apos;ll read it live.</span>
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

import DecryptedText from "@/components/decrypted-text";
import { JsonLd, productSchema } from "@/components/json-ld";
import { pageMeta } from "@/lib/seo";
import { Reveal } from "@/components/motion";
import { YardRailDesktop, YardRulerMobile } from "./rail";
import { Convert } from "./convert";
import {
  SectionCargo,
  SectionContainer,
  SectionCrane,
  SectionDocument,
  SectionGate,
  SectionProductsOverview,
  SectionTank,
  SectionYard,
} from "./sections";
import { SectionSecure, SectionWork } from "../viso-warehouse/sections";
import {
  BORDER_D_STRONG,
  CANVAS_DARK,
  CROSS_D,
  Cross,
  GRID_D,
  SHEET,
  TXT_D1,
  TXT_D2,
  Verticals,
  eyebrow,
  mono,
  sans,
} from "./_shared";

/* ---------------------------------------------------------------------------
   /platform/viso-yard — page assembly (all sections mounted).

   Scroll order (handoff PAGE ASSEMBLY):
     hero → 01 CONTAINER → 02 TANK[light] → 03 GATE → 04 YARD → 05 CRANE
     → PLATFORM BAND[light] → 06 CARGO → 07 DOCUMENT → 08/09 REGISTER CLOSE
   Convert (home clone) is the remaining step 4.
--------------------------------------------------------------------------- */

/* mobile-only hero manifest — desktop dropped this in favour of the card grid
   right below the hero, but mobile hides that grid, so mobile keeps the
   quick-nav list as its only way to jump to a system before scrolling. */
const MANIFEST = [
  { n: "01", name: "CONTAINER VISION", id: "container-vision" },
  { n: "02", name: "TANK VISION", id: "tank-vision" },
  { n: "03", name: "GATE VISION", id: "gate-vision" },
  { n: "04", name: "YARD VISION", id: "yard-vision" },
  { n: "05", name: "CRANE VISION", id: "crane-vision" },
  { n: "06", name: "CARGO VISION", id: "cargo-vision" },
  { n: "07", name: "DOCUMENT VISION", id: "document-vision" },
  { n: "08", name: "WORK VISION", id: "work-vision" },
  { n: "09", name: "SECURE VISION", id: "secure-vision" },
];

function Hero() {
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: BORDER_D_STRONG, zIndex: 2 }} />
      {/* hero-wire-activate, NOT wire-activate: these sit outside any <Reveal>,
          and the scroll-triggered class only matches under
          [data-revealed="true"] — tagging them with it would leave them at
          opacity 0 forever. Same reason the home hero has its own variant. */}
      <Cross color={CROSS_D} className="hero-wire-activate" style={{ left: 60, top: -4 }} />
      <Cross color={CROSS_D} className="hero-wire-activate" style={{ left: "calc(100% - 68px)", top: -4 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", zIndex: 1, padding: "104px 64px 48px", boxSizing: "border-box" }}>
        <span style={{ ...eyebrow(TXT_D2), display: "block", paddingLeft: 24 }}>VISO YARD — NINE SYSTEMS, YOUR CAMERAS</span>
        <h1 style={{ margin: "72px 0 0", paddingLeft: 6, fontFamily: sans, fontSize: 136, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
          <DecryptedText text="Viso Yard" animateOn="view" sequential revealDirection="start" speed={55} encryptedClassName="v-enc" />
        </h1>
        <p style={{ margin: "40px 0 0", paddingLeft: 24, maxWidth: 592, fontFamily: sans, fontSize: 20, lineHeight: 1.5, color: TXT_D1 }}>
          Every container, every checkpoint, on the record — from the CCTV you already own.
        </p>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "40px 24px 0" }}>
        <span style={{ ...eyebrow(TXT_D2), fontSize: 11 }}>VISO YARD — NINE SYSTEMS, YOUR CAMERAS</span>
        <h1 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 64, lineHeight: 0.98, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
          <DecryptedText text="Viso Yard" animateOn="view" sequential revealDirection="start" speed={55} encryptedClassName="v-enc" />
        </h1>
        <p style={{ margin: "32px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D1 }}>
          Every container, every checkpoint, on the record — from the CCTV you already own.
        </p>
        <div style={{ margin: "40px 0 0", display: "flex", flexDirection: "column" }}>
          {MANIFEST.map((m) => (
            <a key={m.id} href={`#${m.id}`} style={{ display: "flex", alignItems: "baseline", height: 34, textDecoration: "none", color: TXT_D2 }}>
              <span style={{ fontFamily: mono, fontSize: 13, width: 28, flex: "0 0 28px" }}>{m.n}</span>
              <span style={{ fontFamily: mono, fontSize: 13, textTransform: "uppercase", color: TXT_D1 }}>{m.name}</span>
            </a>
          ))}
        </div>
        <span style={{ display: "block", margin: "40px 0", fontFamily: mono, fontSize: 10, letterSpacing: "0.06em", color: TXT_D2, opacity: 0.6 }}>
          GATE_04 :: VSTU 907032 1 :: READ 0.99 :: 14:02:11
        </span>
      </div>
    </div>
  );
}

/* ========================================================================= */

export const metadata = pageMeta({
  title: "Viso Yard — Container & Terminal Vision",
  description:
    "Every container, every checkpoint, on the record — from the CCTV you already own. Nine vision systems for container terminals and yards: damage detection, OCR, gate automation, crane, cargo and yard tracking.",
  path: "/platform/viso-yard",
});

export default function VisoYardPage() {
  return (
    <>
      <JsonLd
        data={productSchema({
          name: "Viso Yard",
          description:
            "AI vision for container terminals and yards — damage detection, container/ISO OCR, gate automation and yard tracking from existing CCTV.",
          path: "/platform/viso-yard",
          features: [
            "Container Vision",
            "Tank Vision",
            "Gate Vision",
            "Yard Vision",
            "Crane Vision",
            "Cargo Vision",
            "Document Vision",
            "Work Vision",
            "Secure Vision",
          ],
        })}
      />
      <YardRulerMobile />

      <div style={{ position: "relative", background: CANVAS_DARK }}>
        {/* ===== BANDS 1-3 =====================================================
            The overview band has to reach both edges of the SCREEN, and it
            cannot do that from inside the rail row: that row is capped at 1620,
            centred, inset a further 180 by the rail, and clipped by the sheet's
            overflowX. So the content is split into three bands — hero, the
            full-bleed overview, the sections.

            BUT the rail and the sheet gridlines have to stay CONTINUOUS across
            all three, or the page visibly comes apart at the seams: a first
            attempt put a Verticals layer inside each of the two sheets and the
            rail inside the second one, which broke the five vertical rules into
            two disconnected runs with a gap over the overview band, and made
            the rail appear abruptly at section 01 instead of holding from the
            top of the page.

            So both are lifted OUT of the bands and drawn as full-height overlay
            layers over this container instead. Each layer re-creates the row's
            own geometry — 1620 max, centred, 180 rail column — so it lands on
            exactly the same axes the bands use, and each spans bands 1-3 in one
            unbroken piece. The bands below then only own their CONTENT width,
            which is what lets the middle one go full-screen without disturbing
            anything. This container must stay `position: relative` and must NOT
            include the Convert bookend, which draws its own rules.
            ================================================================= */}
        <div style={{ position: "relative" }}>
          {/* continuous gridlines, behind everything */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            <div className="hidden md:flex" style={{ maxWidth: 1620, height: "100%", margin: "0 auto" }}>
              <div style={{ flex: "0 0 180px" }} />
              <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0, maxWidth: 1440 }}>
                {/* wire-sweep, not hero-wire-activate: a travelling glow, not
                    an opacity fade. Fading a line whose own colour is already
                    rgba(...,0.08) changes almost nothing on screen, which is
                    why the fade version read as "no animation at all". Each
                    line self-scatters its phase — see Verticals. */}
                <Verticals color={GRID_D} className="wire-sweep" />
              </div>
            </div>
            <div className="md:hidden" style={{ position: "absolute", inset: 0 }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 24, width: 1, background: GRID_D }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, right: 24, width: 1, background: GRID_D }} />
            </div>
          </div>

          {/* BAND 1 — hero. The 180px spacer holds the hero on exactly the
              horizontal position the rail used to give it. */}
          <div style={{ maxWidth: 1620, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
            <div aria-hidden="true" className="hidden md:block" style={{ flex: "0 0 180px" }} />
            <div style={{ ...SHEET, overflowX: "clip" }}>
              <div style={{ position: "relative", zIndex: 1 }}>
                <Hero />
              </div>
            </div>
          </div>

          {/* BAND 2 — the overview, full screen width, no rail, no sheet. */}
          <Reveal as="div" style={{ position: "relative", zIndex: 1, background: CANVAS_DARK }}>
            <SectionProductsOverview />
          </Reveal>

          {/* BAND 3 — the numbered sections, back on the sheet, and THE ONLY
              BAND THE RAIL SPANS.

              The rail layer is scoped to this wrapper rather than to the whole
              three-band container, which is what keeps it off screen until the
              hero and the overview band have both scrolled away. Two earlier
              shapes were wrong: inside the sheet it forced the hero to share a
              row with it, and over the full container it was pinned from scroll
              0 and sat beside the hero. Anchored here it has nothing to stick
              to until section 01 reaches the top, which is also the first
              moment it has anything to point at — it indexes 01-09 and nothing
              above them. Do not hoist it back up for symmetry with the
              gridlines; the gridlines are continuous BECAUSE they belong to
              every band, and the rail is not because it does not. */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
              <div className="hidden md:flex" style={{ maxWidth: 1620, height: "100%", margin: "0 auto" }}>
                {/* display:flex + height:100% is load-bearing. YardRailDesktop
                    relies on `alignSelf: stretch` to be as tall as the scroll it
                    has to stay stuck over, and alignSelf does nothing inside a
                    block parent — the column collapses to the nav's own
                    calc(100vh - 72px) and the rail scrolls away one viewport in.
                    pointerEvents is off on the layer and back on for the column,
                    so the layer never swallows clicks meant for the sections. */}
                <div style={{ flex: "0 0 180px", height: "100%", display: "flex", pointerEvents: "auto" }}>
                  <YardRailDesktop />
                </div>
              </div>
            </div>

            <div style={{ maxWidth: 1620, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
              <div aria-hidden="true" className="hidden md:block" style={{ flex: "0 0 180px" }} />

              <div style={{ ...SHEET, overflowX: "clip" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Reveal as="div"><SectionContainer /></Reveal>
                  {/* Tank is a light band — Reveal wraps inside it (sections.tsx) so the light background paints immediately */}
                  <SectionTank />
                  <Reveal as="div"><SectionGate /></Reveal>
                  <Reveal as="div"><SectionYard /></Reveal>
                  <Reveal as="div"><SectionCrane /></Reveal>
                  <Reveal as="div"><SectionCargo /></Reveal>
                  <Reveal as="div"><SectionDocument /></Reveal>
                  <Reveal as="div"><SectionWork n="08" /></Reveal>
                  <Reveal as="div"><SectionSecure n="09" /></Reveal>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* closing bookend — home Convert clone. Wrapped in the same 1620 row
            with a rail-width spacer so its gridlines stay continuous with the
            yard sheet above. */}
        <div style={{ maxWidth: 1620, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
          <div aria-hidden="true" className="hidden md:block" style={{ flex: "0 0 180px" }} />
          <div style={{ flex: "1 1 auto", minWidth: 0, maxWidth: 1440 }}>
            <Convert />
          </div>
        </div>
      </div>
    </>
  );
}

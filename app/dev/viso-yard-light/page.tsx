import DecryptedText from "@/components/decrypted-text";
import { pageMeta } from "@/lib/seo";
import { Reveal } from "@/components/motion";
import { YardRailDesktop, YardRulerMobile } from "./rail";
import { Convert } from "./convert";
import {
  PlatformBand,
  SectionCargo,
  SectionContainer,
  SectionCrane,
  SectionDocument,
  SectionGate,
  SectionProductsOverview,
  SectionTank,
  SectionYard,
} from "./sections";
import { SectionSecure, SectionWork } from "./warehouse-sections";
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
   /dev/viso-yard-light — DEV-ONLY PREVIEW. Light-theme alternative for the
   real Viso Yard page (app/platform/viso-yard/page.tsx), requested to compare
   against the live dark version. NOT linked from nav/sitemap, noindex.

   Identical structure/copy to the real page — only ./_shared.tsx's token
   values are inverted (main canvas dark->light with charcoal ink text, the
   alternating Tank/PlatformBand light-bands invert to dark bands so the same
   contrast rhythm survives), plus the few hardcoded ink literals in
   sections.tsx/rail.tsx/convert.tsx that couldn't go through the shared
   tokens. The schematic SVGs themselves are untouched — they're already
   drawn on a dark canvas internally, which reads fine as a "window" into a
   dark diagram against the new light page.

   Scroll order (same as the real page):
     hero → 01 CONTAINER → 02 TANK[dark band] → 03 GATE → 04 YARD → 05 CRANE
     → PLATFORM BAND[dark band] → 06 CARGO → 07 DOCUMENT → 08/09 REGISTER CLOSE
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
      <Cross color={CROSS_D} style={{ left: 60, top: -4 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: -4 }} />

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
  title: "[dev] Viso Yard — light theme preview",
  description: "Internal preview only — not a real page.",
  path: "/dev/viso-yard-light",
  noindex: true,
});

export default function VisoYardLightPreviewPage() {
  return (
    <>
      <YardRulerMobile />

      <div style={{ position: "relative", background: CANVAS_DARK }}>
        <div style={{ maxWidth: 1620, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
          <YardRailDesktop />

          <div style={{ ...SHEET, overflowX: "clip" }}>
            {/* page-level continuous grid layer — desktop: the five sheet
                verticals; mobile: the exports' two margin verticals at 24px */}
            <div aria-hidden="true" className="hidden md:block" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
              <Verticals color={GRID_D} />
            </div>
            <div aria-hidden="true" className="md:hidden" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
              <div style={{ position: "absolute", top: 0, bottom: 0, left: 24, width: 1, background: GRID_D }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, right: 24, width: 1, background: GRID_D }} />
            </div>

            <div style={{ position: "relative", zIndex: 1 }}>
              <Hero />
              <Reveal as="div"><SectionProductsOverview /></Reveal>
              <Reveal as="div"><SectionContainer /></Reveal>
              {/* Tank is a light band — Reveal wraps inside it (sections.tsx) so the light background paints immediately */}
              <SectionTank />
              <Reveal as="div"><SectionGate /></Reveal>
              <Reveal as="div"><SectionYard /></Reveal>
              <Reveal as="div"><SectionCrane /></Reveal>
              {/* PlatformBand is a light band — same reason as Tank */}
              <PlatformBand />
              <Reveal as="div"><SectionCargo /></Reveal>
              <Reveal as="div"><SectionDocument /></Reveal>
              <Reveal as="div"><SectionWork n="08" /></Reveal>
              <Reveal as="div"><SectionSecure n="09" /></Reveal>
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

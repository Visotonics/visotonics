import DecryptedText from "@/components/decrypted-text";
import { JsonLd, productSchema } from "@/components/json-ld";
import { pageMeta } from "@/lib/seo";
import { Reveal } from "@/components/motion";
import { FactoryRailDesktop, FactoryRulerMobile } from "./rail";
import { Convert } from "./convert";
import {
  SectionAudit,
  SectionDimension,
  SectionProduction,
  SectionProductsOverview,
  SectionSecure,
  SectionWork,
} from "./sections";
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
} from "../viso-yard/_shared";

/* ---------------------------------------------------------------------------
   /platform/viso-factory — page assembly (hero manifest + rail + 5 sections).
   Ported from the VisoWarehouse-Overview canvas (the VISO FACTORY hero frame).

   Scroll order (hero manifest):
     hero → 01 PRODUCTION → 02 AUDIT → 03 DIMENSION[light] → 04 WORK → 05 SECURE
     → Convert (closing bookend).

   Notes:
   - Production Vision has no canvas design; it is authored from the approved
     copy (see sections.tsx).
   - Audit / Dimension / Work / Secure are the Viso Warehouse components, reused.
   - The canvas hero sentence was warehouse placeholder copy under a FACTORY
     title; replaced here with the approved Manufacturing line from
     basic_content-industries.docx.
--------------------------------------------------------------------------- */

const MANIFEST = [
  { n: "01", name: "PRODUCTION VISION", desc: "count, SKU and damage per shift", id: "production-vision" },
  { n: "02", name: "AUDIT VISION", desc: "event-linked proof", id: "audit-vision" },
  { n: "03", name: "DIMENSION VISION", desc: "volumetric capture", id: "dimension-vision" },
  { n: "04", name: "WORK VISION", desc: "attendance from the cameras", id: "work-vision" },
  { n: "05", name: "SECURE VISION", desc: "alerts and logs", id: "secure-vision" },
];

function ManifestLine({ item }: { item: (typeof MANIFEST)[number] }) {
  return (
    <a href={`#${item.id}`} className="flex items-baseline" style={{ height: 40, textDecoration: "none", color: TXT_D2 }}>
      <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.04em", width: 34, flex: "0 0 34px" }}>{item.n}</span>
      <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.04em", textTransform: "uppercase", color: TXT_D1 }}>{item.name}</span>
      {item.desc ? <span style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.04em", marginLeft: 14 }}>— {item.desc}</span> : null}
    </a>
  );
}

function Hero() {
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: BORDER_D_STRONG, zIndex: 2 }} />
      <Cross color={CROSS_D} style={{ left: 60, top: -4 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 68px)", top: -4 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", zIndex: 1, padding: "104px 64px 48px", boxSizing: "border-box" }}>
        <span style={{ ...eyebrow(TXT_D2), display: "block", paddingLeft: 24 }}>OUR PLATFORM — YOUR CAMERAS · ON THE LINE</span>
        <h1 style={{ margin: "72px 0 0", paddingLeft: 6, fontFamily: sans, fontSize: 136, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
          <DecryptedText text="Viso Factory" animateOn="view" sequential revealDirection="start" speed={55} encryptedClassName="v-enc" />
        </h1>
        <p style={{ margin: "40px 0 0", paddingLeft: 24, maxWidth: 620, fontFamily: sans, fontSize: 20, lineHeight: 1.5, color: TXT_D1 }}>
          Production and process, watched continuously — from the cameras already on your line.
        </p>
      </div>

      {/* MOBILE — keeps the manifest list (the products grid below the hero
          is desktop-only) */}
      <div className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "40px 24px 0" }}>
        <span style={{ ...eyebrow(TXT_D2), fontSize: 11 }}>OUR PLATFORM — YOUR CAMERAS · ON THE LINE</span>
        <h1 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 64, lineHeight: 0.98, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
          <DecryptedText text="Viso Factory" animateOn="view" sequential revealDirection="start" speed={55} encryptedClassName="v-enc" />
        </h1>
        <p style={{ margin: "32px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D1 }}>
          Production and process, watched continuously — from the cameras already on your line.
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
          LINE_03 :: SKU 22841-B :: YIELD 0.99 :: 07:12:44
        </span>
      </div>
    </div>
  );
}

/* ========================================================================= */

export const metadata = pageMeta({
  title: "Viso Factory — Production & Line Vision",
  description:
    "Production and process, watched continuously — from the cameras already on your line. Per-shift count, SKU and damage tracking, dimensioning, attendance and security for manufacturing.",
  path: "/platform/viso-factory",
});

export default function VisoFactoryPage() {
  return (
    <>
      <JsonLd
        data={productSchema({
          name: "Viso Factory",
          description:
            "AI vision for manufacturing lines — production count, SKU and damage detection per shift, dimensioning, attendance and security from existing CCTV.",
          path: "/platform/viso-factory",
          features: [
            "Production Vision — count, SKU and damage per shift",
            "Audit Vision — event-linked proof",
            "Dimension Vision — volumetric capture",
            "Work Vision — attendance from the cameras",
            "Secure Vision — alerts and logs",
          ],
        })}
      />
      <FactoryRulerMobile />

      <div style={{ position: "relative", background: CANVAS_DARK }}>
        {/* ===== HERO BAND + SECTIONS BAND ====================================
            Same shell geometry as /platform/viso-yard. The hero gets its own
            band with a 180px SPACER where the rail column sits, so the rail
            does not stand beside the hero — it only appears once section 01
            arrives, which is also the first thing it has anything to index.

            The gridlines cannot live inside either band's sheet or they break
            into two disconnected runs at the seam, so they are lifted out and
            drawn as one full-height overlay over this container, re-creating
            the row geometry (1620 max, centred, 180 rail column) so they land
            on exactly the same axes the bands use. This container must stay
            `position: relative` and must NOT include the Convert bookend,
            which draws its own rules.
            ================================================================= */}
        <div style={{ position: "relative" }}>
          {/* continuous gridlines, behind everything */}
          <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
            <div className="hidden md:flex" style={{ maxWidth: 1620, height: "100%", margin: "0 auto" }}>
              <div style={{ flex: "0 0 180px" }} />
              <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0, maxWidth: 1440 }}>
                <Verticals color={GRID_D} />
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

          {/* BAND 3 — the numbered sections, and THE ONLY BAND THE RAIL SPANS.
              Scoping the rail here is what keeps it off screen until the hero
              and the overview have both scrolled away — it indexes 01-05 and
              nothing above them. Do not hoist it up for symmetry with the
              gridlines; the gridlines are continuous BECAUSE they belong to
              every band, and the rail is not because it does not. */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none" }}>
              <div className="hidden md:flex" style={{ maxWidth: 1620, height: "100%", margin: "0 auto" }}>
                {/* display:flex + height:100% is load-bearing — the rail relies
                    on `alignSelf: stretch` to be as tall as the scroll it stays
                    stuck over, and alignSelf does nothing inside a block parent.
                    pointerEvents is off on the layer and back on for the column
                    so the layer never swallows clicks meant for the sections. */}
                <div style={{ flex: "0 0 180px", height: "100%", display: "flex", pointerEvents: "auto" }}>
                  <FactoryRailDesktop />
                </div>
              </div>
            </div>

            <div style={{ maxWidth: 1620, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
              <div aria-hidden="true" className="hidden md:block" style={{ flex: "0 0 180px" }} />

              <div style={{ ...SHEET, overflowX: "clip" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Reveal as="div"><SectionProduction /></Reveal>
                  <Reveal as="div"><SectionAudit /></Reveal>
                  {/* Dimension is a light band — Reveal wraps inside it (viso-warehouse/sections.tsx) so the background paints immediately */}
                  <SectionDimension />
                  <Reveal as="div"><SectionWork n="04" /></Reveal>
                  <Reveal as="div"><SectionSecure n="05" /></Reveal>
                </div>
              </div>
            </div>
          </div>
        </div>

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

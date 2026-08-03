import DecryptedText from "@/components/decrypted-text";
import { JsonLd, productSchema } from "@/components/json-ld";
import { pageMeta } from "@/lib/seo";
import { Reveal } from "@/components/motion";
import { WarehouseRailDesktop, WarehouseRulerMobile } from "./rail";
import { Convert } from "./convert";
import {
  SectionAudit,
  SectionCargo,
  SectionDimension,
  SectionDocument,
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
   /platform/viso-warehouse — page assembly (hero manifest + rail + 6 sections).
   Ported from VisoWarehouse-Overview.dc.html.

   Scroll order (hero manifest):
     hero → 01 CARGO → 02 AUDIT → 03 DIMENSION[light] → 04 DOCUMENT
     → 05 WORK → 06 SECURE → Convert (closing bookend).
   Cargo + Document are the Viso Yard components, reused verbatim.
--------------------------------------------------------------------------- */

const MANIFEST = [
  { n: "01", name: "CARGO VISION", desc: "count with proof", id: "cargo-vision" },
  { n: "02", name: "AUDIT VISION", desc: "event-linked proof", id: "audit-vision" },
  { n: "03", name: "DIMENSION VISION", desc: "volumetric capture", id: "dimension-vision" },
  { n: "04", name: "DOCUMENT VISION", desc: "key-value extraction", id: "document-vision" },
  { n: "05", name: "WORK VISION", desc: "attendance from the cameras", id: "work-vision" },
  { n: "06", name: "SECURE VISION", desc: "alerts and logs", id: "secure-vision" },
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
        <span style={{ ...eyebrow(TXT_D2), display: "block", paddingLeft: 24 }}>OUR PLATFORM — YOUR CAMERAS · INBOUND TO OUTBOUND</span>
        <h1 style={{ margin: "72px 0 0", paddingLeft: 6, fontFamily: sans, fontSize: 136, lineHeight: 1, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
          <DecryptedText text="Viso Warehouse" animateOn="view" sequential revealDirection="start" speed={55} encryptedClassName="v-enc" />
        </h1>
        <p style={{ margin: "40px 0 0", paddingLeft: 24, maxWidth: 592, fontFamily: sans, fontSize: 20, lineHeight: 1.5, color: TXT_D1 }}>
          Every case counted, every pallet dimensioned, every order proven — on the cameras already covering your floor.
        </p>
      </div>

      {/* MOBILE — keeps the manifest list (the products grid below the hero
          is desktop-only) */}
      <div className="md:hidden" style={{ position: "relative", zIndex: 1, padding: "40px 24px 0" }}>
        <span style={{ ...eyebrow(TXT_D2), fontSize: 11 }}>OUR PLATFORM — YOUR CAMERAS · INBOUND TO OUTBOUND</span>
        <h1 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 64, lineHeight: 0.98, fontWeight: 600, letterSpacing: "-0.035em", textTransform: "uppercase", color: TXT_D1 }}>
          <DecryptedText text="Viso Warehouse" animateOn="view" sequential revealDirection="start" speed={55} encryptedClassName="v-enc" />
        </h1>
        <p style={{ margin: "32px 0 0", fontFamily: sans, fontSize: 18, lineHeight: 1.5, color: TXT_D1 }}>
          Every case counted, every pallet dimensioned, every order proven — on the cameras already covering your floor.
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
          DOCK_02 :: PO 448120 :: COUNT 0.98 :: 09:41:07
        </span>
      </div>
    </div>
  );
}

/* ========================================================================= */

export const metadata = pageMeta({
  title: "Viso Warehouse — Warehouse & DC Vision",
  description:
    "Every case counted, every pallet dimensioned, every order proven — on the cameras already covering your floor. Cargo counting, dimensioning, document extraction, attendance and security for warehouses and distribution centres.",
  path: "/platform/viso-warehouse",
});

export default function VisoWarehousePage() {
  return (
    <>
      <JsonLd
        data={productSchema({
          name: "Viso Warehouse",
          description:
            "AI vision for warehouses and distribution centres — case counting, pallet dimensioning, document extraction, attendance and security from existing CCTV.",
          path: "/platform/viso-warehouse",
          features: [
            "Cargo Vision — count with proof",
            "Audit Vision — event-linked proof",
            "Dimension Vision — volumetric capture",
            "Document Vision — key-value extraction",
            "Work Vision — attendance from the cameras",
            "Secure Vision — alerts and logs",
          ],
        })}
      />
      <WarehouseRulerMobile />

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
              and the overview have both scrolled away — it indexes 01-06 and
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
                  <WarehouseRailDesktop />
                </div>
              </div>
            </div>

            <div style={{ maxWidth: 1620, margin: "0 auto", display: "flex", alignItems: "flex-start" }}>
              <div aria-hidden="true" className="hidden md:block" style={{ flex: "0 0 180px" }} />

              <div style={{ ...SHEET, overflowX: "clip" }}>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <Reveal as="div"><SectionCargo n="01" /></Reveal>
                  <Reveal as="div"><SectionAudit /></Reveal>
                  {/* Dimension is a light band — Reveal wraps inside it (sections.tsx) so the background paints immediately */}
                  <SectionDimension />
                  <Reveal as="div"><SectionDocument n="04" /></Reveal>
                  <Reveal as="div"><SectionWork /></Reveal>
                  <Reveal as="div"><SectionSecure /></Reveal>
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

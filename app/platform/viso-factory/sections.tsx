import {
  ANCHOR_OFFSET,
  BORDER_D,
  BORDER_D_STRONG,
  CROSS_D,
  Cross,
  Dot,
  GRID_D,
  SURFACE_DARK,
  TXT_D1,
  TXT_D2,
  eyebrow,
  mono,
  sans,
} from "../viso-yard/_shared";
import { Schematic } from "../viso-yard/_media";

/* ---------------------------------------------------------------------------
   Viso Factory — section modules.

   Audit / Dimension / Work / Secure are the Viso Warehouse designs, re-exported.

   Production Vision is ported from the VisoWarehouse-Overview canvas frame
   "Production Vision — the feed" (VISO-WAREHOUSE · SECTION 12C · DESKTOP 1360 +
   its Mobile 390 companion): a live line-feed demo slot, REC/EXIT overlays, and
   a COUNT · SKU ID · INSPECT · TRACE capability register.
--------------------------------------------------------------------------- */

export { SectionAudit, SectionDimension, SectionWork, SectionSecure } from "../viso-warehouse/sections";

/* =========================================================================
   00 · PRODUCTS OVERVIEW — same card-grid pattern as Viso Yard/Warehouse: one
   card per system, flagship schematic drawing itself in on view. Sits between
   the hero and 01 Production. Desktop-only (mobile keeps its manifest list).
   ========================================================================= */
const PRODUCTS_OVERVIEW: { n: string; name: string; desc: string; id: string; file: string; label: string; wide?: string }[] = [
  { n: "01", name: "Production Vision", desc: "Count, SKU and damage per shift", id: "production-vision", file: "factory-production-schematic-desktop.svg", label: "Production line feed schematic" },
  { n: "02", name: "Audit Vision", desc: "Event-linked proof", id: "audit-vision", file: "audit-schematic.svg", label: "Audit trail schematic" },
  { n: "03", name: "Dimension Vision", desc: "Volumetric capture", id: "dimension-vision", file: "visotonics-dimension-schematic-dark.svg", label: "Dimension overview schematic" },
  { n: "04", name: "Work Vision", desc: "Attendance from the cameras", id: "work-vision", file: "work-vision-schematic-desktop.svg", label: "Work-vision shift-register schematic" },
  { n: "05", name: "Secure Vision", desc: "Alerts and logs", id: "secure-vision", file: "warehouse-secure-schematic-desktop.svg", label: "Secure-vision alert schematic", wide: "1046 / 340" },
];

/* ONE TILE = ONE DRAWING. Identical to Viso Yard's ProductCard — see that
   file for the reasoning: no 8px radius, no hairline box, no caption block
   under the artwork; the number + name sit ABOVE the drawing as a figure
   label, and the slot is 16:9 contain with a 28px pad so the margin reads as
   margin. Keep this in step with viso-yard/sections.tsx. */
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

const HAIR_STRONG = "rgba(244,245,247,0.24)";
const HAIR = "rgba(244,245,247,0.18)";
const SLOT_BORDER = "rgba(244,245,247,0.14)";

// dark-section eyebrow-row chrome (gridline through the eyebrow + one orange dot)
function EyebrowRule({ mobile = false }: { mobile?: boolean }) {
  return (
    <>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: mobile ? 64 : 120, height: 1, background: GRID_D, zIndex: 0 }} />
      <Dot style={{ left: mobile ? 23 : 63, top: mobile ? 63 : 119, zIndex: 1 }} />
    </>
  );
}

const REGISTER: [string, string][] = [
  ["COUNT", "this shift"],
  ["SKU ID", "read on the fly"],
  ["INSPECT", "defects flagged in-line"],
  ["TRACE", "unit-level history"],
];

/* =========================================================================
   01 · PRODUCTION VISION [CNT]  (dark) — "the feed"
   ========================================================================= */
export function SectionProduction() {
  return (
    <section id="production-vision" className={ANCHOR_OFFSET} style={{ position: "relative" }}>
      <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, background: BORDER_D_STRONG, zIndex: 2 }} />
      <Cross color={CROSS_D} style={{ left: -4, top: -4, zIndex: 3 }} />
      <Cross color={CROSS_D} style={{ left: "calc(100% - 5px)", top: -4, zIndex: 3 }} />

      {/* DESKTOP */}
      <div className="hidden md:block" style={{ position: "relative", paddingBottom: 96 }}>
        <EyebrowRule />
        <div style={{ position: "relative", zIndex: 1, padding: "104px 64px 0" }}>
          <span style={{ ...eyebrow(TXT_D2), display: "block", paddingLeft: 24 }}>01 — PRODUCTION VISION · COUNT · IDENTIFY · INSPECT</span>
          <h2 style={{ margin: "40px 0 0", paddingLeft: 6, maxWidth: 820, fontFamily: sans, fontSize: 40, lineHeight: 1.18, fontWeight: 600, letterSpacing: "-0.015em", color: TXT_D1 }}>
            One camera over the line — every unit counted, identified and inspected the moment it leaves the line.
          </h2>

          {/* demo slot — live line feed */}
          <div style={{ position: "relative", marginTop: 48, border: `1px solid ${SLOT_BORDER}`, boxSizing: "border-box", overflow: "hidden" }}>
            <Schematic
              file="factory-production-schematic-desktop.svg"
              label="Production line feed — units flowing past one camera, each counted, SKU-read and inspected in a single pass, with one defect flagged in-line"
              fit="width"
              style={{ display: "block", width: "100%" }}
            />
          </div>

          {/* capability register */}
          <div style={{ marginTop: 44, borderTop: `1px solid ${HAIR_STRONG}`, borderBottom: `1px solid ${HAIR}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "26px 0" }}>
              {REGISTER.map(([k, v]) => (
                <span key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>{k}</span>
                  <span style={{ fontFamily: mono, fontSize: 13, color: TXT_D2 }}>{v}</span>
                </span>
              ))}
            </div>
          </div>

          <p style={{ margin: "40px auto 0", maxWidth: 1000, textAlign: "center", fontFamily: sans, fontSize: 18, lineHeight: 1.5, fontWeight: 500, color: TXT_D2 }}>
            No manual tally, no separate inspection station — count, SKU and condition are read in the same pass, on the same camera.
          </p>
        </div>
      </div>

      {/* MOBILE */}
      <div className="md:hidden" style={{ position: "relative", padding: "56px 24px 56px 40px" }}>
        <EyebrowRule mobile />
        <span style={{ ...eyebrow(TXT_D2), display: "block", fontSize: 11 }}>01 — PRODUCTION VISION · COUNT · IDENTIFY · INSPECT</span>
        <h2 style={{ margin: "24px 0 0", fontFamily: sans, fontSize: 26, lineHeight: 1.2, fontWeight: 600, letterSpacing: "-0.01em", color: TXT_D1 }}>
          One camera over the line — every unit counted, identified and inspected as it passes.
        </h2>
        <p style={{ margin: "16px 0 0", fontFamily: sans, fontSize: 14, lineHeight: 1.5, color: TXT_D2 }}>
          No manual tally, no separate inspection station — count, SKU and condition are read in the same pass, on the same camera.
        </p>

        <span style={{ ...eyebrow(TXT_D2), display: "block", marginTop: 24, fontSize: 11 }}>LIVE LINE FEED — DEMO</span>
        <div style={{ position: "relative", marginTop: 8, border: `1px solid ${SLOT_BORDER}`, boxSizing: "border-box", overflow: "hidden" }}>
          <Schematic
            file="factory-production-schematic-mobile.svg"
            label="Production line feed — units flowing past one camera, counted, SKU-read and inspected, one defect flagged"
            fit="width"
            style={{ display: "block", width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 24, borderTop: `1px solid ${HAIR_STRONG}`, borderBottom: `1px solid ${HAIR}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 16, padding: "20px 0" }}>
            {REGISTER.map(([k, v]) => (
              <span key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, letterSpacing: "0.06em", color: TXT_D1 }}>{k}</span>
                <span style={{ fontFamily: mono, fontSize: 12, color: TXT_D2 }}>{v}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

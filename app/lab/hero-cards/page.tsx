import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { DataCard, FactoryCard, WarehouseCard, YardCard } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).
   Reproduces the homepage's desktop hero card band geometry (app/page.tsx,
   `HERO_CARDS` / `className="dt-card"`) so the four scenes can be reviewed
   side by side at their real on-page size. */
export const metadata: Metadata = {
  title: "Lab · Hero Cards",
  robots: { index: false, follow: false },
};

/* The CARD stays dark. Only the animation panel inside it is light — see
   card-scene.tsx. A near-white render area inside a dark card is what gives the
   band its contrast, the way a photograph does on a dark page. */
const DARK = "#0A0B0E";
const DARK_SURFACE = "#101216";
const GRID_D = "rgba(244,245,247,0.08)";
const TXT_D1 = "#F4F5F7";
const TXT_D2 = "#A6ADB8";
const SIGNAL = "#ED510C";

const CARDS = [
  { num: "01", name: "Viso Yard", desc: "Container, gate, crane, yard & cargo inspection", Scene: YardCard },
  { num: "02", name: "Viso Warehouse", desc: "Counting, audit & dimensioning", Scene: WarehouseCard },
  { num: "03", name: "Viso Factory", desc: "Production & process monitoring", Scene: FactoryCard },
  { num: "04", name: "Viso Data", desc: "Compression, trace & detection AI", Scene: DataCard },
];

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

export default function HeroCardsLabPage() {
  return (
    <main style={{ background: DARK, minHeight: "100vh", padding: "clamp(16px,4vw,48px)" }}>
      <style>{HERO_CARD_CSS}</style>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
        {CARDS.map((c, i) => (
          <div
            key={c.num}
            className="lab-hc"
            tabIndex={0}
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
            }}
          >
            <span
              className="lab-num"
              style={{
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: TXT_D2,
              }}
            >
              {c.num}
            </span>
            <span aria-hidden="true" className="lab-lead" style={{ display: "block", height: 1, background: SIGNAL, marginTop: 6 }} />
            <div style={{ flex: 1, margin: "16px 0", borderRadius: 6, overflow: "hidden", minHeight: 0, display: "flex" }}>
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
                <c.Scene />
              </div>
            </div>
            <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: TXT_D1 }}>{c.name}</span>
              {/* two reserved lines (2 x 18 x 1.5) so a one-line description
                  cannot make its card's flex-1 media panel taller than Yard's */}
              <span style={{ fontSize: 18, lineHeight: 1.5, color: TXT_D2, minHeight: 54 }}>{c.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

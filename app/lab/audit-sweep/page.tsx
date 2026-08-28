import type { Metadata } from "next";
import GateVisionScene from "@/components/vision/gate-vision/scene";
import TankVisionScene from "@/components/vision/tank-vision/scene";
import DocumentVisionScene from "@/components/vision/document-vision/scene";
import AuditVisionScene from "@/components/vision/audit-vision/scene";
import DimensionVisionScene from "@/components/vision/dimension-vision/scene";
import SecureVisionScene from "@/components/vision/secure-vision/scene";
import WorkVisionScene from "@/components/vision/work-vision/scene";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   WHY THIS PAGE EXISTS — a review harness, not a design surface.

   Reviewing these scenes one lab route at a time costs one NAVIGATION each,
   and navigation is expensive here for a reason that has nothing to do with
   the code: the review browser pane drops to hidden on every navigate, so
   each scene needs the pane manually brought forward again before it will
   composite a frame. Seven scenes therefore meant seven interruptions.

   Stacking them on ONE route reduces that to one. After the first frame the
   page is only SCROLLED, never navigated, so the pane stays displayed and any
   number of screenshots can be taken back to back.

   A useful side effect: the scenes here run FREE rather than pinned with
   `?phase`. `?phase` reads `location.search` (gate-vision/scene.tsx:392) and
   would therefore pin every scene on the page to the same value, which is
   wrong for seven loops of different lengths. Left free-running, real time
   passes between screenshots and each capture lands on a different phase —
   which is what makes animation and timing reviewable at all. Use the
   single-scene lab routes with `?phase` when a SPECIFIC beat needs pinning.

   Sized at each scene's own flagship aspect so nothing is judged at the wrong
   crop. */
export const metadata: Metadata = {
  title: "Lab · Audit Sweep",
  robots: { index: false, follow: false },
};

const SCENES = [
  { id: "gate", name: "01 Gate Vision", aspect: "1600 / 680", Scene: GateVisionScene },
  { id: "tank", name: "02 Tank Vision", aspect: "1600 / 900", Scene: TankVisionScene },
  { id: "document", name: "03 Document Vision", aspect: "1600 / 900", Scene: DocumentVisionScene },
  { id: "audit", name: "04 Audit Vision", aspect: "1600 / 900", Scene: AuditVisionScene },
  { id: "dimension", name: "05 Dimension Vision", aspect: "1600 / 900", Scene: DimensionVisionScene },
  { id: "secure", name: "06 Secure Vision", aspect: "1600 / 900", Scene: SecureVisionScene },
  { id: "work", name: "07 Work Vision", aspect: "1600 / 900", Scene: WorkVisionScene },
];

export default function AuditSweepPage() {
  return (
    <main style={{ background: "#07080B", minHeight: "100vh", padding: "clamp(12px,2vw,24px)" }}>
      {SCENES.map((s) => (
        <section key={s.id} id={s.id} style={{ maxWidth: 1100, margin: "0 auto 40px" }}>
          <h2
            style={{
              font: "500 12px/1.4 ui-monospace, monospace",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6B7078",
              margin: "0 0 8px",
            }}
          >
            {s.name}
          </h2>
          <div style={{ position: "relative", width: "100%", aspectRatio: s.aspect }}>
            <s.Scene />
          </div>
        </section>
      ))}
    </main>
  );
}

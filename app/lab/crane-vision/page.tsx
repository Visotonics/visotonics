import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { CraneVisionScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   Standalone iteration route for Crane Vision, matching the twins that exist for
   Container, Tank, Gate and Yard.

   The background is the site's DARK canvas, like the Yard lab page and unlike
   the Tank and Container ones. Same reason: this is a dark section, and the
   scene's whole colour argument is that the cargo has to sit between a
   near-black background and the accent overlay in value. Reviewing it on a
   light page would make every judgement about those hexes wrong.

   PORTRAIT, and narrow. This is the only flagship whose slot is taller than it
   is wide, and the scene derives its camera distance from the LIVE aspect — so
   reviewing it in a landscape box would be reviewing a different framing than
   the one that ships. */
export const metadata: Metadata = {
  title: "Lab · Crane Vision",
  robots: { index: false, follow: false },
};

export default function CraneVisionLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", padding: "48px 0" }}>
      {/* the same aspect box the section gives it, so framing judged here is
          the framing that ships */}
      <div style={{ position: "relative", width: "100%", maxWidth: 560, margin: "0 auto", aspectRatio: "680 / 1120" }}>
        <CraneVisionScene bare />
      </div>
    </main>
  );
}

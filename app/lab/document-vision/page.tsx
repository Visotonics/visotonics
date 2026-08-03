import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { DocumentVisionScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   Standalone iteration route for Document Vision, matching the twins that exist
   for Container, Tank, Gate, Yard, Crane and Cargo.

   The background is the site's DARK canvas. Not a style choice: this scene's
   whole value argument is that an off-white page under the full area-light rig
   blows out unless its material tint is pulled well below its albedo, and that
   judgement is only meaningful against the near-black the scene actually ships
   on. Reviewing it on a light page would make every one of those hexes wrong.

   LANDSCAPE 3:2 AT 1100 WIDE, which is the slot the scene's framing is derived
   against — see the derivation block in scene.tsx. Judged at any other aspect
   the camera distance is wrong, because fitRad compensates off this number. */
export const metadata: Metadata = {
  title: "Lab · Document Vision",
  robots: { index: false, follow: false },
};

export default function DocumentVisionLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", padding: "48px 0" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 1100, margin: "0 auto", aspectRatio: "3 / 2" }}>
        <DocumentVisionScene bare />
      </div>
    </main>
  );
}

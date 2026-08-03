import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { CargoVisionScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   Standalone iteration route for Cargo Vision, matching the twins that exist for
   Container, Tank, Gate and Yard.

   The background is the site's DARK canvas. Not a style choice: this scene's
   whole colour argument is that the cargo has to sit between a near-black
   backdrop and the accent overlay in value, and the CCTV frame grab is keyed to
   #0E1116. Reviewing either on a light page would make every judgement wrong.

   LANDSCAPE 4:3 AT 1200 WIDE, which is the slot the scene's framing is derived
   against — see the derivation block in scene.tsx. Judged at any other aspect
   the camera distance is wrong, because fitRad compensates off this number. */
export const metadata: Metadata = {
  title: "Lab · Cargo Vision",
  robots: { index: false, follow: false },
};

export default function CargoVisionLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", padding: "48px 0" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 1200, margin: "0 auto", aspectRatio: "4 / 3" }}>
        <CargoVisionScene bare />
      </div>
    </main>
  );
}

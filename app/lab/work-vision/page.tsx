import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { WorkVisionScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   Standalone iteration route for Work Vision, matching the twins that exist for
   Container, Tank, Gate and Yard.

   The background is the site's DARK canvas. Not a style choice: this scene's
   whole value argument is that the walker has to sit between a near-black
   background and the accent overlay, so reviewing it on a light page would make
   every judgement about those hexes wrong. */
export const metadata: Metadata = {
  title: "Lab · Work Vision",
  robots: { index: false, follow: false },
};

export default function WorkVisionLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", padding: "48px 0" }}>
      {/* The same landscape 16/9 box the section gives it, so the framing judged
          here is the framing that ships. No bleed: this scene derives its whole
          camera from the live aspect and the overlay's register block is pinned
          to the overlay's own bottom-left, so a bled canvas would only move the
          subject away from the type it is captioned by. */}
      <div style={{ position: "relative", width: "100%", maxWidth: 1200, margin: "0 auto", aspectRatio: "16 / 9" }}>
        <WorkVisionScene bare />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { YardVisionScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   Standalone iteration route for Yard Vision, matching the twins that exist for
   Container, Tank and Gate.

   The background is the site's DARK canvas, unlike the Tank and Container lab
   pages which are light. That is not a style choice — section 04 is a dark
   section, and this scene's whole colour argument is that the containers have to
   sit between a near-black background and the accent overlay in value. Reviewing
   it on a light page would make every judgement about those hexes wrong. */
export const metadata: Metadata = {
  title: "Lab · Yard Vision",
  robots: { index: false, follow: false },
};

export default function YardVisionLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", padding: "48px 0" }}>
      {/* the same aspect box the section gives it, so framing judged here is
          the framing that ships */}
      <div style={{ position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto", aspectRatio: "1600 / 680" }}>
        <YardVisionScene bare bleed={230} />
      </div>
    </main>
  );
}

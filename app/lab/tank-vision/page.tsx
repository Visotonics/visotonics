import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { TankVisionScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   A standalone route for Tank Vision, matching the twins that already exist for
   Container and Gate. It is here for ITERATION: reviewing this scene through
   /lab/viso-yard means loading a 20,000px page with two other WebGL scenes on
   it, which is both slow to drive and impossible to frame a screenshot in. */
export const metadata: Metadata = {
  title: "Lab · Tank Vision",
  robots: { index: false, follow: false },
};

export default function TankVisionLabPage() {
  return (
    <main style={{ background: "#ECEDEF", minHeight: "100vh", padding: "48px 0" }}>
      {/* the same aspect box the section gives it, so framing judged here is
          the framing that ships */}
      <div style={{ position: "relative", width: "100%", maxWidth: 1440, margin: "0 auto", aspectRatio: "1600 / 680" }}>
        <TankVisionScene bare bleed={230} />
      </div>
    </main>
  );
}

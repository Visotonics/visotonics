import type { Metadata } from "next";
import DimensionVisionScene from "@/components/vision/dimension-vision/scene";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see
   DECISIONS.md). Shows only the animation, at the flagship schematic's
   aspect ratio (813 x 560 -> 1.452:1, ~900 x 620). */
export const metadata: Metadata = {
  title: "Lab · Dimension Vision",
  robots: { index: false, follow: false },
};

export default function DimensionVisionLabPage() {
  return (
    <main style={{ background: "#07080B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,4vw,48px)" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 900, aspectRatio: "813 / 560" }}>
        <DimensionVisionScene />
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import GateVisionScene from "@/components/vision/gate-vision/scene";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).
   Shows only the animation, at the flagship schematic's aspect ratio (1600 x 680). */
export const metadata: Metadata = {
  title: "Lab · Gate Vision",
  robots: { index: false, follow: false },
};

export default function GateVisionLabPage() {
  return (
    <main style={{ background: "#07080B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,4vw,48px)" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 1100, aspectRatio: "1600 / 680" }}>
        <GateVisionScene />
      </div>
    </main>
  );
}

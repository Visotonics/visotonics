import type { Metadata } from "next";
import SecureVisionScene from "@/components/vision/secure-vision/scene";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).
   Staged at the flagship slot's own aspect, ~1230 x 400 (3.076:1). */
export const metadata: Metadata = {
  title: "Lab · Secure Vision",
  robots: { index: false, follow: false },
};

export default function SecureVisionLabPage() {
  return (
    <main style={{ background: "#07080B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,4vw,48px)" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 1230, aspectRatio: "1230 / 400" }}>
        <SecureVisionScene />
      </div>
    </main>
  );
}

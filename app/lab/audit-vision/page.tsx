import type { Metadata } from "next";
import AuditVisionScene from "@/components/vision/audit-vision/scene";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).
   Staged at the scene's own 4:3 fit (~1000 x 750). */
export const metadata: Metadata = {
  title: "Lab · Audit Vision",
  robots: { index: false, follow: false },
};

export default function AuditVisionLabPage() {
  return (
    <main style={{ background: "#07080B", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(16px,4vw,48px)" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 1000, aspectRatio: "4 / 3" }}>
        <AuditVisionScene />
      </div>
    </main>
  );
}

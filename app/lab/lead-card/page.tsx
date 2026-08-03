import type { Metadata } from "next";
import LeadCardScene from "@/components/vision/lead-card/scene";

/* Isolated lab prototype — noindex per the lab-page convention (DECISIONS.md).
   Framed at the real lead card's proportions and on its real LIGHT surface,
   because this is the only light scene in the system and it cannot be judged
   against a dark page. */
export const metadata: Metadata = {
  title: "Lab · Lead Card",
  robots: { index: false, follow: false },
};

export default function LeadCardLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div style={{ width: "100%", maxWidth: 980, background: "#F6F7F8", borderRadius: 8, padding: 40, boxSizing: "border-box" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 6, overflow: "hidden" }}>
          <LeadCardScene />
        </div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 34, fontWeight: 600, letterSpacing: "-0.02em", color: "#13151A" }}>From the CCTV you already own.</span>
          <span style={{ fontSize: 20, lineHeight: 1.5, color: "#6B7078", maxWidth: "34ch" }}>
            No new hardware. The platform runs on the cameras already watching your yard, warehouse and factory.
          </span>
        </div>
      </div>
    </main>
  );
}

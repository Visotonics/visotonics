import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { DataCard } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   WHY THIS PAGE EXISTS.

   `/lab/hero-cards` renders the four scenes at their real shipped size
   (347x260) and that is the ACCEPTANCE test — it is where a detail either
   earns its place or is invisible and should be cut. But it is a terrible
   place to AUTHOR detail: at 347px you cannot see what you are shaping, so
   work gets tuned by arithmetic alone and lands wrong.

   So this page renders the SAME DataCard component — same subject, same rig,
   same materials, no forked copy that could drift — at flagship size, the
   ~1080x920 the platform-page scenes get. Build here, then check at
   /lab/hero-cards before calling anything done.

   Measured 2026-08-19 on a production build with ?perf: data is
   `studio 21 / subject 4` against a 150ms budget. The subject costs 4ms.
   Detail here is not constrained by the performance budget — there is roughly
   35x headroom — it is constrained only by what still reads at 347px. */
export const metadata: Metadata = {
  title: "Lab · Data Wall",
  robots: { index: false, follow: false },
};

const DARK = "#0A0B0E";

export default function DataWallLabPage() {
  return (
    <main style={{ background: DARK, minHeight: "100vh", padding: "clamp(12px,2vw,28px)" }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          aspectRatio: "1280 / 960",
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <DataCard />
      </div>
    </main>
  );
}

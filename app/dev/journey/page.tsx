import type { Metadata } from "next";
import JourneyScrollManager from "@/components/journey/scroll-manager";
import JourneyScene from "@/components/journey/journey-scene";

/* ---------------------------------------------------------------------------
   /dev/journey — DEV-ONLY PROTOTYPE.

   A feel test for a scroll-driven "journey" homepage: one pinned viewport with
   a single WebGL canvas, driven by scroll over a tall empty spacer. The whole
   point is to judge the interaction model before committing the real homepage
   to it — so this is deliberately isolated: nothing links to it, it is not in
   the sitemap, and it imports none of the production scene code.

   STRUCTURE, and why it is this shape:
     #journey            500vh, empty. This is the SCROLL DISTANCE and nothing
                         else. ScrollTrigger measures it top-top -> bottom-bottom.
     > sticky 100vh      the pinned viewport. `position: sticky` rather than
                         ScrollTrigger's own pin because sticky is done by the
                         compositor — no pin-spacer element injected into the
                         DOM, no layout thrash on resize, and it keeps
                         ScrollTrigger's job down to producing one number.

   Not linked from nav or sitemap; robots noindex,nofollow below.
--------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "[dev] Journey — scroll prototype",
  description: "Internal prototype only — not a real page.",
  robots: { index: false, follow: false },
};

export default function JourneyPrototypePage() {
  return (
    <>
      <JourneyScrollManager />

      <div id="journey" style={{ position: "relative", height: "500vh", background: "#0A0B0E" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            width: "100%",
            overflow: "hidden",
          }}
        >
          <JourneyScene />

          {/* Scroll affordance — a pinned viewport gives no scrollbar cue on
              trackpads, so the first frame has to say "keep going". Fades on
              its own with CSS; it is chrome, not part of the choreography. */}
          <div
            style={{
              position: "absolute",
              right: "clamp(24px, 6vw, 88px)",
              bottom: "clamp(56px, 12vh, 120px)",
              fontFamily: "var(--font-plex-mono)",
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "#6B7280",
              pointerEvents: "none",
            }}
          >
            SCROLL
          </div>
        </div>
      </div>
    </>
  );
}

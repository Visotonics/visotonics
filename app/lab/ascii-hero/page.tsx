import type { Metadata } from "next";
// lazy: keeps three.js out of the critical bundle — see _vision/lazy
import { AsciiHeroScene } from "@/components/vision/_vision/lazy";

/* Isolated lab prototype — NOT linked from nav/footer, NOT in the sitemap.
   noindex per the site convention for non-organic/lab pages (see DECISIONS.md).

   Two panels, deliberately:

     · the FIELD at full strength, so the effect itself can be judged — cell
       size, ramp, whether each operation is recognisable in the ~1s it gets.
     · the field AT HERO STRENGTH with real type over it, which is the only
       test that matters. This look lives or dies on whether the headline still
       reads. v3 bought that by dimming the field to 0.45; v4 buys it the
       reference's way, with a solid chip behind every line, and runs the field
       at 0.75 — so this panel is now a test of the CHIP, not of the dimmer.

   Mirrors the reference's structure — split headline, one line high left, one
   low right — so the comparison is like for like. */
export const metadata: Metadata = {
  title: "Lab · ASCII Hero",
  robots: { index: false, follow: false },
};

const SANS = "var(--font-archivo)";
const MONO = "var(--font-plex-mono)";

export default function AsciiHeroLabPage() {
  return (
    <main style={{ background: "#0A0B0E", minHeight: "100vh", padding: "40px 0 80px" }}>
      <section style={{ maxWidth: 1360, margin: "0 auto", padding: "0 32px" }}>
        <p style={{
          margin: "0 0 14px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(244,245,247,0.45)",
        }}>
          01 — field at full strength
        </p>
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", background: "#0A0B0E" }}>
          <AsciiHeroScene intensity={1} />
        </div>

        <p style={{
          margin: "56px 0 14px", fontFamily: MONO, fontSize: 11, letterSpacing: "0.14em",
          textTransform: "uppercase", color: "rgba(244,245,247,0.45)",
        }}>
          02 — at hero strength, with type
        </p>
        <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 7", background: "#0A0B0E", overflow: "hidden" }}>
          <AsciiHeroScene intensity={0.75} />

          {/* THE CHIP IS THE MECHANISM. The reference never dims its field to
              make room for its type — every line carries its own solid ground,
              a black slab the exact size of the words, and the field runs at
              full strength right up to that slab's edge. That is WHY their
              field is allowed to be as rich as it is: legibility is not being
              bought out of the field's budget.

              So panel 02 is no longer testing "how far down must the field go" —
              it is testing THAT COMPOSITION, and intensity 0.75 (up from v3's
              0.45) is the point of the test. If the headline reads at 0.75 with
              chips, the chip is doing the work and the field never has to be
              turned down again.

              One inline-block span PER LINE rather than one round the block:
              the chip has to hug each line's own width or it becomes a
              rectangle behind a ragged paragraph, which is a scrim by another
              name. Separate spans, so no box-decoration-break needed. */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <h1 style={{
              position: "absolute", left: "4%", top: "16%", margin: 0, maxWidth: "62%",
              fontFamily: SANS, fontSize: "clamp(32px, 5.2vw, 76px)", lineHeight: 1.02,
              fontWeight: 600, letterSpacing: "-0.03em", color: "#F4F5F7",
            }}>
              <span style={{ display: "inline-block", background: "#0A0B0E", padding: "0.04em 0.22em" }}>
                SEE EVERY
              </span>
              <br />
              <span style={{ display: "inline-block", background: "#0A0B0E", padding: "0.04em 0.22em" }}>
                CONTAINER
              </span>
            </h1>
            <div style={{ position: "absolute", right: "4%", bottom: "16%", textAlign: "right" }}>
              <p style={{
                margin: 0, fontFamily: SANS, fontSize: "clamp(28px, 4.4vw, 64px)", lineHeight: 1,
                fontWeight: 600, letterSpacing: "-0.03em", color: "#F4F5F7",
              }}>
                <span style={{ display: "inline-block", background: "#0A0B0E", padding: "0.04em 0.22em" }}>
                  IN SECONDS
                </span>
              </p>
              <p style={{
                margin: "18px 0 0", fontFamily: MONO, fontSize: 12, letterSpacing: "0.12em",
                textTransform: "uppercase", color: "rgba(244,245,247,0.62)",
              }}>
                {/* same chip, less padding: at 12px the display padding of the
                    headline would read as a button */}
                <span style={{ display: "inline-block", background: "#0A0B0E", padding: "0.12em 0.4em" }}>
                  / from the cameras you already have
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

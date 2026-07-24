"use client";

/* ---------------------------------------------------------------------------
   Viso Yard — the RAIL (functional spec, Build Order step 1)
   Ported from Claude Design: VisoYard-HeroManifest-Rail.dc.html (frames 1a/1b).

   Desktop: sticky full-height legend in the left margin column — a 1px vertical
   hairline datum, nine ticks, mono labels 01 CONTAINER … 09 SECURE always
   visible in text.secondary. Current section → label text.primary + a 3×3
   #ED510C square at its tick. No background, no border box.
   Mobile: collapses to a sticky horizontal ruler under the nav — baseline +
   nine ticks, current number bracketed [04] in text.primary.

   Scroll-spy uses an IntersectionObserver trigger-band at 40% of the viewport;
   clicks smooth-scroll to the anchor (instant under reduced motion) and sync
   the URL hash. Deep links land with the correct tick already lit because the
   observer resolves state on mount.
--------------------------------------------------------------------------- */

import { useEffect, useRef, useState } from "react";

// LIGHT-THEME VARIANT — local tokens inverted (dev-only, matches ./_shared.tsx)
const CANVAS = "#ECEDEF";
const TXT_PRIMARY = "#13151A";
const TXT_SECONDARY = "#5A5F6A";
const DATUM = "rgba(19,21,26,0.18)";
const MARK = "rgba(19,21,26,0.32)";
const HAIRLINE = "rgba(19,21,26,0.14)";
const SIGNAL = "#ED510C";
const mono = "var(--font-plex-mono)";

// Rail ticks in scroll order. `id` is the on-page anchor each tick drives.
// Order matches the sitemap ids and the page's DOM scroll order:
// container · tank · gate · yard · crane · cargo · document · work · secure.
export const RAIL_SECTIONS = [
  { n: "01", label: "CONTAINER", id: "container-vision" },
  { n: "02", label: "TANK", id: "tank-vision" },
  { n: "03", label: "GATE", id: "gate-vision" },
  { n: "04", label: "YARD", id: "yard-vision" },
  { n: "05", label: "CRANE", id: "crane-vision" },
  { n: "06", label: "CARGO", id: "cargo-vision" },
  { n: "07", label: "DOCUMENT", id: "document-vision" },
  { n: "08", label: "WORK", id: "work-vision" },
  { n: "09", label: "SECURE", id: "secure-vision" },
] as const;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Smooth-scroll to an anchor id (instant under reduced motion) and reflect it
// in the URL hash. scroll-margin-top on the target clears the sticky chrome.
function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
  history.replaceState(null, "", `#${id}`);
}

// stable id list — module constant so the spy effect never re-subscribes
const SECTION_IDS = RAIL_SECTIONS.map((s) => s.id);

/* ---- shared scroll-spy ---------------------------------------------------
   Active section = the last one whose top has scrolled above a trigger line at
   40% of the viewport (the approved export's own rule). Above the first section
   (hero) nothing is active. Driven by a rAF-throttled scroll/resize listener so
   it also resolves correct state on deep-link load and on resize — and, unlike
   an IntersectionObserver, keeps working when the tab is backgrounded. ---- */
function useActiveSection(): string | null {
  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);

  useEffect(() => {
    // Cheap (9 rect reads) — computed synchronously in the passive scroll
    // handler, exactly as the approved export's DCLogic does.
    const compute = () => {
      const line = window.innerHeight * 0.4;
      let next: string | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) next = id;
      }
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActive(next);
      }
    };

    // resolve immediately for deep-link / initial state
    compute();

    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    window.addEventListener("hashchange", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
      window.removeEventListener("hashchange", compute);
    };
  }, []);

  return active;
}

/* ---- desktop: sticky full-height legend ---------------------------------- */
export function YardRailDesktop() {
  const active = useActiveSection();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [dotTop, setDotTop] = useState<number | null>(null);

  // §5.2 — the tick marker slides (top offset transition) between ticks
  // instead of fading; position is measured off the actual tick DOM rather
  // than assumed from flex math, since justify-content:space-between spacing
  // depends on viewport height.
  useEffect(() => {
    if (!active) {
      setDotTop(null);
      return;
    }
    const update = () => {
      const container = containerRef.current;
      const item = itemRefs.current[active];
      if (!container || !item) return;
      const cRect = container.getBoundingClientRect();
      const iRect = item.getBoundingClientRect();
      setDotTop(iRect.top - cRect.top + iRect.height / 2 - 1.5);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [active]);

  return (
    <div
      aria-hidden="true"
      className="hidden md:block"
      style={{
        flex: "0 0 180px",
        width: 180,
        alignSelf: "stretch",
      }}
    >
      <nav
        aria-label="Section navigation"
        style={{
          position: "sticky",
          top: 72, // clears the 72px sticky nav
          height: "calc(100vh - 72px)",
          boxSizing: "border-box",
        }}
      >
        {/* datum: continuous 1px vertical hairline */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 56,
            top: 90,
            bottom: 90,
            width: 1,
            background: DATUM,
          }}
        />
        <div
          ref={containerRef}
          style={{
            position: "absolute",
            left: 40,
            top: 0,
            bottom: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "84px 0",
          }}
        >
          {/* the one sliding signal square — travels to the active tick */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              top: dotTop ?? 0,
              width: 3,
              height: 3,
              background: SIGNAL,
              opacity: dotTop === null ? 0 : 1,
              transition: "top var(--duration-dur-2) var(--ease-standard), opacity var(--duration-dur-1) linear",
              pointerEvents: "none",
            }}
          />
          {RAIL_SECTIONS.map((s) => {
            const isActive = active === s.id;
            return (
              <a
                key={s.id}
                ref={(el) => {
                  itemRefs.current[s.id] = el;
                }}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  jumpTo(s.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  height: 14,
                  textDecoration: "none",
                }}
              >
                {/* spacer — the actual marker is the single sliding dot above */}
                <span style={{ width: 3, height: 3, flex: "0 0 3px" }} />
                <span style={{ width: 6, height: 1, background: MARK }} />
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    color: isActive ? TXT_PRIMARY : TXT_SECONDARY,
                    transition: "color var(--duration-dur-1) var(--ease-standard)",
                  }}
                >
                  {s.n} {s.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

/* ---- mobile: sticky horizontal ruler under the nav ----------------------- */
export function YardRulerMobile() {
  const active = useActiveSection();

  return (
    <div
      className="md:hidden"
      style={{
        position: "sticky",
        top: 64, // clears the 64px mobile nav bar
        zIndex: 30,
        height: 44,
        background: CANVAS,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: 22,
          height: 1,
          background: DATUM,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {RAIL_SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-label={`${s.n} ${s.label}`}
              onClick={(e) => {
                e.preventDefault();
                jumpTo(s.id);
              }}
              style={{
                fontFamily: mono,
                fontSize: 13,
                letterSpacing: "0.04em",
                color: isActive ? TXT_PRIMARY : TXT_SECONDARY,
                background: CANVAS,
                padding: "0 3px",
                textDecoration: "none",
              }}
            >
              {isActive ? `[${s.n}]` : s.n}
            </a>
          );
        })}
      </div>
    </div>
  );
}

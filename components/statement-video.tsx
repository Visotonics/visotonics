"use client";

/* ---------------------------------------------------------------------------
   StatementVideo — background-footage slot for the home page Statement band.

   The real annotated inspection footage is still being cut. This component
   exists so that shipping it is a FILE DROP: put the three files named in
   `public/media/README.txt` on disk and the slot lights up with no code change.
   Until then the poster is the whole treatment, and the section looks exactly
   as it does today.

   Three gates, for three different reasons:

     1. LAZY — the homepage already carries several WebGL scenes fighting for
        main thread and bandwidth (see components/vision/_vision/lazy.tsx). A
        <video autoplay> mounted at first render starts fetching immediately
        even at preload="none", because autoplay overrides it. So the element
        is not rendered at all until an IntersectionObserver says the band is
        within 200px of the viewport.

     2. REDUCED MOTION — a looping background is exactly the kind of ambient
        movement `prefers-reduced-motion` exists to suppress. There is no
        "pause" affordance on decorative media, so the video is never mounted
        for those visitors, not merely paused.

     3. FAILURE — the media files legitimately do not exist yet, and a 404 on
        every <source> is the NORMAL path today, not an edge case. Two things
        make that invisible:
          · the poster is ALSO painted as a CSS background-image on the wrapper,
            so the visible result is identical whether the video element is
            absent, still loading, or has failed. Nothing reflows, because the
            wrapper is absolutely inset:0 and never depends on media metadata.
          · `failed` unmounts the element once the browser has EXHAUSTED the
            source list — the handler is on the <video>, deliberately not on
            each <source>: a per-source handler would fire on the .webm 404 and
            tear the element down before the .mp4 was ever tried. That means
            the fallback is one frame late by design, which is free because the
            poster background is already painted underneath.

   Layering, bottom to top: section background (owned by the caller) → poster
   background → video → scrim stack → children. Children keep their own
   z-index, so the section's corner brackets, dimension lines and signal dot
   still read above the footage.
--------------------------------------------------------------------------- */

import { useEffect, useRef, useState, type ReactNode } from "react";

/* One-line swap when the real frame lands: point this at
   "/media/statement-poster.jpg" and delete the .svg. It is referenced by both
   the <video poster> attribute and the CSS fallback, so they cannot drift. */
const POSTER = "/media/statement-poster.svg";

const SOURCES = [
  { src: "/media/statement-loop.webm", type: "video/webm" },
  { src: "/media/statement-loop.mp4", type: "video/mp4" },
];

/* SCRIM TONE.
   The dark stack is the specified treatment for a dark band. The Statement
   section is currently the LIGHT band (#ECEDEF, TXT_L1 #13151A type) — laying
   rgba(10,11,14,0.55) over it would put near-black type on a near-black field
   and destroy the contrast the section has today, so it takes the light stack.
   Both are here so re-keying the band is a one-prop change.

   Each is a flat wash plus a radial deepening toward the edges: the wash sets
   the floor contrast for type anywhere in the band, the radial keeps footage
   detail from crawling out at the corners where the drafting furniture sits. */
const SCRIMS = {
  dark: [
    "radial-gradient(ellipse at 50% 50%, rgba(10,11,14,0.10) 0%, rgba(10,11,14,0.55) 70%, rgba(10,11,14,0.80) 100%)",
    "linear-gradient(rgba(10,11,14,0.55), rgba(10,11,14,0.55))",
  ].join(", "),
  light: [
    "radial-gradient(ellipse at 50% 50%, rgba(236,237,239,0.62) 0%, rgba(236,237,239,0.86) 70%, rgba(236,237,239,0.96) 100%)",
    "linear-gradient(rgba(236,237,239,0.78), rgba(236,237,239,0.78))",
  ].join(", "),
};

export default function StatementVideo({
  children,
  scrim = "light",
}: {
  children: ReactNode;
  scrim?: keyof typeof SCRIMS;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Read once on mount rather than subscribing: the visitor changing this
    // mid-scroll is not worth an extra listener, and the safe state is "off".
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect(); // one-way: never tear down footage the visitor has seen
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        ref={ref}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          // Same stacking level as the section's existing furniture layer, but
          // earlier in the DOM — so the brackets and dots paint over the media
          // without changing a single existing z-index.
          zIndex: 0,
          backgroundImage: `url(${POSTER})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {near && !failed ? (
          <video
            muted
            playsInline
            loop
            autoPlay
            preload="none"
            poster={POSTER}
            onError={() => setFailed(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              // Real yard footage is far more saturated than anything else on
              // this page; pulled back so it never out-colours the sheet.
              filter: "saturate(0.85)",
            }}
          >
            {SOURCES.map((s) => (
              <source key={s.src} src={s.src} type={s.type} />
            ))}
          </video>
        ) : null}
        <div style={{ position: "absolute", inset: 0, background: SCRIMS[scrim] }} />
      </div>
      {children}
    </>
  );
}

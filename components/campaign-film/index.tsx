"use client";

/* ---------------------------------------------------------------------------
   CampaignFilm — the native r3f replacement for the recorded/captured
   `campaign-film.webm`. Every attempt to CAPTURE this segment to video failed
   for the same underlying reason: the source scene's detection labels are
   DOM (`<Html>` from drei), and `canvas.captureStream()` can only ever grab
   the WebGL canvas — so every recording came back with the container and
   gate rendering, but every one of the OCR/damage-finding labels missing,
   because they were never part of the canvas in the first place. Running the
   real scene, live, in the DOM sidesteps that entirely: there is no capture
   step, so nothing gets dropped.

   SCOPE. The source site is a single continuous scroll-linked film across
   its whole homepage (hero -> approach -> gate -> container scan -> cargo ->
   yard -> document -> analytics). This card runs only the first three beats
   — "Container comes in. Gates open. Container is scanned. All of the
   detects are on screen." — i.e. the source's own `scroll.p` window
   0 -> 0.52, ported unmodified from
   C:/Users/aprat/Desktop/Visotonics/3d/gitlab-visotonics.

   p=0.52 is not an arbitrary cutoff: it is the exact moment the container's
   360-degree damage-scan rotation completes (Container.tsx:
   `rotation.y = 2*PI*smooth(range(p,0.40,0.52))`, so at p=0.52 the container
   is back to visually facing forward, before the NEXT keyframe window
   (0.52-0.565) begins subtracting a partial turn). That makes it a natural,
   already-authored loop point — cutting anywhere else would loop mid-turn.

   HOW THE LOOP IS DRIVEN. The ported scene files (Rig/Backdrop/Stage/Gate/
   Container) are UNCHANGED from the source in every way that matters: they
   all read a module-level `scroll.p` and run identical range/smooth/window01
   math on it. The only thing that differs is WHAT SETS `scroll.p`. The
   source uses real scroll position via Lenis + GSAP ScrollTrigger
   (ScrollManager.tsx). This card has no scroll to link to, so `FilmClock`
   below sets `scroll.p` from elapsed time on a plain rAF loop instead — one
   `useFrame` tick, no GSAP/Lenis dependency pulled in for a canned loop.
--------------------------------------------------------------------------- */

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Rig from "./Rig";
import Backdrop from "./Backdrop";
import Stage from "./Stage";
import Gate from "./Gate";
import Container from "./Container";
import { scroll, notify } from "./state";
import { samplePalette } from "./palette";
import { DetStyles } from "./det-styles";

/** p never exceeds this — see the file header for why 0.52 is the natural loop point. */
const LOOP_END = 0.52;
/** Real seconds to traverse p: 0 -> LOOP_END. Chosen to roughly match the source's own felt pacing
 *  for this stretch of its scroll journey — slow enough to read the OCR/damage chips as they lock
 *  on, not so slow the loop feels stalled on a small card. */
const RUN_SECONDS = 15;
/** Hold on the fully-resolved scan (p sits at LOOP_END, everything settled) before fading out. */
const HOLD_SECONDS = 1.6;
/** Cross-fade duration each way at the wrap, so the hard cut from "mid-scan, dark, zoomed-in" back
 *  to "distant approach, daylight" (p: LOOP_END -> 0) is never seen — it happens under a fade. */
const FADE_SECONDS = 0.7;
const CYCLE_SECONDS = RUN_SECONDS + HOLD_SECONDS + FADE_SECONDS * 2;

/** Same inline-lightformer studio IBL as the source's Experience.tsx, verbatim — this is what gives
 *  the container's PBR clearcoat panels their specular highlights without an external HDRI file. */
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1} background={false}>
      <Lightformer intensity={0.6} color="#eaf1ff" form="rect" position={[0, 6, 9]} scale={[24, 14, 1]} />
      <Lightformer
        intensity={2.4}
        color="#ffffff"
        form="rect"
        position={[7, 10, 5]}
        rotation={[-Math.PI / 3, 0, 0]}
        scale={[12, 9, 1]}
      />
      <Lightformer
        intensity={1.3}
        color="#cfe0ff"
        form="rect"
        position={[-9, 5, -6]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[12, 9, 1]}
      />
      <Lightformer intensity={0.5} color="#fff3e6" form="rect" position={[0, 1.5, 11]} scale={[16, 4, 1]} />
    </Environment>
  );
}

/** Runs once per r3f frame (reuses the Canvas's own rAF loop rather than starting a second one).
 *  Computes `p` from elapsed time, writes it to the shared `scroll` singleton (read by every ported
 *  scene file's own `useFrame`), and calls `notify(p)` so the DOM-side `Det` labels — subscribed via
 *  `useScrollFn`, which runs on this same notify call rather than on React render — update too.
 *  Also imperatively sets the sky-gradient div's background, mirroring the source's separate DOM
 *  background layer (not ported as its own file — folded in here since this is its only consumer). */
function FilmClock({
  running,
  startRef,
  skyRef,
}: {
  running: boolean;
  startRef: React.MutableRefObject<number | null>;
  skyRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  useFrame(() => {
    if (!running) return;
    // performance.now(), NOT r3f's `clock.elapsedTime` — this same `startRef` is also read from
    // OUTSIDE the Canvas (the fade-opacity effect below, which has no r3f clock to read). Two
    // different time bases sharing one ref would desync the fade from the actual loop position;
    // using performance.now() in both places keeps them on the same clock by construction.
    const now = performance.now() / 1000;
    if (startRef.current === null) startRef.current = now;
    const el = (now - startRef.current) % CYCLE_SECONDS;

    let p: number;
    if (el < RUN_SECONDS) {
      p = LOOP_END * (el / RUN_SECONDS);
    } else {
      // holding + fading out/in: p stays parked at the resolved frame throughout, so nothing
      // moves under the fade — only the fade opacity itself animates.
      p = LOOP_END;
    }
    scroll.p = p;
    notify(p);

    if (skyRef.current) skyRef.current.style.background = samplePalette(p).gradient;
  });
  return null;
}

export default function CampaignFilm() {
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Mount-on-intersection, matching this codebase's convention elsewhere (_vision/lazy.tsx) —
  // no reason to run the loop while the card is scrolled out of view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The fade div (DOM, imperative opacity — same idiom the ported `Overlay` component itself uses)
  // ramps to 1 across the hold, then back to 0 as the next run starts, so the wrap is never seen.
  useEffect(() => {
    if (reduced || !visible) return;
    let raf = 0;
    const tick = () => {
      if (startRef.current !== null) {
        const el = (performance.now() / 1000 - startRef.current) % CYCLE_SECONDS;
        const fadeOutStart = RUN_SECONDS;
        const fadeOutEnd = RUN_SECONDS + FADE_SECONDS;
        const holdEnd = fadeOutEnd + HOLD_SECONDS;
        const fadeInEnd = holdEnd + FADE_SECONDS;
        let a = 0;
        if (el >= fadeOutStart && el < fadeOutEnd) a = (el - fadeOutStart) / FADE_SECONDS;
        else if (el >= fadeOutEnd && el < holdEnd) a = 1;
        else if (el >= holdEnd && el < fadeInEnd) a = 1 - (el - holdEnd) / FADE_SECONDS;
        if (fadeRef.current) fadeRef.current.style.opacity = String(a);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, visible]);

  // Reduced motion: settle on the fully-resolved scan frame (all detections locked, container
  // squared up) and never animate — a single representative frame, not a blank canvas.
  useEffect(() => {
    if (!reduced) return;
    scroll.p = LOOP_END;
    notify(LOOP_END);
    if (skyRef.current) skyRef.current.style.background = samplePalette(LOOP_END).gradient;
  }, [reduced]);

  return (
    <div ref={wrapRef} className="cf-root" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <DetStyles />
      <div ref={skyRef} aria-hidden="true" style={{ position: "absolute", inset: 0 }} />
      {/* Canvas is not mounted at all until the wrapper is actually on screen — not just paused
          internally. campaign-landing.tsx renders a full desktop AND mobile copy of this component
          simultaneously (`hidden md:block` / `md:hidden`), CSS-toggling which one is visible rather
          than conditionally rendering either — so without this gate, the off-screen responsive twin
          would open a SECOND live WebGL context and run a full per-frame render loop for a scene
          nobody can ever see. Same "hidden twin must cost nothing" rule `_vision/lazy.tsx`'s
          `mountWhenVisible` already enforces for every other scene on this site (see its own header
          comment) — reused here as the same principle, not a new one. */}
      {visible && (
        <Canvas
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          dpr={[1, 1.75]}
          camera={{ fov: 36, position: [0, 6.2, 26], near: 0.1, far: 120 }}
          style={{ position: "absolute", inset: 0 }}
        >
          <Suspense fallback={null}>
            <StudioEnv />
            <FilmClock running={!reduced} startRef={startRef} skyRef={skyRef} />
            <Rig />
            <Backdrop />
            <Stage />
            <Gate />
            <Container />
          </Suspense>
        </Canvas>
      )}
      {/* cross-fade cover at the loop wrap — see FilmClock/the effect above for the timing */}
      <div
        ref={fadeRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, background: "#000", opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
}

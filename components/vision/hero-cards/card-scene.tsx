"use client";

/* ---------------------------------------------------------------------------
   Home hero cards — the small scene.

   One component, four subjects. Same studio and the same locked-height camera
   rule as the flagship scenes, scaled down to a card:

     · no readout, no leader lines, no headline, NO CAPTION. The card's own
       name and description sit directly underneath in the markup; a caption
       burned into the render just says it twice, in a second typeface.
     · the camera is bolted down and pans slowly. No handheld float: four of
       these run side by side, and four independently drifting cameras on one
       screen reads as instability, not life.
     · it only renders while on screen. Four WebGL contexts above the fold is
       the whole frame budget of the homepage otherwise.

   prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, lerp, placeCamera, smoothstep } from "../_vision/camera";
import { billboard } from "./detect";
import type { CardSubject } from "./subjects";

export type CardKind = "yard" | "warehouse" | "factory" | "data";

/* How the camera moves. All four obey the house rule — locked height, ground
   distance, no crane — but they were all running the identical az+rad sweep,
   which is most of why the row read as one animation printed four times. Each
   card now moves the way its own subject wants to be looked at. */
export type CardMotion =
  | "orbit"   // swings around the subject — a static thing you inspect
  | "dolly"   // closes in, angle fixed — a task completing
  | "track"   // slides ALONG the subject — a line, or a run of things
  | "drift";  // slow one-way pan that wraps — a wall being monitored

interface Props {
  build: () => CardSubject;
  /** camera height / aim / distance, per subject */
  rig: {
    camY: number; ty: number; rad: [number, number]; az: [number, number];
    motion?: CardMotion;
    /** lateral travel for "track", in world units either side of centre */
    trackX?: number;
    /** seconds per loop; defaults to LOOP (14) — Warehouse runs faster per direction */
    loop?: number;
    /** name used only by the ?perf readout, so build costs are attributable */
    id?: string;
  };
}

/** The ANIMATION PANEL's own colour — not the card's.
 *
 *  THE RENDER AREA FLIPPED TO LIGHT; THE CARD DID NOT. Explicit user call, and
 *  the distinction matters. With a dark page (#0A0B0E), a dark card (#101216)
 *  and a scene backdrop keyed flat to that card, all three sat inside a 4% value
 *  window — nothing in the frame was dark and nothing was bright, so every card
 *  read as pale shapes floating on the same mid-charcoal whatever was in it.
 *  That was a studio decision (hold the backdrop flat so the canvas shows no
 *  edge), not a constraint, and it capped the contrast of the whole band.
 *
 *  Making only the RENDER AREA light fixes that and keeps the band's design:
 *  a near-white panel inside a dark card, the way a photograph sits on a dark
 *  page. The card keeps DARK_SURFACE and its light text. What inverts is every
 *  scene palette — see the value rules in DECISIONS.md.
 *
 *  This value is also the placeholder and error-fallback background, so it must
 *  track the backdrop below: an unbuilt scene should look like an empty panel,
 *  not like a hole. */
const CARD_SURFACE = "#F6F7F8";

const LOOP = 14;      // slow — these are ambient, not attention-grabbing
/* How present the detector's MARKS are with no interaction. Deliberately not 0:
   at zero the resting row is machinery and boxes, which is exactly the "it looks
   like we are selling boxes" failure the vision layer exists to fix. 0.35 keeps
   it legible that something is reading the scene, and leaves hover somewhere to
   go. */
const REST_VISION = 0.35;
const SETTLE = 1.2;   // the subject resolves in

export default function CardScene({ build, rig }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    /* Uses the SHARED gate in _vision/mount, not a private copy.

       This file used to carry its own IntersectionObserver + start(),
       written before the shared one existed. The consequence was invisible
       and expensive: when the build QUEUE was later added to
       mountWhenVisible — the fix that stops several scenes constructing in
       one blocking frame — the four hero cards silently opted out, because
       they never went through that path. The scenes most responsible for the
       homepage hang were the only ones NOT being staggered. One gate now. */
    function build3D(el: HTMLDivElement) {
    try {
      /* Cost controls: a card is ~320px wide and four run at once. Bloom does
         nothing visible at this size (nothing in these scenes is emissive any
         more), a 2048 shadow map is four times the resolution the card can
         show, and DPR above 1.5 is invisible here. */
      const _tS = performance.now();
      const studio = createStudio(el, {
        floorY: -1.0, shadowExtent: 5, exposure: 0.78,
        bloom: false, shadowMapSize: 512, maxDpr: 1.5,
        noEnv: true,
        lightRig: "lite",
        /* Keyed to LIGHT_SURFACE (#F6F7F8) — the card these sit ON — not to the
           page canvas. Held nearly flat: any ramp reads as a vignette inside
           the card and gives the frame a visible edge.

           Backdrop values come from the lead-card scene, which has run on a
           light surface since it was built. EXPOSURE DOES NOT: 0.5 was copied
           across with them and it made every subject read "insanely dark".

           The reason is compounding, and it is worth stating because it will
           catch the next person. A tinted metal's final value is
           albedo x tint x exposure: `tintMetal` multiplies a mid-grey #9AA0A8
           albedo (~0.6) by a tint, so a "light grey" #7E8792 tint is already
           down at ~0.3 before any lighting, and 0.5 exposure takes it to ~0.15
           — near-black against a #F6F7F8 panel. Lightening the tint hexes alone
           could not fix it; the multiplier had to come back up. 0.78. */
        backdrop: { top: "#F7F8FA", mid: "#F6F7F8", bottom: "#F4F5F7", glow: "#FFFFFF" },
      });
      const { camera, scene, bloom, shadowMat } = studio;

      const _tStudio = performance.now() - _tS;
      const _tB = performance.now();
      const subject = build();
      if (typeof location !== "undefined" && location.search.includes("perf")) {
        const w = window as unknown as { __visionSplit?: string[] };
        (w.__visionSplit ||= []).push(`studio ${_tStudio.toFixed(0)} / subject ${(performance.now() - _tB).toFixed(0)}`);
      }
      scene.add(subject.group);

      const ro = new ResizeObserver(studio.size);
      ro.observe(el);

      // Only run while visible. A card scrolled past is still a live GL context
      // otherwise, and there are four of them.
      let onScreen = true;
      const io = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "120px" },
      );
      io.observe(el);

      /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
      const target = new THREE.Vector3();
      let raf = 0;

      /* ---- HOVER TURNS THE VISION ON ----
         Rest: machinery and cargo, the camera's sight cone, and the detector's
         marks held quiet. Hover/focus: the marks come up to full, the frame rate
         goes to 60, and the camera leans in a few percent.

         POINTER-COARSE DEVICES ARE PINNED ON. There is no hover on touch, and
         meaning must never be gated behind an interaction a device cannot
         perform — so phones and tablets get the full state permanently.

         FOCUS COUNTS AS HOVER. These cards are anchors; a keyboard user tabbing
         through would otherwise never see the vision layer at all. */
      const _dbg = typeof location !== "undefined" && location.search.includes("perf");
      const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
      let want = coarse ? 1 : 0;
      let hoverT = want;
      const host = el.parentElement ?? el;
      const on = () => { if (!coarse) want = 1; };
      const off = () => { if (!coarse) want = 0; };
      host.addEventListener("pointerenter", on);
      host.addEventListener("pointerleave", off);
      // focusin/out rather than focus/blur: the listener sits on a wrapper, and
      // focus does not bubble while focusin does
      host.addEventListener("focusin", on);
      host.addEventListener("focusout", off);

      const loopS = rig.loop ?? LOOP;

      const frame = () => {
        const t = reduce ? 5.0 : clock.getElapsedTime();
        const p = reduce ? 0.55 : (t % loopS) / loopS;

        /* rig.motion AND rig.trackX WERE BOTH DEAD. The type declared them, the
           header comment above described them as the fix for the four cards
           reading as one animation printed four times, and nothing here ever
           read either field — every card ran this same az+rad sweep. The
           differentiation was designed, documented, and never wired.

           Both curves below run out and back so the loop has no seam to land
           on, but they have different FEEL, which is the point:
             · cosine  — eased, breathing, slowest at the extremes
             · triangle — constant rate, mechanical, the pan of a PTZ head */
        const sweep = 0.5 - 0.5 * Math.cos(p * Math.PI * 2);
        const tri = p < 0.5 ? p * 2 : 2 - p * 2;
        const motion = rig.motion ?? "orbit";

        // drift is the only one that wants a constant-rate pan
        const s = motion === "drift" ? tri : sweep;
        /* Each motion moves exactly ONE thing and holds the rest still. Letting
           two vary at once is what made every card look like the same shot. */
        const swings = motion === "orbit" || motion === "drift";
        const az = lerp(rig.az[0], rig.az[1], swings ? s : 0);
        /* Hover is a real PUSH, not a lean. 16% closer plus the aim blended
           toward the subject's focus point — the one place in each scene where
           the action happens (the bay slot, the count, the zone, the pulled
           clip). subject.focus existed on every subject and was never read by
           this file: the fifth designed-but-unwired field in this directory. */
        const hz = easeInOut(hoverT);
        const rad = lerp(rig.rad[0], rig.rad[1], motion === "dolly" ? s : 0) * (1 - 0.09 * hz);
        // track slides the camera AND its aim point along x together, so the
        // subject is travelled beside rather than swung around
        const tx = motion === "track" ? lerp(-(rig.trackX ?? 0), rig.trackX ?? 0, sweep) : 0;

        target.set(tx, rig.ty, 0);
        // camera HEIGHT stays locked (house rule); only the aim tilts toward
        // the action, which with the push above reads as attention, not a crane
        target.lerp(subject.focus, 0.3 * hz);
        placeCamera(camera, { az, rad, tx, ty: rig.ty, tz: 0 }, rig.camY);
        camera.lookAt(target);

        /* Eased toward the target rather than snapped. The cursor crosses all
           four cards in one sweep, and four instant state changes reads as a
           flicker; ~0.25s of travel reads as four things waking up. */
        hoverT += (want - hoverT) * 0.12;
        // ?perf debug channel: publishes the eased hover value so the state can
        // be read back instead of guessed at from a screenshot
        if (_dbg) el.dataset.hover = hoverT.toFixed(3);
        const vis = reduce ? 1 : REST_VISION + (1 - REST_VISION) * easeInOut(hoverT);

        const solid = reduce ? 1 : easeInOut(clamp01((t - 0.2) / SETTLE));
        /* `solid * max`, not `solid`. detectMaterials() records each overlay's
           intended peak opacity in userData.max — `faint` is meant to sit at
           0.28 so a considered-but-rejected detection reads as secondary. This
           loop used to assign `solid` flat, which drove faint to 1.0 and made
           it pixel-identical to accent: every bracket on screen at full
           strength, which is most of why the detections read as noise rather
           than as a hierarchy. Subject materials carry no `max` and default
           to 1, so their behaviour is unchanged. */
        subject.materials.forEach((m) => {
          const max = (m.userData?.max as number | undefined) ?? 1;
          // only the detector's MARKS ramp with hover; the camera's presence
          // (cones, scan bars) and every physical surface hold steady
          const gate = m.userData?.tier === "mark" ? vis : 1;
          (m as THREE.Material & { opacity: number }).opacity = solid * max * gate;
        });
        /* 0.22, down from 0.5. A ShadowMaterial darkens whatever is under it, and
           on a near-white card 0.5 puts a heavy grey slab beneath every object.
           Going light makes the contact shadow far more visible for free, so it
           needs LESS of it — this is now the main thing grounding the subject. */
        shadowMat.opacity = 0.22 * solid;
        /* The drafting ground fades with everything else, but its opacity is a
           shader uniform rather than material.opacity, so it cannot ride the
           materials loop above. */
        subject.ground?.setOpacity(solid);
        subject.tick?.(reduce ? 0.85 : p);

        /* subject.trackers() WAS NEVER CALLED. The interface existed, all four
           subjects implemented it, and nothing on this side invoked it — so
           every detection bracket on every card sat at world origin at unit
           scale, following nothing, for as long as the cards have shipped.
           That is the whole of "the detections are all over the place and
           nothing is tracked consistently": the tracker rewrite was correct
           and simply unreachable.

           The updateMatrixWorld(true) is load-bearing, not defensive.
           Tracked targets are nested (a container inside a lift group inside
           a trolley group), and tick() has just written new positions to those
           parents. Box3.setFromObject updates its target's subtree but
           explicitly NOT its ancestors, so without this the bracket reads
           last frame's world transform and trails its target by one frame at
           every level of nesting. render() would refresh the graph, but that
           happens after we have already needed it. */
        subject.group.updateMatrixWorld(true);

        /* THE ACQUIRE SETTLE. At rest the brackets sit oversized and loose; as
           hover ramps they draw in and lock snug on their targets, which is what
           an autofocus or a real detector looks like when it takes a lock. It
           costs one multiply per tracker and it is the whole reason hover feels
           like an event rather than a brightness change.

           Driven off the SAME eased hoverT as the opacity ramp, so the bracket
           brightens and tightens together — two channels, one gesture. Eased
           harder than the opacity (cubic) so the lock lands with a snap instead
           of gliding in. */
        if (subject.marks) {
          const k = 1 - hoverT;
          const settle = 1 + 0.34 * (k * k * k);
          for (const m of subject.marks) m.setPad(reduce ? 1 : settle);
        }

        subject.trackers?.(camera);

        // detection graphics stay square to the viewer as the camera pans,
        // exactly as a screen-space box would
        subject.billboards?.forEach((b) => billboard(b, camera));

        if (bloom) bloom.strength = 0.18;
      };

      /* Cards render at ~30fps, not 60. The move is a 14-second sweep — nothing
         in it benefits from 60fps — and four cards at 60 is four full draws per
         frame competing with scrolling on the busiest page on the site. Halving
         the draw rate halves that, invisibly. */
      /* Frame rate follows hover, and this is a performance change as much as a
         feel one: four cards permanently at 30fps is steady-state cost on the
         busiest page on the site, paid whether anyone is looking at a given card
         or not. Resting drops to ~20fps (invisible on a 14s ambient sweep) and
         only the card under the cursor pays for 60. */
      /* 24 resting / 45 hovered, the rate spec the whole lab now runs to:
         an un-hovered ambient loop gets 24 and the one the cursor is on — the
         only one anybody is actually reading — gets 45. 60 was never bought
         anything on a 14s sweep. (1/25 and 1/46, not 1/24 and 1/45: the gate
         is a strict `<` against a float clock, so a frame arriving a hair
         early at exactly the period would be dropped and the real rate would
         land a frame under target.) */
      const DT_REST = 1 / 25, DT_HOVER = 1 / 46;
      /* Same arrival hygiene as the flagships (PERFORMANCE.md #35/#36/#39):
         every program compiles during idle via compileAsync, one warm frame is
         drawn off screen so texture upload and first-use waits never land on
         arrival, and the clock starts on the first ON-SCREEN frame so a
         visitor sees the card's intro fade instead of joining a loop that
         started at idle-build time. No sealed variant to pre-compile here —
         the cards never flip `transparent`; if a subject ever starts flipping
         a program-cache-key property at runtime, it needs container-vision's
         double-compile chain, not just this. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      studio.renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);
      let primed = false;
      let drawN = 0;
      let last = -1;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!compiled) return;
        if (!onScreen) {
          // one warm draw off screen; the clock deliberately stays unstarted
          if (!primed) { primed = true; frame(); studio.render(); }
          return;
        }
        primed = true;
        if (!clockStarted) { clock.start(); clockStarted = true; }
        const now = clock.getElapsedTime();
        if (now - last < lerp(DT_REST, DT_HOVER, hoverT)) return;
        last = now;
        /* ?perf first-draw tripwire, same shape as container-vision's: a large
           render or a progs jump on an early draw means first-use work leaked
           back onto the arrival path. */
        const _td = drawN < 3 ? performance.now() : 0;
        frame();
        studio.render();
        if (drawN < 3) {
          if (location.search.includes("perf")) {
            const w = window as unknown as { __visionDraw?: string[] };
            (w.__visionDraw ||= []).push(
              `${rig.id ?? "card"}#${drawN} draw ${(performance.now() - _td).toFixed(0)} ` +
              `progs ${studio.renderer.info.programs?.length ?? -1}`);
          }
          drawN++;
        }
      };
      raf = requestAnimationFrame(loop);

      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        host.removeEventListener("pointerenter", on);
        host.removeEventListener("pointerleave", off);
        host.removeEventListener("focusin", on);
        host.removeEventListener("focusout", off);
        ro.disconnect();
        io.disconnect();
        subject.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[hero-card] init failed:", err);
      el.style.background = CARD_SURFACE;
      return () => {};
    }
    }

    return mountWhenVisible(wrap, (el) => build3D(el as HTMLDivElement), rig.id ?? "card");
  }, [build, rig]);

  return (
    // background matches the card surface it sits on, so an unloaded or failed
    // scene is indistinguishable from the card rather than a dark hole in it
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 6, background: CARD_SURFACE }}>
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}

"use client";

/* ---------------------------------------------------------------------------
   Crane Vision — the fifth flagship, and the only PORTRAIT one.

   The claim: "crane vibration never becomes inspection error."

   Everything in the scene is arranged to make that a demonstration rather than
   a caption. The load never stops moving and never stops swaying — the sway is
   the antagonist and it is on screen from the first frame, before anything else
   happens — and the two gantry heads never move at all. The beats then are:

     RISE     the load crosses the whole frame, bottom to top, at one speed
     CAPTURE  two fixed heads throw two fixed cones at it as it passes
     SELECT   five frame grabs; four are motion-blurred rejects, one is sharp
     SEVERITY the finding, graded on the container's near face

   The SELECT beat is the payload. Anyone can point a camera at a swinging box;
   what makes the claim true is choosing the one frame out of five where the box
   was momentarily still. So that beat is the only one drawn in the OVERLAY'S
   DOM rather than in the 3D — those five tiles are what the system SAW, not
   things in the yard, and putting them in world space would have made them
   props hanging in the air beside the container.

   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, placeCamera, smoothstep } from "../_vision/camera";
import { type Callout, createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { buildMaterials } from "../container-vision/materials";
import { DEFECT_UV, L as C_L } from "../container-vision/container";
import { bracket, createSightCone } from "../hero-cards/detect";
import {
  DROP, HALF_W, PAYLOAD_BOT, PAYLOAD_TOP,
  buildCrane, buildCraneMaterials,
} from "./crane";

/* 10.0s — the slowest loop on the site, against gate's 7.0 and yard's 9.4.
   A loaded spreader is thirty tonnes on ropes. Every faster version read as a
   lift going up on a string, and the sway (three cycles across the loop) turned
   into a jitter rather than a swing. */
/* 4.8 — cut again from 6.5 after START_FRAC's one-container-length raise (see
   riseFrom below) shortened the travel to ~12.67m; 6.5 would have dropped the
   lift to ~1.95 m/s, under the ~2.5 m/s floor. 12.67/4.8 = 2.64 m/s. */
/* 6.6s, up from 4.8. Reviewed on screen the hoist read as too fast.

   The note above defends 4.8 on the grounds that 12.667m of travel at 6.5s
   would be 1.95 m/s, under a ~2.5 m/s floor below which earlier versions read
   as "a load going up on a string". That floor was measured against a LINEAR
   rise, and the rise is no longer linear — it eases in on pow(p, 1.55), so
   the average is not what a viewer perceives. What they see is the speed over
   the part of the loop the container is actually in frame, and easing puts
   the slow half there and spends the fast half leaving.

   At 6.6s the average is 1.92 m/s but the instantaneous speed while the load
   is framed (p up to ~0.81) runs from near zero to about 2.4 m/s, which is
   the range the old linear 2.64 sat at the top of. Slower to watch, no slower
   where it matters.

   Every window in this file is a FRACTION of the loop, so they all lengthen
   with it and no beat needs retiming: the ID read goes 1.63s -> 2.24s, the
   corrosion label 2.69 -> 3.70s, the severity 2.02 -> 2.77s. The sway is a
   function of p at an integer 2.0 cycles, so the seam stays clean. */
const LOOP = 6.6;
const SETTLE = 0.95;        // the rig fades up over this many seconds
const FROZEN_T = 8.2;       // reduced-motion still frame: parked on the
const FROZEN_P = 0.78;      //   severity beat, which states the outcome

/* ---- FRAMING ---------------------------------------------------------------

   DERIVED PER FRAME FROM THE REAL CANVAS, never assumed. The section slot is
   about 1:2.2 tall and the lab route is 680x1500, but neither number appears
   below — the same discipline as yard-vision, which derives its camera HEIGHT
   from `fitRad(REF_RAD, aspect)` so that a fixed 38° elevation survives
   whatever the aspect does to the distance.

   Here the thing that must survive is the HORIZONTAL fit. The subject is a
   6.058m container seen almost square-on; if it does not fit across the frame
   there is no scene, and in a portrait frame the horizontal field is the scarce
   one. So HALF_W (4.1m either side of the axis, at the subject plane) is the
   invariant, and BOTH the camera distance and the visible height fall out of it:

     three's PerspectiveCamera fov is VERTICAL, 30° from createStudio, so
       tan(15°) = 0.26795 is the vertical half-angle
       tan(hHalf) = tan(15°) · aspect                      [three's convention]
       dist       = HALF_W / (tan(15°) · aspect)
       halfH      = dist · tan(15°) = HALF_W / aspect

   At the lab's 680/1500 = 0.4533 that is dist = 4.1/0.12146 = 33.8 and
   halfH = 9.04 — a visible frame 8.2m wide and 18.1m tall. The container
   projects ~6.5m wide (6.058·cos 0.22 + 2.438·sin 0.22) so it fills ~74% of the
   width, and the 18m of height is the runway the rise needs.

   THE CAMERA IS LEVEL — camY 0, look-at (0,0,0). Not a stylistic choice: this
   is the one scene whose subject is defined by vertical travel, and any tilt
   keystones the legs and the container's vertical edges, so a load rising
   through frame appears to lean as it goes. A level camera keeps verticals
   vertical, which is what makes the rise legible as a rise. */
const FOV_TAN = Math.tan((30 / 2) * Math.PI / 180);   // 0.267949
const AZ = 0.22;   // a slight three-quarter, so the box is an object, not a wall
const fitDist = (aspect: number) => HALF_W / (FOV_TAN * Math.max(aspect, 0.2));
const halfHeight = (aspect: number) => HALF_W / Math.max(aspect, 0.2);

/* ---- THE RISE --------------------------------------------------------------

   LINEAR, across the WHOLE loop, from PARTLY IN FRAME to fully above it.
   Linear because a hoist runs at a constant speed and an eased one reads as a
   lift being cued by the edit; whole-loop because that is what makes the wrap
   invisible — the same reasoning as gate-vision's ±13.6 truck run.

   ARITHMETIC (all in lift-local units; the lift's origin is the SHEAVE, so the
   container hangs DROP = 20 below it — see crane.ts):

     PAYLOAD_TOP = -DROP + C_H/2 + 0.10 + 0.34/2 = -18.2645  (spreader's top)
     PAYLOAD_BOT = -DROP - C_H/2                 = -21.2955  (container's floor)

   THE OPENING FRAME IS NO LONGER FULLY EMPTY. The original formula,
   `liftY(0) = -halfH - MARGIN - PAYLOAD_TOP`, put the spreader's top a full
   MARGIN *below* the frame's bottom edge — so at p = 0 the shot was two bare
   gantry legs and nothing else, and the loop only started reading as "a lift
   in progress" partway in. START_FRAC pulls that back: the payload's top now
   starts START_FRAC of halfH *inside* the bottom of frame, so the container
   is already partly visible, mid-entry, on the very first drawn frame.
     liftY(0)  = -halfH·(1 - START_FRAC) - PAYLOAD_TOP
   Out of shot at p = 1 is UNCHANGED — the container's floor still clears the
   frame's top with MARGIN to spare, same reasoning as before:
     liftY(1)  =  halfH + MARGIN - PAYLOAD_BOT

   START_FRAC 0.12 WAS NOT ENOUGH. At halfH = 9.044 it put the container's top
   edge only 0.646 above the frame's bottom — a quarter of a 2.591m box — so
   the loop still opened on what read as bare legs. 0.32 puts liftY(0) at
   12.12: container top at -6.59, well inside frame, floor at -9.18, a hair
   under the bottom edge. The load now starts nearly whole and sitting LOW,
   which is the "already in progress" read the frame was after.

   At halfH = 9.044, START_FRAC = 0.32, the C_L/2 raise and MARGIN = 0.5 that
   is liftY 15.14 -> 30.84 — a travel of 15.70m. Both ends are still recomputed
   every frame from the live aspect, so a taller canvas lengthens the run
   rather than cropping it.

   SPEED: LOOP is 4.8s, so 15.70m/4.8s = 3.27 m/s, well up from the original
   2.2 and from the 2.05 the shortened travel produced at the old 10s. A hoist
   that crawls undercuts the whole beat.

   THE SWAY DOES NOT CONSTRAIN LOOP, contrary to an earlier note here. swayAt
   is a function of `p`, not of seconds, so ANY loop length completes a whole
   number of cycles and returns to zero at p = 1 — the seam is safe by
   construction. What LOOP does change is the sway's wall-clock period, and at
   4.8s three cycles would swing every 1.6s, which is frantic for a 20m rope.
   The cycle count drops 3 -> 2 to compensate: 2.4s a swing, and 2 is still an
   integer so p = 1 still lands on zero.

   MARGIN 0.5 rather than 0 at the TOP end: the sway tilts the load by up to
   2°, which lifts a corner of the 6.058m box by 3.029·sin(0.035) = 0.106m,
   and swings it sideways by DROP·sin(0.035) = 0.70m. 0.5 covers the vertical
   part of that with air to spare. */
const MARGIN = 0.5;
/** Fraction of halfH the payload's top already sits inside the frame's
 *  bottom edge at p = 0, instead of hiding fully below it. See above. */
const START_FRAC = 0.32;

/* ONE CONTAINER LENGTH HIGHER, ADDED IN METRES NOT AS A FRACTION.
   The ask was "raise the start by C_L (6.058m) in world units" — a metre
   offset, not a proportion of halfH — so riseFrom now adds C_L directly
   rather than folding it into START_FRAC (which would make the raise
   aspect-dependent, when the request was a fixed physical distance).

   ARITHMETIC at the reference halfH = 9.044 (680x1500):
     riseFrom_old = -9.044*(1-0.32) - (-18.2645) = -6.150 + 18.2645 = 12.1146
     riseFrom_new = 12.1146 + 6.058                                = 18.1726
   riseTo is UNCHANGED (the container must still fully clear the frame top
   at p = 1, same MARGIN):
     riseTo = 9.044 + 0.5 - (-21.2955) = 30.8396
   New travel: 30.8396 - 18.1726 = 12.667 m, down from the old 18.72 m (raising
   the start necessarily shortens the run, since the top end did not move).

   SPEED: at the old LOOP = 6.5s that is 12.667/6.5 = 1.95 m/s — below the
   ~2.5 m/s floor and a regression from the 2.88 m/s the previous pass landed
   on. LOOP is cut to 4.8s (see above) to bring it back to 12.667/4.8 =
   2.64 m/s, comfortably over the floor and not far off the old figure.

   The sway's cycle count (2.0, in swayAt below) is untouched and stays an
   integer, so the loop seam is still clean regardless of LOOP's value. */
/* HALF a container length, not a whole one. The raise was originally applied
   as the literal +C_L that was asked for, and rendered it overshot: at
   halfH 9.044 that put liftY(0) at 18.17, so the load opened spanning
   -3.13..-0.53 — just under the frame's CENTRE, not low in it. That reads as
   a container parked mid-air rather than one starting its climb, and it
   fights the earlier requirement that it sit near the bottom of frame.

   C_L/2 = 3.029 splits the two: liftY(0) = 15.14, the load spans
   -6.15..-3.56, wholly visible with ~2.9m of air beneath it. Low in frame,
   nothing cropped, and still a full container-height higher than the
   pre-raise position that was judged too buried. */
const riseFrom = (halfH: number) => -halfH * (1 - START_FRAC) - PAYLOAD_TOP + C_L * 0.5;
const riseTo = (halfH: number) => halfH + MARGIN - PAYLOAD_BOT;

/* ---- THE SWAY --------------------------------------------------------------

   0.035 rad ≈ 2°, applied as lift.rotation.z. Because the lift's origin is the
   sheave and not the container, this is a real pendulum: the box swings ~0.7m
   sideways as well as tilting, and the ropes stay straight.

   THREE CYCLES, NOT THE 2.5 THE BRIEF ASKED FOR. sin(p·2π·n) only returns to 0
   at p = 1 when n is an integer; at 2.5 the loop wraps with the load at its
   maximum tilt in one direction and restarts at the opposite one, which is a
   visible snap on the one element that is supposed to be perfectly continuous.
   3.0 is the nearest integer and keeps the same frequency to within 20%. */
const SWAY_MAX = 0.035;
const swayAt = (p: number) => SWAY_MAX * Math.sin(p * Math.PI * 2 * 2.0);

/* ---- windows --------------------------------------------------------------- */
/* CAPTURE WAS RETHOUGHT, not just widened. The old window was 25% of the
   loop (2.5s) at a peak opacity of 0.28 — using createSightCone's built-in
   travelling-band sweep, which at that duration and dimness never resolved
   into anything a viewer scrolling past could register as "scanning."

   Two changes, together:

   1. THE WINDOW NOW COVERS MOST OF THE RISE (0.08..0.90, 82% of the 10s loop
      = 8.2s) instead of a narrow slice in the middle. A viewer can arrive at
      any scroll position and still catch the cones live; the old 2.5s window
      needed almost-perfect timing to see at all.

   2. THE OPACITY IS A SINGLE STEADY VALUE, not an animation. A first pass
      here tried a repeating brightness pulse ("a shutter firing every
      0.9s") to sell "a machine is actively doing something" — on screen
      that read as two lights flickering, which looks like a fault, not a
      sensor. Reviewed and reverted: NOTHING IN THIS SCENE OSCILLATES IN
      BRIGHTNESS ON A REPEATING CYCLE. The "scanning" storytelling belongs
      entirely to createSightCone's own built-in sweep — a soft band
      travelling once along the cone axis per pass (see hero-cards/detect.ts,
      CONE_FRAG's SWEEP term) — which is continuous, one-directional motion,
      not a blink. This block only ramps the pair in at the window's start
      and out at its end, and holds CAPTURE_OPACITY flat in between. */
const W_CAPTURE: [number, number] = [0.08, 0.90];
/* W_SELECT WAS FAR TOO SHORT TO READ. At [0.50, 0.72] it held 0.22 of a 4.8s
   loop — 1.06 SECONDS on screen, and that includes its own fade in and out, so
   the words were legible for well under a second. A label nobody can finish
   reading is worse than no label: it registers as a flash.

   [0.38, 0.86] was 0.48 of the loop = 2.3s, better than double. STILL NOT
   ENOUGH, and the reason is that the window is a fraction of a 4.8-second loop
   — widening the fraction runs out of loop long before it runs out of need.
   A two-line card with a name, a confidence and a location is roughly twelve
   words; at a normal reading rate that is 3 seconds of eyes-on plus the fade
   at each end.

   LOOP STAYS AT 4.8. Lengthening it is the obvious lever and it is the wrong
   one: the travel is ~12.67m, so 4.8s is already 2.64 m/s and anything past
   about 5.1s drops the lift under the ~2.5 m/s floor that made every earlier
   version read as a load going up on a string. The windows have to find the
   time inside the loop they have.

   The other half of the answer is the rise itself: it now eases in (see the
   note at model.lift.position.y), which keeps the container in frame to
   p ~= 0.81 instead of p ~= 0.70. A window is only worth what the subject
   under it is worth, and these two windows are now sized to the shot rather
   than to the loop.

   The numbers land just below — roughly triple and double what they held
   before, and both now play out ON the container rather than over the sky it
   has left.

   THEY NOW OVERLAP FROM 0.52 TO 0.94, ON PURPOSE. Two findings on one
   container is the honest picture of a damage survey, and the two cards do not
   collide: the corrosion sits right of the container's centre and leads UP,
   the dent sits left of it and leads DOWN. */
/* Both tails pulled in after measuring the lab slot at p = 0.85: the container
   is still in frame there, but the DENT anchor sits above its centre, so by
   then it is close enough to the top edge that placeCallout's `top > h*0.03`
   test rejects the card and the label silently vanishes. The window has to end
   while its own anchor is comfortably inside the frame, not merely while the
   subject is. */
const W_SELECT: [number, number] = [0.18, 0.74];   // 0.56 of 4.8s = 2.69s
const W_SEVERE: [number, number] = [0.46, 0.88];   // 0.42 = 2.02s

/* THE ID READ GETS ITS OWN WINDOW, AND IT HAS TO.

   The ID box used to ride `coneVis` — the capture envelope, 0.08..0.90 — so
   it was on screen for essentially the whole loop, including all of the
   severity beat. Measured on the shipped slot at 65.4 px/m, the ID box spans
   canvas x 81..205 and the dent box 187..246, both centred on y 327: they
   OVERLAP, because on a real container the marking plate and this dent are
   only 1.16m apart while the box that contains a 13-character stencil run is
   1.9m wide. Neither can shrink below its own feature to fix that.

   So they take turns. 0.10..0.40 puts the ID read wholly before the severity
   beat opens at 0.38 (the 0.02 of overlap is inside both fades), which is
   also the honest order of operations: a gantry reads the box's identity as
   it takes the load, then inspects it. Two findings competing for the same
   40 pixels was never a layout problem — it was two events being drawn as
   though they were simultaneous. */
const W_IDREAD: [number, number] = [0.08, 0.42];
/** The frame-stack DOM panel: starts just after the container has cleared
 *  the camera heads (p_clear ~= 0.246 at the reference aspect — see the
 *  derivation at panelVis in applyFrame) and holds through most of the rest
 *  of the loop, fading out before the wrap. */
/* 0.44, up from 0.30 — the eased rise moved p_clear from 0.246 to 0.41. */
const W_PANEL: [number, number] = [0.44, 0.96];

/** Steady opacity for both cones for the whole of W_CAPTURE. Meaningfully up
 *  from the old flat 0.28 (which was dim by design for nothing in particular
 *  — it simply hadn't been tuned against a window long enough to judge it
 *  in), but still a single held value: the sweep band supplies the motion,
 *  this constant only has to make the volume itself legible. */
const CAPTURE_OPACITY = 0.42;

/* The five frame grabs. Index 2 is the keeper; the timestamps run a few
   hundredths apart because that is what a burst off one head looks like. */
const GRABS = ["14:07:49", "14:07:51", "14:07:52", "14:07:54", "14:07:55"];
const SHARP = 2;

/** `bare` lifts the rig out of its frame — see ContainerVisionScene. */
export default function CraneVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const wrap = canvasWrapRef.current;
    const overlay = overlayRef.current;
    if (!host || !wrap || !overlay) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    /* Deferred so the CSS-hidden responsive twin never builds a context. */
    return mountWhenVisible(wrap, () => {
    let cleanup = () => {};

    try {
      /* NO GROUND, and therefore no shadow. The subject is thirty tonnes in the
         air; a cast shadow would have to fall on something, and the only
         surface available is a hardstand 20 metres below the bottom of a
         portrait frame. floorY is parked well out of shot and shadowMat is left
         at opacity 0 for the whole loop — deliberately, not by omission.

         spread 1.6, as gate: the widest thing here is a 6.4m spreader, so the
         light rig has to cover a vehicle-length subject rather than a box. */
      const studio = createStudio(wrap, {
        floorY: -14, shadowExtent: 6, shadowMapSize: 512,
        spread: 1.6, bare, maxDpr: 1.75,
      });
      const { renderer, scene, camera, bloom } = studio;

      /* ---- subject ---- */
      const cmats = buildMaterials();
      const mats = buildCraneMaterials();
      const model = buildCrane(mats, cmats);
      scene.add(model.lift);
      scene.add(model.fixed);

      /* ---- the two sight cones ----
         Built once and aimed once, exactly as gate-vision builds its head cone:
         a cone that re-aims at the load is a searchlight, and a fixed head with
         a fixed field of view is what is actually bolted to a gantry leg. The
         load rises THROUGH the two static volumes, which is the honest picture
         of how the capture happens — and it is also the scene's argument, since
         the heads plainly do not chase the swinging box.

         THE TARGET IS ON THE CONTAINER'S NEAR FACE, NOT INSIDE IT. z = 1.28 is
         just proud of the corrugation crests at W/2 = 1.219. A target inside the
         box's volume swallows the entire fan and leaves a sliver — that cost a
         pass on gate-vision and the note there says so in as many words.

         y = -1.0 is the height the container's centre passes at p ≈ 0.47, the
         middle of the capture window. */
      const CONE_R = 0.55;
      /* Apex, target and length are UNCHANGED. Heads sit at
         (+-(LEG_X - 0.34), -0.06, 0.62) = (+-3.36, -0.06, 0.62); each aims at
         (+-1.5, -1.0, 1.28), so the axis is (-1.86, -0.94, 0.66) in magnitude
         and the length is sqrt(3.4596 + 0.8836 + 0.4356) = 2.18605 for both by
         symmetry. The old geometry put a base radius of CONE_R = 0.55 there,
         which is a half-angle of atan(0.55 / 2.18605) = 0.24648 rad.

         NO footprintY: this scene deliberately has no ground at all (floorY is
         parked at -14, out of shot, and nothing calls draftingGround), so a
         pool would be a disc floating in empty space. */
      /* The old static aim point (sign(head.x)*1.5, -1.0, 1.28) lived here and
         is gone with the reticles that were its only remaining consumer. The
         cones now derive their targets from ID_LOCAL / RUST_LOCAL below. */

      /* THE CONE'S LIVE AIM TARGET, in LIFT-LOCAL space, so it rises and sways
         with the container instead of staring at a fixed world point.

         model.lift's origin is the sheave (see crane.ts), and buildCrane
         parents the container's own group at lift-local (0, -DROP, 0) — so a
         point at lift-local y = -DROP sits at the container's own vertical
         centre, the local equivalent of the old fixed target's y = -1.0. x
         and z are unchanged from the old aim point (just proud of the near
         face at z = 1.28). Every frame this is run through
         model.lift.matrixWorld (updated earlier in applyFrame) to get the
         live world position — see the capture block below. */
      /* EACH CONE AIMS AT THE THING ITS OWN CAMERA IS READING, not at a
         generic point on the box. Rendered, a pair of cones both pointed at
         the container's bare centre read as two spotlights with no argument —
         they tracked, but they tracked nothing in particular.

         heads[0] is the LEFT leg (sx -1) and heads[1] the RIGHT (sx +1), and
         the two features fall on the matching sides by luck of the artwork:
         the painted ID sits at local x -1.938, the rust at +0.751. So left
         reads the ID, right reads the damage, and each cone lands on the
         detection box its own camera owns.

         Filled in just below, once ID_LOCAL and RUST_LOCAL are built — they
         are the single source of truth for both the cones and the boxes, so
         the two can never drift apart. */
      const CONE_TARGET_LOCAL: THREE.Vector3[] = [];
      /* renderOrder 5 ON EVERY MESH (a Group's renderOrder does NOT propagate
         to children — three sorts per-object). Everything in this scene is in
         the TRANSPARENT queue (the container ramps opacity during the intro,
         so its materials are transparent:true), and that queue is ordered by
         bounding-sphere distance, not per-pixel. The container's panels kept
         WINNING the sort against the cones — drawn after them, painting over
         them — which is what read as the cones phasing through the box.

         5 puts the cones after the container (renderOrder 0), so they draw
         against the depth the container's panels already wrote (their
         depthWrite defaults to true, and the cone material's depthTest is
         true): the part of the cone geometrically behind the container is
         depth-culled per pixel, the part in front still glows additively.
         That is exactly "occluded by the container without breaking the
         additive look". */
      const CONE_ORDER = 5;
      const sightCones = model.heads.map((head) => {
        const c = createSightCone({ color: PALETTE.accent });
        c.group.traverse((o) => { o.renderOrder = CONE_ORDER; });
        scene.add(c.group);
        return c;
      });

      /* ---- locked-aim reticles: the vibration-compensation claim, made visible ----
         The sidebar says "VIBRATION-COMPENSATED" / "MOTION-BLUR-CORRECTED", but
         until now nothing in the 3D showed correction HAPPENING — the sway was
         smooth and continuous and the two cones simply sat there. The honest way
         to show a fixed head holding its aim is to NOT move it (the file header
         is explicit that both heads are "bolted down" on purpose, and animating
         a counter-sway into them would undercut that point rather than sell it).

         THAT IDEA IS NOW DEAD AND THE RETICLES ARE GONE. It was written when
         the cones aimed at a FIXED world point, and in that world a motionless
         crosshair at that point was coherent. The cones now TRACK the
         container, which makes a stationary reticle worse than pointless:

           · it contradicts the cones. One graphic follows the load, another
             refuses to, and they are the same colour and the same primitive.
           · it is orphaned on screen. It sat at world y = -1.0 forever, so
             once the load had risen past it — most of the loop — it was two
             empty brackets hanging in black space, marking nothing. Rendered,
             that reads as a bug, which is exactly what it looked like.

         The vibration-compensation claim is now carried by the detection
         boxes instead: they are parented to `lift`, so they stay welded to the
         ID and the rust while the load rises AND sways. A box that never slips
         off its feature is a better demonstration of "the wobble does not
         become an error" than a crosshair that ignores the wobble entirely.

         KEPT AS A NOTE, NOT AS CODE: do not reintroduce a fixed-world marker
         here without first deciding whether the cones are tracking. The two
         designs are mutually exclusive. */

      /* ---- two tracked detection boxes: the ID and the rust patch ----
         One per camera, each locked to a specific feature on the container's
         near face rather than a generic "somewhere on the box" point. Both
         are parented to the LIFT — like the dent box below — so they ride
         the rise and sway automatically instead of needing a per-frame
         screen-space recompute. Same `bracket()` vocabulary, at
         PALETTE.accent (#5CC8FF — see detectMaterials' note in
         hero-cards/detect.ts).

         POSITIONS, in lift-local space (container-local (u,v) -> local
         (x, y) = ((u-0.5)*L, (0.5-v)*H), then lift-local y = local y - DROP,
         exactly the convention the anchors above already use):

           ID plate: materials.ts paints "VSTU 907032 1" at canvas fraction
             (0.045, 0.4) as a fillText baseline, bold monospace at
             0.078*HT. Measuring the string at that size (13 chars, ~0.62
             advance/char for bold monospace) gives a run of ~0.269 in u and
             ~0.078 in v above the baseline, so the text block's centre is
             at roughly u=0.18, v=0.38 — inside container.ts's own PLAQUE
             flatten region (x0..x1 = -2.95..-1.05), which confirms the
             estimate is on the actual flat marking panel and not a guess.
             local x = (0.18-0.5)*6.058 = -1.938, local y = (0.5-0.38)*2.591
             = 0.311 -> lift-local y = -DROP + 0.311.

           Rust: DEFECT_UV.rust = (0.624, 0.723), the same point the severity
             heatmap and anchors.sharp/anchors.severity already reference.
             local x = 0.751, local y = -0.577 -> lift-local y = -DROP - 0.577. */
      /* z 1.32, not 1.25. The near face is at W/2 = 1.219, so the old value
         stood only 0.031 proud — inside the corrugation's own crest depth, so
         the marks could be swallowed by the panel they were supposed to be on
         top of. 0.10 clears it outright. */
      /* RE-DERIVED FROM THE PAINT, after the region was marked up on a review
         screenshot. materials.ts sets the stencil with `fillText(..., w*0.045,
         h*0.4)` at `bold h*0.078 monospace` and the DEFAULT alphabetic
         baseline — so h*0.4 is the BASELINE, not the middle, and the glyphs
         sit ABOVE it spanning roughly v 0.322..0.400 top-down. The previous
         value took 0.4 as the block's centre and sat the bracket ~0.05m low.

           centre v (top-down) = 0.400 - 0.078/2 = 0.361
           local y = (0.5 - 0.361) * 2.591 = 0.360

         Horizontally, 13 characters of bold monospace at 0.078h advance about
         0.6 em each, so the run is 13 * 0.6 * 0.078 = 0.608h. At the front
         face's 2.338:1 canvas that is 0.260 in u, from u 0.045 to u 0.305,
         centre u 0.175:

           local x = (0.175 - 0.5) * 6.058 = -1.969 */
      const ID_LOCAL = new THREE.Vector3(-1.969, -DROP + 0.360, 1.32);
      const RUST_LOCAL = new THREE.Vector3(
        (DEFECT_UV.rust.u - 0.5) * 6.058, -DROP + (0.5 - DEFECT_UV.rust.v) * 2.591, 1.26,
      );
      /* THE DENT, in the same coordinates as the two above and by the same
         conversion. Declared here rather than beside the bracket that uses it
         because the severity heatmap — built further down — has to be centred
         on it too, and a const cannot be read before its declaration.

         WHY THIS IS NOT crane.ts's `anchors.severity`. That anchor computes
         the identical expression from the identical constants and, reviewed on
         a 1300px slot, put the bracket about 1.05m right of the sculpted dent
         while the rust box landed on its patch exactly. Two paths that should
         agree and do not is a bug to remove rather than an offset to apply, so
         everything that has to sit ON the damage now reads this one value. */
      const DENT_LOCAL = new THREE.Vector3(
        (DEFECT_UV.dent.u - 0.5) * 6.058,
        -DROP + (0.5 - DEFECT_UV.dent.v) * 2.591,
        1.26,
      );

      /* depthTest FALSE on every detection mark, and this is the actual bug
         behind three passes of "the ID box is missing".

         Instrumented with `?debug=1`, ID_MAT reported opacity 1 with the
         anchor projecting exactly onto the painted stencil — the bracket was
         being built, driven and positioned correctly and simply never reached
         the screen. It was losing the depth test to the container's own
         panel. The ID bracket is 1.90m wide and its right-hand corners sit at
         local x = -0.988, which is OUTSIDE container.ts's flattened PLAQUE
         region (x0..x1 = -2.95..-1.05) and therefore over live corrugation,
         whose crests stand proud of the flat face the 1.32 stand-off was
         measured against. The rust box survived because it is 0.66m wide and
         sits wholly inside its own patch.

         Standing the marks further off the face would be the wrong fix — it
         is a race between a magic number and the geometry, and this file has
         already lost it once (the note at ID_LOCAL raising z from 1.25 to
         1.32). These are OVERLAY graphics: the file's own comment calls them
         "ink drawn over the world, not a surface in it", and ink over the
         world does not queue behind the world. depthWrite was already off;
         depthTest joins it, which is what that sentence actually implies. */
      const ID_MAT = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false, depthTest: false,
      });
      const RUST_MAT = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false, depthTest: false,
      });
      // sized to the feature: the ID run is a wide, short strip; the rust
      // patch (rRust = HT*0.15 in materials.ts -> ~0.39m radius) is roughly
      // circular, same scale as the "rust" DefectAnchor's own size (0.66).
      /* THICKER AND LONGER-ARMED THAN THE RUST BOX, deliberately. Both are
         driven by the same opacity envelope, so when the rust box read on
         screen and this one did not, the cause was not wiring — it was
         contrast and scale. The rust bracket sits on an orange patch; this one
         sits on the container's own blue, in accent cyan, which is close to
         the paint in both hue and value. On top of that its 1.9m width makes
         0.03m arms sub-pixel at this framing while the rust box's chunkier
         arm-to-size ratio survives. 0.055 thickness and 0.3 arms fix the
         legibility without changing the colour convention (#5CC8FF is the
         observing colour and an ID read is an observation, not a finding). */
      /* SIZED TO THE ID PANEL, NOT TO THE TEXT RUN — and this is the third
         attempt, so the arithmetic is written down.

         The container renders about 180px wide for its 6.058m, i.e. ~30 px/m.
         At the old 1.9 x 0.42 that box was 56 x 12 PIXELS with 1.6px arms, in
         accent cyan, sitting on the container's own blue. Geometrically it was
         exactly where the painted ID is; visually there was nothing to see.
         Thickening it alone did not fix that, because the box itself was the
         size of a caption.

         2.6 x 0.86 frames the whole ID/plaque block instead of hugging one line
         of text: ~78 x 26px with 2.7px arms, which survives both the render
         scale and a downscaled screenshot. It is also the more honest read — a
         detector boxes the REGION it recognised, not the glyph row.

         arm 0.22 is deliberately under h/2 (0.43); at the old 0.3 on a 0.42-tall
         box the top and bottom arms overran each other through the middle and
         the "corner marks" closed into a solid rectangle. */
      /* AND NOW BACK IN, TO 1.95 x 0.54. 2.6 x 0.86 overshot: it framed the
         whole plaque panel including the empty steel above and below the
         stencil run, so the box was visibly larger than the thing inside it
         and read as gesturing at a region rather than as a reading of an ID.

         The measured run is ~0.269 in u (1.63m) and ~0.078 in v (0.20m). 1.95
         x 0.54 is that run plus roughly 0.16m of margin on every side — tight
         to the characters, still clear of them. At ~30 px/m that is 59 x 16
         PIXELS, so the earlier legibility failure has to be answered by WEIGHT
         rather than by size: thickness stays at 0.075 (2.2px, which reads) and
         the arms drop to 0.17, comfortably under h/2 = 0.27 so the corner
         marks stay corner marks instead of closing into a rectangle. */
      /* THICKNESS BACK UP TO 0.11, SIZE STAYS TIGHT. Reviewed rendered at
         p = 0.55: at 0.075 the bracket had effectively vanished against the
         container's own blue, which is the exact failure mode the note above
         records — accent cyan on that paint is close in both hue and value,
         so this mark survives on WEIGHT alone. Shrinking the box was right;
         thinning it at the same time took away the only thing holding it up.
         0.11 is 3.2px at this framing against the 2.2px that disappeared. */
      /* MEASURED, FINALLY, INSTEAD OF ARGUED. With `?debug=1` on the shipped
         520x876 slot the container spans canvas x 76..472 — 396px for 6.058m,
         so 65.4 px/m — and the three anchors report at ID (143,328),
         dent (217,327), rust (319,382), all at opacity 1.

         So nothing was ever missing or mispositioned, and the escalation to
         0.16 thickness was fixing the wrong thing. At 65.4 px/m that gave a
         128 x 41px box with 10.5px arms — arms a QUARTER of the box's own
         height. A detector's bracket is a hairline that says "here"; this was
         a slab. 0.055 is 3.6px, which is a line. */
      /* NO SHADOW BACKING. A dark under-bracket was tried here (a near-black
         copy 1.7x thicker under each accent line, for contrast on blue steel)
         and reviewed OUT: it read as a heavy black stroke, not an edge. Each
         mark is a single accent bracket again. */
      /* THE MARKS DRAW LAST, AND THE SORT NO LONGER DECIDES. depthTest false
         was necessary but NOT sufficient: it only wins against the DEPTH
         BUFFER, not against draw ORDER. The container's materials are
         transparent (they ramp during the intro), so its panels share the
         marks' transparent queue, and that queue sorts per-OBJECT by
         bounding-sphere distance. Whenever a panel's centre sorted nearer
         than a bar's, the panel drew AFTER the bracket and painted straight
         over it — which is why the ID box (over the near face, centre
         slightly behind the panel's) vanished entirely, the dent box lost
         only its left-hand bars, and the rust box happened to survive: the
         flip depends on each 8-bar Group's individual mesh centres, not on
         anything the marks control.

         renderOrder must be set on EACH MESH — bracket() returns a Group of
         8 planes, and a Group's renderOrder does not propagate — hence the
         traverse. MARK_ORDER sits above CONE_ORDER (5): ink over the world
         draws over the cones too. THIS IS THE FIX THAT MADE THE MARKS
         VISIBLE AT ALL — do not remove it when restyling them.

         frustumCulled false on the same traverse: each bar is a centimetres-
         tall plane riding a lift group that is translated tens of metres in
         Y, so per-mesh sphere culling is all risk and no saving. */
      const MARK_ORDER = 11;
      const markOnTop = (g: THREE.Group, order: number) => {
        g.traverse((o) => { o.renderOrder = order; o.frustumCulled = false; });
        return g;
      };
      /** a single accent bracket with the draw-order treatment applied */
      const markBracket = (
        w: number, h: number, mat: THREE.Material, arm: number, t: number,
      ) => markOnTop(bracket(w, h, mat, arm, t), MARK_ORDER);

      /* 1.70 x 0.30 — the measured stencil run (1.575 x 0.20) plus ~0.05m of
         even margin. Reviewed at 1.68 x 0.42 / t 0.05 as "too big and too
         heavy": the vertical margin was 0.11 a side against 0.05 horizontal,
         so the box floated off the characters, and 0.05 thickness read as a
         slab. Now the margin is even all round and the stroke is a hairline
         (0.03, ~2px at 65 px/m), matching the rust box's weight. */
      const idBox = markBracket(1.70, 0.30, ID_MAT, 0.10, 0.03);
      idBox.position.copy(ID_LOCAL);
      model.lift.add(idBox);
      const rustBox = markBracket(0.66, 0.55, RUST_MAT, 0.16, 0.035);
      rustBox.position.copy(RUST_LOCAL);
      model.lift.add(rustBox);

      /* Now the cones have their targets: left -> the ID, right -> the rust.
         Pushed slightly proud of the face (z + 0.02) so the cone tip lands ON
         the surface rather than a hair inside it. */
      CONE_TARGET_LOCAL.push(
        ID_LOCAL.clone().setZ(ID_LOCAL.z + 0.02),
        RUST_LOCAL.clone().setZ(RUST_LOCAL.z + 0.02),
      );

      /* THE SEVERITY HEATMAP IS GONE, by product-owner review: the graded
         amber field blooming inside the dent box was not wanted — "just leave
         the box". The dent bracket alone marks the finding.

         THE FOUND-MARK IS GONE TOO, same review: the small accent bracket at
         `model.anchors.sharp` (lift-local -1.70, -DROP + 0.95) sat on blank
         corrugated panel in the upper-left with nothing under it — a fourth,
         misplaced bracket. The "sharpest frame" story is carried entirely by
         the DOM panel and its callout; do not reintroduce a 3D mark for it
         without a feature under the anchor. */

      /* ---- the MARK on the dent ----
         The severity callout now leads to the dent (see crane.ts's anchor
         note), but a leader ending on bare panel still asks the viewer to take
         the system's word for where the damage is. The corrosion has the rust
         box; the dent had only the heatmap, which is a graded FIELD — good at
         saying "roughly here, and it gets worse toward the middle", useless at
         saying "this, exactly".

         PALETTE.accent, NOT warn — BY EXPLICIT PRODUCT-OWNER INSTRUCTION,
         and it knowingly OVERRIDES the site's two-accent rule (orange =
         conclusion, blue = observing; see DECISIONS.md). The owner wants all
         three brackets in the same blue as the rust box. Recorded here so a
         future pass does not "fix" it back to warn as an apparent accident. */
      // depthTest false — same reason as ID_MAT/RUST_MAT above
      const DENT_MAT = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false, depthTest: false,
      });
      /* 1.35 x 0.95, up from 1.05 x 0.78, and thicker. At the shipped framing
         the container is about 41 px/m, so the old box was 43 x 32 px with
         2px arms — small enough that it read as a stray mark rather than as a
         finding being enclosed. 1.35 x 0.95 is 55 x 39 px, which is close to
         the rust box's ratio of mark-to-feature and large enough to contain
         the heatmap's hot core rather than sitting inside it. */
      /* 0.90 x 0.75, down from 1.35 x 0.95. Measured (see idBox above) the
         old box spanned canvas x 173..261 while the ID box spanned 79..207 —
         a 34px overlap at the same height, so the two brackets merged into one
         unreadable tangle. A dent is a localised feature and does not need a
         1.35m box; 0.90 is 59px, comfortably bigger than the deformation and
         no longer reaching into its neighbour. */
      /* 0.85 x 0.90 — reviewed at 1.00 wide as "slightly too wide"; narrowed
         to sit closer to the deformation, height kept. Hairline thickness
         (0.03) to match the other two brackets. */
      const dentBox = markBracket(0.85, 0.90, DENT_MAT, 0.20, 0.03);
      dentBox.position.copy(DENT_LOCAL);
      model.lift.add(dentBox);

      /* ---- the selection panel: DOM, not 3D ----
         ONE large, crisp hero frame — the sharpest-frame selection — plus FOUR
         small blurred rejects underneath it in a 2x2 grid. This replaced a
         5-up vertical stack of identically-sized 96x64 tiles: at that size
         every tile, sharp or not, read as an orange smudge, because the frame
         doing the legibility work (the keeper) was given no more room than
         the four that are DELIBERATELY illegible. The brief is explicit:
         "one large crisp frame... four other blurred frames of the same
         thing." Size is the whole fix — the reject tiles are SUPPOSED to be
         soft blurs; only the hero has to resolve as "that is rust."

         A FIXED overlay position — right third, vertically centred — and
         deliberately NOT projected from a world point: this is a UI panel
         showing what the system captured, not a prop hanging in the yard.

         REAL PIXEL CONTENT, not a scanline gradient over nothing: the front-face
         texture built by container-vision's buildMaterials() already has the
         rust patch painted onto a <canvas> at DEFECT_UV.rust (see materials.ts;
         the map is a THREE.CanvasTexture whose `.image` IS that canvas — no
         WebGL readback, no CORS taint, just a 2D crop of a 2D canvas that this
         scene already built via `cmats` above). Crop a tight square around the
         rust point, downscale it into ONE data URL, and reuse that one image as
         every tile's background — crisp for the hero, CSS-blurred for the four
         rejects. Same photo, four blurs and one clean copy, per the brief:
         "take the same thing, screenshot, blur it four times."

         STATIC — see the note further down where this used to be driven by
         `p`: the panel and every tile's opacity/size/position are set once
         here at creation and the per-frame block no longer touches them. */
      /* FIVE DISTINCT CROPS, not one photo repeated five times.
         Previously every tile — the sharp hero and all four blurred rejects —
         was the exact same crop of the exact same source canvas; the file's
         own comment called it "same photo, four blurs and one clean copy."
         That read as one image duplicated, not five camera grabs.

         The fix stays cheap and stays deterministic: one fixed table of five
         (dx, dy, zoom) offsets, indexed to GRABS/SHARP order, applied to the
         SAME source render (the front face's already-painted rust canvas —
         still no WebGL readback, still no Math.random). Index 2 — SHARP — is
         the untouched centred crop, so the one frame that has to resolve as
         "that is rust" is not itself jittered. The other four each drift a
         different direction and zoom, standing in for four different moments
         of a vibrating burst that missed the still point the keeper caught. */
      /* THE CROPS DO THE HEAVY LIFTING, NOT THE EFFECTS.

         The old spread was dx/dy within +/-0.11 of baseHalf and zoom within
         0.92..1.16 — about a tenth of a crop-width of drift and a sixth of a
         stop of scale. Rendered at 95x64 that is invisible: five tiles of the
         same rust in the same place, and the per-tile effects (skew, shake,
         exposure, blur) were left carrying a job they are too subtle to do.

         Widened to roughly +/-0.7 of baseHalf and 0.72..1.48 zoom, so the rust
         lands in a DIFFERENT QUADRANT at a DIFFERENT SIZE in every tile. That
         is also what a burst off a vibrating crane actually looks like: the
         subject wanders across the frame between grabs.

         NOTE ON `zoom`: it multiplies `half`, the source-rect half-size, so a
         BIGGER number crops WIDER and the rust appears SMALLER. Read it as
         "how much hull is in shot", not as magnification.

         Index 2 is SHARP — dead centre, unity zoom, untouched. It is the
         keeper, and it is the only tile that has to resolve as "that is rust". */
      const GRAB_VARIANTS: { dx: number; dy: number; zoom: number }[] = [
        { dx: -0.58, dy:  0.42, zoom: 0.72 },   // tight, rust pushed upper-right
        { dx:  0.50, dy: -0.46, zoom: 1.34 },   // wide, rust small and lower-left
        { dx:  0.00, dy:  0.00, zoom: 1.00 },   // SHARP (index 2) — centred, no drift
        { dx: -0.30, dy: -0.62, zoom: 0.84 },   // close, rust low and to the right
        { dx:  0.66, dy:  0.30, zoom: 1.48 },   // widest, rust smallest, upper-left
      ];
      const grabUrls = (() => {
        const src = (cmats.front.material.map as THREE.CanvasTexture | null)?.image as
          | HTMLCanvasElement
          | undefined;
        if (!src || !src.width || !src.height) return ["", "", "", "", ""];
        const cx0 = src.width * DEFECT_UV.rust.u;
        const cy0 = src.height * DEFECT_UV.rust.v;
        // 0.15, tighter than the old 0.22: the hero tile is now big enough
        // that a closer crop reads as "the damage", not "a patch of hull".
        const baseHalf = src.height * 0.15;
        return GRAB_VARIANTS.map(({ dx, dy, zoom }) => {
          const half = baseHalf * zoom;
          const cx = cx0 + baseHalf * dx;
          const cy = cy0 + baseHalf * dy;
          const out = document.createElement("canvas");
          // 384x256 — 2x the old 192x128 — so the hero tile (168px wide on
          // screen) is native-resolution rather than an upscaled blur of its own.
          out.width = 384; out.height = 256;
          const octx = out.getContext("2d");
          if (!octx) return "";
          octx.drawImage(
            src,
            Math.max(0, cx - half), Math.max(0, cy - half), half * 2, half * 2,
            0, 0, out.width, out.height,
          );
          return out.toDataURL("image/jpeg", 0.9);
        });
      })();

      // shared scanline texture — a 2px-pitch interlace look, same on every tile
      const scanCss =
        "position:absolute;inset:0;background:repeating-linear-gradient(to bottom," +
        "rgba(223,230,237,0.10) 0px,rgba(223,230,237,0.10) 1px," +
        "rgba(0,0,0,0) 1px,rgba(0,0,0,0) 2px);";
      const makeTile = (
        w: number, h: number,
        opts: {
          sharp?: boolean; blurPx?: number; brightness?: number; contrast?: number;
          anim?: string; skew?: number; ts?: string; url?: string;
        },
      ) => {
        const { sharp = false, blurPx = 0, brightness = 1, contrast = 1, anim, skew = 0, ts, url } = opts;
        const t = document.createElement("div");

        /* THE EFFECT GOES ON AN INNER LAYER, NEVER ON THE TILE.
           A CSS filter samples outside its element's box, so a blur applied to
           the tile itself feathers the tile's own border away — which is how
           these ended up looking like half-loaded images rather than rejected
           frames. This has now regressed once already, so: the OUTER div owns
           the border, the scanlines and the timestamp and carries no filter at
           all; the INNER div owns the picture and every effect, inset by
           2x the blur radius so the kernel always has real pixels at its edges
           and `overflow:hidden` clips the bleed.

           EACH REJECT GETS A DIFFERENT DEFECT, not four grades of the same
           blur. A burst off a vibrating crane fails in different ways frame to
           frame — one smears with motion, one shakes, one is misexposed — and
           four blurs at four radii still read as one idea repeated. Only ONE
           of the four is meaningfully blurred now.

           The shake is a TRANSFORM oscillation, not a brightness one. Position
           jitter reads as a camera struggling; a brightness cycle reads as a
           fault, which is the trap this file already documents. */
        const filters = [
          blurPx ? `blur(${blurPx}px)` : "",
          brightness !== 1 ? `brightness(${brightness})` : "",
          contrast !== 1 ? `contrast(${contrast})` : "",
        ].filter(Boolean).join(" ");
        t.style.cssText =
          `position:relative;width:${w}px;height:${h}px;background:#0E1116;overflow:hidden;` +
          `opacity:${sharp ? 1 : 0.82};` +
          `border:${sharp ? 2 : 1}px solid ${sharp ? PALETTE.accent : "rgba(223,230,237,0.42)"};` +
          `box-sizing:border-box;`;

        const pic = document.createElement("div");
        const bleed = Math.ceil(Math.max(blurPx * 2, skew ? 6 : 0, anim ? 4 : 0));
        pic.style.cssText =
          `position:absolute;inset:-${bleed}px;` +
          (url ? `background-image:url(${url});background-size:cover;background-position:center;` : "") +
          (filters ? `filter:${filters};` : "") +
          (skew ? `transform:skewX(${skew}deg);` : "") +
          (anim ? `animation:${anim};` : "");
        t.appendChild(pic);

        const scan = document.createElement("div");
        scan.style.cssText = scanCss;
        t.appendChild(scan);
        if (ts) {
          const stamp = document.createElement("div");
          stamp.style.cssText =
            `position:absolute;right:4px;bottom:3px;font-size:${sharp ? 10 : 7}px;letter-spacing:0.04em;` +
            "font-family:ui-monospace,'SF Mono',Menlo,monospace;color:rgba(223,230,237,0.72);";
          stamp.textContent = ts;
          t.appendChild(stamp);
        }
        return t;
      };

      /* REPOSITIONED into the negative space low in frame, between the two
         gantry legs, instead of the old right-of-centre spot that overlapped
         a leg and was anchored to nothing.

         HORIZONTAL: the legs stand at world |x| = LEG_X = 3.7, and the frame
         half-width at the subject plane is HALF_W = 4.1 (crane.ts) — so each
         leg sits at 3.7/4.1 = 90.2% of the half-width from centre, i.e. at
         screen fractions ~4.9% and ~95.1% from the left edge. The gap between
         them spans nearly the whole frame, so a panel simply centred
         (left:50%, translateX(-50%)) sits inside it with wide margin either
         side — no need to hand-convert a world x into a pixel offset.

         VERTICAL: `bottom: 6%` — low in frame, in the space the container
         vacates once it has risen past the cameras (see the timing note
         below, at applyFrame's panelVis).

         Opacity starts at 0 and is driven per frame (see panelVis below) —
         previously this was set to 1 once and never touched; now the panel
         is timed to the rise instead of always-on. */
      const panel = document.createElement("div");
      panel.style.cssText =
        "position:absolute;left:50%;bottom:6%;transform:translateX(-50%);width:168px;" +
        "display:flex;flex-direction:column;gap:10px;align-items:center;opacity:0;pointer-events:none;";

      // the hero: the one sharp keeper, large enough to actually read as rust
      // 200 wide so the 2x95 + 10px-gap reject grid lines up flush beneath it
      const heroTile = makeTile(200, 134, { sharp: true, ts: GRABS[SHARP], url: grabUrls[SHARP] });
      panel.appendChild(heroTile);

      /* the four rejects, 2x2, each its own crop, blur amount and exposure —
         "same burst, four different misses" rather than one blur repeated.
         Deterministic per-index table, same discipline as GRAB_VARIANTS
         above: no Math.random anywhere in this file. */
      /* FOUR DIFFERENT FAILURES, ONE BLUR. Previously all four were blurs at
         4.0 / 2.4 / 5.5 / 3.0px, which is both far too much and the same idea
         four times — the grid read as a smudge, not as rejected captures.

         Now each names a distinct reason the frame was thrown away:
           0  motion smear   — skewed, lightly blurred: the load moving across
           1  camera shake   — transform jitter, barely blurred
           2  misexposed     — blown highlights, low contrast, no blur at all
           3  soft focus     — the ONE genuinely blurred frame, and much less
                               than any of the old four */
      const REJECT_STYLE = [
        { blurPx: 1.2, skew: -7, brightness: 0.95 },
        { blurPx: 0.6, anim: "craneShake 0.32s steps(4, end) infinite" },
        { blurPx: 0, brightness: 1.28, contrast: 0.74 },
        { blurPx: 2.2, brightness: 0.97 },
      ];

      /* Keyframes live on a <style> parented to the panel, so they are removed
         with it and never leak into the document. Position-only — see makeTile
         on why this is a transform and not a brightness cycle. */
      const shakeCss = document.createElement("style");
      shakeCss.textContent =
        "@keyframes craneShake{0%{transform:translate(0,0)}25%{transform:translate(1.5px,-1px)}" +
        "50%{transform:translate(-1px,1.5px)}75%{transform:translate(1px,1px)}" +
        "100%{transform:translate(0,0)}}";
      panel.appendChild(shakeCss);

      const rejectGrid = document.createElement("div");
      rejectGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;";
      const rejectIdx = GRABS.map((_, i) => i).filter((i) => i !== SHARP);
      const rejectTiles = rejectIdx.map((i, j) =>
        makeTile(95, 64, { ...REJECT_STYLE[j], ts: GRABS[i], url: grabUrls[i] }),
      );
      rejectTiles.forEach((t) => rejectGrid.appendChild(t));
      panel.appendChild(rejectGrid);
      overlay.appendChild(panel);

      /* ---- callouts ----
         Two, and only two. The capture beat speaks through its cones and the
         rise speaks for itself; a label on either would be narrating what is
         already on screen.

         onDark on both — this section is the site's near-black canvas, and the
         overlay's default black leader is invisible on it. */
      /* POINTS AT THE RUST, AND SAYS WHAT WAS FOUND.

         Two things were wrong. It anchored at anchors.sharp (-1.70, +0.95) —
         a bare patch of upper-left panel with nothing on it, so the leader ran
         to empty steel. And it read "Sharpest frame / 1 of 5 · blur 0.2px",
         which is the system talking about its own plumbing rather than about
         the container: blur radius is a fact about the capture, not a finding.

         It now lands on the corrosion — the same point the rust box and the
         severity heatmap already use, so all three agree — and states the
         result: what it is, how sure, and which of the burst was kept. The
         sharpest-frame idea survives in "frame 3 of 5", which is the part a
         reader can actually use. Sentence case matches gate/yard/cargo/
         document/work; "HIGH SEVERITY" below was the odd one out. */
      const sharpLabel = createCallout(overlay, {
        id: "sharp",
        title: "Corrosion · 0.94",
        detail: "frame 3 of 5 kept · panel 3",
        pos: RUST_LOCAL.clone().setZ(RUST_LOCAL.z + 0.04),
        normal: model.anchors.sharp.normal,
        onDark: true,
        /* 132, up from 96. At the shipped framing the container is only about
           250px wide and the callout cards are house furniture sized for a
           much larger subject, so a 96px lane left this card's lower edge
           sitting on the container's top rail — covering the corrugation
           right where the corrosion it names begins. 132 lifts it clear into
           the empty sky the load has not yet reached, and keeps a readable
           gap from the Dent card hanging below on its own 110. */
        lane: { dir: "up", len: 132 },
        win: W_SELECT,
      });
      /* AND IT NAMES THE DEFECT. "High severity / flagged for surveyor" is a
         VERDICT with no finding attached: a reader looking at it cannot tell
         what was found, where, or how sure the system is — which is the whole
         payload of a damage read. Every other callout on this site leads with
         the finding and its confidence (gate's ID, cargo's crushed corner,
         document's field); this one led with its own escalation policy.

         "Dent · 0.84" and "412 mm² · panel 2" are container.ts's own numbers
         for DEFECT_UV.dent, so the card cannot drift from the geometry it is
         pointing at. The severity verdict survives where it belongs, as the
         consequence on the end of the second line. */
      const severeLabel = createCallout(overlay, {
        id: "severe",
        title: "Dent · 0.84",
        detail: "412 mm² · panel 2 · flagged for surveyor",
        /* DENT_LOCAL, not the anchor — see its note. The card's leader has to
           end on the same point the bracket encloses, or the scene shows a
           mark in one place and a label pointing at another. */
        pos: DENT_LOCAL.clone().setZ(DENT_LOCAL.z + 0.04),
        normal: new THREE.Vector3(0, 0, 1),
        severe: true,
        onDark: true,
        /* DOWN, and short. The load is near the top of frame by the end of this
           window, so an upward leader puts the card past the overlay's upper
           bound and placeCallout drops it on every frame — the finding lights up
           and the words never come. Downward hangs into the clear air the load
           has just left. */
        /* 110, up from 58. Measured at p = 0.55: with the corrosion card
           hanging above the container on a 96px up-lane and this one 58px
           below its own anchor, the two cards stacked into a single block of
           chrome across the middle of the load — between them they covered
           most of the thing they were describing. 110 drops this one clear of
           the container's bottom edge into the empty air under it, which is
           where the frame stack has not yet reached at this point in the loop.
           Still DOWN for the reason below. */
        lane: { dir: "down", len: 110 },
        win: W_SEVERE,
      });
      /* ---- AND THE ID READ GETS A LABEL ----------------------------------

         The scene's header used to argue for exactly two callouts, on the
         grounds that "the capture beat speaks through its cones". That was
         true when the ID bracket was on for the whole loop and said nothing;
         it is not true now. The bracket takes its own window and closes on a
         specific reading, and a box drawn round a container number without
         the number beside it is the one thing an OCR scene must not do — the
         whole claim is that the system RESOLVED those characters, and a
         bracket alone only claims it looked at them.

         So the label carries the decoded value and its confidence, which is
         the same grammar gate-vision uses for the same event, and the ISO
         type code — which is genuinely on the plate two lines below the
         number and is what a yard actually keys off alongside it.

         UP, because the ID sits in the container's upper-left and the load is
         still low in frame through W_IDREAD (0.08..0.42, ending well before
         the rise carries it up). 104 clears the top rail without reaching the
         corrosion card, which hangs off a point on the far RIGHT of the box
         and 132 up — the two never share a column. */
      const idLabel = createCallout(overlay, {
        id: "idread",
        title: "VSTU 907032 1",
        detail: "ISO 22G1 · check digit valid · 0.99",
        pos: ID_LOCAL.clone().setZ(ID_LOCAL.z + 0.04),
        normal: new THREE.Vector3(0, 0, 1),
        onDark: true,
        lane: { dir: "up", len: 104 },
        win: W_IDREAD,
      });
      const marks: Callout[] = [sharpLabel, severeLabel, idLabel];

      const ro = new ResizeObserver(studio.size);
      ro.observe(wrap);

      /* Only DRAW while on screen — mountWhenVisible gates construction, not
         rendering. rootMargin keeps the scene warm just outside the viewport so
         it is never caught mid-intro when scrolled back to. */
      let onScreen = true;
      const visObs = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "200px" },
      );
      visObs.observe(wrap);

      /* Clock starts on the FIRST RENDERED FRAME, not at construction, so every
         viewer sees frame one rather than joining a loop already in progress. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
      let raf = 0;

      const project = makeProjector(camera, model.lift);
      const target = new THREE.Vector3();
      const wpos = new THREE.Vector3();

      /* REVIEW AID: `?phase=0..1` pins the loop at that p and holds it there.
         Same tool as yard-vision's and gate-vision's, and a 10-second loop is
         the one that needs it most: judging the selection beat means catching a
         2.2-second window, which is not something to do by screenshotting and
         hoping. Time still advances; only the loop position is held. */
      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;
      /** see the debug block at the end of applyFrame */
      const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
      const FACE_N = new THREE.Vector3(0, 0, 1);

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;
        const aspect = w / h;

        /* ---- camera: everything from the live aspect, nothing assumed ---- */
        const halfH = halfHeight(aspect);
        target.set(0, 0, 0);
        placeCamera(camera, { az: AZ, rad: fitDist(aspect), tx: 0, ty: 0, tz: 0 }, 0);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- rise and sway ----

           THE RISE EASES IN. It was linear in p, which is why every label on
           this scene was reported as flashing past: measured on the real slot
           (520 x 876, so aspect 0.594 — the fitRad clamp bites at 2.6 and the
           frame is tighter than the reference derivation assumes), the
           container was fully framed at p = 0.40 and almost entirely gone by
           p = 0.70. The two payoff beats were landing on a subject that had
           left. Widening their windows inside a linear rise cannot fix that:
           it just holds a card over empty sky.

           pow(p, 1.55) is the shape a real lift has anyway — a spreader with
           thirty tonnes under it does not step to full hoist speed, it takes
           up the load and accelerates. It also spends its slow half where the
           camera is looking. The container now stays in frame to about
           p = 0.81 (pow(0.81, 1.55) = 0.72, the old exit point) and still
           clears completely by p = 1, because pow(1, k) = 1 — the endpoints
           are untouched, so riseFrom/riseTo and every derivation off them
           still hold. Only the distribution between them changes.

           Consequence for W_PANEL: p_clear moves from 0.246 to 0.246^(1/1.55)
           = 0.41, so the frame stack now comes up at 0.44 rather than 0.30. */
        const from = riseFrom(halfH);
        model.lift.position.y = from + (riseTo(halfH) - from) * Math.pow(p, 1.55);
        model.lift.rotation.z = swayAt(p);
        model.lift.updateMatrixWorld(true);
        model.fixed.updateMatrixWorld(true);

        /* The rig fades up inside the opening. Every material here is built at
           opacity 0, so this is not a flourish — without it nothing is drawn.

           OPACITY ONLY. `transparent` is a program-cache key, so flipping it at
           runtime forces a synchronous recompile of every affected material on
           the frame it happens — the thing container-vision has to pre-compile
           BOTH variants to survive. This scene simply never flips it. */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        mats.all.forEach((m) => { (m as THREE.Material & { opacity: number }).opacity = solid; });
        cmats.steel.opacity = solid;
        cmats.dark.opacity = solid;
        cmats.front.material.opacity = solid;
        model.containerHardware.forEach((m) => {
          (m.material as THREE.Material & { opacity: number }).opacity = solid;
        });
        cmats.front.setTime(t);
        // the front-face scan bar belongs to Container Vision's inspection beat;
        // this scene reads the box from outside, so it is held off
        cmats.front.setScan(0, 0);

        /* ---- capture: two cones, steady ----
           coneVis ramps the pair in at the start of the widened window and
           out at the end; in between it is exactly 1, so `setOpacity` below
           is a single held value (CAPTURE_OPACITY) for the whole of
           W_CAPTURE. No per-frame brightness animation at all — the
           "scanning" motion is entirely the travelling sweep band already
           built into createSightCone (driven by `c.tick(t)`), which is
           continuous one-directional motion, not an oscillation. A repeating
           pulse was tried here and reverted: on screen it read as flicker,
           not as a sensor working. The reticles fade with the same coneVis
           envelope and otherwise hold steady too. */
        const coneVis =
          smoothstep(W_CAPTURE[0], W_CAPTURE[0] + 0.04, p) *
          (1 - smoothstep(W_CAPTURE[1] - 0.05, W_CAPTURE[1], p));
        for (let i = 0; i < sightCones.length; i++) {
          const c = sightCones[i];
          const head = model.heads[i];
          /* RE-AIM EVERY FRAME at the live world position of the lift-local
             target — lift.matrixWorld was already refreshed above (rise and
             sway block). The half-angle is re-derived from the CURRENT
             apex->target distance too, so the cone's footprint on the
             container stays roughly constant as it rises rather than the
             cone widening or narrowing as the range changes. coneVis's
             existing fade (tied to W_CAPTURE) is what keeps this sane late
             in the loop: by the time the geometry would go steeply vertical
             near p = 1, the cone has already faded to zero rather than
             swinging wildly to keep up. */
          wpos.copy(CONE_TARGET_LOCAL[i]).applyMatrix4(model.lift.matrixWorld);
          const halfAngle = Math.atan(CONE_R / Math.max(head.distanceTo(wpos), 0.01));
          c.aim(head, wpos, halfAngle);
          c.setOpacity(solid * CAPTURE_OPACITY * coneVis);
          // reduced motion pins a mid-sweep frame, not t=0 where the band
          // would sit on the apex under the fade and read as nothing
          c.tick(frozen ? 1.4 : t);
        }
        // the two tracked boxes ride the lift already (parented above); only
        // their opacity is driven, on the same envelope as the cones that
        // find them, so they fade in and out rather than pop.
        /* The ID takes its own window (see W_IDREAD); the rust box stays on
           the capture envelope, because it sits well clear of both the ID and
           the dent and is the mark the corrosion callout leads to. */
        const idVis = frozen
          ? 0
          : smoothstep(W_IDREAD[0], W_IDREAD[0] + 0.03, p) * (1 - smoothstep(W_IDREAD[1] - 0.04, W_IDREAD[1], p));
        ID_MAT.opacity = solid * idVis;
        RUST_MAT.opacity = solid * coneVis;

        /* ---- selection: the five grabs ----
           STATIC. This used to fade the panel in over 0.50-0.56, fade the four
           rejects out over 0.60-0.66 and scale the keeper up over 0.62-0.68 —
           all driven off `p` every frame. The record is meant to just be
           there, not perform an entrance, so the panel's opacity and the
           tiles' opacity/scale are now set once at creation (panel opacity 1,
           reject tiles 0.35, keeper untransformed) and this block no longer
           touches them per frame.

           The found-mark that used to be driven off this beat's own selectVis
           envelope is gone (removed with its bracket — see the note where the
           heatmap used to be built); the "Sharpest frame" callout's fade is
           computed inside place() below, so nothing else needs it here. */
        /* The dent mark rides the SEVERITY envelope, not the capture one: it
           is the conclusion, so it appears with the card that states it and
           leaves with it. Computed below (severeVis) — assigned there. */

        /* ---- the frame-stack panel: timed to when the bottom of frame is
           actually empty ----
           "Cleared" means the container's FLOOR (PAYLOAD_BOT, lift-local) has
           risen above the camera heads, which sit at world y ~ 0. World
           bottom = lift.position.y + PAYLOAD_BOT, so cleared is
             lift.position.y > -PAYLOAD_BOT = 21.2955.
           At the reference halfH = 9.044, riseFrom = 18.1726 and the travel is
           12.667 (see riseFrom's own comment), so:
             p_clear = (21.2955 - 18.1726) / 12.667 = 3.123 / 12.667 = 0.246
           W_PANEL starts at 0.30 — just after p_clear, with margin for the
           aspect-dependence p_clear itself has (halfH varies with the live
           canvas, so 0.246 is the reference value, not a runtime constant). */
        const panelVis = frozen
          ? 0
          : smoothstep(W_PANEL[0], W_PANEL[0] + 0.05, p) * (1 - smoothstep(W_PANEL[1] - 0.05, W_PANEL[1], p));
        panel.style.opacity = String(solid * panelVis);

        /* ---- severity ---- */
        const severeVis =
          smoothstep(W_SEVERE[0], W_SEVERE[0] + 0.04, p) *
          (1 - smoothstep(W_SEVERE[1] - 0.05, W_SEVERE[1], p));
        DENT_MAT.opacity = solid * severeVis;

        /* ---- labels ---- */
        const place = (c: Callout, win: [number, number]) => {
          const vis = frozen
            ? (win === W_SEVERE ? 1 : 0)
            : smoothstep(win[0], win[0] + 0.04, p) * (1 - smoothstep(win[1] - 0.05, win[1], p));
          const world = wpos.copy(c.local).applyMatrix4(model.lift.matrixWorld);
          const r = vis > 0.01 ? project(world, c.normal, w, h) : null;
          /* leftGuard 0.04, not the shared 0.3. The default reserves
             container-vision's readout column, which this scene does not have —
             and this subject is CENTRED in a narrow portrait frame, so most of
             it projects left of a third. At 0.3 both labels would be silently
             rejected on every frame. Same failure family as the tank valve, the
             yard slot and gate's first two reads; that is four times now. */
          placeCallout(c, r ? { sx: r.sx, sy: r.sy - bleed } : null, vis, w, h - bleed * 2, 0.04);
        };
        place(sharpLabel, W_SELECT);
        place(severeLabel, W_SEVERE);
        place(idLabel, W_IDREAD);

        // nothing on screen during the opening
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.2, 0.95, t));

        if (bloom) bloom.strength = 0.18 + 0.16 * coneVis;

        /* ---- REVIEW INSTRUMENT: `?debug=1` -----------------------------------

           This exists because three consecutive passes on this scene's
           detection boxes were argued from screenshots of a 520px canvas
           downscaled again by the review pane, and all three reached a wrong
           conclusion. A bracket 120px wide in canvas pixels is 75px in the
           screenshot and a corner arm is under 10 — below the resolution at
           which "is this mark on that feature" can be answered by looking at
           it. Guessing harder was not going to work.

           So the scene reports instead. Under the flag it publishes, every
           frame, the exact projected screen position of each anchor, the live
           opacity of each mark, and the container's own two ends so a caller
           can convert world metres to canvas pixels without assuming a scale.
           That turns "where is the ID box" into a number.

           Query-gated: one string check at build, one object write per frame
           when on, nothing at all when off. */
        if (DEBUG) {
          const probe = (v: THREE.Vector3) => {
            const r = project(wpos.copy(v).applyMatrix4(model.lift.matrixWorld), FACE_N, w, h);
            return r ? [Math.round(r.sx), Math.round(r.sy)] : null;
          };
          (window as unknown as Record<string, unknown>).__craneDebug = {
            canvas: [w, h, +(w / h).toFixed(3)],
            p: +p.toFixed(3),
            id: { at: probe(ID_LOCAL), op: +ID_MAT.opacity.toFixed(3) },
            dent: { at: probe(DENT_LOCAL), op: +DENT_MAT.opacity.toFixed(3) },
            rust: { at: probe(RUST_LOCAL), op: +RUST_MAT.opacity.toFixed(3) },
            boxL: probe(new THREE.Vector3(-C_L / 2, -DROP, 1.26)),
            boxR: probe(new THREE.Vector3(C_L / 2, -DROP, 1.26)),
          };
        }
      };

      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame below — this scene's cones and heatmap are not drawn
         until a third of the way through the loop, and a program compiles the
         first time it is actually drawn. AND THE PRIMED FRAME WAITS FOR IT, so
         the primed draw does not race the async compile and take the blocking
         path compileAsync exists to avoid. See PERFORMANCE.md #36.

         `compiled` gates drawing entirely, so the guard matters: a promise that
         rejects or never settles must not leave a scene permanently blank. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      /* Prime ONE frame even off screen: the first draw is where textures
         upload and the remaining programs link. Exactly one — after this the
         gate resumes and an off-screen scene costs nothing. The clock
         deliberately does NOT start here; it starts on the first ON-SCREEN
         frame, so every visitor sees the intro from frame one. */
      let primed = false;
      const MIN_DT = 1 / 46;
      let last = -1;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!compiled) return;
        if (!onScreen) {
          if (!primed) { primed = true; applyFrame(); studio.render(); }
          return;
        }
        primed = true;
        if (!clockStarted) { clock.start(); clockStarted = true; }
        const now = clock.getElapsedTime();
        if (now - last < MIN_DT) return;
        last = now;
        applyFrame();
        studio.render();
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        visObs.disconnect();
        marks.forEach((a) => a.wrap.remove());
        panel.remove();
        /* Scene-owned only. The container's canvases, the metal maps and the
           metalBox geometry cache are all SHARED and outlive this scene —
           disposing them would leave the next build sampling dead textures. */
        sightCones.forEach((c) => c.dispose());
        /* bracket() allocates its own PlaneGeometry per bar (unlike the
           _barGeo-sharing createTracker), so each mark owns eight small
           geometries that nothing else references. */
        const disposeBracket = (g: THREE.Group) => {
          g.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
        };
        disposeBracket(dentBox);
        disposeBracket(idBox);
        disposeBracket(rustBox);
        DENT_MAT.dispose();
        ID_MAT.dispose();
        RUST_MAT.dispose();
        model.owned.forEach((g) => g.dispose());
        mats.dispose();
        cmats.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[crane-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "crane");
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative", width: "100%", height: "100%",
        overflow: bare ? "visible" : "hidden",
        background: bare ? "transparent" : PALETTE.bgBottom,
      }}
    >
      {/* The CANVAS bleeds past the slot; the overlay does not — bleeding the
          whole component moves the labels with it and they end up on the
          section's own copy. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

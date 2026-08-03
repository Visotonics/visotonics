"use client";

/* ---------------------------------------------------------------------------
   Work Vision — one person, three cameras, one identity.

   Structurally this is Gate Vision's sibling and is built to match it: the
   camera is BOLTED DOWN in one pose, the subject crosses the frame at constant
   speed, the loop wraps while the subject is off screen, sight cones make the
   read visible, and the whole thing exists to dramatise a claim about not
   stopping. Where Gate Vision reads a container, this reads a person.

   The section's claims, and where each one lands:

     "Nobody stops. Nobody even notices."
        -> the walk is LINEAR. No ease-in at the frame edge, no pause under a
           camera, no acknowledgement of any of the three reads.
     "No cards to tap, no scanners to use, no habit to change."
        -> there is no reader, no turnstile, no barrier and no floor marking in
           this scene. The only equipment is three poles the walker never looks
           at, standing back off the aisle.
     "one person seen from several cameras resolving to one identity, above a
      live shift register"
        -> three sight cones and three per-camera brackets fire in sequence,
           then three convergence lines are live AT ONCE and meet on the walker
           as a single callout resolves. That beat is the whole scene.
     "Entry and exit written to the second, without a checkpoint."
        -> the shift-register row writes itself in the overlay while the walker
           is still moving, and is still there after they have left frame.

   THE COLOUR GRAMMAR, AND A DELIBERATE ABSENCE.
   Blue (#5CC8FF) is the system observing: cones, brackets, convergence lines,
   register text, the callout title. Orange is a CONCLUDED FINDING — damage,
   a discrepancy, a located box. THIS SCENE CONTAINS NO ORANGE AT ALL, and that
   is correct rather than an oversight: nothing here fails, nothing is flagged,
   nobody is stopped. A single orange mark on this frame would say a person had
   been picked out as a problem, which is the exact opposite of the claim. The
   one thing this scene concludes — the identity — is stated in TYPE, not in a
   warning colour.

   Every graphic carries `toneMapped: false`. ACES runs on the beauty pass and
   would pull a flat graphics blue down into grey-green; drafting marks are INK,
   not lit surfaces, so they opt out. House rule — see yard-vision/yard.ts.

   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, placeCamera, smoothstep } from "../_vision/camera";
import { createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { createSightCone, createTracker } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import {
  CONE_HALF_ANGLE, GROUND_Y, POLE_X, buildWork, buildWorkMaterials, walkerX,
} from "./work";

/* 9.0s. Long enough for a 1.6 m/s walk to cross the aisle and for three reads
   to happen in sequence without any of them being a flash. */
const LOOP = 9.0;
const SETTLE = 0.9;      // the aisle fades up over this many seconds

/* Reduced-motion still frame: parked on the convergence, which is the one beat
   that states the section's outcome. At p = 0.70 all three lines are live, the
   callout is resolved and cone 2 is lit; the register is forced on in the
   frozen branch so the still frame carries all four elements at once. */
const FROZEN_T = 6.30;
const FROZEN_P = 0.70;

/* =========================== THE FRAMING ===========================
   FIXED. One pose, held for the whole loop, exactly as Gate Vision is. A pole
   camera does not orbit, and a still frame is also what makes the walker's
   speed legible — motion against a moving frame always reads slower.

   THE ARITHMETIC, because "roughly 45% of frame height" is a number and can be
   solved rather than eyeballed.

   The studio camera is a PerspectiveCamera(30, ...), and three's `fov` is
   VERTICAL, so the frame's world height at a given distance does not depend on
   the canvas aspect at all:
       H = 2 * d * tan(15 deg) = 0.535898 * d
   The figure's crown is at 1.815 (see work.ts: head centre 1.66 + r 0.155), so
       1.815 / H = 0.45  ->  H = 4.033  ->  d = 7.526
   Rounded to D_REF = 7.50. Measured against the real frustum below that lands
   the figure at 44.5% of frame height, which is the "roughly 45%" asked for.

   ELEVATION AND LOOK-AT. The frame is only ~4.03 units tall and it has to hold
   both a 1.815 figure standing on the floor AND three 3.05-tall poles standing
   behind it, so the vertical budget is nearly all spoken for:
       floor        y = 0.00
       crown        y = 1.815
       pole tops    y = 3.05
   Look-at TY = 1.50 with a 6-degree downtilt gives
       camY = TY + D_REF*sin(6 deg) = 1.50 + 0.784 = 2.284
       rad  = D_REF*cos(6 deg)      = 7.459
   and the eye therefore sits at (1.195, 2.284, 7.422), which is 7.518 out from
   the walk line at x = 0 (further than the target, because the target is slid
   right — see TX below). The visible world-Y band at the walk line is
       top    = camY + 7.518*tan(15 - 6 deg) = 2.284 + 1.191 =  3.475
       bottom = camY - 7.518*tan(15 + 6 deg) = 2.284 - 2.886 = -0.602
   — 0.43 of headroom over the pole tops (more at the pole plane, which is 2.1
   further from the lens and therefore has a taller frame), and 0.60 of floor in
   front of the walker for the drafting grid to be visible on. Frame height at
   the walk line is 4.076, so the figure occupies 1.815/4.076 = 44.5%.

   TX = 0.45, NOT 0, AND IT IS NOW LOAD-BEARING FOR A DIFFERENT REASON THAN THE
   ONE IT WAS CHOSEN FOR. It was picked when the poles spanned x -3.6..4.4
   (centre 0.4) and the right-hand one fell 0.26 outside the frame at TX = 0.
   The poles have since been clustered to -2.5 / -0.6 / +1.3 (see POLE_X), which
   all sit comfortably inside the frame at any TX, so the original justification
   has expired.

   IT IS HELD ANYWAY, deliberately: every number in work.ts's aisle — the rack's
   required span -5.48..+5.16, the RACK_K range, the 0.640 sight-line clearance
   that sized NEAR_H, and the near-goods x extent — is derived from the eye
   sitting at (1.195, 2.284, 7.422), and that position is a function of TX.
   Moving TX now silently invalidates all of it. If it is ever changed, the
   aisle derivation in work.ts has to be re-run with it. */
const D_REF = 7.50;
const ELEV = (6 * Math.PI) / 180;
const TX = 0.45;
const TY = 1.50;
const TZ = 0;
/* A few degrees of azimuth, no more. Enough that the poles sit BEHIND the aisle
   rather than in the same plane as it, so the shot has depth; not enough to
   turn the walker off profile. */
const AZ = 0.10;

/* Aspect compensation, held to the SAME discipline as yard-vision: the pose is
   authored at one aspect, and the correction that moves the camera is also the
   one that derives its height, so the 6-degree elevation survives whatever the
   canvas turns out to be.

   REF_ASPECT is 16/9 here, and NOT the 1600/680 the older flagships use. Those
   scenes were authored against the schematic's 2.35 slot and later reframed for
   a squarer canvas, so their reference is historical. This scene's two homes —
   the lab route and the section slot — are both 16/9, so the authored numbers
   above ARE the shipped numbers and the multiplier is exactly 1 there. A
   NARROWER canvas (the responsive twin) pulls the camera back rather than
   cropping the outer poles out of frame; nothing widens it, because the
   vertical framing is already correct at any aspect. */
const REF_ASPECT = 16 / 9;
const fitD = (aspect: number) =>
  D_REF * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.2);

/* =========================== THE READS ===========================
   Three windows, non-overlapping, one per pole camera. Each one lights that
   camera's sight cone and puts a blue bracket on the walker. See work.ts's
   AIM_X note for how the cones are aimed so that the walker is actually inside
   the fan at the middle of each window. */
/* Re-derived for the shortened run (see WALK_FROM in work.ts). The walker
   reaches the three poles at p = 0.260 / 0.442 / 0.625, and each window is
   centred on its own arrival — so a cone is lit exactly while the walker is in
   front of it, never before and never after. */
const READS: [number, number][] = [
  [0.19, 0.33],
  [0.37, 0.51],
  [0.55, 0.69],
];

/* The money beat: three lines from three lenses, live at once, meeting on one
   person. This is the only moment in the loop when all three cameras are
   asserting something simultaneously, which is the visual form of "three
   independent detections resolve to one identity". */
/* CONVERGENCE starts as the third read is still closing, which is the point —
   the three become one. Mid-beat sits at p = 0.68, walker x = 1.87, i.e. 72% of
   the frame width: far enough right to be a real crossing, near enough that the
   callout centred on it still clears placeCallout's 0.97 right guard (its label
   is ~360px on an 1100px canvas, so half-width 0.16 puts its edge at 0.88). */
const CONV: [number, number] = [0.60, 0.76];

/* The shift register writes itself while the walker is still moving and is
   still on screen after they have gone — "entry and exit written to the second,
   without a checkpoint". It clears before p = 1 so the wrap is clean. */
const REG: [number, number] = [0.72, 0.94];   // still finishing as they leave — the record outlasts the person

/** Ramp a value up at a window's open and down at its close. */
const win = (p: number, w: [number, number], inPad = 0.03, outPad = 0.04) =>
  smoothstep(w[0], w[0] + inPad, p) * (1 - smoothstep(w[1] - outPad, w[1], p));

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

/** `bare` lifts the aisle out of its frame — see ContainerVisionScene. */
export default function WorkVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
      /* shadowExtent 6: the walker is only ever ON screen between x -3.8 and
         +4.3, and the poles sit at z -2.1, so a 6-unit half-extent covers every
         shadow that can be seen while giving a 1024 map ~85 px per world unit —
         enough that a 1-unit-wide figure has a shadow with legs in it.
         exposure 1.05, below the 1.18 default: the subject here is a 1.8-unit
         figure rather than a 6-unit container, so it sits proportionally closer
         to the same lights and clips at the house exposure. */
      const studio = createStudio(wrap, {
        floorY: GROUND_Y, shadowExtent: 6, spread: 1.4, bare,
        maxDpr: 1.75, shadowMapSize: 1024, exposure: 1.05,
      });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      const _tw = performance.now();
      const wmark = (w: string) => {
        if (!location.search.includes("perf")) return;
        const g = window as unknown as { __visionWork?: string[] };
        (g.__visionWork ||= []).push(`${w} ${(performance.now() - _tw).toFixed(0)}`);
      };

      /* ---- subject ---- */
      const mats = buildWorkMaterials();
      wmark("mats");
      const model = buildWork(mats);
      wmark("buildWork");
      scene.add(model.root);
      scene.add(model.fixed);
      /* THE AISLE. Built in work.ts and, until now, never added — which is the
         whole of the "there is no environment" defect: floor slab, edge
         markings, racking and goods were all being constructed, disposed and
         never drawn. One group, added once, never moved. */
      scene.add(model.env);

      /* ---- DEPTH: fog, so the aisle recedes -----------------------------
         #0A0B0E is PALETTE.bgBottom — the backdrop's own bottom stop — so a
         surface that fogs out does not fade to a grey that then sits ON the
         backdrop; it dissolves INTO it. That is the only fog colour this scene
         can have.

         NEAR AND FAR ARE THE SCENE'S REAL DISTANCES, measured from the eye at
         (1.195, 2.284, 7.422):

           near-side goods, front face z = 1.605     6.1   -> 0.005
           walker at mid-frame (x = 0, z = 0)        7.6   -> 0.082
           poles, z = -2.1                          10.2   -> 0.212
           racking behind the poles, z = -3.6       11.4   -> 0.269
           racking's outermost bay, x = -7.25       13.9   -> 0.395
           floor slab, its own edge at 80              -   -> 1.000 long before

         NEAR = 6.0 puts the fog's onset just in front of the nearest object, so
         nothing in the subject zone is touched: the walker loses 8% and the
         figure is never softened. FAR = 26 is chosen off the FLOOR rather than
         off any object — the camera is 6 degrees above a look-at at y = 1.50 so
         the HORIZON IS IN SHOT, and a 160-unit slab with no fog on it shows its
         own far edge as a hard line across the frame. At 26 the slab is fully
         dissolved 54 units before it ends. That is what makes the floor read as
         infinite rather than as a plane with a border, and it is why the slab
         is allowed to be that big in the first place.

         WHAT IS AND IS NOT FOGGED, decided per material rather than inherited:
           · floor / rack / goods / suit / skin / poles — MeshStandardMaterial,
             fog on (three's default). They are the world; they must recede.
           · the aisle edge markings — MeshBasicMaterial with fog EXPLICITLY on
             (work.ts). Paint belongs to the surface it is painted on, so it has
             to dim with it or it floats at the far ends.
           · the sight cones — raw ShaderMaterial with no fog chunks compiled
             in, so they are immune whatever `scene.fog` says. Correct, and
             stated here because it is invisible from the material.
           · the bracket and the convergence lines — MeshBasic / LineBasic,
             which BOTH DEFAULT TO fog: true. Left alone they would be dimmed by
             the aisle's atmosphere, which is wrong twice over: they are drafting
             ink laid over the image, not objects in it, and they already opt out
             of tone mapping for exactly that reason. Both are turned off
             explicitly below. */
      scene.fog = new THREE.Fog(PALETTE.bgBottom, 6.0, 26.0);

      /* ---- the floor: a drafting sheet on the slab ----
         Yard-vision's analog sheet, sitting on top of work.ts's floor slab in
         the coincident-plane stack (slab -0.030 / grid -0.018 / paint -0.008 /
         the studio's shadow catcher at 0). renderOrder -3 is what puts it there
         — draftingGround defaults to -1, which would have drawn it OVER the
         aisle markings.

         WHAT WAS TAKEN FROM lead-card/site.ts, which solved this same
         no-ground defect today under the identical rig:
           · opacity 0.12 — taken. Same reasoning: yard-vision holds its sheet
             to 0.11 because a brighter slot grid competes on the same floor,
             and there is no such grid here either.
           · glow 2.2 — taken, unchanged; it is the house analog sheet.
           · majorBoost 1.0 — REJECTED, back to yard-vision's 2.2. The lead card
             is forced to 1.0 because its sheet rides a panning camera and has
             to snap to whole grid squares; a heavy every-fifth rule would force
             the snap to multiples of five and make the horizon breathe. This
             camera is BOLTED DOWN. Nothing snaps, so nothing constrains the
             rule weight, and the fifth-line rule is most of what makes the
             sheet read as drafted rather than as graph paper.
           · size 74 with a 0.28 -> 0.90 fade — REJECTED, and this is the one
             worth stating loudly, because the obvious inference from a static
             camera is "static camera, so make the sheet bigger", and that is
             what was here before: size 130 fading 0.86 -> 1.0, i.e. beginning
             56 units out. That is WRONG, and it is wrong precisely BECAUSE the
             horizon is in shot. The grid's line width is screen-space
             derivative normalised; at grazing incidence fwidth explodes, the
             distance field collapses, and every line saturates — so a sheet
             that is still at full strength near the horizon does not read as
             ground continuing forever, it reads as a bright wash across the top
             of the floor. Unbounded is worse here, not better.

         SO THE FADE IS SIZED OFF THE FRAME, NOT OFF THE CAMERA MOVE. size 64,
         half-size 32; the fade runs 0.24 -> 0.62, i.e. from 7.7 units out to
         19.8. The visible ground leaves the LEFT AND RIGHT frame edges at the
         racking plane at x = -5.48 / +5.16, z = -3.6 — radius 6.6 from the
         sheet's centre, comfortably inside 7.7 — so the grid is at FULL
         strength everywhere it crosses a frame edge, which is the actual
         requirement. It is gone by 19.8, before the wash, and the fog finishes
         the slab underneath it at 26. */
      const ground = draftingGround({
        size: 64, y: GROUND_Y - 0.018, step: 1,
        color: PALETTE.grid, opacity: 0.12, glow: 2.2, majorBoost: 2.2,
        fadeStart: 0.24, fadeEnd: 0.62,
      });
      ground.mesh.renderOrder = -3;
      scene.add(ground.mesh);

      /* ---- the reads made visible: three sight cones ----
         Built once and aimed ONCE. A cone that re-aims at the walker is a
         searchlight; a fixed head with a fixed field of view is what is
         actually bolted to the pole, and a person walking THROUGH a static
         volume is the honest picture of how the read happens.

         Construction is gate-vision's, exactly: ConeGeometry, then
         `geo.translate(0, -LEN/2, 0)` so the apex sits at the group's origin
         with the fan opening along local -Y, then ONE
         `quaternion.setFromUnitVectors(new Vector3(0,-1,0), dir)` to lay that
         axis along the sight line. */
      /* Apex, axis and length come straight off the model — the shared builder
         takes the lens position and a target point at exactly coneLens[i] along
         the sight line, which is how it wants a direction plus a length
         expressed.

         THE HALF-ANGLE IS A CONSTANT NOW, not atan(0.8 / len), and the change
         is the point rather than a tidy-up. The old expression pinned a fixed
         0.8 BASE RADIUS and let the angle fall out of whatever length the aim
         happened to give — which meant the fan's shape was a side effect of
         where the aim point sat. The aim now sits at the walker's chest and the
         length runs on to the floor (see work.ts), so the two are decoupled and
         the angle is the thing that is authored. It lands at essentially the
         same base radius, 0.801, so nothing got wider by accident.

         All three cones are still geometrically identical: AIM_X equals POLE_X
         for every pole, so all three sight lines are the same (0, -1.85, 2.1).
         The only thing that varies is the walker's x at the middle of each read
         window — -2.496 / -0.624 / +1.248 against poles at -2.5 / -0.6 / +1.3,
         so the subject is off each cone's axis by 0.004 / 0.024 / 0.052. Pole 2
         is therefore the worst case and is what CONE_HALF_ANGLE was solved
         against; the crown clears its fan there by 0.017 at the top of the gait
         bob, and by 0.052 at the bottom of it. */
      const sightCones = POLE_X.map((_x, i) => {
        const len = model.coneLens[i];
        const target = model.lenses[i].clone().addScaledVector(model.dirs[i], len);
        const c = createSightCone({
          color: PALETTE.accent,
          footprintY: GROUND_Y,
        });
        c.aim(model.lenses[i], target, CONE_HALF_ANGLE);
        scene.add(c.group);
        return c;
      });

      /* ---- the per-camera detection bracket ----
         ONE tracker, not three. The three read windows do not overlap, and
         three trackers locked onto the same target with the same pad would be
         pixel-identical to one tracker switched on three times — so this is the
         same picture for a third of the objects. Which camera is reading is
         carried by which CONE is lit, which is the honest signal anyway.

         The material is built here rather than taken from detectMaterials(),
         and that is deliberate: detect.ts's `accent` was re-picked as #1B7FC4
         for the LIGHT hero cards, where an overlay reads by being darker than
         its ground. On this near-black canvas that hex is a muddy navy that
         disappears. This scene is dark, so it uses the palette's own #5CC8FF —
         the same blue the cones and the convergence lines use, which is the
         point of a colour grammar. */
      const brkMat = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false,
        // ink, not atmosphere — see the fog note above
        fog: false,
      });
      /* pad 1.20, DOWN FROM 1.28. A person is tall and narrow and a bracket
         snug on a walking figure clips the arm and foot at the extremes of the
         swing, so the pad has to be over 1 — but 1.28 was judged loose on screen
         twice, and it reads looser still now that the head has come down from
         1/5.9 of the figure's height to 1/6.4. 1.20 still clears the fully swung
         leg (half-extent 0.494 against a 0.30 body width) without leaving the
         corner marks floating well clear of the crown. */
      const tracker = createTracker(brkMat, { pad: 1.20 });
      scene.add(tracker.group);

      /* ---- the convergence ----
         Three segments, six vertices, positions rewritten every frame from the
         three lens positions to the walker's current chest height. One
         LineSegments rather than three Line objects: it is one draw call and
         one attribute update, and the three lines are always born and always
         die together.

         frustumCulled OFF. The geometry is authored empty at the origin, so its
         bounding sphere is computed once around (0,0,0) and never again —
         leaving it on means three's culler can decide the lines are off screen
         while they are in fact strung across the middle of the frame. */
      const convGeo = new THREE.BufferGeometry();
      const convPos = new Float32Array(18);
      convGeo.setAttribute("position", new THREE.BufferAttribute(convPos, 3));
      const convMat = new THREE.LineBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false,
        /* The lines run from a lens at z = -2.1 to the walker at z = 0 — a
           depth range the fog is actively working over. Fogged, the far end of
           each line would be visibly weaker than the near end, which would read
           as the assertion itself being uncertain at range. */
        fog: false,
      });
      const convLines = new THREE.LineSegments(convGeo, convMat);
      convLines.frustumCulled = false;
      scene.add(convLines);

      /* ---- the one callout the scene earns ----
         Exactly one. Four callout cards is a wall of ink, and the callout
         grammar is reserved for the single finding that justifies it — here,
         the identity that three independent reads resolve to. Everything else
         the scene has to say is said by the register row below, in plain type.

         Anchored in ROOT space (the unrotated parent), so the surface normal is
         not spun a quarter turn by the figure's profile yaw. */
      const ident = createCallout(overlay, {
        id: "ident",
        title: "Worker 0412",
        detail: "Zone B · 07:58:12 · one identity, three cameras",
        pos: model.headAnchor.clone(),
        normal: new THREE.Vector3(0, 0.35, 1).normalize(),
        onDark: true,
        lane: { dir: "up", len: 76 },
        win: CONV,
      });
      wmark("callout");

      /* ---- the shift register ----
         PLAIN DOM, not a callout, for the reason above. Fixed lower-left, so it
         is a readout the room keeps rather than a label attached to a person —
         which is exactly what a shift register is.

         It fades; it does not typewrite. Writing it character-group by
         character-group would be the third animated thing in a frame that
         already has a walk cycle and a convergence, and the row is only 26
         characters long — the effect would be over before it registered as an
         effect. A fade plus the 1px accent left-rule says "this line was just
         written" with no motion at all. */
      const reg = document.createElement("div");
      reg.style.cssText =
        `position:absolute;left:30px;bottom:28px;opacity:0;transition:opacity .35s ease;pointer-events:none;`;
      const regHead = document.createElement("div");
      regHead.textContent = "SHIFT REGISTER";
      regHead.style.cssText =
        `font-family:${MONO};font-size:10px;letter-spacing:0.24em;color:rgba(226,234,244,0.42);padding-bottom:9px;`;
      reg.appendChild(regHead);
      const regRow = document.createElement("div");
      regRow.textContent = "0412 · ZONE B · IN 07:58:12";
      regRow.style.cssText =
        `font-family:${MONO};font-size:13px;letter-spacing:0.06em;color:${PALETTE.accentText};`
        + `border-left:1px solid ${PALETTE.accent};padding-left:12px;line-height:1.5;`;
      reg.appendChild(regRow);
      overlay.appendChild(reg);

      const ro = new ResizeObserver(studio.size);
      ro.observe(wrap);

      /* Only DRAW while on screen. mountWhenVisible gates construction, not
         rendering — without this a scene scrolled well past keeps issuing a
         full draw plus a composer pass every frame for the rest of the session.
         rootMargin keeps it warm just outside the viewport so it is never
         caught mid-intro when scrolled back to. */
      let onScreen = true;
      const visObs = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "200px" },
      );
      visObs.observe(wrap);

      /* The clock is STARTED ON THE FIRST ON-SCREEN FRAME, not at construction.
         Building a scene blocks for a while, and with a clock running from
         construction the first frame anyone actually sees is already hundreds
         of milliseconds in — so the intro appears to skip its beginning. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;

      /* REVIEW AID — `?phase=0..1` pins the loop position, same tool as
         gate-vision's and yard-vision's. Judging a 9-second loop by
         screenshotting and hoping costs passes. Pins the loop only; `t` still
         advances, so the intro fade and the gait resolve normally. */
      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

      const target = new THREE.Vector3();
      const wpos = new THREE.Vector3();
      let raf = 0;

      const project = makeProjector(camera, model.root);
      const convAttr = convGeo.getAttribute("position") as THREE.BufferAttribute;

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        /* ---- 1. the walk. Constant speed, walking the whole time. ----
           THE WRAP IS INVISIBLE. The eye sits at (1.195, 2.284, 7.422) and the
           horizontal half-angle is atan(tan(15 deg) * 16/9) = 25.467 deg about a
           view axis 5.730 deg off -Z, so the two edge rays cross the walk line
           (z = 0) at x = -3.30 and x = +3.86. Those two numbers are also what
           work.ts's whole aisle derivation is built on.

           The run is +-5.2 (work.ts, WALK_FROM), so at p = 0 the figure's
           leading edge is 1.41 units clear of the left frame edge and at p = 1
           its trailing edge is 0.85 clear of the right — comprehensively off
           frame at both ends, so the reset happens on an empty aisle. The walker
           is in shot for p 0.135..0.918, i.e. 78% of the loop; the full
           arithmetic, including why the run was shortened from +-7.2, is in
           work.ts rather than duplicated here.
           WALK_FROM / WALK_TO changing would also move every read window. */
        const cx = walkerX(p);
        model.root.position.x = cx;
        model.walk(t);
        model.root.updateMatrixWorld(true);
        model.fixed.updateMatrixWorld(true);

        /* ---- camera: one pose, aspect-corrected, never moved ---- */
        const d = fitD(w / h);
        placeCamera(camera, { az: AZ, rad: d * Math.cos(ELEV), tx: TX, ty: TY, tz: TZ },
          TY + d * Math.sin(ELEV));
        target.set(TX, TY, TZ);
        // No handheld float, no roll, no drift. The SUBJECT is what moves here;
        // any wobble on top of that only makes the rig look unstable.
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- intro: the aisle fades up on an empty frame ----
           Every material is built at opacity 0, so this is not a flourish —
           without it nothing is ever drawn. SETTLE is 0.9s = p 0.10 and the
           walker does not enter frame until p = 0.135, so the aisle is still
           fading up on an empty frame and the first EVENT of the loop is a
           person arriving into a room that is already there.

           Opacity only. `transparent` is part of three's program cache key and
           flipping it at runtime forces a synchronous shader recompile inside a
           drawn frame — the seal bug documented at length in
           container-vision/scene.tsx. Nothing in this scene ever flips it. */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        for (const m of mats.all) (m as THREE.Material & { opacity: number }).opacity = solid;
        /* The aisle markings are deliberately NOT in `mats.all` and are ramped
           here instead, at 0.38 of solid. `paint` is an unlit MeshBasic drawn at
           a literal #5A626C with toneMapped off, so at full opacity it is a pair
           of hard rails brighter than anything on the walker — the one thing
           this scene cannot afford, since the figure has to stay the lightest
           large surface that is not a graphic. Same call, same fraction within
           a rounding, as lead-card/site.ts makes for its road paint. */
        mats.paint.opacity = solid * 0.38;
        // a transparent mesh still casts a full shadow, so without this the
        // shadow is on the floor before the walker is
        shadowMat.opacity = 0.5 * solid;
        setGroundOpacity(ground, solid);

        /* ---- 2. three reads ----
           Cone lit and bracket on, for that camera's window only. */
        let anyRead = 0;
        for (let i = 0; i < 3; i++) {
          const on = win(p, READS[i]);
          sightCones[i].setOpacity(solid * 0.30 * on);
          // mid-sweep in reduced motion; at t=0 the band sits on the apex,
          // under the apex fade, and reads as no sweep at all
          sightCones[i].tick(frozen ? 1.4 : t);
          if (on > anyRead) anyRead = on;
        }
        tracker.follow(anyRead > 0.01 ? model.figure : null, camera);
        brkMat.opacity = solid * anyRead;

        /* ---- 3. convergence ----
           Six vertices rewritten in place: lens -> walker, three times. The
           lines meet at chest height on the figure's current position, so they
           converge on ONE point that is visibly moving with the person rather
           than on a marker parked in the aisle. */
        const convOn = win(p, CONV, 0.04, 0.05);
        if (convOn > 0.001) {
          const my = GROUND_Y + 1.25;
          for (let i = 0; i < 3; i++) {
            const L = model.lenses[i];
            convPos[i * 6 + 0] = L.x; convPos[i * 6 + 1] = L.y; convPos[i * 6 + 2] = L.z;
            convPos[i * 6 + 3] = cx;  convPos[i * 6 + 4] = my;  convPos[i * 6 + 5] = 0;
          }
          convAttr.needsUpdate = true;
        }
        convMat.opacity = solid * 0.85 * convOn;

        /* the one callout, resolving at the walker as the lines meet */
        const cvis = frozen ? 1 : convOn;
        const world = wpos.copy(ident.local).applyMatrix4(model.root.matrixWorld);
        const r = cvis > 0.01 ? project(world, ident.normal, w, h) : null;
        /* leftGuard 0.04, NOT the shared default 0.3. The default reserves the
           readout column container-vision has and this scene does not, and a
           guard at a third of the width silently rejects any label whose
           subject is left of centre — which is most of the loop for a subject
           that crosses the frame. When a callout never appears in this
           codebase, check the bounds test before anything else: this exact bug
           has now cost four passes across four scenes.
           Bounds are the OVERLAY's height, not the canvas's: the canvas bleeds
           `bleed` px past the slot at top and bottom and the overlay does not,
           so a label placed against canvas height drifts off its mark. */
        placeCallout(ident, r ? { sx: r.sx, sy: r.sy - bleed } : null, cvis, w, h - bleed * 2, 0.04);

        /* ---- 4. the register ---- */
        const regOn = frozen ? 1 : win(p, REG, 0.04, 0.04);
        reg.style.opacity = String(solid * regOn);

        // nothing on screen during the opening settle
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.2, 0.9, t));

        /* ---- 5. everything is at zero by p = 1 ----
           Every window above closes before 0.95, and all three are products of
           smoothsteps that reach 0 inside the loop, so the wrap cannot leave a
           cone lit or a bracket hanging in an empty aisle. */

        if (bloom) bloom.strength = 0.18 + 0.14 * convOn;
      };

      /* 45fps. Same rate as the other flagships — see card-scene.tsx for why
         the guard is 1/46 and not 1/45. */
      const MIN_DT = 1 / 46;
      let last = -1;

      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame below. On a cold browser session, priming one frame
         alone still leaves a long task landing mid-scroll, because a scene whose
         graphics come and go across the loop compiles each program the first
         time it is actually drawn — which here would be half a loop in, on the
         frame a cone first lights. compileAsync walks the whole graph and uses
         KHR_parallel_shader_compile where available so it does not block.

         AND THE PRIMED FRAME WAITS FOR IT: priming on the next animation frame
         races the async compile and just compiles synchronously whatever it
         needs, which is the blocking path compileAsync exists to avoid.
         `compiled` gates drawing entirely, so the timeout guard matters — a
         promise that rejects or never settles must not leave a blank scene. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      let primed = false;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        // nothing is drawn until every program is linked — see markCompiled
        if (!compiled) return;
        if (!onScreen) {
          /* One warm draw off screen — texture upload and the remaining
             first-use waits — then nothing until arrival. The clock
             deliberately does NOT start here: it starts on the first ON-SCREEN
             frame, so every visitor sees the intro from frame one. */
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
      wmark("ready");

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        visObs.disconnect();
        ident.wrap.remove();
        reg.remove();
        /* Scene-owned only. The DARK_METAL maps live in metal.ts's shared cache
           and are NOT disposed here — doing so would leave gate-vision, which
           asks for the identical spec, sampling a dead texture. */
        /* LIFT THE TRACKER OUT OF THE SCENE BEFORE studio.dispose() RUNS.
           studio.dispose() traverses the whole scene and disposes every mesh
           geometry it finds, and every bar of every tracker on the page shares
           ONE module-level PlaneGeometry from detect.ts. Leaving the group in
           the scene therefore destroys the bracket geometry for every other
           scene still mounted. (The same hazard applies to metalBox's shared
           rounded-box cache, which is why work.ts uses none of it.) */
        scene.remove(tracker.group);
        sightCones.forEach((c) => c.dispose());
        brkMat.dispose();
        convMat.dispose();
        convGeo.dispose();
        ground.material.dispose();
        model.dispose();
        mats.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[work-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "work-vision");
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
      {/* The CANVAS bleeds past the slot; the overlay does not. Bleeding the
          whole component moves the register and the callout with it and they
          end up sitting on the section's own copy — the subject is what is
          supposed to escape the box, not the type. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

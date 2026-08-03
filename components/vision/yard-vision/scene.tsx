"use client";

/* ---------------------------------------------------------------------------
   Yard Vision — the fourth flagship, and deliberately the odd one out.

   Section 04's claim is "One survey. Then the yard runs on a live twin." That is
   a claim about a PLACE and about knowledge of it, not about an object — so this
   is the one scene shot from the air, and the one scene whose subject never
   moves. See yard.ts for the full reasoning; the short version is that three
   eye-level close-ups in a row followed by a fourth would misrepresent the
   product and bore the page.

   THE LOOP IS THE THREE LEGEND LINES, in order, because the section already
   commits to them:

     01  ONE-TIME SURVEY                      -> a sweep crosses the yard and
                                                 the slot grid comes up behind it
     02  PLACEMENT PLANNING                   -> one empty slot is proposed,
         RECOMMENDED SLOT PER INBOUND            in blue, for a named inbound
     03  LIVE LOCATOR                         -> one box out of fifty-five is
         EVERY MOVE INTO THE TWIN                named and bracketed, in orange

   Blue is observation, orange is conclusion. This is the only scene where both
   appear in the same shot, so the split has to be exactly right here or the
   whole page's colour grammar stops being legible.

   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import {
  type CamKey, clamp01, easeInOut, makeCamPath, placeCamera, smoothstep,
} from "../_vision/camera";
import { type Callout, createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { createTracker, detectMaterials } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import {
  CH, GROUND, LOCATED, SLOT,
  bayX, buildYard, buildYardMaterials, rowZ, tierY,
} from "./yard";

/* 9.4s, the longest loop of the four flagships. The other three are inspections
   and read as brisk; this one has to let a sweep cross an 18-metre yard and then
   hold twice, and every attempt to compress it made the sweep look like a wipe
   transition rather than a survey. */
const LOOP = 9.4;
const SETTLE = 0.9;         // the yard fades up over this many seconds
const FROZEN_T = 6.4;       // reduced-motion still frame: parked on the LOCATE beat,
const FROZEN_P = 0.75;      //   which is the one that states the section's outcome

/* THE ELEVATION ANGLE IS THE COMPOSITION HERE, SO IT IS WHAT GETS LOCKED —
   not the height. This is the one scene that has to depart from the house rule
   in camera.ts, and the departure is measured, not stylistic.

   38 degrees is the whole framing decision. Lower and the back rows disappear
   behind the front ones and the grid compresses to nothing; higher and stack
   height vanishes and it becomes the flat map the section already has in DOM
   right beside it. 38 is where you can read the grid AND see that boxes are
   stacked, which is the only reason to render a yard in 3D at all.

   A FIXED height cannot hold that angle, because `fitRad` moves the camera.
   The canvas is nowhere near the schematic's 1600x680: with bleed 230 the real
   slot renders at about 1131x941, an aspect of 1.20, whose horizontal half-angle
   is 17.9 degrees against the reference's 32.2. fitRad correctly compensates by
   pushing the camera out ~1.96x — and with height pinned at 9.5 that dragged the
   elevation down to atan(9.5 / 22.3) = 23 degrees. Measured, not guessed: that
   is exactly why the first pass read as a heap of boxes rather than a yard.

   So the height is derived from the SAME aspect correction the distance gets.
   It is still constant across the loop — every push is still a pan, which is
   what camera.ts's rule is actually protecting — it is just constant at the
   value that holds 38 degrees for this canvas. */
const ELEV_TAN = Math.tan((38 * Math.PI) / 180);
const REF_RAD = 11.4;   // the widest key; the height is pegged to this one

/* `rad` 11.4 at the widest key is derived, not chosen: the yard is 18.4 wide, so
   fitting 9.2 either side at the reference aspect's ~32-degree horizontal
   half-angle needs a slant range of 9.2 / tan(32.2) = 14.6, which at 38 degrees
   elevation is a ground radius of 14.6 * cos(38) = 11.5. Rounded to 11.4 because
   an aerial reads better with its subject slightly overflowing the frame than
   floating inside it with margin on all four sides.

   ANYTHING THAT NEEDS A LABEL MUST PROJECT INTO THE MIDDLE BAND OF THE CANVAS.
   This is the hard constraint on every look-at point below, and it is worth
   stating in numbers because two passes of this scene were lost to it.

   The canvas is 941px tall; the OVERLAY is 481, because the canvas bleeds 230px
   past the section at top and bottom and the overlay deliberately does not (the
   subject escapes the box, the type does not). So a callout can only exist for a
   feature that lands in canvas y 230..711.

   An earlier pass pulled every target BACK (negative Z, away from the camera) to
   tilt the lens up and push empty near-ground out of the bottom of frame. It did
   fix that void — and it also dropped the recommended slot to canvas y 810,
   ninety-nine pixels below the overlay's lower bound, where placeCallout
   correctly rejected its label on every frame. The slot lit up and the words
   never came. Same failure as the tank's valve callout, arrived at from the
   opposite direction.

   The void is now handled properly, by extending the GRID one row toward the
   camera (see yard.ts) rather than by tilting away from the subject. So targets
   sit ON their subjects again, pulled only slightly toward the yard's interior,
   which puts each one near frame centre and safely inside the overlay band. */
const CAM: CamKey[] = [
  { p: 0.00, az: 0.34, rad: 11.4, t: [0, 0.3, 0.6] },    // whole yard, survey runs
  { p: 0.30, az: 0.26, rad: 11.2, t: [0, 0.3, 0.6] },    // survey lands, grid is up
  /* az stays near the wide keys' 0.34 rather than swinging to 0.08. At a low
     azimuth the camera looks straight down the rows, they run parallel to the
     frame edges, and the yard flattens into stripes — the depth the 38-degree
     elevation was chosen to show is thrown away by the very beat that is
     supposed to be about a specific slot in a specific row. */
  { p: 0.40, az: 0.24, rad: 9.40, t: [-2.8, 0.4, 2.0] },  // in on the proposed slot
  { p: 0.56, az: 0.22, rad: 9.40, t: [-2.8, 0.4, 2.0] },  //   hold
  { p: 0.66, az: 0.46, rad: 8.80, t: [2.8, 0.4, 1.6] },   // across to the located box
  { p: 0.88, az: 0.48, rad: 8.80, t: [2.8, 0.4, 1.6] },   //   hold
  { p: 0.95, az: 0.40, rad: 10.8, t: [1.0, 0.3, 1.0] },   // back out to meet p=0
];
const sampleCam = makeCamPath(CAM);

/* Same aspect compensation as the other three flagships: the keys are tuned at
   the slot's 1600x680, and a bled canvas is taller, which narrows the
   horizontal field and magnifies the yard. See container-vision for the
   derivation. */
const REF_ASPECT = 1600 / 680;
const fitRad = (rad: number, aspect: number) =>
  rad * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.6);

/* The survey sweep. Crosses the full yard plus a margin at either end so it is
   never seen to appear or vanish inside the grid — it enters from off-frame and
   leaves off-frame, which is what makes it read as a pass rather than a pulse. */
const SWEEP_FROM = -10.6;
const SWEEP_TO = 10.6;
const SWEEP_IN = 0.03;
const SWEEP_OUT = 0.29;
/* LINEAR, not eased. The other flagships ease their scan bar because it is a
   flourish on a static object. This wave is meant to read as a survey pass
   travelling at a steady speed, and an ease-in makes it hesitate at the yard's
   edge and then lurch — the containers light up in a stutter rather than in
   sequence, which is exactly the impression the wave exists to avoid. */
const sweepAt = (p: number) =>
  SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * clamp01((p - SWEEP_IN) / (SWEEP_OUT - SWEEP_IN));

/* Label windows.

   Each one is tied to the camera key that serves it, and the lesson from Tank
   Vision applies: a window that opens AFTER its camera has already arrived
   reads as the graphics lagging the camera. So the slot label opens at 0.36,
   four hundredths BEFORE the camera lands at 0.40, and the locate label at 0.62
   against an arrival of 0.66. The label is on its way in as the camera closes. */
const W_SURVEY: [number, number] = [0.05, 0.30];
const W_SLOT: [number, number] = [0.36, 0.58];
const W_LOCATE: [number, number] = [0.62, 0.92];

const inWin = (p: number, w: [number, number]) => p > w[0] && p < w[1];

/** `bare` lifts the yard out of its frame — see ContainerVisionScene. */
export default function YardVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
      /* shadowExtent 14 and spread 2.2 — both larger than any other scene here,
         because the subject is an 18-metre yard rather than a 6-metre object. A
         shadow camera sized for a container would put 55 boxes' shadows inside
         a 6-metre box and drop the rest.

         lightRig is left FULL. The `lite` rig exists because the soft wrap on a
         curved edge is unresolvable at 320px card size — but this is a flagship
         canvas, and with 55 hard-edged boxes the thing that makes the yard read
         as depth rather than as a pattern is precisely the graded falloff across
         rows that the area lights give. Measured cheap anyway: createStudio is
         43-46ms, and this scene's own build is dominated by nothing at all. */
      /* exposure 0.98, down from the 1.18 every other scene uses. Those scenes
         light ONE object; this one lights 55, and 55 roofs all catching the same
         overhead softbox flattens into a single bright field at 1.18 — the
         individual boxes stop separating from each other, which is the only
         thing making it a yard. */
      const studio = createStudio(wrap, {
        floorY: GROUND, shadowExtent: 14, spread: 2.2, bare,
        maxDpr: 1.75, shadowMapSize: 1024, exposure: 0.98,
      });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject ---- */
      const mats = buildYardMaterials();
      const yard = buildYard(mats);
      scene.add(yard.root);

      /* The drafting sheet under the yard. One gridline per metre — the yard's
         own unit — held very quiet, because this scene already has a second and
         more meaningful grid on top of it (the slot boundaries), and two grids
         at similar strength read as moire. */
      /* The analog sheet — white, faint, and running past the frame.

         SIZE 420, so the half-size is 210. The fade does not begin until 0.86
         of that (~181 units out) and completes at 1.0 (210), which is well
         past anything this aerial can actually see — the widest camera key
         (REF_RAD 11.4, aspect-corrected) never puts the visible ground further
         out than a few tens of units. So every part of the floor inside the
         frame sits at full grid strength, and the fade only starts as the
         sheet is already leaving the viewport — ground that continues past the
         frame rather than a rug the yard is standing on. That is what
         "infinite" means here; the geometry is emphatically finite, it is just
         sized so the finiteness never shows.

         OPACITY 0.11, NOT THE 0.26 A PREVIOUS PASS USED. That pass raised it
         five-fold at the same time as turning the slot grid white, and the two
         rulings — 1.0 against the bay/row pitches of 2.30/2.22, which do not
         divide evenly — beat against each other into moiré. The slot grid is
         back to accent (see yard.ts) and this sheet is back to being texture
         rather than structure. There is a hierarchy on this floor and it only
         has room for one crisp grid: the blue one, because it carries meaning.
         Glow is kept but modest — the analog character survives at low alpha,
         the competition does not. */
      const ground = draftingGround({
        size: 420, y: GROUND - 0.012, step: 1,
        color: PALETTE.grid, opacity: 0.11, glow: 2.2, majorBoost: 2.2,
        fadeStart: 0.86, fadeEnd: 1.0,
      });
      scene.add(ground.mesh);

      /* ---- the detector ----
         NO SCAN PLANE. The other three flagships sweep a translucent bar across
         their subject, and this scene deliberately does not: with 55 objects the
         bar reads as a wipe transition rather than as a scan, because none of the
         containers acknowledge it. The survey is instead a wave of boxes lighting
         up and settling back — see `flashWave` in yard.ts. The reaction is in the
         subject, which is what being surveyed actually looks like. */
      const dm = detectMaterials();

      /* One bracket, on one box, in orange. `pad` is tight: the target is a
         single 20ft container seen from 47 degrees above, and a loose bracket at
         that angle overlaps its neighbours in screen space, which defeats the
         entire point of naming one slot out of fifty-five. */
      const tracker = createTracker(dm.warn, { pad: 1.14 });
      scene.add(tracker.group);

      /* ---- labels ----
         Three, one per legend line, each live only across its own window.

         Leader directions are forced by the aerial framing. The survey label
         hangs UP off the middle of the yard, which is the only place with clear
         air above it. The slot label points DOWN: the slot is on the ground in
         the nearest row, so there is nothing below it but hardstand, and an
         upward leader would cross the whole yard behind it. */
      const survey = createCallout(overlay, {
        id: "survey",
        title: "Survey complete",
        detail: "40 slots · 5 rows × 8 bays · once",
        pos: yard.centreAnchor.clone(),
        normal: new THREE.Vector3(0, 1, 0),
        lane: { dir: "up", len: 104 },
        onDark: true,
        win: W_SURVEY,
      });
      const slotLabel = createCallout(overlay, {
        id: "slot",
        title: "Recommended slot",
        detail: "E-03 · inbound MSCU 418820 3",
        pos: new THREE.Vector3(bayX(SLOT.bay), GROUND + 0.4, rowZ(SLOT.row)),
        normal: new THREE.Vector3(0, 0.4, 1).normalize(),
        /* UP, and short. A downward leader is the obvious choice — the slot is on
           the ground in the nearest row, so there is nothing below it but
           hardstand — and it does not work, for a reason that has now bitten
           twice in this codebase (see the tank's valve callout).

           The CANVAS is 941px tall here but the OVERLAY is only 481, because the
           canvas bleeds 230px past the slot at top and bottom and the overlay
           does not. The recommended slot sits low in the canvas, so a 72px
           downward leader put the label past the overlay's lower bound and
           placeCallout rejected it outright on every single frame — the slot lit
           up and the words never appeared.

           Upward is the only direction with room. 64px keeps the label over the
           containers immediately behind the slot rather than sailing into the
           middle of the yard, and a dark label box reads fine over them. */
        lane: { dir: "up", len: 64 },
        onDark: true,
        win: W_SLOT,
      });
      const locateLabel = createCallout(overlay, {
        id: "locate",
        title: "D-06 — located",
        detail: "VSTU 907032 1 · row D · bay 06 · tier 1",
        // the box's TOP face, not its centre — the leader should start on the
        // surface the bracket is drawn around, not inside the container
        pos: new THREE.Vector3(bayX(LOCATED.bay), tierY(0) + CH / 2, rowZ(LOCATED.row)),
        normal: new THREE.Vector3(0.2, 0.6, 0.8).normalize(),
        severe: true,
        lane: { dir: "up", len: 118 },
        onDark: true,
        win: W_LOCATE,
      });
      const marks: Callout[] = [survey, slotLabel, locateLabel];

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
      const target = new THREE.Vector3();
      let raf = 0;

      const project = makeProjector(camera, yard.root);

      /* REVIEW AID: `?phase=0.15` pins the loop at that p and holds it there.
         A 9.4s loop with three beats cannot be reviewed by taking screenshots and
         hoping — judging the survey wave meant catching a 2.5-second window, and
         several passes of this scene were spent re-rolling the dice instead of
         looking at the frame. Time still advances (so the slot keeps pulsing),
         only the loop position is held. Query-gated, so it costs a string check
         at build and nothing at all in the frame loop. */
      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        yard.root.updateMatrixWorld(true);

        const k = sampleCam(p);
        const aspect = w / h;
        /* One height for the whole loop, derived from the aspect so 38 degrees
           survives whatever fitRad does to the distance. See ELEV_TAN. */
        const camY = ELEV_TAN * fitRad(REF_RAD, aspect);
        target.set(k.tx, k.ty, k.tz);
        placeCamera(camera, { az: k.az, rad: fitRad(k.rad, aspect), tx: k.tx, ty: k.ty, tz: k.tz }, camY);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* The yard fades up inside the opening hold. Every material here is
           built at opacity 0, so this is not a flourish — without it nothing is
           ever drawn. */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        mats.livery.forEach((m) => { m.opacity = solid; });
        mats.hero.forEach((m) => { (m as THREE.MeshStandardMaterial).opacity = solid; });
        // a transparent mesh still casts a full shadow, so the shadow would
        // otherwise be on the hardstand before the containers are
        shadowMat.opacity = 0.44 * solid;
        setGroundOpacity(ground, solid);

        /* The sweep, and the grid coming up behind it.

           These are ONE gesture, not two: the sweep's own progress drives the
           grid's opacity, so the grid is not "animated in" on a timer that
           happens to overlap — it appears BECAUSE the sweep passed. That is the
           difference between a survey and a wipe.

           The grid then STAYS for the rest of the loop. That is the whole of
           "ONE-TIME SURVEY": the yard is measured once and everything after
           runs on the result. At the wrap it returns to 0 with p, which is
           correct — a loop must not leave state behind. */
        const sweepProgress = clamp01((p - SWEEP_IN) / (SWEEP_OUT - SWEEP_IN));
        const sweepVis = p < SWEEP_IN || p > SWEEP_OUT
          ? 0
          : smoothstep(SWEEP_IN, SWEEP_IN + 0.02, p) * (1 - smoothstep(SWEEP_OUT - 0.03, SWEEP_OUT, p));
        /* The wave rides `solid` as well as its own window, so it cannot flash
           boxes that have not finished fading up — during the opening settle
           that would light containers that are still translucent. */
        yard.flashWave(sweepAt(p), solid * sweepVis);
        mats.grid.opacity = solid * 0.78 * easeInOut(sweepProgress);

        /* The proposed slot. Pulses while its window is open — the one thing in
           this scene that is a RECOMMENDATION rather than a fact, and a steady
           fill would read as "occupied", which is the opposite of what it says.
           1.6 Hz against the loop, slow enough to read as breathing. */
        const slotOn = inWin(p, W_SLOT)
          ? smoothstep(W_SLOT[0], W_SLOT[0] + 0.03, p) * (1 - smoothstep(W_SLOT[1] - 0.04, W_SLOT[1], p))
          : 0;
        const pulse = 0.72 + 0.28 * Math.sin(t * 1.6 * Math.PI * 2);
        /* 0.5, up from 0.2. The slot is a flat quad lying on near-black
           hardstand and seen at 45 degrees, so it is heavily foreshortened —
           at 0.2 it read as a smudge and the outline did all the work, which on
           WebGL means a 1px hairline (linewidth is not supported, so an outline
           can never carry a shape on its own here). The FILL has to be the
           thing that reads, and the outline only sharpens its edges. */
        mats.slotFill.opacity = solid * 0.66 * slotOn * pulse;
        mats.slotEdge.opacity = solid * 1.0 * slotOn;

        /* The located box. The bracket is live only across its own window — the
           same window that gates its label, so the mark and the words arrive
           and leave together. */
        tracker.follow(inWin(p, W_LOCATE) ? yard.located : null, camera);
        dm.warn.opacity = solid;

        /* ---- labels ---- */
        const place = (c: Callout, win: [number, number]) => {
          const vis = frozen
            ? (win === W_LOCATE ? 1 : 0)
            : (inWin(p, win)
              ? smoothstep(win[0], win[0] + 0.035, p) * (1 - smoothstep(win[1] - 0.05, win[1], p))
              : 0);
          /* Bounds are the OVERLAY's height, not the canvas's — the canvas
             bleeds past the slot by `bleed` at top and bottom and the overlay
             does not, so a label placed against canvas height drifts off the
             thing it points at. Same correction as the other flagships. */
          const r = vis > 0.01 ? project(c.local, c.normal, w, h) : null;
          placeCallout(c, r ? { sx: r.sx, sy: r.sy - bleed } : null, vis, w, h - bleed * 2);
        };
        place(survey, W_SURVEY);
        place(slotLabel, W_SLOT);
        place(locateLabel, W_LOCATE);

        // nothing on screen during the opening hold
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.2, 0.9, t));

        if (bloom) bloom.strength = 0.18 + 0.16 * sweepVis;
      };

      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame below. On a cold browser session, priming one frame
         alone still left a ~1.3s task landing mid-scroll, because a scene whose
         materials come and go across the loop compiles them the first time they
         are actually drawn. See PERFORMANCE.md #36. */
      /* AND THE PRIMED FRAME WAITS FOR IT. The first version fired compileAsync
         and primed on the very next animation frame, so the primed draw raced the
         async compile and just compiled synchronously whatever it needed — which
         is the blocking path compileAsync exists to avoid.

         Measured on this machine the race costs almost nothing: compileShader and
         linkProgram together total 2ms across four scenes, because ANGLE has
         KHR_parallel_shader_compile and the driver caches translated programs on
         disk. Kept anyway, because that number is a property of THIS GPU and
         driver, not of the code — shader compile is the classic cost that appears
         on a machine you did not test on.

         `compiled` gates drawing entirely, so the guard below matters: a promise
         that rejects or never settles must not leave a scene permanently blank. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      /* Prime ONE frame even off screen: the first draw is where textures upload
         and the remaining programs link, and the onScreen gate below would
         otherwise defer that to the frame the visitor arrives on. Exactly one —
         after this the gate resumes and an off-screen scene costs nothing. */
      let primed = false;
      const MIN_DT = 1 / 46;
      let last = -1;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        // nothing is drawn until every program is linked — see markCompiled
        if (!compiled) return;
        if (!onScreen) {
          /* One warm draw off screen — texture upload and remaining first-use
             waits — then nothing until arrival. The clock deliberately does NOT
             start here: it starts on the first ON-SCREEN frame, so every
             visitor sees the intro from frame one. Priming used to start it,
             and by the time anyone scrolled here the opening was long gone. */
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
        mats.dispose();
        // the container skins are cached and shared; these are this scene's own
        yard.owned.forEach((g) => g.dispose());
        dm.all.forEach((m) => m.dispose());
        ground.material.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[yard-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "yard-vision");
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

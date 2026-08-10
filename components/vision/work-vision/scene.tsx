"use client";

/* ---------------------------------------------------------------------------
   Work Vision — one person, three cameras, three PLACES, one identity.

   THREE ACTS, HARD CUTS. This used to be one racking aisle with three pole
   cameras firing as one figure crossed all three in sequence. The rebuild
   makes literal what that scene was always gesturing at: three separate
   fixed cameras, in three separate places on the site, cut between like a
   video management system — the same person seen by each in turn, so by the
   third act the viewer realises he has been tracked across all of them.

   The camera is BOLTED DOWN within each act, exactly as before, and the cut
   between acts is a HARD CUT — a hard swap of pose and dressing on an exact
   act boundary, never an animated move. A VMS does not pan between cameras.

     "Nobody stops. Nobody even notices."
        -> the walk is LINEAR in every act. No ease-in at a frame edge, no
           pause under a camera.
     "No cards to tap, no scanners to use, no habit to change."
        -> no reader, no turnstile, no barrier, in any act.
     "one person seen from several cameras resolving to one identity, above a
      live shift register"
        -> three acts, three callouts, one escalating shift register that
           accumulates a row per act, and a resolve line in the last beat of
           act 3.
     "Entry and exit written to the second, without a checkpoint."
        -> each act's register row writes itself while the walker is still
           moving through that act.

   THE COLOUR GRAMMAR. Blue (#5CC8FF) is the system observing: all three
   acts' cones, every bracket, the callout title, the register, the resolve
   line. No orange anywhere — nothing here fails, nothing is flagged.

   Every graphic carries `toneMapped: false`. Fills its parent. Not
   scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, placeCamera, smoothstep } from "../_vision/camera";
import { createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { createTracker } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import {
  GROUND_Y, buildWork, buildWorkMaterials, WALK_FROM, WALK_TO, walkerX,
} from "./work";

/* 13.5s total, three equal 4.5s acts. Long enough per act for a 1.6 m/s walk
   to clear the frame and for a read to land without being a flash. */
const ACT_DUR = 4.5;
const LOOP = ACT_DUR * 3;
/* The PAGE intro, in seconds of absolute elapsed time — the one and only fade
   up of the set, paid once when the section first comes on screen. It is NOT
   per act: see the long note at `solid` in applyFrame for why a per-act ramp
   was removed (it made every hard cut open on a near-black frame, which is the
   opposite of how a VMS cut reads). */
const SETTLE = 0.9;

/* Reduced-motion still frame: parked in the last beat of act 3, where the
   callout has resolved, the register carries all three rows and the resolve
   line is up — the one frame that states the section's outcome on its own. */
const FROZEN_T = 12.7;
const FROZEN_P = FROZEN_T / LOOP;

/* =========================== THE THREE ACTS ===========================
   One camera pose per act, held fixed for the whole act — a pure hard cut,
   never animated. `dir` is the walk direction for that act (+1 = left to
   right, -1 = right to left — act 2 runs backwards on purpose, so the cut
   reads as a different camera before the viewer even parses the dressing).

   THE ARITHMETIC EACH POSE SHARES, carried over unchanged from the original
   single-aisle solve: fov is 30 deg VERTICAL (studio's PerspectiveCamera), so
   frame world-height at distance d is H = 2*d*tan(15deg) = 0.535898*d, and
   the figure's crown (1.815) sits at 1.815/H of frame height. Act 1 keeps the
   original d = 7.50 (44.5% of frame height, "roughly 45%" per the original
   brief); acts 2 and 3 are pulled in a little tighter (act 3 explicitly
   "lower/closer" per spec) — closer cameras are a real difference between
   dock/pack-line CCTV and an aisle mast, not just restaging the same shot. */
/* `tx` PULLED IN, 0.45 / -0.55 / 0.35 -> 0.18 / -0.20 / 0.14. The original
   offsets existed to slide the subject clear of a corner housing prop that no
   longer exists. At mid-act the walker stands at x = 0 by construction, so
   0.45 put him ~30% of the frame's half-width off centre and, in act 1, into
   the left edge — the framing read as accidental rather than composed. */
const ACTS = [
  {
    // ACT 1 — racking aisle.
    az: 0.10, dRef: 7.50, elevDeg: 6, tx: 0.18, ty: 1.50, tz: 0, dir: 1,
  },
  {
    // ACT 2 — inbound dock, opposite direction.
    az: -0.14, dRef: 6.9, elevDeg: 7, tx: -0.20, ty: 1.55, tz: 0, dir: -1,
  },
  {
    // ACT 3 — pack line, lower and closer.
    az: 0.18, dRef: 6.1, elevDeg: 4, tx: 0.14, ty: 1.32, tz: 0, dir: 1,
  },
] as const;

const REF_ASPECT = 16 / 9;
/** Same aspect-compensation discipline as the original single-pose scene:
    a narrower canvas pulls the camera back rather than cropping the frame. */
const fitD = (aspect: number, dRef: number) =>
  dRef * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.2);

/** Act index (0/1/2) and that act's own local phase (0..1), pure functions
    of the loop phase p — no accumulated state, so a `?phase=` pin is always
    self-consistent. */
const actOf = (p: number) => Math.min(2, Math.floor(p * 3));
const actPhase = (p: number, act: number) => p * 3 - act;

/** Walker x for a given act's local phase q, honouring that act's direction. */
const walkerXFor = (dir: 1 | -1, q: number) => (dir === 1 ? walkerX(q) : lerp(WALK_TO, WALK_FROM, q));
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/* Walker's on-screen window in an act's own local phase.

   TIGHTENED from [0.135, 0.918]. That range was derived against the original
   single-aisle camera; the act poses are closer, so the walker leaves frame
   sooner than it assumed. Checked at p = 0.29 (act phase 0.87) he was fully
   off the right edge with his detection bracket still up and tracking him
   into the void — which reads as the system marking something that is not
   there. [0.17, 0.83] fades the read out while he is still in shot. */
const WALK_WIN: [number, number] = [0.17, 0.83];

/** Ramp a value up at a window's open and down at its close. */
const win = (p: number, w: [number, number], inPad = 0.03, outPad = 0.04) =>
  smoothstep(w[0], w[0] + inPad, p) * (1 - smoothstep(w[1] - outPad, w[1], p));

const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

/* ---- the payoff copy, exact ---- */
const ACT_COPY = [
  { title: "Person detected", detail: "cam 04 · aisle 7 · 09:14:02 — first sighting" },
  { title: "Same person · 0.96", detail: "cam 11 · inbound dock · 09:22:41 — 2nd sighting" },
  { title: "Same person · 0.97", detail: "cam 19 · pack line 2 · 09:31:18 — 3rd sighting" },
] as const;
const REG_ROWS = [
  "CAM 04 · AISLE 7 · 09:14:02",
  "CAM 11 · INBOUND DOCK · 09:22:41",
  "CAM 19 · PACK LINE 2 · 09:31:18",
] as const;
const RESOLVE_TEXT = "ONE IDENTITY ACROSS 3 CAMERAS · OPERATIVE W-2291";

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
    return mountWhenVisible(wrap, () => {
    let cleanup = () => {};

    try {
      const studio = createStudio(wrap, {
        floorY: GROUND_Y, shadowExtent: 6, spread: 1.4, bare,
        /* 0.86, down from 1.05. Reviewed after the pendant landed: with a
           practical throwing 6+ at the aisle floor ON TOP of the five-source
           rig, the scene was over-lit — the racking, the cartons and the
           floor all sat near the top of the tone curve, which is the value
           ladder collapsing from the other direction to the one this file
           usually fights. Dropping exposure rather than the lamp keeps the
           lamp's POOL (which is the thing motivating the frame) and takes
           the ambient down around it. */
        maxDpr: 1.75, shadowMapSize: 1024, exposure: 0.86,
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
      scene.add(model.fixed2);
      scene.add(model.fixed3);
      for (const g of model.envActs) scene.add(g);
      /* NO CAMERA-LOCKED CORNER PROPS. Three small housings used to be
         parented to the render camera's transform so one sat in a screen
         corner per act. Removed on review: a prop pinned to the lens does not
         belong to the world it is supposedly mounted in — it slides over the
         scene as a decal, casts no shadow into it, and at the size it drew it
         read as an unidentifiable dark shape rather than as equipment.
         Cargo Vision's read camera is the model to follow instead: a real
         object, on a real pole, standing in the scene at the place the read
         actually happens. All three acts now have one, built from the SAME
         spec (work.ts's `makeActCam`) and differing only in the mount: a rack
         clamp, a dock-wall arm, a ceiling stem. */

      /* ---- fog: same colour, same idea, every act ----
         #0A0B0E is PALETTE.bgBottom, the backdrop's own bottom stop, so a
         surface that fogs out dissolves INTO the page rather than fading to
         a grey box on it. NEAR/FAR held at the original values: every act's
         camera sits in the same rough distance band as the one this was
         tuned against, and the fog exists to hide the floor slab's own far
         edge, not to grade any one act's set dressing precisely. */
      scene.fog = new THREE.Fog(PALETTE.bgBottom, 6.0, 26.0);

      /* ---- the floor: a drafting sheet on the slab, shared by every act ----

         OPACITY HALVED, 0.12 -> 0.06, AND THE REASON IS THAT THE FLOOR IS A
         FLOOR NOW. The drafting grid is the site's language for "a measured
         space" and it belongs here — but at 0.12 over three acts it was the
         strongest thing on the ground plane, so a warehouse slab read as a
         diagram someone had put objects on. Review called it "floor grid
         confusing", and that is what it was confusing WITH: the concrete's own
         expansion joints, which are on a 2.4m pitch, crossing a 1m grid.

         Driven at the CALL SITE, on this scene's own instance. `draftingGround`
         is shared with the hero cards and every other dark scene; the number
         that is right for a card at 320px is not the number that is right for a
         13-unit warehouse frame, and this is exactly the parameter the builder
         exposes so a scene can say so without touching the shared file. */
      const ground = draftingGround({
        size: 64, y: GROUND_Y - 0.018, step: 1,
        color: PALETTE.grid, opacity: 0.06, glow: 2.2, majorBoost: 2.2,
        fadeStart: 0.24, fadeEnd: 0.62,
      });
      ground.mesh.renderOrder = -3;
      scene.add(ground.mesh);

      /* ---- the sight cones — one per act, because one rig per act ----
         A cone belongs to a LENS. All three acts now have a real rig standing
         in their own place, so all three throw one; a beam with no visible
         source would be the same decal problem the corner props had. */
      /* THE CONE TRACKS THE WALKER. It used to be aimed ONCE, here at build
         time, at a fixed point on the floor — so it was a static wedge of
         light the subject happened to walk through, and it could not do the
         one thing a sight cone is for: show that the camera is FOLLOWING
         something.

         Cargo Vision's read camera is the reference and this now matches it:
         re-aim every frame at the subject's chest, with the half-angle
         re-derived from the live apex->target range so the cone's footprint
         on the subject stays constant instead of fanning wider as he walks
         away down the aisle. Same correction, same reason, same house
         standard — see docs/09-scene-craft-and-learnings.md.

         CONE_HALF_ANGLE is now a FLOOR rather than the value: at the far end
         of the walk the range is long enough that a constant footprint would
         ask for a needle-thin cone, which reads as a laser rather than a
         field of view.

         Migrated onto the shared read-camera rig (see work.ts): the housing,
         the cone, the apex-from-live-glass read, and the CONE_FOOT/
         CONE_HALF_ANGLE half-angle formula all now live in `model.readCam`,
         built once in work.ts. This call site only says WHERE to look —
         `model.readCam.aimAt(coneAim)` re-points the head and re-throws the
         cone in one call, same as cargo-vision's call site. */
      /* TWO CONES NOW, ONE AT A TIME. Acts 1 and 2 each have a real camera in
         the world and each throws its own cone; act 3 still has neither. Both
         cone groups live in the scene permanently and the per-frame block
         below gives the ACTIVE act's cone the opacity and zeroes the other —
         a cone group is not gated by `.visible` like dressing is, because its
         opacity is already the thing being ramped and two ways of hiding the
         same object is how one of them gets forgotten. */
      scene.add(model.readCam.coneGroup);
      scene.add(model.readCam2.coneGroup);
      scene.add(model.readCam3.coneGroup);
      const coneAim = new THREE.Vector3();

      /* ---- the detection bracket, one tracker for all three acts ----
         CRITICAL: every subject material ramps opacity (transparent: true),
         which puts the walker in three's transparent queue where draw order
         is per-object distance sorting — the figure CAN paint over the
         bracket intermittently unless the bracket's own renderOrder wins
         explicitly and frustumCulled is off on every mesh (a Group's
         renderOrder does not propagate to children; must traverse()). */
      /* depthTest FALSE, and renderOrder alone was not enough.

         Reviewed at act 1: the bracket's bottom-right corner was missing
         whenever a foreground pallet stood between the lens and the walker's
         feet. renderOrder controls DRAW ORDER, not the depth test — the
         carton is nearer, it writes depth, and the bracket bars behind it
         fail the test however late they are drawn. Crane Vision reached the
         identical conclusion for the identical symptom.

         These are OVERLAY marks: ink drawn over the world, not surfaces in
         it. A detection box that a passing pallet can eat is worse than no
         box, because the viewer reads the gap as the system losing track. */
      const brkMat = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false, depthTest: false, fog: false,
      });
      const tracker = createTracker(brkMat, { pad: 1.20 });
      /* PER MESH — a Group's renderOrder does NOT propagate to its children
         in three.js, so setting it on the group alone did nothing. Same trap,
         same fix, as crane-vision's brackets. */
      tracker.group.traverse((o) => { o.renderOrder = 10; o.frustumCulled = false; });
      tracker.group.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.renderOrder = 10;
          o.frustumCulled = false;
        }
      });
      scene.add(tracker.group);

      /* ---- one callout per act, same anchor, escalating text ----
         Three separate DOM callouts rather than one whose text is mutated:
         each is only ever on screen during its own act (win gates it, plus
         the act-index check below), so there is never ambiguity about which
         one a viewer is reading. */
      const idents = ACT_COPY.map((c, i) => createCallout(overlay, {
        title: c.title,
        detail: c.detail,
        pos: model.headAnchor.clone(),
        normal: new THREE.Vector3(0, 0.35, 1).normalize(),
        onDark: true,
        lane: { dir: "up", len: 76 },
        win: [0, 1],
      }));
      wmark("callouts");

      /* ---- the shift register: ONE ROW PER ACT, accumulating ----
         Plain DOM, fixed lower-left. Each row's opacity is a pure function
         of the CURRENT loop phase p (via its own act-relative write window),
         never an incremented counter — a `?phase=` pin must freeze the loop
         on a self-consistent register, and an accumulator would run away or
         simply never fire outside the normal RAF loop. */
      /* THE REGISTER GETS A PLATE, AND IT HAS TO.

         It was 10px at 42% alpha and 13px accent, unbacked, sitting bottom
         left — which was fine over the old near-black aisle and is not fine
         now. Act 1 has a lit floor, a warm pool from the pendant and pallets
         of pale cardboard behind it, and the register was reported as
         unreadable: the text crossed four different backgrounds along its own
         length, so no single ink value could work against all of them.

         Contrast has to come from the READOUT, not from luck about what is
         behind it. A dark plate at 62% with a hairline edge gives every row
         the same ground to sit on regardless of what the scene does. This is
         the one place a plate is right — the counter in cargo deliberately
         refuses one because it is display type at 72px, which needs no help;
         13px mono over a lit warehouse does.

         Sizes up with it (10 -> 11.5, 13 -> 14) and the ink goes to near
         solid, because the plate lets it. */
      const reg = document.createElement("div");
      reg.style.cssText =
        `position:absolute;left:30px;bottom:28px;pointer-events:none;`
        + `background:rgba(6,9,14,0.62);border:1px solid rgba(226,234,244,0.14);`
        + `border-radius:3px;padding:12px 16px 13px;backdrop-filter:blur(3px);`;
      const regHead = document.createElement("div");
      regHead.textContent = "SHIFT REGISTER";
      regHead.style.cssText =
        `font-family:${MONO};font-size:11.5px;letter-spacing:0.24em;color:rgba(255,255,255,0.72);padding-bottom:10px;opacity:0;transition:opacity .35s ease;`;
      reg.appendChild(regHead);
      const regRows = REG_ROWS.map((text) => {
        const row = document.createElement("div");
        row.textContent = text;
        row.style.cssText =
          `font-family:${MONO};font-size:14px;letter-spacing:0.06em;color:#FFFFFF;`
          + `border-left:2px solid ${PALETTE.accent};padding-left:12px;line-height:1.55;margin-top:6px;opacity:0;transition:opacity .35s ease;`;
        reg.appendChild(row);
        return row;
      });
      overlay.appendChild(reg);

      /* ---- the resolve line — the payoff, its own element ----
         Distinct register in the same visual family as the shift register
         (mono, the accent colour) but placed top-centre so it can never
         collide with either the register (bottom-left, fixed) or a callout
         (welded to the walker, which by the last beat of act 3 sits well
         right of centre — see the callout window below). Only ever visible
         in the closing ~1.2s of act 3. */
      const resolve = document.createElement("div");
      resolve.textContent = RESOLVE_TEXT;
      resolve.style.cssText =
        `position:absolute;left:50%;top:36px;transform:translateX(-50%);opacity:0;`
        + `font-family:${MONO};font-size:13px;font-weight:600;letter-spacing:0.14em;color:${PALETTE.accentText};`
        + `background:rgba(3,5,9,0.82);border:1px solid rgba(92,200,255,0.45);border-radius:3px;`
        + `padding:9px 18px;white-space:nowrap;pointer-events:none;`;
      overlay.appendChild(resolve);

      const ro = new ResizeObserver(studio.size);
      ro.observe(wrap);

      let onScreen = true;
      const visObs = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "200px" },
      );
      visObs.observe(wrap);

      const clock = new THREE.Clock(false);
      let clockStarted = false;

      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

      const target = new THREE.Vector3();
      const wpos = new THREE.Vector3();
      const ONE = new THREE.Vector3(1, 1, 1);
      let raf = 0;

      const project = makeProjector(camera, model.root);

      /* ---- REVIEW INSTRUMENT: `?debug=1` -----------------------------------

         Publishes the live scene graph on `window.__work` so a reviewer can
         ask what is actually on screen instead of inferring it from a
         screenshot. This exists because "what is the block that is appearing
         on all of the screens" was answered twice by guessing, and both
         guesses were wrong.

         `list(act)` returns every visible mesh with its name, its world
         position and — the part that settles the question — its projected
         canvas rectangle, so an object can be matched to a shape in the
         picture by coordinates rather than by opinion. `hide(name)` toggles
         one off, which identifies anything the coordinates leave ambiguous.

         Query-gated: one string check at build and nothing in the frame loop.
         The `scene` reference is only reachable when the flag is on. */
      const DEBUG = new URLSearchParams(location.search).get("debug") === "1";
      if (DEBUG) {
        const box = new THREE.Box3();
        const v = new THREE.Vector3();
        (window as unknown as Record<string, unknown>).__work = {
          scene,
          camera,
          list: () => {
            const w = renderer.domElement.clientWidth;
            const h = renderer.domElement.clientHeight;
            const out: unknown[] = [];
            scene.traverse((o) => {
              if (!(o instanceof THREE.Mesh) || !o.visible) return;
              let p: THREE.Object3D | null = o.parent;
              while (p) { if (!p.visible) return; p = p.parent; }
              box.setFromObject(o);
              if (box.isEmpty()) return;
              const pts: number[][] = [];
              for (const cx of [box.min.x, box.max.x])
                for (const cy of [box.min.y, box.max.y])
                  for (const cz of [box.min.z, box.max.z]) {
                    v.set(cx, cy, cz).project(camera);
                    pts.push([(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h]);
                  }
              const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
              // walk up for the nearest NAMED ancestor — the groups carry the
              // names, so this reports which subsystem a mesh belongs to
              let owner = o.name;
              let a: THREE.Object3D | null = o.parent;
              while (!owner && a) { owner = a.name; a = a.parent; }
              out.push({
                name: owner || "(unnamed)",
                geo: o.geometry.type,
                world: [+o.position.x.toFixed(2), +o.position.y.toFixed(2), +o.position.z.toFixed(2)],
                px: [Math.round(Math.min(...xs)), Math.round(Math.min(...ys)),
                     Math.round(Math.max(...xs)), Math.round(Math.max(...ys))],
              });
            });
            return out;
          },
          hide: (name: string) => {
            let n = 0;
            scene.traverse((o) => { if (o.name === name) { o.visible = false; n++; } });
            return n;
          },
        };
      }

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        const act = actOf(p);
        const q = actPhase(p, act);
        const A = ACTS[act];

        /* ---- 1. the walk, direction per act ---- */
        const cx = walkerXFor(A.dir as 1 | -1, q);
        model.root.position.x = cx;
        // mirror the figure's profile yaw for the reverse-direction act, so
        // "different camera" reads instantly rather than as a moonwalk
        model.figure.rotation.y = A.dir === 1 ? Math.PI / 2 : -Math.PI / 2;
        model.walk(t);
        model.root.updateMatrixWorld(true);
        model.fixed.updateMatrixWorld(true);
        model.fixed2.updateMatrixWorld(true);
        model.fixed3.updateMatrixWorld(true);

        /* ---- 2. camera: one pose per act, HARD CUT, never animated ---- */
        const elev = (A.elevDeg * Math.PI) / 180;
        const d = fitD(w / h, A.dRef);
        const camY = A.ty + d * Math.sin(elev);
        placeCamera(camera, { az: A.az, rad: d * Math.cos(elev), tx: A.tx, ty: A.ty, tz: A.tz }, camY);
        target.set(A.tx, A.ty, A.tz);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- 4. env dressing: exactly one act's set is visible ---- */
        model.envActs[1].visible = act === 0;
        model.envActs[2].visible = act === 1;
        model.envActs[3].visible = act === 2;
        /* `model.fixed` is act 1's own pole-mounted camera (the aisle mast
           the sight cone is aimed from) and was being added to the scene
           unconditionally, so it kept standing in shot — dead centre, as it
           happens — through acts 2 and 3 as well. Confirmed on screen at
           phase 0.50: a pole and camera head hanging in the middle of the
           inbound-dock frame that has nothing to do with that act. It is
           act 1's set dressing, so it toggles with everything else in
           envActs[1]. */
        model.fixed.visible = act === 0;
        /* Act 2's wall-mounted rig, gated the same way and for the same
           reason. Both rigs are equipment rather than dressing, so they sit
           beside envActs rather than inside them, but the visibility rule is
           identical: exactly one act's hardware is ever in shot. */
        model.fixed2.visible = act === 1;
        model.fixed3.visible = act === 2;

        /* ---- 5. THE INTRO IS ONCE, ON MOUNT — NOT ONCE PER ACT ----

           A HARD CUT LANDS ON A CAMERA THAT IS ALREADY LIVE. This ramp used to
           run off `q`, the act's OWN local phase, on the reasoning that every
           hard cut should open on an empty-feeling frame the way the original
           single-aisle scene opened. Measured on screen at p = 0.345 — 0.16s
           past the act-1 -> act-2 boundary — the frame was almost entirely
           black: nothing but the register. The dock then materialised over the
           next second, and the pack line did it again 4.5s later.

           That contradicts the grammar this file states at the top. A video
           management system cutting to camera 11 does not fade camera 11 up;
           the dock has been standing there, lit, all shift. Three fades per
           loop also make the act boundary read as a transition effect rather
           than as a cut, which is the one thing a VMS cut must not look like.

           So SETTLE now runs off ABSOLUTE ELAPSED TIME. It is the page intro
           and nothing else: one 0.9s fade-up when the section first comes on
           screen, after which `solid` is pinned at 1 for the rest of the
           session and every act boundary — including the loop's own wrap from
           act 3 back to act 1 — arrives fully dressed on its first frame.

           WHAT THIS CARRIES WITH IT, because `solid` is the multiplier on all
           of them: every material in mats.all, the paint stripes, the walkway
           lines, the skylights, the shadow catcher, the drafting ground, the
           three remaining pendant ramps (act 2's, and act 3's two — act 1 no
           longer has one) AND their PointLight intensities, the cone opacity
           and the bracket. The lamp
           gates are `act === n ? solid : 0`, so with solid pinned at 1 the
           active act's lamp is at full intensity on the boundary frame rather
           than ramping in behind the dressing — that was the second half of
           the same defect and it is fixed by the same line.

           THE WALKER STILL ENTERS LATE and that is correct: he is gated by
           WALK_WIN on the act's own phase, not by `solid`, because a person
           walking into shot is the subject arriving, not the set arriving.
           Nothing here pulses — this removes a ramp, it does not add an
           effect. */
        const solid = frozen ? 1 : easeInOut(clamp01(t / SETTLE));
        for (const m of mats.all) (m as THREE.Material & { opacity: number }).opacity = solid;
        mats.paint.opacity = solid * 0.38;
        /* THE TWO NEW BY-NAME MATERIALS. Both are deliberately outside
           `mats.all` because both need a multiplier of their own, and both
           would be pinned at 1 by the sweep above if they were in it — which
           for the skylights means two white rectangles in the roof.

           0.70 ON THE WALKWAY LINES, UP FROM 0.55, AND THE LIGHT IS WHY IT HAD
           TO GO UP RATHER THAN DOWN. `lineY` is a MeshBasicMaterial with
           toneMapped false, so the paint's own value is FIXED — it does not
           see act 1's new daylight at all. The floor under it does. So the
           light that fixes the "too dark" note also cuts the line's contrast
           against its own background, and the line was already reported
           marginal at the darker exposure.

           The composite is line*a + floor*(1-a). #8F7A1E has a relative
           luminance of 0.198, so against a slab sitting near 0.05:

             a = 0.55  ->  0.55*0.198 + 0.45*0.05 = 0.1315   (2.6x the floor)
             a = 0.70  ->  0.70*0.198 + 0.30*0.05 = 0.1536   (3.1x the floor)

           and the brighter the floor gets, the more the 0.55 version washes
           out — at a floor of 0.09 it falls to 2.1x while 0.70 holds 2.0x of
           a much larger absolute gap. 0.70 it is. The alpha MAP then varies it
           0.78..1.00 along the run, so the line lands between 0.55 and 0.70 —
           the old flat value is now this line's worn FLOOR rather than its
           peak, which is the right way round for paint.

           0.10 on the skylights is unchanged: they are motivation, not a light
           source the renderer knows about (act 1's PointLight below is the
           light they motivate). NOTHING PULSES — these two lines are the
           entire drive for both. */
        mats.lineY.opacity = solid * 0.70;
        mats.sky.opacity = solid * 0.10;
        shadowMat.opacity = 0.5 * solid;
        setGroundOpacity(ground, solid);

        /* ---- act 1's DAYLIGHT, THROUGH THE ROOF ----
           NO FIXTURE, SO NO MATERIAL RAMP — this is the one light in the scene
           with nothing to fade up, because the object motivating it (the two
           skylight strips in the roof) is dressing in env1 and is already
           carried by the mats.sky drive above. Two lines instead of five.

           The pendant that used to be driven here is gone from work.ts: act 1
           is a 3.9m-clear aisle and a single practical at 2.55 over the walk
           line was the wrong fixture for that height, as well as the one thing
           in act 1 competing with the walker's head. Removing it cost the
           floor ~4.0 of illuminance and the frame went too dark, which is what
           this replaces — at a deliberately lower 3.0, because the job is
           filling the frame back up, not reinstating a practical.

           42.3 IS DERIVED, NOT PICKED: 3.0 target x 3.60^2 throw, divided by
           the 0.91967 windowing term three.js applies at distance 8.0. The
           full arithmetic, and why D = 8.0 makes it die before the back wall
           at z = -9.5, is in work.ts at the light itself.

           GATED ON act === 0, and that gate is the load-bearing half exactly
           as it is for acts 2 and 3: `env1.visible = false` does NOT switch a
           light off in three.js, so an ungated act-1 daylight would be pouring
           through the dock's roof and the pack room's ceiling. It multiplies
           `solid` like every other lamp, so it arrives at full strength on the
           first frame of the act — a VMS cut lands on a camera already live —
           and it does not pulse, ramp or flicker. */
        model.dayLight.intensity = (act === 0 ? solid : 0) * 42.3;

        /* ---- act 2's pendant, over the dock walk line ----
           The FIRST practical in the loop now that act 1 has none. Its drop is
           2.55 to the apron, so 26 at decay 2 delivers 26/2.55^2 = 4.0 —
           just under the studio key box's 5.6, which reads as a lamp
           contributing to a lit room rather than as a lamp that IS the room.

           DRIVEN BY NAME, not by the mats.all sweep above: the lamp's
           materials are owned by the shared builder and are not in this
           scene's material list, so a lamp left to that sweep would sit at
           opacity 0 forever and its PointLight at intensity 0 — the exact
           defect cargo-vision shipped once. The PointLight gate is the
           load-bearing half: env2.visible = false does NOT switch a light off
           in three.js, so an ungated lamp2 would light the racking aisle and
           the pack line from a fitting neither act contains. */
        const lamp2On = act === 1 ? solid : 0;
        model.lamp2.shade.opacity = lamp2On;
        model.lamp2.bulb.opacity = lamp2On;
        model.lamp2.halo.opacity = lamp2On * 0.55;
        model.lamp2.beam.opacity = lamp2On * 0.085;
        model.lamp2.light.intensity = lamp2On * 26;

        /* ---- act 3's two task pendants over the pack benches ----
           Same drive again, gated on act === 2, and the PointLight gate is
           the load-bearing half for the third time: TWO ungated lights here
           would be lighting the racking aisle and the dock from fittings
           neither act contains, and two is harder to spot than one because
           the result just looks like the scene being slightly too bright.

           20.4, not 26 — these are small fittings whose light sits 2.08 above
           the slab rather than high bays 2.35 above theirs. 4.71 * 2.08^2 =
           20.38 reproduces act 1's illuminance at the floor; see work.ts for
           the full derivation and for why these moved off the benches. */
        const taskOn = act === 2 ? solid : 0;
        for (const tl of model.taskLamps) {
          tl.shade.opacity = taskOn;
          tl.bulb.opacity = taskOn;
          tl.halo.opacity = taskOn * 0.55;
          tl.beam.opacity = taskOn * 0.085;
          tl.light.intensity = taskOn * 20.4;
        }

        /* ---- 6. the read: cone (acts 1 and 2) + bracket (every act) ---- */
        const walkOn = win(q, WALK_WIN);
        /* ACTS 0 AND 1 HAVE A CAMERA IN THE WORLD, ACT 2 DOES NOT (yet). The
           cone belongs to a real lens: an act with no rig in shot must not
           grow a beam out of nowhere, which is what a bare `solid * 0.30 *
           walkOn` would do here. `coneOn` therefore stays 0 through act 3,
           and the bloom lift at the bottom of this function reads the same
           value, so it can never brighten for a cone that is not drawn. */
        /* ALL THREE ACTS CARRY A CONE NOW. Each act has a real rig standing
           in its own place, so item 2 of the docs/11 standard applies to all
           of them and the old "acts 2 and 3 carry no cone" carve-out is gone.
           It was never an aesthetic judgement — it was a description of the
           fact that those acts had no camera to throw one from. */
        const coneOn = solid * 0.30 * walkOn;
        /* re-aim at the walker's chest — see the note at createSightCone.
           THE HOUSING TURNS WITH IT: model.readCam.aimAt re-points act 1's
           camera head AND re-throws the cone from the live lens in one call,
           so the body and the sight line can never disagree — the apex-from-
           live-glass read and the CONE_FOOT/CONE_HALF_ANGLE half-angle floor
           this call site used to compute by hand now live in the rig, built
           in work.ts (see buildReadCamera's header, point 3). A camera whose
           housing stares down the aisle while its cone swings across to
           follow is worse than no camera at all. */
        /* `cx`, NOT model.figure.position.x — and this was a real bug that
           only a second phase caught.

           The walk is applied to model.ROOT (line above); `figure` is a child
           of it and only ever has its .y touched, by the gait bob. So
           `model.figure.position.x` is 0 for the whole loop, and both the cone
           and the camera head were aiming at world x = 0 permanently. It
           LOOKED like tracking, because the walker passes through x = 0 in the
           middle of every act — checked at one phase it is indistinguishable
           from working, and checked at p = 0.29 the walker was at the right
           frame edge while the cone still pointed at empty aisle on the left.

           A local position on a translated parent is not a world position. */
        /* ONE AIM POINT, BOTH RIGS. `cx` already carries the act's direction
           (walkerXFor reverses it for act 2), so the same chest-height point
           on the walk line is correct for whichever camera is live — act 2's
           head simply swings the other way, which is what selling "two
           cameras" needs it to do.

           Only the ACTIVE act's rig is re-aimed: aimAt writes the head's
           quaternion and re-throws the cone, and doing that to a hidden rig
           every frame is work whose result nobody sees. The other cone is
           driven to zero opacity explicitly rather than left at whatever it
           held when its act ended. */
        coneAim.set(cx, GROUND_Y + 1.05, 0);
        /* ONE LOOP OVER THE THREE RIGS, rather than three hand-written
           branches. The third camera is where a copy-paste chain starts
           dropping a line — the missing `lensWorld` the rig's own header
           records is exactly that failure — so the per-act difference is
           reduced to one index comparison and there is only one call to each
           method in the whole file.

           ALL THREE tick: the cone's shader animation is a pure function of
           the time it is handed, so ticking a dormant one costs a uniform
           write and guarantees it is never a frame stale on the hard cut. */
        const rigs = [model.readCam, model.readCam2, model.readCam3];
        for (let i = 0; i < rigs.length; i++) {
          const live = i === act;
          if (live) rigs[i].aimAt(coneAim);
          rigs[i].setOpacity(live ? coneOn : 0);
          rigs[i].tick(frozen ? 1.4 : t);
        }

        tracker.follow(walkOn > 0.01 ? model.figure : null, camera);
        brkMat.opacity = solid * walkOn;

        /* ---- 7. the one callout live this act, resolving on the walker ---- */
        const calloutWin: [number, number] = [0.32, 0.90];
        for (let i = 0; i < 3; i++) {
          const ident = idents[i];
          const active = i === act;
          const cvis = frozen
            ? (i === 2 ? 1 : 0)
            : (active ? win(q, calloutWin, 0.05, 0.06) : 0);
          if (cvis > 0.01) {
            const world = wpos.copy(ident.local).applyMatrix4(model.root.matrixWorld);
            const r = project(world, ident.normal, w, h);
            placeCallout(ident, r ? { sx: r.sx, sy: r.sy - bleed } : null, cvis, w, h - bleed * 2, 0.04);
          } else {
            placeCallout(ident, null, 0, w, h - bleed * 2, 0.04);
          }
        }

        /* ---- 8. the register: rows 0..act, pure function of p ----
           Row i starts writing a little before its own act's read resolves
           (0.6 of the way through act i's window) and, once written, stays
           at full opacity through the rest of the loop — the record visibly
           builds and nothing here is a counter incremented frame to frame. */
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.2, 0.9, t));
        const regHeadOn = frozen ? 1 : smoothstep(0.05, 0.20, p);
        regHead.style.opacity = String(regHeadOn);
        for (let i = 0; i < 3; i++) {
          const writeAt = i / 3 + 0.62 / 3;   // 0.62 of the way through act i
          const on = frozen ? 1 : smoothstep(writeAt, writeAt + 0.03, p);
          regRows[i].style.opacity = String(on);
        }

        /* ---- 9. the resolve line — last ~1.2s of act 3 only ---- */
        const resolveStart = 2 / 3 + (ACT_DUR - 1.2) / ACT_DUR / 3;
        const resolveOn = frozen ? 1 : smoothstep(resolveStart, resolveStart + 0.03, p);
        resolve.style.opacity = String(resolveOn);

        if (bloom) bloom.strength = 0.18 + 0.10 * coneOn;
      };

      const MIN_DT = 1 / 46;
      let last = -1;

      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      let primed = false;
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
      wmark("ready");

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        visObs.disconnect();
        idents.forEach((i) => i.wrap.remove());
        reg.remove();
        resolve.remove();
        scene.remove(tracker.group);
        scene.remove(model.readCam.coneGroup);
        scene.remove(model.readCam2.coneGroup);
        scene.remove(model.readCam3.coneGroup);
        brkMat.dispose();
        ground.material.dispose();
        // model.dispose() folds readCam.dispose() (and so the cone's own
        // materials-only dispose) in — see work.ts. Not called separately,
        // same contract as cargo-vision's cleanup.
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
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

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

   THE COLOUR GRAMMAR. Blue (#5CC8FF) is the system observing: the one cone
   act 1 keeps, every bracket, the callout title, the register, the resolve
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
import { createSightCone, createTracker } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import {
  CONE_HALF_ANGLE, GROUND_Y, buildWork, buildWorkMaterials, WALK_FROM, WALK_TO, walkerX,
} from "./work";

/* 13.5s total, three equal 4.5s acts. Long enough per act for a 1.6 m/s walk
   to clear the frame and for a read to land without being a flash. */
const ACT_DUR = 4.5;
const LOOP = ACT_DUR * 3;
const SETTLE = 0.9;      // each act's own dressing fades up over this long

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

/* Walker's on-screen window in an act's own local phase, carried over from
   the original derivation (frame edges at x = -3.30/+3.86 against a run of
   +-5.2): comfortably on/off screen at both ends regardless of which act's
   pose is live, since all three poses are close enough in scale to the
   original that the same window still clears in every one of them. */
const WALK_WIN: [number, number] = [0.135, 0.918];

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
      for (const g of model.envActs) scene.add(g);
      /* NO CAMERA-LOCKED CORNER PROPS. Three small housings used to be
         parented to the render camera's transform so one sat in a screen
         corner per act. Removed on review: a prop pinned to the lens does not
         belong to the world it is supposedly mounted in — it slides over the
         scene as a decal, casts no shadow into it, and at the size it drew it
         read as an unidentifiable dark shape rather than as equipment.
         Cargo Vision's read camera is the model to follow instead: a real
         object, on a real pole, standing in the scene at the place the read
         actually happens. Acts 2 and 3 currently have no camera in shot as a
         result; that is the honest state until each gets a real one. */

      /* ---- fog: same colour, same idea, every act ----
         #0A0B0E is PALETTE.bgBottom, the backdrop's own bottom stop, so a
         surface that fogs out dissolves INTO the page rather than fading to
         a grey box on it. NEAR/FAR held at the original values: every act's
         camera sits in the same rough distance band as the one this was
         tuned against, and the fog exists to hide the floor slab's own far
         edge, not to grade any one act's set dressing precisely. */
      scene.fog = new THREE.Fog(PALETTE.bgBottom, 6.0, 26.0);

      /* ---- the floor: a drafting sheet on the slab, shared by every act ---- */
      const ground = draftingGround({
        size: 64, y: GROUND_Y - 0.018, step: 1,
        color: PALETTE.grid, opacity: 0.12, glow: 2.2, majorBoost: 2.2,
        fadeStart: 0.24, fadeEnd: 0.62,
      });
      ground.mesh.renderOrder = -3;
      scene.add(ground.mesh);

      /* ---- act 1's one sight cone ----
         Built once, aimed once — a fixed head's fixed field of view, not a
         searchlight. Acts 2 and 3 carry no cone (see work.ts's header): a
         cone per act across three independent places added ink without
         adding read; the bracket alone already says "a machine is watching"
         in every act, and act 1 is where a held static shot benefits most
         from also showing the field of view. */
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
         field of view. */
      const sightCone = createSightCone({ color: PALETTE.accent, footprintY: GROUND_Y });
      scene.add(sightCone.group);
      const coneAim = new THREE.Vector3();
      const CONE_FOOT = 0.85;   // target footprint radius on the subject, m

      /* ---- the detection bracket, one tracker for all three acts ----
         CRITICAL: every subject material ramps opacity (transparent: true),
         which puts the walker in three's transparent queue where draw order
         is per-object distance sorting — the figure CAN paint over the
         bracket intermittently unless the bracket's own renderOrder wins
         explicitly and frustumCulled is off on every mesh (a Group's
         renderOrder does not propagate to children; must traverse()). */
      const brkMat = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false, fog: false,
      });
      const tracker = createTracker(brkMat, { pad: 1.20 });
      tracker.group.renderOrder = 10;
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
        id: `ident${i}`,
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
      const reg = document.createElement("div");
      reg.style.cssText =
        `position:absolute;left:30px;bottom:28px;pointer-events:none;`;
      const regHead = document.createElement("div");
      regHead.textContent = "SHIFT REGISTER";
      regHead.style.cssText =
        `font-family:${MONO};font-size:10px;letter-spacing:0.24em;color:rgba(226,234,244,0.42);padding-bottom:9px;opacity:0;transition:opacity .35s ease;`;
      reg.appendChild(regHead);
      const regRows = REG_ROWS.map((text) => {
        const row = document.createElement("div");
        row.textContent = text;
        row.style.cssText =
          `font-family:${MONO};font-size:13px;letter-spacing:0.06em;color:${PALETTE.accentText};`
          + `border-left:1px solid ${PALETTE.accent};padding-left:12px;line-height:1.5;margin-top:6px;opacity:0;transition:opacity .35s ease;`;
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

        /* ---- 5. intro: each act's own dressing fades up on cut ----
           SETTLE runs from the START OF THE ACT (q, not t), so every hard
           cut opens on an empty-feeling frame the same way the original
           single-aisle open did, rather than only the very first act getting
           an intro and the other two just snapping to full opacity. */
        const solid = frozen ? 1 : easeInOut(clamp01(q / (SETTLE / ACT_DUR)));
        for (const m of mats.all) (m as THREE.Material & { opacity: number }).opacity = solid;
        mats.paint.opacity = solid * 0.38;
        shadowMat.opacity = 0.5 * solid;
        setGroundOpacity(ground, solid);

        /* ---- 6. the read: cone (act 1 only) + bracket (every act) ---- */
        const walkOn = win(q, WALK_WIN);
        const coneOn = act === 0 ? solid * 0.30 * walkOn : 0;
        /* re-aim at the walker's chest — see the note at createSightCone */
        if (coneOn > 0.001) {
          coneAim.set(model.figure.position.x, GROUND_Y + 1.05, model.figure.position.z);
          const range = Math.max(model.lens.distanceTo(coneAim), 0.01);
          sightCone.aim(model.lens, coneAim,
            Math.max(CONE_HALF_ANGLE, Math.atan(CONE_FOOT / range)));
        }
        sightCone.setOpacity(coneOn);
        sightCone.tick(frozen ? 1.4 : t);

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
        sightCone.dispose();
        brkMat.dispose();
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
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

"use client";

/* ---------------------------------------------------------------------------
   Container Vision — cinematic product demo.

   Apple product-studio lighting (softbox key + strip kickers raking the edges,
   lit cyclorama, real cast shadow) with an Anduril/Palantir industrial read:
   graphite steel, one cool signal, one warm warning, precise typography.

   Opens on the container centred and alone, pushes into an autoplay loop with
   three camera stops (markings -> front damage -> roof) and loops seamlessly.
   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE, sans } from "./palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { type CamKey, clamp01, easeInOut, lerp, makeCamPath, placeCamera, smoothstep } from "../_vision/camera";
import { type Callout, type Readout, createCallout, createReadout, makeProjector, placeCallout } from "../_vision/overlay";
import { buildContainer, L } from "./container";
import { buildMaterials, makeCrackDecal, makeDentDecal } from "./materials";
import { buildHud } from "./hud";

const LOOP = 10;
const HOLD_END = 1.75;    // brief beat on the finished container, centred, alone
const ZOOM_IN = 2.25;     // then a half-second push straight into stop 1

/* Camera keyframes — a deliberate story, shot close like product film.
   Exactly three places the camera settles: the markings, the front damage,
   and the roof. Between them it is always travelling.

   The move is a PURE PAN: the camera sits at one locked height (CAM_Y) and
   aims at one locked height (TY) for the whole piece, opening push included.
   `rad` is ground distance, so closing in never slides the camera down a cone
   the way an elevation angle would. CAM_Y is set high enough that the roof
   reads from that one height — which is what lets the roof stop exist at all
   without a vertical move.

   Cyclic, with no closing key at p=1 — the path wraps straight from the last
   key back to key 0, so there is nothing for the loop to "land" on and no
   seam for a jump cut to happen at. */
const CAM_Y = 4.35; // the one and only camera height
const TY = 0.42;    // the one and only look-at height
const CAM: CamKey[] = [
  { p: 0.00, az: 0.06, rad: 5.70, t: [-1.5, TY, 0.9] },    // 1 — markings
  { p: 0.16, az: 0.16, rad: 5.45, t: [-1.34, TY, 0.9] },   //     drifting across
  { p: 0.34, az: 0.28, rad: 5.62, t: [-0.05, TY, 0.9] },   // 2 — dent + corrosion
  { p: 0.50, az: 0.41, rad: 5.29, t: [0.06, TY, 0.9] },    //     drifting
  { p: 0.66, az: 0.42, rad: 5.05, t: [0.35, TY, 0.02] },   // 3 — roof
  { p: 0.82, az: 0.57, rad: 4.80, t: [0.26, TY, 0.08] },   //     drifting back toward 1
];
// Push the subject into the right half of the frame, leaving the left clear for
// type. Applied as a camera-local slide, so framing is unaffected by the angle.
const RIGHT_BIAS = 0.3;

// The opening frame: the whole container, centred, before anything else
// happens. The camera eases out of this into the first stop.
const OPENING = { az: 0.55, rad: 9.77, tx: 0, ty: TY, tz: 0 };

const sampleCam = makeCamPath(CAM);

/* The keyframe distances were tuned against the flagship slot's 1600x680 —
   aspect 2.35. In bare mode the canvas bleeds vertically, so the aspect drops
   and, with a fixed VERTICAL fov, the horizontal field narrows and the subject
   magnifies. Scaling ground distance by how far the aspect has fallen keeps the
   framing the camera was actually designed for, at any slot shape, without
   touching a single keyframe. */
const REF_ASPECT = 1600 / 680;
const fitRad = (rad: number, aspect: number) =>
  rad * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.6);

/* Each finding gets its own leader length and direction, so labels land at
   distinct heights and never collide. A callout that still doesn't fit on
   screen (see the `fits` check in the render loop) simply fades out rather
   than being nudged off the feature it points at. */
const LANE: Record<string, { dir: "up" | "down"; len: number }> = {
  // the roof findings sit high in frame, so their leaders are short and the
  // roof dent reaches downward — a long upward leader runs them off the top
  // and the fit test drops the callout entirely
  crack: { dir: "up", len: 62 },
  "dent-top": { dir: "down", len: 64 },
  dent: { dir: "up", len: 58 },
  // rust sits low on the panel, so its callout reaches upward or it would run
  // off the bottom of frame
  rust: { dir: "up", len: 158 },
  seal: { dir: "down", len: 58 },
};

/* Each finding lives around its own shot — it fades in a little before its
   home angle and lingers a little after, rather than persisting all loop. */
const WINDOW: Record<string, [number, number]> = {
  dent: [0.28, 0.62],
  rust: [0.28, 0.62],
  crack: [0.62, 0.97],
  "dent-top": [0.62, 0.97],
  seal: [9, 9], // on the model, but it has no stop of its own
};

/** `bare` lifts the subject out of its frame: transparent canvas, no
    cyclorama, no scrim, nothing clipped. The page becomes the background and
    the container is free to overhang the section it sits in. */
export default function ContainerVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
  /* Type inset. Inside a framed picture the type hangs off the picture's own
     edge (34px). On the page it has to line up with the PAGE's text column
     instead, or it reads as a caption that missed its grid — the Viso Yard
     sheet pads 64px with a further 24px on its copy, so 88 puts the wordmark,
     the table and the headline on the same left edge as the section's own
     paragraphs. Vertical insets open up too, since there is no frame edge to
     sit tight against. */
  const PAD_X = bare ? 88 : 34;
  const PAD_TOP = bare ? 44 : 22;
  const PAD_BOTTOM = bare ? 56 : 30;
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);

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
      /* ---- studio: renderer, environment, cyclorama, shadow catcher, the
         five-light rig, shadow-only directional and restrained bloom ----
         Same cost profile as the other two flagships: maxDpr 1.75 (a flagship
         canvas is large, so DPR 2 costs four times the fragments of DPR 1 for
         a difference that does not survive at this size) and a 1024 shadow
         map (matching gate-vision; a 2048 map is four times the shadow
         fragments for a contact shadow this soft). Every other option —
         floorY, shadowExtent, spread, exposure, bloom strength/radius/
         threshold — is left at the studio default because this scene's
         previous inline values were already identical to it. */
      const studio = createStudio(wrap, { bare, maxDpr: 1.75, shadowMapSize: 1024 });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject ---- */
      const mats = buildMaterials();
      const container = buildContainer(mats.steel, mats.dark, mats.front.material);
      container.group.position.y = 0.15;
      scene.add(container.group);
      const edgePos = container.edges.geometry.getAttribute("position");
      const edgeCount = edgePos ? edgePos.count : 0;
      const edgeMat = container.edges.material as THREE.LineBasicMaterial;

      const hud = buildHud();
      container.group.add(hud.group);

      const decalTex: THREE.Texture[] = [];
      const decalMats: THREE.MeshStandardMaterial[] = [];
      const addRoofDecal = (id: string, tex: THREE.Texture, scale: number) => {
        const def = container.defects.find((d) => d.id === id)!;
        const mat = new THREE.MeshStandardMaterial({
          map: tex, transparent: true, opacity: 0, roughness: 0.75, metalness: 0.2,
          depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(def.size * scale, def.size * scale), mat);
        m.position.copy(def.pos);
        m.rotation.x = -Math.PI / 2;
        container.group.add(m);
        decalTex.push(tex);
        decalMats.push(mat);
      };
      addRoofDecal("dent-top", makeDentDecal(), 1.3);
      addRoofDecal("crack", makeCrackDecal(), 1.5);

      /* ---- callouts: dot + hairline + label ----
         Migrated to the shared overlay helper. `onDark: true` because this
         scene sits on the site's near-black canvas — overlay.ts's default ink
         is tuned for a light-surfaced scene (Tank, the hero cards); on dark
         ground it renders the same near-invisible leader this scene used to
         draw by hand (see overlay.ts's onDark comment). onDark switches to a
         2px/72%-alpha light leader, which is actually visible. */
      const annos: Callout[] = container.defects.map((d) => {
        const lane = LANE[d.id] ?? { dir: "up" as const, len: 52 };
        return createCallout(overlay, {
          title: d.title,
          detail: d.detail,
          pos: d.pos,
          normal: d.normal,
          severe: d.severe,
          onDark: true,
          lane,
          win: WINDOW[d.id] ?? [0, 1],
        });
      });

      // Values match the paint on the steel exactly, character for character.
      const OCR_FIELDS: [string, string][] = [
        ["Container ID", "VSTU 907032 1"],
        ["ISO type", "22G1"],
        ["Max gross", "30480 KG"],
        ["Tare", "2200 KG"],
        ["Manufactured", "03-2019"],
      ];
      /* ---- OCR marker + specs card ----
         createReadout builds the same dot + plain structured type this scene
         drew by hand, on its own hardcoded left:34px/top:104px — which is
         this scene's own FRAMED-mode numbers by coincidence, not by design.
         In bare mode the type has to line up with the page's own text column
         (PAD_X/PAD_TOP), so the panel position is overridden right after. */
      const readout: Readout = createReadout(overlay, "Extracted markings", OCR_FIELDS);
      readout.panel.style.left = `${PAD_X}px`;
      readout.panel.style.top = `${PAD_TOP + 82}px`;
      const ocrLocal = container.ocr.pos.clone();
      const ocrNormal = container.ocr.normal.clone();

      const ro = new ResizeObserver(studio.size);
      ro.observe(wrap);

      /* Only DRAW while on screen. mountWhenVisible gates construction, not
         rendering — so before this, a flagship scrolled well past kept issuing
         a full draw (plus a composer pass) every frame for the rest of the
         session. The cards have had this gate since they were written; the two
         flagships never got it, and they are the more expensive scenes.

         rootMargin keeps the scene warm slightly outside the viewport so it is
         never caught mid-intro when scrolled back to. */
      let onScreen = true;
      const vis = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "200px" },
      );
      vis.observe(wrap);

      /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
      const target = new THREE.Vector3();
      const wpos = new THREE.Vector3();
      let raf = 0;

      const STATUS = [
        "It reads every marking.",
        "It finds dents and corrosion.",
        "And every crack.",
      ];
      let lastStage = -1;
      let sealed = false;   // see the seal note in the render loop
      let justSealed = false; // set by the seal block, read by the ?perf draw timer

      /* The shared projector does not know about `bleed` — the canvas is
         `bleed` px taller than the overlay on each side, so every screen
         point it returns has to be shifted up by `bleed` before it is handed
         to placeCallout, or every callout and marker drifts off the feature
         it names (same fix tank-vision uses). */
      const project = makeProjector(camera, container.group);

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? 6.0 : clock.getElapsedTime();
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        // The loop does not begin until the opening push has landed on stop 1,
        // so the zoom-in is one clean move rather than a move fighting a
        // sequence that has already started running underneath it.
        let phase = -1;
        if (frozen) phase = 0.62;
        else if (t > ZOOM_IN) phase = ((t - ZOOM_IN) % LOOP) / LOOP;
        const cp = phase < 0 ? 0 : phase;

        // camera path — eased out of the centred opening frame into stop 1
        const k = sampleCam(cp);
        // hold dead centre, then a half-second push all the way in
        const io = frozen ? 1 : smoothstep(HOLD_END, ZOOM_IN, t);
        const cAz = lerp(OPENING.az, k.az, io);
        const cRad = fitRad(lerp(OPENING.rad, k.rad, io), w / h);
        const cTx = lerp(OPENING.tx, k.tx, io);
        const cTy = lerp(OPENING.ty, k.ty, io);
        const cTz = lerp(OPENING.tz, k.tz, io);
        target.set(cTx, cTy + 0.15, cTz);
        // locked height — the push-in and every stop share one camera altitude
        placeCamera(camera, { az: cAz, rad: cRad, tx: cTx, ty: cTy, tz: cTz }, CAM_Y);

        // Handheld float: layered slow sines (never repeating in phase) give a
        // subtle organic drift rather than a mechanical wobble. Amplitude scales
        // with distance so close shots don't feel shaky. Strictly horizontal —
        // the rig has no vertical axis at all, so nothing bobs.
        if (!frozen) {
          const amp = cRad * 0.0045;
          const fx = Math.sin(t * 0.41) * 0.6 + Math.sin(t * 0.73 + 2.1) * 0.4;
          const fz = Math.sin(t * 0.34 + 3.0) * 0.6 + Math.sin(t * 0.63 + 1.9) * 0.4;
          camera.position.x += fx * amp;
          camera.position.z += fz * amp;
          // breathe the aim slightly out of step with the body for parallax
          target.x += Math.sin(t * 0.29 + 0.8) * amp * 0.35;
        }

        camera.lookAt(target);
        // a whisper of roll, so the horizon is never dead level
        if (!frozen) camera.rotateZ(Math.sin(t * 0.23 + 1.1) * 0.0035);
        // slide the camera left so the subject sits in the right half of frame.
        // Scaled by the opening blend, so the first frame is dead centre.
        /* The right-bias exists to clear a type column inside a FRAMED picture.
           Unframed, the type sits on the page's own grid and the subject has
           the full width to live in — keeping the full bias just shoves the
           container off the right edge, which is clipping by another name. */
        camera.translateX(-cRad * (bare ? RIGHT_BIAS * 0.42 : RIGHT_BIAS) * io);

        // Bring the camera matrices up to date NOW. Vector3.project() reads
        // matrixWorldInverse, which the renderer would not refresh until after
        // this function returns — leaving every label a frame behind the camera
        // and visibly off its feature while the camera is moving.
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        // subject holds its pose — dead still, including vertically, so the pan
        // is the only motion in frame
        container.group.rotation.y = 0;
        container.group.position.y = 0.15;
        container.group.updateMatrixWorld(true);

        // Formation: the wireframe eases on, the steel eases up underneath it,
        // and the wireframe dissolves off the top. The three overlap, so there
        // is never a moment where one hands over abruptly to the other.
        const drawT = easeInOut(clamp01(t / 0.62));
        container.edges.geometry.setDrawRange(0, Math.floor(edgeCount * drawT));
        edgeMat.opacity = 0.55 * drawT * (1 - smoothstep(0.58, 1.2, t));
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.45) / 0.95));
        mats.steel.opacity = solid;
        mats.dark.opacity = solid;
        mats.front.material.opacity = solid;
        /* SEAL THE SUBJECT once the intro fade has finished.

           `transparent: true` is required to fade the container in, but a
           transparent material renders in the transparent pass, which is sorted
           per-object back-to-front and does not depth-test reliably against
           itself. On a shape with overlapping parts — corrugation ribs, corner
           castings, door hardware — that shows up as edges you can see straight
           through. Flipping transparency off the moment opacity reaches 1 moves
           everything back to the opaque pass, where the depth buffer does its
           job properly. */
        if (!sealed && solid >= 1) {
          sealed = true;
          justSealed = true;
          for (const m of [mats.steel, mats.dark, mats.front.material]) {
            m.transparent = false;
            m.needsUpdate = true;
          }
          container.hardware.forEach((mesh) => {
            const mm = mesh.material as THREE.Material;
            mm.transparent = false;
            mm.needsUpdate = true;
          });
        }
        decalMats.forEach((m) => (m.opacity = solid * ((m.userData?.maxOpacity as number) ?? 1)));
        // A transparent mesh still casts a full shadow, so without this the
        // container's shadow was on the ground before the container existed.
        shadowMat.opacity = 0.62 * solid;
        container.hardware.forEach((m) => {
          (m.material as THREE.Material & { opacity: number }).opacity = solid;
        });

        // scan runs during the travel from the markings to the front damage,
        // so the detail shots themselves stay clean and unhurried
        let scanX = -99;
        let scanOn = 0;
        if (phase >= 0.2 && phase <= 0.34) {
          const st = (phase - 0.2) / 0.14;
          scanX = -L / 2 - 0.35 + st * (L + 0.7);
          scanOn = Math.sin(st * Math.PI);
        }
        hud.setScan(scanX, scanOn, t);
        mats.front.setScan(scanX, scanOn);
        mats.front.setTime(t);

        // Callouts: each fades in/out around its own window (see WINDOW above).
        // A label is welded to its feature and never nudged, so it always
        // points at the thing it names — if the whole callout can't fit on
        // screen it fades out rather than drifting off its mark. placeCallout
        // runs the identical fit test this scene used to run by hand; bounds
        // are the OVERLAY's, not the canvas's, so height is bleed-adjusted.
        annos.forEach((a) => {
          const [w0, w1] = a.win;
          const inWin = phase < 0 ? 0 : smoothstep(w0, w0 + 0.05, phase) * (1 - smoothstep(w1 - 0.05, w1, phase));
          const vis = frozen ? 1 : inWin;
          const world = wpos.copy(a.local).applyMatrix4(container.group.matrixWorld);
          const r = vis > 0.01 ? project(world, a.normal, w, h) : null;
          placeCallout(a, r ? { sx: r.sx, sy: r.sy - bleed } : null, vis, w, h - bleed * 2, 0.3);
        });

        // OCR
        const dotVis = phase < 0 ? 0 : smoothstep(0.03, 0.08, phase) * (1 - smoothstep(0.2, 0.26, phase));
        {
          const world = wpos.copy(ocrLocal).applyMatrix4(container.group.matrixWorld);
          const r = dotVis > 0.01 ? project(world, ocrNormal, w, h) : null;
          if (!r) readout.dot.style.opacity = "0";
          else {
            readout.dot.style.transform = `translate(${r.sx}px,${r.sy - bleed}px)`;
            readout.dot.style.opacity = String(dotVis);
          }
        }
        // table appears as the markings are read and persists to the end
        // fills in at the markings stop, holds through the damage stop, then
        // clears before the roof — it has been read, it does not need to linger
        const cardVis = phase < 0 ? 0 : smoothstep(0.07, 0.13, phase) * (1 - smoothstep(0.56, 0.63, phase));
        readout.panel.style.opacity = String(frozen ? 1 : cardVis);
        readout.rows.forEach((row, i) => {
          row.setOpacity(String(frozen ? 1 : smoothstep(0.09 + i * 0.015, 0.12 + i * 0.015, phase)));
        });

        // headline
        const stage = phase < 0 || phase < 0.3 ? 0 : phase < 0.64 ? 1 : 2;
        if (headlineRef.current && lastStage !== stage) {
          lastStage = stage;
          const el = headlineRef.current;
          el.style.opacity = "0";
          el.style.transform = "translateY(6px)";
          window.setTimeout(() => {
            el.textContent = STATUS[stage];
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }, 130);
        }

        // Nothing but the container during the opening hold — the wordmark,
        // headline, table and callouts all arrive only once the push has landed.
        const uiVis = frozen ? 1 : smoothstep(ZOOM_IN - 0.1, ZOOM_IN + 0.5, t);
        overlay.style.opacity = String(uiVis);
        if (chromeRef.current) chromeRef.current.style.opacity = String(uiVis);
        if (scrimRef.current) scrimRef.current.style.opacity = String(uiVis);

        if (bloom) bloom.strength = 0.2 + scanOn * 0.3;
      };

      /* 45fps. This is a zoomed-in scene — it owns the viewport rather than
         sitting in a card — so it takes the higher of the two lab rates, but
         it was previously uncapped and drawing every vsync with a composer
         pass on top. 1/46, see card-scene.tsx for why not 1/45. */
      const MIN_DT = 1 / 46;
      let last = -1;
      /* Prime one frame even off screen — see gate-vision/scene.tsx: the first
         draw is where shaders compile and textures upload, and deferring it to
         the onScreen gate put that cost on the frame the visitor arrives on. */
      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame above. Measured on a genuinely cold browser session
         (empty on-disk shader cache): priming one frame still left a 1355 ms
         long task landing mid-scroll, because these scenes swap materials as the
         loop advances — wireframe to resolved, decals appearing at a phase — and
         a program compiles the first time it is actually drawn, which can be
         half a loop in. compileAsync walks the whole graph, and uses
         KHR_parallel_shader_compile where available so it does not block. */
      /* PRE-COMPILE BOTH PROGRAM SETS — the transparent intro AND the sealed
         opaque state.

         This is the scene that flips `transparent` at runtime (the seal block in
         applyFrame), and `transparent` is part of three's program cache key —
         opaque materials compile DIFFERENT GLSL (`#define OPAQUE`). A single
         compileAsync only ever saw the intro variants, so the seal recompiled
         three programs synchronously inside one on-screen draw: measured at
         `renderer.info.programs` 10 -> 13 on exactly that draw, costing 55ms
         with a warm GPU-process shader cache and ~2.4s with a cold one. That was
         the entire "first load stalls at the container section" mystery — the
         stall keyed off the GPU process's cache state, which is why it looked
         like it cared about server restarts, and the scene's own build timer
         (~150ms) never saw any of it.

         So: compile the intro variants; flip the REAL materials to the sealed
         state (no clones — a clone of the front material would not carry its
         onBeforeCompile shader patch); compile again; draw one real frame in the
         sealed state (texture upload + remaining first-use waits, off screen,
         during idle); flip back. When the seal fires ~1s after arrival, every
         program it asks for already exists.

         Under reduced motion the frozen frame IS the sealed state, and the warm
         applyFrame below fires the real seal block — so skip the unflip.

         `compiled` gates drawing entirely; the guard exists because a compile
         promise that rejects or hangs must not leave the scene permanently
         blank. If the guard fires mid-chain the scene may run sealed from frame
         one (solid container, no fade) — degraded, never broken. */
      const sealTargets = new Set<THREE.Material>([mats.steel, mats.dark, mats.front.material]);
      container.hardware.forEach((mesh) => sealTargets.add(mesh.material as THREE.Material));
      const setSealed = (on: boolean) => {
        sealTargets.forEach((m) => { m.transparent = !on; m.needsUpdate = true; });
      };

      let compiled = false;
      const compileGuard = window.setTimeout(() => { compiled = true; }, 4000);
      renderer.compileAsync(scene, camera)
        .then(() => { setSealed(true); return renderer.compileAsync(scene, camera); })
        .catch(() => {})
        .then(() => {
          try {
            setSealed(true); // explicit — the catch path above arrives unflipped
            applyFrame();
            studio.render();
          } catch { /* a failed warm draw must not block the scene */ }
          if (!reduce) setSealed(false);
          compiled = true;
          window.clearTimeout(compileGuard);
        });

      let primed = false;
      let drawN = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!compiled) return;
        if (!onScreen) {
          // one warm draw of the INTRO state off screen, then nothing until
          // arrival — the sealed state was warmed in the compile chain above
          if (!primed) {
            primed = true;
            applyFrame();
            studio.render();
          }
          return;
        }
        primed = true;
        /* The clock starts on the first ON-SCREEN frame, not at priming. The
           whole reason it exists ("every viewer sees frame one") was silently
           broken when priming started it early — by the time a visitor scrolled
           here the opening push-in was 20 seconds gone. It also means the seal
           now fires ~1s after arrival, in view, which is exactly why the sealed
           programs are pre-compiled above. */
        if (!clockStarted) { clock.start(); clockStarted = true; }
        const now = clock.getElapsedTime();
        if (now - last < MIN_DT) return;
        last = now;
        /* FIRST-DRAW TIMING (?perf). The build timer stops when make() returns;
           the expensive draws happen later — first-use and the seal draw — and
           nothing else records them. Three performance.now() calls per frame is
           the entire steady-state cost. */
        const _td = performance.now();
        applyFrame();
        const _ta = performance.now();
        studio.render();
        if ((drawN < 6 || justSealed) && location.search.includes("perf")) {
          const w = window as unknown as { __visionDraw?: string[] };
          (w.__visionDraw ||= []).push(
            `container#${drawN}${justSealed ? " SEAL" : ""} apply ${(_ta - _td).toFixed(0)} render ${(performance.now() - _ta).toFixed(0)} ` +
            `progs ${renderer.info.programs?.length ?? -1} onScreen=${onScreen}`);
        }
        justSealed = false;
        if (drawN < 6) drawN++;
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        vis.disconnect();
        annos.forEach((a) => a.wrap.remove());
        readout.dot.remove();
        readout.panel.remove();
        decalTex.forEach((x) => x.dispose());
        decalMats.forEach((m) => m.dispose());
        mats.dispose();
        // studio.dispose() traverses the scene itself and skips any geometry
        // tagged userData.shared (metal.ts's rounded-box cache, detect.ts's
        // tracker bar) — see studio.ts's dispose comment. The old cleanup here
        // disposed EVERY mesh geometry with no such guard, which is exactly
        // the bug studio.ts documents and fixes.
        studio.dispose();
      };
    } catch (err) {
      console.error("[container-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "container");
  }, []);

  return (
    <div
      ref={hostRef}
      style={{
        position: "relative", width: "100%", height: "100%",
        // bare: nothing clips and nothing paints behind — the container is
        // allowed to overhang its slot and the page shows through
        overflow: bare ? "visible" : "hidden",
        background: bare ? "transparent" : PALETTE.bgBottom,
      }}
    >
      {/* The CANVAS bleeds past the slot; the overlay does not. Bleeding the
          whole component moves the readout and headline with it, and they end
          up sitting on top of the section's own copy — the subject is what is
          supposed to escape the box, not the type. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />

      {/* The scrim is a frame device — it darkens the left of the RENDERED
          PICTURE so type reads over it. With no picture there is nothing to
          darken and it would just be a grey wash floating on the page. */}
      {!bare && (
        <div
          ref={scrimRef}
          aria-hidden
          style={{
            position: "absolute", inset: 0, pointerEvents: "none", opacity: 0,
            background:
              "linear-gradient(to right, rgba(2,5,13,0.72) 0%, rgba(2,5,13,0.4) 20%, rgba(2,5,13,0) 46%)," +
              "linear-gradient(to top, rgba(2,5,13,0.55) 0%, rgba(2,5,13,0.22) 18%, rgba(2,5,13,0) 46%)",
          }}
        />
      )}

      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />

      {/* Hierarchy, loudest to quietest: headline > extracted table > labels */}
      <div ref={chromeRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", fontFamily: sans, opacity: 0 }}>
        {/* tier 3 — quiet identifier */}
        <div style={{ position: "absolute", top: PAD_TOP, left: PAD_X }}>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: PALETTE.accentText, opacity: 0.85 }}>
            Viso Yard
          </div>
          <div style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.01em", color: "rgba(255,255,255,0.72)", marginTop: 2 }}>
            Container Vision
          </div>
        </div>

        {/* tier 1 — the line that commands the frame */}
        <div style={{ position: "absolute", left: PAD_X, bottom: PAD_BOTTOM, maxWidth: "52%" }}>
          <div
            ref={headlineRef}
            style={{
              fontSize: "clamp(26px,3.5vw,46px)", fontWeight: 600, letterSpacing: "-0.03em",
              color: "#fff", lineHeight: 1.04, opacity: 1,
              textShadow: "0 2px 30px rgba(0,0,0,0.75)",
              transition: "opacity .22s ease, transform .22s ease",
            }}
          >
            Every container. Every face.
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/* ---------------------------------------------------------------------------
   Gate Vision — cinematic product demo.

   Same studio and same overlay grammar as Container Vision, but deliberately
   NOT the same film. Container Vision is a still object with a moving camera;
   Gate Vision is the inverse — the camera is close to locked and CENTRED, and
   the truck drives through frame. That is the schematic's own claim: "READ ON
   THE MOVE · NO STOP-AND-SHOOT". A slow orbit around a parked truck would say
   the opposite.

   Progression follows the flagship schematic beat for beat:
       RAW  7032 1        (partial read on approach)
     → FIX  VSTU 907032 1 (resolved under the heads)
     → VERIFIED · CONF 0.99 + SEAL · CHECKED + timestamp

   Screen furniture is stripped to leader lines and labels — no readout table,
   no wordmark, no headline. The labels are the story here.

   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, lerp, placeCamera, smoothstep } from "../_vision/camera";
import { type Callout, createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import { buildMaterials } from "../container-vision/materials";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import { createSightCone } from "../hero-cards/detect";
import { buildGateMaterials, gateStencilTexture } from "./materials";
import { GANTRY_X, GROUND_Y, buildGate } from "./gate";

/* 4.6s over a 27.2-unit run: 5.91 u/s, 52% faster than the previous 7.0s pass
   (3.9 u/s) and 2.4x the original 2.5 u/s — a second, explicit user call
   ("need gate vision to move much faster") on top of the first. The truck's
   own speed is the only thing that changed here: RUN_FROM/RUN_TO (the frame
   entry/exit points) are untouched, so the truck is still fully off-screen
   through the wrap, it just gets there quicker.

   Every phase-fraction "win" window below (reads, plate, seal, head, the
   cone and underline flashes) is driven by `phase = elapsed / LOOP`, so
   shrinking LOOP alone would shrink every one of those windows' ON-SCREEN
   SECONDS by the same 7.0/4.6 = 1.522x — the labels would flash by even
   faster than the truck. Every window below has had its fraction widened by
   that same 1.522x so its absolute hold time is unchanged (reads, plate,
   head) or explicitly increased (seal, widened by the same factor since it
   was already generous). See the per-window comments for the arithmetic.
   The barrier's rise/fall timing is the one exception, kept on its original
   fixed phase points on purpose — see the barrier comment below for why. */
const LOOP = 4.6;
const HOLD_END = 0.9;   // short beat on the assembled rig before the run begins
const ZOOM_IN = 1.25;

/* The vehicle's run. Constant speed — 16 m across the loop is a believable
   gate crawl, and constant speed is what "no stop-and-shoot" looks like.
   It is out of frame at both ends, which is also where the loop wraps, so the
   reset happens while the camera is up on the gantry with nothing to give it
   away. */
// The cab sits at +X on the model, so the run goes -X -> +X: the tractor
// leads and the container trails through the heads behind it, which is also
// the order the reads happen in.
/* +-13.6, up from +-9.4: THE WRAP IS NOW INVISIBLE, which is what makes the
   loop read as a procession of trucks instead of one truck teleporting.
   The frame shows roughly x in [-8.0, +7.4]; the truck spans +4.715 ahead of
   its origin to -5.70 behind. At the old +-9.4 the tail was still at +3.7 —
   mid-frame — when the loop wrapped. Now the front enters the frame at
   p = 0.033 and the tail exits at p = 0.982: the vehicle is fully off screen
   through the wrap, so "one truck leaves, the next appears" with ~0.35s of
   empty lane between them — which is exactly the beat the barrier's
   down-and-waiting state exists to fill. */
const RUN_FROM = -13.6;
const RUN_TO = 13.6;
const vehicleX = (p: number) => lerp(RUN_FROM, RUN_TO, p);

/* Camera — locked height, centred framing, barely moving. It drifts a little
   and eases back toward the gantry at the end of the loop; it never orbits.
   Note how little `az` changes compared with Container Vision: that contrast
   is the point. */
// Below the gantry beam, not level with it: at beam height the whole structure
// is edge-on and effectively invisible. Height is locked, so this one number
// has to work for the lane shots AND the gantry beat.
const CAM_Y = 2.30;
const TY = 0.95;
/* RE-DERIVED FOR THE REAL CANVAS. These keys were authored against the lab's
   1600x680 slot (aspect 2.35), but the in-section canvas is roughly SQUARE —
   aspect ~1.20 — and fitRad multiplies `rad` by min(max(2.35/aspect,1),2.6),
   which at 1.20 is ×1.957. So the shipped page was rendering the authored
   framing at almost exactly twice the intended distance and the rig sat tiny in
   the middle of the frame. Every `rad` below is the old value ×0.7925, and the
   look-at height is lifted 0.80 → 0.95 to re-centre the truck body rather than
   the chassis in the tighter frame. */
/* No push-in. The camera opens where it stays: a gate camera does not dolly.
   The whole move across the loop is a few degrees and half a metre — the truck
   supplies all the motion, which is the point of this scene. `rad` is pulled in
   from ~19 so the vehicle fills more of the frame without the camera moving. */
const OPENING = { az: 0.30, rad: 12.4, tx: -0.6, ty: TY, tz: 0 };

/* THE CAMERA IS BOLTED DOWN — one pose, held for the whole loop. The old
   version drifted a few degrees across the loop; with the faster truck the
   drift read as the camera nervously chasing it (an explicit user call to
   remove). A fixed camera is also what a real gate camera is, and it makes
   the truck's speed legible: motion against a moving frame reads slower. */


/* Same aspect compensation as Container Vision: the keys were tuned at the
   slot's 1600x680, and a bled canvas is taller, which narrows the horizontal
   field and magnifies the rig. See that file for the full reasoning. */
const REF_ASPECT = 1600 / 680;
const fitRad = (rad: number, aspect: number) =>
  rad * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.6);

/* The three reads, all landing on the same painted markings block — the
   schematic's RAW -> FIX -> VERIFIED strip played in time rather than laid out
   left to right. Windows are tight and do not overlap: only one state of a
   given read is ever true.

   The schematic's own shorthand is set in a drawing, where RAW/FIX/VERIFIED are
   column headers with the values beneath them. Lifted verbatim onto a callout
   they stop being headers and start reading like error codes shouted at the
   viewer — "FIX" in particular reads as an instruction, not a state. So the
   titles are the PLAIN-LANGUAGE state of the read and the detail carries the
   value: what the system knows, then what it knows it more precisely, then
   what it committed. The confidence figure climbing 0.61 -> 0.94 -> 0.99 does
   the work "VERIFIED" was doing, and does it with evidence. */
/* Widths widened ×1.522 (7.0/4.6, see LOOP) so each state holds the same
   absolute seconds it did before the truck sped up: Reading 0.84s, Resolved
   0.77s, Logged 1.05s — unchanged from the 7.0s pass. Kept CONTIGUOUS (each
   start = previous end), same as before, so the three states stay mutually
   exclusive; only the internal boundaries moved outward. The 0.30 opening
   anchor is untouched — it is the only one anything else keys off. */
const READS: { title: string; detail: string; win: [number, number] }[] = [
  { title: "Reading", detail: "…7032 1 · 0.61", win: [0.30, 0.4826] },
  { title: "Resolved", detail: "VSTU 907032 1 · 22G1 · 0.94", win: [0.4826, 0.6500] },
  { title: "Logged", detail: "0.99 · gate 04 in · 14:02:11", win: [0.6500, 0.8783] },
];

/** `bare` lifts the rig out of its frame — see ContainerVisionScene. */
export default function GateVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
      // the rig is wide and tall, so the shadow camera covers more ground and
      // the light rig is spread to match
      /* maxDpr 1.75 and a 1024 shadow map. A flagship canvas is large, so DPR 2
         means four times the fragments of DPR 1 for a difference that does not
         survive on a scene this size; 1.75 keeps the edge quality and drops about
         a quarter of the pixels. Bloom, the full light rig and the environment are
         all deliberately LEFT ON here — unlike the hero cards, this scene is big
         enough that all three are visible, and its look is signed off. */
      const studio = createStudio(wrap, { floorY: GROUND_Y, shadowExtent: 12, spread: 1.6, bare, maxDpr: 1.75, shadowMapSize: 1024 });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject: gate + the real container on a chassis ---- */
      const _tg = performance.now();
      const gmark = (w: string) => {
        if (!location.search.includes("perf")) return;
        const g = window as unknown as { __visionGate?: string[] };
        (g.__visionGate ||= []).push(`${w} ${(performance.now() - _tg).toFixed(0)}`);
      };
      const cmats = buildMaterials();
      gmark("containerMats");
      const mats = buildGateMaterials();
      gmark("gateMats");
      const model = buildGate(mats, cmats);
      gmark("buildGate");
      scene.add(model.vehicle);
      scene.add(model.fixed);
      const edgePos = model.edges.geometry.getAttribute("position");
      const edgeCount = edgePos ? edgePos.count : 0;
      const edgeMat = model.edges.material as THREE.LineBasicMaterial;

      /* ---- the ground: a drafting sheet, not scenery ----
         Same surface the hero cards and Tank Vision stand on. The truck used to
         float over its own projected shadow with nothing under it; one metre per
         gridline is the vehicle's own unit, so the grid also reads as scale. */
      const ground = draftingGround({ size: 30, y: GROUND_Y - 0.012, step: 1, opacity: 0.14 });
      scene.add(ground.mesh);

      /* ---- lane markings ----
         toneMapped: false on every one of these. ACES runs on the beauty pass
         and desaturates a flat graphics colour into mud; drafting lines are
         INK, not lit surfaces, so they opt out — house rule, see
         yard-vision/yard.ts. */
      const LANE_Y = GROUND_Y + 0.012;
      const laneLine = () => new THREE.LineBasicMaterial({
        color: "#C9D4DE", transparent: true, opacity: 0, toneMapped: false,
      });

      /* ---- THE ROAD ITSELF ----
         The lane markings below were painting onto nothing: a drafting grid at
         14% over the page's own black is a ruling, not a surface, and the
         truck read as driving through air with two lines floating under it.
         Same defect cargo-vision had before it got a deck, and the same fix.

         Sized off the lane, not invented: the markings run z -1.5..+1.5 and
         x +/-11, so the carriageway is 3.0 wide with a 0.55 shoulder either
         side (4.1 total), and 30 long so it leaves frame at both ends rather
         than stopping at a visible edge. Receives shadow so the truck and the
         gantry finally have something to fall on.

         Sits 4mm under the lane lines and 8mm over the grid, so the stack is
         grid -> road -> paint with no z-fighting; renderOrder is not needed
         because these are opaque and depth-sorted honestly. */
      const roadGeo = new THREE.PlaneGeometry(30, 4.1);
      const roadMat = new THREE.MeshStandardMaterial({
        color: "#15181D", roughness: 0.95, metalness: 0.0,
        transparent: true, opacity: 0,
      });
      const road = new THREE.Mesh(roadGeo, roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, GROUND_Y + 0.008, 0);
      road.receiveShadow = true;
      scene.add(road);

      // the two lane edges the truck runs between
      const laneGeo = new THREE.BufferGeometry();
      laneGeo.setAttribute("position", new THREE.Float32BufferAttribute([
        -11, LANE_Y, -1.5, 11, LANE_Y, -1.5,
        -11, LANE_Y, 1.5, 11, LANE_Y, 1.5,
      ], 3));
      const laneMat = laneLine();
      const lanes = new THREE.LineSegments(laneGeo, laneMat);
      scene.add(lanes);

      /* The stop line the truck does NOT stop at. On its own that reads as an
         oversight; it is the barrier beat lifting off it that makes the point
         legible — the line is there, the gate is there, and the vehicle goes
         through both at speed. */
      const stopGeo = new THREE.BufferGeometry();
      stopGeo.setAttribute("position", new THREE.Float32BufferAttribute([
        5.8, LANE_Y, -1.5, 5.8, LANE_Y, 1.5,
      ], 3));
      const stopMat = laneLine();
      const stopLine = new THREE.LineSegments(stopGeo, stopMat);
      scene.add(stopLine);

      /* ---- the lane number, painted on the tarmac ----
         Texture is module-cached and shared; the scene disposes the MATERIAL
         and the plane only. */
      const stencilGeo = new THREE.PlaneGeometry(2.3, 0.86);
      const stencilMat = new THREE.MeshBasicMaterial({
        map: gateStencilTexture(), transparent: true, opacity: 0,
        toneMapped: false, depthWrite: false,
      });
      const stencil = new THREE.Mesh(stencilGeo, stencilMat);
      stencil.position.set(-4.6, GROUND_Y + 0.02, 2.4);
      stencil.rotation.x = -Math.PI / 2;
      scene.add(stencil);

      /* ---- the read made visible: the head's sight cone ----
         Built once and aimed once. A cone that re-aims at the truck is a
         searchlight — a fixed head with a fixed field of view is what is
         actually installed, and the truck driving THROUGH a static volume is
         the more honest picture of how the read happens. */
      const headPos = model.headAnchor.pos;
      /* Aimed at the GROUND on the camera side of the lane, not at the markings
         block. The first target (-0.1, 0.3, 1.0) was geometrically correct and
         visually nothing: it sits INSIDE the container volume, so the whole fan
         was swallowed by the box it was supposed to be reading — only a sliver
         above the roofline survived. Landing the fan at the near lane edge puts
         it diagonally ACROSS the container's face, fully visible against it,
         and the truck drives through the beam — which is the honest picture. */
      const coneTarget = new THREE.Vector3(-0.1, GROUND_Y + 0.1, 2.6);
      /* Apex, target and length are UNCHANGED from the hand-built version this
         replaces; only the way the volume is shaded has moved. Head sits at
         (-0.4, 2.61, -0.08), target at (-0.1, -1.8, 2.6), so the axis is
         (0.3, -4.41, 2.68) and the length is 5.1692. The old geometry was a
         base radius of 0.8 at that length, which is a half-angle of
         atan(0.8 / 5.1692) = 0.15355 rad. */
      const CONE_HALF_ANGLE = Math.atan(0.8 / coneTarget.distanceTo(headPos));
      const sightCone = createSightCone({ footprintY: GROUND_Y });
      sightCone.aim(headPos, coneTarget, CONE_HALF_ANGLE);
      scene.add(sightCone.group);

      /* An underline struck under the markings block at the instant the read
         RESOLVES. Accent = observation, the page's colour grammar: the same
         #5CC8FF that means "the system is looking at this" everywhere else. */
      const underGeo = new THREE.PlaneGeometry(1.7, 0.05);
      const underMat = new THREE.MeshBasicMaterial({
        color: "#5CC8FF", transparent: true, opacity: 0, toneMapped: false,
        depthWrite: false,
      });
      const underline = new THREE.Mesh(underGeo, underMat);
      underline.position.copy(model.anchors.id.pos).add(new THREE.Vector3(0, -0.5, 0.02));
      model.vehicle.add(underline);

      /* ---- callouts: the three reads, the seal, the plate, the head ---- */
      const reads: Callout[] = READS.map((r) =>
        createCallout(overlay, {
          id: r.title, title: r.title, detail: r.detail,
          pos: model.anchors.id.pos, normal: model.anchors.id.normal,
          onDark: true,
          lane: { dir: "up", len: 96 }, win: r.win,
        }),
      );
      // win widened ×1.522 to hold the same 0.98s it did at the old LOOP —
      // see the LOOP comment for the arithmetic.
      const plate = createCallout(overlay, {
        id: "plate", title: "Trailer plate", detail: "MH 43 AT 7712",
        pos: model.anchors.plate.pos, normal: model.anchors.plate.normal,
        onDark: true,
        lane: { dir: "down", len: 56 }, win: [0.30, 0.5130],
      });
      // the schematic's "SEAL · CHECKED" and "FACE · REAR · CAM 1/1" — both
      // read off the door end as it clears the heads
      // win widened ×1.522 to hold the same 0.98s it did at the old LOOP.
      // Still well inside the tail's frame-exit at p=0.982.
      const seal = createCallout(overlay, {
        id: "seal", title: "Seal checked", detail: "88421 · rear face · cam 1/1",
        pos: model.anchors.seal.pos, normal: model.anchors.seal.normal,
        onDark: true,
        lane: { dir: "up", len: 168 }, win: [0.64, 0.8530],
      });
      /* The gantry head is introduced at the top of the loop, while the lane is
         still clear, and HOLDS through most of the pass — it is the piece of
         equipment doing everything else on screen, so it earns the longest
         window of any label. The camera never goes to find it; it is called out
         from where the camera already stands.

         Its leader points UP, not down: a downward leader hangs the card into
         the lane at exactly the height the truck drives through, and the truck
         then drives under its own caption. Upward puts it in the clear air
         above the beam, where nothing else ever goes. */
      const head = createCallout(overlay, {
        id: "head", title: "Gate 04 · in", detail: "Night · rain · fog · dust",
        pos: model.headAnchor.pos, normal: model.headAnchor.normal,
        onDark: true,
        // 74 was tuned at the old framing. At the tighter one the head anchor
        // sits ~118px from the overlay top in-section, and 74 + the label's own
        // height overshot it; 56 + ~50 fits with ~12px to spare.
        // win widened ×1.522 (0.0-0.7609, up from 0.0-0.50) to hold the same
        // 3.5s it did at the old LOOP — see the LOOP comment.
        lane: { dir: "up", len: 56 }, win: [0.0, 0.7609],
      });
      gmark("callouts");
      const onVehicle = [...reads, plate, seal];

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
      const visObs = new IntersectionObserver(
        ([e]) => { onScreen = e.isIntersecting; },
        { rootMargin: "200px" },
      );
      visObs.observe(wrap);

      /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;
      const target = new THREE.Vector3();
      const wpos = new THREE.Vector3();
      let raf = 0;

      const projectV = makeProjector(camera, model.vehicle);
      const projectF = makeProjector(camera, model.fixed);

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? 7.2 : clock.getElapsedTime();
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;

        let phase = -1;
        if (frozen) phase = 0.55;
        else if (t > ZOOM_IN) phase = ((t - ZOOM_IN) % LOOP) / LOOP;
        /* REVIEW AID — `?phase=0..1` pins the loop position, same tool as
           yard-vision's. Reviewing a 7.5s loop by screenshotting and hoping
           cost several passes there and was about to cost them here. Pins the
           loop only; `t` still advances, so intro chrome resolves normally. */
        if (holdP !== null && t > ZOOM_IN) phase = holdP;
        const cp = phase < 0 ? 0 : phase;

        // Before the loop starts the vehicle is held OFF frame: the opening
        // beat is now the gate itself — lane, gantry, barrier down, waiting —
        // and the first truck arriving is the first event.
        model.vehicle.position.x = phase < 0 ? vehicleX(0) : vehicleX(cp);
        model.vehicle.updateMatrixWorld(true);
        model.fixed.updateMatrixWorld(true);

        const cRad = fitRad(OPENING.rad, w / h);
        target.set(OPENING.tx, OPENING.ty + 0.15, OPENING.tz);
        placeCamera(camera, { az: OPENING.az, rad: cRad, tx: OPENING.tx, ty: OPENING.ty, tz: OPENING.tz }, CAM_Y);

        // NO handheld float and NO roll on this scene. Container Vision is a
        // camera moving around a still object, so a breath of drift reads as a
        // human operator; here the SUBJECT is what moves, and any wobble on top
        // of that just makes the rig look unstable. This camera is bolted down.
        camera.lookAt(target);
        // No right-bias slide either: with the readout gone there is no type
        // column to keep clear, so the subject is framed centred.

        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        // formation: wireframe eases on, the rig eases up underneath it, and
        // the wireframe dissolves off the top — the three overlap
        const drawT = easeInOut(clamp01(t / 0.62));
        model.edges.geometry.setDrawRange(0, Math.floor(edgeCount * drawT));
        edgeMat.opacity = 0.55 * drawT * (1 - smoothstep(0.58, 1.2, t));
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.45) / 0.95));
        mats.all.forEach((m) => {
          (m as THREE.Material & { opacity: number }).opacity = solid;
        });
        mats.glass.opacity = solid * 0.86;
        cmats.steel.opacity = solid;
        cmats.dark.opacity = solid;
        cmats.front.material.opacity = solid;
        model.containerHardware.forEach((m) => {
          (m.material as THREE.Material & { opacity: number }).opacity = solid;
        });
        // a transparent mesh still casts a full shadow, so without this the
        // shadow is on the ground before the truck is
        shadowMat.opacity = 0.62 * solid;
        setGroundOpacity(ground, solid);
        roadMat.opacity = solid;
        laneMat.opacity = solid * 0.3;
        stopMat.opacity = solid * 0.5;
        stencilMat.opacity = solid * 0.55;

        /* Barrier choreography — the scene's claim, animated. The arm is DOWN
           and waiting through the whole approach — the state the loop's empty
           beat opens on — and STARTS RISING at the fixed phase p=0.42.

           DELIBERATELY KEPT ON THE OLD FIXED PHASE POINTS, not re-tied to the
           Resolved read's win, which now starts later (0.4826, widened so the
           label holds its original absolute time — see LOOP and READS). The
           barrier's 0.42 is a physical deadline, not a narrative cue: it has
           to be fully up before the truck's front reaches the boom at
           p=0.562, and rising with only (0.562-0.4826)=0.079 of phase to
           work with leaves no room for a rise animation. So the read resolving
           and the arm lifting are no longer frame-exact twins — the arm now
           starts rising slightly BEFORE the "Resolved" label appears rather
           than in the same frame. Still reads as "system reacts, then
           confirms," just not simultaneously; flagged rather than shipped
           quietly, since it's a real change from the old beat.

           The rise is fully clear at p=0.52, 0.042 of the loop before the
           truck's foremost point reaches the boom — 0.042 * 4.6 = 0.193s of
           margin (was 0.294s at the old 7.0s LOOP). Tighter, still positive,
           still safe: the truck never slows, read on the move, no
           stop-and-shoot.

           ARITHMETIC (unchanged — depends only on RUN_FROM/RUN_TO and the
           boom position, neither of which moved). vehicleX(p) = -13.6 +
           27.2p, boom at x=6.4.
             front: trailer plate at +4.715 (the model's true foremost point —
               see the extents note in gate.ts). Crosses 6.4 when
               vehicleX = 1.685, i.e. p = (1.685 + 13.6) / 27.2 = 0.562.
             tail: chassis deck rear at -5.70. Clears 6.4 when vehicleX = 12.1,
               p = 0.9449 — so the arm may not begin lowering before ~0.95.
           Lowering runs 0.95..1.00: the arm descends just behind the departing
           trailer (tail exits the frame at p=0.982) and is fully down AT the
           wrap — which is what puts the "gate closed, waiting" beat on screen
           for the whole of the next truck's approach (0.0..0.42). PRODUCT of
           the two eases, not max: down at both ends of the cycle is the shape,
           and the product is 0 at p=0 and p=1 by construction, so the wrap
           cannot pop. */
        const upT =
          easeInOut(clamp01((cp - 0.42) / 0.10)) *
          (1 - easeInOut(clamp01((cp - 0.95) / 0.05)));
        model.barrier.rotation.x = -1.50 * (1 - upT);

        // the sight cone is lit across Reading and Resolved, and gone by
        // Logged. Tail edge moved from (0.51, 0.55) to (0.63, 0.67) — the
        // same -0.02/+0.02 straddle of the Resolved end, which itself moved
        // from 0.53 to 0.6500 when Resolved's win was widened (see READS).
        // Lead-in (0.27, 0.31) is untouched: it is a fixed lead ahead of
        // Reading's own untouched 0.30 start, not tied to Resolved.
        const coneVis = smoothstep(0.27, 0.31, cp) * (1 - smoothstep(0.63, 0.67, cp));
        sightCone.setOpacity(solid * 0.30 * coneVis);
        // reduced motion pins a mid-sweep frame rather than t=0, where the
        // travelling band would sit on the apex and read as nothing
        sightCone.tick(frozen ? 1.4 : t);
        // Underline flash brackets the Resolved window exactly, same as
        // before, just re-pointed at Resolved's new (widened) [0.4826, 0.65]
        // instead of the old [0.42, 0.53] — same 0.03 fade-in/out shape.
        underMat.opacity =
          solid * 0.85 * smoothstep(0.4826, 0.5126, cp) * (1 - smoothstep(0.6200, 0.6500, cp));

        // the scan sweep runs as the markings pass under the heads — the
        // moment the read actually happens
        const scanOn = phase < 0 ? 0 : Math.sin(clamp01((phase - 0.30) / 0.20) * Math.PI);
        cmats.front.setScan(GANTRY_X - model.vehicle.position.x, Math.max(scanOn, 0));
        cmats.front.setTime(t);

        const place = (
          a: Callout,
          proj: ReturnType<typeof makeProjector>,
          mat: THREE.Matrix4,
        ) => {
          const [w0, w1] = a.win;
          const inWin = phase < 0 ? 0 : smoothstep(w0, w0 + 0.04, phase) * (1 - smoothstep(w1 - 0.04, w1, phase));
          const vis = frozen ? (a.win[0] <= 0.55 && a.win[1] >= 0.55 ? 1 : 0) : inWin;
          const world = wpos.copy(a.local).applyMatrix4(mat);
          /* Shift canvas-space Y into overlay space: the canvas is `bleed` px
             taller on each side, so without this every label is off by exactly
             the bleed and drifts off the thing it points at. Bounds are the
             overlay's height too, not the canvas's. */
          const r = vis > 0.01 ? proj(world, a.normal, w, h) : null;
          /* leftGuard 0.04, not the shared default 0.3. The default reserves
             container-vision's readout column, which this scene does not have —
             and after the reframe the markings block projects at sx≈108 during
             the Reading/Resolved windows, left of the default guard line, so
             the first two read labels were silently rejected on every frame.
             Same failure family as the tank valve and the yard slot: when a
             callout never appears, check the bounds test before anything else. */
          placeCallout(a, r ? { sx: r.sx, sy: r.sy - bleed } : null, vis, w, h - bleed * 2, 0.04);
          // TEMP MEASUREMENT HOOK — window-timing calibration only, removed
          // before ship. Unconditionally projects (ignores vis gating) so the
          // anchor's screen position can be read at any phase via ?phase=.
          if (location.search.includes("dbg")) {
            const rr = proj(world, a.normal, w, h);
            (window as unknown as { __gateDbg: unknown[] }).__gateDbg ||= [];
            (window as unknown as { __gateDbg: { win: number[]; sx: number | null; w: number }[] }).__gateDbg.push(
              { win: a.win, sx: rr ? rr.sx : null, w },
            );
          }
        };
        onVehicle.forEach((a) => place(a, projectV, model.vehicle.matrixWorld));
        place(head, projectF, model.fixed.matrixWorld);

        // nothing on screen during the opening hold
        overlay.style.opacity = String(frozen ? 1 : smoothstep(ZOOM_IN - 0.1, ZOOM_IN + 0.5, t));

        if (bloom) bloom.strength = 0.2 + scanOn * 0.22;
      };

      /* 45fps — zoomed-in scene, same rate as container-vision. Previously
         uncapped. 1/46, see card-scene.tsx for why not 1/45. */
      const MIN_DT = 1 / 46;
      let last = -1;
      /* PRIME ONE FRAME, even off screen.
         The build timer said gate cost 76ms while the actual stall at its
         arrival was 285 — because the FIRST draw is where three compiles every
         shader program and uploads every texture to the GPU, and the onScreen
         gate below was deferring that draw until the scene was in shot. So the
         cheap-to-build scene still hitched on arrival.
         Drawing once at build time pays it during idle instead. Exactly one
         frame: after this the gate resumes and an off-screen scene costs
         nothing per frame, which is the reason the gate exists. */
      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame above. Measured on a genuinely cold browser session
         (empty on-disk shader cache): priming one frame still left a 1355 ms
         long task landing mid-scroll, because these scenes swap materials as the
         loop advances — wireframe to resolved, decals appearing at a phase — and
         a program compiles the first time it is actually drawn, which can be
         half a loop in. compileAsync walks the whole graph, and uses
         KHR_parallel_shader_compile where available so it does not block. */
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

      let primed = false;
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
        [...onVehicle, head].forEach((a) => a.wrap.remove());
        /* Scene-owned only. gateStencilTexture() is module-cached and shared —
           disposing it here would leave the next build sampling a dead texture,
           the hazard materials.ts spells out. */
        ground.material.dispose();
        roadMat.dispose(); roadGeo.dispose();
        laneMat.dispose(); laneGeo.dispose();
        stopMat.dispose(); stopGeo.dispose();
        stencilMat.dispose(); stencilGeo.dispose();
        sightCone.dispose();
        underMat.dispose(); underGeo.dispose();
        mats.dispose();
        cmats.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[gate-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "gate");
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
          whole component moves the readout and headline with it, and they end
          up sitting on top of the section's own copy — the subject is what is
          supposed to escape the box, not the type. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      {/* Leader lines and labels only — see the header note. */}
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

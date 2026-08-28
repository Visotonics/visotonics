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
import { buildGateMaterials, gateStencilTexture } from "./materials";
import { GANTRY_X, GROUND_Y, buildGate } from "./gate";

/* 4.6s over what was originally a 27.2-unit run (5.91 u/s), 52% faster than
   the previous 7.0s pass (3.9 u/s) and 2.4x the original 2.5 u/s — a second,
   explicit user call ("need gate vision to move much faster") on top of the
   first. The run is now 26.2 units (5.6957 u/s) after RUN_FROM/RUN_TO was
   tightened from +-13.6 to -12.9/+13.3 to cut dead frame time — see that
   comment, on RUN_FROM below, for the full arithmetic; the truck is still
   fully off-screen through the wrap, just with a smaller margin.

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
/* RE-TIGHTENED, -12.9 / +13.3, DOWN FROM +-13.6/+-13.6 — RUN_FROM/RUN_TO
   CHOSEN OVER LOOP, on purpose: this is the lever with no side effect on the
   READS/plate/seal/head windows below (all of them are phase fractions of
   LOOP, not of the run span — see the LOOP comment), so shrinking the run
   cannot rescale any label's on-screen seconds the way touching LOOP would.

   THE ARITHMETIC. The frame's own horizontal extent at this camera was
   already derived once, when OPENING.rad was re-fit for the real in-section
   canvas: roughly x in [-8.0, +7.4] (see that derivation above OPENING). The
   truck's extents are fixed geometry, established in gate.ts: nose (the
   trailer plate, the model's true foremost point) at local +4.715, tail
   (chassis deck rear) at local -5.70.

   For the vehicle to be FULLY off-frame at p=0 and p=1 — the standing
   invariant this scene depends on to hide the loop's wrap — the run's ends
   have to clear the frame edges by the truck's own overhang:
     nose hidden at p=0:  RUN_FROM + 4.715 <= -8.0   ->  RUN_FROM <= -12.715
     tail hidden at p=1:  RUN_TO   - 5.70  >=  7.4   ->  RUN_TO   >=  13.1
   The old +-13.6 cleared those minimums by 0.885 and 0.5 respectively — real
   margin, but more than the invariant needs. Tightened to the smallest
   values that still clear both with a small safety margin for the frame
   estimate's own imprecision (this scene has no browser to re-measure it
   in): RUN_FROM -12.9 (margin 0.185), RUN_TO +13.3 (margin 0.2).

   EFFECT ON DEAD TIME. Span drops 27.2 -> 26.2 units (-3.7%), and because
   the truck crosses that span in one fixed LOOP (4.6s), speed drops with it:
   26.2/4.6 = 5.6957 u/s (was 27.2/4.6 = 5.9130 u/s). Re-deriving the entry/
   exit fractions at the new span:
     entry (nose crosses -8.0):  vehicleX = -12.715
       p = (-12.715 - (-12.9)) / 26.2 = 0.185/26.2 = 0.0071
     exit  (tail crosses +7.4):  vehicleX =  13.1
       p = (13.1 - (-12.9)) / 26.2 = 26.0/26.2 = 0.9924
   Dead time (nothing on screen) = p<0.0071 plus p>0.9924 = 0.0071 + 0.0076 =
   0.0147 of the loop = 4.6 * 0.0147 = 0.068s per loop — down from the old
   0.0325 + 0.018 = 0.0505 of loop = 0.232s. A real cut (~71% less dead time
   by this estimate), though the absolute numbers here are already small: at
   this camera, per the frame's own prior derivation, most of the loop was
   ALREADY showing some part of the truck even before this change. FLAGGED
   HONESTLY: the frame-edge estimate above is inherited from an EARLIER pass
   of this file, not re-measured for this one (no browser here to re-derive
   it), and it does not fully explain a report of a COMPLETELY EMPTY frame at
   ?phase=0.18 — 0.18 sits well inside the old visible window either way. The
   far more likely cause of that specific symptom is fixed separately, in
   applyFrame: `solid` (the intro reveal ramp) used to be driven only by
   wall-clock time and ignored the `?phase` pin entirely, so a screenshot
   taken before ~1.4s of real time had elapsed showed a still-fading-in (or
   fully transparent) rig regardless of which phase was requested. See that
   fix's own comment for detail. This RUN_FROM/RUN_TO tightening is the
   secondary, compounding improvement on top of it. */
const RUN_FROM = -12.9;
const RUN_TO = 13.3;
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
         enough that all three are visible, and its look is signed off.

         EXPOSURE 1.18 -> 1.42. The whole rig was underexposed: the container
         (PALETTE.steel #2C3A63, a genuine mid-navy) was reading as near-black
         at most beats and the cab had almost no modelling on it. `exposure`
         is the studio's own scene-level knob for exactly this (see studio.ts's
         `StudioOpts.exposure` doc — "the default is set for a container-sized
         subject at container distance"), so the fix belongs here rather than
         in the shared rig. 1.42/1.18 = 1.203, a 20% lift — enough to bring the
         navy up to a readable mid-blue without the studio's white softboxes
         (already the brightest source in the room) clipping in turn; see the
         lens-material note in materials.ts for the other half of the
         exposure problem (a clipping specular, fixed at the material, not
         the room). */
      const studio = createStudio(wrap, { floorY: GROUND_Y, shadowExtent: 12, spread: 1.6, bare, maxDpr: 1.75, shadowMapSize: 1024, exposure: 1.42 });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject: gate + the real container on a chassis ---- */
      const _tg = performance.now();
      const gmark = (w: string) => {
        if (!location.search.includes("perf")) return;
        const g = window as unknown as { __visionGate?: string[] };
        (g.__visionGate ||= []).push(`${w} ${(performance.now() - _tg).toFixed(0)}`);
      };
      const cmats = buildMaterials();
      /* THE CONTAINER'S OWN LIFT. `buildMaterials()` is a factory — a fresh
         MeshStandardMaterial instance per call, not a shared singleton (see
         container-vision/materials.ts: the module only caches the CANVAS
         textures, never the material) — so raising these two instances'
         envMapIntensity here is scoped to Gate Vision's own container and
         cannot leak into Container Vision's build, which calls the same
         factory separately. `steel` (the corrugated panels, the container's
         own huge surface area) 0.32 -> 0.52; `dark` (hardware) 0.45 -> 0.65.
         Both are the same +0.20 absolute lift as the exposure change above,
         so the container gets a second, targeted pass on top of the room-wide
         one — it is the single largest surface in frame and was the
         specific complaint ("reads as near-black navy"). */
      cmats.steel.envMapIntensity = 0.52;
      cmats.dark.envMapIntensity = 0.65;
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
         because these are opaque and depth-sorted honestly.

         THE MATERIAL IS mats.road NOW, NOT A LOCAL FLAT FILL — see
         materials.ts's note: it carries hero-cards/skins.ts's shared
         `concreteFloor()` map (reused, not repainted) so the lane reads as a
         surface with aggregate and pour joints rather than a flat colour
         under the truck's shadow. */
      const roadGeo = new THREE.PlaneGeometry(30, 4.1);
      const road = new THREE.Mesh(roadGeo, mats.road);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, GROUND_Y + 0.008, 0);
      road.receiveShadow = true;
      scene.add(road);

      /* ---- THE APRON: the ground beyond the lane ----
         Everything used to end at the road's 4.1-wide shoulder and the gantry
         column — past that, nothing, so the frame ran out into black at every
         beat except dead-centre on the truck. `mats.apron` carries the same
         `concreteFloor()` map as the road (wider tile, lighter tint — see
         materials.ts) and this plane is sized to run well past every camera
         edge computed for the timing rebalance below (frame half-width was
         derived at roughly 10-11 units either side of the lane centre; a
         40x40 apron centred on the lane covers that with margin to spare in
         every direction, including behind the gantry). Sits BELOW the road
         and the drafting grid (GROUND_Y - 0.02, under the grid's
         GROUND_Y - 0.012) so the stack reads grid -> road -> paint from above
         with the apron never fighting either. Subordinate on purpose: no
         markings, no lane paint, roughness 0.96 and a low envMapIntensity so
         it recedes rather than competing with the truck or the overlays. */
      const apronGeo = new THREE.PlaneGeometry(40, 40);
      const apron = new THREE.Mesh(apronGeo, mats.apron);
      apron.rotation.x = -Math.PI / 2;
      apron.position.set(0, GROUND_Y - 0.02, 0);
      apron.receiveShadow = true;
      scene.add(apron);

      /* ---- two yard light poles, far back on the apron ----
         A place needs SOMETHING at the edge of the frame that isn't the
         gantry or the truck, or the apron just reads as more void with a
         texture on it. Two simple poles, well outside the lane and well
         behind the gantry column (colZ = -3.5 in gate.ts), subordinate in
         every sense: no shadow casting (a cost with nothing to show for it
         at this distance), no detail beyond a shaft and a lit cap, and the
         cap uses `mats.headlamp` — the same small emissive material as the
         truck's own lamps, not a new colour to reconcile against the accent
         rule. Kept tiny in frame on purpose; they read as depth cues, not
         subjects. Geometry/material here are SCENE-OWNED (plain, undisposed
         nowhere else) and go in the same cleanup list as the lane lines. */
      const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 4.2, 8);
      const capGeo = new THREE.SphereGeometry(0.09, 10, 8);
      const poleMat = new THREE.MeshStandardMaterial({
        color: "#20242A", roughness: 0.7, metalness: 0.3,
        transparent: true, opacity: 0,
      });
      for (const [px, pz] of [[-7.5, -9], [8.5, -10]] as const) {
        const shaft = new THREE.Mesh(poleGeo, poleMat);
        shaft.position.set(px, GROUND_Y + 2.1, pz);
        scene.add(shaft);
        const cap = new THREE.Mesh(capGeo, mats.headlamp);
        cap.position.set(px, GROUND_Y + 4.25, pz);
        scene.add(cap);
      }

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
         the more honest picture of how the read happens.

         THE CONE BELONGS TO THE RIG NOW. It is built in gate.ts by
         `buildReadCamera`, which owns the apex, the half-angle and the
         ground pool; this scene only says WHERE to look. Its group is added
         to the scene rather than to `model.fixed` because the pool at its
         foot must stay flat in world XZ — see readCamera.ts's note on why
         the cone is a sibling, never a child, of the head. */
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
         atan(0.8 / 5.1692) = 0.15355 rad — reproduced exactly by the rig's
         identical atan(coneRadius / range) formula, `coneRadius: 0.8` passed
         in gate.ts.

         This ALSO retargets the housing's own build-time aim (a synthetic
         point chosen in gate.ts to reproduce the hand-built 0.34 rad
         cosmetic tilt, unrelated to where the cone points) onto the real
         target. Because `headTracks: false`, `aimAt` only re-throws the
         cone — the housing keeps the orientation it was built with. */
      model.readCam.aimAt(coneTarget);
      const sightCone = model.readCam.cone;
      scene.add(model.readCam.coneGroup);

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
          title: r.title, detail: r.detail,
          pos: model.anchors.id.pos, normal: model.anchors.id.normal,
          onDark: true,
          lane: { dir: "up", len: 96 }, win: r.win,
        }),
      );
      // win widened ×1.522 to hold the same 0.98s it did at the old LOOP —
      // see the LOOP comment for the arithmetic.
      const plate = createCallout(overlay, {
        title: "Trailer plate", detail: "MH 43 AT 7712",
        pos: model.anchors.plate.pos, normal: model.anchors.plate.normal,
        onDark: true,
        lane: { dir: "down", len: 56 }, win: [0.30, 0.5130],
      });
      // the schematic's "SEAL · CHECKED" and "FACE · REAR · CAM 1/1" — both
      // read off the door end as it clears the heads
      // win widened ×1.522 to hold the same 0.98s it did at the old LOOP.
      // Still well inside the tail's frame-exit, now p=0.9924 after the
      // RUN_FROM/RUN_TO tightening (see that comment).
      const seal = createCallout(overlay, {
        title: "Seal checked", detail: "88421 · rear face · cam 1/1",
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
        title: "Gate 04 · in", detail: "Night · rain · fog · dust",
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
        /* `solid` used to be driven ONLY by wall-clock `t`, disconnected from
           the `?phase` pin. `holdP` freezes the vehicle's POSITION instantly
           but the reveal ramp still took its usual 0.45-1.40s of real time to
           reach opacity 1 — so a screenshot taken shortly after the page
           loads, at ANY `?phase` value, shows a still-fading-in (or fully
           invisible) rig. That is a very plausible explanation for "?phase=
           0.18 is a completely empty frame": the review tool pins the loop
           position but was never told to also skip the intro fade. Fixed the
           same way `frozen` already is — pinning a phase now snaps `solid` to
           1 immediately, same as reduced-motion, so a review screenshot is
           meaningful the instant the page paints rather than ~1.4s later. */
        const solid = (frozen || holdP !== null) ? 1 : easeInOut(clamp01((t - 0.45) / 0.95));
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
        // road/apron opacity is carried by the `mats.all` sweep above now —
        // both are gate materials, not scene-local ones, since the reuse.
        laneMat.opacity = solid * 0.3;
        stopMat.opacity = solid * 0.5;
        stencilMat.opacity = solid * 0.55;
        poleMat.opacity = solid;

        /* Barrier choreography — the scene's claim, animated. The arm is DOWN
           and waiting through the whole approach — the state the loop's empty
           beat opens on — and STARTS RISING at the fixed phase p=0.42.

           DELIBERATELY KEPT ON THE OLD FIXED PHASE POINTS, not re-tied to the
           Resolved read's win, which now starts later (0.4826, widened so the
           label holds its original absolute time — see LOOP and READS). The
           barrier's 0.42 is a physical deadline, not a narrative cue.

           ARITHMETIC — RE-DERIVED FOR THE RUN_FROM/RUN_TO TIGHTENING ABOVE.
           The old derivation here was pinned to +-13.6; RUN_FROM/RUN_TO moved
           to -12.9/+13.3 (see that comment), so vehicleX(p) is now
           -12.9 + 26.2p, and every downstream crossing point shifts with it.
           Boom stays at x=6.4 (untouched by the timing change).
             front: trailer plate at +4.715 (the model's true foremost point —
               see the extents note in gate.ts). Crosses 6.4 when
               vehicleX = 1.685, i.e. p = (1.685 + 12.9) / 26.2 = 0.5567.
             tail: chassis deck rear at -5.70. Clears 6.4 when vehicleX = 12.1,
               p = (12.1 + 12.9) / 26.2 = 0.9542.
           The rise (0.42..0.52) is fully clear at p=0.52, 0.0367 of the loop
           before the front reaches the boom — 0.0367 * 4.6 = 0.169s of margin
           (was 0.193s before the run was tightened). Still positive, still
           safe, just tighter, same trade the run-tightening made everywhere
           else: the truck never slows, read on the move, no stop-and-shoot.

           LOWERING WAS MOVED, NOT JUST RE-EXPLAINED: the old window (0.95 to
           1.00) started BEFORE the new tail-clear point of 0.9542 — the arm
           would have begun dropping onto a trailer that had not yet cleared
           the boom, which the old +-13.6 numbers never exposed because tail-
           clear used to land at 0.9449, comfortably before 0.95. Moved the
           lowering window to 0.97..1.00 (start pushed 0.95 -> 0.97, still a
           0.03 fall so it lands fully down exactly at the wrap): margin from
           tail-clear to lowering-start is 0.97 - 0.9542 = 0.0158 of the loop
           = 0.073s — smaller than the rise's margin, but positive, and the
           arm still descends just behind the departing trailer (tail exits
           frame at the RUN_TO derivation's own p=0.9924) and is fully down AT
           the wrap, which is what puts the "gate closed, waiting" beat on
           screen for the whole of the next truck's approach (0.0..0.42).
           PRODUCT of the two eases, not max: down at both ends of the cycle
           is the shape, and the product is 0 at p=0 and p=1 by construction,
           so the wrap cannot pop. */
        const upT =
          easeInOut(clamp01((cp - 0.42) / 0.10)) *
          (1 - easeInOut(clamp01((cp - 0.97) / 0.03)));
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
        // roadMat/apronMat are gone — road and apron now draw through
        // mats.road/mats.apron, disposed by mats.dispose() below. Only the
        // scene-owned GEOMETRY is ours to drop here.
        roadGeo.dispose(); apronGeo.dispose();
        poleGeo.dispose(); capGeo.dispose(); poleMat.dispose();
        laneMat.dispose(); laneGeo.dispose();
        stopMat.dispose(); stopGeo.dispose();
        stencilMat.dispose(); stencilGeo.dispose();
        model.readCam.dispose();
        model.owned.forEach((g) => g.dispose());
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

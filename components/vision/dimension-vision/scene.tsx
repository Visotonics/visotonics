"use client";

/* ---------------------------------------------------------------------------
   Dimension Vision — "The tape measure retires."

   CAPTURED, NOT ESTIMATED — AND NEVER TWO ANSWERS FROM TWO PEOPLE
   EVIDENCE ATTACHED — THE ANNOTATED IMAGE RIDES WITH THE NUMBER
   IRREGULARS INCLUDED — SACKS, DRUMS, SOFT PACKS, CYLINDERS

   The claim is discrimination on IRREGULARS, not measurement of a box a tape
   measure would handle fine — so the subject of the measurement beat is a
   slumped hessian sack, not the carton or the drum sitting beside it for
   context. See dimension.ts's header and docs/17-scene-plans-audit-dimension-
   secure.md section 2 for the full spec this file implements.

   THE LOOP, p = 0..1 over 10.0s (spec 2.8):
     0.00-0.10  hold, cone at rest on the pallet centre
     0.10-0.22  SURVEY — a faint bracket sweeps carton -> drum -> sack
     0.22-0.30  the cone settles on the sack, accent tracker locks
     0.30-0.40  a horizontal scan plane sweeps the sack bottom -> top
     0.40-0.56  THE CAGE draws on, 12 edges, staggered by axis
     0.56-0.72  three dimension chains extend, staggered 0.04 apart
     0.72-0.80  THE CONCLUSION — chain ticks flash #ED510C, volume resolves
                white at 44px with an orange left rule
     0.80-0.90  the evidence chip lands — a live-canvas crop of the caged sack
     0.90-0.98  hold, everything legible together
     0.98-1.00  wrap — chains, cage, chip and bracket fade; state = p=0

   THE VOLUME FIGURE IS WHITE, NOT BLUE OR ORANGE (spec 2.8's own note,
   following Cargo Vision's counter precedent): the number IS the claim, so it
   gets `--text-metric` display treatment. Blue is the OBSERVING colour and
   would compete with the cage/bracket for that meaning; orange gets placement
   only, via the left rule — the one conclusion mark this loop spends.

   THE CAGE AND THE LABELS ARE MEASURED, NOT ASSUMED. dimension.ts builds the
   sack with a seeded, deterministic vertex displacement and reads its true
   bounds back with `Box3` immediately after build. Every number this scene
   draws — the cage's own edges, the three chain lengths, the readout, the
   volume figure — comes from that ONE measurement (`model.sackBounds`), so
   the cage can never disagree with the label sitting next to it.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, placeCamera, smoothstep, makeCamPath, type CamKey } from "../_vision/camera";
import { createReadout, makeProjector } from "../_vision/overlay";
import { createTracker, detectMaterials } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import { buildPendantLamp } from "../_vision/lamp";
import {
  GROUND, buildDimension, buildDimensionMaterials, type DimensionModel,
} from "./dimension";

export { warmDimensionTextures } from "./dimension";

const LOOP = 10.0;
const SETTLE = 0.9;

/* Reduced-motion still frame, parked on THE CONCLUSION — the cage is drawn,
   the chains are up, and the volume figure has just resolved. */
const FROZEN_T = 7.6;
const FROZEN_P = 0.76;

/* ---- camera (spec 2.2) -----------------------------------------------------

   The studio camera is a 30deg vertical FOV, TAN_VFOV_HALF = tan(15deg).
   Worked at the real slot (813 x 560 -> 661 x 455 visible, aspect 1.452),
   subject = pallet + load, 1.70 wide x 1.44 tall:

     sMaxH = 0.72          FRAC_H = 0.68
     sMaxW = 0.85          FRAC_W = 0.62
     radH  = 0.72 / (0.68 * 0.267949)          = 3.951
     radW  = 0.85 / (0.62 * 0.267949 * 1.452)  = 3.524
     rad   = 3.951                              (HEIGHT binds)

   Re-derived here rather than hardcoded, from the LIVE canvas aspect every
   frame — see _vision/readCamera.ts's own precedent and 17-scene-plans'
   section 0.6. At rad ~=3.95 createTracker's stroke auto-corrects (its
   distance/STROKE_REF_DIST(10) scale is a near no-op at this range) so no
   extra correction is needed here. */
const VFOV_HALF = (30 * Math.PI) / 180 / 2;
const TAN_VFOV_HALF = Math.tan(VFOV_HALF);
/* 0.68 -> 0.56. At 0.68 the pallet spanned so much of the frame's height that
   the six-row readout column on the right had nowhere to sit that was not on
   top of the drum or the cage's right bracket — and the two rows it landed on,
   BOUNDING VOL and ACTUAL VOL, are the scene's whole argument.

   Widening the fit is the right lever rather than moving the readout, which had
   no clear band to move INTO: above the cage there are ~140px against the six
   rows' ~165px, and below it the pallet runs to the frame floor.

   It also buys back context. Tank Vision's lesson was that a close-up still has
   to contain enough of the object to say what the object is; at 0.56 the pallet,
   all three items and the gantry feet read as one measuring station instead of
   a sack filling the frame.

     radH = 0.72 / (0.56 * 0.267949) = 4.797   (was 3.951) */
const FRAC_H = 0.56;
const FRAC_W = 0.62;
const S_MAX_H = 0.72;
const S_MAX_W = 0.85;
const CAM_Y = 1.55;
const LOOK_Y = 0.55;
const RAD_MIN = 2.4;
const RAD_MAX = 14;

/* Five keys, cyclic, no key at p=1 — see camera.ts's header. Azimuth never
   drops below 0.28: below that the three dimension chains project onto each
   other and stop reading as three separate axes (spec 2.9). */
/* THE LOOK-AT IS OFFSET +X SO THE SUBJECT SITS LEFT OF CENTRE.

   The readout is a six-row column pinned to `right: 34px`, and the subject was
   centred — so the lower three rows (BOUNDING VOL / ACTUAL VOL / CLASS) landed
   on top of the drum and the cage's right bracket. Those are the two rows that
   carry the scene's entire argument, so text-on-subject there is not cosmetic.

   Aiming +0.30 in x moves the subject LEFT in frame by 0.30 world units. At the
   widest key that is 0.30 / (rad * TAN_VFOV_HALF * aspect) = 0.30 / 1.537 =
   0.195 of a half-frame, i.e. ~19.5% of half the width — enough to clear the
   readout column, and it fills the dead space that was sitting bottom-left.

   The alternative — moving the readout — has nowhere to go: six rows need
   ~165px and there is only ~140px of clear canvas above the cage. */
/* 0.30 -> 0.62. 0.30 cleared the readout at the LAB stage (900px) and did not
   clear it in the real Warehouse slot (~660px), because the readout is a
   fixed-px overlay: the narrower the canvas, the larger the fraction of frame
   it occupies, so the subject has to move further left to get out from under
   it. Scaling the panel (see the readout block in applyFrame) recovers part of
   that but not all of it.

   Half-frame width at the binding key: rad 4.797 * TAN_VFOV_HALF * 1.452
   = 4.797 * 0.267949 * 1.452 = 1.866 world units. So 0.62 shifts the subject
   left by 0.62 / 1.866 = 33% of a half-frame, against 16% before — enough to
   put the cage's right bracket clear of the readout column at the production
   width while still leaving the pallet inside the frame on the left
   (subject half-width 0.85 vs 1.866 available). */
const LOOK_X = 0.62;
const CAM_KEYS: CamKey[] = [
  { p: 0.00, az: 0.62, rad: 3.95, t: [LOOK_X + 0.00, LOOK_Y, 0.00] },
  { p: 0.24, az: 0.50, rad: 3.86, t: [LOOK_X - 0.06, LOOK_Y, 0.02] },
  { p: 0.48, az: 0.38, rad: 3.72, t: [LOOK_X - 0.02, LOOK_Y, 0.04] },
  { p: 0.72, az: 0.30, rad: 3.64, t: [LOOK_X + 0.00, LOOK_Y, 0.04] },
  { p: 0.90, az: 0.46, rad: 3.88, t: [LOOK_X - 0.02, LOOK_Y, 0.02] },
];
const camPath = makeCamPath(CAM_KEYS);

/* ---- beats (spec 2.8) ------------------------------------------------- */
const W_SURVEY: [number, number] = [0.10, 0.22];
const SURVEY_TOUCH = 0.03; // each item held for this fraction of p
const W_SETTLE: [number, number] = [0.22, 0.30];
const W_SCAN: [number, number] = [0.30, 0.40];
const CAGE_START = 0.40;
const CAGE_VERT_AT = 0.40;
const CAGE_BOTTOM_AT = 0.44;
const CAGE_TOP_AT = 0.48;
const CAGE_EDGE_DUR = 0.06; // each edge finishes drawing 0.02 after its axis starts, but stays legible through the chain beat
const W_CHAINS: [number, number] = [0.56, 0.72];
const CHAIN_STAGGER = 0.04;
const W_CONCLUDE: [number, number] = [0.72, 0.80];
const W_EVIDENCE: [number, number] = [0.80, 0.90];
const OUT_IN = 0.98;
const OUT_OUT = 1.0;

const CONCLUSION = "#ED510C";
const mono = "var(--font-plex-mono)";
const sans = "var(--font-archivo)";

/** Local-space chain: a dimension line offset outward from the cage, with two
    short extension ticks tying it back to the cage's own corner. */
interface Chain {
  group: THREE.Group;
  main: THREE.Line;
  mainGeo: THREE.BufferGeometry;
  tickA: THREE.Line;
  tickB: THREE.Line;
  matMain: THREE.LineBasicMaterial;
  matTick: THREE.LineBasicMaterial;
  from: THREE.Vector3;
  to: THREE.Vector3;
  mid: THREE.Vector3;
  labelEl: HTMLDivElement;
}

function makeLine(mat: THREE.LineBasicMaterial): { line: THREE.Line; geo: THREE.BufferGeometry } {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geo, mat);
  return { line, geo };
}

function setLine(geo: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3) {
  const attr = geo.attributes.position as THREE.BufferAttribute;
  attr.setXYZ(0, a.x, a.y, a.z);
  attr.setXYZ(1, b.x, b.y, b.z);
  attr.needsUpdate = true;
}

/** `t` reveals the line from `from` toward `to`, 0..1. */
function revealLine(geo: THREE.BufferGeometry, from: THREE.Vector3, to: THREE.Vector3, t: number) {
  const cur = from.clone().lerp(to, clamp01(t));
  setLine(geo, from, cur);
}

function buildChain(
  overlay: HTMLElement, group: THREE.Group, matMain: THREE.LineBasicMaterial, matTick: THREE.LineBasicMaterial,
  from: THREE.Vector3, to: THREE.Vector3, labelText: string,
): Chain {
  const { line: main, geo: mainGeo } = makeLine(matMain);
  group.add(main);
  const { line: tickA, geo: tickAGeo } = makeLine(matTick);
  const { line: tickB, geo: tickBGeo } = makeLine(matTick);
  group.add(tickA); group.add(tickB);
  (tickA as unknown as { _geo: THREE.BufferGeometry })._geo = tickAGeo;
  (tickB as unknown as { _geo: THREE.BufferGeometry })._geo = tickBGeo;

  const labelEl = document.createElement("div");
  labelEl.textContent = labelText;
  labelEl.style.cssText =
    `position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;pointer-events:none;` +
    `font-family:${mono};font-size:12px;font-weight:600;letter-spacing:0.04em;color:${PALETTE.accentText};` +
    `background:rgba(6,8,13,0.72);padding:2px 6px;border-radius:2px;opacity:0;will-change:transform,opacity;`;
  overlay.appendChild(labelEl);

  return {
    group, main, mainGeo, tickA, tickB, matMain, matTick,
    from: from.clone(), to: to.clone(), mid: from.clone().lerp(to, 0.5), labelEl,
  };
}

/** `bare` lifts the scene out of its frame — see ContainerVisionScene. */
export default function DimensionVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
      /* floorY: 0.149 — just above the pallet deck at 0.145, so the studio's
         own catcher takes the CARGO's contact shadow at the surface it rests
         on (spec 2.7). A second catcher below, at y=0.004, takes the
         pallet's own shadow on the floor. */
      const studio = createStudio(wrap, {
        floorY: 0.149, shadowExtent: 3.2, spread: 0.75, bare,
        exposure: 0.58, bloom: false, shadowMapSize: 1024, maxDpr: 1.75,
        lightRig: "full", noEnv: false,
      });
      const { renderer, scene, camera, shadowMat } = studio;

      /* ---- subject ---- */
      const mats = buildDimensionMaterials();
      const model: DimensionModel = buildDimension(mats);
      scene.add(model.root);
      /* The cone is a SIBLING of the housing, never a child of anything that
         rotates — its ground pool must stay flat in world XZ. See
         _vision/readCamera.ts's header. */
      scene.add(model.readCam.coneGroup);

      /* the pallet's OWN shadow catcher, on the floor below the deck */
      const floorShadow = new THREE.ShadowMaterial({ opacity: 0 });
      const floorCatcher = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), floorShadow);
      floorCatcher.rotation.x = -Math.PI / 2;
      floorCatcher.position.y = 0.004;
      floorCatcher.receiveShadow = true;
      scene.add(floorCatcher);

      const ground = draftingGround({
        size: 30, y: 0.008, step: 0.5, color: PALETTE.grid,
        opacity: 0.15, glow: 3.0, majorBoost: 2.4, fadeStart: 0.42, fadeEnd: 1.0,
      });
      scene.add(ground.mesh);

      const lamp = buildPendantLamp({
        /* beamR 0.55 -> 0.40: at 0.55 the cone's mouth was wider than the sack
           and swallowed the top of it, so the subject's own value was being set
           by the beam rather than by its material. Narrower reads more like a
           task light over a station and less like a spotlight on a stage. */
        x: 0, y: 2.05, z: 0.55, planeY: GROUND + 0.145, ceilingY: 3.2,
        wireMat: mats.steelDark, beamR: 0.40, shadeR: 0.19, shadeCastsShadow: true,
      });
      model.owned.push(...lamp.owned);
      mats.all.push(lamp.shade, lamp.bulb, lamp.halo, lamp.beam);
      scene.add(lamp.group);

      /* ---- the survey / lock trackers ---- */
      const dm = detectMaterials();
      const faintMat = dm.faint.clone();
      const surveyTracker = createTracker(faintMat, { pad: 1.18 });
      scene.add(surveyTracker.group);
      const accentMat = dm.accent.clone();
      const lockTracker = createTracker(accentMat, { pad: 1.10 });
      scene.add(lockTracker.group);

      /* ---- the scan plane — horizontal, sweeps the sack bottom -> top ---- */
      const bb = model.sackBounds;
      const scanW = Math.max(bb.L, bb.W) * 1.15;
      const scanGeo = new THREE.PlaneGeometry(scanW, scanW);
      model.owned.push(scanGeo);
      const scanMat = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0,
        toneMapped: false, depthWrite: false, side: THREE.DoubleSide,
      });
      mats.all.push(scanMat);
      const scanMesh = new THREE.Mesh(scanGeo, scanMat);
      scanMesh.rotation.x = -Math.PI / 2;
      model.sackGroup.add(scanMesh);

      /* ---- THE CAGE: 12 edges, drawn on rather than popped -------------- */
      const cageGroup = new THREE.Group();
      model.sackGroup.add(cageGroup);
      const cageMat = new THREE.LineBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
      });
      mats.all.push(cageMat);
      const { min: cMin, max: cMax } = bb;
      const corner = (ix: 0 | 1, iy: 0 | 1, iz: 0 | 1) => new THREE.Vector3(
        ix ? cMax.x : cMin.x, iy ? cMax.y : cMin.y, iz ? cMax.z : cMin.z,
      );
      /* 12 edges: 4 vertical, 4 bottom, 4 top — staggered by axis per spec. */
      type Edge = { a: THREE.Vector3; b: THREE.Vector3; geo: THREE.BufferGeometry; group: "vert" | "bottom" | "top" };
      const edges: Edge[] = [];
      const addEdge = (a: THREE.Vector3, b: THREE.Vector3, group: Edge["group"]) => {
        const { line, geo } = makeLine(cageMat);
        cageGroup.add(line);
        edges.push({ a, b, geo, group });
      };
      for (const ix of [0, 1] as const) for (const iz of [0, 1] as const) addEdge(corner(ix, 0, iz), corner(ix, 1, iz), "vert");
      for (const iy of [0] as const) {
        addEdge(corner(0, 0, 0), corner(1, 0, 0), "bottom");
        addEdge(corner(1, 0, 0), corner(1, 0, 1), "bottom");
        addEdge(corner(1, 0, 1), corner(0, 0, 1), "bottom");
        addEdge(corner(0, 0, 1), corner(0, 0, 0), "bottom");
      }
      for (const iy of [1] as const) {
        addEdge(corner(0, 1, 0), corner(1, 1, 0), "top");
        addEdge(corner(1, 1, 0), corner(1, 1, 1), "top");
        addEdge(corner(1, 1, 1), corner(0, 1, 1), "top");
        addEdge(corner(0, 1, 1), corner(0, 1, 0), "top");
      }
      const cageAxisStart = { vert: CAGE_VERT_AT, bottom: CAGE_BOTTOM_AT, top: CAGE_TOP_AT };

      /* ---- THE THREE DIMENSION CHAINS ------------------------------------
         L (front edge, near-bottom), W (right edge, near-bottom), H (near-
         left vertical). Each is a dimension line offset outward from the
         cage by a standoff, with two extension ticks tying it to the cage's
         own corners — standard drafting convention. */
      const STANDOFF = 0.07;
      const chainMat = new THREE.LineBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
      });
      const tickMat = new THREE.LineBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
      });
      mats.all.push(chainMat, tickMat);

      const chainGroup = new THREE.Group();
      model.sackGroup.add(chainGroup);

      const lFrom = new THREE.Vector3(cMin.x, cMin.y, cMax.z + STANDOFF);
      const lTo = new THREE.Vector3(cMax.x, cMin.y, cMax.z + STANDOFF);
      const chainL = buildChain(overlay, chainGroup, chainMat, tickMat, lFrom, lTo, `L ${bb.L.toFixed(3)} m`);
      setLine((chainL.tickA as unknown as { _geo: THREE.BufferGeometry })._geo, new THREE.Vector3(cMin.x, cMin.y, cMax.z), lFrom);
      setLine((chainL.tickB as unknown as { _geo: THREE.BufferGeometry })._geo, new THREE.Vector3(cMax.x, cMin.y, cMax.z), lTo);

      const wFrom = new THREE.Vector3(cMax.x + STANDOFF, cMin.y, cMin.z);
      const wTo = new THREE.Vector3(cMax.x + STANDOFF, cMin.y, cMax.z);
      const chainW = buildChain(overlay, chainGroup, chainMat, tickMat, wFrom, wTo, `W ${bb.W.toFixed(3)} m`);
      setLine((chainW.tickA as unknown as { _geo: THREE.BufferGeometry })._geo, new THREE.Vector3(cMax.x, cMin.y, cMin.z), wFrom);
      setLine((chainW.tickB as unknown as { _geo: THREE.BufferGeometry })._geo, new THREE.Vector3(cMax.x, cMin.y, cMax.z), wTo);

      const hFrom = new THREE.Vector3(cMin.x - STANDOFF, cMin.y, cMin.z);
      const hTo = new THREE.Vector3(cMin.x - STANDOFF, cMax.y, cMin.z);
      const chainH = buildChain(overlay, chainGroup, chainMat, tickMat, hFrom, hTo, `H ${bb.H.toFixed(3)} m`);
      setLine((chainH.tickA as unknown as { _geo: THREE.BufferGeometry })._geo, new THREE.Vector3(cMin.x, cMin.y, cMin.z), hFrom);
      setLine((chainH.tickB as unknown as { _geo: THREE.BufferGeometry })._geo, new THREE.Vector3(cMin.x, cMax.y, cMin.z), hTo);

      const chains = [chainL, chainW, chainH];

      /* ---- the readout ---- */
      const readout = createReadout(overlay, "DIMENSION · CAP-8841", [
        ["LENGTH", `${bb.L.toFixed(3)} m`],
        ["WIDTH", `${bb.W.toFixed(3)} m`],
        ["HEIGHT", `${bb.H.toFixed(3)} m`],
        ["BOUNDING VOL", `${bb.cageVolume.toFixed(4)} m³`],
        ["ACTUAL VOL", `${bb.actualVolume.toFixed(4)} m³`],
        ["CLASS", "SACK · IRREGULAR"],
      ]);
      readout.panel.style.left = "auto";
      readout.panel.style.right = "34px";

      /* ---- the volume figure and the evidence chip: SHARE ONE STACK -------

         THEY WERE IN THE SAME CORNER BY CONSTRUCTION. The volume box sat at
         `left:5%; bottom:16%` and the chip at `left:6%; bottom:10%` — two
         percentage-anchored boxes whose CONTENT is fixed-px (a 44px number,
         a 148x100 chip), which is the exact "absolutely-sized type inside a
         percentage-sized box" trap DECISIONS.md already names (2026-08-04,
         document-vision): at the lab's ~900px stage the percent gap between
         them happened to clear, and at the real ~660px Warehouse slot the
         same percent offsets close in while the px content does not shrink,
         so they collide. Measured with getBoundingClientRect() at 900px
         wide before this fix: volBox 213x65 at (77,548), chip 148x100 at
         (85,547) — a 148x65px overlap, i.e. the chip's entire width.

         FIX: both are now anchored by fixed PX offsets from the overlay's
         own bottom-left corner (REF_W below, same 880px reference the
         readout panel already uses) and stacked with an authored gap, so the
         two can never occupy the same band regardless of width. Both then
         carry the SAME `Math.min(1, w / REF_W)` scale as the readout, from
         `transform-origin: bottom left` so the anchor corner never moves and
         the stack only shrinks toward it — the corner is dead space by
         design (see LOOK_X's own note on why the subject sits right of
         centre), so shrinking toward it never walks the stack under the
         subject. */
      const REF_W = 880;
      const CHIP_W = 148, CHIP_H = 100;
      const STACK_LEFT = 24;
      const CHIP_BOTTOM = 24;
      const VOL_BOTTOM = CHIP_BOTTOM + CHIP_H + 18; // 18px clear gap above the chip

      /* ---- the volume figure — its own DOM element, white display type ---- */
      const volBox = document.createElement("div");
      volBox.style.cssText =
        `position:absolute;left:${STACK_LEFT}px;bottom:${VOL_BOTTOM}px;opacity:0;` +
        "transition:opacity .3s ease;pointer-events:none;transform-origin:bottom left;" +
        `border-left:2px solid ${CONCLUSION};padding-left:16px;`;
      const volNum = document.createElement("div");
      volNum.textContent = `${bb.cageVolume.toFixed(4)} m³`;
      volNum.style.cssText =
        `font-family:${sans};font-size:44px;font-weight:600;line-height:1;letter-spacing:-0.02em;color:#FFFFFF;font-variant-numeric:tabular-nums;`;
      const volCap = document.createElement("div");
      volCap.textContent = "BOUNDING VOLUME";
      volCap.style.cssText =
        `font-family:${mono};font-size:10px;font-weight:500;letter-spacing:0.22em;color:rgba(255,255,255,0.55);padding-top:6px;`;
      volBox.appendChild(volNum);
      volBox.appendChild(volCap);
      overlay.appendChild(volBox);

      /* ---- the evidence chip: a live-canvas crop of the caged sack ------- */
      const chip = document.createElement("div");
      chip.style.cssText =
        `position:absolute;left:${STACK_LEFT}px;bottom:${CHIP_BOTTOM}px;width:${CHIP_W}px;height:${CHIP_H}px;` +
        "opacity:0;pointer-events:none;transform-origin:bottom left;" +
        `will-change:opacity,transform;background:#0E1116;overflow:hidden;box-sizing:border-box;border:1px solid ${PALETTE.accent};`;
      const chipCanvas = document.createElement("canvas");
      chipCanvas.width = 296; chipCanvas.height = 200;
      chipCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
      chip.appendChild(chipCanvas);
      const chipCaption = document.createElement("div");
      chipCaption.textContent = "CAP-8841 · 12:04:07";
      chipCaption.style.cssText =
        `position:absolute;left:5px;bottom:4px;font-family:${mono};font-size:8px;font-weight:500;letter-spacing:0.06em;color:rgba(226,234,244,0.82);`;
      chip.appendChild(chipCaption);
      overlay.appendChild(chip);
      const chipCtx = chipCanvas.getContext("2d", { willReadFrequently: true });
      let chipGrabbed = false;

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
      const target = new THREE.Vector3();
      const opening = { az: CAM_KEYS[0].az, rad: CAM_KEYS[0].rad, tx: CAM_KEYS[0].t[0], ty: LOOK_Y, tz: CAM_KEYS[0].t[2] };
      let raf = 0;

      const project = makeProjector(camera, model.sackGroup);
      const wpos = new THREE.Vector3();

      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;
        const oh = h - bleed * 2;

        /* ---- camera ---- */
        const aspect = w / h;
        const radH = S_MAX_H / (FRAC_H * TAN_VFOV_HALF);
        const radW = S_MAX_W / (FRAC_W * TAN_VFOV_HALF * aspect);
        const fit = Math.min(RAD_MAX, Math.max(RAD_MIN, Math.max(radH, radW)));
        const scale = fit / CAM_KEYS[0].rad; // keep the authored key ring's relative shape, scaled to fit
        const io = frozen ? 1 : easeInOut(clamp01((t - 0.1) / 0.7));
        const raw = camPath(p);
        const pose = {
          az: THREE.MathUtils.lerp(opening.az, raw.az, io),
          rad: THREE.MathUtils.lerp(opening.rad, raw.rad, io) * scale,
          tx: THREE.MathUtils.lerp(opening.tx, raw.tx, io),
          ty: LOOK_Y,
          tz: THREE.MathUtils.lerp(opening.tz, raw.tz, io),
        };
        target.set(pose.tx, LOOK_Y, pose.tz);
        placeCamera(camera, pose, CAM_Y);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- intro settle ---- */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        for (const mat of [mats.paintBlue, mats.hessian, mats.kraft, mats.timber, mats.deck, mats.steelDark, mats.steelMid, mats.calib, mats.lensGlass]) {
          mat.opacity = solid;
        }
        lamp.shade.opacity = solid;
        /* THE LAMP EXPLAINS THE LIGHT; IT IS NOT THE SUBJECT — but it was also
           NOT what made the frame too bright. The big white cone on review was
           the detection cone (additive, see readCam.setOpacity below); the lamp
           was pulled down twice chasing it before that was measured. These are
           a modest trim from the originals (bulb 1.0, halo 0.55, beam 0.09),
           kept because the pool genuinely was a shade hot over a subject this
           small — not the aggressive cut the misdiagnosis produced. */
        lamp.bulb.opacity = solid * 0.85;
        lamp.halo.opacity = solid * 0.40;
        lamp.beam.opacity = solid * 0.055;
        lamp.light.intensity = solid * 9.5;
        shadowMat.opacity = 0.42 * solid;
        floorShadow.opacity = 0.30 * solid;
        setGroundOpacity(ground, solid);
        model.readCam.setOpacity(solid * 0.22);   // rest value, matches the floor of the survey ramp above
        model.readCam.tick(frozen ? 1.2 : t);

        /* ---- 1. SURVEY: a faint bracket touches carton, drum, sack ---- */
        const surveyOn = frozen ? 0 : smoothstep(W_SURVEY[0], W_SURVEY[0] + 0.02, p) * (1 - smoothstep(W_SURVEY[1] - 0.02, W_SURVEY[1], p));
        let surveyTarget: THREE.Object3D | null = null;
        if (surveyOn > 0.01) {
          const span = W_SURVEY[1] - W_SURVEY[0];
          const local = (p - W_SURVEY[0]) / span; // 0..1 across the survey window
          if (local < 0.34) surveyTarget = model.carton;
          else if (local < 0.67) surveyTarget = model.drum;
          else surveyTarget = model.sackGroup;
        }
        faintMat.opacity = surveyOn * 0.85;
        surveyTracker.follow(surveyTarget, camera);
        void SURVEY_TOUCH;

        /* ---- 2. settle + lock on the sack ---- */
        const settleOn = frozen ? 1 : smoothstep(W_SETTLE[0], W_SETTLE[1], p) * (1 - smoothstep(OUT_IN, OUT_OUT, p));
        accentMat.opacity = settleOn * 0.95;
        lockTracker.follow(settleOn > 0.01 ? model.sackGroup : null, camera);
        if (settleOn > 0.01) {
          wpos.copy(model.sackGroup.position);
          wpos.y += bb.H * 0.5;
          model.readCam.aimAt(wpos);
          /* 0.8 -> 0.34 peak. THE CONE IS ADDITIVE (createSightCone's default,
             because a light volume on a dark ground accumulates), so opacity
             does not behave like alpha: at 0.8 the core saturated to white and
             became the brightest object in frame, washing over the top of the
             sack and out-shouting the cage, the chains and the volume figure.
             It was misread on review as the pendant beam — the lamp was pulled
             down twice for something it was not doing.
             This scene's claim is the MEASUREMENT, not the looking. The cone
             only has to say a camera is observing; the graphics carry the rest. */
          model.readCam.setOpacity(solid * (0.22 + 0.12 * settleOn));
        }

        /* ---- 3. the scan ---- */
        const scanOn = frozen ? 0 : smoothstep(W_SCAN[0], W_SCAN[0] + 0.02, p) * (1 - smoothstep(W_SCAN[1] - 0.03, W_SCAN[1], p));
        const scanProg = clamp01((p - W_SCAN[0]) / (W_SCAN[1] - W_SCAN[0]));
        scanMesh.position.y = bb.min.y + scanProg * bb.H;
        scanMat.opacity = solid * scanOn * 0.7;

        /* ---- 4. the cage draws on ---- */
        const cageHold = frozen ? 1 : (1 - smoothstep(OUT_IN, OUT_OUT, p));
        const cageVis = frozen ? 1 : smoothstep(CAGE_START, CAGE_START + 0.02, p) * cageHold;
        cageMat.opacity = solid * cageVis * 0.9;
        for (const e of edges) {
          const start = cageAxisStart[e.group];
          const revealT = frozen ? 1 : smoothstep(start, start + 0.02, p);
          revealLine(e.geo, e.a, e.b, revealT);
        }

        /* ---- 5. the chains extend ---- */
        const chainHold = frozen ? 1 : (1 - smoothstep(OUT_IN, OUT_OUT, p));
        for (let i = 0; i < chains.length; i++) {
          const start = W_CHAINS[0] + i * CHAIN_STAGGER;
          const revealT = frozen ? 1 : smoothstep(start, start + 0.05, p);
          const vis = frozen ? 1 : smoothstep(start, start + 0.02, p) * chainHold;
          const c = chains[i];
          revealLine(c.mainGeo, c.from, c.to, revealT);
          c.matMain.opacity = solid * vis * 0.9;
          c.matTick.opacity = solid * vis * 0.9;
          wpos.copy(c.mid).applyMatrix4(model.sackGroup.matrixWorld);
          const r = project(wpos, new THREE.Vector3(0, 1, 0), w, h);
          if (r && vis > 0.01) {
            c.labelEl.style.transform = `translate(${r.sx}px,${r.sy - bleed}px)`;
            c.labelEl.style.opacity = String(vis);
          } else {
            c.labelEl.style.opacity = "0";
          }
        }

        /* ---- 6. THE CONCLUSION ---- */
        const concludeOn = frozen ? 1 : smoothstep(W_CONCLUDE[0], W_CONCLUDE[0] + 0.02, p) * (1 - smoothstep(OUT_IN, OUT_OUT, p));
        const tickColor = new THREE.Color(PALETTE.accent).lerp(new THREE.Color(CONCLUSION), concludeOn);
        tickMat.color.copy(tickColor);
        const volVis = frozen ? 1 : smoothstep(W_CONCLUDE[0], W_CONCLUDE[0] + 0.03, p) * (1 - smoothstep(OUT_IN, OUT_OUT, p));
        volBox.style.opacity = String(volVis);
        model.readCam.setSignal(concludeOn * 0.4);

        /* ---- 7. evidence chip — crop the LIVE canvas, gated on the cage ---- */
        const evOn = frozen ? 1 : smoothstep(W_EVIDENCE[0], W_EVIDENCE[0] + 0.04, p) * (1 - smoothstep(OUT_IN, OUT_OUT, p));
        chip.style.opacity = String(evOn);

        /* ---- readout ----
           THE PANEL SCALES WITH THE CANVAS. `createReadout` builds a fixed
           270px-wide panel at fixed px type, which is fine at the lab route's
           900px stage and is NOT fine in the real section slot: the Warehouse
           page gives this scene roughly 660px, where the same absolute panel
           eats half again as much of the frame and lands squarely on the cage
           and the drum. Signed off in the lab, broken in production — which is
           exactly the split the review protocol warns about, since `fitRad`
           frames against the live canvas and the two are different pictures.

           This is the documented "absolutely-sized type inside a
           percentage-sized box" trap (DECISIONS.md 2026-08-04, where
           document-vision overflowed its own readout at a narrow viewport).
           The fix there was to derive the type size from canvas width and cap
           it at 1x so the authored look is pixel-identical at full size; same
           here, applied to the whole panel so the label/value grid and its
           gaps scale together rather than needing six separate font rules.

           REF 880 is the width this panel's layout was authored against.
           Origin is top-right because the panel is right-anchored — scaling
           from any other origin would walk it away from its own margin. */
        const roScale = Math.min(1, w / 880);
        readout.panel.style.transformOrigin = "top right";
        readout.panel.style.transform = `scale(${roScale.toFixed(3)})`;
        readout.panel.style.opacity = String(solid);
        for (const row of readout.rows) row.setOpacity(String(solid));

        /* the volume figure + evidence chip stack — same REF_W scale as the
           readout, see the block that builds them for why. */
        const stackScale = Math.min(1, w / REF_W);
        const stackXf = `scale(${stackScale.toFixed(3)})`;
        volBox.style.transform = stackXf;
        chip.style.transform = stackXf;

        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.2, 0.9, t));

        /* Return whether this frame should attempt the evidence grab — decided
           here so the grab call, which MUST run in the same task as render(),
           has everything it needs without recomputing p. */
        return { evOn, w, h };
      };

      /* Compile every material's shader program at build time, gated behind
         the primed frame. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      const grabEvidence = (w: number, hh: number) => {
        if (!chipCtx || chipGrabbed) return;
        const r = project(model.sackGroup.position, new THREE.Vector3(0, 1, 0), w, hh);
        if (!r) return;
        const gl = renderer.domElement;
        const dpr = gl.width / Math.max(1, w);
        const ch = Math.min(gl.height, hh * 0.42 * dpr);
        const cw = ch * (chipCanvas.width / chipCanvas.height);
        chipCtx.fillStyle = "#0E1116";
        chipCtx.fillRect(0, 0, chipCanvas.width, chipCanvas.height);
        try {
          chipCtx.drawImage(gl, r.sx * dpr - cw / 2, r.sy * dpr - ch * 0.55, cw, ch, 0, 0, chipCanvas.width, chipCanvas.height);
          chipGrabbed = true;
        } catch { /* left blank — a benign miss, not fatal */ }
      };

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
        const { evOn, w, h } = applyFrame();
        studio.render();
        /* THE GRAB HAPPENS INSIDE THE SAME TASK AS render() — the only window
           the drawing buffer is valid without preserveDrawingBuffer. Gated on
           the cage being complete (the evidence window opens well after it)
           so a `?phase` sample never captures a black frame. */
        if (evOn > 0.5 && !chipGrabbed) grabEvidence(w, h);
        if (evOn < 0.05) chipGrabbed = false; // re-arm for the next loop
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        visObs.disconnect();
        readout.panel.remove();
        readout.dot.remove();
        volBox.remove();
        chip.remove();
        chains.forEach((c) => c.labelEl.remove());
        surveyTracker.group.removeFromParent();
        lockTracker.group.removeFromParent();
        scene.remove(model.readCam.coneGroup);
        model.readCam.dispose();
        mats.dispose();
        model.owned.forEach((g) => g.dispose());
        edges.forEach((e) => e.geo.dispose());
        chains.forEach((c) => {
          c.mainGeo.dispose();
          ((c.tickA as unknown as { _geo: THREE.BufferGeometry })._geo).dispose();
          ((c.tickB as unknown as { _geo: THREE.BufferGeometry })._geo).dispose();
        });
        cageMat.dispose();
        chainMat.dispose();
        tickMat.dispose();
        scanGeo.dispose();
        scanMat.dispose();
        faintMat.dispose();
        accentMat.dispose();
        floorCatcher.geometry.dispose();
        floorShadow.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[dimension-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "dimension");
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

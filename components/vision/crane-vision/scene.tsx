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
import { DEFECT_UV } from "../container-vision/container";
import { createSightCone } from "../hero-cards/detect";
import {
  DROP, HALF_W, PAYLOAD_BOT, PAYLOAD_TOP,
  buildCrane, buildCraneMaterials,
} from "./crane";

/* 10.0s — the slowest loop on the site, against gate's 7.0 and yard's 9.4.
   A loaded spreader is thirty tonnes on ropes. Every faster version read as a
   lift going up on a string, and the sway (three cycles across the loop) turned
   into a jitter rather than a swing. */
const LOOP = 10.0;
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

   LINEAR, across the WHOLE loop, from fully below the frame to fully above it.
   Linear because a hoist runs at a constant speed and an eased one reads as a
   lift being cued by the edit; whole-loop because that is what makes the wrap
   invisible — the same reasoning as gate-vision's ±13.6 truck run. At p = 0 and
   p = 1 there is nothing in shot but the two legs, so "one box leaves, the next
   appears" instead of one box teleporting.

   ARITHMETIC (all in lift-local units; the lift's origin is the SHEAVE, so the
   container hangs DROP = 20 below it — see crane.ts):

     PAYLOAD_TOP = -DROP + C_H/2 + 0.10 + 0.34/2 = -18.2645  (spreader's top)
     PAYLOAD_BOT = -DROP - C_H/2                 = -21.2955  (container's floor)

   Out of shot at p = 0 means the spreader's top is below the frame's bottom:
     liftY(0)  = -halfH - MARGIN - PAYLOAD_TOP
   Out of shot at p = 1 means the container's floor is above the frame's top:
     liftY(1)  =  halfH + MARGIN - PAYLOAD_BOT

   At halfH = 9.044 and MARGIN = 0.5 that is liftY 8.72 -> 30.84, a travel of
   22.13m in 10s = 2.2 m/s. Both ends are recomputed every frame from the live
   aspect, so a taller canvas lengthens the run rather than cropping it.

   MARGIN 0.5 rather than 0: the sway tilts the load by up to 2°, which lifts a
   corner of the 6.058m box by 3.029·sin(0.035) = 0.106m, and swings it
   sideways by DROP·sin(0.035) = 0.70m. 0.5 covers the vertical part of that
   with air to spare. */
const MARGIN = 0.5;
const riseFrom = (halfH: number) => -halfH - MARGIN - PAYLOAD_TOP;
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
const swayAt = (p: number) => SWAY_MAX * Math.sin(p * Math.PI * 2 * 3.0);

/* ---- windows --------------------------------------------------------------- */
const W_CAPTURE: [number, number] = [0.30, 0.55];
const W_SELECT: [number, number] = [0.50, 0.72];
const W_SEVERE: [number, number] = [0.70, 0.92];

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
      const headA = model.heads[0];
      const targetA = new THREE.Vector3(Math.sign(headA.x) * 1.5, -1.0, 1.28);
      const CONE_HALF_ANGLE = Math.atan(CONE_R / targetA.distanceTo(headA));
      const sightCones = model.heads.map((head) => {
        const target = new THREE.Vector3(Math.sign(head.x) * 1.5, -1.0, 1.28);
        const c = createSightCone({ color: PALETTE.accent });
        c.aim(head, target, CONE_HALF_ANGLE);
        scene.add(c.group);
        return c;
      });

      /* ---- the severity heatmap ----
         A graded field on the container's near face, parented to the LIFT so it
         rides the rise and the sway — a finding is on the object, not on the
         screen. Quad sits 0.02 proud of the face so it never z-fights the
         corrugation.

         Raw ShaderMaterial, so #include <colorspace_fragment> is REQUIRED: three
         converts the uniform colours sRGB -> linear on the way in and a custom
         shader gets none of the output plumbing back, which renders the authored
         colour at roughly an eighth of its brightness. Same trap, same fix, as
         the cyclorama in _vision/studio.ts. */
      const heatGeo = new THREE.PlaneGeometry(2.8, 1.9);
      const heatMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        uniforms: {
          uOp: { value: 0 },
          cCool: { value: new THREE.Color(PALETTE.accent) },
          cHot: { value: new THREE.Color(PALETTE.warn) },
        },
        vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: `
          varying vec2 vUv; uniform float uOp; uniform vec3 cCool; uniform vec3 cHot;
          void main(){
            // elliptical falloff — a dent spreads along the panel, not in a disc
            vec2 d = (vUv - vec2(0.5)) * vec2(2.0, 2.9);
            float core = 1.0 - smoothstep(0.0, 1.0, clamp(length(d), 0.0, 1.0));
            vec3 col = mix(cCool, cHot, core * core);
            gl_FragColor = vec4(col, 0.55 * core * uOp);
            #include <colorspace_fragment>
          }`,
      });
      const heat = new THREE.Mesh(heatGeo, heatMat);
      heat.position.set(-1.0, -DROP + 0.05, 1.239);
      model.lift.add(heat);

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
      const grabUrl = (() => {
        const src = (cmats.front.material.map as THREE.CanvasTexture | null)?.image as
          | HTMLCanvasElement
          | undefined;
        if (!src || !src.width || !src.height) return "";
        const cx = src.width * DEFECT_UV.rust.u;
        const cy = src.height * DEFECT_UV.rust.v;
        // 0.15, tighter than the old 0.22: the hero tile is now big enough
        // that a closer crop reads as "the damage", not "a patch of hull".
        const half = src.height * 0.15;
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
      })();

      // shared scanline texture — a 2px-pitch interlace look, same on every tile
      const scanCss =
        "position:absolute;inset:0;background:repeating-linear-gradient(to bottom," +
        "rgba(223,230,237,0.10) 0px,rgba(223,230,237,0.10) 1px," +
        "rgba(0,0,0,0) 1px,rgba(0,0,0,0) 2px);";
      const makeTile = (
        w: number, h: number,
        opts: { sharp?: boolean; blurPx?: number; ts?: string },
      ) => {
        const { sharp = false, blurPx = 0, ts } = opts;
        const t = document.createElement("div");
        t.style.cssText =
          `position:relative;width:${w}px;height:${h}px;background:#0E1116;overflow:hidden;` +
          `opacity:${sharp ? 1 : 0.55};` +
          `border:${sharp ? 2 : 1}px solid ${sharp ? PALETTE.accent : "rgba(223,230,237,0.28)"};` +
          `box-sizing:border-box;` +
          (blurPx ? `filter:blur(${blurPx}px);` : "") +
          (grabUrl ? `background-image:url(${grabUrl});background-size:cover;background-position:center;` : "");
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

      const panel = document.createElement("div");
      panel.style.cssText =
        "position:absolute;left:66%;top:50%;transform:translateY(-50%);width:168px;" +
        "display:flex;flex-direction:column;gap:10px;opacity:1;pointer-events:none;";

      // the hero: the one sharp keeper, large enough to actually read as rust
      const heroTile = makeTile(168, 112, { sharp: true, ts: GRABS[SHARP] });
      panel.appendChild(heroTile);

      // the four rejects, 2x2, each a heavier blur — "same thing, four blurs"
      const rejectGrid = document.createElement("div");
      rejectGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;";
      const rejectTimestamps = GRABS.filter((_, i) => i !== SHARP);
      const rejectTiles = rejectTimestamps.map((ts) => makeTile(80, 54, { blurPx: 3, ts }));
      rejectTiles.forEach((t) => rejectGrid.appendChild(t));
      panel.appendChild(rejectGrid);
      overlay.appendChild(panel);

      /* ---- callouts ----
         Two, and only two. The capture beat speaks through its cones and the
         rise speaks for itself; a label on either would be narrating what is
         already on screen.

         onDark on both — this section is the site's near-black canvas, and the
         overlay's default black leader is invisible on it. */
      const sharpLabel = createCallout(overlay, {
        id: "sharp",
        title: "Sharpest frame",
        detail: "1 of 5 · blur 0.2px",
        pos: model.anchors.sharp.pos,
        normal: model.anchors.sharp.normal,
        onDark: true,
        lane: { dir: "up", len: 96 },
        win: W_SELECT,
      });
      const severeLabel = createCallout(overlay, {
        id: "severe",
        title: "HIGH SEVERITY",
        detail: "surveyor review · 14:07:52",
        pos: model.anchors.severity.pos,
        normal: model.anchors.severity.normal,
        severe: true,
        onDark: true,
        /* DOWN, and short. The load is near the top of frame by the end of this
           window, so an upward leader puts the card past the overlay's upper
           bound and placeCallout drops it on every frame — the finding lights up
           and the words never come. Downward hangs into the clear air the load
           has just left. */
        lane: { dir: "down", len: 58 },
        win: W_SEVERE,
      });
      const marks: Callout[] = [sharpLabel, severeLabel];

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

        /* ---- rise and sway ---- */
        const from = riseFrom(halfH);
        model.lift.position.y = from + (riseTo(halfH) - from) * p;
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

        /* ---- capture: two static cones ---- */
        const coneVis =
          smoothstep(W_CAPTURE[0], W_CAPTURE[0] + 0.04, p) *
          (1 - smoothstep(W_CAPTURE[1] - 0.05, W_CAPTURE[1], p));
        for (const c of sightCones) {
          c.setOpacity(solid * 0.28 * coneVis);
          // reduced motion pins a mid-sweep frame, not t=0 where the band
          // would sit on the apex under the fade and read as nothing
          c.tick(frozen ? 1.4 : t);
        }

        /* ---- selection: the five grabs ----
           STATIC. This used to fade the panel in over 0.50-0.56, fade the four
           rejects out over 0.60-0.66 and scale the keeper up over 0.62-0.68 —
           all driven off `p` every frame. The record is meant to just be
           there, not perform an entrance, so the panel's opacity and the
           tiles' opacity/scale are now set once at creation (panel opacity 1,
           reject tiles 0.35, keeper untransformed) and this block no longer
           touches them per frame. */

        /* ---- severity ---- */
        const severeVis =
          smoothstep(W_SEVERE[0], W_SEVERE[0] + 0.04, p) *
          (1 - smoothstep(W_SEVERE[1] - 0.05, W_SEVERE[1], p));
        heatMat.uniforms.uOp.value = solid * severeVis;

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

        // nothing on screen during the opening
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.2, 0.95, t));

        if (bloom) bloom.strength = 0.18 + 0.16 * coneVis;
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
        heatMat.dispose(); heatGeo.dispose();
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

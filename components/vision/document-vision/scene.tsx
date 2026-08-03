"use client";

/* ---------------------------------------------------------------------------
   Document Vision — a Bill of Lading read in place.

   Claim:   "Bill of Lading in. Structured data out."
   Eyebrow: "KEY-VALUE EXTRACTION, WHERE GENERIC OCR FAILS"

   THE CAMERA IS BOLTED DOWN. One pose, held for the whole loop. Gate Vision
   documents what happens when a camera drifts on top of a scene that is making
   a precision claim — the drift reads as nervousness — and a DOCUMENT has even
   less excuse for a moving camera than a truck does: the page is not going
   anywhere, and the only thing that changes across the loop is what the system
   knows about it. So the rig is a fixed raking top-down, and every gesture in
   the shot is a graphic, not a move.

   THE LOOP, p = 0..1 over 8.5s:

     0.04-0.24   SCAN — a thin accent bar crosses the page along its own long
                 axis. Parented to the sheet, so it stays square to the skewed
                 print rather than to the world.
     0.22-0.50   FIELD BOXES — five thin blue outlines, one every 0.045, each
                 sitting exactly on its UV rect. Blue is OBSERVATION.
     0.28-0.49   EXTRACTION — each field's key:value arrives in a fixed DOM
                 column on the right, 0.06 of loop behind its own box.
     0.62-0.90   THE HARD FIELD — the CONTAINER NO box turns orange and the one
                 callout of the scene appears on it. Orange is CONCLUSION.
     0.92-1.00   everything fades out, so the wrap is clean and every animated
                 value is back at its p = 0 state by p = 1.

   WHY THE EXTRACTED FIELDS ARE NOT CALLOUTS. Five callout cards is a wall of
   ink: the callout grammar is a dot, a leader and a two-line card at 21/14 with
   14x26 padding, built to name ONE feature and hold it. Five of them stacked
   down a page would bury the page. The extraction is a READOUT — a column of
   mono rows at a fixed overlay position — and the callout is reserved for the
   single finding that earns it, exactly as cargo-vision reasons about its type
   tags.

   Fills its parent. Not scroll-driven. prefers-reduced-motion holds a frame.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, placeCamera, smoothstep } from "../_vision/camera";
import { type Callout, createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import {
  FIELDS, GROUND,
  buildDocument, buildDocumentMaterials, fieldCenterLocal, fieldRectLocal,
} from "./document";

const LOOP = 8.5;
const SETTLE = 0.85;      // the desk and page fade up over this many seconds

/* Reduced-motion still frame. Parked on the HARD FIELD beat, which is the one
   that states the claim: five boxes down, five rows extracted, and the orange
   mark on the value the stamp is sitting across. */
const FROZEN_T = 7.0;
const FROZEN_P = 0.74;

/* ---- FRAMING, DERIVED FOR THE REAL CANVAS ---------------------------------

   The lab slot is 3:2 at maxWidth 1100 — aspect 1.5, NOT the 1600x680 (2.35294)
   every camera key in this codebase was originally authored against. fitRad
   compensates by 2.35294 / 1.5 = 1.56863, and that factor is not optional: at
   the authored distance the page would render at two-thirds size in the middle
   of the frame, which is the bug gate-vision documents.

   The studio camera is a 30-degree VERTICAL fov, so
       tan(hHalf) = tan(15) * aspect = 0.267949 * aspect
   which is 32.22 degrees at the reference aspect and 21.89 degrees at 3:2.

   WHAT HAS TO FIT — the sheet's SCREEN half-width.
   The page is 4.0 x 2.6 yawed by 0.14 rad; the camera stands at azimuth 0.22,
   so its right vector is (cos az, 0, -sin az) and a page-local point (x, z)
   projects onto the screen horizontal at

       s = x*cos(yaw - az) + z*sin(yaw - az),   yaw - az = -0.08 rad

   Maximised over the corners (hx = 2.0, hz = 1.3):

       s_max = 2.0*cos(0.08) + 1.3*sin(0.08) = 1.99360 + 0.10388 = 2.09748

   THE SHEET FILLS 62% OF FRAME WIDTH, so the frame's half-width is

       H = 2.09748 / 0.62 = 3.38304

   At the REFERENCE aspect that needs a slant range of
       3.38304 / tan(32.22) = 3.38304 / 0.63047 = 5.36593
   and at 52 degrees elevation a GROUND radius of
       5.36593 * cos(52) = 5.36593 * 0.61566 = 3.3036   ->  REF_RAD 3.30.

   CHECK, at the real 3:2 canvas: fitRad(3.30, 1.5) = 5.17647, camY =
   tan(52) * 5.17647 = 6.62556, slant = 5.17647 / cos(52) = 8.40801, and the
   half-width is 8.40801 * tan(21.89) = 3.37917 against a target of 3.38304 —
   0.1% out, which is the check that the derivation is self-consistent rather
   than a guess.

   THE HEIGHT IS DERIVED FROM THE SAME CORRECTION, for the reason yard-vision
   spells out: a FIXED height cannot hold a fixed elevation once fitRad moves
   the camera. camY = ELEV_TAN * fitRad(REF_RAD, aspect) holds 52 degrees at any
   canvas. That identity is exact only when the look-at height is 0 — placeCamera
   sets an ABSOLUTE height — so ty is 0 rather than on the desk. The desk is at
   GROUND = -0.02, so the true elevation onto the page is atan(6.64556/5.17647)
   = 52.09 degrees. Two hundredths of a degree; not worth complicating the
   arithmetic for.

   WHY 52 DEGREES. Lower and the page foreshortens until the five field rows
   collapse into each other and the block stops reading as a form. Higher and it
   becomes a flat scan — which is precisely the thing the scene is arguing the
   product does NOT need, so shooting it as one would undercut the claim. 52 is
   where the page reads as a page and the rake is still obvious.

   WHY THE TARGET IS OFF THE PAGE. The sheet at 62% of width, centred, leaves
   19% either side — nowhere near enough for the extracted-data column. So the
   whole rig is slid along its own right vector until the page sits with 6% of
   margin on the left and the DOM column owns the right 32%:

       sheet centre on screen = -0.5W + 0.06W + 0.31W = -0.13W = -0.26H
       offset = 0.26 * 3.38304 = 0.87959 along right = (0.97590, 0, -0.21823)
       target = (0.85839, 0, -0.19194)

   That is a pure translation of camera and target together, so the framing
   arithmetic above is unchanged; only the page's position in frame moves. */
const ELEV_TAN = Math.tan((52 * Math.PI) / 180);
const REF_RAD = 3.30;
const CAM_AZ = 0.22;
const CAM_T = { tx: 0.85839, ty: 0, tz: -0.19194 };

const REF_ASPECT = 1600 / 680;
const fitRad = (rad: number, aspect: number) =>
  rad * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.6);

/* ---- beats ---------------------------------------------------------------

   THE SCAN. Travels in the SHEET's local +x, from off one edge to off the other
   (the page is 4.0 long, so +-2.16 clears both ends with the bar's own width to
   spare) and is hidden outside its window — a bar that appears mid-page reads
   as a pulse rather than as a pass. LINEAR, for the reason yard-vision's survey
   sweep is linear: an eased sweep hesitates at the edge and then lurches, which
   reads as a light being aimed by hand rather than a machine covering a surface
   at a known rate. */
const SCAN_IN = 0.04;
const SCAN_OUT = 0.24;
const SCAN_FROM = -2.16;
const SCAN_TO = 2.16;

/* THE BOXES. One every 0.045 of loop starting at 0.22, so the fifth lands at
   0.40 and is fully in by 0.43 — inside the 0.22..0.50 span. */
const BOX_FIRST = 0.22;
const BOX_STEP = 0.045;
const BOX_FADE = 0.03;
const boxAt = (i: number) => BOX_FIRST + i * BOX_STEP;

/* THE ROWS follow their own box by 0.06 and fade in over 0.03. */
const ROW_LAG = 0.06;
const ROW_FADE = 0.03;

/* THE HARD FIELD. The box recolours and the callout runs across the same
   window, so the mark and the words arrive and leave together. */
const W_HARD: [number, number] = [0.62, 0.90];

/* THE WRAP. Everything on screen is multiplied by this, so every animated value
   is 0 at p = 1 by construction and the loop cannot leave state behind. */
const OUT_IN = 0.92;
const OUT_OUT = 1.0;

const HARD = FIELDS.findIndex((f) => f.hard);

const mono = "var(--font-plex-mono)";
/* The conclusion colour, as the rest of the page uses it — detect.ts's `warn`
   and every schematic SVG. NOTE that createCallout's `severe` flag paints its
   TITLE in PALETTE.warn (#FFB020) instead; yard-vision already ships both in
   one shot (an #ED510C bracket under a severe label), so this scene follows
   that precedent rather than inventing a third orange. */
const CONCLUSION = "#ED510C";

/** `bare` lifts the page out of its frame — see ContainerVisionScene. */
export default function DocumentVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
      /* The subject is a 4-metre page on a desk — the smallest flagship here —
         so shadowExtent is tight and the rig is not spread. Full light rig and
         bloom: this is a flagship canvas where both are visible.

         floorY sits BELOW the desk rather than on it. The studio's shadow
         catcher is a real plane, and coplanar with the desk it would z-fight
         across the whole frame; tucked 50 mm under an opaque desk it is simply
         never seen. Nothing in this scene casts a shadow worth having anyway —
         a sheet 6 mm off a plane projects nothing — so the contact cue is the
         painted dark plane under the paper instead (see document.ts).

         exposure 0.95, under the house 1.18. This scene's subject is one large
         near-white surface filling most of the frame; at 1.18 the page clips
         and the crease, the coffee ring and the stamp all roll off into a flat
         white field — and those four marks are the entire argument. */
      const studio = createStudio(wrap, {
        floorY: GROUND - 0.05, shadowExtent: 6, spread: 1.0, bare,
        maxDpr: 1.75, shadowMapSize: 1024, exposure: 0.95,
      });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject ---- */
      const mats = buildDocumentMaterials();
      const model = buildDocument(mats);
      scene.add(model.root);

      /* ---- the scan bar ----
         A flat quad LYING ON THE PAGE, parented to the sheet group so it
         inherits the skew. tank-vision's scanPlane is a VERTICAL slice of light
         because its subject is a tank standing up; a vertical bar over a
         document reads as a wall crossing a table. A scanner bar lies on what
         it is reading, so this one does too. toneMapped:false and a low alpha
         on additive-feeling accent — the same graphics contract as every other
         signal surface on the page. */
      const scanGeo = new THREE.PlaneGeometry(0.09, 2.72);
      const scanMat = new THREE.MeshBasicMaterial({
        color: PALETTE.accent, transparent: true, opacity: 0,
        toneMapped: false, depthWrite: false, side: THREE.DoubleSide,
      });
      const scanBar = new THREE.Mesh(scanGeo, scanMat);
      scanBar.rotation.x = -Math.PI / 2;
      scanBar.position.y = 0.006;
      model.sheet.add(scanBar);

      /* ---- the five field boxes ----
         Four segments each, in the SHEET's local space at 4 mm above the print,
         so they sit ON the page and skew with it. LineBasicMaterial, unlit and
         toneMapped:false: these are ink drawn over the world, not surfaces in
         it, and ACES would desaturate the accent into a grey-green smudge (the
         house rule yard-vision/yard.ts states at length).

         One material per box rather than one shared: the hard field's box has
         to recolour on its own, and `color` is not a program cache key so a
         per-frame lerp costs a uniform write and nothing else. Opacity is the
         ONLY thing ever ramped — `transparent` is fixed at construction, for
         the reason container-vision's seal note gives. */
      const BOX_Y = 0.004;
      const boxes = FIELDS.map((f) => {
        const { x0, x1, z0, z1, y } = fieldRectLocal(f.uv, BOX_Y);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([
          x0, y, z0, x1, y, z0,
          x1, y, z0, x1, y, z1,
          x1, y, z1, x0, y, z1,
          x0, y, z1, x0, y, z0,
        ], 3));
        const m = new THREE.LineBasicMaterial({
          color: PALETTE.accent, transparent: true, opacity: 0, toneMapped: false,
        });
        const ls = new THREE.LineSegments(g, m);
        model.sheet.add(ls);
        return { geo: g, mat: m, mesh: ls };
      });
      const boxBlue = new THREE.Color(PALETTE.accent);
      const boxOrange = new THREE.Color(CONCLUSION);

      /* ---- the extracted-data column ----
         PLAIN DOM at a FIXED overlay position, not projected and not a callout.
         A structured record is not a property of any one point on the page — it
         is what the system pulled OUT of the page — so pinning it to the right
         third and never moving it is what makes it read as a readout. The right
         third is also exactly the margin the camera framing reserved for it. */
      const column = document.createElement("div");
      column.style.cssText =
        "position:absolute;right:6%;top:22%;width:30%;opacity:0;transition:opacity .4s ease;pointer-events:none;";
      const rows = FIELDS.map((f) => {
        const row = document.createElement("div");
        row.style.cssText = "opacity:0;margin-bottom:17px;will-change:opacity;";
        const k = document.createElement("div");
        k.textContent = f.key;
        k.style.cssText =
          `font-family:${mono};font-size:10px;font-weight:500;letter-spacing:0.24em;color:rgba(226,234,244,0.5);`;
        const v = document.createElement("div");
        v.textContent = f.value;
        v.style.cssText =
          `font-family:${mono};font-size:15px;font-weight:500;letter-spacing:-0.005em;color:${PALETTE.accentText};margin-top:5px;white-space:nowrap;`;
        row.appendChild(k);
        row.appendChild(v);
        column.appendChild(row);
        return row;
      });
      overlay.appendChild(column);

      /* ---- the one callout this scene spends ----
         Anchored at the hard field's own position on the page, and it is the
         only place the callout machinery appears. `severe` because this is the
         conclusion; `onDark` because the leader is drawn over a near-black desk
         and the default near-black ink would be invisible. Leader UP: the field
         sits in the lower half of the page with nothing but desk above it,
         where a downward leader would run straight into the two rows below. */
      const hardAnchor = fieldCenterLocal(FIELDS[HARD].uv, BOX_Y);
      const finding = createCallout(overlay, {
        id: "hard",
        title: "Read under stamp",
        detail: "VSTU 907032 1 · 0.97",
        pos: hardAnchor,
        normal: new THREE.Vector3(0, 1, 0),
        severe: true,
        onDark: true,
        lane: { dir: "up", len: 104 },
        win: W_HARD,
      });

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
      const wpos = new THREE.Vector3();
      let raf = 0;

      /* The projector's subject is the SHEET GROUP, so a callout's `local` is in
         page space and its normal is rotated by the page's yaw before the
         facing test. The page normal is +y and the camera is 52 degrees above
         it, so the test never rejects — but going through the same path as
         every other scene means a future change of pose cannot silently break
         it. */
      const project = makeProjector(camera, model.sheet);

      /* REVIEW AID: `?phase=0.66` pins the loop at that p and holds it there.
         An 8.5s loop with a five-step stagger cannot be reviewed by screenshot
         roulette — the same tool gate-vision and yard-vision carry. Time still
         advances (so the intro settles normally), only the loop position is
         held. Query-gated: a string check at build, nothing in the frame loop. */
      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;
        const oh = h - bleed * 2;              // the OVERLAY's height

        model.root.updateMatrixWorld(true);

        /* ---- camera: one pose, held ---- */
        const aspect = w / h;
        const rad = fitRad(REF_RAD, aspect);
        const camY = ELEV_TAN * rad;           // holds 52 degrees at any canvas
        target.set(CAM_T.tx, CAM_T.ty, CAM_T.tz);
        placeCamera(camera, { az: CAM_AZ, rad, ...CAM_T }, camY);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- intro settle ----
           Every material is built at opacity 0, so this is not a flourish:
           without it nothing is ever drawn. */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        mats.desk.opacity = solid;
        mats.paper.opacity = solid;
        mats.cast.opacity = solid * 0.55;
        // nothing casts here (see the floorY note), but the catcher is kept
        // honest so a future caster does not arrive with its shadow already on
        shadowMat.opacity = 0;

        /* The wrap gate. Multiplied into every graphic below, so all of them
           are 0 at p = 1 by construction. */
        const wrapOut = frozen ? 1 : 1 - smoothstep(OUT_IN, OUT_OUT, p);

        /* ---- 1. the scan ---- */
        const scanProgress = clamp01((p - SCAN_IN) / (SCAN_OUT - SCAN_IN));
        const scanVis = frozen ? 0 : (
          p < SCAN_IN || p > SCAN_OUT
            ? 0
            : smoothstep(SCAN_IN, SCAN_IN + 0.02, p) * (1 - smoothstep(SCAN_OUT - 0.03, SCAN_OUT, p))
        );
        scanBar.position.x = SCAN_FROM + (SCAN_TO - SCAN_FROM) * scanProgress;
        scanMat.opacity = solid * 0.55 * scanVis * wrapOut;

        /* ---- 2. the field boxes, staggered ----
           4. THE HARD FIELD recolours inside its own window. `color` is not a
           program cache key, so this is a uniform write — nothing recompiles,
           and the box is back to blue by p = 1 because `hardOn` is a product of
           two smoothsteps that are both 0 at the ends. */
        const hardOn = frozen
          ? 1
          : smoothstep(W_HARD[0], W_HARD[0] + 0.04, p) * (1 - smoothstep(W_HARD[1] - 0.05, W_HARD[1], p));
        for (let i = 0; i < boxes.length; i++) {
          const on = frozen ? 1 : smoothstep(boxAt(i), boxAt(i) + BOX_FADE, p);
          boxes[i].mat.opacity = solid * 0.92 * on * wrapOut;
          if (i === HARD) boxes[i].mat.color.copy(boxBlue).lerp(boxOrange, hardOn);
        }

        /* ---- 3. the extracted rows, each 0.06 behind its own box ---- */
        for (let i = 0; i < rows.length; i++) {
          const on = frozen ? 1 : smoothstep(boxAt(i) + ROW_LAG, boxAt(i) + ROW_LAG + ROW_FADE, p);
          rows[i].style.opacity = String(on * wrapOut);
        }
        column.style.opacity = String(solid);

        /* ---- 4. the finding ---- */
        const world = wpos.copy(finding.local).applyMatrix4(model.sheet.matrixWorld);
        const r = hardOn > 0.01 ? project(world, finding.normal, w, h) : null;
        /* leftGuard 0.04, NOT the shared default 0.3. The default reserves the
           readout column container-vision keeps clear; this scene's readout is
           on the RIGHT, and the page is deliberately framed left of centre, so
           the hard field projects at about sx = 0.31w — right on the default
           guard line, and below it on any canvas wider than 3:2. At the default
           the label would be silently rejected on some canvases and not others,
           which is the worst version of this bug. It has now cost four passes
           across this codebase (the tank valve, the yard slot, both gate reads,
           the cargo carton); when a callout never appears, check the bounds
           test before anything else. */
        placeCallout(finding, r ? { sx: r.sx, sy: r.sy - bleed } : null, hardOn * wrapOut, w, oh, 0.04);

        // nothing on screen during the opening settle
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.25, 1.0, t));

        if (bloom) bloom.strength = 0.16 + 0.14 * scanVis;
      };

      /* Compile EVERY material's shader program now, not just the ones drawn in
         the primed frame below — a scene whose graphics come and go across the
         loop otherwise compiles them the first time they are actually drawn,
         which lands a long task mid-scroll. See PERFORMANCE.md #36.

         AND THE PRIMED FRAME WAITS FOR IT, or the primed draw races the async
         compile and just compiles synchronously whatever it needs, which is the
         blocking path compileAsync exists to avoid. `compiled` gates drawing
         entirely, so the timeout guard matters: a promise that rejects or never
         settles must not leave the scene permanently blank. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

      /* Prime ONE frame even off screen: the first draw is where the 1400x910
         page uploads and the remaining programs link. Exactly one — after this
         the gate resumes and an off-screen scene costs nothing. The clock
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
        finding.wrap.remove();
        column.remove();
        /* Scene-owned only. The page canvas is module-cached and shared, so
           disposing it here would leave the next build sampling a destroyed
           texture — the hazard document.ts spells out. */
        boxes.forEach((b) => { b.geo.dispose(); b.mat.dispose(); });
        scanGeo.dispose();
        scanMat.dispose();
        mats.dispose();
        model.owned.forEach((g) => g.dispose());
        studio.dispose();
      };
    } catch (err) {
      console.error("[document-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "document");
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
          whole component moves the extracted-data column with it and it ends up
          on the section's own copy. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

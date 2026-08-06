"use client";

/* ---------------------------------------------------------------------------
   Document Vision — a Bill of Lading, read once, into a table that was
   already waiting for it.

   Claim:   "Bill of Lading in. Structured data out."
   Eyebrow: "KEY-VALUE EXTRACTION, WHERE GENERIC OCR FAILS"

   REWORK 2, 2026-08-06. The brief, in the reviewer's own terms:

     · the page must follow the layout of a real bill of lading — done in
       document.ts, which is now a portrait cell grid rather than a landscape
       stack of rows.
     · the animation is reworked completely, because of the spacing and the
       clipping, and because nothing much was happening.
     · the document is scanned ONCE: a scan surface appears on it, and the
       document TURNS INTO that scan surface, the way the yard scan does.
     · the extracted fields fill a table that is ALREADY THERE. "The table
       should not be formed in real time. The table layout should be visible
       on screen blank from the start, and then all of those fields will be
       filled one by one through the detections."

   That last point is the structural change, and it is worth stating why it is
   better rather than just different. A table that assembles itself row by row
   is an animation ABOUT a table. A table that stands there empty and then
   fills is a FORM BEING COMPLETED — the viewer can see, before anything has
   been read, exactly how many fields the system is going to come back with,
   and can watch the gap close. The empty cells are the promise; the values
   are the delivery. Nothing else in the scene has to explain what it is for.

   So the table's chrome — border, header, nine row rules, nine keys and nine
   em-dash placeholders — comes up with the page on the intro ramp and never
   animates again. Only the VALUES cycle.

   THE LOOP, p = 0..1 over 9.0s:

     always      the page, and the empty table.
     0.06-0.36   THE SCAN. One pass, top to bottom. A bright leading edge
                 travels down the sheet and everything behind it is rendered
                 as scan surface: an accent measurement grid over the print,
                 in the page's own plane, welded to the yaw. This is the
                 yard-scan grammar applied to a single sheet of paper.
     0.36-0.46   the scan surface holds complete, then dissolves, leaving the
                 print — the pass is over and what it found stays.
     0.30-0.66   NINE FIELD BOXES, one every 0.045, each on its own cell.
                 Blue: the system OBSERVING.
     0.33-0.69   NINE TABLE VALUES, each 0.03 of loop behind its own box, so
                 the mark on the page always precedes the row it produces.
     0.74-0.94   THE HARD FIELD. The CONTAINER NO. box and its row turn
                 orange and the scene's one callout appears. Orange: the
                 system's CONCLUSION.
     0.94-1.00   the values clear. The table's chrome does NOT — it is a
                 fixture, and a form that dismantles itself between shipments
                 is not a form.

   ONE SCAN, AND ONLY ONE. The previous version swept a bar and left it at
   that; a bar crossing a static page is a wipe, not a read. Nothing here
   repeats within the loop and nothing oscillates in brightness — the standing
   rule across these scenes since the crane strobe was reverted.

   CAMERA DERIVATION. The sheet is an untipped vertical plane, so the fit
   collapses to two independent one-axis problems rather than corner-projection
   algebra:

     horizontal: a local point x turns, under the sheet's yaw and the camera's
     azimuth, to a screen offset x*cos(SHEET_YAW - CAM_AZ), so the sheet's
     screen half-extent is  sMaxW = (SHEET_W/2) * cos(SHEET_YAW - CAM_AZ).
     vertical: unaffected by either angle, so  sMaxH = SHEET_H/2.

   The studio camera is a 30-degree VERTICAL fov, so at distance `rad` (camera
   and target share a height, so ground distance IS slant range) the visible
   half-extents are  Hh = rad*tan(15)*aspect  and  Hv = rad*tan(15). Solving
   each for the `rad` that puts the sheet at a target fraction of the frame
   gives two candidate distances and the camera takes the larger, so the page
   fits both ways at any aspect.

   THE PAGE IS NOW PORTRAIT, WHICH FLIPS WHICH CONSTRAINT BINDS. The landscape
   version was width-bound and every constant here was tuned against that. At
   2.94 x 3.87 the HEIGHT is the binding axis at every aspect this slot will
   ever see, so FRAC_H is the real control and FRAC_W is the safety cap — the
   opposite of before. Getting this backwards is how the previous pass ended
   up with the sheet's right edge overlapping the table's label column.

   THE TARGET IS OFF THE PAGE. `frameOffset` slides camera and target together
   along the camera's own right vector by a FRACTION of the frame's current
   half-width — recomputed from `Hh` every frame rather than baked into a
   constant, because a fixed world-unit offset would put the page at a
   different fraction of frame on every aspect and undo the fit just solved
   for.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, placeCamera, smoothstep } from "../_vision/camera";
import { createCallout, makeProjector, placeCallout } from "../_vision/overlay";
import {
  FIELDS, GROUND, SHEET_H, SHEET_W, SHEET_YAW,
  buildDocument, buildDocumentMaterials, fieldCenterLocal, fieldRectLocal,
} from "./document";

/* 9.0s, up from 8.5. Nine fields at 0.045 apart is 0.405 of the loop spent
   filling the table, and each of those rows has to be legible as it lands —
   at 8.5 a row held for 0.38s, which is a flicker. 9.0 gives 0.405s per row
   and keeps the scan, the fill and the conclusion each on their own beat. */
const LOOP = 9.0;
const SETTLE = 0.85;      // the page fades up over this many seconds

/* Reduced-motion still frame. Parked on the HARD FIELD beat: the scan is
   done, all nine rows are in the table, and the orange mark is on the value
   the stamp sits across. */
const FROZEN_T = 7.4;
const FROZEN_P = 0.82;

/* ---- camera --------------------------------------------------------------
   See the header. Every quantity is either a fixed angle or is recomputed
   from the live aspect each frame — there is no reference-aspect correction
   table to keep in sync, because the geometry this camera targets makes the
   fit exact at any aspect rather than approximate. */
const CAM_AZ = 0.34;                        // camera azimuth around the target
const VFOV_HALF = (30 * Math.PI) / 180 / 2; // studio camera is 30deg vertical
const TAN_VFOV_HALF = Math.tan(VFOV_HALF);

/* HEIGHT IS THE BINDING AXIS NOW. Worked through at the real slot
   (1080 x 795 inside its bleed, so aspect 1.358):

     sMaxH = SHEET_H/2                        = 1.935
     sMaxW = SHEET_W/2 * cos(0.18 - 0.34)     = 1.47 * 0.98722 = 1.4512
     radH  = 1.935 / (0.88 * 0.26795)         = 8.204
     radW  = 1.4512 / (0.50 * 0.26795 * 1.358) = 7.976

   so rad = 8.204 and the page takes 88% of frame height — and, falling out of
   that, 1.4512 / (8.204 * 0.26795 * 1.358) = 0.486 of frame WIDTH. Just under
   half the frame for the document leaves just over half for the table, which
   is the split the composition wants: two halves of one claim, read left to
   right the way the eye already goes.

   FRAC_W at 0.50 is therefore a CAP and not a target — it only takes over on
   an aspect wide enough that half the frame is narrower than 88% of its
   height, which this slot never is. */
const FRAC_W = 0.50;   // safety cap on the sheet's fraction of frame WIDTH
const FRAC_H = 0.88;   // the sheet's target fraction of frame HEIGHT

/* THE SLIDE IS DERIVED, NOT DIALLED IN — and this is the third time this
   scene has had a page/table collision, so it is worth doing properly.

   Both previous attempts picked a constant slide and then discovered, on the
   real slot, that the sheet's right edge landed inside the table's label
   column. Measured on the lab slot (1100 x 733, aspect 1.5) with a fixed
   SHIFT_FRAC of 0.26: the page spanned screen x 327..811 and the table began
   at 756. A 55px overlap. The reason a constant cannot work is that the
   page's on-screen WIDTH is a function of aspect — when the fit is
   height-bound, `rad` is fixed and the page's width fraction goes as 1/aspect
   — so any slide that clears the table at one aspect fails at another.

   Solve it instead. In NDC-x, where the frame runs -1..+1:

       q     = sMaxW / Hh            the page's half-extent
       right = q - SHIFT_FRAC        its right edge, after the slide

   Setting `right` to a fixed -GUTTER pins the sheet's right edge just left of
   the frame centre at EVERY aspect:

       SHIFT_FRAC = q + GUTTER

   The table then starts at a known place — (1 - GUTTER)/2 of frame width, so
   at GUTTER 0.08 the page ends at 46% and the table's `left: 52%` leaves a 6%
   channel that no aspect can close. The page's own left edge lands at
   -2q - GUTTER, which for the widest q this slot reaches (0.25) is -0.58 —
   nowhere near the frame edge, so nothing clips on the other side either. */
const GUTTER = 0.08;
const RAD_MIN = 3;
const RAD_MAX = 40;

/* ---- beats ---------------------------------------------------------------

   THE SCAN sweeps DOWN in the sheet's own local Y, top to bottom — matching
   the order the field boxes light in, so the pass reads as the thing that is
   about to surface each row rather than an unrelated flourish. LINEAR: an
   eased sweep hesitates at the edge and then lurches, which reads as a light
   aimed by hand rather than a machine covering a surface at a known rate. */
const SCAN_IN = 0.06;
const SCAN_OUT = 0.36;
/** the scan SURFACE lingers complete after the edge has run off the bottom,
    then dissolves — the pass is over, and what it found stays. */
const SURF_HOLD = 0.42;
const SURF_OUT = 0.50;

/* THE BOXES. One every 0.045 from 0.30, so the ninth lands at 0.66 and is
   fully in by 0.69 — comfortably before the hard-field beat at 0.74. */
const BOX_FIRST = 0.30;
const BOX_STEP = 0.045;
const BOX_FADE = 0.028;
const boxAt = (i: number) => BOX_FIRST + i * BOX_STEP;

/* THE TABLE VALUES follow their own box by 0.03 and fade in over 0.025. The
   lag is deliberately short: the mark and the row are one event, and a longer
   gap reads as two systems rather than one reading feeding one record. */
const ROW_LAG = 0.03;
const ROW_FADE = 0.025;

/* THE HARD FIELD. Box, row and callout run on one window, so the mark and the
   words arrive and leave together. */
const W_HARD: [number, number] = [0.74, 0.94];

/* THE WRAP. The VALUES are multiplied by this so every animated value is 0 at
   p = 1 by construction. The table's chrome deliberately is not — see the
   header. */
const OUT_IN = 0.94;
const OUT_OUT = 1.0;

const HARD = FIELDS.findIndex((f) => f.hard);

const mono = "var(--font-plex-mono)";
/* The conclusion colour, as the rest of the page uses it. `severe` on
   createCallout paints its TITLE in PALETTE.warn (#FFB020) instead; this
   scene follows yard-vision's precedent of shipping both in one shot. */
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
    return mountWhenVisible(wrap, () => {
    let cleanup = () => {};

    try {
      /* NO ENVIRONMENT. bare:true skips the cyclorama entirely and clears the
         framebuffer transparent, so the page sits directly on the section's
         own dark canvas — no backdrop, no floor, no fog. The five-source rig
         still lights the one surface that exists (the paper), which is what
         makes it read as a physical sheet rather than a flat image; nothing
         in this scene ever raises the shadow catcher's opacity above 0, so
         floorY is a nominal constant with nothing resting on it.

         exposure 0.95, under the house 1.18 — the subject is one large
         near-white surface filling most of the frame, and at 1.18 the page
         clips and the crease, ring and stamp roll off into a flat white
         field. Those four marks are the entire "defeats generic OCR" claim. */
      const studio = createStudio(wrap, {
        floorY: GROUND, shadowExtent: 6, spread: 1.0, bare,
        maxDpr: 1.75, shadowMapSize: 1024, exposure: 0.95,
      });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- subject ---- */
      const mats = buildDocumentMaterials();
      const model = buildDocument(mats);
      scene.add(model.root);

      /* ---- THE SCAN SURFACE -------------------------------------------------

         "The document turning into exactly a scan surface, like the yard scan
          that is happening in the yard scene."

         One quad the exact size of the sheet, in the sheet's own plane and
         parented to the sheet group, so it carries the yaw and stays welded to
         the print at any camera. A single ShaderMaterial does all three jobs
         the effect needs, which is why this is a shader and not a stack of
         meshes:

           uProg   0..1, the leading edge's position measured DOWN from the
                   top. Everything above the edge — vUv.y > 1 - uProg — has
                   been passed over and carries the grid; everything below is
                   untouched paper. That mask is the whole "the document TURNS
                   INTO a scan surface" reading: the transformation follows the
                   edge rather than switching on all at once.
           the GRID is drawn in UV, 20 divisions across and 26 down, which is
                   about one line per printed cell row — so the ruling lands
                   near the document's own structure instead of cutting across
                   it at an unrelated pitch.
           the EDGE is a bright band a few percent tall at the mask boundary,
                   falling off downward into the unscanned paper. It is the
                   only high-value thing in the shader and it is what makes the
                   pass read as a pass.

         RAW SHADER, SO `#include <colorspace_fragment>` IS REQUIRED. Three
         converts uniform colours sRGB -> linear on the way in and hands a
         custom shader none of the output plumbing back; without the include
         the authored colour renders at roughly an eighth of its brightness.
         Same trap, same fix, as the cyclorama in _vision/studio.ts and the
         severity heatmap in crane-vision.

         ADDITIVE and depthWrite:false — this is ink drawn OVER the page, not
         a second surface in front of it, and it must not occlude the print it
         is claiming to read. */
      const surfGeo = new THREE.PlaneGeometry(SHEET_W, SHEET_H);
      const surfMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uProg: { value: 0 },
          uOp: { value: 0 },
          uEdge: { value: 0 },
          cGrid: { value: new THREE.Color(PALETTE.accent) },
        },
        vertexShader:
          "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
        fragmentShader: `
          varying vec2 vUv;
          uniform float uProg, uOp, uEdge;
          uniform vec3 cGrid;

          // one antialiased line every 1/n, using screen-space derivatives so
          // the ruling stays one pixel wide however close the camera gets
          float rule(float x, float n) {
            float f = fract(x * n);
            float d = fwidth(x * n) * 1.2;
            return 1.0 - smoothstep(0.0, d, min(f, 1.0 - f));
          }

          void main() {
            float edgeY = 1.0 - uProg;            // the leading edge, in v
            float done  = step(edgeY, vUv.y);      // 1 above it: already read

            float g = max(rule(vUv.x, 20.0), rule(vUv.y, 26.0)) * 0.30;
            // the corner ticks of the grid read stronger than its lines, the
            // same weighting the drafting ground uses
            g += rule(vUv.x, 4.0) * rule(vUv.y, 5.0) * 0.55;

            // leading edge: a band below the boundary, fading downward
            float e = (1.0 - smoothstep(0.0, 0.045, edgeY - vUv.y))
                    * step(vUv.y, edgeY) * uEdge;

            float a = (g * done * 0.85 + e) * uOp;
            gl_FragColor = vec4(cGrid * (0.9 + e * 1.6), a);
            #include <colorspace_fragment>
          }`,
      });
      const surf = new THREE.Mesh(surfGeo, surfMat);
      surf.position.z = 0.004;
      model.sheet.add(surf);

      /* ---- the field boxes ----
         Four segments each, in the SHEET's local space, standing proud of the
         print (along local +z, toward the camera) so they never z-fight it.
         LineBasicMaterial, unlit and toneMapped:false — ink drawn over the
         world, not a surface in it.

         One material per box rather than one shared: the hard field's box has
         to recolour on its own, and `color` is not a program cache key so a
         per-frame lerp costs a uniform write and nothing else. */
      const BOX_Z = 0.008;
      const boxes = FIELDS.map((f) => {
        const { x0, x1, y0, y1, z } = fieldRectLocal(f.uv, BOX_Z);
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([
          x0, y0, z, x1, y0, z,
          x1, y0, z, x1, y1, z,
          x1, y1, z, x0, y1, z,
          x0, y1, z, x0, y0, z,
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

      /* ---- THE TABLE: standing, empty, from the first frame ---------------

         Built once and never rebuilt. The chrome — outer rule, header, the
         nine keys, the nine row rules and the nine placeholders — is set at
         creation and its only animated property is the intro ramp it shares
         with the page. What cycles is the VALUE cell of each row, and it
         cross-fades against a placeholder rather than appearing out of
         nothing: an em-dash in the cell says "this field is expected and not
         yet read", which is a different and much more useful statement than
         an empty cell, which says nothing at all.

         Sizes are checked against the real slot. At right:4% / width:44% of a
         1080px-wide overlay the column is ~475px; the longest value,
         "NORTHGATE EXPORTS PTE LTD" at 25 characters, is ~188px at 13px
         monospace, and the longest key, "PORT OF DISCHARGE", is ~146px at
         10px with 0.14em tracking. 146 + 188 + 2*13 padding + a 14 gutter is
         374px against 475 available, so nothing wraps at any aspect this slot
         reaches. */
      const table = document.createElement("div");
      table.style.cssText =
        "position:absolute;right:4%;left:52%;top:11%;opacity:0;transition:opacity .4s ease;pointer-events:none;";

      const head = document.createElement("div");
      head.style.cssText =
        "display:flex;align-items:baseline;justify-content:space-between;padding-bottom:10px;";
      const headL = document.createElement("div");
      headL.textContent = "EXTRACTED FIELDS";
      headL.style.cssText =
        `font-family:${mono};font-size:10px;font-weight:600;letter-spacing:0.22em;color:rgba(226,234,244,0.55);`;
      const headR = document.createElement("div");
      headR.style.cssText =
        `font-family:${mono};font-size:10px;font-weight:500;letter-spacing:0.14em;color:rgba(226,234,244,0.38);font-variant-numeric:tabular-nums;`;
      head.appendChild(headL);
      head.appendChild(headR);
      table.appendChild(head);

      const grid = document.createElement("div");
      grid.style.cssText =
        "border:1px solid rgba(226,234,244,0.20);border-radius:3px;overflow:hidden;background:rgba(10,13,20,0.42);";
      table.appendChild(grid);

      const rows = FIELDS.map((f, i) => {
        const row = document.createElement("div");
        const last = i === FIELDS.length - 1;
        row.style.cssText =
          "display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:8px 13px;" +
          `${last ? "" : "border-bottom:1px solid rgba(226,234,244,0.11);"}transition:background-color .5s ease;`;

        const k = document.createElement("div");
        k.textContent = f.key;
        k.style.cssText =
          `font-family:${mono};font-size:10px;font-weight:500;letter-spacing:0.14em;color:rgba(226,234,244,0.5);white-space:nowrap;`;

        /* the value CELL: placeholder and value stacked, cross-faded. Fixed
           height so the row cannot change size when the value lands — a table
           that reflows as it fills is the "formed in real time" failure the
           brief rules out, arriving by the back door. */
        const cell = document.createElement("div");
        cell.style.cssText = "position:relative;height:17px;flex:0 0 auto;";

        const dash = document.createElement("div");
        dash.textContent = "————";
        dash.style.cssText =
          `position:absolute;right:0;top:0;font-family:${mono};font-size:13px;font-weight:400;` +
          "letter-spacing:-0.08em;color:rgba(226,234,244,0.20);white-space:nowrap;will-change:opacity;";

        const v = document.createElement("div");
        v.textContent = f.value;
        v.style.cssText =
          `position:absolute;right:0;top:0;font-family:${mono};font-size:13px;font-weight:600;` +
          `letter-spacing:-0.005em;color:${PALETTE.accentText};white-space:nowrap;opacity:0;` +
          "will-change:opacity;transition:color .5s ease;";

        cell.appendChild(dash);
        cell.appendChild(v);
        row.appendChild(k);
        row.appendChild(cell);
        grid.appendChild(row);
        return { row, v, dash };
      });
      overlay.appendChild(table);

      /* ---- the one callout this scene spends ----
         Anchored on the hard field's own cell. `severe` because this is the
         conclusion; `onDark` because the leader is drawn over near-black and
         a default near-black ink would be invisible. Normal is local +z — the
         page's own front, since it carries no tip.

         DOWN, not up. The container number sits about a third of the way up
         the sheet, so an upward leader would cross the goods description —
         the block the scene has just claimed to have read. Downward crosses
         the freight table instead, which is boilerplate. Neither is off the
         page; on a portrait sheet filling 88% of frame height there is no
         clear air to reach, and a callout that has to leave its subject to
         find room is a callout in the wrong scene. */
      const hardAnchor = fieldCenterLocal(FIELDS[HARD].uv, BOX_Z);
      const finding = createCallout(overlay, {
        id: "hard",
        title: "Read under stamp",
        detail: `${FIELDS[HARD].value} · 0.97`,
        pos: hardAnchor,
        normal: new THREE.Vector3(0, 0, 1),
        severe: true,
        onDark: true,
        lane: { dir: "down", len: 96 },
        win: W_HARD,
      });

      /* ---- THE SHEET HOVERS, AND FOLLOWS THE CURSOR ----------------------

         The page is the only object in this scene and the camera is bolted
         down, so without this the frame is completely static between beats —
         which is what made a sheet with no thickness read as an image rather
         than an object. A few degrees of parallax under the pointer is enough
         to establish that it is a physical thing at a distance, and it costs
         two numbers and a lerp.

         DELIBERATELY SMALL. 0.13 rad of yaw and 0.09 of pitch at the extremes
         — about 7 and 5 degrees. Past roughly 10 degrees the page starts
         swinging like a hanging sign, which is a different and much sillier
         object; the intent is the slight give of something held.

         IT IS NOT A BRIGHTNESS EFFECT AND IT DOES NOT REPEAT. The standing
         rule in these scenes after the crane strobe was reverted is that
         nothing oscillates on a cycle. This is positional, aperiodic, and
         driven entirely by the viewer — it does nothing at all if the cursor
         does not move.

         The listener is on the HOST rather than the canvas: the canvas is
         `pointer-events:none` under the overlay in some mounts, and the host
         is the element whose box actually matches what the viewer sees.
         `pointermove` covers mouse and pen; touch devices simply never fire
         it and get the resting pose, which is correct — a page that lurches
         on scroll would be worse than a still one.

         Targets are stored and the applied value is eased toward them each
         frame (see applyFrame). Writing the rotation straight from the event
         would tie the motion to pointer sample rate and read as jitter. */
      let hoverTX = 0, hoverTY = 0;   // target, -1..1
      let hoverX = 0, hoverY = 0;     // applied, eased
      const onPointer = (e: PointerEvent) => {
        const r = host.getBoundingClientRect();
        if (!r.width || !r.height) return;
        hoverTX = ((e.clientX - r.left) / r.width) * 2 - 1;
        hoverTY = ((e.clientY - r.top) / r.height) * 2 - 1;
      };
      /* NO SPRING BACK ON POINTERLEAVE. There was one, and it was wrong: the
         page snapped to square the instant the cursor crossed the section's
         edge, which reads as the object being yanked rather than let go.
         Leaving it where the viewer left it is both calmer and more physical
         — a sheet you have nudged stays nudged. The rest pose is already
         square (SHEET_YAW == CAM_AZ), so the only way the page is ever
         skewed is that someone put it there. */
      host.addEventListener("pointermove", onPointer, { passive: true });

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
      const wpos = new THREE.Vector3();
      let raf = 0;

      /* The projector's subject is the SHEET GROUP, so a callout's `local` is
         in page space and its normal is rotated by the page's yaw before the
         facing test. */
      const project = makeProjector(camera, model.sheet);

      /* REVIEW AID: `?phase=0.82` pins the loop at that p and holds it there.
         Time still advances (so the intro settles normally), only the loop
         position is held. */
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

        /* ease the hover toward its target — see the listener above. 0.10 per
           frame is a ~150ms settle at 60fps: fast enough to feel attached to
           the cursor, slow enough that pointer sample noise never shows. */
        hoverX += (hoverTX - hoverX) * 0.10;
        hoverY += (hoverTY - hoverY) * 0.10;
        model.sheet.rotation.y = SHEET_YAW + hoverX * 0.13;
        model.sheet.rotation.x = -hoverY * 0.09;

        model.root.updateMatrixWorld(true);

        /* ---- camera: one pose, held — see the header for the derivation ---- */
        const aspect = w / h;
        const cosTurn = Math.cos(SHEET_YAW - CAM_AZ);
        const sMaxW = (SHEET_W / 2) * cosTurn;
        const sMaxH = SHEET_H / 2;             // unaffected by either angle
        /* THE VERTICAL FIT IS AGAINST THE SLOT, NOT THE CANVAS — and getting
           this wrong is why the sheet looked "cut off".

           `h` is the CANVAS height, which includes `bleed` at both ends: the
           canvas deliberately paints past its slot on every edge. Solving the
           fit against `h` therefore sized the page to 88% of the BLED height,
           so on the shipped slot (795 visible, 1095 with bleed) the sheet came
           out 964px tall against 795px of visible space — 169px of document
           living in the bleed, where the section's own overflow clips it. The
           page was not mis-cropped; it was correctly drawn and then trimmed by
           a box it had never been measured against.

           Scaling the target fraction by oh/h expresses FRAC_H as a fraction
           of the VISIBLE slot at any bleed. The horizontal fit needs no such
           correction: bleed moves only `top`/`bottom` (see the wrapper's
           style), so the canvas and the slot are the same width. */
        const radW = sMaxW / (FRAC_W * TAN_VFOV_HALF * aspect);
        const radH = sMaxH / (FRAC_H * (oh / h) * TAN_VFOV_HALF);
        const rad = Math.min(RAD_MAX, Math.max(RAD_MIN, Math.max(radW, radH)));

        const Hh = rad * TAN_VFOV_HALF * aspect; // frame half-width at this rad
        /* see GUTTER's note: the slide is whatever puts the sheet's right
           edge at -GUTTER in NDC, which is a different world distance on
           every aspect and is exactly why it is computed here rather than
           stored as a constant. */
        const shift = (sMaxW / Hh + GUTTER) * Hh; // world-unit slide, right vector
        const tx = shift * Math.cos(CAM_AZ);
        const tz = -shift * Math.sin(CAM_AZ);
        target.set(tx, 0, tz);
        placeCamera(camera, { az: CAM_AZ, rad, tx, ty: 0, tz }, 0);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- intro settle ---- */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        mats.paper.opacity = solid;
        // nothing casts or receives a shadow in this scene — kept honest so a
        // future addition does not arrive with the catcher already lit
        shadowMat.opacity = 0;

        /* Only the DATA wraps out. See the header: the table's chrome is a
           fixture and stays up across the seam. */
        const wrapOut = frozen ? 1 : 1 - smoothstep(OUT_IN, OUT_OUT, p);

        /* ---- 1. the scan: one pass, and the page becomes the surface ---- */
        const scanProg = clamp01((p - SCAN_IN) / (SCAN_OUT - SCAN_IN));
        /* The EDGE only exists while it is travelling. Once it runs off the
           bottom the grid stays on its own for SURF_HOLD, then dissolves —
           the pass is over, the reading is not. */
        const edge = frozen ? 0 : (
          p < SCAN_IN || p > SCAN_OUT ? 0
            : smoothstep(SCAN_IN, SCAN_IN + 0.02, p) * (1 - smoothstep(SCAN_OUT - 0.03, SCAN_OUT, p))
        );
        const surfOn = frozen ? 0 : (
          smoothstep(SCAN_IN, SCAN_IN + 0.015, p) * (1 - smoothstep(SURF_HOLD, SURF_OUT, p))
        );
        surfMat.uniforms.uProg.value = frozen ? 1 : scanProg;
        surfMat.uniforms.uEdge.value = edge;
        surfMat.uniforms.uOp.value = solid * surfOn;

        /* ---- 2. the field boxes, staggered ---- */
        const hardOn = frozen
          ? 1
          : smoothstep(W_HARD[0], W_HARD[0] + 0.03, p) * (1 - smoothstep(W_HARD[1] - 0.04, W_HARD[1], p));
        for (let i = 0; i < boxes.length; i++) {
          const on = frozen ? 1 : smoothstep(boxAt(i), boxAt(i) + BOX_FADE, p);
          boxes[i].mat.opacity = solid * 0.92 * on * wrapOut;
          if (i === HARD) boxes[i].mat.color.copy(boxBlue).lerp(boxOrange, hardOn);
        }

        /* ---- 3. the table FILLS. The table itself was already there. ---- */
        let filled = 0;
        for (let i = 0; i < rows.length; i++) {
          const on = (frozen ? 1 : smoothstep(boxAt(i) + ROW_LAG, boxAt(i) + ROW_LAG + ROW_FADE, p)) * wrapOut;
          rows[i].v.style.opacity = String(on);
          rows[i].dash.style.opacity = String(1 - on);
          if (on > 0.5) filled++;
          if (i === HARD) {
            rows[i].v.style.color = hardOn > 0.5 ? CONCLUSION : PALETTE.accentText;
            rows[i].row.style.backgroundColor = `rgba(237,81,12,${0.16 * hardOn})`;
          }
        }
        /* The count in the table's own header. It is derived from the same
           per-row test that drives the opacities, so it cannot disagree with
           what is actually on screen — the stateless-counter rule cargo-vision
           spells out, applied to nine rows instead of nine cases. */
        headR.textContent = `${filled} / ${rows.length}`;
        table.style.opacity = String(solid);

        /* ---- 4. the finding ---- */
        const world = wpos.copy(finding.local).applyMatrix4(model.sheet.matrixWorld);
        const r = hardOn > 0.01 ? project(world, finding.normal, w, h) : null;
        /* leftGuard 0.04, NOT the shared default 0.3 — this scene's table is
           on the RIGHT and the page sits left of centre, so the hard field
           projects well left of the default guard line. See overlay.ts's own
           note: when a callout never appears, check the bounds test first. */
        placeCallout(finding, r ? { sx: r.sx, sy: r.sy - bleed } : null, hardOn * wrapOut, w, oh, 0.04);

        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.25, 1.0, t));

        if (bloom) bloom.strength = 0.16 + 0.14 * edge;
      };

      /* Compile EVERY material's shader program now, not just the ones drawn
         in the primed frame below — see PERFORMANCE.md #36. */
      let compiled = false;
      const markCompiled = () => { compiled = true; };
      renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
      const compileGuard = window.setTimeout(markCompiled, 2000);

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
        host.removeEventListener("pointermove", onPointer);
        ro.disconnect();
        visObs.disconnect();
        finding.wrap.remove();
        table.remove();
        boxes.forEach((b) => { b.geo.dispose(); b.mat.dispose(); });
        surfGeo.dispose();
        surfMat.dispose();
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
          whole component moves the table with it and it ends up on the
          section's own copy. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

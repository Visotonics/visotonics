"use client";

/* ---------------------------------------------------------------------------
   Cargo Vision — a container being destuffed, and every case counted.

   Claim: "Every case counted, with video proof attached."

   THE CAMERA IS BOLTED DOWN. One pose, held for the whole loop. This scene's
   motion is the cargo stream, and Gate Vision already learned what happens when
   a camera drifts on top of a moving subject: the drift reads as the rig chasing
   the thing, the subject's speed stops being legible (motion against a moving
   frame always reads slower), and the whole shot feels unstable. A destuff bay
   camera is a fixed camera. So is this one.

   THE LOOP, p = 0..1 over 9.0s:

     continuous  the stream advances LINEARLY out of the dark door end. No
                 easing anywhere in it — a destuff line runs at constant speed,
                 and an eased stream reads as a machine hesitating.
     continuous  the COUNTER climbs, one tick per item crossing x = 0, nine per
                 loop, and it keeps climbing THROUGH the wrap.
     transient   a type TAG rides each item across the threshold.
     0.55-0.75   the flagged carton takes an orange damage bracket.
     0.72-0.92   a CCTV frame grab appears, tethered to that carton.

   THE COUNT NEVER PAUSES FOR THE DAMAGE. That is the entire argument: the
   defect is caught in the same pass as the count, not by stopping the line.

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
import { createTracker, detectMaterials } from "../hero-cards/detect";
import { draftingGround, setGroundOpacity } from "../hero-cards/ground";
import {
  FLAGGED, GROUND, ITEM_N, SEQUENCE, buildCargo, buildCargoMaterials,
  type ItemType,
} from "./cargo";

/* The deck's concrete, held here rather than in the material because the intro
   ramp needs the UNDIMMED value every frame to multiply. Authored dark on
   purpose: five area lights plus a spot, through ACES, land a matte surface far
   brighter than its hex suggests — the trap cargo.ts documents for the sack and
   yard-vision documented before that. */
const DECK_COL = new THREE.Color("#0D1015");

/* 9.0s. Nine items, nine crossings, so the counter ticks once per second — fast
   enough to read as a working line, slow enough that each number is legible.
   The cadence falls straight out of the geometry rather than being dialled in:
   SPAN / LOOP = 12.15 / 9.0 = 1.35 u/s, which is one PITCH per second. */
const LOOP = 9.0;
const SETTLE = 0.95;      // the scene fades up over this many seconds

/* Reduced-motion still frame. Parked on the PROOF beat, which is the one that
   states the payload — a frame grab tethered to a bracketed carton, with the
   counter mid-climb behind it. */
const FROZEN_T = 7.0;
const FROZEN_P = 0.74;

/* ---- FRAMING, DERIVED FOR THE REAL CANVAS ---------------------------------

   The lab slot is 4:3 at maxWidth 1200 — so aspect 1.333, NOT the 1600x680
   (2.353) every camera key in this codebase was originally authored against.
   That difference is a factor of 1.765 in distance and it is not optional: at
   the authored distance the scene would render at half the intended size in the
   middle of the frame, which is exactly the bug gate-vision documents.

   The studio camera is a 30-degree VERTICAL fov, so the horizontal half-angle is
       tan(hHalf) = tan(15) * aspect = 0.26795 * aspect
   which at the reference aspect is 32.2 degrees and at 4:3 is 19.7 degrees.

   WHAT HAS TO FIT. The visible x window must carry the door mouth at x = -2.41
   and a run-out to about x = +5.7, so roughly 9.4 units of X centred near
   x = +1.0, i.e. a half-extent of 4.7 along world X. The camera stands at
   azimuth 0.42 rad, so its right vector is (cos 0.42, 0, -sin 0.42) and world X
   projects onto the screen horizontal at cos(0.42) = 0.913 of its length:

       required screen half-width = 4.7 * 0.913 = 4.29  ->  call it 4.30

   At the REFERENCE aspect that needs a slant range of 4.30 / tan(32.2) = 6.82,
   and at 18 degrees elevation a GROUND radius of 6.82 * cos(18) = 6.49. Hence
   REF_RAD below. fitRad then multiplies it by 1.765 for the real canvas, giving
   rad = 11.45 and a slant of 12.04 — whose half-width at 4:3 is
   12.04 * tan(19.7) = 4.30. The compensation lands exactly on the target, which
   is the check that the derivation is self-consistent rather than a guess.

   THE HEIGHT IS DERIVED FROM THE SAME CORRECTION, for the reason yard-vision
   spells out: a FIXED height cannot hold a fixed elevation once fitRad moves the
   camera. camY = ELEV_TAN * fitRad(REF_RAD, aspect) holds 18 degrees at any
   canvas. It is exact here because the look-at height is 0 — placeCamera sets an
   absolute height, so the elevation is atan(camY / rad) only when ty = 0, and ty
   is deliberately 0 rather than on the cargo so the arithmetic stays honest.

   WHY 18 DEGREES. Lower and the run-out foreshortens until the nine items
   overlap into one blur and the count is unreadable; higher and the SILHOUETTES
   go — a drum seen from above is a disc, a gunny bag is a blob, and the mixed
   cargo that is this scene's entire differentiator collapses into "some boxes".
   18 is where the items are separated along the deck AND still seen enough from
   the side to tell apart. */
const ELEV_TAN = Math.tan((18 * Math.PI) / 180);
/* 7.85, up from 6.49. The first framing fitted the MOUTH-to-run-out span and
   nothing else, so the container — 6.06 long, centred at x -5.4, spanning -8.43
   to -2.37 — had barely 1.3 units of its length inside a frame whose left edge
   sat at about -3.7. It rendered as a rectangle because that is all that was in
   shot. Widening the fit to cover x -5.6 .. +5.7 (half-extent 5.65, so a screen
   half-width of 5.65*cos(0.42) = 5.16, and REF_RAD = 5.16/tan(32.2) * cos(18) =
   7.85) brings roughly 3.2 units of container into frame — enough corrugated
   side to identify it — at the cost of about 20% scale on everything else.
   The stream's wrap point at worldX -6.075 stays off frame left AND inside the
   container, so hiding the wrap is unaffected. */
const REF_RAD = 7.85;
const CAM_AZ = 0.42;
// re-centred with the frame: the fitted span is now x -5.6 .. +5.7
const CAM_T = { tx: 0.05, ty: 0, tz: 0 };

const REF_ASPECT = 1600 / 680;
const fitRad = (rad: number, aspect: number) =>
  rad * Math.min(Math.max(REF_ASPECT / Math.max(aspect, 0.2), 1), 2.6);

/* ---- the counter -----------------------------------------------------------

   STATELESS, AND IT MUST BE. An accumulated `count++` breaks in two ways that
   both actually happen here: it resets or double-counts at the loop wrap, and it
   goes wrong the instant `?phase` pins the loop (time keeps running, items do
   not move, and the counter runs away).

   Item i crosses x = 0 at p = 0.5 - i/9 (mod 1) — see cargo.ts — so the nine
   crossings are evenly spaced 1/9 apart with the first at p = 1/18. The number
   of crossings elapsed by p is therefore

       floor((p - 1/18) * 9) + 1     for p >= 1/18,  and 0 below
     = floor(9p - 0.5) + 1
     = floor(9p + 0.5)

   Checks: p = 0 -> floor(0.5) = 0. p = 1/18 -> floor(1.0) = 1. p = 0.5 ->
   floor(5.0) = 5 (items 4,3,2,1,0 have crossed). p -> 1 -> 9.

   AND IT KEEPS CLIMBING THROUGH THE WRAP, because the argument is elapsed LOOPS
   rather than p. With n whole loops done and fractional part p,

       floor(9(n + p) + 0.5) = 9n + floor(9p + 0.5)

   exactly, since 9n is an integer — so the formula is the per-loop one plus nine
   per completed loop, monotone across the seam, with no counter variable
   anywhere. Under a phase pin it is evaluated at the pinned p alone, so a frozen
   stream gets a frozen number, which is the only correct answer. */
const COUNT_FROM = 47;
const countAt = (loops: number) => COUNT_FROM + Math.floor(9 * loops + 0.5);

/* ---- and the same number, split by TYPE --------------------------------

   A total on mixed cargo is only interesting if the system can say WHAT it
   counted, so the readout carries a per-type breakdown. It is derived from the
   identical crossing arithmetic and never accumulated, for exactly the reasons
   above — three counters would be three chances to desync from the total.

   WHICH ITEM MAKES THE k-th CROSSING. Item i crosses at p = 0.5 - i/9 (mod 1)
   and the k-th crossing of a loop happens at p = 1/18 + k/9, so

       1/18 + k/9 = 0.5 - i/9  (mod 1)   ->   i = (4 - k) mod 9

   Check against SEQUENCE: k = 0..8 gives i = 4,3,2,1,0,8,7,6,5, whose types are
   carton, drum, gunny, carton, carton, gunny, carton, drum, gunny — four
   cartons, three sacks, two drums, which is exactly SEQUENCE's own census. If
   that ever stops holding, the assertion below is wrong and so is the total.

   PREFIX is built FROM SEQUENCE rather than written out, so re-ordering the mix
   cannot leave a hand-typed table behind. */
const TYPE_ORDER: ItemType[] = ["carton", "gunny", "drum"];
const PREFIX: number[][] = (() => {
  const rows: number[][] = [[0, 0, 0]];
  for (let k = 0; k < ITEM_N; k++) {
    const prev = rows[k];
    const t = SEQUENCE[(((4 - k) % ITEM_N) + ITEM_N) % ITEM_N];
    rows.push(prev.map((v, j) => v + (TYPE_ORDER[j] === t ? 1 : 0)));
  }
  return rows;
})();
/* The opening balance, split so the three add to COUNT_FROM = 47 in the same
   4:3:2 proportion a full loop delivers. Arbitrary, like COUNT_FROM itself —
   but it has to be consistent, or the parts stop summing to the whole. */
const MIX_FROM = [21, 16, 10];
const mixAt = (loops: number) => {
  const n = Math.floor(9 * loops + 0.5);
  const whole = Math.floor(n / ITEM_N);
  const rem = n - whole * ITEM_N;
  return MIX_FROM.map((b, j) => b + whole * PREFIX[ITEM_N][j] + PREFIX[rem][j]);
};

/* Windows. */
const W_DAMAGE: [number, number] = [0.55, 0.75];
const W_PROOF: [number, number] = [0.72, 0.92];

const TAG_TEXT = { carton: "CARTON", gunny: "GUNNY BAG", drum: "DRUM" } as const;

const mono = "var(--font-plex-mono)";

/** `bare` lifts the scene out of its frame — see ContainerVisionScene. */
export default function CargoVisionScene({ bare = false, bleed = 0 }: { bare?: boolean; bleed?: number } = {}) {
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
      /* shadowExtent 10 and spread 1.8: the subject is a 6-metre container plus
         an 8-metre run-out, so both are wider than a single-object scene and
         narrower than the yard's 18 metres. Full light rig and bloom — this is a
         flagship canvas, where both are visible. exposure 1.05, a touch under
         the house 1.18: nine lit objects on an open deck flatten toward one
         bright band at the higher value, and the items separating from each
         other is the whole readability of the count. */
      const studio = createStudio(wrap, {
        /* floorY is GROUND + 0.004, NOT GROUND. The deck slab is the visible
           floor and it lies at exactly GROUND; the studio's shadow catcher has
           to be a hair ABOVE it rather than coincident, or the two z-fight.
           Putting the catcher up rather than the deck down is what lets every
           object in cargo.ts rest at GROUND with no gap — see the note there. */
        floorY: GROUND + 0.004, shadowExtent: 10, spread: 1.8, bare,
        maxDpr: 1.75, shadowMapSize: 1024, exposure: 1.05,
      });
      const { renderer, scene, camera, bloom, shadowMat } = studio;

      /* ---- AERIAL PERSPECTIVE ----
         The deck is 120 units square and has to end somewhere. It is NOT given
         an edge treatment, because at this camera the true horizon sits about
         3 degrees above the top of frame — the deck runs off the top edge and
         the far end is never in shot. What IS in shot is everything between 20
         and 62 units out, which is where the back row stands, and fog is what
         turns that row from "some boxes behind the subject" into depth.

         The colour is the site's own canvas. Both mounts of this scene are
         `bare` (no cyclorama, transparent framebuffer), so the deck's far end
         has to dissolve into the PAGE, not into a backdrop that is not there.
         Near at 20 keeps the container (15.3 units from the lens) completely
         untouched, which matters — a fogged subject is a flat subject.

         Set BEFORE compileAsync. Fog is a program define; adding it later would
         recompile every material in the scene inside a visible frame, which is
         the seal bug container-vision documents. */
      scene.fog = new THREE.Fog(PALETTE.bgBottom, 18, 46);

      /* ---- subject ---- */
      const cmats = buildMaterials();
      const mats = buildCargoMaterials();
      const model = buildCargo(mats, cmats);
      scene.add(model.root);

      /* The drafting sheet, now ruled ON the deck rather than floating over
         nothing. It moved from GROUND - 0.012 to GROUND + 0.008: the deck slab
         sits at exactly GROUND, so at its old height the grid was UNDERNEATH
         the floor and would have drawn nothing at all. It is also above the
         shadow catcher at GROUND + 0.004, so the grid does not take the cargo's
         shadow — a little realism traded for a legible ruling, which is the
         right way round for an 8.5%-opacity drafting graphic.

         One gridline per metre — the cargo's own unit, so the grid reads as
         scale as well as as ground. Pulled in tight (fade 0.30 -> 0.62 of a
         60-unit plane, so it dies at r = 18.6) because it now has to die before
         the fog starts at 20, or the two falloffs fight each other. */
      const ground = draftingGround({
        size: 60, y: GROUND + 0.008, step: 1,
        color: PALETTE.grid, opacity: 0.085, glow: 2.2, majorBoost: 2.2,
        fadeStart: 0.30, fadeEnd: 0.62,
      });
      scene.add(ground.mesh);

      /* ---- the detector ----
         No scan plane. The stream itself is the event — a sweep bar crossing a
         line that is already moving reads as a second, unrelated animation. */
      const dm = detectMaterials();

      /* NINE BRACKETS, NOT ONE.

         The scene shipped with a single tracker on the flagged carton, so the
         entire 9-second loop contained ONE detection — which is why the boxes
         read as "very infrequent". A destuff line that boxes one case in nine
         is not a system that counts every case; it is a system that noticed
         something once. Every item is now bracketed as it crosses the read
         zone, which is nine detections per loop at one per second.

         EACH TRACKER GETS ITS OWN MATERIAL CLONE. `dm.accent` is one shared
         MeshBasicMaterial, so nine trackers sharing it could only ever be
         switched on and off together — the fade has to be per item or the
         brackets all pop at once. A MeshBasicMaterial clone carries no maps and
         costs a uniform block; the bar GEOMETRY is still the one shared plane
         detect.ts hands out.

         pad 1.15 is loose enough to clear a 0.9-unit box's silhouette and tight
         enough not to swallow the items either side of it in the stream. */
      const readMats = model.items.map(() => dm.accent.clone());
      const readers = readMats.map((mat) => {
        const t = createTracker(mat, { pad: 1.15 });
        scene.add(t.group);
        return t;
      });

      /* And the damage bracket stays separate, in orange — the CONCLUSION
         colour. It sits ON TOP of the flagged carton's routine read, which is
         the point: the same pass that counts the case is the pass that flags
         it. */
      /* pad 1.12, down from 1.28. On a 0.9m carton a 28% pad puts a quarter of
         a box of air inside the bracket, so the mark reads as loosely gesturing
         at the case rather than as measuring it — and it sat noticeably slacker
         than crane-vision's rust bracket doing the same job two sections up.
         1.12 still clears the crush deformation and the per-item rock without
         clipping a corner. */
      const tracker = createTracker(dm.warn, { pad: 1.12 });
      scene.add(tracker.group);

      /* ---- the damage callout ----
         The one place this scene uses the shared callout machinery: the finding
         needs a name and a confidence, which a bracket cannot carry. Everything
         else in the overlay is bespoke (see below). */
      const damage = createCallout(overlay, {
        id: "damage",
        title: "Crushed corner",
        detail: "89% confidence · case 51 · logged, not stopped",
        pos: new THREE.Vector3(),          // replaced per frame — the target moves
        normal: new THREE.Vector3(0, 1, 0),
        severe: true,
        lane: { dir: "up", len: 72 },
        onDark: true,
        win: W_DAMAGE,
      });
      const marks: Callout[] = [damage];

      /* ---- the tally: this scene's readout ----

         MOVED FROM TOP-RIGHT TO BOTTOM-LEFT, AND RE-REGISTERED.

         It used to be a 52px accent numeral over a 11px letterspaced caption,
         parked in the upper right — which is a DISPLAY GRAPHIC. It read as
         branding laid over the render rather than as a machine reporting, and
         it was also the largest, brightest thing in a frame whose subject is
         the cargo.

         The register it now matches is work-vision's shift register: a 10px
         0.24em head in 42%-alpha ink, and beneath it one row on a 1px accent
         left rule. Same grammar, same weights, same colours — three scenes on
         this site now report the same way, which is worth more than any of them
         having its own look. document-vision's extracted-data column is the
         same family (10px key / 15px value, accentText on near-black).

         The number keeps a little more weight than work-vision's 13px, because
         here the number IS the claim; 27px is still instrumentation and not a
         display. And the type BREAKDOWN beside it is not decoration — it is the
         thing that makes "every case counted" mean something on MIXED cargo. It
         is derived from the same crossing arithmetic as the total, so it cannot
         disagree with it. */
      const counterBox = document.createElement("div");
      counterBox.style.cssText =
        "position:absolute;left:30px;bottom:26px;opacity:0;transition:opacity .4s ease;pointer-events:none;";
      const counterLabel = document.createElement("div");
      counterLabel.textContent = "CASES COUNTED";
      counterLabel.style.cssText =
        `font-family:${mono};font-size:10px;font-weight:500;letter-spacing:0.24em;color:rgba(226,234,244,0.42);padding-bottom:9px;`;
      const counterRow = document.createElement("div");
      counterRow.style.cssText =
        `border-left:1px solid ${PALETTE.accent};padding-left:12px;display:flex;align-items:baseline;gap:14px;`;
      const counterNum = document.createElement("div");
      counterNum.style.cssText =
        `font-family:${mono};font-size:27px;font-weight:500;line-height:1;letter-spacing:-0.01em;color:${PALETTE.accentText};font-variant-numeric:tabular-nums;`;
      const counterMix = document.createElement("div");
      counterMix.style.cssText =
        `font-family:${mono};font-size:11px;font-weight:500;letter-spacing:0.14em;color:rgba(226,234,244,0.46);font-variant-numeric:tabular-nums;white-space:nowrap;`;
      counterRow.appendChild(counterNum);
      counterRow.appendChild(counterMix);
      counterBox.appendChild(counterLabel);
      counterBox.appendChild(counterRow);
      overlay.appendChild(counterBox);

      /* ---- type tags ----
         BESPOKE DOM, PROJECTED — deliberately not createCallout, and the reason
         is worth writing down because the callout machinery was the obvious
         first choice.

         A callout is a dot, a leader and a two-line card at 21px/14px with 14x26
         padding. That is tier-3 furniture built to name ONE feature of a static
         subject and hold it for a couple of seconds. Nine of them, riding nine
         moving objects, all crossing the same point one second apart, is nine
         cards' worth of ink stacking up in the middle of the frame — and
         placeCallout's fit test would then reject an arbitrary subset of them as
         they slid toward the edges, so the tags would flicker in and out for
         reasons a viewer cannot see.

         What is wanted is a luggage tag: eight characters of mono riding just
         above the item, in and out inside two seconds. So the tags are their own
         thing, projected with makeProjector — the same projection the callouts
         use — and the callout grammar is reserved for the one finding that
         actually earns it. */
      const tags = model.items.map((it) => {
        const el = document.createElement("div");
        el.style.cssText = "position:absolute;left:0;top:0;opacity:0;pointer-events:none;will-change:transform,opacity;";
        const chip = document.createElement("div");
        chip.textContent = TAG_TEXT[it.type];
        chip.style.cssText =
          `position:absolute;left:0;top:0;transform:translate(-50%,-100%);white-space:nowrap;font-family:${mono};font-size:10px;font-weight:500;letter-spacing:0.16em;color:${PALETTE.accentText};background:rgba(3,5,9,0.82);border:1px solid rgba(92,200,255,0.34);border-radius:2px;padding:4px 8px;`;
        el.appendChild(chip);
        overlay.appendChild(el);
        return el;
      });

      /* ---- the proof: a CCTV frame grab ----
         EVIDENCE, NOT A UI CARD. The difference is entirely in the surface: a
         card would be the overlay's own black with the accent on it, and would
         read as the system talking. This has to read as something the system
         PULLED — so it is a 4:3-ish letterbox at 120x84 in a colour that is not
         the overlay's black, ruled with 2px scanlines, with a burned-in
         timestamp and camera ID sitting IN the image rather than in a caption
         beneath it. Burned-in metadata is the single strongest "this came off a
         recorder" cue there is.

         Border in warn, not accent: the grab exists because of the damage, and
         orange is the conclusion colour across the whole page. */
      /* AND IT NOW HAS PIXELS IN IT. Until this pass the panel was a scanline
         gradient over #0E1116 — literally an empty frame, which is why "the
         camera screenshot does not show anything" was a completely fair reading
         of it. See `grabFrame` further down for where the picture comes from.

         The <canvas> is the picture; the border, the scanlines and the burned-in
         metadata stay on the OUTER div. That separation is not cosmetic: the
         same file's crane-vision sibling documents a CSS filter eating its own
         element's border, and keeping the image on an inner layer is the fix
         that stops that class of bug before it starts. */
      const proof = document.createElement("div");
      proof.style.cssText =
        "position:absolute;left:0;top:0;width:150px;height:105px;opacity:0;pointer-events:none;will-change:transform,opacity;" +
        "background:#0E1116;overflow:hidden;box-sizing:border-box;" +
        "border:1px solid rgba(237,81,12,0.6);";
      const proofPic = document.createElement("canvas");
      proofPic.width = 300;
      proofPic.height = 210;
      proofPic.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
      proof.appendChild(proofPic);
      const proofScan = document.createElement("div");
      proofScan.style.cssText =
        "position:absolute;inset:0;background-image:repeating-linear-gradient(to bottom," +
        "rgba(255,255,255,0.055) 0px,rgba(255,255,255,0.055) 1px,rgba(0,0,0,0) 1px,rgba(0,0,0,0) 2px);";
      proof.appendChild(proofScan);
      const stamp = document.createElement("div");
      stamp.textContent = "14:07:52";
      stamp.style.cssText =
        `position:absolute;left:5px;bottom:4px;font-family:${mono};font-size:8px;font-weight:500;letter-spacing:0.06em;color:rgba(226,234,244,0.78);`;
      const camId = document.createElement("div");
      camId.textContent = "CAM 02";
      camId.style.cssText =
        `position:absolute;right:5px;top:4px;font-family:${mono};font-size:8px;font-weight:500;letter-spacing:0.10em;color:rgba(237,81,12,0.9);`;
      proof.appendChild(stamp);
      proof.appendChild(camId);
      overlay.appendChild(proof);

      /* The tether. A 1px rule from the flagged carton to the grab's near
         corner, so the frame is attached to the thing it is evidence OF. Drawn
         as a rotated div anchored AT the carton — origin on the left edge, so
         the transform is translate-to-item then rotate-toward-panel. */
      const tether = document.createElement("div");
      tether.style.cssText =
        "position:absolute;left:0;top:0;height:1px;opacity:0;transform-origin:0 50%;background:rgba(237,81,12,0.5);pointer-events:none;will-change:transform,opacity,width;";
      overlay.appendChild(tether);

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
      const anchor = new THREE.Vector3();
      let raf = 0;

      const project = makeProjector(camera, model.root);

      /* ---- THE PROOF GRAB: what the camera actually saw --------------------

         The panel used to be an empty letterbox with scanlines drawn over it.
         "The camera screenshot does not show anything" was not a bug report
         about a broken image — there was no image.

         Crane Vision solved the neighbouring problem by cropping a 2D canvas it
         had already painted (the rust patch on the container's front-face
         texture) and using the data URL as a tile background. That works there
         because the defect IS a painted texel. It does not work here: this
         scene's finding is a COLLAPSED CORNER — geometry, not paint — so no
         texture in the scene contains a picture of it.

         So the grab is taken off the WebGL canvas itself, which is the honest
         answer anyway: a CCTV still of a destuff bay is a crop of the camera
         feed. `drawImage` on a WebGL canvas is only valid before the drawing
         buffer is presented, so this MUST be called inside the same task as
         `render()` — which is why it is a separate function called from the
         loop rather than part of applyFrame. The renderer is not built with
         `preserveDrawingBuffer` (that is studio.ts's call, not this scene's)
         and this way it does not need to be: there is a cost to that flag on
         every frame of every scene on the page, and this needs one frame.

         ONE CAPTURE PER MOUNT. The panel shows a still, and a still that
         refreshes is a video feed — which would say the opposite of what a
         frame grab says.

         AND IT IS CHECKED. If the buffer was already presented, or the crop
         landed off-canvas, the result is a flat fill; a flat fill is detectable
         (no luminance range) and falls back to the kraft board the flagged case
         is actually skinned with, cropped tight. That is a worse picture and
         still a real one — it is that case's own surface. */
      const proofCtx = proofPic.getContext("2d", { willReadFrequently: true });
      const PW = proofPic.width, PH = proofPic.height;
      let grabbed = false;
      let wantGrab = false;

      const grabFallback = () => {
        if (!proofCtx) return;
        proofCtx.fillStyle = "#0E1116";
        proofCtx.fillRect(0, 0, PW, PH);
        const src = (mats.cartons[0].map as THREE.CanvasTexture | null)?.image as
          | HTMLCanvasElement
          | undefined;
        if (src && src.width && src.height) {
          const ch = src.height * 0.34, cw = ch * (PW / PH);
          proofCtx.globalAlpha = 0.55;   // the board is lit; a grab is not
          proofCtx.drawImage(src, src.width * 0.22, src.height * 0.30, cw, ch, 0, 0, PW, PH);
          proofCtx.globalAlpha = 1;
        }
        grabbed = true;
      };

      const grabFrame = (w: number, h: number) => {
        if (!proofCtx) return;
        const fg = model.items[FLAGGED].grp;
        anchor.set(fg.position.x, fg.position.y, fg.position.z);
        const r = project(anchor, damage.normal, w, h);
        if (!r) { grabFallback(); return; }

        const gl = renderer.domElement;
        // project() answers in CSS pixels; the drawing buffer is in device ones
        const dpr = gl.width / Math.max(1, w);
        // 0.30 of frame height around the case: tight enough that the crop is
        // OF the case rather than of the bay it is in
        const ch = Math.min(gl.height, h * 0.30 * dpr);
        const cw = ch * (PW / PH);

        proofCtx.fillStyle = "#0E1116";
        proofCtx.fillRect(0, 0, PW, PH);
        try {
          proofCtx.drawImage(
            gl, r.sx * dpr - cw / 2, r.sy * dpr - ch / 2, cw, ch, 0, 0, PW, PH,
          );
        } catch { grabFallback(); return; }

        // did anything actually land? A presented-and-cleared buffer, or a crop
        // entirely off the canvas, both give a single flat colour.
        let mn = 255, mn2 = 0;
        const d = proofCtx.getImageData(0, 0, PW, PH).data;
        for (let i = 0; i < d.length; i += 4 * 97) {
          const v = (d[i] + d[i + 1] + d[i + 2]) / 3;
          if (v < mn) mn = v;
          if (v > mn2) mn2 = v;
        }
        if (mn2 - mn < 6) { grabFallback(); return; }
        grabbed = true;
      };

      /* REVIEW AID: `?phase=0.62` pins the loop at that p and holds it there. A
         9-second loop with a two-beat payload cannot be reviewed by screenshot
         roulette. Time still advances (so the intro settles normally), only the
         loop position is held — which is also why the counter is evaluated at
         the pinned p rather than at t: a pinned stream must show a pinned
         number. Query-gated, so it costs a string check at build and nothing in
         the frame loop. */
      const pinned = new URLSearchParams(location.search).get("phase");
      const pinP = pinned === null ? null : Math.min(1, Math.max(0, Number(pinned)));
      const holdP = pinP !== null && Number.isFinite(pinP) ? pinP : null;

      const applyFrame = () => {
        const frozen = reduce;
        const t = frozen ? FROZEN_T : clock.getElapsedTime();
        /* `loops` is elapsed time in LOOPS — a real number that keeps growing.
           p is its fractional part. The counter reads `loops`, everything else
           reads p; that split is the whole of "the count survives the wrap". */
        const loops = frozen ? FROZEN_P : (holdP ?? t / LOOP);
        const p = frozen ? FROZEN_P : (holdP ?? (t % LOOP) / LOOP);
        const w = renderer.domElement.clientWidth || wrap.clientWidth;
        const h = renderer.domElement.clientHeight || wrap.clientHeight;
        const oh = h - bleed * 2;               // the OVERLAY's height

        /* ---- the stream. Linear, always. ---- */
        model.advance(p);

        /* ---- camera: one pose, held ---- */
        const aspect = w / h;
        const rad = fitRad(REF_RAD, aspect);
        const camY = ELEV_TAN * rad;            // holds 18 degrees at any aspect
        target.set(CAM_T.tx, CAM_T.ty, CAM_T.tz);
        placeCamera(camera, { az: CAM_AZ, rad, ...CAM_T }, camY);
        camera.lookAt(target);
        camera.updateMatrixWorld(true);
        camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

        /* ---- intro settle ----
           Every material here is built at opacity 0, so this is not a flourish:
           without it nothing is ever drawn. */
        const solid = frozen ? 1 : easeInOut(clamp01((t - 0.15) / SETTLE));
        cmats.steel.opacity = solid;
        cmats.dark.opacity = solid;
        cmats.front.material.opacity = solid;
        for (const c of mats.cartons) c.opacity = solid;
        mats.bag.opacity = solid;
        mats.drum.opacity = solid;
        mats.rib.opacity = solid;
        mats.voidM.opacity = solid;
        mats.lane.opacity = solid * 0.55;
        mats.threshold.opacity = solid * 0.80;
        mats.belt.opacity = solid;
        mats.slat.opacity = solid;
        mats.frame.opacity = solid;
        mats.roller.opacity = solid;
        for (const f of mats.far) f.opacity = solid * 0.85;
        /* The pendant lamp. Its light is the scene's practical fill, so it
           ramps with everything else rather than snapping on — a room that
           lights before its lamp appears reads backwards. 3.4 is tuned to
           lift the belt and the cargo without washing the fog gradient that
           carries the depth read. */
        model.lamp.shade.opacity = solid;
        model.lamp.bulb.opacity = solid;
        model.lamp.light.intensity = solid * 3.4;
        /* THE DECK RAMPS ON COLOUR, NOT OPACITY — see the material's own note.
           multiplyScalar works on the LINEAR working value, which is the
           correct space to dim a lit surface in; scaling the sRGB hex instead
           would gamma-crush the mid-tones on the way up. */
        mats.deck.color.copy(DECK_COL).multiplyScalar(solid);
        /* Two catchers. A transparent mesh still casts a full shadow, so both
           have to ramp with the cargo or the shadows are on the belt before the
           cases are. The BELT catcher carries more weight than the deck one:
           it is where the contact actually is, and a contact shadow is the
           single strongest cue that an object is resting on something rather
           than hovering over it. */
        shadowMat.opacity = 0.44 * solid;
        mats.beltShadow.opacity = 0.60 * solid;
        setGroundOpacity(ground, solid);

        /* ---- the readout ---- */
        counterNum.textContent = String(countAt(loops)).padStart(3, "0");
        {
          const [c, g, d] = mixAt(loops);
          counterMix.textContent = `CTN ${c} · BAG ${g} · DRM ${d}`;
        }

        /* ---- the read: a bracket and a tag, per item, per crossing ----

           Visibility is a function of the item's own x, not of p, so it is
           correct for all nine at once and cannot desynchronise from the stream.

           THE WINDOW WAS HALVED. It used to open 1.10 units before the count
           line and close 2.15 past it — 3.25 units at 1.35 u/s is 2.41 seconds,
           and a label that sits on an object for two and a half seconds has
           stopped being a read and become a caption. It now runs -0.70 to
           +0.95, which is 1.65 units and 1.22 seconds: enough to read eight
           characters of mono, short enough that the mark reads as an event.

           The window still straddles the line rather than trailing it, so the
           bracket is on the case AT the moment the number ticks. The ramps at
           either end are deliberately fast (0.28 and 0.33 units, ~0.2s) — a
           detector's box appears, it does not dissolve in.

           At a 1.35-unit pitch and a 1.65-unit window there is a brief overlap
           where two adjacent items are both marked, which is correct for a
           running line and is the reason each tracker needed its own material. */
        for (let i = 0; i < ITEM_N; i++) {
          const it = model.items[i];
          const g = it.grp;
          const x = g.position.x;
          const vis = solid
            * smoothstep(-0.70, -0.42, x)
            * (1 - smoothstep(0.62, 0.95, x));

          readMats[i].opacity = vis * 0.9;
          /* The GROUP, not the mesh: a drum's hoops, rims and bung are siblings
             of its body, so bracketing the body alone would draw a box inside
             the drum's own silhouette. */
          readers[i].follow(vis > 0.01 ? it.grp : null, camera);

          const el = tags[i];
          if (vis <= 0.01) { el.style.opacity = "0"; continue; }
          anchor.set(x, g.position.y + 0.62, g.position.z);
          const r = project(anchor, damage.normal, w, h);
          if (!r) { el.style.opacity = "0"; continue; }
          el.style.transform = `translate(${r.sx}px,${r.sy - bleed}px)`;
          el.style.opacity = String(vis);
        }

        /* ---- damage: the bracket and its label ----
           THE COUNT DOES NOT PAUSE HERE. Nothing in this block touches the
           stream or the counter — that independence is the claim, and it is
           enforced by there being no shared state to touch. */
        const dmgVis = frozen
          ? 1
          : (p > W_DAMAGE[0] && p < W_DAMAGE[1]
            ? smoothstep(W_DAMAGE[0], W_DAMAGE[0] + 0.03, p) * (1 - smoothstep(W_DAMAGE[1] - 0.04, W_DAMAGE[1], p))
            : 0);
        tracker.follow(dmgVis > 0.01 ? model.flagged : null, camera);
        dm.warn.opacity = solid * dmgVis;

        const fg = model.items[FLAGGED].grp;
        anchor.set(fg.position.x, fg.position.y + 0.36, fg.position.z);
        const dr = dmgVis > 0.01 ? project(anchor, damage.normal, w, h) : null;
        /* leftGuard 0.04, NOT the shared default 0.3. The default reserves the
           readout column container-vision keeps clear, and this scene has no
           such column — it owns its full width. The flagged carton projects left
           of a third of the frame for the first half of its damage window, so at
           the default the label would be silently rejected on every one of those
           frames. This exact failure has now cost four passes across this
           codebase (the tank valve, the yard slot, both gate reads); when a
           callout never appears, check the bounds test before anything else. */
        placeCallout(damage, dr ? { sx: dr.sx, sy: dr.sy - bleed } : null, dmgVis, w, oh, 0.04);

        /* ---- proof attached ----
           Fades in 0.72-0.76, holds, fades out 0.88-0.92. Only OPACITY is ever
           ramped, here and everywhere else in this scene — see the note on
           `transparent` in cargo.ts. */
        const proofVis = frozen
          ? 1
          : smoothstep(0.72, 0.76, p) * (1 - smoothstep(0.88, 0.92, p));
        if (proofVis <= 0.01) {
          proof.style.opacity = "0";
          tether.style.opacity = "0";
        } else {
          /* The grab sits in clear air right of frame centre and below the
             counter, so the two readouts stack down the same edge instead of
             fighting for the middle. Positioned in overlay pixels each frame so
             it survives a resize without a second code path. */
          /* 0.63 / 0.22, moved UP from 0.44. At 0.44 the panel landed in the
             middle of the run-out and covered the type tag of whichever item was
             crossing the threshold — two pieces of evidence overlapping, which
             is the one thing a proof panel must not do. Up at 0.22 it tucks
             under the counter and both readouts stack down the same right edge,
             with the tether running down-left to the flagged carton across
             empty air. */
          /* 0.63 / 0.20 PUT IT UNDER THE CALLOUT. Measured on the section at a
             1300px viewport: the "Crushed corner" card spans overlay x 588..933
             and the grab landed at 616..766 — the two pieces of evidence sat on
             top of each other, which is exactly the failure the note above says
             a proof panel must never have. The callout anchors to the flagged
             carton and the grab was placed as a fraction of the same frame, so
             both chase the same object and collide whenever it is right of
             centre.

             The fix is to put the grab on the OPPOSITE side of the frame from
             the card. The callout tracks the carton across the right half
             during the damage window; the left third stays clear, because the
             counter now lives bottom-left and the container mouth occupies the
             upper left only. 0.06 / 0.16 tucks it into that gap with the tether
             running right-and-down to the carton across open air. */
          const px = w * 0.06, py = oh * 0.16;
          proof.style.transform = `translate(${px}px,${py}px)`;
          proof.style.opacity = String(proofVis);

          anchor.set(fg.position.x, fg.position.y + 0.30, fg.position.z);
          const pr = project(anchor, damage.normal, w, h);
          if (!pr) { tether.style.opacity = "0"; }
          else {
            // to the grab's BOTTOM-LEFT corner — the corner nearest the cargo,
            // so the leader never crosses the image it is attached to.
            // 105 is the panel's height; it moved with the panel.
            const dx = px - pr.sx, dy = (py + 105) - (pr.sy - bleed);
            tether.style.width = `${Math.hypot(dx, dy)}px`;
            tether.style.transform =
              `translate(${pr.sx}px,${pr.sy - bleed}px) rotate(${Math.atan2(dy, dx)}rad)`;
            tether.style.opacity = String(proofVis * 0.9);
          }
        }

        /* ---- and the one frame that gets kept ----
           Arm the grab when the flagged case is bracketed and in clear air, at
           p 0.62-0.70 — well inside the damage window (0.55-0.72) so the orange
           bracket is ON the case in the captured pixels, and comfortably before
           the panel itself appears at 0.72. Under a phase pin or reduced motion
           the loop never reaches 0.62, so those take the first frame they get.
           The capture itself cannot happen here: it has to run AFTER the draw,
           in the same task. See the render loop. */
        /* AND IT WAITS FOR THE INTRO. `solid` gates it because the first
           version did not, and under `?phase` — where p is constant, so the
           0.62-0.70 test is true from frame one — the grab was taken while the
           whole scene was still at opacity 0. The panel came back a black
           rectangle, which is precisely the bug this work was fixing. In the
           unpinned loop p reaches 0.62 at t = 5.6s and solid has been 1 since
           t = 1.1s, so this changes nothing there. */
        wantGrab = !grabbed && solid > 0.98
          && (frozen || holdP !== null || (p >= 0.62 && p <= 0.70));

        // nothing on screen during the opening settle
        overlay.style.opacity = String(frozen ? 1 : smoothstep(0.25, 1.0, t));
        counterBox.style.opacity = String(solid);

        if (bloom) bloom.strength = 0.18 + 0.12 * dmgVis;
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

      /* Prime ONE frame even off screen: the first draw is where textures upload
         and the remaining programs link. Exactly one — after this the gate
         resumes and an off-screen scene costs nothing. The clock deliberately
         does NOT start here; it starts on the first ON-SCREEN frame, so every
         visitor sees the intro from frame one. */
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
        /* SAME TASK AS THE DRAW, DELIBERATELY. See grabFrame's note: reading a
           WebGL canvas after the browser has presented it gives a cleared
           buffer, and the only guaranteed window is right here. */
        if (wantGrab) {
          wantGrab = false;
          grabFrame(
            renderer.domElement.clientWidth || wrap.clientWidth,
            renderer.domElement.clientHeight || wrap.clientHeight,
          );
        }
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(compileGuard);
        ro.disconnect();
        visObs.disconnect();
        marks.forEach((a) => a.wrap.remove());
        tags.forEach((el) => el.remove());
        counterBox.remove();
        proof.remove();
        tether.remove();
        /* Scene-owned only. The kraft board, the brushed metal maps and the
           carton's RoundedBoxGeometry are all module-cached and shared —
           disposing any of them here would leave the next scene sampling
           destroyed resources, the hazard skins.ts and metal.ts both spell out. */
        mats.dispose();
        cmats.dispose();
        model.owned.forEach((g) => g.dispose());
        model.container.edges.geometry.dispose();
        (model.container.edges.material as THREE.Material).dispose();
        dm.all.forEach((m) => m.dispose());
        // the nine per-item bracket materials are clones this scene made
        readMats.forEach((m) => m.dispose());
        ground.material.dispose();
        studio.dispose();
      };
    } catch (err) {
      console.error("[cargo-vision] init failed:", err);
      wrap.style.background = PALETTE.bgBottom;
    }

    return () => cleanup();
    }, "cargo");
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
          whole component moves the counter and the frame grab with it, and they
          end up on the section's own copy. */}
      <div
        ref={canvasWrapRef}
        style={{ position: "absolute", left: 0, right: 0, top: -bleed, bottom: -bleed }}
      />
      <div ref={overlayRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0 }} />
    </div>
  );
}

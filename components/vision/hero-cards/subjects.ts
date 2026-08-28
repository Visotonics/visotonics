/* ---------------------------------------------------------------------------
   Home hero cards — the four subjects.

   These are the small ones. Each card is ~320 x 240 on screen, so the rules
   that govern a flagship scene invert: no leader lines, no readout, no
   multi-stop story. One subject, one slow move, one caption — the caption
   being the exact line its schematic already carried.

   Geometry stays primitive; the SKINS (see ./skins) carry the realism, because
   at card size a surface reads and a bevel does not. What geometry has to earn
   is the silhouette and the motion.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { makeMetal, metalBox, tintMetal } from "../_vision/metal";
import {
  beltSurface, cardboardSide, cardboardTop, concreteFloor, containerDoorEnd,
  containerRoof, containerRust, containerSide, palletDeck, rackUpright, tyre,
  wrappedPallet,
} from "./skins";
import { createSightCone, createTracker, detectMaterials as detectMaterialsRaw, scanPlane } from "./detect";
import type { DetectMaterials, Tracked } from "./detect";
import { draftingGround, setGroundOpacity } from "./ground";

export interface CardSubject {
  group: THREE.Group;
  /** the one thing the caption is about — reserved for future markers */
  focus: THREE.Vector3;
  /** meshes whose opacity the intro ramps */
  materials: THREE.Material[];
  /** per-frame life: p is 0..1 through the loop */
  tick?: (p: number) => void;
  /** detection graphics that must stay square to the camera */
  billboards?: THREE.Object3D[];
  /** called every frame, after tick(), to keep detection trackers locked on */
  trackers?: (camera: THREE.Camera) => void;
  /** Every tracker this subject owns, so the card can drive them uniformly —
      currently the hover ACQUIRE settle. Listing them here rather than giving
      each subject its own hover callback keeps the behaviour in ONE place;
      four separate implementations of the same easing is how they drifted
      apart last time. */
  marks?: Tracked[];
  dispose: () => void;
  /** optional drafting-ground fade hook, set by subjects that carry one */
  ground?: { setOpacity: (o: number) => void };
}

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/* Temporary deep instrumentation (?perf). Splitting studio-vs-subject named the
   two expensive builders; this splits WITHIN them so the cost can be attributed
   to materials, geometry or the detection layer rather than guessed at. */
const _deep = (label: string, t0: number) => {
  if (typeof location !== "undefined" && location.search.includes("perf")) {
    const w = window as unknown as { __visionDeep?: string[] };
    (w.__visionDeep ||= []).push(`${label} ${(performance.now() - t0).toFixed(0)}`);
  }
};


/** BoxGeometry face order is +x, -x, +y, -y, +z, -z. A container is skinned
    ends / roof / floor / long sides; a carton is top-and-bottom / sides. */
const faces = (endM: THREE.Material, topM: THREE.Material, sideM: THREE.Material) =>
  [endM, endM, topM, topM, sideM, sideM];

/* THE DETECTION PALETTE, RE-KEYED FOR A DARK PANEL — here rather than in
   detect.ts, which is shared with scenes outside this change's scope.

   detect.ts still ships the light-card colours, picked on the explicit rule
   that "on light, an overlay reads by being DARKER and more saturated than
   everything around it". That rule inverts with the ground, and both of its
   results fail on a #0E1015 backdrop:

     accent #1B7FC4 = (27,127,196) — DARKER than the cargo it is marking, so a
       bracket reads as a shadow on the box rather than as a graphic over it.
     faint  #5A6B7A = (90,107,122) at 0.8 alpha -> ~(75,89,102) over the
       backdrop: indistinguishable from the structural steel behind it.
     scan   #2E86BE at 0.42 -> ~(27,66,89): a bar that darkens a near-black
       frame, which is not a scan, it is a smudge.

   The replacements are the dark palette's own values. accent goes to
   PALETTE.accent (#5CC8FF); scan to PALETTE.accentBloom (#8FDCFF) so a sweep
   reads as light passing over the subject; faint becomes a LIGHT desaturated
   slate — still obviously not the accent (no saturation, and it keeps its 0.8
   alpha) but now clearly present. `warn` is untouched: #ED510C is the site's
   signal orange and it was already the one value in the set that holds against
   both grounds. */
function detectMaterials(): DetectMaterials {
  const dm = detectMaterialsRaw();
  dm.accent.color.set(PALETTE.accent);
  dm.faint.color.set("#8FA3B4");
  dm.scan.color.set(PALETTE.accentBloom);
  return dm;
}

/* THE DRAFTING GROUND'S INK, likewise. ground.ts defaults to #1A2733 — a
   near-black line, correct for drawing a drafting sheet on paper and invisible
   on one. Every call below passes this instead, and lifts its own peak alpha by
   ~1.6x: a light line at 0.07 over (14,16,21) contributes about (6,8,9), which
   rounds away at card size, so the alphas that were tuned for dark-ink-on-white
   have to come up as well as the hue changing. */
const GRID_INK = "#5E7A93";

/* The colour the ground's outer vignette fades TO, i.e. what the floor's far
   edge is painted with so the finite plane does not end in a visible line.

   It is NOT the backdrop ramp's mid stop, which is what it used to be, and
   that was the bug: the cyclorama is not the ramp alone. studio.ts composites
   `col + cGlow*g*0.55` on top of it (see its fragment shader), and the glow
   direction — normalize(-0.1, 0.16, -1.0) — points straight back behind the
   subject, so at the horizon g is very near 1 and the pool contributes
   essentially all of it.

   Arithmetic, in 0-255 sRGB terms:
     ramp mid   #0A0B0E                    = (10, 11, 14)
     glow       #10151C x 0.55             = ( 9, 12, 15)
     cyclorama at the horizon              = (19, 23, 29)
   The old vignette painted (10, 11, 14) against that (19, 23, 29) — a ~12
   level step landing exactly where these cameras put the plane's far edge,
   which is at frame CENTRE (they look down ~6.7deg with a 30deg vfov, so the
   horizon sits just above the middle of the card). That step is the hard line
   reported across all four cards.

   #0E1218 (14, 18, 24) sits between the two. It cannot match everywhere by
   construction — g falls off as pow(...,3.4) toward the frame edges, so the
   cyclorama there decays back toward the ramp — so a single flat colour is
   always a compromise between centre and edge. This halves the worst-case
   step in BOTH directions (~12 -> ~5-6) rather than eliminating it at the
   centre and inverting it at the edges. Paired with an earlier fade start
   (0.50, was 0.62) so the dissolve is longer and gentler, a step this small
   no longer resolves as an edge.

   If this ever needs to be exact rather than close, the real fix is to fade
   the ground surface's own alpha radially instead of painting a flat plane
   over it — then there is nothing to colour-match at all. */
const VIGNETTE_C = "#0E1218";


/* The site's own signal orange — the colour every schematic SVG already uses
   for callouts. Kept here rather than reaching for PALETTE.warn (#FFB020) even
   now the panel is dark again: the reason has changed but the answer has not.
   It was chosen because the softer amber greyed out on a light panel; it stays
   because ORANGE means CONCLUSION across the whole row and every schematic SVG
   on the site draws that callout in this exact hue. #ED510C is fully readable
   on #0E1015, so nothing forces a change. See DECISIONS.md. */
const SIGNAL_ORANGE = "#ED510C";

/* 01 · Viso Yard — a gantry crane reading a container mid-move.

   REWRITTEN. The first version was a 4x2x2 block of sixteen containers with a
   scan sweep across it, and it had three problems that were all the same
   problem:

     · CONCEPTUALLY it showed one capability — find a box in a stack — while
       the card's own copy underneath reads "Container, gate, crane, yard &
       cargo inspection". It named the crane and never showed one.
     · VISUALLY sixteen corrugated boxes in four near-identical navies, at
       ~280x200px, resolve to a grey-blue plaid. Four values of one hue is
       value noise at that size, and it gave the accent nothing to win against.
     · the SVG it was supposedly derived from is not a block of boxes at all:
       it is a yard ELEVATION — gate at left, gantry straddling the stacks,
       trolley and spreader hanging off the beam, one container called out.
       The 3D scene had thrown away the two things that say "yard".

   So: a portal gantry, its trolley crossing the frame with a container in the
   spreader, pausing over an empty bay slot while the platform reads the box,
   then carrying on. The gate is deliberately absent — Gate Vision is its own
   flagship scene and duplicating it here would say the same thing twice.

   WHY THE LOAD NEVER LANDS. Every version where the crane actually places or
   removes a container changes the yard's state, and a 14s loop that changes
   state has to pop back at the wrap — a box appearing or vanishing at x=0, in
   the middle of frame, in full view. Carrying the box ACROSS is state-neutral:
   it enters off-frame left and exits off-frame right, so the wrap happens
   where nothing is visible. It is also the stronger claim. A box identified
   while it is moving, in the crane's grasp, is something a photograph cannot
   assert; a box sitting in a slot is not. */
export function yardSubject(): CardSubject {
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];

  /* ONE set of skins, tinted per livery — not one set PER livery.

     Baking colour into the canvas meant five liveries x three maps = 15 texture
     generations, each a 1024x420 canvas with per-pixel grain. Measured in
     production, procedural texture generation dominated scene-build cost (the
     four cards totalled 2366ms). The cache could not help, because every livery
     asked for a different colour.

     Generating the skin ONCE in neutral grey and tinting via material.color
     collapses that to three canvases. Colour multiplies the map, and a neutral
     grey base takes a tint predictably — unlike the cardboard case, there is no
     warm hue to fight, which is why a plain multiply is correct here and was
     not there. */
  const NEUTRAL = "#9AA0A8";
  const roofTex = containerRoof(NEUTRAL);
  /* ROOF stays the old NEUTRAL+tint trick (one shared canvas, three colours by
     multiply) — nothing about the roof changed in this pass. ENDS and SIDES
     move to `containerDoorEnd`/`containerRust`, which bake their exact livery
     hex straight into the canvas (see skins.ts — `x.fillStyle = base` in both
     raw generators).

     FIRST PASS OF THIS WIRING SET `color: "#ffffff"` HERE, REASONING THAT
     TINTING AN ALREADY-COLOURED MAP WOULD DOUBLE IT. That was backwards: the
     white tint didn't double anything, it REMOVED the one multiply the value
     ladder actually depends on. Every other cargo material in this file
     (`mkTinted` right above, and the identical pattern in Warehouse/Factory)
     is `makeMetal`'s neutral #9AA0A8 albedo (~0.60 luminance fraction) times a
     tint — the tint alone was never the on-screen colour, the multiply
     against that mid-grey base is what pulls it down out of "bright plastic"
     territory. `containerRust`/`containerDoorEnd` bake the livery hex
     straight into the canvas instead of onto a neutral base, so with a white
     tint the baked hex WAS the on-screen colour: ~1.67x too bright (1/0.60),
     which is exactly why the containers went visibly white and jumped above
     the #5CC8FF overlay.

     Fix: tint by NEUTRAL again, not white. `containerSideRaw` (which
     `containerRustRaw` reopens and paints on top of) draws its corrugation
     shading as an ADDITIVE rgba overlay on top of whatever base fill it was
     given — the same overlay delta lands on the livery hex here as landed on
     NEUTRAL before, it is just not multiplied by the fill colour first. So
     baked_pixel ~= base_hex + corrugation_delta, and tinting that by
     NEUTRAL's own fraction (154,160,168)/255 ~= (0.604,0.627,0.659) puts the
     result back in the neighbourhood of the old NEUTRAL_pixel x base_hex path
     the ladder was tuned against — same governing multiply, applied to the
     other factor.

     ARITHMETIC, per-channel multiply then luminance = 0.2126R+0.7152G+0.0722B
     (the formula the backdrop's documented ~11 and the overlay's ~182 both
     use), against the RAW baked hex (i.e. before the corrugation delta, which
     is a wash either side of zero and does not move the average much):

       yardA    #93BEDD (147,190,221) x (.604,.627,.659) -> (89,119,146)
                L = 114.6  |  /backdrop(11) = 10.4x  |  /overlay(182) = 0.63
       yardB    #AFD2E9 (175,210,233) x (.604,.627,.659) -> (106,132,154)
                L = 127.8  |  /backdrop(11) = 11.6x  |  /overlay(182) = 0.70
       load     #CCE6F6 (204,230,246) x (.604,.627,.659) -> (123,144,162)
                L = 141.0  |  /backdrop(11) = 12.8x  |  /overlay(182) = 0.78

     All three land back under the overlay (ratio < 1, load closest at 0.78 —
     it is meant to be the lightest of the three) and well above the backdrop,
     which is the ladder this file's own header comment states at lines
     175-195: cargo lighter than ground, darker than the overlay. */
  const mkTinted = (map: THREE.Texture, base: string) => {
    const m = new THREE.MeshStandardMaterial({
      map, color: base, metalness: 0.18, roughness: 0.82, envMapIntensity: 0.3,
      transparent: true, opacity: 0,
    });
    mats.push(m);
    return m;
  };
  const mkBaked = (map: THREE.Texture) => {
    const m = new THREE.MeshStandardMaterial({
      map, color: NEUTRAL, metalness: 0.18, roughness: 0.82, envMapIntensity: 0.3,
      transparent: true, opacity: 0,
    });
    mats.push(m);
    return m;
  };
  /* ONE texture set, tinted per livery — the pattern `roofTex` already used.
     Every map is painted on NEUTRAL and gets its livery from the material's
     `color` multiply, so all four faces run the SAME value arithmetic
     (albedo ~0.60 x tint) and the ladder at lines 175-195 holds by
     construction rather than by a per-texture compensation. Four canvases for
     the whole yard, not one per container per face. */
  const sideTex = containerSide(NEUTRAL);
  const doorEndTex = containerDoorEnd(NEUTRAL);

  /* WEATHERING IS ONE CONTAINER, NOT EIGHT.

     An earlier pass rusted all eight at varying amounts. Wrong twice over: the
     ask was TEXTURE — corrugation, panel seams, door hardware, honest metal —
     and rust is DAMAGE, not texture. Spread over every box it also stopped
     reading as one weathered container in a working yard and started reading
     as a uniformly diseased stack.

     Exactly one box is weathered: front bank, left stack, BOTTOM course.
     Bottom because rust bleeds downward and belongs at the foot of a stack;
     front-left because it stays fully in frame across the whole 0.30-0.44
     azimuth sweep. Never the box in the crane's grasp — that one is the
     subject of the shot and stays clean to read as the load.

     amount 0.14: `containerRust`'s rail-patch count is `3 + round(amount*4)`,
     so 0.14 gives 4 patches — a suggestion of weathering at 347px rather than
     the spotted blotches the earlier 0.18-0.68 spread produced. */
  const rustTex = containerRust(NEUTRAL, 0.14);
  const cleanSkin = (base: string) =>
    faces(mkTinted(doorEndTex, base), mkTinted(roofTex, base), mkTinted(sideTex, base));
  const rustedSkin = (base: string) =>
    faces(mkTinted(doorEndTex, base), mkTinted(roofTex, base), mkTinted(rustTex, base));

  /* THREE liveries, down from five: two for the yard and one for the load.
     18 materials where there were 30.

     The rule that has survived every re-key of this card — navy, then pale
     desaturated blue, then saturated mid blue for the white panel, and now
     this — is the only thing here worth memorising:

         CARGO SITS BETWEEN THE BACKGROUND AND THE OVERLAY IN VALUE.

     With the panel back to #101216 that means cargo has to be LIGHT: it wins
     against the ground by being brighter, and the overlay wins against it by
     being brighter still (#5CC8FF) and by being the only saturated cyan in the
     frame.

     Tints MULTIPLY makeMetal's mid-grey albedo (#9AA0A8, ~0.60) which also
     carries the baked corrugation shadow, so the on-screen value is roughly
     one step darker than the hex. Each is lifted ~+25 in R from the white-panel
     values, which with the exposure move (0.78 -> 1.18, x1.51) puts the
     mid livery at about 0.60 x 0.74 x 1.51 = 0.67 of full — light cargo on a
     dark ground, where before it computed to 0.60 x 0.48 x 0.78 = 0.22.

       yardA    #7AAFD6 -> #93BEDD
       yardB    #97C4E2 -> #AFD2E9
       loadSkin #B4D9EF -> #CCE6F6

     THE LIVERY FAMILY IS THESE THREE HEXES AND NOTHING ELSE. `cleanSkin` and
     `rustedSkin` are both only ever asked for one of them, so the three-tint
     structure this comment documents is unchanged — the single weathered box
     carries the same tint as its clean neighbours, just a rustier side map. */
  const YARD_A = "#93BEDD", YARD_B = "#AFD2E9";
  // the load: the lightest of the three, so the box in the crane's grasp still
  // separates from the stacks behind it
  const LOAD_LIVERY = "#CCE6F6";

  /* ONE BoxGeometry, shared by all eight containers. The old version called
     `box()` per container, i.e. sixteen identical BoxGeometry allocations. */
  const CW = 2.0, CH = 0.85, CD = 1.0;
  const conGeo = new THREE.BoxGeometry(CW, CH, CD);
  const con = (m: THREE.Material[]) => new THREE.Mesh(conGeo, m);

  const FLOOR = -0.95;
  const ROW0 = FLOOR + CH / 2;          // bottom-row centre height
  const PITCH_X = CW + 0.12;            // bay pitch — the grid step is keyed to this
  const SLOT_X = 0;                     // the empty bay the load is read over

  /* Front bank: two 2-high stacks flanking an empty slot at x=0. Back bank:
     set back, staggered, and deliberately EMPTY at x=0 — the first pass put a
     container directly behind the slot and from a raking camera it filled the
     gap, so the empty bay stopped reading as empty and the whole point of the
     shot was lost. Nothing may occupy the x=0 column at any depth. */
  const topOfStack: THREE.Mesh[] = [];
  for (const sx of [-PITCH_X, PITCH_X]) {
    for (let row = 0; row < 2; row++) {
      // the ONE weathered box: front bank, left stack, bottom course
      const skinFor = sx < 0 && row === 0 ? rustedSkin : cleanSkin;
      const b = con(skinFor(row === 0 ? YARD_A : YARD_B));
      b.position.set(sx, ROW0 + row * (CH + 0.05), 0.5);
      b.castShadow = true;
      b.receiveShadow = true;
      g.add(b);
      if (row === 1) topOfStack.push(b);
    }
  }
  for (const [sx, rows] of [[-PITCH_X, 2], [PITCH_X * 2, 1]] as const) {
    for (let row = 0; row < rows; row++) {
      const b = con(cleanSkin(row === 0 ? YARD_B : YARD_A));
      b.position.set(sx, ROW0 + row * (CH + 0.05), -1.9);
      b.castShadow = true;
      g.add(b);
    }
  }

  /* The hardstand. Grid step is the BAY PITCH, so the gridlines are the bay
     boundaries rather than generic graph paper — the drafting language doing
     actual work for once. Sits just under the containers, not level with
     them, so nothing z-fights the bottom faces.

     Held much quieter than the other three cards (0.07 against 0.16) and
     pulled in from 30 to 24. At bay pitch the lines are far apart, and at
     this card's shallow camera angle they rake almost to the horizon — at the
     shared 0.16 the floor read as a bright blue net competing with the
     gantry, which is the opposite of what a ground plane is for. */
  /* 0.07 -> 0.11 (x1.6), and light ink — see GRID_INK. Still the quietest grid
     of the four: at bay pitch the lines are far apart and this camera's shallow
     angle rakes them almost to the horizon, so the shared value read as a net
     competing with the gantry. */
  /* THE FLOOR. Every subject on this row floated in black void — a grid with
     nothing under it to measure. `concreteFloor()` is a single 1024 canvas,
     cached and shared with the other two cards (see skins.ts), so wiring it
     here costs one extra MeshStandardMaterial and one extra plane, not a new
     texture. Luminance arithmetic (0.2126R+0.7152G+0.0722B, matching the
     formula that gives the #0A0B0E backdrop its documented ~11):
       concrete #20242A (32,36,42)  -> 35.6, ~3.2x the backdrop's 11 — clearly
         lighter than the void, which is what gives the ShadowMaterial
         something to darken.
       lightest cargo tint #CCE6F6 (204,230,246) -> 225.6 as raw hex, well
         above the floor even before the container corrugation/exposure knock
         it down a step — the floor stays BELOW the cargo family, as the value
         ladder requires.
     The vignette sits just above the concrete and fades to the scene's own
     backdrop colour (#0A0B0E, hardcoded — draftingGround has no fog to key
     off), which is what hides the surface plane's hard rectangular edge.

     FIRST PASS LEFT THE EDGE VISIBLE HERE — this is the worst-case camera of
     the three: the shallowest raking angle in the row, which foreshortens
     the floor hardest and pushes the plane's far boundary highest up the
     frame for a given `size`. Two changes, both call-site parameters (no
     ground.ts edit): the plane itself is bigger (24 -> 40, so its edge sits
     further out in world space, i.e. higher up an already-foreshortened
     view, before the vignette has to do any work), and the vignette's own
     falloff is pulled in (default start/end 0.55/1.0 -> 0.32/0.68) so it
     reaches fully opaque backdrop colour at 68% of the now-larger half-size
     instead of 100% of the old, smaller one — comfortably inside the plane's
     actual edge rather than landing exactly on it, which is what a hard
     boundary at the mesh's rasterized edge needs: full coverage BEFORE the
     edge, not asymptotically approaching it at the edge itself. */
  const yardFloorTex = concreteFloor();
  const yardFloorM = new THREE.MeshStandardMaterial({
    map: yardFloorTex, color: "#ffffff", metalness: 0.05, roughness: 0.92,
    transparent: true, opacity: 0,
  });
  const ground = draftingGround({
    size: 40, y: FLOOR - 0.01, step: PITCH_X, color: GRID_INK, opacity: 0.11,
    surface: yardFloorM,
    vignette: { color: VIGNETTE_C, start: 0.50, end: 1.0 },
  });
  g.add(ground.mesh);
  if (ground.surfaceMesh) g.add(ground.surfaceMesh);
  if (ground.vignetteMesh) g.add(ground.vignetteMesh);

  /* ---- the gantry ----
     Plain materials, no maps. makeMetal() costs three canvases and a Sobel
     pass per material, and at 280px a gantry strut is about two pixels wide —
     there is nowhere for a roughness map to show. metalBox still applies, for
     the rounded edge highlight that reads at any size. */
  /* MID METALLIC SLATE. #525A63 / #32383F were picked to be the darkest thing
     in a near-white frame — the strongest read available on paper — and that is
     precisely what fails on #0E1015: a gantry leg is 0.16 units wide, so a
     structure at (50,56,63) against a backdrop at (14,16,21) has nowhere near
     enough separation to survive at ~2px, and the whole crane went to
     silhouette. These are the same two shades lifted about 56 points:

       steel #525A63 = (82,90,99)  -> #8A939D = (138,147,157)
       dark  #32383F = (50,56,63)  -> #5C646E = (92,100,110)

     Both still sit BELOW the cargo, so the value order is unchanged — the
     gantry frames the blue rather than competing with it — but neither is a
     silhouette any more. Two shades only: structure, then a darker one for the
     moving parts (trolley, cables, spreader), which is what keeps the mechanism
     legible now that nothing in the crane is black. */
  const steel = new THREE.MeshStandardMaterial({
    color: "#8A939D", metalness: 0.72, roughness: 0.46, transparent: true, opacity: 0,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#5C646E", metalness: 0.6, roughness: 0.62, transparent: true, opacity: 0,
  });
  mats.push(steel, dark);

  const LEG_X = 3.7, BEAM_Y = 3.14, TROLLEY_Y = 2.9, CABLE_TOP = 2.77;
  for (const sx of [-LEG_X, LEG_X]) {
    const leg = metalBox(0.16, BEAM_Y - FLOOR, 0.16, steel);
    leg.position.set(sx, (BEAM_Y + FLOOR) / 2, 0.5);
    g.add(leg);
    // the knee brace the SVG draws as a diagonal at each beam corner
    const brace = metalBox(0.1, 0.86, 0.1, steel);
    brace.position.set(sx - Math.sign(sx) * 0.3, BEAM_Y - 0.42, 0.5);
    brace.rotation.z = Math.sign(sx) * 0.62;
    g.add(brace);
  }
  const beam = metalBox(LEG_X * 2 + 0.5, 0.24, 0.3, steel);
  beam.position.set(0, BEAM_Y, 0.5);
  g.add(beam);
  // the SVG draws the beam as two rules; the lower chord is the second one
  const chord = metalBox(LEG_X * 2 + 0.5, 0.07, 0.22, steel);
  chord.position.set(0, BEAM_Y - 0.26, 0.5);
  g.add(chord);

  /* trolley -> cables -> spreader -> load, as one nested rig so the tick only
     ever sets two numbers: the trolley's x and the load's y. */
  const hoist = new THREE.Group();
  hoist.position.z = 0.5;
  g.add(hoist);

  const trolley = metalBox(0.92, 0.26, 0.52, dark);
  trolley.position.y = TROLLEY_Y;
  hoist.add(trolley);

  /* Cables are unit-height cylinders hung from y=0 downward inside a group at
     CABLE_TOP, so scaling that group's y stretches them from the trolley
     instead of translating them. */
  const cableGrp = new THREE.Group();
  cableGrp.position.y = CABLE_TOP;
  hoist.add(cableGrp);
  const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5);
  for (const cx of [-0.78, -0.26, 0.26, 0.78]) {
    const c = new THREE.Mesh(cableGeo, dark);
    c.position.set(cx, -0.5, 0);
    cableGrp.add(c);
  }

  const lift = new THREE.Group();
  hoist.add(lift);
  const spreader = metalBox(CW + 0.12, 0.14, 0.9, dark);
  spreader.position.y = CH / 2 + 0.07;
  lift.add(spreader);
  const load = con(cleanSkin(LOAD_LIVERY));
  load.castShadow = true;
  lift.add(load);

  /* ---- the vision layer ----
     Three things, each saying something the others do not:

       1. the LOAD is bracketed for the whole traverse — faint while it is
          still being acquired, solid once it is over the bay being read. A
          detector holding a target that is physically moving is the claim.
       2. the BAY SLOT is outlined on the hardstand, and lights when the read
          resolves: the box is not just identified, it is assigned somewhere.
       3. the two front stacks carry permanent faint brackets — the standing
          inventory, held continuously rather than discovered by a sweep.

     The scan plane is gone. A sweep existed to make a static scene look
     inspected; the crane's own traverse is now the event, and a second
     travelling line competing with it just read as a glitch. */
  const dm = detectMaterials();
  mats.push(...dm.all);

  const loadDet = createTracker(dm.faint);
  g.add(loadDet.group);

  /* bay slot outline: four bars painted on the hardstand around the empty bay.

     OUTSET BY 0.14, because the load now LANDS in this bay. Drawn on the bay's
     own footprint the outline sat exactly under the container's bottom face —
     0.035 of each 0.07 bar surviving outside the box, i.e. about one pixel at
     card size — so the orange assignment beat, which is the whole payoff, was
     occluded by the thing it was confirming. Ringing the footprint instead
     leaves a 0.14 margin of outline clear of the box on every side, and the
     bars are lengthened by 2 x 0.14 so the corners still meet. */
  const slotBars: THREE.Mesh[] = [];
  const OUTSET = 0.14;
  const barGeo = {
    long: new THREE.PlaneGeometry(CW + 2 * OUTSET, 0.07),
    short: new THREE.PlaneGeometry(CD + 2 * OUTSET, 0.07),
  };
  for (const dz of [-(CD / 2 + OUTSET), CD / 2 + OUTSET]) {
    const b = new THREE.Mesh(barGeo.long, dm.faint);
    b.rotation.x = -Math.PI / 2;
    b.position.set(SLOT_X, FLOOR + 0.012, 0.5 + dz);
    slotBars.push(b);
    g.add(b);
  }
  for (const dx of [-(CW / 2 + OUTSET), CW / 2 + OUTSET]) {
    const b = new THREE.Mesh(barGeo.short, dm.faint);
    b.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    b.position.set(SLOT_X + dx, FLOOR + 0.012, 0.5);
    slotBars.push(b);
    g.add(b);
  }

  const inv = topOfStack.map(() => createTracker(dm.faint));
  inv.forEach((t) => g.add(t.group));

  /* choreography, over p 0..1 of the 14s loop:
       0.00-0.32  traverse in from off-frame left, load high
       0.32-0.48  lower INTO the bay — the load lands
       0.48-0.64  dwell landed — this is the read
       0.64-0.80  lift back to travelling height
       0.80-1.00  traverse out to off-frame right
     TRAVEL is set past the frame edge at this rig (half-width ~4.75) so both
     ends of the loop sit outside the visible frame and the wrap is unseeable. */
  /* THE LOAD NOW LANDS. It used to stop at y=0.15, a container hovering half a
     box-height above an empty slot forever — an ambient loop that never
     completes an action, which reads as a screensaver rather than as work. LOW
     is now the bottom-row centre height, so the load's bottom face meets FLOOR
     exactly as the stacked containers' do:

         LOW = ROW0 = FLOOR + CH/2 = -0.95 + 0.85/2 = -0.525

     Nothing about the wrap changes: the placement is still a function of p
     alone and the load is back at HIGH by 0.80, before the trolley leaves. The
     yard's STATE is still unchanged at the wrap — the box is picked back up,
     it is not left in the bay — which is the constraint that killed every
     earlier landing attempt. What it buys is a completed cycle: lower, land,
     read, lift. The vertical windows are unchanged (0.32-0.48-0.64-0.80)
     because the trolley is only stationary over the bay between 0.32 and 0.80;
     starting the descent earlier would drag the box through the stacks. */
  const TRAVEL = 5.6, HIGH = 1.62, LOW = ROW0;
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));
  /* TWO BEATS, NEVER BOTH AT ONCE. The load hovers directly over the bay, so
     lighting the box bracket and the bay outline together stacked two accent
     graphics on the same pixels and read as one confused tangle of blue —
     the same "detections everywhere" failure the trackers were rebuilt to
     fix. Separating them in time also states the actual sequence: the box is
     IDENTIFIED first, and only then is it ASSIGNED somewhere. */
  let reading = false;   // beat 1 — the box is being read
  let assigned = false;  // beat 2 — the bay it is going to

  return {
    group: g,
    focus: new THREE.Vector3(SLOT_X, LOW, 0.5),
    materials: mats,
    marks: [loadDet, ...inv],
    /* Surface peak 0.94 (near-opaque concrete, not full 1 so a hint of the
       backdrop glow still reads through at grazing angles), vignette peak 1
       (it exists purely to hide the plane's edge, so full coverage there is
       correct). Both are local peaks multiplied onto the shared intro fade
       `o` — `setSurfaceOpacity`/`setVignetteOpacity` set raw opacity, they do
       not know a peak of their own the way the grid shader's uPeak does. */
    ground: {
      setOpacity: (o) => {
        setGroundOpacity(ground, o);
        ground.setSurfaceOpacity?.(o * 0.94);
        ground.setVignetteOpacity?.(o);
      },
    },
    tick: (p) => {
      hoist.position.x =
        p < 0.32 ? -TRAVEL + TRAVEL * seg(p, 0, 0.32)
          : p < 0.80 ? 0
            : TRAVEL * seg(p, 0.80, 1);

      const y =
        p < 0.32 ? HIGH
          : p < 0.48 ? HIGH - (HIGH - LOW) * seg(p, 0.32, 0.48)
            : p < 0.64 ? LOW
              : p < 0.80 ? LOW + (HIGH - LOW) * seg(p, 0.64, 0.80)
                : HIGH;
      lift.position.y = y;
      // the cables span whatever gap the spreader has opened up
      cableGrp.scale.y = Math.max(0.02, CABLE_TOP - (y + CH / 2 + 0.07));

      /* Three states, building: ACQUIRING while it traverses in (bracket
         faint), IDENTIFIED once it starts down (bracket solid), ASSIGNED for
         the back half of the hold (bay outline solid as well). The bracket
         stays solid through the assignment rather than handing over to it —
         they occupy different parts of the frame, the bracket around the load
         and the outline on the hardstand below it, so both being lit reads as
         one resolved event instead of two competing graphics. */
      reading = p > 0.34 && p < 0.78;
      assigned = p >= 0.58 && p < 0.78;
      /* THE ASSIGNMENT IS ORANGE. New grammar across the whole row: BLUE is the
         machine observing (brackets, scans, sight cones) and ORANGE is a
         CONCLUSION — the thing the system has decided and wants you to look at.
         The schematic SVGs have always done exactly this: geometry in white,
         callouts in #ED510C. Reading the box is observation, so it stays blue;
         assigning it a bay is the answer, so the outline resolves to warn.

         It also gives this card its one orange event per loop, and the four
         cards' events land at different phases — which is what makes the row of
         panels read as alive rather than as four stills. */
      const bayMat = assigned ? dm.warn : dm.faint;
      for (const b of slotBars) b.material = bayMat;
    },
    trackers: (camera) => {
      /* The load's bracket is already the landing's confirmation: `reading`
         spans 0.34-0.78, so the bracket is at ACCENT for the whole descent,
         the whole dwell on the hardstand and the start of the lift, and drops
         back to faint only while the box is travelling. No second tracker is
         added for the placement — the load has carried one since the traverse
         version, and a bracket that appears at 0.30 would undo the "held on a
         moving target" claim the faint phase exists to make. */
      loadDet.setMaterial(reading ? dm.accent : dm.faint);
      loadDet.follow(load, camera);
      inv.forEach((t, i) => t.follow(topOfStack[i], camera));
    },
    /* Textures are CACHED and shared across every card on the page (see
       skins.ts) — disposing them here would pull them out from under the
       other three scenes the moment this one unmounts. Only the materials and
       the geometry built here, which are genuinely per-scene, are disposed. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      // the concrete TEXTURE is cached and shared with the other two cards —
      // only the material wrapping it is this scene's own
      yardFloorM.dispose();
      ground.surfaceMesh?.geometry.dispose();
      if (ground.vignetteMesh) {
        (ground.vignetteMesh.material as THREE.Material).dispose();
        ground.vignetteMesh.geometry.dispose();
      }
      conGeo.dispose();
      cableGeo.dispose();
      barGeo.long.dispose();
      barGeo.short.dispose();
    },
  };
}

/* 02 · Viso Warehouse — a forklift load counted under a fixed camera.

   THIRD VERSION. The first was one pallet on the floor with eighteen cartons
   ticked off. The second was rack occupancy. Both failed, and for the same
   reason once it is named:

       THE SCENE HAD NO EVENT.

   Yard works because a crane does something. Factory works because a line runs
   and an arm acts on it. The rack version had nothing moving in it at all — the
   only animation was overlay brackets appearing on static boxes — so there was
   nothing for the detection to be ABOUT. It also had no scale reference, which
   is why racking at 280px read as a shelving unit: with no vehicle, no person
   and no floor, a rack of boxes could be a bookcase.

   So the machine comes back, and it is the one machine that means "warehouse"
   the instant you see its silhouette: a counterbalance FORKLIFT. Mast, forks,
   overhead guard. It carries a palletised load in from the left, stops under a
   fixed camera, the load is counted carton by carton, and it drives on.

   WHY COUNTING AND NOT IDENTIFYING. Yard already owns identity ("which box is
   this") and Factory owns inspection ("is this one good, how big is it"). The
   warehouse claim is QUANTITY — "COUNT ▲ · WITH VIDEO PROOF" is the schematic's
   own callout — so this scene has to show a number going up. It does that with
   a tally column of six ticks, one per carton, filling as each is counted. Tick
   rows were removed from the trackers earlier for being unreadable, and that was
   right: a horizontal row of tiny dashes under a bracket is noise. A vertical
   column of chunky bars beside the load, one per countable thing, is a gauge —
   and it is the only way to say "quantity" at this size without type.

   STATE-NEUTRAL, like the gantry. The truck enters off-frame and leaves
   off-frame carrying the same load it arrived with, and the tally is a function
   of p alone that resets while the truck is outside the frame. Nothing in the
   scene is ever left changed at the wrap. */
export function warehouseSubject(): CardSubject {
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };

  /* Machinery is DARK CHARCOAL across the whole row — the gantry, the
     production line, and now the truck. Real forklifts are safety yellow or
     orange, and that is deliberately not used here: #ED510C is the overlay's
     warn colour, and a permanently-orange vehicle would compete with the one
     graphic that is supposed to mean "something is wrong". Consistency across
     four cards beats accuracy on one. */
  /* Same three-shade lift as the gantry, and the same arithmetic — see the
     yard's `steel`/`dark` note. #525A63 -> #8A939D, #32383F -> #5C646E. */
  const steel = own(new THREE.MeshStandardMaterial({
    color: "#8A939D", metalness: 0.72, roughness: 0.46, transparent: true, opacity: 0,
  }));
  const dark = own(new THREE.MeshStandardMaterial({
    color: "#5C646E", metalness: 0.55, roughness: 0.62, transparent: true, opacity: 0,
  }));
  /* A THIRD charcoal, lighter, for the mast, forks, carriage and guard. Two
     values was not enough: body, counterweight, wheels, mast and cage all sat
     within 0.1 of each other and the truck rendered as one dark blob with no
     readable mechanism in it. A forklift is only recognisable if the MAST and
     FORKS separate from the body, so those get the light value and the rolling
     parts keep the darkest. Still all charcoal — the row's machinery rule. */
  /* #7E8792 -> #A9B2BD, the same +43 that keeps this a clear step above `steel`
     (#8A939D). The mast, forks, carriage and guard are the parts that make a
     forklift recognisable as a forklift, so they take the lightest value; the
     rolling parts keep the darkest. Three values that still span 92 -> 169. */
  const steelLt = own(new THREE.MeshStandardMaterial({
    color: "#A9B2BD", metalness: 0.7, roughness: 0.44, transparent: true, opacity: 0,
  }));
  /* The forklift's OWN pallet, under the counted load — was one flat tan
     BoxGeometry. `palletDeck()` bakes real deck-board separation into BOTH an
     albedo and a roughness canvas (raw timber varies far more in roughness
     than painted steel does, which is why this is the one skin here worth
     the second map). It bakes its own tan colour (`#C7A876`, board tone
     variance around it), which is BRIGHTER than the old flat `#A98A5C` this
     replaced (L~171 raw vs L~141 old — see the yard's rust-wiring note for
     why a white tint on a baked map is not neutral). Retuned to land back on
     the old value rather than left white: tint (216,209,199)/255 hex
     `#D8D1C7`, chosen so tint x baked ~= (169,138,92), the old palletM hex,
     to the nearest few units — same target, now textured. */
  const deck = palletDeck();
  const palletM = own(new THREE.MeshStandardMaterial({
    map: deck.map, roughnessMap: deck.roughnessMap, color: "#D8D1C7", metalness: 0,
    transparent: true, opacity: 0,
  }));
  /* The RACKING stock, formerly a featureless flat-blue slab and now a
     stretch-wrapped pallet load — `wrappedPallet()` is what reads as "load"
     rather than "box" at this size, the milky film and diagonal overlap
     lines doing the same job the corrugation ramp does for a container.

     A WHITE TINT HERE WAS THE SAME BUG AS THE CONTAINERS. The canvas bakes a
     light carton hint (`#B7BCC2`) under an even lighter milky film overlay —
     estimated raw average around (198,202,208), L~171 — well above the old
     `crateM` this replaced (`tintMetal(brushedN, "#A8CDE6")`, i.e. NEUTRAL's
     ~0.60 fraction x #A8CDE6, L~124), so at `color:"#ffffff"` these slabs
     rendered brighter than everything else on the card, exactly the
     containers' failure mode. Tint (140,168,196)/255 hex `#8CA8C4` chosen so
     tint x the estimated raw average lands close to the old crateM value:
     (198,202,208) x (0.549,0.659,0.769) ~= (109,133,160), L~130 — just above
     the old L~124 (the wrap is meant to read slightly brighter than a bare
     crate; it is plastic film over cargo, not the cargo itself) and still
     comfortably under the #5CC8FF overlay's ~182. */
  const wrapM = own(new THREE.MeshStandardMaterial({
    map: wrappedPallet(), color: "#8CA8C4", metalness: 0.05, roughness: 0.5,
    envMapIntensity: 0.25, transparent: true, opacity: 0,
  }));

  // kraft board, from the shared cache — the same two canvases Factory uses
  const kraftSide = own(new THREE.MeshStandardMaterial({
    map: cardboardSide(), metalness: 0, roughness: 0.94, envMapIntensity: 0.18,
    transparent: true, opacity: 0,
  }));
  const kraftTop = own(new THREE.MeshStandardMaterial({
    map: cardboardTop(), metalness: 0, roughness: 0.94, envMapIntensity: 0.18,
    transparent: true, opacity: 0,
  }));
  const kraft = faces(kraftSide, kraftTop, kraftSide);

  const FLOOR = -0.95;

  /* ---- racking, as BACKDROP only ----
     Pushed to z=-2.7 and given four uprights, three beam levels and stocked
     bays — the two-legged, near-empty frame read as scaffolding, not storage;
     a rack is only a rack when the steel encloses stock. The previous
     version made the rack the subject and it could not carry a scene on its
     own; here it is doing the one job it is good at, which is saying "this is
     a warehouse" behind the thing that is actually happening. */
  const RACK_Z = -2.7;
  const BAY = 2.5;
  /* The uprights were plain steel bars — the single detail that makes racking
     read as racking is the punched-slot column, so `rackUpright()` goes on
     all four. It is a narrow (96px) canvas built to tile vertically
     (wrapT = RepeatWrapping already set inside skins.ts); `repeat.y` here is
     what maps that tiling onto THIS upright's actual 3.5-unit height. Setting
     `.repeat` mutates the shared cached texture instance — fine, since this
     is its only caller in the current scene set, but a second scene wiring
     the same getter at a different upright height would need its own
     texture, not this one. */
  const rackTex = rackUpright();
  rackTex.repeat.set(1, 3.5);
  const rackM = own(new THREE.MeshStandardMaterial({
    map: rackTex, color: "#ffffff", metalness: 0.55, roughness: 0.6, transparent: true, opacity: 0,
  }));
  // four uprights bounding three bays — the old three left both beam ends
  // cantilevered into air, which is what read as "missing legs"
  for (const x of [-BAY * 1.5, -BAY * 0.5, BAY * 0.5, BAY * 1.5]) {
    const u = metalBox(0.14, 3.5, 0.14, rackM);
    u.position.set(x, FLOOR + 1.75, RACK_Z);
    g.add(u);
  }
  // two pallet levels plus a top cap rail, so the frame closes like a shed bay
  for (const y of [FLOOR + 1.15, FLOOR + 2.3, FLOOR + 3.45]) {
    const beam = metalBox(BAY * 3 + 0.3, 0.11, 0.09, steel);
    beam.position.set(0, y, RACK_Z);
    g.add(beam);
  }
  /* Stock in six of nine slots — ground level counts. A rack with one box is
     scaffolding; a rack mostly full with one gap is a working store. */
  const rackLoadGeo = new THREE.BoxGeometry(1.7, 0.62, 0.8);
  const SLOTS: readonly (readonly [number, number, number])[] = [
    [-BAY, 0, 1], [0, 0, 0], [BAY, 0, 1],
    [-BAY, 1, 0], [BAY, 1, 1],
    [-BAY, 2, 1],
  ];
  for (const [rx, lvl, crate] of SLOTS) {
    const base = lvl === 0 ? FLOOR : lvl === 1 ? FLOOR + 1.21 : FLOOR + 2.36;
    const m = crate ? new THREE.Mesh(rackLoadGeo, wrapM) : new THREE.Mesh(rackLoadGeo, kraft);
    m.position.set(rx, base + 0.31, RACK_Z);
    g.add(m);
  }

  /* THE FLOOR — same wiring and the same arithmetic as the yard (see that
     scene's comment for the luminance numbers; the concrete texture is the
     same cached canvas, shared across all three cards). Size and vignette
     falloff bumped the same way as the yard's fix (30 -> 36, falloff pulled
     in to 0.32/0.68) — this camera's angle is less extreme than the yard's,
     but the edge fix is solving the same geometry problem and there is no
     reason to leave one card on the old, edge-exposing numbers. */
  const warehouseFloorTex = concreteFloor();
  const warehouseFloorM = new THREE.MeshStandardMaterial({
    map: warehouseFloorTex, color: "#ffffff", metalness: 0.05, roughness: 0.92,
    transparent: true, opacity: 0,
  });
  // 0.13 -> 0.20 (x1.6) and light ink — see GRID_INK
  const ground = draftingGround({
    size: 36, y: FLOOR - 0.01, step: 1.2, color: GRID_INK, opacity: 0.20,
    surface: warehouseFloorM,
    vignette: { color: VIGNETTE_C, start: 0.50, end: 1.0 },
  });
  g.add(ground.mesh);
  if (ground.surfaceMesh) g.add(ground.surfaceMesh);
  if (ground.vignetteMesh) g.add(ground.vignetteMesh);

  /* ---- the fixed camera over the aisle ----
     Cantilevered off the racking, looking straight down at ONE spot. A fixed
     camera over a fixed spot is why the sight cone can be static here, unlike
     the rack version where the camera had to sweep nine slots. The truck stops
     IN the cone, which states the whole arrangement without a word: this camera
     watches this spot, and anything that comes through it gets counted. */
  const CAM_X = 0, CAM_Y = 2.62;
  const boomZ = metalBox(0.11, 0.11, 2.6, steel);
  boomZ.position.set(CAM_X, CAM_Y + 0.2, RACK_Z / 2);
  g.add(boomZ);
  const camBody = metalBox(0.42, 0.28, 0.48, dark);
  camBody.position.set(CAM_X, CAM_Y, 0);
  g.add(camBody);
  const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 14), dark);
  camLens.position.set(CAM_X, CAM_Y - 0.2, 0);
  g.add(camLens);

  /* ---- the truck ----
     Built in its own group, forks forward (+x), so the tick only ever sets
     `truck.position.x`. Dimensions are deliberately a little under-scaled
     against the pallet: at true proportions a counterbalance truck is nearly
     twice the height of its load, and the load is what has to be legible. */
  const truck = new THREE.Group();
  g.add(truck);

  /* Wheels were flat black cylinders. `tyre()` splits the two surfaces a real
     tyre actually has — `tread` wraps the circumference (CylinderGeometry's
     side group), `cap` is a face-on disc for the two end groups. A
     CylinderGeometry (unlike metalBox's RoundedBoxGeometry) has three real
     material groups out of the box, so the 3-material array binds correctly
     without the `faces()` workaround. */
  const tyreTex = tyre();
  const tyreTreadM = own(new THREE.MeshStandardMaterial({
    map: tyreTex.tread, color: "#ffffff", metalness: 0.05, roughness: 0.88, transparent: true, opacity: 0,
  }));
  const tyreCapM = own(new THREE.MeshStandardMaterial({
    map: tyreTex.cap, color: "#ffffff", metalness: 0.1, roughness: 0.7, transparent: true, opacity: 0,
  }));
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.24, 12);
  for (const [wx, wr] of [[-0.75, 0.26], [0.55, 0.32]] as const) {
    for (const wz of [-0.46, 0.46]) {
      const w = new THREE.Mesh(wheelGeo, [tyreTreadM, tyreCapM, tyreCapM]);
      w.rotation.x = Math.PI / 2;
      w.scale.setScalar(wr / 0.3);
      w.position.set(wx, FLOOR + wr, wz);
      truck.add(w);
    }
  }
  const body = metalBox(2.0, 0.72, 1.05, steelLt);
  body.position.set(-0.18, FLOOR + 0.72, 0);
  body.castShadow = true;
  truck.add(body);
  const counterweight = metalBox(0.62, 0.62, 0.98, dark);
  counterweight.position.set(-1.16, FLOOR + 0.6, 0);
  truck.add(counterweight);
  const backrest = metalBox(0.42, 0.55, 0.72, dark);
  backrest.position.set(-0.62, FLOOR + 1.35, 0);
  truck.add(backrest);
  // overhead guard — the cage that makes a forklift unmistakably a forklift
  for (const px of [0.34, -0.94]) {
    for (const pz of [-0.44, 0.44]) {
      const post = metalBox(0.08, 1.35, 0.08, steel);
      post.position.set(px, FLOOR + 1.78, pz);
      truck.add(post);
    }
  }
  const guard = metalBox(1.5, 0.08, 1.05, steel);
  guard.position.set(-0.3, FLOOR + 2.46, 0);
  truck.add(guard);
  // mast and carriage
  for (const mz of [-0.4, 0.4]) {
    const rail = metalBox(0.12, 2.15, 0.12, steel);
    rail.position.set(0.95, FLOOR + 1.1, mz);
    truck.add(rail);
  }
  const FORK_Y = FLOOR + 0.42;
  /* CARRIAGE, FORKS AND LOAD IN ONE GROUP, so the tick sets ONE number to lift
     the whole assembly up the mast. They were three loose children of `truck`
     before, which is fine for a statue and useless for a machine: a forklift
     that never moves its forks is a shape that resembles a forklift. Everything
     inside is positioned in truck-space exactly as it was, so forkRig sitting
     at the origin leaves the built pose identical. The mast rails, body, wheels
     and guard stay direct children of `truck` — they must NOT rise. */
  const forkRig = new THREE.Group();
  truck.add(forkRig);
  const carriage = metalBox(0.13, 0.5, 0.95, steelLt);
  carriage.position.set(1.02, FORK_Y + 0.32, 0);
  forkRig.add(carriage);
  for (const fz of [-0.34, 0.34]) {
    const fork = metalBox(1.15, 0.08, 0.13, steel);
    fork.position.set(1.62, FORK_Y, fz);
    forkRig.add(fork);
  }

  /* the load: a pallet and SIX cartons, three across and two high, so every
     carton is visible from the front. Six because the tally has to have one
     tick per carton and six ticks is the most that reads as countable at a
     glance rather than as a texture. */
  /* The load is its OWN GROUP inside the truck, not loose children of it. The
     "this pallet is being counted" bracket has to track the load and nothing
     else — tracked against the truck it would draw a box round the whole
     vehicle, mast and counterweight included. */
  const LOAD_DX = 1.58;
  const load = new THREE.Group();
  load.position.set(LOAD_DX, 0, 0);
  forkRig.add(load);

  const pallet = metalBox(1.78, 0.12, 0.88, palletM);
  pallet.position.set(0, FORK_Y + 0.1, 0);
  load.add(pallet);

  const CT = { w: 0.52, h: 0.5, d: 0.72 };
  const cartonGeo = new THREE.BoxGeometry(CT.w, CT.h, CT.d);
  const cartons: THREE.Mesh[] = [];
  // count order: bottom row left to right, then top row — the way a person counts
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const c = new THREE.Mesh(cartonGeo, kraft);
      c.position.set(
        (col - 1) * (CT.w + 0.03),
        FORK_Y + 0.16 + CT.h / 2 + row * (CT.h + 0.02),
        0,
      );
      c.rotation.y = ((col + row) % 3 - 1) * 0.03;
      c.castShadow = true;
      load.add(c);
      cartons.push(c);
    }
  }

  /* ---- the vision layer ---- */
  const dm = detectMaterials();
  mats.push(...dm.all);

  /* the sight cone, static, from the lens down to the spot the truck stops in */
  /* WAS A FLAT QUAD-FAN, NOW A REAL CONE. The old geometry was four vertices:
     a 0.2-wide top edge at y = CAM_Y - 0.28 = 2.34 and a 2.3-wide bottom edge
     at y = FLOOR + 0.15 = -0.80, both in the z = 0 plane — a trapezoid, which
     is why it read as a translucent triangle rather than as a volume.

     Apex and target are PRESERVED: apex at the top edge's midpoint
     (0, 2.34, 0), target at the bottom edge's midpoint (0, -0.80, 0).
     length  = 2.34 - (-0.80) = 3.14
     far half-width = 1.15 (unchanged from the quad)
     halfAngle = atan(1.15 / 3.14) = atan(0.366242) = 0.35107 rad (20.11 deg)

     footprintY = FLOOR: this camera looks straight down at one spot on the
     warehouse floor, which is the textbook case for the ground pool — the beam
     stops 0.15 above the floor, so the axis meets the plane at s = 3.29 against
     a length of 3.14 (s/len = 1.048) and the reach fade brings the pool in at
     ~27%: a soft mark on the concrete rather than a painted disc. */
  const coneApex = new THREE.Vector3(CAM_X, CAM_Y - 0.28, 0);
  const coneTarget = new THREE.Vector3(CAM_X, FLOOR + 0.15, 0);
  const sightCone = createSightCone({ footprintY: FLOOR });
  sightCone.aim(coneApex, coneTarget, Math.atan(1.15 / 3.14));
  /* Registered in `mats` so the card's shared opacity loop drives it — the
     ShaderMaterial's `opacity` is aliased onto its uOpacity uniform for
     exactly this. `max` stays 0.14 and the tier stays "presence": the
     camera's existence does not ramp with hover, only its conclusions do. */
  sightCone.material.userData = { max: 0.14, tier: "presence" };
  own(sightCone.material);
  g.add(sightCone.group);

  /* THE TALLY — one tick per carton, filling upward beside the load. This is
     the only thing in the row that states a QUANTITY, which is the warehouse
     claim. Deliberately chunky: 0.055 thick and 0.3 long against the bracket
     stroke of 0.065, so it reads as a gauge rather than as more bracket. */
  const N = cartons.length;
  const tally = new THREE.Group();
  const tallyTicks: THREE.Mesh[] = [];
  const tickGeo = new THREE.PlaneGeometry(0.3, 0.055);
  for (let i = 0; i < N; i++) {
    const t = new THREE.Mesh(tickGeo, dm.faint);
    t.position.set(0, i * 0.135, 0);
    tally.add(t);
    tallyTicks.push(t);
  }
  g.add(tally);

  /* One bracket on the WHOLE LOAD (secondary — "this pallet is the thing being
     counted") and one on the carton being counted right now (accent). Not six
     accumulating brackets: the tally is what records progress, and six brackets
     plus a tally would be saying the same thing twice at 280px. */
  const loadDet = createTracker(dm.faint, { pad: 1.14 });
  const cartonDet = createTracker(dm.accent);
  g.add(loadDet.group);
  g.add(cartonDet.group);

  /* choreography — the gantry's shape, because it wraps cleanly:
       0.00-0.28  drive in from off-frame left to the stop mark
       0.28-0.34  settle
       0.34-0.70  the count, one carton per 0.06
       0.70-0.80  hold, all six counted
       0.80-1.00  drive on and out to off-frame right
     STOP_X puts the LOAD under the camera, not the truck — the load is what is
     being counted, and it sits 1.58 ahead of the truck's origin. */
  const TRAVEL = 8.0;
  const STOP_X = CAM_X - LOAD_DX;
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));

  let counted = 0;

  return {
    group: g,
    focus: new THREE.Vector3(CAM_X, FORK_Y + 0.5, 0),
    materials: mats,
    marks: [loadDet, cartonDet],
    // same surface/vignette peaks as the yard — see that scene's comment
    ground: {
      setOpacity: (o) => {
        setGroundOpacity(ground, o);
        ground.setSurfaceOpacity?.(o * 0.94);
        ground.setVignetteOpacity?.(o);
      },
    },
    tick: (p) => {
      /* The sweep band. `p` is the card loop progress, already pinned to a
         fixed 0.85 by card-scene in reduced motion, so this needs no branch
         of its own — x8 puts a little under three sweeps in a loop. */
      sightCone.tick(p * 8);
      /* THE DEAD TIME IS OUT OF THE APPROACH AND THE DEPARTURE, not out of the
         count. The old split spent 0.28 of the loop driving in and 0.20 driving
         out, and the count did not start until 0.34 — so of a 9.5s loop, 4.6s
         had no truck on the bay and nothing being counted. The drive-in is now
         0.14 and the drive-out 0.16, and the loop period came down with them
         (9.5s -> 8.2s in index.tsx) so the count itself still ticks at the same
         real cadence: 0.07 x 8.2s = 0.574s per carton, against 0.06 x 9.5s =
         0.570s before. The bay is empty for 0.24 of the loop instead of 0.48 —
         a beat between trucks rather than a wait. */
      truck.position.x =
        p < 0.14 ? STOP_X - TRAVEL + TRAVEL * seg(p, 0, 0.14)
          : p < 0.74 ? STOP_X
            : STOP_X + TRAVEL * seg(p, 0.74, 0.90);

      /* THE TRUCK DOES SOMETHING NOW. It used to drive in, stand still while the
         overlay counted, and drive out — the only moving part in the card was
         the camera, so the machine was a prop the count happened next to. It
         now PRESENTS the load: forks up while the count runs, held at height
         through the resolve, down again before the wrap.

           0.20-0.45  raise 0.55  (0.25 x 8.2s = 2.05s)
           0.45-0.62  held up, which is where the count completes (0.60)
           0.62-0.88  lower back                          (0.26 x 8.2s = 2.13s)

         Both moves are over 2s and 0.55 world units, comfortably above the
         ~0.4-unit / ~1.5s floor for a 320px card. Expressed as a DIFFERENCE OF
         TWO RAMPS, so p<0.20 and p>=0.88 both evaluate to exactly 0 and the
         wrap cannot leave the forks anywhere but down.

         0.55 is what the mast has room for: the top cartons' faces sit at
         FLOOR+1.60, and the mast rails top out at FLOOR+2.175 — 0.575 of
         travel available, so the load stops 0.025 shy of the rail heads rather
         than growing through them. */
      const LIFT = 0.55;
      forkRig.position.y = LIFT * (seg(p, 0.20, 0.45) - seg(p, 0.62, 0.88));

      /* The count is a function of p ALONE, so it cannot drift and needs no
         state. It returns to zero at 0.92, by which point the truck has driven
         far enough right that the tally is outside the frame — the reset is
         never seen, which is the same trick the gantry uses for its wrap. */
      counted =
        p < 0.18 ? 0
          : p < 0.60 ? Math.min(N, Math.floor((p - 0.18) / 0.07) + 1)
            : p < 0.92 ? N
              : 0;

      /* The tally counts in BLUE and resolves in ORANGE. While it is filling,
         the machine is still observing; the moment every carton is accounted for
         the whole column turns to the conclusion colour — that is the payoff
         beat, and it is this card's one orange event per loop. */
      const complete = counted >= N;
      for (let i = 0; i < N; i++) {
        tallyTicks[i].visible = i < counted;
        tallyTicks[i].material = complete ? dm.warn : i === counted - 1 ? dm.accent : dm.faint;
      }
      /* The tally rides IN FRONT of the load, not level with it. At z=0 and
         only 0.06 clear of the pallet edge it was rendering inside the cartons
         and was invisible — a billboarded flat graphic still lives at a real
         depth in the world. 1.32 clear in x, 0.95 forward in z. */
      /* and it RIDES THE LIFT too. The tally is a gauge on the load, not a
         marker on the aisle: pinned to FORK_Y while the load climbed 0.55 it
         would have drifted down to the pallet's underside by the time the
         count resolved, and a quantity readout that is not level with the
         thing it counts stops reading as attached to it. */
      tally.position.set(truck.position.x + LOAD_DX + 1.32, FORK_Y + 0.46 + forkRig.position.y, 0.95);
      tally.visible = counted > 0;
    },
    trackers: (camera) => {
      // the pallet load as a whole, but only while it is actually being read —
      // and its bracket resolves to the conclusion colour on completion
      loadDet.setMaterial(counted >= N ? dm.warn : dm.faint);
      loadDet.follow(counted > 0 ? load : null, camera);
      cartonDet.follow(counted > 0 && counted <= N ? cartons[counted - 1] : null, camera);
      tally.quaternion.copy(camera.quaternion);
    },
    /* Cardboard textures are CACHED and shared with the Factory card —
       disposing them here would pull them out from under that scene. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      // the concrete and rack-upright TEXTURES are cached and shared; only the
      // materials wrapping them, and the surface/vignette planes, are this
      // scene's own
      warehouseFloorM.dispose();
      ground.surfaceMesh?.geometry.dispose();
      if (ground.vignetteMesh) {
        (ground.vignetteMesh.material as THREE.Material).dispose();
        ground.vignetteMesh.geometry.dispose();
      }
      rackLoadGeo.dispose();
      cartonGeo.dispose();
      /* Disposes the cone material AND its ground pool material; the shared
         cone/pool GEOMETRY is module-level and flagged, never touched here.
         The cone material is also in `mats`, and Material.dispose() is safe
         to call twice. */
      sightCone.dispose();
      tickGeo.dispose();
      wheelGeo.dispose();
    },
  };
}

/* 03 · Viso Factory — a mixed line, one camera, and an arm that pulls the bad one.

   SECOND REWRITE. The first got the station right and three things wrong:

     · THE BELT HAD ENDS IN FRAME. It was 7.0 long against a ~12-unit visible
       span once the camera's lateral track is counted, so the conveyor stopped
       inside the picture and the whole thing read as a tabletop model. It is
       now 15.0 — past the frame at both extremes at every point in the track —
       and the units wrap at +-7.0, which is off-frame, so nothing pops.
     · EVERY UNIT WAS THE SAME OBJECT. Seven identical machined blocks in three
       shades of blue is not a production line, it is a colour swatch. The line
       now carries KRAFT CARTONS and BLUE CRATES alternately. The cardboard
       skins are the ones the Warehouse card already generates, and they are
       cached, so real corrugated board costs nothing here.
     · THE ARM DID NOTHING AND COULD NOT BE SEEN. It nodded on a timer, in the
       dark finish, against a near-black backdrop. It is now light machined grey
       — the only pale machinery in the frame — and it has a JOB: it dips onto
       each carton as it arrives, and the one carrying a defect gets marked and
       flagged as the arm passes over it. The flag has a visible cause.

   UNIT COLOUR NO LONGER CARRIES STATE, AT ALL. The old scene stepped each unit
   through three blues as it passed the camera. Two problems: real boxes do not
   change colour, and the end of the ramp was the accent colour itself, so
   overlays drawn on a finished unit vanished. State is now carried entirely by
   the DETECTION LAYER, which is what it is for — nothing upstream of the
   camera, a dimension gauge on the unit being read, faint brackets on
   everything downstream, and a warn bracket on the one the arm pulled. That
   reads left to right in one glance and it deleted three materials.

   PERIODICITY. Travel is `p * SPAN`, so every unit returns to its own start.
   Every piece of state — which unit is in the zone, where the arm is, whether
   the defect chip shows — is derived from POSITION, never accumulated, so the
   loop cannot drift or pop. The flagged carton starts upstream of the arm
   station, so its chip is off at p=0 and off again after it wraps. */
export function factorySubject(): CardSubject {
  const _t0 = performance.now();
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];
  const met = (base: string, kind: Parameters<typeof makeMetal>[0]["kind"], metalness: number, rough: number) => {
    const m = makeMetal({ base, kind, metalness, rough }).material;
    mats.push(m);
    return m;
  };
  const own = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };

  /* FOUR finishes generated, six materials used. `makeMetal` bakes the base
     colour into its albedo, so every colour asked of it costs an albedo, a
     roughness canvas and a Sobel normal pass. Each finish is generated ONCE in
     neutral grey and tinted with `tintMetal`, which clones the material and
     shares all three maps. */
  /* Line frame and tooling lifted with the rest of the row's machinery —
     #575F68 -> #8A939D and #31373E -> #5C646E, the same values the gantry and
     the forklift use, so all four cards' structure sits at one pair of shades.
     The belt is 15 units of continuous surface across the bottom of the frame;
     at (49,55,62) against a (14,16,21) backdrop it was a black band with the
     units apparently floating over nothing. */
  const frameM = met("#8A939D", "galv", 0.8, 0.45);      // slate line frame
  const darkM = met("#5C646E", "plate", 0.55, 0.72);     // belt, camera, tooling
  const brushedN = met("#9AA0A8", "brushed", 0.7, 0.45);
  const paintedN = met("#9AA0A8", "painted", 0.4, 0.58);

  /* Separation is carried by COLOUR alone: pale machined arm, slate line,
     kraft board and light steel-blue crates. Nothing here is as bright as the
     overlay drawn on top of it, which is the rule the old bright-blue "cleared"
     state broke and which still holds now the overlay is #5CC8FF again. */
  const armM = own(tintMetal(brushedN, "#A9B2BD"));      // the arm, #7E8792 +43
  /* Crates stay DESATURATED steel-blue rather than becoming a saturated blue,
     and that decision survives the flip. Light cargo (which it must be, on a
     dark panel) competes with a light-blue overlay, and a #5CC8FF hairline on a
     saturated blue box has almost no separation. Separate on SATURATION, not
     lightness: near-grey items, and an overlay that is the only saturated cyan
     in the frame. #8CBBDD -> #A8CDE6, matching the yard and warehouse cargo. */
  const crateM = own(tintMetal(brushedN, "#A8CDE6"));    // plastic crates
  /* The zone outline is a LIT material painted on the belt, not an unlit
     overlay, so it is dimmed by the belt's own shading before it ever reaches
     the frame. #2E86BE was already the darker of the two blues and on a dark
     belt it disappeared entirely; #4FA8D8 is the same hue taken up ~33% so the
     zone still reads as painted-on marking rather than as a graphic. */
  const zoneM = own(tintMetal(paintedN, "#4FA8D8", { metalness: 0.25 }));

  /* ---- the line, end to end ---- */
  const BELT_L = 15.0, BELT_Y = -0.55;
  const BELT_TOP = BELT_Y + 0.08;
  /* The belt surface was flat translucent grey — `beltSurface()` bakes the
     splice seam and idler tracking marks real rubber has, and it is applied
     via metalBox, so ONE material covers every face of the belt slab (the
     RoundedBoxGeometry single-group limit; the top face is what's ever seen,
     the rest is an acceptable freebie). Repeat chosen at 10 along X: the
     texture's single splice band is not physically meant to repeat, but at
     card size a plain diffuse tile every 1.5 world units (BELT_L / 10) reads
     as belt material rather than as one giant seam stretched the belt's full
     15 units, and 1.5 does not line up with the units' own 2.0 pitch, so the
     seam never appears to "chase" a specific carton. wrapT stays
     ClampToEdge (set inside skins.ts) — nothing repeats across the belt's
     width, only along its length. */
  const beltTex = beltSurface();
  beltTex.repeat.set(10, 1);
  const beltM = own(new THREE.MeshStandardMaterial({
    map: beltTex, color: "#ffffff", metalness: 0.1, roughness: 0.88, transparent: true, opacity: 0,
  }));
  const belt = metalBox(BELT_L, 0.16, 1.5, beltM);
  belt.position.set(0, BELT_Y, 0);
  belt.receiveShadow = true;
  g.add(belt);
  for (const z of [-0.84, 0.84]) {
    const rail = metalBox(BELT_L, 0.1, 0.1, frameM);
    rail.position.set(0, BELT_Y + 0.13, z);
    g.add(rail);
  }
  /* ONE shared roller geometry. Spacing is 1.0 rather than the old 0.78: over a
     belt twice as long, the tighter pitch became a picket fence of two-pixel
     stripes — noise on the belt instead of rollers. */
  const rollGeo = new THREE.CylinderGeometry(0.085, 0.085, 1.42, 8);
  for (let x = -BELT_L / 2 + 0.5; x < BELT_L / 2; x += 1.0) {
    const r = new THREE.Mesh(rollGeo, frameM);
    r.rotation.x = Math.PI / 2;
    r.position.set(x, BELT_Y + 0.05, 0);
    g.add(r);
  }
  for (const x of [-6, -3, 0, 3, 6]) {
    const leg = metalBox(0.14, 1.1, 0.14, frameM);
    leg.position.set(x, BELT_Y - 0.62, 0.55);
    g.add(leg);
  }

  // held quieter than the shared 0.16: this camera sits low, so the floor is
  // seen very obliquely and the grid rakes almost to the horizon
  // 0.1 -> 0.16 (x1.6) and light ink — see GRID_INK
  /* THE FLOOR — same wiring, same arithmetic as the yard and warehouse (see
     the yard's comment for the luminance numbers); this is the busiest of
     the three builds (PERFORMANCE.md #40: 236ms), so this is a cache hit
     against the same texture the other two cards already warmed, not a new
     canvas. Size and vignette falloff bumped the same way as the yard's edge
     fix (34 -> 44, falloff pulled in to 0.32/0.68) — this camera sits low
     with a shallow, near-horizon view of the floor (see the comment above on
     why the grid itself is held quieter here), which is the same raking-angle
     failure mode the yard had. */
  const factoryFloorTex = concreteFloor();
  const factoryFloorM = new THREE.MeshStandardMaterial({
    map: factoryFloorTex, color: "#ffffff", metalness: 0.05, roughness: 0.92,
    transparent: true, opacity: 0,
  });
  const ground = draftingGround({
    size: 44, y: -0.72, step: 1.0, color: GRID_INK, opacity: 0.16,
    surface: factoryFloorM,
    vignette: { color: VIGNETTE_C, start: 0.50, end: 1.0 },
  });
  g.add(ground.mesh);
  if (ground.surfaceMesh) g.add(ground.surfaceMesh);
  if (ground.vignetteMesh) g.add(ground.vignetteMesh);

  /* ---- the inspection station ----
     ONE camera, per the product's own claim that count, SKU and condition come
     off the same camera in the same pass. Upstream of the arm, because the
     order matters: the camera finds the defect, then the arm acts on it. */
  const ZONE_X = -2.2, ZONE_W = 1.5;
  const MAST_Z = -0.9;
  const mast = metalBox(0.14, 2.5, 0.14, frameM);
  mast.position.set(ZONE_X + 1.9, 0.75, MAST_Z);
  g.add(mast);
  const armX = metalBox(1.95, 0.13, 0.13, frameM);
  armX.position.set(ZONE_X + 0.92, 1.94, MAST_Z);
  g.add(armX);
  const armZ = metalBox(0.13, 0.13, 0.95, frameM);
  armZ.position.set(ZONE_X, 1.94, MAST_Z / 2);
  g.add(armZ);
  const camBody = metalBox(0.44, 0.3, 0.5, darkM);
  camBody.position.set(ZONE_X, 1.78, 0);
  g.add(camBody);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 14), darkM);
  lens.position.set(ZONE_X, 1.58, 0);
  g.add(lens);

  // the detection zone, painted on the belt as the outline it looks into
  for (const dx of [-ZONE_W / 2, ZONE_W / 2]) {
    const e = metalBox(0.05, 0.02, 1.4, zoneM);
    e.position.set(ZONE_X + dx, BELT_Y + 0.09, 0);
    g.add(e);
  }
  for (const dz of [-0.7, 0.7]) {
    const e = metalBox(ZONE_W, 0.02, 0.05, zoneM);
    e.position.set(ZONE_X, BELT_Y + 0.09, dz);
    g.add(e);
  }

  /* THE SIGHT CONE — the schematic's dashed line from camera to subject, as a
     volume. Cheapest large legibility win in this whole card: one four-vertex
     quad. Without it a camera on a stick is a prop; with it the frame states
     what the camera can see and why the zone is where it is. Held at 0.09
     because it covers real area — bright enough to read as light, never bright
     enough to compete with the box inside it.
     0.09 -> 0.14 on the dark panel, matching Warehouse's cone: this colour is
     already #8FDCFF, so only the alpha had to move, and the same blend applies
     (0.14x(143,220,255) + 0.86x(14,16,21) = (32,45,54)). */
  /* WAS A FLAT QUAD-FAN, NOW A REAL CONE. Apex and target preserved:
     apex   = (ZONE_X, 1.5, 0)                        = (-2.2, 1.5, 0)
     target = (ZONE_X, BELT_TOP + 0.02, 0)            = (-2.2, -0.45, 0)
     length = 1.5 - (-0.45) = 1.95
     far half-width = ZONE_W / 2 = 0.75 (unchanged from the quad)
     halfAngle = atan(0.75 / 1.95) = atan(0.384615) = 0.36717 rad (21.04 deg)

     NO footprintY. The beam lands on the BELT, not on the floor — a pool at
     the drafting ground's height would sit under the conveyor where nothing
     can see it, and a pool at belt height would be a circle overhanging the
     belt's edges. The zone is already outlined by four rails, which is the
     ground mark this scene actually wants. */
  const coneTopY = 1.5, coneBotY = BELT_TOP + 0.02;
  const sightCone = createSightCone();
  sightCone.aim(
    new THREE.Vector3(ZONE_X, coneTopY, 0),
    new THREE.Vector3(ZONE_X, coneBotY, 0),
    Math.atan((ZONE_W / 2) / (coneTopY - coneBotY)),
  );
  sightCone.material.userData = { max: 0.14, tier: "presence" };
  own(sightCone.material);
  g.add(sightCone.group);

  /* ---- the units: kraft cartons and blue crates ----
     The cardboard skins are the SAME cached canvases the Warehouse card
     generates (see skins.ts) — using real corrugated board here is free.
     Cartons cannot be recoloured by material.color (blue x kraft = olive, the
     documented trap), which is fine: cartons are never recoloured. They are
     board, and board looks like board. */
  const cardMat = (map: THREE.Texture) => {
    const m = new THREE.MeshStandardMaterial({
      map, metalness: 0.0, roughness: 0.94, envMapIntensity: 0.18,
      transparent: true, opacity: 0,
    });
    mats.push(m);
    return m;
  };
  const kraft = faces(cardMat(cardboardSide()), cardMat(cardboardTop()), cardMat(cardboardSide()));

  /* THE FLAGGED CARTON TURNS INTO AN ORANGE BOX.

     A 0.4 x 0.05 chip on the top face was the old flag, and at 280px it was a
     two-pixel smear — the "transition to orange" was technically happening and
     was invisible. The conclusion has to land on the WHOLE OBJECT: when the arm
     passes over the bad carton, the carton itself goes signal orange.

     Recoloured through skins.ts's HSL "color" composite, NOT a material.color
     tint — orange multiplied into kraft brown gives a dark burnt sludge, while
     the composite replaces hue and saturation and keeps the board's luminance,
     so the flutes, seams and FRAGILE print all survive. It reads as a carton
     that has been marked, which is the point, rather than an orange brick.
     Costs two cached canvases, and it is the payoff beat of the card. */
  const flagBoard = faces(
    cardMat(cardboardSide(SIGNAL_ORANGE)),
    cardMat(cardboardTop(SIGNAL_ORANGE)),
    cardMat(cardboardSide(SIGNAL_ORANGE)),
  );

  const CARTON = { w: 0.92, h: 0.68, d: 0.8 };
  const CRATE = { w: 1.02, h: 0.56, d: 0.86 };
  // one shared BoxGeometry per kind. Cartons need a BoxGeometry rather than
  // metalBox's RoundedBoxGeometry: rounded boxes have a single material group,
  // so a six-material face array would not bind.
  const cartonGeo = new THREE.BoxGeometry(CARTON.w, CARTON.h, CARTON.d);

  const UNIT_N = 7, PITCH = 2.0, SPAN = UNIT_N * PITCH;
  /* The flagged unit must be a CARTON (odd index) and must START UPSTREAM of
     the arm station, or its defect chip would already be lit at p=0 and the
     loop would not be periodic. Index 3 starts at x=-1.0, the station is at
     ~1.4 — upstream, as required. */
  const FLAGGED = 3;
  const isCarton = (i: number) => i % 2 === 1;

  const units: { grp: THREE.Group; body: THREE.Mesh; carton: boolean; flagged: boolean }[] = [];
  for (let i = 0; i < UNIT_N; i++) {
    const grp = new THREE.Group();
    const carton = isCarton(i);
    let body: THREE.Mesh;
    if (carton) {
      body = new THREE.Mesh(cartonGeo, kraft);
      // a hand-packed line is never perfectly square
      body.rotation.y = (i % 3 - 1) * 0.05;
      grp.position.y = BELT_TOP + CARTON.h / 2;
    } else {
      body = metalBox(CRATE.w, CRATE.h, CRATE.d, crateM);
      grp.position.y = BELT_TOP + CRATE.h / 2;
    }
    body.castShadow = true;
    grp.add(body);
    g.add(grp);
    units.push({ grp, body, carton, flagged: i === FLAGGED });
  }

  /* ---- the arm ----
     Straight from the schematic: base, column, angled upper link, forearm,
     end effector. Built in its own root group so the whole assembly can yaw
     toward the belt — the base sits BEHIND the line at z=-1.15, and a yaw of
     0.624rad is what swings a 1.97-long reach out over the belt centre:
     1.97 x sin(0.624) = 1.15. The head therefore lands at

         STATION_X = ARM_X - 1.97 x cos(0.624) = ARM_X - 1.60

     which is where the engagement window and the flag threshold both key off.
     Get that arithmetic wrong and the arm dips onto empty belt. */
  const ARM_X = 3.0, ARM_Z = -1.15, ARM_YAW = 0.624;
  const STATION_X = ARM_X - 1.6;
  const armRoot = new THREE.Group();
  armRoot.position.set(ARM_X, BELT_Y - 0.02, ARM_Z);
  armRoot.rotation.y = ARM_YAW;
  g.add(armRoot);
  const armBase = metalBox(0.6, 0.22, 0.6, frameM);
  armBase.position.y = 0.11;
  armRoot.add(armBase);
  const column = metalBox(0.26, 1.5, 0.26, armM);
  column.position.y = 0.95;
  armRoot.add(column);
  const shoulder = new THREE.Group();
  shoulder.position.y = 1.72;
  armRoot.add(shoulder);
  const upper = metalBox(1.25, 0.18, 0.18, armM);
  upper.position.x = -0.625;
  shoulder.add(upper);
  const elbow = new THREE.Group();
  elbow.position.x = -1.25;
  shoulder.add(elbow);
  const fore = metalBox(0.95, 0.15, 0.15, armM);
  fore.position.x = -0.475;
  elbow.add(fore);
  // the tool itself is dark — it is an instrument, not structure
  const tool = metalBox(0.34, 0.28, 0.3, darkM);
  tool.position.set(-0.95, -0.12, 0);
  elbow.add(tool);
  /* Poses, worked out rather than dialled in. Positive z-rotation swings the
     -x arm DOWNWARD. At rest the tool sits at y~1.22, clear above everything;
     at full engagement shoulder 0.62 / elbow -0.62 puts it at y~0.30, just
     above a carton's 0.21 top face. */
  const SH_REST = 0.15, SH_DOWN = 0.62;
  const EL_REST = -0.55, EL_DOWN = -0.62;

  /* ---- THE FLAG NOW HAS A CONSEQUENCE ----
     Marking the bad carton and then letting it ride the belt on with everything
     else is an inspection that decides nothing. The flagged unit is now NUDGED
     OFF-LINE — pushed toward the camera in +z — and it keeps that offset for the
     rest of its run down the belt, so the frame carries the evidence that
     something was actually rejected rather than merely noticed.

     Every number is derived from the position math above, not dialled in, so
     the divert cannot drift out of sync if PITCH, SPAN or ARM_X move:

       FLAG_X0    = -SPAN/2 + FLAGGED*PITCH = -7 + 3*2   = -1.0   (its x at p=0)
       x(p)       = FLAG_X0 + p*SPAN                              (until it wraps)
       PRESS_P    = (STATION_X - FLAG_X0)/SPAN = (1.4+1)/14 = 0.171
                    — the arm's tool is directly on it here (dx = 0, engage = 1)
       WRAP_P     = (SPAN/2 - FLAG_X0)/SPAN    = 8/14      = 0.571
                    — where `while (x > SPAN/2) x -= SPAN` fires

     The shift runs PRESS_P + 0.05 -> +0.08, i.e. 0.221 -> 0.301, finishing 0.27
     of loop before the wrap — well clear of the 0.1 margin, so no rescheduling
     was needed. 0.08 x 14s = 1.1s for a 0.55-unit slide: the shortest new move
     in the row, and deliberately so, because a nudge is an impulse and easing
     it over 2s would read as the carton drifting rather than being pushed.

     THE RESET IS THE WRAP ITSELF. The offset is gated on `p < WRAP_P` and the
     x wrap fires at exactly WRAP_P, so the carton returns to the belt start
     already back on the centreline, in the same frame, off-screen at x=-7. */
  const FLAG_X0 = -SPAN / 2 + FLAGGED * PITCH;
  const FLAG_PRESS_P = (STATION_X - FLAG_X0) / SPAN;
  const FLAG_WRAP_P = (SPAN / 2 - FLAG_X0) / SPAN;
  const DIVERT_A = FLAG_PRESS_P + 0.05, DIVERT_B = FLAG_PRESS_P + 0.13, DIVERT_Z = 0.55;
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));

  /* ---- the vision layer ---- */
  _deep("factory:mats+geom", _t0);
  const dm = detectMaterials();
  mats.push(...dm.all);

  // scratch, built once — never reallocated per frame
  const xs: number[] = new Array(UNIT_N).fill(0);
  const downstream: number[] = [];

  /* Four brackets, for the units DOWNSTREAM of the camera. Upstream units
     deliberately carry nothing: a unit the camera has not reached yet is not
     yet known, and showing that is the cheapest way to make the frame read
     left-to-right as a process rather than as a row of decorated boxes. */
  const DET_N = 3;
  const dets = Array.from({ length: DET_N }, () => createTracker(dm.faint));
  dets.forEach((t) => g.add(t.group));

  /* THE DIMENSION GAUGE — the schematic's actual callout ("INSPECT · DIMENSION
     CHECK"), which the scene never had. Width across the top, height up the
     side, on whichever unit is inside the zone. This is what makes the station
     read as MEASURING rather than as a light shining on a box, and it is six
     thin planes. Sized to the carton, which is the larger of the two kinds. */
  const gauge = new THREE.Group();
  const gaugeBar = (w: number, h: number, x: number, y: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), dm.accent);
    m.position.set(x, y, 0);
    gauge.add(m);
  };
  const GT = 0.032, GW = CARTON.w, GH = CARTON.h;
  const wy = GH / 2 + 0.24;
  gaugeBar(GW, GT, 0, wy);
  gaugeBar(GT, 0.24, -GW / 2, wy);
  gaugeBar(GT, 0.24, GW / 2, wy);
  // height gauge kept CLOSE — at 0.30 it sat out in the gap to the next unit
  // and read as an unrelated floating bar rather than as a measurement
  const hx = GW / 2 + 0.18;
  gaugeBar(GT, GH, hx, 0);
  gaugeBar(0.2, GT, hx, -GH / 2);
  gaugeBar(0.2, GT, hx, GH / 2);
  g.add(gauge);

  _deep("factory:detect", _t0);

  let inZone = -1;
  let flagLit = false;
  const clampAbs = (v: number, lim: number) => Math.max(-lim, Math.min(lim, v));

  return {
    group: g,
    focus: new THREE.Vector3(ZONE_X, 0.4, 0.7),
    materials: mats,
    marks: dets,
    // same surface/vignette peaks as the yard and warehouse — see the yard's comment
    ground: {
      setOpacity: (o) => {
        setGroundOpacity(ground, o);
        ground.setSurfaceOpacity?.(o * 0.94);
        ground.setVignetteOpacity?.(o);
      },
    },
    tick: (p) => {
      /* The sweep band. `p` is the card loop progress, already pinned to a
         fixed 0.85 by card-scene in reduced motion, so this needs no branch
         of its own — x8 puts a little under three sweeps in a loop. */
      sightCone.tick(p * 8);
      const travel = p * SPAN;
      inZone = -1;
      downstream.length = 0;

      for (let i = 0; i < UNIT_N; i++) {
        let x = -SPAN / 2 + i * PITCH + travel;
        while (x > SPAN / 2) x -= SPAN;
        xs[i] = x;
        units[i].grp.position.x = x;

        const d = x - ZONE_X;
        if (Math.abs(d) <= ZONE_W / 2) inZone = i;
        else if (d > 0) downstream.push(i);
      }
      /* the divert — see the derivation at DIVERT_A. Written on the group, so
         the bracket that tracks this unit follows it off-line automatically. */
      units[FLAGGED].grp.position.z = p < FLAG_WRAP_P ? DIVERT_Z * seg(p, DIVERT_A, DIVERT_B) : 0;

      // nearest downstream first, so the brackets cluster around the station
      // rather than on whatever happens to be at the far end of the belt
      downstream.sort((a, b) => xs[a] - xs[b]);

      /* THE ARM'S JOB. It engages with the nearest CARTON to its station —
         cartons are what it handles — dipping as one arrives and lifting as it
         leaves. Three cartons per loop, so the arm works about every 4.7s
         instead of nodding pointlessly on a timer. Engagement is purely a
         function of that carton's x, so the whole motion is periodic. */
      let nearCarton = -1, nearDx = Infinity;
      for (let i = 0; i < UNIT_N; i++) {
        if (!units[i].carton) continue;
        const dx = xs[i] - STATION_X;
        if (Math.abs(dx) < Math.abs(nearDx)) { nearCarton = i; nearDx = dx; }
      }
      const engage = nearCarton < 0 ? 0 : 1 - clamp01(Math.abs(nearDx) / 1.6);
      const e = engage * engage * (3 - 2 * engage);
      shoulder.rotation.z = SH_REST + (SH_DOWN - SH_REST) * e;
      elbow.rotation.z = EL_REST + (EL_DOWN - EL_REST) * e;
      // and it turns to follow the box it is working on
      armRoot.rotation.y = ARM_YAW + clampAbs(nearDx * 0.25, 0.12) * e;

      /* The defect is marked BY THE ARM, and the whole carton changes. Once the
         tool has passed over it the board swaps to the orange recolour, so the
         flag has a visible cause instead of appearing on a timer, and it is
         legible at card size instead of being a 2px chip. Position-derived, so
         it is off at p=0 and off again once the carton wraps. */
      flagLit = xs[FLAGGED] > STATION_X + 0.3;
      /* ONLY THE FLAGGED CARTON EVER TURNS ORANGE. An earlier version also lit
         WHICHEVER carton the arm happened to be pressing on, on the theory
         that "the mark is the arm's touch". That reading was wrong against
         the row's own rule (`#ED510C` is reserved for conclusions, never
         decorative) and it broke at runtime: with `flagLit` staying true for
         the rest of the flagged carton's run AND a second, healthy carton
         able to be mid-press at the very same tick, the belt could show TWO
         solid-orange bodies at once — a colour meant to mean "defect" landing
         on stock that passed inspection. Orange now marks exactly one thing,
         the carton that is actually bad; every other carton the arm touches
         stays plain kraft, same as the untouched ones. Still purely
         position-derived (`flagLit` alone), so the loop stays periodic. */
      for (let i = 0; i < UNIT_N; i++) {
        if (!units[i].carton) continue;
        const glow = i === FLAGGED && flagLit;
        units[i].body.material = glow ? flagBoard : kraft;
      }

      // the scan bar brightens as a unit closes on the zone — this runs after
      // the frame's global opacity reset in card-scene.tsx, so it sticks
      let nearZone = Infinity;
      for (let i = 0; i < UNIT_N; i++) nearZone = Math.min(nearZone, Math.abs(xs[i] - ZONE_X));
      dm.scan.opacity = 0.15 + 0.85 * (1 - clamp01(nearZone / (ZONE_W / 2 + 0.6)));

      // the gauge only exists while there is something in the zone to measure
      gauge.visible = inZone >= 0;
    },
    trackers: (camera) => {
      /* THREE TIERS, AND NO UNIT WEARS TWO MARKS AT ONCE. The zone unit is
         marked by the GAUGE alone; brackets belong to the units downstream of
         it; and the flagged carton's bracket goes WARN only once the arm has
         actually marked it. Tracked -> measured -> flagged, three visual
         weights, never stacked on one box. */
      for (let k = 0; k < DET_N; k++) {
        const idx = k < downstream.length ? downstream[k] : -1;
        if (idx < 0) { dets[k].follow(null, camera); continue; }
        const flagged = idx === FLAGGED && flagLit;
        dets[k].setMaterial(flagged ? dm.warn : dm.faint);
        dets[k].follow(units[idx].grp, camera);
      }
      if (inZone >= 0) {
        // the gauge is a flat graphic: it rides the unit's world position and
        // stays square to the viewer, exactly as the brackets do
        const u = units[inZone];
        gauge.position.copy(u.grp.position);
        gauge.quaternion.copy(camera.quaternion);
        /* Sized to the unit it is measuring, not to a fixed guess. Built at
           carton dimensions, so a crate — wider and shorter — got a gauge that
           was visibly narrower and taller than the thing it claimed to be
           measuring, which is the one mistake a dimension graphic cannot make.
           The stroke does distort by 11%/18% under this non-uniform scale;
           that is invisible at 1.7px and worth it for a gauge that fits. */
        gauge.scale.set(
          (u.carton ? CARTON.w : CRATE.w) / CARTON.w,
          (u.carton ? CARTON.h : CRATE.h) / CARTON.h,
          1,
        );
      }
    },
    /* Cardboard textures are CACHED and shared with the Warehouse card —
       disposing them here would pull them out from under that scene. Only the
       materials and the geometry built here are disposed. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      // the concrete and belt-surface TEXTURES are cached and shared; only the
      // materials wrapping them, and the surface/vignette planes, are this
      // scene's own
      factoryFloorM.dispose();
      ground.surfaceMesh?.geometry.dispose();
      if (ground.vignetteMesh) {
        (ground.vignetteMesh.material as THREE.Material).dispose();
        ground.vignetteMesh.geometry.dispose();
      }
      rollGeo.dispose();
      /* Disposes the cone material AND its ground pool material; the shared
         cone/pool GEOMETRY is module-level and flagged, never touched here.
         The cone material is also in `mats`, and Material.dispose() is safe
         to call twice. */
      sightCone.dispose();
      cartonGeo.dispose();
      gauge.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    },
  };
}

/* 04 · Viso Data — reaching back through the record to pull one frame out.

   COMPLETE RETHINK. The two previous versions were both a wall of live camera
   feeds with one lit tile, and the execution problems (a barcode of black
   rectangles, then a slab too heavy for the row) were downstream of a concept
   problem that no amount of retuning would have fixed:

       A WALL OF LIVE FEEDS SHOWS MONITORING. THIS CARD IS NOT ABOUT MONITORING.

   The copy underneath reads "Compression, trace & detection AI". A feed wall
   says nothing about compression and nothing about trace — and "watching many
   cameras at once" is Secure Vision's job, which is a different module. Viso
   Data's claim is almost the opposite of live: keep everything, cheaply, then
   reach back into it and retrieve the one moment that matters, bound to a case.

   So the subject is THE RECORD ITSELF, and time runs into DEPTH.

     · a deck of frames receding away from the camera — the archive. Near is
       now, far is the past.
     · SPACING TIGHTENS WITH DEPTH. Recent footage sits apart and readable;
       older footage is squeezed until the far end is a solid wedge. That is
       compression, drawn rather than captioned — retention policy is literally
       "keep recent at full rate, thin the old".
     · a scan travels BACKWARD along the deck — searching the record, not
       watching a screen.
     · it stops, and one frame is pulled sideways out of the deck, turns to
       face you and opens up. That is the trace: a clip retrieved.
     · the case mark lands on it in signal orange. That is the conclusion.
     · then it slides back into the deck, which is what makes the loop
       state-neutral without hiding anything off-frame.

   WHY MOTION INTO DEPTH MATTERS. Yard's gantry crosses laterally, Warehouse's
   truck drives laterally, Factory's belt runs laterally. A fourth card moving
   left-to-right would have read as a third conveyor no matter what was on it.
   This one moves along Z, and that alone separates it in a row of four. */
/* 02 · Viso Data — REWRITTEN AGAIN. The feed-wall concept and its four-hop
   trace are correct and stay; the owner's verdict on the previous pass was
   that it "makes no visual sense" — bare screens floating with no visible
   source. This pass adds the physical world the wall was missing: real
   monitors (bezel + recessed glass, not a bare coloured box), a rack that
   holds them, a console below, and a physical camera aimed OUT of frame that
   the trace now visibly originates from (camera -> A -> B -> C -> D). See the
   module-level report handed to the owner for the full value table. */
export function dataSubject(): CardSubject {
  const _t0 = performance.now();
  const g = new THREE.Group();
  const mats: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T) => { mats.push(m); return m; };
  const es = (t: number) => t * t * (3 - 2 * t);
  const seg = (p: number, a: number, b: number) => es(clamp01((p - a) / (b - a)));

  const FLOOR = -0.95;

  /* ---- the wall grid — sized in monitor OUTER faces, not bare tiles ----
     camY/ty are fixed at 0.62 (index.tsx, id "data") so GRID_CY is pinned to
     it: this is the one hero card whose camera sits exactly level with the
     grid's own centre, which is why the rack rails below get the
     round-profile treatment rather than a flat cap — see the note at RAIL_Y. */
  const COLS = 5, ROWS = 3;
  const SCREEN_W = 1.15, SCREEN_H = 0.72;         // unchanged from the previous pass
  const BEZEL = 0.05;                              // bezel width on all sides
  const MON_W = SCREEN_W + 2 * BEZEL;              // 1.25 — monitor outer face
  const MON_H = SCREEN_H + 2 * BEZEL;              // 0.82
  const MON_D = 0.12;                              // body depth — gives it sides
  const SCREEN_D = 0.05;
  const GAP = 0.06;                                 // clear gap between monitor bodies
  const GRID_CX = 0, GRID_CY = 0.62;
  const STEP_X = MON_W + GAP;                       // 1.31
  const STEP_Y = MON_H + GAP;                       // 0.88
  const WALL_W = COLS * MON_W + (COLS - 1) * GAP;   // 6.49
  const WALL_H = ROWS * MON_H + (ROWS - 1) * GAP;   // 2.58
  const colX = (c: number) => GRID_CX + (c - (COLS - 1) / 2) * STEP_X;
  const rowY = (r: number) => GRID_CY + ((ROWS - 1) / 2 - r) * STEP_Y;

  /* One generated finish, shared with Factory/Warehouse — cache hit, costs
     nothing extra on this page. */
  const brushedN = own(makeMetal({ base: "#9AA0A8", kind: "brushed", metalness: 0.7, rough: 0.45 }).material);

  /* VALUE LADDER, all against the backdrop (~11). SECOND PASS on these four —
     the first round back-solved from one measured data point (rackM's
     #171E27, hex-average 30.67 vs a measured render of 30.7) and that single
     point undershot: screenshotted, the whole structure family came in near-
     black and the card read as the darkest of the four on the row. Same
     back-solve method (rendered mean tracks hex-channel average under this
     studio's lighting), new targets, all raised — bezel by far the most,
     since it's the largest-area element and was disappearing into the rack
     behind it:
       rackM      #171E27 (23,30,39)     avg 30.7   unchanged — measured, correct
       consoleM   #262C32 (38,44,50)     avg 44.0   was 34 — +10, on target
       bezelM     #383E44 (56,62,68)     avg 62.0   was 46 — +16, on target,
                                                     the big one
       camHouseM  #3C4248 (60,66,72)     avg 66.0   was 40 — +26, ASKED FOR 58
                                                     but the brief's own two
                                                     asks conflict at that
                                                     number: "keep the
                                                     ordering rack < console <
                                                     bezel < camera housing"
                                                     needs camHouseM > 62, and
                                                     58 < 62 breaks it. Kept
                                                     the ORDER (the brief
                                                     calls it out as the
                                                     harder constraint) and
                                                     nudged the number to 66,
                                                     4 clear of bezel rather
                                                     than 4 under it.
       camLensM   #646E78 (100,110,120)  avg 110.0  was 95 — +15, on target
     Final order: rack(30.7) < console(44) < bezel(62) < camHousing(66) <
     idle-screen(57.3)... camHousing(66) also now sits above idle-screen
     (57.3), which the brief's ordering list does not mention either way and
     which is consistent with "the camera must be findable" (fix 2) — a
     housing brighter than a dark idle tile is exactly what makes it read as
     the thing in front of the wall, not part of it. */
  const rackM = own(tintMetal(brushedN, "#171E27", { metalness: 0.14 }));
  const bezelM = own(tintMetal(brushedN, "#383E44", { metalness: 0.14 }));
  const consoleM = own(tintMetal(brushedN, "#262C32", { metalness: 0.14 }));
  const camHouseM = own(tintMetal(brushedN, "#3C4248", { metalness: 0.14 }));
  const camLensM = own(tintMetal(brushedN, "#646E78", { metalness: 0.5 }));

  /* TILE FACE VALUES — UNCHANGED from the previous pass, because they already
     hit their targets exactly and the brief says not to re-tune what reads
     correctly. Checked against the backdrop (~11), never a white clip point:
       idle    #313942 (49,57,66)    mean 57.3   5.2x   target ~57
       content #414A54 (65,74,84)    mean 74.3   6.8x   target ~75
       active  #6C7C88 (108,124,136) mean 122.7  11.2x  target ~122
     Unlit MeshBasicMaterial, so mean-RGB is the rendered value directly.

     SCANLINE TEXTURE, new this pass — "faint horizontal scanline texture on
     idle screens so they read as live video, not dark glass." A 4x64 canvas,
     16 of 64 rows at 235/255 against 48 at 255/255: average multiplier
     250/255 = 0.980, so it costs the idle face ~2% of its measured mean
     (57.3 -> ~56.1) — that is the "faint" the brief asked for, not a redo of
     the value ladder. Applied to idleFaceM only, per the brief's own scope
     ("on idle screens"); the four trace tiles and the three content tiles
     stay flat so nothing competes with the hop. ONE canvas, repeated via
     UV tiling, shared by all idle tiles through idleFaceM.map — no
     per-tile texture cost. */
  const scanCanvas = document.createElement("canvas");
  scanCanvas.width = 4; scanCanvas.height = 64;
  const scanCtx = scanCanvas.getContext("2d")!;
  for (let y = 0; y < 64; y++) {
    const v = y % 4 === 0 ? 235 : 255;
    scanCtx.fillStyle = `rgb(${v},${v},${v})`;
    scanCtx.fillRect(0, y, 4, 1);
  }
  const scanTex = new THREE.CanvasTexture(scanCanvas);
  scanTex.wrapS = scanTex.wrapT = THREE.RepeatWrapping;
  scanTex.repeat.set(1, 22);

  const idleFaceM = own(new THREE.MeshBasicMaterial({ color: "#313942", map: scanTex, transparent: true, opacity: 0 }));
  const contentFaceM = own(new THREE.MeshBasicMaterial({ color: "#414A54", transparent: true, opacity: 0 }));

  /* THE TRACED OBJECT. Body and marks get their OWN material at their OWN
     z-offset — the exact bug that shipped twice in this file's previous
     version (ribs on the body, same material, same z, unrenderable).

     THIRD PASS. Pass one (mark mean 99.0, gap 50.7) was invisible. Pass two
     overcorrected on BOTH axes it was told to push: rails at 32% of body
     height each (64% combined) plus a door block at 4x the rails' contrast
     read as a dark bar with a light slit through it and a black end-cap —
     a key or a USB stick, not a container seen side-on. The fix is not
     "less" in the direction of pass one, it is specific proportions:
       body       #8398A6 (131,152,166) mean 149.7  12.8x — brighter than any tile
       mark(rail) #333D48 ( 51, 61, 72) mean  61.3   5.2x — gap to body 88.4
       mark(door) #3D4854 ( 61, 72, 84) mean  72.3   6.2x — gap to body 77.4,
                                                              only 11.0 ABOVE
                                                              the rails: the
                                                              door reads as
                                                              distinguishable
                                                              from the rails,
                                                              not as a
                                                              separate darker
                                                              object welded to
                                                              one end. */
  const objectM = own(new THREE.MeshBasicMaterial({ color: "#8398A6" }));
  const markM = own(new THREE.MeshBasicMaterial({ color: "#333D48" }));
  const doorM = own(new THREE.MeshBasicMaterial({ color: "#3D4854" }));

  /* THE TRACE — connectors, the bracket, and (new) the LEDs. #5CC8FF, mean
     182.3, 16.6x the backdrop: the brightest thing in frame, same accent
     every detection on this page uses. `presence` tier: a connector mid-draw
     is the system WORKING, not a conclusion, so it must not go quiet just
     because the card isn't hovered — same rule the sight cones and scan bars
     on the other three cards already follow. Reused verbatim for the four
     trace monitors' power LEDs, so "connectors, bracket, LEDs on active
     monitors" really is one material, one value, per the brief. */
  const connectorM = own(new THREE.MeshBasicMaterial({
    color: "#5CC8FF", transparent: true, opacity: 0, toneMapped: false,
    depthWrite: false, side: THREE.DoubleSide, userData: { max: 0.92, tier: "presence" },
  }));
  /* The eleven idle monitors' LEDs — dim, constant, ramps with the wall's own
     power-on (`power`) and nothing else. Its own small material so it never
     competes with connectorM's brighter ramp. */
  const ledDimM = own(new THREE.MeshBasicMaterial({ color: "#3A4A56", transparent: true, opacity: 0 }));
  /* The four trace monitors get their OWN LED opacity (driven by that hop's
     `lights[i]`, not the shared power ramp) and their own bezel tint, so the
     lit screen visibly "spills" onto the structure around it — brief item 5,
     "let lit screens spill a little light onto their own bezel and the rail
     behind". Four tiny materials, reused for two purposes each (LED mesh +
     rail-glow mesh behind that monitor), so this is 4 materials driving 8
     meshes, not 8 materials. */
  // 4 trace hops, hard-coded rather than derived from PATH (declared further
  // below) to avoid a use-before-declaration ordering problem
  const ledActiveMats = Array.from({ length: 4 }, () => own(new THREE.MeshBasicMaterial({
    color: "#5CC8FF", transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
  })));
  const BEZEL_BASE_C = new THREE.Color("#383E44");
  const BEZEL_LIT_C = new THREE.Color("#4C6E80");
  const bezelPathMats = Array.from({ length: 4 }, () => own(bezelM.clone()));

  /* ---- geometry, shared aggressively ----
     ONE screen box (15 monitors), ONE horizontal bezel bar, ONE vertical
     bezel bar, ONE LED box, ONE unit cylinder (rails, posts, arms, cables —
     every cylindrical part on the card reuses this one geometry via
     non-uniform scale), ONE unit box for every part of the traced object (4
     instances x 4 parts = 16 meshes), ONE connector plane (4 meshes).
     Console and camera housing go through `metalBox`, which pools its own
     RoundedBoxGeometry by dimension — see its header comment — so those cost
     nothing extra to add. Nothing here is allocated per instance. */
  const screenGeo = new THREE.BoxGeometry(SCREEN_W, SCREEN_H, SCREEN_D);
  const bezelHGeo = new THREE.BoxGeometry(MON_W, BEZEL, MON_D);
  const bezelVGeo = new THREE.BoxGeometry(BEZEL, SCREEN_H, MON_D);
  const ledGeo = new THREE.BoxGeometry(0.045, 0.02, 0.02);
  const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
  const lensGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.16, 14);
  const objGeo = new THREE.BoxGeometry(1, 1, 1);
  const connGeo = new THREE.PlaneGeometry(1, 0.035);
  connGeo.translate(0.5, 0, 0); // pivot at the start end, so scale.x draws progressively

  /* BoxGeometry face order +x,-x,+y,-y,+z,-z. `faces()` (see file header) puts
     the bezel on the four side groups and the glass face on front/back — a
     single shared array per face-material, reused by every screen that
     shares that face colour, exactly the deck's old `deckFaceArrays`
     pattern. This is the screen's own thin (0.05) rim, barely visible once
     it sits recessed behind the bezel frame bars below — the frame bars are
     what actually reads as "monitor bezel" up close. */
  const idleFaces = faces(bezelM, bezelM, idleFaceM);
  const contentFaces = faces(bezelM, bezelM, contentFaceM);

  /* Grid coordinates (col, row), 0-indexed. Four NON-adjacent, NON-collinear
     tiles carry the trace — see the report for why these four: no two share
     an edge, and no three sit on one row, column or diagonal, so the hop
     reads as a search across the wall rather than a scan along it.
       A (0,0) top-left      -> B (3,1) mid-right
       B (3,1) mid-right     -> C (1,2) bottom-left
       C (1,2) bottom-left   -> D (4,0) top-right (the conclusion) */
  const PATH: [number, number][] = [[0, 0], [3, 1], [1, 2], [4, 0]];
  const CONTENT: [number, number][] = [[2, 0], [0, 2], [3, 2]];
  const pathKey = (c: number, r: number) => `${c},${r}`;
  const contentSet = new Set(CONTENT.map(([c, r]) => pathKey(c, r)));

  const IDLE_C = new THREE.Color("#313942");
  const ACTIVE_C = new THREE.Color("#6C7C88");
  const pathMats: THREE.MeshBasicMaterial[] = PATH.map(() =>
    own(new THREE.MeshBasicMaterial({ color: IDLE_C.clone(), transparent: true, opacity: 0 })));
  const pathFaceArrays = pathMats.map((m) => faces(bezelM, bezelM, m));

  /* SCREEN_Z: the glass sits RECESSED ~0.02 behind the bezel frame's front
     face, per the brief ("insets ~0.02 into the bezel so the bezel casts a
     lip over it"). The frame bars below are drawn only around the SCREEN's
     perimeter (they don't cover its 1.15x0.72 opening at all — four bars,
     not a solid box with a hole cut in it), so the recess reads correctly
     without any CSG: nothing occludes the screen or the traced object drawn
     in front of it, because nothing is there to occlude with. */
  const SCREEN_Z = -0.02;
  const BEZEL_FRONT_Z = MON_D / 2 - 0.01;   // ~0.05, the frame bars' front face
  const MON_BACK_Z = -MON_D / 2;            // -0.06, where the mounting arm attaches

  // per-monitor LED position: bottom-right corner of the bottom bezel bar
  const LED_X = MON_W / 2 - 0.09, LED_Y = -MON_H / 2 + BEZEL / 2;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = pathKey(c, r);
      const pi = PATH.findIndex(([pc, pr]) => pc === c && pr === r);
      const isPath = pi >= 0;
      const mat = isPath ? pathFaceArrays[pi] : contentSet.has(key) ? contentFaces : idleFaces;
      const cx = colX(c), cy = rowY(r);

      const screen = new THREE.Mesh(screenGeo, mat);
      screen.position.set(cx, cy, SCREEN_Z);
      g.add(screen);

      // the bezel frame — 4 shared-geometry bars, one material per monitor
      // (base bezelM, or that hop's bezelPathMats while it's live)
      const frameMat = isPath ? bezelPathMats[pi] : bezelM;
      for (const sy of [-1, 1]) {
        const h = new THREE.Mesh(bezelHGeo, frameMat);
        h.position.set(cx, cy + sy * (MON_H / 2 - BEZEL / 2), 0);
        g.add(h);
      }
      for (const sx of [-1, 1]) {
        const v = new THREE.Mesh(bezelVGeo, frameMat);
        v.position.set(cx + sx * (MON_W / 2 - BEZEL / 2), cy, 0);
        g.add(v);
      }

      // the power LED — dim on every idle monitor, its own brighter material
      // on the four trace monitors (opacity driven per-hop in tick())
      const led = new THREE.Mesh(ledGeo, isPath ? ledActiveMats[pi] : ledDimM);
      led.position.set(cx + LED_X, cy + LED_Y, BEZEL_FRONT_Z + 0.005);
      g.add(led);
    }
  }

  /* ---- the rack — three horizontal rails, two end posts, one short
     mounting arm per monitor. Slim: this is structure, not subject.

     RAIL PROFILE IS A CYLINDER, DELIBERATELY, NOT A THIN BOX. The middle
     rail sits at row 1's own Y (0.62) — EXACTLY the camera's eye height on
     this rig (camY/ty 0.62, see index.tsx). That is precisely the geometry
     the brief's own invariant warns about: "any thin horizontal surface near
     y 0.62 is seen nearly edge-on and will alias" — which is why the
     previous pass's flat outer frame was deleted. A cylinder has no face
     that goes edge-on: its silhouette is a rounded highlight from any
     viewing angle, radius 0.05 is well above sub-pixel at this camera
     distance (~10.6), so the invariant's failure mode does not apply to it.
     This is the "positioned away from eye level, or thick enough to have a
     visible face" choice made explicit — here it's the latter, by shape
     rather than by offset. */
  const RAIL_Z = MON_BACK_Z - 0.08;             // -0.14, clear behind the monitor backs
  const RAIL_R = 0.05;
  const railY = [rowY(0), rowY(1), rowY(2)];    // 1.50, 0.62, -0.26
  for (const ry of railY) {
    const rail = new THREE.Mesh(cylGeo, rackM);
    rail.rotation.z = Math.PI / 2;              // unit cylinder's axis is Y; lay it flat along X
    rail.scale.set(RAIL_R, WALL_W + 0.5, RAIL_R);
    rail.position.set(GRID_CX, ry, RAIL_Z);
    g.add(rail);
  }
  const POST_X = WALL_W / 2 + 0.15;
  const postTop = railY[0] + 0.3, postBot = railY[2] - 0.3;
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(cylGeo, rackM);
    post.scale.set(0.06, postTop - postBot, 0.06);   // unit cylinder axis is already Y — no rotation needed
    post.position.set(sx * POST_X, (postTop + postBot) / 2, RAIL_Z);
    g.add(post);
  }
  // one short mounting arm per monitor, rail Y to monitor back
  const ARM_R = 0.028;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = colX(c), cy = rowY(r);
      const arm = new THREE.Mesh(cylGeo, rackM);
      arm.rotation.x = Math.PI / 2;             // point the unit cylinder along Z
      arm.scale.set(ARM_R, MON_BACK_Z - RAIL_Z, ARM_R);
      arm.position.set(cx, cy, (MON_BACK_Z + RAIL_Z) / 2);
      g.add(arm);
    }
  }
  // rail-glow behind the four trace monitors — the "spill onto the rail"
  // half of brief item 5, reusing ledActiveMats so no new material is spent
  PATH.forEach(([c, r], i) => {
    const glow = new THREE.Mesh(ledGeo, ledActiveMats[i]);
    glow.scale.set(3, 2.4, 1.4);
    glow.position.set(colX(c), rowY(r), RAIL_Z + 0.015);
    g.add(glow);
  });

  /* ---- the console — a desk below the wall, what makes the wall read as a
     control room rather than a floating grid (brief item 3). Top surface at
     y = -0.55, front panel dropping to FLOOR (-0.95), forward of the wall at
     z ~= +0.55. */
  const DESK_TOP_Y = -0.55, DESK_D = 0.9, DESK_Z = 0.55, DESK_W = WALL_W - 0.09;
  const DESK_FRONT_Z = DESK_Z + DESK_D / 2;   // 1.0, the desk's own front edge
  const deskTop = metalBox(DESK_W, 0.06, DESK_D, consoleM);
  deskTop.position.set(GRID_CX, DESK_TOP_Y - 0.03, DESK_Z);
  g.add(deskTop);
  const deskFrontH = DESK_TOP_Y - FLOOR;       // 0.40
  const deskFront = metalBox(DESK_W, deskFrontH, 0.05, consoleM);
  deskFront.position.set(GRID_CX, DESK_TOP_Y - deskFrontH / 2, DESK_FRONT_Z - 0.025);
  g.add(deskFront);
  // the emissive strip along the desk's front top edge — its OWN material,
  // dimmer than connectorM's 0.92 max, because this is ambient console
  // decor, not a trace connector, and "faint" was the brief's own word.
  const deskStripM = own(new THREE.MeshBasicMaterial({
    color: "#5CC8FF", transparent: true, opacity: 0, toneMapped: false, depthWrite: false,
  }));
  deskStripM.userData = { max: 0.3, tier: "presence" };
  const deskStrip = new THREE.Mesh(ledGeo, deskStripM);
  deskStrip.scale.set(DESK_W / 0.045, 1, 1);
  deskStrip.position.set(GRID_CX, DESK_TOP_Y - 0.03, DESK_FRONT_Z + 0.006);
  g.add(deskStrip);

  /* ---- cable runs — a few thin cylinders from the rack's bottom rail down
     to the console, brief item 5's second half. Same shared cylGeo, thinned
     via non-uniform scale. */
  const CABLE_XS = [-2.4, -0.9, 0.6, 2.1];
  for (const cx of CABLE_XS) {
    const cable = new THREE.Mesh(cylGeo, rackM);
    const topY = railY[2], botY = DESK_TOP_Y;
    cable.scale.set(0.018, topY - botY, 0.018);
    cable.position.set(cx, (topY + botY) / 2, (RAIL_Z + DESK_Z) / 2);
    g.add(cable);
  }

  /* ---- the camera — the piece the owner called out as missing, and then
     called out AGAIN as too small: "it is the source of the entire trace and
     currently renders as a small dark blob at the frame edge." Mounted at
     x ~= -3.5, y = 1.15. Aimed OUT of frame — left and slightly toward the
     viewer — so it reads as watching the yard, not the monitors it feeds.

     CAM_SCALE = 1.6 applied to the whole `camMount` GROUP, not to each part
     individually — "housing, hood, lens, arm, wall plate together," per the
     brief, and a group scale is the one change that guarantees they stay in
     proportion to each other. Every child position/size below is still
     authored in the camera's own pre-scale local units; the group transform
     is what makes them 60% bigger in the world. */
  const CAM_SCALE = 1.6;
  const camMount = new THREE.Group();
  camMount.position.set(-3.5, 1.15, 0.15);
  const AIM_DIR = new THREE.Vector3(-1, -0.05, 0.35).normalize();
  camMount.lookAt(camMount.position.clone().add(AIM_DIR));  // local -Z now points along AIM_DIR
  camMount.scale.setScalar(CAM_SCALE);
  g.add(camMount);

  const wallPlateGeo = new THREE.BoxGeometry(0.14, 0.14, 0.05);
  const wallPlate = new THREE.Mesh(wallPlateGeo, rackM);
  wallPlate.position.set(0, 0, 0.24);
  camMount.add(wallPlate);
  const camArm = new THREE.Mesh(cylGeo, rackM);
  camArm.rotation.x = Math.PI / 2;
  camArm.scale.set(0.035, 0.16, 0.035);
  camArm.position.set(0, 0, 0.15);
  camMount.add(camArm);
  const camHousing = metalBox(0.22, 0.16, 0.28, camHouseM);
  camHousing.position.set(0, 0, 0);
  camMount.add(camHousing);
  const camHood = metalBox(0.15, 0.035, 0.16, camHouseM);
  camHood.position.set(0, 0.09, -0.22);
  camMount.add(camHood);
  const camLens = new THREE.Mesh(lensGeo, camLensM);
  camLens.rotation.x = Math.PI / 2;
  camLens.position.set(0, 0, -0.22);
  camMount.add(camLens);
  /* THE GLINT — "give the lens a visible bright rim... it's the one element
     that explains where the feeds come from." A thin torus around the
     lens's front face, reusing connectorM (no new material spent) so it
     carries the same accent and the same presence-tier always-on ramp as
     every other piece of "the machine is watching" on this card. Torus
     geometry's own axis is already local Z, matching the lens barrel — no
     rotation needed. */
  const rimGeo = new THREE.TorusGeometry(0.078, 0.012, 8, 16);
  const camGlint = new THREE.Mesh(rimGeo, connectorM);
  camGlint.position.set(0, 0, -0.30);
  camMount.add(camGlint);

  // the sight cone — subtle, presence tier, aimed further out along the same
  // axis. Static camera and static cone: aimed once, never re-aimed per
  // frame, the same pattern factorySubject uses for its own fixed cone.
  // The lens tip moves with CAM_SCALE too (child local z=-0.22, half-length
  // 0.08, scaled by 1.6 -> 0.48 along AIM_DIR from the mount's own origin),
  // so the cone apex is derived from CAM_SCALE rather than re-measured by
  // hand — it stays correct if the scale ever changes again.
  const camLensWorld = camMount.position.clone().addScaledVector(AIM_DIR, 0.30 * CAM_SCALE);
  const camConeTarget = camMount.position.clone().addScaledVector(AIM_DIR, 3.4);
  const sightCone = createSightCone();
  sightCone.aim(camLensWorld, camConeTarget, 0.245);   // ~14 degrees, kept narrow
  sightCone.material.userData = { max: 0.09, tier: "presence" };
  own(sightCone.material);
  g.add(sightCone.group);

  /* ---- the traced object — a container silhouette, schematic, ties this
     card to the other three. Body + top/bottom rail + one door-end panel,
     the same asymmetric read the previous version settled on: two symmetric
     rails alone still reads as a ladder/barcode, the off-centre door panel
     is what breaks the repeat. Four instances, one geometry, three materials.

     SECOND PASS AT THE SIZING, not just the colour. At ~40px shipped, a
     rail built at its true schematic proportion (a thin strip near the
     object's edge) is sub-pixel and vanishes regardless of contrast — this
     card's whole failure mode has been "correct in the abstract, invisible
     at the size that ships" (see PERFORMANCE.md's sibling note on this same
     trap for build-cost claims). So the rails are exaggerated well past a
     realistic container's proportions: each now claims 32% of the body's
     height (was 16%), leaving a 36% band of visible body between them
     instead of the old ~68%. The door end goes further still — 34% of the
     width (was 22%) and 85% of the height (was 72%), on its own darkest
     material, so it reads as a solid block at one end rather than a third
     stripe the same weight as the rails. */
  const OBJ_Z = SCREEN_Z + SCREEN_D / 2 + 0.03;   // clear of the recessed glass face
  const MARK_Z = OBJ_Z + 0.02;                     // clear of the body — never coplanar
  function buildContainer(w: number, h: number) {
    const group = new THREE.Group();
    const part = (pw: number, ph: number, x: number, y: number, z: number, mat: THREE.Material) => {
      const m = new THREE.Mesh(objGeo, mat);
      m.scale.set(pw, ph, 0.03);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    };
    const body = part(w, h, 0, 0, OBJ_Z, objectM);
    // rails at 15% of body height EACH (30% combined) — a container is
    // mostly flank, with rails as edges rather than half the object
    const railH = h * 0.15;
    part(w * 0.94, railH, 0, h / 2 - railH / 2, MARK_Z, markM);         // top rail
    part(w * 0.94, railH, 0, -h / 2 + railH / 2, MARK_Z, markM);        // bottom rail
    // door panel inset at one end, flush to the body's edge — 22% of width,
    // 78% of height, not a block spanning the full end
    part(w * 0.22, h * 0.78, w * 0.39, 0, MARK_Z, doorM);
    return { group, body };
  }
  /* Same object, a different framing in every tile it is seen in — position,
     scale, both hand-picked per hop rather than derived, because "the same
     container seen by four different cameras" is a statement about each shot
     being independently composed, not about a formula. */
  const OBJ_SHOTS: { w: number; h: number; x: number; y: number }[] = [
    { w: 0.62, h: 0.28, x: -0.05, y: -0.06 },  // A — establishing, small, off-centre
    { w: 0.70, h: 0.30, x: 0.08, y: 0.04 },    // B — a closer angle
    { w: 0.50, h: 0.22, x: 0.10, y: -0.08 },   // C — a wide, distant camera
    { w: 0.80, h: 0.34, x: -0.05, y: 0.02 },   // D — the closest shot, the conclusion
  ];
  const objInstances = PATH.map((_, i) => {
    const shot = OBJ_SHOTS[i];
    return buildContainer(shot.w, shot.h);
  });
  PATH.forEach(([c, r], i) => {
    const inst = objInstances[i];
    const shot = OBJ_SHOTS[i];
    inst.group.position.set(colX(c) + shot.x, rowY(r) + shot.y, 0);
    inst.group.scale.setScalar(0.001); // grown in by tick(), never zero (a zero scale is a degenerate matrix)
    g.add(inst.group);
  });

  /* ---- the connectors — thin lit lines drawn progressively. Length is
     precomputed once; each frame only writes scale.x. FOUR now, not three:
     camera -> A leads, then A -> B -> C -> D as before — this is brief item
     4, "wire it into the trace": when hop A fires, a connector runs FROM THE
     CAMERA to monitor A, making the whole chain literal (camera sees, feed
     appears, trace follows, detection concludes). connMeshes[i] now lines up
     1:1 with lights[i], so tick() below needs no +1 offset any more. The
     camera leg uses the camera housing's own (x, y), ignoring its z — these
     connectors are flat 2D lines in the wall's own plane, same convention
     the previous three already used. */
  const HOP_POINTS: [number, number][] = [
    [camMount.position.x, camMount.position.y],
    [colX(PATH[0][0]), rowY(PATH[0][1])],
    [colX(PATH[1][0]), rowY(PATH[1][1])],
    [colX(PATH[2][0]), rowY(PATH[2][1])],
    [colX(PATH[3][0]), rowY(PATH[3][1])],
  ];
  const connMeshes: { mesh: THREE.Mesh; len: number }[] = [];
  for (let i = 0; i < HOP_POINTS.length - 1; i++) {
    const [x0, y0] = HOP_POINTS[i];
    const [x1, y1] = HOP_POINTS[i + 1];
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const mesh = new THREE.Mesh(connGeo, connectorM);
    mesh.position.set(x0, y0, 0.09);
    mesh.rotation.z = Math.atan2(dy, dx);
    mesh.scale.set(0.0001, 1, 1);
    g.add(mesh);
    connMeshes.push({ mesh, len });
  }

  /* ---- the ground — unchanged pattern from every other card on the row.
     Kept because the invariant says so, not because this scene needs the
     floor to tell its own story; the wall does that. */
  const dataFloorTex = concreteFloor();
  const dataFloorM = new THREE.MeshStandardMaterial({
    map: dataFloorTex, color: "#ffffff", metalness: 0.05, roughness: 0.92,
    transparent: true, opacity: 0,
  });
  mats.push(dataFloorM);
  const ground = draftingGround({
    size: 34, y: FLOOR - 0.01, step: 1.2, color: GRID_INK, opacity: 0.16,
    surface: dataFloorM,
    vignette: { color: VIGNETTE_C, start: 0.50, end: 1.0 },
  });
  g.add(ground.mesh);

  _deep("data:mats+geom", _t0);

  /* ---- the vision layer — the detection bracket, at the moment the trace
     concludes on D. Reused verbatim from detect.ts; nothing here reinvents
     what a bracket is. */
  const dm = detectMaterials();
  mats.push(...dm.all);
  const det = createTracker(dm.accent);
  g.add(det.group);

  _deep("data:detect", _t0);

  let bracketOn = false;

  return {
    group: g,
    focus: new THREE.Vector3(colX(PATH[3][0]), rowY(PATH[3][1]), 0),
    materials: mats,
    marks: [det],
    ground: {
      setOpacity: (o) => {
        setGroundOpacity(ground, o);
        ground.setSurfaceOpacity?.(o * 0.94);
        ground.setVignetteOpacity?.(o);
      },
    },
    tick: (p) => {
      /* 0.00-0.12  wall powers on
         0.12-0.30  hop 1: tile A lights, object appears
         0.30-0.48  connector A->B draws, tile B lights, object appears
         0.48-0.66  connector B->C draws, tile C lights, object appears
         0.66-0.84  connector C->D draws, tile D lights, object appears,
                    the bracket snaps on near the end of this window
         0.84-1.00  hold on the conclusion
         Every value below is a function of p alone — no state to reset, the
         same discipline the previous version of this card depended on. */
      const power = seg(p, 0, 0.12);
      idleFaceM.opacity *= power;
      contentFaceM.opacity *= power;
      ledDimM.opacity *= power * 0.55;

      const lights = [seg(p, 0.12, 0.30), seg(p, 0.30, 0.48), seg(p, 0.48, 0.66), seg(p, 0.66, 0.84)];
      for (let i = 0; i < 4; i++) {
        const l = lights[i];
        pathMats[i].opacity *= power;
        pathMats[i].color.copy(IDLE_C).lerp(ACTIVE_C, l);
        objInstances[i].group.scale.setScalar(Math.max(0.001, l));
        // the spill: this hop's LED, its rail glow (same material, second
        // mesh) and its bezel tint all ramp with the same `l` — one number
        // driving three reads of "this monitor is the one live right now"
        ledActiveMats[i].opacity *= power * l * 0.9;
        bezelPathMats[i].color.copy(BEZEL_BASE_C).lerp(BEZEL_LIT_C, l);
      }
      for (let i = 0; i < connMeshes.length; i++) {
        const { mesh, len } = connMeshes[i];
        mesh.scale.x = Math.max(0.0001, len * lights[i]);
      }

      // the bracket snaps on in the last 4% of D's window and holds through
      // the loop's final rest — a snap, not a fade, because the conclusion
      // is a discrete event, not a gradual one
      bracketOn = p >= 0.80;
    },
    trackers: (camera) => {
      det.follow(bracketOn ? objInstances[3].body : null, camera);
    },
    /* GEOMETRY NOT DISPOSED HERE, on purpose: `det`'s bracket bars use
       detect.ts's module-shared `_barGeo`, and the sight cone's own volume
       uses detect.ts's module-shared `_coneGeo`/`_poolGeo` — both flagged
       `userData.shared` and never touched by any scene's dispose, or every
       other tracker/cone on the page would break. `deskTop`/`deskFront`/
       `camHousing`/`camHood` all came from `metalBox`, which pools geometry
       by size and is never disposed by a caller either. Everything else
       below (`screenGeo`, `bezelHGeo`, `bezelVGeo`, `ledGeo`, `cylGeo`,
       `lensGeo`, `rimGeo`, `wallPlateGeo`, `objGeo`, `connGeo`) is this
       scene's own plain BoxGeometry/CylinderGeometry/TorusGeometry, built
       once and reused via shared references across every monitor/bar/rail/
       arm/cable instance, so IS disposed here. */
    dispose: () => {
      mats.forEach((m) => m.dispose());
      ground.material.dispose();
      scanTex.dispose();
      sightCone.dispose();
      screenGeo.dispose();
      bezelHGeo.dispose();
      bezelVGeo.dispose();
      ledGeo.dispose();
      cylGeo.dispose();
      lensGeo.dispose();
      rimGeo.dispose();
      wallPlateGeo.dispose();
      objGeo.dispose();
      connGeo.dispose();
    },
  };
}


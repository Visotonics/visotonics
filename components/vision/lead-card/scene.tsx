"use client";

/* ---------------------------------------------------------------------------
   Home lead card — "From the CCTV you already own."

   THE IDEA, taken from the card's own copy:
     "No new hardware. The platform runs on the cameras already watching your
      yard, warehouse and factory."

   So this is not one product demo. It is the WHOLE SITE at once, seen from the
   cameras that are already on it — which is the only honest way to draw "one
   vision layer across the operation". Everything the platform sells is present
   and working simultaneously:

     yard      stacked containers, one located          (Viso Yard)
     gate      a truck crossing under a gantry          (Gate Vision)
     dock      a trailer on a bay, cargo moving         (Cargo Vision)
     warehouse pallets counted on the apron             (Viso Warehouse)
     factory   a line running parts past a head         (Viso Factory)
     people    staff walking the site, resolved         (Work Vision)

   Four camera poles cover it. Each head sweeps its own arc on its own period,
   so the site is never fully observed at one instant and never unobserved
   either — which is the actual claim. Detections attach to whatever a head is
   currently pointing at, so the boxes are a CONSEQUENCE of where the cameras
   are looking rather than decoration on a timer.

   THIS CARD IS DARK AGAIN, like every other scene in the system. It ran on
   LIGHT_SURFACE (#F6F7F8) for a while and the inversion that required — dark
   subjects, 0.5 exposure, a heavy contact shadow — was the single loudest
   complaint about the homepage ("icky, all that white"). It is now keyed
   straight to the page canvas (#0A0B0E) and the flagships' cyclorama, so the
   card has no surface colour of its own left to seam against.

   THE RULE THAT CAME BACK WITH IT: dark means a dark BACKDROP, never a dim
   scene. Everything below moved in ONE direction — backdrop down, subjects and
   exposure UP. If a future edit only does the first half, this card goes murky.
--------------------------------------------------------------------------- */
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createStudio } from "../_vision/studio";
import { mountWhenVisible } from "../_vision/mount";
import { clamp01, easeInOut, lerp, placeCamera } from "../_vision/camera";
import { makeMetal, metalBox } from "../_vision/metal";
import { addGrain } from "../_vision/noise";
import { createTracker, detectMaterials } from "../hero-cards/detect";
import { cardboardSide, containerSide } from "../hero-cards/skins";
import { ROAD_Z, buildRoadway } from "./site";

/** DARK from app/page.tsx — the page canvas this scene is mounted on, not a
    lifted plate colour. Also the placeholder and error-fallback background,
    so it must track the cyclorama's edge stops below: an unbuilt scene
    should look like an empty stretch of the page, not a hole or a seam. */
const CARD_SURFACE = "#0A0B0E";

/* 10, via 15, from an original 22. Every actor in this scene — the gate truck,
   the dock trailer, the line, the walkers, the four camera sweeps — is a
   function of this one period, so shortening it speeds the whole site up
   together and nothing has to be re-choreographed. At 22 the card was a still
   life for most of the time anyone spent looking at it; 15 still read as slow
   against the 8-10s the hero cards run.

   THE LOOP PERIOD IS GONE. The camera is a treadmill — it tracks right
   forever while the site tiles under it — so the scene has no phase, and the
   `p` that used to drive the pan has no readers left. Reduced motion is
   already handled by freezing the clock itself (`t = reduce ? 7 : ...`), which
   is what made the phase redundant rather than merely unused.

   Camera speed is PAN_SPEED; actor speeds live in frame(). Neither derives
   from a period, so there is no single number that makes "the animation"
   faster any more — that is the cost of an endless pan, and it is worth it. */

/* Units per second the camera tracks right. 0.98 keeps the pace the previous
   one-way pan had (7.8 units in 8s) now that the pan never turns around. The
   scene renders at 24fps, so this is ~0.04 units per frame — an order of
   magnitude below anything that would read as stepping. */
const PAN_SPEED = 0.98;
const SETTLE = 1.2;
const GROUND = -1.25;

/* ================= THE TRAFFIC =================

   The truck's run, and WHY THE LOOP DOES NOT EASE.

   The idiom is gate-vision's (LOOP / RUN_FROM / RUN_TO): a vehicle crosses at
   CONSTANT speed from off-frame to off-frame, and the reset happens in the
   gap. Constant is not laziness. An eased run decelerates as it approaches its
   end, which is precisely the frame edge, so the wrap announces itself twice —
   once as a vehicle slowing down for no reason at the edge of shot, and again
   as the next one accelerating out of nothing. Uniform motion has no
   distinguishable moment in it, which is the only thing that makes "one truck
   leaves, the next arrives" survive being looked at.

   The difference from gate-vision is that this scene's camera is a treadmill
   (see below) and never stops moving, so the run is measured RELATIVE TO THE
   CAMERA, not in world space.

     TRUCK_REL   1.55 u/s   speed relative to the camera
     PAN_SPEED   0.98 u/s   the camera's own rightward track
     -> world speed 2.53 u/s, which is what the handoff windows are timed on.

   TRUCK_REL IS A RELATIVE SPEED, NOT A MULTIPLIER, and this is the single
   thing in this file most likely to be "fixed" wrongly by somebody reading it
   quickly. The two readings are:

     ADDITIVE (correct)         world = PAN_SPEED + TRUCK_REL = 0.98 + 1.55
                                      = 2.53 u/s
                                cycle = TRUCK_RUN / TRUCK_REL = 20.4 / 1.55
                                      = 13.16 s
     MULTIPLICATIVE (nonsense)  world = 0.98 * 1.55 = 1.52 u/s, which is SLOWER
                                than the 2.53 the handoff table below is timed
                                on, so every dwell and every overlap in it
                                becomes wrong by a factor of 1.67 while still
                                looking arithmetically tidy.

   The dwell figure the handoff section quotes (10.0 / 2.53 = 3.95 s) is the
   proof: it divides a WORLD window width by a WORLD speed. Change the reading
   and that line stops being true, silently.

   TRUCK_RUN, derived. The framing shows SITE_W / 0.9 = 11.5 / 0.9 = 12.78
   units of x, so the visible half-span is 6.39 — and that is CONSTANT across
   aspects, because `rad` below is solved from SITE_W rather than fixed, so the
   card and the 16:9 lab slot frame the same width of site. The truck's body
   spans -3.5 (trailer/chassis tail) to +3.1 (chassis nose) about its group
   origin. For the wrap to be off-frame at BOTH ends:

     tail must clear the right edge   RUN/2 >= 6.39 + 3.5 = 9.89
     nose must not yet be at the left RUN/2 >= 6.39 + 3.1 = 9.49

   10.2 clears both, so TRUCK_RUN = 20.4 and the cycle is 20.4 / 1.55 = 13.2 s.

   HONEST NOTE ON "NEVER AN EMPTY ROAD". With one vehicle you cannot have both
   an invisible wrap and a permanently occupied road, and the spec asked for
   both. The two constraints are exactly opposed: hiding the wrap requires the
   run to exceed frame + vehicle (18.98 units), and filling the road requires
   it to be less. The gap here is 20.4 - 18.98 = 1.42 units = 0.92 s of empty
   road per 13.2 s cycle — 7% of the time, and gate-vision accepted the same
   trade at 0.35 s. Shortening the run to close it would put the teleport in
   shot, which is the worse failure by a long way.

   WHERE THAT SLACK ACTUALLY SITS, measured off the expression in frame()
   (`camX + (t*TRUCK_REL % TRUCK_RUN) - TRUCK_RUN/2`), which puts the truck's
   GROUP ORIGIN in [-10.2, +10.2) relative to the camera's look-at, and the
   frame edges at +-6.39:

     entry (left)   nose  -10.2 + 2.65 = -7.55  vs  -6.39   ->  1.16 off-frame
     exit  (right)  tail  +10.2 - 3.50 = +6.70  vs  +6.39   ->  0.31 off-frame

   using the VISIBLE BODY (-3.50 tail .. +2.65 cab nose) rather than the bare
   chassis rail, which runs to +3.1 and is a 0.16-tall dark strip nobody can
   pick out at card size. Total slack 1.47, split 1.16 / 0.31.

   IT IS LOPSIDED, AND IT IS LEFT THAT WAY DELIBERATELY. Centring the body in
   the wrap window instead — offset the expression by the body's own centre,
   (-3.50 + 2.65)/2 = -0.425, i.e. `- TRUCK_RUN/2 + 0.425` — would even the two
   out at 0.735 each. That is a real improvement on paper and it is a CHANGE TO
   THE MOTION, not a restoration, so it is not being made here. If anyone does
   make it, 0.31 units at 2.53 u/s is 0.12 s of exit clearance today: thin, but
   the teleport is still off-frame, which is the only thing that has to be
   true. Do not "fix" it by shortening TRUCK_RUN. */
const TRUCK_REL = 1.55;
const TRUCK_RUN = 20.4;

/* ================= THE HANDOFF =================

   Each camera owns a window of the road, +-5.0 units about its own mast. When
   the truck enters that window the camera acquires it — cone brightens,
   bracket lands — tracks it across, and releases as the next one takes over.
   Between times the camera goes back to reading its own patch of the site, so
   no head is ever staring at nothing.

   THE WINDOWS ARE DERIVED FROM THE MAST SPACING, not chosen. Masts sit at
   x = -9.6, -1.6, 6.2, 13.2, so adjacent gaps are 8.0, 7.8 and 7.0, and the
   gap across the treadmill's 27-unit tile boundary (13.2 -> -9.6 + 27 = 17.4)
   is 4.2. A window of half-width 5.0 is 10.0 wide, so every adjacent pair
   OVERLAPS:

     mast pair        gap    overlap   dwell        overlap time
     -9.6 .. -1.6     8.0      2.0     10.0/2.53      2.0/2.53
     -1.6 ..  6.2     7.8      2.2     = 3.95 s       = 0.79 s
      6.2 .. 13.2     7.0      3.0                    0.87 s / 1.19 s
     13.2 .. 17.4     4.2      5.8                    2.29 s

   Every camera therefore holds the truck for 3.95 s — long enough for the cone
   to brighten, the bracket to settle and the eye to accept that THAT camera is
   reading THAT vehicle — and every handoff has both cameras on the target for
   0.79-2.29 s. THE OVERLAP IS THE WHOLE POINT: a gap would read as the system
   losing the truck between cameras, which is the opposite of the claim. A real
   handoff is two cameras holding one target for a moment.

   ACQUIRE_EDGE is the outer 1.0 unit of each window, over which the cone ramps
   up and back down. Without it a camera snaps to full brightness, which reads
   as a cut rather than as acquisition. The bracket appears at 0.25 of that
   ramp so the cone always leads the box: look, then conclude. */
const HANDOFF_HW = 5.0;
const ACQUIRE_EDGE = 1.0;

/* ================= THE DRESSING PASS =================

   Everything below is materials and set dressing. NOTHING in this block
   touches motion: the pan speed, the treadmill wrap, the cone aiming, the
   handoff windows, the tracker pools and every timing are unchanged.

   THE COST RULE THIS CARD RUNS UNDER. It is on the homepage, it builds in
   ~70ms, it runs `noEnv` with no bloom. So every texture here is either
   ALREADY ON THE PAGE or module-cached and generated once:

     containerSide("#9AA0A8")  ZERO new canvases. hero-cards/subjects.ts's
                               `yardSubject` (the homepage YardCard) generates
                               exactly this key and skins.ts caches by key, so
                               whichever of the two cards builds first pays and
                               the other gets the hit. Page total unchanged.
     cardboardSide()           ZERO new canvases, same argument via
                               `warehouseSubject` (the homepage WarehouseCard),
                               which calls `cardboardSide()` untinted.
     trailerPanelMap()         ONE new 512x256 canvas: a fill, one addGrain
                               readback and eight 1px seam pairs. No Sobel.
     LEAD_BLUE_METAL           ONE new albedo canvas, and ONLY that — see the
                               roughness note on the spec below.
     concreteMap() (site.ts)   ONE new 512-square canvas. No Sobel.

   NEVER DISPOSE ANY OF THEM. The skins are shared with the hero cards ON THE
   SAME PAGE and the other two are module-cached across mounts.

   NOTHING NEW JOINS THE TREADMILL, BY CONSTRUCTION. `wrapItems` is built from
   `g.children`, so only TOP-LEVEL children of `g` are wrapped, and the wrap
   writes `o.position.x` on each. Every object this pass adds is a child of
   something that already wraps or already moves — truck parts under `truck`
   (which is `dynamic` and driven from camX), worker parts under their own
   `pr.grp` (also `dynamic`) — and the ground dressing lives in the roadway
   group, which is added to `scene` rather than `g` and rides the camera. So
   `wrapItems` and `tileOwner` are untouched and cannot be got wrong here. */

/* Seeded hash. Math.random is banned in scene content — a body panel that
   re-weathers on every load is a bug you cannot screenshot-diff. */
const h01 = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/* ---- the trailer body skin ----------------------------------------------
   A real box trailer is not a white brick, it is riveted panels, and at card
   size the seams are the entire difference. Same idiom as work-vision's dock
   wall: flat base, addGrain, a run of faint vertical seams.

   THE CANVAS IS UNIFORM IN v, DELIBERATELY. A RoundedBoxGeometry has ONE
   material group (documented in hero-cards/subjects.ts), so this single map
   goes on all six faces including the roof and the ends. Anything with a
   vertical gradient in it — a road-spray band along the bottom, a top rail —
   would land as a stripe across the middle of the roof. Seams and grain only,
   constant in v, so every face is correct whichever way it is turned.

   THE BASE IS #B8BDC4 AND THE TINT PULLS IT BACK TO THIS SCENE'S CEILING.
   The value note above puts nothing in this card over #A6AEBA, so white is
   reserved for genuine speculars. `color` multiplies `map` in linear space,
   so the tint is solved backwards from the finished value rather than picked:

     base   #B8BDC4 = (184,189,196) -> linear (0.479396,0.508958,0.552122)
     target #A6AEBA = (166,174,186) -> linear (0.381372,0.423287,0.490937)
     tint   = target / base         =  linear (0.795525,0.831674,0.889182)
                                    ->  sRGB  (231,235,242) = #E7EBF2

     check, forwards through the exact tint hexes actually used:
       231 -> lin 0.795527 x 0.479396 = 0.381373 -> sRGB 0.650981 x255 = 166 ok
       235 -> lin 0.831766 x 0.508958 = 0.423334 -> sRGB 0.682428 x255 = 174 ok
       242 -> lin 0.889106 x 0.552122 = 0.490895 -> sRGB 0.729384 x255 = 186 ok

     (The three tint channels round to whole bytes, so the finished panel is
     #A6AEBA to the digit on R and within a quarter of a byte on G and B.)

   So a flat panel renders at exactly #A6AEBA, the value `paleTone` already
   held, and the seams and grain are modulation either side of it. The trailer
   gets a surface without the card gaining a new brightest thing. */
const TRAILER_MAP_BASE = "#B8BDC4";
const TRAILER_TINT = "#E7EBF2";
/* 8 seams across the canvas. On the 4.6-long truck trailer that is a 0.575
   panel pitch and on the 3.6 docked trailer 0.45 — both in the range a real
   box trailer's side panels run. The 1.15-deep ends get the same eight over
   1.15, which is dense, and it is accepted: this camera never sees a trailer
   end at more than a few dozen pixels. */
const TRAILER_SEAMS = 8;
let trailerMapCache: THREE.Texture | null = null;
function trailerPanelMap(): THREE.Texture {
  if (trailerMapCache) return trailerMapCache;
  const W = 512, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  /* willReadFrequently — addGrain is a getImageData round trip and without
     the hint it stalls on the GPU behind the live scenes' frames. */
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.fillStyle = TRAILER_MAP_BASE;
  x.fillRect(0, 0, W, H);
  /* 10 on a light base. The dark-base rule from work-vision's wall (drop the
     amplitude with the base, because symmetric byte noise is a net LIFT in
     linear light once the base is near black) runs the other way here: this
     base is bright, the bias is negligible, and the grain is what stops a
     4.6-unit flat panel reading as vinyl. */
  addGrain(x, W, H, 10);
  /* The seam itself: a 1px line of shadow with a 1px lit lip beside it, which
     is what a lapped panel joint looks like from any angle that is not
     straight on. Alpha 0.20/0.09 — subtle by intent, the brief for this body
     is "reads as a trailer", not "reads as corrugation". */
  /* THE SEAM WAS DOUBLED, AND WIDENED — AND THE WIDTH IS THE PART THAT
     ACTUALLY MATTERED. Reviewed on screen the sides still read as blank
     bright planes, and the reason a 1px line at 512 disappears on a 4.6-unit
     trailer seen from ~9 units is not that it is too pale: it is that it is
     SUBPIXEL, so the mip chain averages it into the base before it ever
     reaches the eye. Darkening a line the renderer has already blurred away
     buys almost nothing. So the joint is now five texels wide instead of two:

       core      2px at alpha 0.40  (was 1px at 0.20)
       shoulder  1px at alpha 0.18 either side of the core
       lit lip   2px at alpha 0.10  (was 1px at 0.09)

     Rendered on the trailer, the core lands at 108 against the flat panel's
     166 — a 58-step delta where the old one was 29. Both numbers checked
     numerically through the real sRGB<->linear transfer.

     KNOWN CONSEQUENCE, FLAGGED RATHER THAN HIDDEN: this map is shared with
     the dock building (`dockClad`), so its seams strengthen too — the core
     renders at 10 against that wall's 21. Work-vision's wall note warns that
     is about as far as a seam can go "before the wall reads as tiled
     cladding". Here that is arguably correct rather than wrong: the dock is a
     shed, and a shed IS profiled sheet. If it reads as slots cut in the wall,
     the fix is a second low-contrast canvas for the dock alone, not backing
     this off — the trailer is what needed it. */
  const pitch = W / TRAILER_SEAMS;                      // 64
  for (let i = 0; i < TRAILER_SEAMS; i++) {
    const u = Math.round(i * pitch);
    x.fillStyle = "rgba(24,28,34,0.18)";
    x.fillRect(u - 1, 0, 1, H);
    x.fillStyle = "rgba(24,28,34,0.40)";
    x.fillRect(u, 0, 2, H);
    x.fillStyle = "rgba(24,28,34,0.18)";
    x.fillRect(u + 2, 0, 1, H);
    x.fillStyle = "rgba(255,255,255,0.10)";
    x.fillRect(u + 3, 0, 2, H);
  }
  /* Eight faint vertical wash streaks, seeded. Constant in v like everything
     else here, so they are safe on the roof and the ends. */
  for (let i = 0; i < 8; i++) {
    const sx = Math.round(h01(i * 5 + 3) * W);
    const sw = 1 + Math.round(3 * h01(i * 5 + 4));
    x.fillStyle = `rgba(24,28,34,${(0.03 + 0.05 * h01(i * 5 + 5)).toFixed(3)})`;
    x.fillRect(sx, 0, sw, H);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  trailerMapCache = t;
  return t;
}

/* ---- the cab's paint ------------------------------------------------------
   The house's site blue as real painted metal, the same spec work-vision's
   racking runs (`RACK_BLUE_METAL`). Copied BY VALUE rather than imported —
   work.ts is out of this file's scope and metal.ts's cache is keyed on the
   spec, so a matching spec is a cache hit wherever the two ever share a page.

   ROUGH IS 0.60 HERE, NOT WORK'S 0.55, AND THAT IS A DELIBERATE DEVIATION
   WITH A MEASURED REASON. Work-vision is NOT on the homepage (the page loads
   the lead card plus the four hero cards), so nothing has warmed a
   `painted|0.55` roughness canvas and asking for it would cost a fresh 512
   canvas PLUS a full Sobel normal derivation — metal.ts records the Sobel
   alone at ~15ms, which is a fifth of this card's entire 70ms build for a
   1.5-unit cab. metal.ts keys the roughness canvas and the normal map on
   `kind|rough` only (rough quantised to 0.05) and the ALBEDO on `base|kind`.
   This scene's own `dark` is already `painted` at rough 0.6, so at 0.60 the
   cab reuses that roughness canvas AND that normal map and pays for one
   albedo canvas and nothing else. 0.55 vs 0.60 painted is invisible at any
   size; 15ms on the homepage is not.

   If work-vision is ever put on this page, change this to 0.55 and both
   become one cache entry. */
const LEAD_BLUE_METAL = { base: "#2C4A73", kind: "painted", metalness: 0.35, rough: 0.60 } as const;

/* ---- the container livery -------------------------------------------------
   The site had no colour anchor at all. It does have containers — the four
   two-high stacks in the yard bay — so the anchor is skinned onto what is
   already there rather than added as new geometry.

   TINTS ARE SOLVED BACKWARDS FROM THE WANTED ALBEDO, because `color`
   multiplies `map` in linear space and `containerSide` is baked at the
   neutral #9AA0A8 the hero cards share. Authoring the tint AS the wanted blue
   is the exact mistake yard-vision documents having made in the other
   direction, and the multiply is severe: #3A5C8A over this map lands at
   (32,54,86), which on the lite rig is a hole, not a container.

     map    #9AA0A8 = (154,160,168) -> linear (0.323137,0.351524,0.391605)

     LIVERY A, RE-SOLVED. The first pass aimed A at (56,88,128) against B's
     (40,66,100), which is only 1.33x apart per channel — reviewed on screen,
     the two liveries were indistinguishable and the checker pattern did
     nothing. The separation is now an EXACT 1.6x per channel, which is the
     term that was actually wrong; B is untouched, because B is the value that
     had to stay clear of the backdrop and moving both ends would just
     re-collapse the pair somewhere else.

       wanted A = 1.6 x B = (64,106,160)   64/40 = 1.600
                                          106/66 = 1.606
                                          160/100 = 1.600
       R  64 -> lin 0.051278 / 0.323137 = 0.158688 -> sRGB 0.434962 x255 = 111
       G 106 -> lin 0.144160 / 0.351524 = 0.410100 -> sRGB 0.672693 x255 = 172
       B 160 -> lin 0.351524 / 0.391605 = 0.897649 -> sRGB 0.953604 x255 = 243
       tint = (111,172,243) = #6FACF3

     STILL UNDER THE OVERLAY ON EVERY CHANNEL, which is the one hard ceiling
     yard-vision sets for cargo: (64,106,160) vs #5CC8FF = (92,200,255). A
     container that out-brightens the accent breaks the only scene where the
     blue proposal and the conclusion share a shot.

     LIVERY B, wanted albedo (40,66,100) — the darker box in each pair, so a
     stack reads as two containers and not one tall one:
       R  40 -> lin 0.021219 / 0.323137 = 0.065666 -> sRGB 0.284225 x255 =  72
       G  66 -> lin 0.054417 / 0.351524 = 0.154802 -> sRGB 0.429921 x255 = 110
       B 100 -> lin 0.127440 / 0.391605 = 0.325430 -> sRGB 0.605833 x255 = 154
       tint = (72,110,154) = #486E9A

   THE TINTS LOOK TOO PALE WRITTEN DOWN AND THAT IS THE POINT — they are
   divisors, not colours. What renders is (56,88,128) and (40,66,100). */
const LIVERY_A = "#6FACF3";
const LIVERY_B = "#486E9A";
/** The neutral base the hero cards already generated. Must match
    `subjects.ts`'s NEUTRAL exactly or the cache misses and the page pays for
    a second 1024x420 canvas. */
const SKIN_NEUTRAL = "#9AA0A8";

/* ---- the workers ----------------------------------------------------------
   At 20-40px tall a walker is a silhouette and two colour patches. Limbs are
   not attempted and must not be: work-vision's rigged figure exists for a
   camera 7 units away, and this one is thirty.

   Both hexes are the house's AUTHORED-HALF values (work-vision's `m.vest` and
   `m.helmet`): a real hi-vis #F0641A and a real hard-hat yellow blow out
   under tone mapping and read as emissive tabs rather than as clothing.

   ONE CAVEAT FOR WHOEVER LOOKS AT THIS FIRST. Those values were authored
   against work-vision's FULL five-source rig at exposure 1.18. This card runs
   `lite` (key, rim, hemisphere) at 0.98, so they will land DARKER here. They
   are used unchanged rather than pre-compensated because the correction is a
   look call and belongs to whoever screenshots this — if the vests read
   muddy, these two constants are the whole fix and nothing else moves. */
const VEST_ORANGE = "#B85413";
const HELMET_YELLOW = "#C9A227";

/* ---- camera housings ------------------------------------------------------
   Plain, unmapped, per the same critique work-vision's heads got: a moulded
   camera housing is smooth painted plastic over die-cast, and putting the
   scene's mapped `painted` metal on it made a 0.5-unit box look like a chip
   of asphalt. No maps at all — this is also three fewer texture fetches on
   four heads' worth of small geometry. */
/* #262C34, UP FROM #1A1E24. Reviewed, the heads read as black voids: they sit
   on top of 4.6-unit masts facing whichever way their target is, so for most
   of the pan they face AWAY from the `lite` rig's single key at (2.5,6.5,4.5)
   and there is no fill on this card to catch the shadow side. #1A1E24 was
   picked as a housing colour on the assumption it would be lit; unlit it is
   below the backdrop's glow pool and the head disappears. (38,44,52) is ~3x
   the backdrop mid and still the darkest solid on the mast, so the value
   ORDER is unchanged — it just stops being a hole. */
const HOUSING = "#262C34";
/** The lens. Small, and the one bright thing on the head — a camera reads as
 *  a device because of its glass, not its box. */
const LENS_R = 0.055;

/* ---- the dock building's cladding ---------------------------------------
   NO NEW CANVAS, AND NOT A CLONE EITHER — the SAME `trailerPanelMap()`
   texture with a second material at a darker tint. This was the choice the
   round asked me to state, so here is the reasoning in full.

   A clone was the obvious answer and it is the wrong one: `Texture.clone()`
   shares the image and only lets `repeat`/`offset` differ, so it cannot
   change the base value at all — the darkening has to come from
   `material.color` either way, and once it does, the clone buys nothing. A
   third canvas at a genuinely dark base was the other option and it is what
   work-vision does; it is not worth 512x256 of canvas plus a grain readback
   here, because this wall is 6.0 x 2.6 seen at ~13.5 units through 31% fog.

   THE TINT IS SOLVED BACKWARDS, same method as everything else in this file:

     base   #B8BDC4 = (184,189,196) -> linear (0.479396,0.508958,0.552122)
     target #151A21 = ( 21, 26, 33) -> linear (0.007488,0.010325,0.015208)
     tint   = target / base         =  linear (0.015619,0.020287,0.027545)
                                    ->  sRGB  ( 34, 39, 46) = #22272E

   DOES THE SEAM SURVIVE A DIVISOR THAT SEVERE? Checked, because work-vision's
   wall note is explicit that a seam which stops reading must be LIFTED rather
   than the base raised — and a tint gives me no way to lift it, so if this
   failed the answer would have been a third canvas after all.

     seam pixel = 0.20 alpha of (24,28,34) over (184,189,196) = (152,157,164)
     a multiply preserves the ratio to the base, so it renders at
       seam (16,20,26)   against the wall's own (21,26,33)
     and the 0.09 white lip pixel (190,195,201) renders at
       lip  (22,27,34)   against the same (21,26,33)

   Five to seven steps of shadow and one to two of highlight, on a near-black
   wall — the same order work-vision's own wall runs (alpha 0.35 on #101318).
   It reads, so the third canvas is not needed.

   (Every figure in this note and in the two tint derivations above was
   checked numerically through the real sRGB<->linear transfer, not estimated
   — including the 2.4-exponent segment and the linear toe.) */
const DOCK_TINT = "#22272E";

/* ---- the horizon --------------------------------------------------------
   Near-black, unmapped, and it is meant to be nearly invisible: at z = -13
   the fog has it ~69% of the way to the backdrop, so #0B0E13 = (11,14,19)
   renders at about (10,12,16).

   THAT IS NOT A MISTAKE, AND IT IS WHY IT WORKS AT ALL. This card's backdrop
   carries a `glow` pool (#151C26) that peaks around (22,26,35) exactly where
   these masses sit — the shader aims it at normalize(-0.1, 0.16, -1.0), i.e.
   behind the subject and slightly up. A silhouette at (10,12,16) in front of
   a (22,26,35) pool is a clean dark cut-out, which IS what a distant roofline
   looks like at night. The scene's own fog note already identified this case
   ("a fully fogged object crossing the pool ... is faintly visible as a dark
   patch") as a hazard for a prop parked at the far plane; here it is the
   mechanism, deliberately used. If the band ever reads as too strong, move it
   FURTHER (more fog), not darker — it is already near the floor. */
/* #1B2028, UP FROM #0B0E13. Reviewed, the band read as flat paper cutouts:
   uniform dead black with a crisp rectangular edge against the glow pool,
   which is what a silhouette looks like when it is FURTHER from the fog than
   the thing behind it. A real distant roofline is not black, it is the fog
   with a building faintly in it.

   SOLVED AS A SCALE ON THE ALBEDO, which is the only term that moved — the
   fog band, the depth and the lighting are all untouched, so the rendered
   value scales with the albedo's LINEAR value above the fog floor:

     rendered = (1 - f) x shaded + f x fogColour,  f ~ 0.69 at z = -13

   The old albedo rendered at about (10,12,16) against a fog floor of
   (10,11,14) — i.e. almost all of what you saw WAS the fog, which is exactly
   why it read as a hole rather than as a building. Lifting the albedo's
   linear value by 3.3x lifts the part that is not fog by the same factor:

     #0B0E13 = (11,14,19) -> linear x 3.3 -> sRGB (27,32,40) = #1B2028

   VERIFIED, not estimated. Solving the lit gain backwards from the old
   albedo's observed (10,12,16) and re-running the same fog lerp forwards
   gives the new band at (16,20,26) — the requested (16,19,26) to within one
   step on green.

   IT STILL SITS UNDER THE GLOW POOL's (22,26,35) on every channel, so the
   roofline still reads as a dark mass against a lifted sky. It is just no
   longer a cut-out. */
const HORIZON_TONE = "#1B2028";
const HORIZON_Z = -13;
const HORIZON_D = 1.6;
/* [x, width, height, towerW, towerH, towerDX]. Depth is common; height is
   measured up from GROUND; a towerW of 0 means no tower.

   THE SPANS ARE CHAINED WITH DELIBERATE OVERLAP so that the union is
   continuous across the treadmill's 27-unit period — each mass wraps to its
   OWN nearest copy (no tileOwner), so the band is the union of seven
   period-27 lattices and it can only be gap-free if this chain is:

     -14.8..-8.4  -8.7..-4.5  -4.7..-0.1  -0.4..4.8  4.6..9.0  8.7..13.3
     12.9..15.9   then mass 1 + 27 = 12.2..18.6 picks it up

   Every join overlaps by 0.2-0.4 and the chain is 30.7 long against a period
   of 27, so it laps itself. THE x AND w COLUMNS ARE UNCHANGED by the roofline
   pass for exactly this reason — only the heights and the towers moved, and
   neither touches the chain. Change an x or a w and re-do it.

   HEIGHTS ARE ALL x0.85, so ~15% less crisp edge meets the glow pool:
     3.2 -> 2.72   4.4 -> 3.74   2.7 -> 2.30   3.8 -> 3.23
     2.9 -> 2.47   4.6 -> 3.91   3.1 -> 2.64

   THREE OF THE SEVEN GET A STEPPED TOWER — the three tallest, so the varied
   ones are the ones whose skyline you actually see. A roofline is a stair
   core, a plant room and a parapet, not a row of rectangles; one stepped box
   is the cheapest thing that says so. Each tower's x offset keeps it wholly
   inside its parent's footprint:

     mass 1  half-width 2.10, tower half 0.75 at dx -0.9 -> -1.65..-0.15  ok
     mass 3  half-width 2.60, tower half 0.90 at dx +1.1 ->  0.20.. 2.00  ok
     mass 5  half-width 2.30, tower half 0.65 at dx -0.7 -> -1.35..-0.05  ok */
const HORIZON: readonly (readonly [number, number, number, number, number, number])[] = [
  [-11.6, 6.4, 2.72, 0, 0, 0],
  [-6.6, 4.2, 3.74, 1.5, 0.70, -0.9],
  [-2.4, 4.6, 2.30, 0, 0, 0],
  [2.2, 5.2, 3.23, 1.8, 0.55, 1.1],
  [6.8, 4.4, 2.47, 0, 0, 0],
  [11.0, 4.6, 3.91, 1.3, 0.80, -0.7],
  [14.4, 3.0, 2.64, 0, 0, 0],
] as const;

/* ---- the high masts -----------------------------------------------------
   The upper half of frame was empty black. This is an outdoor yard at night
   so there is no roof to enclose it with; what a real yard has up there is
   high-mast floodlighting, and three of them at 7.0 units put something in
   the top third at every pan position.

   HEIGHT 7.0, SOLVED AGAINST THE FRAMING RATHER THAN PICKED. The camera sits
   at rad * 0.30 = 2.80 high on the desktop card (rad 9.34) with a 30deg
   vertical fov, so the half-height of the frustum at the masts' depth
   (~14.8 units out) is 14.8 x tan(15deg) = 3.97, and the visible band there
   runs roughly world y 0 .. 6, i.e. GROUND + 1.25 .. GROUND + 7.25. A mast
   top at GROUND + 7.0 lands just inside the top edge; at 8.2 it was cropped,
   and a cropped mast reads as a mistake rather than as height. Mobile (rad
   17.88) frames everything smaller, so 7.0 is safely inside there too.

   X POSITIONS are spread across the 27-unit period and kept away from the
   four camera masts (-9.6, -1.6, 6.2, 13.2) so the two kinds of pole never
   line up and read as one confused structure:

     -11.8 -> -3.4   8.4
      -3.4 ->  9.4  12.8
       9.4 -> 15.2   5.8   (= -11.8 + 27)
                    ----
                    27.0

   Nearest approach to a camera mast is 9.4 vs 6.2 = 3.2 units.

   Z = -6.2 puts them BEHIND the container row (z -3.2, back face -3.75) and
   behind the dock wall (-4.85), in front of the horizon (-13) — a third depth
   plane, and ~37% fogged, so they recede without disappearing. */
const MAST_X = [-11.8, -3.4, 9.4] as const;
const MAST_Z = -6.2;
const MAST_H = 7.0;

/* THE HALO IS NOT A LIGHT. No THREE.Light is added by this pass — this card
   runs `noEnv` with no bloom and a 70ms build, and three more lights would be
   a per-frame cost for a blob 40px across. It is the lamp module's IDIOM
   only: a small additive billboard with a radial alpha falloff.

   `buildPendantLamp` was checked for reuse and rejected on the round's own
   terms — it is lamp.ts's ONLY export and it builds a shade, a cord, a bulb,
   a volumetric beam AND a real THREE.PointLight as one unit, so importing it
   would drag the full pendant in to get one quad.

   IT DOES NOT PULSE. Its opacity is `HALO_PEAK * solid` and `solid` is the
   intro ramp, which reaches 1 and stays there. */
const HALO_WARM = "#FFC98A";
/* ---- THE HALO WAS INVISIBLE, AND BOTH TERMS WERE WRONG ----
   Reviewed at two framings: no halo at all, and the masts read as bare
   flagpoles with boxes on them. A light that emits nothing is clutter, so
   this is now sized and weighted to actually read.

   SIZE 1.9 -> 3.2. The halo hangs at ~14.8 units from the lens on the
   desktop card, where the frustum is 2 x 14.8 x tan(15deg) = 7.93 units tall.
   On a ~200px-tall card slot that is ~25px per world unit, so the old 1.9
   quad drew ~48px across — but the alphaMap is a smoothstep ramp, so its
   READABLE core (alpha > 0.5) is only about a third of that, ~16px, and at
   0.22 peak through 37% fog that core was a barely-there smudge. 3.2 draws
   ~80px with a ~27px core, which is a glow rather than a pixel.

   PEAK 0.22 -> 0.38, solved rather than nudged. Additive and toneMapped
   false, so the arithmetic is exact: at 37% fog the surviving fraction is
   0.63, and the centre adds

     0.63 x 0.38 x (255,201,138) = (61,48,33)

   over the backdrop's (10,11,14), landing at (71,59,47). That is ~5x the
   backdrop and clearly a warm source, while staying well under the #5CC8FF
   overlay's (92,200,255) so a lamp can never out-shout a detection.

   STILL DOES NOT PULSE: `HALO_PEAK * solid`, and `solid` reaches 1 at SETTLE
   and stays. */
const HALO_SIZE = 3.2;
const HALO_PEAK = 0.38;

/* ---- AND THE LIGHT HAS TO LAND SOMEWHERE ----
   The second half of the same defect: a mast with a glow at the top and
   nothing beneath it is a lamp in a vacuum. One soft elliptical pool per
   mast, on `csTex` — the SAME ramp the truck's decal and the workers' pucks
   already use, so this costs no texture.

   ELLIPTICAL BY THE PLANE'S ASPECT, exactly as the truck's contact shadow
   does it: one square ramp serves, and 4.0 x 2.4 is the footprint a pair of
   floods 6.8 units up throws across a slab — long across the mast's arm,
   shorter fore-and-aft.

   PEAK 0.12. Additive over the #191D22 slab (25,29,34) at ~40% fog:
   0.60 x 0.12 x (255,201,138) = (18,14,10), landing at (43,43,44). A warm
   lift of about 18 values on the concrete — present, and nowhere near strong
   enough to compete with the road paint or the lane lines. */
const POOL_W = 4.0;
const POOL_D = 2.4;
const POOL_PEAK = 0.12;

/* Shared by both kinds of pole. A mast that meets the slab with nothing on it
   reads as pushed into the ground; a grouted plinth is what a real one has,
   and it is also the cheapest possible contact cue on a card with no shadow
   light. Slightly conical (wider at the bottom) because a plinth is poured. */
const FOOT_R_TOP = 0.30;
const FOOT_R_BOT = 0.34;
const FOOT_H = 0.10;

export default function LeadCardScene() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    return mountWhenVisible(wrap, (el) => {
      try {
        const studio = createStudio(el, {
          floorY: GROUND,
          shadowExtent: 22,
          spread: 2.2,
          /* 0.98, up from 0.5 — the same exposure yard-vision runs, which is
             the closest flagship analogue (a wide site seen from a distance on
             the "lite"-equivalent read). 0.5 existed only to stop pale subjects
             clipping against a near-white card; with the ground gone black the
             constraint inverts and the subjects have to carry the frame.

             EXPOSURE DOES NOT TOUCH THE BACKDROP. The cyclorama is a raw
             ShaderMaterial writing gl_FragColor directly (see studio.ts), so it
             gets none of three's tone-mapping chain — raising this brightens
             the SUBJECTS only and leaves the backdrop hexes below exactly where
             they are authored. That is what makes "bright subjects on dark
             ground" reachable with one number. */
          exposure: 0.98,
          bloom: false,
          shadowMapSize: 1024,
          noEnv: true,
          lightRig: "lite",
          maxDpr: 1.5,
          /* THE FLAGSHIPS' CYCLORAMA. ALL THREE RAMP STOPS ARE #0A0B0E — the
             page canvas colour, not a lifted plate colour. This card no
             longer has a surface of its own to be lifted above: the section
             behind it is DARK (#0A0B0E) with no DARK_SURFACE panel in between,
             so the top edge of the frame has to be the SAME pixel as the
             section or the seam is exactly where a flat-vs-lifted mismatch
             used to show. Do not relift `top` or `mid` for contrast against
             the page — that reintroduces the seam this fixed.

             `glow` stays lifted: it is a soft radial pool behind the subject,
             not an edge value, and keeps the subject off dead flat black.
             GLOW ARITHMETIC. The shader adds cGlow*g*0.55 at the pool's
             centre, so #151C26 = (21,28,38) contributes (12,15,21) over
             mid #0A0B0E = (10,11,14), peaking at (22,26,35) = #161A23. That
             is ~2-3 steps above the floor: a readable cool pool, smaller than
             the old #1E2836/#0E1015 pairing gave (which peaked ~3 steps above
             a lifted #0E1015 floor) because the floor itself dropped — the
             pool is now measured against page-black instead of a lifted mid,
             so it still reads as a distinct glow without needing to be any
             brighter. */
          backdrop: { top: "#0A0B0E", mid: "#0A0B0E", bottom: "#0A0B0E", glow: "#151C26" },
        });
        const { camera, scene, shadowMat, renderer } = studio;

        /* ---- DEPTH ----
           The card had no depth cue at all: the dock wall four units behind
           the road rendered at exactly the same value as the truck in front of
           it, so the whole site sat on one plane.

           Fog, in the page canvas colour, so it is literally the backdrop
           creeping forward. NEAR AND FAR ARE SET PER FRAME from the camera's
           own solved distance (`rad`), not hardcoded — see the frame loop.
           They cannot be constants here because `rad` is solved from the
           aspect ratio, and this card is ~2.55:1 on the desktop homepage,
           16:9 in the lab and 4:3 on mobile. A fog tuned for a 9.3-unit
           standoff turns the 17.9-unit mobile framing into grey soup.
           Constructed with placeholders; the first frame overwrites them.

           IT CANNOT FIGHT THE CYCLORAMA. The backdrop is a raw ShaderMaterial
           writing gl_FragColor directly, so it takes no part in tone mapping
           and no part in fog, and all three of its ramp stops are #0A0B0E —
           the exact value below. So a surface fogged to 100% is the same pixel
           as the backdrop behind it and the transition is seamless by
           construction rather than by eye. The one thing to watch is the
           `glow` pool (#151C26, peaking ~#161A23): a fully fogged object
           crossing the pool goes #0A0B0E against a slightly lifted backdrop
           and is faintly visible as a dark patch. Nothing in this scene ever
           reaches full fog — see the numbers in the frame loop — so it does
           not arise, but a future prop parked at the far plane would show it. */
        scene.fog = new THREE.Fog(0x0a0b0e, 8, 30);

        /* THE ROAD AND THE FLOOR. Added to `scene`, deliberately NOT to `g`:
           `g`'s children are swept up by the treadmill's wrapItems list and
           tiled by PERIOD, and these two ride the camera continuously instead
           (see site.ts). Building them first also puts them at the bottom of
           the transparent stack, which is where a floor belongs. */
        const roadway = buildRoadway(GROUND);
        scene.add(roadway.group);

        /* THE SHADOW CATCHER MUST NOT WRITE DEPTH. This one line is what makes
           the road visible at all, so do not delete it as tidying.

           `createStudio` parks a 60x60 ShadowMaterial plane at exactly
           `floorY`, and three's ShadowMaterial is `transparent` but leaves
           `depthWrite` at its default TRUE. The road and its markings are
           coincident planes a few millimetres BELOW that catcher (they have to
           be, or they would cover the shadows), so with depth writing on, the
           catcher's draw would punch them out of the depth buffer on any frame
           the transparent sorter happened to order it first — and it would,
           because the sorter keys on distance from camera and the catcher's
           centroid is pinned to the world origin while camX runs away from it
           forever. Turning depth writing off leaves `renderOrder` (set in
           site.ts) as the single authority on that stack.

           FINDING, WORTH KNOWING BEFORE ANYONE TUNES `shadowMat.opacity`:
           THIS CARD HAS NO CAST SHADOWS AND NEVER HAS. The `lite` light rig
           this scene asks for is a key, a rim and a hemisphere, and NOT ONE OF
           THEM SETS `castShadow` — the shadow-casting directional light exists
           only in the `full` branch of createStudio. So `shadowMapSize: 1024`
           above, every `castShadow = true` on the meshes below, and the
           `shadowMat.opacity = solid * 0.45` line in the frame loop are all
           inert on this card. That is a pre-existing condition, not something
           this change caused, and it is left exactly as it is: switching a
           shadow light on here is a lighting decision with a real per-frame
           cost, and it belongs to whoever owns this card's look, not to a
           change about the ground.

           THE TRUCK IS NOW HANDLED, AND NOT BY THIS. It has a FAKE contact
           shadow — a soft alphaMapped ellipse riding under it, see "THE
           TRUCK'S CONTACT SHADOW" below. So `shadowMat.opacity` remains inert
           and tuning it will still do nothing; the number to tune is CS_PEAK.
           Nothing else in the scene has a shadow of any kind yet.

           (Because there is no shadow light, no catcher-follow code is needed
           either — a 60x60 plane at the origin that receives nothing does not
           care that the camera has driven off the end of it. If a shadow light
           is ever added, BOTH the catcher and the light's target will have to
           be slid with camX or shadows will stop about twenty-two seconds in,
           when the unbounded camera leaves the +-22 shadow camera behind.) */
        shadowMat.depthWrite = false;

        const mats: THREE.Material[] = [];
        const metals: { dispose: () => void }[] = [];
        const met = (base: string, kind: Parameters<typeof makeMetal>[0]["kind"], m: number, r: number) => {
          const x = makeMetal({ base, kind, metalness: m, rough: r });
          metals.push(x);
          mats.push(x.material);
          return x.material;
        };
        const plain = (color: string, rough = 0.95) => {
          const m = new THREE.MeshStandardMaterial({
            color, metalness: 0.05, roughness: rough,
            transparent: true, opacity: 0, envMapIntensity: 0.15,
          });
          mats.push(m);
          return m;
        };

        /* LIT BODIES ON A DARK GROUND, like every other scene here. Five values
           of one slate so the site still reads as one place.

           ONLY THE TWO DARK CONSTANTS MOVED. paleTone / boxTone / midTone were
           already sitting in the #9AA0A8-#C2C9D3 band the dark flagships light
           their cargo in (makeMetal's neutral base is #9AA0A8), so on a black
           ground they separate as they are — and with exposure nearly doubled
           (0.5 -> 0.98) lifting them as well would push #C2C9D3 into the ACES
           roll-off and cost the containers their corrugation shading.

           `dark` and `steel` are the ones that broke. They were picked to be
           the darkest thing in a near-white frame — the strongest read on paper
           — and on #0E1015 they were the WEAKEST: chassis, wheels, pallets, the
           belt, the camera heads and every walker went to silhouette, and the
           masts (0.14 units wide) disappeared entirely.

             dark  #232833 = (35,40,51)  -> #4E5661 = (78,86,97)
             steel #3B4351 = (59,67,81)  -> #78828F = (120,130,143)

           Both are now well clear of the backdrop mid (14,16,21) — ~5.5x and
           ~8x its luminance — while staying below midTone (#9AA3B0), so the
           value ORDER of the site is unchanged: structure reads darker than
           cargo, it just no longer reads as a hole. Neither is black, per the
           rule that structural steel is never a silhouette. */
        /* THE TOP OF THE RANGE CAME DOWN. The previous pass fixed the bottom —
           `dark` and `steel` were lifted off silhouette when the card went dark
           — and left the top where it was, so the image ran from near-black
           straight to near-white with almost nothing in between. That is why it
           read as a clay render: a value range with no middle is what an unlit
           matcap looks like.

           Three surfaces move, all downward, and the ORDER IS PRESERVED
           exactly (dark < steel < mid < box < pale) so the site's value
           grammar — structure darker than cargo — is untouched:

             midTone  #9AA3B0 = (154,163,176) -> #8A939F = (138,147,159)
             boxTone  #AAB3C0 = (170,179,192) -> #949DA9 = (148,157,169)
             paleTone #C2C9D3 = (194,201,211) -> #A6AEBA = (166,174,186)

           28 steps off the top, 16 off the middle. Nothing is now above
           #A6AEBA, so white is reserved for what it should be: specular
           highlights on the brushed steel, which the ACES curve rolls in on
           its own and which are the only genuine whites a lit scene has.

           `dark` and `steel` are DELIBERATELY UNCHANGED at #4E5661 and
           #78828F. They were fixed for exactly this ground one pass ago and
           lowering the top is what closes the gap to them — moving both ends
           toward each other would collapse the range rather than centre it.
           Two new mid-band surfaces also arrive with the road (#15181D
           asphalt, #7E8794 paint, see site.ts), and the asphalt is now the
           scene's darkest large area, which is what lets the whites come
           down without the image going flat. */
        const dark = met("#4E5661", "painted", 0.3, 0.6);
        const steel = met("#78828F", "brushed", 0.7, 0.45);
        const midTone = plain("#8A939F");
        /* `paleTone` (#A6AEBA) IS GONE TOO, and for the same reason `boxTone`
           went: every one of its consumers now has a real surface. The
           trailers and the docked box took `trailerSkin`, the yard boxes took
           the container livery, and the dock wall took `dockClad`.

           #A6AEBA IS STILL THIS CARD'S CEILING — it did not move, it moved
           INTO a texture. TRAILER_TINT is solved so that a flat trailer panel
           renders at exactly #A6AEBA, so the top of the value ladder is
           unchanged and white is still reserved for speculars. The ladder
           comment above describes five tones because that is the grade; the
           code now has three unmapped ones because the other two became
           mapped materials rather than flat fills. */
        /* `boxTone` (#949DA9) IS GONE, not merely unused. Its only consumer
           was the apron cartons, and cartons are corrugated board now — see
           `cartonBoard`. The value ladder above documents five tones; there
           are four in the code because the fifth was replaced by a real
           surface rather than by another shade of grey. If a future prop wants
           a mid-pale unmapped box, re-add it there rather than reaching for
           `paleTone`, which is a step lighter. */

        /* ================= THE DRESSING MATERIALS =================
           See THE DRESSING PASS at module scope for the cost accounting and
           the colour derivations. Everything here goes through `mats` (or
           `met`) so it fades in on the same intro ramp as the rest, and every
           one of them is a MATERIAL — the textures underneath are cached and
           are never disposed by this scene. */

        /* A mapped material that still joins the intro ramp. `plain()` cannot
           be used because it has no `map` parameter and `met()` would drag in
           makeMetal's three-map chain, which is exactly what these skins
           exist to avoid paying for. */
        const skinned = (map: THREE.Texture, color: string, rough: number, metal = 0.0, env = 0.18) => {
          const m = new THREE.MeshStandardMaterial({
            map, color, roughness: rough, metalness: metal,
            envMapIntensity: env, transparent: true, opacity: 0,
          });
          mats.push(m);
          return m;
        };

        /* The truck's and the dock's trailer bodies. ONE material for both:
           they are the same kind of object, and sharing it also means one
           less draw-call state change. */
        const trailerSkin = skinned(trailerPanelMap(), TRAILER_TINT, 0.72, 0.10, 0.22);
        /* The cab. `met` registers it for disposal alongside `dark`/`steel`. */
        const cabBlue = met(
          LEAD_BLUE_METAL.base, LEAD_BLUE_METAL.kind,
          LEAD_BLUE_METAL.metalness, LEAD_BLUE_METAL.rough,
        );
        /* Rubber. Was `dark` (#4E5661), which is CHASSIS grey — with the
           chassis and the wheels on one value the running gear read as one
           undifferentiated grey mass under a white box. #2A2F36 = (42,47,54)
           is still 3x the backdrop mid (14,16,21), so it is a dark tyre and
           not the silhouette the value note forbids. */
        const tyre = plain("#2A2F36", 0.92);
        /* The side skirt. Between the tyre and the chassis in value so the
           three running-gear parts read as three parts. */
        const skirtTone = plain("#3A4048", 0.85);
        /* Camera housings — no maps at all, see HOUSING. Built by hand rather
           than through `plain()` because a housing wants real metalness (0.6)
           and a tight roughness (0.45), and `plain()` hardcodes 0.05/0.15. */
        const housing = new THREE.MeshStandardMaterial({
          color: HOUSING, metalness: 0.6, roughness: 0.45,
          transparent: true, opacity: 0, envMapIntensity: 0.25,
        });
        mats.push(housing);
        /* The two things that turn a capsule into a worker. Matte, unmapped,
           metalness 0 — hi-vis polyester and a plastic hard hat, and a
           specular sheen on either would read as wet plastic. */
        const vest = new THREE.MeshStandardMaterial({
          color: VEST_ORANGE, roughness: 0.85, metalness: 0.0,
          transparent: true, opacity: 0, envMapIntensity: 0.30,
        });
        const helmet = new THREE.MeshStandardMaterial({
          color: HELMET_YELLOW, roughness: 0.60, metalness: 0.0,
          transparent: true, opacity: 0, envMapIntensity: 0.20,
        });
        mats.push(vest, helmet);
        /* Container livery, on the cached neutral skin the homepage's Yard
           card already generated. One map on all six faces: `metalBox` returns
           a RoundedBoxGeometry, which has a SINGLE material group, so a
           six-face array would not bind — and yard-vision reaches the same
           conclusion on merit at this distance, since the long side and the
           roof are seen at similar angles and both are ribbed. */
        const containerTex = containerSide(SKIN_NEUTRAL);
        const liveryA = skinned(containerTex, LIVERY_A, 0.82, 0.16, 0.20);
        const liveryB = skinned(containerTex, LIVERY_B, 0.82, 0.16, 0.20);
        /* Kraft board on the goods, on the untinted cached canvas the
           homepage's Warehouse card already generated. `color` stays white:
           cardboard is never recoloured by a tint (blue x kraft = olive is the
           documented trap in skins.ts) and it does not need to be — board
           looks like board. Only the side map is used; the top face takes it
           too, for the single-material-group reason above. */
        const cartonBoard = skinned(cardboardSide(), "#FFFFFF", 0.94, 0.0, 0.18);
        /* The dock building's cladding — the SAME map as the trailers, a
           second material at DOCK_TINT. See that constant for the full
           "why not a clone, why not a third canvas" and the seam-survival
           arithmetic. Rougher and flatter than the trailer: this is painted
           profile sheet on a shed, not a road vehicle. */
        const dockClad = skinned(trailerPanelMap(), DOCK_TINT, 0.90, 0.05, 0.12);
        /* Wheel hubs. Its own tone rather than `steel`: `steel` is makeMetal's
           mapped brushed finish and a 0.30-wide disc is exactly the size at
           which that map reads as grit. #6B737E = (107,115,126) sits between
           `steel` (#78828F) and `midTone`, which is where an alloy hub
           belongs — clearly lighter than the #2A2F36 tyre around it, and not
           bright enough to become a row of dots across the frame. */
        const hubTone = plain("#6B737E", 0.55);
        /* The horizon band. Unmapped and unlit-looking by intent — see
           HORIZON_TONE. envMapIntensity 0 because there is no env on this
           card anyway (`noEnv`) and a silhouette must not pick one up if one
           is ever added. */
        const horizonTone = new THREE.MeshStandardMaterial({
          color: HORIZON_TONE, metalness: 0.0, roughness: 0.98,
          transparent: true, opacity: 0, envMapIntensity: 0.0,
        });
        mats.push(horizonTone);

        const g = new THREE.Group();
        scene.add(g);
        const bx = (w: number, h: number, d: number, m: THREE.Material) => metalBox(w, h, d, m, Math.min(w, h, d) * 0.07);
        /* Generic over Object3D rather than Mesh: the pallet is a Group now,
           and every line in here is valid on any Object3D. The generic keeps
           each caller's own type on the way out. */
        const put = <T extends THREE.Object3D>(mesh: T, x: number, y: number, z: number, shadow = true) => {
          mesh.position.set(x, y, z);
          mesh.castShadow = shadow;
          g.add(mesh);
          return mesh;
        };

        /* ================= the site ================= */

        /* -- yard: two stacks of containers, far left --
           THE SITE ALREADY HAD CONTAINERS, so none were added. These eight
           boxes (4 columns x 2 tiers, bx 2.5 x 1.0 x 1.1) are the yard bay the
           header lists as "stacked containers, one located", and they are now
           skinned and in blue livery — which makes them the card's colour
           anchor without a single new object.

           The 2.5:1.0 aspect also happens to be what the skin was painted for:
           `containerSideRaw` is a 1024x420 canvas, 2.44:1, so the corrugation
           lands at very close to square pitch on the long faces.

           LIVERY ALTERNATES BY (i + j), NOT BY A HASH. Two liveries on a
           checker means every stack is a light box on a dark one or the
           reverse, which is the only thing that has to be true here: a stack
           of two identically-painted boxes reads as one 2-unit-tall box. */
        const yardBoxes: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          for (let j = 0; j < 2; j++) {
            const b = bx(2.5, 1.0, 1.1, (i + j) % 2 === 0 ? liveryA : liveryB);
            put(b, -13 + i * 2.65, GROUND + 0.5 + j * 1.04, -3.2);
            yardBoxes.push(b);
          }
        }

        /* -- gate: a gantry with a truck crossing under it -- */
        const gantry = new THREE.Group();
        gantry.position.set(-5.2, 0, 0.4);
        g.add(gantry);
        const gCol = bx(0.22, 4.2, 0.22, steel);
        gCol.position.set(0, GROUND + 2.1, -2.4);
        gantry.add(gCol);
        const gBeam = bx(0.2, 0.2, 5.0, steel);
        gBeam.position.set(0, GROUND + 4.1, 0.1);
        gantry.add(gBeam);

        const truck = new THREE.Group();
        /* The road was placed at the traffic, not the other way round: this is
           already 0 and the assignment is here to make the dependency explicit
           for whoever moves one of them next. */
        truck.position.z = ROAD_Z;
        g.add(truck);
        /* ---- WHAT MAKES THIS READ AS A TRUCK ----
           Three changes, no geometry moved except the one addition below.

             TRAILER   panelled, not flat white. A real box trailer IS pale —
                       so the value is unchanged at #A6AEBA (see TRAILER_TINT's
                       derivation) and only the surface arrives.
             CAB       the site's blue as painted metal. A cab is the ONE part
                       of a truck that is always a colour, it is the front of
                       the vehicle so it is where the eye goes, and at 1.5
                       units it is small enough that a saturated hue there
                       anchors the frame without dominating it.
             CHASSIS   unchanged material (`dark`), but it now has a SKIRT
                       under it and darker tyres beside it, so the running
                       gear is three values instead of one. */
        const trailer = bx(4.6, 1.15, 1.15, trailerSkin);
        trailer.position.set(-1.2, GROUND + 1.15, 0);
        truck.add(trailer);
        /* ================= RUB RAILS =================
           GEOMETRY READS WHERE TEXTURE DOES NOT, which is the finding this
           round produced: the seam map is a 512-wide canvas stretched over a
           4.6-unit side seen from ~9 units, and however dark the seams are
           made they are still competing with the mip chain. A physical bar is
           four triangles that never blur away.

           TRUCK TRAILER, measured off the body: 4.6 long centred x = -1.2,
           1.15 tall centred GROUND + 1.15 -> spans GROUND + 0.575..1.725,
           1.15 deep -> +- 0.575. The thirds of that height are

             1/3  0.575 + 1.15/3     = GROUND + 0.958
             2/3  0.575 + 2 x 1.15/3 = GROUND + 1.342

           Section 0.06 x 0.04 at z = +- 0.595, so each rail spans
           +- 0.575..0.615 — flush with the body face and standing 0.04 proud.
           Length 4.52 against a 4.6 body leaves 0.04 at each end, which keeps
           the rails inside the rounded corners (metalBox radius here is
           1.15 x 0.07 = 0.0805) instead of poking through them.

           `dark` (#4E5661), the chassis value: a rub rail is structural, and
           it is the same member family as the chassis it protects. */
        const RUB_Y = [0.958, 1.342] as const;
        for (const ry of RUB_Y) {
          for (const sz of [-1, 1]) {
            const rail = bx(4.52, 0.06, 0.04, dark);
            rail.position.set(-1.2, GROUND + ry, sz * 0.595);
            truck.add(rail);
          }
        }
        const cabT = bx(1.5, 1.3, 1.2, cabBlue);
        cabT.position.set(1.9, GROUND + 1.0, 0);
        truck.add(cabT);
        const chassis = bx(6.6, 0.16, 1.0, dark);
        chassis.position.set(-0.2, GROUND + 0.52, 0);
        truck.add(chassis);
        /* THE SIDE SKIRT, and it is sized off the wheels rather than guessed.
           The chassis underside is GROUND + 0.44 (0.16 tall at GROUND + 0.52)
           and the tyres' contact is GROUND, so a skirt hangs into
           GROUND + 0.10 .. 0.44: height 0.34, centre GROUND + 0.27.

           LENGTH IS THE CLEAR SPAN BETWEEN THE AXLES. Wheels sit at
           x = -3.0, -2.1, 1.6, 2.4 with WHEEL_R 0.32, so the inner faces of
           the two inner wheels are at -2.1 + 0.32 = -1.78 and
           1.6 - 0.32 = 1.28. A 3.0-long skirt centred at x = -0.25 spans
           -1.75 .. 1.25, clearing each by 0.03 — enough that it never
           intersects a tyre, tight enough that it reads as a full skirt.

           DEPTH 0.98 (+-0.49) is inboard of the wheels at +-0.66 and inboard
           of the trailer body at +-0.575, so it tucks under rather than
           bulging, which is what an aero skirt does. */
        const skirt = bx(3.0, 0.34, 0.98, skirtTone);
        skirt.position.set(-0.25, GROUND + 0.27, 0);
        truck.add(skirt);

        /* ================= THE TRAILER END FACES =================

           The panel map only reads on the long sides, so the ends were flat
           #A6AEBA planes — and because they face the camera squarely for half
           the pan, they were the brightest planes in frame.

           WHY NOT PER-FACE UV, WHICH WAS THE OTHER OPTION OFFERED. It is not
           available on these meshes and could not be made available without a
           mechanics change. `bx()` is `metalBox`, which returns a
           RoundedBoxGeometry, and a rounded box has a SINGLE material group —
           hero-cards/subjects.ts documents exactly this, which is why its
           cartons use a plain BoxGeometry to take a six-material array. To do
           work-vision's `dockWallFace` idiom here I would have to drop the
           rounded geometry, and this codebase's own note calls the 2-3cm
           edge radius "the single biggest fix for blocky" — losing it to gain
           a UV would be a bad trade, and it would change the silhouette,
           which is not a materials change at all.

           SO: A REAR DOOR ASSEMBLY, WHICH GETS BOTH THINGS AT ONCE. A thin
           plate standing 0.02 proud of the rear face, at `midTone` (#8A939F)
           — exactly the one-step drop from `paleTone` that the round asked
           for as the minimum — plus three bars on `dark` for the leaf split
           and the two locking rods. The end stops being the brightest plane
           AND it stops being blank, for one extra geometry (the bar, cached
           and shared by all six).

           TRUCK TRAILER, measured: body 4.6 long centred x = -1.2, so the
           rear face is at -1.2 - 2.3 = -3.50 (which is also the tail the
           TRUCK_RUN derivation is measured on — unchanged, the plate stands
           0.02 proud at -3.52 and its own 0.06 thickness reaches -3.55, i.e.
           0.05 past the tail. TRUCK_RUN's exit clearance is 0.31 units, so
           this eats 0.05 of it and the wrap is still off-frame. Noted rather
           than adjusted: adjusting TRUCK_RUN would be a motion change.)
           Plate 1.02 x 1.02 against a 1.15 body: 0.065 of body showing on
           every side, so the doors sit INSIDE the frame of the trailer's own
           edge, which is what a real rear end looks like. */
        const REAR_BAR_Z = [0, -0.32, 0.32] as const;
        const rearPlateT = bx(0.06, 1.02, 1.02, midTone);
        rearPlateT.position.set(-3.52, GROUND + 1.15, 0);
        truck.add(rearPlateT);
        for (const bz of REAR_BAR_Z) {
          /* 0.03 thick standing at x -3.565: the plate's outer face is at
             -3.55, so each bar is 0.015 proud of it. Full body height 0.94
             (0.08 in from the plate's 1.02) so the bars stop short of the
             door's own top and bottom edge, like real cam-lock rods. */
          const bar = bx(0.03, 0.94, 0.05, dark);
          bar.position.set(-3.565, GROUND + 1.15, bz);
          truck.add(bar);
        }
        /* ONE WHEEL GEOMETRY FOR THE WHOLE SITE. It used to be allocated inside
           the loop below — four identical CylinderGeometries per mount, none of
           them disposed — and the docked trailer's bogie now wants the same
           wheel, so it is hoisted here and disposed once at teardown. WHEEL_R
           is the number the bogie sizes itself off: read it, do not re-guess it. */
        const WHEEL_R = 0.32;
        const WHEEL_W = 0.22;
        const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, WHEEL_W, 14);
        /* ---- THE HUB DISC ----
           A tyre with no hub is a black cylinder, and eight of them made the
           running gear read as a row of holes. One shared geometry for every
           wheel on the site — both the truck's eight and the docked bogie's
           four — for the same reason `wheelGeo` is shared: the two vehicles
           must have the same wheel.

           HUB_R 0.15 is 0.47 of WHEEL_R (0.32), which is about where a truck
           rim sits inside its tyre. HUB_T 0.05 thick, and it is mounted so it
           CAPS the outer face rather than being buried: a wheel at z = +-0.55
           with WHEEL_W 0.22 has its outer face at +-0.66, so a hub centred at
           +-0.685 spans 0.66..0.71 and stands 0.05 proud. Same rotation as
           the wheel (x = PI/2) so its axis is z. */
        const HUB_R = 0.15;
        const HUB_T = 0.05;
        const hubGeo = new THREE.CylinderGeometry(HUB_R, HUB_R, HUB_T, 12);
        /** Outboard offset from a wheel's CENTRE plane to the hub's centre:
         *  half the tyre width plus half the hub thickness. 0.11 + 0.025. */
        const HUB_OFF = WHEEL_W / 2 + HUB_T / 2;      // 0.135
        for (const wx of [-3.0, -2.1, 1.6, 2.4]) {
          const w = new THREE.Mesh(wheelGeo, tyre);
          w.rotation.x = Math.PI / 2;
          w.position.set(wx, GROUND + 0.32, 0.55);
          truck.add(w);
          const w2 = w.clone();
          w2.position.z = -0.55;
          truck.add(w2);
          /* Siblings of the wheels, NOT children. `w.clone()` above is
             recursive, so a hub parented to `w` would be duplicated onto `w2`
             with a local offset that the wheel's own PI/2 rotation would send
             the wrong way. Explicit world-side placement is unambiguous. */
          for (const sz of [-1, 1]) {
            const hub = new THREE.Mesh(hubGeo, hubTone);
            hub.rotation.x = Math.PI / 2;
            hub.position.set(wx, GROUND + WHEEL_R, sz * (0.55 + HUB_OFF));
            truck.add(hub);
          }
        }

        /* ================= THE TRUCK'S CONTACT SHADOW =================

           A FAKE ONE, AND DELIBERATELY SO. The comment on `shadowMat` above
           records the finding: the `lite` rig is a key, a rim and a hemisphere
           and none of them casts, so this card has never had real shadows. The
           obvious fix — switch on a shadow-casting directional — is the wrong
           trade here. The road is 40 units long and the camera pans forever, so
           a real shadow map means a depth pass over the whole site every frame,
           plus sliding both the catcher and the light target with camX (see the
           note on `shadowMat`), all to put one soft blob under one vehicle. A
           decal costs one transparent quad and no extra pass, and at this
           camera angle and this card size the two are indistinguishable.

           IT DID NOT MATTER UNTIL THE ROAD ARRIVED. A truck floating in a void
           reads as a diagram; a truck floating over a road it is visibly meant
           to be driving on reads as a bug.

           GEOMETRY, FROM THE TRUCK'S ACTUAL BOX rather than a guessed number.
           Measured off the meshes built above:

             x  chassis -0.2 +-3.3  ->  -3.50 .. +3.10   span 6.60, centre -0.20
                (trailer -3.50..1.10, cab 1.15..2.65 both inside it)
             z  wheels +-0.55 +-0.11 -> -0.66 .. +0.66   span 1.32
                (bodies are +-0.60 and +-0.575, narrower)

           Semi-axes: 3.15 along x (0.95 of the half-span — a shadow tucks
           inside the silhouette rather than matching it edge to edge) and 0.78
           along z (1.18x the half-span — it spreads sideways, which is what a
           soft shadow from a high key does). Plane 6.30 x 1.56.

           IT STAYS ON THE ROAD: half-width 0.78 about a centre pushed to
           z = -0.242 spans -1.02 .. +0.54, inside the kerbs at +-1.20.

           THE OFFSET IS WHAT SELLS IT. The `lite` key is a DirectionalLight at
           (2.5, 6.5, 4.5) aiming at the origin, so light travels (-2.5, -6.5,
           -4.5) and a shadow is thrown toward -x and -z. Dropped from a contact
           height of 0.35 (the wheel/chassis region, not the trailer roof —
           this is a contact shadow, not a cast silhouette) that is
           0.35 * (-2.5, -4.5) / 6.5 = (-0.135, -0.242). Centred exactly under
           the caster it would read as ambient occlusion; offset, it reads as a
           shadow.

           HEIGHT. The stack under here is grid -1.270, road -1.256, paint
           -1.252, catcher -1.250 (= GROUND, and also exactly where the wheels
           touch, since they are r=0.32 centred at GROUND+0.32). So the decal
           has to be ABOVE the paint and BELOW the wheel contact: -1.251. Every
           plane in the stack has depthWrite off, so `renderOrder` is the sole
           authority and 0 puts this above the paint's -1 — the 1mm is only
           there to keep the geometric order honest, not to win a depth test.

           MeshBasicMaterial, not ShaderMaterial, for ONE reason: fog. This is
           paint on the road as far as the eye is concerned, so it must dim with
           the road it lies on — and `MeshBasicMaterial` has `fog: true` by
           default, while a raw ShaderMaterial would need the fog uniforms,
           chunks and defines wired by hand for a quad whose entire shading is a
           radial ramp. The ramp is a 64px alphaMap; elongation comes from the
           plane's aspect, so one square gradient serves. */
        const CS_A = 3.15, CS_B = 0.78;
        const CS_OFF_X = -0.20 - 0.135;   // box centre, then the key's throw
        const CS_OFF_Z = ROAD_Z - 0.242;
        const csTex = (() => {
          const S = 64;
          const c = document.createElement("canvas");
          c.width = c.height = S;
          const ctx = c.getContext("2d");
          if (!ctx) return null;
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, S, S);
          const gr = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
          /* smoothstep falloff: a soft plateau in the middle and a soft rim,
             which is what a penumbra looks like. A linear ramp reads as a
             cone of light, not as a shadow. */
          for (let i = 0; i <= 8; i++) {
            const u = i / 8;
            const v = Math.round(255 * (1 - u * u * (3 - 2 * u)));
            gr.addColorStop(u, `rgb(${v},${v},${v})`);
          }
          ctx.fillStyle = gr;
          ctx.fillRect(0, 0, S, S);
          const tx = new THREE.CanvasTexture(c);
          tx.needsUpdate = true;
          return tx;
        })();
        const csGeo = new THREE.PlaneGeometry(CS_A * 2, CS_B * 2);
        /* 0.42 peak — mid of the 0.35-0.50 band this ground takes. Black at
           0.42 over the #15181D asphalt lands at (12,14,17): clearly a shadow,
           and still lighter than the page canvas so it never punches a hole
           through the road. Held OUT of `mats` because that list is a blunt
           "set everything to solid" and this peaks below 1, exactly like the
           roadway's paint. */
        const CS_PEAK = 0.42;
        const csMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          alphaMap: csTex ?? undefined,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        });
        csMat.fog = true;
        const contactShadow = new THREE.Mesh(csGeo, csMat);
        contactShadow.rotation.x = -Math.PI / 2;
        contactShadow.position.set(0, GROUND - 0.001, CS_OFF_Z);
        contactShadow.renderOrder = 0;
        /* Parented to `g`, NOT to the truck. A contact shadow lives on the
           ground: it must take the truck's x and nothing else — not its y, not
           any roll it might acquire later. Its x is written every frame beside
           the truck's, which is also why it joins `dynamic` below. */
        g.add(contactShadow);

        /* -- dock: a bay with a trailer parked and cargo on the apron -- */
        /* ================= THE DOCK BUILDING =================

           It was the flattest object on the site: one #A6AEBA slab, the same
           value as the trailer standing in front of it, so it read as a
           backdrop card rather than as a building the trailer is parked at.
           Work-vision's dock treatment, scaled to this card's budget.

           THE VALUE DROP IS THE WHOLE FIX, and it is large on purpose:
           #A6AEBA (166,174,186) -> #151A21 (21,26,33), i.e. from the top of
           this card's range to below the asphalt. The trailer in front of it
           stays at #A6AEBA, so the two now separate by a factor of eight
           instead of not at all.

           A NEAR-BLACK BUILDING NEEDS EDGES OR IT IS A HOLE, which is the
           trap this could have fallen into. Three lighter members do that
           work and nothing else has to:

             ROOF CAP   `dark`  #4E5661 — one lit line along the top edge, so
                        the building meets the sky as an object
             DOOR FRAME `steel` #78828F — so each opening reads as an opening
             DOORS      `skirtTone` #3A4048 — one step above the cladding, so
                        two shutters read inside their frames

           GEOMETRY REFERENCE, everything below measured off these:
             wall  6.0 x 2.6 x 0.5 at (3.4, GROUND+1.3, -4.6)
                   -> x 0.40..6.40, y GROUND+0.00..2.60, z -4.85..-4.35
             door  1.7 x 1.9 x 0.12 at (dx, GROUND+0.95, -4.3)
                   -> y GROUND+0.00..1.90, front face z -4.24 */
        const dockWall = bx(6.0, 2.6, 0.5, dockClad);
        put(dockWall, 3.4, GROUND + 1.3, -4.6);

        /* THE ROOF CAP LIP. 0.12 tall centred at GROUND + 2.62 spans
           GROUND + 2.56..2.68, so it OVERLAPS the wall top (2.60) by 0.04 —
           no hairline gap to open up at any angle. 6.24 x 0.74 against the
           wall's 6.00 x 0.50 stands it 0.12 proud on all four sides, which is
           what a coping does and what makes it read as a separate member
           rather than as a stripe painted on the parapet. */
        const roofCap = bx(6.24, 0.12, 0.74, dark);
        put(roofCap, 3.4, GROUND + 2.62, -4.60, false);

        for (const dx of [1.6, 5.2]) {
          const door = bx(1.7, 1.9, 0.12, skirtTone);
          put(door, dx, GROUND + 0.95, -4.3, false);
          /* THE DOOR FRAME. Section 0.10 square, at z = -4.24 with 0.10 of
             depth (spans -4.29..-4.19), so it stands 0.05 proud of the door
             face at -4.24 and reads in front of it.

             Jambs at dx +- 0.90: the door half-width is 0.85 and the jamb
             half-section is 0.05, so the jamb's INNER face lands at 0.85 —
             flush with the opening — and its outer at 0.95.
             Jamb height 2.06 centred GROUND + 1.03 -> GROUND + 0.00..2.06.
             Lintel 1.90 wide = 2 x 0.95, so it spans exactly the two jambs'
             outer faces; 0.10 tall centred GROUND + 2.01 -> 1.96..2.06, i.e.
             its top is flush with the jamb tops and it overlaps the last
             0.10 of them. Frame top 2.06 is well inside the wall's 2.60. */
          for (const sx of [-0.90, 0.90]) {
            const jamb = bx(0.10, 2.06, 0.10, steel);
            put(jamb, dx + sx, GROUND + 1.03, -4.24, false);
          }
          const lintel = bx(1.90, 0.10, 0.10, steel);
          put(lintel, dx, GROUND + 2.01, -4.24, false);
        }
        /* The docked trailer takes the SAME body skin as the truck's trailer.
           It is the same kind of object, so a different surface on it would
           say the two are different things — and it costs nothing, the
           material is shared. */
        const docked = bx(3.6, 1.15, 1.1, trailerSkin);
        put(docked, 2.0, GROUND + 1.1, -3.0);

        /* ================= WHY THE TRAILER GOT LEGS =================

           Measured: the box is 1.15 tall centred at GROUND + 1.1, so its
           underside is at GROUND + 0.525 and it was hanging half a metre over
           a floor that is now visible. The obvious fix is to drop it. THAT IS
           THE WRONG FIX, and it is worth saying why in full so nobody "tidies"
           it later.

           A trailer on a bay genuinely sits at dock-deck height — that is the
           entire reason it is up there. Its floor has to line up with the
           dock's floor or you cannot roll anything across. Lowering it to
           GROUND would put its deck below the dock wall's and break the one
           relationship the object exists to state. The height is right; what
           was missing is the thing that HOLDS it at that height. So it gets
           what a real one has, and the hover stops being a hover:

             REAR BOGIE     a tandem axle pair with four wheels
             LANDING GEAR   two legs with feet, under the nose

           WHEEL SIZE IS READ, NOT PICKED: WHEEL_R (0.32) and WHEEL_W (0.22)
           off the truck above, on the shared `wheelGeo`, so the two vehicles
           on this site have the same wheel. Centres sit at GROUND + 0.32, so
           the tyres touch GROUND exactly, like the truck's.

           THE WHEELS ARE OUTBOARD, at z = -3.0 +- 0.62 against a body half-
           depth of 0.55. They have to be: a 0.64-diameter tyre does not fit
           under a 0.525 deck, and shrinking it to fit would break the match
           with the truck. Outboard is also what the truck already does — its
           chassis underside is GROUND + 0.44 and its tyres stand 0.20 proud of
           it — so the 0.115 of tyre standing above this deck reads as the same
           vehicle language, not as a clash.

           AXLES at x = 2.40 and 3.30. The rearmost is 0.50 in from the tail
           (body spans x 0.20 .. 3.80), and the pair is 0.90 apart — both taken
           from the truck's own rear tandem at -3.0 / -2.1 behind a tail at
           -3.50. LANDING GEAR at x = 0.75, 0.55 in from the nose, at
           z = -3.0 +- 0.38 so the legs are inboard and clearly carrying the
           deck rather than propping its corners.

           MATERIALS ARE EXISTING ONES, no new tone: `dark` (#4E5661) for
           everything that is running gear — wheels, axles, bogie frame, feet —
           which is the truck's own wheel and chassis value, and `steel`
           (#78828F) for the legs, which is what every other upright on this
           site (masts, gantry, belt legs) is made of. Both are already in
           `mats`, so all of this fades in on the same ramp as the rest.

           WRAPPING: parented to `dockedRig`, a sibling of `docked` in `g` and
           registered in `tileOwner` under head 1 exactly as `docked` is, so the
           two take the SAME tile index and the running gear can never be left
           27 units behind its trailer at a wrap boundary. It is deliberately
           NOT parented to `docked` itself: the tracker boxes its target with
           Box3.setFromObject, which walks children, so that would silently
           grow head 1's bracket down to the floor. */
        const dockedRig = new THREE.Group();
        g.add(dockedRig);
        /* The trailer's own z, and its underside — every number below is
           measured off these two rather than repeated as a literal. */
        const DOCK_Z = -3.0;

        const axleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.30, 10);
        for (const ax of [2.40, 3.30]) {
          for (const sz of [-1, 1]) {
            /* `tyre`, not `dark` — same change as the truck's wheels, and it
               has to be the same or the two vehicles stop matching, which is
               the whole reason they share `wheelGeo`. Axles, bogie frame and
               feet stay on `dark`: those are running GEAR, not rubber. */
            const w = new THREE.Mesh(wheelGeo, tyre);
            w.rotation.x = Math.PI / 2;
            w.position.set(ax, GROUND + WHEEL_R, DOCK_Z + sz * 0.62);
            w.castShadow = true;
            dockedRig.add(w);
            /* The same hub as the truck's, at the bogie's own track: wheels
               sit at DOCK_Z +- 0.62, so the outer faces are at +- 0.73 and
               the hub centres at +- (0.62 + HUB_OFF) = +- 0.755. */
            const hub = new THREE.Mesh(hubGeo, hubTone);
            hub.rotation.x = Math.PI / 2;
            hub.position.set(ax, GROUND + WHEEL_R, DOCK_Z + sz * (0.62 + HUB_OFF));
            dockedRig.add(hub);
          }
          const axle = new THREE.Mesh(axleGeo, dark);
          axle.rotation.x = Math.PI / 2;
          axle.position.set(ax, GROUND + WHEEL_R, DOCK_Z);
          dockedRig.add(axle);
        }
        /* The frame the axles hang off. 0.10 tall centred at GROUND + 0.46 →
           spans GROUND + 0.41 .. 0.51, i.e. tucked just under the 0.525 deck
           with 0.015 to spare, and long enough (1.50, x 2.10 .. 3.60) to
           bridge both axles. */
        const bogieFrame = bx(1.50, 0.10, 0.90, dark);
        bogieFrame.position.set(2.85, GROUND + 0.46, DOCK_Z);
        dockedRig.add(bogieFrame);

        /* Landing gear. Leg 0.45 tall centred at GROUND + 0.305 spans
           GROUND + 0.08 .. 0.53 — 0.005 INTO the deck at the top so there is no
           hairline gap, and stopping at 0.08 where the foot takes over. Foot
           0.08 tall centred at GROUND + 0.04 spans GROUND + 0.00 .. 0.08, so
           the bottom face is exactly GROUND. */
        for (const sz of [-1, 1]) {
          const leg = bx(0.10, 0.45, 0.10, steel);
          leg.position.set(0.75, GROUND + 0.305, DOCK_Z + sz * 0.38);
          leg.castShadow = true;
          dockedRig.add(leg);
          const foot = bx(0.22, 0.08, 0.26, dark);
          foot.position.set(0.75, GROUND + 0.04, DOCK_Z + sz * 0.38);
          dockedRig.add(foot);
        }

        /* The docked trailer's rear doors, the same assembly the truck's got.
           Body 3.6 long centred x = 2.0, so the rear face is at 3.80; the
           plate stands 0.02 proud at 3.82 and the bars 0.015 proud of that at
           3.855. Body is 1.10 deep here (not 1.15), so the plate is 0.98
           square rather than 1.02 — same 0.06 of body showing all round.

           PARENTED TO `dockedRig`, WHICH IS THE POINT. `dockedRig` is already
           a top-level child of `g` carrying `tileOwner` 1 — head 1's tile, the
           same one `docked` takes — so these ride the trailer across every
           wrap boundary with no new registration at all. Parenting them to
           `docked` itself would have been wrong for the reason the rig's own
           note gives: the tracker boxes its target with Box3.setFromObject,
           which walks children, so head 1's bracket would silently grow. */
        /* The docked trailer's rub rails, same treatment on its own numbers:
           body 3.6 long centred x = 2.0, 1.15 tall centred GROUND + 1.1 ->
           GROUND + 0.525..1.675, 1.1 deep -> +- 0.55. Thirds of that height
           are GROUND + 0.908 and GROUND + 1.292; rails at z = DOCK_Z +- 0.57.
           Length 3.52 against a 3.6 body, same 0.04 inset per end.

           IN `dockedRig`, not in `docked` — head 1's tile either way, and
           keeping them out of `docked` keeps them out of its Box3. */
        const RUB_Y_D = [0.908, 1.292] as const;
        for (const ry of RUB_Y_D) {
          for (const sz of [-1, 1]) {
            const rail = bx(3.52, 0.06, 0.04, dark);
            rail.position.set(2.0, GROUND + ry, DOCK_Z + sz * 0.57);
            dockedRig.add(rail);
          }
        }

        const rearPlateD = bx(0.06, 0.98, 0.98, midTone);
        rearPlateD.position.set(3.82, GROUND + 1.1, DOCK_Z);
        dockedRig.add(rearPlateD);
        for (const bz of REAR_BAR_Z) {
          const bar = bx(0.03, 0.90, 0.05, dark);
          bar.position.set(3.855, GROUND + 1.1, DOCK_Z + bz);
          dockedRig.add(bar);
        }

        /* -- warehouse: pallets being counted on the apron -- */
        /* MOVED OFF THE ROAD: z -0.90 -> -2.15. The pallet is 0.9 deep, so at
           -0.90 it spanned -1.35 .. -0.45 and was standing in the middle of the
           carriageway (road edge at -1.20). -2.15 puts its near face at -1.70,
           half a metre of shoulder clear of the kerb, and still well in front
           of the docked trailer at -3.0. The apron now flanks the road, which
           is what the road is for. */
        const APRON_Z = -2.15;
        const cartons: THREE.Mesh[] = [];
        for (let r = 0; r < 2; r++) {
          for (let i = 0; i < 3; i++) {
            /* KRAFT, not white. These are the goods, and goods on a warehouse
               apron are corrugated board. Costs nothing — `cardboardSide()` is
               the module-cached canvas the homepage's Warehouse card already
               generated. */
            const c = bx(0.62, 0.5, 0.62, cartonBoard);
            put(c, 5.6 + i * 0.68, GROUND + 0.3 + r * 0.54, APRON_Z);
            cartons.push(c);
          }
        }
        /* ================= THE PALLET =================
           It was one flat 2.3 x 0.12 x 0.9 slab, which at this size is a grey
           mat. It is also a DETECTION TARGET (pools[2]), so it is one of the
           few objects on this card that a bracket lands on and the viewer is
           invited to look at — a blank slab is the worst place to spend that.

           BUILT, NOT DARKENED, and the budget says it is cheap: five meshes
           on two cached `metalBox` sizes, no new material and no texture.

           IT IS NOW A GROUP AT THE SAME baseX, which is what keeps every
           registration it already had working. `pallet` is the identifier in
           `pools[2]`, `tileOwner` writes against that identifier, `wrapItems`
           reads its `position.x`, and the tracker calls Box3.setFromObject on
           it — all four are satisfied by an Object3D of any kind, and a Group
           gives the right Box3 (the union of its boards) for free.

           DECK: three boards running along x, 0.04 thick, top face flush with
           the old slab's top at local +0.06. At z offsets -0.34 / 0 / +0.34
           with a 0.22 width they span -0.45..-0.23, -0.11..0.11, 0.23..0.45,
           leaving two 0.12 gaps — the gap IS the pallet, it is the only thing
           that separates one from a board.
           STRINGERS: two bearers along z under the deck, 0.16 x 0.08, at
           x +- 0.95, spanning local y -0.06..0.02 so they carry the deck and
           the whole assembly still occupies exactly the old 0.12 of height.

           `dark` on the deck (it catches the key) and `skirtTone` on the
           stringers (they are underneath and in shadow) — the two-value split
           is what stops it reading as a solid block with lines scored in it.

           NOTE, PRE-EXISTING AND NOT TOUCHED: the cartons above sit at
           GROUND + 0.05 at their lowest, and this deck's top is GROUND + 0.12,
           so their bottom 0.07 is inside the pallet. That was true of the
           slab too. Moving them is a geometry change to four tracked targets
           and is not this pass's to make. */
        const pallet = new THREE.Group();
        put(pallet, 6.28, GROUND + 0.06, APRON_Z, false);
        for (const bz of [-0.34, 0, 0.34]) {
          const board = bx(2.3, 0.04, 0.22, dark);
          board.position.set(0, 0.04, bz);
          pallet.add(board);
        }
        for (const sx of [-0.95, 0.95]) {
          const stringer = bx(0.16, 0.08, 0.9, skirtTone);
          stringer.position.set(sx, -0.02, 0);
          pallet.add(stringer);
        }

        /* -- factory: a line running parts past a head, right -- */
        const belt = bx(6.2, 0.18, 0.9, dark);
        put(belt, 11.4, GROUND + 0.62, -1.6, false);
        /* THE LEGS WENT THROUGH THE FLOOR. Found by the same bottom-vs-GROUND
           sweep that caught the walkers and the trailer, and it is the worst of
           the three: 1.2 tall centred at GROUND + 0.1 spans GROUND - 0.50 ..
           GROUND + 0.70, so half a metre of every leg was buried and the top
           0.17 stood proud through the belt it was supposed to be holding up.
           Invisible in a void; not invisible on a drafting grid.

           Sized to the job instead: the belt is 0.18 tall at GROUND + 0.62, so
           its underside is GROUND + 0.53. A leg of exactly that height centred
           at GROUND + 0.265 runs GROUND + 0.00 .. GROUND + 0.53 — floor to
           belt, nothing spare at either end. */
        /* ================= THE CHECKPOINT BENCH =================

           READ THIS FIRST IF THE NAMING LOOKS ODD. The round called for "the
           checkpoint bench"; this card has no object by that name, and the
           thing it means is the FACTORY LINE — the belt at x 11.4 that runs
           parts past head 3, which the same round referred to as "the
           checkpoint framing". So the bench grammar is applied here. If that
           reading is wrong, this whole block is what moves.

           Work act 3's bench is a top on four legs with an APRON under the
           front edge and a LOW RAIL tying the legs, and the apron is the
           member its note singles out — "the single thing that stops a work
           bench looking like a table tennis table", because in silhouette it
           gives the top a thickness instead of a 60mm line. Three bare posts
           under a slab was this card's version of the same defect.

           MEASURED OFF THE BELT, which is unchanged: 6.2 x 0.18 x 0.9 at
           (11.4, GROUND + 0.62, -1.6), so it spans x 8.30..14.50,
           y GROUND + 0.53..0.71, z -2.05..-1.15 and its UNDERSIDE is
           GROUND + 0.53.

           FOUR LEGS, NOT THREE, evenly pitched between an inset pair:
             outer legs  11.4 +- (3.1 - 0.35) = 8.65 and 14.15
             span        14.15 - 8.65 = 5.50, in three bays of 5.50/3 = 1.8333
             so          8.65, 10.48, 12.32, 14.15   (bays 1.83/1.84/1.83)
           Section stays 0.13 — already well over the 0.05 floor, and thinning
           them would make the frame LESS visible, which is the opposite of
           the ask. Height 0.53 centred GROUND + 0.265 -> floor to belt
           underside, nothing spare at either end (unchanged).

           MATERIAL: the legs move from `steel` to `cabBlue`. That is not
           decoration — work act 3 puts its legs, aprons and rails ALL on
           `m.rack`, its painted blue, and "the same bench grammar" is the
           grammar including that. It also ties the checkpoint to the truck
           cab, so the card's one saturated colour appears twice rather than
           once. Costs nothing: the material already exists. Easy to revert —
           it is this one identifier in three places. */
        const BENCH_LEG_X = [8.65, 10.48, 12.32, 14.15] as const;
        for (const lx of BENCH_LEG_X) {
          const leg = bx(0.13, 0.53, 0.13, cabBlue);
          put(leg, lx, GROUND + 0.265, -1.6, false);
        }
        /* ================= THE FLOATING-ROD ARTEFACT =================

           FOUND, AND IT WAS THIS APRON. Reported as "a thin horizontal rod
           floating free, left of the bench's leftmost leg, around
           GROUND + 0.4-0.5". All three details identify it exactly:

             height   the apron was 0.11 tall centred GROUND + 0.475, i.e.
                      it spanned GROUND + 0.420..0.530 — the reported band
             position it was 5.90 long centred at 11.4, so it spanned
                      x 8.45..14.35 against outer legs at 8.65 and 14.15 —
                      a 0.20 CANTILEVER past the leftmost post, which is
                      precisely "left of the bench's leftmost leg"
             shape    0.11 x 0.05 in section is a rod

           I put that overhang there on purpose last round, reasoning that an
           apron reaching past its end posts makes the frame read as
           continuous. That reasoning is right on work-vision's bench (1.7
           long, 0.07 of overhang, 4%) and wrong here: 0.20 of unsupported bar
           at this scale, with the belt's own end at 8.30 and the leg at 8.65,
           produced three staggered ends inside 0.35 units, and the middle one
           reads as detached.

           FIXED BY DYING INTO THE POSTS. 5.50 is EXACTLY the outer-leg span
           (14.15 - 8.65), the same length and the same rule as the low rail
           below, so there is now no unsupported end anywhere in the assembly.
           At 89% of the belt's length it still reads as a full apron.

           The rest is unchanged: 0.11 tall centred GROUND + 0.475 hangs
           directly off the belt's underside (GROUND + 0.53) with no gap, and
           z -1.17 with 0.05 of depth spans -1.195..-1.145, standing 0.005
           proud of the belt's front face at -1.15. */
        const benchApron = bx(5.50, 0.11, 0.05, cabBlue);
        put(benchApron, 11.4, GROUND + 0.475, -1.17, false);
        /* THE LOW RAIL, down the centre line in z so it passes through all
           four legs. 5.50 long is EXACTLY the outer-leg span (14.15 - 8.65),
           so it dies into the outer posts instead of overhanging them — a
           rail that oversails reads as a dropped bar. At GROUND + 0.20 it
           sits in the lower third of the 0.53 leg, where a shelf rail goes. */
        const benchRail = bx(5.50, 0.05, 0.05, cabBlue);
        put(benchRail, 11.4, GROUND + 0.20, -1.6, false);
        const parts: THREE.Mesh[] = [];
        for (let i = 0; i < 4; i++) {
          /* KRAFT, like the apron cartons — and this reverses an earlier
             call in this same pass, so the reason is worth keeping.

             The argument for leaving these grey was that they are machined
             PARTS passing a head, not parcels, and boarding them would turn
             the factory line into a parcel conveyor. That distinction is real
             and it does not survive this framing: at the checkpoint pan these
             four are the most prominent boxes in shot, and an untextured box
             at that size reads as exactly the white placeholder the rest of
             this pass exists to eliminate. VISUAL CONSISTENCY WINS over the
             taxonomy — a site where one row of boxes is board and another is
             blank plastic reads as unfinished, not as two kinds of cargo.

             Free, like the cartons: same shared `cartonBoard` material on the
             same module-cached `cardboardSide()` canvas. No new texture, no
             new material, no draw-call state change between them. */
          const pm = bx(0.7, 0.42, 0.6, cartonBoard);
          put(pm, 0, GROUND + 0.92, -1.6);
          parts.push(pm);
        }

        /* -- people: staff walking the site (Work Vision) --
           A capsule and a head is all that survives at this size, and it reads
           as a person immediately. They walk fixed paths at different speeds so
           the site looks staffed rather than choreographed. Their vertical bob
           is fine — the no-vertical rule governs the CAMERA, not the subject.

           THEY NOW STAND ON THE FLOOR. The capsule is r 0.16 / len 0.42, so its
           total height is 0.42 + 2 x 0.16 = 0.74 and its half-height is 0.37.
           Centred at GROUND + 0.62 its bottom sat at GROUND + 0.25 — a quarter
           of a metre of hover on figures that have no feet to hide it. Dropped
           by exactly 0.25: torso GROUND + 0.62 -> GROUND + 0.37 (bottom now
           GROUND + 0.00) and head GROUND + 1.02 -> GROUND + 0.77, which keeps
           the head 0.40 above the torso centre exactly as before.

           THE BOB NEEDS NO BIAS, and this was checked rather than assumed. The
           frame loop writes `Math.abs(Math.sin(...)) * 0.035` — a rectified
           sine, so its range is [0, +0.035], never negative. It ALREADY only
           travels upward from its resting value. Resting is now contact, so the
           full stride runs GROUND .. GROUND + 0.035 and no part of it sinks
           into the floor. The alternative (lowering by 0.215 to leave clearance
           for a symmetric bob) would reintroduce a permanent 0.035 hover to
           solve a problem the rectifier had already solved. Full 0.25 it is.
           If anyone ever un-rectifies that sine, this comment is the reason
           they now have to bias it instead. */
        /* ================= THE WORKERS' GROUND CONTACT =================

           They read as floating bollards because nothing tied them to the
           slab — the same problem the truck had before its decal, and the
           same fix, so it uses the SAME TEXTURE: `csTex`, the 64px smoothstep
           radial ramp already built above for the truck's contact shadow.
           ZERO new canvases for five more shadows.

           IT IS NOT A CHILD OF THE WALKER, AND THAT IS TWO SEPARATE BUGS
           AVOIDED. Parenting the puck to `pr.grp` would have

             1. lifted it with the walking bob. The frame loop writes the
                stride into `pr.grp.position.y`, so a child at a fixed local y
                rides up with every step — and a contact shadow that leaves
                the ground is worse than none. The truck's decal note makes
                the same call for the same reason: it takes the truck's x and
                nothing else.
             2. grown four detection brackets. people[0], [2], [3] and [4] are
                all in `pools`, and the tracker boxes its target with
                Box3.setFromObject, which walks children — a 0.62-wide flat
                quad at the feet would have pushed each bracket 0.135 wider on
                both sides and down to the floor. `dockedRig`'s note records
                this exact hazard.

           So the pucks live in `g` and join `dynamic`, which is precisely the
           documented arrangement the truck's own contact shadow uses. Their x
           is written beside the walker's in the people loop; their y and z
           are set once here and never touched again.

           SIZE. The capsule is r 0.16, so the body is 0.32 across; a 0.62
           quad is 1.94x that, which is the spread a soft shadow from a high
           key has. `csTex` is a square ramp and the puck is square, so no
           elongation — a standing figure's contact patch is round.

           HEIGHT GROUND + 0.004: above the studio's shadow catcher at exactly
           GROUND and above the road paint at GROUND - 0.002. renderOrder 1
           puts it over the paint (-1) and over the truck's decal (0). Every
           plane in that stack has depthWrite off, so renderOrder is the only
           authority — see the roadway's note in site.ts. */
        const PUCK_S = 0.62;
        const PUCK_PEAK = 0.35;
        const puckGeo = new THREE.PlaneGeometry(PUCK_S, PUCK_S);
        const puckMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          alphaMap: csTex ?? undefined,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        });
        /* Fogs with the ground it lies on, like the truck's decal and the
           road paint — it is a mark on the slab, not an overlay. */
        puckMat.fog = true;
        /* Held OUT of `mats`: that list is a blunt "set everything to solid"
           and this peaks at PUCK_PEAK, exactly like the roadway's paint and
           `csMat`. It is ramped by hand in the frame loop. */
        const people: { grp: THREE.Group; puck: THREE.Mesh; x0: number; x1: number; z: number; sp: number; ph: number }[] = [];
        const PEOPLE = [
          { x0: -9.5, x1: -2.0, z: 1.9, sp: 1.0, ph: 0.0 },
          { x0: 1.0, x1: 7.5, z: 2.4, sp: 0.72, ph: 0.35 },
          /* z 0.6 -> 1.5: at 0.6 this walker's whole patrol was down the
             middle of the carriageway. 1.5 is 0.3 clear of the kerb — walking
             the verge beside the road, which also happens to be the shot that
             makes the road look used. */
          { x0: 8.0, x1: 13.5, z: 1.5, sp: 0.86, ph: 0.7 },
          { x0: -3.0, x1: 3.0, z: -1.9, sp: 0.6, ph: 0.15 },
          /* ================= BURIED-TO-THE-NECK, CONFIRMED =================
             z -2.6 -> -3.6. This is the only walker whose x range overlaps
             the factory line (its 4.0..9.0 against the belt's 8.30..14.50),
             and it was passing BEHIND it close enough to be occluded.

             SOLVED FROM THE REAL CAMERA, not judged. `placeCamera` puts the
             lens at (camX + rad sin az, rad x 0.30, -1.0 + rad cos az), so on
             the desktop card (rad 9.34, az 0.29) it is at world y 2.802,
             z 7.950. The belt's far edge is z -2.05 with its top at
             GROUND + 0.71 = world -0.540. A point at world y `py` behind the
             belt is visible over it when the ray from the lens is still above
             -0.540 as it crosses z = -2.05:

               u = (7.950 + 2.05) / (7.950 - zw)
               y = 2.802 + u x (py - 2.802)   must be > -0.540

             Run for the VEST, because the vest is the walker's one
             identifying feature (world y -0.757 top, -1.003 bottom):

               zw = -2.6    top -0.571 HIDDEN   bottom -0.805 HIDDEN
               zw = -2.7    top -0.540 grazing  bottom -0.771 hidden
               zw = -3.3    top -0.361 visible  bottom -0.580 hidden
               zw = -3.436  top -0.324 visible  bottom -0.540 grazing
               zw = -3.6    top -0.279 visible  bottom -0.493 VISIBLE

             So at -2.6 the ENTIRE vest was behind the belt and only the head
             and helmet cleared it — exactly the reported read. -3.436 is the
             threshold and -3.6 is the first round value past it with margin.

             CLEARANCES CHECKED AT THE NEW z, because -3.6 walks into the
             dock bay. The walker is a capsule of r 0.175 about its path:
               docked trailer body  x 0.20..3.80, z -3.55..-2.45
                 -> walker's x never goes below 4.0 - 0.175 = 3.825   clear
               its rear door bars   x 3.84..3.87, nearest z -3.345
                 -> walker reaches z -3.425                    clear by 0.08
               bogie wheels + hubs  x 2.40/3.30                       clear
               dock wall            z -4.85..-4.35             0.75 in front
             Fog at the new depth is ~26%, the same band the yard stacks read
             in, so it stays a legible detection target (it is people[4], in
             pool 3).

             THE WRAP IS UNAFFECTED: z is not wrapped. Only x is, and x0/x1
             are untouched, so the patrol's midpoint — which is what
             `wrapTo`/`wrapWith` key on — is unchanged at 6.5. */
          { x0: 4.0, x1: 9.0, z: -3.6, sp: 0.9, ph: 0.55 },
        ];
        /* ================= THE CAPSULES BECOME WORKERS =================

           A grey pin does not read as a person; a grey pin with a hi-vis band
           and a yellow hat reads as one instantly, and at 20-40px tall that is
           the ENTIRE budget. No limbs — see VEST_ORANGE's note. The walk
           paths, speeds, phases, bob and turn are untouched.

           THE VEST. "Roughly the middle third of the body height", measured
           off the geometry that is already there rather than picked: the
           capsule is r 0.16 / len 0.42, total height 0.42 + 2 x 0.16 = 0.74,
           spanning GROUND + 0.00 .. 0.74. The middle third is
           0.74/3 = 0.24667 tall, running 0.24667 .. 0.49333, so its centre is
           GROUND + 0.37 — which is EXACTLY the torso's own centre, because a
           capsule is symmetric about it. One number, no offset.

           IT IS A CYLINDER AT r 0.175, NOT 0.16. The capsule's straight
           section runs y 0.16 .. 0.58 (the 0.42 barrel between the two caps),
           and the vest band 0.24667 .. 0.49333 sits wholly inside it, so a
           plain cylinder is the exact right shape — no cap needed. 0.175 is
           0.015 proud of the capsule so the two surfaces cannot z-fight, and
           15mm of proud vest is also just what a vest over a shirt looks like.
           Open-ended: the end caps would be two discs buried inside the torso.

           THE HELMET is an upper hemisphere over the head sphere. Head r
           0.145 at GROUND + 0.77; shell r 0.152 at the same centre, 7mm proud
           for the same non-fighting reason, sweeping phiLength PI/2 so it
           covers the crown down to the equator and leaves a band of head
           below it. A full sphere would be a yellow ball, which is a hat only
           by accident.

           GEOMETRIES ARE BUILT ONCE AND SHARED by all five walkers, and they
           are FRESHLY ALLOCATED here (not from `metalBox`'s shared cache), so
           they are this scene's to dispose — see the teardown. */
        const VEST_H = 0.74 / 3;              // 0.24667, the middle third
        const vestGeo = new THREE.CylinderGeometry(0.175, 0.175, VEST_H, 10, 1, true);
        const helmetGeo = new THREE.SphereGeometry(0.152, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        for (const spec of PEOPLE) {
          const grp = new THREE.Group();
          const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 8), dark);
          torso.position.y = GROUND + 0.37;   // half-height 0.37 -> bottom on GROUND
          torso.castShadow = true;
          grp.add(torso);
          const vestM = new THREE.Mesh(vestGeo, vest);
          vestM.position.y = GROUND + 0.37;   // == the capsule's centre, see above
          grp.add(vestM);
          const headM = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), dark);
          headM.position.y = GROUND + 0.77;   // 0.40 above the torso centre, as before
          grp.add(headM);
          const hatM = new THREE.Mesh(helmetGeo, helmet);
          hatM.position.y = GROUND + 0.77;    // concentric with the head
          grp.add(hatM);
          g.add(grp);
          const puck = new THREE.Mesh(puckGeo, puckMat);
          puck.rotation.x = -Math.PI / 2;
          /* z is fixed for the life of the scene — a walker's patrol is a
             straight run along x at a constant z — so only x is written per
             frame. y is never written again. */
          puck.position.set(0, GROUND + 0.004, spec.z);
          puck.renderOrder = 1;
          puck.castShadow = false;
          g.add(puck);
          people.push({ grp, puck, ...spec });
        }

        /* -- the cameras that see all of it: four poles, four arcs -- */
        const heads: { yawGrp: THREE.Group; beam: THREE.Mesh; beamMat: THREE.MeshBasicMaterial }[] = [];
        const POLES = [
          { x: -9.6, z: 3.6, base: -0.35, arc: 0.5, period: 1.0, phase: 0.0 },
          { x: -1.6, z: 4.0, base: 0.05, arc: 0.55, period: 0.78, phase: 0.4 },
          { x: 6.2, z: 4.0, base: 0.1, arc: 0.5, period: 0.9, phase: 0.15 },
          { x: 13.2, z: 3.4, base: 0.4, arc: 0.45, period: 1.15, phase: 0.65 },
        ];
        const beamMats: THREE.MeshBasicMaterial[] = [];
        /* Built once and shared by all four beams. ConeGeometry runs along +Y
           with its apex at +h/2; translating by -h/2 puts the apex at the
           origin and rotating +90deg about Z lays it along +X, which is the
           optical axis of these heads (the barrel sits at local +x). */
        const beamGeo = new THREE.ConeGeometry(1, 1, 4, 1, true);
        beamGeo.translate(0, -0.5, 0);
        beamGeo.rotateZ(Math.PI / 2);
        const _tp = new THREE.Vector3();
        const _hp = new THREE.Vector3();
        /* Each pole's three top-level pieces, recorded per head. The treadmill
           wraps by nearest copy, and pole / arm / yaw group have base x of
           P.x, P.x+0.3 and P.x+0.62 — close, but not identical, so at the
           moment the wrap boundary falls between them they would round to
           different tiles and the head would detach from its own mast. They
           are wrapped as a unit instead. */
        /* Shared by the camera masts and the high masts below. Conical, wider
           at the bottom; 0.10 tall centred GROUND + 0.05 so its bottom face
           is exactly GROUND and it stands 0.10 up the pole. */
        const footGeo = new THREE.CylinderGeometry(FOOT_R_TOP, FOOT_R_BOT, FOOT_H, 12);
        const lensGeo = new THREE.CylinderGeometry(LENS_R, LENS_R, 0.02, 12);
        const headRig: THREE.Object3D[][] = [];
        for (const P of POLES) {
          const pole = bx(0.14, 4.6, 0.14, steel);
          put(pole, P.x, GROUND + 2.3, P.z);
          const arm = bx(0.7, 0.11, 0.11, steel);
          put(arm, P.x + 0.3, GROUND + 4.5, P.z, false);
          /* THE BASE PLATE, and it MUST take its head's tile index like every
             other piece of the mast. It is pushed into `headRig` below rather
             than placed and forgotten: `headRig.forEach(...)` is what writes
             `tileOwner`, so joining that array is the entire registration.
             A foot left to wrap on its own would round to a different tile
             from its pole at the boundary — the exact failure the pole/arm/
             yawGrp note describes — and a base plate 27 units from its mast
             is the most obvious possible artefact. */
          const foot = new THREE.Mesh(footGeo, skirtTone);
          put(foot, P.x, GROUND + FOOT_H / 2, P.z, false);
          const yawGrp = new THREE.Group();
          headRig.push([pole, arm, yawGrp, foot]);
          yawGrp.position.set(P.x + 0.62, GROUND + 4.42, P.z);
          g.add(yawGrp);
          /* HOUSING, NOT `dark`. `dark` is makeMetal's mapped `painted`
             finish, whose panel joints and scuffs are authored for surfaces
             metres across; on a 0.5-unit camera body they render at a scale
             that reads as gravel. A moulded housing is smooth — see HOUSING.
             The MAST and the ARM stay on `steel`: those really are structural
             sections and the map is right on them. */
          const head = bx(0.5, 0.28, 0.34, housing);
          head.castShadow = true;
          yawGrp.add(head);
          const hood = bx(0.56, 0.07, 0.38, housing);
          hood.position.y = 0.18;
          yawGrp.add(hood);
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 14), housing);
          barrel.rotation.z = Math.PI / 2;
          barrel.position.x = 0.3;
          yawGrp.add(barrel);
          /* THE LENS. The head's optical axis is local +X and the barrel runs
             x 0.20..0.40 with a front radius of 0.10, so a disc of r 0.055
             at x 0.41 caps that face and stands 0.01 proud of it — inside the
             barrel's own rim, which is what makes it read as glass set into a
             housing rather than as a cap stuck on the end.

             `hubTone` (#6B737E) is the lightest thing on the whole mast, and
             deliberately: a camera reads as a device because of its glass.
             It always faces the target, because it is parented to `yawGrp`
             which is what the aiming code rotates — so the one bright feature
             on the head is pointed at whatever the head is reading, which is
             the claim this card is making. */
          const lens = new THREE.Mesh(lensGeo, hubTone);
          lens.rotation.z = Math.PI / 2;
          lens.position.x = 0.41;
          yawGrp.add(lens);
          /* the beam makes each head's aim legible without a label.
             #3AA0DC -> #5CC8FF (PALETTE.accent). These cones are unlit,
             `toneMapped: false` graphics, so they render at their literal sRGB
             value and get NO help from the exposure lift above — the mid blue
             was chosen to darken a white frame it was crossing, and on #0E1015
             a darker-than-mid blue is simply less visible than the backdrop.
             The dark scenes' accent is the one that reads here. */
          const bm = new THREE.MeshBasicMaterial({
            color: "#5CC8FF", transparent: true, opacity: 0,
            side: THREE.DoubleSide, depthWrite: false, toneMapped: false,
          });
          /* UNFOGGED, and this is a per-material decision rather than a blanket
             rule. A sight cone is not a surface in the world — it is the
             system's own drawing of where a camera is looking, in the same ink
             as the brackets — so distance must not dim it. It also has to stay
             legible at the far end of a 15-unit throw, and at fog far = 3x rad
             a beam crossing the frame would lose about a third of its density
             exactly where it lands on its target: the cone would taper into
             nothing right at the point it is supposed to be making. (Note the
             spec's premise is inverted here: three's MeshBasicMaterial has
             `fog: true` by DEFAULT, so adding scene.fog silently fogs every
             detection graphic unless it is turned off — which is why this line
             exists at all.) The cone's geometry, shader and colour are
             untouched; only this flag is set. */
          bm.fog = false;
          beamMats.push(bm);
          mats.push(bm);
          /* UNIT cone: apex at the origin, opening along +X, one unit long and
             one unit in radius at the far end. Per frame it is scaled to the
             real distance to the target, so the beam always lands ON the thing
             being detected instead of stopping in mid-air at a fixed 7.4. */
          const beam = new THREE.Mesh(beamGeo, bm);
          beam.position.set(0.42, 0, 0);
          yawGrp.add(beam);
          heads.push({ yawGrp, beam, beamMat: bm });
        }

        /* ================= THE HIGH MASTS =================
           See MAST_X / MAST_H / HALO_* at module scope for the height
           derivation, the x spacing against the camera masts, and why no
           THREE.Light and no pendant import.

           EACH MAST IS ONE GROUP, AND THAT IS THE WRAP REGISTRATION. The
           treadmill wraps TOP-LEVEL children of `g` by writing
           `o.position.x = baseX + PERIOD * k`, so a group placed at
           `position.x = MAST_X[i]` with all five of its pieces at LOCAL x
           wraps as a single rigid unit. That is the fix the camera masts had
           to make the hard way: pole, arm and yaw group have base x of P.x,
           P.x+0.3 and P.x+0.62, near enough to round to different tiles at
           the boundary and detach from each other. A group cannot do that,
           because there is only one x to round.

           They take NO tileOwner: no camera is aimed at them and they are not
           in any pool, so they wrap to their own nearest copy and recede past
           like the rest of the scenery. Teleport happens at PERIOD/2 = 13.5
           from the camera, against a visible half-span of 6.39. */
        const haloMat = new THREE.MeshBasicMaterial({
          color: HALO_WARM,
          alphaMap: csTex ?? undefined,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        });
        /* FOG ON, which is the opposite call from the sight cones and the
           brackets. Those are the system's own drawing and must not dim with
           distance; this is a real light in the yard and must. Additive plus
           fog also behaves correctly by construction: fog pulls the source
           toward the near-black fog colour, and adding near-black adds
           nothing, so a far mast's halo simply fades out. */
        haloMat.fog = true;
        /* Held out of `mats` — peaks at HALO_PEAK, not 1. */
        const haloGeo = new THREE.PlaneGeometry(HALO_SIZE, HALO_SIZE);
        /* THE GROUND POOL. Its own material because its peak is a third of
           the halo's and a material carries one opacity — same reason the
           lane paint could not share the road paint's. Same colour, same
           additive blend, same `csTex` ramp, so no new texture. */
        const poolMat = new THREE.MeshBasicMaterial({
          color: HALO_WARM,
          alphaMap: csTex ?? undefined,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        });
        poolMat.fog = true;
        const poolGeo = new THREE.PlaneGeometry(POOL_W, POOL_D);
        for (const mx of MAST_X) {
          const mast = new THREE.Group();
          mast.position.x = mx;               // the ONLY x the wrap will write
          g.add(mast);

          /* Pole 0.16 square x MAST_H, centred GROUND + MAST_H/2 = 3.5, so it
             runs GROUND + 0.00 .. GROUND + 7.00. */
          const pole = bx(0.16, MAST_H, 0.16, steel);
          pole.position.set(0, GROUND + MAST_H / 2, MAST_Z);
          pole.castShadow = false;
          mast.add(pole);

          const foot = new THREE.Mesh(footGeo, skirtTone);
          foot.position.set(0, GROUND + FOOT_H / 2, MAST_Z);
          mast.add(foot);

          /* Cross-arm at GROUND + 6.90, i.e. 0.10 below the pole top so the
             pole finishes above it rather than stopping at it. 1.50 long,
             symmetric, so the two floods hang either side of the mast. */
          const arm = bx(1.50, 0.12, 0.12, steel);
          arm.position.set(0, GROUND + 6.90, MAST_Z);
          arm.castShadow = false;
          mast.add(arm);

          /* Two flood boxes at x +- 0.55 (inside the arm's +- 0.75 ends),
             hung UNDER the arm: 0.16 tall centred GROUND + 6.76 spans
             6.68..6.84, and the arm's underside is 6.84. Tilted 0.35 rad nose
             down, which is a fixed rotation set once — nothing here animates. */
          for (const sx of [-0.55, 0.55]) {
            const flood = bx(0.34, 0.16, 0.22, housing);
            flood.position.set(sx, GROUND + 6.76, MAST_Z);
            flood.rotation.x = 0.35;
            flood.castShadow = false;
            mast.add(flood);
          }

          /* ONE halo per mast, centred on the arm between the two floods.
             NOT BILLBOARDED IN A SHADER, unlike lamp.ts's — that needs a
             ShaderMaterial and this is a MeshBasicMaterial on the alphaMap
             that already exists. It is left facing +z, the side the camera
             is on. Worst-case obliquity is the camera's own azimuth (0.29)
             plus the lateral angle to a mast at the frame edge
             (atan(6.39/9.34) = 0.60), so ~0.89 rad and cos 0.63: a soft
             radial blob squashed to 63% of its width, which is not a
             readable change on a shape that has no edge. */
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.position.set(0, GROUND + 6.76, MAST_Z + 0.20);
          halo.renderOrder = 2;
          mast.add(halo);

          /* THE POOL THE FLOODS THROW. Directly under the mast, laid flat on
             the slab at GROUND + 0.003 — above the road paint (GROUND-0.002)
             and below the workers' pucks (GROUND+0.004), and renderOrder 0
             sits it over the paint's -1. It never shares ground with either:
             the masts are at z = -6.2 and the road is at z = 0, so the stack
             order here is a formality rather than a contest.

             INSIDE THE MAST GROUP, so it takes the mast's single wrapped x
             and can never be left behind by its own lamp. */
          const pool = new THREE.Mesh(poolGeo, poolMat);
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(0, GROUND + 0.003, MAST_Z);
          pool.renderOrder = 0;
          pool.castShadow = false;
          mast.add(pool);
        }

        /* ================= THE HORIZON =================
           See HORIZON / HORIZON_TONE at module scope for the tone reasoning
           and for the span chain that keeps the band gap-free across the
           27-unit period.

           ONE SHARED UNIT BOX, SCALED. Seven distinct sizes through `bx()`
           would mint seven RoundedBoxGeometries in metal.ts's shared cache
           for objects that are pure silhouette — nothing here has an edge
           highlight to catch, so the rounding buys nothing and the cache
           entries would outlive the scene. A single BoxGeometry(1,1,1) with a
           per-mesh scale is one buffer for all seven.

           Each mass is a plain top-level child of `g` with no tileOwner, so
           each wraps to its own nearest copy exactly as `yardBoxes` do — that
           independence is what makes the union periodic and therefore
           continuous, and it is why the chain arithmetic has to hold. */
        const horizonGeo = new THREE.BoxGeometry(1, 1, 1);
        /* EACH MASS IS A GROUP, even the four that hold a single box. That is
           what lets the three stepped towers sit at a local x OFFSET from
           their parent: a group has ONE position.x for the wrap to write, so
           parent and tower are welded and cannot round to different tiles at
           a boundary. Placing the tower as a second top-level mesh would have
           worked only at an IDENTICAL baseX (identical rounds identically —
           it is NEAR-identical that breaks the camera masts), which would
           have forced every tower to be dead-centred on its parent and made
           the whole roofline symmetric. One group per mass costs an empty
           Object3D and buys the offsets. */
        for (const [hx, hw, hh, tw, th, tdx] of HORIZON) {
          const grp = new THREE.Group();
          grp.position.x = hx;              // the ONLY x the wrap will write
          g.add(grp);
          const m = new THREE.Mesh(horizonGeo, horizonTone);
          m.scale.set(hw, hh, HORIZON_D);
          /* Bottom face on GROUND: centre is half the height above it. */
          m.position.set(0, GROUND + hh / 2, HORIZON_Z);
          m.castShadow = false;
          grp.add(m);
          if (tw > 0) {
            /* Stepped on top: its bottom face is the parent's roof, so the
               centre is hh + th/2 above GROUND. Depth 0.75 of the parent's so
               it steps back in z as well as in x — a tower flush with the
               parapet reads as a taller wall, not as a separate mass. */
            const tower = new THREE.Mesh(horizonGeo, horizonTone);
            tower.scale.set(tw, th, HORIZON_D * 0.75);
            tower.position.set(tdx, GROUND + hh + th / 2, HORIZON_Z);
            tower.castShadow = false;
            grp.add(tower);
          }
        }

        /* -- detections: attach to whatever the heads are covering --
           Four trackers cycle through the site's subjects. They are driven by
           the same clock as the heads, so a box only ever appears on something
           a camera is actually pointed at. */
        const dm = detectMaterials();
        /* RE-KEYED FOR DARK, HERE RATHER THAN IN detect.ts.

           detect.ts still ships the light-card palette — accent #1B7FC4, faint
           #5A6B7A — chosen on the explicit rule that "on light, an overlay reads
           by being DARKER and more saturated". That rule inverts with the ground
           and both values fail on #0E1015: #5A6B7A = (90,107,122) at 0.8 alpha
           lands at ~(75,89,102), which is a grey smear you cannot tell from the
           steel, and #1B7FC4 is darker than the cargo it is supposed to mark.

           detect.ts is shared with scenes outside this change's scope, so the
           colours are overridden on the instance instead. Values are the dark
           palette's own: PALETTE.accent for the conclusion, and a light slate
           for the secondary tier — still clearly not the accent (desaturated,
           and 0.8 alpha) but now clearly present. */
        dm.accent.color.set("#5CC8FF");
        dm.faint.color.set("#8FA3B4");
        dm.scan.color.set("#8FDCFF");
        /* Brackets stay UNFOGGED for the same reason as the cones, plus one
           more: a bracket is a constant-pixel-weight graphic (detect.ts scales
           its stroke by camera distance precisely so it does not change weight
           with depth), and fogging it would undo that on the z axis while the
           stroke correction held it on the view axis. An overlay either marks
           something or it does not; it does not get fainter for being at the
           back of the yard. */
        for (const m of dm.all) (m as THREE.MeshBasicMaterial).fog = false;
        mats.push(...dm.all);
        /* PADS TIGHTENED to 1.08-1.10, from 1.2-1.3. The loose pads date from
           before the bracket's depth-nudge was fixed to use the target's actual
           half-extent along the eye axis (see detect.ts) — until then a bracket
           on a deep object was buried inside it, and over-padding was the only
           thing that kept the corner arms clear of the silhouette. That is no
           longer true, so the box can sit where the object actually is. At 1.3
           a bracket on a 0.62 carton was drawing 0.19 of clear air on every
           side, which at card size reads as a box that has not quite locked. */
        // The tick-row confidence tally was removed from detect.ts's createTracker;
        // these are plain brackets now — do not re-add `ticks:` expecting it to work.
        const trackers = [
          createTracker(dm.accent, { pad: 1.08 }),
          createTracker(dm.accent, { pad: 1.08 }),
          createTracker(dm.accent, { pad: 1.10 }),
          createTracker(dm.accent, { pad: 1.10 }),
        ];
        trackers.forEach((t) => g.add(t.group));
        /* The pool each tracker draws from — one per product area, and now SIX
           slots each instead of three, with no repeats. The old pools ran
           [yard, yard, yard] and [truck, docked, TRUCK AGAIN], so a third of
           what the site ever showed you was the same truck twice in a row and
           the cycle came round every three detections — short enough that the
           card visibly repeated itself inside a single viewing. Six distinct
           targets per head, with the four pools at different lengths, means the
           combination of what all four are looking at does not repeat for a
           long time even though each pool does.

           Every entry is a genuinely different KIND of subject where the area
           allows it — a stacked container vs a ground container, a trailer vs
           the thing on the dock, a carton vs the pallet under it, a walker vs a
           part on the line — because the claim this card makes is that one
           layer reads all of it, and four boxes on four near-identical crates
           does not say that. */
        const pools: THREE.Object3D[][] = [
          [yardBoxes[3], yardBoxes[5], yardBoxes[1], yardBoxes[6], yardBoxes[0], yardBoxes[4]],
          /* THE TRUCK IS NO LONGER IN A POOL. It is on the road now, and the
             road belongs to every camera in turn rather than to head 1 — see
             THE HANDOFF. Keeping it here as well would have head 1 aiming at
             it on its own schedule while a different head was mid-handoff on
             the same vehicle, which is the one thing that would make the
             handoff unreadable. It also must not appear in `tileOwner`: the
             truck is camera-relative now, not tile-bound, and pool membership
             is what writes that map. Its two old slots are backfilled from
             this head's own bay. */
          [docked, yardBoxes[7], people[3].grp, yardBoxes[2], docked, people[3].grp],
          [cartons[2], pallet, cartons[4], cartons[0], cartons[5], cartons[1]],
          [people[0].grp, parts[1], people[2].grp, parts[3], people[4].grp, parts[0]],
        ];

        /* ================= THE TREADMILL =================
           The camera no longer loops — it tracks right forever. What loops is
           the SITE, by tiling underneath it.

           Every static prop gets re-placed each frame to the copy of itself
           nearest the camera: x = base + PERIOD * round((camX - base) / PERIOD).
           That makes the site infinitely periodic without building a single
           extra object, so the camera can run in one direction indefinitely and
           there is never a moment where it snaps back to the start.

           PERIOD 27 is the site's own width (props run x = -13 to +14). It has
           to be comfortably larger than the visible span — the framing shows
           ~11.5 units — because a prop teleports when it is PERIOD/2 = 13.5
           units from the camera, and that has to happen off-frame. If the site
           is ever widened, this number moves with it or props will jump in
           shot.

           27 IS ALSO AN EXACT IDENTITY WITH THE MASTS, and that is the reading
           that actually constrains it. The four camera masts sit at
           x = -9.6, -1.6, 6.2, 13.2, so the three in-tile gaps plus the gap
           across the tile boundary are

             -9.6 -> -1.6   8.0
             -1.6 ->  6.2   7.8
              6.2 -> 13.2   7.0
             13.2 -> 17.4   4.2      (= -9.6 + PERIOD, the next tile's mast 1)
                           ----
                           27.0  === PERIOD

           MOVING ANY ONE MAST BREAKS THIS SILENTLY. The handoff windows below
           are +-HANDOFF_HW about each mast and the wrap-around pair (mast 4 ->
           mast 1 of the next tile) only overlaps because that last gap is 4.2.
           Change a mast x without changing PERIOD and the truck falls out of
           every window for a stretch of road with no camera on it — which
           renders as the system losing the vehicle, not as an error.

           DYNAMIC things are excluded and handled by hand in frame(), because
           their x is already being written every frame: re-placing them here
           would just be overwritten, and they need to stay attached to the
           WRAPPED copy of the prop they belong to (the truck to its gantry, the
           parts to their belt) rather than to the original at its base x. */
        const PERIOD = 27.0;   // === 8.0 + 7.8 + 7.0 + 4.2, see above. Exact.
        const dynamic = new Set<THREE.Object3D>([
          truck,
          contactShadow,
          ...parts,
          ...people.map((pr) => pr.grp),
          /* The ground pucks. Their x is written beside their walker's every
             frame, so like the truck's contact shadow they must be kept OUT
             of the wrap or the wrap would overwrite it. Same entry, same
             reason — see the puck note above. */
          ...people.map((pr) => pr.puck),
          ...trackers.map((tr) => tr.group),
        ]);

        /* A HEAD AND EVERYTHING IT LOOKS AT SHARE ONE TILE.

           Wrapping each prop to its own nearest copy is right for scenery, but
           wrong for anything a camera is pointed at. Head bases sit at -9.6,
           -1.6, 6.2, 13.2 and each one's subjects sit within ~5 units of it, so
           for most of the pan they round to the same tile and nothing is odd.
           But the boundary is crossed at a different camX for each of them, and
           in that window the head lands on one tile and its subject on the
           next — 27 units apart. The result was a beam fired clean across the
           frame at a target on the far side of the site, which is the opposite
           of the claim ("that camera is reading that box").

           So every pooled subject, and every piece of the mast itself, takes
           its head's tile index rather than computing its own. The jump still
           happens off-frame: a head switches tiles when it is PERIOD/2 = 13.5
           units from the camera, its subjects are within ~5 of it, and the
           visible half-span is 5.75. */
        const tileOwner = new Map<THREE.Object3D, number>();
        headRig.forEach((rig, i) => rig.forEach((o) => tileOwner.set(o, i)));
        pools.forEach((pool, i) => pool.forEach((o) => tileOwner.set(o, i)));
        /* The docked trailer's running gear is not itself a detection target,
           so pool membership never gave it a tile. It must take head 1's — the
           same one `docked` takes — or on the frames where the boundary falls
           between them the wheels and legs would be re-placed a whole PERIOD
           away from the trailer they are holding up. */
        tileOwner.set(dockedRig, 1);

        const wrapItems = g.children
          .filter((o) => !dynamic.has(o))
          .map((o) => ({ o, baseX: o.position.x, owner: tileOwner.get(o) }));

        const ro = new ResizeObserver(studio.size);
        ro.observe(el);
        let onScreen = true;
        const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { rootMargin: "140px" });
        io.observe(el);

        /* The clock is STARTED ON THE FIRST RENDERED FRAME, not at construction.
         Building a scene blocks for a while; with a clock running from
         construction the first frame the user actually sees is already
         hundreds of milliseconds in, so the intro appears to skip its
         beginning. Starting it here means every viewer sees frame one. */
      const clock = new THREE.Clock(false);
      let clockStarted = false;
        const target = new THREE.Vector3();
        let raf = 0;

        const frame = () => {
          const t = reduce ? 7 : clock.getElapsedTime();

          /* The camera's x is now UNBOUNDED — no modulo, no phase, no return.
             It simply advances at PAN_SPEED for as long as the card is alive,
             and the site tiles under it (see THE TREADMILL above). This is what
             removes the restart: there is no longer a frame at which anything
             about the camera resets, so there is nothing for the eye to catch. */
          const camX = -1.6 + t * PAN_SPEED;
          /* One tile index per head, resolved before anything is placed, so
             masts and subjects can be pinned to it (see tileOwner above). */
          const headK = POLES.map((P) => Math.round((camX - P.x) / PERIOD));
          /* Floor and road ride the camera. FIRST, before anything reads world
             space off them and before the props are tiled — they are the
             surface everything else is standing on. */
          roadway.place(camX);
          /* Place every static prop on its tile — its own nearest copy for
             plain scenery, its head's tile for anything a camera is aimed at.
             Must run BEFORE updateMatrixWorld and before the head-aiming
             block, both of which read world positions off these objects. */
          for (const w of wrapItems) {
            const k = w.owner === undefined ? Math.round((camX - w.baseX) / PERIOD) : headK[w.owner];
            w.o.position.x = w.baseX + PERIOD * k;
          }
          const wrapTo = (baseX: number) => baseX + PERIOD * Math.round((camX - baseX) / PERIOD);
          const wrapWith = (baseX: number, headIdx: number) => baseX + PERIOD * headK[headIdx];

          /* ACTOR RATES ARE NOT DRIVEN BY LOOP. Every mover below is a function
             of raw `t`, so the loop period never governed them — which is why
             the scene read as sluggish however far the period came down. They
             are scaled ~1.5x from the original: truck 0.62 -> 0.95, line
             0.8 -> 1.2, walkers 0.16 -> 0.24 with the bob at 3.1 -> 4.2 so the
             stride still matches the ground covered.

             Each is anchored to the WRAPPED copy of the structure it belongs
             to, not to an absolute x — otherwise the camera would track away
             and leave the only truck on the site behind it forever. */
          /* THE TRUCK IS NO LONGER TILE-BOUND. It used to ride head 1's tile
             on a 17-unit run, which kept it in one bay and gave it exactly one
             camera — the opposite of the section's claim. It is now measured
             from the CAMERA: a constant-speed run of TRUCK_RUN relative to
             camX, so it drives the length of the site past every mast in turn
             and the handoff has something to hand off. Modulo, not a ping-pong
             or an ease: see THE TRAFFIC. */
          truck.position.x = camX + ((t * TRUCK_REL) % TRUCK_RUN) - TRUCK_RUN / 2;
          /* The shadow takes the truck's x and NOTHING else — y and z were set
             once at construction and are never written again, so no future
             bounce or roll on the truck can lift the shadow off the ground. */
          contactShadow.position.x = truck.position.x + CS_OFF_X;

          // the line runs, on head 3's belt (belt base x = 11.4, parts sit from
          // -3.0 to +3.4 relative to it)
          const beltX = wrapWith(11.4, 3);
          parts.forEach((pm, i) => {
            pm.position.x = beltX - 3.0 + ((t * 1.2 + i * 1.6) % 6.4);
          });

          // people walk their paths, turning at each end, with a walking bob.
          // The path is wrapped as a whole, by its own midpoint, so a walker
          // never gets split from the patch of site it patrols.
          people.forEach((pr) => {
            const u = (t * 0.24 * pr.sp + pr.ph) % 2;
            const fwd = u < 1;
            const k = fwd ? u : 2 - u;
            const mid = (pr.x0 + pr.x1) / 2;
            // walkers that a head tracks ride that head's tile; the rest wrap
            // on their own, by the midpoint of their path so a patrol is never
            // split across two tiles
            const owner = tileOwner.get(pr.grp);
            const off = (owner === undefined ? wrapTo(mid) : wrapWith(mid, owner)) - mid;
            const wx = off + lerp(pr.x0, pr.x1, k);
            pr.grp.position.set(wx, Math.abs(Math.sin(t * 4.2 * pr.sp)) * 0.035, pr.z);
            pr.grp.rotation.y = fwd ? Math.PI / 2 : -Math.PI / 2;
            /* The puck takes the walker's x and NOTHING else. It is a
               sibling, not a child, so the bob written into `pr.grp.position.y`
               on the line above cannot reach it and the shadow stays welded to
               the slab through every stride. Its y and z were set at
               construction and are never written again. */
            pr.puck.position.x = wx;
          });

          /* The seam dip that used to live here is GONE, along with the thing
             it was hiding. It faded the scene down for 0.28s at each end of the
             loop to cover the camera teleporting back to its start; with the
             treadmill there is no teleport to cover, so the card no longer
             blinks every 8 seconds. Only the intro fade remains. */
          const solid = reduce ? 1 : easeInOut(clamp01((t - 0.2) / SETTLE));
          mats.forEach((m) => { (m as THREE.Material & { opacity: number }).opacity = solid; });
          /* The floor and the road ramp with everything else. They are held
             outside `mats` because their peak opacities are not 1 — the grid
             runs at 0.12 and the road paint at 0.42 — and `mats` is a
             blunt "set everything to solid" list. */
          roadway.setOpacity(solid);
          /* Same ramp as the road it lies on, held out of `mats` for the same
             reason the road paint is: its peak is not 1. */
          csMat.opacity = solid * CS_PEAK;
          /* The other two ramps whose peak is not 1, held out of `mats` for
             the same reason. NEITHER PULSES: both are a constant times
             `solid`, and `solid` reaches 1 at SETTLE and stays there. */
          puckMat.opacity = solid * PUCK_PEAK;
          haloMat.opacity = solid * HALO_PEAK;
          poolMat.opacity = solid * POOL_PEAK;
          // each beam brightens only while its own detection is live
          /* 0.17/0.05 -> 0.30/0.10. These are straight alpha blends, so the
             arithmetic is exact and it is what forced the raise: at 0.17 over
             the backdrop mid (14,16,21) the lit beam landed at
             0.17x(92,200,255) + 0.83x(14,16,21) = (28,47,61) — a 30-value lift
             on a near-black frame, invisible at card scale. At 0.30 it lands at
             0.30x(92,200,255) + 0.70x(14,16,21) = (37,71,87) = #254757, which
             is a cone you can actually follow from head to target. The unlit
             floor moves with it (0.05 -> 0.10) so the ratio between "aiming"
             and "reading" stays ~3:1 and the beams still visibly pulse. */
          /* THE BEAM OPACITIES USED TO BE SET HERE, on their own timer. They
             now live in the head loop below, because a beam's brightness is
             the same fact as what its head is looking at and a head on the
             road follows the truck's position rather than a phase. */
          /* 0.3 -> 0.45, matching yard-vision (the flagships run 0.44-0.62).
             A ShadowMaterial only DARKENS what is under it, so on a light card
             it was the main thing grounding the subjects and had to be held
             back; against #0A0B0E it has almost nothing left to take away, and
             the higher value is what keeps a contact shadow legible where it
             falls across the glow pool. It cannot murk the scene — it never
             touches the subjects, only the ground behind them. */
          shadowMat.opacity = solid * 0.45;

          /* ONE loop, because aim and detection are the same fact. The head
             yaws onto its target, the beam is pitched and stretched to reach
             it, and the bracket lands on that same object — so a detection
             always sits at the end of a beam that is pointing at it.

             updateMatrixWorld is load-bearing: getWorldPosition reads the
             matrix, and the walkers, truck and forklift have all been moved
             earlier this frame. */
          g.updateMatrixWorld(true);
          const truckX = truck.position.x;   // `g` is untransformed, so local == world
          heads.forEach((h, i) => {
            h.yawGrp.getWorldPosition(_hp);

            /* ---- ACQUIRE, TRACK, RELEASE ----
               `acq` is this camera's hold on the truck: 0 outside its window,
               ramping to 1 over the outer ACQUIRE_EDGE, flat at 1 across the
               middle. Because adjacent windows overlap, two heads can both
               have a non-zero hold at once — one ramping down, one ramping up
               — which is what a handoff looks like.

               THE ROAD OUTRANKS THE POOL. A head with any hold at all abandons
               its site sweep and goes to the truck; otherwise it carries on
               reading its own patch, so no camera is ever idle. */
            const acq = clamp01((HANDOFF_HW - Math.abs(truckX - _hp.x)) / ACQUIRE_EDGE);
            const phase = t * 0.34 + i * 0.7;
            const slot = Math.floor(phase % pools[i].length);
            const siteOn = (phase % 1) < 0.72;
            const onRoad = acq > 0;
            const target = onRoad ? truck : pools[i][slot];
            /* The cone leads the bracket: it is already brightening at acq 0
               and the box does not land until 0.25. Look first, conclude
               second — a bracket that appears at the same instant as the cone
               reads as a pre-scripted cut rather than as a detection. */
            const on = onRoad ? acq > 0.25 : siteOn;
            /* 0.10 unlit floor / 0.30 lit, unchanged from the old timer — see
               the alpha arithmetic in the previous version of this block. On
               the road the lit end is reached through `acq` instead of a
               step, so acquisition and release are visible as the cone
               filling in and draining out. */
            h.beamMat.opacity = (0.10 + 0.20 * (onRoad ? acq : siteOn ? 1 : 0)) * solid;

            target.getWorldPosition(_tp);
            const dx = _tp.x - _hp.x, dz = _tp.z - _hp.z;
            const flat = Math.hypot(dx, dz);
            const drop = _hp.y - _tp.y;
            // optical axis is local +X, so this is the yaw that puts it on target
            h.yawGrp.rotation.y = Math.atan2(-dz, dx);
            // and this is the pitch, in the vertical plane the yaw just chose
            h.beam.rotation.z = -Math.atan2(drop, flat);
            /* REACH, not raw distance — the beam is parented at x = 0.42 (just
               off the lens housing), so scaling it by the full head-to-target
               distance made every beam overshoot its own subject by 0.42 units.
               At card size that is the difference between a cone that lands on
               the container and one that visibly passes through it.

               0.06 half-width, down from 0.14. atan(0.14) is an ~8deg half
               angle, and at the 12-18 unit throws in this scene that put a
               2.5-unit-wide mouth on the cone — a floodlight, not a camera's
               field of attention. 0.06 is ~3.4deg, so the beam reads as an
               optical axis with a little spread, and the bracket at the end of
               it is the thing that says what was found. */
            const reach = Math.max(0.1, Math.hypot(flat, drop) - 0.42);
            /* THE MOUTH IS CAPPED, so the cone is not a pure angle. A constant
               half-angle means width grows with throw, and these heads pick
               targets right across the site: at the 25-unit throws that
               produces a 3-unit-wide mouth, which at this framing is a third of
               the frame height — the pale band that read as haze lying over the
               whole scene rather than as one camera looking at one thing.
               0.55 lets the near beams keep their natural taper (0.06 x 8 =
               0.48, under the cap) and stops the far ones from opening up. */
            const mouth = Math.min(reach * 0.06, 0.55);
            h.beam.scale.set(reach, mouth, mouth);

            trackers[i].follow(on ? target : null, camera);
          });

          /* Viewport camera: a slow lateral TRACK across the site. A site this
             wide cannot be orbited — you drive past it. Locked height, per the
             house rule. */
          /* The site is ~30 units wide. At a 30-degree vertical fov on a 16:9
             frame that needs roughly 30 units of standoff to fit — parked any
             closer the camera is INSIDE the site and reads as a single-subject
             shot rather than an overview of an operation. Height is locked, as
             everywhere else; only the aim slides. */
          target.set(camX, 0.6, -1.0);
          /* Frame from the SITE'S OWN WIDTH, not from a hand-tuned distance.
             The slot this lands in is ~513x201 on the real card and 16:9 in the
             lab, and a fixed standoff cannot serve both — at the card's short,
             wide aspect a distance tuned for 16:9 leaves the site tiny. Solving
             for "the site fills 90% of the horizontal field" makes the scene
             fill whatever box it is given. */
          const aspect = (renderer.domElement.clientWidth || 1) / (renderer.domElement.clientHeight || 1);
          /* ONE BAY, not the whole site. Poles sit at x = -9.6, -1.6, 6.2 and
             13.2; framing the ~8-unit span between two of them puts a camera at
             each edge of frame with the work happening between, which is what
             actually reads at card size. The whole site at 30 units wide made
             every subject too small to identify. */
          const SITE_W = 11.5;
          const halfFov = (30 * Math.PI) / 180 / 2; // camera fov is 30deg vertical
          const rad = (SITE_W / (2 * 0.9)) / (Math.tan(halfFov) * Math.max(aspect, 0.4));
          /* The azimuth breathes on a slow sine of RAW t — not of the loop
             phase. Anything driven by phase has to return to its starting value
             once per loop, which is exactly the kind of reset the treadmill
             exists to remove; a 52-second sine (0.12 rad/s) never repeats
             against the 27-unit site period, so the angle the site is seen from
             keeps drifting without ever landing back on a frame you have
             already seen. The +-0.03 swing is deliberately small — the lateral
             track is the movement here, and the angle is just enough to stop
             the site looking like a flat elevation. */
          /* FOG IS NORMALISED TO THE FRAMING, which is why it is set here and
             not once at construction: `rad` is solved from the aspect ratio,
             and the same card is ~2.55:1 on the desktop homepage, 16:9 in the
             lab and 4:3 on mobile, giving standoffs of 9.34 / 13.41 / 17.88.
             A fixed near/far tuned for 9.34 would leave the mobile card
             uniformly half-fogged. Expressed as multiples of the standoff, all
             three aspects get the SAME amount of depth:

               near = 0.75 x rad   just in front of the road, so the truck and
                                   the nearest walkers are clear of it
               far  = 3.00 x rad   nothing in the scene reaches it

             On the desktop card that is 7.0 -> 28.0. The things it has to
             separate sit between them: road centre at 9.3 (4% fogged), yard
             stacks ~12.5 (26%), dock wall ~13.5 (31%). So the back of the site
             loses about a third of its contrast to the backdrop and the front
             loses almost none, which is the depth cue that was missing.

             CHECKED AGAINST THE CYCLORAMA and it does not fight it: the fog
             colour is 0x0A0B0E, the same value all three backdrop stops were
             just set to, so fogging toward it is fogging toward the exact pixel
             already behind the object. Nothing here reaches full fog (the
             deepest thing in the scene is ~31%), so the one case that could
             show a seam — a fully-fogged object crossing the lifted `glow`
             pool — never arises. The grid is a raw ShaderMaterial and takes no
             fog at all; its own radial fade (10.4 -> 33.3) is deliberately
             matched to this band so the floor and the props die out together. */
          if (scene.fog instanceof THREE.Fog) {
            scene.fog.near = rad * 0.75;
            scene.fog.far = rad * 3.0;
          }
          const az = 0.29 + 0.03 * Math.sin(t * 0.12);
          placeCamera(camera, { az, rad, tx: camX, ty: 0.5, tz: -1.0 }, rad * 0.30);
          camera.lookAt(target);
        };

        /* 24fps — this card is never hovered, so it takes the resting rate
           from the same spec the hero cards run to. 1/25, see card-scene.tsx. */
        const MIN_DT = 1 / 25;
        /* Same arrival hygiene as the flagships (PERFORMANCE.md #35/#36/#39):
           programs compile at idle, one warm frame draws off screen, and the
           clock keeps its existing start-on-arrival behaviour — this scene
           always had that right. No runtime `transparent` flips here. */
        let compiled = false;
        const markCompiled = () => { compiled = true; };
        renderer.compileAsync(scene, camera).then(markCompiled, markCompiled);
        const compileGuard = window.setTimeout(markCompiled, 2000);
        let primed = false;
        let drawN = 0;
        let last = -1;
        const loop = () => {
          raf = requestAnimationFrame(loop);
          if (!compiled) return;
          if (!onScreen) {
            // one warm draw off screen; the clock deliberately stays unstarted
            if (!primed) { primed = true; frame(); studio.render(); }
            return;
          }
          primed = true;
          if (!clockStarted) { clock.start(); clockStarted = true; }
          const now = clock.getElapsedTime();
          if (now - last < MIN_DT) return;
          last = now;
          const _td = drawN < 3 ? performance.now() : 0;
          frame();
          studio.render();
          if (drawN < 3) {
            if (location.search.includes("perf")) {
              const w = window as unknown as { __visionDraw?: string[] };
              (w.__visionDraw ||= []).push(
                `lead#${drawN} draw ${(performance.now() - _td).toFixed(0)} ` +
                `progs ${renderer.info.programs?.length ?? -1}`);
            }
            drawN++;
          }
        };
        raf = requestAnimationFrame(loop);

        return () => {
          cancelAnimationFrame(raf);
          window.clearTimeout(compileGuard);
          ro.disconnect();
          io.disconnect();
          metals.forEach((m) => m.dispose());
          mats.forEach((m) => m.dispose());
          /* The roadway owns FRESH geometry as well as materials — four
             PlaneGeometries and the grid's — so unlike everything above it has
             to dispose both. Nothing it holds comes from `metalBox` or
             `makeMetal`, so there is no shared/cached object in there to
             destroy for the rest of the page. */
          roadway.dispose();
          /* All three freshly allocated here — nothing from metalBox or the
             metal texture cache — so all three are ours to destroy. */
          csGeo.dispose();
          csMat.dispose();
          /* The wheel and axle cylinders are ours too — plain CylinderGeometry,
             not `metalBox`, so nothing in the shared geometry cache is at risk.
             (Every box in this scene comes from `metalBox` and is CACHED AND
             SHARED, including the bogie frame, the legs and the feet: those
             must never be disposed here.) */
          wheelGeo.dispose();
          axleGeo.dispose();
          /* The workers' vest band and helmet shell. Plain Cylinder/Sphere
             geometries built once here and shared by all five walkers, so
             they are ours exactly as `wheelGeo` is — nothing from
             `metalBox`'s shared cache is being touched. */
          vestGeo.dispose();
          helmetGeo.dispose();
          /* The environment round's own geometries, all freshly allocated
             here and none of them from `metalBox`'s shared cache: the wheel
             hub disc, the shared pole/mast base plate, the workers' ground
             puck quad, the mast halo quad, and the ONE unit box every horizon
             mass is scaled from. */
          hubGeo.dispose();
          footGeo.dispose();
          lensGeo.dispose();
          puckGeo.dispose();
          haloGeo.dispose();
          poolGeo.dispose();
          horizonGeo.dispose();
          /* Two more materials held out of `mats` because their peaks are not
             1, so the blanket disposal above does not reach them. */
          puckMat.dispose();
          haloMat.dispose();
          poolMat.dispose();
          csTex?.dispose();
          /* NOTHING ELSE FROM THE DRESSING PASS IS DISPOSED HERE, AND THAT IS
             DELIBERATE — see THE DRESSING PASS at module scope.

               containerSide()/cardboardSide()  live in hero-cards/skins.ts's
                 module cache and are SHARED WITH THE HERO CARDS ON THIS PAGE.
                 Disposing either would blank the Yard and Warehouse tiles.
               trailerPanelMap()               module-cached in this file,
                 kept for the next mount.
               concreteMap()                   module-cached in site.ts, same.

             The MATERIALS that wrap them are all in `mats` (or `metals`) and
             are disposed above, which is the correct half of the pair. */
          studio.dispose();
        };
      } catch (err) {
        console.error("[lead-card] init failed:", err);
        el.style.background = CARD_SURFACE;
        return () => {};
      }
    }, "lead");
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background: CARD_SURFACE }}>
      <div ref={wrapRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}


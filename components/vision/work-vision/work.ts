/* ---------------------------------------------------------------------------
   Work Vision — the subject: one worker, seen by three cameras, three places.

   THREE ACTS, HARD CUTS, NOT ONE AISLE. This used to be a single racking
   aisle with three pole cameras firing in sequence as one figure walked past
   all three. The product read was "three cameras in a single place aligned
   next to next to next" — the fix is not density, it's STRUCTURE: three
   separate fixed cameras, in three separate places, cut between like a VMS,
   the same person walking through each in turn. See scene.tsx for the
   act/loop timing and the camera cuts; this module builds what each act
   needs — its own dressing group, toggled `.visible`, plus that act's own
   camera rig and sight cone. ALL THREE ACTS now have a REAL camera in the
   world, each built from ONE shared spec (`makeActCam` — three cameras on one
   site are three of the same camera), differing only in where the head hangs:
   a rack clamp, a dock wall, a ceiling stem. The camera-locked corner props
   that used to stand in for all three were removed on review — see
   scene.tsx.

   Layout (metres, ground at GROUND_Y = 0), SHARED ACROSS ALL THREE ACTS:
     · the walker travels along X at constant speed, in PROFILE to the
       camera, on the z = 0 line — every act, regardless of which direction.
     · act 1 has a rack-clamped arm and cone, aimed at that line.
     · act 2 has a wall-mounted arm and cone off the dock door, aimed at the
       same line from the end the walker enters at.
     · act 3 has a ceiling-hung stem and cone over the pack line, aimed at
       the same line from the same chest height.

   WHY EVERYTHING HERE IS PLAIN PRIMITIVE GEOMETRY AND NOT `metalBox`.
   metal.ts's `metalBox` caches its RoundedBoxGeometry in a module map that is
   shared across every scene on the page and deliberately never disposed. This
   module owns and disposes its own geometry (see `owned` / `dispose`), and a
   disposed shared buffer leaves the NEXT scene drawing nothing. So: plain
   Box/Capsule/Cylinder/Sphere throughout, all of it ours, all of it disposed.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { lerp } from "../_vision/camera";
import { makeMetal } from "../_vision/metal";
import { cardboardSide } from "../hero-cards/skins";
import { addGrain } from "../_vision/noise";
import { buildPendantLamp, type Pendant } from "../_vision/lamp";
import { buildReadCamera, type ReadCamera } from "../_vision/readCamera";

/** Floor height. Zero, deliberately: every vertical number in this file is
    then also a height above ground. */
export const GROUND_Y = 0;

/* ---- the run --------------------------------------------------------------
   Constant speed, both directions. "Nobody stops" is the claim, and ANY
   easing reads as hesitation. Shared across all three acts: act 1 and act 3
   run WALK_FROM -> WALK_TO (left to right), act 2 runs it in reverse
   (scene.tsx does the reversal — see walkerXFor). 14.4 units is more than
   the frame needs at any of the three poses below; the walker is always
   comfortably off screen at both ends of its own act. */
export const WALK_FROM = -5.2;
export const WALK_TO = 5.2;
export const walkerX = (p: number) => lerp(WALK_FROM, WALK_TO, p);

/** Stride frequency, in strides per second. */
export const STEP_HZ = 1.05;

/* ---- ACT 1's ONE CAMERA ---------------------------------------------------
   Everything here is the original pole/cone derivation, unchanged in its
   arithmetic, just reduced from three poles to the one act 1 now uses (the
   "three cameras" job moved up a level, to the three ACTS, so a single aisle
   no longer needs three of its own). */
export const POLE_X = -0.6;
export const POLE_Z = -2.1;
export const HEAD_Y = 2.9;
export const AIM_X = POLE_X;                 // on-axis: the head looks straight down its own mount
const AIM_Y = GROUND_Y + 1.05;                // the chest, not the floor
const LENS_OUT = 0.46;
export const CONE_HALF_ANGLE = 0.33;          // 18.9 deg — see detect.ts's cone builder
/* Target footprint radius on the subject, m — the rig's `coneRadius`. Used to
   derive the half-angle every frame from the live apex->target range, floored
   by CONE_HALF_ANGLE above so a long throw does not go needle-thin. Moved
   here (was a local in scene.tsx) because it is now a build-time argument to
   buildReadCamera rather than a per-frame formula at the call site. */
const CONE_FOOT = 0.85;

/* ---- act 1 dressing: the racking aisle ------------------------------------ */
export const AISLE_HW = 1.45;
const RACK_Z = -3.6;
const RACK_PITCH = 1.9;
const RACK_BASE = -1.55;
const RACK_K: readonly number[] = [-3, -2, -1, 0, 1, 2, 3, 4];
const RACK_H = 3.40;
const RACK_D = 0.55;
const BEAM_Y = [1.15, 2.30] as const;
const NEAR_Z = 2.86;
const NEAR_H = 0.42;

/** Floor slab. Shared by every act — one physical floor, three cameras. */
const FLOOR_SIZE = 160;

/** Act 2's dock wall width. HOISTED TO MODULE SCOPE (it was a local in
    buildWork) because the wall's panel-seam texture derives its per-face UV
    offset from the wall's own left edge, -WALL_W/2, and that derivation now
    happens in the texture layer below rather than at the mesh. */
const WALL_W = 13.0;

/* ---- materials ----------------------------------------------------------- */

const DARK_METAL = { base: "#2B313B", kind: "plate", metalness: 0.78, rough: 0.5 } as const;

/* ---- THE PAINTED-STEEL SPECS, HOISTED TO MODULE SCOPE --------------------
   THIS IS THE COLOUR ANCHOR. Every other scene on this site has one large
   saturated object holding the frame together — cargo's blue container is the
   benchmark — and work had none: racking, floor, fog and figure all sat in one
   grey-blue band, which is precisely the "bleak, no colours" verdict.

   Industry-standard pallet racking is BLUE UPRIGHTS, ORANGE BEAMS. That is not
   a styling choice, it is what the object is, so the colour arrives the
   warehouse-honest way rather than as a graded tint.

   ALL THREE SPECS ARE `painted` AT rough 0.55, AND THAT IS LOAD-BEARING FOR
   THE CACHE. metal.ts keys its roughness canvas and its Sobel normal
   derivation on `kind|rough` alone (rounded to 0.05) and its albedo on
   `base|kind|repeat`. Three specs sharing kind and rough therefore cost ONE
   roughness canvas and ONE Sobel pass between them, plus one albedo each.
   They are `as const` at MODULE scope so the idle warm and the build pass
   byte-identical option objects and hit the same keys — the gate mistake
   PERFORMANCE.md #32 records was a spec built inline at the call site, which
   missed its own warm every time.

   The bases are AUTHORED-HALF values, by the same rule the vest's #B85413 and
   the helmet's #C9A227 follow: a saturated surface under the five-source rig
   plus ACES lands far above its albedo.

   THE ORANGE IS DELIBERATELY NOT THE SIGNAL #ED510C. Beams are PAINT — they
   are part of the world, in the warm family of the kraft cartons. The signal
   orange is reserved for the overlay, and a structural member wearing it would
   read as a flagged object. */
const RACK_BLUE_METAL = { base: "#2C4A73", kind: "painted", metalness: 0.35, rough: 0.55 } as const;
const RACK_BEAM_METAL = { base: "#A34A17", kind: "painted", metalness: 0.35, rough: 0.55 } as const;
/** Safety yellow, authored half — act 2's bollards. Same kind/rough as the two
    above, so it is a third albedo and nothing else. */
const SAFETY_METAL = { base: "#8F7A1E", kind: "painted", metalness: 0.35, rough: 0.55 } as const;

/* ===================== PAINTED SURFACES ==================================

   THE CARTONS WERE THE ONLY TEXTURED OBJECTS IN THREE ACTS, and that is the
   whole reason the scene read as a diagram. Cargo Vision's benchmark is that
   nearly every surface carries a painted canvas; the four below are Work
   Vision's share of that, in descending order of how much frame area they
   cover: the concrete slab (every act, by far the largest), act 2's dock wall
   and shutter, act 3's bench tops.

   ALL FOUR ARE MODULE-CACHED AND NEVER DISPOSED. Same contract as
   cargo.ts's `boardCache` and skins.ts's `skinCache`: a canvas is identical
   between mounts, so it is generated at most once per page and a scene that
   disposed one would leave the next mount sampling a destroyed texture.
   `warmWorkTextures()` below generates all of them so the idle chain can pay
   for them off the visitor's scroll path.

   RACK UPRIGHTS AND BEAMS ARE DELIBERATELY NOT TEXTURED. The columns are
   0.075 square and the braces 0.045 — at act 1's framing (7.5m out, 30 deg
   vertical fov, so a 4.02-unit frame height, ~179px per world unit on a 720px
   canvas) a column draws 13px wide and a brace 8px. A map on a member that
   narrow contributes at most a couple of texels across its width; it cannot
   read as a surface, and the mip chain averages it back to the flat tint
   anyway. Skipped on purpose, not forgotten.
--------------------------------------------------------------------------- */

/* willReadFrequently — every canvas here ends in addGrain(), which is a
   getImageData round trip. Same note as skins.ts and metal.ts: without the
   flag each readback stalls on the GPU behind the live scenes' frames. */
function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d", { willReadFrequently: true })!];
}

const finishTex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

/** Deterministic 0..1 from an integer. `Math.random()` IS BANNED in this file
    (see the pallet-variation note): a scene that reshuffles itself between
    mounts cannot be reviewed, and a texture is the worst place for it because
    the canvas is cached, so one mount's dice throw would silently become the
    whole page's concrete. */
const h01 = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

/* ---- 1. the concrete slab ------------------------------------------------
   THE MAP CARRIES THE VALUE, THE MATERIAL COLOUR IS THE LIFT. `color`
   MULTIPLIES `map` (in linear space, after both are sRGB-decoded), so a map
   painted at the floor's finished #191D22 under a #8A8F96 tint would land at
   roughly #0D0F12 — a full stop under the floor this scene has already been
   graded to. The brief's acceptance is the FINISHED value, so the base is
   solved backwards from it:

     target  #191D22 = (25, 29, 34) sRGB  ->  linear (0.009729, 0.012286, 0.015993)
     tint    #8A8F96 = (138,143,150) sRGB ->  linear (0.254156, 0.274618, 0.304939)
     base    = target / tint             =   linear (0.038280, 0.044741, 0.052447)
                                         ->  sRGB   (55.1, 59.7, 64.7) = #373C41

     check   55*0.254156-ish: sRGB->linear(55/255)=0.038204, x 0.254156 = 0.009710
             -> linear->sRGB = 0.09795 -> 24.98  = 25 = 0x19  ok
             60 -> 0.044553 x 0.274618 = 0.012235 -> 28.94   = 29 = 0x1D  ok
             65 -> 0.052861 x 0.304939 = 0.016122 -> 34.13   = 34 = 0x22  ok

   So the FLAT part of the slab renders at #191D22 to the digit, exactly what
   is on screen today, and everything the canvas adds — grain, the soft
   patches, the joint lines — is modulation either side of it. The patches and
   joints are subtractive only, so the slab's AREA MEAN lands a hair under
   #191D22 rather than over it, which is the safe direction.

   TILING. 512 square over FLOOR_TILE = 2.4 world units, so the repeat over
   the 160-unit slab is 160 / 2.4 = 66.667 and one texel is 2.4/512 = 4.7mm.
   2.4m is a real slab bay, and it is also the reading of "about 6x6" that
   survives contact with this geometry: the slab is 160 units because it has
   to outrun the fog, but the FRAME at act 1 is only ~14 units across
   (2 x 7.5 x tan(15deg) x 16/9 = 7.15 half-width), so 6 tiles across the
   picture is 14.3/6 = 2.38 -> 2.4. A literal repeat of 6 over the geometry
   would make one tile 26.7 units, put the expansion joints 27m apart (i.e.
   one, maybe, in shot) and stretch a 512 canvas over 27m at 52mm per texel,
   which is grain the mip chain erases. Six tiles across the SHOT, not across
   the slab. */
const FLOOR_MAP_BASE = "#373C41";
/** The lift that multiplies the map above. See the derivation. */
export const FLOOR_TINT = "#8A8F96";
const FLOOR_TILE = 2.4;
let floorMapCache: THREE.Texture | null = null;
function floorMap(): THREE.Texture {
  if (floorMapCache) return floorMapCache;
  const S = 512;
  const [c, x] = cv(S, S);
  x.fillStyle = FLOOR_MAP_BASE;
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 14);

  /* Eight large, very soft darker patches — power-trowelled concrete is
     blotchy at the metre scale, and this is the difference between a floor
     and a flat fill. Alpha caps at 0.08: anything you can point at is a
     stain, and a stain is the failure mode lamp.ts records for its own
     shadow. Positions and radii from h01(), never Math.random(). */
  /* 0.12, UP FROM 0.08 — the 1.5x the floor pass asked for. The slab was
     reported as reading like a diagram rather than a floor, and blotch
     amplitude is the term that carries "power-trowelled concrete". Still
     subtractive only, so the area mean stays a hair UNDER #191D22. */
  for (let i = 0; i < 8; i++) {
    const px = h01(i * 3 + 1) * S;
    const py = h01(i * 3 + 2) * S;
    const pr = S * (0.16 + 0.14 * h01(i * 3 + 3));
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0.0, "rgba(0,0,0,0.12)");
    g.addColorStop(1.0, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  /* ---- THE WEAR BAND ALONG THE WALK LINE --------------------------------
     Every act puts the walker on z = 0, and a warehouse floor that people walk
     down is darker where they walk. This is the one piece of the concrete that
     is sited rather than random, so the v arithmetic has to be exact.

     THE SLAB'S UV -> WORLD Z CHAIN. The slab is a PlaneGeometry rotated
     x = -PI/2, which sends a local point (x, y, 0) to world (x, 0, -y): so
     world z = -localY. Local y runs -80..80 over v 0..1, i.e. localY =
     (v - 0.5) * 160 and world z = -(v - 0.5) * 160.

       world z = 0  ->  v = 0.5

     The texture repeats r = FLOOR_SIZE / FLOOR_TILE = 66.6667 times, so the
     canvas is sampled at frac(v * r):

       frac(0.5 * 66.66667) = frac(33.33333) = 0.33333

     and a CanvasTexture's v = 0 is the BOTTOM of the image while canvas pixel
     row 0 is the TOP, so the band's centre row is

       py = (1 - 0.33333) * 512 = 341.33

     WIDTH. 1.10 world units of walkway wear is 1.10 / 2.4 = 0.45833 of a tile
     = 234.7 px, so the band spans py 224.0 .. 458.7 and needs no wrap.

     IT REPEATS EVERY 2.4m IN Z, and that is inherent to a tiled map: there is
     one canvas and it is the same canvas everywhere. At alpha 0.09 with a
     fully soft profile it reads as the blotchy banding a poured slab has
     anyway (the expansion joints above are on the same pitch and the same
     logic), not as a stripe. If it ever reads as stripes, this alpha is the
     one number to pull. */
  const BAND_C = 341.33;                     // see the v derivation above
  const BAND_HH = 117.33;                    // half of 234.7
  const wear = x.createLinearGradient(0, BAND_C - BAND_HH, 0, BAND_C + BAND_HH);
  wear.addColorStop(0.0, "rgba(0,0,0,0)");
  wear.addColorStop(0.5, "rgba(0,0,0,0.09)");
  wear.addColorStop(1.0, "rgba(0,0,0,0)");
  x.fillStyle = wear;
  x.fillRect(0, BAND_C - BAND_HH, S, BAND_HH * 2);

  /* Three hairline expansion joints, #0E1114 at 0.5 alpha, 1px. TWO OF THEM
     SIT ON THE TILE EDGE (u = 0 and v = 0) so that under RepeatWrapping they
     become a continuous 2.4m saw-cut grid across the whole slab rather than
     three marks repeating inside every tile; the third at u = 0.5 halves the
     pitch on one axis, which is what a real pour looks like (bays are longer
     one way than the other). Drawn at the half-pixel so a 1px line lands on
     one texel column instead of being anti-aliased across two. */
  x.strokeStyle = "rgba(14,17,20,0.5)";
  x.lineWidth = 1;
  for (const u of [0.5, S / 2 + 0.5]) {
    x.beginPath(); x.moveTo(u, 0); x.lineTo(u, S); x.stroke();
  }
  x.beginPath(); x.moveTo(0, 0.5); x.lineTo(S, 0.5); x.stroke();

  const t = finishTex(c);
  const r = FLOOR_SIZE / FLOOR_TILE;             // 66.667
  t.repeat.set(r, r);
  floorMapCache = t;
  return t;
}

/* ---- 2. the dock wall and shutter curtain -------------------------------
   The material tint stays WHITE and the map carries the whole value, which is
   the opposite call from the floor above: the long note on `dockWall` records
   that this surface was already taken a full stop under `dock` to stop it
   reading as a lit panel filling a third of the frame, and a texture pass does
   not get to relitigate that grade. The map's only job here is to stop
   13 x 3.2 metres of wall being ONE VALUE.

   THE BASE IS A STOP UNDER `dockWall` RATHER THAN EQUAL TO IT, and the grain is
   half what the other canvases use — both were found on screen, not derived.
   See WALL_MAP_BASE below for the mechanism and for why the seam alpha is the
   lever to reach for if this ever reads too dark.

   TILING, AND THE SEAM PITCH. Canvas is 512 x 256 with a vertical seam every
   64px, so 512/64 = 8 seams per tile:

     seam pitch = WALL_TILE_W / 8 = 1.1 world units   ->  WALL_TILE_W = 8.8
     WALL_TILE_H = WALL_TILE_W x 256/512 = 4.4        (square texels)

   and the repeat for a face of world width w is w / 8.8:

     left  jamb   w = 2.20  ->  repeat.x 0.250000  ->  2 seams
     right jamb   w = 6.60  ->  repeat.x 0.750000  ->  6 seams
     lintel       w = 4.20  ->  repeat.x 0.477273  ->  3.8 seams
     curtain      w = 4.04  ->  repeat.x 0.459091  ->  3.7 seams
     check        2.20 + 4.20 + 6.60 = 13.00 = WALL_W, and 13.00/1.1 = 11.8
                  seams across the whole wall

   A BoxGeometry's side face carries UV 0..1 whatever its size, so a single
   shared repeat would give the 2.20 jamb and the 6.60 jamb the same number of
   seams and therefore different pitches — three times finer on the narrow
   one. Hence one texture VARIANT per face rect, with `offset` set from the
   face's own world left edge and bottom so the seams and the scuff band are
   CONTINUOUS across the three wall segments and the curtain:

     offset.x = (leftX + WALL_W/2) / 8.8
     offset.y = bottomY / 4.4

   which for the four faces is 0.000000, 0.806818, 0.329545, 0.338636 in x.
   The variants are module-cached on their rect, so they are built once per
   page, not once per mount. */
/* #101318, A STOP UNDER `dockWall`'s #1A2028 — AND THE GRAIN IS HALVED.
   MEASURED ON SCREEN, NOT DERIVED. This started at #1A2028 with grain 10 on the
   reasoning that a white tint over a map painted at the material's own colour
   gives a byte-identical flat value. The flat value WAS identical and the wall
   still came out pale speckled grey, diluting the night-dock mood the flat
   #1A2028 had established. Two reasons the equivalence did not survive contact:

     1. THE GRAIN IS NOT A ZERO-MEAN CONTRIBUTION AT THIS DEPTH. addGrain adds a
        symmetric +/- offset in sRGB BYTES, but the render integrates in linear
        light and ACES sits on top of that. Down at (26,32,40) a +5 byte step is
        a far bigger linear step than a -5 byte step is, because the sRGB curve
        is steepest near black — so symmetric byte noise on a very dark base is
        a net LIFT, and the darker the base the worse it gets. Halving the
        amplitude (10 -> 5) roughly quarters that bias.
     2. CANVAS OPS ARE sRGB. Every fill, gradient and grain write above happens
        in sRGB bytes, so none of it composites the way the linear-space
        arithmetic in the floor's derivation assumes. That derivation is still
        correct for the floor because there the modulation is subtractive
        gradients rather than symmetric noise; it does not carry over here.

   So this one is fixed empirically. Base down roughly a stop, grain halved,
   and the SEAM alpha deliberately left at 0.35 — if the seams stop reading
   against the darker base the answer is to lift the seams, never to lift the
   base back up. All four wall faces (both jambs, the lintel and the CURTAIN)
   are clones of this one canvas, so this is a single-place fix for all of
   them. */
const WALL_MAP_BASE = "#101318";
const WALL_TILE_W = 8.8;
const WALL_TILE_H = WALL_TILE_W / 2;             // 4.4 — the canvas is 2:1
let wallMapCache: THREE.Texture | null = null;
function wallMap(): THREE.Texture {
  if (wallMapCache) return wallMapCache;
  const W = 512, H = 256;
  const [c, x] = cv(W, H);
  x.fillStyle = WALL_MAP_BASE;
  x.fillRect(0, 0, W, H);
  /* 5, DOWN FROM 10 — see WALL_MAP_BASE's note. Symmetric byte noise on a very
     dark base is a net LIFT once the render integrates it in linear light, and
     the darker this base goes the stronger that bias gets, so the amplitude has
     to come down WITH the base rather than after it. */
  addGrain(x, W, H, 5);

  /* Vertical panel seams every 64px. FAINT — a dock wall's panel joints are a
     line of shadow, not a drawn grid, and this surface's whole brief is to
     recede. Alpha 0.35 on a near-black base is about as far as it can go
     before the wall reads as tiled cladding. */
  x.fillStyle = "rgba(8,11,15,0.35)";
  for (let u = 0; u < W; u += 64) x.fillRect(u, 0, 1, H);

  /* The scuff band in the lower third — the one thing that says this wall has
     had pallets and trucks against it. v 0..1/3 of the canvas is world
     y 0 .. 4.4/3 = 1.47, which is genuinely where a dock wall gets marked.
     Soft top edge via a gradient so it has no boundary of its own. */
  const band = x.createLinearGradient(0, H, 0, H * 0.62);
  band.addColorStop(0.0, "rgba(198,206,216,0.055)");
  band.addColorStop(1.0, "rgba(198,206,216,0)");
  x.fillStyle = band;
  x.fillRect(0, H * 0.62, W, H * 0.38);
  for (let i = 0; i < 7; i++) {
    const sy = H * (0.70 + 0.28 * h01(i * 5 + 11));
    const sx = W * h01(i * 5 + 12);
    const sw = W * (0.04 + 0.10 * h01(i * 5 + 13));
    x.fillStyle = `rgba(8,11,15,${0.10 + 0.10 * h01(i * 5 + 14)})`;
    x.fillRect(sx, sy, sw, 1 + Math.round(2 * h01(i * 5 + 15)));
  }

  wallMapCache = finishTex(c);
  return wallMapCache;
}

const wallVariants = new Map<string, THREE.Texture>();
/** One dock-wall texture per face rect (world left x, width, bottom y,
    height). Module-cached; see the tiling derivation above. */
function wallMapFor(leftX: number, w: number, bottomY: number, h: number): THREE.Texture {
  const key = `${leftX}|${w}|${bottomY}|${h}`;
  const hit = wallVariants.get(key);
  if (hit) return hit;
  /* A CLONE, because `repeat`/`offset` live on the TEXTURE and the base is
     shared by every face — writing them on the original would re-tile all of
     them. A clone shares the `image`, so it costs one GPU upload and no
     second canvas. Same idiom cargo.ts uses for its bag map. */
  const t = wallMap().clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(w / WALL_TILE_W, h / WALL_TILE_H);
  t.offset.set((leftX + WALL_W / 2) / WALL_TILE_W, bottomY / WALL_TILE_H);
  t.needsUpdate = true;
  wallVariants.set(key, t);
  return t;
}

/* ---- 3. the pack-line bench tops ----------------------------------------
   Base is `board`'s own #3E3A33 under a white tint, per the brief, and the
   scratches run ALONG the grain — all horizontal, i.e. along the bench's long
   axis in x, because a bench gets scored by things dragged across it in the
   direction of the line, not at random angles. Repeat 1x1 per top: the top is
   1.70 x 0.75, so a 256 canvas is 6.6mm per texel in x and 2.9mm in z, which
   is fine for scratches and corner wear and is why this one needs no tiling
   arithmetic. */
const BENCH_MAP_BASE = "#3E3A33";
let benchMapCache: THREE.Texture | null = null;
function benchMap(): THREE.Texture {
  if (benchMapCache) return benchMapCache;
  const S = 256;
  const [c, x] = cv(S, S);
  x.fillStyle = BENCH_MAP_BASE;
  x.fillRect(0, 0, S, S);
  addGrain(x, S, S, 12);

  // five along-grain scratches, 1px, lighter, alpha 0.3
  x.strokeStyle = "rgba(214,220,228,0.3)";
  x.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = Math.floor(S * (0.12 + 0.76 * h01(i * 7 + 3))) + 0.5;
    const x0 = S * 0.06 * h01(i * 7 + 4);
    const x1 = S - S * 0.06 * h01(i * 7 + 5);
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke();
  }

  // corner wear: two tiny lighter radial patches, where hands and boxes land
  for (const [px, py] of [[0.07 * S, 0.10 * S], [0.94 * S, 0.86 * S]]) {
    const pr = S * 0.11;
    const g = x.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0.0, "rgba(214,220,228,0.085)");
    g.addColorStop(1.0, "rgba(214,220,228,0)");
    x.fillStyle = g;
    x.fillRect(px - pr, py - pr, pr * 2, pr * 2);
  }

  benchMapCache = finishTex(c);
  return benchMapCache;
}

/* ---- 4. the walkway line's wear, as an ALPHA map -------------------------
   The yellow walkway edge lines are painted on a floor that is driven over,
   so their alpha has to vary along their length — a line at one flat opacity
   for 28 metres is a vector, not paint.

   AN ALPHA MAP RATHER THAN PER-SEGMENT MATERIALS OR VERTEX COLOURS. The line
   is one mesh on one material (the whole point of the paint idiom), so the
   variation cannot live on the material; splitting it into segments would
   mean one material per segment, which is the thing the ramp sweep and the
   dispose list both have to enumerate. A 64 x 1 greyscale strip on `alphaMap`
   costs one texture and linear filtering interpolates it into a smooth
   variation with a period of 28 / 64 = 0.4375 world units.

   NO colorSpace SET, deliberately: an alpha map is DATA, not colour, and
   tagging it sRGB would push every value through the decode curve.

   Values 0.78 .. 1.00 from h01(), never Math.random() — the file's standing
   rule, and doubly so here because the canvas is module-cached, so one dice
   throw would become the whole page's paint. Module-cached and NEVER
   disposed, same contract as the three canvases above. */
const LINE_ALPHA_N = 64;
let lineAlphaCache: THREE.Texture | null = null;
function lineAlphaMap(): THREE.Texture {
  if (lineAlphaCache) return lineAlphaCache;
  const [c, x] = cv(LINE_ALPHA_N, 1);
  for (let i = 0; i < LINE_ALPHA_N; i++) {
    const a = 0.78 + 0.22 * h01(i * 9 + 5);
    const g = Math.round(a * 255);
    x.fillStyle = `rgb(${g},${g},${g})`;
    x.fillRect(i, 0, 1, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = t.magFilter = THREE.LinearFilter;
  lineAlphaCache = t;
  return t;
}

export interface WorkMaterials {
  dark: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  /** THE WORKWEAR IS THREE MATERIALS NOW, NOT ONE `suit`. See the builder. */
  shirt: THREE.MeshStandardMaterial;
  trouser: THREE.MeshStandardMaterial;
  /** hi-vis, authored half-value — the walker's ONE identifying feature */
  vest: THREE.MeshStandardMaterial;
  /** the vest's reflective banding */
  refl: THREE.MeshStandardMaterial;
  /** work gloves — replaces the white skin spheres at hip height */
  glove: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  floor: THREE.MeshStandardMaterial;
  /** The old flat painted-steel grey-blue. STILL IN USE — see the consumer
   *  list in the builder. It is no longer the RACKING material. */
  rack: THREE.MeshStandardMaterial;
  /** racking uprights and diagonal braces: painted blue steel, mapped */
  rackBlue: THREE.MeshStandardMaterial;
  /** racking beams and lips, and act 2's shutter lip bar: painted orange */
  rackBeam: THREE.MeshStandardMaterial;
  /** act 2's edge-protection bollards: painted safety yellow */
  bollard: THREE.MeshStandardMaterial;
  /** camera HOUSINGS only — a clean unmapped body. See the builder. */
  camBody: THREE.MeshStandardMaterial;
  /** act 3's totes, alternating: muted industrial blue / warm grey */
  toteA: THREE.MeshStandardMaterial;
  toteB: THREE.MeshStandardMaterial;
  /** the roof skylight strips — unlit, and driven by NAME in scene.tsx */
  sky: THREE.MeshBasicMaterial;
  /** the yellow walkway edge lines — driven by NAME in scene.tsx */
  lineY: THREE.MeshBasicMaterial;
  goods: THREE.MeshStandardMaterial;
  dock: THREE.MeshStandardMaterial;
  /** act 2's big flat wall surfaces ONLY — see the note in the builder.
   *  NOW THE REFERENCE VALUE RATHER THAN A MESH MATERIAL: every wall face
   *  draws through `dockWallFace` below, which reproduces this material's grade
   *  exactly and adds the panel-seam map. Kept because its note is the record
   *  of WHY act 2's wall sits a stop under `dock`, and because a wall face
   *  without a derived rect still has something correct to fall back to. */
  dockWall: THREE.MeshStandardMaterial;
  /** A `dockWall` variant carrying the panel-seam / scuff map, tiled and
   *  offset for ONE wall face's world rect (left x, width, bottom y, height)
   *  so seams and the scuff band are continuous across the whole dock wall.
   *  Cached per rect; every one it makes is registered in `all` and disposed,
   *  and the TEXTURES it samples are module-cached and never disposed. */
  dockWallFace: (leftX: number, w: number, bottomY: number, h: number) => THREE.MeshStandardMaterial;
  /** floor steel: the dock leveller plate. Darker than anything else that
   *  touches the ground, because a plate laid IN a floor is a hole in the
   *  light, not a highlight on it. */
  plate: THREE.MeshStandardMaterial;
  /** act 3's ceiling slab, and nothing else — see the note in the builder. */
  ceil: THREE.MeshStandardMaterial;
  /** cardboard-skinned palletised cartons — the same board cargo-vision uses */
  board: THREE.MeshStandardMaterial;
  /** act 3's bench TOPS, and nothing else: a scored composite work surface,
   *  which is a different painted canvas from kraft board. */
  benchTop: THREE.MeshStandardMaterial;
  /** matte moulded plastic — the hard hat. NEVER `dark`, which is metal. */
  helmet: THREE.MeshStandardMaterial;
  paint: THREE.MeshBasicMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildWorkMaterials(): WorkMaterials {
  /* Cache-safe: every getter below is idempotent, so this is a no-op after
     the idle warm and generates the four canvases on a cold first mount. */
  warmWorkTextures();
  /* DECLARED FIRST, POPULATED AT THE BOTTOM. `dockWallFace` below is a factory
     that is called from buildWork — i.e. AFTER this function returns — and it
     has to register each material it mints in the reveal ramp. That means the
     array has to exist before the closure is built, not after. */
  const all: THREE.Material[] = [];
  const metal = makeMetal(DARK_METAL);
  const dark = metal.material;

  const lens = new THREE.MeshStandardMaterial({
    color: "#05070C", metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8,
    transparent: true, opacity: 0,
  });

  /* ===================== THE WORKWEAR, IN FOUR PARTS =====================

     THE ONE GREEN CAPSULE IS GONE. It was a single `suit` material covering
     torso, shoulders, hips, both arms, both legs and both shoe uppers, and no
     amount of grading a single value was ever going to stop that reading as a
     mannequin: a figure with one material has one silhouette and no parts.
     Two passes tried (#2E3A2F, then #20261F) and both notes are really the
     same finding written twice — the hue was never the problem, the SINGLE
     MATERIAL was.

     A warehouse worker's identifying feature is a HI-VIS VEST. That is the
     act 1 lattice lesson applied to the subject rather than the set: racking
     reads as racking because of its bracing, and a warehouse worker reads as a
     warehouse worker because of the vest — not because of overall detail.

     So: a vest over the chest and back, a mid grey-blue shirt for the arms and
     the sliver of torso outside it, darker trousers for the legs and hips, and
     the reflective banding as its own near-white. Four materials where there
     was one, and all four are in `all` so the reveal ramp still drives them. */

  /* HI-VIS ORANGE AUTHORED AT HALF VALUE: #B85413, not a real hi-vis #F0641A.
     The value rule, and this is the single most exposed place on the site for
     it — a saturated warm orange is the one thing in a scene whose accent is
     pale blue that CANNOT be allowed to arrive brighter than intended, and a
     matte surface under the five-source rig plus ACES lands far above its
     albedo. Roughness 0.85: hi-vis polyester is matte, and a specular sheen on
     it would read as a plastic bib. envMapIntensity is held low for the same
     reason the workwear's always has been — the vest is the brightest thing on
     the figure by design and the environment must not add to it. */
  const vest = new THREE.MeshStandardMaterial({
    color: "#B85413", roughness: 0.85, metalness: 0.0, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  });
  /* THE REFLECTIVE BANDING. #C9D2DC at roughness 0.35 — the only smooth,
     near-white surface on the figure, which is exactly what retroreflective
     tape is. This is the ONE place the walker is allowed a highlight; it is
     also two thin bands and two straps, so it is placement, not area. */
  const refl = new THREE.MeshStandardMaterial({
    color: "#C9D2DC", roughness: 0.35, metalness: 0.0, envMapIntensity: 0.35,
    transparent: true, opacity: 0,
  });
  /* THE SHIRT — arms, shoulders, and the band of torso the vest leaves. Mid
     grey-blue: it sits UNDER the vest in value so the vest is unambiguously
     the brightest thing on the body, and it is close enough to the racking's
     own #26303F family that the shirt reads as clothing rather than as a
     second accent competing with the vest. Separation of subject from
     background is now the VEST's job, not the shirt's, which is why this can
     go back toward the scene's own hue after two passes spent pushing the old
     single material away from it. */
  const shirt = new THREE.MeshStandardMaterial({
    color: "#4A5361", roughness: 0.88, metalness: 0.02, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  });
  /* THE TROUSERS — legs, hips and the shoe uppers. Darker than the shirt, and
     that ordering is the whole point: a figure lit from above is lighter on
     the shoulders than at the ankles, so a body whose lower half is DARKER
     reads as lit rather than as painted. It also keeps the value ladder
     intact, because the legs are the part of the walker nearest the lit floor
     and would otherwise compete with it. */
  const trouser = new THREE.MeshStandardMaterial({
    color: "#2A2F38", roughness: 0.90, metalness: 0.02, envMapIntensity: 0.22,
    transparent: true, opacity: 0,
  });
  /* GLOVES, NOT BARE HANDS. Two 0.052 skin-coloured spheres sat at hip height
     and, being the palest objects on the figure after the helmet, they drew
     the eye harder than the FACE did — two white blobs where the composition
     needs the viewer looking at the head. Dark grey work gloves put the
     hands back where they belong in the value ladder; a warehouse worker is
     wearing gloves anyway. */
  const glove = new THREE.MeshStandardMaterial({
    color: "#333940", roughness: 0.92, metalness: 0.02, envMapIntensity: 0.18,
    transparent: true, opacity: 0,
  });
  /* a warm mid, no longer the same blue-grey as the racking — but SUBDUED.
     Skin is the only lift on the figure and it exists so the head separates
     from the shoulders at ~170px; it is not a highlight. Nothing on a body is
     twice the value of anything else on it. */
  /* #6A6355, UP from #3B382F. With the helmet covering the cranium the only
     skin left is the face, and at #3B382F it sat darker than the helmet AND
     darker than the workwear — so the gap between hat and shoulders read as a
     hole rather than a face. Skin is the one lift on this figure; it has to
     be lighter than what surrounds it or there is no head. */
  const skin = new THREE.MeshStandardMaterial({
    color: "#6A6355", roughness: 0.86, metalness: 0.02, envMapIntensity: 0.38,
    transparent: true, opacity: 0,
  });

  /* #191D22 with a touch more warmth than the old #15181D — a concrete slab
     under sodium-ish high bay is not neutral, and a dead-neutral floor is
     what makes a scene read as a render rather than a room. */
  /* AND IT NOW CARRIES A PAINTED CANVAS, which is the biggest single change in
     the texture pass because the slab is by far the largest surface in all
     three acts. `color` is the LIFT (#8A8F96) and `map` is the value; the
     product is #191D22 to the digit — see floorMap()'s derivation for the
     linear-space arithmetic, which is not the same thing as multiplying the
     hex codes. */
  const floor = new THREE.MeshStandardMaterial({
    map: floorMap(),
    color: FLOOR_TINT, roughness: 0.95, metalness: 0.0, envMapIntensity: 0.10,
    transparent: true, opacity: 0, depthWrite: false,
  });
  /* #26303F, up and BLUER than the old #1A1F27. The whole scene was reported
     as "grayed-out", and racking was most of the reason: at 1A1F27 it is a
     near-neutral charcoal, so every structural edge in frame sat at the same
     hue as the floor and the fog and the picture flattened into one grey
     mass. Painted rack steel is genuinely blue, and giving it a hue of its
     own is what separates structure from ground. */
  /* AND IT IS NO LONGER THE RACKING. `rack` was the closest thing this palette
     had to a general painted-steel value, so it ended up on eleven different
     objects — and once the racking itself moved to real painted blue and
     orange (below), keeping the rest of them on this material is the correct
     call, not an oversight. THE CONSUMERS THAT STAY ON `rack`:

       act 2  the two shutter guide rails
       act 2  the nine curtain slats
       act 3  the bench legs, aprons and low rails
       act 3  the tote rims
       act 3  the gravity-roller barrels
       act 3  the roller-deck tote's rim

     Every one of those is a small member seen against goods or a bench top,
     and every one of them wants the neutral blue-grey it already has. The
     racking's blue is a large-area colour anchor; painting a 30mm tote rim
     with it would just make the act 3 bench a second rack run. */
  const rack = new THREE.MeshStandardMaterial({
    color: "#26303F", roughness: 0.86, metalness: 0.18, envMapIntensity: 0.25,
    transparent: true, opacity: 0,
  });

  /* ---- THE COLOUR ANCHOR: PAINTED RACKING --------------------------------
     Three mapped painted-steel materials off the module-scope specs at the top
     of this file — cached albedo, cached roughness, cached Sobel normal, so
     the three of them together cost one Sobel pass. See the specs' own note
     for the cache arithmetic and for why the orange is not the signal orange.

     THESE CARRY MAPS AND `rack` DOES NOT, which is most of what makes them
     read as painted steel rather than as tinted plastic: metal.ts's note is
     that the character is in the roughness breaking up, not in the colour. */
  const rackBlue = makeMetal(RACK_BLUE_METAL).material;
  const rackBeam = makeMetal(RACK_BEAM_METAL).material;
  const bollard = makeMetal(SAFETY_METAL).material;

  /* THE CAMERA HOUSINGS GET A CLEAN MATERIAL, AND ONLY THE HOUSINGS.
     All three heads were drawn in `dark` — DARK_METAL, `plate` kind, whose
     albedo carries rolled mottle, two heavy panel joints and ninety scuff
     marks. On a 0.19 x 0.17 x 0.34 body seen from a couple of metres those
     features are larger than the object's own faces, so the housing read as
     asphalt rather than as a moulded camera body. The MOUNTS (clamp, arm, tie,
     stems, wall plate, ceiling pad) stay on `dark`: they are structural steel
     and the map is right for them.

     No maps at all here, on purpose — a camera housing is a smooth painted
     shell, and the thing it needs is a clean specular roll-off. */
  const camBody = new THREE.MeshStandardMaterial({
    color: "#1A1E24", roughness: 0.45, metalness: 0.6, envMapIntensity: 0.55,
    transparent: true, opacity: 0,
  });

  /* ACT 3's TOTES, IN TWO COLOURS THAT ARE ACTUALLY TWO COLOURS. The bodies
     used to alternate `goods` (#1F242C) and `dock` (#2E3540) on seed parity —
     two near-neutral dark blue-greys a third of a stop apart, which is to say
     one colour and a rounding error. That was the point of the earlier
     critique: a row of four crates in "two" materials read as four identical
     crates. Muted industrial blue against warm grey is a real hue difference,
     small in value so the totes stay under the walker. */
  const toteA = new THREE.MeshStandardMaterial({
    color: "#3A5A7A", roughness: 0.82, metalness: 0.02, envMapIntensity: 0.16,
    transparent: true, opacity: 0,
  });
  const toteB = new THREE.MeshStandardMaterial({
    color: "#6B655C", roughness: 0.86, metalness: 0.02, envMapIntensity: 0.14,
    transparent: true, opacity: 0,
  });

  /* THE SKYLIGHT STRIPS. Unlit MeshBasic, toneMapped false, and NOTHING
     PULSES — they are the acts' motivated ambient story and they just exist,
     the way a roof light does. `fog: false` on purpose: a skylight is a light
     source, and fogging it toward the backdrop at the depth these sit would
     erase them entirely; the cone and the overlay marks are unfogged for the
     same reason. Opacity is driven BY NAME in scene.tsx (solid * 0.10), so it
     is deliberately NOT in `all` — the ramp sweep would take it to 1. */
  const sky = new THREE.MeshBasicMaterial({
    color: "#B8CCE4", transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false, fog: false,
  });

  /* THE YELLOW WALKWAY EDGE LINES. The same painted-stripe idiom as `paint`
     — an unlit basic material, no depth write, fog on so a stripe running 28
     metres dissolves with the floor it is on — in worn safety yellow at the
     authored-half value, plus the alpha map that keeps it from being a vector.
     Driven by name (solid * 0.55), so likewise not in `all`. */
  const lineY = new THREE.MeshBasicMaterial({
    color: "#8F7A1E", transparent: true, opacity: 0,
    alphaMap: lineAlphaMap(),
    depthWrite: false, toneMapped: false, fog: true,
  });
  const goods = new THREE.MeshStandardMaterial({
    color: "#1F242C", roughness: 0.93, metalness: 0.02, envMapIntensity: 0.12,
    transparent: true, opacity: 0,
  });
  /* The dock's own wall panel, act 2's back wall AND act 1's structural
     material stand-in for anything sheet-steel. One step above `rack` in
     both colour and finish — a rolling door / dock wall is smoother and
     slightly more specular than open racking. */
  const dock = new THREE.MeshStandardMaterial({
    color: "#2E3540", roughness: 0.62, metalness: 0.30, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  });
  /* THE DOCK WALL IS NOT THE DOCK DOOR, AND IT CANNOT SHARE ITS MATERIAL.

     Act 2 rendered pale blue-washed against act 1's dark aisle and the hard
     cut between them read as two different websites. The cause is not the
     lighting rig, it is AREA: `dock` (#2E3540, roughness 0.62, metalness
     0.30) was authored for door panels and shutter curtains — objects a
     couple of metres across. Act 2 then asked the same material to cover a
     13 x 3.2 wall standing square to the key light, and a semi-specular
     mid-grey at that size does not read as a wall, it reads as a lit panel
     filling a third of the frame. Act 1 never exposed this because act 1's
     background is open fog and thin lattice: nothing in it is both big and
     flat, so nothing ever caught the key face-on.

     The fix belongs in the material, not the rig. Dimming the studio to suit
     one surface would take act 1 and act 3 down with it, and the whole point
     of three acts is that they are three places under ONE plant's lighting.

     #1A2028 at roughness 0.85 / metalness 0.05: a full stop under `dock`,
     and matte, so the wall returns a broad dim value instead of a sheen. It
     is deliberately close to the floor's #191D22 — a dock's back wall and its
     slab are the same poured concrete, and the frame is better served by that
     surface receding than by it being legible. envMapIntensity 0.10, matching
     the floor's, for the same reason: a big matte plane picking up the
     environment map is exactly the wash being removed. */
  const dockWall = new THREE.MeshStandardMaterial({
    color: "#1A2028", roughness: 0.85, metalness: 0.05, envMapIntensity: 0.10,
    transparent: true, opacity: 0,
  });

  /* ---- the textured dock-wall faces --------------------------------------
     One material per wall face rect, because `repeat`/`offset` live on the
     TEXTURE and each face needs its own pair to keep the 1.1m seam pitch
     constant across three segments of different width — see wallMapFor().

     TINT STAYS WHITE and the map carries the value — the opposite call from the
     floor, on purpose: this material's own note records that it was already
     taken a full stop down to stop 13 x 3.2 metres of wall reading as a lit
     panel, and a texture pass does not get to undo a grade. The map's base then
     goes a further stop under that, measured on screen; see WALL_MAP_BASE.

     Registered in `all` on creation, so the reveal ramp drives them without
     scene.tsx knowing they exist; disposed with everything else. The TEXTURES
     they sample are module-cached and are NOT disposed here. */
  const faceCache = new Map<string, THREE.MeshStandardMaterial>();
  const dockWallFace = (leftX: number, w: number, bottomY: number, h: number) => {
    const key = `${leftX}|${w}|${bottomY}|${h}`;
    const hit = faceCache.get(key);
    if (hit) return hit;
    const mat = new THREE.MeshStandardMaterial({
      map: wallMapFor(leftX, w, bottomY, h),
      roughness: 0.85, metalness: 0.05, envMapIntensity: 0.10,
      transparent: true, opacity: 0,
    });
    faceCache.set(key, mat);
    all.push(mat);
    return mat;
  };

  /* THE LEVELLER PLATE. #14181E — the darkest surface in the scene, below
     even the floor. It read as "a grey stain on the floor", which is the
     failure lamp.ts's own note describes for the pendant's shadow: a soft
     patch of a slightly different value, with no edge, reads as dirt rather
     than as an object. Value alone was never going to fix that (a LIGHTER
     plate is a brighter stain), so this goes darker AND the caller frames it
     in proud steel bars. The edge is what makes it a plate. Metalness 0.35
     keeps it steel rather than more concrete. */
  const plate = new THREE.MeshStandardMaterial({
    color: "#14181E", roughness: 0.78, metalness: 0.35, envMapIntensity: 0.22,
    transparent: true, opacity: 0,
  });

  /* THE CEILING IS NEAR-BLACK, AND IT IS ITS OWN MATERIAL.

     Act 3's two task pendants pooled warm on the ceiling underside above
     them and the two pools merged into an orange band across the top of
     frame. `light.distance` cannot fix that — the ceiling is NEARER the lamp
     than the floor is, so any cutoff that reaches the floor has already
     reached the ceiling (measured: at distance 2.6 the ceiling keeps 98% of
     its light while the floor loses 21%, i.e. the lever runs backwards). The
     pool's brightness is illuminance x ALBEDO, and albedo is the only term
     left that can be moved without touching the lighting.

     #0E1116 against `dockWall`'s #1A2028 is 0.00552 relative luminance
     against 0.01406 — 39% as bright, a 61% cut. It cannot share `dockWall`
     because that material is act 2's dock wall, which is lit face-on by the
     key and needs to stay a readable surface; taking it to near-black would
     make act 2's back wall disappear. Two large flat surfaces, two different
     lighting problems, two materials.

     The residual then reads as fixture glow on a dark ceiling rather than as
     a band of colour, which is what a real high-bay does. */
  const ceil = new THREE.MeshStandardMaterial({
    color: "#0E1116", roughness: 0.90, metalness: 0.05, envMapIntensity: 0.06,
    transparent: true, opacity: 0,
  });

  /* THE HARD HAT IS MOULDED PLASTIC, NOT POLISHED STEEL.

     It was drawn in `dark` — DARK_METAL, metalness 0.78 — so at any real zoom
     the head was a chrome ball with a specular hotspot on it and the brim was
     a flat metal disc underneath. Together they read as a metallic saucer
     where a face should be, which is what "the ellipse in the neck" actually
     was; two passes moving the brim's POSITION could never have fixed it,
     because the position was not the problem.

     Matte, metalness 0. AND IT IS YELLOW NOW, not the warm light grey a
     previous pass used: #C9A227, which is hi-vis yellow authored at half value
     by exactly the same rule as the vest's #B85413. A grey hard hat is a hard
     hat you have to already know is a hard hat; yellow is the colour the
     object is, and the hat and the vest reading as ONE safety-kit family is
     most of what makes the figure a warehouse worker rather than a mannequin
     wearing an orange tube.

     Roughness 0.60 (was 0.72) — moulded ABS is smoother than polyester
     workwear, and that difference in finish is the second thing separating the
     hat from the vest now that they are close in hue. It is still nowhere near
     the reflective banding's 0.35. */
  const helmet = new THREE.MeshStandardMaterial({
    color: "#C9A227", roughness: 0.60, metalness: 0.0, envMapIntensity: 0.20,
    transparent: true, opacity: 0,
  });

  const paint = new THREE.MeshBasicMaterial({
    color: "#5A626C", transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false, fog: true,
  });

  /* PALLETISED CARTONS, SKINNED WITH THE SAME BOARD AS CARGO VISION'S CASES.

     `cardboardSide()` is a module-cached CanvasTexture in hero-cards/skins —
     the identical call cargo.ts makes — so the two scenes' goods are visibly
     the same material and the family reads as one world rather than two
     art styles. It is CACHED AND SHARED, which means this scene must never
     dispose it; only the material below is ours.

     THE VALUE RULE, which has caught every scene on this site at least once:
     under the full rig plus ACES a matte surface lands far brighter than its
     authored albedo, and a MAPPED surface reads about a stop darker than an
     unmapped one at the same tint because the baked grain is dark over most
     of its area. #7C7costs nothing to state: the tint here is deliberately
     well above the `goods` grey it replaces, because the map will pull it
     back down. */
  const board = new THREE.MeshStandardMaterial({
    /* #3E3A33, DOWN FROM #6E6A62 — the value rule, caught on the first
       render exactly as documented. At #6E6A62 the cartons came out the
       BRIGHTEST thing in the frame, brighter than the walker they are meant
       to sit behind, which inverts the scene's whole value ladder. The
       standing rule (DECISIONS.md, and 07-design-language.md) is: goods sit
       between the background and the overlay in value, machinery is the
       darkest thing in frame, and the overlay is the only saturated thing in
       frame. Roughly halving the authored tint puts them back under the
       figure while the board grain still reads. */
    map: cardboardSide(),
    color: "#3E3A33",
    roughness: 0.95,
    metalness: 0.0,
    envMapIntensity: 0.14,
    transparent: true,
    opacity: 0,
  });

  /* ACT 3's BENCH TOPS. Its own material and its own canvas: a bench top is a
     scored composite work surface, not kraft board, and it cannot share
     `board` because `board` is also every carton and every pallet skid in
     three acts — a map put on that material would end up on all of them.

     Base #3E3A33 under a white tint, per the surface spec. NOTE FOR THE
     REVIEW: that is `board`'s TINT, and `board` multiplies it by the kraft
     map, whose baked creases are dark over most of their area — so these tops
     will land somewhat LIGHTER than the cardboard-mapped tops they replace
     (the mapped-vs-unmapped stop the value rule's corollary describes). The
     bench top has been the brightest horizontal in act 3 once before, which is
     why it was moved off `rack` in the first place. If it now reads too light,
     BENCH_MAP_BASE is the one constant to pull down. */
  const benchTop = new THREE.MeshStandardMaterial({
    map: benchMap(),
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.14,
    transparent: true,
    opacity: 0,
  });

  all.push(
    dark, lens, shirt, trouser, vest, refl, glove, skin, floor, rack, goods,
    dock, dockWall, plate, ceil, board, benchTop, helmet,
    rackBlue, rackBeam, bollard, camBody, toteA, toteB,
  );
  return {
    dark, lens, shirt, trouser, vest, refl, glove, skin, floor, rack, goods,
    dock, dockWall, dockWallFace, plate, ceil, paint, board, benchTop, helmet,
    rackBlue, rackBeam, bollard, camBody, toteA, toteB, sky, lineY, all,
    /* SWEEPS `all` RATHER THAN NAMING EVERY MATERIAL. The list used to be
       hand-written twice — once for the reveal ramp and once here — and the
       second copy is where a new material gets forgotten. It also cannot be
       hand-written any more: `dockWallFace` mints materials during buildWork,
       so the set is not known at this point in the file.

       MATERIALS ONLY. Every texture this scene samples — cardboardSide()'s
       kraft, and the four canvases at the top of this file — is module-cached
       and shared, so disposing one would leave the next mount (and, for the
       kraft, cargo-vision on the same page) sampling a destroyed texture. */
    dispose: () => {
      for (const mm of all) mm.dispose();
      metal.dispose();
      /* The three materials NOT in `all`, because their opacity is driven by
         name rather than by the ramp sweep. Every one of them still has to be
         disposed here or it leaks a GPU program per mount. */
      paint.dispose();
      sky.dispose();
      lineY.dispose();
    },
  };
}

/** Generate every canvas this scene paints, plus the canonical metal maps.
 *  Called from buildWorkMaterials and again at the top of buildWork, so a cold
 *  first mount is correct; wire it into the idle warm chain to move the cost
 *  off the visitor's scroll path. All four canvases are module-cached and
 *  never disposed. */
export function warmWorkTextures() {
  floorMap();
  wallMap();
  benchMap();
  lineAlphaMap();
  makeMetal(DARK_METAL).dispose();
  /* THE SAME MODULE-SCOPE OBJECTS THE BUILDER PASSES. metal.ts keys its cache
     on the option VALUES, so a spec re-typed inline here would still hit — but
     a spec re-typed inline anywhere is one edit away from drifting off the key
     and paying for a second Sobel pass on the visitor's scroll. Hoisted and
     shared is the only arrangement that cannot drift. All three share
     kind|rough, so this warms one roughness canvas, one normal, three
     albedos. */
  makeMetal(RACK_BLUE_METAL).dispose();
  makeMetal(RACK_BEAM_METAL).dispose();
  makeMetal(SAFETY_METAL).dispose();
}

/* ---- the subject --------------------------------------------------------- */

export interface WorkModel {
  root: THREE.Group;
  figure: THREE.Group;
  walk: (t: number) => void;
  headAnchor: THREE.Vector3;
  /** Act 1's rack-clamped arm + head, fixed; never moves. */
  fixed: THREE.Group;
  /** Act 2's wall-mounted arm + head. A SIBLING of `fixed`, and gated the
   *  same way: scene.tsx sets `fixed2.visible = act === 1` exactly as it sets
   *  `fixed.visible = act === 0`. Kept out of the env groups because a camera
   *  is equipment, not dressing, and because a rig whose head is re-aimed
   *  every frame wants to be found by name. */
  fixed2: THREE.Group;
  /** Act 3's ceiling-hung stem + head. Gated `act === 2`, same as its two
   *  siblings. */
  fixed3: THREE.Group;
  /** [shared floor, act1 dressing, act2 dressing, act3 dressing]. [0] is
      always visible; scene.tsx toggles [1]/[2]/[3] on the hard cut so
      exactly one of them is visible at a time. */
  envActs: THREE.Group[];
  /* ACT 1 HAS NO PENDANT. The `lamp` field is gone, not left as an unused
     optional: a `lamp` on this interface is what would let a future pass wire
     the fitting's PointLight back on by name without noticing the fitting is
     not in the scene. Act 1 is lit by its roof instead — see `dayLight`. */
  /** Act 1's daylight through the roof — a bare PointLight with NO fixture
   *  geometry, motivated by the skylight strips above it. Its intensity is
   *  driven by name in scene.tsx and gated on act === 0, because a PointLight
   *  is not culled by `env1.visible = false`; ungated it would light the dock
   *  and the pack line through their own roofs. See buildWork for the
   *  I = 42.3 derivation and for why `distance` is 8.0. */
  dayLight: THREE.PointLight;
  /** Act 2's pendant, over the dock walk line. Its materials AND its
   *  PointLight are ramped by name in scene.tsx — a lamp left to the generic
   *  mats.all sweep would sit at opacity 0 forever and its light at intensity
   *  0, the exact defect cargo-vision shipped once. Gated on act === 1: a
   *  PointLight is not hidden by `env2.visible = false`. */
  lamp2: Pendant;
  /** Act 3's TWO small task pendants over the pack benches. Both of their
   *  PointLights are gated on act === 2 in scene.tsx — a light is not culled
   *  by its parent group's visibility. */
  taskLamps: Pendant[];
  /** Act 1's one detection camera — housing, cone, aim and colour flip, all
   *  from the shared rig. `readCam.aimAt(target)` re-points the head AND
   *  re-throws the cone from the live lens in one call; the apex/half-angle/
   *  length-to-floor arithmetic that used to live in this file is inside it. */
  readCam: ReadCamera;
  /** Act 2's detection camera. Built from the SAME `makeActCam` factory as
   *  `readCam` — one camera spec, three acts — differing only in mount and
   *  aim. Its `coneGroup` is a sibling group scene.tsx adds and drives. */
  readCam2: ReadCamera;
  /** Act 3's detection camera. Third call to the same `makeActCam` factory. */
  readCam3: ReadCamera;
  owned: THREE.BufferGeometry[];
  dispose: () => void;
}

export function buildWork(m: WorkMaterials): WorkModel {
  /* Belt and braces: buildWorkMaterials already warms these, and the idle
     chain warms them earlier still, but a first mount that reached here
     without either must not paint a canvas mid-build. Idempotent — every
     getter is module-cached. */
  warmWorkTextures();
  const owned: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, mat: THREE.Material, cast = true) => {
    owned.push(g);
    const o = new THREE.Mesh(g, mat);
    o.castShadow = cast;
    return o;
  };
  // background dressing: no shadow casting (see the house rule this scene
  // has always followed — the shadow map budget belongs to the walker)
  const envMesh = (g: THREE.BufferGeometry, mat: THREE.Material, own = true) => {
    if (own) owned.push(g);
    return new THREE.Mesh(g, mat);
  };

  /* ======================= THE WALKER =======================
     UNCHANGED from the single-aisle build. Built facing LOCAL +Z, then
     yawed a quarter turn so local +Z becomes world +X. scene.tsx flips that
     yaw to -PI/2 for act 2 (the reverse-direction act), which is the only
     thing that ever touches `figure.rotation.y` after this point — a
     mirror, not a rebuild.

     THE CROWN STAYS AT EXACTLY 1.815. Load-bearing for the framing solve
     in scene.tsx, the callout anchor, and the cone clearance. Do not change
     it without re-deriving all three. */
  const root = new THREE.Group();
  const figure = new THREE.Group();
  figure.name = 'walker';
  figure.rotation.y = Math.PI / 2;
  root.add(figure);

  /* ---- CHEST DEPTH IS LESS THAN CHEST WIDTH -------------------------------
     A CIRCULAR TORSO IS A PIPE. The torso cylinder and the vest shell over it
     were both bodies of revolution, so the figure had the same 0.40 across the
     shoulders as front to back — and the camera sees him in PROFILE in all
     three acts, which is exactly the axis a circular section is wrong on. A
     real chest is roughly 0.85 as deep as it is wide.

     0.85 IN Z, ON THE TORSO AND THE VEST ONLY. Arms, shoulders, hips, head and
     helmet are untouched, and the crown stays at 1.815 — a z scale cannot move
     a height, but stating it is cheaper than re-deriving the framing solve.

     THE VEST STILL CLEARS THE TORSO EVERYWHERE, and it has to, because a vest
     that sinks into the shirt at any height is a stripe rather than a garment.
     Both are scaled by the SAME factor about the same axis, so the 1.12
     proud-ratio is preserved exactly and the z margin is just the old margin
     times 0.85. Margins re-run at 0.85 z, over the vest's own 1.020..1.450:

       y      torsoR(y)   torso z-half   vest z-half   z margin   x margin
       1.020  0.185390    0.157582       0.176492      0.018910   0.022247
       1.130  0.188961    0.160617       0.179891      0.019274   0.022675
       1.235  0.192370    0.163515       0.183136      0.019622   0.023084
       1.340  0.195779    0.166412       0.186382      0.019969   0.023493
       1.450  0.199351    0.169448       0.189781      0.020332   0.023922

     (torso z-half = torsoR(y) * 0.85; vest z-half = torsoR(y) * 1.12 * 0.85;
     the vest's own radii are torsoR at its two ends x 1.12 and BOTH profiles
     are linear in y, so the ratio is exactly 1.12 at every height between —
     the margin cannot dip in the middle.) Minimum clearance is 18.9mm in z at
     the vest's bottom edge, against 22.2mm in x. Nothing intersects.

     ONE PRE-EXISTING OVERLAP MOVES, AND IT IS WORTH NAMING. The shoulder
     sphere is scaled 1.45 in z (0.29 half-depth at its centre) and was already
     proud of the vest in z above about y = 1.29; at 0.85 that crossing comes
     down to about y = 1.243. So a little more shoulder mass reads outside the
     vest's top in profile than before. That is what a shirt over a chest
     actually does, and the shoulders were explicitly out of scope. */
  const TORSO_Z = 0.85;
  const torso = mesh(new THREE.CylinderGeometry(0.20, 0.175, 0.77, 16), m.shirt);
  torso.position.y = 1.085;
  torso.scale.z = TORSO_Z;
  figure.add(torso);

  /* SHOULDERS DOWN 25mm, 1.380 -> 1.355, AND THAT IS WHAT MAKES THE NECK
     EXIST. The neck is only a silhouette break if there is a stretch of height
     where the NECK is the widest member — wider than the shoulder mass below
     and wider than the head above. In profile (the camera sees the figure's
     local z, so the shoulder sphere's 1.45 z-scale is what is on screen):

       shoulder z half-width  = 0.20*1.45*sqrt(1 - ((y-cy)/0.144)^2)
         = 0.045 at (y-cy)/0.144 = 0.987888, i.e. 0.142256 above cy
       head     z half-width  = sqrt(0.125^2 - (y-1.640)^2)
         = 0.045 at 0.116619 below 1.640, i.e. y = 1.523381

     At the OLD cy of 1.380 the shoulders stayed 45mm wide up to y = 1.522256
     and the head took over at 1.523381 — a 1.1mm window, so the neck was
     geometrically invisible however it was built. That is why the figure read
     as a balloon head with no neck: there WAS a neck mesh in there, doing
     nothing at all.

     cy = 1.355 puts the shoulder crossing at 1.497256, so the neck is the
     widest member over 1.497256 .. 1.523381 = 26.1mm. At act 1's framing
     (7.5m out, 30 deg vertical fov -> 2*7.5*tan(15) = 4.019 units of frame
     height, 179.2 px per unit on a 720px canvas) that is 4.7px of visible
     neck. Small, and it is meant to be — the brief is that the head reads as
     ATTACHED, not that the neck is a feature.

     Nothing else moves with it: the arm pivots stay at SH_Y = 1.44, which the
     sphere still covers (its top is 1.355 + 0.144 = 1.499), and the torso
     cylinder still tops out at 1.470 inside it. */
  const shoulders = mesh(new THREE.SphereGeometry(0.20, 20, 14), m.shirt);
  shoulders.scale.set(1.0, 0.72, 1.45);
  shoulders.position.y = 1.355;
  figure.add(shoulders);

  /* ---- THE HI-VIS VEST ----------------------------------------------------

     THE ONE IDENTIFYING FEATURE OF A WAREHOUSE WORKER. Everything else on this
     figure is a person; this is what makes him a person who works here, and it
     is the same lesson act 1's lattice uprights taught about racking — one
     correct feature beats any amount of general detail.

     A SHELL OVER THE TORSO, NOT A RECOLOUR OF IT. 1.12 in x and z, so it
     stands 12% proud of the torso cylinder and has its own silhouette edge
     against the shirt; a vest painted onto the torso would be a stripe.
     SHORTER than the torso — it ends at the hips, which is where a vest ends:

       torso  r 0.200 top / 0.175 bottom, 0.77 tall @ 1.085  ->  0.700 .. 1.470
       hips   box 0.22 tall @ 0.92                           ->  0.810 .. 1.030
       vest   1.020 .. 1.450, so 0.43 tall, centre y = 1.235

     Its radii are the TORSO's radii at those two heights, scaled — so the
     vest tapers with the body instead of being a straight tube over a cone:

       torso r(y) = 0.175 + (y - 0.700)/0.77 * 0.025
       r(1.020) = 0.175 + 0.320/0.77*0.025 = 0.185390  ->  x1.12 = 0.207637
       r(1.450) = 0.175 + 0.750/0.77*0.025 = 0.199351  ->  x1.12 = 0.223273

     The bottom edge sits 10mm below the hips' top face and the top edge 20mm
     under the torso's, so the shirt shows as a band at the collar and the
     trousers show at the waist — the vest is a garment ON him, with both its
     ends visible, rather than a second skin.

     IT DOES NOT FLARE AT THE HIPS, and it cannot: the torso cylinder is
     0.20 at the TOP and 0.175 at the bottom, i.e. it already tapers IN going
     down, so the vest inherits 0.223273 at the chest against 0.207637 at the
     waist — 16mm narrower at the bottom. A hi-vis vest hanging straight or
     slightly tapered in is exactly what this taper gives. (The `hips` box
     below is 0.30 across, narrower than the torso's own 0.35 diameter at that
     height, so nothing under the vest flares either.) */
  const VEST_SCALE = 1.12;
  const torsoR = (y: number) => 0.175 + ((y - 0.700) / 0.77) * 0.025;
  const VEST_Y0 = 1.020, VEST_Y1 = 1.450;
  const VEST_H = VEST_Y1 - VEST_Y0;                       // 0.43
  const vest = mesh(new THREE.CylinderGeometry(
    torsoR(VEST_Y1) * VEST_SCALE,                          // 0.223273
    torsoR(VEST_Y0) * VEST_SCALE,                          // 0.207637
    VEST_H, 16,
  ), m.vest);
  vest.position.y = (VEST_Y0 + VEST_Y1) / 2;               // 1.235
  vest.scale.z = TORSO_Z;                                  // see the torso note
  figure.add(vest);

  /* ---- THE TWO WRAPPING REFLECTIVE BANDS ARE GONE ------------------------

     THEY WERE THE ELLIPSE THROUGH HIS CHEST. Two thin flat cylinders at
     y = 1.130 and 1.340, each a full 360-degree band 4mm proud of the vest —
     and this file already has the finding written down twice, at the helmet
     brim: a thin horizontal closed curve, seen from a camera a few degrees
     above it, projects to an ELLIPSE at every radius and at every height. The
     brim shipped that defect and was replaced by a front-only box for exactly
     this reason. The bands were the same object in a different place, and the
     review called it the same way: "an ellipse through his chest".

     There is no version of a wrapping band that avoids it. The rule for this
     figure is now flat: NO discs, annuli, tori or full-wrap bands, anywhere on
     or around him. Retroreflective tape survives as the STRAPS below, which
     are vertical and therefore have no closed curve to project.

     BAND_H / BAND_PROUD are removed with the geometry — a constant with no
     consumer is the next pass's invitation to re-add the object. */

  /* ---- FOUR VERTICAL OVER-SHOULDER STRAPS: TWO FRONT, TWO BACK -----------

     The straps used to be front-only, on the reasoning that the back is never
     on camera. That was true while the bands existed to carry the vest's read
     from behind; with the bands gone it is not, and act 2 runs the walk in
     REVERSE, which turns the figure's other side toward the lens for a third
     of the loop. So the back gets matching segments — same material, same
     section, mirrored in z. Still no ring: four separate vertical strips.

     DEEP IN Z (0.05) RATHER THAN THIN. The vest is a curved surface and the
     strap is a straight box, so a thin plate at one z either floats at one end
     of its run or buries itself at the other; the box has to STRADDLE the
     surface over the whole run. Same trick the shutter's lip bar uses.

     THE Z RUN IS RE-DERIVED FOR THE 0.85 FLATTEN, and it had to be: the vest
     is now an ELLIPTICAL section, so the old circular solve is wrong by 30mm
     and the straps would have stood off the chest like handles. With
     semi-axes a = torsoR(y) * 1.12 in x and b = 0.85a in z, the surface at
     x = 0.09 is z = b * sqrt(1 - (0.09/a)^2):

       y = 1.220  a = 0.214909  b = 0.182673  ->  z = 0.165879
       y = 1.335  a = 0.219091  b = 0.186227  ->  z = 0.169791
       y = 1.450  a = 0.223273  b = 0.189782  ->  z = 0.173678

     STRAP_Z = 0.155 with a 0.05 section spans z 0.130 .. 0.180, so:

       inner face 0.130 is under the surface at every height (min 0.1659) —
                  buried by 36mm at the top of the run, 44mm at the bottom
       outer face 0.180 is over it at every height — proud by 6.3mm at the top
                  of the run and 14.1mm at the bottom

     which reproduces the old 6mm / 15mm proud margins almost exactly. The
     back pair is the same box at -STRAP_Z, and the vest section is symmetric
     in z, so the same two numbers hold there. */
  const STRAP_Y0 = 1.220, STRAP_Y1 = 1.450;
  const STRAP_Z = 0.155;
  /* ONE GEOMETRY, FOUR MESHES, PUSHED INTO `owned` ONCE. `mesh()` pushes on
     every call, so building the straps through it would put the same
     BufferGeometry in the dispose list four times — the reason every reused
     geometry elsewhere in this file carries an explicit own flag. */
  const strapGeo = new THREE.BoxGeometry(0.05, STRAP_Y1 - STRAP_Y0, 0.05);
  owned.push(strapGeo);
  for (const sz of [-STRAP_Z, STRAP_Z]) {
    for (const sx of [-0.09, 0.09]) {
      const strap = new THREE.Mesh(strapGeo, m.refl);
      strap.castShadow = true;
      strap.position.set(sx, (STRAP_Y0 + STRAP_Y1) / 2, sz);
      figure.add(strap);
    }
  }

  /* ---- THE NECK -----------------------------------------------------------
     r 0.045 at the top / 0.058 at the base (a neck widens into the
     trapezius), 0.055 tall, centred at 1.512 -> spans 1.4845 .. 1.5395. BOTH
     ENDS ARE BURIED, which is the point — the silhouette break is the whole
     feature and a visible seam at either end would undo it:

       bottom 1.4845 sits inside the shoulder sphere, whose z half-width there
              is 0.29*sqrt(1-(0.1295/0.144)^2) = 0.12676 against the neck's
              0.058
       top    1.5395 sits inside the head, whose half-width there is
              sqrt(0.125^2 - 0.1005^2) = 0.07433 against the neck's 0.045

     See the shoulder note above for why the exposed band is 26.1mm. */
  const neck = mesh(new THREE.CylinderGeometry(0.045, 0.058, 0.055, 12), m.skin);
  neck.position.y = 1.512;
  figure.add(neck);

  /* ---- THE HEAD, AND THE CROWN CHAIN ------------------------------------

     THE CROWN IS STILL EXACTLY 1.815 — the framing solve in scene.tsx, the
     callout anchor and the sight-cone clearance are all keyed to it, and the
     hat is what reaches it (a person's height is measured over whatever is on
     their head). The hat is therefore the FIXED end of the chain and the head
     is rebalanced under it:

       hat    r 0.150, scaleY 0.70 @ 1.710
              crown = 1.710 + 0.150 * 0.70 = 1.710 + 0.105 = 1.815    EXACT
              rim   = 1.710 - 0.105 = 1.605
       head   r 0.125 (was 0.135) @ 1.640 (was 1.650)  ->  1.515 .. 1.765
       neck   0.045/0.058, 0.055 tall @ 1.512           ->  1.4845 .. 1.5395

     The head DROPPED 10mm and SHRANK 10mm, which is what buys the neck the
     room it needs: its underside goes from 1.515 to 1.515 (unchanged, by
     construction — the two 10mm moves cancel there) while its widest point
     comes down from 1.650 to 1.640 and its top from 1.785 to 1.765, i.e. 50mm
     of clear shell above the cranium instead of 30mm.

     WHERE THE HELMET RIM ACTUALLY READS. Not at the hat's own bottom edge —
     an ellipsoid's width goes to zero there — but where the hat becomes wider
     than the head. Solving 0.150^2*(1-(a/0.105)^2) = 0.125^2-(a+0.07)^2 with
     a = y - 1.710:
       1.040816 a^2 - 0.14 a - 0.011775 = 0
       a = (0.14 - sqrt(0.0196 + 0.049022)) / 2.081632 = -0.058588
       y = 1.651412
     So the shell reads from y = 1.651 to the crown at 1.815 (164mm of helmet)
     and skin reads from 1.523 (where the neck takes over) to 1.651 — 128mm of
     face, up from the 90mm the old numbers gave. */
  const head = mesh(new THREE.SphereGeometry(0.125, 20, 14), m.skin);
  head.position.y = 1.640;
  figure.add(head);

  const hat = mesh(new THREE.SphereGeometry(0.150, 18, 12), m.helmet);
  hat.scale.set(1.0, 0.70, 1.0);
  hat.position.y = 1.710;
  figure.add(hat);

  /* ---- A SHORT FRONT PEAK, AND IT IS A BOX ------------------------------

     NEVER A DISC OR AN ANNULUS. Three passes once tried to give this helmet a
     brim — at the head's equator, then at the shell's underside, then biased
     forward — and every one read as the same flat ellipse, because a thin
     horizontal disc seen from a camera 6 degrees above it projects to an
     ellipse ALWAYS, at every radius. That defect shipped once and was removed,
     and re-adding a disc here in any form would ship it again.

     A FRONT-ONLY BOX cannot have the problem: it exists over ~0.09 of x
     instead of the full 360, so there is no closed curve to project into an
     ellipse, and being pitched down 20 degrees its own top face is turned
     toward the lens rather than lying square to it.

     0.09 wide x 0.05 deep x 0.015 thick, at the brow. Its position comes off
     the rim solve above: the rim reads at y = 1.651412, where the hat's
     radius is 0.150*sqrt(1-(0.058588/0.105)^2) = 0.124479, so the front rim
     point is (0, 1.6514, +0.1245). Centred at (0, 1.648, 0.1425) with
     rotation.x = +20 deg (which tips the +z end DOWN — R_x sends a point at
     +z to y' = -z sin(theta)), the peak's inner edge lands at
     z = 0.1425 - 0.025*cos(20) = 0.1190, inside BOTH shells at that height
     (hat radius 0.121055, head radius 0.124744) — so it grows out of the
     helmet instead of floating in front of it. */
  const peak = mesh(new THREE.BoxGeometry(0.09, 0.015, 0.05), m.helmet);
  peak.position.set(0, 1.648, 0.1425);
  peak.rotation.x = (20 * Math.PI) / 180;
  figure.add(peak);

  const hips = mesh(new THREE.BoxGeometry(0.30, 0.22, 0.22), m.trouser);
  hips.position.y = 0.92;
  figure.add(hips);

  const joint = (x: number, y: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    figure.add(g);
    return g;
  };

  /* ---- LIMBS ARE SEGMENTED NOW: ELBOWS AND KNEES --------------------------

     The figure read as a blob, and single-capsule limbs are why. A straight
     rod from shoulder to wrist has no elbow, so it cannot swing like an arm —
     it pivots as one piece and merges into the torso's silhouette at every
     phase of the gait. Same for the legs: a rigid rod from hip to ankle
     scissors rather than walks, and the foot has to travel through the floor
     or the hip has to rise absurdly to clear it.

     A second joint per limb fixes both, and it is the ONLY thing that does.
     The joint hierarchy is the same one the file already uses and for the same
     reason: an empty Group AT the joint, with the segment hung BELOW it, so
     rotating the group pivots about the joint instead of see-sawing about the
     segment's own centre.

     ARM CHAIN, from the shoulder at 1.44:
       upper  Capsule(0.055, 0.20) -> 0.310 long, elbow at 1.130
       fore   Capsule(0.048, 0.20) -> 0.296 long, wrist at 0.834
       hand   Sphere(0.052) just past the wrist
     LEG CHAIN, from the hip at 0.92:
       thigh  Capsule(0.072, 0.30) -> 0.444 long, knee at 0.476
       shin   Capsule(0.058, 0.30) -> 0.416 long, ankle at 0.060
       boot   0.14 tall, sole on GROUND_Y, overlapping the ankle by 0.08

     The chain totals 0.86 from hip to ankle, unchanged from the single capsule
     it replaces, so the crown STAYS AT 1.815 — the number the framing solve,
     the callout anchor and the cone clearance are all keyed to.

     The arms also move out from +-0.235 to +-0.255. In profile that costs
     nothing (it is the axis pointing at the lens) but it stops the upper arm
     from co-inciding with the torso's own edge, which was half the blob. */
  const ARM_X = 0.255, SH_Y = 1.44;
  const armL = joint(ARM_X, SH_Y);
  const armR = joint(-ARM_X, SH_Y);
  const elbowL = new THREE.Group(), elbowR = new THREE.Group();
  [[armL, elbowL], [armR, elbowR]].forEach(([j, e]) => {
    const upper = mesh(new THREE.CapsuleGeometry(0.055, 0.20, 5, 10), m.shirt);
    upper.position.y = -0.155;
    j.add(upper);
    e.position.y = -0.310;
    j.add(e);
    const fore = mesh(new THREE.CapsuleGeometry(0.048, 0.20, 5, 10), m.shirt);
    fore.position.y = -0.148;
    e.add(fore);
    /* GLOVES: 0.046, DOWN FROM 0.052, and in `m.glove` rather than `m.skin`.
       The white spheres at hip height were the palest things on the figure
       after the helmet and pulled the eye off the head — see m.glove's note.
       Wrist position is UNCHANGED at -0.326: the arm's forward-kinematics
       solve in `walk` below is keyed to a 0.326 elbow-to-hand length and moving
       it would invalidate the hand-on-chest arithmetic recorded there. */
    const hand = mesh(new THREE.SphereGeometry(0.046, 10, 8), m.glove);
    hand.position.y = -0.326;
    e.add(hand);
  });

  const legL = joint(0.105, 0.92);
  const legR = joint(-0.105, 0.92);
  const kneeL = new THREE.Group(), kneeR = new THREE.Group();
  [[legL, kneeL], [legR, kneeR]].forEach(([j, k]) => {
    const thigh = mesh(new THREE.CapsuleGeometry(0.072, 0.30, 5, 12), m.trouser);
    thigh.position.y = -0.222;
    j.add(thigh);
    k.position.y = -0.444;
    j.add(k);
    const shin = mesh(new THREE.CapsuleGeometry(0.058, 0.30, 5, 12), m.trouser);
    shin.position.y = -0.208;
    k.add(shin);
    /* boot sole on GROUND_Y when the leg is straight: the knee sits at world
       0.476, so a 0.14-tall boot centred at knee-local -0.406 puts its sole at
       0.476 - 0.406 - 0.07 = 0. It overlaps the shin's 0.06 ankle by 0.08, so
       there is no seam — the defect an earlier pass shipped twice. */
    /* THE SHOE IS A SOLE PLUS AN UPPER, NOT ONE BRICK.

       A single 0.15 x 0.14 x 0.24 box has no arch, no toe and no heel — at
       any size it reads as a block stuck on the end of a leg. Two parts fix
       it, and they are the two parts a shoe silhouette is actually made of:

         sole   thin, wider than the upper, LONGER at the toe. The overhang
                is the whole cue: a foot is longer at the floor than it is at
                the ankle.
         upper  shorter and set BACK, so the sole projects in front of it.

       Both are still one material — this is silhouette work, not detail. */
    const sole = mesh(new THREE.BoxGeometry(0.155, 0.045, 0.27), m.dark);
    sole.position.set(0, -0.4535, 0.055);
    k.add(sole);
    const upper = mesh(new THREE.BoxGeometry(0.135, 0.115, 0.185), m.trouser);
    upper.position.set(0, -0.373, 0.018);
    k.add(upper);
  });

  /* The gait. Driven by absolute scene time, not loop phase — see scene.tsx.

     THE SECOND JOINTS ARE WHAT MAKE IT A WALK RATHER THAN A SCISSOR.

     KNEES bend only on the RECOVERY leg — the one swinging forward, off the
     ground — and never on the stance leg, which must stay straight because it
     is carrying the body. `Math.max(0, s)` gates exactly that: it is zero for
     the whole half-cycle the leg is planted and rises to full flex at the top
     of the swing. A knee that bends on both halves is the single most common
     way a walk cycle reads as a puppet.

     Bending is NEGATIVE about local X: a knee folds the shin backwards, and
     the figure is built facing local +Z, so the shin's lower end has to travel
     toward -Z.

     ELBOWS carry a constant -0.30 of bend plus a small counter-swing. A
     straight arm swinging from the shoulder is a pendulum; a person walking
     holds a slight permanent flex, and that flex alone is worth more to the
     silhouette than the swing amplitude is. */
  const walk = (t: number) => {
    const s = Math.sin(2 * Math.PI * t * STEP_HZ);
    legL.rotation.x = 0.62 * s;
    legR.rotation.x = -0.62 * s;
    kneeL.rotation.x = -0.95 * Math.max(0, s);
    kneeR.rotation.x = -0.95 * Math.max(0, -s);
    /* THE HAND WAS ENDING UP ON HIS CHEST. Reviewed zoomed, the arm folded
       ACROSS the torso with the hand near the collarbone — it read as a man
       with a hand tucked inside his jacket, which is a posture, and a posture
       is a thing the viewer starts interpreting. Two conservative changes,
       because the rest of this figure is signed off:

         shoulder  0.42 -> 0.336 amplitude (-20%)
         elbow     addend 0.18 -> 0.08, so the fold caps at -0.38 not -0.48

       Forward kinematics on the worst case (s = +1, shoulder -0.336, elbow
       -0.30, so the forearm sits at -0.636 from vertical), from the shoulder
       at 1.44 with a 0.310 upper arm and a 0.326 elbow-to-hand:
         elbow  y = 1.44 - 0.310*cos(0.336) = 1.1473,  z = +0.1022
         hand   y = 1.1473 - 0.326*cos(0.636) = 0.885, z = +0.296
       Mid-torso is 1.085 (the torso runs 0.700..1.470), so the hand's forward
       apex now clears it by 0.20 and can no longer reach chest height. It was
       0.912 before, so this is a 27mm drop and a 45mm pull-in — deliberately
       small: the complaint is about where the hand ARRIVES, not about the
       walk having too much swing.

       LEGS, CROWN AND HEAD ARE UNTOUCHED. 1.815 is load-bearing for the
       framing solve, the callout anchor and the cone clearance. */
    armL.rotation.x = -0.336 * s;
    armR.rotation.x = 0.336 * s;
    elbowL.rotation.x = -0.30 - 0.08 * Math.max(0, -s);
    elbowR.rotation.x = -0.30 - 0.08 * Math.max(0, s);
    figure.position.y = 0.035 * Math.abs(s);
  };

  /* ======================= ACT 1's ONE CAMERA =======================

     OFF THE FLOOR AND OUT OF THE WALKWAY. It used to be a mast standing at
     (-0.6, -2.1) — in the aisle the walker uses, which is both wrong for a
     warehouse (nobody puts a pole in a pick face) and wrong for the shot,
     since a vertical post through the middle of frame cuts the composition in
     two. Real warehouse cameras hang off the structure: a horizontal arm
     clamped to the top of a rack run, reaching out over the aisle, with the
     head on its end.

     So the rig is now an ARM, and every number falls out of the racking it is
     clamped to rather than being chosen:

       clamp   at the top of the near rack run, z = RACK_Z, y = RACK_H - 0.15
       arm     runs from there OUT over the aisle to ARM_Z
       drop    a short stem down to the head, so the lens clears the arm
       head    at (ARM_X, HEAD_Y, ARM_Z), looking down at the walk line

     THE HEAD IS NOT FIXED — see `aimAt` below. */
  const fixed = new THREE.Group();
  fixed.name = 'act1cam';

  const CAM_X = -1.62;                    // left of centre, clear of the walker
  /* -1.62, in from -2.35. At -2.35 the clamp and half the arm sat outside the
     left frame edge and the rig read as a fragment rather than as a camera on
     a bracket — the mount is the thing that makes a camera legible (see the
     corner-prop removal), so cropping the mount defeats the point of having
     put it on a real one. */
  const CAM_Z = -1.55;                    // out over the aisle from the rack
  const CLAMP_Z = RACK_Z + RACK_D * 0.4;  // the rack face it clamps to
  const CAM_Y = RACK_H - 0.15;

  // the clamp block on the rack's top rail
  const clamp = mesh(new THREE.BoxGeometry(0.16, 0.20, 0.22), m.dark, false);
  clamp.position.set(CAM_X, GROUND_Y + CAM_Y, CLAMP_Z);
  fixed.add(clamp);

  // the arm itself, reaching out over the aisle
  const armLen = Math.abs(CAM_Z - CLAMP_Z);
  const armBar = mesh(new THREE.BoxGeometry(0.075, 0.075, armLen), m.dark, false);
  armBar.position.set(CAM_X, GROUND_Y + CAM_Y, (CLAMP_Z + CAM_Z) / 2);
  fixed.add(armBar);

  // a diagonal tie back to the rack, so the arm is braced rather than
  // cantilevered off nothing
  const tieLen = Math.hypot(armLen * 0.8, 0.42);
  const tie = mesh(new THREE.BoxGeometry(0.045, tieLen, 0.045), m.dark, false);
  tie.position.set(CAM_X, GROUND_Y + CAM_Y - 0.21, (CLAMP_Z + CAM_Z) / 2 + armLen * 0.1);
  tie.rotation.x = Math.atan2(armLen * 0.8, 0.42);
  fixed.add(tie);

  // the drop stem, arm down to the head
  const HEAD_DROP = 0.26;
  const stem = mesh(new THREE.BoxGeometry(0.05, HEAD_DROP, 0.05), m.dark, false);
  stem.position.set(CAM_X, GROUND_Y + CAM_Y - HEAD_DROP / 2, CAM_Z);
  fixed.add(stem);

  const mount = new THREE.Vector3(CAM_X, GROUND_Y + CAM_Y - HEAD_DROP, CAM_Z);
  const aim = new THREE.Vector3(AIM_X, AIM_Y, 0);

  /* THE HEAD, AND IT TRACKS — now the shared rig, see _vision/readCamera.ts.

     Cargo Vision's read camera is fixed because its subject stream is fixed —
     the belt always crosses the same point. Here the subject WALKS the length
     of the frame, so a head bolted to one bearing would be pointing at empty
     aisle for most of the act while its own cone swung across to follow. A
     camera whose body and whose sight line disagree is worse than no camera.
     `headTracks` defaults to true, which is exactly this case.

     The apex-from-live-glass bug this scene once shipped (a cone firing from
     the world origin because the lens was sampled once at build time instead
     of read from the rotating head) is now the rig's problem, not this
     file's — `readCam.aimAt(target)` re-points the head AND re-throws the
     cone from the live lens in one call. scene.tsx calls it every frame with
     the walker's chest.

     bodyMat/lensMat, bodySize/bodyZ/lensZ/lensR/lensR2/lensLen/yoke/hood all
     reproduce this rig's original hand-built housing exactly (yoke 0.07 x
     0.14 x 0.07 at z 0.02, body 0.19 x 0.17 x 0.34 at z 0.22, lens r 0.072 at
     z LENS_OUT = 0.46) — see buildReadCamera's own defaults for why each one
     needed an explicit override here. hoodR/hoodLen/hoodZ do the same for the
     sun hood (0.098 radius, 0.14 long, z=0.40): the rig's derived defaults
     (lensR*1.32, lensZ-0.02) land a few mm off this scene's original, so
     these three exist specifically to close that gap rather than accept the
     derived shape.

     coneRadius/minHalfAngle map CONE_FOOT and CONE_HALF_ANGLE — the same
     `max(floor, atan(footprint / range))` this file used to compute per
     frame at the scene.tsx call site. floorY: GROUND_Y gives the cone its
     length from the ray-plane hit with the floor rather than truncating at
     the walker's chest — see the rig header's point 3 — so the separate
     `coneLen` this file used to derive is now redundant and has been
     removed. */
  /* ---- ONE CAMERA SPEC, THREE ACTS ---------------------------------------

     THREE CAMERAS ON ONE SITE ARE THREE OF THE SAME CAMERA. This is the
     hero-cards lesson restated: a site does not buy a different housing per
     bay, and a viewer who is being asked to believe "the same person, seen by
     three cameras" is not helped by three different-looking cameras. Every
     option below was derived once for act 1 (see the note above for why each
     override exists); the only things that differ per act are WHERE the head
     hangs and WHAT it is pointed at, which are the two arguments.

     Act 1's own call is now `makeActCam(mount, aim)` and is byte-for-byte the
     same set of options it passed before — this factory is a re-parenting of
     the argument list, not a re-derivation of it. The MOUNT is still each
     act's own business (act 1 clamps to a rack top, act 2 hangs off the dock
     wall); the rig header is explicit that the mount is not shared. */
  const makeActCam = (mountAt: THREE.Vector3, aimAt: THREE.Vector3) => buildReadCamera({
    mount: mountAt, aim: aimAt,
    /* `camBody`, NOT `dark` — one line, all three rigs, because they are all
       three calls to this one factory. See the material's own note: DARK_METAL
       is a `plate` finish whose panel joints and scuffs are bigger than a
       camera housing's faces, so the head read as asphalt. The MOUNTS above
       and below stay on `dark`; they are structural steel. The LENS is
       unchanged. */
    bodyMat: m.camBody,
    lensMat: m.lens,
    bodySize: [0.19, 0.17, 0.34],
    bodyZ: 0.22,
    lensZ: LENS_OUT,
    lensR: 0.072,
    lensR2: 0.072,
    lensLen: 0.04,
    yoke: true,
    hood: true,
    hoodR: 0.098,
    hoodLen: 0.14,
    hoodZ: 0.40,
    coneRadius: CONE_FOOT,
    minHalfAngle: CONE_HALF_ANGLE,
    floorY: GROUND_Y,
  });

  const readCam = makeActCam(mount, aim);
  fixed.add(readCam.group);
  owned.push(...readCam.owned);

  /* ======================= THE THREE CORNER HOUSINGS =======================
     One small camera-and-bracket prop per act, built once here, attached to
     the render camera by scene.tsx (as a child, in camera-local space) so it
     always sits in the same screen corner without any per-frame projection
     math — the camera never moves within an act, so a child transform IS the
     corner placement. Reuses the same box-body / cylinder-lens language as
     the act 1 pole head above, just built small and close.

     THE GROUP'S LOCAL -Z IS ITS OWN "LOOKING" AXIS (matching the pole head's
     own local +Z-out convention closely enough that the silhouette reads the
     same way): scene.tsx rotates each group to angle the lens back toward
     the centre of frame, away from its corner. */

  /* ======================= THE THREE ENVIRONMENTS =======================
     One group per act. envActs[0] is the floor slab plus act 1's dressing
     and is visible by default (act 1 opens the loop); [1] and [2] start
     hidden and scene.tsx flips `.visible` on the hard cut. Nothing here is
     ever re-parented or rebuilt — a cut is a visibility swap, not a scene
     change. */
  const envShared = new THREE.Group();  // the one physical floor every act stands on
  envShared.name='envShared';
  const env1 = new THREE.Group();
  env1.name='act1';
  const env2 = new THREE.Group();
  env2.name='act2';
  const env3 = new THREE.Group();
  env3.name='act3';
  env2.visible = false;
  env3.visible = false;

  /* ---- the floor slab, shared ---- */
  const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const slab = envMesh(floorGeo, m.floor);
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = GROUND_Y - 0.030;
  slab.renderOrder = -4;
  envShared.add(slab);

  /* ---- THE YELLOW WALKWAY EDGE LINES, SHARED BY ALL THREE ACTS -----------

     A pedestrian walkway marked on the floor is the single most warehouse
     thing a warehouse floor has, and it is the object that turns "a grey plane
     with a grid on it" into a floor with a USE. It also states, without a word
     of copy, that the walker is where he is supposed to be — which is the
     section's whole claim.

     IN `envShared`, NOT PER ACT. The walk line is z = 0 in every act by
     construction (see the header), so the walkway is the same physical
     walkway in all three places; act 3's pack line has one too, because pack
     lines have walkways. One pair of meshes rather than three.

     GEOMETRY. z = +0.85 and -0.85, i.e. a 1.70 aisle centred on the walk line
     — wide enough to walk two abreast and narrower than act 1's existing grey
     stripes at +-AISLE_HW = 1.45, so the two do not collide. 0.06 wide, 28
     long, matching the grey stripes' own plane.

     HEIGHT AND ORDER. y = GROUND_Y - 0.006, above the grey stripes (-0.008),
     the drafting grid (-0.018) and the slab (-0.030), with renderOrder -2 so
     it draws over the grid. It stays UNDER act 2's leveller plate (+0.004).

     THE VARIATION IS AN ALPHA MAP, not per-segment materials — see
     lineAlphaMap(). The second line takes the same geometry with
     rotation.z = PI, which spins the plane 180 degrees IN ITS OWN PLANE before
     the -PI/2 x rotation lays it flat: that mirrors the wear pattern along x
     so the two lines are not the same 28 metres of paint twice, and it leaves
     the normal pointing +Y. (Rotating about Y instead would flip the normal
     face-down under three's XYZ Euler order — checked, not assumed.) */
  const LINE_HW = 0.85;
  const lineGeo = new THREE.PlaneGeometry(28, 0.06);
  for (const sz of [-1, 1]) {
    const yl = envMesh(lineGeo, m.lineY, sz === -1);
    yl.rotation.set(-Math.PI / 2, 0, sz === -1 ? Math.PI : 0);
    yl.position.set(0, GROUND_Y - 0.006, sz * LINE_HW);
    yl.renderOrder = -2;
    envShared.add(yl);
  }

  /* ---- THE ROOF: JOISTS AND SKYLIGHTS, ONE BUILDER, TWO ACTS -------------

     THE SPACE HAD NO LID. Acts 1 and 2 were open to black above the racking,
     which is why the review read them as a void with objects in it rather than
     as a shed — a warehouse is an ENCLOSURE, and the top of frame is where
     that gets said.

     A BUILDER CALLED PER ACT, NOT A SHARED GROUP. Act 3 must NOT get this: it
     has its own low ceiling slab, which is that act's identifying spatial
     feature, and joists under a 2.90 lid would be a different room's roof
     inside this one. A shared group would have to be visibility-gated against
     exactly one act, which is the arrangement that gets forgotten; two calls
     cannot be.

     WHERE THE JOISTS ACTUALLY READ, AND THIS IS WHY THE ROOF CAME DOWN. At
     act 1's pose the camera sits at y = ty + d*sin(elev) = 1.50 + 7.50*
     sin(6deg) = 2.284, and the top-of-frame ray leaves at the view pitch plus
     the half fov = -6 + 15 = +9 degrees, tan = 0.158384. So the top of frame
     reaches a roof at height Y at a horizontal range of (Y - 2.284)/0.158384
     from the lens, which sits at z ~ 7.46:

       ROOF_Y 4.80 -> 15.89 out -> visible only for z < -8.43
       ROOF_Y 3.90 -> 10.20 out -> visible for z < -2.74

     AT 4.80 THE ROOF WAS NOT IN THE PICTURE. Confirmed on the production
     build: the top band of frame was pure black and the shed did not exist —
     the joists only cleared the frame edge against the back wall at -9.5,
     where the fog had already taken 55% of them. A roof you cannot see is not
     an enclosure.

     3.90 PUTS THE THRESHOLD AT z = -2.74, so the joists at -4.8, -7.2, -9.6
     and -12.0 all cross the back half of frame, receding into the fog exactly
     as intended, and the near ones stay out of shot where they would otherwise
     cut across the walker. It sits 0.50 over the 3.40 racking, which is a
     tight but real clear height for a shed with 3.4m racking in it.

     ACT 2 STILL PROBABLY DOES NOT SEE ITS ROOF, and that is fine. Its camera
     is at y = 1.55 + 6.9*sin(7deg) = 2.391 with an 8 degree top ray, so 3.90
     is reached at (3.90 - 2.391)/0.140541 = 10.74 out, z = -3.91 — which is
     behind its own dock wall at z = -2.6. Act 2 is a shallow space against a
     wall and is lit by its pendant; the roof is built there for consistency of
     the building, not because it is expected on screen.

     THE SKYLIGHTS ARE THE ACT'S LIGHT STORY, and act 1's PointLight below is
     the light they motivate. Two long strips between joists, unlit and faint,
     and NOTHING PULSES. Their height is DERIVED from the joists (see addRoof)
     so lowering the roof carried them down without a second edit. */
  const ROOF_Y = 3.9;
  const ROOF_PITCH = 2.4;
  const ROOF_N = 7;                                  // z = 0 back to -14.4
  const ROOF_SPAN = 26;                              // joist length in x
  /* A shallow inverted U: a web plate on edge with a bottom flange under it.
     Two boxes per joist is the whole profile — at this range and this haze the
     flange is what catches any light at all, and the web is the dark line. */
  const joistWebGeo = new THREE.BoxGeometry(ROOF_SPAN, 0.26, 0.06);
  const joistFlangeGeo = new THREE.BoxGeometry(ROOF_SPAN, 0.05, 0.20);
  /** Skylight z positions — between joists, i.e. off the ROOF_PITCH grid by
      half a pitch, and MOVED FORWARD WITH THE ROOF. They were at -8.4 and
      -10.8, which was the only band in frame when ROOF_Y was 4.80; at 3.90 the
      visible band opens up to everything past z = -2.74, and a skylight left
      at -10.8 would sit 18.3 units out under 61% fog — technically in shot and
      practically not there.

      -3.6 and -6.0 are the two mid-bay positions (between joists at -2.4/-4.8
      and -4.8/-7.2) that clear the -2.74 threshold. -3.6 also sits 1.8 behind
      act 1's daylight PointLight at z = -1.8, which is what makes the light
      motivated rather than arbitrary: the bright thing in the roof is directly
      over the bright patch of floor. */
  const SKY_Z: readonly number[] = [-3.6, -6.0];
  const SKY_W = 22, SKY_D = 1.1;
  const skyGeo = new THREE.PlaneGeometry(SKY_W, SKY_D);
  let roofOwned = false;
  const addRoof = (parent: THREE.Group) => {
    const own = !roofOwned;
    roofOwned = true;
    for (let i = 0; i < ROOF_N; i++) {
      const z = -i * ROOF_PITCH;
      const web = envMesh(joistWebGeo, m.dark, own && i === 0);
      web.position.set(0, GROUND_Y + ROOF_Y, z);
      parent.add(web);
      const flange = envMesh(joistFlangeGeo, m.dark, own && i === 0);
      flange.position.set(0, GROUND_Y + ROOF_Y - 0.155, z);
      parent.add(flange);
    }
    /* THE STRIP HEIGHT IS DERIVED FROM THE JOIST, NOT TYPED. The joist's web
       is 0.26 tall centred on ROOF_Y and its bottom flange is 0.05 tall
       centred 0.155 under that, so the flange's underside is

         ROOF_Y - 0.155 - 0.025 = ROOF_Y - 0.18

       and the strips hang 0.10 below that at ROOF_Y - 0.28. At the new
       ROOF_Y = 3.90 that is y = 3.62 (it was 4.52 at 4.80) — one constant
       moved and the roof came down as one assembly, which is the whole reason
       this is an expression.

       Facing DOWN, into the room, so a joist crossing in front of one occludes
       it — which is what makes them read as openings in a roof rather than as
       two glowing rectangles floating in the dark. */
    for (const sz of SKY_Z) {
      const sk = envMesh(skyGeo, m.sky, own && sz === SKY_Z[0]);
      sk.rotation.x = Math.PI / 2;                   // face DOWN, into the room
      sk.position.set(0, GROUND_Y + ROOF_Y - 0.28, sz);
      parent.add(sk);
    }
  };

  /* ================= ACT 1 — RACKING AISLE ================= */
  const paintGeo = new THREE.PlaneGeometry(28, 0.09);
  for (const sz of [-1, 1]) {
    const line = envMesh(paintGeo, m.paint, sz === -1);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, GROUND_Y - 0.008, sz * AISLE_HW);
    line.renderOrder = -2;
    env1.add(line);
  }

  /* ---- THE UPRIGHTS ARE LATTICE FRAMES, NOT POSTS -------------------------

     This is the change that makes racking read as racking. A pallet rack
     upright is a pair of slender columns held apart by a zig-zag of diagonal
     bracing, and that lattice is the single most identifiable thing in a
     warehouse — more than the beams, more than the pallets. A solid 0.10-wide
     box has none of it, which is why the previous version read as a row of
     dark strips and the whole scene read as blobs.

     Two columns 0.44 apart in Z (front and back of the frame), plus six
     diagonals alternating direction up the height. The diagonals are thin
     boxes rotated about X, so each one spans one bay of the ladder; the
     alternation is what makes the zig-zag rather than a set of parallel
     slashes.

     ONE GEOMETRY PER PART, REUSED. Eight frames x (2 columns + 6 braces) is
     128 meshes off two BufferGeometries, which is the same trade cargo makes
     for its slats — geometry is the expensive thing, a Mesh is a matrix. */
  const colGeo = new THREE.BoxGeometry(0.075, RACK_H, 0.075);
  const BRACE_N = 6;
  const braceH = RACK_H / BRACE_N;
  const braceLen = Math.hypot(braceH, RACK_D * 0.80);
  const braceGeo = new THREE.BoxGeometry(0.045, braceLen, 0.045);
  const braceTilt = Math.atan2(RACK_D * 0.80, braceH);

  const xs = RACK_K.map((k) => RACK_BASE + RACK_PITCH * k);

  /** one lattice upright frame, centred on (x, z) */
  const addFrame = (parent: THREE.Group, x: number, z: number, own: boolean) => {
    for (const sz of [-1, 1]) {
      const c = envMesh(colGeo, m.rackBlue, own && sz === -1);
      c.position.set(x, GROUND_Y + RACK_H / 2, z + sz * RACK_D * 0.40);
      parent.add(c);
    }
    for (let i = 0; i < BRACE_N; i++) {
      const b = envMesh(braceGeo, m.rackBlue, own && i === 0);
      b.position.set(x, GROUND_Y + braceH * (i + 0.5), z);
      b.rotation.x = i % 2 === 0 ? braceTilt : -braceTilt;
      parent.add(b);
    }
  };
  xs.forEach((x, i) => addFrame(env1, x, RACK_Z, i === 0));

  /* The beams get a FRONT LIP — a shallow box proud of the beam's face. Real
     rack beams are a closed section with a step at the top edge that the
     pallet's runners sit behind, and at this scale that step is the only
     thing separating a beam from a painted stripe. */
  const beamGeo = new THREE.BoxGeometry(RACK_PITCH * (RACK_K.length - 1) + 0.10, 0.09, 0.09);
  const lipGeo = new THREE.BoxGeometry(RACK_PITCH * (RACK_K.length - 1) + 0.10, 0.035, 0.05);
  const beamCx = (xs[0] + xs[xs.length - 1]) / 2;
  /* BLUE UPRIGHTS, ORANGE BEAMS — the two horizontals per level and their
     lips are the warm half of the racking, and between them they are the
     largest saturated thing in act 1. This is the container's job in cargo
     vision, done with the object the scene already has. */
  BEAM_Y.forEach((by, i) => {
    for (const sz of [-1, 1]) {
      const b = envMesh(beamGeo, m.rackBeam, i === 0 && sz === -1);
      b.position.set(beamCx, GROUND_Y + by, RACK_Z + sz * RACK_D * 0.40);
      env1.add(b);
    }
    const lip = envMesh(lipGeo, m.rackBeam, i === 0);
    lip.position.set(beamCx, GROUND_Y + by + 0.062, RACK_Z - RACK_D * 0.40 - 0.02);
    env1.add(lip);
  });

  /* ---- THE LOADS ARE PALLETS OF CARTONS, WITH VARIATION -------------------

     One 1.45 x 0.85 box per bay is the definition of blobby: every bay
     identical, every load a featureless slab. What actually sits in a rack is
     a wooden pallet carrying a stack of boxes, and no two stacks are the same
     height or the same neatness.

     So each occupied bay gets a pallet deck plus two or three cartons in the
     `board` material — the same cached cardboard skin Cargo Vision skins its
     cases with, so the two scenes' goods are visibly the same STUFF. Sizes,
     the carton count and a small yaw all come from `hash(bay, level)`, which
     is deterministic: `Math.random()` is banned here for the reason the file
     header gives — a scene that reshuffles itself cannot be reviewed. */
  const OCCUPIED: readonly boolean[] = [true, true, false, true, true, false, true];
  const palletGeo = new THREE.BoxGeometry(1.40, 0.13, RACK_D * 0.92);
  const cartonGeos = [
    new THREE.BoxGeometry(0.62, 0.52, 0.46),
    new THREE.BoxGeometry(0.50, 0.62, 0.44),
    new THREE.BoxGeometry(0.72, 0.44, 0.48),
  ];
  let firstPallet = true;
  BEAM_Y.forEach((by, level) => {
    for (let bay = 0; bay < xs.length - 1; bay++) {
      if (!OCCUPIED[(bay + level * 3) % OCCUPIED.length]) continue;
      const cx = (xs[bay] + xs[bay + 1]) / 2;
      const seed = bay * 7 + level * 31;

      /* THE SKID IS BOARD, NOT RACK STEEL — and this is the "washed-out grey
         carton on the mid shelf" from review.

         There is no per-carton tint in this scene to have gone wrong: every
         carton in all three acts shares ONE `m.board` instance with one
         untinted `cardboardSide()` map, so no seed can push one of them out
         of the kraft range. The pale blue-grey object sitting among the
         cartons is the PALLET UNDER THEM, which was drawn in `m.rack`
         (#26303F) — the deliberately-blue painted-steel colour that exists to
         separate rack STRUCTURE from the floor. On a shelf, at carton scale,
         beside actual kraft board, that blue reads as a carton that has lost
         its colour.

         A pallet is wood. `m.board` is the closest thing this palette has and
         is what the cartons already stand on top of, so the skid now reads as
         the deck of the load rather than as a member of the rack. Applied to
         every skid in the file — shelf, near-floor, far run and act 2's dock
         apron — because they are all the same object and half-fixing it would
         just move the complaint. */
      const pal = envMesh(palletGeo, m.board, firstPallet);
      firstPallet = false;
      pal.position.set(cx, GROUND_Y + by + 0.10, RACK_Z);
      env1.add(pal);

      const n = 2 + (seed % 2);            // two or three cartons
      for (let c = 0; c < n; c++) {
        const gi = (seed + c * 3) % cartonGeos.length;
        const g = cartonGeos[gi];
        // own the geometry once, on its first use anywhere
        const box = envMesh(g, m.board, level === 0 && bay === 0 && c < 3);
        const w = (g.parameters as { width: number }).width;
        const h = (g.parameters as { height: number }).height;
        box.position.set(
          cx - 0.42 + c * (w * 0.86),
          GROUND_Y + by + 0.165 + h / 2,
          RACK_Z + ((seed + c) % 3 - 1) * 0.045,
        );
        box.rotation.y = (((seed + c * 5) % 7) - 3) * 0.018;
        env1.add(box);
      }
    }
  });

  /* Floor-level stock along the near side of the aisle — same treatment, so
     the foreground is pallets of goods rather than the grey slabs it was.

     MOVED FORWARD (z 2.08 -> 2.86) AND CUT TO ONE LAYER. At 2.08 with a full
     two-or-three carton stack it had grown tall enough to cross the walker's
     shins and swallow the bottom-left corner of his detection bracket —
     foreground that occludes the subject is not depth, it is a wall. Further
     forward it drops lower in frame (it is nearer the lens, so it falls away
     below the walk line) and a single layer keeps its top under his knees.
     It still does the framing job; it just stops eating the subject. */
  for (let k = -2; k <= 1; k++) {
    const cx = RACK_PITCH * k - 0.60;
    const seed = 13 + k * 11;
    const pal = envMesh(palletGeo, m.board, false);
    pal.position.set(cx, GROUND_Y + 0.065, NEAR_Z);
    env1.add(pal);
    /* POSITIVE MODULO. `seed` is 13 + k*11 and k runs from -2, so seed goes
       negative — and JavaScript's % keeps the sign of the DIVIDEND, so a bare
       `seed % n` returns a negative index and the lookup is undefined. This
       threw at build time and blacked the whole scene out. */
    const g = cartonGeos[((seed + 1) % cartonGeos.length + cartonGeos.length) % cartonGeos.length];
    const h = (g.parameters as { height: number }).height;
    const box = envMesh(g, m.board, false);
    box.position.set(cx, GROUND_Y + 0.13 + h / 2, NEAR_Z);
    box.rotation.y = (((seed % 5) + 5) % 5 - 2) * 0.022;
    env1.add(box);
  }

  /* ---- A PALLET TRUCK, PARKED AGAINST THE RACKING -----------------------

     An aisle with racking, goods and a lamp in it is still an aisle nobody
     works in. One piece of parked handling equipment is the cheapest thing
     that says otherwise, and a hand pallet truck is the right one: it is the
     most common object in any warehouse and its silhouette is unmistakable —
     two long forks near the floor, a squat power head at one end, and a tiller
     arm raked back off the top of it.

     SIX PARTS, and the whole thing is silhouette work: no shadow (envMesh, per
     the house rule that the shadow budget belongs to the walker) and all of it
     in `m.dark`, which is this scene's machinery value — machinery is the
     darkest thing in frame.

     SITED BEHIND THE WALK LINE. Parked against the near rack run at
     z = RACK_Z + 0.95 = -2.65, so it is 2.65 clear of the walker's z = 0 line
     and can never occlude the detection bracket — the failure act 1's near
     goods had to be moved forward to fix. x = 3.20 is right of the lamp
     (x 1.15) and well right of the camera arm (x -1.62), so it does not stack
     into either silhouette, and it sits in the bay between the uprights at
     x = 2.25 and x = 4.15.

     ORIENTED ALONG X, NOT Z. At this camera's 6-degree elevation a fork
     pointing at the lens foreshortens to a dot; along X both forks read their
     full 1.05 length. */
  const PT_X = 3.20;
  const PT_Z = RACK_Z + 0.95;                    // -2.65
  const FORK_L = 1.05;
  const FORK_DZ = 0.14;                          // fork gauge, each side of PT_Z
  /* forks: 0.05 thick, so they span y 0.020..0.070 — off the floor, as a
     lowered fork actually is, and their top face is where the body's bottom
     face starts (0.070). */
  const forkGeo = new THREE.BoxGeometry(FORK_L, 0.05, 0.16);
  for (const sz of [-FORK_DZ, FORK_DZ]) {
    const fork = envMesh(forkGeo, m.dark, sz < 0);
    fork.position.set(PT_X + 0.105, GROUND_Y + 0.045, PT_Z + sz);
    env1.add(fork);
  }
  /* the power head, at the -x end of the forks (which span PT_X-0.42 ..
     PT_X+0.63, so its face butts the fork root at PT_X-0.42). 0.30 tall,
     centred at 0.22 -> y 0.070..0.370, meeting the forks exactly. */
  const PT_BODY_X = PT_X - 0.59;
  const ptBody = envMesh(new THREE.BoxGeometry(0.34, 0.30, 0.42), m.dark);
  ptBody.position.set(PT_BODY_X, GROUND_Y + 0.22, PT_Z);
  env1.add(ptBody);
  /* THE TILLER IS THE IDENTIFYING PART. A 0.62 bar raked 35 degrees back off
     the top of the head. Its base is (PT_BODY_X, 0.370); rotating a Y-axis
     cylinder by +35 deg about Z sends its top toward -x, so the centre is
     offset by (-0.31*sin35, +0.31*cos35) = (-0.177809, +0.253937):
       centre = (PT_BODY_X - 0.177809, 0.623937)
     and the grip ends up at (PT_BODY_X - 0.355618, 0.877874) — about hand
     height, which is the check that the rake is right rather than decorative. */
  const PT_RAKE = (35 * Math.PI) / 180;
  const tiller = envMesh(new THREE.CylinderGeometry(0.028, 0.028, 0.62, 8), m.dark);
  tiller.position.set(
    PT_BODY_X - 0.31 * Math.sin(PT_RAKE),
    GROUND_Y + 0.370 + 0.31 * Math.cos(PT_RAKE),
    PT_Z,
  );
  tiller.rotation.z = PT_RAKE;
  env1.add(tiller);
  /* the two load wheels, at the fork tips. A Cylinder is built about its own
     Y, so rotation.x = PI/2 lays the axle along Z — the axis a wheel rolling
     along X turns about. r 0.045 centred at 0.045 puts them on the floor. */
  const ptWheelGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.06, 10);
  for (const sz of [-FORK_DZ, FORK_DZ]) {
    const wheel = envMesh(ptWheelGeo, m.dark, sz < 0);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(PT_X + 0.58, GROUND_Y + 0.045, PT_Z + sz);
    env1.add(wheel);
  }

  /* ---- A FLOOR STACK OF TWO CARTONS, AT THE AISLE'S FAR END --------------
     Act 1 runs left to right, so the far end is -x: this sits at the end of
     the aisle the walker has already left, which is where a stack waiting to
     be put away would be and which he never stands in front of during his read
     window (WALK_WIN opens at act phase 0.17, x = -3.42).

     BEHIND THE WALK LINE, AT z = -1.30, NOT IN FRONT OF IT. A first pass put
     this at z = +1.55 and that was wrong for the reason act 1's near goods run
     already had to be moved and thinned: a 1.14-tall stack between the lens and
     the walk line is not depth, it is a wall, and the thing it eats is the
     bottom corner of the detection bracket. Behind the line it cannot occlude
     the subject at any phase. It also clears the bracket keep-out (|x| <= 1.2,
     |z| <= 0.5) by 3.65 in x and 0.80 in z, and it is 2.30 clear of the near
     rack run at RACK_Z = -3.60.

     Reuses `cardboardSide()` through `m.board` and act 1's own `cartonGeos`,
     both already owned by their first use — so every mesh here is own = false.
     NEVER DISPOSED: the kraft texture is module-cached and shared with
     cargo-vision. */
  {
    const sx = -4.85, sz = -1.30;
    const g0 = cartonGeos[0], g1 = cartonGeos[1];
    const h0 = (g0.parameters as { height: number }).height;   // 0.52
    const h1 = (g1.parameters as { height: number }).height;   // 0.62
    const b0 = envMesh(g0, m.board, false);
    b0.position.set(sx, GROUND_Y + h0 / 2, sz);
    b0.rotation.y = 0.036;
    env1.add(b0);
    const b1 = envMesh(g1, m.board, false);
    b1.position.set(sx + 0.04, GROUND_Y + h0 + h1 / 2, sz - 0.03);
    b1.rotation.y = -0.054;
    env1.add(b1);
  }

  /* ---- A SECOND RUN, BEHIND THE FIRST — this is what makes it an aisle ----

     One rack run against nothing is a wall with shelves on it, which is what
     act 1 read as ("the environment is all blobs"). A warehouse aisle is
     legible because racking RECEDES: you see the near run, a gap, then
     another run behind it, and the repetition at diminishing scale is the
     entire depth cue. Nothing else added here would buy as much.

     4.0m behind the first run, which is a real cross-aisle width, and offset
     half a bay in x (RACK_PITCH / 2) so the two runs' uprights do not line up
     into a single picket fence — staggered, they read as two separate
     structures rather than one thick one.

     Deliberately SPARSER than the near run: three-quarter occupancy on one
     beam level instead of full on two. The far run is scenery and must not
     compete with the walker for contrast; a fully-loaded second run would put
     as much mass behind him as in front. */
  const FAR_Z = RACK_Z - 4.0;
  const farXs = RACK_K.map((k) => RACK_BASE + RACK_PITCH * k + RACK_PITCH / 2);
  // same lattice frames as the near run — reusing addFrame means the two runs
  // can never drift into being different KINDS of racking
  farXs.forEach((x) => addFrame(env1, x, FAR_Z, false));
  const farBeam = envMesh(beamGeo, m.rackBeam, false);
  farBeam.position.set(beamCx + RACK_PITCH / 2, GROUND_Y + BEAM_Y[0], FAR_Z);
  env1.add(farBeam);

  const FAR_OCCUPIED: readonly boolean[] = [true, false, true, true, false, true, true];
  for (let bay = 0; bay < farXs.length - 1; bay++) {
    if (!FAR_OCCUPIED[bay % FAR_OCCUPIED.length]) continue;
    const cx = (farXs[bay] + farXs[bay + 1]) / 2;
    const pal = envMesh(palletGeo, m.board, false);
    pal.position.set(cx, GROUND_Y + BEAM_Y[0] + 0.10, FAR_Z);
    env1.add(pal);
    // one carton per far bay, not two or three: the far run is scenery
    const g = cartonGeos[(bay * 5) % cartonGeos.length];
    const h = (g.parameters as { height: number }).height;
    const box = envMesh(g, m.board, false);
    box.position.set(cx, GROUND_Y + BEAM_Y[0] + 0.165 + h / 2, FAR_Z);
    env1.add(box);
  }

  /* ---- THE HIGH-BAY PENDANT, OVER THE AISLE ------------------------------

     The same lamp Cargo Vision hangs over its conveyor, from the same shared
     builder (`_vision/lamp.ts`) rather than a second implementation — so the
     two scenes' practical lights are literally the same object, which is what
     "a family of animations" has to mean at the code level and not just the
     art level.

     It answers the same question here that it answers there: the aisle floor
     is the brightest surface in frame and nothing in shot said why. A shop
     light on a drop states the cause with an object you can see.

     SITED OVER THE WALK LINE (z = 0), not over the racking. The subject is
     the person; the light that motivates the frame should be the light he
     walks under. x = 1.15 puts it right of the pole camera at x = -0.6 so
     the two pieces of ceiling equipment do not stack into one silhouette,
     and still inside the stretch of aisle the walker crosses at mid-act.

     HEIGHT 2.55. The walker's crown is at 1.815 and the hat clears at the top
     of the gait bob, so 2.55 leaves ~0.7 of headroom — he passes UNDER it,
     which is the whole point, and the shade never collides with the tracking
     bracket that rides above his head.

     beamR 1.05 rather than the 0.85 default: this drop is 2.55 to the floor
     against cargo's 1.49 to the belt, and a beam that keeps the default
     radius over a longer throw reads as a narrow column rather than a cone. */
  /* ---- ACT 1's PENDANT IS REMOVED ----------------------------------------

     THE HIGH BAY IS GONE FROM ACT 1, AND NOTHING REPLACES IT AS AN OBJECT.
     What was here was a `buildPendantLamp` at (1.15, 2.55, 0) with beamR 1.05,
     its four materials and its PointLight driven by name in scene.tsx and its
     geometry pushed into `owned`. All of that is deleted: the builder call,
     the env1 group add, the owned push, the `lamp` field on WorkModel, the
     `lamp.dispose()` in this file's dispose, and the five-line intensity gate
     in scene.tsx's applyFrame.

     WHY. Act 1 now has a ROOF with skylight strips in it, and that is a better
     answer to "why is this floor lit" than a single practical was: a warehouse
     aisle at 4.8m of clear height is daylit and high-bay lit from a plane, not
     from one fitting hanging at 2.55 over the walk line. The pendant was also
     the one object in act 1 competing with the walker for the eye at head
     height, and it sat between the lens and the racking the colour anchor is
     now carrying.

     ACTS 2 AND 3 KEEP THEIRS. Act 2's dock is a shallow space against a wall
     and act 3 is a low room with a 2.90 ceiling — in both, a hung fitting is
     the honest fixture, and in act 3 the two task pendants ARE the light. Only
     act 1 had the height to be lit from its roof instead.

     The exposure stays where it is. The studio's 0.86 was set BECAUSE of this
     lamp ("with a practical throwing 6+ at the aisle floor ON TOP of the
     five-source rig, the scene was over-lit") and removing the lamp takes ~4.0
     of illuminance off act 1's floor, so act 1 will sit darker than before.
     That is the direction this pass wants — the skylights and the racking's
     own colour are what should carry it — but exposure is a judgement call
     across all three acts and is not being changed blind. Flagged for review,
     not adjusted. */

  /* ---- THE BACK WALL, AND WHY IT IS BACK ---------------------------------

     A WALL WAS TRIED HERE ONCE AND REMOVED, and that note was right about its
     own version: a 34 x 5.2 panel at z = -10.8 measured with `?debug=1`
     projected to the entire frame, at one flat value, erasing the depth the
     second rack run had just bought. The finding was that a receding structure
     only reads as receding if there is darkness behind it to recede INTO.

     What that pass concluded — that the fog IS the end of the aisle — turns
     out to be half the answer. Fog closes a space in DEPTH but it does not
     ENCLOSE one: with nothing above and nothing behind, act 1 read as objects
     in a void, which is most of what "bleak" meant on review. A shed has a
     back to it.

     THE FIX IS VALUE AND SITING, NOT ABSENCE. Three things are different from
     the version that failed:

       1. IT IS AT z = -9.5, not -10.8 — beyond the far rack run at -7.6 and
          right at the fog's working knee. The camera sits at z ~ 7.46, so the
          wall is 16.96 out and the 6..26 fog is (16.96-6)/20 = 55% of the way
          to the backdrop before anything else happens.
       2. IT CARRIES THE DOCK WALL'S PANEL-SEAM MAP, so it is not one flat
          value — the failure mode the first attempt actually had. Vertical
          ribs at the 1.1m pitch, which at 17 units is the corrugated read the
          brief asks for, for the cost of one cached texture variant.
       3. IT IS NEAR-BLACK. `dockWallFace` is the material whose whole note is
          that it was taken a stop under `dock` and its map a further stop
          under that, landing at #101318 — against the fog's own #0A0B0E. The
          instruction was "if in doubt, darker", and this is the darkest large
          surface the file has short of the ceiling.

     THE RECT. x -17..17 (w 34), y 0..5.2, so it stands 0.4 over the roof
     joists at 4.8 and closes the corner between roof and floor. Its texture
     variant is cached on that rect like every other wall face. */
  const backWall = envMesh(new THREE.BoxGeometry(34, 5.2, 0.24),
    m.dockWallFace(-17, 34, GROUND_Y, 5.2));
  backWall.position.set(0, GROUND_Y + 2.6, -9.5);
  env1.add(backWall);

  /* THE ROOF OVER ACT 1 — joists and skylight strips. See addRoof's own note
     for the visibility arithmetic (at ROOF_Y = 3.90 the joists enter frame
     past z = -2.74, so the back half of the shot is roofed) and for why act 3
     does not get a call. */
  addRoof(env1);

  /* ---- ACT 1's DAYLIGHT, THROUGH THE ROOF -------------------------------

     THE SKYLIGHT STRIPS ARE THE FIXTURE. Removing the pendant cost act 1 the
     ~4.0 of floor illuminance its note predicted, and on screen the prediction
     held: the cone still carried the walker (which is the better story — the
     camera's attention IS the light on him) but the foreground slab and the
     register plate sank to near-black. Exposure is shared across all three
     acts and stays where it is; act 1 gets its own light back instead.

     NO FIXTURE GEOMETRY, DELIBERATELY. Acts 2 and 3 hang a visible pendant
     because a dock and a low pack room are lit by fittings. A 3.9m-clear aisle
     with roof lights in it is lit by the ROOF, and the object that says so is
     already built and already in shot: the two skylight strips, one of which
     (z = -3.6) sits 1.8 behind this light. An extra lamp body here would be a
     second, contradictory answer to "why is this floor bright".

     A POINTLIGHT, NOT A RectAreaLight. RectAreaLight is studio machinery — it
     needs its LTC uniform tables initialised, it is ignored by the shadow
     path, and it would be the only light in three acts not built the way the
     other three practicals are. This is a plain PointLight sited high over the
     aisle, gated by name in scene.tsx exactly as acts 2 and 3's lamps are.

     THE INTENSITY, DERIVED. three.js PointLight at the default decay = 2 falls
     off as I/d^2 and, when `distance` is set, is windowed by

       w(d) = clamp(1 - (d/D)^4, 0, 1)^2

     The light is at y = 3.60 over a floor at GROUND_Y = 0, so the throw to the
     slab directly under it is d = 3.60 and d^2 = 12.96.

     D = 8.0, SO IT DIES BEFORE THE BACK WALL. The wall stands at z = -9.5 and
     the light is at z = -1.80, y = 3.60, so the wall's base is
     sqrt(7.70^2 + 3.60^2) = sqrt(59.29 + 12.96) = sqrt(72.25) = 8.50 away —
     past D, where the window is exactly 0. The wall is lit by nothing but the
     studio rig and the fog, which is what keeps it the dark thing act 1
     recedes INTO rather than a backdrop this light paints.

     Then the window at the floor is

       w(3.60) = (1 - (3.60/8.00)^4)^2 = (1 - 0.45^4)^2
               = (1 - 0.04100625)^2 = 0.95899375^2 = 0.91967

     and solving I / 12.96 * 0.91967 = 3.0 for the target illuminance:

       I = 3.0 * 12.96 / 0.91967 = 38.88 / 0.91967 = 42.28

     so 42.3. (The naive I = 3.0 * d^2 = 38.9 ignores the window and would
     land at 2.76, 8% light — the windowing is not a rounding error once D is
     only 2.2x the throw.) That 3.0 sits deliberately UNDER the pendant's old
     4.0 and well under the studio key box's 5.6: it is filling the frame back
     up, not restoring a practical that has been removed.

     #C9D6E8 — COOL, because it is daylight and every other practical in this
     scene is warm. It is also the skylight strips' own #B8CCE4 family, a touch
     lighter, so the light and the thing motivating it agree.

     NO SHADOW. `castShadow` stays false (the default): the house rule is that
     the shadow-map budget belongs to the walker, and the studio rig already
     casts his.

     ITS INTENSITY IS GATED BY NAME IN scene.tsx ON act === 0, and that gate is
     load-bearing for the same reason it is for the other three: env1.visible =
     false does NOT switch a light off in three.js. Ungated, act 1's daylight
     would be pouring through the dock's roof and the pack room's ceiling. */
  const DAY_Y = 3.6;
  const DAY_Z = -1.8;
  const dayLight = new THREE.PointLight("#C9D6E8", 0, 8.0, 2);
  dayLight.position.set(0, GROUND_Y + DAY_Y, DAY_Z);
  env1.add(dayLight);

  /* ================= ACT 2 — INBOUND DOCK =================

     WALL_Z sits closer than act 1's RACK_Z: a dock is a shallower space than
     a racking aisle, and the difference in depth is itself part of "this is a
     different place" — not just a different colour of the same backdrop.

     NO SECOND BACK WALL, for exactly the reason act 1 records above: the fog
     (6..26) already closes the space, and a slab behind the slab would erase
     the one depth cue the shorter throw is buying. The dock wall being closer
     IS act 2's identity. */
  const WALL_Z = -2.6;
  /* WALL_W is at MODULE scope now — the panel-seam texture derives its per-face
     UV offset from the wall's own left edge, -WALL_W/2, and that derivation
     lives in the texture layer at the top of this file. */
  const WALL_H = 3.2;
  const WALL_T = 0.20;
  /** The wall's FRONT face — the side the walker and the render camera are on.
      Every piece of dock dressing that sits ON the wall is measured off this,
      not off WALL_Z, so nothing has to re-derive the half-thickness. */
  const WALL_FZ = WALL_Z + WALL_T / 2;          // -2.50

  /* ---- THE DOOR BAY -------------------------------------------------------

     A dock reads as a dock because of the roller shutter: horizontal slats in
     a pair of guide rails with a heavy lip bar across the bottom. That
     silhouette is THE identifying feature — the same lesson act 1 learned
     from its lattice uprights. Everything else here (leveller, trailer,
     bollards) supports it.

     THE WALL IS THREE SEGMENTS, NOT ONE SLAB. There is no CSG here, so a hole
     in a wall has to be built as the absence of geometry: left jamb wall,
     right jamb wall, and a lintel over the opening. That is what lets the
     trailer behind the wall actually be SEEN through the doorway rather than
     being a box hidden behind a slab.

     ONE CONSTANT MOVES THE WHOLE ASSEMBLY. Jambs, curtain, slats, lip,
     leveller, trailer and both bollards are all derived from SHUT_X /
     DOOR_W / DOOR_H below, so re-siting the dock is one number, not eleven.

     Widths, from WALL_W = 13.0 centred on x = 0 (so the wall spans -6.5..6.5)
     and DOOR_W = 4.2 centred on SHUT_X = -1.5 (so the opening spans
     -3.60..0.60):
       left  segment  -6.50 .. -3.60   width 2.90, centre x = -5.05
       right segment   0.60 ..  6.50   width 5.90, centre x =  3.55
       check          2.90 + 4.20 + 5.90 = 13.00  = WALL_W
     Lintel: WALL_H - DOOR_H = 3.20 - 2.60 = 0.60 tall, centre y = 2.90.

     -1.5, IN FROM -2.2, so the whole bay clears the frame edge with margin
     rather than grazing it. A door partly at the frame edge reads as a real
     building continuing off-shot; a door half-amputated reads as a mistake,
     and the bollard outboard of the left jamb is the piece that goes first.

     THE DOOR IS ON THE WALKER'S HEADING AND HE NEVER OVERSHOOTS IT. Act 2
     runs WALK_TO -> WALK_FROM, so x = 5.2 - 10.4q. He is in front of the bay
     (x 0.60 .. -3.60) for q = 0.442 .. 0.846, and WALK_WIN closes his read at
     q = 0.83, x = -3.432 — still 0.17 short of the left jamb. He walks toward
     the door for the whole time he is being read and the bracket drops before
     he could reach the far side of it. He also never approaches the wall in
     Z: the walk line is z = 0 and the wall face is z = -2.50, so "walking
     into the wall" is not a thing this layout can express. */
  const SHUT_X = -1.5;
  const DOOR_W = 4.2;
  const DOOR_H = 2.6;
  const DOOR_L = SHUT_X - DOOR_W / 2;            // -4.30, opening's left edge
  const DOOR_R = SHUT_X + DOOR_W / 2;            // -0.10, opening's right edge

  const segL_W = DOOR_L - (-WALL_W / 2);         // 2.20
  const segR_W = WALL_W / 2 - DOOR_R;            // 6.60
  /* EVERY WALL FACE TAKES ITS OWN TEXTURED MATERIAL, keyed on its world rect
     (left x, width, bottom y, height) so the 1.1m panel seams and the scuff
     band run CONTINUOUSLY across the three segments and the curtain instead of
     restarting at each mesh — see wallMapFor()'s derivation at the top of this
     file for why a shared repeat cannot do that on BoxGeometry UVs. */
  const wallL = envMesh(new THREE.BoxGeometry(segL_W, WALL_H, WALL_T),
    m.dockWallFace(-WALL_W / 2, segL_W, GROUND_Y, WALL_H));
  wallL.position.set(-WALL_W / 2 + segL_W / 2, GROUND_Y + WALL_H / 2, WALL_Z);
  env2.add(wallL);
  const wallR = envMesh(new THREE.BoxGeometry(segR_W, WALL_H, WALL_T),
    m.dockWallFace(DOOR_R, segR_W, GROUND_Y, WALL_H));
  wallR.position.set(WALL_W / 2 - segR_W / 2, GROUND_Y + WALL_H / 2, WALL_Z);
  env2.add(wallR);
  const lintelH = WALL_H - DOOR_H;               // 0.60
  const lintel = envMesh(new THREE.BoxGeometry(DOOR_W, lintelH, WALL_T),
    m.dockWallFace(DOOR_L, DOOR_W, GROUND_Y + DOOR_H, lintelH));
  lintel.position.set(SHUT_X, GROUND_Y + DOOR_H + lintelH / 2, WALL_Z);
  env2.add(lintel);

  /* ---- THE TRAILER, BACKED ONTO THE BAY ----------------------------------

     Not a truck: the NOSE of one, seen through the doorway. Modelling a
     tractor unit would put a large, highly-identifiable object at the back of
     a frame whose subject is a man walking; a dark mass filling the opening
     says "there is a vehicle docked here" with one box, and the shutter frame
     does the rest of the describing.

     Depth 1.0 centred at z = -3.20 spans -3.70 .. -2.70, so its front face
     stops exactly at the wall's BACK face (WALL_Z - WALL_T/2 = -2.70) and it
     can never poke through the wall into the dock. Height 2.40 keeps its top
     under the opening's 2.60 head, so it is framed by the doorway rather than
     clipped by it.

     `m.goods` (#1F242C), not `m.dock` (#2E3540): the brief asked for "dock,
     darker" and there is no darker dock variant — `goods` IS that value, and
     adding a material to the shared palette for one box would put a new entry
     in every act's ramp and dispose list. Flagged rather than invented. */
  const trailer = envMesh(new THREE.BoxGeometry(3.4, 2.4, 1.0), m.goods);
  trailer.position.set(SHUT_X, GROUND_Y + 1.2, -3.2);
  env2.add(trailer);

  /* ---- THE GUIDE RAILS ---------------------------------------------------
     0.14 wide channels standing proud of the wall face down both sides of the
     opening, overlapping it by half their width so the curtain runs INSIDE
     them. Centre x = DOOR_L - 0.07 and DOOR_R + 0.07. */
  const RAIL_W = 0.14;
  const railGeo = new THREE.BoxGeometry(RAIL_W, DOOR_H, 0.10);
  for (const rx of [DOOR_L - RAIL_W / 2, DOOR_R + RAIL_W / 2]) {
    const rail = envMesh(railGeo, m.rack, rx < SHUT_X);
    rail.position.set(rx, GROUND_Y + DOOR_H / 2, WALL_FZ + 0.05);
    env2.add(rail);
  }

  /* ---- THE CURTAIN, PART-RAISED ------------------------------------------

     A shutter that is fully down is a blank panel and hides the trailer the
     previous block just built; a dock mid-unload has its door up. SHUT_DROP
     is how far the curtain hangs from the opening's head, so the curtain
     occupies y = DOOR_H - SHUT_DROP .. DOOR_H = 1.05 .. 2.60 and leaves a
     1.05 gap under it. That gap is what the trailer is seen through.

     Clear width between the rails is DOOR_W - RAIL_W = 4.06 (each rail eats
     half its width into the opening); 4.04 leaves a millimetre either side so
     the curtain never z-fights the channel it runs in. */
  const SHUT_DROP = 1.55;
  const CURTAIN_W = DOOR_W - RAIL_W - 0.02;      // 4.04
  const CURTAIN_Y0 = GROUND_Y + DOOR_H - SHUT_DROP;   // 1.05
  const CURTAIN_T = 0.05;
  const CURTAIN_Z = WALL_FZ + 0.045;             // -2.455, inside the rails
  const curtain = envMesh(new THREE.BoxGeometry(CURTAIN_W, SHUT_DROP, CURTAIN_T),
    m.dockWallFace(SHUT_X - CURTAIN_W / 2, CURTAIN_W, CURTAIN_Y0, SHUT_DROP));
  curtain.position.set(SHUT_X, CURTAIN_Y0 + SHUT_DROP / 2, CURTAIN_Z);
  env2.add(curtain);

  /* NINE SLATS. The ribs are the door. Pitch = SHUT_DROP / 9 = 0.172222, each
     slat centred at CURTAIN_Y0 + (i + 0.5) * pitch, so they run 1.1361 ..
     2.5139 and neither the top nor the bottom slat sits flush with an edge.
     Proud of the curtain face by half the rib depth: the curtain's front face
     is CURTAIN_Z + CURTAIN_T/2 = -2.430, so a 0.03-deep rib centred at
     -2.415 sits exactly on it. */
  const SLAT_N = 9;
  const slatPitch = SHUT_DROP / SLAT_N;
  const slatGeo = new THREE.BoxGeometry(CURTAIN_W, 0.035, 0.03);
  for (let i = 0; i < SLAT_N; i++) {
    const slat = envMesh(slatGeo, m.rack, i === 0);
    slat.position.set(SHUT_X, CURTAIN_Y0 + (i + 0.5) * slatPitch, CURTAIN_Z + CURTAIN_T / 2 + 0.015);
    env2.add(slat);
  }

  /* THE BOTTOM LIP BAR, and it is the single most identifying part. A roller
     shutter's bottom rail is a heavy extrusion — thicker than the slats,
     wider than the curtain, and standing further out. Wider (CURTAIN_W +
     0.06) and prouder (front face at CURTAIN_Z + CURTAIN_T/2 + 0.03) than the
     ribs, so it catches its own highlight and terminates the door instead of
     the curtain just stopping. Centred on the curtain's lower edge. */
  /* AND IT IS ORANGE. A dock door's bottom rail is the part vehicles and
     pallet trucks hit, so on a real dock it is the one painted-warning member
     on the whole door — `rackBeam`'s #A34A17 is exactly that paint, and it is
     the same material act 1's rack beams use, which ties the two acts together
     as one site's paint scheme rather than two colour schemes. */
  const lipBar = envMesh(new THREE.BoxGeometry(CURTAIN_W + 0.06, 0.10, 0.06), m.rackBeam);
  lipBar.position.set(SHUT_X, CURTAIN_Y0 + 0.05, CURTAIN_Z + CURTAIN_T / 2 + 0.03);
  env2.add(lipBar);

  /* ---- THE DOCK LEVELLER --------------------------------------------------
     A steel plate let into the apron in front of the door, 2.2 x 1.6, its far
     edge at the wall face — so centre z = WALL_FZ + 1.6/2 = -1.70 and it
     spans z -2.50 .. -0.90, x -2.60 .. -0.40 about SHUT_X. +0.004 above
     GROUND_Y is the same z-fight clearance
     act 1's paint stripes use (they sit at -0.008, the slab at -0.030 and the
     drafting grid at -0.018, so this is clear of all three). renderOrder -1
     puts it over the grid (-3) and the stripes (-2). */
  const LEVEL_W = 2.2, LEVEL_D = 1.6;
  const LEVEL_Z = WALL_FZ + LEVEL_D / 2;         // -1.70
  const leveller = envMesh(new THREE.PlaneGeometry(LEVEL_W, LEVEL_D), m.plate);
  leveller.rotation.x = -Math.PI / 2;
  leveller.position.set(SHUT_X, GROUND_Y + 0.004, LEVEL_Z);
  leveller.renderOrder = -1;
  env2.add(leveller);

  /* THE FRAME IS WHAT MAKES IT A PLATE. Reviewed, the leveller read as "a
     grey stain on the floor" — the same failure lamp.ts records for the
     pendant's own shadow: a soft patch at a slightly different value, with no
     boundary, is dirt. An OBJECT has an edge that catches light differently
     from both the thing it sits on and its own face.

     Four bars of 0.05 x 0.02 section standing proud around the perimeter, in
     `m.dark` (the scene's metal) against the plate's near-black. They sit at
     y = GROUND_Y + 0.014, so a 0.02-tall bar spans 0.004..0.024 — its
     underside exactly on the plate's own surface, nothing floating.

     The two X bars run LEVEL_W + 0.05 so they overlap the Z bars' 0.05 width
     and close the corners; a frame with four gaps at the corners reads as
     four separate strips. */
  const FRAME_T = 0.05, FRAME_H = 0.02;
  const FRAME_Y = GROUND_Y + 0.004 + FRAME_H / 2;
  const fxGeo = new THREE.BoxGeometry(LEVEL_W + FRAME_T, FRAME_H, FRAME_T);
  const fzGeo = new THREE.BoxGeometry(FRAME_T, FRAME_H, LEVEL_D);
  for (const sz of [-1, 1]) {
    const bar = envMesh(fxGeo, m.dark, sz === -1);
    bar.position.set(SHUT_X, FRAME_Y, LEVEL_Z + sz * LEVEL_D / 2);
    env2.add(bar);
  }
  for (const sx of [-1, 1]) {
    const bar = envMesh(fzGeo, m.dark, sx === -1);
    bar.position.set(SHUT_X + sx * LEVEL_W / 2, FRAME_Y, LEVEL_Z);
    env2.add(bar);
  }

  /* ---- EDGE PROTECTION BOLLARDS ------------------------------------------
     Two 1.0-tall posts flanking the door, 0.35 clear of each jamb, standing
     0.45 out from the wall face.

     AND THEY ARE SAFETY YELLOW NOW. The old note said "there is no warn-yellow
     in this scene's palette" and settled for `m.rack`, which is the honest
     record of a missing material rather than a decision — an edge-protection
     bollard is yellow in every building that has one, and a blue-grey bollard
     is a post. `m.bollard` is a MAPPED painted metal off the same module spec
     family as the racking (see SAFETY_METAL), not a flat tint: it shares the
     roughness canvas and the Sobel normal with the blue and the orange, so the
     third colour costs one albedo. It is also the same #8F7A1E as the walkway
     lines on the floor, which is the point — the yellow on the ground and the
     yellow on the post are the same paint. */
  const BOLL_H = 1.0;
  const bollGeo = new THREE.CylinderGeometry(0.085, 0.095, BOLL_H, 12);
  for (const bx of [DOOR_L - 0.35, DOOR_R + 0.35]) {
    const boll = envMesh(bollGeo, m.bollard, bx < SHUT_X);
    boll.position.set(bx, GROUND_Y + BOLL_H / 2, WALL_FZ + 0.45);
    env2.add(boll);
  }

  /* ---- PALLETISED GOODS, AT DOCK-APRON SPACING ---------------------------

     Four plain 1.35 x 0.95 x 1.05 boxes stood here, which is the exact defect
     act 1's own note names: one identical box per position is the definition
     of blobby. Same treatment as act 1 instead — a skid plus two or three
     cartons on the shared `cardboardSide()` board, with size, count, yaw and
     offset from a deterministic hash. `Math.random()` is banned; a scene that
     reshuffles itself cannot be reviewed.

     `palletGeo` and `cartonGeos` are act 1's, already owned by act 1's first
     use, so every mesh here passes own = false — the envMesh idiom this file
     already uses for its far rack run.

     TWO STAGGERED RANKS, NOT A ROW. Pitch 2.35 within a rank (act 1's near
     goods run at 1.90, so this is genuinely wider — a cleared apron, not a
     pick face) and the far rank offset ~half a pitch in x, which is the same
     trick the second rack run uses to stop two runs reading as one thick one.

     BOTH RANKS SIT BEHIND THE WALK LINE (z = -0.55 and -1.55, walker at
     z = 0), so nothing here can occlude the detection bracket — the failure
     act 1's near goods had to be moved forward and thinned to fix. The far
     rank's x values also clear the leveller's footprint (x -2.60 .. -0.40,
     z -2.50 .. -0.90): 0.75 spans 0.05..1.45 and 3.10 spans 2.40..3.80. */
  const DOCK_PALLETS: readonly (readonly [number, number])[] = [
    [-0.45, -0.55], [1.90, -0.55], [4.25, -0.55],   // near rank, pitch 2.35
    [0.75, -1.55], [3.10, -1.55],                    // far rank, staggered
  ];
  DOCK_PALLETS.forEach(([px, pz], i) => {
    const seed = 23 + i * 17;                        // always positive: i >= 0
    const pal = envMesh(palletGeo, m.board, false);
    pal.position.set(px, GROUND_Y + 0.065, pz);
    env2.add(pal);

    const n = 2 + (seed % 2);                        // two or three cartons
    for (let c = 0; c < n; c++) {
      const g = cartonGeos[(seed + c * 3) % cartonGeos.length];
      const w = (g.parameters as { width: number }).width;
      const h = (g.parameters as { height: number }).height;
      const box = envMesh(g, m.board, false);
      box.position.set(
        px - 0.42 + c * (w * 0.86),
        GROUND_Y + 0.13 + h / 2,
        pz + ((seed + c) % 3 - 1) * 0.045,
      );
      box.rotation.y = (((seed + c * 5) % 7) - 3) * 0.018;
      env2.add(box);
    }
  });

  /* ---- A STACK OF THREE EMPTY PALLETS, BY THE SHUTTER --------------------

     SKIDS ONLY, NO CARTONS, and that is the entire point: everything else in
     act 2 is a LOADED pallet, so a stack of bare decks is the object that says
     goods have already come off some of them. It is also the one place the
     pallet geometry is seen as itself rather than as a plinth under boxes.

     `m.board` — the same wood the loaded skids use, for the reason that note
     records (a pallet drawn in the deliberately-blue rack steel reads as a
     carton that has lost its colour). `palletGeo` is act 1's and already
     owned, so own = false.

     x = -5.35 is OUTBOARD of the left jamb (-4.30) and clear of the left
     bollard (-4.65) by 0.70, so it dresses the corner of the bay rather than
     standing in the doorway. z = -1.35 is behind the walk line and clear of the
     leveller's footprint (x -2.60..-0.40). Three decks at 0.13 pitch — the
     pallet's own thickness, so they nest flush: y = 0.065, 0.195, 0.325. */
  for (let i = 0; i < 3; i++) {
    const skid = envMesh(palletGeo, m.board, false);
    skid.position.set(-5.35 + i * 0.012, GROUND_Y + 0.065 + i * 0.13, -1.35 - i * 0.010);
    /* a few millimetres of drift and a degree of yaw per deck: a hand-stacked
       pile of pallets is never square, and a perfectly aligned stack is the
       "identical is itself the defect" failure at three-object scale. */
    skid.rotation.y = (i - 1) * 0.021;
    env2.add(skid);
  }

  /* ---- TWO WHEEL CHOCKS, BY THE LEVELLER --------------------------------
     Small `m.dark` wedges on the apron in front of the plate. They are almost
     nothing on screen, and they are here because they are the object a dock
     actually has lying about: the leveller now reads as a working plate with
     kit beside it rather than as a framed rectangle on its own.

     A WEDGE, MADE BY RAKING A BOX. There is no wedge primitive to hand and a
     4-sided cone is a pyramid, not a chock; a 0.22 x 0.14 x 0.18 box raked 20
     degrees about Z presents one sloped face to the lens, which at this size is
     the whole silhouette. The pair rake OPPOSITE ways so they do not read as
     two copies of one object.

     z = -0.70 is 0.20 in FRONT of the leveller's near edge (-0.90), so neither
     chock sits on the plate or z-fights its frame bars; x -2.15 and -0.85 line
     up inboard of the plate's own x span (-2.60..-0.40). */
  const chockGeo = new THREE.BoxGeometry(0.22, 0.14, 0.18);
  [-2.15, -0.85].forEach((cxz, i) => {
    const chock = envMesh(chockGeo, m.dark, i === 0);
    /* y = 0.075, and the box is DELIBERATELY PART-BURIED. Raked 20 degrees, a
       0.22 x 0.14 box's vertical half-extent grows to
       0.11*sin20 + 0.07*cos20 = 0.037622 + 0.065779 = 0.103401, so at 0.075
       its lowest corner is 0.0284 under the slab. That is what makes it read
       as a wedge sitting flat on the floor rather than a brick balanced on one
       corner; the buried 28mm is the part of a wedge that is below the taper.
       The floor slab itself is at -0.030, so nothing pokes out underneath. */
    chock.position.set(cxz, GROUND_Y + 0.075, -0.70);
    chock.rotation.z = (i === 0 ? 1 : -1) * (20 * Math.PI) / 180;
    env2.add(chock);
  });

  /* ---- ACT 2's PENDANT ----------------------------------------------------
     Same builder, same call shape and the same three tuned numbers as act 1's
     (y 2.55, ceilingY 5.4, beamR 1.05) — see act 1's note for why each is
     what it is; a second lamp on the same site is the same fitting.

     x = -1.6, z = 0: over the WALK LINE, as act 1's is, and between the
     leveller's centre (-2.20) and frame centre so it lights the ground the
     walker crosses on his way to the door. It is 3.3 clear in x of act 2's
     camera head at +1.70, so the two pieces of ceiling equipment do not stack
     into one silhouette — the same separation act 1 buys by putting its lamp
     at 1.15 against a head at -1.62.

     ITS POINTLIGHT IS NOT HIDDEN BY env2.visible. scene.tsx gates
     `lamp2.light.intensity` on act === 1 by name, exactly as act 1's is —
     three.js does not cull a light with its parent group, so a lamp left on
     would light the racking aisle and the pack line from a fitting neither of
     them contains. Its MATERIALS are likewise driven by name and are
     deliberately NOT in `mats.all`: they belong to the shared builder, not to
     this scene's palette.

     ACT 1 NO LONGER HAS ONE TO MATCH — its pendant was removed with this pass
     (see the note where it used to be built) and act 1 is lit by its roof
     instead. This is now the FIRST practical in the loop, not the second. */
  const lamp2 = buildPendantLamp({
    x: -1.6, y: 2.55, z: 0,
    planeY: GROUND_Y,
    ceilingY: 5.4,
    wireMat: m.dark,
    beamR: 1.05,
  });
  env2.add(lamp2.group);
  owned.push(...lamp2.owned);

  /* THE ROOF OVER THE DOCK — the same builder act 1 calls, so the two acts
     are under one building rather than under two different roofs. Honest
     caveat, recorded rather than hidden: at act 2's pose the top-of-frame ray
     reaches ROOF_Y = 4.8 only 17.14 units out (z = -10.3), which is behind the
     dock wall at z = -2.6 — so act 2's joists and skylights are almost
     certainly NOT in shot at 16:9. They are built anyway because a taller
     canvas pulls the camera back and raises that ray, and because the
     alternative is act 2 being the one act with no roof if ROOF_Y ever comes
     down. Two draw calls per joist on a hidden group is not the cost worth
     optimising; see addRoof for the full arithmetic. */
  addRoof(env2);

  /* ---- ACT 2's CAMERA — WALL-MOUNTED OVER THE DOCK -----------------------

     A real inbound-dock camera hangs off the door structure and looks BACK
     along the approach, reading a vehicle or a person as they come in. Act 2
     walks right to left (WALK_TO -> WALK_FROM), so "the end he enters from"
     is the RIGHT: the head sits at x = +1.70 and watches him come toward it
     and then past it toward the shutter.

     Every number falls out of the wall it is bolted to:
       plate   on the wall face, WALL_FZ = -2.50, at the arm's root
       arm     y = WALL_H - 0.20 = 3.00 — just under the wall's top edge,
               which is where a bracket actually goes; running out from
               WALL_FZ = -2.50 to CAM2_Z = -2.00, so ARM2_LEN = 0.50
       drop    the same HEAD_DROP = 0.26 stem act 1 uses, for the same reason:
               the lens has to clear its own arm
       head    (1.70, 3.00 - 0.26, -2.00) = (1.70, 2.74, -2.00)
       aim     (0, GROUND_Y + 1.05, 0) — the walk line at chest height, the
               same AIM_Y act 1 aims at

     The housing points from (1.70, 2.74, -2.00) toward (0, 1.05, 0), i.e.
     forward in +z and down — away from the wall, so no part of the body,
     hood or lens can intersect it.

     SAME RIG, SAME SPEC: makeActCam is act 1's option set. `fixed2` is a
     sibling of `fixed` and scene.tsx gates it on act === 1 exactly as `fixed`
     is gated on act === 0. The CONE is not in here — `readCam2.coneGroup` is
     a sibling by the rig's own contract and scene.tsx adds and drives it. */
  const fixed2 = new THREE.Group();
  fixed2.name = 'act2cam';

  const CAM2_X = 1.70;
  const CAM2_Z = -2.00;
  const ARM2_Y = WALL_H - 0.20;                  // 3.00
  const ARM2_LEN = Math.abs(CAM2_Z - WALL_FZ);   // 0.50

  const plate2 = mesh(new THREE.BoxGeometry(0.24, 0.30, 0.06), m.dark, false);
  plate2.position.set(CAM2_X, GROUND_Y + ARM2_Y, WALL_FZ + 0.03);
  fixed2.add(plate2);

  const arm2 = mesh(new THREE.BoxGeometry(0.07, 0.07, ARM2_LEN), m.dark, false);
  arm2.position.set(CAM2_X, GROUND_Y + ARM2_Y, (WALL_FZ + CAM2_Z) / 2);
  fixed2.add(arm2);

  const stem2 = mesh(new THREE.BoxGeometry(0.05, HEAD_DROP, 0.05), m.dark, false);
  stem2.position.set(CAM2_X, GROUND_Y + ARM2_Y - HEAD_DROP / 2, CAM2_Z);
  fixed2.add(stem2);

  const readCam2 = makeActCam(
    new THREE.Vector3(CAM2_X, GROUND_Y + ARM2_Y - HEAD_DROP, CAM2_Z),
    new THREE.Vector3(0, AIM_Y, 0),
  );
  fixed2.add(readCam2.group);
  owned.push(...readCam2.owned);

  /* ================= ACT 3 — PACK LINE =================

     The third place, and the tightest. Act 1 is a tall open aisle, act 2 is a
     shallow dock against a wall, act 3 is a LOW room — the ceiling is the
     act's identifying spatial feature and everything else is sized under it.

     What was here was placeholder in exactly the way docs/11 warns about:
     slabs on sticks for benches and plain boxes for totes. A bench reads as a
     bench because of its FRAME — legs, an apron under the front edge, a rail
     tying the legs low down — and a tote reads as a tote because of its LIP.
     Those two features are the whole job; polygon count is not. */
  const BENCH_TOP_Y = 0.78;
  const BENCH_Z = -1.55;
  const BENCH_PITCH = 2.1;
  const BENCH_W = 1.7;
  const BENCH_D = 0.75;
  const TOP_T = 0.06;
  /** The working plane: the top face of a bench, not the floor. Task lights
      and tote bases are both measured from here. 0.78 + 0.03 = 0.81. */
  const BENCH_SURF = GROUND_Y + BENCH_TOP_Y + TOP_T / 2;
  const LEG_S = 0.05;
  /** Legs stop at the UNDERSIDE of the top, so the top is carried rather than
      being a slab with four posts passing through it. 0.78 - 0.03 = 0.75. */
  const LEG_H = BENCH_TOP_Y - TOP_T / 2;
  const LEG_DX = BENCH_W / 2 - 0.07;             // 0.78, inset from the ends
  const LEG_DZ = BENCH_D / 2 - 0.055;            // 0.32

  const topGeo = new THREE.BoxGeometry(BENCH_W, TOP_T, BENCH_D);
  const legGeo = new THREE.BoxGeometry(LEG_S, LEG_H, LEG_S);
  /* THE APRON. A closed rail under the front edge of the top — the single
     thing that stops a work bench looking like a table tennis table. It is
     what the drawer runners and the edge trim hang off on a real one, and in
     silhouette it gives the top a THICKNESS instead of a 60mm line. */
  const apronGeo = new THREE.BoxGeometry(BENCH_W, 0.09, 0.04);
  /* The low shelf rail, front and back, tying each pair of legs. Racking got
     its identity from bracing; a bench frame gets a share of the same cue. */
  const railGeo3 = new THREE.BoxGeometry(LEG_DX * 2, 0.035, 0.035);

  /* TOTE BODIES AND THEIR LIPS. Three sizes, and a matching rim per size —
     a rim band 0.02 tall standing 0.015 out on every side, sitting at the
     body's top edge. The lip IS the tote: a plastic crate has a rolled or
     ribbed rim so it can be gripped and so it stacks, and without it the
     object is a box. Same relationship as the shutter's lip bar to its
     curtain, and the rack beam's lip to its beam. */
  const TOTE_DIMS: readonly (readonly [number, number, number])[] = [
    [0.42, 0.28, 0.30], [0.36, 0.24, 0.28], [0.48, 0.30, 0.32],
  ];
  /* RIM_H 0.035 / RIM_OUT 0.024, UP FROM 0.02 / 0.015 — and the reason is
     size, not contrast. Reviewed, the totes read as featureless foam blocks
     and the lip was called tonally invisible; the rim was ALREADY on `m.rack`
     against goods/dock bodies, so there was no contrast change left to make.
     The measurable problem is that the feature was too small to survive the
     review size. At the bench depth (~7.68 from the lens) the frame is 4.115
     world units tall, so on a 720px canvas one unit is ~175px and the old rim
     drew 3.5px tall standing 2.6px proud — under the threshold where an edge
     reads as a separate part rather than as anti-aliasing on the body's own
     corner. 0.035 / 0.024 draw ~6.1px and ~4.2px.

     This is the act 1 lattice lesson in its second half: a thing reads as
     itself because of its identifying feature, AND that feature has to be
     big enough to see. Two constants — revert them if it now reads chunky. */
  const RIM_OUT = 0.024, RIM_H = 0.035;
  const toteGeos = TOTE_DIMS.map(([w, h, d]) => new THREE.BoxGeometry(w, h, d));
  const rimGeos = TOTE_DIMS.map(([w, , d]) =>
    new THREE.BoxGeometry(w + RIM_OUT * 2, RIM_H, d + RIM_OUT * 2));

  let firstTop = true, firstLeg = true, firstApron = true, firstRail = true;
  const toteOwned = toteGeos.map(() => false);
  const rimOwned = rimGeos.map(() => false);

  for (let k = -2; k <= 1; k++) {
    const cx = k * BENCH_PITCH;
    /* `m.board`, not `m.rack`. A bench TOP is a dark composite work surface;
       drawn in the deliberately-blue rack steel it was the brightest
       horizontal in the act, which inverts the value ladder the same way the
       pallet skids did. Frame stays `m.rack` — the frame really is painted
       steel, and the contrast between dark top and blue frame is what makes
       the frame legible as a separate thing.

       AND IT NOW HAS ITS OWN PAINTED CANVAS — `m.benchTop`, not `m.board`.
       Same value family, but a bench top is a SCORED surface: along-grain
       scratches from things dragged down the line, and wear at the two corners
       where hands and boxes land. It could not stay on `m.board`, because that
       material is also every carton and every pallet skid in three acts and a
       map put there would end up on all of them. Repeat 1x1 per top, so the
       canvas maps to the 1.70 x 0.75 surface exactly once. */
    const top = envMesh(topGeo, m.benchTop, firstTop); firstTop = false;
    top.position.set(cx, GROUND_Y + BENCH_TOP_Y, BENCH_Z);
    env3.add(top);

    for (const sx of [-LEG_DX, LEG_DX]) {
      for (const sz of [-LEG_DZ, LEG_DZ]) {
        const leg = envMesh(legGeo, m.rack, firstLeg); firstLeg = false;
        leg.position.set(cx + sx, GROUND_Y + LEG_H / 2, BENCH_Z + sz);
        env3.add(leg);
      }
    }

    // apron under the FRONT edge — front is +z, the side the camera is on
    const apron = envMesh(apronGeo, m.rack, firstApron); firstApron = false;
    apron.position.set(cx, GROUND_Y + LEG_H - 0.045, BENCH_Z + BENCH_D / 2 - 0.02);
    env3.add(apron);

    for (const sz of [-LEG_DZ, LEG_DZ]) {
      const rail = envMesh(railGeo3, m.rack, firstRail); firstRail = false;
      rail.position.set(cx, GROUND_Y + 0.22, BENCH_Z + sz);
      env3.add(rail);
    }

    /* Two or three totes, everything deterministic off `hash(bench)`.
       seed = 41 + k*13 with k from -2 gives 15/28/41/54 — all positive, so
       the negative-modulo trap act 1's near-goods run hit cannot fire here.
       `Math.random()` is banned: a scene that reshuffles itself cannot be
       reviewed. Body material alternates toteA/toteB on seed parity so the row
       is not four of the same crate in a line.

       IT USED TO ALTERNATE `goods` AND `dock`, WHICH IS THE SAME COLOUR TWICE.
       #1F242C against #2E3540 is two near-neutral dark blue-greys about a
       third of a stop apart, so the alternation was real in the code and
       invisible on screen — which was the substance of the earlier critique
       that the totes read as identical foam blocks. `toteA` (muted industrial
       blue) against `toteB` (warm grey) differ in HUE, which is the axis that
       survives at this size and this exposure. The RIMS are untouched: they
       stay on `m.rack`, so the lip still reads as a separate part on both. */
    const seed = 41 + k * 13;
    const n = 2 + (seed % 2);
    for (let c = 0; c < n; c++) {
      const ti = (seed + c * 3) % toteGeos.length;
      const th = TOTE_DIMS[ti][1];
      const tx = cx - 0.52 + c * 0.52;
      const tz = BENCH_Z + ((seed + c) % 3 - 1) * 0.05;
      const yaw = (((seed + c * 5) % 7) - 3) * 0.022;
      const body = envMesh(toteGeos[ti], (seed + c) % 2 === 0 ? m.toteA : m.toteB, !toteOwned[ti]);
      toteOwned[ti] = true;
      body.position.set(tx, BENCH_SURF + th / 2, tz);
      body.rotation.y = yaw;
      env3.add(body);
      // the lip, straddling the body's top edge: spans top-0.02 .. top
      const rim = envMesh(rimGeos[ti], m.rack, !rimOwned[ti]);
      rimOwned[ti] = true;
      rim.position.set(tx, BENCH_SURF + th - RIM_H / 2, tz);
      rim.rotation.y = yaw;
      env3.add(rim);
    }
  }

  /* ---- THE ROLLER SECTION — the pack line's actual "line" ----------------

     Benches alone are a workshop. What makes a PACK LINE is a conveyed run
     between them, and the identifying feature of a gravity roller bed is the
     row of parallel barrels in a low side frame. Static, not turning:
     nothing in this family pulses or loops on its own clock, and a spinning
     roller would be the only self-driven motion in three acts.

     Sited in the gap between the benches at cx = 0 and cx = BENCH_PITCH, so
     ROLL_X = BENCH_PITCH / 2 = 1.05 — it occupies a bay rather than being
     parked beside one.

     THE DECK IS LEVEL WITH THE BENCH TOPS, which is the point of a line: the
     rail top sits at 0.73 + 0.05 = 0.78 and a 0.03-radius roller on it
     centres at 0.81 = BENCH_SURF exactly. Goods slide from bench to line
     without a step. */
  const ROLL_X = BENCH_PITCH / 2;
  const ROLL_W = 0.9;
  const ROLL_DZ = 0.30;                          // side rails at BENCH_Z +- this
  const ROLL_RAIL_Y = BENCH_TOP_Y - 0.05;        // 0.73
  const ROLL_R = 0.03;
  const ROLL_N = 7;
  const rollRailGeo = new THREE.BoxGeometry(ROLL_W, 0.10, 0.05);
  for (const sz of [-ROLL_DZ, ROLL_DZ]) {
    const rail = envMesh(rollRailGeo, m.dark, sz < 0);
    rail.position.set(ROLL_X, GROUND_Y + ROLL_RAIL_Y, BENCH_Z + sz);
    env3.add(rail);
  }
  const rollLegGeo = new THREE.BoxGeometry(LEG_S, ROLL_RAIL_Y - 0.05, LEG_S);
  for (const sx of [-0.40, 0.40]) {
    for (const sz of [-ROLL_DZ, ROLL_DZ]) {
      const leg = envMesh(rollLegGeo, m.dark, sx < 0 && sz < 0);
      leg.position.set(ROLL_X + sx, GROUND_Y + (ROLL_RAIL_Y - 0.05) / 2, BENCH_Z + sz);
      env3.add(leg);
    }
  }
  /* The barrels run ACROSS the direction of travel. The line runs along X
     (the bench row), so each roller lies along Z — a Cylinder is built about
     its own Y, so rotation.x = PI/2 lays it along Z. Length ROLL_DZ*2 + 0.02
     so the ends are just proud of the rails they turn in.
     `m.rack`: this palette has no dedicated roller material, and bare
     galvanised barrels against a `m.dark` frame is the right contrast. */
  const rollerGeo = new THREE.CylinderGeometry(ROLL_R, ROLL_R, ROLL_DZ * 2 + 0.02, 10);
  const rollPitch = ROLL_W / ROLL_N;
  for (let i = 0; i < ROLL_N; i++) {
    const r = envMesh(rollerGeo, m.rack, i === 0);
    r.rotation.x = Math.PI / 2;
    r.position.set(ROLL_X - ROLL_W / 2 + (i + 0.5) * rollPitch, GROUND_Y + ROLL_RAIL_Y + 0.05 + ROLL_R, BENCH_Z);
    env3.add(r);
  }

  /* ---- WORK IN PROGRESS ON THE LINE --------------------------------------

     A pack line whose benches carry nothing but neatly-spaced totes is a
     showroom. Three small things fix that, and they are small on purpose: this
     is the tightest of the three cameras, so an object here draws at roughly
     twice the pixels it would in act 1 and anything larger would compete with
     the walker.

     ALL ON THE BENCH AT cx = -2.10, which is the one with room. Its totes come
     from seed = 41 + (-1)*13 = 28, so n = 2 + (28 % 2) = 2, at
     tx = cx - 0.52 + c*0.52 = -2.62 and -2.10 — the left two thirds of a top
     that spans x -2.95 .. -1.25 and z -1.925 .. -1.175. Everything below sits
     in the right third and inside both spans.

     BENCH_SURF = 0.81 is the top FACE (0.78 + 0.06/2), so every base y here is
     that plus half the object's own height — nothing floats and nothing sinks. */
  const TAPE_H = 0.10;
  const tapeGun = envMesh(new THREE.BoxGeometry(0.16, TAPE_H, 0.09), m.dark);
  tapeGun.position.set(-1.52, BENCH_SURF + TAPE_H / 2, BENCH_Z + 0.10);
  tapeGun.rotation.y = 0.28;
  env3.add(tapeGun);

  /* TWO LOOSE CARTONS, and they are their own small geometries rather than act
     1's. `cartonGeos` runs 0.62 .. 0.72 across, which is a shelf carton: on a
     bench top 0.75 deep it would be the whole bench. These are hand-sized —
     the box a packer is actually filling. Same `m.board`, so same kraft as
     every other carton in every act; `cardboardSide()` is module-cached and
     shared with cargo-vision and is NEVER disposed here. */
  const smallCartonGeos = [
    new THREE.BoxGeometry(0.26, 0.20, 0.22),
    new THREE.BoxGeometry(0.22, 0.16, 0.20),
  ];
  const SMALL_CARTONS: readonly (readonly [number, number, number])[] = [
    [0, -1.62, -1.69],
    [1, -1.36, -1.44],
  ];
  SMALL_CARTONS.forEach(([gi, bx, bz]) => {
    const g = smallCartonGeos[gi];
    const bh = (g.parameters as { height: number }).height;
    const box = envMesh(g, m.board);
    box.position.set(bx, BENCH_SURF + bh / 2, bz);
    box.rotation.y = gi === 0 ? -0.11 : 0.17;
    env3.add(box);
  });

  /* ONE TOTE ON THE ROLLER DECK, MID-RUN. This is the object that makes the
     roller bed a LINE rather than a fixture: a deck with nothing on it is
     furniture, and one crate halfway along it states the direction of travel
     without anything having to move (nothing in this family pulses or runs on
     its own clock).

     Reuses the bench totes' body and rim geometries at index 1 — both already
     owned by the bench loop above (seeds 15/28/41/54 hit ti 0, 1 and 2, so all
     three sizes and all three rims are owned) — so own = false on both.

     THE DECK TOP IS BENCH_SURF + ROLL_R. The rollers centre at BENCH_SURF
     exactly (that is the whole point of the level-with-the-bench derivation),
     so what a crate rests on is 0.81 + 0.03 = 0.84:
       body  0.24 tall -> centre 0.84 + 0.12  = 0.96
       rim   straddles the body's top edge    -> 0.84 + 0.24 - 0.035/2 = 1.0625 */
  {
    const ti = 1;
    const th = TOTE_DIMS[ti][1];                   // 0.24
    const deck = BENCH_SURF + ROLL_R;              // 0.84
    /* `toteA`, the blue one — the crate mid-run on the roller deck is the
       object that states the direction of travel, so it takes the more
       saturated of the two tote colours rather than the warm grey. */
    const body = envMesh(toteGeos[ti], m.toteA, false);
    body.position.set(ROLL_X, deck + th / 2, BENCH_Z);
    body.rotation.y = 0.032;
    env3.add(body);
    const rim = envMesh(rimGeos[ti], m.rack, false);
    rim.position.set(ROLL_X, deck + th - RIM_H / 2, BENCH_Z);
    rim.rotation.y = 0.032;
    env3.add(rim);
  }

  /* ---- THE LOW CEILING ---------------------------------------------------

     Act 3's identifying spatial feature, and the reason the act reads as a
     tighter room than act 1's aisle. It began as a 3.2-deep strip centred at
     z = -1.0, spanning z -2.60 .. 0.60 — at the act-3 camera pose its FRONT
     edge sat inside the frame, so it read as a dark band floating in the air
     rather than as a ceiling.

     A ceiling is only a ceiling if you cannot see it end. The arithmetic, at
     the act-3 pose (az 0.18, dRef 6.1, elev 4 deg, target (0.14, 1.32, 0)),
     the studio's 30 deg VERTICAL fov, and REF_ASPECT 16:9:

       camera   (1.2294, 1.7455, 5.9868), 6.100 from target
       the top-of-frame ray leaves the lens at the view axis pitch (-4 deg)
       plus the half-fov (15 deg) = +11 deg, direction (-0.1782, 0.1908, -0.9791)
       it crosses this ceiling's underside (2.90 - 0.06 = 2.84) at
         t = (2.84 - 1.7455) / 0.190809 = 5.7361
         z = 5.9868 - 0.979063 * 5.7361 = 0.447

     So the underside is BELOW the top of frame — i.e. visible — only for
     z < 0.447, and out of frame for anything nearer the lens. The front edge
     therefore has to reach at least z = 0.447; CEIL_FRONT_Z = 6.00 takes it
     far past, and past the camera itself (z 5.99) at 16:9.

     2.90, UP FROM 2.35, AND THIS IS MOST OF WHAT FIXED THE CEILING POOL.
     Raising the slab does two things at once: it shrinks the visible
     underside band from z < 3.19 to z < 0.447, so most of the plane that was
     catching the pendants' light is now simply out of frame, and it lets the
     pendants hang high enough to clear the walker (see below) instead of
     sitting at his head height. The act keeps its "lower space" identity
     against act 1's 3.40 racks and open-to-black ceiling; the benches, totes
     and roller deck carry the rest of it.

     WHY 6.00 AT THE FRONT. `fitD` pulls the camera BACK on a narrow canvas,
     which raises the top-of-frame ray and pushes the threshold out:
       aspect 16:9  d =  6.10   threshold z = 0.45
       aspect 14:9  d =  6.97   threshold z = 1.61
       aspect  4:3  d =  8.13   threshold z = 3.16
       aspect  1:1  d = 10.84   threshold z = 6.78
     At the old 2.29 underside, 6.00 only held to about 4:3; at 2.84 the same
     number holds to just short of square. Left as it is — it costs one box,
     and the higher ceiling made it strictly more robust.

     THE BACK EDGE GOES TO -12.0, UP FROM -2.60, so the far end DISSOLVES
     rather than stopping. At -2.60 the edge sits 8.74 from the lens, which
     the scene's 6..26 fog only takes 14% of the way to the backdrop — a hard
     line across the frame with black above it, which is the floating-band
     defect from the other end. At -12.0 it is 18.06 out and 60% fogged, so
     the ceiling recedes into the page's own black. Same close as act 1's
     aisle and act 2's dock: the fog IS the end of the room.

     `m.ceil`, NOT `m.dark` and not `m.dockWall`. At 13 x 18 this is by far
     the largest surface in the scene; DARK_METAL's 0.78 metalness would make
     it a specular sheet, and `dockWall` is tuned to stay a READABLE wall for
     act 2, which is the opposite of what is wanted above the pendants. See
     buildWorkMaterials for the albedo arithmetic. */
  const CEIL_Y = 2.90;
  const CEIL_T = 0.12;
  /** The underside — what the room is actually roofed by, and what the task
      pendants hang from. 2.90 - 0.06 = 2.84. */
  const CEIL_UNDER = GROUND_Y + CEIL_Y - CEIL_T / 2;
  const CEIL_BACK_Z = -12.00;
  const CEIL_FRONT_Z = 6.00;
  const CEIL_D = CEIL_FRONT_Z - CEIL_BACK_Z;     // 18.00
  const ceiling = envMesh(new THREE.BoxGeometry(13.0, CEIL_T, CEIL_D), m.ceil);
  ceiling.position.set(0, GROUND_Y + CEIL_Y, (CEIL_FRONT_Z + CEIL_BACK_Z) / 2);   // z = -3.00
  env3.add(ceiling);

  /* ---- TWO TASK PENDANTS, OVER THE WALK LINE -----------------------------

     THE LAMP HANGS OVER THE WALK LINE, NOT OVER THE SCENERY. Item 5 of the
     docs/11 standard, and act 1 states the reason in its own note: the
     subject is the person, so the light that motivates the frame is the light
     HE walks under. These were first sited over the benches at z = -1.55,
     which lit the set dressing and left the walker crossing act 3 in the
     dark — the exact failure the rule exists to prevent.

     z = -0.45 puts them between the walk line (z = 0) and the bench line
     (z = -1.55), so the pool spills onto both; x = -1.6 and +0.9 spreads them
     across the stretch of floor he actually crosses mid-act and keeps both
     clear of the camera stem at x = 1.6. planeY is GROUND_Y, matching acts 1
     and 2: the visible beam lands on open floor, so it no longer needs to
     pretend a bench top is the working plane. beamR 0.7 — between act 1's
     1.05 over a 2.55 drop and the 0.55 these had over a 0.69 one, because the
     throw is now the full 1.5 to the slab.

     Still built SMALL (shadeR 0.18 against acts 1 and 2's 0.30): the fitting
     is right for a low room even though its job is now the floor. A scaled
     copy of the high bay would say the ceiling is 5m up.

     y = 2.28, AND HE PASSES UNDER IT — which is act 1's stated point and the
     reason a lamp over the walk line has a minimum height at all. At the
     first attempt (y 1.70, under a 2.29 ceiling) the bulb sat at 1.49 and the
     shade mouth at 1.53, both BELOW the walker's 1.815 crown + 0.035 gait bob
     = 1.85: he crossed beside the fitting at head height and occluded its own
     bulb. Raising the ceiling to 2.90 made the room for this. Clearances now:
       bulb        y - 0.21 = 2.07, the fixture's lowest part -> clears 1.85
                   by 0.22 (act 1's equivalent is 2.34 - 1.85 = 0.49)
       shade mouth y - 0.17 = 2.11 -> clears by 0.26
       hang        CEIL_UNDER - y = 2.84 - 2.28 = 0.56 of flex

     INTENSITY 20.4, COMPUTED. lamp.ts puts the PointLight at y - 0.20 = 2.08,
     so the drop to the slab is 2.08 and at decay 2 the illuminance is I/d^2.
     Act 1's true value is the bar: 26 / (2.55 - 0.20)^2 = 4.71. Matching it,
     I = 4.71 * 2.08^2 = 20.38, so 20.4. (It was 2.2 when planeY was the bench
     top and the drop 0.69, then 10.6 at a 1.50 drop; the number moves with
     the plane and the height, which is the whole reason it is derived and not
     chosen.)

     NO `light.distance` OVERRIDE — the builder's 9.5 stands. A 2.6 cutoff was
     tried to kill the ceiling pool and is geometrically incapable of it: the
     ceiling is NEARER the lamp (0.76) than the floor is (2.08), so any cutoff
     that reaches the floor has already reached the ceiling. Measured on
     three.js's own window, (1 - (d/D)^4)^2, a D of 2.6 left the ceiling 98%
     of its light and took 21% off the FLOOR — the lever runs backwards. The
     pool is handled by raising the ceiling out of frame and by `m.ceil`'s
     albedo instead; see those two notes.

     BOTH POINTLIGHTS ARE GATED IN scene.tsx ON act === 2. env3.visible does
     not switch a light off in three.js; two ungated task lights would sit
     over the racking aisle and the dock lighting them from fittings neither
     act contains. Materials are driven by name for the same reason acts 1
     and 2's are: they belong to the shared builder, not to `mats.all`. */
  const TASK_Y = 2.28;
  const TASK_Z = -0.45;
  const taskLamps = [-1.6, 0.9].map((lx) => {
    const lamp = buildPendantLamp({
      x: lx, y: TASK_Y, z: TASK_Z,
      planeY: GROUND_Y,
      ceilingY: CEIL_UNDER,
      wireMat: m.dark,
      shadeR: 0.18,
      beamR: 0.7,
    });
    env3.add(lamp.group);
    owned.push(...lamp.owned);
    return lamp;
  });

  /* ---- ACT 3's CAMERA — HUNG FROM THE LOW CEILING ------------------------

     Acts 1 and 2 clamp to a rack and bolt to a wall; act 3's only structure
     overhead is the ceiling itself, so this one drops off it on a stem. That
     is also the honest reading of the space: in a low room the camera is
     close, which is why act 3's own render pose is the tightest of the three.

     Every number off the ceiling constants above:
       pad     a flange on the ceiling underside, CEIL_UNDER = 2.84
       stem    the same HEAD_DROP = 0.26 acts 1 and 2 use, centred at
               CEIL_UNDER - HEAD_DROP/2 = 2.71
       head    (1.6, CEIL_UNDER - HEAD_DROP, -1.2) = (1.6, 2.58, -1.2)
       aim     (0, AIM_Y, 0) = (0, 1.05, 0) — the same walk line, at the same
               chest height, as the other two

     EVERY ONE OF THOSE IS DERIVED, so raising the ceiling from 2.35 to 2.90
     carried the whole rig up with it — 2.03 to 2.58 — without a line
     changing here. That is the point of deriving them.

     CLEARANCE: the housing is 0.17 tall about its own centre and points
     forward and down toward (0, 1.05, 0), so its highest point is ~2.665
     against the ceiling's 2.84 underside — it hangs below the slab, not
     inside it. In frame at the act-3 pose the head sits 6.93 from the lens,
     where the half-frame is 3.301 x 1.857; the head projects to (1.651,
     1.321) in that space, i.e. 0.500 and 0.712 of the way to the edges —
     upper right, and inside on both axes.

     SAME RIG, SAME SPEC, THIRD TIME: `makeActCam` again. Three cameras on one
     site are three of the same camera. */
  const fixed3 = new THREE.Group();
  fixed3.name = 'act3cam';

  const CAM3_X = 1.6;
  const CAM3_Z = -1.2;

  const pad3 = mesh(new THREE.BoxGeometry(0.18, 0.04, 0.18), m.dark, false);
  pad3.position.set(CAM3_X, CEIL_UNDER - 0.02, CAM3_Z);
  fixed3.add(pad3);

  const stem3 = mesh(new THREE.BoxGeometry(0.05, HEAD_DROP, 0.05), m.dark, false);
  stem3.position.set(CAM3_X, CEIL_UNDER - HEAD_DROP / 2, CAM3_Z);
  fixed3.add(stem3);

  const readCam3 = makeActCam(
    new THREE.Vector3(CAM3_X, CEIL_UNDER - HEAD_DROP, CAM3_Z),
    new THREE.Vector3(0, AIM_Y, 0),
  );
  fixed3.add(readCam3.group);
  owned.push(...readCam3.owned);

  return {
    root, figure, walk,
    headAnchor: new THREE.Vector3(0, 1.90, 0),
    fixed,
    fixed2,
    fixed3,
    envActs: [envShared, env1, env2, env3],
    dayLight,
    lamp2,
    taskLamps,
    readCam,
    readCam2,
    readCam3,
    owned,
    /* The lamp's GEOMETRY is already in `owned` (pushed where it is built),
       so only its MATERIALS need its own dispose — the shared builder hands
       those back separately because it owns them and this scene's mats.all
       does not know about them. readCam's geometry is folded into `owned`
       above too; only its materials-only dispose is called separately, same
       contract as the lamp. */
    dispose: () => {
      owned.forEach((g) => g.dispose());
      /* A bare light owns no geometry and no material, but three.js still
         exposes dispose() on it and calling it is what keeps this list a
         complete inventory of what the scene made. */
      dayLight.dispose();
      lamp2.dispose();
      taskLamps.forEach((l) => l.dispose());
      readCam.dispose(); readCam2.dispose(); readCam3.dispose();
    },
  };
}

/* ---------------------------------------------------------------------------
   Cargo Vision — the subject: a container being DESTUFFED.

   The claim is "Every case counted, with video proof attached." So the scene
   has to show three things at once and never let any of them stop the others:

     · MIXED cargo. A count that only works on identical cubes is worthless, so
       the stream carries three visibly different silhouettes — a squared kraft
       carton, a slumped gunny bag, an upright ribbed drum. Silhouette is the
       whole differentiator here; if you can tell them apart at a glance the
       claim is credible, and if you cannot, nothing else in the scene matters.
     · A CONTINUOUS STREAM. A destuff line runs at constant speed. Every item
       advances linearly, and the count keeps climbing through the loop wrap.
     · DAMAGE CAUGHT IN THE SAME PASS. One carton is flagged mid-stream and the
       count does not pause for it — that is the actual product claim, and a
       stream that hesitates for the bad box says the opposite.

   THE CONTAINER IS THE SAME BOX CONTAINER VISION AND GATE VISION USE. It is
   imported from ../container-vision, not re-modelled, for exactly the reason
   gate.ts states: three scenes that claim to be about one facility have to show
   one facility. Here it is turned so its DOOR END faces the camera-ish and
   offset to frame-left, and the cargo emerges from that opening.

   Coordinates: the run-out runs along world +X at z = 0, ground at GROUND.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { buildContainer, H as C_H, L as C_L } from "../container-vision/container";
import type { MaterialSet } from "../container-vision/materials";
import { CANONICAL_BRUSHED, makeMetal, metalBox, tintMetal } from "../_vision/metal";
import { PALETTE } from "../_vision/palette";
import { cardboardSide } from "../hero-cards/skins";

/* Ground plane. Everything — container floor, run-out, cargo — sits on it, and
   the studio's cast-shadow catcher is placed here. */
export const GROUND = -0.55;

/* THE CONVEYOR'S RUNNING SURFACE.

   0.62 above the deck, and the height is not arbitrary. Three things had to be
   true at once:

     · the legs have to be tall enough to READ as legs. At the 0.34 a first
       pass used, the frame sat on the deck like a skid and the whole assembly
       still read as a painted lane rather than as machinery.
     · the tallest item (the 0.82 drum) has to clear the container aperture.
       Interior height is C_H = 2.591 from the container floor at GROUND, so a
       drum on the belt tops out at GROUND + 0.62 + 0.82 = GROUND + 1.44 —
       comfortably inside, with over a metre of headroom.
     · the belt has to MEET the door without entering it. It starts at
       x = -2.28 and the mouth is at worldX -2.41, so the tail roller's crown
       lands flush on the door plane. The cargo behind that plane is hidden by
       the door void, so the stream still appears out of the dark — it just
       does so at the threshold rather than from inside the box. */
export const BELT_TOP = GROUND + 0.62;

/* Deterministic hash, 0..1. Every "random-looking" number in this file comes
   from here — a fixed integer mix on the instance index — so the scene renders
   byte-identical on every load. `Math.random()` is banned in this codebase for
   exactly that reason: a scene that reshuffles itself cannot be reviewed. */
export const rnd = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** hash mapped to [-1, 1] */
const sgn = (n: number) => rnd(n) * 2 - 1;

/* ---- the container's pose --------------------------------------------------

   YAW IS -0.30 rad, NOT MORE, AND THAT IS A COMPROMISE WORTH NAMING.

   The door end is the container's local +X face. Rotating about Y by a NEGATIVE
   angle swings +X toward +Z, i.e. toward a camera standing at +Z — so a yaw of
   -0.30 (17.2 degrees) turns the opening to face the lens. Turning it further
   would show more of the aperture, and it would also swing the container's long
   axis away from the run-out, so cargo travelling along world +X would no longer
   emerge through the middle of the hole it is supposed to come out of.

   At -0.30 the numbers work out: the door plane sits at container-local x =
   +3.029, and the track's local coordinates along its run are

       local x = 0.955 * worldX + 5.334        (so the mouth is at worldX -2.41)
       local z = 0.2955 * worldX + 1.023       (0.23 .. 0.31 across the run)

   |local z| stays under 0.32 against a half-width of 1.219, so an item is
   comfortably inside the aperture the whole way through it. Any larger yaw and
   the track starts clipping the door frame. */
export const CONT_POS = new THREE.Vector3(-5.4, GROUND + C_H / 2, -0.6);
/* -0.10, NOT -0.30. The original reasoning — swing the opening toward the lens
   so the aperture is visible — was right about the aperture and wrong about the
   container. At -0.30 the box presents its END to a camera sitting at az 0.42,
   the corrugated long side compresses to almost nothing, and the whole thing
   reads as a flat dark rectangle rather than as a shipping container. The
   coherence argument for reusing Container Vision's exact box is lost the moment
   you cannot tell it IS one.

   At -0.10 the long side opens back up into a three-quarter view — corrugation,
   length and markings all legible — and the aperture is still turned enough to
   read as a hole rather than a painted panel. The clearance arithmetic improves
   rather than degrades: local z along the track runs 0.6 +/- 0.1 against a
   half-width of 1.219, comfortably inside the opening the whole way through. */
export const CONT_YAW = -0.10;

/* ---- the stream ------------------------------------------------------------
   Nine items, evenly spaced, wrapping. Straight out of hero-cards/subjects.ts's
   factory belt: `travel = p * SPAN` and `while (x > SPAN/2) x -= SPAN`, which
   makes every item's position a pure function of p and the loop periodic by
   construction — nothing accumulates, so nothing can drift or pop.

   SPAN = N * PITCH is what makes the wrap invisible AND regular: the wrap lands
   an item exactly where its upstream neighbour was, so the stream never gains or
   loses a gap. x therefore runs over [-6.075, +6.075], and -6.075 is deep INSIDE
   the container (local x = -0.47 of a half-length 3.029), so an item is reborn
   in the dark and walks out of the door. The wrap is never seen. */
export const ITEM_N = 9;
export const PITCH = 1.35;
export const SPAN = ITEM_N * PITCH;   // 12.15

/* THE THRESHOLD. The count ticks as an item crosses x = 0.

   Item i sits at x = -SPAN/2 + i*PITCH + p*SPAN, so it crosses 0 at
       p_cross(i) = (SPAN/2 - i*PITCH) / SPAN = 0.5 - i/9   (mod 1)
   which is nine crossings per loop, evenly spaced 1/9 apart, the first at
   p = 1/18. scene.tsx derives the displayed number straight from that. */
export const THRESHOLD_X = 0;

export type ItemType = "carton" | "gunny" | "drum";

/* The mix, in order. Deliberately not alternating on a period of 2 or 3 — a
   regular alternation reads as a pattern and the eye stops counting objects and
   starts counting the pattern, which is precisely the failure mode a mixed
   destuff is supposed to argue against. */
export const SEQUENCE: ItemType[] = [
  "carton", "carton", "gunny", "drum", "carton", "gunny", "drum", "carton", "gunny",
];

/* THE FLAGGED ITEM IS INDEX 0, AND THE SPEC SAID INDEX 5. Two reasons it could
   not be 5, both checkable against the arithmetic above:

     · index 5 is a GUNNY BAG in the sequence above, and the damage beat is
       specified as a carton. It is also specified as the one item carved OUT of
       the InstancedMesh so a tracker can read its world bounding box — and only
       cartons are instanced, so the carve-out is meaningless on a bag.
     · index 5 is off screen for the whole damage window. x_5(0.55) = 7.36,
       which wraps to -4.79 — inside the container. The bracket would be drawn
       around a box nobody can see.

   Index 0 is a carton, and its timing is the best of the four cartons:
       crosses the threshold at p = 0.500
       x = 0.61 at p = 0.55   and   x = 3.03 at p = 0.75   (damage window)
       x = 2.67 .. 5.10 across p 0.72 .. 0.92               (proof window)
       wraps at exactly p = 1.0, i.e. at the loop seam, off the right of frame.
   So the whole damage-and-proof story plays out on one item, in clear air, and
   ends on the wrap. */
export const FLAGGED = 0;

/* Item dimensions. All three sit BETWEEN the near-black canvas and the accent in
   value — the standing rule for cargo across every scene here.

   THREE CARTON SIZES, NOT ONE, AND THAT IS THE HEADLINE FIX FOR "CARTOONISH".
   The first build drew every carton from one 0.90 x 0.70 x 0.70 rounded box at
   one scale, so nine identical cubes marched past in a line — which is what a
   primitive looks like, and no amount of material work rescues it. A destuffed
   container holds mixed cases; the silhouettes have to differ before anything
   else is worth doing. */
const CARTONS = [
  { w: 0.92, h: 0.72, d: 0.68 },
  { w: 0.76, h: 0.58, d: 0.74 },
  { w: 1.04, h: 0.54, d: 0.64 },
] as const;
const BAG = { sx: 0.60, sy: 0.42, sz: 0.50 };
const DRUM = { r: 0.32, h: 0.82 };

/* ---- the conveyor -----------------------------------------------------------

   THERE WAS NO CONVEYOR. The scene shipped with two hairline lane edges and a
   threshold strip painted on the deck, and the cargo floated over them — which
   is why it "did not look like a conveyor belt at all" and why "the bottom part
   is missing" was the right diagnosis of a thing that had no parts at all.

   What is built here is a slat belt on a fabricated frame, because those are the
   two cues that make a belt read as machinery rather than as a plane:

     · THE RUNNING SURFACE IS THE SLATS, not a painted top. The carcass box sits
       0.016 BELOW the running height and the slats sit ON it, so the 0.065 gap
       between slats shows dark carcass through it. That gap is the whole reason
       travel direction is legible: a featureless belt moving under featureless
       cargo has nothing on it for the eye to track.
     · THERE IS AN UNDERSIDE. Side channels, four leg bents with cross braces
       and foot pads, head and tail rollers, five return idlers and the return
       strand hanging under them, and a drive at the head end. None of it is
       decoration — a belt with nothing beneath it is a floating rectangle.
*/
/* THE BELT STOPS AT THE DOOR, IT DOES NOT GO THROUGH IT.

   X0 was -3.30, which put 0.89 of belt inside the container. The intent was
   "the cargo comes out of the dark on the belt"; what it actually read as was
   a conveyor driven through the back of a steel box — the frame, the legs and
   the side channels all intersected the door aperture and the near sill, and
   from an 18-degree camera you see that intersection clearly.

   -2.28 puts the running surface just OUTSIDE the mouth (worldX -2.41). The
   tail roller sits at X0 - 0.02 with r = 0.10, so its crown reaches -2.40 —
   flush with the door plane, touching it and not entering it. Cargo behind
   the mouth is hidden by the door-void plane either way, so the stream still
   emerges from the dark; it now lands ON the belt head at the threshold
   instead of already being carried inside a container it is being taken out
   of. */
const BELT_X0 = -2.28;
const BELT_X1 = 6.95;
const BELT_LEN = BELT_X1 - BELT_X0;          // 9.23
const BELT_CX = (BELT_X0 + BELT_X1) / 2;     // 2.335
const BELT_SURF_W = 2.10;                    // slat length across the belt
const SLAT_PITCH = 0.30;
const SLAT_W = 0.235;                        // leaves a 0.065 gap
const SLAT_T = 0.016;
const SLAT_N = Math.ceil(BELT_LEN / SLAT_PITCH) + 2;   // 33
const FRAME_Z = 1.16;
/* Four bents, inset 0.38 from each end of the shortened frame and evenly
   spaced at 2.823 between — derived from BELT_X0/X1 rather than eyeballed, so
   shortening the belt again cannot leave a leg hanging off the end of it. */
const LEG_X = [-1.90, 0.92, 3.75, 6.57];
const LEG_Z = 1.06;

/* ---- staged cargo: stock already unloaded, waiting at the dock -----------

   Container Vision reads as full because there is nothing to compare it to
   but itself. Cargo Vision sits nine drifting items over an empty deck, and
   an empty deck around a moving subject reads as "sparse" even when the
   count is honest — a working destuff bay has product accumulating at the
   dock, not just the one line crossing the threshold.

   THESE ARE STATIC AND NEVER TOUCH `advance` OR THE COUNTER. That is the
   whole safety property: they are not part of the stream (they carry no
   `p`-dependent position), so extending them can never shift a crossing
   time, desync a tag window, or move the flagged carton's timing math.

   The grid follows the stream's own PITCH rather than an invented spacing,
   so it reads as the same system staged rather than a hand-scattered prop —
   0.72 of a pitch is close enough to butt the boxes together without them
   z-fighting at their shared edges.

   TWO PILES, ONE EACH SIDE OF THE LANE, so the run-out stays legible (the
   counted stream needs clear air) and the scene gets real foreground and
   background layers instead of one frontal band: the near pile sits past
   the lane on the camera side, the far pile tucks in beside the container,
   and the moving stream reads as the midground between them. */
const STAGE_PITCH = PITCH * 0.72;
type StageSpot = { type: ItemType; x: number; z: number };
const STAGE: StageSpot[] = (() => {
  const spots: StageSpot[] = [];
  // far pile: beside the container, background — 3 wide, 2 deep
  const far: ItemType[] = ["carton", "drum", "carton", "gunny", "carton", "drum"];
  far.forEach((type, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    spots.push({ type, x: -1.35 + col * STAGE_PITCH, z: -1.85 - row * STAGE_PITCH });
  });
  // near pile: past the lane on the camera side, foreground — 2 wide, 2 deep
  const near: ItemType[] = ["drum", "carton", "gunny", "carton"];
  near.forEach((type, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    spots.push({ type, x: 3.35 + col * STAGE_PITCH, z: 1.55 + row * STAGE_PITCH });
  });
  return spots;
})();

/* ---- texture cache + idle warm --------------------------------------------
   Same contract as yard.ts and gate-vision/materials.ts: a module-level cache
   only helps the SECOND consumer, and on a page with one instance of this scene
   the first consumer is the visitor. `warmCargoTextures()` is called from
   _vision/lazy.tsx's loader so the build that runs on the scroll path gets hits.

   NOTHING HERE PAINTS ITS OWN CANVAS. The kraft board comes from the shared
   hero-cards cache and the drum finish is the CANONICAL brushed spec, which
   metal.ts has already generated during the idle warm. That is deliberate: a
   non-canonical makeMetal spec would miss metal.ts's cache and pay a full
   albedo + roughness + Sobel derivation on the visitor's scroll path. */
let boardCache: THREE.Texture | null = null;
function cargoTextures() {
  if (!boardCache) boardCache = cardboardSide();
  return boardCache;
}
export function warmCargoTextures() {
  cargoTextures();
  // the metal MAPS are cached inside metal.ts; the material is throwaway
  makeMetal({ ...CANONICAL_BRUSHED }).dispose();
}

export interface CargoMaterials {
  /** three kraft tints — no two neighbouring cases are the same board */
  cartons: THREE.MeshStandardMaterial[];
  bag: THREE.MeshStandardMaterial;
  drum: THREE.MeshStandardMaterial;
  rib: THREE.MeshStandardMaterial;
  /** the open door end — a hole, not a surface */
  voidM: THREE.MeshBasicMaterial;
  lane: THREE.LineBasicMaterial;
  threshold: THREE.MeshBasicMaterial;
  /* ---- the place the bay is in ---- */
  deck: THREE.MeshStandardMaterial;
  belt: THREE.MeshStandardMaterial;
  slat: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  roller: THREE.MeshStandardMaterial;
  far: THREE.MeshStandardMaterial[];
  /** cast shadows land on the BELT, not on the deck — its own catcher */
  beltShadow: THREE.ShadowMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildCargoMaterials(): CargoMaterials {
  const board = cargoTextures();
  const all: THREE.Material[] = [];
  const keep = <T extends THREE.Material>(m: T) => { all.push(m); return m; };
  /* Textures this scene OWNS. Only CLONES go in here — the cached originals in
     skins.ts and metal.ts are never disposed by a scene. A clone shares the
     `image` and costs one GPU upload, which is the cheap way to get a second
     `repeat` off a texture that other scenes are also sampling: writing
     `.repeat` on the shared object would silently re-tile every consumer. */
  const ownedTex: THREE.Texture[] = [];

  /* THE CARTON GETS ONE MATERIAL, NOT A SIX-FACE ARRAY, and that is forced by
     the geometry rather than chosen. metalBox returns a RoundedBoxGeometry,
     which has a SINGLE material group — a six-material face array simply would
     not bind to it (see the note in hero-cards/subjects.ts). So the kraft SIDE
     map goes on every face and `cardboardTop` is not used here; the top map's
     tape run would be visible on a carton this size, but not at the cost of
     square corners, which are the strongest "this is a toy" cue there is. */
  /* `color` MULTIPLIES the kraft map, and leaving it at the default white means
     the map renders at full strength — which on a dark section put the cartons
     brighter than the accent counter they are supposed to sit behind. #7E6F52
     knocks the board down to the value band cargo belongs in without touching
     the map, which is shared and cached and must not be regenerated per tint. */
  /* THREE TINTS, ONE MAP. The map is shared and cached and must not be
     regenerated per tint, so the variation rides `color` — three clones of one
     material, sharing every texture, costing three uniform blocks. Nine cases
     all cut from the same board is a printing plant, not a container. */
  const cartons = ["#3B3428", "#332E24", "#443C2E"].map((tint) => keep(
    new THREE.MeshStandardMaterial({
      map: board, color: tint, metalness: 0, roughness: 0.94,
      envMapIntensity: 0.18, transparent: true, opacity: 0,
    }),
  ));

  /* THE SACK. No map, no metalness, roughness at the ceiling: a gunny bag is
     woven jute and the one thing it must not do is catch a specular highlight,
     because a highlight implies a hard surface and the whole job of this item is
     to read as SOFT against the carton's squared edges. Neutral warm-grey sits
     it between the drum's cool steel and the carton's kraft, so the three items
     separate on hue as well as on shape. */
  /* #3A3529, NOT the #6E6A5E a first pass used. That value was chosen as a hex
     and it rendered NEAR-WHITE — the sacks were the brightest objects in frame,
     which breaks the rule that cargo sits BETWEEN the near-black canvas and the
     accent in value and never out-brights the overlay.

     THIS IS THE SAME TRAP YARD VISION DOCUMENTED AND IT CAUGHT US AGAIN. A hex
     reads as its own value only under flat light. Under the full five-source
     area rig, with ACES tone mapping on top, a matte diffuse surface lands far
     brighter than its albedo suggests — and a roughness of 1.0 with no map makes
     it worse, because every one of those sources contributes diffuse with
     nothing breaking it up. Author these roughly HALF the value you want on
     screen and check the render, never the swatch.

     AND THE SACK NEEDS TO GO FURTHER DOWN THAN THE OTHERS — #1F1C16 against the
     carton'''s #7E6F52 — which looks wrong as a pair of swatches and is right on
     screen. The carton carries the kraft MAP, whose baked grain and creases are
     dark for a good fraction of its area, so the eye averages it well below its
     tint. The sack is unmapped, so every texel returns the full diffuse response
     and a curved unmapped surface catches light across its whole silhouette.
     Two objects at the same authored value do not read at the same brightness
     when one is mapped and one is not; the map is worth roughly a stop. */
  /* AND IT NOW CARRIES A MAP, which is the second half of the same problem.
     An unmapped diffuse surface returns the identical response from every
     texel, so a sack lit by five area sources came out as a smooth gradient
     ramp — the exact signature of a shaded primitive, and the reason these read
     as "cartoonish" however carefully the value was tuned. Jute and kraft are
     both coarse plant fibre, so the board map already in the cache is the right
     surface; it only needs tiling much tighter than a carton would take it, so
     the weave reads as weave rather than as corrugation.
     A CLONE, because `repeat` lives on the texture and the original is shared —
     see ownedTex above. The tint comes back UP to #2E2A21 now that a map is
     breaking the surface up: the value note below was written against an
     unmapped sack, and a map is worth roughly a stop. */
  const bagMap = board.clone();
  bagMap.wrapS = bagMap.wrapT = THREE.RepeatWrapping;
  bagMap.repeat.set(3.2, 2.2);
  bagMap.needsUpdate = true;
  ownedTex.push(bagMap);
  const bag = keep(new THREE.MeshStandardMaterial({
    map: bagMap, color: "#191610", metalness: 0, roughness: 1.0,
    envMapIntensity: 0.06, transparent: true, opacity: 0,
  }));

  /* THE DRUM. Canonical brushed finish, tinted — the recipe metal.ts warms
     during idle, so this is a cache hit and costs one material clone. Tinting a
     NEUTRAL-based metal is the documented safe case (see tintMetal); the maps
     are shared, only the clone is per-scene and disposed. */
  const brushed = makeMetal({ ...CANONICAL_BRUSHED });
  /* Tints pulled down a step for the same reason as the bag and the carton —
     these sat in the light-steel band and read as the brightest metal on a page
     whose accent is a pale blue. */
  const drum = keep(tintMetal(brushed.material, "#4E5862", { metalness: 0.6 }));
  const rib = keep(tintMetal(brushed.material, "#39414A", { metalness: 0.7 }));
  drum.transparent = true; drum.opacity = 0;
  rib.transparent = true; rib.opacity = 0;
  /* `brushed` is NOT disposed here — the conveyor frame and rollers further down
     tint the same source. It is disposed once, after the last tintMetal call.
     The MAPS live in metal.ts's cache either way; this material does not. */

  /* THE OPEN DOOR END. buildContainer models a CLOSED door end — a flat steel
     plane with locking rods, cams and a lock box on it. This scene needs a hole,
     so the door plane is re-materialled to a near-black unlit surface and the
     door furniture is hidden (see buildCargo).

     toneMapped:false, and not for the usual signal-graphic reason: this is
     standing in for the ABSENCE of light rather than for a lit surface, and
     letting ACES lift it would give the opening a grey cast — which reads as a
     painted panel, exactly what it must not be. It also has to stay darker than
     the site canvas behind the frame, or the hole reads as a light box.

     `transparent` is set here at construction and only its OPACITY is ever
     ramped. Flipping `transparent` at runtime changes three's program cache key
     and forces a synchronous recompile mid-draw — the seal bug documented at
     length in container-vision/scene.tsx. */
  const voidM = keep(new THREE.MeshBasicMaterial({
    color: "#05070A", transparent: true, opacity: 0, toneMapped: false,
  }));

  /* Run-out markings. Drafting INK, so toneMapped:false — house rule, see
     yard-vision/yard.ts: ACES desaturates a flat graphics colour into mud. */
  const lane = keep(new THREE.LineBasicMaterial({
    color: "#C9D4DE", transparent: true, opacity: 0, toneMapped: false,
  }));
  /* The count line itself. Accent, because it is the machine OBSERVING — the
     page's colour grammar, and the only blue graphic in the scene. */
  const threshold = keep(new THREE.MeshBasicMaterial({
    color: PALETTE.accent, transparent: true, opacity: 0,
    toneMapped: false, depthWrite: false,
  }));

  /* ---- THE PLACE ---------------------------------------------------------

     THE DECK IS OPAQUE AND IT RAMPS ON `color`, NOT ON `opacity`.

     Everything else in this scene fades in by opacity, and the deck deliberately
     does not, for two reasons that both bite. A 120-unit transparent plane sorts
     against the studio's own ShadowMaterial catcher — which sits 8mm above it,
     is also transparent, and writes depth — and the winner of that sort changes
     with camera azimuth. And a transparent floor cannot be the thing a cast
     shadow reads against, which is the entire job. So the deck is opaque, its
     concrete value lives in the VERTEX colours, and `material.color` is driven
     from black to white by the intro ramp. Fading a lit surface to black lands
     on #000 rather than on the canvas #0A0B0E, which at these values is a
     difference nobody can see.

     Authored dark on purpose — #E8EEF6 as a vertex colour times a 0.13 scale is
     roughly #131519 as an albedo, and under the five-source rig with ACES on top
     that renders as the mid-charcoal a concrete apron actually looks like. The
     rule this file already states for the sack applies to floors too: author
     about half the value you want and check the render, never the swatch. */
  const deck = keep(new THREE.MeshStandardMaterial({
    vertexColors: true, color: 0x000000, metalness: 0, roughness: 0.97,
    envMapIntensity: 0.10,
  }));

  /* THE BELT. Rubber, so roughness at the top and metalness at zero — the one
     thing a belt must not do is take a metal highlight, or it reads as a steel
     table. The carcass is a shade darker than the slats so the gaps between the
     slats show as real gaps. */
  const belt = keep(new THREE.MeshStandardMaterial({
    color: "#06080B", metalness: 0.0, roughness: 0.95,
    envMapIntensity: 0.10, transparent: true, opacity: 0,
  }));
  const slat = keep(new THREE.MeshStandardMaterial({
    color: "#1E242C", metalness: 0.08, roughness: 0.82,
    envMapIntensity: 0.16, transparent: true, opacity: 0,
  }));
  /* Frame and rollers are the CANONICAL brushed finish tinted, same cache hit
     as the drum. A conveyor frame is painted steel and the rollers are bare —
     one step apart in value is enough to tell the fabrication from the parts
     that turn. */
  const frame = keep(tintMetal(brushed.material, "#232A32", { metalness: 0.55 }));
  const roller = keep(tintMetal(brushed.material, "#3E464F", { metalness: 0.8 }));
  frame.transparent = true; frame.opacity = 0;
  roller.transparent = true; roller.opacity = 0;

  /* The back row. Three tints so the wall is not one flat mass, all of them
     well down in value: these sit past the fog's near plane and their entire
     job is to say the bay has a depth beyond the subject. Anything brighter
     competes with the cargo, which is the failure hero-cards/ground.ts
     documents at length for the card-sized scenes. */
  const far = ["#101519", "#0C1116", "#141A20"].map((c) => keep(
    new THREE.MeshStandardMaterial({
      color: c, metalness: 0.18, roughness: 0.9,
      envMapIntensity: 0.10, transparent: true, opacity: 0,
    }),
  ));

  /* A SECOND SHADOW CATCHER, ON THE BELT.

     The studio gives every scene one ShadowMaterial plane at `floorY`, and that
     is the whole reason this scene had no shadows: the cargo does not sit on the
     floor any more, it sits 0.62 up on the belt, so every contact shadow the
     stream cast was being caught 0.62 below the thing casting it — under the
     conveyor, where nothing can see it. A ShadowMaterial over the belt's own
     running surface puts the shadow back where the contact is. */
  const beltShadow = keep(new THREE.ShadowMaterial({ opacity: 0 }));

  brushed.dispose();   // last consumer of the canonical finish in this scene

  return {
    cartons, bag, drum, rib, voidM, lane, threshold,
    deck, belt, slat, frame, roller, far, beltShadow, all,
    /* MATERIALS AND SCENE-OWNED TEXTURE CLONES. The kraft board is cached in
       hero-cards/skins and the metal maps in metal.ts — disposing either here
       would leave the next scene sampling a destroyed texture. Same hazard, same
       reasoning, as yard.ts. The clones in ownedTex are ours and nobody else's. */
    dispose: () => {
      all.forEach((m) => m.dispose());
      ownedTex.forEach((t) => t.dispose());
    },
  };
}

export interface CargoItem {
  /** transform carrier — one per item, so the overlay can project a world
      position and a tracker can read a world bounding box for any of the nine. */
  grp: THREE.Group;
  type: ItemType;
  /** the item's own body. EVERY item now has one — see the note on why the
      InstancedMesh went away. */
  mesh: THREE.Mesh;
  /** rest height above the belt, so `advance` can rock the item without
      floating it. */
  restY: number;
}

export interface CargoModel {
  root: THREE.Group;
  items: CargoItem[];
  /** the flagged carton — the one with the collapsed corner */
  flagged: THREE.Mesh;
  /** the container's shell + hardware, so the scene can ramp their opacity */
  container: { shell: THREE.Mesh[]; hardware: THREE.Mesh[]; edges: THREE.LineSegments };
  /** world-space centre of the door opening — the anchor the stream comes from */
  mouth: THREE.Vector3;
  /** The pendant lamp over the belt. Exposed because the reveal ramp sets
      materials by name rather than walking `mats.all`, and because the
      PointLight's intensity has to ramp too — it is the scene's practical
      fill, not decoration. */
  lamp: {
    shade: THREE.MeshStandardMaterial;
    bulb: THREE.MeshBasicMaterial;
    halo: THREE.MeshBasicMaterial;
    beam: THREE.MeshBasicMaterial;
    light: THREE.PointLight;
  };
  /** Advance the stream. `p` is 0..1 through the loop. Pure function of p. */
  advance: (p: number) => void;
  /** geometry this scene OWNS and must dispose. The carton's RoundedBoxGeometry
      is NOT here: metal.ts caches it and the next scene reuses it. */
  owned: THREE.BufferGeometry[];
}

/** Deterministic per-item yaw wobble. A hand-stuffed container never comes out
    square, and `Math.random()` would reshuffle the scene on every page load. */
const wobble = (i: number) => ((i * 37) % 11 - 5) * 0.012;

const s01 = (t: number) => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };

/* ---- WHY THE ITEMS ARE DEFORMED, ONE PASS EACH ---------------------------

   "Very stiff and cartoonish" is a SILHOUETTE complaint before it is a material
   one, and the silhouettes here were a rounded box, a scaled sphere and a
   cylinder — three primitives, drawn at one size each, with a couple of degrees
   of yaw between them. No lighting rig rescues that. Every fix below is one
   loop over a geometry's vertices, runs once at build, and is driven entirely
   from `rnd(seed)` so the result is byte-identical on every load.
--------------------------------------------------------------------------- */

/** Pillow a rounded box into a PACKED case: sides bulge where the contents
    press out, the lid dishes, the whole thing leans a degree or two off square.
    `crushed` collapses one top corner — the finding the damage bracket points
    at, which until now was drawn around a geometrically perfect box. */
function packCarton(
  geo: THREE.BufferGeometry, w: number, h: number, d: number,
  seed: number, crushed: boolean,
) {
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const bulge = 0.030 + 0.026 * rnd(seed);
  const lean = 0.020 * sgn(seed + 11);
  const sag = 0.022 + 0.016 * rnd(seed + 23);
  const hw = w / 2, hh = h / 2, hd = d / 2;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = y / hh;                              // -1 at the base, +1 at the lid
    const s = 1 + bulge * (1 - t * t);             // widest at mid-height
    x *= s; z *= s;
    x += lean * t;                                 // a case never stacks square
    if (t > 0.5) {
      // the lid dishes toward the middle — an empty top corner in a full case
      const r2 = Math.min(1, (x * x) / (hw * hw) + (z * z) / (hd * hd));
      y -= sag * (1 - r2) * s01((t - 0.5) / 0.5);
    }
    if (crushed) {
      /* One corner, collapsed inward. The weight is the product of three
         per-axis falloffs, so it peaks exactly at (+hw, +hh, +hd) and is zero
         by half a box away — a dent, not a taper. */
      const k =
        (1 - Math.min(1, Math.abs(x - hw) / (w * 0.42))) *
        (1 - Math.min(1, Math.abs(y - hh) / (h * 0.52))) *
        (1 - Math.min(1, Math.abs(z - hd) / (d * 0.42)));
      if (k > 0) { x -= 0.17 * k; y -= 0.14 * k; z -= 0.14 * k; }
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();   // or the shading still describes the primitive
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

/** How far a sack's flattened base sits below its own origin, in unit-sphere
    units. Derived from the flatten below, not guessed: y = -1 maps to
    -0.70 + (-1 + 0.70) * 0.22 = -0.766. Anything that places a sack on a
    surface reads this, so the two can never drift apart. */
const SACK_BOTTOM = 0.766;

/** A filled jute sack. NOT a scaled sphere and not a sphere with a flat spot —
    those were the two previous attempts, and both still read as an egg.

    Five things, in this order, and the order matters because each one operates
    on the result of the last:
      1. LUMPS. Three fixed cosine lobes around the axis, so the waist is
         irregular. This is what stops the silhouette being a conic section.
      2. FLATTEN. Below -0.70 the base compresses at a fifth rate — the sack is
         resting on something, and a resting sack has a footprint.
      3. SLUMP. The lower half widens by up to 26%, where the contents have
         settled. Bulging LOW is what makes it read as heavy.
      4. NECK. Above 0.42 the section pinches to under a third and stretches
         upward: the gathered, tied ear. Every real gunny bag has one and it is
         the single most identifiable thing about the silhouette.
      5. DROOP. A one-sided shoulder sag, phase set from the seed, so no two
         sacks slump toward the same side. */
function sackGeometry(seed: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 22, 16);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const ph1 = rnd(seed) * Math.PI * 2;
  const ph2 = rnd(seed + 7) * Math.PI * 2;
  const ph3 = rnd(seed + 13) * Math.PI * 2;
  const droopDir = rnd(seed + 29) * Math.PI * 2;
  for (let i = 0; i < pos.count; i++) {
    const x0 = pos.getX(i), y0 = pos.getY(i), z0 = pos.getZ(i);
    const th = Math.atan2(z0, x0);

    const lump =
      1
      + 0.090 * Math.cos(3 * th + ph1) * (1 - y0 * y0)
      + 0.055 * Math.cos(5 * th + ph2) * (0.60 + 0.40 * y0)
      + 0.045 * Math.cos(2 * th + ph3);

    let y = y0 < -0.70 ? -0.70 + (y0 + 0.70) * 0.22 : y0;
    const slump = 1 + 0.26 * Math.pow(Math.max(0, -y), 1.3);
    const neckT = s01((y - 0.42) / 0.58);
    const neck = 1 - 0.74 * neckT;
    if (y > 0.42) y = 0.42 + (y - 0.42) * 1.38;   // stretch the tied ear up

    const k = lump * slump * neck;
    const droop = 0.11 * Math.max(0, y) * Math.cos(th - droopDir);
    pos.setXYZ(i, x0 * k + droop * 0.4, y - Math.max(0, droop), z0 * k);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

export function buildCargo(m: CargoMaterials, cmats: MaterialSet): CargoModel {
  const root = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  /* ---- the container ---------------------------------------------------- */
  const build = buildContainer(cmats.steel, cmats.dark, cmats.front.material);
  build.group.position.copy(CONT_POS);
  build.group.rotation.y = CONT_YAW;
  root.add(build.group);

  /* Open the doors.

     The door-end PANEL is the one shell mesh sitting at local x = +L/2; every
     other shell panel is at a smaller x. Identified by position rather than by
     index into `shell`, because an index into another module's array is exactly
     the kind of coupling that breaks silently when that module gains a panel. */
  const hx = C_L / 2;
  for (const s of build.shell) {
    if (Math.abs(s.position.x - hx) < 0.01) {
      s.material = m.voidM;
      s.castShadow = false;    // a hole does not cast one
      s.receiveShadow = false;
    }
  }
  /* And hide the door FURNITURE — locking rods, handle cams, hinge pins, lock
     box. Same positional test: all of it is mounted PROUD of the door plane at
     x = hx + 0.02..0.04, while the corner castings and forklift pockets sit at
     x <= hx - 0.05. So `position.x > hx` selects exactly the parts that say
     "this door is shut" and nothing else. */
  for (const hw of build.hardware) hw.visible = hw.position.x <= hx;

  /* The mouth, in world space. Local (hx, 0, 0) through the yaw. */
  const mouth = new THREE.Vector3(hx, 0, 0)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), CONT_YAW)
    .add(CONT_POS);

  /* ---- THE DECK -----------------------------------------------------------

     A REAL, LIT, OPAQUE FLOOR. What was here before was a drafting grid at 10%
     over the bare cyclorama, which is the exact failure DECISIONS.md already
     records once: a hairline grid over nothing is not a floor. It is also why
     this scene had no shadows — the studio's ShadowMaterial catcher darkens
     whatever is BEHIND it, and behind it was #0A0B0E. A shadow on black is
     black.

     120 units square and it does not need an edge treatment, because
     scene.fog dissolves it long before it ends (see scene.tsx). At the camera's
     18-degree elevation the true horizon sits 3 degrees ABOVE the top of frame,
     so the deck runs off the top edge and the only thing the viewer ever sees
     is the haze. `receiveShadow` on top of the studio catcher is deliberate:
     the catcher supplies a hard contact shadow, the lit surface supplies the
     soft falloff, and together they read as one shadow rather than as a decal.

     THE MOTTLE IS A VERTEX-COLOUR MULTIPLIER AROUND 1.0, NOT A COLOUR. Vertex
     colours are raw linear multipliers on `material.color`, with no sRGB
     conversion applied — so authoring the concrete's VALUE here would mean
     hand-converting it, and getting that wrong is how a floor ends up eight
     times too dark (see the colorspace note in studio.ts). Value lives in
     `material.color`, which is set from a hex and is colour-managed; this array
     only says "this patch is 12% lighter than that one". */
  const DECK_SEG = 48;
  const deckGeo = new THREE.PlaneGeometry(120, 120, DECK_SEG, DECK_SEG);
  {
    const n = (DECK_SEG + 1) * (DECK_SEG + 1);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ix = i % (DECK_SEG + 1), iy = (i / (DECK_SEG + 1)) | 0;
      // one tight hash plus one broad one: pitting on top of pour patches
      const fine = 0.86 + 0.28 * rnd(ix * 131 + iy * 977);
      const broad = 0.92 + 0.16 * rnd(((ix / 6) | 0) * 31 + ((iy / 6) | 0) * 17 + 5);
      const v = fine * broad;
      col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v;
    }
    deckGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  owned.push(deckGeo);
  const deck = new THREE.Mesh(deckGeo, m.deck);
  deck.rotation.x = -Math.PI / 2;
  /* EXACTLY GROUND, and the studio's shadow catcher is what moved instead.

     The first arrangement put the deck 8mm BELOW GROUND to clear the catcher,
     which meant every object resting at GROUND — all ten staged items, the
     conveyor's four leg bents and their foot pads — floated 8mm over the only
     surface a viewer can actually see. The catcher is a plane the studio places
     at `floorY`, and `floorY` is a scene's to choose: scene.tsx now asks for
     GROUND + 0.004, so the catcher sits 4mm ABOVE the deck instead and every
     bottom in this file lands on the floor to the millimetre. 4mm is ~7x the
     depth buffer's resolution at the far corner of the catcher, so it does not
     z-fight either. */
  deck.position.y = GROUND;
  deck.receiveShadow = true;
  deck.renderOrder = -2;
  root.add(deck);

  /* ---- THE BACK ROW -------------------------------------------------------
     Five containers, two tiers, 9-11 units behind the bay. Not scenery for its
     own sake: the complaint was "no environment", and what an environment does
     here is give the fog something to act ON. An empty haze is still an empty
     frame. They are dim, they never cast (they are outside the shadow camera's
     10-unit extent anyway) and they are built from metalBox's shared cache. */
  const FAR_ROW: [number, number, number, number][] = [
    // x, y-tier, z, tint index
    [-7.4, 0, -9.7, 0], [0.2, 0, -10.5, 1], [7.8, 0, -9.9, 2],
    [-7.4, 1, -9.7, 2], [0.2, 1, -10.5, 0],
  ];
  for (let i = 0; i < FAR_ROW.length; i++) {
    const [fx, tier, fz, ti] = FAR_ROW[i];
    const box = metalBox(C_L, C_H, 2.438, m.far[ti]);
    box.position.set(fx, GROUND + C_H / 2 + tier * (C_H + 0.02), fz);
    box.rotation.y = sgn(i + 91) * 0.035;
    box.castShadow = false;
    box.receiveShadow = false;
    root.add(box);
  }

  /* ---- THE CONVEYOR -------------------------------------------------------
     See the block at the top of this file for what each part is for. Built
     bottom-up so the arithmetic is checkable in reading order. */
  const belt = new THREE.Group();
  root.add(belt);

  // carcass — the belt's body. Its top sits SLAT_T below the running height,
  // so the slats laid on it are the surface and the gaps show carcass.
  const carcass = metalBox(BELT_LEN, 0.11, BELT_SURF_W + 0.08, m.belt, 0.012);
  carcass.position.set(BELT_CX, BELT_TOP - SLAT_T - 0.055, 0);
  carcass.castShadow = true;
  carcass.receiveShadow = true;
  belt.add(carcass);

  // side channels — the fabricated frame, standing 0.055 proud of the running
  // surface so they read as a lip that keeps cargo on the belt
  /* FLUSH WITH THE RUNNING SURFACE, not proud of it. The first pass stood the
     channels 0.055 above the slats to read as a retaining lip, and at an 18-
     degree camera that lip is nearly edge-on: the near channel occluded most of
     the belt's own top face, so the slats — the only thing on this machine that
     moves — were hidden behind the frame that was supposed to frame them. Top
     at exactly BELT_TOP opens the whole surface to the lens. */
  for (const sz of [-1, 1]) {
    const ch = metalBox(BELT_LEN, 0.22, 0.085, m.frame, 0.012);
    ch.position.set(BELT_CX, BELT_TOP - 0.11, sz * FRAME_Z);
    ch.castShadow = true;
    ch.receiveShadow = true;
    belt.add(ch);
  }

  /* leg bents. Top at BELT_TOP - 0.126 (the carcass underside), foot at
     GROUND, so height = (BELT_TOP - 0.126) - GROUND = 0.494 and the centre is
     the midpoint of those two, -0.303. Nothing here is eyeballed: if BELT_TOP
     moves, both numbers follow it. */
  const LEG_TOP = BELT_TOP - 0.126;
  const LEG_H = LEG_TOP - GROUND;
  const LEG_CY = (LEG_TOP + GROUND) / 2;
  for (let i = 0; i < LEG_X.length; i++) {
    for (const sz of [-1, 1]) {
      const leg = metalBox(0.085, LEG_H, 0.085, m.frame, 0.010);
      leg.position.set(LEG_X[i], LEG_CY, sz * LEG_Z);
      leg.castShadow = true;
      belt.add(leg);
      const pad = metalBox(0.20, 0.022, 0.20, m.frame, 0.006);
      pad.position.set(LEG_X[i], GROUND + 0.011, sz * LEG_Z);
      pad.receiveShadow = true;
      belt.add(pad);
    }
    const brace = metalBox(0.055, 0.055, LEG_Z * 2 - 0.085, m.frame, 0.010);
    brace.position.set(LEG_X[i], GROUND + 0.16, 0);
    belt.add(brace);
  }

  /* head and tail rollers. r = 0.10 with the axle at BELT_TOP - 0.10 puts the
     crown exactly at the running height, which is where a belt actually turns
     over its pulley. */
  const rollerGeo = new THREE.CylinderGeometry(0.10, 0.10, BELT_SURF_W + 0.06, 18);
  owned.push(rollerGeo);
  for (const rx of [BELT_X0 - 0.02, BELT_X1 + 0.02]) {
    const r = new THREE.Mesh(rollerGeo, m.roller);
    r.rotation.x = Math.PI / 2;
    r.position.set(rx, BELT_TOP - 0.10, 0);
    r.castShadow = true;
    belt.add(r);
  }

  // return idlers, and the return strand hanging on them
  const idlerGeo = new THREE.CylinderGeometry(0.06, 0.06, BELT_SURF_W - 0.06, 12);
  owned.push(idlerGeo);
  for (const rx of [-2.0, 0.2, 2.4, 4.6, 6.4]) {
    const r = new THREE.Mesh(idlerGeo, m.roller);
    r.rotation.x = Math.PI / 2;
    r.position.set(rx, BELT_TOP - 0.40, 0);
    belt.add(r);
  }
  const ret = metalBox(BELT_LEN - 0.2, 0.018, BELT_SURF_W - 0.10, m.belt, 0.006);
  ret.position.set(BELT_CX, BELT_TOP - 0.331, 0);
  belt.add(ret);

  // the drive at the head end — a motor and a gearbox, the cue that says the
  // belt is powered rather than a slide
  const motor = metalBox(0.42, 0.34, 0.30, m.frame, 0.03);
  motor.position.set(BELT_X1 - 0.45, BELT_TOP - 0.30, FRAME_Z + 0.24);
  motor.castShadow = true;
  belt.add(motor);
  const gearGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.22, 14);
  owned.push(gearGeo);
  const gear = new THREE.Mesh(gearGeo, m.roller);
  gear.rotation.z = Math.PI / 2;
  gear.position.set(BELT_X1 - 0.12, BELT_TOP - 0.30, FRAME_Z + 0.24);
  belt.add(gear);

  /* ---- THE PENDANT LAMP -------------------------------------------------
     A shop light on a long drop over the belt. It exists for two reasons at
     once, and that is the point of it: the scene read too dark, and a bare
     lift in an unlit void has nothing explaining WHY the working surface is
     the brightest thing in frame. A practical light answers both — the fill
     it throws is motivated by an object you can see.

     Hung from y = 4.6, well above the top of frame, so the wire runs out of
     shot the way a real drop does rather than starting at a visible ceiling
     that does not exist. Shade at 2.05 clears the tallest staged item and
     still sits low enough to read as "over the belt" rather than as a
     streetlight. Centred on the belt's own midpoint so it is obviously
     lighting this machine and not the yard.

     The cone is OPEN-ENDED and DoubleSide: a closed shade seen from slightly
     below shows its cap and reads as a solid lump. Bulb is a small emissive
     sphere just inside the mouth — toneMapped false so ACES cannot pull the
     filament grey, the same rule every signal graphic in this repo follows.

     The PointLight is what actually brightens the scene. Distance-limited so
     it falls off before it reaches the back row and flattens the fog
     gradient the depth read depends on. */
  /* OVER THE BELT'S CENTRELINE, AND LOWER. At Z = FRAME_Z - 0.15 the lamp
     hung over the near side channel rather than over the running surface, so
     the brightest part of its pool fell on the frame and the deck beside it —
     which is why it read as a light hanging next to the conveyor instead of
     lighting it. Z = 0.10 is the belt's own centreline.

     2.05 -> 1.70 drops it 0.35: the tallest staged item is the 0.82 drum
     topping out at BELT_TOP + 0.82 = 0.87, so there is still 0.83 of
     clearance, and halving the drop distance to the surface quadruples the
     illuminance there at decay 2. */
  const LAMP_X = BELT_CX + 0.6;
  const LAMP_Y = 1.70;
  const LAMP_Z = 0.10;

  const wireGeo = new THREE.CylinderGeometry(0.012, 0.012, 4.6 - LAMP_Y, 6);
  owned.push(wireGeo);
  const wire = new THREE.Mesh(wireGeo, m.frame);
  wire.position.set(LAMP_X, (4.6 + LAMP_Y) / 2, LAMP_Z);
  belt.add(wire);

  const shadeGeo = new THREE.ConeGeometry(0.30, 0.34, 20, 1, true);
  owned.push(shadeGeo);
  const shadeMat = new THREE.MeshStandardMaterial({
    color: "#3B424C", metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide,
    transparent: true, opacity: 0,
  });
  m.all.push(shadeMat);
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.set(LAMP_X, LAMP_Y, LAMP_Z);
  shade.castShadow = true;
  belt.add(shade);

  /* THE BULB IS LIT, NOT DECORATIVE. It was a small pale sphere with a
     point light too weak to survive the five-source rig: at decay 2 and
     intensity 3.4, the belt 1.6 units below was receiving 3.4/1.6² = 1.3,
     which is under the ambient it was competing with, so the lamp hung there
     unlit. 14 gives 5.5 at the running surface — a clear warm pool under the
     shade that falls off before it reaches the back row and flattens the fog.

     The filament sphere is bigger (0.11) and pushed to a true hot white so it
     reads as the SOURCE of that pool rather than as a bead hanging in it. A
     second, wider sphere at 0.22 in a dim warm carries the halo: bloom picks
     up the inner one and the outer one gives the glow a body, which is what
     an incandescent under a shade actually looks like. Both toneMapped false
     — ACES would pull a filament grey, the standing rule for every emissive
     graphic in this repo. */
  const bulbGeo = new THREE.SphereGeometry(0.11, 14, 12);
  owned.push(bulbGeo);
  const bulbMat = new THREE.MeshBasicMaterial({
    color: "#FFF3D8", toneMapped: false, transparent: true, opacity: 0,
  });
  m.all.push(bulbMat);
  /* BELOW THE RIM, NOT INSIDE IT. The shade is a 0.34-tall cone centred on
     LAMP_Y with its wide end DOWN, so its mouth is at LAMP_Y - 0.17. A bulb at
     LAMP_Y - 0.14 sat 0.03 ABOVE that mouth, i.e. up inside the shade, where
     an 18-degree camera looking slightly down sees almost none of it — which
     is why the lamp lit the cargo correctly and still did not look lit itself.
     LAMP_Y - 0.21 hangs it 0.04 proud of the rim: fully visible, and still
     close enough to the shade to read as being in it. */
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(LAMP_X, LAMP_Y - 0.21, LAMP_Z);
  belt.add(bulb);

  const haloGeo = new THREE.SphereGeometry(0.30, 14, 12);
  owned.push(haloGeo);
  const haloMat = new THREE.MeshBasicMaterial({
    color: "#FFCD7A", toneMapped: false,
    transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  m.all.push(haloMat);
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.position.copy(bulb.position);
  belt.add(halo);

  /* THE BEAM. A hollow cone of additive warm hanging from the bulb down to
     the running surface — the light you can SEE, as opposed to the light that
     is doing the work.

     This is not a volumetric solve and does not pretend to be. It is the same
     trick createSightCone uses two files over: an open-ended cone, additive,
     no depth write, at an opacity low enough that it tints rather than
     occludes. A destuff bay is a dusty room and a shop light in one has a
     visible shaft; without it the pool on the cargo has no stated cause and
     the lamp reads as a prop that happens to hang near a bright patch.

     Geometry: apex at the bulb, base on the belt. Height = bulb height above
     BELT_TOP = (LAMP_Y - 0.21) - BELT_TOP, and the base radius is 0.85 —
     a ~30-degree half-angle, which is roughly what a 0.30 shade at this drop
     actually throws.

     NOTHING HERE PULSES. The scene's standing rule after the strobe was
     reverted: no repeating brightness cycle anywhere. The beam ramps once
     with the intro and then holds. */
  const BEAM_H = (LAMP_Y - 0.21) - BELT_TOP;
  const beamGeo = new THREE.ConeGeometry(0.85, BEAM_H, 24, 1, true);
  owned.push(beamGeo);
  const beamMat = new THREE.MeshBasicMaterial({
    color: "#FFB863", toneMapped: false, transparent: true, opacity: 0,
    depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
  m.all.push(beamMat);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(LAMP_X, BELT_TOP + BEAM_H / 2, LAMP_Z);
  belt.add(beam);

  const lampLight = new THREE.PointLight("#FFD9A0", 0, 9.5, 2);
  lampLight.position.set(LAMP_X, LAMP_Y - 0.20, LAMP_Z);
  belt.add(lampLight);

  /* THE SLATS — the running surface, and the only thing on this belt that
     moves. A featureless belt under featureless cargo has nothing for the eye
     to track, so a viewer cannot tell the belt is running at all; the whole
     "it does not look like a conveyor" note comes down to this. Instanced,
     DynamicDrawUsage, matrices written in `advance`. castShadow OFF — a 16mm
     slat casting onto the catcher 4mm above it is shadow acne, not detail. */
  const slatGeo = new THREE.BoxGeometry(SLAT_W, SLAT_T, BELT_SURF_W);
  owned.push(slatGeo);
  const slats = new THREE.InstancedMesh(slatGeo, m.slat, SLAT_N);
  slats.castShadow = false;
  slats.receiveShadow = true;
  slats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  belt.add(slats);

  /* THE BELT'S OWN SHADOW CATCHER — see the material's note. Without this the
     cargo's contact shadow is caught 0.62 below the cargo, under the machine. */
  const bsGeo = new THREE.PlaneGeometry(BELT_LEN, BELT_SURF_W + 0.04);
  owned.push(bsGeo);
  const beltShadow = new THREE.Mesh(bsGeo, m.beltShadow);
  beltShadow.rotation.x = -Math.PI / 2;
  beltShadow.position.set(BELT_CX, BELT_TOP + 0.004, 0);
  beltShadow.receiveShadow = true;
  belt.add(beltShadow);

  /* ---- the count station --------------------------------------------------
     The threshold now sits ON THE BELT, because that is where the crossing
     happens. The old version painted it on the deck 0.62 below the cargo, so
     the number incremented against a line nothing ever touched.

     The two lane rules that used to run down the deck are gone: the belt's own
     side channels are the lane now, and two rulings at similar strength beat
     into moire — the mistake yard-vision documents. `lane` is spent instead on
     a pair of registration ticks either side of the count line, which is what
     the drafting language actually has to say here. */
  const thrGeo = new THREE.PlaneGeometry(0.09, BELT_SURF_W);
  owned.push(thrGeo);
  const threshold = new THREE.Mesh(thrGeo, m.threshold);
  threshold.rotation.x = -Math.PI / 2;
  threshold.position.set(THRESHOLD_X, BELT_TOP + 0.010, 0);
  root.add(threshold);

  /* ON THE DECK, LYING FLAT — not standing in the air beside the belt.

     The first version put these at belt height with 0.26 vertical risers, which
     on screen was a small pale wedge hanging off the belt's near edge at the
     count station. It read as a stray artefact rather than as a mark, for the
     reason a drafting tick always fails when it leaves the surface it is
     measuring: a registration mark belongs ON the thing, and anything floating
     beside a machine is read as part of the machine and then found to be
     nothing. Flat on the deck at the count-station station line, running
     outward from under the conveyor, they read as painted floor marking. */
  const TICK_Y = GROUND + 0.010;
  const laneGeo = new THREE.BufferGeometry();
  laneGeo.setAttribute("position", new THREE.Float32BufferAttribute([
    THRESHOLD_X, TICK_Y, FRAME_Z + 0.20, THRESHOLD_X, TICK_Y, FRAME_Z + 0.95,
    THRESHOLD_X, TICK_Y, -FRAME_Z - 0.20, THRESHOLD_X, TICK_Y, -FRAME_Z - 0.95,
    THRESHOLD_X - 0.22, TICK_Y, FRAME_Z + 0.95, THRESHOLD_X + 0.22, TICK_Y, FRAME_Z + 0.95,
    THRESHOLD_X - 0.22, TICK_Y, -FRAME_Z - 0.95, THRESHOLD_X + 0.22, TICK_Y, -FRAME_Z - 0.95,
  ], 3));
  owned.push(laneGeo);
  root.add(new THREE.LineSegments(laneGeo, m.lane));

  /* ---- item geometry -----------------------------------------------------

     THESE ARE CLONES, AND THAT IS A DELIBERATE STEP AWAY FROM THE CACHE.
     metalBox hands out metal.ts's SHARED RoundedBoxGeometry, which is exactly
     right when a scene wants forty identical boxes and completely wrong when
     the problem is that every box is identical. Cloning gives this scene a
     geometry it owns and may deform; the clone is pushed into `owned` and
     disposed, and the cached original is never touched. Three cartons plus one
     crushed variant plus three sacks is seven small buffers — against 96 in the
     Data card, which is the count that made the cache worth having. */
  const cartonGeos = CARTONS.map((c, k) => {
    const g = metalBox(c.w, c.h, c.d, m.cartons[0]).geometry.clone();
    packCarton(g, c.w, c.h, c.d, k * 17 + 3, false);
    owned.push(g);
    return g;
  });
  /* The flagged case: variant 0, with one top corner collapsed. Until now the
     damage bracket was drawn around a geometrically perfect box and the callout
     claimed a crushed corner that did not exist anywhere in the scene. */
  const crushedGeo = metalBox(CARTONS[0].w, CARTONS[0].h, CARTONS[0].d, m.cartons[0]).geometry.clone();
  packCarton(crushedGeo, CARTONS[0].w, CARTONS[0].h, CARTONS[0].d, 3, true);
  owned.push(crushedGeo);

  /* Three sacks, three different lump phases and droop directions. Nine bags
     cut from one mesh is the same failure as nine identical cartons. */
  const bagGeos = [0, 1, 2].map((k) => {
    const g = sackGeometry(k * 29 + 5);
    owned.push(g);
    return g;
  });
  const BAG_BOTTOM = SACK_BOTTOM * BAG.sy;   // 0.322 below the sack's origin

  /* DRUM — upright cylinder, two rolling hoops, a rolled rim top and bottom and
     a bung on the lid. The hoops were already here and they are what stop a
     cylinder reading as a bollard; the rims and the bung are new, and they are
     what stop the ENDS reading as a cylinder's flat caps. A 205-litre drum is
     identified by its hoops long before its proportions register, and by its
     chimes immediately after. */
  const drumGeo = new THREE.CylinderGeometry(DRUM.r, DRUM.r, DRUM.h, 24);
  owned.push(drumGeo);
  const ribGeo = new THREE.TorusGeometry(DRUM.r + 0.005, 0.022, 6, 24);
  owned.push(ribGeo);
  const rimGeo = new THREE.CylinderGeometry(DRUM.r + 0.026, DRUM.r + 0.026, 0.055, 24);
  owned.push(rimGeo);
  const bungGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.028, 10);
  owned.push(bungGeo);

  /** One drum, built the same way wherever it stands. */
  const makeDrum = (g: THREE.Group) => {
    const body = new THREE.Mesh(drumGeo, m.drum);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    for (const ry of [-0.22, 0.22]) {
      const hoop = new THREE.Mesh(ribGeo, m.rib);
      hoop.rotation.x = -Math.PI / 2;
      hoop.position.y = ry;
      g.add(hoop);
    }
    /* 0.0285, not 0.026. The rim is 0.055 deep, so its half-height is 0.0275 —
       at 0.026 the lower chime hangs 1.5mm BELOW the drum's own base and the
       drum stands on its rim instead of its floor. Small, and exactly the class
       of thing the bottom-vs-floor sweep exists to catch. */
    for (const ry of [-DRUM.h / 2 + 0.0285, DRUM.h / 2 - 0.0285]) {
      const rim = new THREE.Mesh(rimGeo, m.rib);
      rim.position.y = ry;
      rim.castShadow = true;
      g.add(rim);
    }
    const bung = new THREE.Mesh(bungGeo, m.rib);
    bung.position.set(DRUM.r * 0.52, DRUM.h / 2 + 0.006, DRUM.r * 0.18);
    g.add(bung);
    return body;
  };

  /* ---- the stream --------------------------------------------------------

     THE CARTONS ARE NO LONGER INSTANCED, and dropping that is the point rather
     than a regression. The InstancedMesh existed to draw three identical
     cartons in one call, and "identical" is precisely the defect being fixed —
     three sizes cannot share an instance buffer, and three InstancedMeshes of
     one instance each is strictly worse than three Meshes. yard.ts's 55
     containers are the case that justifies the idiom; four cartons are not.
     It also removes the carve-out that existed only so ONE carton could have a
     world bounding box: now every item has one, so every item can be tracked. */
  const items: CargoItem[] = [];
  let flagged: THREE.Mesh | null = null;

  /* Which geometry each stream slot uses. Fixed table, walked in order, so
     neighbours never share a variant — a run of two identical cases is the one
     thing that undoes all of the above. */
  const CARTON_PICK = [0, 1, 2, 0, 1, 2, 0, 1, 2];
  const BAG_PICK = [0, 1, 2, 0, 1, 2, 0, 1, 2];

  for (let i = 0; i < ITEM_N; i++) {
    const type = SEQUENCE[i];
    const grp = new THREE.Group();
    grp.rotation.y = wobble(i);
    let mesh: THREE.Mesh;
    let restY: number;

    if (type === "carton") {
      const vi = CARTON_PICK[i];
      const c = CARTONS[i === FLAGGED ? 0 : vi];
      restY = BELT_TOP + c.h / 2;
      mesh = new THREE.Mesh(i === FLAGGED ? crushedGeo : cartonGeos[vi], m.cartons[vi]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
      if (i === FLAGGED) flagged = mesh;
    } else if (type === "gunny") {
      restY = BELT_TOP + BAG_BOTTOM;
      mesh = new THREE.Mesh(bagGeos[BAG_PICK[i]], m.bag);
      /* Per-sack scale as well as per-sack mesh: a sack is a size as much as a
         shape, and three meshes at one scale still read as three copies.
         THE Y SCALE IS NOT TOUCHED. BAG_BOTTOM is SACK_BOTTOM * BAG.sy, and
         every rest height in this file derives from it — varying sy per item
         would float or sink each sack by up to 5% of 0.322, which is 16mm of
         gap under a bag that is supposed to be sitting on a belt. Width and
         depth are free; height is load-bearing. */
      const k = 0.90 + 0.20 * rnd(i + 61);
      mesh.scale.set(BAG.sx * k, BAG.sy, BAG.sz * (1.9 - k));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grp.add(mesh);
    } else {
      restY = BELT_TOP + DRUM.h / 2;
      mesh = makeDrum(grp);
    }

    grp.position.y = restY;
    root.add(grp);
    items.push({ grp, type, mesh, restY });
  }

  if (!flagged) throw new Error("[cargo-vision] FLAGGED index is not a carton");

  /* ---- staged cargo -------------------------------------------------------
     Same construction as the stream loop above, minus the group-per-item
     indirection: nothing here is ever repositioned, so there is no `advance`
     to feed and no need for a transform carrier. Wobble uses `i + ITEM_N` so
     the staged pile's angles never repeat the stream's own sequence. Staged
     stock stands on the DECK, not on the belt — it has already come off. */
  for (let i = 0; i < STAGE.length; i++) {
    const s = STAGE[i];
    const yaw = wobble(i + ITEM_N) + sgn(i + 41) * 0.16;
    const vi = i % 3;
    if (s.type === "carton") {
      const c = CARTONS[vi];
      const mesh = new THREE.Mesh(cartonGeos[vi], m.cartons[(i + 1) % 3]);
      mesh.position.set(s.x, GROUND + c.h / 2, s.z);
      mesh.rotation.y = yaw;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    } else if (s.type === "gunny") {
      const mesh = new THREE.Mesh(bagGeos[vi], m.bag);
      mesh.position.set(s.x, GROUND + BAG_BOTTOM, s.z);
      mesh.rotation.y = yaw;
      const k = 0.90 + 0.20 * rnd(i + 137);
      mesh.scale.set(BAG.sx * k, BAG.sy, BAG.sz * k);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
    } else {
      const grp = new THREE.Group();
      grp.position.set(s.x, GROUND + DRUM.h / 2, s.z);
      grp.rotation.y = yaw;
      makeDrum(grp);
      root.add(grp);
    }
  }

  /* ---- advance ------------------------------------------------------------
     The factory-belt idiom, verbatim: travel is p * SPAN and the wrap is a
     `while` subtracting SPAN. Every item's x is a pure function of p, so the
     stream is periodic by construction and holds under `?phase` pinning.

     EVERYTHING ADDED HERE IS ALSO A PURE FUNCTION OF x, WHICH IS A PURE
     FUNCTION OF p. The rock, the bob and the yaw drift are driven off the
     item's own position rather than off elapsed time, so a pinned phase gives a
     pinned pose and the loop still closes exactly at the wrap — an item reborn
     at -SPAN/2 arrives with precisely the attitude its upstream neighbour had.
     Time-driven wobble would break both of those and is the obvious thing to
     reach for; it is why this is spelled out. */
  const mat4 = new THREE.Matrix4();
  const sPos = new THREE.Vector3();
  const sQuat = new THREE.Quaternion();
  const sScale = new THREE.Vector3(1, 1, 1);
  const sZero = new THREE.Vector3(0, 0, 0);
  /* How much each type moves. A sack is soft and heavy and settles visibly; a
     drum is a steel cylinder standing on its base and barely moves. Handing all
     three the same amplitude is what made the previous stream read as one rigid
     rail of objects. */
  const ROCK: Record<ItemType, number> = { carton: 1.0, gunny: 1.5, drum: 0.45 };

  const advance = (p: number) => {
    const travel = p * SPAN;
    for (let i = 0; i < ITEM_N; i++) {
      let x = -SPAN / 2 + i * PITCH + travel;
      while (x > SPAN / 2) x -= SPAN;
      const it = items[i];
      const g = it.grp;
      const ph = i * 1.97;
      const a = ROCK[it.type];
      g.position.x = x;
      /* THE BOB ONLY EVER GOES DOWN. (sin - 1) / 2 maps to [-1, 0], so an item
         settles INTO the belt by up to 7mm and never lifts off it. A symmetric
         bob would put a visible gap under a case for half of every cycle, which
         is the one artefact that reads worse than no motion at all. */
      g.position.y = it.restY + a * 0.007 * (Math.sin(x * 3.1 + ph) - 1) * 0.5;
      g.rotation.z = a * 0.017 * Math.sin(x * 2.3 + ph);
      g.rotation.x = a * 0.013 * Math.sin(x * 1.7 + ph * 0.7);
      g.rotation.y = wobble(i) + a * 0.022 * Math.sin(x * 1.3 + ph * 1.4);
    }

    /* THE SLATS. One offset for all of them — the belt is rigid, so every slat
       shares the same phase. `travel % SLAT_PITCH` is the whole animation: the
       row shifts by up to one pitch and then the next slat takes over, so the
       surface runs continuously and the geometry never accumulates. Slats that
       fall off either end are collapsed to zero scale rather than culled, which
       keeps the instance count fixed and the buffer contiguous. */
    const off = ((travel % SLAT_PITCH) + SLAT_PITCH) % SLAT_PITCH;
    for (let k = 0; k < SLAT_N; k++) {
      const sx = BELT_X0 - SLAT_PITCH + k * SLAT_PITCH + off;
      const on = sx >= BELT_X0 && sx <= BELT_X1;
      sPos.set(sx, BELT_TOP - SLAT_T / 2, 0);
      mat4.compose(sPos, sQuat, on ? sScale : sZero);
      slats.setMatrixAt(k, mat4);
    }
    slats.instanceMatrix.needsUpdate = true;

    root.updateMatrixWorld(true);
  };

  return {
    root,
    items,
    flagged,
    container: { shell: build.shell, hardware: build.hardware, edges: build.edges },
    mouth,
    /* Exposed because the reveal ramp in scene.tsx sets every material BY NAME
       rather than walking mats.all — a lamp pushed into mats.all alone would
       sit at opacity 0 forever, and its PointLight starts at intensity 0 for
       the same reason. Both have to be driven with `solid`. */
    lamp: { shade: shadeMat, bulb: bulbMat, halo: haloMat, beam: beamMat, light: lampLight },
    advance,
    owned,
  };
}

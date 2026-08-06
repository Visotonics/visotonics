/* ---------------------------------------------------------------------------
   Work Vision — the subject: one worker, three pole cameras, one aisle.

   The section's claim is about people, not cargo: "Nobody stops. Nobody even
   notices." / "No cards to tap, no scanners to use, no habit to change." /
   "Entry and exit written to the second, without a checkpoint." So the subject
   is a person walking, and the only thing that happens to them is that they are
   SEEN — three times, from three angles, resolving to one identity.

   Layout (metres, ground at GROUND_Y = 0):
     · the walker travels along +X at constant speed, in PROFILE to the camera.
     · three fixed pole cameras stand behind the aisle at z = POLE_Z, heads at
       y = HEAD_Y, each raked down at a point on the walk path.
     · nothing is modelled below the feet — no road plane. The projected shadow
       is the ground, same house rule as every vision scene.

   WHY EVERYTHING HERE IS PLAIN PRIMITIVE GEOMETRY AND NOT `metalBox`.
   metal.ts's `metalBox` caches its RoundedBoxGeometry in a module map that is
   shared across every scene on the page and deliberately never disposed. This
   module owns and disposes its own geometry (see `owned` / `dispose`), and a
   disposed shared buffer leaves the NEXT scene drawing nothing. So: plain
   Box/Capsule/Cylinder/Sphere throughout, all of it ours, all of it disposed.

   (Worth flagging, though it is not this file's to fix: `createStudio.dispose`
   traverses the whole scene and disposes every mesh geometry it finds, which
   means the scenes that DO use metalBox are already disposing the shared cache
   on teardown. This module simply refuses to add to that problem.)
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { lerp } from "../_vision/camera";
import { makeMetal } from "../_vision/metal";

/** Floor height. Zero, deliberately: every vertical number in this file is then
    also a height above ground, and the framing arithmetic in scene.tsx reads
    without a constant offset in it. */
export const GROUND_Y = 0;

/* ---- the run ------------------------------------------------------------
   Constant speed. "Nobody stops" is the claim, and ANY easing — even an
   ease-out at the frame edge — reads as hesitation, which is the one thing this
   scene must not say. Linear, both ends off screen.

   14.4 units across a 9.0s loop is 1.6 m/s, and at STEP_HZ = 1.05 that is a
   1.52 m stride: a brisk but entirely ordinary walking pace, which is what
   keeps the feet from visibly skating. */
/* +-5.2, DOWN FROM +-7.2. The original run was 14.4 units through a frame only
   7.16 wide, so the walker was on screen for just p 0.237..0.802 — 44% of the
   loop was an empty aisle, and a scene whose entire claim is "nobody stops"
   cannot afford to spend nearly half its life with nobody in it.

   ARITHMETIC. walkerX(p) = -5.2 + 10.4p; the figure's half-extent along X is
   0.494 (a leg capsule of radius 0.078 on a 0.716 limb swung 0.62 rad reaches
   0.416 ahead of the hip). Visible X at the walk line is -3.300..+3.858.
     enters: x + 0.494 > -3.300  ->  p > 0.135
     exits:  x - 0.494 < +3.858  ->  p < 0.918
   So the walker is in shot for 78% of the loop, and still fully clear of frame
   at both ends — 1.41 units of margin at p=0, 0.85 at p=1 — which is what keeps
   the wrap invisible. */
export const WALK_FROM = -5.2;
export const WALK_TO = 5.2;
export const walkerX = (p: number) => lerp(WALK_FROM, WALK_TO, p);

/* Stride frequency, in strides per second. One full sine cycle is one stride =
   two steps. */
export const STEP_HZ = 1.05;

/* ---- the three poles ----------------------------------------------------- */
export const POLE_Z = -2.1;
export const HEAD_Y = 2.9;
/* Poles pulled IN and clustered, from [-3.6, 0.4, 4.4]. At the old spacing the
   walker reached the third pole at p = 0.923 — past its own read window and
   essentially at the exit, leaving no room for the convergence and the register
   that have to follow it. Clustered at 1.9-unit spacing the three arrivals land
   at p = 0.260 / 0.442 / 0.625, which leaves the whole last third of the loop
   for the beat the scene is actually about. */
export const POLE_X = [-2.5, -0.6, 1.3] as const;

/* ---- THE AISLE ------------------------------------------------------------

   WHY THIS EXISTS. Reviewed on screen for the first time, the scene was three
   poles and a figure floating in a void: the frame is essentially black, and
   because the camera sits 6 degrees above a look-at at y = 1.50, the HORIZON IS
   IN SHOT — the floor occupies the bottom 70% of the frame (the view axis is
   6 deg down, the half-fov is 15 deg, so the horizon sits 6/15 = 0.40 of the way
   from centre to top). Seventy per cent of the picture was unlit nothing. Same
   defect the lead card had this morning, same root cause: no ground.

   EVERY NUMBER BELOW IS DERIVED FROM SOMETHING THAT WAS ALREADY HERE.

   AISLE_HW = 1.45. The poles stand at POLE_Z = -2.1 and the scene's own header
   says they stand "back off the aisle", so the marked edge is set 0.65 in front
   of them: -2.1 + 0.65 = -1.45, mirrored to +1.45. That is a 2.90 m walkway
   centred on the walk line, which is a real aisle width and which the 0.30-wide
   walker occupies the middle of.

   RACK_Z = -3.6. 1.5 behind the poles, so the poles have clear air in front of
   the racking and silhouette against it instead of merging into it.

   RACK_PITCH = 1.9, and the phase is the interesting part. The poles are at
   x = -2.5 / -0.6 / +1.3, i.e. pitch 1.9 exactly (see the POLE_X note above).
   Putting the rack UPRIGHTS on the same 1.9 pitch but offset by half of it —
   base -1.55 = -2.5 + 0.95 — means every upright falls at a pole MIDPOINT and
   every BAY CENTRE falls exactly on a pole x. So each pole is silhouetted
   against an open bay rather than against a second vertical 1.5 units behind it,
   which is the one arrangement that would have read as a doubled pole.

   NEAR_Z = 2.08, NEAR_H = 0.42, AND THIS IS THE CONSTRAINT THAT SIZED THEM.
   Near-side goods sit BETWEEN the lens and the walker, so anything tall enough
   to be interesting is tall enough to cut the walker's legs off. The eye is at
   (1.195, 2.284, 7.422) and the walker's boot sole is at y = 0 on z = 0, so the
   sight line to the feet passes z = 2.08 at
       y = 2.284 * (1 - (7.4216 - 2.08) / 7.4216) = 2.284 * 0.2803 = 0.640
   and — because y and z both interpolate linearly in the same parameter — that
   height is the SAME for every x along the walk line, so one clearance number
   covers the whole run. At 0.42 tall the goods clear it by 0.220 everywhere.
   They also hide the floor from z = 0.655 out to their own near face, which is
   well behind the walker's shadow at z ~ 0.
   Near face at 2.08 - 0.475 = 1.605, i.e. 0.155 outside the +1.45 marking, so
   the goods stand beside the walkway rather than on its line.

   NEAR_PITCH = 1.9 with base -0.92: the same pitch as the racking, offset 0.63
   from it (a third of a pitch), so near and far do not line up into a comb. */
export const AISLE_HW = 1.45;
const RACK_Z = -3.6;
const RACK_PITCH = 1.9;
const RACK_BASE = -1.55;
/** k range for the uprights. See the frame-width arithmetic in buildWork. */
const RACK_K: readonly number[] = [-3, -2, -1, 0, 1, 2, 3, 4];
const RACK_H = 3.40;
const RACK_D = 0.55;
const BEAM_Y = [1.15, 2.30] as const;
const NEAR_Z = 2.08;
const NEAR_H = 0.42;

/* ---- THREE ZONES, NOT ONE AISLE ------------------------------------------

   THE FEEDBACK: "I don't need three cameras in a single goddamn place aligned
   next to next to next." The single continuous aisle put all three poles in
   front of the identical racking, at the identical density, under the
   identical near-goods rhythm — three identical setups in a row. Nothing
   about POLE_X, AIM_X, RACK_Z, RACK_PITCH or the uprights moves to fix this
   (all of that is load-bearing elsewhere — the frame-edge span derivation
   above and the camera-aim derivation below both key off the rack's existing
   footprint), so the fix is CONTENT, not geometry: what fills each third of
   the rack, and where the near-side goods stop, now differs by zone.

   ZONE_B1 / ZONE_B2 split the rack at the two upright x's that sit exactly
   BETWEEN consecutive poles — k=0 (x = RACK_BASE = -1.55, between pole 0 at
   -2.5 and pole 1 at -0.6) and k=1 (x = RACK_BASE + RACK_PITCH = 0.35,
   between pole 1 and pole 2 at +1.3). That is not an arbitrary split: it puts
   each pole's own bay (-2.5 / -0.6 / +1.3, the bay-centre list the OCCUPIED
   comment below already derives) inside a single zone, so "camera 1's zone"
   means something concrete rather than a boundary that cuts a pole's own
   view in half.
     zone A: bays -6.30 / -4.40 / -2.50   (pole 0's zone) — the dense archive
     zone B: bay  -0.60                    (pole 1's zone) — the thinning-out bay
     zone C: bays +1.30 / +3.20 / +5.10   (pole 2's zone) — the cleared apron
   Zone B is one bay wide and A/C are three each because the poles themselves
   are NOT evenly spaced relative to the rack's uniform pitch — this is a
   product of where the poles already stood, not a new asymmetry introduced
   here. */
const ZONE_B1 = RACK_BASE;                 // -1.55, upright k = 0
const ZONE_B2 = RACK_BASE + RACK_PITCH;    // +0.35, upright k = 1

/** Floor slab. Big enough that its own edge is never reached before the fog has
    dissolved it — see the fog derivation in scene.tsx. */
const FLOOR_SIZE = 160;

/* WHERE EACH HEAD IS AIMED — and this is a spec deviation, stated out loud.

   The brief says two things that cannot both be literally true: section C says
   each camera looks "at a point on the walker's path IN FRONT OF IT", and the
   choreography says to aim each "at a point on the walk path AT ITS OWN X".

   Aiming at its own x is geometrically clean and wrong in time. The read
   windows are [0.16,0.34], [0.38,0.56], [0.60,0.78], and at a linear run from
   -7.2 to +7.2 the walker reaches the three POLE x values at p = 0.250, 0.528
   and 0.806. The third one lands 0.026 of the loop AFTER its own window has
   closed — cone 2 would light on an empty aisle and go out just before the
   walker arrived.

   So each head is aimed at the walk path at the CENTRE OF ITS OWN READ WINDOW:
   p = 0.25, 0.47, 0.69 -> x = -3.60, -0.43, +2.74. Those points are at or in
   front of each pole (offsets 0, -0.83, -1.66) and 2.1 units across the aisle
   from it, which satisfies "in front of it" in both senses. Every cone now
   contains the walker at the middle of its window, which is the only version of
   this that reads.

   And, per the gate-vision lesson: the target is on the GROUND of the path, a
   hair above the floor — NOT a point inside the walker's body volume. A target
   inside the subject is swallowed by it and only a sliver of the fan survives.
   That cost gate-vision a whole pass. */
/* Each head now aims at its OWN x, and that is correct rather than a shortcut:
   the read windows below are centred on the walker's arrival at each pole, so
   "its own x" and "the middle of its window" are the same point by
   construction. The earlier build needed a separate aim table precisely because
   they were NOT the same point. */
export const AIM_X = [-2.5, -0.6, 1.3] as const;

/* AIM HEIGHT: THE CHEST, NOT THE FLOOR — and this reverses the note that used
   to sit here, so the reversal is spelled out rather than quietly swapped.

   The old value was GROUND_Y + 0.06, on the gate-vision rule that a target
   INSIDE the subject is swallowed by it. That rule is about where the CONE'S
   FAR END sits; it was applied here to the AIM DIRECTION, which is a different
   thing, and the result was three cameras staring at the concrete between the
   walker's feet. Audited against the 1.815-tall figure it cost over 40% of the
   person: on the old sight line (0, -2.84, 2.1) the crown sat 1.04 off the axis
   against a cone radius of 0.43 — outside by more than two and a half times —
   and the torso was outside too. Only the hips were ever in the volume. Meanwhile
   the bracket locked the whole figure correctly, so the mismatch was on screen
   in every frame of all three read windows.

   1.05 is the waist/lower chest — the walking figure's centre of mass. A camera
   reading a person aims at the person, and the axis now runs through the torso
   with the crown 0.017..0.020 inside the fan even at the top of the gait bob.

   THE OLD RULE IS STILL HONOURED, just at the right end: the cone does NOT stop
   at this point. See CONE_HALF_ANGLE and the coneLens derivation below. */
const AIM_Y = GROUND_Y + 1.05;

/** How far out along its own sight line the lens (and so the cone apex) sits. */
const LENS_OUT = 0.46;

/* HALF-ANGLE, 0.33 rad = 18.9 degrees, and it is a MODEST widening rather than
   a floodlight — the site's visual language is precision instrumentation, and
   the lead card's beams were deliberately narrowed to a 3.4-degree optical axis
   for exactly this reason. A cone wide enough to swallow a standing figure
   head-to-toe from a 2.9 m mast reads as illumination, not as aiming; solved
   properly, enclosing the hips as well would have cost 21-27 degrees, which is
   that floodlight, so it was not done.

   The old cone was ConeGeometry(0.8, coneLens, ...) — a fixed 0.8 base radius
   over a 3.072 length, i.e. atan(0.8/3.072) = 0.2548 rad. The defect was never
   that it was narrow, it was that it pointed at the ground; 0.33 is the minimum
   that clears the crown at the top of the bob, at the worst of the three poles
   (see the dx note in scene.tsx), with margin to spare rather than tangency.

   The pleasing check that says this is the right amount: at the new cone length
   the base radius comes out at 0.801 — the SAME 0.8 the scene has always had.
   The beam did not get bigger. It got pointed at the person. */
export const CONE_HALF_ANGLE = 0.33;

/* ---- materials ----------------------------------------------------------- */

/* BYTE-FOR-BYTE gate-vision's spec, hoisted to module scope for the same reason
   it is hoisted there: metal.ts caches on the spec, so a stray digit is a
   silent cache miss that costs a full albedo + roughness + Sobel normal
   derivation on the visitor's scroll path. This is the ONLY makeMetal call in
   this scene, and it deliberately reuses an existing key rather than inventing
   a new one. */
const DARK_METAL = { base: "#2B313B", kind: "plate", metalness: 0.78, rough: 0.5 } as const;

export interface WorkMaterials {
  /** poles, camera housings, boots */
  dark: THREE.MeshStandardMaterial;
  /** camera glass */
  lens: THREE.MeshStandardMaterial;
  /** workwear: torso, hips, arms, legs */
  suit: THREE.MeshStandardMaterial;
  /** head */
  skin: THREE.MeshStandardMaterial;
  /** the aisle floor slab — the darkest lit surface in the scene */
  floor: THREE.MeshStandardMaterial;
  /** racking steel, far side */
  rack: THREE.MeshStandardMaterial;
  /** palletised goods, both sides */
  goods: THREE.MeshStandardMaterial;
  /** zone B's loading-dock backdrop panel */
  dock: THREE.MeshStandardMaterial;
  /** the two aisle edge markings. NOT in `all` — it runs at a fraction. */
  paint: THREE.MeshBasicMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildWorkMaterials(): WorkMaterials {
  const metal = makeMetal(DARK_METAL);
  const dark = metal.material;

  // gate-vision's camera glass, verbatim — not a makeMetal spec, so there is no
  // cache to miss and no reason to differ from the head that already ships
  const lens = new THREE.MeshStandardMaterial({
    color: "#05070C", metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8,
    transparent: true, opacity: 0,
  });

  /* THE VALUE RULE, applied.
     These two are UNMAPPED matte surfaces under the full five-light rig with
     ACES, and an unmapped matte surface lands about a stop brighter than a
     mapped one at the same tint — and both land far above their literal albedo.
     So the hexes are picked low on purpose. The figure has to sit BETWEEN the
     near-black canvas (#0A0B0E) and the accent (#5CC8FF) in value: readable as
     a person against the floor, and never the brightest thing in frame, because
     the brightest thing in frame is always the overlay.

     `skin` is the only lift in the whole subject, and it exists so the head
     separates from the shoulders at 170px tall. It is a cool grey, not a flesh
     tone: a warm face would be the only warm thing on screen and would read as
     the scene's accent, which is a job reserved for orange — and this scene has
     no orange in it at all (see the colour note in scene.tsx).

     THE HEAD WAS WRONG AND THIS IS THE CORRECTION. `skin` shipped at #5F6772
     against a #2E3540 suit — relative luminance 102 against 52, so the head's
     albedo was 1.96x the torso's. On a SPHERE, which is the one shape in the
     figure that presents a normal straight back at every light in the rig, that
     lands as a specular hotspot on top of an already-doubled albedo, and the
     result read as a mannequin head or a bulb rather than a person. Skin is not
     brighter than a hi-vis torso; nothing on a body is 2x anything else on it.

     The fix is three things at once, because the albedo was only part of it:
       colour            #5F6772 -> #3E454F   (luma 102 -> 68, so 1.55x the suit)
       roughness         0.74    -> 0.86      (kills the sphere's specular cap)
       envMapIntensity   0.55    -> 0.38      (the softboxes were reflecting in it)
     A head is matte. It was being lit like a helmet.

     The suit comes down a step too (#2E3540 -> #262C35), because the figure as a
     whole was the brightest thing in a frame that had nothing else in it. Now
     that the aisle exists it does not have to carry the image on its own. */
  const suit = new THREE.MeshStandardMaterial({
    color: "#262C35", roughness: 0.88, metalness: 0.02, envMapIntensity: 0.42,
    transparent: true, opacity: 0,
  });
  const skin = new THREE.MeshStandardMaterial({
    color: "#3E454F", roughness: 0.86, metalness: 0.02, envMapIntensity: 0.38,
    transparent: true, opacity: 0,
  });

  /* ---- THE AISLE'S THREE SURFACES ------------------------------------------

     THE VALUE LADDER, authored bottom to top. Every one of these is roughly
     HALF the value it is meant to render at, per the house rule: under the full
     five-light rig with ACES a matte unmapped surface lands about a stop above
     its literal hex, and the floor here catches the studio spot's pool almost
     square on.

       page / fog / backdrop   #0A0B0E    (not a material — the destination)
       floor slab              #15181D    two steps off the canvas
       racking steel           #1A1F27
       palletised goods        #1F242C
       workwear                #262C35
       head                    #3E454F
       poles / housings        #2B313B  @ metalness 0.78 — reflection-driven
       detection graphics      #5CC8FF    the ONLY bright thing in the frame

     #15181D for the floor is not invented: it is `ROAD_TOP` from
     lead-card/site.ts, authored today for the identical problem (a scene with
     no ground reading as objects on a black table) under the identical full rig.
     Reusing a value that has already been judged on screen beats guessing a new
     one, and it keeps the two dark scenes' floors in the same family. */
  const floor = new THREE.MeshStandardMaterial({
    color: "#15181D", roughness: 0.95, metalness: 0.0, envMapIntensity: 0.10,
    transparent: true, opacity: 0, depthWrite: false,
  });
  /* The racking is deliberately only ONE step above the floor. It is the
     largest object in the frame by area after the floor itself, it stands
     directly behind the three poles, and background that competes with a
     1.8-unit figure is worse than no background at all. It reads by SILHOUETTE
     and by the fog gradient along its length, not by being lighter. */
  const rack = new THREE.MeshStandardMaterial({
    color: "#1A1F27", roughness: 0.86, metalness: 0.18, envMapIntensity: 0.25,
    transparent: true, opacity: 0,
  });
  /* Goods sit above the steel they are stacked on — a carton is lighter than a
     rack upright — and still below the workwear, so the walker stays the
     lightest large surface in the frame that is not a graphic. */
  const goods = new THREE.MeshStandardMaterial({
    color: "#1F242C", roughness: 0.93, metalness: 0.02, envMapIntensity: 0.12,
    transparent: true, opacity: 0,
  });
  /* THE DOCK PANEL AND THE GATE FRAME — the materials the three-environments
     fix (see buildWork's env section) needs and the aisle didn't have one of
     yet: a surface for zone B's loading-dock backdrop that reads as a
     different SURFACE from the racking behind it, not just a different colour
     of the same steel. One step above `rack` (#1A1F27 -> #2E3540, roughly the
     suit's own value) and less matte (roughness 0.86 -> 0.62, metalness 0.18
     -> 0.30) — a rolling dock door is sheet steel, smoother and slightly more
     specular than an open rack, and the lift in value is what lets it read as
     a solid backdrop rather than another upright at a glance. The gate frame
     at zone C reuses `rack` itself (it is structural steel, not a panel), so
     no second material was needed for it. */
  const dock = new THREE.MeshStandardMaterial({
    color: "#2E3540", roughness: 0.62, metalness: 0.30, envMapIntensity: 0.30,
    transparent: true, opacity: 0,
  });
  /* Aisle edge markings. `MeshBasicMaterial`, unlit, and it KEEPS FOG ON — the
     opposite of the rule for detection graphics, and the same call
     lead-card/site.ts makes for its road paint: a floor marking is paint ON a
     surface, it belongs to the world, and it has to recede with the floor it is
     painted on or it floats above it at the far ends. `toneMapped: false`
     because it is drawn at a literal value, not lit to one. */
  const paint = new THREE.MeshBasicMaterial({
    color: "#5A626C", transparent: true, opacity: 0,
    depthWrite: false, toneMapped: false, fog: true,
  });

  /* `paint` is NOT in `all`. The scene's intro loop drives everything in this
     array to full `solid`, and the markings run at a fraction of it. */
  const all: THREE.Material[] = [dark, lens, suit, skin, floor, rack, goods, dock];
  return {
    dark, lens, suit, skin, floor, rack, goods, dock, paint, all,
    /* MATERIALS ONLY. The metal maps live in metal.ts's cache and are shared
       with gate-vision; disposing them here would leave the next build sampling
       a destroyed texture. */
    dispose: () => {
      metal.dispose(); lens.dispose(); suit.dispose(); skin.dispose();
      floor.dispose(); rack.dispose(); goods.dispose(); dock.dispose(); paint.dispose();
    },
  };
}

/** Generate and cache everything this scene's build would otherwise pay for on
 *  the scroll path. There are no canvas textures in Work Vision — the whole
 *  subject is primitives and four materials — so the only cacheable cost is the
 *  DARK_METAL albedo/roughness/normal set, which lives in metal.ts's own
 *  module-level cache. The material built here is thrown away; the TEXTURES are
 *  what survives. Called from _vision/lazy.tsx's loader, exactly as
 *  warmGateTextures is. */
export function warmWorkTextures() {
  makeMetal(DARK_METAL).dispose();
}

/* ---- the subject --------------------------------------------------------- */

export interface WorkModel {
  /** Unrotated, moved along X. Callout anchors are expressed in THIS space, so
      makeProjector's normal-vs-quaternion test works without compensation. */
  root: THREE.Group;
  /** The figure itself, yawed into profile inside `root`, and bobbed by walk(). */
  figure: THREE.Group;
  /** Drive the gait. `t` is scene time in seconds, not loop phase. */
  walk: (t: number) => void;
  /** Callout anchor, in ROOT space — just clear of the crown. */
  headAnchor: THREE.Vector3;
  /** Poles and heads. Fixed; never moves. */
  fixed: THREE.Group;
  /** The aisle: floor slab, edge markings, racking, goods. Fixed; never moves.
      Added to the scene as one object and never read in world space. */
  env: THREE.Group;
  /** World position of each lens = each sight cone's apex. */
  lenses: THREE.Vector3[];
  /** World aim point of each sight line, on the walk path. */
  aims: THREE.Vector3[];
  /** Unit sight direction per camera, lens -> aim. */
  dirs: THREE.Vector3[];
  /** Cone length: lens to where the sight axis meets the floor. NOT to the aim
      point — see the derivation in buildWork. */
  coneLens: number[];
  owned: THREE.BufferGeometry[];
  dispose: () => void;
}

export function buildWork(m: WorkMaterials): WorkModel {
  const owned: THREE.BufferGeometry[] = [];
  const mesh = (g: THREE.BufferGeometry, mat: THREE.Material) => {
    owned.push(g);
    const o = new THREE.Mesh(g, mat);
    o.castShadow = true;
    return o;
  };

  /* ======================= THE WALKER =======================
     Built facing LOCAL +Z, then the whole figure is yawed a quarter turn so
     that local +Z becomes world +X — the direction of travel — and the
     figure's left/right axis points at the camera.

     WHY PROFILE. A walk read head-on foreshortens the stride to nothing: the
     legs scissor toward and away from the lens and the figure appears to
     shuffle on the spot. Every walking figure ever drawn — Muybridge, a pelican
     crossing, a fire-exit sign — is in profile, because profile is the only
     view in which a stride has length on screen. This repo relearned it the
     hard way in the ascii-hero people work; it is not relearning it again. */
  const root = new THREE.Group();
  const figure = new THREE.Group();
  figure.rotation.y = Math.PI / 2;   // local +Z -> world +X
  root.add(figure);

  /* ---- TORSO, SHOULDERS, NECK, HEAD ----------------------------------------

     WHAT WAS WRONG. The figure shipped as a sphere sitting directly on a
     capsule: torso Capsule(0.20, 0.52) topping out at 1.66, head Sphere(0.155)
     centred at 1.66. Two defects, and the value fix that landed first made both
     of them visible rather than causing them.

       1. NO NECK WAS POSSIBLE, because the head was SUNK 0.155 INTO THE TORSO —
          head bottom 1.505 against torso top 1.66. There was no gap for a neck
          to occupy, so no amount of adding one would have helped without first
          shortening the torso. That is why this is a four-part rebuild and not
          "add a neck".
       2. THE HEAD WAS OVERSIZED. 0.155 radius is a 0.31 diameter on a 1.815
          figure = 1/5.9 of height. A human is about 1/7.5. At 1/5.9 the figure
          reads as a peg doll no matter what the silhouette below it does.

     THE INVARIANT, AND IT IS ABSOLUTE: THE CROWN STAYS AT EXACTLY 1.815.
     The framing solve in scene.tsx (1.815 / 4.076 = 44.5% of frame height), the
     callout's headAnchor at 1.90, and CONE_HALF_ANGLE's clearance margin ("the
     crown clears the fan by 0.017 at the top of the gait bob") are ALL keyed to
     it. So the head radius comes down AND its centre goes up to compensate:
     0.132 radius centred at 1.683 puts the crown back on 1.815 to the digit,
     and the head is now 0.264 / 1.815 = 1/6.9. The narrower head only INCREASES
     the cone margin, so that solve stays valid without being re-run.
     If anything ever forces the crown off 1.815, re-derive the framing — do not
     absorb it here.

     THE STACK, and every number falls out of the crown working downward:
       crown              1.815
       head    r 0.142  @ 1.673   ->  1.531 .. 1.815
       neck    h 0.12   @ 1.500   ->  1.440 .. 1.560   (0.061 of it visible)
       shoulder yoke, Box @ 1.400 ->  1.330 .. 1.470   (z half 0.24)
       torso   Cylinder(0.20, 0.175, 0.77) @ 1.085 -> 0.700 .. 1.470, FLAT top

     THE FIRST ATTEMPT AT THIS READ AS A CHESS PAWN, and the correction is
     recorded because the failure is instructive. Head r 0.132 (1/6.9) was an
     OVER-correction of the 1/5.9 original; against a torso shortened to 0.73 it
     left a small ball on one smooth tapering ovoid. Three things were wrong at
     once and only together:
       head    0.132 -> 0.142  (1/6.4 — honest for a stylised figure this size)
       torso   0.73 tall -> 0.77, LENGTHENED DOWNWARD so everything above it,
               and therefore the crown, stays fixed
       shoulder Z half-depth 0.22 -> 0.19

     THE SHOULDER IS A CORNER, NOT A LUMP, AND THE ELLIPSOID COULD NEVER MAKE
     ONE. THIS IS A PROVEN DEAD END — DO NOT REACH FOR THAT PARAMETER AGAIN.

     A human shoulder reads because the silhouette runs up the side of the
     ribcage, turns sharply OUTWARD at the deltoid, then turns UP into the neck.
     That hard change of direction is the whole cue. Two values of the shoulder
     ellipsoid's local-Z half-depth were built and judged on screen against the
     torso's own 0.20 radius:

       0.22  PROUD of the torso. A rounded mass laid over a capsule's rounded
             top cap is just a BIGGER DOME. Read as a chess pawn.
       0.19  NARROWER than the torso. Worse, and instructive: in PROFILE local Z
             is the screen-horizontal axis, so a 0.19 half-depth mass sits
             ENTIRELY INSIDE the 0.20 silhouette and contributes NOTHING to the
             outline at all. The shoulder had been deleted from the only view
             this camera has.

     So the parameter is the wrong lever, not merely mis-set: above 0.20 it
     makes a dome, below 0.20 it is invisible, and AT 0.20 it is tangent. No
     value produces a corner, because a rounded mass on a rounded cap can only
     ever be one or the other.

     A CORNER NEEDS TWO FLAT SURFACES MEETING AT AN ANGLE, so both the things
     that meet had to change:
       · the TORSO is a CYLINDER, not a capsule — it ends in a FLAT top at
         1.470 instead of a 0.20-radius dome, giving the vertical side a hard
         termination to turn against. It tapers 0.175 at the waist to 0.20 at
         the chest so it is not a tube.
       · the YOKE is a BOX, not an ellipsoid. A box has corners by
         construction. At z half-depth 0.24 against the torso's 0.20 it steps
         0.04 PROUD, so the profile now reads: vertical torso side, a step OUT
         at 1.330, a vertical deltoid face, a flat SHELF in at 1.470, then the
         neck. Two corners where there was previously one continuous curve.

     WHY THE SHOULDER MASS IS PROUD IN LOCAL Z AND NOT LOCAL X — READ THIS
     BEFORE REACHING FOR ascii-hero/forms.ts.

     That file's bust says a figure reads as human because SHOULDERS CARRY
     HORIZONTAL MASS, and it is right — for the thing it describes, which is a
     bust viewed HEAD-ON. This walker is yawed a quarter turn into PROFILE
     (figure.rotation.y = PI/2, local +X -> world -Z), so shoulder WIDTH points
     straight at the lens and foreshortens into nothing. Building wide shoulders
     here would put the entire cue on the one axis the camera cannot see.

     The general rule, which is the part worth carrying forward: THE SAME
     ANATOMICAL CUE NEEDS A DIFFERENT AXIS DEPENDING ON THE VIEWING ANGLE. In
     profile what breaks the silhouette is the front-to-back deltoid mass and
     the neck, not the shoulder span. So the yoke's 0.24 half-depth in local Z
     is the load-bearing dimension, and its 0.34 local-X half-width does no
     silhouette work at all — that number exists only so the arm joints at
     +-0.235 are seated in something rather than emerging from thin air.

     The neck is TAPERED (0.070 top, 0.095 bottom), which is ascii-hero's idiom
     and does transfer: a parallel-sided cylinder reads as a bolt. */
  /* TORSO BOTTOM IS 0.700, NOT THE 0.645 THIS PASS WAS SPEC'D AT, and the
     deviation is deliberate. Lengthening downward is the right direction — it
     holds the crown — but 0.645 was too far: the leg capsules' tops are at
     0.938 and the hip box spans 0.81..1.03, so a torso reaching 0.645 hangs
     0.29 below the hip line and over the thighs, which reads as a coat or a
     tunic rather than a body. 0.700 puts the torso 0.11 below the hip box,
     where its bottom merges with the hips into a pelvis instead of draping
     over the legs. Torso is 0.77 tall against a 0.40 chest width.

     CENTRE IS UNCHANGED AT 1.085 ACROSS THE CAPSULE -> CYLINDER SWAP, which is
     not a coincidence worth glossing: the capsule's total length was already
     0.37 + 2 x 0.20 = 0.77, so a 0.77-tall cylinder on the same centre keeps
     BOTH ends exactly where they were. The top stays at 1.470 — which the neck,
     the yoke and therefore the crown all sit on — and the bottom stays at
     0.700. The only thing that changed is that the ends are now flat. */
  const torso = mesh(new THREE.CylinderGeometry(0.20, 0.175, 0.77, 16), m.suit);
  torso.position.y = 1.085;
  figure.add(torso);

  /* THE SHOULDER MASS, REBUILT AGAIN — THE BOX READ AS A PLANK, NOT A CORNER.
     Seen rendered, the box yoke did not read as "torso side / hard step out /
     deltoid face / shelf back in" the way the dead-end note above predicted.
     At the figure's on-screen scale (~170px) a flat-sided box with a top FLUSH
     to the torso reads as exactly what it is: a rectangular slab laid straight
     across the neck, protruding front and back — "a pain going through it in
     the neck", verbatim. A silhouette corner that is only legible at a much
     larger scale is not a win at this scale; it is a worse defect than the
     dome it replaced.

     SO: an ellipsoid after all, but not the one already ruled a dead end. The
     earlier test scaled a SPHERE uniformly (or in local X, which does no
     silhouette work — see the note above) sitting PROUD on a rounded capsule
     cap, which is genuinely a dead end: rounded-on-rounded is only ever a
     bigger dome. What changed underneath it since that test: the torso is now
     a CYLINDER with a FLAT top, not a capsule with a rounded one. An ellipsoid
     resting on a FLAT surface does not blend into a bigger dome the way it
     does on a rounded one — the torso's flat shoulder line stays a visible
     straight edge either side of the mass, so the mass reads as sitting ON
     the body rather than as a continuation of it. That is the anatomical cue
     this needed: a shoulder mass distinguishable from the torso's own silhouette,
     without a hard corner (which a box has to have and a person, at this
     scale, does not visibly have).

     THE AXIS THE MASS HAS TO WIN IS STILL LOCAL Z (world X, screen-horizontal,
     the front-to-back contour in profile) — see the note above on why local X
     does no silhouette work here. So the sphere is scaled ANISOTROPICALLY:
       local X  x1.00  (0.20 — matches the torso radius, so the sides blend)
       local Y  x0.72  (0.144 — flattened, so it reads as a shoulder cap, not
                a head-sized ball sitting on the neck)
       local Z  x1.45  (0.29 — proud of the torso's 0.20 by 0.09, the
                front-to-back bump that used to be the box's 0.24 half-depth)
     Positioned at y = 1.38, LOWER than the box's 1.40 and SUNK 0.09 into the
     torso (whose flat top is at 1.470): the mass spans 1.236..1.524, so its
     lower 60% is embedded in the torso (no gap, no seam, no object passing
     through anything) and only the upper part — the actual shoulder cap — is
     visible above the torso's flat line, right where the neck (1.44..1.56)
     rises out of it. Nothing here touches the neck or head numbers: crown
     stays at 1.815, untouched. */
  const shoulders = mesh(new THREE.SphereGeometry(0.20, 20, 14), m.suit);
  shoulders.scale.set(1.0, 0.72, 1.45);
  shoulders.position.y = 1.38;
  figure.add(shoulders);

  const neck = mesh(new THREE.CylinderGeometry(0.070, 0.095, 0.12, 12), m.skin);
  neck.position.y = 1.50;
  figure.add(neck);

  const head = mesh(new THREE.SphereGeometry(0.142, 20, 14), m.skin);
  head.position.y = 1.673;          // crown lands at 1.815 — the figure's height
  figure.add(head);

  /* ---- THE HARD HAT --------------------------------------------------------

     The figure is a person in a warehouse aisle and, until this pass, was
     bare-headed — which is the one thing nobody in that aisle is. It is not
     decoration: at 170 px tall a walking silhouette has very few chances to
     say what KIND of person it is, and a brimmed helmet is the strongest one
     available. It also does real silhouette work in profile, which is the
     only view this camera has: the brim projects front and back, breaking the
     head's outline into something that is unmistakably not a ball on a stick.

     THE CROWN INVARIANT HOLDS AT 1.815. That number is load-bearing in three
     other places — the framing solve in scene.tsx (1.815 / 4.076 = 44.5% of
     frame height), the callout's headAnchor at 1.90, and CONE_HALF_ANGLE's
     clearance margin — so the hat is NOT stacked on top of the head. It is a
     shell fitted OVER it: a 0.152 sphere on the head's own 1.673 centre, so
     its top lands on 1.815 to the digit and the skin sphere sits 0.010 inside
     it everywhere. Nothing above the neck moves.

     Scaled 0.82 in Y so it is a cap rather than a globe, and the brim is a
     thin cylinder at the head's equator. Both in `dark` — a helmet is the
     only moulded, slightly glossy thing on the figure, and putting it in the
     same material as the poles and the camera housings ties the person to the
     equipment rather than to the racking behind them. */
  const hat = mesh(new THREE.SphereGeometry(0.152, 18, 12), m.dark);
  hat.scale.set(1.0, 0.82, 1.0);
  hat.position.y = 1.690;           // 1.690 + 0.152*0.82 = 1.815, the crown
  figure.add(hat);

  const brim = mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.022, 16), m.dark);
  brim.position.set(0, 1.676, 0.03);   // nudged forward: a brim is not centred
  figure.add(brim);

  const hips = mesh(new THREE.BoxGeometry(0.30, 0.22, 0.22), m.suit);
  hips.position.y = 0.92;
  figure.add(hips);

  /* ---- FOUR LIMBS, EACH AN EMPTY GROUP AT ITS JOINT ----

     THIS IS THE PART THIS REPO HAS GOT WRONG TWICE. A limb mesh rotated about
     its own centre SEE-SAWS: the shoulder end swings backward by exactly as
     much as the hand end swings forward, and the result is a figure paddling,
     not walking. Same failure as the crane sheave pivoted at its centre instead
     of its axle, and the same failure as the ascii-hero crowd.

     So each limb is an EMPTY GROUP positioned at the JOINT, with the mesh hung
     BELOW it at local y = -(limb length / 2). Rotating the GROUP pivots the
     limb about the joint, which is what a shoulder and a hip actually do. */
  const joint = (x: number, y: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    figure.add(g);
    return g;
  };

  /* ARM PIVOTS STAY AT 1.44, AND THEY WERE CHECKED RATHER THAN ASSUMED.
     Reviewed on screen the arms looked like they emerged from mid-torso, which
     is a pawn cue in its own right. They do not, and the reason the fault
     appeared is worth recording: the pivot never moved, THE TORSO CAME DOWN TO
     MEET IT. Against the original torso topping out at 1.66 a pivot at 1.44 sat
     0.22 below the shoulder — genuinely low. Against the rebuilt torso topping
     out at 1.47 the same 1.44 sits 0.03 below it, which IS the shoulder line,
     and it falls in the upper third of the shoulder ellipsoid (1.27..1.47) so
     the arm's head is seated in deltoid mass rather than emerging from air.
     What actually made them read low the first time was the shoulder BULGE
     reaching down to 1.27, which made the whole upper body one broad mass with
     the arms leaving from the middle of it. Flattening the ellipsoid fixes the
     apparent attachment point without touching the pivot. */
  const armL = joint(0.235, 1.44);
  const armR = joint(-0.235, 1.44);
  for (const j of [armL, armR]) {
    const arm = mesh(new THREE.CapsuleGeometry(0.062, 0.46, 5, 12), m.suit);
    arm.position.y = -0.29;          // = -(0.46 + 2 * 0.062) / 2, to 2dp
    j.add(arm);
  }

  const legL = joint(0.105, 0.92);
  const legR = joint(-0.105, 0.92);
  for (const j of [legL, legR]) {
    /* THE LEG NOW REACHES THE ANKLE. It used to be a 0.716-long capsule hung
       at -0.34, whose sole sat 0.222 ABOVE the floor with a separate boot
       block filling the gap underneath. That arrangement is the source of the
       "two blocks going through it on the feet" reading, and no amount of
       resizing the boot could fix it, because the defect was never the boot's
       proportions — it was that the leg and the foot were two masses meeting
       at a seam 22 cm off the ground, which is nowhere on a body.

       0.86 long (r 0.078, cylinder 0.704) hung at -0.43 puts the capsule's
       bottom at 0.92 - 0.86 = 0.06 — an ankle. The foot below it then
       OVERLAPS that cap rather than butting against it, so there is one
       continuous leg-into-shoe silhouette and no seam to see. */
    const leg = mesh(new THREE.CapsuleGeometry(0.078, 0.704, 5, 12), m.suit);
    leg.position.y = -0.43;
    j.add(leg);
    /* THE BOOT EXISTS BECAUSE THE SPEC'S LEG DOES NOT REACH THE FLOOR, and that
       is worth stating rather than quietly fudging. The hip joint is at 0.92
       and the leg capsule is 0.56 + 2 x 0.078 = 0.716 long, hung at -0.34, so
       its lowest point is 0.92 - (0.34 + 0.358) = 0.222 above the ground. Left
       alone, the figure walks on air 22 cm up.

       Rather than move a specified joint or resize a specified capsule, the gap
       is closed with a work boot exactly 0.222 tall whose top meets the leg's
       bottom. 22 cm tall and 30 cm long is a real ankle boot, and it keeps the
       crown at 1.815 — which is the 1.8 the whole framing derivation assumes.

       It is parented to the LEG GROUP, not to the figure: a foot that does not
       swing with its leg is worse than a foot that floats. */
    /* THE BOOT, SECOND PASS — MATERIAL WAS RIGHT, PROPORTION WAS NOT.
       The first fix (material -> m.suit, grown 0.03 taller to overlap the leg)
       removed the "two dark objects" defect but, seen rendered at ?phase=0.44,
       introduced a new one: a box 0.30 long in local Z (the walking axis,
       which IS the screen-horizontal axis in this profile view) and only 0.252
       tall reads as a FLAT PLATE lying on the floor pointing forward — a ski
       or a flipper, not a boot. Long-and-flat on the one axis the camera sees
       edge-on is exactly the wrong proportion.

       THE VERTICAL EXTENT IS NOT A FREE PARAMETER — that is fixed by the
       gap the boot exists to close (see above: the leg capsule's sole sits
       0.222 above the floor) plus a small overlap into the leg, which is why
       the fix only touches LENGTH, not height:
         length  (local Z, the toe-to-heel / screen-horizontal axis)
                 0.30 -> 0.20 (33% shorter — this is what was making it a ski)
         width   (local X, the depth axis, mostly hidden from this camera)
                 0.18 -> 0.16
         height  (local Y) 0.252 -> 0.26, held to the SAME job as before:
                 sole at the floor, top overlapping the leg capsule's -0.698
                 bottom by a hair so there is no seam.
       Ratio height:length goes from 0.252:0.30 (flatter than tall — the ski)
       to 0.26:0.20 (taller than long — a blocky ankle mass), which is the
       actual fix; nothing here changes the y position formula, which is
       still `-(0.92) + halfHeight` so the sole lands exactly at GROUND_Y
       regardless of which height is chosen.
       The forward toe offset also comes down, 0.05 -> 0.03, so the boot does
       not additionally reach further forward than its own now-shorter length
       already does. */
    /* THE BOOT, THIRD PASS — and this time the leg comes down to meet it.

       Both earlier passes tried to fix a 22 cm gap by tuning the object
       filling it, and both produced a variant of the same defect: a separate
       mass under a floating leg. The gap is gone now (see the capsule above),
       so this is a SHOE and can be shaped like one.

       0.14 tall x 0.24 long, sole on GROUND_Y, top at 0.14 — which is 0.08
       ABOVE the leg capsule's 0.06 bottom, so the ankle is buried in the shoe
       rather than resting on it. That overlap is the whole point and it is
       why the height is 0.14 rather than the minimum that would close the
       gap. In profile (local Z is the screen-horizontal walking axis) the
       0.24 length and 0.14 height read as a work boot: longer than tall, as a
       shoe is, but emerging from a leg rather than lying on the floor on its
       own, which is what made the previous version a ski. */
    const boot = mesh(new THREE.BoxGeometry(0.15, 0.14, 0.24), m.suit);
    boot.position.set(0, -0.85, 0.045);  // sole at -0.920 = GROUND_Y; top at 0.14
    j.add(boot);
  }

  /* The gait.

     Legs +-0.62 rad counter-phased; arms -+0.42 rad, so each arm counters the
     leg on its own side (and therefore swings WITH the opposite leg, which is
     what a human does). The arms are deliberately SHALLOWER than the legs —
     equal amplitudes are what makes a walk cycle read as a march.

     The bob is 0.035 x |sin| of the SAME phase. |sin| peaks twice per sine
     cycle, and one sine cycle is one stride of two steps, so the body rises
     once per step. (The brief calls this "|sin| at DOUBLE frequency"; taken
     literally as |sin(2 x phase)| it would be four rises per stride, which is
     not a walk. The parenthetical — "a body rises once per step, two steps per
     stride" — is unambiguous, so that is what is implemented.)

     Driven by absolute scene time rather than loop phase. 9.0s at 1.05 Hz is
     9.45 strides, so the gait phase does NOT close at the wrap — which does not
     matter in the slightest, because the walker is three units off frame at
     both ends of the loop and nobody ever sees the seam. */
  const walk = (t: number) => {
    const s = Math.sin(2 * Math.PI * t * STEP_HZ);
    legL.rotation.x = 0.62 * s;
    legR.rotation.x = -0.62 * s;
    armL.rotation.x = -0.42 * s;
    armR.rotation.x = 0.42 * s;
    figure.position.y = 0.035 * Math.abs(s);
  };

  /* ======================= THE THREE POLES ======================= */
  const fixed = new THREE.Group();
  const lenses: THREE.Vector3[] = [];
  const aims: THREE.Vector3[] = [];
  const dirs: THREE.Vector3[] = [];
  const coneLens: number[] = [];

  const POLE_TOP = HEAD_Y + 0.15;

  POLE_X.forEach((x, i) => {
    const aim = new THREE.Vector3(AIM_X[i], AIM_Y, 0);
    const mount = new THREE.Vector3(x, HEAD_Y, POLE_Z);
    const dir = aim.clone().sub(mount).normalize();

    // pole: a plain square section standing on the floor, top just proud of the
    // head so the head reads as bolted TO something
    const pole = mesh(new THREE.BoxGeometry(0.13, POLE_TOP - GROUND_Y, 0.13), m.dark);
    pole.position.set(x, GROUND_Y + (POLE_TOP - GROUND_Y) / 2, POLE_Z);
    fixed.add(pole);
    // a small footing, so the pole meets the floor rather than ending at it
    const foot = mesh(new THREE.BoxGeometry(0.32, 0.09, 0.32), m.dark);
    foot.position.set(x, GROUND_Y + 0.045, POLE_Z);
    fixed.add(foot);

    /* The head assembly is a GROUP oriented ONCE, with its local +Z along the
       sight line. Everything hangs off that, so the lens cannot end up pointing
       somewhere other than where the cone goes — which is the failure mode of
       placing a body, a stalk and a lens by three separate hand-tuned Euler
       angles. Gate-vision's idiom (box body, lens, stalk, pole), re-expressed
       so it stays honest when the three heads are aimed differently. */
    const h = new THREE.Group();
    h.position.copy(mount);
    h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    fixed.add(h);

    const stalk = mesh(new THREE.BoxGeometry(0.06, 0.06, 0.30), m.dark);
    stalk.position.z = 0.06;
    h.add(stalk);
    const body = mesh(new THREE.BoxGeometry(0.24, 0.20, 0.40), m.dark);
    body.position.z = 0.26;
    h.add(body);
    const lensMesh = mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.05, 16), m.lens);
    lensMesh.rotation.x = Math.PI / 2;   // cylinder axis -> the group's local +Z
    lensMesh.position.z = LENS_OUT;
    h.add(lensMesh);

    const lens = mount.clone().addScaledVector(dir, LENS_OUT);

    /* CONE LENGTH RUNS TO THE FLOOR, NOT TO THE AIM POINT, and separating the
       two is the other half of raising the aim.

       AIM_Y picks the DIRECTION — the axis through the walker's chest. If the
       length were also taken from it (full - LENS_OUT = 2.339) the volume would
       be truncated at chest height, and the shared builder's range falloff
       (detect.ts: alpha dies over the last 48%) would then finish the job well
       above that: the crown sits at t = 0.78 and the torso at t = 0.95, where
       far is 0.02. The beam would visibly stop at the walker's NECK — worse on
       screen than the bug being fixed, since the old floor-aimed cone at least
       stayed lit down to knee height.

       So the length is the ray-plane distance from the lens to y = GROUND_Y
       along the sight axis: 3.927. Nothing about the cone's SHAPE changes —
       same apex, same axis, same 0.33 half-angle — it simply is not cut off
       early. That is also the honest picture: a camera's field of view does not
       stop at its subject.

       WHY THE FEET FALL OUTSIDE ANYWAY, WHICH IS INTENDED AND NOT A MISS. The
       beam lands full-strength on the centre of mass (crown far = 1.00, torso
       0.97, hips 0.89) and is already half dissolved at the feet (t = 0.77,
       far = 0.46), so it fades away before the floor rather than puddling on
       it. And it pays for itself: the axis now meets the plane at exactly
       reach = 1.0, which puts the ground pool at 50% of master — a dim
       footprint, which is the builder's reach fade doing precisely what its
       comment describes. Truncating at the chest would have set reach to 1.68
       and deleted the pool outright. */
    const toFloor = (lens.y - GROUND_Y) / -dir.y;

    lenses.push(lens);
    aims.push(aim);
    dirs.push(dir);
    coneLens.push(toFloor);
  });

  /* ======================= THE AISLE =======================

     LOW DETAIL ON PURPOSE. This is background: it exists so the walker is
     walking THROUGH somewhere, and the moment it is interesting enough to look
     at it is competing with the figure and the cones, which are the only two
     things in this frame carrying meaning. Eight uprights, two beams, ten
     stored loads, six near loads, two painted lines, one slab — 29 meshes off
     SEVEN distinct geometries, none of it casting a shadow.

     NOTHING HERE CASTS. The shadow map is 1024 over a 6-unit half-extent (~85
     px/unit) and the only shadow that matters is the walker's; spending that
     budget on a rack 3.6 units behind the subject, whose shadow falls away from
     the lens, would blur the one shadow the scene is for. `envMesh` therefore
     does NOT set castShadow, unlike `mesh` above. */
  const env = new THREE.Group();
  const envMesh = (g: THREE.BufferGeometry, mat: THREE.Material, own = true) => {
    if (own) owned.push(g);
    return new THREE.Mesh(g, mat);
  };

  /* ---- the floor slab ----
     THE STACK, bottom up, and the ordering is load-bearing:

       floor slab   GROUND_Y - 0.030   renderOrder -4   depthWrite false
       drafting grid GROUND_Y - 0.018  renderOrder -3   depthWrite false
       aisle paint  GROUND_Y - 0.008   renderOrder -2   depthWrite false
       shadow catcher GROUND_Y          (studio's, default order)

     Four coincident transparent planes is precisely the case the painter's
     sorter gets wrong — sorting them by camera distance gives an answer that
     depends on where the camera happens to be — so every one of them writes no
     depth and renderOrder is the ONLY thing deciding the stack. Same idiom, and
     the same reasoning, as lead-card/site.ts.

     The RACKING and the GOODS keep three's default `depthWrite: true`. They are
     solid objects, not coincident planes, and at renderOrder 0 they draw after
     the slab (-4) regardless of the fact that they are further from the lens
     than its centroid is. Leaving the slab on depthWrite:false and the racking
     on the default is what stops the slab painting over the rack. */
  const floorGeo = new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE);
  const slab = envMesh(floorGeo, m.floor);
  slab.rotation.x = -Math.PI / 2;
  slab.position.y = GROUND_Y - 0.030;
  slab.renderOrder = -4;
  env.add(slab);

  /* ---- the two aisle edge markings ----
     28 long: the frame is only ~8.6 units wide at the far marking's depth and
     ~5.8 at the near one's, so +-14 is never within three times of an end even
     when fitD pulls the camera back at a narrow aspect. */
  const paintGeo = new THREE.PlaneGeometry(28, 0.09);
  for (const sz of [-1, 1]) {
    const line = envMesh(paintGeo, m.paint, sz === -1);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, GROUND_Y - 0.008, sz * AISLE_HW);
    line.renderOrder = -2;
    env.add(line);
  }

  /* ---- the two zone-boundary stripes ----
     A CROSS-mark, not an edge line: same idiom as the two lines above
     (PlaneGeometry, rotated flat, `paint` material, renderOrder -2) but long
     in Z and thin in X instead of the other way round, so it reads as a strip
     painted ACROSS the aisle rather than along it. Positioned at ZONE_B1 /
     ZONE_B2 — the same two x's the rack content splits on — so the floor
     itself announces the transition a beat before the racking does. Width
     2*AISLE_HW = 2.90 spans the full marked walkway, same as the edge lines'
     own span between them. */
  const crossGeo = new THREE.PlaneGeometry(0.12, 2 * AISLE_HW);
  [ZONE_B1, ZONE_B2].forEach((x, i) => {
    const cross = envMesh(crossGeo, m.paint, i === 0);
    cross.rotation.x = -Math.PI / 2;
    cross.position.set(x, GROUND_Y - 0.008, 0);
    cross.renderOrder = -2;
    env.add(cross);
  });

  /* ---- the far racking ----
     HOW FAR IT HAS TO REACH. The two horizontal edge rays leave the eye at
     (1.195, 7.422) in ground plan and cross the walk line (z = 0) at
     x = -3.30 and +3.86 (the framing note in scene.tsx derives those). Their
     plan gradients are therefore
         left   dx/dz = (-3.30 - 1.195) / (0 - 7.422) = +0.6051
         right  dx/dz = (+3.86 - 1.195) / (0 - 7.422) = -0.3598
     and extending both to the rack plane z = -3.6 gives
         left   x = 1.195 + 0.6051 * (-3.6 - 7.422)... measured from the eye:
                x = -3.30 + 0.6051 * (-3.6) = -5.48
         right  x = +3.86 - 0.3598 * (-3.6) = +5.16
     so the racking must span -5.48 .. +5.16 at that depth. RACK_K = -3..4 puts
     uprights at -7.25 .. +6.05, which clears both ends by 1.77 and 0.89 — the
     end of a bay is never in shot. */
  const uprightGeo = new THREE.BoxGeometry(0.10, RACK_H, RACK_D);
  const xs = RACK_K.map((k) => RACK_BASE + RACK_PITCH * k);
  xs.forEach((x, i) => {
    const u = envMesh(uprightGeo, m.rack, i === 0);
    u.position.set(x, GROUND_Y + RACK_H / 2, RACK_Z);
    env.add(u);
  });

  /* TWO BEAM LENGTHS, NOT ONE — this is the one place the zoning actually
     changes a DIMENSION rather than just content, and it is confined to the
     UPPER level only, so it is worth spelling out why that is safe.

     The lower beam (BEAM_Y[0] = 1.15) still runs the full rack, -7.25..+6.05
     plus the upright section = 13.40 long, centred on -0.60 — unchanged from
     before, because a rack with no base structure at all would read as
     broken rather than as a different zone.

     The upper beam (BEAM_Y[1] = 2.30) now STOPS at ZONE_B2 = +0.35: it runs
     -7.25 .. +0.35 plus the upright half-sections on each end (0.05 apiece)
     = 7.70 long, centred at (-7.30 + 0.40) / 2 = -3.45. That is zones A and B
     only — pole 2's zone (+1.30..+6.05) gets NO second tier at all. The cut
     end sits at x = 0.40, which is inside the visible span (-5.48..+5.16
     derived above), and that is deliberate: the open top has to be seen for
     the zone change to read, not hidden off frame. A two-tier archive behind
     poles 0 and 1 giving way to a single low run behind pole 2 is a genuinely
     different piece of racking, not a recolour of the same one. */
  const beamGeoFull = new THREE.BoxGeometry(13.40, 0.08, 0.50);
  const b0 = envMesh(beamGeoFull, m.rack, true);
  b0.position.set(-0.60, GROUND_Y + BEAM_Y[0], RACK_Z);
  env.add(b0);

  const beamGeoUpper = new THREE.BoxGeometry(7.70, 0.08, 0.50);
  const b1 = envMesh(beamGeoUpper, m.rack, true);
  b1.position.set(-3.45, GROUND_Y + BEAM_Y[1], RACK_Z);
  env.add(b1);

  /* Stored loads, sitting ON the beams: beam top is y + 0.04, the load is 0.85
     tall, so its centre is y + 0.465 and the upper level tops out at 3.19 —
     inside the 3.40 upright.

     The occupancy pattern is a HARD-CODED TABLE, not a hash of the index and
     absolutely not Math.random(): the scene must render identically every load.
     Bay centres are the seven pole-midpoint gaps: -6.30 -4.40 -2.50 -0.60
     +1.30 +3.20 +5.10, of which the middle three are exactly POLE_X, and bays
     0-2 / bay 3 / bays 4-6 are zones A / B / C (see ZONE_B1/ZONE_B2 above).

     THE PATTERN NOW DESCENDS ACROSS THE ZONES ON PURPOSE, instead of being one
     rhythm repeated three times: zone A (pole 0) is the dense archive, both
     levels almost full; zone B (pole 1, bay 3 only) is the thinning-out bay,
     one load on the lower level and none on the upper; zone C (pole 2) has NO
     upper level to put a load on (see the beam split above) and is left
     almost bare on the lower one — a cleared apron, not a warehouse that has
     gone out of business, but visibly a DIFFERENT kind of space from the
     archive 4.5 pitches behind it. */
  const OCCUPIED: readonly (readonly boolean[])[] = [
    [true, true, true, true, false, true, false],
    [true, true, false],
  ];
  const loadGeo = new THREE.BoxGeometry(1.45, 0.85, 0.48);
  let firstLoad = true;
  BEAM_Y.forEach((by, level) => {
    const row = OCCUPIED[level];
    for (let bay = 0; bay < row.length; bay++) {
      if (!row[bay]) continue;
      const l = envMesh(loadGeo, m.goods, firstLoad);
      firstLoad = false;
      l.position.set((xs[bay] + xs[bay + 1]) / 2, GROUND_Y + by + 0.465, RACK_Z);
      env.add(l);
    }
  });

  /* ---- the near-side goods ----
     WIDTH 1.30 -> 1.80, WHICH IS A SPACING FIX AND NOT A VALUE ONE. At 1.30 on
     a 1.9 pitch the gap between loads was 0.60 — nearly half a load — so
     reviewed on screen these read as three isolated pale slabs sitting apart on
     the floor rather than as a continuous run of palletised goods along the
     aisle edge. At 1.80 the gap is 0.10: enough of a seam that the run still
     articulates into separate pallets, not enough for the floor to show through
     and break it into objects. Nothing about the material changes — `goods`
     stays #1F242C — because the defect was rhythm, not value.

     RUN STOPS AT ZONE_B2, WHICH IS THE OTHER HALF OF THE ZONE-C READ. Zone C
     (pole 2's bay, x = -0.92 + 1.9k for k >= 1, i.e. x >= 0.98) used to carry
     the same near-side goods as the other two zones; now it carries none, so
     the third camera looks across a genuinely open floor rather than a
     shorter version of the same run the first two cameras see. k runs -2..0
     (x = -4.72 .. -0.92), which is zones A and B; the old k = 1..3 loads are
     simply not built. */
  const nearGeo = new THREE.BoxGeometry(1.80, NEAR_H, 0.95);
  for (let k = -2; k <= 0; k++) {
    const n = envMesh(nearGeo, m.goods, k === -2);
    n.position.set(-0.92 + RACK_PITCH * k, GROUND_Y + NEAR_H / 2, NEAR_Z);
    env.add(n);
  }

  /* ---- THREE PLACES, NOT ONE AISLE, TAKE TWO ----------------------------

     SEEN RENDERED, THE ZONE CONTENT ABOVE DID NOT READ AS THREE PLACES. The
     occupancy table, the beam split and the near-goods cutoff are all real
     variation, but they vary DENSITY within one continuous floor, one
     continuous wall line and one continuous set of sight lines — which is
     legible as "the shelves get emptier down the aisle", not as "this is a
     different part of the building". The user's objection was about the
     STRUCTURE reading as one corridor, and density alone cannot fix a
     structural complaint. So this pass adds two structural landmarks, and
     both are chosen specifically so they do NOT require moving a pole or
     touching a read window.

     THE CONSTRAINT, CHECKED FIRST. AIM_X[i] === POLE_X[i] for all three
     poles (see the AIM_X definition above), and READS is centred on the
     walker's arrival at each POLE_X, not at any feature of the aisle
     dressing. Neither landmark below moves a pole, changes POLE_X/AIM_X, or
     sits ON the walk line (z = 0) at any x a sight cone passes through — so
     READS, CONV and REG all stay exactly as authored. The arithmetic:
       · the dock panel sits at x = POLE_X[1] = -0.60, but in the RACK_Z
         plane (z ~ -3.55), 1.5 units behind the walk line — the same depth
         the racking already occupies. Pole 1's own cone points from
         (-0.6, 2.9, -2.1) to (-0.6, 1.05, 0), entirely in FRONT of the
         panel; the panel is background the cone is aimed away from, exactly
         like the racking it sits in front of.
       · the gate frame (see below) is ALSO built at that same background
         depth, for a reason worth stating because the first attempt at it
         got this wrong and it was caught only by looking at the render, not
         by the arithmetic above: a frame that straddles the WALK LINE
         (z = 0) needs one post on the z > 0 side, i.e. BETWEEN the camera
         (z = 7.422) and the walker (z = 0). At any phase where that post's
         screen-x is anywhere near the walker's, the nearer post draws OVER
         the farther walker — the exact "object driven through the figure"
         defect this whole pass exists to remove, just relocated onto new
         geometry. Seen rendered at ?phase=0.50, that is precisely what
         happened: the near jamb sat squarely across the walker's torso.
         So the frame does NOT straddle the walk line. It stands entirely in
         the RACK_Z plane, behind the walker at every phase (walker is always
         at z = 0, the frame at z ~ -3.55), so the depth order can only ever
         put the walker in front of it — never the reverse.
     So both landmarks are visual-only: they change what zone B and zone C
     look like without moving anything the timing math depends on, and
     neither can ever be nearer the camera than the walker.

     LANDMARK 1 — ZONE B READS AS A LOADING DOCK, NOT A DIMMER ARCHIVE.
     A single lighter panel (`m.dock`, one step up from `m.rack` in both
     colour and finish — see the material comment) fills pole 1's own bay in
     the rack backdrop, standing 0.05 proud of the rack plane (z = -3.55 vs
     RACK_Z = -3.6) so it silhouettes as a surface applied to the wall rather
     than merging into the upright behind it. Sized to the bay itself
     (RACK_PITCH - 0.3 = 1.60 wide, leaving the uprights at each side visible
     as a frame) and floor-to-low-beam tall (BEAM_Y[0] + 0.1 = 1.25), which
     reads as a roller-door panel sitting under the archive's own lower
     shelf, not a wall filling the whole bay height.

     LANDMARK 2 — ZONE C IS MARKED BY A GATEWAY CUT INTO THE BACKDROP, NOT A
     THRESHOLD THE WALKER STEPS THROUGH — reduced in scope from the first
     attempt for the occlusion reason above. A doorway frame — two jambs plus
     a header — stands in the RACK_Z plane, centred on x = ZONE_B2 = +0.35
     (the same x the floor cross-mark already sits on, so the gateway reads
     as standing right where the floor itself marks the zone change), jambs
     1.5 apart (x = -0.40 and +1.10) so upright k = 1 at x = +0.35 falls
     midway between them and reads as a centre mullion rather than being
     hidden or clashed with. Full height to a lintel at y = 2.60 — clear of
     the 1.815 crown, clear of the upper beam (2.30) and clear of the poles'
     own 3.05 head height. Built from `m.rack` (structural steel, matching
     the racking's own material) rather than a new material — a doorway is
     structure, not a surface. It is a landmark seen in the middle distance
     as the walker approaches and passes it, exactly like the dock panel;
     it is not something the figure ever passes between. */
  const DOCK_PANEL_W = RACK_PITCH - 0.30;   // 1.60, leaves the flanking uprights visible
  const dockPanel = envMesh(
    new THREE.BoxGeometry(DOCK_PANEL_W, BEAM_Y[0] + 0.10, 0.06), m.dock,
  );
  dockPanel.position.set(POLE_X[1], GROUND_Y + (BEAM_Y[0] + 0.10) / 2, RACK_Z + 0.05);
  env.add(dockPanel);

  const GATE_X = ZONE_B2;          // +0.35 — the same x the floor cross-mark already sits on
  const GATE_W = 1.50;             // jamb separation; centre mullion falls on upright k = 1
  const GATE_H = 2.60;
  const GATE_Z = RACK_Z + 0.05;    // background depth — see the occlusion note above
  const jambGeo = new THREE.BoxGeometry(0.14, GATE_H, 0.14);
  for (const sx of [-1, 1]) {
    const jamb = envMesh(jambGeo, m.rack, sx === -1);
    jamb.position.set(GATE_X + sx * (GATE_W / 2), GROUND_Y + GATE_H / 2, GATE_Z);
    env.add(jamb);
  }
  const header = envMesh(new THREE.BoxGeometry(GATE_W + 0.14, 0.14, 0.14), m.rack);
  header.position.set(GATE_X, GROUND_Y + GATE_H + 0.07, GATE_Z);
  env.add(header);

  return {
    root, figure, walk,
    // clear of the crown (1.815) by 85mm, so the leader starts in air rather
    // than inside the head
    headAnchor: new THREE.Vector3(0, 1.90, 0),
    fixed, env, lenses, aims, dirs, coneLens, owned,
    dispose: () => { owned.forEach((g) => g.dispose()); },
  };
}

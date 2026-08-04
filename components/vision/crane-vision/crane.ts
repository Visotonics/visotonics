/* ---------------------------------------------------------------------------
   Crane Vision — the subject: a loaded spreader rising between two gantry legs.

   The claim being dramatised is "crane vibration never becomes inspection
   error", so the scene has exactly two moving parts: a load that RISES at
   constant speed, and a sway that never stops. Everything else — the legs, the
   two camera heads — is bolted down, because the whole point is that the fixed
   installation is unbothered by the moving one.

   THE CONTAINER IS NOT MODELLED HERE. It is the exact box from
   container-vision, parented onto a spreader, exactly as gate-vision parents it
   onto a chassis. Three scenes, one container: if Crane Vision invented its own
   the page would be inspecting a different object in every section.

   THE LIFT GROUP'S ORIGIN IS THE SHEAVE, NOT THE CONTAINER.
   This is the one structural decision in this file worth stating twice. The
   scene applies the sway as `lift.rotation.z`, and a rotation is about the
   group's ORIGIN — so with the origin at the container's own centre the box
   would rock like a see-saw around its middle, which is not what a hanging load
   does. A load on ropes is a PENDULUM: it pivots about the rope top, so the
   container swings sideways as well as tilting, and the ropes stay straight.
   Hence `DROP`: the container hangs at local y = -DROP and the ropes run from
   the spreader up to local y = 0, which is the pivot.

   Layout (metres, subject plane at z = 0):
     · the container's long axis runs along X and its damaged face looks at +Z,
       the camera side — the same orientation Container Vision inspects it in.
     · the two legs stand at x = ±LEG_X, at the same depth as the container, and
       run 20 m so they leave the top and bottom of a portrait frame.
     · nothing is modelled below: the load is in the air, which is the shot.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { buildContainer } from "../container-vision/container";
import { H as C_H, L as C_L } from "../container-vision/container";
import { warmContainerTextures } from "../container-vision/materials";
import type { MaterialSet } from "../container-vision/materials";
import { CANONICAL_BRUSHED, makeMetal, metalBox, tintMetal } from "../_vision/metal";

/* THE FRAMING CONSTANT, and the only one the camera derivation needs.

   HALF_W is the world half-width the camera holds at the subject plane (z = 0).
   Everything else about the framing falls out of it and the RUNTIME aspect —
   see scene.tsx, which computes distance and visible half-height per frame the
   same way yard-vision derives its camera height from `fitRad`.

   4.1 is derived, not chosen. Seen at the camera's small azimuth the container
   projects about 6.5 m wide (6.058·cos 0.22 + 2.438·sin 0.22 = 5.91 + 0.53), so
   a half-width of 4.1 puts the box across ~74% of the frame — filling it
   without its ends touching the legs, which stand just inside the edges. */
export const HALF_W = 4.1;

/** Where the legs stand. Just inside HALF_W, so they read as the frame's own
    edges without ever being clipped by it. */
export const LEG_X = 3.7;

/** Rope length from the sheave (the lift group's origin) to the container's
    centre. Long enough that the ropes always leave the top of a portrait frame
    while the container is anywhere in it: the visible half-height is ~9 m, so
    even with the spreader at the very bottom of frame the rope tops are ~9 m
    clear of the top. */
export const DROP = 20;

/* Spreader. 6.4 x 0.34 x 0.5 — a shade wider than the 6.058 m box, which is
   what a spreader is: it reaches PAST the container to its corner castings. */
const SPR_W = 6.4, SPR_H = 0.34, SPR_D = 0.5;
/** Air gap between the container's roof and the spreader's underside. */
const SPR_GAP = 0.10;
/** Spreader centre, in lift-local space. */
export const SPR_Y = -DROP + C_H / 2 + SPR_GAP + SPR_H / 2;   // -DROP + 1.5655
/** Top of the payload — the highest thing that must be clear of the frame's
    bottom edge at p = 0. The ropes above it are meant to be cut off. */
export const PAYLOAD_TOP = SPR_Y + SPR_H / 2;                  // -DROP + 1.7355
/** Bottom of the payload: the container's floor. */
export const PAYLOAD_BOT = -DROP - C_H / 2;                    // -DROP - 1.2955

/* Deliberately BYTE-IDENTICAL to gate-vision's DARK_METAL.

   metal.ts caches on the generating parameters, so a spec that differs by a
   digit is a silent cache miss costing a fresh albedo, a fresh roughness canvas
   and a full Sobel normal derivation on whatever frame the visitor happens to
   be scrolling. Reusing gate's exact spec means that on any page carrying both
   scenes the second one is free — and `warmCraneTextures` below builds it at
   idle so it is free even on a page carrying only this one. */
const CRANE_DARK = { base: "#2B313B", kind: "plate", metalness: 0.78, rough: 0.5 } as const;

export interface CraneMaterials {
  dark: THREE.MeshStandardMaterial;
  /** the gantry structure — deliberately lighter than `dark`, see buildCraneMaterials */
  leg: THREE.MeshStandardMaterial;
  lens: THREE.MeshStandardMaterial;
  all: THREE.Material[];
  dispose: () => void;
}

export function buildCraneMaterials(): CraneMaterials {
  const darkMetal = makeMetal(CRANE_DARK);
  const dark = darkMetal.material;

  /* THE LEGS GET THEIR OWN, LIGHTER STEEL — and this is a legibility fix, not a
     styling preference. Built on gate's DARK_METAL (base #2B313B) they rendered
     as near-black silhouettes against a near-black canvas: the container looked
     like it was floating between two smudges, and the gantry — the thing that
     makes this a CRANE scene rather than a box on a wire — disappeared.

     The fix must not invent a new makeMetal spec, because a non-canonical spec
     misses metal.ts's cache and pays a full albedo + roughness + Sobel pass on
     the visitor's scroll path. So the legs take CANONICAL_BRUSHED — already
     generated and warmed during idle for every scene on the site — and tint it.
     tintMetal shares all three maps and clones only the material, so this costs
     one clone and nothing else. Tinting a NEUTRAL-based metal is the documented
     safe case; tinting an already-coloured one is the mistake that gave us
     blue-times-kraft. */
  const legMetal = makeMetal({ ...CANONICAL_BRUSHED });
  const leg = tintMetal(legMetal.material, "#59636F", { metalness: 0.55 });
  leg.transparent = true;
  leg.opacity = 0;
  legMetal.dispose();   // the maps live in metal.ts's cache; this material does not
  // camera-head glass. No maps, so nothing to cache and nothing to warm.
  const lens = new THREE.MeshStandardMaterial({
    color: "#05070C", metalness: 0.95, roughness: 0.08, envMapIntensity: 1.8,
    transparent: true, opacity: 0,
  });
  const all: THREE.Material[] = [dark, leg, lens];
  return {
    dark, leg, lens, all,
    /* MATERIALS ONLY. The metal maps live in metal.ts's cache and are shared
       with gate-vision — disposing them here would leave that scene sampling a
       destroyed texture, the exact trap gate-vision/materials.ts flags. */
    dispose: () => { darkMetal.dispose(); lens.dispose(); },
  };
}

/** Generate everything this scene paints, at idle, so the build that runs on
 *  the scroll path gets only cache hits. Registered in _vision/lazy.tsx exactly
 *  the way loadGate registers warmGateTextures.
 *
 *  Two things: the container's own canvases (shared with Container and Gate
 *  Vision), and the ONE non-canonical metal above. */
export function warmCraneTextures() {
  warmContainerTextures();
  makeMetal(CRANE_DARK).dispose();
}

export interface CraneAnchor {
  id: string;
  /** LIFT-local position — projected through lift.matrixWorld each frame. */
  pos: THREE.Vector3;
  normal: THREE.Vector3;
}

export interface CraneModel {
  /** container + spreader + ropes. Origin is the SHEAVE — see the header.
      Driven vertically by position.y and swayed by rotation.z. */
  lift: THREE.Group;
  /** the two gantry legs and their camera heads. Never moves. */
  fixed: THREE.Group;
  /** world positions of the two head lenses, for the sight-cone apexes. */
  heads: THREE.Vector3[];
  /** lift-local anchors for the callouts */
  anchors: Record<string, CraneAnchor>;
  /** hardware meshes whose opacity the intro has to ramp alongside the shell */
  containerHardware: THREE.Mesh[];
  /** geometry THIS FILE allocated. metalBox geometry is cached in metal.ts and
      is deliberately NOT in here. */
  owned: THREE.BufferGeometry[];
}

/* Rounded boxes throughout, same house rule as gate.ts: a perfect 90° edge is
   the strongest "toy" cue there is, and the radius is what catches the thin
   highlight that reads as steel. */
const box = (w: number, h: number, d: number, m: THREE.Material) =>
  metalBox(w, h, d, m, Math.min(w, h, d) * 0.09);

export function buildCrane(mats: CraneMaterials, cmats: MaterialSet): CraneModel {
  const lift = new THREE.Group();
  const fixed = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  const put = (g: THREE.Group) => (m: THREE.Mesh, x: number, y: number, z: number) => {
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const addL = put(lift);
  const addF = put(fixed);

  /* ---- the container: the real one ---- */
  const container = buildContainer(cmats.steel, cmats.dark, cmats.front.material);
  container.group.position.set(0, -DROP, 0);
  lift.add(container.group);

  /* ---- spreader ---- */
  addL(box(SPR_W, SPR_H, SPR_D, mats.dark), 0, SPR_Y, 0);
  // twistlocks bridging the gap down onto the container's corner castings —
  // without them the beam floats a hand's width above the box it is carrying
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    addL(
      box(0.26, SPR_GAP + 0.08, 0.26, mats.dark),
      sx * (C_L / 2 - 0.2), -DROP + C_H / 2 + SPR_GAP / 2, sz * 1.0,
    );
  }

  /* ---- ropes ----
     Four, from the spreader's corners straight up to the sheave at local y = 0,
     so they run out of the top of frame at every point of the lift. ONE
     geometry instance shared by all four: four identical 18-metre cylinders
     built separately is four buffers for one shape. */
  const ROPE_LEN = -PAYLOAD_TOP;                 // PAYLOAD_TOP is negative: 18.2645
  const ropeGeo = new THREE.CylinderGeometry(0.05, 0.05, ROPE_LEN, 8);
  owned.push(ropeGeo);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const rope = new THREE.Mesh(ropeGeo, mats.dark);
    rope.castShadow = true;
    rope.position.set(sx * (SPR_W / 2 - 0.35), PAYLOAD_TOP + ROPE_LEN / 2, sz * (SPR_D / 2 - 0.09));
    lift.add(rope);
  }

  /* ---- gantry legs (fixed) ----
     20 m, centred on the frame's middle, so both ends are always off screen and
     the legs read as structure continuing past the shot rather than as two
     posts standing in it. */
  const LEG_H = 20;
  for (const sx of [-1, 1]) {
    addF(box(0.55, LEG_H, 0.55, mats.leg), sx * LEG_X, 0, 0);
    // a short cross-brace either side, so a 20m column has some scale on it
    for (const y of [-5.4, 5.4]) {
      addF(box(0.22, 0.22, 1.5, mats.leg), sx * LEG_X, y, 0);
    }
  }

  /* ---- camera heads ----
     Same construction as gate-vision's gantry heads — body, stalk, lens — but
     mounted on the OUTSIDE face of each leg at mid-height and yawed to look
     across at the load. Mid-height is y = 0, which is the middle of the frame,
     which is where the container is at the middle of its rise.

     THE HEAD MOUNTS INBOARD, AND EVERY PART OF IT MOVES TOGETHER. This block
     has now been got wrong twice, in opposite directions, so the reasoning is
     written out in full.

     The leg is 0.55 wide centred on LEG_X = 3.7, so it occupies |x| 3.425 ..
     3.975. The camera looks ACROSS at the load, which hangs at x ~ 0 — i.e.
     it looks INBOARD, toward smaller |x|.

     Mistake 1: the body sat at `sx * LEG_X`, dead-centred on the leg and
     narrower than it (0.42 vs 0.55). Fully swallowed — a socket cut into the
     column, not a unit bolted to it.

     Mistake 2: the body was pushed OUTBOARD to `LEG_X + 0.25`. That does make
     it protrude, but on the far side from the thing it is looking at, so the
     leg itself now stands between the lens and the load. A camera cannot be
     behind its own mast.

     So the housing hangs off the leg's INNER face and protrudes toward the
     load. BODY_IN = 0.40 puts the body centre at |x| 3.30, spanning 3.09 ..
     3.51: it overlaps the leg's inner face (3.425) by 0.085 — enough to read
     as bolted on — and stands 0.335 clear of it into open air.

     LENS AND `heads` MOVE WITH IT, and must. A lens left at the old
     `LEG_X - 0.30` = 3.40 sits inside the leg's own volume, which is exactly
     the "cameras are inside the rails" failure. The lens now sits at
     `LEG_X - 0.65` = 3.05, just proud of the housing's inner face (3.09), and
     the `heads[]` apex 0.03 ahead of it at 3.02.

     Moving `heads[]` is safe and correct: scene.tsx derives the cone apex,
     target and half-angle FROM `heads[]` every mount, so the cone re-solves
     itself. A cone whose apex is buried in the leg is not geometry worth
     preserving. */
  const BODY_IN = 0.40;
  const heads: THREE.Vector3[] = [];
  const lensGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 18);
  owned.push(lensGeo);
  for (const sx of [-1, 1]) {
    const body = addF(box(0.42, 0.34, 0.62, mats.dark), sx * (LEG_X - BODY_IN), 0, 0.55);
    body.rotation.y = -sx * 0.5;
    // mounting boss bridging the leg's inner face to the housing
    addF(box(0.16, 0.22, 0.16, mats.dark), sx * (LEG_X - 0.16), 0.20, 0.50);
    const lens = new THREE.Mesh(lensGeo, mats.lens);
    lens.rotation.z = Math.PI / 2;                 // cylinder axis along X
    lens.position.set(sx * (LEG_X - 0.65), -0.06, 0.62);
    fixed.add(lens);
    heads.push(new THREE.Vector3(sx * (LEG_X - 0.68), -0.06, 0.62));
  }

  /* ---- callout anchors, in LIFT-local space ----
     Both sit on the container's near face (z = W/2 + a hair, clear of the
     corrugation crests) so their leaders start on the surface being read.

     The severity anchor is deliberately BELOW the container's centre. The load
     rises the whole loop, so by the end of the severity window it is near the
     top of frame — an anchor above centre projects past the overlay's upper
     bound and placeCallout rejects the label outright, which is the failure
     that has now cost passes on the tank valve, the yard slot and gate's first
     two reads. Low anchor plus a DOWNWARD leader keeps the card in frame for
     the whole window. */
  const anchors: Record<string, CraneAnchor> = {
    sharp: {
      id: "sharp",
      pos: new THREE.Vector3(-1.70, -DROP + 0.95, 1.26),
      normal: new THREE.Vector3(0, 0, 1),
    },
    severity: {
      id: "severity",
      pos: new THREE.Vector3(-1.00, -DROP - 0.95, 1.26),
      normal: new THREE.Vector3(0, 0, 1),
    },
  };

  return { lift, fixed, heads, anchors, containerHardware: container.hardware, owned };
}

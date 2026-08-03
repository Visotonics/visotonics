/* ---------------------------------------------------------------------------
   ASCII hero — the forms the field morphs through.

   Four silhouettes: the container, the crane lift, the camera, the people it
   all watches. They are SILHOUETTE GENERATORS, not scenes — the field renders
   them through an override material that emits a silhouette mask and its
   shading, so no form here carries a real material, nothing is textured, and
   nothing needs warming. What matters is the outline and the big planes,
   because that is all an 11x18 character cell can carry.

   v4 CROPPED ALL OF THEM HARDER, and that is the theme of this revision. The
   scene now frames the forms to OVERFLOW the viewport rather than to sit inside
   it, which means every square of the form is bigger and every thin member is
   more expensive. So each form was cut down to the ONE thing it is an icon of,
   and the supporting furniture that read fine at v3's cell size and framing —
   crane legs, a camera pole, two extra pedestrians — was deleted outright. At
   this scale support furniture is not context, it is clutter.

   EVERY FORM IS NORMALISED TO ONE SIZE at build. The morph reads as one mass
   RESHAPING only if the forms occupy the same screen area — a small camera
   morphing into a huge container reads as a zoom, and the illusion dies. So
   each group is measured, recentred on the origin and scaled to a common
   half-height/half-width budget, and the scene's camera never has to care
   which form is up.

   GEOMETRY OWNERSHIP: everything in this file creates its geometry fresh —
   plain Box/Cylinder/Sphere primitives and buildContainer's own meshes — and
   deliberately never uses metalBox, whose geometry is CACHED AND SHARED
   site-wide. That is what makes the blanket traverse-and-dispose in dispose()
   safe here and nowhere else.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { buildContainer } from "../container-vision/container";

export interface AsciiForm {
  key: string;
  group: THREE.Group;
  /** optional per-frame life; t is SECONDS, not phase — forms don't loop */
  tick?: (t: number) => void;
  dispose: () => void;
}

/* The shared size budget. Container-sized, since the container is the anchor
   form: half-height 1.35, half-width 3.0. Everything else is scaled into it. */
export const FORM_HY = 1.35;
export const FORM_HX = 3.0;
/* Aliases so normalise() below reads the same as it always did — the scene
   frames its camera from the exported pair, so the budget and the framing can
   never drift apart. */
const HY = FORM_HY;
const HX = FORM_HX;

/* One throwaway material pair for buildContainer — the override material is
   what actually renders, so these exist only to satisfy the signature. */
const mk = () => new THREE.MeshStandardMaterial();

/* `measure` — normalise against a SUB-PART instead of the whole group. The
   crane form is the reason this exists: measured whole, its cables consumed the
   height budget and the hanging box shrank to a lump on strings. Measuring the
   BOX alone sizes the thing the form is about, and everything attached above it
   overflows the frame — which is the tight-crop concept working, not a bug. */
function normalise(group: THREE.Group, measure?: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(measure ?? group);
  const c = box.getCenter(new THREE.Vector3());
  const s = box.getSize(new THREE.Vector3());
  const scale = Math.min(HY / (s.y / 2), HX / (s.x / 2));
  group.position.sub(c.multiplyScalar(scale));
  group.scale.setScalar(scale);
}

function disposeDeep(group: THREE.Group, mats: THREE.Material[]) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
  });
  mats.forEach((m) => m.dispose());
}

/* ---- 01 · the container --------------------------------------------------
   The brand object, verbatim — sculpted damage included, because it is real
   geometry and the normals carry it into the field. Edges/lines hidden: a
   LineSegments under a mesh override is undefined behaviour. */
export function containerForm(): AsciiForm {
  const a = mk(), b = mk();
  const build = buildContainer(a, b);
  const group = new THREE.Group();
  group.add(build.group);
  build.group.traverse((o) => {
    if ((o as THREE.Line).isLine) o.visible = false;
  });
  normalise(group);
  return {
    key: "container",
    group,
    dispose: () => disposeDeep(group, [a, b]),
  };
}

/* ---- 02 · the crane lift -------------------------------------------------
   TIGHT CROP. The legs are gone. Two reasons, and both are v4's framing:

     · thin verticals parked at the frame edges read as NOISE at an 11x18 cell —
       a 0.42-wide member lands on one or two columns, the yaw slides it between
       them, and the field spends two columns flickering for no gain.
     · the icon of Crane Vision is not the gantry. It is THE BOX HANGING. Draw
       the gantry and the box becomes a detail inside a structure; delete it and
       the box is the subject, suspended from something above the frame.

   Which is the whole trick here: the cables run UP AND OFF THE TOP OF FRAME
   once the scene's overflow framing has it, so the box hangs from somewhere
   outside the picture — the same move as the reference's lock exiting its
   window. The sway is the one piece of life it keeps: a pendulum about the rope
   top, never about the box's own centre (the sheave-pivot rule from
   crane-vision: things swing from where they hang). */
export function craneForm(): AsciiForm {
  const a = mk(), b = mk();
  const group = new THREE.Group();

  /* The pivot sits at the ROPE TOP, y 2.6 — where the cables leave the frame.
     The rig below is authored in the form's own coordinates and then offset by
     -2.6 into the swing group, so the numbers here can be read as heights in
     the picture rather than as offsets from a pivot. */
  const swing = new THREE.Group();
  swing.position.y = 2.6;
  group.add(swing);
  const rig = new THREE.Group();
  rig.position.y = -2.6;
  swing.add(rig);

  const build = buildContainer(a, b);
  build.group.traverse((o) => {
    if ((o as THREE.Line).isLine) o.visible = false;
  });
  build.group.scale.setScalar(0.8);
  build.group.position.y = -1.9;
  rig.add(build.group);

  const spreader = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 0.8), a);
  spreader.position.y = -0.35;
  rig.add(spreader);

  /* Four cables from the spreader's corners, not two from its centreline —
     with the legs gone these are the only verticals left, and four of them
     spaced across the box is what still reads as a LIFT rather than as a
     hanging crate. Length 3.0 centred at y 1.15 puts their feet on the spreader
     and their heads at the pivot, i.e. off the top of frame. */
  const cableGeo = new THREE.CylinderGeometry(0.03, 0.03, 3.0, 6);
  for (const sx of [-1.9, 1.9]) {
    for (const sz of [-0.28, 0.28]) {
      const cbl = new THREE.Mesh(cableGeo, a);
      cbl.position.set(sx, 1.15, sz);
      rig.add(cbl);
    }
  }

  normalise(group, build.group);
  return {
    key: "crane",
    group,
    tick: (t) => { swing.rotation.z = 0.05 * Math.sin(t * 0.9); },
    dispose: () => disposeDeep(group, [a, b]),
  };
}

/* ---- 03 · the camera -----------------------------------------------------
   One CCTV head, huge, and FATTENED TO ICON PROPORTIONS. The product's whole
   premise in a single object, so it gets the classic silhouette: boxy body,
   hooded barrel, bracket. Every part is thicker than v3's — a barrel that is
   accurate at 0.42 is three cells across at this framing, and three cells is a
   smudge; at 0.48/0.56 it is a lens.

   THE POLE IS GONE. Single-icon rule: with the frame this tight the pole is the
   tallest thing in it, and the eye reads whatever is tallest as the subject.
   The camera is the subject. Support furniture is clutter. Slow yawing
   patrol. */
export function cameraForm(): AsciiForm {
  const a = mk();
  const group = new THREE.Group();
  const head = new THREE.Group();
  group.add(head);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.15, 1.1), a);
  head.add(body);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 1.0, 20), a);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = 1.86;
  head.add(barrel);

  // the hood is most of the icon: without it this is a box with a tin can
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 1.3), a);
  hood.position.set(1.6, 0.7, 0);
  head.add(hood);

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.1, 0.24), a);
  bracket.position.set(-0.8, -0.95, 0);
  head.add(bracket);

  head.rotation.z = -0.1;
  normalise(group);
  return {
    key: "camera",
    group,
    tick: (t) => { head.rotation.y = 0.35 * Math.sin(t * 0.5); },
    dispose: () => disposeDeep(group, [a]),
  };
}

/* ---- 04 · the person -----------------------------------------------------
   A HEAD AND SHOULDERS, huge and cropped. This form has now been rebuilt three
   times and the first two failures were the same failure:

     · v3 used three small walking figures. Small and separated, they were
       noise — nothing in the frame had mass.
     · v4 used one full-length walker. It still would not read, and the reason
       is mechanical rather than aesthetic: the field builds its density by
       BLURRING the silhouette mask, and a blur is exactly what erases a thin
       subject. An arm two cells wide comes out of softMask at a third of its
       value, gets multiplied by the interior term, and lands on the ramp's
       floor. Turning the walker to profile and fattening its limbs helped and
       could never have been enough — a standing human is a tall thin shape,
       and a tall thin shape is the one thing this medium cannot render.

   So the form stops being a whole body. A bust is WIDE — shoulders carry real
   horizontal mass, which is what survives the blur — and it is the single most
   legible human silhouette there is: two bumps and a dome, readable at any
   resolution, which is why every icon set in the world draws a person this way.

   It is also the truest of the four to the product. This is the framing a
   security camera actually gives you of a person, and "the people it all
   watches" was the brief. The head turns slowly, because a face that never
   moves is a mannequin. */
export function peopleForm(): AsciiForm {
  const a = mk();
  const group = new THREE.Group();

  /* The shoulder mass: a sphere squashed into an ellipsoid. Scaled rather than
     built wide, so one cheap sphere carries the whole chest — and the scale is
     applied to the MESH, not the group, so normalise() still measures it. */
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), a);
  body.scale.set(2.6, 0.9, 0.85);
  body.position.y = -0.05;
  group.add(body);

  /* Head and neck ride one group so the turn takes both — a head that rotates
     off a static neck reads as a glitch, not a look. */
  const look = new THREE.Group();
  look.position.y = 0.55;
  group.add(look);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.5, 14), a);
  neck.position.y = 0.07;
  look.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.60, 22, 16), a);
  head.position.y = 0.60;
  look.add(head);

  normalise(group);
  return {
    key: "people",
    group,
    tick: (t) => {
      /* A slow scan and a slight tilt into it, on periods that do not divide
         evenly — the head never repeats the same pose on a beat you can count,
         which is what separates "alive" from "animated". */
      look.rotation.y = 0.55 * Math.sin(t * 0.37);
      look.rotation.z = 0.07 * Math.sin(t * 0.23);
    },
    dispose: () => disposeDeep(group, [a]),
  };
}

export const buildForms = (): AsciiForm[] => [
  containerForm(), craneForm(), cameraForm(), peopleForm(),
];

/* ---------------------------------------------------------------------------
   Vision scenes — camera rig.

   Shared by every flagship animation. The house camera language, fixed once so
   all nine systems move the same way:

     · a PURE PAN. Elevation and look-at height are constants on every key, so
       the camera swings and slides but never cranes, tilts or bobs. Whatever
       has to be readable (a container roof, a gantry beam) is made readable by
       choosing one elevation high enough to see it from, not by rising to it.
     · always travelling. Keys alternate stop / drift so the camera is never
       fully parked, but the stops still read as deliberate holds.
     · cyclic with NO closing key at p=1 — the path wraps from the last key
       straight back to key 0, so the loop has nothing to land on and no seam.
--------------------------------------------------------------------------- */

export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth01 = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c); };
export const smoothstep = (a: number, b: number, x: number) => smooth01((x - a) / (b - a));
// smootherstep — zero velocity AND zero acceleration at both ends, so moves
// glide out of and into their holds with no perceptible snap
export const easeInOut = (t: number) => { const c = clamp01(t); return c * c * c * (c * (c * 6 - 15) + 10); };

export interface CamKey {
  /** position in the loop, 0..1, ascending. No key at 1 — the ring wraps. */
  p: number;
  /** azimuth (rad) around the subject */
  az: number;
  /** GROUND distance from the look-at point, not slant range. Camera height is
      a scene constant, so this is the only thing distance changes. */
  rad: number;
  /** look-at point. Its y is constant across a scene's keys by house rule. */
  t: [number, number, number];
}

export interface CamPose {
  az: number; rad: number;
  tx: number; ty: number; tz: number;
}

/** The pose the scene opens on: the whole subject, centred and alone. */
export type Opening = CamPose;

// Catmull-Rom, evaluated on the wrapped key ring. Unlike straight segments this
// carries a continuous tangent across every key INCLUDING the wrap from the
// last key back to the first — no seam, no direction snap, no repeat jolt.
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

/** Build a sampler over a cyclic keyframe ring. */
export function makeCamPath(keys: CamKey[]) {
  const n = keys.length;
  const wrap = (i: number) => keys[((i % n) + n) % n];
  return function sample(p: number): CamPose {
    let i = n - 1;
    for (let k = 0; k < n; k++) if (p >= keys[k].p) i = k;
    const a = wrap(i);
    const b = wrap(i + 1);
    const span = (b.p > a.p ? b.p : b.p + 1) - a.p; // final span closes onto key 0 at p=1
    const t = span > 0 ? (p - a.p) / span : 0;
    const m1 = wrap(i - 1);
    const p2k = wrap(i + 2);
    const f = (sel: (k: CamKey) => number) => cr(sel(m1), sel(a), sel(b), sel(p2k), t);
    return {
      az: f((k) => k.az), rad: f((k) => k.rad),
      tx: f((k) => k.t[0]), ty: f((k) => k.t[1]), tz: f((k) => k.t[2]),
    };
  };
}

/** Blend the opening pose into a path pose. `io` is 0 at the open, 1 in loop. */
export function blendPose(open: Opening, k: CamPose, io: number): CamPose {
  return {
    az: lerp(open.az, k.az, io), rad: lerp(open.rad, k.rad, io),
    tx: lerp(open.tx, k.tx, io), ty: lerp(open.ty, k.ty, io), tz: lerp(open.tz, k.tz, io),
  };
}

/* Put the camera on the pose at a LOCKED height.

   This is what actually makes the move a pan. Deriving height from an
   elevation angle looks fixed but isn't: every change in distance slides the
   camera up or down the cone, and the opening push-in becomes a crane-down.
   Here height is a scene constant, distance is measured along the ground, and
   the only thing that ever changes vertically is how far down the lens tilts
   to keep the subject centred. */
export function placeCamera(camera: { position: { set(x: number, y: number, z: number): void } }, pose: CamPose, camY: number) {
  camera.position.set(
    pose.tx + pose.rad * Math.sin(pose.az),
    camY,
    pose.tz + pose.rad * Math.cos(pose.az),
  );
}

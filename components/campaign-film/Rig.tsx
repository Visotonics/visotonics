"use client";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll, smooth, clamp01 } from "./state";

type KFrame = { t: number; pos: [number, number, number]; look: [number, number, number]; fov: number };

/** Camera keyframes — TRIMMED from the source's full 12-keyframe, whole-site journey down to the
 *  five that cover this film's loop (p: 0 -> 0.52; see index.tsx for why 0.52 is the loop's natural
 *  end point). The lookup below only ever needs the bracket p falls in, so keyframes past t=0.52
 *  are simply never reached and were removed rather than kept as dead weight. Every kept keyframe's
 *  t/pos/look/fov values are UNCHANGED from the source — this is a deletion, not a re-derivation. */
const KF: KFrame[] = [
  { t: 0.0, pos: [0, 6.2, 26], look: [0, 4.2, -14], fov: 36 },
  { t: 0.08, pos: [3, 2.6, 13], look: [0, 1.3, -8], fov: 40 },
  { t: 0.2, pos: [5, 3.5, 12.2], look: [0, 1.7, 0], fov: 40 },
  { t: 0.34, pos: [6, 3.9, 12.6], look: [0, 1.7, 0], fov: 40 },
  { t: 0.52, pos: [0, 3.7, 13.8], look: [0, 1.7, 0], fov: 42 }, // scan: zoomed out for readable overlays
];

const _look = new THREE.Vector3();

export default function Rig() {
  useFrame(({ camera, clock }) => {
    const p = scroll.p;
    let i = 0;
    while (i < KF.length - 2 && p > KF[i + 1].t) i++;
    const a = KF[i];
    const b = KF[i + 1];
    const t = smooth(clamp01((p - a.t) / (b.t - a.t)));
    const drift = Math.sin(clock.elapsedTime * 0.35) * 0.06;
    camera.position.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t + drift,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t + Math.cos(clock.elapsedTime * 0.3) * 0.04,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t
    );
    _look.set(
      a.look[0] + (b.look[0] - a.look[0]) * t,
      a.look[1] + (b.look[1] - a.look[1]) * t,
      a.look[2] + (b.look[2] - a.look[2]) * t
    );
    camera.lookAt(_look);
    const cam = camera as THREE.PerspectiveCamera;
    const fov = a.fov + (b.fov - a.fov) * t;
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

/* ---------------------------------------------------------------------------
   Verbatim port of the source site's lib/palette.ts. Only the import of
   `clamp01` was repointed at this folder's own state.ts.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { clamp01 } from "./state";

export type Stop = { p: number; inner: string; outer: string };

export const STOPS: Stop[] = [
  { p: 0.0, inner: "#f7f2ea", outer: "#e8ecf5" }, // warm off-white
  { p: 0.22, inner: "#eef3fd", outer: "#d7e3fb" }, // cool white
  { p: 0.34, inner: "#d9e6ff", outer: "#aac4f0" }, // peak daylight blue — threshold begins
  { p: 0.44, inner: "#2b4470", outer: "#16294d" }, // threshold complete — world is dark
  { p: 0.6, inner: "#12234a", outer: "#0a1630" }, // deep steel (cargo/yard)
  { p: 0.85, inner: "#0a1836", outer: "#050d24" }, // deep navy
  { p: 1.0, inner: "#0a1836", outer: "#050d24" }, // hold navy
];

const _a = new THREE.Color();
const _b = new THREE.Color();
const _inner = new THREE.Color();
const _outer = new THREE.Color();

export type PaletteSample = {
  inner: THREE.Color;
  outer: THREE.Color;
  gradient: string;
};

export function samplePalette(p: number): PaletteSample {
  const t = clamp01(p);
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1].p) i++;
  const s0 = STOPS[i];
  const s1 = STOPS[i + 1];
  const k = clamp01((t - s0.p) / (s1.p - s0.p));

  _inner.copy(_a.set(s0.inner)).lerp(_b.set(s1.inner), k);
  _outer.copy(_a.set(s0.outer)).lerp(_b.set(s1.outer), k);

  const gradient = `radial-gradient(120% 90% at 50% 8%, ${_inner.getStyle()} 0%, ${_outer.getStyle()} 100%)`;
  return { inner: _inner, outer: _outer, gradient };
}

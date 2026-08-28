"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll, range, smooth, window01 } from "./state";
import { radialShadowTexture } from "./textures";

/* Verbatim port of the source's components/scene/Gate.tsx; only the two imports were repointed at
 * this folder's own state/textures. Two inspection towers joined by a scanner gantry; barrier arms
 * lift as the container approaches, then the whole rig dissolves once the world darkens (0.40-0.46)
 * and the container scan begins — it never returns within this film's loop (p: 0 -> 0.52). */

type FadeEntry = { m: THREE.Material & { opacity: number; emissiveIntensity?: number }; base: number; em: number };

const RED = new THREE.Color("#ff5d5d");
const GREEN = new THREE.Color("#6fe3a5");

const HALF = 3.95;
const LEG_W = 0.5;
const LEG_D = 0.6;
const LEG_H = 4.3;
const BEAM_Y = 3.95;
const SPAN = HALF * 2 + LEG_W;

function Tower({ x }: { x: number }) {
  const s = Math.sign(x);
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, LEG_H / 2, 0]} castShadow>
        <boxGeometry args={[LEG_W, LEG_H, LEG_D]} />
        <meshStandardMaterial color="#3a4a63" roughness={0.42} metalness={0.7} envMapIntensity={1.0} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[LEG_W + 0.34, 0.22, LEG_D + 0.34]} />
        <meshStandardMaterial color="#26304a" roughness={0.6} metalness={0.4} envMapIntensity={0.8} />
      </mesh>
      <mesh position={[-s * (LEG_W / 2), LEG_H / 2, LEG_D / 2 - 0.06]}>
        <boxGeometry args={[0.08, LEG_H - 0.2, 0.14]} />
        <meshStandardMaterial color="#2a3550" roughness={0.5} metalness={0.55} envMapIntensity={0.9} />
      </mesh>
      <mesh position={[-s * 0.4, 1.5, 0.3]}>
        <boxGeometry args={[0.34, 1.0, 0.5]} />
        <meshStandardMaterial color="#1c2740" roughness={0.5} metalness={0.5} envMapIntensity={0.9} />
      </mesh>
      <mesh position={[-s * 0.34, 2.55, 0.3]}>
        <boxGeometry args={[0.24, 0.4, 0.4]} />
        <meshStandardMaterial color="#222c46" roughness={0.5} metalness={0.5} envMapIntensity={0.9} />
      </mesh>
      <mesh position={[-s * 0.52, 1.35, 0.34]}>
        <boxGeometry args={[0.22, 0.26, 0.3]} />
        <meshStandardMaterial color="#11162a" roughness={0.4} metalness={0.6} envMapIntensity={0.8} />
      </mesh>
      <mesh position={[-s * 0.64, 1.35, 0.34]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#0a1020" emissive="#8fd0f5" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[-s * 0.27, 2.0, 0.33]}>
        <boxGeometry args={[0.05, 3.2, 0.06]} />
        <meshStandardMaterial color="#8fd0f5" emissive="#8fd0f5" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.7, 1.7]} />
        <AOMaterial />
      </mesh>
    </group>
  );
}

function AOMaterial() {
  const tex = useMemo(() => radialShadowTexture(), []);
  return <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />;
}

export default function Gate() {
  const root = useRef<THREE.Group>(null!);
  const armL = useRef<THREE.Group>(null!);
  const armR = useRef<THREE.Group>(null!);
  const lampL = useRef<THREE.MeshStandardMaterial>(null!);
  const lampR = useRef<THREE.MeshStandardMaterial>(null!);
  const scanA = useRef<THREE.MeshStandardMaterial>(null!);
  const scanB = useRef<THREE.MeshStandardMaterial>(null!);
  const fade = useRef<{ list: FadeEntry[]; armed: boolean }>({ list: [], armed: false });

  useFrame(() => {
    const open = smooth(range(scroll.p, 0.11, 0.17));
    if (armL.current) armL.current.rotation.z = open * 1.4;
    if (armR.current) armR.current.rotation.z = -open * 1.4;
    const c = open > 0.9 ? GREEN : RED;
    if (lampL.current) lampL.current.emissive.lerp(c, 0.15);
    if (lampR.current) lampR.current.emissive.lerp(c, 0.15);

    const surge = window01(scroll.p, 0.34, 0.42, 0.02);
    const gv = 1 - smooth(range(scroll.p, 0.4, 0.46));

    if (root.current) root.current.visible = gv > 0.01;
    if (gv < 1 && !fade.current.armed) {
      fade.current.armed = true;
      if (fade.current.list.length === 0) {
        root.current.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const m = mesh.material as FadeEntry["m"];
          fade.current.list.push({ m, base: m.opacity, em: m.emissiveIntensity ?? 0 });
        });
      }
      fade.current.list.forEach((e) => (e.m.transparent = true));
    }
    if (fade.current.armed) {
      fade.current.list.forEach((e) => {
        e.m.opacity = e.base * gv;
        if (e.em > 0 && e.m.emissiveIntensity !== undefined) e.m.emissiveIntensity = e.em * gv;
      });
      if (gv >= 1) fade.current.armed = false;
    }
    if (scanA.current) scanA.current.emissiveIntensity = (1.6 + 6.5 * surge) * gv;
    if (scanB.current) scanB.current.emissiveIntensity = (1.0 + 4.5 * surge) * gv;
  });

  return (
    <group ref={root} position={[0, 0, -3.5]}>
      <Tower x={-HALF} />
      <Tower x={HALF} />

      <mesh position={[0, BEAM_Y, 0]} castShadow>
        <boxGeometry args={[SPAN, 0.5, 0.7]} />
        <meshStandardMaterial color="#3a4a63" roughness={0.42} metalness={0.7} envMapIntensity={1.0} />
      </mesh>
      <mesh position={[0, BEAM_Y - 0.2, 0.32]}>
        <boxGeometry args={[SPAN - 0.2, 0.14, 0.12]} />
        <meshStandardMaterial color="#2a3550" roughness={0.5} metalness={0.55} envMapIntensity={0.9} />
      </mesh>
      <mesh position={[0, BEAM_Y - 0.27, 0.33]}>
        <boxGeometry args={[SPAN - 1.4, 0.05, 0.06]} />
        <meshStandardMaterial ref={scanA} color="#8fd0f5" emissive="#8fd0f5" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, BEAM_Y - 0.33, 0.3]}>
        <boxGeometry args={[SPAN - 1.6, 0.08, 0.04]} />
        <meshStandardMaterial ref={scanB} color="#2f63f2" emissive="#2f63f2" emissiveIntensity={1.0} toneMapped={false} />
      </mesh>

      <mesh position={[-HALF, 4.15, 0.36]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial ref={lampL} color="#111a33" emissive="#ff5d5d" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <mesh position={[HALF, 4.15, 0.36]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial ref={lampR} color="#111a33" emissive="#ff5d5d" emissiveIntensity={2} toneMapped={false} />
      </mesh>

      <group ref={armL} position={[-3.55, 2.62, 0.36]}>
        <mesh position={[1.65, 0, 0]}>
          <boxGeometry args={[3.3, 0.12, 0.12]} />
          <meshStandardMaterial color="#ffb020" roughness={0.5} metalness={0.2} envMapIntensity={0.8} />
        </mesh>
      </group>
      <group ref={armR} position={[3.55, 2.62, 0.36]}>
        <mesh position={[-1.65, 0, 0]}>
          <boxGeometry args={[3.3, 0.12, 0.12]} />
          <meshStandardMaterial color="#ffb020" roughness={0.5} metalness={0.2} envMapIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

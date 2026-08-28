"use client";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll, range, smooth } from "./state";
import { samplePalette } from "./palette";
import { conversionFront, FRONT_CENTER } from "./front";

type FadeEntry = { m: THREE.Material & { opacity: number; emissiveIntensity?: number }; base: number; em: number };

/** Distant industrial context — kept as far background silhouettes only so the hero container stays
 *  the focus. Aerial haze (scene fog, tinted from the shared palette) fades them into the evolving sky.
 *  Verbatim port of the source's components/scene/Backdrop.tsx; only the three imports were repointed
 *  at this folder's own state/palette/front. */

type Stack = { x: number; z: number; tiers: number; color: string; rot?: number };
const STACKS: Stack[] = [
  { x: -14, z: -52, tiers: 3, color: "#334666" },
  { x: -20, z: -61, tiers: 4, color: "#2c3d5a", rot: 0.2 },
  { x: 13, z: -48, tiers: 2, color: "#3a4d6e" },
  { x: 19, z: -59, tiers: 3, color: "#2f4160", rot: -0.15 },
  { x: 4, z: -73, tiers: 5, color: "#293a57" },
  { x: -6, z: -68, tiers: 3, color: "#30425f" },
];

const POLES: { x: number; z: number }[] = [
  { x: -8.5, z: -13 },
  { x: 8.5, z: -16 },
  { x: -8.5, z: -27 },
  { x: 8.5, z: -30 },
];

type CraneDef = { x: number; z: number; span: number; h: number; drift?: number };
const CRANES: CraneDef[] = [
  { x: 0, z: -58, span: 46, h: 17 },
  { x: -34, z: -70, span: 34, h: 20, drift: 3.5 },
  { x: 30, z: -64, span: 30, h: 14 },
];

function Crane({ x, z, span, h, drift = 0 }: CraneDef) {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (drift && g.current) g.current.position.x = x + Math.sin(clock.elapsedTime * 0.03) * drift;
  });
  const legW = 0.8;
  const half = span / 2;
  return (
    <group ref={g} position={[x, 0, z]}>
      <mesh position={[-half, h / 2, 0]}>
        <boxGeometry args={[legW, h, legW]} />
        <meshStandardMaterial color="#1c2740" roughness={0.8} metalness={0.25} envMapIntensity={0.35} />
      </mesh>
      <mesh position={[half, h / 2, 0]}>
        <boxGeometry args={[legW, h, legW]} />
        <meshStandardMaterial color="#1c2740" roughness={0.8} metalness={0.25} envMapIntensity={0.35} />
      </mesh>
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[span + 2, 1.3, 1.5]} />
        <meshStandardMaterial color="#222c46" roughness={0.75} metalness={0.3} envMapIntensity={0.4} />
      </mesh>
      <mesh position={[-half * 0.35, h - 0.9, 0]}>
        <boxGeometry args={[1.8, 1.1, 1.9]} />
        <meshStandardMaterial color="#26314e" roughness={0.7} metalness={0.35} envMapIntensity={0.4} />
      </mesh>
      <mesh position={[half * 0.6, h + 0.9, 0]}>
        <boxGeometry args={[3.2, 1.6, 1.8]} />
        <meshStandardMaterial color="#1a2440" roughness={0.75} metalness={0.3} envMapIntensity={0.4} />
      </mesh>
    </group>
  );
}

function ContainerStack({ x, z, tiers, color, rot = 0 }: Stack) {
  const mats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const dist = Math.hypot(x - FRONT_CENTER[0], z - FRONT_CENTER[1]);
  useFrame(() => {
    const { radius, sweep } = conversionFront(scroll.p);
    const g = sweep * Math.max(0, 1 - Math.abs(radius - dist) / 6);
    for (const m of mats.current) if (m) m.emissiveIntensity = g * 0.9;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {Array.from({ length: tiers }).map((_, i) => (
        <mesh key={i} position={[0, 1.3 + i * 2.55, 0]}>
          <boxGeometry args={[5.8, 2.5, 2.5]} />
          <meshStandardMaterial
            ref={(m) => {
              mats.current[i] = m;
            }}
            color={color}
            emissive="#8fd0f5"
            emissiveIntensity={0}
            roughness={0.75}
            metalness={0.2}
            envMapIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Backdrop() {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.Fog("#e8ecf5", 26, 96), []);
  const poles = useRef<THREE.Group>(null!);
  const poleFade = useRef<{ list: FadeEntry[]; armed: boolean }>({ list: [], armed: false });

  useEffect(() => {
    const prev = scene.fog;
    scene.fog = fog;
    return () => {
      scene.fog = prev;
    };
  }, [scene, fog]);

  useFrame(() => {
    fog.color.copy(samplePalette(scroll.p).outer);

    const lv = 1 - smooth(range(scroll.p, 0.32, 0.46));
    if (poles.current) poles.current.visible = lv > 0.01;
    if (lv < 1 && !poleFade.current.armed) {
      poleFade.current.armed = true;
      if (poleFade.current.list.length === 0 && poles.current) {
        poles.current.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const m = mesh.material as FadeEntry["m"];
          poleFade.current.list.push({ m, base: m.opacity, em: m.emissiveIntensity ?? 0 });
        });
      }
      poleFade.current.list.forEach((e) => (e.m.transparent = true));
    }
    if (poleFade.current.armed) {
      poleFade.current.list.forEach((e) => {
        e.m.opacity = e.base * lv;
        if (e.em > 0 && e.m.emissiveIntensity !== undefined) e.m.emissiveIntensity = e.em * lv;
      });
      if (lv >= 1) poleFade.current.armed = false;
    }
  });

  return (
    <group>
      <mesh position={[-5, 3.6, -80]}>
        <boxGeometry args={[28, 7.2, 11]} />
        <meshStandardMaterial color="#26344e" roughness={0.85} metalness={0.15} envMapIntensity={0.4} />
      </mesh>
      <mesh position={[16, 2.8, -84]}>
        <boxGeometry args={[16, 5.6, 9]} />
        <meshStandardMaterial color="#223047" roughness={0.85} metalness={0.15} envMapIntensity={0.4} />
      </mesh>

      {CRANES.map((c, i) => (
        <Crane key={`crane-${i}`} {...c} />
      ))}

      {STACKS.map((s, i) => (
        <ContainerStack key={i} {...s} />
      ))}

      <group ref={poles}>
      {POLES.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.12, 0.14, 6, 10]} />
            <meshStandardMaterial color="#2a3346" roughness={0.6} metalness={0.4} envMapIntensity={0.6} />
          </mesh>
          <mesh position={[Math.sign(p.x) * -0.35, 6, 0]}>
            <boxGeometry args={[0.8, 0.16, 0.4]} />
            <meshStandardMaterial color="#222a3c" roughness={0.6} metalness={0.4} envMapIntensity={0.6} />
          </mesh>
          <mesh position={[Math.sign(p.x) * -0.55, 5.9, 0]}>
            <boxGeometry args={[0.28, 0.06, 0.28]} />
            <meshStandardMaterial color="#1a1f2c" emissive="#ffe6bf" emissiveIntensity={1.4} toneMapped={false} />
          </mesh>
        </group>
      ))}
      </group>
    </group>
  );
}

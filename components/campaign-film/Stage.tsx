"use client";
import { ContactShadows, Grid } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll, range, smooth } from "./state";
import { samplePalette } from "./palette";
import { conversionFront, FRONT_CENTER } from "./front";
import { poolTexture } from "./textures";

/* Verbatim port of the source's components/scene/Stage.tsx; only the four imports were repointed
 * at this folder's own state/palette/front/textures. Lighting crossfades from bright studio (light
 * palette) to low-key blue accents (dark palette) at ~40% — the visual climax this film's loop
 * window (p: 0 -> 0.52) is centered on. */

const POOLS = [
  { x: -8.5, z: -13, r: 5, color: "#ffcf9a", i: 0.6 },
  { x: 8.5, z: -16, r: 5, color: "#ffcf9a", i: 0.6 },
  { x: -8.5, z: -27, r: 5, color: "#ffcf9a", i: 0.5 },
  { x: 8.5, z: -30, r: 5, color: "#ffcf9a", i: 0.5 },
];

const _skyBase = new THREE.Color("#eaf1ff");
const _white = new THREE.Color("#ffffff");
const _sky = new THREE.Color();

const FRONT_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRONT_FRAG = /* glsl */ `
  uniform vec2 uCenter;
  uniform float uFront;
  uniform float uAmp;
  varying vec3 vWorld;
  void main() {
    float dist = distance(vWorld.xz, uCenter);
    float behind = 1.0 - smoothstep(uFront - 1.2, uFront + 0.2, dist);
    float gx = smoothstep(0.86, 1.0, fract(vWorld.x * 2.0));
    float gz = smoothstep(0.86, 1.0, fract(vWorld.z * 2.0));
    float grid = clamp(gx + gz, 0.0, 1.0);
    float ring = smoothstep(2.6, 0.0, abs(dist - uFront));
    float a = behind * (grid * 0.35 + ring * 0.9) * uAmp;
    a *= 1.0 - smoothstep(40.0, 80.0, dist);
    gl_FragColor = vec4(0.561, 0.816, 0.961, a);
  }
`;

export default function Stage() {
  const amb = useRef<THREE.AmbientLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const key = useRef<THREE.DirectionalLight>(null!);
  const blue = useRef<THREE.PointLight>(null!);
  const ice = useRef<THREE.PointLight>(null!);
  const front = useRef<THREE.Mesh>(null!);

  const frontMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: FRONT_VERT,
        fragmentShader: FRONT_FRAG,
        uniforms: {
          uCenter: { value: new THREE.Vector2(FRONT_CENTER[0], FRONT_CENTER[1]) },
          uFront: { value: 0 },
          uAmp: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      } as THREE.ShaderMaterialParameters),
    []
  );

  const poolTex = useMemo(() => poolTexture(), []);
  const poolMats = useMemo(
    () =>
      POOLS.map(
        (pl) =>
          new THREE.MeshBasicMaterial({
            map: poolTex,
            color: pl.color,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          })
      ),
    [poolTex]
  );

  useFrame(() => {
    const d = range(scroll.p, 0.34, 0.44);
    const f = conversionFront(scroll.p);
    if (amb.current) amb.current.intensity = 1.0 - 0.45 * d - 0.15 * f.ignite;
    if (key.current) key.current.intensity = 1.15 - 0.45 * d;
    if (blue.current) blue.current.intensity = 12 * d;
    if (ice.current) ice.current.intensity = 6.5 * d + 10 * f.ignite;

    frontMat.uniforms.uFront.value = f.radius;
    frontMat.uniforms.uAmp.value = f.amp;
    if (front.current) front.current.visible = f.amp > 0.001;

    const lamp = 1 - smooth(range(scroll.p, 0.32, 0.46));
    for (let i = 0; i < poolMats.length; i++) poolMats[i].opacity = POOLS[i].i * lamp;

    const inner = samplePalette(scroll.p).inner;
    if (amb.current) amb.current.color.copy(_white).lerp(inner, 0.4);
    if (hemi.current) hemi.current.color.copy(_sky.copy(_skyBase).lerp(inner, 0.8));
  });

  return (
    <>
      <ambientLight ref={amb} intensity={1.0} />
      <hemisphereLight ref={hemi} color="#eaf1ff" groundColor="#243a63" intensity={0.5} />
      <directionalLight ref={key} position={[6, 10, 6]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-8, 6, -4]} intensity={0.4} color="#dfe9ff" />
      <pointLight ref={blue} position={[-6, 4, 4]} color="#2F63F2" intensity={0} distance={30} />
      <pointLight ref={ice} position={[6, 3, -5]} color="#8fd0f5" intensity={0} distance={26} />
      {POOLS.map((pl, i) => (
        <mesh key={i} material={poolMats[i]} position={[pl.x, 0.012, pl.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[pl.r * 2, pl.r * 2]} />
        </mesh>
      ))}
      <mesh ref={front} material={frontMat} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[180, 180]} />
      </mesh>
      <Grid
        infiniteGrid
        position={[0, 0.001, 0]}
        cellSize={1}
        sectionSize={5}
        cellColor="#7fa4ee"
        sectionColor="#3f6ae0"
        cellThickness={0.5}
        sectionThickness={1}
        fadeDistance={46}
        fadeStrength={2.5}
      />
      <ContactShadows position={[0, 0.002, 0]} color="#152745" opacity={0.42} scale={30} blur={3.0} far={4.5} resolution={512} frames={Infinity} />
    </>
  );
}

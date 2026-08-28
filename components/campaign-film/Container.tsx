"use client";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll, range, smooth, window01, earn, heroScreen, useScrollFn } from "./state";
import { brandingTexture, rustTexture, scuffTexture, heatTexture } from "./textures";

/* Verbatim port of the source's components/scene/Container.tsx. Only the imports were repointed at
 * this folder's own state/textures (heroScreen is a stub here — see state.ts's comment on it — and
 * `@/lib/project` doesn't exist in this repo). NOTHING ELSE WAS CHANGED, including the code paths
 * for doors opening / cargo unload / yard-lift / the finale hero projection, none of which this
 * film's loop (p: 0 -> 0.52) ever reaches: doors open at range(p,0.545,...), cargo unload starts at
 * s0=0.565+, yard-lift is range(p,0.66,0.71), and the finale projection is gated on p>0.85. Every one
 * of those stays at its resting/zero value for the entire loop, so keeping the code intact is LOWER
 * risk than trying to trim it — trimming risks a transcription bug, leaving it in risks nothing
 * because it provably never activates. */

const _screen = new THREE.Vector3();

const L = 6.06;
const H = 2.59;
const W = 2.44;
const BLUE = "#24427e";

const DENTS = [
  { cx: 0.6, cy: 0.15, depth: 0.42, sx: 0.26, sy: 0.42 },
  { cx: -1.9, cy: -0.2, depth: 0.36, sx: 0.22, sy: 0.34 },
];

const WAKE_VERT = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const WAKE_FRAG = /* glsl */ `
  uniform float uScanX;
  uniform float uFade;
  uniform float uSign;
  uniform float uOn;
  varying vec3 vPos;
  void main() {
    float sx = uSign * vPos.x;
    float scanned = uSign == 0.0 ? uOn : 1.0 - smoothstep(uScanX - 0.35, uScanX, sx);
    float gx = step(0.94, fract(vPos.x * 1.6));
    float gy = step(0.94, fract(vPos.y * 1.6));
    float grid = clamp(gx + gy, 0.0, 1.0);
    float lines = 0.5 + 0.5 * sin(vPos.y * 60.0);
    float a = scanned * uFade * (0.045 + 0.30 * grid + 0.05 * lines);
    gl_FragColor = vec4(0.561, 0.816, 0.961, a);
  }
`;

function makeWakeMat(sign: number) {
  return new THREE.ShaderMaterial({
    vertexShader: WAKE_VERT,
    fragmentShader: WAKE_FRAG,
    uniforms: { uScanX: { value: -3.7 }, uFade: { value: 0 }, uSign: { value: sign }, uOn: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    toneMapped: false,
  } as THREE.ShaderMaterialParameters);
}

function corrugated(w: number, h: number, waves = 26, depth = 0.045) {
  const g = new THREE.PlaneGeometry(w, h, waves * 4, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) / w + 0.5) * waves;
    const tri = Math.abs((((u % 1) + 1) % 1) - 0.5) * 2;
    pos.setZ(i, tri * depth);
  }
  g.computeVertexNormals();
  return g;
}

function Det({
  pos,
  cls,
  conf,
  act,
  scene = [0.34, 0.52] as [number, number],
  a,
  b,
  pct = false,
  ocr = false,
}: {
  pos: [number, number, number];
  id: string;
  cls: string;
  sev?: string;
  conf: number;
  act: string;
  scene?: [number, number];
  a: number;
  b: number;
  pct?: boolean;
  crit?: boolean;
  ocr?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const actR = useRef<HTMLDivElement>(null);
  const lockOn = useRef(false);

  useScrollFn((p) => {
    const el = box.current;
    if (!el) return;
    const l = range(p, scene[0], scene[1]);
    const o = window01(l, a, b, 0.06) * window01(p, scene[0], scene[1], 0.012);
    el.style.opacity = String(o);
    if (o > 0.02 && !lockOn.current) {
      lockOn.current = true;
      el.classList.add("lock", "live");
    } else if (o <= 0.02 && lockOn.current) {
      lockOn.current = false;
      el.classList.remove("lock", "live");
    }
    const k = range(l, a + 0.01, a + 0.14);
    if (num.current) num.current.textContent = k <= 0 ? "···" : pct ? `${earn(k, conf, 1)}%` : earn(k, conf, 2);
    if (fill.current) {
      const steps = 4;
      const q = Math.min(1, (Math.floor(k * steps) + smooth((k * steps) % 1)) / steps);
      fill.current.style.width = `${(pct ? conf : conf * 100) * q}%`;
    }

    if (actR.current) actR.current.classList.toggle("on", o > 0.05 && l > a + 0.16);
  });

  return (
    <Html position={pos} center distanceFactor={7.5} zIndexRange={[30, 0]} style={{ pointerEvents: "none" }}>
      <div ref={box} className={`det${ocr ? " ocr" : ""}`} style={{ opacity: 0 }}>
        <span className="ring" />
        <i />
        <i />
        <i />
        <i />
        <div className="tag">
          <span className="tcls">{cls}</span>
          <span className="conf">
            <b ref={num}>···</b>
            <span className="cbar">
              <span ref={fill} />
            </span>
          </span>
          <div className="act" ref={actR}>
            {act}
          </div>
        </div>
      </div>
    </Html>
  );
}

const HEATS: { pos: [number, number, number]; rot?: [number, number, number]; size: [number, number]; a: number }[] = [
  { pos: [0.6, 0.15, W / 2 + 0.045], size: [1.5, 1.2], a: 0.05 },
  { pos: [-1.9, -0.2, W / 2 + 0.045], size: [1.4, 1.1], a: 0.12 },
  { pos: [1.7, -H / 2 + 0.38, W / 2 + 0.045], size: [1.5, 1.0], a: 0.19 },
  { pos: [L / 2 + 0.05, -H / 2 + 0.35, 0.6], rot: [0, Math.PI / 2, 0], size: [0.95, 0.7], a: 0.44 },
  { pos: [L / 2 + 0.05, -H / 2 + 0.85, -0.7], rot: [0, Math.PI / 2, 0], size: [0.75, 0.75], a: 0.52 },
];

export default function Container() {
  const root = useRef<THREE.Group>(null!);
  const doorL = useRef<THREE.Group>(null!);
  const doorR = useRef<THREE.Group>(null!);
  const carts = useRef<(THREE.Mesh | null)[]>([]);
  const dentAmt = useRef(-1);

  const [frontGeo, frontBase] = useMemo(() => {
    const geo = corrugated(L, H);
    const base = Float32Array.from(geo.attributes.position.array as Float32Array);
    return [geo, base] as const;
  }, []);
  const backGeo = useMemo(() => corrugated(L, H), []);
  const endGeo = useMemo(() => corrugated(W, H, 12), []);
  const topGeo = useMemo(() => corrugated(L, W, 26, 0.03), []);

  const panelMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: BLUE,
        roughness: 0.42,
        metalness: 0.55,
        envMapIntensity: 1.1,
        clearcoat: 0.25,
        clearcoatRoughness: 0.5,
      }),
    []
  );
  const cartonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b08a5a", roughness: 0.9 }), []);
  const brandTex = useMemo(() => brandingTexture(), []);
  const rustTex = useMemo(() => rustTexture(), []);
  const scuffTex = useMemo(() => scuffTexture(), []);
  const heatTex = useMemo(() => heatTexture(), []);
  const heatMats = useMemo(
    () =>
      HEATS.map(
        () =>
          new THREE.MeshBasicMaterial({
            map: heatTex,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
          })
      ),
    [heatTex]
  );
  const slice = useRef<THREE.Group>(null);
  const wakeGroup = useRef<THREE.Group>(null!);
  const wakeMats = useMemo(() => [makeWakeMat(1), makeWakeMat(-1), makeWakeMat(1), makeWakeMat(0)], []);
  const sliceFillMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#6fb8e6", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    []
  );
  const sliceEdgeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#d3efff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    []
  );

  const rustDecalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: rustTex, transparent: true, opacity: 0, depthWrite: false, roughness: 0.85 }),
    [rustTex]
  );
  const scuffDecalMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: scuffTex, transparent: true, opacity: 0, depthWrite: false }),
    [scuffTex]
  );

  const CARGO_NX = 6;
  const CARGO_NY = 4;
  const CARGO_NZ = 3;
  const cartons = useMemo(() => {
    const arr: { x: number; y: number; z: number }[] = [];
    for (let cx = 0; cx < CARGO_NX; cx++)
      for (let cy = 0; cy < CARGO_NY; cy++)
        for (let cz = 0; cz < CARGO_NZ; cz++)
          arr.push({
            x: -2.5 + cx * (5.0 / (CARGO_NX - 1)),
            y: -H / 2 + 0.35 + cy * 0.56,
            z: -0.8 + cz * 0.8,
          });
    arr.sort((a, b) => b.x - a.x);
    return arr;
  }, []);

  useFrame(({ clock, camera, size }) => {
    const p = scroll.p;
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;

    if (p > 0.85) {
      _screen.set(0, 0.2, 0);
      g.localToWorld(_screen);
      _screen.project(camera);
      heroScreen.x = (_screen.x * 0.5 + 0.5) * size.width;
      heroScreen.y = (-_screen.y * 0.5 + 0.5) * size.height;
      heroScreen.vis = _screen.z < 1;
    } else if (heroScreen.vis) {
      heroScreen.vis = false;
    }

    g.position.z = -18 + 18 * smooth(range(p, 0.02, 0.2));

    const lift = smooth(range(p, 0.66, 0.71)) * (1 - smooth(range(p, 0.79, 0.83)));
    const settle = smooth(range(p, 0.7, 0.715)) * (1 - smooth(range(p, 0.715, 0.76)));
    g.position.y = H / 2 + lift * 1.12 - settle * 0.08 + Math.sin(t * 0.8) * 0.02 * (1 - lift);

    g.rotation.y =
      Math.PI * 2 * smooth(range(p, 0.4, 0.52)) -
      (Math.PI / 2) * smooth(range(p, 0.52, 0.565)) +
      (Math.PI / 2) * smooth(range(p, 0.66, 0.705));

    const open = 2.3 * (smooth(range(p, 0.545, 0.6)) - smooth(range(p, 0.65, 0.685)));
    if (doorL.current) doorL.current.rotation.y = open;
    if (doorR.current) doorR.current.rotation.y = -open;

    const dmg = range(p, 0.1, 0.2) * (1 - smooth(range(p, 0.52, 0.56)));
    if (Math.abs(dmg - dentAmt.current) > 0.002) {
      dentAmt.current = dmg;
      const posAttr = frontGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        const x = frontBase[i * 3];
        const y = frontBase[i * 3 + 1];
        const z = frontBase[i * 3 + 2];
        let dz = 0;
        for (const d of DENTS) {
          const dx = x - d.cx;
          const dy = y - d.cy;
          dz += d.depth * Math.exp(-(dx * dx) / d.sx - (dy * dy) / d.sy);
        }
        posAttr.setXYZ(i, x, y, z - dz * dmg);
      }
      posAttr.needsUpdate = true;
      frontGeo.computeVertexNormals();
    }
    rustDecalMat.opacity = 0.95 * dmg;
    scuffDecalMat.opacity = 0.85 * dmg;

    const scanX = -3.7 + 7.4 * smooth(range(p, 0.355, 0.51));
    if (slice.current) {
      const o = window01(p, 0.355, 0.51, 0.015);
      sliceFillMat.opacity = 0.16 * o;
      sliceEdgeMat.opacity = 0.95 * o;
      slice.current.visible = o > 0.004;
      slice.current.position.x = scanX;
    }
    const wakeFade = window01(p, 0.355, 0.53, 0.02);
    const endOn = Math.min(Math.max((scanX + 3.23) / 0.4, 0), 1);
    wakeMats.forEach((m) => {
      m.uniforms.uScanX.value = scanX;
      m.uniforms.uFade.value = wakeFade;
    });
    wakeMats[3].uniforms.uOn.value = endOn;
    if (wakeGroup.current) wakeGroup.current.visible = wakeFade > 0.004;
    const scanL = range(p, 0.34, 0.52);
    const heatOn = window01(p, 0.34, 0.52, 0.01);
    heatMats.forEach((m, i) => {
      m.opacity = 0.85 * heatOn * window01(scanL, HEATS[i].a - 0.05, HEATS[i].a + 0.17, 0.05);
    });

    carts.current.forEach((m, i) => {
      if (!m) return;
      const c = cartons[i];
      const s0 = 0.565 + i * 0.001;
      const f = smooth(range(p, s0, s0 + 0.045));
      m.position.set(c.x + f * 5.4, c.y + Math.sin(f * Math.PI) * 0.9, c.z * (1 + f * 0.6));
      m.scale.setScalar(Math.max(1 - smooth(range(f, 0.72, 1)), 0.0001));
    });
  });

  return (
    <group ref={root} position={[0, H / 2, -18]}>
      <mesh geometry={frontGeo} material={panelMat} position={[0, 0, W / 2]} />
      <mesh geometry={backGeo} material={panelMat} position={[0, 0, -W / 2]} rotation={[0, Math.PI, 0]} />
      <mesh geometry={endGeo} material={panelMat} position={[-L / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <mesh geometry={topGeo} material={panelMat} position={[0, H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <mesh position={[0, -H / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[L, W]} />
        <meshStandardMaterial color="#20335e" roughness={0.7} metalness={0.3} envMapIntensity={1.0} />
      </mesh>
      <mesh>
        <boxGeometry args={[L - 0.12, H - 0.12, W - 0.12]} />
        <meshStandardMaterial color="#1a2540" side={THREE.BackSide} roughness={0.85} envMapIntensity={0.6} />
      </mesh>
      {[
        [-L / 2, W / 2],
        [-L / 2, -W / 2],
        [L / 2, W / 2],
        [L / 2, -W / 2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <boxGeometry args={[0.14, H + 0.02, 0.14]} />
          <meshStandardMaterial color="#24427e" roughness={0.4} metalness={0.6} envMapIntensity={1.1} />
        </mesh>
      ))}
      <group ref={doorR} position={[L / 2, 0, W / 2]}>
        <mesh position={[0, 0, -W / 4]}>
          <boxGeometry args={[0.09, H - 0.1, W / 2 - 0.08]} />
          <meshStandardMaterial color={BLUE} roughness={0.42} metalness={0.55} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0.07, 0, -W / 4]}>
          <cylinderGeometry args={[0.025, 0.025, H - 0.3, 8]} />
          <meshStandardMaterial color="#243a63" metalness={0.7} roughness={0.32} envMapIntensity={1.2} />
        </mesh>
      </group>
      <group ref={doorL} position={[L / 2, 0, -W / 2]}>
        <mesh position={[0, 0, W / 4]}>
          <boxGeometry args={[0.09, H - 0.1, W / 2 - 0.08]} />
          <meshStandardMaterial color={BLUE} roughness={0.42} metalness={0.55} envMapIntensity={1.1} />
        </mesh>
        <mesh position={[0.07, 0, W / 4]}>
          <cylinderGeometry args={[0.025, 0.025, H - 0.3, 8]} />
          <meshStandardMaterial color="#243a63" metalness={0.7} roughness={0.32} envMapIntensity={1.2} />
        </mesh>
      </group>
      <mesh position={[0, 0.08, W / 2 + 0.075]}>
        <planeGeometry args={[5.3, 1.5]} />
        <meshStandardMaterial map={brandTex} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.08, -(W / 2 + 0.075)]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[5.3, 1.5]} />
        <meshStandardMaterial map={brandTex} transparent depthWrite={false} />
      </mesh>
      <mesh position={[0.6, 0.15, W / 2 + 0.05]} material={scuffDecalMat}>
        <planeGeometry args={[1.1, 0.9]} />
      </mesh>
      <mesh position={[-1.9, -0.2, W / 2 + 0.05]} material={scuffDecalMat}>
        <planeGeometry args={[1.0, 0.85]} />
      </mesh>
      <mesh position={[L / 2 + 0.055, -H / 2 + 0.35, 0.6]} rotation={[0, Math.PI / 2, 0]} material={rustDecalMat}>
        <planeGeometry args={[0.7, 0.5]} />
      </mesh>
      <mesh position={[L / 2 + 0.055, -H / 2 + 0.85, -0.7]} rotation={[0, Math.PI / 2, 0]} material={rustDecalMat}>
        <planeGeometry args={[0.45, 0.5]} />
      </mesh>
      <mesh position={[1.7, -H / 2 + 0.38, W / 2 + 0.06]} material={rustDecalMat}>
        <planeGeometry args={[1.2, 0.8]} />
      </mesh>
      {cartons.map((c, i) => (
        <mesh
          key={i}
          ref={(m) => {
            carts.current[i] = m;
          }}
          position={[c.x, c.y, c.z]}
          material={cartonMat}
        >
          <boxGeometry args={[0.62, 0.5, 0.62]} />
        </mesh>
      ))}
      {HEATS.map((s, i) => (
        <mesh key={`heat-${i}`} position={s.pos} rotation={s.rot ?? [0, 0, 0]} material={heatMats[i]}>
          <planeGeometry args={s.size} />
        </mesh>
      ))}
      <group ref={wakeGroup} visible={false}>
        <mesh geometry={frontGeo} material={wakeMats[0]} position={[0, 0, W / 2 + 0.012]} />
        <mesh geometry={backGeo} material={wakeMats[1]} position={[0, 0, -W / 2 - 0.012]} rotation={[0, Math.PI, 0]} />
        <mesh geometry={topGeo} material={wakeMats[2]} position={[0, H / 2 + 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        <mesh geometry={endGeo} material={wakeMats[3]} position={[-L / 2 - 0.012, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      </group>
      <group ref={slice} rotation={[0, Math.PI / 2, 0]} visible={false}>
        <mesh material={sliceFillMat}>
          <planeGeometry args={[W + 0.7, H + 0.6]} />
        </mesh>
        <mesh material={sliceEdgeMat} position={[0, (H + 0.6) / 2, 0]}>
          <boxGeometry args={[W + 0.7, 0.05, 0.05]} />
        </mesh>
        <mesh material={sliceEdgeMat} position={[0, -(H + 0.6) / 2, 0]}>
          <boxGeometry args={[W + 0.7, 0.05, 0.05]} />
        </mesh>
        <mesh material={sliceEdgeMat} position={[-(W + 0.7) / 2, 0, 0]}>
          <boxGeometry args={[0.05, H + 0.6, 0.05]} />
        </mesh>
        <mesh material={sliceEdgeMat} position={[(W + 0.7) / 2, 0, 0]}>
          <boxGeometry args={[0.05, H + 0.6, 0.05]} />
        </mesh>
      </group>
      <Det pos={[0.6, 0.15, W / 2 + 0.15]} id="#D-01 · PANEL 4" cls="DENT" conf={0.94} act="→ LOGGED · REPAIR EST $140" a={0.05} b={0.34} />
      <Det pos={[-1.9, -0.2, W / 2 + 0.15]} id="#D-02 · SIDE PANEL" cls="DENT" conf={0.91} act="→ LOGGED · REPAIR EST $90" a={0.12} b={0.34} />
      <Det pos={[1.7, -H / 2 + 0.38, W / 2 + 0.15]} id="#R-01 · LOWER PANEL" cls="RUST" conf={0.87} act="→ TREAT & MONITOR" a={0.19} b={0.34} />
      <Det pos={[L / 2 + 0.15, -H / 2 + 0.35, 0.6]} id="#R-02 · DOOR SILL" cls="RUST" conf={0.88} act="→ CLAIM-READY EVIDENCE" a={0.44} b={0.72} />
      <Det pos={[L / 2 + 0.15, -H / 2 + 0.85, -0.7]} id="#R-03 · DOOR PANEL" cls="RUST" conf={0.83} act="→ TREAT & MONITOR" a={0.52} b={0.72} />
      <Det
        pos={[-1.5, -0.38, W / 2 + 0.16]}
        id="OCR · TEXT REGION A1"
        cls="ID + ISO"
        sev="2 FIELDS"
        conf={99.7}
        pct
        act="→ GATE LOG · NO MANUAL ENTRY"
        scene={[0.2, 0.335]}
        a={0.1}
        b={0.96}
        ocr
      />
    </group>
  );
}

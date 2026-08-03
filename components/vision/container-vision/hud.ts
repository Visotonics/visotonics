/* ---------------------------------------------------------------------------
   Container Vision — 3D scan sheet.

   A glowing scan sheet sweeps the container and lights the steel as it passes.
   Findings are annotated by crisp DOM bounding boxes + labels (see scene.tsx)
   styled in the site's drafting language, not by 3D meshes — so they stay
   pixel-sharp and on-brand.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "./palette";
import { W, H } from "./container";

export interface HudBuild {
  group: THREE.Group;
  setScan: (x: number, on: number, time: number) => void;
}

export function buildHud(): HudBuild {
  const group = new THREE.Group();

  const scanUniforms = {
    uColor: { value: new THREE.Color(PALETTE.accentBloom) },
    uOn: { value: 0 },
    uTime: { value: 0 },
  };
  const scanMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: scanUniforms,
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader: `
      varying vec2 vUv; uniform vec3 uColor; uniform float uOn; uniform float uTime;
      void main(){
        // soft-edged sheet of light; the crisp bright line lives on the surface
        float edge = smoothstep(0.0,0.14,vUv.x)*smoothstep(1.0,0.86,vUv.x)
                   * smoothstep(0.0,0.1,vUv.y)*smoothstep(1.0,0.9,vUv.y);
        float scanline = 0.85 + 0.15*sin(vUv.y*220.0 - uTime*10.0);
        float a = edge * 0.14 * scanline * uOn;
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const scan = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.5, H + 0.5), scanMat);
  scan.rotation.y = Math.PI / 2;
  group.add(scan);

  const setScan = (x: number, on: number, time: number) => {
    scan.position.x = x;
    scanUniforms.uOn.value = on;
    scanUniforms.uTime.value = time;
  };

  return { group, setScan };
}

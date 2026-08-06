/* ---------------------------------------------------------------------------
   The pendant lamp — a shop light on a drop, as shared machinery.

   Built for Cargo Vision and extracted here the moment a second scene needed
   one. It exists because a lit working surface in an otherwise dark scene has
   no stated CAUSE: a practical light you can see answers "why is that the
   brightest thing in frame" with an object rather than with a lighting rig
   the viewer cannot see. Every scene in this family that lights one working
   plane should hang one of these over it rather than re-deriving the trick.

   FIVE PARTS, AND EACH IS DOING A DIFFERENT JOB:

     wire    a thin drop running out of the top of frame. Real pendants hang
             from a ceiling; a lamp whose flex starts at a visible plate
             announces there is no ceiling.
     shade   an OPEN-ENDED cone, DoubleSide. A closed shade seen from slightly
             below shows its cap and reads as a solid lump.
     bulb    a small emissive sphere hung PROUD OF THE SHADE'S RIM, not inside
             it. Tucked up inside, a camera looking slightly down sees almost
             none of it and the lamp lights the scene while appearing unlit
             itself — a defect that shipped once and took a pass to find.
     halo    a view-facing billboard with a radial alpha falloff. NOT a sphere:
             a uniformly-coloured additive sphere has a hard silhouette,
             because every rim pixel carries the same alpha as the centre, so
             it reads as a flat disc with a visible edge.
     beam    a hollow cone of additive warm from bulb to working plane — the
             light you can SEE, as opposed to the light doing the work. Its
             alpha falls off along the length AND toward the silhouette via a
             fresnel term, or it draws a crisp outline and reads as a
             translucent solid standing on the floor.

   THE POINTLIGHT IS WHAT ACTUALLY LIGHTS ANYTHING. Everything above is the
   appearance of light; `light` is the light. It is distance-limited so it
   falls off before it reaches whatever is fogged out at the back, which would
   otherwise flatten the depth gradient the scene reads by.

   INTENSITY IS NOT A FREE PARAMETER. At decay 2 the illuminance at the
   working plane is intensity / d^2, and it has to beat the five-source studio
   rig it is competing with, whose key box sits at 5.6. Cargo's first two
   attempts (3.4, then 14) delivered 1.3 and 5.3 at the belt and read as
   unlit and as a faint tint respectively; 40 delivers ~15 and reads as the
   reason the surface is bright. Compute it, do not guess it.

   NOTHING HERE PULSES. The standing rule across these scenes after a strobe
   was built and rejected: no repeating brightness cycle anywhere. Everything
   ramps once with the scene's intro and then holds.

   COLOURSPACE: both shaders end with `#include <colorspace_fragment>`. Three
   converts uniform colours sRGB->linear on the way in and hands a raw
   ShaderMaterial none of the output plumbing back; without it the authored
   colour renders at roughly an eighth of its brightness. Paid for three times
   in this repo already.
--------------------------------------------------------------------------- */
import * as THREE from "three";

const HALO_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    /* Billboard from the mesh's WORLD TRANSLATION only, adding the local xy
       straight in view space — so the quad's own rotation (always identity
       here) never matters and it can never be caught edge-on. */
    vec3 worldPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 mvPosition = viewMatrix * vec4(worldPos, 1.0);
    mvPosition.xy += position.xy;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const HALO_FRAG = `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float r = length(vUv - vec2(0.5)) * 2.0;   // 0 at centre, 1 at rim
    float a = 1.0 - smoothstep(0.0, 1.0, r);
    a *= a;   // steepen the core so it reads as a glow, not a soft-edged disc
    float alpha = a * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;

const BEAM_VERT = `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAG = `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    /* ConeGeometry's v runs 0 at the base to 1 at the apex, so 1.0 - vUv.y is
       the axial parameter t: 0 at the source, 1 at the working plane. */
    float t = 1.0 - vUv.y;
    float near = smoothstep(0.0, 0.10, t);          // off the apex singularity
    float far  = 1.0 - smoothstep(0.55, 1.0, t);    // dies before it hits the plane
    /* Fresnel rim: face-on pixels (where the volume reads as haze) stay;
       grazing pixels — the ones that draw an additive cone's crisp outline —
       fall to a floor rather than a hard edge. */
    float rim  = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    float body = 0.18 + 0.82 * (1.0 - smoothstep(0.55, 1.0, rim));
    float alpha = near * far * body * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`;

/** Alias `.opacity` onto a ShaderMaterial's uniform. A ShaderMaterial's own
    `opacity` field is inert, and every reveal ramp in this codebase writes
    `.opacity` by name — the same convention createSightCone documents. */
function aliasOpacity(mat: THREE.ShaderMaterial) {
  Object.defineProperty(mat, "opacity", {
    get: () => mat.uniforms.uOpacity.value as number,
    set: (v: number) => { mat.uniforms.uOpacity.value = v; },
    configurable: true,
  });
}

export interface PendantOpts {
  /** where the lamp hangs */
  x: number; y: number; z: number;
  /** the surface it lights — the beam's base and the light's target plane */
  planeY: number;
  /** where the flex disappears out of shot. Well above the top of frame. */
  ceilingY?: number;
  /** material for the flex. Pass the scene's own dark metal. */
  wireMat: THREE.Material;
  /** beam base radius. ~30 degrees at a typical drop. */
  beamR?: number;
  /** shade radius */
  shadeR?: number;
}

export interface Pendant {
  group: THREE.Group;
  /** every material whose opacity the scene's intro ramp must drive */
  shade: THREE.MeshStandardMaterial;
  bulb: THREE.MeshBasicMaterial;
  halo: THREE.ShaderMaterial;
  beam: THREE.ShaderMaterial;
  /** the light that actually lights things — drive `.intensity` */
  light: THREE.PointLight;
  /** geometry the CALLER owns and must dispose */
  owned: THREE.BufferGeometry[];
  dispose: () => void;
}

export function buildPendantLamp(o: PendantOpts): Pendant {
  const { x, y, z, planeY, wireMat } = o;
  const ceilingY = o.ceilingY ?? y + 2.9;
  const shadeR = o.shadeR ?? 0.30;
  const beamR = o.beamR ?? 0.85;

  const group = new THREE.Group();
  const owned: THREE.BufferGeometry[] = [];

  const wireGeo = new THREE.CylinderGeometry(0.012, 0.012, ceilingY - y, 6);
  owned.push(wireGeo);
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.position.set(x, (ceilingY + y) / 2, z);
  group.add(wire);

  const shadeGeo = new THREE.ConeGeometry(shadeR, 0.34, 20, 1, true);
  owned.push(shadeGeo);
  const shade = new THREE.MeshStandardMaterial({
    color: "#3B424C", metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide,
    transparent: true, opacity: 0,
  });
  const shadeMesh = new THREE.Mesh(shadeGeo, shade);
  shadeMesh.position.set(x, y, z);
  shadeMesh.castShadow = true;
  group.add(shadeMesh);

  /* PROUD OF THE RIM. The cone is centred on y with its wide end DOWN, so its
     mouth is at y - 0.17; y - 0.21 hangs the filament 0.04 clear of it. */
  const bulbY = y - 0.21;
  const bulbGeo = new THREE.SphereGeometry(0.11, 14, 12);
  owned.push(bulbGeo);
  const bulb = new THREE.MeshBasicMaterial({
    color: "#FFF3D8", toneMapped: false, transparent: true, opacity: 0,
  });
  const bulbMesh = new THREE.Mesh(bulbGeo, bulb);
  bulbMesh.position.set(x, bulbY, z);
  group.add(bulbMesh);

  const haloGeo = new THREE.PlaneGeometry(0.62, 0.62);
  owned.push(haloGeo);
  const halo = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color("#FFCD7A") }, uOpacity: { value: 0 } },
    vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
    transparent: true, depthWrite: false,
    toneMapped: false, blending: THREE.AdditiveBlending,
  });
  aliasOpacity(halo);
  const haloMesh = new THREE.Mesh(haloGeo, halo);
  haloMesh.position.set(x, bulbY, z);
  group.add(haloMesh);

  const beamH = bulbY - planeY;
  const beamGeo = new THREE.ConeGeometry(beamR, beamH, 24, 1, true);
  owned.push(beamGeo);
  const beam = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color("#FFB863") }, uOpacity: { value: 0 } },
    vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    toneMapped: false, blending: THREE.AdditiveBlending,
  });
  aliasOpacity(beam);
  const beamMesh = new THREE.Mesh(beamGeo, beam);
  beamMesh.position.set(x, planeY + beamH / 2, z);
  group.add(beamMesh);

  const light = new THREE.PointLight("#FFD9A0", 0, 9.5, 2);
  light.position.set(x, y - 0.20, z);
  group.add(light);

  return {
    group, shade, bulb, halo, beam, light, owned,
    /* MATERIALS ONLY by default — geometry is handed back in `owned` so the
       caller can fold it into its own disposal list, which is how every other
       builder in this family works. */
    dispose: () => { shade.dispose(); bulb.dispose(); halo.dispose(); beam.dispose(); },
  };
}

/* ---------------------------------------------------------------------------
   Gate Vision — materials and painted textures.

   Same weathered-steel language as Container Vision (matte painted metal,
   low metalness, high roughness, restrained env reflection) plus the parts a
   vehicle needs: tyre rubber, cab paint, glass, and the two things the system
   actually reads — the container's side markings and the trailer plate.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "../_vision/palette";
import { makeMetal, makeRoughnessMap } from "../_vision/metal";
import { tyre as tyreSkin, concreteFloor as concreteFloorSkin } from "../hero-cards/skins";

/* The container's own paint comes from container-vision's material set — this
   module only covers the parts Gate Vision adds around it. */
export interface GateMaterials {
  dark: THREE.MeshStandardMaterial;       // hardware, gantry, chassis
  rubber: THREE.MeshStandardMaterial;     // tyre tread + shoulder/sidewall
  cab: THREE.MeshStandardMaterial;        // tractor unit paint
  rim: THREE.MeshStandardMaterial;        // wheel rims/hub — carries tyre() cap map
  trim: THREE.MeshStandardMaterial;       // bumper/grille — lighter than chassis `dark`
  glass: THREE.MeshStandardMaterial;      // windscreen — reads as glass, not black
  lens: THREE.MeshStandardMaterial;       // camera-head glass — toned down, was clipping
  headlamp: THREE.MeshStandardMaterial;   // front lamp lenses — emissive, so the front reads as a front
  marker: THREE.MeshStandardMaterial;     // roof marker lights — small emissive amber, NOT signal orange
  plate: THREE.MeshStandardMaterial;      // trailer plate decal
  barrierLight: THREE.MeshStandardMaterial; // boom-gate arm, light bands
  road: THREE.MeshStandardMaterial;       // the carriageway surface
  apron: THREE.MeshStandardMaterial;      // the ground beyond the lane
  all: THREE.Material[];
  dispose: () => void;
}

/* The plate is drawn to canvas rather than modelled: the system reads print,
   so print is what has to be there. Drawn at high resolution and slightly
   worn, so it photographs like a real surface and not like a UI label. */

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/** The trailer plate — the second thing read at the gate. */
export function makePlateTexture(): THREE.CanvasTexture {
  const w = 1024, h = 256;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  // willReadFrequently — this canvas ends in grain(), a getImageData round
  // trip; see the note in _vision/metal.ts on why that matters here
  const c = cv.getContext("2d", { willReadFrequently: true })!;

  c.fillStyle = "#E8E4D8";
  c.fillRect(0, 0, w, h);
  // grubby edges — a plate at a port is never clean
  const vig = c.createLinearGradient(0, 0, 0, h);
  vig.addColorStop(0, "rgba(60,55,45,0.22)");
  vig.addColorStop(0.4, "rgba(60,55,45,0)");
  vig.addColorStop(1, "rgba(40,36,30,0.34)");
  c.fillStyle = vig;
  c.fillRect(0, 0, w, h);

  c.strokeStyle = "#15161A";
  c.lineWidth = 12;
  c.strokeRect(18, 18, w - 36, h - 36);

  c.fillStyle = "#15161A";
  c.textBaseline = "middle";
  c.textAlign = "center";
  c.font = "700 132px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("MH 43 AT 7712", w / 2, h / 2 + 6);

  grain(c, w, h, 26);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Cab paint: a real surface, not a flat colour. Panel seams, a rubbed-in
    dirt gradient up from the sills, and fine grain — the three things that stop
    a large flat body panel reading as untextured plastic under a softbox. */
function makeCabTexture(): THREE.CanvasTexture {
  const w = 1024, h = 1024;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  // willReadFrequently — this canvas ends in grain(), a getImageData round
  // trip; see the note in _vision/metal.ts on why that matters here
  const c = cv.getContext("2d", { willReadFrequently: true })!;

  // navy, same family as the container it pulls — a desaturated grey cab
  // reads as a different vehicle parked next to the box
  c.fillStyle = "#242C48";
  c.fillRect(0, 0, w, h);
  // subtle vertical shading so the panel is never one value
  const sh = c.createLinearGradient(0, 0, 0, h);
  sh.addColorStop(0, "rgba(255,255,255,0.06)");
  sh.addColorStop(0.55, "rgba(0,0,0,0)");
  sh.addColorStop(1, "rgba(0,0,0,0.30)");
  c.fillStyle = sh;
  c.fillRect(0, 0, w, h);

  // panel seams
  c.strokeStyle = "rgba(10,12,16,0.55)";
  c.lineWidth = 3;
  for (const y of [0.28, 0.62, 0.83]) {
    c.beginPath(); c.moveTo(0, h * y); c.lineTo(w, h * y); c.stroke();
  }
  c.lineWidth = 2;
  for (const x of [0.18, 0.5, 0.82]) {
    c.beginPath(); c.moveTo(w * x, 0); c.lineTo(w * x, h); c.stroke();
  }

  // road dirt kicked up the lower third
  for (let i = 0; i < 900; i++) {
    const y = h * (0.68 + Math.random() * 0.32);
    const a = 0.05 + Math.random() * 0.16 * (y / h);
    c.fillStyle = `rgba(58,50,40,${a})`;
    c.beginPath();
    c.ellipse(Math.random() * w, y, 3 + Math.random() * 22, 2 + Math.random() * 9, 0, 0, Math.PI * 2);
    c.fill();
  }

  grain(c, w, h, 16);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* TYRES NO LONGER HAVE THEIR OWN GENERATOR. `hero-cards/skins.ts`'s `tyre()`
   already ships a cached tread map (tiles on the belt's circumference) and a
   cap map (sidewall/hub, does not tile) — proven, module-cached, and warmed
   at idle by `warmHeroSkins()`. Re-authoring the same asset here was the
   exact duplication the owner flagged; `gateTextures()` below pulls both maps
   from that cache instead of painting its own. */

/* TEXTURE CACHE + IDLE WARM — measured.
   Gate Vision was the most expensive build on the Viso Yard page at ~346 ms
   (createStudio accounts for only 46 of it), and effectively ALL of that is
   texture generation done fresh on the scroll path:

     · three canvases finished with grain(), which is a getImageData / per-pixel
       JS loop / putImageData round trip — 5.8 MB of pixel data across the cab
       (1024²), the plate (1024x256) and the tyre (512x256), plus 900 ellipses
       painted on the cab;
     · TWO makeMetal calls whose specs are not CANONICAL_BRUSHED, so unlike
       every other scene they miss metal.ts's cache entirely and each pay a full
       albedo + roughness + Sobel normal derivation. metal.ts's own comment
       claims "every scene in this codebase asks for exactly these parameters" —
       gate-vision is the counterexample, and that is exactly why it is the one
       scene the idle warm never helped;
     · two makeRoughnessMap calls, which have no cache of their own.

   All of it is deterministic and immutable once generated, so it is cached here
   and generated during IDLE instead (see warmGateTextures, called from
   _vision/lazy.tsx). Nothing about the cost changes — it moves off the frame
   the visitor is scrolling in.

   CONSEQUENCE: these textures are now SHARED and must never be disposed by a
   scene teardown. dispose() below drops the materials only. Same trade, and the
   same reasoning, as container-vision/materials.ts. */
interface GateTextures {
  plateTex: THREE.CanvasTexture;
  cabTex: THREE.CanvasTexture;
  /** From hero-cards/skins.ts's `tyre()` — module-cached there, not here. */
  tyreTreadTex: THREE.Texture;
  tyreCapTex: THREE.Texture;
  cabRough: THREE.CanvasTexture;
}
let gateTexCache: GateTextures | null = null;

/* Ground stencil — the lane number painted on the tarmac, the way a real gate
   lane is marked. Transparent background so it lays over the drafting grid as
   paint rather than as a patch of sheet.

   Same cache contract as everything else in this file: generated once, SHARED
   across every build, and NEVER disposed by a scene teardown. A scene that
   disposed this would leave the next gate build sampling a destroyed texture.

   No willReadFrequently here — unlike the three canvases above this one never
   goes through getImageData, so the flag would only cost the GPU-backed path. */
let stencilTexCache: THREE.CanvasTexture | null = null;

export function gateStencilTexture(): THREE.CanvasTexture {
  if (stencilTexCache) return stencilTexCache;
  const w = 512, h = 192;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d")!;

  c.clearRect(0, 0, w, h);
  c.fillStyle = "rgba(201,212,222,0.9)";
  c.textBaseline = "middle";
  c.textAlign = "center";
  c.font = "700 88px ui-monospace, 'SF Mono', Menlo, monospace";
  c.fillText("GATE 04", w / 2, h / 2);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  stencilTexCache = tex;
  return tex;
}

function gateTextures(): GateTextures {
  if (!gateTexCache) {
    const { tread, cap } = tyreSkin();
    gateTexCache = {
      plateTex: makePlateTexture(),
      cabTex: makeCabTexture(),
      tyreTreadTex: tread,
      tyreCapTex: cap,
      cabRough: makeRoughnessMap("painted", 0.46),
      // tyreRough is gone with makeTyreTexture — tyre() has no roughness map
      // of its own, so the tread/cap materials below carry a flat roughness
      // instead of a mapped one, same as any other skins.ts consumer.
    };
  }
  return gateTexCache;
}

/** Generate and cache everything above, plus the two non-canonical metals.
 *  Called from the idle warm so the scroll-path build gets only cache hits. */
export function warmGateTextures() {
  gateTextures();
  gateStencilTexture();
  // the METAL maps are cached inside metal.ts; the material is throwaway
  makeMetal(DARK_METAL).dispose();
  makeMetal(RIM_METAL).dispose();
}

/* Hoisted to module scope so the warm and the build ask for byte-identical
   parameters — metal.ts caches on the spec, so a stray digit here is a silent
   cache miss and the warm buys nothing. */
const DARK_METAL = { base: "#2B313B", kind: "plate", metalness: 0.78, rough: 0.5 } as const;
const RIM_METAL = { base: "#5A626C", kind: "brushed", metalness: 0.88, rough: 0.36 } as const;

export function buildGateMaterials(): GateMaterials {
  // opacity 0 on everything the intro resolves in — the scene fades the whole
  // vehicle up out of its wireframe, same as Container Vision
  const common = { transparent: true, opacity: 0 as number, envMapIntensity: 0.7 };

  /* Structural steel, not a flat colour. Everything the truck and gantry are
     built from now carries a real roughness map, so the softbox breaks up
     across a face instead of shading it like one flat polygon — which is what
     made the whole rig read as plastic. */
  const { plateTex, cabTex, tyreTreadTex, tyreCapTex, cabRough } = gateTextures();

  const darkMetal = makeMetal(DARK_METAL);
  const dark = darkMetal.material;
  /* TYRE, VIA hero-cards/skins.ts's `tyre()` — REUSED, NOT REPAINTED. The
     tread map goes on the belt/shoulder/sidewall-disc meshes (all of which
     already wrap a cylinder around the tyre's circumference in gate.ts, so
     the map's own S-axis repeat is correct with no extra UV work); the cap
     map goes on the rim disc + hub, which is exactly the sidewall/hub asset
     `tyre().cap` was drawn for. */
  const rubber = new THREE.MeshStandardMaterial({
    // colour MULTIPLIES the map, so this knocks the rubber down rather than
    // up — under this key a 0.15-albedo map still renders mid-grey on its own
    map: tyreTreadTex, color: "#70757C", roughness: 0.96,
    metalness: 0.0, ...common,
  });
  /* The cab is the biggest single surface in the scene, so it is the one that
     most needs a roughness map: a large panel at one flat roughness reflects
     the softbox as an even wash and reads as plastic no matter how good the
     albedo is. envMapIntensity lifted from the shared `common` 0.7 to 0.9 —
     see the exposure note in scene.tsx: the cab paint was the flattest thing
     in the scene once the overall level came up, and paint wants some sheen
     of its own on top of a brighter room, not just a brighter room. */
  const cab = new THREE.MeshStandardMaterial({
    map: cabTex, roughnessMap: cabRough, roughness: 1, metalness: 0.45,
    ...common, envMapIntensity: 0.9,
  });
  // bare rim/hub metal, carrying the tyre's own cap/hub map instead of a flat
  // tint — distinct from the black hardware
  const rimMetal = makeMetal(RIM_METAL);
  const rim = rimMetal.material;
  rim.map = tyreCapTex;
  /* Lighter trim steel for the bumper/grille — one step up from `dark` in
     both colour and roughness, the same idea gate.ts's chassis/cab split
     already draws on: a truck front is paint, glass, dark chassis AND a
     lighter bumper/grille trim, four values not two. Without this the bumper
     and the chassis rails behind it were the same flat black and the nose
     read as one shape instead of four. */
  const trim = new THREE.MeshStandardMaterial({
    color: "#4A5158", metalness: 0.55, roughness: 0.42, envMapIntensity: 0.6,
    transparent: true, opacity: 0,
  });
  /* THE WINDSCREEN, FIXED. This was metalness 0.9 / envMapIntensity 1.4 —
     numbers for a POLISHED METAL PANEL, not glass, and a metal that dark
     just reads as a black rectangle under a low-level room (see the exposure
     note below). Real automotive glass is close to metalness 0 with a very
     low roughness: it is a dielectric, so what makes it read as glass is a
     SHARP, BRIGHT environment reflection sitting on top of a dark base, not
     the base's own metallic response. Dropped metalness to near 0, roughness
     down to a true specular sheen, and envMapIntensity pushed hard (2.4) so
     the strip-light softboxes actually streak across it — that streak is the
     one cue that reads as "glass" rather than "hole". Base colour lifted one
     notch, #0B1220 -> #16233A, so the panel has a colour of its own under the
     reflection instead of reading as pure black between highlights. */
  const glass = new THREE.MeshStandardMaterial({
    color: "#16233A", metalness: 0.05, roughness: 0.045, envMapIntensity: 2.4,
    transparent: true, opacity: 0,
  });
  /* THE CLIPPING HIGHLIGHT. This was the single brightest thing in the frame,
     clipping to pure white — envMapIntensity 1.8 on a metalness-0.95/
     roughness-0.08 lens (near-mirror) pointed up at the gantry's own softbox
     strip is exactly the recipe for a blown specular. Brought down across all
     three axes: envMapIntensity 1.8 -> 0.85, roughness 0.08 -> 0.20 (still a
     glass lens, just not a mirror), metalness 0.95 -> 0.8. Still the darkest,
     glossiest surface in the scene — it no longer clips. */
  const lens = new THREE.MeshStandardMaterial({
    color: "#05070C", metalness: 0.8, roughness: 0.20, envMapIntensity: 0.85,
    transparent: true, opacity: 0,
  });
  /* HEADLAMPS — the front used to have two lens-material boxes standing in
     for lamps, which under the old dim exposure read as two more dark
     rectangles. Emissive white-warm, unlit by the scan/scene lighting (it is
     the lamp's OWN light, not a reflection), so it reads as a lit lamp at any
     exposure. toneMapped:false, same house rule as every unlit accent mark on
     this site (see the underline/scan marks in scene.tsx) — a lamp is a light
     source, not a lit surface, and ACES would otherwise crush it back toward
     grey. */
  const headlamp = new THREE.MeshStandardMaterial({
    color: "#EDEFF4", emissive: "#EDEFF4", emissiveIntensity: 0.9,
    roughness: 0.3, metalness: 0.1, toneMapped: false,
    transparent: true, opacity: 0,
  });
  /* MARKER LIGHTS — small amber roof-line lamps, the row of clearance lights
     that makes a cab's roofline read as a roofline at night. Amber, NOT the
     SIGNAL #ED510C: #E8A560 is a warm desaturated amber, clearly a different
     hue/saturation family from the detection accent, so it can never be
     mistaken for "the system flagged something" — it is vehicle equipment,
     always on, never a finding. */
  const marker = new THREE.MeshStandardMaterial({
    color: "#E8A560", emissive: "#E8A560", emissiveIntensity: 0.8,
    roughness: 0.4, metalness: 0.0, toneMapped: false,
    transparent: true, opacity: 0,
  });

  const plate = new THREE.MeshStandardMaterial({
    map: plateTex, transparent: true, opacity: 0, roughness: 0.62, metalness: 0.05,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });

  /* The boom arm's light bands. Brighter and less rough than the dark
     structural steel so the alternating stripes actually read as stripes at
     this distance rather than as one grey stick. */
  const barrierLight = new THREE.MeshStandardMaterial({
    /* Darkened from #D8DEE6/met 0.3/rough 0.55 after the first render: a
       near-white metal under this key light read as a glowing tube, not a
       painted boom — the brightest thing in frame must stay the overlay. */
    color: "#AEB6C0", metalness: 0.15, roughness: 0.7, envMapIntensity: 0.3,
    transparent: true, opacity: 0,
  });

  /* ---- the road and the apron beyond it ----
     Both reuse hero-cards/skins.ts's `concreteFloor()` — one cached canvas,
     two tints/repeats, the same idiom `wallMapFor`/skins' own callers use for
     one map serving several rects. The road stays close to its old near-black
     value (it is a much-driven lane, darker than the open apron) with a tight
     tile so the aggregate reads at truck-passing distance; the apron is a
     stop lighter (real sealed concrete, not lane asphalt) and tiles wider
     since it is seen from further back and to the sides. */
  const roadTex = concreteFloorSkin();
  const roadTexT = roadTex.clone();
  roadTexT.wrapS = roadTexT.wrapT = THREE.RepeatWrapping;
  roadTexT.repeat.set(9, 1.2);
  roadTexT.needsUpdate = true;
  const road = new THREE.MeshStandardMaterial({
    map: roadTexT, color: "#3A3F46", roughness: 0.95, metalness: 0.0,
    transparent: true, opacity: 0,
  });
  const apronTex = roadTex.clone();
  apronTex.wrapS = apronTex.wrapT = THREE.RepeatWrapping;
  apronTex.repeat.set(14, 14);
  apronTex.needsUpdate = true;
  const apron = new THREE.MeshStandardMaterial({
    map: apronTex, color: "#63696F", roughness: 0.96, metalness: 0.0,
    envMapIntensity: 0.12,
    transparent: true, opacity: 0,
  });

  const all = [
    dark, rubber, cab, rim, trim, glass, lens, headlamp, marker, plate,
    barrierLight, road, apron,
  ];
  return {
    dark, rubber, cab, rim, trim, glass, lens, headlamp, marker, plate,
    barrierLight, road, apron, all,
    /* MATERIALS ONLY. The canvas textures are cached in gateTexCache (or, for
       the tyre and concrete maps, in hero-cards/skins.ts's own cache) and the
       metal maps are cached in metal.ts, so a teardown that disposed them
       would leave the next gate build sampling destroyed textures — the exact
       hazard flagged on container-vision's FrontMaterial.dispose. The two
       CLONED road/apron textures are this material's own (clone() shares the
       image but not the repeat/wrap state) and are disposed here; the image
       data underneath stays owned by skins.ts's cache. */
    dispose: () => {
      darkMetal.dispose();
      rimMetal.dispose();
      roadTexT.dispose();
      apronTex.dispose();
      all.forEach((m) => m.dispose());
    },
  };
}


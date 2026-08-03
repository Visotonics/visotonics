/* ---------------------------------------------------------------------------
   Container Vision — self-contained procedural materials.

   All wear (rust streaks, chalking, scuffs, stencils, roughness variation) is
   generated at runtime into <canvas> textures — no downloaded image/HDRI
   assets. The FRONT face additionally bakes high-detail damage (dent, rust,
   crack) at the exact SVG-specified positions, always visible as real surface
   damage, and carries a shader that lets the scan sweep light up the steel and
   the findings ignite as they are detected.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE } from "./palette";
import { L, H, DEFECT_UV } from "./container";

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  return [cv, cv.getContext("2d")!];
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* shared steel grunge — mottling, vertical chalk streaks, rust runs, stencils */
function drawSteel(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, stencil = true) {
  const rnd = mulberry32(seed);
  ctx.fillStyle = PALETTE.steel;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rnd() * 0.06})`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, rnd() * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < w / 6; i++) {
    const x = rnd() * w;
    ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`;
    ctx.fillRect(x, 0, 1 + rnd() * 3, h);
  }
  for (let i = 0; i < w / 20; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.5;
    const len = 40 + rnd() * 180;
    const c = i % 3 === 0 ? PALETTE.rustHot : PALETTE.rust;
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, c + "aa");
    g.addColorStop(1, c + "00");
    ctx.fillStyle = g;
    ctx.fillRect(x - 1, y, 2 + rnd() * 3, len);
  }
  if (stencil) {
    // painted container markings — these are exactly what the readout panel
    // reports, so the extracted data matches what is visible on the steel.
    // Paint-like values (never pure white) so they don't clip and bloom.
    // block is centred vertically on the panel so the top and bottom rails sit
    // an equal distance from the text
    ctx.fillStyle = "rgba(208,218,232,0.52)";
    ctx.font = `bold ${Math.round(h * 0.078)}px monospace`;
    ctx.fillText("VSTU 907032 1", w * 0.045, h * 0.4);
    ctx.font = `bold ${Math.round(h * 0.05)}px monospace`;
    ctx.fillText("22G1", w * 0.045, h * 0.485);
    ctx.fillStyle = "rgba(208,218,232,0.38)";
    ctx.font = `${Math.round(h * 0.031)}px monospace`;
    ctx.fillText("MAX GROSS   30480 KG", w * 0.045, h * 0.565);
    ctx.fillText("TARE         2200 KG", w * 0.045, h * 0.615);
    ctx.fillText("MFG          03-2019", w * 0.045, h * 0.665);
  }
}

/* ---- HD-ish defect painters (albedo) ---- */
function paintRust(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rnd: () => number) {
  // irregular corroded patch: dark base, orange bloom, pitting, bleed streaks
  ctx.save();
  for (let layer = 0; layer < 4; layer++) {
    const cols = ["#2a1a12", "#5a3320", "#8a4a28", "#b5652f"];
    ctx.fillStyle = cols[layer];
    const pts = 14;
    ctx.beginPath();
    for (let i = 0; i <= pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const rad = r * (0.55 + layer * 0.11) * (0.7 + rnd() * 0.6);
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad * 0.85;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.6 - layer * 0.08;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // pitting speckle
  for (let i = 0; i < r * 3; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = rnd() * r * 0.9;
    ctx.fillStyle = rnd() > 0.5 ? "#1c120c" : "#c9773a";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.85, rnd() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // fine granular oxide grain
  for (let i = 0; i < r * 26; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = Math.pow(rnd(), 0.65) * r;
    const g = rnd();
    ctx.fillStyle = g > 0.72 ? "rgba(214,138,74,0.5)" : g > 0.4 ? "rgba(92,52,28,0.55)" : "rgba(28,18,12,0.5)";
    ctx.fillRect(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 0.85, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  // flaking scale: hard-edged chips lifting off the surface
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2;
    const rad = rnd() * r * 0.85;
    const fx0 = cx + Math.cos(a) * rad;
    const fy0 = cy + Math.sin(a) * rad * 0.85;
    const s = 3 + rnd() * 7;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    for (let k = 1; k <= 5; k++) {
      const aa = (k / 5) * Math.PI * 2;
      ctx.lineTo(fx0 + Math.cos(aa) * s * (0.6 + rnd() * 0.7), fy0 + Math.sin(aa) * s * (0.6 + rnd() * 0.7));
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(18,11,8,0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(224,150,86,0.4)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // downward bleed streaks
  for (let i = 0; i < 6; i++) {
    const x = cx + (rnd() - 0.5) * r * 1.3;
    const g = ctx.createLinearGradient(x, cy, x, cy + r * (1 + rnd()));
    g.addColorStop(0, "#7a4526cc");
    g.addColorStop(1, "#7a452600");
    ctx.fillStyle = g;
    ctx.fillRect(x, cy, 2 + rnd() * 3, r * (1 + rnd()));
  }
  ctx.restore();
}

function paintDent(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rnd: () => number, strength = 1) {
  // concave deformation: shadow lower-half, highlight upper rim, contour rings.
  // `strength` lets the front dent stay soft (it also has real geometry depth)
  // while decal-only dents on other faces read strongly enough to be seen.
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r);
  g.addColorStop(0, `rgba(232,238,246,${0.045 * strength})`);
  g.addColorStop(0.45, "rgba(0,0,0,0.0)");
  g.addColorStop(0.75, `rgba(0,0,0,${0.4 * strength})`);
  g.addColorStop(1, "rgba(0,0,0,0.0)");
  // irregular outline — clip the shading to a lopsided blob, never an ellipse
  const blob = (rad: number, jitter: number, phase: number) => {
    ctx.beginPath();
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wob =
        1 + jitter * (0.34 * Math.sin(a * 2 + phase) + 0.22 * Math.sin(a * 3 - phase * 1.6) + 0.14 * Math.sin(a * 5 + phase * 2.2));
      const rr = rad * wob;
      const px2 = cx + Math.cos(a) * rr;
      const py2 = cy + Math.sin(a) * rr * 0.84;
      i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
    }
    ctx.closePath();
  };

  ctx.save();
  blob(r, 1, 0.9);
  ctx.clip();
  ctx.fillStyle = g;
  ctx.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4);
  ctx.restore();

  // buckled crease highlight, broken rather than a smooth arc
  ctx.strokeStyle = `rgba(206,216,228,${0.15 * strength})`;
  ctx.lineWidth = 1.6 * strength;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (1.02 + (i / 16) * 0.94);
    const rr = r * (0.66 + 0.16 * Math.sin(a * 3 + 1.2));
    const px2 = cx + Math.cos(a) * rr;
    const py2 = cy - r * 0.08 + Math.sin(a) * rr * 0.62;
    i === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2);
  }
  ctx.stroke();

  // contour creases, each with its own irregular outline
  for (let i = 1; i <= 3; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${(0.2 - i * 0.035) * strength})`;
    ctx.lineWidth = 1;
    blob(r * 0.26 * i, 0.8, 0.9 + i * 1.3);
    ctx.stroke();
  }
  ctx.restore();
}

function paintCrack(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rnd: () => number) {
  /* A fracture in steel follows ONE stress path. It deviates sharply but is
     always pulled back to that path, it does not spread like roots, and on a
     weathered container it bleeds rust out of the opening. */
  ctx.save();
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 2;

  /* Two short fractures meeting off-centre in a lopsided X — the way steel
     tears around a single impact point. Neither arm is the same length. */
  const arm = (baseAng: number, len: number, wMax: number, t0: number, t1: number) => {
    // Lightning geometry: long straight runs meeting at hard, alternating
    // bends — not a wandering line. Each kick throws to the opposite side of
    // the base direction, which is what gives a bolt its jagged silhouette.
    const pts: [number, number][] = [];
    let px = cx - Math.cos(baseAng) * len * t0;
    let py = cy - Math.sin(baseAng) * len * t0;
    const segs = 9;
    const step = (len * (t0 + t1)) / segs;
    let side = 1;
    for (let i = 0; i <= segs; i++) {
      pts.push([px, py]);
      const kick = (0.5 + rnd() * 0.55) * side;
      side *= -1;
      const a = baseAng + kick;
      const runLen = step * (0.7 + rnd() * 0.7);
      px += Math.cos(a) * runLen;
      py += Math.sin(a) * runLen;
    }
    const trace = () => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    };
    // faint rust weeping out of the split — restrained, the crack is the star
    ctx.strokeStyle = "rgba(96,58,34,0.3)";
    ctx.lineWidth = 11;
    trace();
    ctx.stroke();
    ctx.strokeStyle = "rgba(132,80,44,0.26)";
    ctx.lineWidth = 5;
    trace();
    ctx.stroke();
    // oxide crust hugging the edges
    for (const [x, y] of pts) {
      for (let k = 0; k < 2; k++) {
        ctx.fillStyle = rnd() > 0.5 ? "rgba(146,86,46,0.42)" : "rgba(52,30,18,0.45)";
        ctx.fillRect(x + (rnd() - 0.5) * 7, y + (rnd() - 0.5) * 7, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
      }
    }
    // Lit lip: paint chipped off one side catches the light. This is the cue
    // that reads as depth on a flat surface — a black line alone looks drawn on.
    for (let i = 0; i < pts.length - 1; i++) {
      const tt = i / (pts.length - 1);
      const wNow = wMax * Math.sin(Math.PI * tt);
      if (wNow < 0.3) continue;
      const dx = pts[i + 1][0] - pts[i][0];
      const dy = pts[i + 1][1] - pts[i][1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * (wNow * 0.5 + 0.7);
      const ny = (dx / len) * (wNow * 0.5 + 0.7);
      ctx.strokeStyle = "rgba(196,208,224,0.3)";
      ctx.lineWidth = Math.max(0.5, wNow * 0.45);
      ctx.beginPath();
      ctx.moveTo(pts[i][0] + nx, pts[i][1] + ny);
      ctx.lineTo(pts[i + 1][0] + nx, pts[i + 1][1] + ny);
      ctx.stroke();
    }
    // the split itself: black, tapering to a hairline at both tips
    for (let i = 0; i < pts.length - 1; i++) {
      const tt = i / (pts.length - 1);
      const wNow = wMax * Math.sin(Math.PI * tt);
      if (wNow < 0.25) continue;
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = wNow;
      ctx.beginPath();
      ctx.moveTo(pts[i][0], pts[i][1]);
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      ctx.stroke();
    }
  };

  arm(Math.PI * 0.31, r * 1.15, 9.5, 0.5, 0.5);
  ctx.restore();
}

/* Transparent decal textures to lay damage on faces other than the front,
   so it can be demonstrated across multiple faces of the container. */
export function makeCrackDecal(): THREE.CanvasTexture {
  const S = 512;
  const [cv, ctx] = makeCanvas(S, S);
  // decal-only damage carries no geometry, so it is painted boldly
  paintCrack(ctx, S * 0.5, S * 0.56, S * 0.46, mulberry32(51));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeDentDecal(): THREE.CanvasTexture {
  const S = 512;
  const [cv, ctx] = makeCanvas(S, S);
  paintDent(ctx, S * 0.5, S * 0.5, S * 0.4, mulberry32(88), 1.6);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface FrontMaterial {
  material: THREE.MeshStandardMaterial;
  setScan: (x: number, on: number) => void;
  setTime: (t: number) => void;
  dispose: () => void;
}

export function makeRustDecal(): THREE.CanvasTexture {
  const S = 512;
  const [cv, ctx] = makeCanvas(S, S);
  // paintRust lays no base fill, so the patch arrives with its own irregular
  // silhouette over transparent pixels — which is the whole requirement of a
  // decal: a rectangle of steel stuck on steel would read as a sticker.
  paintRust(ctx, S * 0.5, S * 0.5, S * 0.42, mulberry32(37));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* TEXTURE CACHE — measured, not assumed.

   A gate-vision build costs 367 ms, and the Viso Yard page pays that twice:
   buildMaterials is called once by container-vision and once by gate-vision,
   and between them they paint a 1024x512 steel canvas plus THREE 2048-wide
   canvases with thousands of per-pixel operations, for byte-identical output.

   Sharing is safe because these textures are IMMUTABLE after generation: the
   scan is a shader UNIFORM, so setScan/setTime only ever write
   uniforms[name].value and material.userData.shader — nothing here is ever
   redrawn and needUpdate is never raised. The MATERIAL owns the uniforms, so
   the material stays per-scene and only the pixels are shared.

   Every generator below seeds its own mulberry32 from a literal, so a cache
   hit cannot shift anyone's random sequence: the first call produces exactly
   what an uncached call produced, and later calls produce nothing at all. */
interface FrontTextures {
  albTex: THREE.CanvasTexture;
  rghTex: THREE.CanvasTexture;
  bmpTex: THREE.CanvasTexture;
}
let frontTexCache: FrontTextures | null = null;

function makeFrontTextures(): FrontTextures {
  const W = 1024;
  const HT = Math.round(W * (H / L)); // keep aspect ~ real face
  const [alb, actx] = makeCanvas(W, HT);
  const [rgh, rctx] = makeCanvas(W, HT);
  const [bmp, bctx] = makeCanvas(W, HT);

  // base steel
  drawSteel(actx, W, HT, 101, true);
  // roughness base (~0.6) with grain
  rctx.fillStyle = "#9a9a9a";
  rctx.fillRect(0, 0, W, HT);
  const rr = mulberry32(202);
  for (let i = 0; i < 9000; i++) {
    const g = 90 + Math.floor(rr() * 130);
    rctx.fillStyle = `rgb(${g},${g},${g})`;
    rctx.fillRect(rr() * W, rr() * HT, 1 + rr() * 2, 1 + rr() * 2);
  }
  // bump base mid-gray
  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, W, HT);

  const rnd = mulberry32(303);
  const px = (u: number) => u * W;
  const py = (v: number) => v * HT;
  const rDent = HT * 0.19;
  const rRust = HT * 0.15;

  // albedo damage — front face carries the dent (real depth) + a corrosion patch;
  // the crack lives on the roof (a separate face) via a decal.
  // soft: the front dent already carries real geometric depth, so the painted
  // shading only needs to support it, not shout
  paintDent(actx, px(DEFECT_UV.dent.u), py(DEFECT_UV.dent.v), rDent, rnd, 0.75);
  paintRust(actx, px(DEFECT_UV.rust.u), py(DEFECT_UV.rust.v), rRust, rnd);

  // roughness: rust much rougher
  rctx.fillStyle = "rgba(240,240,240,0.7)";
  rctx.beginPath();
  rctx.ellipse(px(DEFECT_UV.rust.u), py(DEFECT_UV.rust.v), rRust, rRust * 0.85, 0, 0, Math.PI * 2);
  rctx.fill();
  // Dented steel has cracked, scuffed paint — it is ROUGHER than the panel
  // around it, never glossier. Push roughness up across the dent with a torn,
  // irregular edge and abraded speckle so it never catches a clean highlight.
  {
    const dx0 = px(DEFECT_UV.dent.u);
    const dy0 = py(DEFECT_UV.dent.v);
    const dR = rDent * 1.25;
    rctx.save();
    rctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const wob = 1 + 0.3 * Math.sin(a * 2 + 0.9) + 0.2 * Math.sin(a * 3 - 1.4) + 0.12 * Math.sin(a * 5 + 2.2);
      const rr = dR * wob;
      const xx = dx0 + Math.cos(a) * rr;
      const yy = dy0 + Math.sin(a) * rr * 0.84;
      i === 0 ? rctx.moveTo(xx, yy) : rctx.lineTo(xx, yy);
    }
    rctx.closePath();
    rctx.clip();
    const dg = rctx.createRadialGradient(dx0, dy0, 0, dx0, dy0, dR);
    dg.addColorStop(0, "rgba(255,255,255,0.85)");
    dg.addColorStop(0.6, "rgba(248,248,248,0.6)");
    dg.addColorStop(1, "rgba(240,240,240,0)");
    rctx.fillStyle = dg;
    rctx.fillRect(dx0 - dR * 2, dy0 - dR * 2, dR * 4, dR * 4);
    const dr2 = mulberry32(404);
    for (let i = 0; i < 2600; i++) {
      const a = dr2() * Math.PI * 2;
      const rad = Math.pow(dr2(), 0.6) * dR;
      const g2 = 200 + Math.floor(dr2() * 55);
      rctx.fillStyle = `rgba(${g2},${g2},${g2},0.5)`;
      rctx.fillRect(dx0 + Math.cos(a) * rad, dy0 + Math.sin(a) * rad * 0.84, 1 + dr2() * 2, 1 + dr2() * 2);
    }
    rctx.restore();
  }
  // bump: dent depression
  const bg = bctx.createRadialGradient(px(DEFECT_UV.dent.u), py(DEFECT_UV.dent.v), 0, px(DEFECT_UV.dent.u), py(DEFECT_UV.dent.v), rDent);
  bg.addColorStop(0, "#3a3a3a");
  bg.addColorStop(1, "#808080");
  bctx.fillStyle = bg;
  bctx.beginPath();
  bctx.ellipse(px(DEFECT_UV.dent.u), py(DEFECT_UV.dent.v), rDent, rDent * 0.82, 0, 0, Math.PI * 2);
  bctx.fill();

  const albTex = new THREE.CanvasTexture(alb);
  albTex.colorSpace = THREE.SRGBColorSpace;
  const rghTex = new THREE.CanvasTexture(rgh);
  const bmpTex = new THREE.CanvasTexture(bmp);
  return { albTex, rghTex, bmpTex };
}

function buildFront(): FrontMaterial {
  if (!frontTexCache) frontTexCache = makeFrontTextures();
  const { albTex, rghTex, bmpTex } = frontTexCache;

  const material = new THREE.MeshStandardMaterial({
    map: albTex,
    roughnessMap: rghTex,
    bumpMap: bmpTex,
    bumpScale: 0.6,
    // weathered painted steel: matte and chalky, not showroom-shiny
    metalness: 0.22,
    roughness: 0.78,
    envMapIntensity: 0.32,
    transparent: true,
    opacity: 0,
  });

  const uniforms = {
    uScanX: { value: -99 },
    uScanOn: { value: 0 },
    uTime: { value: 0 },
    uAccent: { value: new THREE.Color(PALETTE.accent) },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    // object-space X so the scan stays aligned when the container floats/rotates
    shader.vertexShader = "varying float vObjX;\n" + shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\n  vObjX = transformed.x;",
    );
    shader.fragmentShader =
      "varying float vObjX;\nuniform float uScanX;uniform float uScanOn;uniform vec3 uAccent;\n" +
      shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          // the scan sheet lighting the steel as it passes — soft body + a hard
          // bright leading edge (a blade). No emissive glow on the damage itself;
          // findings are called out by the bounding boxes.
          float dx = vObjX - uScanX;
          float band = smoothstep(0.09, 0.0, abs(dx)) * uScanOn;
          float lead = smoothstep(0.018, 0.0, abs(dx)) * uScanOn;
          totalEmissiveRadiance += uAccent * (band * 0.5 + lead * 1.4);
        }`,
      );
    material.userData.shader = shader;
  };

  const set = (name: keyof typeof uniforms, v: number) => {
    uniforms[name].value = v as never;
    const s = material.userData.shader as { uniforms: Record<string, { value: unknown }> } | undefined;
    if (s) s.uniforms[name].value = v;
  };

  return {
    material,
    setScan: (x, on) => {
      set("uScanX", x);
      set("uScanOn", on);
    },
    setTime: (t) => set("uTime", t),
    // MATERIAL ONLY. The three maps are cached and shared, and on the Yard page
    // a second scene is still drawing with them when this one tears down —
    // disposing them here blanks that scene's steel. This exact trap has been
    // hit twice in this codebase; see PERFORMANCE.md.
    dispose: () => { material.dispose(); },
  };
}

export interface MaterialSet {
  steel: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  front: FrontMaterial;
  dispose: () => void;
}

/* Same cache, same reasoning as the front maps above: the tiled steel pair is
   identical for every caller and nothing ever writes to it after generation. */
let tiledTexCache: { albedo: THREE.CanvasTexture; rough: THREE.CanvasTexture } | null = null;

function makeTiledTextures() {
  const [alb, actx] = makeCanvas(1024, 512);
  drawSteel(actx, 1024, 512, 7, false); // no repeated ID stencil on tiled faces
  const albedo = new THREE.CanvasTexture(alb);
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(3, 1.5);
  albedo.colorSpace = THREE.SRGBColorSpace;

  const [rgh, rctx] = makeCanvas(1024, 512);
  rctx.fillStyle = "#9a9a9a";
  rctx.fillRect(0, 0, 1024, 512);
  const rr = mulberry32(19);
  for (let i = 0; i < 6000; i++) {
    const g = 90 + Math.floor(rr() * 130);
    rctx.fillStyle = `rgb(${g},${g},${g})`;
    rctx.fillRect(rr() * 1024, rr() * 512, 1 + rr() * 2, 1 + rr() * 2);
  }
  const rough = new THREE.CanvasTexture(rgh);
  rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
  rough.repeat.set(3, 1.5);
  return { albedo, rough };
}

/** Populate the two texture caches without building any material.
 *
 *  The caches below already prevented the SECOND consumer on a page from
 *  repainting three 2048-wide canvases. They never helped the first one, and on
 *  the Viso Yard page the first one is whichever scene the visitor scrolls to —
 *  so the cost was still landing on a scrolling frame. Called from the idle warm
 *  in _vision/lazy.tsx, this makes every consumer the second one. */
export function warmContainerTextures() {
  /* MEASURED HERE, because nothing else was measuring it.
     `mount.ts`'s build timer wraps make(), and these generators run in the idle
     warm chain OUTSIDE it — so the most expensive thing on the page reported
     zero for months while the build it fed reported 150ms. On /lab/container-
     vision the build says 233ms and the main thread blocks for over six seconds.
     Anything that paints a canvas gets a mark from now on. */
  const mark = (what: string, t0: number) => {
    if (typeof location === "undefined" || !location.search.includes("perf")) return;
    const w = window as unknown as { __visionTex?: string[] };
    (w.__visionTex ||= []).push(`${what} ${(performance.now() - t0).toFixed(0)}`);
  };
  if (!tiledTexCache) { const t = performance.now(); tiledTexCache = makeTiledTextures(); mark("tiled", t); }
  if (!frontTexCache) { const t = performance.now(); frontTexCache = makeFrontTextures(); mark("front", t); }
}

export function buildMaterials(): MaterialSet {
  if (!tiledTexCache) tiledTexCache = makeTiledTextures();
  const { albedo, rough } = tiledTexCache;

  const steel = new THREE.MeshStandardMaterial({
    map: albedo,
    roughnessMap: rough,
    metalness: 0.22,
    roughness: 0.8,
    envMapIntensity: 0.32,
    transparent: true,
    opacity: 0,
  });

  // hardware is bare steel — still metallic, but weathered rather than polished
  const dark = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.steelDark),
    metalness: 0.6,
    roughness: 0.6,
    envMapIntensity: 0.45,
    transparent: true,
    opacity: 0,
  });

  const front = buildFront();

  return {
    steel,
    dark,
    front,
    // MATERIALS ONLY — the tiled maps are cached and a second scene on the same
    // page is still sampling them. See the note on FrontMaterial.dispose.
    dispose: () => {
      steel.dispose();
      dark.dispose();
      front.dispose();
    },
  };
}

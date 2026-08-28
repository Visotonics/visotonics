/* ---------------------------------------------------------------------------
   Verbatim port of the source site's lib/textures.ts. No changes — these are
   pure canvas-drawing functions with no external imports to repoint.
--------------------------------------------------------------------------- */
import * as THREE from "three";

function make(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
}

/** Painted VISOTONICS wordmark + container ID / ISO markings, drawn at runtime (no external assets). */
export function brandingTexture() {
  const [c, x] = make(2048, 640);
  x.textBaseline = "middle";
  x.fillStyle = "rgba(255,255,255,0.92)";
  x.font = "700 200px 'Space Grotesk', 'Arial Black', sans-serif";
  let cx = 110;
  for (const ch of "VISOTONICS") {
    x.fillText(ch, cx, 280);
    cx += x.measureText(ch).width + 16;
  }
  x.font = "600 54px 'JetBrains Mono', 'Courier New', monospace";
  x.fillStyle = "rgba(255,255,255,0.85)";
  x.fillText("VSTU 907032 1", 110, 520);
  x.fillText("22G1", 640, 520);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blobPath(x: CanvasRenderingContext2D, rnd: () => number, cx: number, cy: number, r: number) {
  const n = 8 + Math.floor(rnd() * 5);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.6 + rnd() * 0.8);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.85]);
  }
  x.beginPath();
  x.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
  for (let i = 0; i < n; i++) {
    const nx = pts[(i + 1) % n];
    x.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + nx[0]) / 2, (pts[i][1] + nx[1]) / 2);
  }
  x.closePath();
}

/** Corrosion patch: irregular dark-core blobs, clipped speckle grain, drip streaks, eaten edges. */
export function rustTexture() {
  const [c, x] = make(512, 512);
  const rnd = mulberry32(907032);
  const tones = ["#8a5a2b", "#6e421d", "#a06a33", "#5a3517"];

  const blobs: [number, number, number][] = [
    [200, 240, 120],
    [330, 300, 90],
    [280, 160, 70],
  ];
  for (const [bx, by, br] of blobs) {
    blobPath(x, rnd, bx, by, br);
    const g = x.createRadialGradient(bx, by, br * 0.1, bx, by, br * 1.1);
    g.addColorStop(0, "rgba(74,43,18,0.95)");
    g.addColorStop(0.55, "rgba(110,66,29,0.85)");
    g.addColorStop(1, "rgba(138,90,43,0.55)");
    x.fillStyle = g;
    x.fill();
  }

  x.globalCompositeOperation = "source-atop";
  for (let i = 0; i < 420; i++) {
    x.globalAlpha = 0.2 + rnd() * 0.5;
    x.fillStyle = tones[Math.floor(rnd() * 4)];
    const sx = rnd() * 512;
    const sy = rnd() * 512;
    const sr = 1 + rnd() * 2.5;
    x.fillRect(sx, sy, sr, sr);
  }
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";

  for (let i = 0; i < 6; i++) {
    const b = blobs[i % blobs.length];
    const dx = b[0] + (rnd() - 0.5) * b[2] * 1.2;
    const dy = b[1] + b[2] * (0.5 + rnd() * 0.3);
    const len = 25 + rnd() * 45;
    const g = x.createLinearGradient(dx, dy, dx, dy + len);
    g.addColorStop(0, "rgba(110,66,29,0.5)");
    g.addColorStop(1, "rgba(110,66,29,0)");
    x.fillStyle = g;
    x.fillRect(dx, dy, 2 + rnd() * 2.5, len);
  }

  x.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 26; i++) {
    const b = blobs[Math.floor(rnd() * blobs.length)];
    const a = rnd() * Math.PI * 2;
    const ex = b[0] + Math.cos(a) * b[2] * (0.85 + rnd() * 0.35);
    const ey = b[1] + Math.sin(a) * b[2] * (0.75 + rnd() * 0.3);
    blobPath(x, rnd, ex, ey, 8 + rnd() * 18);
    x.fill();
  }
  x.globalCompositeOperation = "source-over";

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Dark scuffed shading used with the vertex dent on panel 4. */
export function scuffTexture() {
  const [c, x] = make(256, 256);
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 120);
  g.addColorStop(0, "rgba(6,10,20,0.85)");
  g.addColorStop(0.55, "rgba(10,18,40,0.45)");
  g.addColorStop(1, "rgba(10,18,40,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(200,215,255,0.25)";
  x.lineWidth = 3;
  x.beginPath();
  x.arc(128, 128, 70, Math.PI * 0.2, Math.PI * 1.1);
  x.stroke();
  return new THREE.CanvasTexture(c);
}

/** Thermal-anomaly blob for the AI damage scan. */
export function heatTexture() {
  const [c, x] = make(256, 256);
  x.globalCompositeOperation = "lighter";
  let g = x.createRadialGradient(128, 128, 20, 128, 128, 124);
  g.addColorStop(0, "rgba(40,90,255,0.22)");
  g.addColorStop(0.7, "rgba(30,60,180,0.10)");
  g.addColorStop(1, "rgba(20,40,120,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14; i++) {
    const bx = 128 + (Math.random() - 0.5) * 88;
    const by = 128 + (Math.random() - 0.5) * 88;
    const r = 14 + Math.random() * 30;
    g = x.createRadialGradient(bx, by, 2, bx, by, r);
    g.addColorStop(0, "rgba(255,140,40,0.5)");
    g.addColorStop(0.6, "rgba(255,90,30,0.22)");
    g.addColorStop(1, "rgba(255,60,20,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, by, r, 0, Math.PI * 2);
    x.fill();
  }
  g = x.createRadialGradient(128, 128, 2, 128, 128, 46);
  g.addColorStop(0, "rgba(255,230,150,0.9)");
  g.addColorStop(0.4, "rgba(255,150,60,0.55)");
  g.addColorStop(1, "rgba(255,90,40,0)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(128, 128, 46, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(c);
}

/** Soft white radial for additive ground light pools. */
export function poolTexture() {
  const [c, x] = make(256, 256);
  const g = x.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.4, "rgba(255,255,255,0.32)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

/** Soft radial ambient-occlusion blob laid flat on the ground under static objects. */
export function radialShadowTexture() {
  const [c, x] = make(256, 256);
  const g = x.createRadialGradient(128, 128, 6, 128, 128, 128);
  g.addColorStop(0, "rgba(10,20,44,0.55)");
  g.addColorStop(0.5, "rgba(10,20,44,0.28)");
  g.addColorStop(1, "rgba(10,20,44,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

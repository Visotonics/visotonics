/* ---------------------------------------------------------------------------
   Vision scenes — the overlay.

   The 2D layer welded to the 3D: leader-line callouts that point at features,
   and the extracted-data readout in the left type column.

   House rules, fixed once here:
     · strict hierarchy — headline > readout table > callout labels.
     · callout cards are plain black. The finding's colour lives in its title
       text only: no coloured borders, no glow, no glass.
     · a label is welded to its feature and never nudged. If the whole callout
       can't fit on screen it fades out rather than drifting off its mark.
--------------------------------------------------------------------------- */
import * as THREE from "three";
import { PALETTE, sans } from "./palette";

/** Where a finding's label sits relative to its dot. Distinct lengths keep
    labels at different heights so they never collide. */
export interface Lane { dir: "up" | "down"; len: number }

export interface CalloutSpec {
  id: string;
  title: string;
  detail: string;
  /** local-space position on the subject */
  pos: THREE.Vector3;
  /** outward surface normal — a callout hides when its face turns away */
  normal: THREE.Vector3;
  /** warm warning colour instead of the cool accent */
  severe?: boolean;
  /* The leader is a DRAFTING LINE, so it defaults to near-black ink — correct
     over the light-surfaced scenes this overlay was written for (Tank, and the
     hero cards' light panels).

     Over a scene sitting on the site's near-black canvas it is invisible, and
     the label then floats unattached to the thing it names. That was only
     tolerable while the callouts sat close to their features; Yard Vision is an
     aerial with long leaders, where the disconnect is obvious.

     Opt-in rather than automatic: the overlay cannot see what is behind it, and
     inferring "dark" from the scene's `bare` flag would be a guess. Container
     Vision and Gate Vision are also on dark sections and are also drawing
     invisible leaders — they can adopt this, but changing signed-off scenes is a
     separate decision from building a new one. */
  onDark?: boolean;
  lane: Lane;
  /** loop window [in, out] over which this finding is on screen */
  win: [number, number];
}

export interface Callout {
  wrap: HTMLDivElement;
  local: THREE.Vector3;
  normal: THREE.Vector3;
  lane: number;
  up: boolean;
  win: [number, number];
}

export function createCallout(overlay: HTMLElement, d: CalloutSpec): Callout {
  const up = d.lane.dir === "up";
  const c = d.severe ? PALETTE.warn : PALETTE.accent;
  /* Held well below the label's title colour so the hierarchy is unchanged: the
     leader has to be VISIBLE, not loud. It is still a drafting line, just drawn
     in white ink on a dark sheet instead of black ink on a light one. */
  const ink = d.onDark ? "rgba(226,234,244,0.45)" : "#05070C";

  const w = document.createElement("div");
  w.style.cssText = "position:absolute;left:0;top:0;opacity:0;transition:opacity .4s ease;pointer-events:none;will-change:transform,opacity;";
  // solid marker, no glow
  const dot = document.createElement("div");
  dot.style.cssText = `position:absolute;left:0;top:0;width:9px;height:9px;transform:translate(-50%,-50%);border-radius:50%;background:#0A0D14;border:2px solid ${c};`;
  w.appendChild(dot);
  // plain black leader — a drafting line, not a light beam
  const leader = document.createElement("div");
  leader.style.cssText = `position:absolute;left:0;${up ? "bottom" : "top"}:6px;width:1.5px;height:${d.lane.len}px;transform:translateX(-50%);background:${ink};`;
  w.appendChild(leader);
  const label = document.createElement("div");
  label.style.cssText = `position:absolute;left:0;${up ? "bottom" : "top"}:${d.lane.len + 4}px;transform:translateX(-50%);white-space:nowrap;text-align:center;font-family:${sans};border-radius:3px;padding:14px 26px;background:rgba(3,5,9,0.9);`;
  label.innerHTML =
    `<div style="font-size:21px;font-weight:600;letter-spacing:-0.02em;color:${c};line-height:1.18">${d.title}</div>` +
    `<div style="font-size:14px;font-weight:400;color:rgba(255,255,255,0.72);margin-top:4px">${d.detail}</div>`;
  w.appendChild(label);
  overlay.appendChild(w);

  return { wrap: w, local: d.pos.clone(), normal: d.normal.clone(), lane: d.lane.len, up, win: d.win };
}

/** Approx label height, used for the on-screen fit test. */
export const LABEL_H = 46;

/** Place a callout for this frame. Returns nothing — mutates the DOM node. */
export function placeCallout(
  a: Callout,
  r: { sx: number; sy: number } | null,
  vis: number,
  w: number,
  h: number,
  /* Fraction of the width reserved at the LEFT edge. 0.3 is right for the
     flagships that sit beside the page's type column — a callout drifting into
     that column lands on top of the headline. It is wrong for a scene that owns
     its full width and centres its subject: there the guard silently eats every
     label whose subject happens to sit left of a third, which is most of them
     during a close-up. Such a scene passes a small value. */
  leftGuard = 0.3,
) {
  if (!r) { a.wrap.style.opacity = "0"; return; }
  const top = a.up ? r.sy - a.lane - 4 - LABEL_H : r.sy;
  const bot = a.up ? r.sy : r.sy + a.lane + 4 + LABEL_H;
  const fits = r.sx > w * leftGuard && r.sx < w * 0.97 && top > h * 0.03 && bot < h * 0.94;
  a.wrap.style.transform = `translate(${r.sx}px,${r.sy}px)`;
  a.wrap.style.opacity = fits ? String(vis) : "0";
}

/* ---- extracted-data readout ------------------------------------------- */

export interface Readout {
  panel: HTMLDivElement;
  rows: { setOpacity: (o: string) => void }[];
  /** the marker that sits on the surface being read */
  dot: HTMLDivElement;
}

/** tier 2 — plain structured type on the same left margin as the wordmark and
    headline. No panel, no glass, no glow: aligned label/value columns only. */
export function createReadout(overlay: HTMLElement, head: string, fields: [string, string][]): Readout {
  const dot = document.createElement("div");
  // centred via margin, not transform: the render loop overwrites .transform
  // every frame with a plain translate(x,y) for positioning
  dot.style.cssText = `position:absolute;left:0;top:0;opacity:0;transition:opacity .3s;pointer-events:none;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:50%;background:#0A0D14;border:2px solid ${PALETTE.accent};`;
  overlay.appendChild(dot);

  const panel = document.createElement("div");
  panel.style.cssText = `position:absolute;left:34px;top:104px;opacity:0;transition:opacity .6s ease;font-family:${sans};width:270px;`;
  const h = document.createElement("div");
  h.textContent = head;
  h.style.cssText = "font-size:9.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.5);padding-bottom:14px;";
  panel.appendChild(h);

  const table = document.createElement("div");
  table.style.cssText = "display:grid;grid-template-columns:auto 1fr;column-gap:28px;align-items:baseline;";
  panel.appendChild(table);
  // each row is a pair of grid cells (no wrapping row element — grid items just
  // share a column track); opacity is set on both cells together since a grid
  // can't fade a "row" that doesn't exist as a single element
  const rows = fields.map(([k, v]) => {
    const cellK = document.createElement("div");
    cellK.style.cssText = "padding:7px 0;font-size:11px;font-weight:400;color:rgba(255,255,255,0.6);white-space:nowrap;opacity:0;transition:opacity .35s ease;";
    cellK.textContent = k;
    const cellV = document.createElement("div");
    cellV.style.cssText = "padding:7px 0;font-size:15px;font-weight:600;letter-spacing:-0.015em;color:#fff;text-align:right;white-space:nowrap;opacity:0;transition:opacity .35s ease;";
    cellV.textContent = v;
    table.appendChild(cellK);
    table.appendChild(cellV);
    return { setOpacity: (o: string) => { cellK.style.opacity = o; cellV.style.opacity = o; } };
  });
  overlay.appendChild(panel);

  return { panel, rows, dot };
}

/* ---- projection -------------------------------------------------------- */

/** Screen-projects subject-local points, hiding anything on a face that has
    turned away from the camera. */
export function makeProjector(camera: THREE.Camera, subject: THREE.Object3D) {
  const ndc = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  return (world: THREE.Vector3, normal: THREE.Vector3, w: number, h: number) => {
    const wn = tmpN.copy(normal).applyQuaternion(subject.quaternion);
    if (wn.dot(tmpC.copy(camera.position).sub(world)) <= 0.08) return null;
    const p = ndc.copy(world).project(camera);
    if (p.z > 1) return null;
    return { sx: (p.x * 0.5 + 0.5) * w, sy: (-p.y * 0.5 + 0.5) * h };
  };
}

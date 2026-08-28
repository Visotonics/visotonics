/* ---------------------------------------------------------------------------
   Secure Vision — the concept: a multi-feed triage wall.

   THIS REPLACES THE PRIOR DOCK-THRESHOLD BUILD, which the owner rejected
   outright. The thesis is TRIAGE, not detection: a guard cannot watch forty
   feeds, so most feeds are watched by nobody — the platform watches all of
   them and already knows the difference between a real event and a flapping
   tarp. A wall where nothing ever flags proves nothing; a wall where
   everything alarms is the thing the section's own headline mocks. The loop
   this scene drives (see scene.tsx) shows three nuisance detections that get
   DISMISSED and exactly one real event that ESCALATES.

   The reusable geometry — the wall, the desk, the room shell, the feed
   content painters — lives in ./feedwall.ts, built as a parameterised
   builder so the Viso Data hero card can later derive a cheap variant from
   it. This module is SECURE-SPECIFIC CONFIGURATION ONLY: which content sits
   on which feed, and the labels the overlay reads off them.

   Assignment (8 feeds, 4x2 grid — see scene.tsx's framing arithmetic for why
   8 and not more):
     0  dust   — yard haze, calm, background texture
     1  clean  — calm night feed, unremarkable
     2  rain   — NUISANCE B, dismissed "RAIN · SENSOR NOISE"
     3  fog    — calm, dense haze, demonstrates read-through
     4  tarp   — NUISANCE A, dismissed "TARP · WIND"
     5  blur   — calm, motion-blurred traffic, demonstrates read-through
     6  bird   — NUISANCE C, dismissed "BIRD"
     7  event  — THE REAL EVENT, escalates to the one #ED510C moment
=========================================================================== */
import type { FeedSpec } from "./feedwall";
import { warmFeedWallTextures } from "./feedwall";

export const GROUND_Y = 0;

export const SECURE_FEEDS: FeedSpec[] = [
  { kind: "dust", id: "FEED 01 · YARD" },
  { kind: "clean", id: "FEED 02 · AISLE" },
  { kind: "rain", id: "FEED 03 · DOCK" },
  { kind: "fog", id: "FEED 04 · ROOF" },
  { kind: "tarp", id: "FEED 05 · FENCE" },
  { kind: "blur", id: "FEED 06 · BAY" },
  { kind: "bird", id: "FEED 07 · CORRIDOR" },
  { kind: "event", id: "FEED 08 · ENTRY" },
];

/** index into SECURE_FEEDS / FeedWall.screens for each beat */
export const NUISANCE_A_FEED = 4; // tarp / fence
export const NUISANCE_B_FEED = 2; // rain / dock
export const NUISANCE_C_FEED = 6; // bird / corridor
export const EVENT_FEED = 7;      // event / entry

export const DISMISS_REASON: Record<number, string> = {
  [NUISANCE_A_FEED]: "TARP · WIND",
  [NUISANCE_B_FEED]: "RAIN · SENSOR NOISE",
  [NUISANCE_C_FEED]: "BIRD",
};

export function warmSecureTextures() {
  warmFeedWallTextures(512);
}

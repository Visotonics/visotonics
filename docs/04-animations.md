# Animations — the 3D "Vision" scenes

What this is: what each 3D scene shows, what it's arguing, where it lives on the site, and how to review it. For anyone judging whether a scene looks right or planning a change to one.

All scenes are real, live three.js — but **vanilla three.js**, not react-three-fiber. Each scene is built imperatively inside a `useEffect` on a shared `createStudio` rig (see `components/vision/_vision/studio.ts`), not as declarative r3f/`<Canvas>` components. `grep react-three package.json` returns nothing — confirmed by reading `components/vision/*/scene.tsx` directly, not assumed from prior docs. (There is an unrelated, separate earlier project, `gitlab-visotonics`, that does use react-three-fiber — it is not this codebase, and is not the source for any claim in this doc.) Loop lengths below are read from each scene's `LOOP` constant in code.

## The 8 flagship product scenes

| Scene | Shows | Loop | Lives on | Review route |
|---|---|---|---|---|
| **Container Vision** | A shipping container inspected for damage/markings | 10.0s | Viso Yard §01 | `/lab/container-vision` |
| **Tank Vision** | A tank inspected for shell corrosion, seal, valve condition | 7.4s | Viso Yard §02 | `/lab/tank-vision` |
| **Gate Vision** | A truck reading its plate/seal at a gate, barrier responding | 4.6s | Viso Yard §03 | `/lab/gate-vision` |
| **Yard Vision** | An aerial survey of a full container yard, one slot located | 9.4s | Viso Yard §04 | `/lab/yard-vision` |
| **Crane Vision** | A gantry crane lifting/placing a container (portrait framing) | 4.8s | Viso Yard §05 | `/lab/crane-vision` |
| **Cargo Vision** | Mixed cargo (cartons/bags/drums) being counted as it's unloaded | 9.0s | Viso Yard §06 | `/lab/cargo-vision` |
| **Document Vision** | Paperwork/labels read and matched to a shipment | 8.5s | Viso Yard §07, Viso Warehouse, Viso Factory | `/lab/document-vision` |
| **Work Vision** | A worker/floor activity monitored for safety | 9.0s | Viso Warehouse §05, re-exported into Yard §08 and Factory §04 | `/lab/work-vision` |

Because Document and Work Vision are shared code (see `03-dependency-map.md`), each one is live on **three** production pages simultaneously, not one.

**Note: "Secure Vision" is not a 3D scene.** There is no `components/vision/secure-vision/` folder and no `/lab/secure-vision` route — verified directly. It's a static DOM/SVG section (a threshold-and-event chart), re-exported from Warehouse's `sections.tsx` (`SectionSecure`) across Yard §09, Warehouse §06, and Factory §05 — same re-export family as Work Vision, but with no three.js scene behind it. It does not belong in the 3D scene table above.

## Homepage-only scenes

| Scene | Shows | Where |
|---|---|---|
| **Lead Card Scene** | A composite "cameras watching a yard" scene, four sight-cones with live detections | Homepage "How It Works" section, and `/lab/lead-card` |
| **Hero cards** (Yard/Warehouse/Factory/Data card) | Four small ambient loops, one per product, each completing one action (crane places a box, forklift loads a pallet, robot arm flags a carton, a search retrieves a clip) | Homepage hero band, and `/lab/hero-cards` |

Hero-card loop: 14s (deliberately slow — ambient, not attention-grabbing, per an in-code comment).

## Lab-only, no production home

| Scene | Status |
|---|---|
| **ASCII Hero** | Under active iteration — an ASCII-halftone background field effect being tuned for a possible future hero treatment. `/lab/ascii-hero`. Not shipped anywhere; treat anything about it as subject to change. |

## Shared engine (`components/vision/_vision/`)

Every scene above draws on the same infrastructure rather than reinventing it:

- **`studio.ts`** (`createStudio`) — shared renderer/lighting/environment setup
- **`metal.ts`** — shared metal material + texture generation and caching (`makeMetal`, `tintMetal`, `warmMetalCache`, one canonical brushed finish reused/tinted everywhere)
- **`mount.ts`** (`mountWhenVisible`) — gates when a scene actually starts building/rendering, so off-screen scenes don't cost anything
- **`camera.ts`** — shared camera-framing math
- **`overlay.ts`** — the callout/label system (bracket, leader line, text) used for "detection" annotations across scenes
- **`palette.ts`** — the shared colour system (one accent blue for "the system is observing," one orange for "the system concluded something" — see `DECISIONS.md` for the reasoning)
- **`lazy.tsx`** — wraps every scene in a distance-gated dynamic import, and (as of the most recent perf work) also warms/builds every scene during browser idle time so it's ready before the visitor scrolls to it

## Review convention: `?phase=` pin

Several scenes support a `?phase=0..1` query-string parameter on their `/lab/*` review route to freeze the loop at a specific point instead of having to time a screenshot against a moving animation. Confirmed present (by grep) on: `ascii-hero`, `cargo-vision`, `container-vision`, `crane-vision`, `document-vision`, `gate-vision`, `lead-card`, `tank-vision`, `work-vision`, `yard-vision` — i.e. essentially every scene. Example: `/lab/gate-vision?phase=0.5`.

## Correction to `touchmatrix.md`

Touchmatrix's claim that all 7 non-Yard-native flagships (Crane/Cargo/Document/Work) are "now confirmed live in production" checks out against `sections.tsx` in both Yard and Warehouse — this is accurate, not stale. The only correction needed in this area is the lab route count (see `01-sitemap.md`): `/lab/home-accent` exists and isn't a Vision scene at all, so it's listed separately in this doc rather than as a 12th flagship.

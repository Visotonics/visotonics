# Concurrent work manifest — scene-architecture stream

**Session:** 2026-08-08. Written so conflicts with the **partner-portal stream**
(running concurrently, different agent) can be resolved without archaeology.

## TL;DR for conflict resolution

The two streams are **disjoint**. This stream touched **no** portal file, **no**
`lib/`, **no** `app/api/`, **no** `package.json` and **no** dependency. If a
conflict appears in any of those, it is not from this stream — take the portal
stream's version.

The one file to watch is `app/platform/viso-yard/sections.tsx` (this stream
deleted a dead component from it) and `app/page.tsx` (this stream deleted dead
imports). Neither is portal territory, but both are app-level files.

---

## Files CREATED by this stream

| File | What |
|---|---|
| `components/vision/_vision/readCamera.ts` | **New shared rig.** The detection camera (pole/housing/lens + cone + aim + colour flip), extracted after being hand-built 5×. |
| `components/vision/_vision/noise.ts` | `addGrain()` — extracted from two copies. |
| `docs/12-scene-architecture-audit.md` | The full audit. |
| `docs/13-concurrent-work-manifest.md` | This file. |

## Files MODIFIED by this stream

| File | Change | Conflict risk |
|---|---|---|
| `components/vision/_vision/lamp.ts` | Added `shadeCastsShadow?: boolean` option; `Pendant` now also returns `shadeMesh`/`bulbMesh`/`haloMesh`/`beamMesh`. | none — vision-only |
| `components/vision/_vision/metal.ts` | Inline grain loop → `addGrain()` import. Pure refactor, identical output. | none |
| `components/vision/hero-cards/skins.ts` | Local `grain()` deleted → `addGrain()` import; 5 call sites renamed. Amounts unchanged (14, 14, 12, 16, 14). | none |
| `components/vision/container-vision/scene.tsx` | **Large.** Inline studio + inline callout DOM → `createStudio` + `overlay.ts`. 869 → 648 lines. | none |
| `components/vision/cargo-vision/cargo.ts` | Local lamp shaders/meshes → `buildPendantLamp()`. | none |
| `components/motion.tsx` | Deleted dead `DecodeHeadline`. | **low** — shared component file |
| `app/page.tsx` | Deleted dead `DrawSchematic` import, `LEADCARD_SVG_RAW`, `leadcardSvg()`, and orphaned `node:fs`/`node:path` imports. | **low** |
| `app/platform/viso-yard/sections.tsx` | Deleted dead `RegisterClose` + its only-consumers `REGISTER_ROWS` and `EndMark`. | **low** |
| `docs/06-owed.md`, `docs/09-scene-craft-and-learnings.md`, `DECISIONS.md` | Appended. `DECISIONS.md` is gitignored. | **append-only — merge both** |

## Files this stream did NOT touch (all portal stream)

`app/client-portal/**`, `app/api/partner-register/**`, `app/api/partner-approve/**`,
`lib/auth.ts`, `lib/partner-crm.ts`, `lib/supabase/**`, `supabase/**`, `proxy.ts`,
`package.json`, `package-lock.json` (the `@supabase/ssr` + `@supabase/supabase-js`
additions are **not** from this stream).

## Shared files BOTH streams could plausibly want

Only these. If a conflict shows up, it will be here:

- `components/motion.tsx` — a portal page could import `Reveal`/`CountUp`. This
  stream only **deleted** `DecodeHeadline`, which had zero importers. If the
  portal stream added an import of it, keep the portal version and re-add.
- `docs/` and `DECISIONS.md` — both streams append. Both sets of entries should
  survive; this is a concatenation, not a choice.

## Verification state at handoff

- `npx tsc --noEmit` — clean, exit 0, run after every step.
- `npx next build` — succeeded, all routes generated.
- Visual verification of container / cargo — see the session notes; the
  container backdrop is **intentionally brighter** now (its inline cyclorama
  shader was missing `#include <colorspace_fragment>` and rendered at ~1/8 the
  authored value). That is the fix, not a regression.

## One thing deliberately NOT done

`touchmatrix.md` is now **stale** — this stream added two shared modules
(`_vision/readCamera.ts`, `_vision/noise.ts`) and deleted four components.
CLAUDE.md requires it be regenerated (not hand-edited) after a structural
change. It was left alone on purpose: the partner-portal stream is adding
routes, `lib/` modules and API handlers concurrently, so regenerating now would
be stale again within the hour. **Regenerate once both streams have landed.**

Also already known-stale before this session: it lists `createSightCone` as
having 6 consumers; the real count is 9.

## Update — detection-camera migration complete

All five scenes are now on `_vision/readCamera.ts`. Additional files modified
by this stream beyond the table above:

| File | Change |
|---|---|
| `components/vision/_vision/readCamera.ts` | Grew `headTracks`, `bodyY`, `bodyYaw`, `lensAxis`, `lensObject`, `yokeSize`, `hoodR/hoodLen/hoodZ`, plus geometry overrides. Header corrected: an earlier draft wrongly claimed `Object3D.lookAt` points local −Z. |
| `components/vision/cargo-vision/cargo.ts` + `scene.tsx` | Reference migration. `lensPos` (sampled once) replaced by the rig's live `lensWorld`. |
| `components/vision/crane-vision/crane.ts` + `scene.tsx` | Two rigs via `lensObject`; `heads[]` removed; `CONE_R` moved into the rig. |
| `components/vision/tank-vision/scene.tsx` | Migrated; keeps its own mast + arm. |
| `components/vision/gate-vision/gate.ts` + `scene.tsx` | Middle head migrated; 3 cosmetic gantry housings left hand-built (they never had cones). `GateModel` gained an `owned` array. |
| `components/vision/work-vision/work.ts` + `scene.tsx` | Migrated; `coneLen`/`lens`/`dir` removed as dead once the rig derived length. |

Verified on a production build: cargo (incl. the orange flip), crane, tank,
gate and work all render correctly. `tsc` clean, `next build` green.

## Update 2 — audit close-out

Additional files touched by this stream:

| File | Change |
|---|---|
| `components/vision/hero-cards/detect.ts` | Deleted dead `ticks()` (zero callers). |
| `components/vision/hero-cards/card-scene.tsx` | Removed `bloom.strength = 0.18` — dead work in the per-frame loop (`bloom` is always null on cards). |
| `components/vision/_vision/studio.ts` | Corrected the `envHdr` comment: it was asserting a "highest-leverage upgrade" that has never run. Now marked an untested hypothesis. **Comment only, no behaviour change.** |
| `PERFORMANCE.md` | Entry #39 — measured numbers for the refactor, plus what this pass falsified. |
| `touchmatrix.md` | **Regenerated** (not hand-edited), per CLAUDE.md. |
| `docs/06-owed.md`, `docs/12-...md` | Stale entries corrected; audit's own wrong findings recorded. |

Note `touchmatrix.md` documents the partner-portal files as in-flight. If that
stream lands significant structural change, it needs regenerating again.

The regeneration also turned up a route neither stream had documented:
**`/lab/home-accent`**, a blue-accent design-review fork of `app/page.tsx` —
and the home page's deleted `leadcardSvg`/`LEADCARD_SVG_RAW` live there now.

## Update 3 — performance pass

| File | Change |
|---|---|
| `components/vision/_vision/studio.ts` | **`noEnv` actually implemented** (it was documented, passed by 6 scenes, credited in PERFORMANCE.md #6, and never wired). Env canvas halved 1024×512 → 512×256. `envRT` is now nullable; dispose guards it. |
| `components/vision/document-vision/scene.tsx` | Added `noEnv: true` — the subject is paper; there is no metal to reflect anything. |
| `PERFORMANCE.md` | Entry #40 (a/b/c): the unwired flag, the halved env, and the container A/B. |

Behaviour note for conflict resolution: `studio.ts`'s env block is now inside
an `if (!opts.noEnv)` and `envRT`/`pmrem` are `| null`. Any concurrent edit that
assumes `envRT` is always present will need updating.

## Update 4 — dead-API sweep

| File | Change |
|---|---|
| `components/vision/hero-cards/detect.ts` | Removed `ticks` option + `Tracked.setFill` (both dead). |
| `components/vision/lead-card/scene.tsx` | Dropped `ticks:` args; removed a per-frame `setFill()` call in the render loop. `pad` values unchanged. |
| `components/vision/_vision/overlay.ts` | Removed dead required `CalloutSpec.id`. |
| 8 × `components/vision/*/scene.tsx` | Removed the now-invalid `id:` from 15 `createCallout` call sites. |
| `components/vision/cargo-vision/cargo.ts` | Removed dead `CargoModel.mouth`. |
| `components/draw-schematic.tsx` | Timer leak fixed — timeouts tracked and cleared on unmount. |
| `components/motion.tsx` | `CountUp` timer leak fixed — same. |

`overlay.ts`'s `CalloutSpec` no longer has `id`. Any concurrent code passing it
will now be a type error — that is intended and is the safety net.

## Update 5 — Work Vision build-out + shared env redraw (in progress)

| File | Change |
|---|---|
| `components/vision/work-vision/work.ts` + `scene.tsx` | Acts 2 and 3 built to the act standard: `makeActCam` factory (3 cameras from act 1's spec), dock dressing (segmented wall + part-raised shutter + leveller + trailer + bollards + pallets), pack-line dressing (bench frames, lipped totes, roller deck, task pendants), per-act cone gating, figure arm fix, `dockWall`/`plate`/`ceil` materials. Round 3 (ceiling raise to 2.90 + lamp raise) in flight. |
| `components/vision/_vision/studio.ts` | `envCanvas()` second draft — strip banks, deeper floor, warm strip. See DECISIONS.md. |

Also note for conflict resolution: repeated `.next` corruption from concurrent
`next build` runs in both streams — a 500 with "client reference manifest does
not exist" means rebuild, not broken code.

## Update 6 — Work Vision quality pass complete

`work.ts` + `scene.tsx` (same stream, same files): figure rebuilt (vest/hat/
neck/gloves, crown pinned 1.815), four cached canvas textures (`warmWorkTextures`
exported), density props per act, act-cut boundary fix (`solid` on absolute
time). Plus one line in `components/vision/_vision/lazy.tsx` wiring
`warmWorkTextures` into the idle chain — the only lazy.tsx change this stream
has made.

## Update 7 — warehouse look pass (final Work Vision round)

`work.ts` + `scene.tsx`: painted racking (blue/orange cached makeMetal),
enclosure (back wall, roof joists 3.90, skylights, act-1 daylight PointLight
I=42.3 d=8.0), yellow walkway lines + halved grid, figure de-cylindered (wrap
bands deleted — ellipse defect; straps front+back; torso z×0.85), act-1 pendant
removed, clean `m.camBody` on all rigs, act-2 bollards/lip recoloured, act-3
totes recoloured. Verified on production build against the owner's critique
list, all three acts + both boundaries.

## Update 8 — one cross-stream touch, disclosed

To unbreak the build (the portal stream's `OnboardingStep` lost `"choose-type"`
mid-flight, killing type-check and BUILD_ID), this stream made one minimal edit
in portal territory: `app/client-portal/dashboard/page.tsx` — dropped the dead
`step === "choose-type"` half of a comparison, behaviour identical. A second
fix in `onboarding/partner-type/page.tsx` was made moot seconds later when the
portal agent deleted that route entirely. Portal stream: fold or discard the
dashboard edit as you see fit — it is commented in-file.

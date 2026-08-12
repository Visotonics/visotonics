# Scene architecture audit — what is shared, what is duplicated, what to standardise

**Date:** 2026-08-08. Written after a three-agent sweep of every animation on the
homepage and Viso Yard, with every load-bearing claim re-verified by hand
(several agent findings were wrong and are corrected below).

**Status:** historical audit. Its three main recommendations were implemented:
Container migrated to the shared studio/overlay, Cargo migrated to the shared
pendant, and the five detection-camera consumers migrated to
`_vision/readCamera.ts`. `14-learnings.md` and `touchmatrix.md` are the current
references for the resulting architecture.

**Purpose.** Three questions, in priority order:
1. What are we rebuilding that already exists?
2. What is that costing us at runtime?
3. What is the standard for the next scene, so this stops happening?

The trigger was the CCTV sight-cone work: the same detection-camera rig has now
been built and debugged **five separate times**, and each rebuild reintroduced a
bug the previous scene had already fixed. That is the pattern this document
exists to end.

---

## 0. The scene census

Homepage and Viso Yard together render **twelve** distinct animated things.

### Homepage

| # | Animation | Files | Kind |
|---|---|---|---|
| 1 | Hero card row (Yard / Warehouse / Factory / Data) | `hero-cards/` | 4× three.js |
| 2 | Lead-card site scene | `lead-card/` | three.js |
| 3 | `DecryptedText` | `components/decrypted-text.tsx` | DOM |
| 4 | `Reveal` / `CountUp` / `UnderlineDraw` | `components/motion.tsx` | DOM + IO |
| 5 | `StatementVideo` | `components/statement-video.tsx` | video (poster-only today) |
| 6 | `TestimonialPager` | `components/testimonial-pager.tsx` | state swap, no motion |

### Viso Yard

| # | Section | Files | Read camera? |
|---|---|---|---|
| 1 | Container Vision | `container-vision/` | no |
| 2 | Tank Vision | `tank-vision/` | **yes** |
| 3 | Gate Vision | `gate-vision/` | **yes** |
| 4 | Yard Vision | `yard-vision/` | no (aerial) |
| 5 | Crane Vision | `crane-vision/` | **yes**, multi-head |
| 6 | Cargo Vision | `cargo-vision/` | **yes** |
| 7 | Document Vision | `document-vision/` | no |
| 8/9 | Work / Secure Vision | re-exported from `viso-warehouse/sections.tsx` | **yes** (work) |

**Line counts** (`.ts` + `.tsx` per folder): hero-cards 3569, cargo 2803,
container 1806, crane 1800, work 1658, lead-card 1642, document 1504, gate 1303,
yard 1020, tank 953. Shared layer `_vision/` is **1758** lines serving all of it.
The shared layer is roughly 10% of scene code. It should be closer to 30%.

---

## 1. The headline finding: five detection cameras, one concept

`createSightCone` and `createTracker` (`hero-cards/detect.ts`) **are** properly
shared — nine and eight importers respectively. That part works.

Everything wrapped around them is not. Five scenes each hand-build a pole, a
housing, a lens, an aim policy and a colour rule:

| Scene | Pole/mount | Lens | Lens world position | Aim |
|---|---|---|---|---|
| Tank | `scene.tsx:483-491` free mast + arm + `camHead` | `scene.tsx:495` | via `camHead.getWorldPosition` (`:812`) | `camHead.lookAt` (`:813`) |
| Gate | `gate.ts:186-226` bolted to gantry beam | `gate.ts:224` | static `headPos` | fixed target (`scene.tsx:288`) |
| Crane | `crane.ts:255-282` hung off leg inner face | `crane.ts:272` | per-head array | re-aimed per frame (`scene.tsx:1247`) |
| Cargo | `cargo.ts:1181-1237` fixed pole | `cargo.ts:1219` | `lensPos`, sampled **once at build** (`:1237`) | re-aimed per frame (`scene.tsx:960`) |
| Work | `work.ts:597` pole, then rack-clamped arm | `work.ts:599` | `lensWorld()` — **live**, re-read per frame | re-aimed per frame (`scene.tsx:568`) |

### The half-angle is the same function five times

This was mis-reported by the audit as "blocked by real per-scene differences."
It is not. Every one of them computes `atan(radius / range)`:

```
cargo   scene.tsx:960   Math.atan(CONE_R / range)
crane   scene.tsx:1247  Math.atan(CONE_R / Math.max(dist, 0.01))
gate    scene.tsx:286   Math.atan(0.8 / dist)
work    scene.tsx:568   Math.max(CONE_HALF_ANGLE, Math.atan(CONE_FOOT / range))
```

One formula, a different constant, and one optional floor. That is a function
with two parameters, not five designs.

### Every rebuild reintroduced a solved bug

This is the actual cost, and it is not theoretical:

- **Cargo samples `lensPos` once at build time** (`cargo.ts:1237`). It happens to
  be correct only because cargo's pole never moves. Copy that pattern to a scene
  with a moving mount and the cone silently detaches from the lens.
- **Work hit exactly that**, and the fix was `lensWorld()` — a live accessor.
  Only Work has it. It is the correct pattern and four scenes lack it.
- **Work's cone fired from the world origin** for an entire review cycle because
  `model.lensWorld(coneApex)` was missing — a scripted edit silently no-opped.
  A shared builder that owns the apex makes this class of bug unexpressible,
  because the scene never touches the apex.
- **Tank's comment at `scene.tsx:504`** documents that its cone "worked only
  because it inherited `camHead`'s lookAt" — a fragility discovered and worked
  around locally, never fed back.

**Verdict: extract.** See §5.

---

## 2. Container Vision is a second, divergent copy of the studio

Nine of ten scenes call `createStudio`. Container Vision does not
(`container-vision/scene.tsx`, 869 lines) — it hand-rolls the entire thing:

| Thing | Container | Shared |
|---|---|---|
| `WebGLRenderer` + tone mapping | `scene.tsx:137` | `studio.ts:171` |
| 5× `RectAreaLight` rig | `scene.tsx:230-262` (key at **5.6** — identical values) | `studio.ts:296-343` |
| Cyclorama + shader | `scene.tsx:184-211` | `studio.ts:227-262` |
| Shadow catcher | `scene.tsx:222` | `studio.ts:269` |
| Bloom composer | `scene.tsx:392-399` | `studio.ts:348` |
| Callout / readout DOM | `scene.tsx:314-388` | `_vision/overlay.ts` |

Two divergences that are **already bugs**, not just duplication:

1. **Its cyclorama shader has no `#include <colorspace_fragment>`** (`scene.tsx:207`),
   which `studio.ts:258` does have. That is the exact defect this repo has paid
   for three times — the backdrop renders at roughly an eighth of its authored
   brightness.
2. **Its leader lines are 1.5px at 45% alpha** (`scene.tsx:327`). `overlay.ts`
   was changed to 2px/72% precisely because 1.5px/45% was found to be invisible
   on dark ground. Container is still shipping the value we already established
   was wrong.

3. **Its dispose traverses and disposes every geometry it reaches** with no
   `userData.shared` guard (`scene.tsx:785-788`). `studio.ts:382-394` documents
   this as a bug that was found and fixed there. Container is not corrupting the
   shared caches today only because it happens not to touch them — the moment
   anyone adds a `metalBox` or a `bracket` to this scene, unmounting it destroys
   that geometry for every other scene on the page.

**Verdict: migrate onto `createStudio` + `overlay.ts`.** This is not a
refactor-for-tidiness; it fixes three live defects and deletes ~250 lines.

---

## 3. The lamp: extracted, then not adopted

At the time of this audit, `_vision/lamp.ts` had been extracted from Cargo
Vision but Cargo itself had not yet migrated. The duplicate local shaders were
subsequently removed; Cargo and Work Vision now consume the shared builder.

This is the failure mode to watch for: extraction without migration leaves *two*
copies where there was one, and the original is now the one that will drift.

**Outcome: completed — Cargo uses `buildPendantLamp`; no local lamp shaders
remain.**

---

## 4. Everything else, ranked

### Real, worth doing
- **`grain()` duplicated.** `skins.ts:24-32` and `metal.ts:143-150` are the same
  `getImageData` → per-channel noise → `putImageData` pass, written twice, each
  with its own `willReadFrequently` comment. Extract `addGrain(ctx,w,h,amt)`.
- **`envHdr` is dead.** `studio.ts:61-68` names it "the single highest-leverage
  upgrade available" and **no scene passes it** (verified: three hits, all inside
  `studio.ts`). Either exercise it or drop the claim.
- **PMREM prefilter runs per scene build.** The source canvas is cached; the
  prefilter is not, and a busy page pays it per context (`studio.ts:189-196`).
  This is the largest remaining shared-layer cost and is measured nowhere.

### Real, small
- `DecodeHeadline` (`motion.tsx:197`) — exported, zero importers. Dead.
- `DrawSchematic` imported at `app/page.tsx:6`, never rendered. Dead.
- `LEADCARD_SVG_RAW` / `leadcardSvg()` (`app/page.tsx:15-18`) — `readFileSync` at
  module load, helper never called. Dead.
- `RegisterClose` (`viso-yard/sections.tsx:967`) — exported, never imported.
- `detect.ts` `ticks()` — its `setFill` is a documented no-op; likely dead.
- `bloom.strength = 0.18` assigned every frame in `card-scene.tsx:333` where
  bloom is `null`. Harmless, but it is dead code in a hot loop.

### Corrections to the audit — claims that did NOT survive verification
Recording these so nobody re-derives them from the agent reports:
- **"Cargo doesn't use `createSightCone`."** False. `cargo.ts` and
  `cargo-vision/scene.tsx:960` both do.
- **"`skins.ts` has zero cross-folder consumers."** False. Cargo, Work and Yard
  all import it.
- **"Extracting the read camera is blocked by real per-scene differences."**
  False — see §1, the half-angle is one formula.
- **"touchmatrix is stale on `createSightCone` (6 consumers)."** The real count
  is **nine** files. Stale, but by more than reported.

### What is genuinely healthy — do not "fix" these
- **No per-frame allocation anywhere I checked.** Module-scope scratch vectors
  are used consistently (`detect.ts:189-192`, `overlay.ts:180`,
  `card-scene.tsx:182`), with comments explaining why. This discipline is real.
- **Lazy mounting is triple-gated** and correct: `WhenNear` at 1200px →
  `mountWhenVisible` IO at 900px → per-scene on-screen IO. Plus a one-build-per-rAF
  queue so scenes never contend.
- **`makeMetal` / `tintMetal` / `metalBox` caching** is adopted by eight modules.
  This is the extraction that worked, and the model for the rest.
- **Pixel ratio clamped, shadow maps sized down per scene, 24fps resting on
  cards.** Already tuned.

---

## 5. The standard, going forward

### The rule that would have prevented all of this

> **The second time a scene needs a thing, it moves to `_vision/` before it is
> written the second time — and the first scene migrates onto it in the same
> commit.**

The lamp proves the second clause matters as much as the first. Extraction
without migration doubles the copies instead of halving them.

### Implemented after this audit: `_vision/readCamera.ts`

The rig, owning the parts that keep breaking:

```ts
buildReadCamera({
  mount,                 // Object3D | Vector3 — pole, gantry, leg, rack arm
  bodySize, lensR,       // geometry
  coneRadius,            // the r in atan(r / range)
  minHalfAngle?,         // Work's floor; optional
  materials,             // scene's own metal/lens
}) => {
  group,                 // add to scene
  lensWorld(out),        // LIVE — re-read per frame, never sampled once
  aim(target),           // moves head AND cone together, derives half-angle
  setSignal(t),          // 0 = accent #5CC8FF, 1 = SIGNAL #ED510C
  dispose,
}
```

Why this shape specifically:
- **`aim()` moves head and cone together.** A scene can no longer aim one and
  forget the other — Tank's fragility and Work's origin bug both become
  unexpressible.
- **`lensWorld` is a function, not a value.** Cargo's build-time sample cannot
  be copied forward into a scene with a moving mount.
- **The half-angle is derived inside**, from `coneRadius` and the measured range.
  Nobody retypes `atan(r/d)` again.
- **`setSignal` is one call**, so the accent→SIGNAL flip has one implementation.
  Note: Crane deliberately stays on accent by product-owner instruction
  (`crane-vision/scene.tsx:702`) — that is `setSignal(0)`, an opt-out, not an
  exception to the API.

### Order of work

1. **`_vision/readCamera.ts`**, then migrate **Cargo first** — it is the verified
   reference. Then Work, Tank, Gate, Crane.
2. **Container Vision onto `createStudio` + `overlay.ts`** — fixes three live
   defects, deletes ~250 lines.
3. **Cargo onto `buildPendantLamp`** — deletes two duplicated shaders.
4. **Delete the dead exports** in §4.
5. **Then** measure. Production build, `?perf`, per `PERFORMANCE.md`.

### On the performance claim — be honest about it

Steps 1–4 are **correctness and maintenance** wins. They will not obviously move
frame rate: the per-frame loops are already allocation-free and the mount path is
already well gated. The measurable performance work is a different list — the
PMREM prefilter per context (§4), and `envHdr`. **Do not conflate the two.**
`PERFORMANCE.md`'s standing rule applies: no entry goes in that file without a
number, measured on a production build.

---

## 6. On buying 3D assets instead of building geometry

Raised alongside this audit. Assessment:

**Keep environments procedural.** They are deterministic, reviewable in diffs,
cost zero download bytes, and `PERFORMANCE.md` records that scroll-time bytes
were measured and were *not* the bottleneck. A glTF racking asset trades a
measured non-problem for a loader, a decode, a licence and a hosting dependency.

**The human figure is the real exception.** Hand-built primitives will always
read as hand-built primitives; that is a modelling problem, not a code problem,
and it is the one place a purchased low-poly rigged model would beat anything
achievable with capsules. Scope it separately if pursued.

---

## Post-implementation: what this audit got WRONG

Recorded because an audit that is never checked against reality becomes the
next set of unverified claims. Implementation ran 2026-08-08; these are the
findings that did not survive it.

1. **"Gate Vision skips the shared metal system."** Stale, inherited from
   `06-owed.md`. Gate imports `makeMetal`, caches five textures at module scope
   and idle-warms them (PERFORMANCE.md #32). Nothing to do.
2. **"Container and crane duplicate `skins.ts`'s container textures."**
   Wrong. Container builds true folded corrugation *geometry*
   (`container.ts:46-88`), not a painted skin. There is no duplicated generator.
3. **"Extracting the read camera is blocked by real per-scene differences."**
   Wrong, and it was the finding that would have killed the whole plan. The
   half-angle is one formula. All five migrated.
4. **`createSightCone` consumer count.** The audit said the doc's "6" was wrong
   and the real number was 9. Both were wrong: 9 counted files that only
   mention it in comments. The real count is **7 call sites**.
5. **The `_vision/readCamera.ts` extraction itself initially shipped with ZERO
   consumers** — the exact "extraction without migration" failure this document
   diagnoses in `lamp.ts`, repeated in the same session that documented it.
   Caught only by grepping for importers. Writing the rule down did not prevent
   it; checking did.

## What the migrations taught that the audit could not have known

All five scenes refused the rig's first shape, and each refusal was correct:

- **A shared builder that imposes a house silhouette gets rejected by every
  finished scene.** Gate stalled on a 5cm body offset, work on a 3mm hood.
  Both were gaps in the rig. It now parameterises geometry fully (`bodyY`,
  `hoodR/Len/Z`, `yokeSize`, `bodyYaw`, `lensAxis`) and fixes only the
  aim/apex/half-angle/signal machinery.
- **`headTracks: false`.** Cargo, gate and crane are bolted down; only their
  cones move. A rig that always swivelled would have silently changed three
  signed-off scenes.
- **`lensObject`.** Crane's housings are authored in absolute gantry
  coordinates; adopting the rig's housing would have MOVED geometry placed to
  the centimetre. Taking the machinery and keeping your own housing is a
  legitimate way to be on the rig.

**And one correction to this document's own reasoning:** it asserted the header
convention was that `Object3D.lookAt` points local −Z. That is false — it is −Z
only for cameras and lights. Acting on it would have put every migrated lens on
the back of its housing. A sub-agent caught it by reading the three.js source.

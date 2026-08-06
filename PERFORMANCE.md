# Performance log — 3D vision scenes

Running record of what we have done to make the WebGL scenes fast, what it
actually bought (measured, not estimated), what has been **falsified**, and
what is still open.

**Rule of this document: no entry without a number.** Three separate hypotheses
in this work turned out to be wrong when measured. Anything here that is a
guess is labelled a guess.

---

## How to measure

Dev numbers are useless for this work: dev ships unminified code, HMR, the
devtools overlay, and React Strict Mode **builds every scene twice**. Always
measure a production build.

```bash
npm run build
npx next start -p 3100
```

Then open the page with `?perf` (the homepage is now the live measured page;
`/lab/*` scene routes still exist for isolated iteration):

```
http://localhost:3100/?perf
http://localhost:3100/lab/container-vision?perf
```

Instrumentation is permanent and gated on that flag:

| what | where it lands |
|---|---|
| per-scene build cost | `window.__visionPerf` — **`"<scene> <ms>"` strings, labelled** |
| inside `createStudio` | `window.__visionStudio` (cumulative marks) |
| inside gate-vision's build | `window.__visionGate` |
| studio vs subject split | `window.__visionSplit` |
| inside factory/data subjects | `window.__visionDeep` |

`__visionPerf` used to be a bare array of numbers in build-queue order. On a
three-scene page that is not enough to say which number is which scene, and
guessing the order **did** cause a cost to be attributed to the wrong scene
during the Viso Yard work (see #26). Entries are now labelled.

Build time is not the same as the stall the visitor feels. Measure that
separately — scroll the page under rAF and record frame deltas:

```js
const gaps=[];let last=performance.now();
(function tick(){const n=performance.now();if(n-last>60)gaps.push(Math.round(n-last));last=n;requestAnimationFrame(tick)})();
```

On the Viso Yard page every stall was roughly **twice** the reported build,
because the first *draw* — not the build — is where shaders compile and textures
upload. See #27.

Read them in the console, e.g. `window.__visionSplit`.

---

## The problem, measured

The page paints fast and *then* stalls. FCP is **~200–450 ms**; scene
construction adds **~2.4 s** of main-thread work after it.

Representative production run:

```
studio 812 / subject  50
studio  73 / subject 107
studio  66 / subject 697   <- Factory
studio 157 / subject 658   <- Data
```

Two distinct costs: a **one-time first-studio cost** (~700–850 ms, paid by
whichever scene builds first, then ~70–150 ms for the rest), and **two
expensive subject builders** (Factory and Data, ~600–700 ms each).

---

## Done — with measured effect

| # | change | effect |
|---|---|---|
| 1 | **Lazy scene loading** (`_vision/lazy.tsx`). `next/dynamic` + a `WhenNear` gate that refuses to render until the slot is within 400px of the viewport. Both are needed: dynamic alone still fetches on *mount*, and a scene 8000px down the page mounts on first render. | `/lab/viso-yard` initial script **1342 KB → 751 KB**, three.js **0 KB** until you scroll to a scene |
| 2 | **Deferred GL context creation** (`_vision/mount.ts`). Every page renders a desktop AND a mobile layout and hides one with CSS; both still mount. Building eagerly meant 8 contexts where 4 were needed — close enough to the browser cap to start silently losing them (symptom: canvas composites black, clean console). | contexts on Viso Yard **4 → 2**, homepage **8 → 4** |
| 3 | **Build queue** — scene construction runs one per animation frame instead of all in one blocking task. | same total work, browser stays responsive between builds |
| 4 | **Cards were bypassing the queue.** `card-scene.tsx` carried its own IntersectionObserver written before the shared gate existed, so when the queue was added the four hero cards silently opted out — the scenes most responsible for the hang were the only ones not staggered. | four more scenes now staggered |
| 5 | **Environment map built once per page**, not per scene, and halved to 1024×512. Four cards were each filling a 2048×1024 canvas with five radial gradients and handing it to PMREM. | 4 canvas fills + 4 prefilters → 1 |
| 6 | **`noEnv` on cards and lead card.** PMREM prefiltering is per-renderer and cannot be shared across contexts. | 4 prefilters → 0 on those pages |
| 7 | **Texture cache** keyed by generating parameters. TRUE for `hero-cards/skins.ts`. **FALSE for `_vision/metal.ts` — see #23**: `cached()` was defined there and never called. Cached textures are deliberately **never disposed** — see the trap below. | skins: yes. metals: **no effect, the code did nothing** |
| 8 | **Colour moved out of textures into `material.color`.** This was the big structural one: baking colour into canvases meant one full texture set per *colour*, so the cache never hit. Container skins **15 → 3**; metal albedos per-colour → **per-finish (4 total)**. | part of 2880 → 2689 ms |
| 9 | ~~**Roughness maps 512² → 256²**, and roughness cache keys quantised to 0.05.~~ **NOT IN THE CODE.** `roughnessCanvas` is `const w = 512, h = 512` today, and there was no cache to key. The quantisation half landed for real in #23; the resolution half is either unapplied or was reverted, so the numbers in the old right-hand column cannot be attributed to it and are struck. | **unverifiable — do not cite** |
| 10 | ~~**Normal maps derived at 256²**, not 512².~~ **NOT IN THE CODE** — the normal map derives from the roughness canvas, which is 512². The one durable fact here: the Sobel pass is O(w·h·9) in JS and measures **~15 ms per map at 512**, which is why #23 matters. | **unverifiable — do not cite** |
| 11 | ~~**Geometry cache** for `RoundedBoxGeometry`, keyed to 3 decimal places.~~ **THIS ENTRY WAS WRONG — see #18.** The cache `Map` was declared and never read; `metalBox` built a fresh geometry on every call. | **no effect — the code did nothing** |
| 12 | **Light rig `lite`** for cards and lead card: 3 lights, no `RectAreaLight`, no LTC lookup tables. RectAreaLight is the heaviest light type, needs LTC textures, and **cannot cast shadows** — all five existed purely for look, and every material must compile a shader carrying the whole rig. | 2689 → **2438 ms** (~9%) |
| 13 | **Bloom off** where it does nothing (cards, and forced off in `bare` mode where it would fill transparency with black). | one full-frame render target + blur chain per frame removed |
| 14 | **30 fps cap on cards** — a 14-second sweep gains nothing from 60, and four cards at 60 is four full draws per frame competing with scroll. | halves card draw rate, invisibly |
| 15 | **DPR ≤ 1.5 and 512² shadow maps on cards.** | fewer pixels, smaller shadow pass |
| 16 | **Render only while on screen** — scrolled-past scenes stop drawing. | idle cards cost nothing |
| 17 | **29 background meshes deleted** across the four cards, replaced with one shader-drawn drafting grid. | fewer meshes, one material, no shadow cost |
| 18 | **The geometry cache, actually wired up.** #11 claimed this and never did it. `RoundedBoxGeometry` is built procedurally at ~500 triangles a time, and the Data card makes **96** of them (48 bezels + 48 screens) at exactly **two** distinct sizes; Factory makes ~30 at about eight. This was the whole of the unattributed cost the "Open" section was hunting. | Factory **697 → ~330 ms**, Data **658 → ~330 ms** |
| 19 | **Yard card rebuilt smaller** (see `DECISIONS.md`). 16 containers → 8, five livery skins (30 materials) → three (18), sixteen separate `BoxGeometry` allocations → **one shared**, scan plane and one tracker removed. Driven by legibility, not by cost, but it cost less too. | Yard subject **50 → ~28 ms** |
| 20 | **`tintMetal`** (`_vision/metal.ts`). `makeMetal` bakes `base` into the albedo canvas, so asking for N shades of one finish cost N albedos + N roughness canvases + **N Sobel passes**. Generate the finish once in neutral grey and `clone()` per colour — clones share all three maps. Same fix as #8 for container skins; it had never been applied to metals. | see #21 |
| 21 | **Factory card rebuilt** (see `DECISIONS.md`). **7 `makeMetal` calls → 4** via #20, 17 rollers → 9 sharing one `CylinderGeometry`, throughput tick row deleted, 4 unit states → 3. | Factory subject **325 → ~170 ms** |
| 23 | **The metal texture cache, actually wired up.** `cached()` in `_vision/metal.ts` was defined, documented, and credited in #7 — and never called. Every `makeMetal` call regenerated two 512² canvases **and a full Sobel normal pass** (~15 ms each), with nothing shared inside a card or across the four of them. Now keyed by base/kind/roughness/repeat, with roughness **quantised to 0.05** so 0.44 and 0.45 stop being separate canvases. `repeat` is in the key because it is a property *on* a now-shared texture. | total **765 → ~625 ms**; Data **342 → ~225 ms**, Factory **185 → ~110 ms** |
| 24 | **Warehouse card rebuilt** (see `DECISIONS.md`). 18 loose cartons → 6 palletised unit loads, and the "counted"/"being counted" kraft recolours deleted — those were **two extra canvases each with an HSL recolour pass** to say something the overlay says better. Its crates now share Factory's brushed maps via #23, so surface detail was added for free. | Warehouse subject **51 → ~90 ms**, but it now *generates* the brushed maps that #23 hands to Factory and Data |
| 30 | **IDLE WARMING** (`_vision/lazy.tsx`). The gates only decided WHEN a scene may cost something; on arrival the whole pile still landed at once — fetch three, parse it, generate the shared maps, build the scene — in the seconds the visitor is scrolling toward it. That is the reported stutter, and widening a margin only moves the same pile earlier. The shared work now runs once per page during `requestIdleCallback`: `import("./metal")` (which pulls three), `warmMetalCache()`, and `import("./studio")`. Guarded on Save-Data and 2G. | Viso Yard cold load: **FCP 92 ms**, initial wave 12 files / **171 KB**, then a separate wave of 4 files / **145 KB at t=642 ms with zero canvases built** — i.e. three arrives, post-paint, before any scene is anywhere near view |
| 29 | **`warmMetalCache()`** + `CANONICAL_BRUSHED` (`_vision/metal.ts`). Every scene now asks makeMetal for one identical parameter set and tints it, so the FIRST scene to build paid for two 512-square canvases and a Sobel pass and the rest got a cache hit. Which scene drew the short straw depended on queue order — the reason per-card timings stopped being comparable. Generating it during idle means none of them pay. | removes a ~15 ms+ Sobel from whichever scene builds first |
| 28 | **The flagships never gated their RENDER loop.** `mountWhenVisible` gates construction only, so Container Vision and Gate Vision each kept issuing a full draw — plus a composer pass, in Container's case — every frame for the rest of the session once scrolled past. The four cards have had `if (!onScreen) return;` since they were written; the two *more expensive* scenes did not. Both now do, at 200px rootMargin. Also DPR 2 -> 1.75 and shadow maps 2048 -> 1024 on both. **Bloom, the full light rig and the environment were deliberately LEFT ON** — those were only safe to drop at 320px card size, and these scenes' looks are signed off. | not yet measured in ms; the eliminated work is a full draw per frame per off-screen flagship |
| 27 | **Gate margins re-ordered** — chunk request at 1200px (`lazy.tsx`), build queued at 900px (`mount.ts`), up from 400/200. The two must stay ordered request-then-build: the build gate firing against a component whose chunk has not arrived is exactly how the cost ends up landing on arrival. | build finishes before the section is in shot |
| 27 | **Data card rebuilt from the concept up** (see `DECISIONS.md`) — a receding deck of 26 frames sharing **one** `BoxGeometry`, one `makeMetal` call tinted six ways, no tile array at all. | Data subject **3 -> 2 ms**; row total **~456 ms** |
| 26 | **Data card rebuilt** (see `DECISIONS.md`). **10 `makeMetal` calls -> 1**, and that one asks for the exact neutral brushed finish Warehouse and Factory already build, so it is a cache hit and costs nothing. The old ten were four dead-screen shades, a live tile, two bead colours, a rail and a bezel — ten albedos, ten roughness canvases and ten Sobel passes for what reads as one material in several colours. Tiles 24 -> 18, and the five-bead chain deleted. | Data subject **~300 -> 3 ms**; total **~440 ms** |
| 25 | **Warehouse rebuilt a third time** as a forklift scene (see `DECISIONS.md`). Adds ~10 new distinct `RoundedBoxGeometry` dimensions for the truck plus a tally and a sight cone; removes the rack's 16 meshes. | **not separable from run-to-run noise** — best run 100 ms vs 90 ms before, worst 262 ms. See the measurement note above. |
| 22 | **Factory rebuilt again** — belt 7.0 → **15.0** (end to end, no ends in frame), 7 units instead of 5, a robot arm added, and half the units switched to kraft cartons. Cost held FLAT at ~170–200 ms despite all of that, because the cardboard skins are the ones the Warehouse card already generates and `skins.ts` caches them: **real corrugated board on a second card costs zero textures.** Rollers rose to 15 but share one geometry. | Factory **~170 → ~185 ms** for roughly double the scene |

| 31 | **`__visionPerf` entries labelled** (`_vision/mount.ts` takes a scene name). Not an optimisation — a correction to the instrument. A bare list of milliseconds in build-queue order let Gate's cost be read as Container's for two rounds of this work. | Container / Tank / Gate now attributable |
| 32 | **Gate Vision's textures cached AND warmed** (`gate-vision/materials.ts`). Gate was the most expensive build on the Viso Yard page and the reason was structural: it is the **only** scene whose `makeMetal` specs are not `CANONICAL_BRUSHED`, so #29's warm never touched it and it paid two full albedo + roughness + **Sobel** derivations on the scroll path. On top of that its three canvases (cab 1024², plate 1024×256, tyre 512×256) each end in a `grain()` pass — `getImageData` / per-pixel JS loop / `putImageData` over **5.8 MB** of pixel data — and had no cache at all, plus two uncached `makeRoughnessMap` calls. All five textures are now cached module-level and generated during idle via `warmGateTextures()`. | Gate build **391 → 76 ms** cold, **267 → 71 ms** warm. Its internal marks now read `containerMats 0 / gateMats 0 / buildGate 35` |
| 33 | **`warmContainerTextures()`** — `container-vision/materials.ts` already cached its textures, which spared the *second* consumer on a page and never the first. On Viso Yard the first consumer is whichever scene the visitor scrolls to, so the cost still landed on a scrolling frame. Generating at idle makes every consumer the second one. | Container build **148 → 90 ms** warm |
| 34 | **Scenes now BUILD during idle, not on approach** (`_vision/lazy.tsx`). `WhenNear` gets a second, independent trigger: once the idle warm chain drains, the distance gate is released and all scenes render their component — and `mountWhenVisible` builds the moment its element exists. The gate's whole purpose was keeping three off the wire, and by that point three is already in. Save-Data / 2G still skip the chain, so those visitors keep the original approach-gated behaviour. | see the net figure below |
| 35 | **One primed frame per flagship**, drawn *before* the `onScreen` gate takes over (`if (!onScreen && primed) return;`). This is the entry that actually fixed the felt stutter. Every stall on the page measured roughly **twice** its reported build, because the first *draw* is where three compiles every shader program and uploads every texture — and #28's render gate was faithfully deferring that draw until the scene was in shot. So even a 76 ms build hitched 285 ms on arrival. Exactly one frame; the gate resumes immediately after, so #28's saving is intact. | the last of the scroll-path stalls |

| 36 | **`renderer.compileAsync(scene, camera)` at build time**, on all three flagships. #35's primed frame only compiles what that frame *draws*, and these scenes swap materials as the loop advances — wireframe to resolved, decals appearing at a phase. On a genuinely cold browser session (empty on-disk shader cache) that left one **1355 ms** long task landing mid-scroll, at a scroll position past all three canvases, from a scene whose build measured 96 ms. `compileAsync` walks the whole graph and uses `KHR_parallel_shader_compile` where available, so it does not block. | the last cold-session outlier; scroll-through now clean on a first visit too |

| 37 | **Yard Vision is INSTANCED** (`yard-vision/yard.ts`). 55 containers as three `InstancedMesh`, one per livery, sharing one `BoxGeometry` — 3 draw calls rather than 55, or 330 had they kept the six-face material array a `BoxGeometry` renders as six groups. Only the two boxes the story is about are ordinary Meshes, because a tracker bracket needs a real world bounding box and an instance has none. The survey flash rides `InstancedMesh`'s per-instance COLOUR attribute (which multiplies the material colour in the shader), so 55 boxes light up independently with no custom shader and no extra draw calls — 165 floats a frame, uploaded only while the wave is running. Planned item #4 in this file, finally done, because a yard is the case that justified it. | scene build **90 ms**, of which `createStudio` is **79** — the yard's own construction of 55 containers, materials, grid and callouts is **~11 ms**. Zero frame deltas over 40 ms in steady state |
| 38 | **Card-grade skins on a flagship, deliberately.** Yard Vision takes its container maps from `hero-cards/skins.ts`, not from `container-vision/materials.ts`. The flagship generators paint three 2048-wide canvases to sell one box filling the frame; here 55 boxes are ~40px tall each. Cached and idle-warmed via `warmYardTextures()`, same contract as #32. | the cheapest flagship on the page |

**Adding a fourth scene to `/lab/viso-yard` cost nothing measurable on the scroll
path**, which is the real test of #34/#35:

```
three scenes   container 148 / tank  52 / gate 267               = 467 ms, on approach
               stalls 163 202 · 61 78 · 272 199                  = 975 ms in 6 hitches
four scenes    container 168 / tank 156 / gate 166 / yard  93     = 583 ms, all at idle
               stalls 75 · 73                                    = 148 ms in 2
```

### CLOSED — the ~2.5 s task was container's seal block recompiling shaders mid-view

**The cause.** Container Vision is the one scene that flips `transparent = false`
(+ `needsUpdate`) on its steel/hardware materials the frame its intro fade
completes — the "seal". `transparent` is part of three's program cache key
(opaque materials compile different GLSL: `#define OPAQUE`), so the seal is a
synchronous compile of three new programs inside a single `render()` call.
`compileAsync` never helped because it only ever saw the transparent variants.

Confirmed with `renderer.info.programs.length` in the ?perf draw timer:
**10 → 13 on exactly the stalling draw**. Cost: **~55 ms** when the GPU
process's shader cache held the opaque variants, **~2.4 s** when it did not —
which is the whole "first load slow, reload fast" pattern. It was never the
HTTP cache, the build, shader compile *in general*, textures, or `getImageData`.

The timing made it land mid-scroll: the primed frame started the clock, the
`onScreen` gate skipped applyFrame for 20 s, and the first on-screen draw ran
the seal with `solid` already at 1.

**The fix (#39):** compile BOTH program sets during the idle chain — intro
variants, flip the real materials sealed, compile again, one warm draw sealed
off-screen, flip back. No clones (a clone of the front material would drop its
`onBeforeCompile` patch). Verified on the next fresh build:

```
container#6 SEAL apply 1 render 2 progs 13    (was: render 2400 cold / 55 warm)
worst frame gap, full scroll incl. dwelling on the seal: 55 ms, no canvas near it
```

**Bundled correctness fix:** the clock now starts on the first ON-SCREEN frame
in all four flagships. Priming had silently broken "every viewer sees frame
one" — visitors arrived 20 s into the loop and never saw an intro. This also
means the seal fires ~1 s after arrival, in view, which is why the pre-compile
is required and not merely nice.

**Rule for future scenes:** anything that flips a program-cache-key material
property at runtime (`transparent`, `flatShading`, defines via `needsUpdate`)
must pre-compile that variant in its idle chain, or it will compile it inside a
visible frame on some machine. The permanent `?perf` tripwire is
`__visionDraw` — a `SEAL` line with a large `render` or a `progs` jump means
this has regressed.

### The earlier ~2.5 s investigation — two failed attempts, kept for method

Historical record from before the cause was found; kept because the retractions
are the useful part. One claim below is now explained rather than mysterious:
"it needs the four-scene page" was an artefact of *where the seal fired* — on
the standalone page the scene is on screen at load, so the seal ran ~1 s in,
during idle, against a warm cache (the 431 ms task), instead of at scroll time.

**What reproduces.** On the FIRST load of a fresh build, `/lab/viso-yard` throws
one large main-thread task on the first scroll-through, at the **container
scene's** scroll position: **2366 / 2640 / 2433 ms** across three separate
fresh-server loads. Every later load of the same build is clean (largest task
~80 ms). Container's build is also inflated on that first load (**817–894 ms**
against **135–159 ms** on a client-side remount in the same document).

**What is solid:**

- **It is main-thread.** `PerformanceObserver` longtask only reports main-thread
  tasks, so this is not the GPU being slow in its own process.
- **It is not GL calls.** Directly timed across all four contexts:
  `compileShader` 84 calls / **1 ms**, `linkProgram` 42 / **1 ms**,
  `getProgramParameter` 194 / **30 ms**, `texImage2D` 40 / **0.2 ms**. About
  32 ms total. Shader compilation is not the bottleneck on this hardware
  (ANGLE / AMD 780M / D3D11, with `KHR_parallel_shader_compile` present).
- **It needs the four-scene page.** `/lab/container-vision` standalone shows no
  such task on repeated fresh loads — largest 431 ms — with the same scene, the
  same textures and the same build path. Whatever this is, it involves four live
  contexts, not container alone.
- **58% of shader programs are duplicated across contexts**: 84 compiles, 35
  unique sources, 24 sources compiled in more than one context. Structural, and
  it grows linearly with scene count.

**TWO MEASUREMENTS WERE WRONG AND ARE RETRACTED. Read this before instrumenting.**

1. *"Cold shader compile costs ~3.2 s."* Produced by patching `shaderSource` to
   append a unique token (forcing Chrome's on-disk program cache to miss) and
   hashing every source. Builds measured 843–1157 ms each. **The control run
   settles it: an unpatched client-side remount is 135–159 ms.** The harness —
   hashing ~80 KB shader strings 84 times — inflated builds about 6×. The
   conclusion was an artefact of the instrument.
2. *"Container's texture generation costs 3.7 s."* One run of
   `/lab/container-vision` showed 3697 ms + 2418 ms of blocking starting exactly
   when the idle warm fires, which fitted the canvas-painting theory perfectly.
   **It did not reproduce** — two later fresh loads peaked at 431 ms, and
   `__visionTex` recorded nothing because the in-view scene builds before the warm
   chain reaches it, so the generators run inside `make()` and are already inside
   the 261 ms build. Almost certainly residue from the instrumentation session
   above.

**Method note, earned the hard way:** attributing a ~2.5 s task by wrapping hot
WebGL/canvas entry points does not work here — the wrapper's own cost is the same
order as the thing being measured, and a single non-reproduced run is not
evidence. The next step is **Chrome DevTools' Performance panel** on a first load
of a fresh build, which names the function directly and perturbs nothing. Bisecting
by feature flag (`bloom` off, `noEnv`, shadow map off, one scene at a time) is the
fallback. Do not add more wrappers.

**`compileAsync` ordering was still a real defect** and is fixed (#36 note): the
primed frame used to race the async compile instead of waiting for it. It changed
nothing measurable here — as expected, given GL calls total 32 ms — and is kept
because that number is a property of this GPU and driver, not of the code.

| 40 | **The home scenes brought up to flagship arrival hygiene** (`hero-cards/card-scene.tsx`, `lead-card/scene.tsx`). Neither had the compileAsync gate, the off-screen warm draw, or the clock fix — those had only gone to the four flagships. Both now follow the full pattern: programs compile at idle behind a `compiled` gate (2 s guard, cleared on teardown), one warm frame draws off screen without starting the clock, the clock starts on the first ON-SCREEN frame, and the first three draws are `?perf`-instrumented with `progs` counts. Neither scene flips a program-cache-key property at runtime (verified by grep), so no sealed-variant pre-compile is needed — noted in the code for whoever adds one. | `/lab/home`: FCP **92 ms**, builds `yard 103 / warehouse 142 / factory 236 / data 75 / lead 95` all at idle, lead's first on-screen draw **1 ms** (warm draw absorbed the 20-30 ms of first-use), `progs` flat per card across draws, **zero frame gaps over 50 ms** on the full scroll-through |

**Net on `/lab/viso-yard`** — production build, continuous rAF scroll at ~840 px/s,
frame deltas over 60 ms:

```
before   builds  container 148 / tank  52 / gate 267   =  467 ms
         stalls  163 202 · 61 78 · 272 199             =  975 ms in 6 hitches
after    builds  container  96 / tank  86 / gate  97   =  279 ms, all during idle
         stalls  (none over 60 ms)                     =    0 ms
```

Final first-visit run, fresh build and fresh server: FCP **144 ms**, all three
scenes built and primed by t=2188 ms, **zero** frame deltas over 60 ms and zero
long tasks over 50 ms across the whole scroll-through. Clean console.

Cold first visit went from ~4.9 s of blocked main thread across three hitches
(worst single frame **1931 ms**) to zero stalls on the scroll path. The ~1.09 s
of work still exists — it now runs as seven long tasks between t=730 ms and
t=2173 ms, while the page is static and nothing is moving, and it produced **no
frame delta over 40 ms** even then, because idle callbacks and promise
continuations get scheduled around the compositor in a way a scroll-triggered
build never can.

`/lab/home` on the same change: FCP unchanged at **132 ms**, all five scenes
(`yard 80 / warehouse 77 / factory 177 / data 40 / lead 48`) built during idle,
one 64 ms frame delta over the whole scroll-through. All four hero cards are live
before the visitor can reach them.

**Net: ~2880 → ~720 ms of scene build** for the four hero cards, and the initial
payload cut by roughly half on scene pages. Two consecutive production runs:

After the Data rebuild, two consecutive runs on one production build:

```
run 1   [73, 132, 189, 41]    total  435 ms
run 2   [71, 148, 194, 42]    total  455 ms   (was 2438 at the start)
        Yard  Whse  Fact  Data
```

Data's subject is now **3 ms**. That is not a rounding error or a mis-read: its
geometry is two cached tile sizes and its one material request is a cache hit
from the cards built before it. When every map and every geometry a scene needs
already exists, building it is nearly free — which is the strongest argument yet
for matching an existing card's `makeMetal` parameters exactly.

The three runs before this rebuild, for comparison, spread 626–915 ms:

```
[98, 309, 154, 354] / [66, 159, 209, 348] / [70, 137, 142, 277]
```

Homepage FCP on the same build: **60 ms**.

### Measurement has hit its noise floor — read this before optimising further

**The spread across identical runs (626–915 ms) is now larger than any single
remaining optimisation.** Two separate causes, and both must be understood
before another number in this file is trusted:

1. **Per-card numbers are no longer independent.** After #23 the first card to
   ask for a shared map pays for it and the rest get it free — and *which* card
   goes first varies with the build queue. Warehouse reads 262 ms in run 1 and
   100 ms in run 3 for identical code; Factory moves the opposite way. Only
   totals mean anything now.
2. **Studio cost has never been explained** (see "Still open"). First-studio has
   measured 812, 88, 43 and 57 ms on the same machine and build.

So the honest position on the Warehouse rebuild — a forklift, ~10 new distinct
`RoundedBoxGeometry` dimensions, a tally and a cone — is that **its cost cannot
be separated from the noise**: its best run (100 ms) matches its pre-rebuild
figure (90 ms) and its worst (262 ms) does not. Claiming either would be
inventing a result.

**Next measurement work should be to kill the variance, not to shave the total.**
Build the four scenes in a fixed order with a warm cache, or measure each card
in isolation on its own page load. Until then the four cards cost "roughly
600–900 ms, down from 2438", and that is as precise as this instrumentation
honestly gets.

**Data is next and the fix is already written.** Its six brushed `makeMetal`
calls are one finish in six colours (four dead-screen shades, one live, one
armed); `tintMetal` (#20) collapses those to one albedo, and #23 already shares
the roughness and normal. It also builds 96 tiles.

### One per-frame cost was ADDED, deliberately

`subject.trackers()` was never being called (see `DECISIONS.md` — every
detection bracket sat at world origin, following nothing). Wiring it up adds a
`subject.group.updateMatrixWorld(true)` and eight position/scale writes per
tracker per frame. At ~3 trackers per card, 30 fps, that is not measurable
against a median 8 ms frame — and the alternative was overlay graphics that
did not work at all.

---

## Falsified — do not re-try these

Three hypotheses were measured and found **not** to be the bottleneck. Recorded
so nobody spends the day on them again.

- **WebGL context creation.** Measured directly: **13 ms** for a real context
  with a forced clear. Not the cost.
- **Texture generation as the dominant cost.** Collapsing 15 container skins to
  3 and metal albedos to 4 barely moved the total. Worth doing, wrong theory.
- **Lighting as the dominant cost.** Cutting 8 lights to 3 bought ~9%, and the
  first attempt made every card visibly darker and flatter — a bad trade until
  the intensities were raised to compensate (five area lights deliver far more
  total illumination than three point sources).
- **Prefetching the scene CHUNKS.** The obvious read of the Viso Yard traces was
  that container-vision's **106 KB** chunk arriving and parsing on the scroll
  path was the 1.9 s hitch. Prefetching all three scene chunks during idle
  worked exactly as designed — bytes landing at scroll time went from ~150 KB
  transferred to **15 KB**, essentially the whole payload moved to t<800 ms —
  and the stalls did not move: **975 → 963 ms warm, 4.90 → 4.88 s cold.** The
  bytes were never the cost; canvas painting and the first draw were. The
  prefetch is kept (it is a real win on a slow connection, and it is what lets
  #34 release the distance gate) but do not expect it to buy frame time.
- **`createStudio` as an expensive step.** Measured directly with
  `__visionStudio`: **43–46 ms** total, of which renderer construction is 14 and
  PMREM is ~22. The five-RectAreaLight rig and the bloom chain are **~1 ms each**
  to *construct* — their cost is in shader compilation at first draw (#35), not
  in setup. "Studio cost is unstable and not understood" (below) was a symptom of
  measuring build and first-draw together.

---

## Closed — the ~1.24 s is found

It was **geometry construction**, and specifically the geometry cache that
`metal.ts` claimed to have and did not (#11 → #18). `factory:mats+geom 656` /
`data:mats+geom 532` are now ~330 each.

How it was found is worth keeping, because the instrumentation never got there:
the deep `_deep()` marks proved only that the detection layer costs **1 ms** and
the cost was in "mats+geom". The `makeMetal` accumulator meant to split those
two was attempted twice and **half-applied both times**. The answer came from
*reading `metal.ts`* and noticing a declared-and-never-read `Map` — not from a
probe. Worth remembering next time a measurement is being chased: at some point,
read the file.

### Still open

~~Studio cost is **unstable and not understood**. First-studio has measured
812 ms, 88 ms, and 43 ms on the same production build and machine.~~
**RESOLVED.** `createStudio` costs a stable **43–46 ms** when timed on its own
(`__visionStudio`). The instability was two costs being read as one:

- **First draw, not build.** Shader compilation and texture upload happen on the
  first `render()`, which the `onScreen` gate was deferring to arrival. #35
  primes one frame at build time; the number stopped moving.
- **A one-time cost per BROWSER SESSION, not per page.** The first scene built
  after the browser starts measures ~3–4× the same scene on any later load
  (container **577 → 148 ms**, same code, same build, chunks already cached).
  Chrome caches linked shader programs on disk keyed by source, so every load
  after the first is a cache hit. Whichever scene happens to build first wears
  the whole penalty — so **never compare a first-load number with a reload
  number**, and always say which one a figure is.

"One shared renderer" (planned #3) can now be sized honestly, and it is small:
3 renderers × 14 ms of construction, plus 2 avoidable PMREM prefilters at ~22 ms.
Under 60 ms on the busiest page. Not worth the risk.

---

## Planned

1. **Kill the measurement variance first.** Nothing else in this list can be
   sized until identical runs stop varying by 300 ms. Two known contributors:
   build-queue order deciding which card pays for a shared map, and the
   unexplained first-studio cost. Fix by measuring one card per page load, or by
   forcing a fixed build order with a pre-warmed cache.
2. **Idle warming.** Prefetch the three.js chunk while the visitor reads the
   hero, and build scenes in `requestIdleCallback` gaps rather than at mount.
   Gets "ready when you arrive" without a loading screen.
3. **One shared renderer across the four cards.** Still worth doing for the
   three fewer contexts, but it is no longer a performance headline at all:
   studio now totals **177 ms** across four cards, so a perfect share saves
   well under 150 ms of 920. Blocked on #1 anyway.
4. **Instancing** for repeated meshes — **DONE for Yard Vision's 55 containers,
   see #37**, still open for the cards (Data's 48 tiles + 48 bezels, Factory's 17
   rollers). Note #18 already collapsed their *geometry*; instancing would
   collapse the remaining draw calls, which is a frame-time win, not a
   build-time one.
5. **Pre-render ambient cards to video.** They are non-interactive loops; this
   takes their cost to zero. Note the flagships cannot do this — they are
   transparent over the page, and cross-browser alpha video is a minefield.

---

## Rejected

- **A loading screen / preload-everything gate.** It moves the cost onto the
  user rather than removing it: FCP would go from ~200 ms to ~2.5 s, LCP lands
  in Google's "needs improvement" band, it fights the lazy loading above by
  building scenes the visitor may never reach, it holds every WebGL context open
  at once, and it cannot preload CPU work anyway. Most importantly it would let
  the unexplained 1.24 s ship permanently instead of being fixed.

  **#34 is not this.** It builds every scene on the page eagerly, which looks
  like the same idea, and the difference is the one that mattered: it happens
  *after* first paint, inside `requestIdleCallback`, so FCP is untouched
  (measured: **132 ms**, unchanged). Two of the objections above do now apply and
  are accepted deliberately — scenes the visitor never reaches get built, and
  every context on the page is open from load. Both were traded for zero
  scroll-path stalls, and both are bounded: five contexts on the busiest page
  against a browser cap around sixteen, and #16/#28 mean an unreached scene draws
  nothing after its one primed frame. Save-Data and 2G still get the original
  approach-gated behaviour.

---

## Traps worth remembering

- **A callout that never appears is almost always a BOUNDS rejection, not a
  timing bug.** The canvas bleeds past the section and the overlay does not, so
  the overlay can be barely half the canvas's height (481 of 941 on the Yard
  page). `placeCallout` correctly refuses to draw a label that would fall
  outside, and it refuses on every frame, so it looks like the label was never
  wired up. This has now cost three separate passes — the tank's rust label (a
  210px leader), the tank's valve callout (downward lane at the bottom of frame),
  and Yard Vision's slot (anchor at canvas y 810). **Print the projected y and
  compare it against the overlay's height before investigating anything else.**
- **`toneMapped: false` on anything drawing signal colour.** ACES desaturates as
  it compresses the highlights, which is correct for a lit surface and wrong for
  a graphic. The accent slot marker and the yard gridlines both rendered
  grey-green until this was set. `detectMaterials()` has always done it; a
  scene-local `MeshBasicMaterial` or `LineBasicMaterial` has to be told.
- **Build time is not the stall the visitor feels.** Every hitch on Viso Yard
  measured roughly **twice** its reported build, and on Gate nearly four times —
  the remainder is the first draw. `__visionPerf` alone will tell you a scene is
  cheap while the page visibly stutters at it. Always measure frame deltas too.
- **A cache that only helps the SECOND consumer helps nobody on a one-scene
  page.** Both texture caches were written to spare a second scene the cost, and
  on Viso Yard the *first* scene is whichever one the visitor scrolls to. A cache
  is only a performance fix once something populates it **before** the moment you
  care about — which is what `warmGateTextures` / `warmContainerTextures` are for.
- **`metal.ts` claims every scene asks for `CANONICAL_BRUSHED`. Gate Vision does
  not** — `#2B313B/plate` and `#5A626C/brushed`. That one exception was the whole
  reason the idle warm never helped the page's most expensive scene, and the
  comment asserting otherwise is what hid it. If you add a scene, either match
  the canonical spec or add your specs to a warm function; a new spec is a silent
  cache miss plus a Sobel pass on the scroll path.
- **A cached texture on a SECOND card is free.** Factory's kraft cartons reuse
  the exact canvases the Warehouse card generates, so putting real corrugated
  board on the line cost nothing measurable. Before modelling or generating a
  new surface, check whether another card already makes one — `skins.ts` and
  `metal.ts` both cache by generating parameters and never dispose.
- **FOUR separate "documented but never wired" defects have now been found** —
  the geometry cache (#18), the metal texture cache (#23), `subject.trackers()`,
  and `rig.motion`/`rig.trackX` (the last two in `DECISIONS.md`). All four were
  described in comments as done, and two of them were credited in THIS FILE with
  measured effects they cannot have had. Two further entries (#9, #10) describe
  resolutions the code does not use. **Assume nothing here works because a
  comment or a table row says so; grep for the call site and read the constant.**
  The two largest wins in this file were both found by reading code that a
  comment had already declared finished.
- **A cache you declared is not a cache you used.** The single largest win in
  this file (#18, ~700 ms) was a `Map` that existed, was documented in a
  confident comment, and was never read. The comment was taken as evidence for
  four rounds of optimisation work. **Grep for the reads, not the declaration** —
  and distrust a comment that asserts an optimisation without a number.
- **Shared geometry means no mesh may dispose its own geometry.** Both caches in
  `metal.ts` now hand out shared objects. Subjects dispose materials only. A
  subject that starts disposing geometry will silently break every other card.
- **Cached textures must never be disposed by a scene.** Two subjects still
  called `dispose()` on shared textures; the first unmount would have destroyed
  them for every other card on the page.
- **`transparent: true` must be turned off once a fade completes.** Transparent
  materials render in the transparent pass and do not depth-test reliably
  against themselves — visible as see-through edges on the container.
- **…and the same fact breaks overlay graphics, which is worth stating
  separately because it does not look like a transparency bug.** A subject that
  keeps `transparent: true` (to ramp opacity on intro) puts its panels in the
  transparent queue, where draw order is per-object bounding-sphere distance.
  Any overlay mark on that subject is in the same queue, so a panel whose
  centre sorts nearer will paint over a bracket sitting proud of its surface.
  `depthTest: false` does not help — it defeats the depth buffer, not the draw
  order. Set an explicit `renderOrder`, **and set it per-mesh**: `bracket()`
  returns a Group of eight planes and a Group's `renderOrder` does not
  propagate to its children. Crane Vision lost four passes to this; see
  `docs/09-scene-craft-and-learnings.md` for the full symptom set.
  No timing is attached because this is a correctness bug, not an
  optimisation — it is filed here only because it lives next to the
  transparency note above and was found while chasing it.
- **`#include <colorspace_fragment>` is required in raw `ShaderMaterial`.**
  Without it, uniforms three converted sRGB→linear are written straight into an
  sRGB framebuffer: the authored colour renders at ~⅛ brightness.
- **Dev Strict Mode double-builds every scene.** Never trust a dev timing.

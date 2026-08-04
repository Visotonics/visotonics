# Technical reference / touch matrix

What this is: the engineering-detail reference — routes, components, state, dependency edges, and the specific shared-cache traps that have caused bugs before. For an engineer about to touch shared infrastructure. A condensed, verified version of `touchmatrix.md` — read that file for full detail; this is the founder-audience digest plus the parts double-checked against code.

## Stack

Next.js 16.2.10 (App Router) · React 19.2.4 · TypeScript 5 · Tailwind CSS 4 · shadcn (`base-nova`, `neutral`) · vanilla three.js (not react-three-fiber) for the Vision scenes.

## Route → component → state, condensed

See `01-sitemap.md` for the full route list and `03-dependency-map.md` for cross-page dependencies. In brief:

- **No global state store, no context provider, no server actions anywhere in the app.** The only "backend" interaction is `POST /api/lead` from the Contact form and campaign landing pages.
- Client-side (`"use client"`) interactivity is scattered per-component, not centralized: nav mega-menu (`site-nav.tsx`), decode-text effect, motion/reveal primitives, the product-page scroll-spy rails (one `useState` per page for the active section + a second for a sliding indicator dot), the FAQ accordion, the contact form, the cookie-consent banner, and every 3D scene (imperative three.js state inside `useEffect`, not React state).
- The `/dev/journey` prototype is the one exception with anything resembling a store — a module-level singleton scroll-position object in `lib/journey-scroll.ts` — but it's fully torn down on unmount and isolated from the rest of the app (see `03-dependency-map.md`).

## Shared/cached state hazards — verified in code

These are real, current hazards in `components/vision/_vision/metal.ts` (confirmed by reading the file, not copied blindly from `touchmatrix.md`):

- **Shared geometry is flagged and must never be disposed by an individual scene.** `metal.ts`'s `geoCache` (a `Map`) hands out `THREE.BufferGeometry` objects shared across every scene that requests the same shape, and sets `geo.userData.shared = true` on them as a guard marker. A scene that calls `.dispose()` on a shared geometry breaks it for every other scene sharing it, silently, the next time any of them tries to render.
- **The metal texture cache (`texCache`, `roughCanvasCache`) is keyed by generating parameters** (base colour / finish kind / roughness, quantised to 0.05 / repeat) and, as of the current code, is actually wired up and populated during browser idle time (`warmMetalCache()`). This was previously a bug — `PERFORMANCE.md` documents that this exact cache existed, was documented as working, and was never actually called, for a period — so it's worth re-checking this is still true (`cached()` being called from `makeMetal`) before assuming any new metal-texture code will get cache benefits for free.
- **Rule for any new scene:** it must ask for the site's one canonical brushed-metal finish (and tint it) rather than inventing a new `makeMetal` spec, or it silently misses the shared cache and pays a full texture-generation cost (including a Sobel normal-map pass) on every page load. Gate Vision is the one existing scene that doesn't follow this rule, and `PERFORMANCE.md` records exactly what that costs (see that file's entry #32).
- **Cached objects are never disposed, by design** — this is intentional (a scene tearing one down would break every other consumer), not an oversight.
- **Same hazard, scene-local version:** `cargo-vision/scene.tsx` grew from one tracked item to nine, so it now clones a material (`dm.accent.clone()`) per tracker and clones a texture (`board.clone()`) before changing its `.repeat` — cloning per-instance instead of mutating a shared reference, for exactly the reason the cache rules above exist. Any new per-item-animated asset in that scene needs the same treatment.

## Blast-radius edges worth knowing

See `03-dependency-map.md` for the full breakdown. The two shapes that matter most:

1. `components/vision/_vision/**` (studio/camera/overlay/metal/mount/lazy) → all 8 flagship scenes + homepage + all 12 lab routes. Changing this engine layer is a site-wide 3D change, not a single-scene change.
2. The Yard/Warehouse/Factory section re-export chain (Document/Cargo sourced from Yard; Work/Secure sourced from Warehouse, with Factory two hops from Yard through Warehouse) — editing one product page's "shared" section silently changes 2-3 pages at once.

## Known dead code / cleanup candidates

- `components/ui/button.tsx` — unused shadcn button component
- `components/motion.tsx`'s `DecodeHeadline` — unused export
- `app/platform/viso-yard/sections.tsx`'s `RegisterClose` — defined, exported, zero importers

## Auth / error handling / i18n — the short version

- **Auth:** none implemented. `/client-portal` is a UI mock with no session check.
- **Error/loading states:** Next.js App Router defaults only — no custom error boundaries or loading skeletons observed.
- **i18n:** none. The nav has a language-switcher UI element with no locale routing behind it.
- **Reduced motion:** the site does respect `prefers-reduced-motion` in multiple places (scroll rails, the global CSS motion tokens, individual scene/video components) — this one is genuinely implemented, not aspirational.

## Where this doc might already be stale

Per this repo's own convention, `touchmatrix.md` is meant to be regenerated after structural changes and can drift between regenerations. This file was written from a snapshot of the actual `app/`/`components/` tree plus targeted greps at generation time — if a new route, scene, or shared module has been added since, re-verify against the live tree rather than trusting this table blindly, same caution the repo's own docs give about `touchmatrix.md` itself.

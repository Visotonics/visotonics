<!-- Regenerate on structural change (new route, new store, moved/deleted export, changed public signature). Do not hand-edit — regenerate. -->

# touchmatrix.md

## 1. Header

| | |
|---|---|
| Stack | Next.js 16.2.10 (App Router) · React 19.2.4 · TypeScript 5 · Tailwind CSS 4 · shadcn (style: `base-nova`, base color: `neutral`) · Radix via `@base-ui/react` |
| Package manager | npm |
| Entry point | `app/layout.tsx` (root layout, renders `SiteNav` + `SiteFooter`) → `app/page.tsx` (home) |
| Dev | `npm run dev` (port 3000) |
| Build | `npm run build` |
| Start | `npm run start` |
| Lint | `npm run lint` |
| Fonts | `Archivo` (`--font-archivo`, sans) + `IBM_Plex_Mono` (`--font-plex-mono`, mono) via `next/font/google` in `app/layout.tsx` |
| State | Home + all four platform detail pages (Viso Yard, Viso Warehouse, Viso Factory, Viso Data) plus `/industries`, `/company/about`, `/contact`, `/resources/blog` (+ per-post `[slug]`), `/legal/*` and the `/campaigns/[slug]` ad-landing route are fully built. Several `/resources/*` and `/company/*` routes are still `ComingSoon` stubs, and `/resources/case-studies` is a bare `<div>` shell (see §2). Client-side interactivity: Yard/Warehouse/Factory rails (scroll-spy + a sliding active-tick dot), `DecryptedText` decode effect, `Reveal`/`CountUp`/`UnderlineDraw` motion primitives, `DrawSchematic` SVG draw-on, hover-driven nav mega-menu, a real `/api/lead`-backed contact + campaign lead form, a cookie-consent-gated GA4/LinkedIn tracking loader, and a set of live three.js "vision scene" modules in `components/vision/**` on a shared `_vision` engine layer. **Seven flagships now ship in production**, not four: Container/Tank/Gate/Yard Vision on `/platform/viso-yard` sections 01–04 as before, **plus Crane Vision and Cargo Vision — now confirmed live in `/platform/viso-yard` sections 05/06 — and Document Vision, live on all three of `/platform/viso-yard`, `/platform/viso-warehouse` and `/platform/viso-factory`** (see §2's viso-yard row for exactly which SVG fallback finally left, and §6 for the re-export chain). Work Vision is also live (Warehouse §05, re-exported into Yard §08 and Factory §04). `app/lab/**` is now **eleven** thin noindexed review wrappers around `components/vision/**` scenes — one is genuinely new work-in-progress with no production page (`ascii-hero`), the rest mirror scenes that are also live somewhere in production. A new dev-only scroll-choreography prototype lives at `/dev/journey` (self-contained, no shared engine code — see §2). |

## 2. Route/Page map

Root layout `app/layout.tsx` wraps every route with `SiteNav` (top) and `SiteFooter` (bottom). No nested layouts. Status legend: **full** = designed/ported content · **coming-soon** = `ComingSoon` component · **shell** = bare `<div></div>` placeholder (no `ComingSoon`) · **anchors** = empty anchor `<section>`s only.

| Route | File | Status | Renders / anchor ids | Client state? |
|---|---|---|---|---|
| `/` | `app/page.tsx` | full | Hero → Statement → Metrics → HowItWorks → ProofPartners → Testimonials → Convert (Metrics now sits BEFORE HowItWorks — the page argues the numbers before it demonstrates the lead-card scene; see the in-file note by `<Home>`). Hero headline uses two non-sequential center-decode `DecryptedText` calls split by `<br/>`; every other section's `Reveal` wraps its inner content div, never the `<section>` itself. Hero's 4 cards are live `YardCard`/`WarehouseCard`/`FactoryCard`/`DataCard` scenes and `HowItWorks` carries `LeadCardScene`, both via `@/components/vision/_vision/lazy`. **New**: `Statement` now wraps its content in `StatementVideo` (`components/statement-video.tsx`) — a background-footage slot (poster-only today; real loop is a drop-in file swap, see §3) | no |
| `/platform` | `app/platform/page.tsx` | **gone — now a redirect** | `app/platform/page.tsx` no longer exists. `next.config.mjs`'s `redirects()` sends `/platform` → `/platform/viso-yard` (permanent). Do not go looking for an anchors page here | — |
| `/platform/viso-yard` | `app/platform/viso-yard/page.tsx` | full | hero + a full-bleed **`SectionProductsOverview`** card grid (new — one tile per product, 9 tiles, the flagship's own schematic filling the tile edge-to-edge, sits between the hero and section 01; desktop-only) + sticky rail + 9 numbered sections; ids `#container-vision` `#tank-vision` `#gate-vision` `#yard-vision` `#crane-vision` `#cargo-vision` `#document-vision` `#work-vision` `#secure-vision`. **All nine now embed live content, not seven-of-nine flat SVGs as the previous doc had it, and not the "05/06 still static" claim before that.** Verified by reading `sections.tsx` in full: sections 01–06 (Container/Tank/Gate/Yard/Crane/Cargo) embed the live three.js scenes; section 07 (Document) also embeds `DocumentVisionScene`; sections 08/09 (Work/Secure) are imported from `../viso-warehouse/sections` and are also live scenes there. **Crane and Cargo are confirmed live here** — this reverses the previous doc's explicit claim that `SectionCrane`/`SectionCargo` "have not been touched and still render static SVGs": `SectionCrane`'s desktop branch now renders `<CraneVisionScene bare bleed={140} />` in a 2:3 portrait slot (mobile keeps a static `<Schematic>` — 3D on a 55-container scale at phone width was never legible); `SectionCargo`'s desktop branch renders `<CargoVisionScene bare bleed={180} />` at 4:3 (mobile also keeps its `<MediaFrame>` schematic). Yard Vision (section 04) likewise keeps the 3D scene desktop-only and a flat row/bay grid on mobile — deliberate, documented inline (55 boxes resolve to nothing at 375px). ⚠ `RegisterClose` (an 08/09 colophon band, exported from `sections.tsx`) is defined but **not imported by `page.tsx`** — dead code, see §7 | rail only |
| `/platform/viso-warehouse` | `app/platform/viso-warehouse/page.tsx` | full | hero manifest + **`SectionProductsOverview`** card grid (new, same pattern as Yard's) + sticky rail + 6 sections; ids `#cargo-vision` `#audit-vision` `#dimension-vision` `#document-vision` `#work-vision` `#secure-vision`. Cargo/Document re-exported from Yard's `sections.tsx`; Work Vision is authored here (`WorkVisionScene`, live 16:9 scene, no bleed) | rail only |
| `/platform/viso-data` | `app/platform/viso-data/page.tsx` | full | 3 stacked sections, **no rail** (deep-link via scroll-margin), fully self-contained (own local tokens, no `_shared`/`_media` import). Unchanged this cycle; ids `#compression-ai` `#trace-ai` `#detect-ai` | no |
| `/platform/viso-factory` | `app/platform/viso-factory/page.tsx` | full | hero manifest + **`SectionProductsOverview`** card grid (new, same pattern) + sticky rail + 5 sections (4 reused from Warehouse via a factory→warehouse→yard chain, `SectionProduction` authored locally); ids `#production-vision` `#audit-vision` `#dimension-vision` `#work-vision` `#secure-vision` | rail only |
| `/industries` | `app/industries/page.tsx` | full | Intro + 4 `ChapterBlock`s + Closing; unchanged this cycle | draw-schematic + underline-draw |
| `/resources/faqs` | `app/resources/faqs/page.tsx` | full | FAQ accordion | yes — `useState` accordion |
| `/resources/testimonials`, `/resources/roi-calculator`, `/resources/whitepapers`, `/resources/webinars`, `/resources/documentation`, `/resources/glossary`, `/resources/press-kit` | `app/resources/*/page.tsx` | coming-soon | — | no |
| `/company/about` | `app/company/about/page.tsx` | full | About stats/timeline + Team grid | no |
| `/company/offices` | `app/company/offices/page.tsx` | full | Offices list + `OfficesGlobe` SVG; dangling `#offices-list` link | no |
| `/company/careers`, `/company/newsroom`, `/company/investor-relations`, `/company/partners`, `/company/sustainability` | `app/company/*/page.tsx` | coming-soon | — | no |
| `/contact` | `app/contact/page.tsx` | full | Client component — `handleSubmit` posts to `POST /api/lead` (`source: "contact"`) | yes — `FormData` on submit |
| `/client-portal` | `app/client-portal/page.tsx` | full | Login card; `#dashboard`/`#request-access` dangling; "Forgot password" → real `/client-portal/reset-password` | intended per sitemap ⚠ no auth check |
| `/client-portal/register` | `app/client-portal/register/page.tsx` | full | Register card; dangling `#dashboard` | no |
| `/client-portal/reset-password` | `app/client-portal/reset-password/page.tsx` | full | Reset-password card | no |
| `/legal/privacy-policy`, `/legal/terms-and-conditions` | `app/legal/*/page.tsx` | full | Static legal copy; in sitemap | no |
| `/campaigns/[slug]` | `app/campaigns/[slug]/page.tsx` | full, dynamic (SSG) | Paid-ad landing page via `CampaignLanding`, driven by `app/campaigns/data.ts`; `noindex`, excluded from `sitemap.xml`. Root layout swaps `SiteFooter` for `CampaignFooter` here | yes — lead form → `/api/lead` |
| `/api/lead` | `app/api/lead/route.ts` | API route (`POST`, `runtime: "nodejs"`) | Shared lead-capture endpoint for `/contact` and every `/campaigns/[slug]` form; Resend if configured, else logs | — |
| `/resources/blog` | `app/resources/blog/page.tsx` | full | `BlogList` over 5 posts in `posts.ts` | no |
| `/resources/blog/[slug]` | `app/resources/blog/[slug]/page.tsx` | full, dynamic (SSG) | Per-post article page, `BlogPosting` JSON-LD, in sitemap | no |
| `/resources/case-studies` | `app/resources/case-studies/page.tsx` | shell (bare `<div></div>`, noindex) | — still unbuilt | no |
| `/dev/journey` | `app/dev/journey/page.tsx` | full, **new dev-only prototype, replaces the deleted `/dev/viso-yard-light`** | A scroll-driven "journey" feel-test: one `position: sticky` 100vh viewport pinned over a 500vh `#journey` spacer, one raw three.js container scene, camera and captions driven entirely as `f(scroll progress)` — no per-element tweens (see `lib/journey-scroll.ts`). Deliberately isolated: imports nothing from `components/vision/**`, not linked from nav, not in sitemap, `robots: {index:false, follow:false}` | yes — see §4 |
| `/lab/*` | `app/lab/**/page.tsx` | experimental — see note below | 11 routes (see the lab note directly below) | varies |

**`app/dev/viso-yard-light/` is deleted** (confirmed — `app/dev/` now contains only `journey/`). It is not "the only surviving Yard fork" any more because it no longer exists; there is currently no Yard-page fork at all. `/dev/journey` is a different kind of thing — a raw feel-test for a future homepage interaction model, not a themed clone of an existing route — so do not treat it as viso-yard-light's replacement in kind, only in directory slot.

**Lab routes are experimental prototypes: never linked from nav/footer, never in `sitemap.xml`, and every one sets `robots: { index: false, follow: false }`.** Every route is a thin `page.tsx` wrapper (staging chrome + an aspect-ratio box) importing the real scene from `components/vision/**`. Current routes (11, up from 8):

| Route | File | Purpose |
|---|---|---|
| `/lab/hero-cards` | imports `DataCard`/`FactoryCard`/`WarehouseCard`/`YardCard` from `@/components/vision/_vision/lazy` | Homepage hero-card band geometry, all four cards side by side |
| `/lab/lead-card` | imports `LeadCardScene` default from `@/components/vision/lead-card/scene`, ungated | Standalone stage for the lead-card scene |
| `/lab/container-vision` | imports `ContainerVisionScene` default from `@/components/vision/container-vision/scene`, ungated | Standalone stage, 1600×680 aspect |
| `/lab/tank-vision` | imports `TankVisionScene` from `_vision/lazy` | Standalone stage, split out from the full Yard clone (no longer needed anyway since the clone is deleted, but the isolation value still holds) |
| `/lab/gate-vision` | imports `GateVisionScene` default from `@/components/vision/gate-vision/scene`, ungated | Standalone stage |
| `/lab/yard-vision` | imports `YardVisionScene` from `_vision/lazy` | Standalone stage, DARK page background |
| `/lab/crane-vision` | imports `CraneVisionScene` from `_vision/lazy` | Standalone stage — **no longer this scene's only home**, see §2's viso-yard row: Crane Vision is now also live in `/platform/viso-yard` §05. Dark background, PORTRAIT slot (`680/1120`, capped 560 wide) |
| `/lab/cargo-vision` | imports `CargoVisionScene` from `_vision/lazy` | Standalone stage — **no longer this scene's only home**: Cargo Vision is now also live in `/platform/viso-yard` §06. Dark background, landscape 4:3 at 1200 wide |
| `/lab/document-vision` | **new.** imports `DocumentVisionScene` from `_vision/lazy` | Standalone stage, dark background, landscape 3:2 at 1100 wide — the aspect the scene's `fitRad` framing is derived against. Also no longer lab-only: live on Yard/Warehouse/Factory |
| `/lab/work-vision` | **new.** imports `WorkVisionScene` from `_vision/lazy` | Standalone stage, dark background, landscape 16:9 at 1200 wide, no bleed (the shift-register overlay is pinned to the frame's own bottom-left). Also live on Warehouse/Yard/Factory |
| `/lab/ascii-hero` | **new, genuinely lab-only.** imports `AsciiHeroScene` from `_vision/lazy` | The one route in this set with **no production consumer anywhere** — an ASCII-halftone field background effect being tuned for a possible future hero treatment. Two panels: field at full strength, and field at hero strength (0.75) with real headline type over solid per-line chips. Flag as **in flux at generation time** — under active iteration, may not match this description by the time you read it |

Note the split within the lab tree: Container/Gate/Lead-card import their scene's own default export directly (no gating — nothing else on the page), while Tank/Yard/Crane/Cargo/Document/Work/Ascii/hero-cards go through `_vision/lazy`'s gated named exports, same as production.

Shared vision-scene infrastructure lives in `components/vision/_vision/`: `lazy.tsx` (now exports `ContainerVisionScene`, `TankVisionScene`, `GateVisionScene`, `YardVisionScene`, `CraneVisionScene`, `CargoVisionScene`, `DocumentVisionScene`, `WorkVisionScene`, `AsciiHeroScene`, `LeadCardScene`, `YardCard`, `WarehouseCard`, `FactoryCard`, `DataCard` — 13 named exports, up from 11; each a `WhenNear`-gated dynamic import with its own idle-warm loader — see PERFORMANCE.md), `mount.ts` (`mountWhenVisible`), `studio.ts` (`createStudio`), `metal.ts` (`makeMetal`, `tintMetal`, `warmMetalCache`, `CANONICAL_BRUSHED`, `metalBox`), `camera.ts`, `overlay.ts`, `palette.ts` (`PALETTE`, `sans`).

The idle warm chain now registers loaders for **all nine** dynamic scenes (`loadContainer`, `loadTank`, `loadGate`, `loadYardVision`, `loadCrane`, `loadCargo`, `loadDocument`, `loadWork`, `loadAscii`), each sequential and failure-swallowing, same pattern throughout. `loadDocument` also warms `document-vision/document`'s `warmDocumentTextures`; `loadWork` warms `work-vision/work`'s `warmWorkTextures` (no canvases of its own — it exists to generate the shared DARK_METAL maps during idle rather than on the scroll path); `loadAscii` warms `ascii-hero/ascii`'s `warmAsciiAtlas`.

Each flagship scene lives in its own `components/vision/<name>-vision/` folder: `container-vision/`, `gate-vision/`, `tank-vision/` (scene only, no separate geometry module), `yard-vision/`, `crane-vision/` (`scene.tsx` + `crane.ts`), `cargo-vision/` (`scene.tsx` + `cargo.ts`), `document-vision/` (`scene.tsx` + `document.ts`, **confirmed on disk, not previously documented**), `work-vision/` (`scene.tsx` + `work.ts`, **confirmed on disk, not previously documented**), `hero-cards/`, `lead-card/`. Plus **`ascii-hero/`** (`scene.tsx`, `ascii.ts`, `forms.ts`) — flagged in-flux, see the lab table above.

**No route groups. Two dynamic-segment routes: `app/resources/blog/[slug]` and `app/campaigns/[slug]`, both SSG.** `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, `app/opengraph-image.tsx` unchanged this cycle — robots allows all crawlers except `/client-portal`; sitemap is a hand-curated allowlist (still excludes `/dev/*`, `/lab/*`, stubs, auth surface, `/campaigns/*`).

## 3. Component/Module index

### Global chrome & primitives
| Symbol | File | Type | Consumed by | Consumes |
|---|---|---|---|---|
| `RootLayout` | `app/layout.tsx` | layout (default) | Next.js router | `SiteNav`, `SiteFooter`, fonts, `./globals.css`, noscript fallback |
| `SiteNav` | `components/site-nav.tsx` | **client** | `RootLayout` | `Brand`; `productHref()` |
| `SiteFooter` | `components/site-footer.tsx` | component (server) | `RootLayout` | `Brand` |
| `Brand` | `components/brand.tsx` | component (server) | `SiteNav`, `SiteFooter` | — |
| `DecryptedText` (default) | `components/decrypted-text.tsx` | **client** | home, yard/warehouse/factory heroes | — |
| `Reveal`, `CountUp`, `UnderlineDraw`, `DecodeHeadline` | `components/motion.tsx` | **client** | widely used; `DecodeHeadline` still ⚠ dead (no importers) | — |
| `DrawSchematic` | `components/draw-schematic.tsx` | **client** | `app/platform/viso-yard/_media.tsx` (`Schematic`) | — |
| `ComingSoon` | `components/coming-soon.tsx` | component (server) | 12 coming-soon stub routes — highest fan-in | — |
| `Button`, `buttonVariants` | `components/ui/button.tsx` | component (shadcn) | ⚠ unused, no importers | — |
| `cn` | `lib/utils.ts` | util | `components/ui/button.tsx` | — |
| `JsonLd`, `organizationSchema`, `websiteSchema`, `productSchema`, `faqSchema`, `articleSchema` | `components/json-ld.tsx` | component + functions | root layout / platform / FAQ / blog pages | `lib/seo.ts` |
| `ConsentBanner`, `useConsent`, `readConsent` | `components/analytics/consent-banner.tsx` | **client** | `RootLayout`; `TrackingScripts` | — |
| `TrackingScripts`, `trackEvent`, `trackLinkedInConversion` | `components/analytics/tracking-scripts.tsx` | **client** | `RootLayout` | `useConsent` |
| `ConditionalFooter` | `components/campaign/campaign-chrome.tsx` | **client** | `RootLayout` | — |
| `CampaignFooter`, `CampaignLanding` | `components/campaign/*` | components | `RootLayout` / `app/campaigns/[slug]/page.tsx` | `app/campaigns/data.ts` |
| **`StatementVideo`** (default) | `components/statement-video.tsx` | **client, new this cycle** | `app/page.tsx`'s `Statement` section (desktop + mobile) | none external. Self-contained: IntersectionObserver (200px), `prefers-reduced-motion` gate, an `onError` handler on the `<video>` (not per-`<source>`, so a `.webm` 404 doesn't tear the element down before `.mp4` is tried), and a CSS `background-image` poster fallback so the visible result is identical whether the video is absent, loading, or failed. Media files (`/media/statement-loop.webm`/`.mp4`, `/media/statement-poster.svg`) do not exist yet — this is the normal path today, not an edge case; shipping the real footage is a file drop, no code change |

### Viso Yard route modules (`app/platform/viso-yard/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoYardPage` | `page.tsx` (default) | hero + `SectionProductsOverview` (full-bleed band, outside the rail row on purpose — see in-file comment on why gridlines/rail are lifted out as overlay layers spanning all three bands) + rail + 9 sections + `Convert`. Imports `SectionSecure, SectionWork` from `../viso-warehouse/sections` (`n="08"`/`n="09"` override) |
| `YardRailDesktop`, `YardRulerMobile`, `RAIL_SECTIONS` | `rail.tsx` | **client**; scroll-spy, sliding active-tick dot. Unchanged this cycle |
| `SectionContainer`, `SectionTank`, `SectionGate`, `SectionYard`, `SectionCrane`, `SectionCargo`, `SectionDocument`, `SectionProductsOverview`, `PlatformBand`, `RegisterClose` | `sections.tsx` | `SectionCargo` + `SectionDocument` re-exported by Viso Warehouse. **`SectionProductsOverview` is new** (9-tile full-bleed card grid). **`RegisterClose` exists (an 08/09 colophon band) but has ⚠ zero importers anywhere in the repo** — grepped repo-wide, only its own definition file matches; confirmed dead code, not merely under-used |
| `Convert` | `convert.tsx` | home-convert clone |
| tokens + `Cross`, `Dot`, `Verticals`, `eyebrow`, `SHEET`, `ANCHOR_OFFSET`, colour consts | `_shared.tsx` | ⚠ high fan-in — Yard + Warehouse + Factory (6+ files) |
| `Schematic` | `_media.tsx` | server-only, reads SVG from `public/assets` via `node:fs`. ⚠ imported by Warehouse, Factory, Yard's own `SectionProductsOverview`, and `app/industries/page.tsx` |

### Viso Warehouse route modules (`app/platform/viso-warehouse/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoWarehousePage` | `page.tsx` (default) | hero manifest + `SectionProductsOverview` (own copy, same pattern, desktop-only) + rail + 6 sections + `Convert` |
| `WarehouseRailDesktop`, `WarehouseRulerMobile`, `RAIL_SECTIONS` | `rail.tsx` | **client**; same pattern as Yard |
| `SectionAudit`, `SectionDimension`, `SectionProductsOverview`, `SectionWork({n="05"})`, `SectionSecure({n="06"})` | `sections.tsx` | Also re-exports `SectionCargo`, `SectionDocument` from `../viso-yard/sections`. `SectionWork` now renders the live `WorkVisionScene` (16:9, no bleed) in place of its old flat register graphic |
| `Convert` | `convert.tsx` | clone; CTA → `/platform/viso-warehouse` |
| (imports `_shared` + `_media` from `../viso-yard`) | — | no local `_shared`/`_media` |

### Viso Factory route modules (`app/platform/viso-factory/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoFactoryPage` | `page.tsx` (default) | hero manifest + `SectionProductsOverview` (own copy) + rail + 5 sections + `Convert` |
| `FactoryRailDesktop`, `FactoryRulerMobile` | `rail.tsx` | **client**; same pattern |
| `SectionProduction` (factory-authored) + `SectionProductsOverview` (factory-authored) + re-exports `SectionAudit`, `SectionDimension`, `SectionWork`, `SectionSecure` | `sections.tsx` | re-exports pulled from `../viso-warehouse/sections` — factory → warehouse → yard two-hop chain |
| `Convert` | `convert.tsx` | clone; CTA → this route |
| (imports `_shared` + `_media` from `../viso-yard`) | — | no local `_shared`/`_media` |

### Viso Data route module (`app/platform/viso-data/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoDataPage` | `page.tsx` (default) | self-contained; `CompressionAI`/`TraceAI`/`DetectAI`. Unchanged this cycle |

### Industries route module (`app/industries/`)
| Symbol | File | Notes |
|---|---|---|
| `IndustriesPage` | `page.tsx` (default) | unchanged this cycle — `Intro` + `CHAPTERS.map(ChapterBlock)` + `Closing` |

### Journey prototype (`app/dev/journey/`, `components/journey/`, `lib/journey-scroll.ts`) — new this cycle
| Symbol | File | Notes |
|---|---|---|
| `JourneyPrototypePage` (default) | `app/dev/journey/page.tsx` | 500vh spacer + `position: sticky` 100vh pinned viewport holding `<JourneyScene>` + a fading "SCROLL" affordance. `noindex,nofollow` |
| `JourneyScrollManager` (default) | `components/journey/scroll-manager.tsx` | **client, no visible output.** The one scroll driver: Lenis smooths the wheel, feeds `gsap.ticker` (not its own rAF — see in-file rationale about frame ordering vs Lenis), GSAP `ScrollTrigger` (`scrub: true`, trigger `#journey`, `top top` → `bottom bottom`) writes `journey.raw`; a separate exponential damper (`startDamper`) produces `journey.p`. Fully torn down on unmount — this is a prototype living in the same SPA as the real site, so a surviving Lenis/ticker instance would hijack scroll on every other page. `prefers-reduced-motion`: skips all of the above, calls `freezeAt(0.5)` instead |
| `JourneyScene` (default) | `components/journey/journey-scene.tsx` | **client.** Self-contained raw three.js — deliberately no import from `components/vision/**` (this is a feel-test of "camera as pure function of scroll", not a look). A corrugated-container subject, one scan-plane sweep, a 3×3 LOCATE dot grid + bracket, and four DOM captions, ALL recomputed every frame purely from `journey.p` via `subscribe()` — no tweens, no elapsed-time term, so it scrubs identically forward/back. 45fps-gated render loop + own IntersectionObserver (pauses when canvas scrolls off) |
| `journey`, `subscribe`, `seg`, `smooth`, `window01`, `clamp01`, `startDamper`, `freezeAt` | `lib/journey-scroll.ts` | Module-singleton scroll state (`{ raw, p }`) + damper, ported from a sibling project. Deliberately NOT React state — this value changes every frame and only ever feeds imperative writes (camera matrices, style props) |

## 4. State & data flow

No global store, context provider, API client, or server action anywhere in the app (the `/dev/journey` prototype's module-singleton in `lib/journey-scroll.ts` is scroll-frame state, not app data, and is fully torn down on unmount). `/contact`'s form submit is the one "backend" interaction (`POST /api/lead`). Client-side state is scattered across these `"use client"` files:

- `components/site-nav.tsx` — 7 `useState` + 1 `useEffect`, hover+click mega-menus.
- `components/decrypted-text.tsx` — 6 `useState`, 2 IntersectionObservers, rAF + scramble interval.
- `components/motion.tsx` — `Reveal`/`CountUp`/`UnderlineDraw`/`DecodeHeadline`, IntersectionObserver-driven, `DecodeHeadline` unused.
- `components/draw-schematic.tsx` — no `useState`; `useLayoutEffect`/`useEffect`, 1 IntersectionObserver, manual SVG stroke-dashoffset.
- `app/platform/viso-yard/rail.tsx`, `viso-warehouse/rail.tsx`, `viso-factory/rail.tsx` — each: `useState`(active) + scroll/resize/hashchange listeners, plus (desktop) a second `useState`(dotTop) for the sliding marker.
- `app/resources/faqs/page.tsx` — `useState` accordion.
- `app/contact/page.tsx` — `"use client"`, `handleSubmit` reads `FormData`, posts to `/api/lead`.
- **`components/statement-video.tsx`** (new) — 2 `useState` (`near`, `failed`) + 1 IntersectionObserver (200px), no ref to global state.
- **`components/journey/scroll-manager.tsx`** (new, `/dev/journey` only) — no React state; owns a Lenis instance, a GSAP ticker callback and a ScrollTrigger, all created and destroyed inside one `useEffect`.
- **`components/journey/journey-scene.tsx`** (new, `/dev/journey` only) — 2 `useRef`s (canvas wrapper, caption els), no `useState`; reads the `lib/journey-scroll.ts` singleton via `subscribe()`.
- Every scene in `components/vision/**` — imperative three.js state inside `useEffect`, not React state; unchanged pattern.

Everything else is a static server component.

## 5. Shared config & constants

| Name | File | Used where |
|---|---|---|
| shadcn config | `components.json` | `npx shadcn add` only |
| Tailwind v4 tokens/theme | `app/globals.css` | global (CSS-first) |
| Path alias `@/*` | `tsconfig.json` | all imports |
| Dev server launch config | `.claude/launch.json` | Claude Code preview tooling, port 3000 |
| Font vars | `app/layout.tsx` | `<html>` className |
| Drafting-sheet tokens + primitives | `app/platform/viso-yard/_shared.tsx` | Yard + Warehouse + Factory |
| Schematic SVG assets | `public/assets/*.svg` | inlined by `Schematic` |
| Motion Spec v1 | `app/globals.css` + `app/layout.tsx` | site-wide |
| Favicon | `app/icon.png` | auto-detected |
| Vision-scene palette | `components/vision/_vision/palette.ts` | every scene in `components/vision/**`, unchanged this cycle |
| Drafting-ground helper | `components/vision/hero-cards/ground.ts` (`draftingGround`) | `tank-vision`, `yard-vision`, `gate-vision`, `cargo-vision` |
| **Journey scroll assets (new, `/dev/journey` only)** | `public/media/` | statement-video's poster SVG (`statement-poster.svg`) — the real `.webm`/`.mp4` loop files referenced by `components/statement-video.tsx` do NOT exist on disk yet; only the poster does. Do not assume the video actually plays in this build |

Env vars (all optional, degrade gracefully): `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `LEAD_FROM_EMAIL`; `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_LINKEDIN_PARTNER_ID`. No feature flags.

**Dependencies added this cycle**: `gsap` and `lenis` (both in `dependencies`, not dev) — pulled in exclusively by the `/dev/journey` prototype (`components/journey/scroll-manager.tsx`). Nothing else in the app imports either yet. `@types/three` remains the devDependency that keeps `npx tsc --noEmit` clean across `app/lab/**`.

## 6. Blast radius / dependency edges

- `app/platform/viso-yard/_shared.tsx` → Yard, Warehouse, Factory page+sections. High fan-in.
- `app/platform/viso-yard/_media.tsx` (`Schematic`) → Yard (incl. its own `SectionProductsOverview`), Warehouse, Factory, `app/industries/page.tsx`.
- `app/platform/viso-yard/sections.tsx` (`SectionCargo`, `SectionDocument`) → re-exported by `viso-warehouse/sections.tsx`. **Document Vision is therefore a dependency of three production routes at once** (Yard directly, Warehouse via re-export, Factory has no Document section so it's unaffected there) — editing `SectionDocument` changes Yard and Warehouse simultaneously.
- `app/platform/viso-warehouse/sections.tsx` (`SectionWork`, `SectionSecure`) → imported directly by `viso-yard/page.tsx` (`n` override) **and** re-exported through `viso-factory/sections.tsx` — factory→warehouse→yard two-hop. Editing either changes Warehouse, Yard, and Factory at once. **Work Vision's live scene is therefore also a three-route dependency**, same shape as Document Vision above.
- `components/decrypted-text.tsx` → home + Yard + Warehouse + Factory hero titles.
- `components/coming-soon.tsx` → 12 stub routes — highest fan-in.
- `app/api/lead/route.ts` → single lead-capture backend for `/contact` and every `/campaigns/[slug]`.
- `components/site-nav.tsx` `productHref()` → `#`-anchor ids in each platform page; renaming a section id breaks a nav deep link.
- `components/vision/_vision/*` → importers now: all 11 `/lab/*` routes, `app/page.tsx` (hero cards + lead card), and **`app/platform/viso-yard/sections.tsx`, `app/platform/viso-warehouse/sections.tsx`** (Work Vision authored there, Document/Cargo re-exported into Yard). A change to `_vision/studio.ts`, `camera.ts`, `overlay.ts`, `metal.ts` or `mount.ts` now ripples across every production platform page plus all 11 lab routes, not just Yard.
- `app/dev/journey/` and `components/journey/**` are fully isolated — no import from `components/vision/**`, `_shared`, or any production route module, and nothing production imports them back. Changing either side has zero blast radius on the other. (This replaces the previous doc's note about `app/dev/viso-yard-light/`'s fork relationship — that route is deleted, and its replacement is architecturally unrelated, not a themed fork.)
- `components/vision/hero-cards/skins.ts`, `detect.ts`, `ground.ts` — shared subject-building modules. `createSightCone` (in `detect.ts`) is now consumed by **6 files**, confirmed by grep: `hero-cards/detect.ts` (definition), `hero-cards/subjects.ts`, `tank-vision/scene.tsx`, `gate-vision/scene.tsx`, `crane-vision/scene.tsx`, `work-vision/scene.tsx`. Changing its signature touches Tank, Gate, Crane, Work Vision and the hero-card row at once.
- `components/vision/container-vision/{container.ts,materials.ts}` — cross-consumed by Tank (`makeRustDecal`), Gate (`buildMaterials`), Crane (`buildContainer`, `H`/`L`, `buildMaterials`, `warmContainerTextures`) and Cargo (same set). Container Vision is a dependency of four other flagships.
- `gate-vision/materials.ts`, `yard-vision/yard.ts`, `crane-vision/crane.ts`, `cargo-vision/cargo.ts`, **`document-vision/document.ts`, `work-vision/work.ts`, `ascii-hero/ascii.ts`** all export a `warm*` function that `_vision/lazy.tsx` calls during idle, alongside `container-vision/materials.ts`'s `warmContainerTextures`. A new scene needs the same pair (module-level cache + exported warm) or its cost lands on the visitor's scroll.
- `crane-vision/`, `cargo-vision/`, `document-vision/`, `work-vision/`, `ascii-hero/` all import the same `_vision` engine surface (`metal`, `palette`, `studio`, `mount`, `camera`, `overlay`) as every other flagship — a signature change there ripples into all nine dynamic scenes, whether their current only home is a lab route (`ascii-hero`) or three production routes at once (`document-vision`, `work-vision`).

## 7. Cross-cutting concerns

- **Auth**: none. `/client-portal` intended-gated per sitemap, no middleware/session check.
- **Nav/header/footer**: `SiteNav` + `SiteFooter` in `app/layout.tsx`. Desktop nav 72px, mobile 64px; Yard/Warehouse/Factory mobile rulers add 44px. Viso Data has no ruler. `/campaigns/*` gets `CampaignFooter` via `ConditionalFooter`.
- **Error/loading handling**: Next.js App Router defaults only.
- **i18n**: none (nav has a language-switcher UI, no locale routing).
- **Reduced motion**: rails honour `prefers-reduced-motion`; Motion Spec v1 gated by media query or explicit JS checks; `<noscript>` fallback in `app/layout.tsx`. **New this cycle**: `/dev/journey` freezes at `p=0.5` and stacks all four captions statically under reduced motion (see `components/journey/journey-scene.tsx`); `StatementVideo` never mounts its `<video>` under reduced motion (checked once on mount, not subscribed).
- **Logging**: none beyond `console.warn`/`console.error` in `app/api/lead/route.ts`.
- **Analytics / consent**: unchanged this cycle — `viso-cookie-consent` in `localStorage`, `viso-consent-change` custom event, GA4 + LinkedIn Insight Tag gated on consent.
- **SEO/indexing**: `lib/seo.ts`'s `pageMeta()`; `components/json-ld.tsx`; `app/robots.ts`/`sitemap.ts`/`manifest.ts`/`opengraph-image.tsx` unchanged this cycle. `/dev/journey` and all 11 `/lab/*` routes are noindexed and excluded from the sitemap, consistent with the existing convention.
- **Lead capture**: `/contact` and every `/campaigns/[slug]` form both submit to `POST /api/lead`.
- **Known dangling anchors**: `/company/offices` (`#offices-list`), `/client-portal` (`#dashboard`/`#request-access`), `/client-portal/register` (`#dashboard`), `/industries`' `ChapterBlock`s (no `id`s yet).
- **Known dead exports**: `components/ui/button.tsx` (`Button`/`buttonVariants`), `components/motion.tsx`'s `DecodeHeadline`, and **`app/platform/viso-yard/sections.tsx`'s `RegisterClose`** (new finding this cycle — defined, exported, zero importers repo-wide; confirmed by grep, not assumed).
- **Known stale copy/labels**: `/industries`' 4 chapters still labeled Yard/Warehouse/Factory/"full platform" rather than the intended industry-vertical names.
- **Media that doesn't exist yet**: `components/statement-video.tsx` references `/media/statement-loop.webm`, `/media/statement-loop.mp4` and `/media/statement-poster.svg`; only the poster SVG is confirmed present under `public/media/` at generation time. The component is built so this is invisible in the rendered page (poster painted as a CSS background regardless of video state) — but do not assume the homepage Statement section actually has motion footage in this build.

## Staleness contract

Regenerate this file when any of the following change:

- `app/**/page.tsx` (route additions/removals, status changes, anchor `id` changes)
- `app/layout.tsx` or any new nested `layout.tsx`
- `components/**`, `lib/**`, or any route-local module (`_shared`, `_media`, `rail`, `sections`, `convert`) — new/removed/renamed exports
- `components.json`, `tsconfig.json`, `package.json` (deps/scripts/aliases) — **including adding a dependency for a single prototype route**, as `gsap`/`lenis` did this cycle: a new top-level `dependencies` entry is structural even if only one file imports it, because it changes what `npm install` pulls for the whole app
- Introduction of any state store, context provider, API client, or middleware (first one added → rewrite §4)
- A scene moving between "lab-only" and "has a production importer" (or back) — this cycle moved Crane, Cargo, Document and Work Vision from lab-only to production-embedded in one pass, which touched §1, §2, §3, §6 and §7 simultaneously; a partial update after a change like this is worse than no update, because the sections start contradicting each other

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
| State | Home + all four platform detail pages (Viso Yard, Viso Warehouse, Viso Factory, Viso Data) plus `/industries`, `/company/about`, `/contact`, `/resources/blog` (+ per-post `[slug]`), `/legal/*` and the `/campaigns/[slug]` ad-landing route are fully built. Several `/resources/*` and `/company/*` routes are still `ComingSoon` stubs, and `/resources/case-studies` is a bare `<div>` shell (see §2). Client-side interactivity: Yard/Warehouse/Factory rails (scroll-spy + a sliding active-tick dot), `DecryptedText` decode effect, `Reveal`/`CountUp`/`UnderlineDraw` motion primitives, `DrawSchematic` SVG draw-on, hover-driven nav mega-menu, a real `/api/lead`-backed contact + campaign lead form, a cookie-consent-gated GA4/LinkedIn tracking loader, and — **now promoted to production** — a set of six live three.js "vision scene" modules (container/tank/gate/yard inspection cams, hero cards, lead card) living in `components/vision/**` on a shared `_vision` engine layer, rendered on the live homepage hero + lead-card band and on all four flagship sections of `/platform/viso-yard`. `app/lab/**` is now six thin noindexed review wrappers around those same `components/vision/**` scenes, not their home. |

## 2. Route/Page map

Root layout `app/layout.tsx` wraps every route with `SiteNav` (top) and `SiteFooter` (bottom). No nested layouts. Status legend: **full** = designed/ported content · **coming-soon** = `ComingSoon` component · **shell** = bare `<div></div>` placeholder (no `ComingSoon`) · **anchors** = empty anchor `<section>`s only.

| Route | File | Status | Renders / anchor ids | Client state? |
|---|---|---|---|---|
| `/` | `app/page.tsx` | full | Hero → Statement → HowItWorks → Metrics → ProofPartners → Testimonials → Convert. Hero headline uses two non-sequential center-decode `DecryptedText` calls split by `<br/>`; every other section's `Reveal` wraps its inner content div, never the `<section>` itself (avoids a background-color flash on light/dark transitions). **This is the former lab home, promoted**: the hero's 4 cards are live `YardCard`/`WarehouseCard`/`FactoryCard`/`DataCard` three.js scenes (not the old static SVGs) and `HowItWorks` carries the live `LeadCardScene`, both via `@/components/vision/_vision/lazy` — `next/dynamic` + a `WhenNear` 1200px-proximity gate keeps three.js off the critical bundle (see PERFORMANCE.md) | no |
| `/platform` | `app/platform/page.tsx` | anchors | `#viso-yard` `#viso-warehouse` `#viso-factory` `#viso-data` (empty stubs) | no |
| `/platform/viso-yard` | `app/platform/viso-yard/page.tsx` | full | hero manifest (now with a subheading `<p>` under the h1) + sticky rail + 9 sections (2 reused from Warehouse); ids `#container-vision` `#tank-vision` `#gate-vision` `#yard-vision` `#crane-vision` `#cargo-vision` `#document-vision` `#work-vision` `#secure-vision`. **Sections 01/02/03/04 (Container/Tank/Gate/Yard) embed the four live flagship three.js scenes** (`ContainerVisionScene`/`TankVisionScene`/`GateVisionScene`/`YardVisionScene`, all from `@/components/vision/_vision/lazy`) in place of the old flat schematic SVGs; sections 05–09 (Crane/Cargo/Document/Work/Secure) are unchanged, still `<Schematic>` SVG draw-ons | rail only |
| `/platform/viso-warehouse` | `app/platform/viso-warehouse/page.tsx` | full | hero manifest (now Yard-style `ManifestLine` + one-line `desc`, no more abbreviation `garnish` strings) + sticky rail + 6 sections (2 reused from Yard); ids `#cargo-vision` `#audit-vision` `#dimension-vision` `#document-vision` `#work-vision` `#secure-vision` | rail only |
| `/platform/viso-data` | `app/platform/viso-data/page.tsx` | full | 3 stacked sections, **no rail** (deep-link via scroll-margin), fully self-contained (own local tokens, no `_shared`/`_media` import); ids `#compression-ai` `#trace-ai` `#detect-ai` | no |
| `/platform/viso-factory` | `app/platform/viso-factory/page.tsx` | full | hero manifest (Yard-style `ManifestLine` + `desc`, same cleanup as Warehouse) + sticky rail + 5 sections (4 reused from Warehouse via a factory→warehouse→yard chain); ids `#production-vision` `#audit-vision` `#dimension-vision` `#work-vision` `#secure-vision` | rail only |
| `/industries` | `app/industries/page.tsx` | full | Intro + 4 `ChapterBlock`s (`CHAPTERS` array — still labeled 01 Yard/02 Warehouse/03 Factory/04 "full platform", **not yet renamed** to industry-vertical labels) + Closing; uses `.doc-grid` layout + `Schematic`→`DrawSchematic`; **no chapter anchor `id`s yet** (pending a future nav dropdown); Closing CTAs use `UnderlineDraw` | draw-schematic + underline-draw |
| `/resources/faqs` | `app/resources/faqs/page.tsx` | full | FAQ accordion | yes — `useState` accordion |
| `/resources/testimonials` | `app/resources/testimonials/page.tsx` | coming-soon | — | no |
| `/resources/roi-calculator` | `app/resources/roi-calculator/page.tsx` | coming-soon | — | no |
| `/resources/whitepapers` | `app/resources/whitepapers/page.tsx` | coming-soon | — | no |
| `/resources/webinars` | `app/resources/webinars/page.tsx` | coming-soon | — | no |
| `/resources/documentation` | `app/resources/documentation/page.tsx` | coming-soon | — | no |
| `/resources/glossary` | `app/resources/glossary/page.tsx` | coming-soon | — | no |
| `/resources/press-kit` | `app/resources/press-kit/page.tsx` | coming-soon | — | no |
| `/company/about` | `app/company/about/page.tsx` | full | About stats/timeline + Team grid (**3-column** `md:grid-cols-3`, 6 members) | no |
| `/company/offices` | `app/company/offices/page.tsx` | full | Offices list + `OfficesGlobe` SVG; dangling `#offices-list` link (no matching id) | no |
| `/company/careers` | `app/company/careers/page.tsx` | coming-soon | — | no |
| `/company/newsroom` | `app/company/newsroom/page.tsx` | coming-soon | — | no |
| `/company/investor-relations` | `app/company/investor-relations/page.tsx` | coming-soon | — | no |
| `/company/partners` | `app/company/partners/page.tsx` | coming-soon | — | no |
| `/company/sustainability` | `app/company/sustainability/page.tsx` | coming-soon | — | no |
| `/contact` | `app/contact/page.tsx` | full | **Client component** — `handleSubmit` posts Name/Email/Phone/**Subject**/Message `FormData` to `POST /api/lead` (`source: "contact"`), replacing the earlier `mailto:` composer | yes — form fields (uncontrolled, read via `FormData` on submit) |
| `/client-portal` | `app/client-portal/page.tsx` | full | Login card via `./_shared`; `#dashboard`/`#request-access` still dangling, but its "Forgot password" link now points at the real `/client-portal/reset-password` route | intended per sitemap ⚠ no actual auth check |
| `/client-portal/register` | `app/client-portal/register/page.tsx` | full | Register card via `../_shared`; dangling `#dashboard` | no |
| `/client-portal/reset-password` | `app/client-portal/reset-password/page.tsx` | full | Reset-password card via `../_shared`, same design system as login/register | no |
| `/legal/privacy-policy` | `app/legal/privacy-policy/page.tsx` | full | Static legal copy; in sitemap | no |
| `/legal/terms-and-conditions` | `app/legal/terms-and-conditions/page.tsx` | full | Static legal copy; in sitemap | no |
| `/campaigns/[slug]` | `app/campaigns/[slug]/page.tsx` | full, **dynamic (SSG via `generateStaticParams`)** | Paid-ad landing page ("Signal split" layout) rendered by `CampaignLanding`, driven by the `CAMPAIGNS`/`MODULES` registry in `app/campaigns/data.ts`; **`noindex`, excluded from `sitemap.xml`** (paid destinations, not organic). Root layout swaps the full `SiteFooter` for a slim `CampaignFooter` on this route via `ConditionalFooter` | yes — lead form posts to `/api/lead` |
| `/api/lead` | `app/api/lead/route.ts` | API route (`POST`, `runtime: "nodejs"`) | Shared lead-capture endpoint for both the campaign form and `/contact`; validates name+email+phone, emails the team via Resend if `RESEND_API_KEY`/`LEAD_NOTIFICATION_EMAIL` are set, otherwise logs and still returns `{ok:true}` | — |
| `/resources/blog` | `app/resources/blog/page.tsx` | **full** (no longer a shell) | Masthead-style index rendering `BlogList` (desktop + mobile variants) over the 5 real posts in `posts.ts` | no |
| `/resources/blog/[slug]` | `app/resources/blog/[slug]/page.tsx` | full, **dynamic (SSG via `generateStaticParams`)** | Per-post crawlable article page, server-rendered from `FULL_POSTS` (`posts.ts`) via `PostBody`; emits a `BlogPosting` JSON-LD block (`articleSchema`); each post is also in `sitemap.xml` | no |
| `/resources/case-studies` | `app/resources/case-studies/page.tsx` | **shell** (bare `<div></div>`, `noindex`) | — still unbuilt | no |
| `/dev/viso-yard-light` | `app/dev/viso-yard-light/page.tsx` | full, **dev-only iteration route** | A parallel light-theme fork of `/platform/viso-yard` (own `_shared`/`_media`/`rail`/`sections`/`convert`/`warehouse-sections` in `app/dev/viso-yard-light/`) used to trial a light palette without touching the live route | rail only |
| `/lab/*` | `app/lab/**/page.tsx` | **experimental — see note below** | 6 routes (see the lab note directly below) | varies |

**Lab routes are experimental prototypes: never linked from nav/footer, never in `sitemap.xml`, and every one sets `robots: { index: false, follow: false }`.** Since the restructure below, the lab tree holds no scene code of its own — every route is a thin `page.tsx` wrapper (staging chrome + an aspect-ratio box) importing the real scene from `components/vision/**`, kept around purely to review a scene in isolation from its production page. `/lab/home`, `/lab/home-layouts` and `/lab/viso-yard` (the full-page clones) are **deleted** — the homepage and Viso Yard now carry the live scenes directly, so there is nothing left for those forks to iterate ahead of. Current routes:

| Route | File | Purpose |
|---|---|---|
| `/lab/hero-cards` | `app/lab/hero-cards/page.tsx` (imports `DataCard`/`FactoryCard`/`WarehouseCard`/`YardCard` from `@/components/vision/_vision/lazy`) | Reproduces the homepage's desktop hero-card band geometry so the four card scenes (Yard/Warehouse/Factory/Data) can be reviewed side by side at real on-page size, independent of the homepage |
| `/lab/lead-card` | `app/lab/lead-card/page.tsx` (imports `LeadCardScene` default export from `@/components/vision/lead-card/scene`, ungated) | Standalone stage for the lead-card scene at its real light-surface proportions |
| `/lab/container-vision` | `app/lab/container-vision/page.tsx` (imports `ContainerVisionScene` default export from `@/components/vision/container-vision/scene`, ungated) | Standalone stage for the Container Vision flagship scene, at the schematic's 1600×680 aspect ratio |
| `/lab/tank-vision` | `app/lab/tank-vision/page.tsx` (imports `TankVisionScene` from `@/components/vision/_vision/lazy`) | Standalone stage for Tank Vision — split out because reviewing it via a full Viso Yard clone means loading a 20,000px page with two other live WebGL scenes on it |
| `/lab/gate-vision` | `app/lab/gate-vision/page.tsx` (imports `GateVisionScene` default export from `@/components/vision/gate-vision/scene`, ungated) | Standalone stage for the Gate Vision flagship scene |
| `/lab/yard-vision` | `app/lab/yard-vision/page.tsx` (imports `YardVisionScene` from `@/components/vision/_vision/lazy`) | Standalone stage for Yard Vision, section 04's flagship. Unlike the Tank/Container lab pages this one has a DARK page background, because the section is dark and the scene's container hexes are chosen against it |

Note the split within the lab tree itself: the Container/Gate/Lead-card lab pages import their scene's own default export directly (no `WhenNear`/dynamic gating — the lab page is the only thing on the page, so there's nothing to delay-load for), while Tank/Yard/hero-cards go through `_vision/lazy`'s gated named exports, same as production.

Shared vision-scene infrastructure now lives in `components/vision/_vision/` (moved from `app/lab/_vision/`; imported by every lab route above, `app/page.tsx`, and `app/platform/viso-yard/sections.tsx` — i.e. it is load-bearing for two production routes, not a lab-only dead end anymore): `lazy.tsx` (`ContainerVisionScene`, `TankVisionScene`, `GateVisionScene`, `YardVisionScene`, `LeadCardScene`, `YardCard`, `WarehouseCard`, `FactoryCard`, `DataCard` — note `YardVisionScene` is section 04's aerial flagship and `YardCard` is the small homepage hero tile; different scenes, similar names — each a `WhenNear`-gated dynamic import, see PERFORMANCE.md/DECISIONS.md for the idle-build behaviour), `mount.ts` (`mountWhenVisible`), `studio.ts` (`createStudio`, `StudioOpts`/`Studio` — the shared renderer/PMREM/composer/lights rig; `components/vision/container-vision/scene.tsx` is the one flagship that still doesn't use it, deliberately, per DECISIONS.md), `metal.ts` (`makeMetal`, `tintMetal`, `warmMetalCache`, `CANONICAL_BRUSHED`, `metalBox`, `MetalKind`/`MetalOpts`/`Metal`), `camera.ts` (`makeCamPath`, `blendPose`, `placeCamera`, `CamKey`/`CamPose`/`Opening`, easing helpers), `overlay.ts` (`createCallout`, `placeCallout`, `createReadout`, `makeProjector`, `Lane`/`CalloutSpec`/`Callout`/`Readout`; `CalloutSpec.onDark` switches the leader line to light ink for scenes on the dark canvas), `palette.ts` (`PALETTE`, `sans`).

Each flagship scene also lives in its own `components/vision/<name>-vision/` folder alongside `_vision/`: `container-vision/` (`scene.tsx` default export + `container.ts` geometry, `materials.ts` textures/decals incl. `warmContainerTextures`, `hud.ts`, `palette.ts` re-exporting `_vision/palette`), `gate-vision/` (`scene.tsx` default export + `gate.ts`, `materials.ts` incl. `warmGateTextures`), `tank-vision/` (`scene.tsx` default export only), `yard-vision/` (`scene.tsx` default export + `yard.ts` incl. `warmYardTextures`), `hero-cards/` (`index.tsx` — `YardCard`/`WarehouseCard`/`FactoryCard`/`DataCard`, no default export — plus `card-scene.tsx`, `subjects.ts`, `detect.ts`, `ground.ts`, `skins.ts`), `lead-card/` (`scene.tsx` default export only).

**No route groups. Two dynamic-segment routes exist: `app/resources/blog/[slug]` and `app/campaigns/[slug]`, both SSG via `generateStaticParams`.** No `not-found.tsx`/`error.tsx`/`loading.tsx` overrides. `app/layout.tsx`'s title now reads `"Visotonics — Vision-AI Platform for Industrial Operations"` (default title, templated as `"%s — Visotonics"` for leaf pages), sourced from `DEFAULT_TITLE` in `lib/seo.ts` — supersedes the previously-recorded "AI Vision Platform" wording. `app/icon.png` supplies the favicon. `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` and `app/opengraph-image.tsx` are all present (file-convention routes, not `page.tsx`): robots allows all crawlers (including AI/LLM bots) except `/client-portal`; sitemap is a hand-curated allowlist of built/indexable routes plus every blog post, deliberately excluding stubs, the auth surface and `/campaigns/*`; manifest reuses `app/icon.png`; the OG image is a generated 1200×630 branded card via `next/og`.

## 3. Component/Module index

### Global chrome & primitives
| Symbol | File | Type | Consumed by | Consumes |
|---|---|---|---|---|
| `RootLayout` | `app/layout.tsx` | layout (default) | Next.js router | `SiteNav`, `SiteFooter`, `Archivo`/`IBM_Plex_Mono`, `./globals.css`, noscript motion fallback |
| `SiteNav` | `components/site-nav.tsx` | **client** (7 `useState` for menu/mobile/accordion/language; 1 `useEffect` pointerdown-outside-close listener) | `RootLayout` | `Brand`; platform/resources/company link data; `productHref()` builds `…/viso-*#<slug>` deep links |
| `SiteFooter` | `components/site-footer.tsx` | component (server) | `RootLayout` | `Brand`; link data |
| `Brand` | `components/brand.tsx` | component (server, plain `<img>`) | `SiteNav`, `SiteFooter` | — |
| `DecryptedText` (default export) | `components/decrypted-text.tsx` | **client** (heavy `useState`/`useEffect`/`useCallback`/`useMemo`, 2 IntersectionObservers, rAF loop + `setInterval` scramble) | `app/page.tsx`, viso-yard/page.tsx, viso-warehouse/page.tsx, viso-factory/page.tsx (not viso-data or industries) | — |
| `Reveal`, `CountUp`, `UnderlineDraw`, `DecodeHeadline` | `components/motion.tsx` | **client** (each own IntersectionObserver) | `Reveal`/`CountUp` used by `app/page.tsx` and elsewhere; `UnderlineDraw` used by `app/industries/page.tsx` (Closing CTAs) and `app/page.tsx` (Testimonials "Share your experience" links); `DecodeHeadline` exported, ⚠ zero current importers (dead code) | — |
| `DrawSchematic` | `components/draw-schematic.tsx` | **client** (`useLayoutEffect`/`useEffect`, 1 IntersectionObserver, manual stroke-dashoffset animation, 3-act `setTimeout` sequence) | `app/platform/viso-yard/_media.tsx` (`Schematic` wrapper) | — |
| `ComingSoon` | `components/coming-soon.tsx` | component (server) | 12 coming-soon stub routes (§2) — highest fan-in in the tree | — |
| `Button`, `buttonVariants` | `components/ui/button.tsx` | component (shadcn, cva) | ⚠ unused — no importers found in `app/` | `cn`, `ButtonPrimitive`, `cva` |
| `cn` | `lib/utils.ts` | util | `components/ui/button.tsx` | `clsx`, `tailwind-merge` |
| `JsonLd`, `organizationSchema`, `websiteSchema`, `productSchema`, `faqSchema`, `articleSchema` | `components/json-ld.tsx` | component (server) + plain functions | `RootLayout` (org+website, once); `productSchema`/`faqSchema` by platform/FAQ pages; `articleSchema` by `app/resources/blog/[slug]/page.tsx` | `lib/seo.ts` |
| `ConsentBanner`, `useConsent`, `readConsent` | `components/analytics/consent-banner.tsx` | **client** (`useState`/`useEffect`, `localStorage` + custom-event broadcast) | `RootLayout`; `useConsent` also consumed by `TrackingScripts` | — |
| `TrackingScripts`, `trackEvent`, `trackLinkedInConversion` | `components/analytics/tracking-scripts.tsx` | **client** (`next/script`, gated on `useConsent()==="granted"`) | `RootLayout` | `useConsent` |
| `ConditionalFooter` | `components/campaign/campaign-chrome.tsx` | **client** (`usePathname`) | `RootLayout` — swaps `SiteFooter`↔`CampaignFooter` on `/campaigns/*` | — |
| `CampaignFooter`, `CampaignLanding` | `components/campaign/campaign-footer.tsx`, `components/campaign/campaign-landing.tsx` | components | `RootLayout` (footer) / `app/campaigns/[slug]/page.tsx` (landing) | `app/campaigns/data.ts` (`CAMPAIGNS`, `MODULES`, `getCampaign`) |

### Viso Yard route modules (`app/platform/viso-yard/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoYardPage` | `page.tsx` (default) | hero manifest + subheading + rail + 9 sections + `Convert`. Imports `SectionSecure, SectionWork` **from `../viso-warehouse/sections`** (own eyebrow numbers overridden via `n="08"`/`n="09"` prop) |
| `YardRailDesktop`, `YardRulerMobile`, `RAIL_SECTIONS` | `rail.tsx` | **client**; scroll-spy via `useState` + scroll/resize/hashchange listeners (rAF-throttled, no IntersectionObserver — deliberate, keeps working when tab backgrounded). Desktop rail's active-tick marker is now a single sliding `<span>` (`dotTop` state, measured via `containerRef`/`itemRefs` `getBoundingClientRect()`, transitions `top`) instead of a per-tick opacity fade |
| `SectionContainer`, `SectionTank`, `SectionGate`, `SectionYard`, `SectionCrane`, `SectionCargo`, `SectionDocument`, `PlatformBand` | `sections.tsx` | ⚠ `SectionCargo` + `SectionDocument` re-exported by Viso Warehouse |
| `Convert` | `convert.tsx` | home-convert clone |
| tokens + `Cross`, `Dot`, `Verticals`, `eyebrow`, `SHEET`, `ANCHOR_OFFSET`, colour consts | `_shared.tsx` | ⚠ high fan-in — imported by Yard + Warehouse + Factory page/sections (6 files) |
| `Schematic` | `_media.tsx` | server-only; reads SVG from `public/assets` via `node:fs`, module-level cache; delegates draw animation to `DrawSchematic`. ⚠ imported by Warehouse, Factory, and `app/industries/page.tsx` |

### Viso Warehouse route modules (`app/platform/viso-warehouse/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoWarehousePage` | `page.tsx` (default) | hero manifest (Yard-style `ManifestLine` component + `desc` field, `garnish` abbreviation strings removed) + rail + 6 sections + `Convert` |
| `WarehouseRailDesktop`, `WarehouseRulerMobile`, `RAIL_SECTIONS` | `rail.tsx` | **client**; same scroll-spy pattern as Yard rail, same sliding-dot marker |
| `SectionAudit`, `SectionDimension`, `SectionWork({n="05"})`, `SectionSecure({n="06"})` | `sections.tsx` | `SectionWork`/`SectionSecure` take an optional `n` eyebrow-number prop (default "05"/"06") so Yard can override to "08"/"09". Also re-exports `SectionCargo`, `SectionDocument` from `../viso-yard/sections` |
| `Convert` | `convert.tsx` | clone; CTA → `/platform/viso-warehouse` |
| (imports `_shared` + `_media` from `../viso-yard`) | — | no local `_shared`/`_media` |

### Viso Factory route modules (`app/platform/viso-factory/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoFactoryPage` | `page.tsx` (default) | hero manifest (same `ManifestLine`/`desc` cleanup as Warehouse) + rail + 5 sections + `Convert` |
| `FactoryRailDesktop`, `FactoryRulerMobile` | `rail.tsx` | **client**; same scroll-spy pattern, same sliding-dot marker |
| `SectionProduction` (factory-authored "the feed") + re-exports `SectionAudit`, `SectionDimension`, `SectionWork`, `SectionSecure` | `sections.tsx` | re-exports pulled **from `../viso-warehouse/sections`** — factory → warehouse → yard is a two-hop dependency chain |
| `Convert` | `convert.tsx` | clone; CTA → this route |
| (imports `_shared` + `_media` from `../viso-yard`) | — | no local `_shared`/`_media` |

### Viso Data route module (`app/platform/viso-data/`)
| Symbol | File | Notes |
|---|---|---|
| `VisoDataPage` | `page.tsx` (default) | self-contained; `CompressionAI` (light), `TraceAI` (light), `DetectAI` (dark). Own local tokens/`Cross`/`LightCorners`/`SHEET` — no rail, no `_shared`/`_media` import (deliberate isolation). Each section's own inline background (no shared ambient canvas), so `Reveal` wraps the inner content div per section rather than the `<section>` |

### Industries route module (`app/industries/`)
| Symbol | File | Notes |
|---|---|---|
| `IndustriesPage` | `page.tsx` (default) | data-driven long-form document: `Intro` + `CHAPTERS.map(ChapterBlock)` + `Closing`; uses `.doc-grid` CSS layout and `Schematic` (from `../platform/viso-yard/_media`) for figures. `Band` (shared by Intro/ChapterBlock/Closing) takes an optional `reveal` prop — when true, wraps its content children in `Reveal` without touching the `<section>`'s own background, so `ChapterBlock`/`Closing` reveal but `Intro` (above the fold) doesn't. Closing's two CTA links use `UnderlineDraw` |

## 4. State & data flow

No global store, context provider, API client, or server action anywhere in the app. `/contact`'s form submit is the one "backend" interaction, and it's just a client-side `mailto:` composer — no network request. Client-side state is scattered across these `"use client"` files:

- `components/site-nav.tsx` — 7 `useState` (menu/mobile/accordion/language UI) + 1 `useEffect` (pointerdown-outside-close). The Platform/Resources/Company mega-menus now open on **hover** (`onMouseEnter` on each trigger, in addition to the existing `onClick`) as well as click; the three panels are merged into one conditionally-rendered wrapper (`openMenu === "platform" || "resources" || "company"`) that stays mounted while switching between them, with a `key={openMenu}` + `.nav-mega-fade` CSS animation crossfading the swap. A `onMouseLeave` on the outer nav row closes whatever's open (except the language dropdown, which keeps its click-driven behavior).
- `components/decrypted-text.tsx` — 6 `useState`, 2 IntersectionObservers, rAF loop + `setInterval` scramble.
- `components/motion.tsx` — `Reveal` (IntersectionObserver, threshold 0.2, one-shot via `data-revealed`), `CountUp` (IntersectionObserver threshold 0.6 + `setTimeout` tick loop, mutates DOM text directly, no React state), `UnderlineDraw` (IntersectionObserver threshold 0.6, one-shot `data-drawn` — CSS `.dt-underline-draw` also draws on hover independent of this), `DecodeHeadline` (1 `useState` + `setTimeout`, currently unused).
- `components/draw-schematic.tsx` — no `useState`; `useLayoutEffect`/`useEffect`, 1 IntersectionObserver (**threshold 0.35**, was 0.25), manual SVG stroke-dashoffset mutation + nested `setTimeout`s (3-act sequence).
- `app/platform/viso-yard/rail.tsx`, `viso-warehouse/rail.tsx`, `viso-factory/rail.tsx` — each: 1 `useState` (`active`) + `useRef` + `useEffect` registering scroll/resize/hashchange window listeners (rAF-throttled rect reads, no IntersectionObserver by design), **plus** (desktop rail only) a second `useState` (`dotTop`) + two more `useRef`s (`containerRef`, `itemRefs`) driving the sliding active-tick marker.
- `app/resources/faqs/page.tsx` — `useState` accordion open/close.
- `app/contact/page.tsx` — now `"use client"`; no React state, but a `handleSubmit` `FormEvent` handler reads `FormData` from the form and navigates to a constructed `mailto:` URL.

Everything else is a static server component.

## 5. Shared config & constants

| Name | File | Used where |
|---|---|---|
| shadcn config | `components.json` | `npx shadcn add` only |
| Tailwind v4 tokens/theme | `app/globals.css` | global (CSS-first, no `tailwind.config.ts`); `.on-light` band helper, `.dt-*` interaction classes (including new `.dt-underline-draw`), `.doc-grid` (industries reading grid), Motion Spec v1 tokens (`.v-reveal`, `.v-reveal-mono`, `.v-dec`, `.v-enc`), `.nav-mega-fade` keyframe (nav mega-menu crossfade) |
| Path alias `@/*` | `tsconfig.json` | all imports |
| Dev server launch config | `.claude/launch.json` | Claude Code preview tooling, port 3000 |
| Font vars `--font-archivo`, `--font-plex-mono` | `app/layout.tsx` | `<html>` className → consumed as `sans`/`mono` throughout |
| Drafting-sheet tokens + primitives | `app/platform/viso-yard/_shared.tsx` | Yard + Warehouse + Factory sections/pages |
| Schematic SVG assets | `public/assets/*.svg` | inlined by `Schematic`; includes `audit-*`, `visotonics-dimension-*`, `warehouse-work-*`, `warehouse-secure-*`, `factory-production-*`, plus industries-page figures |
| Motion Spec v1 (reduced-motion + noscript fallback) | `app/globals.css` + `app/layout.tsx` | site-wide `.v-reveal`/`.v-reveal-mono`/`.v-dec`/`.dt-underline-draw` gated by `prefers-reduced-motion: no-preference` (or its own explicit override); `<noscript>` forces final visible state |
| Favicon | `app/icon.png` | Next.js App Router auto-detected icon (replaces the old default `app/favicon.ico`) |

Env vars (all optional — features degrade gracefully when unset, see §7): `RESEND_API_KEY`, `LEAD_NOTIFICATION_EMAIL`, `LEAD_FROM_EMAIL` (`/api/lead`); `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_LINKEDIN_PARTNER_ID` (`TrackingScripts`). No feature flags.

## 6. Blast radius / dependency edges

- `app/platform/viso-yard/_shared.tsx` → Yard page+sections, Warehouse page+sections, Factory page+sections (6 files). High fan-in; treat tokens/primitives as a stable API.
- `app/platform/viso-yard/_media.tsx` (`Schematic`) → Yard, Warehouse, Factory sections, and `app/industries/page.tsx` (4 consumers).
- `app/platform/viso-yard/sections.tsx` (`SectionCargo`, `SectionDocument`) → re-exported by `viso-warehouse/sections.tsx`. Editing either yard component changes both routes.
- `app/platform/viso-warehouse/sections.tsx` (`SectionWork`, `SectionSecure`) → imported directly by `viso-yard/page.tsx` (with `n` prop override) **and** re-exported through `viso-factory/sections.tsx` — a factory→warehouse→yard two-hop chain. Editing either component changes Warehouse, Yard, and Factory simultaneously.
- `components/decrypted-text.tsx` → home + Yard + Warehouse + Factory hero titles (4 consumers).
- `components/motion.tsx`'s `UnderlineDraw` → `app/industries/page.tsx` + `app/page.tsx` (2 consumers so far; the `.dt-underline-draw` CSS class it depends on is a shared, extensible utility).
- `components/coming-soon.tsx` → 12 stub routes — highest fan-in in the tree.
- `components/brand.tsx` → `SiteNav` + `SiteFooter`.
- `app/layout.tsx` → every route (nav/footer chrome, fonts, noscript motion fallback, metadata, favicon, JSON-LD, consent banner, tracking scripts, conditional footer).
- `app/api/lead/route.ts` → the single lead-capture backend for both `/contact` and every `/campaigns/[slug]` form; changing its required-field contract (`name`/`email`/`phone`) breaks both call sites at once.
- `components/analytics/consent-banner.tsx`'s `useConsent` → `TrackingScripts` (gates all analytics loading) and the banner itself; nothing else reads consent yet.
- `components/site-nav.tsx` `productHref()` → the `#`-anchor ids in each platform detail page; renaming a section id breaks a nav deep link.
- `cn` (`lib/utils.ts`) → only `components/ui/button.tsx` (still low fan-in; `Button` itself is currently unused).
- `components/vision/_vision/*` → **verified by grep, no longer a lab-only dead end.** Importers: all 6 `/lab/*` routes, `app/page.tsx` (hero cards + lead card via `lazy.tsx`), and `app/platform/viso-yard/sections.tsx` (all 4 flagship scenes via `lazy.tsx`). `components/vision/**` is now load-bearing for `/` and `/platform/viso-yard` — a change to `_vision/studio.ts`, `camera.ts`, `overlay.ts`, `metal.ts` or `mount.ts` changes every scene on both live routes at once, not just lab review pages.
- `app/dev/viso-yard-light/` still carries its **own** forked copies of `_shared`/`rail`/`sections`/`convert`/`warehouse-sections` rather than importing the production `app/platform/viso-yard/` modules or `components/vision/**` (confirmed: no `components/vision` or lab imports found in `app/dev/viso-yard-light/`) — edits to the production Yard route or its scenes do not propagate to this fork, and vice versa. This is now the **only** surviving Yard fork; the `app/lab/viso-yard/` full-page clone that used to be the other one is deleted.
- `components/vision/hero-cards/skins.ts`, `detect.ts` and `ground.ts` are shared subject-building modules consumed well beyond the hero-card row: `yard-vision/yard.ts` imports `skins.ts` (container liveries for its 55-container aerial), `yard-vision/scene.tsx` and `tank-vision/scene.tsx` import `detect.ts` + `ground.ts`, `gate-vision/scene.tsx` imports `ground.ts`, and `lead-card/scene.tsx` and `hero-cards/card-scene.tsx` import `detect.ts`. Changing any of the three affects Yard Vision, Tank Vision, Gate Vision, Lead Card and the homepage hero cards simultaneously — not just the card row it was named for.
- `components/vision/container-vision/materials.ts` is also cross-consumed: `tank-vision/scene.tsx` imports its `makeRustDecal`, and `gate-vision/scene.tsx` imports its `buildMaterials`. Container Vision is therefore a dependency of two other flagships, not a standalone scene.
- `gate-vision/materials.ts` and `yard-vision/yard.ts` both export a `warm*Textures()` that `_vision/lazy.tsx` calls during idle (alongside `container-vision/materials.ts`'s `warmContainerTextures`). A new scene that generates textures needs the same pair (module-level cache + exported warm) or its cost lands on the visitor's scroll — see PERFORMANCE.md.

## 7. Cross-cutting concerns

- **Auth**: none. `/client-portal` is intended-gated per sitemap but has no middleware/session check.
- **Nav/header/footer**: `SiteNav` + `SiteFooter` in `app/layout.tsx`. Desktop nav is 72px, mobile nav 64px; the Yard/Warehouse/Factory mobile rulers add 44px (anchor `scroll-margin` = 108px mobile / 72px desktop via `ANCHOR_OFFSET`). Viso Data has no ruler (offset 64px mobile / 72px desktop). Desktop mega-menus are now hover-driven with a crossfade between panels (see §4). `/campaigns/*` routes get a slim `CampaignFooter` instead of the full `SiteFooter` (`ConditionalFooter`, keyed on `usePathname()`).
- **Error/loading handling**: Next.js App Router defaults only.
- **i18n**: none (nav has a language switcher UI, but no locale routing).
- **Reduced motion**: rails honour `prefers-reduced-motion` (instant scroll, and the sliding dot's `top`/`opacity` transitions are zeroed by the global duration tokens); Motion Spec v1 (`.v-reveal`/`.v-reveal-mono`/`.v-dec`/`.dt-underline-draw`) gated by `@media (prefers-reduced-motion: no-preference)` or explicit JS checks; `<noscript>` fallback in `app/layout.tsx` forces final visible state with no JS.
- **Logging**: none, other than `console.warn`/`console.error` in `app/api/lead/route.ts` when Resend isn't configured or rejects a send.
- **Analytics / consent**: `components/analytics/consent-banner.tsx` stores the visitor's choice (`granted`/`denied`/`unset`) in `localStorage` under `viso-cookie-consent` and broadcasts changes via a `viso-consent-change` custom event (no reload needed). `components/analytics/tracking-scripts.tsx` renders GA4 (`NEXT_PUBLIC_GA_ID`) and the LinkedIn Insight Tag (`NEXT_PUBLIC_LINKEDIN_PARTNER_ID`) only once consent is `"granted"` — both env vars are optional and each script is skipped independently if unset. Exposes `trackEvent`/`trackLinkedInConversion` helpers for firing events on lead-form success. The banner's own copy is explicitly a technical placeholder, not final legal wording (see DECISIONS.md).
- **SEO/indexing**: `lib/seo.ts`'s `pageMeta()` is the single helper every route's `metadata` export should go through (canonical, OG, Twitter, optional `noindex`). `components/json-ld.tsx` emits Organization/WebSite (root layout, always) plus per-page Product/FAQ/Article schemas. `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts`, `app/opengraph-image.tsx` are the file-convention SEO routes (see §2 for what each does).
- **Lead capture**: `/contact` and every `/campaigns/[slug]` form both submit to `POST /api/lead`, which requires name+email+phone and emails the team via Resend when configured — no separate backend per form, and no more `mailto:` composer (that mechanism has been replaced).
- **Known dangling anchors**: `/company/offices` (`#offices-list`), `/client-portal` (`#dashboard`/`#request-access` — its former `#reset` link now correctly points at the real `/client-portal/reset-password` route, no longer dangling), `/client-portal/register` (`#dashboard`), and `/industries`' `ChapterBlock`s (no `id`s yet, needed before a future Industries nav dropdown can deep-link to them).
- **Known dead exports**: `components/ui/button.tsx` (`Button`/`buttonVariants`), `components/motion.tsx`'s `DecodeHeadline` — no current importers.
- **Known stale copy/labels**: `/industries`' 4 chapters are still labeled by product line (Yard/Warehouse/Factory/"full platform") rather than the intended industry verticals (Ports & Terminals / Warehousing & Distribution / Manufacturing / Logistics & Supply Chain) — a planned rename that hasn't landed yet.

## Staleness contract

Regenerate this file when any of the following change:

- `app/**/page.tsx` (route additions/removals, status changes, anchor `id` changes)
- `app/layout.tsx` or any new nested `layout.tsx`
- `components/**`, `lib/**`, or any route-local module (`_shared`, `_media`, `rail`, `sections`, `convert`) — new/removed/renamed exports
- `components.json`, `tsconfig.json`, `package.json` (deps/scripts/aliases)
- Introduction of any state store, context provider, API client, or middleware (first one added → rewrite §4)

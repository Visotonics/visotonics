# File locations — what lives where

What this is: a directory map of the codebase. For anyone (including a new engineer) who needs to find where to make a change.

## `app/` — every page and route

Next.js App Router: each folder under `app/` with a `page.tsx` is a URL. See `01-sitemap.md` for the full list.

- `app/page.tsx` — the homepage
- `app/layout.tsx` — the one shared shell (nav + footer) wrapping every page, no nested layouts
- `app/platform/viso-yard/`, `viso-warehouse/`, `viso-factory/`, `viso-data/` — the 4 product pages. Yard, Warehouse and Factory share code (`_shared.tsx`, `_media.tsx`, and section components re-exported between them — see `03-dependency-map.md`)
- `app/company/`, `app/resources/`, `app/legal/` — content sections, mostly static
- `app/client-portal/` — login/register/reset UI, no backend
- `app/campaigns/[slug]/` + `app/campaigns/data.ts` — ad-landing pages, one file holds all campaign content
- `app/api/lead/route.ts` — the one backend endpoint (lead capture)
- `app/lab/**` — internal review pages for the 3D scenes, not part of the real site
- `app/dev/journey/` — an isolated homepage-interaction prototype, not linked anywhere
- `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/opengraph-image.tsx` — SEO/meta config
- `app/globals.css` — site-wide design tokens and Tailwind setup

Touch `app/**` when: adding/removing a page, changing what a specific page shows.

## `components/` — shared UI

- `components/site-nav.tsx`, `site-footer.tsx`, `brand.tsx` — global chrome, on every page via `layout.tsx`
- `components/coming-soon.tsx` — the placeholder used by all 12 unbuilt stub pages
- `components/motion.tsx` — scroll-reveal / count-up / underline-draw animation primitives, used widely
- `components/decrypted-text.tsx` — the "decoding" text effect on hero headlines
- `components/draw-schematic.tsx` — SVG line-drawing reveal effect
- `components/json-ld.tsx` + `lib/seo.ts` — structured data / SEO metadata helpers
- `components/analytics/` — cookie consent banner + GA4/LinkedIn tracking loader
- `components/campaign/` — the paid-landing-page chrome (footer swap, lead form modal, video modal)
- `components/legal-doc.tsx` — shared layout for the two legal pages
- `components/statement-video.tsx` — background video slot on the homepage "Statement" section (poster image ships today; real video is a file drop away, no code change needed)
- `components/journey/` — supports `/dev/journey` only, isolated from the rest of the site
- `components/ui/button.tsx` — a shadcn button component that is currently unused anywhere (dead code)

Touch `components/**` when: changing something that appears on more than one page.

## `components/vision/` — the 3D product scenes

See `04-animations.md` for what each scene shows. Structurally:

- `components/vision/_vision/` — the shared "engine": camera math, lighting/studio setup, material/texture caching, mount/lazy-load gating, overlay/callout drawing, the colour palette. Every scene depends on this.
- One folder per scene: `container-vision/`, `tank-vision/`, `gate-vision/`, `yard-vision/`, `crane-vision/`, `cargo-vision/`, `document-vision/`, `work-vision/`, `ascii-hero/`, `hero-cards/`, `lead-card/`. Each has a `scene.tsx` (a vanilla three.js scene built imperatively in a `useEffect`, not react-three-fiber) and usually a same-named `.ts` file with the geometry/materials logic.

Touch `components/vision/_vision/**` when: you need a change that should apply to every scene — and know it will ripple everywhere (see `03-dependency-map.md`). Touch a specific scene folder when the change is only about that one product.

## `lib/`

- `lib/seo.ts` — page metadata helper (`pageMeta()`)
- `lib/utils.ts` — small shared utility (`cn` class-merge helper)
- `lib/journey-scroll.ts` — scroll-position state for the `/dev/journey` prototype only

## `public/`

- `public/assets/` — SVG schematics (product diagrams used on platform pages), blog cover images, partner/client logos (`logos-color/` full-colour, `logos-light/` flattened mono versions)
- `public/images/team/` — About page team photos
- `public/media/` — homepage Statement section background video assets. Only the poster SVG exists today; the actual `.webm`/`.mp4` loop files referenced in code are not present yet.

## `context/`

- `context/CLAUDE.md` — engineering conventions for this repo (not user-facing)

## `scripts/`

- `scripts/trim-logos.mjs` — one-off Node script used to crop/clean partner logo PNGs before they were dropped into `public/assets/logos-color/`

## Root-level docs

- `touchmatrix.md` — dense engineering reference (routes → components → state), regenerated after structural changes
- `DECISIONS.md` — dated log of design/engineering decisions and why they were made
- `PERFORMANCE.md` — record of what has and hasn't sped up the 3D scenes, with numbers
- `CLAUDE.md` / `context/CLAUDE.md` — instructions for AI coding agents working in this repo

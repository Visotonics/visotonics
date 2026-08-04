# Dependency map — what will I break

What this is: which files are safe to change in isolation, and which ones ripple across many pages. For anyone (including a non-engineer briefing an engineer) sanity-checking the size of a change before it's made.

Source: cross-checked against `touchmatrix.md`'s dependency section and confirmed by reading the actual import chains.

## High fan-in files — change these carefully

| File | Used by | What breaks if you change it |
|---|---|---|
| `components/coming-soon.tsx` | 12 stub pages | The look of every "coming soon" page site-wide |
| `app/platform/viso-yard/_shared.tsx` | Viso Yard, Warehouse, Factory pages + sections | Shared drafting-sheet visual tokens across all 3 product pages |
| `app/platform/viso-yard/_media.tsx` (`Schematic`) | Yard, Warehouse, Factory, `/industries` | The SVG-schematic rendering used across product + industries pages |
| `components/decrypted-text.tsx` | Home + Yard/Warehouse/Factory hero titles | The "decoding" headline effect everywhere it appears |
| `app/api/lead/route.ts` | `/contact` + every `/campaigns/[slug]` | The one lead-capture backend for the whole site |
| `components/site-nav.tsx` (`productHref()`) | Every product page's `#section` anchors | Nav dropdown links break if a section id is renamed without updating this |
| `components/vision/_vision/*` (studio, camera, overlay, metal, mount, lazy) | All 12 lab routes + homepage + Yard/Warehouse sections | A change here ripples into **every** 3D scene on the site at once |

## Product page section-sharing chain

The three main product pages don't each own their sections independently — they re-export from each other:

- **Viso Warehouse** re-exports `SectionCargo` and `SectionDocument` from **Viso Yard**'s `sections.tsx`.
- **Viso Yard** imports `SectionWork` and `SectionSecure` directly from **Viso Warehouse**'s `sections.tsx`.
- **Viso Factory** re-exports `SectionAudit`, `SectionDimension`, `SectionWork`, `SectionSecure` from **Viso Warehouse** — which itself sourced two of those from Yard. So Factory is two hops from Yard.

Practical result: editing "Document Vision" or "Cargo Vision" on the Yard page also changes the Warehouse page. Editing "Work Vision" or "Secure Vision" on the Warehouse page changes Yard **and** Factory. There is no way to change one product's copy/behaviour for these shared sections without checking the other two.

## Scenes with cross-scene code dependencies

- `components/vision/container-vision/{container.ts,materials.ts}` is reused by **Tank, Gate, Crane and Cargo** Vision (rust decals, materials, container geometry). Container Vision is a dependency of four other scenes.
- `createSightCone` (in `hero-cards/detect.ts`) is used by **6 files**: its own definition, `hero-cards/subjects.ts`, and the Tank, Gate, Crane and Work Vision scenes. Changing its signature touches 5 scenes plus the homepage hero-card row.
- Every scene's texture/geometry cache functions (`warm*`) get called from `_vision/lazy.tsx`'s idle-preload chain — a new scene that doesn't follow this pattern pushes its build cost onto the visitor instead of loading it quietly in the background.

## Dead code (safe to know about, not urgent)

- `components/ui/button.tsx` (`Button`, `buttonVariants`) — no importers anywhere
- `components/motion.tsx`'s `DecodeHeadline` — no importers
- `app/platform/viso-yard/sections.tsx`'s `RegisterClose` — defined and exported, zero importers repo-wide (confirmed by grep at time of writing)

## Isolated — zero blast radius either direction

- `app/dev/journey/` + `components/journey/**` + `lib/journey-scroll.ts` — imports nothing from `components/vision/**` or any product page, and nothing imports it back. Safe to experiment on freely.
- `app/lab/home-accent/` — a full standalone fork of the homepage for reviewing a colour-system change; does not affect the live homepage (`app/page.tsx`) at all until someone manually ports the change over.

## Known dangling links (pre-existing, not caused by any doc work)

- `/company/offices` links to `#offices-list`, which doesn't exist on the page
- `/client-portal` and `/client-portal/register` link to `#dashboard`/`#request-access`, which don't exist
- `/industries`' 4 chapter sections have no `id` attributes yet, so they can't be deep-linked

# Site map

What this is: every real page on visotonics.com, what it's for, and whether Google can find it. For anyone planning content, launches, or ads.

Note: verified directly against `app/**/page.tsx` and `app/sitemap.ts`, not copied from `touchmatrix.md` uncritically.

## Marketing — home & platform

| Page | URL | Status | Indexed |
|---|---|---|---|
| Home | `/` | Live | Yes |
| Viso Yard (product) | `/platform/viso-yard` | Live — 9 sections | Yes |
| Viso Warehouse (product) | `/platform/viso-warehouse` | Live — 6 sections | Yes |
| Viso Factory (product) | `/platform/viso-factory` | Live — 5 sections | Yes |
| Viso Data (product) | `/platform/viso-data` | Live — 3 sections | Yes |
| Industries | `/industries` | Live | Yes |
| Contact | `/contact` | Live — real lead form | Yes |

`/platform` itself is not a page — it 301-redirects to `/platform/viso-yard` (see `next.config.mjs`).

## Company

| Page | URL | Status | Indexed |
|---|---|---|---|
| About | `/company/about` | Live | Yes |
| Offices | `/company/offices` | Live | Yes |
| Careers | `/company/careers` | **Coming soon stub** | No |
| Newsroom | `/company/newsroom` | **Coming soon stub** | No |
| Investor relations | `/company/investor-relations` | **Coming soon stub** | No |
| Partners | `/company/partners` | **Coming soon stub** | No |
| Sustainability | `/company/sustainability` | **Coming soon stub** | No |

## Resources

| Page | URL | Status | Indexed |
|---|---|---|---|
| Blog | `/resources/blog` | Live — 5 posts | Yes |
| Blog post | `/resources/blog/[slug]` | Live | Yes |
| FAQs | `/resources/faqs` | Live | Yes |
| Testimonials | `/resources/testimonials` | **Coming soon stub** | No |
| ROI calculator | `/resources/roi-calculator` | **Coming soon stub** | No |
| Whitepapers | `/resources/whitepapers` | **Coming soon stub** | No |
| Webinars | `/resources/webinars` | **Coming soon stub** | No |
| Documentation | `/resources/documentation` | **Coming soon stub** | No |
| Glossary | `/resources/glossary` | **Coming soon stub** | No |
| Press kit | `/resources/press-kit` | **Coming soon stub** | No |
| Case studies | `/resources/case-studies` | **Unbuilt — blank page**, not even a "coming soon" card | No |

## Legal

| Page | URL | Status | Indexed |
|---|---|---|---|
| Privacy policy | `/legal/privacy-policy` | Live | Yes |
| Terms & conditions | `/legal/terms-and-conditions` | Live | Yes |

## Client portal

| Page | URL | Status | Indexed |
|---|---|---|---|
| Login | `/client-portal` | Live UI, **no real authentication behind it** | No |
| Register | `/client-portal/register` | Live UI, no backend | No |
| Reset password | `/client-portal/reset-password` | Live UI, no backend | No |

Treat this as a design mock, not a working product login, until noted otherwise.

## Paid-campaign landing pages

| Page | URL | Status | Indexed |
|---|---|---|---|
| Campaign landing | `/campaigns/[slug]` | Live, per-campaign content in `app/campaigns/data.ts` | No — deliberately excluded from sitemap and set `noindex` (these are ad-only pages) |

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/lead` | Backs both the Contact form and every campaign landing page's lead form. Sends email via Resend if configured, otherwise just logs to server console. |

## Internal / development-only (never linked, never indexed)

These exist for building and reviewing work, not for visitors. All set `robots: noindex`.

| Page | Purpose |
|---|---|
| `/dev/journey` | Prototype for a future scroll-driven homepage interaction. Not connected to anything live. |
| `/lab/*` (12 routes) | Standalone review pages, one per 3D "Vision" scene, plus one homepage colour-variant fork. See below. |

**Correction to `touchmatrix.md`:** it states there are 11 lab routes. There are actually **12** — it omits `/lab/home-accent`, a full fork of the homepage with a blue-accent colour system applied for review (not yet shipped; explicitly a decision-pending fork, see its in-file comment block). The other 11 match touchmatrix's list: `hero-cards`, `lead-card`, `container-vision`, `tank-vision`, `gate-vision`, `yard-vision`, `crane-vision`, `cargo-vision`, `document-vision`, `work-vision`, `ascii-hero`.

## What "coming soon" means

A page that exists, is linked, returns 200, but shows a placeholder card instead of real content (`components/coming-soon.tsx`). 12 routes use it — the highest-fan-in shared component in the codebase. Not indexed.

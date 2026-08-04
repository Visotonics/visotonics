# Content & copy inventory — where the words live

What this is: where to find and change headlines, product claims, blog posts, FAQs and legal text. For marketing/founders who need to edit wording without an engineer's help finding the file — engineer still needed to make most of these edits since nothing here has a CMS UI.

**There is no CMS.** Everything is either hardcoded directly in a page's `.tsx` file, or in a small nearby `.ts` data file. A copy change is a code change and a redeploy, not a content-editor task.

## Hardcoded directly in the page component

Most page copy — headlines, section body text, product claims, stat callouts — is written straight into the JSX of its route file. To change it, open the specific `page.tsx` (or `sections.tsx` for the multi-section product pages) and edit the string.

- Homepage: `app/page.tsx`
- Product pages: `app/platform/viso-yard/{page,sections}.tsx`, same pattern for `viso-warehouse`, `viso-factory`, `viso-data`
- Industries: `app/industries/page.tsx`
- About / Offices: `app/company/about/page.tsx`, `app/company/offices/page.tsx`
- Contact: `app/contact/page.tsx`
- Coming-soon stub pages: each page passes its own headline into the shared `components/coming-soon.tsx`

## Small data files (still not a real CMS, but centralised)

| Content | File | Notes |
|---|---|---|
| FAQ questions/answers | `app/resources/faqs/faqs-data.ts` | 4 Q&A pairs today, plain array — also feeds the page's structured data (SEO) |
| Blog posts | `app/resources/blog/posts.ts` | 5 full posts, each with tag/title/excerpt/read-time and a body split into headed sections and paragraph/list blocks. This is the single source of truth for both the blog list page and each post's detail page. |
| Campaign landing pages | `app/campaigns/data.ts` | All copy for every `/campaigns/[slug]` ad-landing page in one file |

## Legal text

- Privacy policy: `app/legal/privacy-policy/page.tsx`
- Terms & conditions: `app/legal/terms-and-conditions/page.tsx`
- Shared layout/formatting for both: `components/legal-doc.tsx`

Legal text is written directly in the page files, same as everything else — there is no separate legal-content system. **Flag before editing:** any wording change to these two pages is a legal-review item, not just a copy edit; `DECISIONS.md` should be checked for any noted deferred legal work before changing them (per this repo's own convention).

## Product schematics (SVG diagrams, not the 3D scenes)

Static SVG diagrams used on platform pages and industries — e.g. `visotonics-gate-schematic.svg`, `visotonics-tank-schematic.svg`, `factory-production-schematic-desktop.svg` — live in `public/assets/` and are read server-side by `Schematic` (`app/platform/viso-yard/_media.tsx`). These are separate from the live 3D "Vision" scenes (see `04-animations.md`) — some sections show the 3D scene on desktop and fall back to one of these static SVGs on mobile.

## Partner / client logos

- `public/assets/logos-color/` — full-colour PNGs, used on the homepage "Trusted by Industry Leaders" section
- `public/assets/logos-light/` — flattened mono versions (also used as a fallback where a full-colour source doesn't exist yet — e.g. Microsoft for Startups at time of writing)

## SEO metadata

Per-page `<title>`/description/OG tags go through `lib/seo.ts`'s `pageMeta()` helper, called from each page file. Structured data (JSON-LD for organization/product/FAQ/article schemas) lives in `components/json-ld.tsx`. To change a page's search-result title/description, edit the `pageMeta()` call in that page's file, not a separate SEO settings file.

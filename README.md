# Visotonics

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Routes

```
/                                     Home
/platform
  /viso-yard                         Ports & Terminals
  /viso-warehouse                    Warehousing & Distribution
  /viso-factory                      Manufacturing
  /viso-data                         Compression AI / Trace AI / Detect AI
/industries                          Ports & Terminals · Warehousing & Distribution · Manufacturing · Logistics & Supply Chain
/company
  /about
  /offices
  /careers
  /newsroom
  /investor-relations
  /partners
  /sustainability
/resources
  /faqs
  /blog
  /case-studies
  /testimonials
  /roi-calculator
  /whitepapers
  /webinars
  /documentation
  /glossary
  /press-kit
/contact
/client-portal                    partner portal — real auth, see docs/10-partner-portal.md
  /register
  /reset-password
    /update
  /onboarding/partner-type        onboarding step 1  (gated)
  /onboarding/nda                 onboarding step 2  (gated)
  /dashboard                      partner home       (gated)
  /admin                          approval queue     (admin only)
  /auth/callback                  lands emailed confirmation + reset links
/legal
  /privacy-policy
  /terms-and-conditions

api/
  /lead                           contact + campaign lead capture (Resend)
  /partner-register
  /partner-type
  /partner-nda
  /partner-approve
```

## Structure

```
app/                        routes (App Router — one page.tsx per route above)
components/                 shared UI (nav, footer, motion primitives, testimonial pager, etc.)
app/platform/viso-yard/
  _shared.tsx                drafting-sheet tokens/primitives shared by all platform pages
  _media.tsx                 inlines SVGs from public/assets for the schematic-draw animation
  sections.tsx                section components (some re-exported by viso-warehouse/viso-factory)
public/assets/               SVG schematics, images

proxy.ts                    Next 16's renamed middleware. Session refresh + deny-by-default
                            gate on /client-portal. NOT middleware.ts — that name is ignored
lib/
  partner.ts                 client-safe partner types + the onboarding state machine
  auth.ts                    SERVER ONLY (uses next/headers) — session and role helpers
  supabase/                  browser client, server clients, env-var resolution
  nda.ts                     NDA text, clauses and version — PLACEHOLDER, not legal copy
  partner-mail.ts            the four portal notification emails (Resend)
  partner-crm.ts             the deliberately-empty Zoho seam
supabase/migrations/        SQL, applied by hand in the Supabase dashboard. Not run by the build
tests/                      vitest — `npm test` for unit, PORTAL_E2E=1 for integration
```

Two things that will bite you if you don't know them:

- **`lib/auth.ts` cannot be imported from a Client Component** — it reaches
  `next/headers` and the build will fail. Use `lib/partner.ts` instead.
- **`vitest.config.mts`, not `.ts`** — this repo has no `"type": "module"`, so
  a `.ts` config fails with `ERR_REQUIRE_ESM`.

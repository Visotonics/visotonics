# What's here

What exists in this codebase, and what state each part is in. For anyone planning content, a launch, or ads.

**Deployment note (2026-08-11):** the local production build contains the
current scenes and portal, but the public Netlify domain was reported to still
serve an interim site. The table below describes this repository, not a claim
that `visotonics.com` has already been cut over. See `05-run-and-ship.md`.

## The real site

| Section | What it is | State | In Google |
|---|---|---|---|
| Home | Company pitch, hero, product cards | Live | Yes |
| Viso Yard | Product page, 9 sections | Live | Yes |
| Viso Warehouse | Product page, 6 sections | Live | Yes |
| Viso Factory | Product page, 5 sections | Live | Yes |
| Viso Data | Product page, 3 sections | Live | Yes |
| Industries | Use-case overview | Live | Yes |
| Contact | Real lead-capture form | Live | Yes |
| About / Offices | Company info | Live | Yes |
| Blog | 5 posts + listing | Live | Yes |
| FAQs | Live | Live | Yes |
| Privacy policy / Terms | Live | Live | Yes |
| Paid campaign pages | One per ad campaign, own lead form | Live, but deliberately hidden from Google (ad traffic only) | No |

## Placeholder pages ("coming soon")

These exist, are linked from the nav, and return a real page — but show only a placeholder card, no content. Not in Google.

Careers · Newsroom · Investor relations · Partners · Sustainability · Testimonials · ROI calculator · Whitepapers · Webinars · Documentation · Glossary · Press kit

**Case studies is worse than a stub** — it's a blank page, not even a "coming soon" card.

## Client portal — real application

Once a mockup with nothing behind it; **as of 2026-08-08 it is a working application**. Partners choose one of three partner types while registering, an admin approves or rejects them with a reason, approved partners sign an NDA, and then land on a dashboard where they can register deals. Real accounts, sessions, a database, approval audit trail, and emails exist at each partner-account step.

Before inviting real partners, verify the deployed environment variables and Supabase SMTP delivery. The current NDA text is placeholder scaffolding, not lawyer-reviewed.

Never in Google, by design.

Full detail in `10-partner-portal.md`.

## Internal-only pages (never shown to visitors)

- 12 review pages, one per 3D scene (plus one full homepage color-variant fork), used only to look at a scene in isolation while building it.
- One prototype page for a possible future scroll-driven homepage redesign — not connected to the live homepage at all.

## The pitch in one line

A machine-vision company for logistics: cameras and AI that read containers, trucks, tanks, cargo, paperwork and warehouse activity automatically. The 3D scenes on the product pages are the demo — see `02-products-and-scenes.md` for what each one actually shows and how finished it is.

## No CMS

Every headline, claim, and legal paragraph is written directly into a code file. There is no editor UI for marketing to use — see `03-content-and-editing.md` for where things live and what it takes to change them.

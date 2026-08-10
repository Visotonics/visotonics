# Consolidated Feedback — Visotonics Website

Source: Apratim's review notes + WhatsApp thread (Pranav, Ritu, Pramod) + ChatGPT/Claude review links. Deduplicated and organized by area. Raw chat log preserved at bottom for provenance.

## P0 — Copy fixes (small, mechanical text swaps)

- [x] Hero headline: "AI vision for yards, warehouses and factories — from the CCTV you already own." → **"AI Vision Platform for Industrial Operations"** (site-wide, wherever this line repeats) — DONE
- [ ] Home page proof line: "Proprietary AI models delivering high accuracy in complex, chaotic, and edge-case environments." — trim/shorten — **NOT DONE**: identical unshortened text still live at `app/page.tsx:474,492` (desktop + mobile blocks)
- [x] Credibility line: "CII Best Industry AI Application 2025 · Patented damage detection 2026*" → **"CII Best Industry AI Application 2025 · Patented Technology"** (drop the unconfirmed patent year/number until legal confirms) — DONE, `app/page.tsx:816,845`
- [x] "Trusted at the busiest yards, in the country." → **"Trusted by Industry Leaders"** — DONE
- [x] Testimonial attribution: "Port Logistics" → **"CFS Mundra"** — DONE
- [x] "See how ports and terminals run inspection — without stopping a single container." → **"See how industrial sites run inspection — without stopping the operations."** — DONE, `app/page.tsx:879,897`
- [x] Add line: "Inspection and monitoring of assets in night, rain, fog and dust." — DONE, `app/page.tsx:787,829`
- [ ] CTA line: "Bring a gate feed. We'll read it live." → **"Bring your CCTV feed, We'll read it live."** — **PARTIAL**: `/industries` page has it; home page (`app/page.tsx:942,964`) says "Bring CCTV feed" — still missing "your". Old "gate feed" wording also still lives on `viso-warehouse/convert.tsx:66,88` and `viso-yard/convert.tsx:67,89`
- [x] Footer: "Supported by IIT Kharagpur" → **"Supported by MEITY & DST"** — DONE
- [ ] Across/logos section: "ACROSS 25+ YARDS" → **"Leading Yard Owners"** — **NOT DONE**: still reads "ACROSS 25+ YARDS" at `app/platform/viso-yard/sections.tsx:489,525`; no "Leading Yard Owners" string exists anywhere
- [ ] Remove "2 SITES · 2 COUNTRIES" stat block — that exact old phrase is gone (no match in repo), but the "ACROSS LIVE SITES" stat block pattern is still present/live at `app/page.tsx:649,682,784,828` — mark **PARTIAL**, confirm whether that block itself should also go
- [x] Remove all literal `[ ]` placeholder brackets left in copy (sweep whole site) — DONE, no stray `[ ]`/`[TODO]`/`[TBD]` found under `app/`
- [ ] Fix numbering issues (stray/incorrect numbered lists — sweep whole site) — **UNCLEAR**: spot-checked numbered section labels in `viso-yard/sections.tsx` (01–09, sequential, correct); no full site render check done
- [ ] Contact form question "Tell us about your yard" → make industry-generic wording — **NOT DONE**, still literal at `app/contact/page.tsx:123,158`
- [x] Viso Data section: reduce marketing-speak, make content clearer/more direct — DONE, `viso-data/page.tsx:369-376` is one headline + one ~25-word line, no fluff
- [ ] Platform section: reduce content length; fix inconsistent font sizes — **UNCLEAR**: `viso-data` uses a consistent 40/22/12 scale; other platform sub-pages (viso-yard, viso-warehouse) not diffed against it
- [x] Industries section: reduce content, remove "fig." figure numbering references — DONE from a user-visible standpoint; "fig." only survives as an internal JS field name (`c.fig.figNo`) in `app/industries/page.tsx:411-416`, never rendered
- [x] "Yiso yard" → **"Container inspection & yard management"** (or "& yard tracking") — reduce wording — DONE, no "Yiso yard" string anywhere in repo
- [ ] Damage-detection credibility line — pick one:
  - "Patented damage detection*, deployed at 25+ sites including Adani CFS"
  - "Patented damage detection technology, chosen by industrial leaders like Adani, DP World, Hind Terminals"
  - *(needs decision — see Open Questions)* — **STATUS**: variant 2 is the one currently live (`viso-yard/sections.tsx:266,328`); no formal decision was logged, so treat as unconfirmed/defaulted rather than chosen

## P0 — Broken / inactive functionality

- [x] All CTAs/links must be active — no dead links (Contact, case studies, etc.) — DONE: no `href="#"` found anywhere; the home-page "See case studies" link is commented out rather than dead-linked
- [x] Contact enquiries should route to **contact@excl.ai** — DONE
- [ ] Login page: "Forgot password" and "Request access" buttons are non-functional — fix or remove — **PARTIAL**: "Forgot password?" correctly links to a real `/client-portal/reset-password` page; "Request access" still points to a dead in-page anchor `href="#request-access"` (`app/client-portal/page.tsx:75`) with no target, despite a real `/client-portal/register` page existing that it could link to
- [x] Language selector in nav — remove (site is English-only, button currently does nothing) — DONE
- [ ] Animations reported not working — needs investigation (see PERFORMANCE.md before touching scene code) — not checked in this pass
- [x] Customer/"Supported by" logos render broken on mobile — fix responsive layout — DONE, both mobile rows use `flexWrap: "wrap"` (`app/page.tsx:807,833,839`); note the desktop "DEPLOYED" logo row has a code comment flagging it has no wrap/width cap of its own — worth a look at narrow desktop/zoomed viewports

## P1 — Structural / layout changes

- [x] Industries: split into 4 sections in navbar **and** footer; refactor page content to match those 4 sections — DONE, though footer/company nav actually has 7 sub-sections rather than 4 — confirm that's intentional
- [x] Team page: display members 3-per-row — DONE, `app/company/about/page.tsx:47-52,118` — 6 members, `grid-cols-1 md:grid-cols-3`
- [ ] Logo in navbar: scale to 1.5x — **UNCLEAR**: `components/site-nav.tsx:314` shows differing size declarations (`width:200`, `height:40`/`48`) in different blocks; no explicit 1.5x scale factor found
- [ ] Resources: add 1–2 new pages — Blog (reuse structure/content from previous site as a starting point) and/or Summit — **PARTIAL**: Blog exists; no Summit page found under `app/resources/`
- [x] Add favicon — DONE
- [ ] Home page: full clear-cut value messaging should be visible above the fold, without scrolling and without truncating meaning — **UNCLEAR**: hero block structurally contains eyebrow + headline + support copy in one viewport-height section, but not visually screenshot-verified
- [ ] Consider card-based layout instead of long scrolling sections (reference: lazarev.agency/cases for hover/selection pattern) — not started (backlog-style item)
- [ ] Bottom-of-page Visotonics logo needs updating to current brand mark — **UNCLEAR**: footer uses `public/visotonics-high-resolution-logo-transparent.png` (`components/site-footer.tsx:230`); can't confirm visually whether it's the outdated mark without eyeballing the image

## P1 — Content to fill in

- [ ] Case studies — currently empty, need real content — **NOT DONE**, confirmed intentional: `app/resources/case-studies/page.tsx` is an empty div, metadata says "coming soon", `noindex: true`, with a source comment "Unbuilt — keep out of search results until content ships"
- [ ] Testimonials — generate several more beyond current set — not checked in this pass
- [ ] Real processed images/video (not stock) across industries, platform, case studies — not checked in this pass
- [x] Offices list: Lucknow, Bhubaneswar, Ahmedabad, Mumbai, USA — DONE, `app/company/offices/page.tsx:29-33` lists all five (note: spelled "Bhubaneshwar" in code — minor spelling mismatch vs. this doc's "Bhubaneswar")

## P2 — Backlog ("Later")

- [ ] Terms of Use / Privacy Policy pages
- [ ] Multi-language support
- [ ] Make "Book a Demo" CTA more prominent site-wide
- [ ] Brochure download per page, gated behind a lead form → all leads to contact@excl.ai
- [ ] Dedicated landing page per ad campaign (full funnel)
- [ ] Knowledge-base PDF gated behind signup
- [ ] SEO + LLM/AI-search optimization
- [ ] Credibility section: customers, supporters, awards/associations (FICCI, CII)
- [ ] Patents / VisoPerspect / benchmarking content
- [ ] Ground/on-site photography
- [ ] Demo video
- [ ] On-site feedback/suggestion widget for visitors
- [ ] Chatbot
- [ ] Visitor intelligence (who visited)
- [ ] Google Analytics
- [ ] Reconcile site against the shared sitemap doc
- [ ] Decide on color system (blue/white variant under consideration) and how animations/real-world footage integrate with it
- [ ] Hyperlink YouTube, LinkedIn, other social profiles
- [ ] "Sell outcomes, not AI" — reframe product copy around business outcomes rather than model/tech features
- [ ] Reuse imagery from old site for blog/product/industry pages where no new asset exists
- [ ] Cookie notice
- [ ] No standalone About/Team page was in one earlier review pass — reconcile with current team-page work

## Open questions / needs a decision before implementing

1. **Patent claim wording** — patent number and jurisdiction not yet confirmed; don't publish specific patent numbers until legal confirms (per DECISIONS.md conventions, log the final decision there once made).
2. Final damage-detection credibility line — three variants floated, none chosen.
3. Color direction (blue/white vs. current) — still being explored per Pranav's note ("current color option looking good, still exploring other options").
4. Whether "About/Team" page stays or goes — conflicting notes.

## Provenance note

The WhatsApp thread includes operational/business items unrelated to the website (stipend timing, GitHub repo handoff credentials, VC printing vendor, sales pipeline/CRM status, placement-test scheduling). These are excluded above as out of scope for site work. Flagging here only so nothing looks silently dropped.

# Content and editing

Where words, prices, legal text and images live, and what it takes to change them. For marketing/founders planning a copy change — an engineer still has to make the edit, there is no content-editor tool.

## There is no CMS

Every headline, product claim, and stat is written directly into the site's code files. Changing a sentence means editing a code file and shipping a new build — same process as any other code change, no exceptions, no "just log into the CMS."

## Where copy lives

- **Homepage, product pages, About, Offices, Contact, Industries** — copy is written straight into each page's own file. To change it, an engineer opens that specific page's file and edits the text.
- **FAQs** — centralized in one small data file, today holding 4 question/answer pairs. Also feeds the page's SEO structured data.
- **Blog** — centralized in one data file, 5 full posts (title, excerpt, read time, body). Single source of truth for both the blog list and each post page.
- **Campaign landing pages** — all copy for every ad-campaign page lives in one file, one entry per campaign.
- **Coming-soon stub pages** — each just passes its own headline into a shared placeholder component; changing the wording is a one-line edit per page, but the placeholder "look" is shared across all 12 stub pages (see `04-change-risk.md`).

## Legal text

Privacy policy and Terms & Conditions are written directly in their own page files, same as everything else — no separate legal-content system. **Any wording change to these two pages is a legal-review item**, not a copy edit. Check with whoever owns legal/compliance decisions before changing either — `DECISIONS.md` (repo root) may already record open legal work that constrains this.

## Product diagrams (the static ones)

The static SVG diagrams used across product pages and Industries (and standing in fully for Audit/Dimension/Secure/Production — see `02-products-and-scenes.md`) live together as image files and are swapped in per section. Some 3D-scene sections also fall back to one of these static diagrams on mobile instead of running the animation.

## Logos

Partner/client logos exist in two versions: full-color (used on the homepage "Trusted by Industry Leaders" row) and flattened mono (used as a fallback where no full-color version exists yet — true for at least one partner today).

## SEO — title/description per page

Each page sets its own search-result title and description through one shared helper function, called from that page's file. To change how a page shows up in Google search results, an engineer edits that call — there's no separate "SEO settings" screen.

# Partner portal — the plan

What we are building, what was decided, and what is still open. Written before
any code, so the shape can be argued with cheaply.

**Status: not started.** What exists today is `app/client-portal/*` — login,
register and reset-password pages that look finished and have **no
authentication behind them at all**. No accounts, no sessions, no database.
Treat them as a design reference, not a foundation: the forms will be rewired,
not reused.

## What was decided

Four answers from Apratim, and between them they remove most of the
architectural ambiguity:

1. **Three partner types, differing only in the CONTENT they see.** Not
   permissions, not workflow — the same page shape with a different content
   set. Content itself comes later; the pages come first.
2. **Zoho is the CRM and the system of record.** The site must log its data to
   Zoho — a new registration has to appear there.
3. **Admin logs in through the SAME login page** as everyone else, and is
   redirected on the strength of their account to a different dashboard.
4. **Build the pages first, fill them later.** Four shells: three partner
   types plus admin.

## What that implies

**The portal must not own a partner database.** Zoho being the system of
record is the single most consequential answer here. If the portal keeps its
own authoritative copy of partner records, every field becomes a two-way sync
with a conflict story, and the team ends up maintaining two truths. Instead:
registration WRITES to Zoho, the portal READS from it, and Zoho stays the
place the business already works.

**This is not a permissions engine.** "Different content per type" means a
`partnerType` field selecting which content set renders. There is no
role-based access-control layer to build, no per-resource ACL, no policy
engine. Anything more is scope that was not asked for.

**Role is a field, not a separate system.** Admin sharing the login page means
login reads `role` off the account and routes accordingly. One login, one
session mechanism, two destinations.

## Proposed shape

| Piece | Approach | Why |
|---|---|---|
| Authentication | A hosted provider (Clerk or Supabase Auth) | Sessions, password reset, email verification and eventually SSO are all solved problems and none of them are where Visotonics' engineering value is |
| Account record | Provider holds identity; `partnerType`, `role`, `approved` live in user metadata | No second user table to keep in step |
| Registration | Creates the account **unapproved**, then pushes a Lead/Contact to Zoho | Satisfies "synced to Zoho" without making Zoho a hard dependency of signup succeeding |
| Approval | Admin flips `approved` | Either in the admin dashboard, or in Zoho with a webhook back — see open questions |
| Login routing | Read `role` -> admin or partner dashboard; read `partnerType` -> which content | One page, two destinations |
| Content | Four page shells, real content later | Explicitly what was asked for |

### Do not hand-roll authentication

Stated plainly because it is the decision most likely to be quietly reversed
under time pressure. A partner portal with real accounts needs session
handling, password reset, email verification, rate limiting on login, and
eventually SSO for larger partners. Each is a well-understood way to leak
credentials if built casually. A hosted provider is days; doing it properly by
hand is weeks, and doing it improperly is a liability on a site that carries
customer logos.

### The long pole is Zoho, not the pages

The four page shells are a small build. **The Zoho integration is where the
time actually goes** — its API is OAuth with refresh tokens, and the
credentials-versus-API question is still open with the team (see
`06-owed.md`). That conversation should start in parallel with the page work,
not after it, or the pages will sit finished and unconnected.

Design the Zoho call as a **queued, retryable side effect**, not an inline
step of registration. If Zoho is unreachable the user must still get an
account; the CRM record can land a minute later. Registration failing because
a third party is down is a bad trade.

## Still open — needs a decision before building

- **Where does approval actually happen?** Admin dashboard (we build a queue,
  someone works it) or in Zoho (we build a webhook, the team works where they
  already are). The second is less code and more likely to be used.
- **Does the portal live inside this Next.js site or as a separate app on a
  subdomain?** Interacts with the pending GitHub -> GitLab port and with
  hosting, which is itself unresolved — `06-owed.md` notes there is no deploy
  config anywhere in this repo.
- **What does a partner DO once inside?** A document library, a lead pipeline
  with status and commission, or a live view into their own deployments. The
  answer does not block the shells, but it decides whether this is a weekend
  or a product.
- **Zoho credentials or API access from the team** — blocking the integration.

## What NOT to do

- Do not link the portal from anywhere public until real auth is behind it.
  Today's pages are a convincing mockup, and a convincing mockup of a login is
  worse than no login.
- Do not build a second user table alongside Zoho.
- Do not let registration block on the Zoho write.

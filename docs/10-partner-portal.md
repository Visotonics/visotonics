# The backend: partner portal, Supabase, auth

The single reference for everything server-side in this repo. Until the portal
was built, this codebase had **no backend at all** beyond one Resend-backed
lead form — no database, no accounts, no sessions, no middleware. Everything
described here is new as of 2026-08-08.

**Why decisions were made the way they were is NOT in this file.** That lives
in `DECISIONS.md` (two dated 2026-08-08 entries). This file is current state:
what exists, how it works, how to run it, and what is still owed.

**Status: built and verified against the live Supabase project.** All four
migrations have been run. Deployment configuration is environment-specific;
use the credentials runbook before treating a Netlify deploy as ready.

---

## 1. The stack

| Concern | Choice | Notes |
|---|---|---|
| Auth | **Supabase Auth** | Sessions, password reset, email confirmation |
| Database | **Supabase Postgres** | Four tables, row-level security on all of them |
| Transactional email | **Resend**, two separate paths | See §7 |
| CRM | **Zoho — deferred** | Interface + stub only; no credentials yet (§8) |
| Hosting | Netlify | API routes run as real server functions |

Two npm dependencies: `@supabase/supabase-js` and `@supabase/ssr`. Plus
`vitest` as a dev dependency for the test suite.

**This repo is Next 16**, where the `middleware` file convention was renamed
to `proxy`. The gate lives at `proxy.ts` in the repo root. Do not create a
`middleware.ts` — it will be ignored.

---

## 2. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Set locally in `.env.local` **and** on Netlify under Site settings →
Environment variables. The whole portal degrades to a visible "not available
yet" state when they are missing, rather than crashing.

**Supabase renamed its keys.** New projects issue `sb_publishable_…` /
`sb_secret_…`; older ones the `anon` / `service_role` JWTs. `lib/supabase/env.ts`
accepts either naming — `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` still work. Don't "fix" one to match the other.

**The secret key bypasses row-level security entirely.** It must never carry a
`NEXT_PUBLIC_` prefix and must never be imported into a Client Component.

Optional, both falling back to the existing lead-form values:

```
PARTNER_NOTIFICATION_EMAIL   # defaults to LEAD_NOTIFICATION_EMAIL
PARTNER_FROM_EMAIL           # defaults to LEAD_FROM_EMAIL
```

Current project: `hgyxuhdaapprxtnrcjlj`.

---

## 3. Database

Four tables. **Every one has SELECT policies only** — there is no INSERT,
UPDATE or DELETE policy anywhere. The browser's key physically cannot write
these tables. All writes go through server route handlers holding the secret
key. That single fact is what makes `role`, `status` and `approved` unforgeable.

### `partners`

`id` **is** the `auth.users` id. One row per account, no join table.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK to `auth.users`, `on delete cascade` |
| `company` | text NOT NULL | |
| `email` | text NOT NULL | |
| `partner_type` | text NULL | `type_a`/`type_b`/`type_c`. Required at registration since 2026-08-10; still NULLABLE because rows written under the previous design hold NULL. Render it as "—", never assume it is set |
| `role` | text NOT NULL | `partner` \| `admin` |
| `status` | text NOT NULL | `pending` \| `approved` \| `rejected` |
| `rejection_reason` | text NULL | Shown to the partner and emailed |
| `decided_at` | timestamptz NULL | Latest decision only |
| `decided_by` | uuid NULL | Which admin. Drives the NDA notice recipient |
| `nda_signed_at` | timestamptz NULL | |
| `created_at` | timestamptz NOT NULL | |
| `crm_synced_at` | timestamptz NULL | Never written yet — see §8 |

Policies: a partner reads their own row; an admin reads all, via a
`SECURITY DEFINER` function `is_admin()`. That function exists because a
policy on `partners` that queried `partners` would recurse.

### `nda_signatures`

One row per signing event, append-only in practice.

`id`, `partner_id`, `signed_at`, `nda_version`, `full_name`, `job_title`,
`agreements` (jsonb), `ip_address`, `user_agent`, `receipt_sent_at`.

`agreements` stores the clause labels **verbatim** alongside the version. That
is the point: a signature record is only worth something if it says what the
document said *at the time*. A later edit to `lib/nda.ts` must not be able to
rewrite what someone appears to have agreed to.

Policies: partner reads own; admin reads all.

### `partner_decisions`

The admin audit trail. `partners.decided_by`/`decided_at` are *overwritten* on
every decision, so alone they cannot tell you that an account was approved,
rejected, then approved again.

`id`, `partner_id`, `admin_id`, `admin_email`, `from_status`, `to_status`,
`reason`, `decided_at`.

`admin_email` is denormalised and `admin_id` is `on delete set null` on
purpose — an audit trail that erases itself when staff leave is not an audit
trail.

Policy: **admins only**. Partners are told the outcome by email and on their
own screen; they don't need the internal history, which names staff.

### `deals`

Deal registration. One row per opportunity a partner asks us to protect.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `partner_id` | uuid NOT NULL | FK to `partners`, `on delete cascade` |
| `reference` | text NOT NULL UNIQUE | `DL-XXXXXX`. **Generated server-side**, never posted |
| `customer_name` | text NOT NULL | |
| `customer_email` | text NOT NULL | |
| `industry` | text NOT NULL | check: `seaport`/`warehouse`/`airport`/`enterprise` |
| `platform` | text NOT NULL | check: `visopercept`/`tracksure` |
| `estimated_value_usd` | numeric(14,2) NOT NULL | check `>= 0`. **PostgREST returns it as a STRING** — go through `dealValue()` in `lib/deal.ts` or a total comes out `NaN` |
| `notes` | text NULL | |
| `status` | text NOT NULL | `submitted` / `approved` / `rejected`, default `submitted` |
| `rejection_reason` | text NULL | |
| `decided_at`, `decided_by` | timestamptz, uuid NULL | `decided_by` is `on delete set null` |
| `created_at` | timestamptz NOT NULL | |

Indexes: `(partner_id, created_at desc)` for the partner dashboard, and a
partial index on `status = 'submitted'` for the admin queue.

Policies: a partner reads their own deals; an admin reads all, via `is_admin()`.

The vocabulary — `INDUSTRIES`, `INDUSTRY_LABELS`, `PLATFORMS`,
`PLATFORM_LABELS`, `DealRow`, `isIndustry()`, `isPlatform()` — lives in
**`lib/deal.ts`, which is client-safe**. It is deliberately NOT in
`lib/auth.ts` and must not move there: `auth.ts` reaches `next/headers`, and
importing it from a Client Component breaks the build. Same split as
`lib/partner.ts`.

There is deliberately **no deal audit-log table**. A partner account can be
approved, rejected and re-approved, which is why `partner_decisions` exists;
a deal has one decision, and `decided_at` / `decided_by` on the row are the
whole record. If deals ever gain a re-decide flow, copy the
`partner_decisions` shape rather than trusting those two columns.

### Migrations

`supabase/migrations/` — apply **in order** via the Supabase SQL editor (or
`supabase db push` if the CLI is linked). All are safe to re-run.

| File | What it does |
|---|---|
| `0001_partners.sql` | `partners`, RLS, `is_admin()` |
| `0002_onboarding_and_nda.sql` | Drops `approved` for `status`; makes `partner_type` nullable; adds rejection/decision/NDA columns; creates `nda_signatures` |
| `0003_partner_decisions.sql` | The audit log |
| `0004_deals.sql` | `deals`, its two indexes and RLS. Applied to the live project on 2026-08-11 |

Nothing applies these automatically. `npm run build` does not touch the database.

---

## 4. Auth and sessions

**Cookie-based, issued by Supabase, never stored by us.** No session table,
nothing to invalidate — the cookie *is* the session.

- **Access token** — JWT, **60 minutes**. Carries `sub`, which Postgres reads
  as `auth.uid()` and every RLS policy keys off.
- **Refresh token** — long-lived, rotates on use.

Cookie flags come from `@supabase/ssr`'s defaults:
`path=/`, `sameSite=lax`, `httpOnly=false`, `maxAge=400 days`.

| File | Role |
|---|---|
| `lib/supabase/client.ts` | Browser client. The only thing that touches the publishable key client-side |
| `lib/supabase/server.ts` | `createServerSupabase()` (RLS-bound) and `createAdminSupabase()` (RLS-bypassing, routes only) |
| `lib/supabase/env.ts` | Key-name resolution, shared by all three |
| `lib/auth.ts` | **Server only.** `getCurrentPartner()`, `getRole()`, `requireAdmin()`, etc. |
| `lib/partner.ts` | **Client-safe.** Types, labels, and the state machine |

**`lib/auth.ts` reaches `next/headers` and will break the build if imported
from a Client Component.** Client components import `lib/partner.ts` instead.
This is the single most likely mistake when adding a portal page.

`createServerSupabase().setAll` swallows its error deliberately: Server
Components have read-only cookies, and `proxy.ts` is what actually writes the
refreshed cookie back.

**Everything uses `getUser()`, never `getSession()`.** `getSession()` decodes
the cookie and trusts it; `getUser()` validates against the auth server. That
costs a network round trip per gated render and is the reason a tampered
cookie gets you nothing. If this ever becomes high-traffic, `getClaims()` with
asymmetric JWT verification is the upgrade path.

### The five layers

1. **`proxy.ts`** — refreshes the session and gates routes. **Deny-by-default:**
   everything under `/client-portal` requires a session except an explicit
   PUBLIC list (sign-in, register, reset-password, reset-password/update,
   auth/callback). A page added tomorrow is protected without anyone
   remembering to list it. It only knows *signed in*, never *as whom*.
2. **Page level** — every gated page calls `getCurrentPartner()` and redirects.
3. **Route level** — every API route re-checks independently.
4. **Row-level security** — SELECT-only policies (§3).
5. **Service-role writes** — only ever inside route handlers.

---

## 5. The onboarding state machine

`nextStepFor()` in `lib/partner.ts`. First match wins:

| Condition | Step | Screen |
|---|---|---|
| `role === 'admin'` | `admin` | `/client-portal/admin` |
| `status === 'rejected'` | `rejected` | dashboard renders a terminal screen with the reason |
| `status !== 'approved'` | `pending` | dashboard renders "Still pending approval" |
| `nda_signed_at` is null | `sign-nda` | `/client-portal/onboarding/nda` |
| otherwise | `dashboard` | the real dashboard |

`routeFor()` is `STEP_ROUTES[nextStepFor(partner)]`.

**`choose-type` was removed on 2026-08-10**, along with
`/client-portal/onboarding/partner-type` and `POST /api/partner-type`, when
partner type went back onto the registration form (DECISIONS.md). The
sequence is now **approve -> sign NDA -> dashboard**. `partner_type` no
longer routes at all: a legacy NULL row carries straight on to the NDA and
renders its type as "—". The `!partner.partner_type` 409 in
`/api/partner-nda` had to go with it — leaving it would have stranded exactly
those rows, routed to the NDA by the state machine and refused by the route.

**Four consumers ask it** — the sign-in redirect, the dashboard, the NDA page
and `/client-portal/dashboard/deals/new` — and each redirects to its answer
rather than deciding for itself. Per-page logic is how two pages end up
disagreeing and leaving a gap. **Add a step by editing that function**, never
by adding a check to a page.

`pending` and `rejected` both route *to* the dashboard, which renders them as
dead ends.

---

## 6. API routes

All `runtime = "nodejs"`, all dynamic.

| Route | Guard | Behaviour |
|---|---|---|
| `POST /api/partner-register` | none (public) | Signs up server-side on a session-less client, inserts `partners` with `status: pending`. **Requires `partnerType`**, validated with `isPartnerType()`; 422 if missing or unknown |
| `POST /api/partner-nda` | signed in, approved, not yet signed | Inserts the signature, then stamps `nda_signed_at` |
| `POST /api/deal-register` | signed in, approved **and** NDA signed | Validates every field against the server's own lists, generates `reference`, forces `status: 'submitted'`, writes on the service-role key |
| `POST /api/deal-decide` | `requireAdmin()` | `{id, status, reason}`. Reason required on reject (422). Read-then-compare-and-set on `.eq("status", fromStatus)`. `submitted` is not an allowed target — a decision cannot be un-made here |
| `POST /api/partner-approve` | `requireAdmin()` | `{id, status, reason}`. Reason required on reject (422). Read-then-compare-and-set, writes the audit row |
| `GET /client-portal/auth/callback` | none | Exchanges the emailed code for a session; validates `next` starts with `/client-portal` |

Three details that are load-bearing and easy to undo:

- **`/api/partner-nda` rebuilds the record from the server's own
  `NDA_CLAUSES`.** The client sends only which *keys* it ticked. A tampered
  request cannot produce a record claiming agreement to unseen text. Verified
  by posting a forged label — the real clauses were stored.
- **`/api/partner-approve` uses `.eq("status", fromStatus)`** as a
  compare-and-set. Two admins deciding at once can't clobber each other, and a
  no-op returns `changed: false` without emailing or writing a phantom log row.
- **`/api/partner-register` checks `user.identities.length === 0`** to detect
  an already-registered address. See §9. Adding the partner-type field did
  not disturb it: both branches still return a byte-identical 200, and the
  422 for a missing type happens BEFORE `signUp()`, so it leaks nothing.
- **`/api/deal-register` never reads `status` from the body**, and generates
  `reference` itself. A partner therefore cannot file a pre-approved deal, or
  mint a reference that collides with or impersonates someone else's.

`POST /api/partner-type` **is deleted.** It was write-once and its only caller
was the onboarding screen that went with it; nothing could reach it, and the
runbook has always said changing a partner's type is not self-serve.

---

## 7. Email

Two separate senders, deliberately using **different Resend API keys** so
revoking one doesn't take down the other.

**Supabase sends** (configured in the dashboard, not in this repo): email
confirmation and password reset. Requires custom SMTP pointed at Resend —
Supabase's built-in sender is rate-limited to roughly two per hour and on a
new project only delivers to team addresses. Without this, **registration
cannot work for real partners.**

**The app sends** via `lib/partner-mail.ts`:

| Trigger | Recipient |
|---|---|
| Partner registers | shared admin inbox |
| Admin approves | the partner |
| Admin rejects | the partner, with the reason |
| Partner signs the NDA | the partner (full receipt) **and** the admin who approved them |

All four are fire-and-forget with caught errors — a Resend outage can never
fail a registration or an approval. All no-op with a warning when
`RESEND_API_KEY` is unset. The Resend SDK does **not** throw on API-level
rejection; it returns `{data, error}` and `error` must be checked explicitly.

---

## 8. The Zoho seam

`lib/partner-crm.ts` defines `PartnerCrmProvider` and `getCrmProvider()`,
which currently returns a logging stub. `partners.crm_synced_at` exists and is
never written.

Both are there so that when credentials arrive, the backfill for everyone
registered in the meantime is:

```sql
select * from partners where crm_synced_at is null
```

**Do not add registration-time retry or queue machinery.** That was only
necessary under the original design where Zoho was the sole system of record.
Postgres already holds the data durably; Zoho is a sync target off it.

---

## 9. Security

### Enforced and verified by direct attack

Each of these was probed against the live project with a real partner token,
bypassing the app entirely:

- Read another partner's row or signature → `[]`
- Self-approve, self-promote, edit or delete own row → **0 rows changed**
- Insert a self-made admin row → `42501` policy violation
- Forge or edit an NDA signature → refused
- Read or write the decision log as a partner → `[]` / `42501`
- Every queue-jump attempt (pages and APIs) → redirect or 403
- Forged NDA clause labels → discarded, server's text stored

### The bug that was found, and why it matters

**Email enumeration through registration.** A new address returned
`200 {ok:true}`; an address that already had an account returned
`500 "Account created but the profile could not be saved"`. Anyone could probe
whether an email was a registered Visotonics partner.

The cause is worth remembering: Supabase does **not** return null for an
existing address. It returns a decoy user with a real-looking `id` and an
**empty `identities` array**. The old code checked only `user?.id`, sailed
past, and hit the foreign key — producing the distinguishing 500. A comment
directly above it said *"Don't confirm or deny — that would leak which
addresses have accounts"*, which made it look handled in every review.

Fixed and covered by a test. **Do not "improve" that route by reporting "that
email is already registered".**

### Known weaknesses, unfixed

1. **`httpOnly: false`** on session cookies — inherent to Supabase's browser
   client. Any XSS anywhere on the site can lift a partner session, and GA4 +
   the LinkedIn tag already run site-wide.
2. **CSRF rests on `SameSite=Lax`** — a library default, not an app assertion.
3. **A timing oracle remains** on registration: ~750ms for an existing address
   versus ~2700ms for a new one, because only the new path sends mail.
4. **No rate limiting on our own routes.** Supabase throttles auth; we add none.
5. **`clientIp()` trusts `x-forwarded-for`** — correct behind Netlify,
   forgeable otherwise. Audit data, not an access decision.
6. **400-day sessions**, no idle timeout, and sign-out is local — it does not
   revoke the refresh token globally.
7. **NDA signatures store IP and user agent.** Personal data, and the privacy
   policy is still unwritten (see `06-owed.md`).

---

## 10. Tests

```
npm test                      # unit only — ~1s, no server, no network
npm run test:watch
PORTAL_E2E=1 npx vitest run   # + integration, needs a server on :3111
```

Vitest. Config is **`vitest.config.mts`** — the `.mts` matters, because this
repo has no `"type": "module"` and a `.ts` config fails with `ERR_REQUIRE_ESM`.

**`tests/partner-state.test.ts`** — 22 pure tests of the state machine,
including an exhaustive sweep over every role × status × type × signed
combination asserting that `dashboard` is unreachable unless approved AND
signed, that a non-approved partner can only ever reach pending/rejected,
and — since 2026-08-10 — that `partner_type` is INERT: varying it must never
change the answer. That last one is the replacement for the old
`choose-type` coverage, and it is what would fail if type crept back into
the router.

**`tests/api-invariants.test.ts`** — 18 integration tests over HTTP.
**Off unless `PORTAL_E2E=1`**, because they create accounts and can send real
email. Every account is prefixed `portal-suite-` and deleted in `afterAll`.
Covers the enumeration regression, no-overwrite on re-registration,
validation, anonymous callers refused, deny-by-default gating (including an
unbuilt path), and the full RLS set.

**Why integration rather than mocks:** the enumeration bug was invisible to
unit tests. The route's logic read correctly; the leak only existed in the
round trip through Supabase and a foreign key. A mock would have been written
against the same wrong assumption that caused the bug.

One test — `answers identically for existing and brand-new addresses` — is
skipped unless `PORTAL_TEST_EMAIL_DOMAIN` is set to a deliverable domain. With
an undeliverable one the fresh path fails at the mail step and both responses
match *for the wrong reason*.

**The suite was verified by mutation**, not just by passing: the original bug
was reintroduced, and the test failed with `expected 500 to be 200`. A test
that has never been seen to fail is not yet known to test anything.

---

## 11. Runbook

**First admin.** No self-serve path exists, by design. Register normally, then
in the Supabase table editor set that row's `role` to `admin` and `status` to
`approved`.

**Change a partner's type.** Deliberately not self-serve. Set
`partners.partner_type` directly.

**Rename the partner types.** Edit `PARTNER_TYPE_LABELS` and
`PARTNER_TYPE_BLURBS` in `lib/partner.ts`. The **keys** `type_a/b/c` are
hardcoded in the `0002` check constraint — renaming those needs a data
migration, renaming the labels does not.

**Replace the NDA.** Swap `lib/nda.ts` and
`public/legal/visotonics-partner-nda.pdf`, then **bump `NDA_VERSION`**. Keep a
clause `key` stable if its meaning survives; use a new key if it changes.

**Demo accounts.** Six exist, all sharing one password, several with signature
records against placeholder text. Delete before launch.

---

## 12. Still outstanding

| Item | Blocking |
|---|---|
| Netlify environment variables | Verify per deploy — the build cannot validate the deployed environment |
| Custom SMTP via Resend in Supabase | Verify per deploy — confirmation and reset delivery depend on it |
| **Real NDA text** | Yes for real partners — current text is placeholder, not lawyer-reviewed |
| Deal decision emails | No — an admin approving or rejecting a deal notifies nobody. `lib/partner-mail.ts` has no deal sender yet |
| Dashboard content — catalogue and resources | No — still "Coming soon". Deals are live |
| Zoho | No — parked behind the seam |
| Mobile testing | No — needs a production-device pass |
| Audit log UI | No — SQL-only |
| Privacy policy | Not technical, but you now store names, emails, IPs and user agents |

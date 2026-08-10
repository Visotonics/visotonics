-- ---------------------------------------------------------------------------
-- Partner portal — admin decision audit log.
--
-- Apply AFTER 0002_onboarding_and_nda.sql. Safe to re-run.
--
-- Why this exists: `partners.decided_by` / `decided_at` are OVERWRITTEN on
-- every decision, so they answer "who decided last" and nothing else. An
-- account approved, then rejected, then approved again looks identical to one
-- approved once. For a gate that controls who sees confidential material,
-- "we cannot tell what happened" is not good enough.
--
-- Append-only by construction: no UPDATE or DELETE policy, and the only
-- writer is a server route on the service-role key. `partners.decided_by`
-- stays as the convenient denormalised "current decider" — this table is the
-- history behind it.
-- ---------------------------------------------------------------------------

create table if not exists public.partner_decisions (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references public.partners (id) on delete cascade,
  -- Kept even if the admin's own row is later removed: an audit trail that
  -- deletes itself when staff leave is not an audit trail.
  admin_id    uuid references public.partners (id) on delete set null,
  admin_email text,
  from_status text not null,
  to_status   text not null,
  reason      text,
  decided_at  timestamptz not null default now()
);

create index if not exists partner_decisions_partner_idx
  on public.partner_decisions (partner_id, decided_at desc);

alter table public.partner_decisions enable row level security;

drop policy if exists "admins read every decision" on public.partner_decisions;

-- Admins only. A partner is told the outcome and the reason by email and on
-- their own screen; they have no need for the internal decision history, and
-- it names the staff member who made the call.
create policy "admins read every decision"
  on public.partner_decisions for select
  to authenticated
  using (public.is_admin());

-- No insert/update/delete policy on purpose. Writes come from
-- app/api/partner-approve/route.ts on the service-role key.

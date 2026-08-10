-- ---------------------------------------------------------------------------
-- Partner portal — onboarding state machine + NDA.
--
-- Apply AFTER 0001_partners.sql. Idempotent enough to re-run.
--
-- What changes and why:
--
--   * `approved boolean` becomes `status text`. The flow now has three
--     outcomes, not two — pending, approved, REJECTED — and a boolean cannot
--     carry a third. The old column is dropped rather than kept in sync,
--     because two sources of truth for "can this partner get in" is exactly
--     the bug that would eventually let a rejected partner log in.
--
--   * `partner_type` becomes NULLABLE. It used to be collected at
--     registration; it is now chosen by the partner after approval, on a
--     gated onboarding screen. NULL means "approved but hasn't chosen yet",
--     which is a real state the app routes on.
--
--   * `decided_by` records WHICH admin approved. Needed so the "this partner
--     just signed the NDA" notice can go to the admin who let them in,
--     rather than to everyone.
--
--   * `nda_signatures` is a separate table, append-only in spirit: one row
--     per signing event, holding the exact clauses agreed to. Storing this
--     as columns on `partners` would lose the history the moment the NDA
--     text is revised, and the whole point of a signature record is that it
--     says what the document said AT THE TIME.
-- ---------------------------------------------------------------------------

-- ---- partners: status ------------------------------------------------------

alter table public.partners
  add column if not exists status text not null default 'pending';

-- Carry the old boolean across before it goes.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'partners' and column_name = 'approved'
  ) then
    update public.partners set status = case when approved then 'approved' else 'pending' end;
    alter table public.partners drop column approved;
  end if;
end $$;

alter table public.partners drop constraint if exists partners_status_check;
alter table public.partners
  add constraint partners_status_check check (status in ('pending', 'approved', 'rejected'));

-- ---- partners: the rest ----------------------------------------------------

alter table public.partners alter column partner_type drop not null;

alter table public.partners add column if not exists rejection_reason text;
alter table public.partners add column if not exists decided_at     timestamptz;
alter table public.partners add column if not exists decided_by     uuid references public.partners (id) on delete set null;
alter table public.partners add column if not exists nda_signed_at  timestamptz;

drop index if exists partners_pending_idx;
create index if not exists partners_pending_idx
  on public.partners (created_at)
  where status = 'pending';

-- ---- nda_signatures --------------------------------------------------------

create table if not exists public.nda_signatures (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references public.partners (id) on delete cascade,
  signed_at      timestamptz not null default now(),
  nda_version    text not null,
  full_name      text not null,
  job_title      text,
  -- The exact clause list as presented, each with its label and the partner's
  -- answer. Kept verbatim so a later revision of the NDA cannot retroactively
  -- change what somebody appears to have agreed to.
  agreements     jsonb not null,
  ip_address     text,
  user_agent     text,
  receipt_sent_at timestamptz
);

create index if not exists nda_signatures_partner_idx
  on public.nda_signatures (partner_id, signed_at desc);

alter table public.nda_signatures enable row level security;

drop policy if exists "partners read own signatures" on public.nda_signatures;
drop policy if exists "admins read every signature"  on public.nda_signatures;

create policy "partners read own signatures"
  on public.nda_signatures for select
  to authenticated
  using (partner_id = auth.uid());

create policy "admins read every signature"
  on public.nda_signatures for select
  to authenticated
  using (public.is_admin());

-- Same rule as `partners`: SELECT only. Every write goes through a server
-- route on the service-role key, so a partner cannot forge a signature record
-- or backdate one.

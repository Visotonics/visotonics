-- ---------------------------------------------------------------------------
-- Partner portal — initial schema.
--
-- Apply this in the Supabase dashboard SQL editor (or `supabase db push` if
-- the CLI is linked). It is idempotent enough to re-run safely.
--
-- Design notes:
--   * `partners.id` IS the auth user id. One row per account, no join table.
--   * NOBODY writes this table from the browser. There are SELECT policies
--     only — every insert/update goes through a server route using the
--     service-role key, which bypasses RLS. That is what makes it impossible
--     for a partner to set their own `role` or `approved`.
--   * `is_admin()` is SECURITY DEFINER on purpose: a policy on `partners`
--     that queried `partners` directly would recurse.
--   * `crm_synced_at` is unused today. It exists so that when Zoho
--     credentials arrive, the backfill is `where crm_synced_at is null`.
-- ---------------------------------------------------------------------------

create table if not exists public.partners (
  id            uuid primary key references auth.users (id) on delete cascade,
  company       text        not null,
  email         text        not null,
  partner_type  text        not null check (partner_type in ('type_a', 'type_b', 'type_c')),
  role          text        not null default 'partner' check (role in ('partner', 'admin')),
  approved      boolean     not null default false,
  created_at    timestamptz not null default now(),
  crm_synced_at timestamptz
);

create index if not exists partners_pending_idx
  on public.partners (created_at)
  where approved = false;

alter table public.partners enable row level security;

-- Reads the caller's role without re-entering the policy on `partners`.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.partners
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "partners read own row"  on public.partners;
drop policy if exists "admins read every row"  on public.partners;

create policy "partners read own row"
  on public.partners for select
  to authenticated
  using (id = auth.uid());

create policy "admins read every row"
  on public.partners for select
  to authenticated
  using (public.is_admin());

-- Deliberately NO insert/update/delete policies. Writes are server-only.

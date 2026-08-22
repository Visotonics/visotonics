-- 0005 — add VAD and ISV partner types; merge Channel Partner into Distributor.
--
-- Requested by Pramod 2026-08-21:
--   * two new types, VAD and ISV;
--   * "Channel Partner" and "Distributor" collapse to a single type,
--     Distributor. Rationale given: all partners are channel partners, and
--     Distributor is a TYPE of channel partner — so the old `type_c`
--     ("Channel Partner") was naming the umbrella, not a member of the set.
--
-- Keys, not labels, live in this constraint. type_d = VAD, type_e = ISV;
-- see PARTNER_TYPE_LABELS in lib/partner.ts. Labels are copy and change
-- freely; these keys are data and do not.

alter table public.partners
  drop constraint if exists partners_partner_type_check;

alter table public.partners
  add constraint partners_partner_type_check
  check (partner_type in ('type_a', 'type_b', 'type_c', 'type_d', 'type_e'));

-- OPTIONAL DATA CONSOLIDATION — deliberately left commented out.
--
-- `type_c` is no longer offered on the registration form, but existing rows
-- still hold it and the application labels them "Distributor" already, so
-- nothing is user-visibly wrong before this runs. Running it is a ONE-WAY
-- merge: once type_c rows become type_a there is no way to tell which
-- partners originally registered as Channel Partner.
--
-- Check what would be affected first:
--   select count(*) from public.partners where partner_type = 'type_c';
--
-- Then, if the merge is genuinely wanted:
-- update public.partners set partner_type = 'type_a' where partner_type = 'type_c';
--
-- After that has run everywhere, `type_c` can be dropped from both this
-- constraint and from PARTNER_TYPES in lib/partner.ts.

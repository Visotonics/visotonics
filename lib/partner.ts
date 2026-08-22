/* ---------------------------------------------------------------------------
   Partner vocabulary — types, labels, row shape, and the onboarding state
   machine.

   Kept separate from lib/auth.ts on purpose: auth.ts reaches for
   next/headers via the Supabase server client, so anything a Client
   Component needs must live here instead or the build fails with
   "you're importing a module that depends on next/headers".

   Rule of thumb: Client Components import from lib/partner, Server
   Components and route handlers import from lib/auth.
--------------------------------------------------------------------------- */

/* EVERY key the database may legitimately hold, which is NOT the same set as
   the ones a new applicant may pick — see PARTNER_TYPE_OPTIONS below.
   `type_c` is retained here even though it is no longer offered, because rows
   registered before the 2026-08-21 merge still hold it and must keep
   validating and rendering. Dropping it here would make isPartnerType() reject
   real partners and crash the admin table's label lookup. */
export const PARTNER_TYPES = ["type_a", "type_b", "type_c", "type_d", "type_e"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

/* The types a NEW applicant may choose, in the order they appear on the form.
   `type_c` (was "Channel Partner") is deliberately absent: Pramod confirmed
   2026-08-21 that Channel Partner and Distributor are one type, and that
   "all are channel partners — Distributor is a type of channel partner". So
   the category itself is the umbrella, not a selectable option, and the
   selectable type is Distributor. */
export const PARTNER_TYPE_OPTIONS = ["type_a", "type_b", "type_d", "type_e"] as const;

export type PartnerRole = "partner" | "admin";

/** pending -> approved | rejected. Deliberately a third state rather than a
 *  boolean: a rejected partner is not the same as one still in the queue. */
export type PartnerStatus = "pending" | "approved" | "rejected";

export type PartnerRow = {
  id: string;
  company: string;
  email: string;
  /** Required at registration since 2026-08-10. Still NULLABLE in the
   *  database and in this type because rows created under the previous
   *  design (type chosen post-approval) legitimately hold NULL. Render it
   *  defensively — "—" — never assume it is set. */
  partner_type: PartnerType | null;
  role: PartnerRole;
  status: PartnerStatus;
  rejection_reason: string | null;
  decided_at: string | null;
  decided_by: string | null;
  nda_signed_at: string | null;
  created_at: string;
  crm_synced_at: string | null;
};

/* The three partner types, named by Apratim 2026-08-08.
   The `type_a/b/c` KEYS are what live in the database and in the migration's
   check constraint — renaming a label is a copy change and touches nothing
   else, which is the whole reason keys and labels are separate here. Do not
   "tidy" the keys to match the labels; that would need a data migration. */
export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  type_a: "Distributor",
  type_b: "System Integrator",
  /* LEGACY, not selectable. Was "Channel Partner"; merged into Distributor on
     2026-08-21. It is labelled "Distributor" rather than left as "Channel
     Partner" so that the ~existing type_c rows read as the merged type
     everywhere they are displayed, without a data migration having to run
     first. If/when 0005's optional consolidation is applied, this key can be
     retired — until then it must stay. */
  type_c: "Distributor",
  type_d: "VAD",
  type_e: "ISV",
};

/** One line of explanation under each option on the selection screen. */
export const PARTNER_TYPE_BLURBS: Record<PartnerType, string> = {
  type_a: "You stock and resell Visotonics systems into your own territory.",
  type_b: "You specify, install and commission Visotonics on customer sites.",
  // legacy alias of type_a — same blurb, so a merged row reads consistently
  type_c: "You stock and resell Visotonics systems into your own territory.",
  type_d: "You add services, integration or support on top of what you distribute.",
  type_e: "You build your own software and embed Visotonics vision in it.",
};

export function isPartnerType(v: unknown): v is PartnerType {
  return typeof v === "string" && (PARTNER_TYPES as readonly string[]).includes(v);
}

/* ---------------------------------------------------------------------------
   The onboarding state machine.

   Every gated page and the sign-in redirect ask this ONE function where a
   partner belongs. That matters: the sequence is approval -> sign NDA ->
   dashboard, and if each page decided for itself, a partner would eventually
   find a gap between two pages that disagreed and land somewhere they hadn't
   earned.

   `choose-type` USED to sit between approval and the NDA. It was removed on
   2026-08-10 when partner type went back onto the registration form — see
   DECISIONS.md. A NULL `partner_type` therefore no longer routes anywhere:
   legacy rows created under the old design simply carry on to the NDA and
   render their type as "—".

   Admins skip the whole thing — they are staff, not partners.
--------------------------------------------------------------------------- */

export type OnboardingStep =
  | "pending"
  | "rejected"
  | "sign-nda"
  | "dashboard"
  | "admin";

export const STEP_ROUTES: Record<OnboardingStep, string> = {
  pending: "/client-portal/dashboard",
  rejected: "/client-portal/dashboard",
  "sign-nda": "/client-portal/onboarding/nda",
  dashboard: "/client-portal/dashboard",
  admin: "/client-portal/admin",
};

export function nextStepFor(partner: PartnerRow): OnboardingStep {
  if (partner.role === "admin") return "admin";
  if (partner.status === "rejected") return "rejected";
  if (partner.status !== "approved") return "pending";
  if (!partner.nda_signed_at) return "sign-nda";
  return "dashboard";
}

/** Where to send this partner right now. */
export function routeFor(partner: PartnerRow): string {
  return STEP_ROUTES[nextStepFor(partner)];
}

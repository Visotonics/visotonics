import { createServerSupabase } from "@/lib/supabase/server";
import { routeFor, type PartnerRole, type PartnerRow, type PartnerType } from "@/lib/partner";

/* ---------------------------------------------------------------------------
   The portal's one auth seam. SERVER ONLY — it pulls next/headers in through
   the Supabase server client. Client Components want lib/partner instead.

   Nothing outside lib/supabase/* and this file should import Supabase
   directly — every page and route asks these helpers instead. That keeps a
   future provider swap (or the eventual Zoho-backed reads) to a single file
   rather than a codebase-wide rewrite.

   `partners` is the source of truth for role / partner type / approval, not
   the auth user's metadata: metadata is client-visible and awkward to query,
   and the admin queue needs a real "where approved = false" over all rows.
--------------------------------------------------------------------------- */

export * from "@/lib/partner";

/** The signed-in partner's row, or null if signed out / no row / not configured. */
export async function getCurrentPartner(): Promise<PartnerRow | null> {
  const supabase = await createServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as PartnerRow;
}

export async function getRole(): Promise<PartnerRole | null> {
  return (await getCurrentPartner())?.role ?? null;
}

export async function getPartnerType(): Promise<PartnerType | null> {
  return (await getCurrentPartner())?.partner_type ?? null;
}

export async function isApproved(): Promise<boolean> {
  return (await getCurrentPartner())?.status === "approved";
}

/** Where this partner belongs right now, per the onboarding state machine.
 *  Pages should redirect to this rather than deciding for themselves. */
export async function currentRoute(): Promise<string | null> {
  const partner = await getCurrentPartner();
  return partner ? routeFor(partner) : null;
}

/** Guard for admin-only route handlers. Returns the admin's row or null. */
export async function requireAdmin(): Promise<PartnerRow | null> {
  const partner = await getCurrentPartner();
  return partner?.role === "admin" ? partner : null;
}

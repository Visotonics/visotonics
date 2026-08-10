import type { PartnerRow } from "@/lib/auth";

/* ---------------------------------------------------------------------------
   The Zoho seam — deliberately empty.

   DECISIONS.md records Zoho as the CRM the business already works in, but no
   credentials exist yet and the portal must not be blocked waiting for them.
   So this is the shape of the eventual integration, with a stub behind it.

   The important property: `partners` in Postgres is the source of truth, and
   Zoho is a SYNC TARGET off it — not a live dependency of registration. That
   means no queue/retry machinery is needed now. When credentials land, the
   backfill for everything registered in the meantime is just:

       select * from partners where crm_synced_at is null

   which is why the column exists from day one even though nothing sets it.

   To wire Zoho later: write a ZohoCrmProvider implementing this interface,
   and return it from getCrmProvider() when the env vars are present. No
   caller changes.
--------------------------------------------------------------------------- */

export interface PartnerCrmProvider {
  /** Push a newly-registered partner to the CRM. Must never throw. */
  pushLead(partner: PartnerRow): Promise<void>;
}

const stubProvider: PartnerCrmProvider = {
  async pushLead(partner) {
    console.log(
      `[partner-crm:stub] Would push to CRM — ${partner.email} (${partner.company}, ${partner.partner_type}). ` +
        `No CRM configured; row is recorded in Postgres with crm_synced_at = null and can be backfilled later.`
    );
  },
};

export function getCrmProvider(): PartnerCrmProvider {
  // TODO(zoho): when ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN
  // are configured, return a real ZohoCrmProvider here instead of the stub.
  return stubProvider;
}

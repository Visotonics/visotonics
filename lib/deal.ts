/* ---------------------------------------------------------------------------
   Deal vocabulary — industries, platforms, the row shape and the two guards.

   CLIENT-SAFE, and that is the whole reason this file exists rather than the
   constants living in lib/auth.ts. auth.ts pulls next/headers in through the
   Supabase server client, so importing it from a Client Component breaks the
   build with "you're importing a module that depends on next/headers". That
   trap has been hit twice in this repo. Same split as lib/partner.ts:

     Client Components  ->  lib/deal, lib/partner
     Server / routes    ->  lib/auth (which re-exports the safe ones)

   The KEYS here are what live in the database and in 0004's check
   constraints. Renaming a LABEL is a copy change and touches nothing else;
   renaming a key needs a data migration. Do not "tidy" the keys to match the
   labels.

   Route handlers validate the posted value against THESE lists, never
   against a label the browser sent. The check constraint in 0004 is the
   backstop, not the validator — a value that reaches Postgres and fails
   there surfaces as a 500, which tells the partner nothing.
--------------------------------------------------------------------------- */

export const INDUSTRIES = ["seaport", "warehouse", "airport", "enterprise"] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  seaport: "Seaport",
  warehouse: "Warehouse",
  airport: "Airport",
  enterprise: "Enterprise",
};

export const PLATFORMS = ["visopercept", "tracksure"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  visopercept: "VisoPercept — Industrial AI platform",
  tracksure: "TrackSure — digital twin",
};

/** submitted -> approved | rejected. One decision per deal, unlike a partner
 *  account, which can go round the loop more than once. */
export type DealStatus = "submitted" | "approved" | "rejected";

export const DEAL_STATUSES = ["submitted", "approved", "rejected"] as const;

export type DealRow = {
  id: string;
  partner_id: string;
  /** DL-XXXXXX. Generated server-side; the client never supplies it. */
  reference: string;
  customer_name: string;
  customer_email: string;
  industry: Industry;
  platform: Platform;
  /** numeric(14,2) — PostgREST returns it as a string to preserve precision. */
  estimated_value_usd: number | string;
  notes: string | null;
  status: DealStatus;
  rejection_reason: string | null;
  decided_at: string | null;
  decided_by: string | null;
  created_at: string;
};

export function isIndustry(v: unknown): v is Industry {
  return typeof v === "string" && (INDUSTRIES as readonly string[]).includes(v);
}

export function isPlatform(v: unknown): v is Platform {
  return typeof v === "string" && (PLATFORMS as readonly string[]).includes(v);
}

export function isDealStatus(v: unknown): v is DealStatus {
  return typeof v === "string" && (DEAL_STATUSES as readonly string[]).includes(v);
}

/* numeric(14,2) arrives from PostgREST as a STRING, because JSON numbers
   cannot carry the precision Postgres promises. Every consumer that adds or
   formats a value goes through here rather than sprinkling Number() around
   and silently producing NaN in a total. */
export function dealValue(row: Pick<DealRow, "estimated_value_usd">): number {
  const n = typeof row.estimated_value_usd === "number"
    ? row.estimated_value_usd
    : Number.parseFloat(row.estimated_value_usd ?? "");
  return Number.isFinite(n) ? n : 0;
}

/** Monetary figures read as instrument output — always mono, always the same
 *  grammar, never a bare number. No cents: nobody registers a deal to the
 *  penny and the column is wide enough to hurt when they try. */
export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

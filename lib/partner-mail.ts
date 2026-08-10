import { SITE_URL } from "@/lib/seo";
import type { PartnerRow } from "@/lib/partner";

/* ---------------------------------------------------------------------------
   The two partner-portal notifications.

   Both exist because the UI already promises them: the register screen says
   "we'll be in touch once it's active" and the pending-approval screen says
   "We'll email you as soon as it's active". Before this, approving an account
   was silent and the partner had to guess and re-check.

   Conventions copied from app/api/lead/route.ts, which is the house pattern
   for Resend in this repo:
     - no-op with a warning when the env vars aren't set, so the flow stays
       testable before credentials exist
     - the SDK does NOT throw on API-level rejections; it returns
       { data, error } and `error` must be checked explicitly or a refused
       send silently reports success
     - never throws — callers fire-and-forget, and a mail failure must never
       fail a registration or an approval

   Note this is a SEPARATE Resend key from the one Supabase uses for auth
   emails (confirmation / password reset). Supabase owns those; these two are
   ours. Revoking one does not affect the other.
--------------------------------------------------------------------------- */

function fromAddress() {
  return (
    process.env.PARTNER_FROM_EMAIL ||
    process.env.LEAD_FROM_EMAIL ||
    "Visotonics Portal <onboarding@resend.dev>"
  );
}

function adminInbox() {
  return process.env.PARTNER_NOTIFICATION_EMAIL || process.env.LEAD_NOTIFICATION_EMAIL;
}

async function send(opts: {
  to: string;
  subject: string;
  lines: string[];
  label: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[partner-mail] RESEND_API_KEY not set; ${opts.label} not sent:\n` + opts.lines.join("\n")
    );
    return;
  }

  try {
    const { Resend } = await import("resend");
    const { data, error } = await new Resend(apiKey).emails.send({
      from: fromAddress(),
      to: [opts.to],
      subject: opts.subject,
      text: opts.lines.join("\n"),
    });

    if (error) {
      console.error(`[partner-mail] Resend rejected ${opts.label}:`, error);
      return;
    }
    console.log(`[partner-mail] ${opts.label} accepted, id:`, data?.id);
  } catch (err) {
    console.error(`[partner-mail] ${opts.label} threw:`, err);
  }
}

/** Tell the team a partner registered and is waiting in the approval queue. */
export async function notifyAdminOfRegistration(partner: PartnerRow): Promise<void> {
  const to = adminInbox();
  if (!to) {
    console.warn(
      "[partner-mail] PARTNER_NOTIFICATION_EMAIL / LEAD_NOTIFICATION_EMAIL not set; " +
        `registration of ${partner.email} not announced.`
    );
    return;
  }

  await send({
    to,
    label: "admin registration notice",
    subject: `Partner registration — ${partner.company}`,
    lines: [
      "A new partner has registered and is waiting for approval.",
      "",
      `Company: ${partner.company}`,
      `Email:   ${partner.email}`,
      "",
      `Approve or reject them here: ${SITE_URL}/client-portal/admin`,
      "",
      "Partner type isn't collected at registration — they choose it themselves",
      "after approval, then sign the NDA. They see nothing in the portal until",
      "you approve the account.",
    ],
  });
}

/** Tell the partner their account is live. This is the promise the pending
 *  screen makes; without it, approval is invisible to them. */
export async function notifyPartnerApproved(partner: PartnerRow): Promise<void> {
  await send({
    to: partner.email,
    label: "partner approval notice",
    subject: "Your Visotonics partner account is active",
    lines: [
      `Hello ${partner.company},`,
      "",
      "Your Visotonics partner portal account has been approved.",
      "",
      "When you next sign in you'll be asked to confirm what kind of partner",
      "you are, and to review and sign our non-disclosure agreement. Once",
      "that's done you'll have full access to the portal.",
      "",
      `Sign in here: ${SITE_URL}/client-portal`,
      "",
      'If you\'ve forgotten your password, use the "Forgot password?" link on that page.',
    ],
  });
}

/** Tell the partner they were turned down, and why. The reason is required by
 *  /api/partner-approve precisely so this email can be useful. */
export async function notifyPartnerRejected(partner: PartnerRow, reason: string): Promise<void> {
  await send({
    to: partner.email,
    label: "partner rejection notice",
    subject: "About your Visotonics partner application",
    lines: [
      `Hello ${partner.company},`,
      "",
      "Thank you for applying to the Visotonics partner programme. On this",
      "occasion we're not able to approve your account.",
      "",
      `Reason given: ${reason}`,
      "",
      "If you believe this is a mistake, or your circumstances change, reply",
      "to this email and we'll take another look.",
    ],
  });
}

export type NdaReceipt = {
  fullName: string;
  jobTitle: string;
  signedAt: string;
  ndaVersion: string;
  agreements: { key: string; label: string; agreed: boolean }[];
  signatureId: string;
};

/** The partner's copy of what they just agreed to.
 *
 *  Deliberately spells out every clause verbatim rather than linking to the
 *  current NDA: the point of a receipt is that it records the document as it
 *  stood at signing, so a later revision can't quietly change it. */
export async function sendNdaReceipt(partner: PartnerRow, receipt: NdaReceipt): Promise<void> {
  await send({
    to: partner.email,
    label: "NDA receipt",
    subject: "Your signed Visotonics NDA — confirmation",
    lines: [
      "This is your record of the non-disclosure agreement you signed with Visotonics.",
      "Keep it for your files.",
      "",
      `Company:        ${partner.company}`,
      `Signed by:      ${receipt.fullName}${receipt.jobTitle ? ` (${receipt.jobTitle})` : ""}`,
      `Account email:  ${partner.email}`,
      `Signed at:      ${new Date(receipt.signedAt).toUTCString()}`,
      `NDA version:    ${receipt.ndaVersion}`,
      `Reference:      ${receipt.signatureId}`,
      "",
      "You confirmed each of the following:",
      "",
      ...receipt.agreements.map((a, i) => `  ${i + 1}. ${a.agreed ? "[agreed]" : "[not agreed]"} ${a.label}`),
      "",
      `The full agreement text is available in the portal: ${SITE_URL}/client-portal`,
    ],
  });
}

/** Point 14 of the flow: the admin who approved this partner is told when
 *  they sign. Goes to that specific admin — that's what `decided_by` is for —
 *  and falls back to the shared inbox if the row has no decider. */
export async function notifyAdminOfNdaSignature(
  partner: PartnerRow,
  signedByName: string
): Promise<void> {
  let to = adminInbox();

  if (partner.decided_by) {
    try {
      const { createAdminSupabase } = await import("@/lib/supabase/server");
      const db = createAdminSupabase();
      if (db) {
        const { data } = await db
          .from("partners")
          .select("email")
          .eq("id", partner.decided_by)
          .maybeSingle();
        if (data?.email) to = data.email as string;
      }
    } catch (err) {
      console.error("[partner-mail] could not resolve approving admin:", err);
    }
  }

  if (!to) {
    console.warn("[partner-mail] no admin recipient; NDA signature not announced.");
    return;
  }

  await send({
    to,
    label: "admin NDA signature notice",
    subject: `NDA signed — ${partner.company}`,
    lines: [
      `${partner.company} has signed the partner NDA.`,
      "",
      `Signed by: ${signedByName}`,
      `Account:   ${partner.email}`,
      "",
      "You approved this partner, so you're getting this notice.",
      "",
      `Partner accounts: ${SITE_URL}/client-portal/admin`,
    ],
  });
}

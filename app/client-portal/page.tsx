import { redirect } from "next/navigation";
import { PortalSheet } from "./_shared";
import SignInForm from "./sign-in-form";
import { pageMeta } from "@/lib/seo";
import { getCurrentPartner } from "@/lib/auth";
import { routeFor } from "@/lib/partner";

// Auth surface — never index.
export const metadata = pageMeta({
  title: "Sign in",
  description: "Sign in to the Visotonics client portal.",
  path: "/client-portal",
  noindex: true,
});

/* ---------------------------------------------------------------------------
   /client-portal — Login
   Chrome ported from Claude Design: Hero-DraftingTable.dc.html, Section 8 ·
   Login · Variant B. The form itself is now a real Supabase sign-in; the
   drafting-sheet canvas lives in PortalSheet so all five portal pages share
   one copy of it.
--------------------------------------------------------------------------- */

// Reads the session cookie. Without this the page prerenders static on a
// build where the Supabase env vars happen to be absent, and its staticness
// would then depend on build-time env — explicit beats accidental.
export const dynamic = "force-dynamic";

export default async function ClientPortalPage() {
  // Already signed in? Don't show a login form — send them wherever the
  // onboarding state machine says they belong. One function decides this for
  // every entry point, so no two pages can disagree about the sequence.
  const partner = await getCurrentPartner();
  if (partner) redirect(routeFor(partner));

  return (
    <PortalSheet>
      <SignInForm />
    </PortalSheet>
  );
}

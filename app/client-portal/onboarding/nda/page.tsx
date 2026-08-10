import { redirect } from "next/navigation";
import { PortalSheet } from "../../_shared";
import NdaForm from "./nda-form";
import { pageMeta } from "@/lib/seo";
import { getCurrentPartner } from "@/lib/auth";
import { nextStepFor, STEP_ROUTES } from "@/lib/partner";

// Gated surface — never index.
export const metadata = pageMeta({
  title: "Non-disclosure agreement",
  description: "Review and sign the Visotonics partner NDA.",
  path: "/client-portal/onboarding/nda",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function NdaPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/client-portal");

  // Same guard as the type screen: only the partner whose next step is
  // literally this one gets to see it. A partner who has already signed is
  // sent on rather than being able to sign twice.
  const step = nextStepFor(partner);
  if (step !== "sign-nda") redirect(STEP_ROUTES[step]);

  // Bleed: study 1c's rail divider runs the full height of the sheet.
  return (
    <PortalSheet width={1180} bleed>
      <NdaForm company={partner.company} email={partner.email} />
    </PortalSheet>
  );
}

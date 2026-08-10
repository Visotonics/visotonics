import { redirect } from "next/navigation";
import DealForm from "./deal-form";
import { pageMeta } from "@/lib/seo";
import { getCurrentPartner } from "@/lib/auth";
import { nextStepFor, PARTNER_TYPE_LABELS, STEP_ROUTES } from "@/lib/partner";
import {
  AppShell,
  BLUE,
  MONO,
  Panel,
  SANS,
  type NavItem,
} from "@/components/portal/app-shell";

// Gated surface — never index.
export const metadata = pageMeta({
  title: "Register a deal",
  description: "Register a Visotonics opportunity for approval.",
  path: "/client-portal/dashboard/deals/new",
  noindex: true,
});

/* ---------------------------------------------------------------------------
   /client-portal/dashboard/deals/new

   Gated the same way as the onboarding screens: ask the ONE state machine
   where this partner belongs and redirect to its answer unless the answer is
   `dashboard`. A partner still in the queue, or one who has not signed the
   NDA, cannot reach this page — and /api/deal-register refuses them too, so
   this is the convenience and that is the gate.
--------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const partner = await getCurrentPartner();
  if (!partner) redirect("/client-portal");

  const step = nextStepFor(partner);
  if (step !== "dashboard") redirect(STEP_ROUTES[step]);

  const typeLabel = partner.partner_type ? PARTNER_TYPE_LABELS[partner.partner_type] : "Partner";
  const initials =
    partner.company.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "PA";

  const nav: NavItem[] = [
    { num: "01", label: "Overview", href: "/client-portal/dashboard" },
    { num: "02", label: "Deals", href: "/client-portal/dashboard/deals/new", active: true },
    { num: "03", label: "Catalogue" },
    { num: "04", label: "Resources" },
    { num: "05", label: "Account" },
  ];

  return (
    <AppShell
      section="Partner portal"
      nav={nav}
      tabs={[{ label: "New registration", active: true }]}
      userInitials={initials}
      userName={partner.company}
      userRole={typeLabel}
      topRight={
        <div style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(244,245,247,0.4)" }}>
          {partner.company}
        </div>
      }
    >
      <div style={{ padding: 32, maxWidth: 860 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 300 }}>
          <div style={{ height: 1, background: BLUE }} />
          <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(92,200,255,0.85)" }}>
            Deal registration
          </div>
        </div>
        <h1 style={{ margin: "20px 0 8px", fontFamily: SANS, fontSize: 34, fontWeight: 600, letterSpacing: "-0.025em", color: "var(--text-dark-primary)" }}>
          Register an opportunity
        </h1>
        <p style={{ margin: "0 0 24px", maxWidth: "62ch", fontFamily: SANS, fontSize: 15, lineHeight: 1.6, color: "var(--text-dark-secondary)" }}>
          Tell us about the deal before you work it. Once partnerships approves the registration,
          the opportunity is protected to you and carries the reference we issue.
        </p>

        <Panel title="Opportunity" headerSize="lg">
          <DealForm />
        </Panel>
      </div>
    </AppShell>
  );
}

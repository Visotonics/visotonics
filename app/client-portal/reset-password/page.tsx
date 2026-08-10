import { PortalSheet } from "../_shared";
import ResetForm from "./reset-form";
import { pageMeta } from "@/lib/seo";

// Auth surface — never index.
export const metadata = pageMeta({
  title: "Reset password",
  description: "Reset your Visotonics client portal password.",
  path: "/client-portal/reset-password",
  noindex: true,
});

/* ---------------------------------------------------------------------------
   /client-portal/reset-password
   Chrome ported from Claude Design: Hero-DraftingTable.dc.html, Section 8 ·
   Forgot password. Same sheet as the Login page it links from.
--------------------------------------------------------------------------- */

export default function ResetPasswordPage() {
  return (
    <PortalSheet>
      <ResetForm />
    </PortalSheet>
  );
}

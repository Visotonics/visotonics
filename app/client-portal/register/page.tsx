import { PortalSheet } from "../_shared";
import RegisterForm from "./register-form";
import { pageMeta } from "@/lib/seo";

// Auth surface — never index.
export const metadata = pageMeta({
  title: "Register",
  description: "Request access to the Visotonics client portal.",
  path: "/client-portal/register",
  noindex: true,
});

/* ---------------------------------------------------------------------------
   /client-portal/register — Register
   Chrome ported from Claude Design: Hero-DraftingTable.dc.html, Section 8 ·
   Register · matches Login Variant B.
--------------------------------------------------------------------------- */

export default function RegisterPage() {
  return (
    <PortalSheet>
      <RegisterForm />
    </PortalSheet>
  );
}

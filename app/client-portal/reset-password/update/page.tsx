import { redirect } from "next/navigation";
import { PortalSheet } from "../../_shared";
import UpdateForm from "./update-form";
import { pageMeta } from "@/lib/seo";
import { createServerSupabase } from "@/lib/supabase/server";

// Auth surface — never index.
export const metadata = pageMeta({
  title: "New password",
  description: "Set a new Visotonics client portal password.",
  path: "/client-portal/reset-password/update",
  noindex: true,
});

// Reads the recovery session cookie — never prerender.
export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  // Reachable only with the recovery session the callback route created.
  const supabase = await createServerSupabase();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/client-portal/reset-password");

  return (
    <PortalSheet>
      <UpdateForm />
    </PortalSheet>
  );
}

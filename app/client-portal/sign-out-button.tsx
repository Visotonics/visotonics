"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TXT_D2 } from "./_shared";

export default function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // Even if the network call fails, get them off the gated pages.
    }
    router.replace("/client-portal");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="dt-underline"
      style={{ background: "none", border: "none", padding: 0, fontSize: 14, color: TXT_D2, cursor: "pointer" }}
    >
      Sign out
    </button>
  );
}

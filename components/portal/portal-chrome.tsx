"use client";

/* ---------------------------------------------------------------------------
   The partner dashboard and the admin dashboard are full-viewport application
   shells — they carry their own wordmark, their own navigation and their own
   sign-out, exactly as designed. Stacking the marketing SiteNav above and the
   full SiteFooter below them would put two navigations and two wordmarks on
   one screen.

   So those two routes render chromeless. Everything else in the portal — the
   auth sheets and both onboarding steps — keeps the site chrome, because they
   are pages a prospective partner reaches from the marketing site and may
   want to navigate away from.

   Same shape as ConditionalFooter in components/campaign/campaign-chrome.tsx:
   a thin client wrapper that only decides whether to render what the server
   already built.
--------------------------------------------------------------------------- */

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Routes that supply their own full-screen shell. */
const APP_ROUTES = ["/client-portal/dashboard", "/client-portal/admin"];

export function isPortalApp(pathname: string | null) {
  return !!pathname && APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/** Renders `children` everywhere except the portal's app-shell routes. */
export function HideOnPortalApp({ children }: { children: ReactNode }) {
  return isPortalApp(usePathname()) ? null : <>{children}</>;
}

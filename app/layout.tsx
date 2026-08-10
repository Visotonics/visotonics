import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd, organizationSchema, websiteSchema } from "@/components/json-ld";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { TrackingScripts } from "@/components/analytics/tracking-scripts";
import { ConditionalFooter } from "@/components/campaign/campaign-chrome";
import { HideOnPortalApp } from "@/components/portal/portal-chrome";
import { CampaignFooter } from "@/components/campaign/campaign-footer";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "AI vision",
    "computer vision",
    "container damage detection",
    "container terminal automation",
    "warehouse monitoring",
    "factory inspection",
    "CCTV analytics",
    "OCR container number",
    "logistics AI",
    "Visotonics",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  verification: {
    google: "UMY75_YxXBSbBq23uXBHTC5TWLQ2ujbExvFx8HQb7UM",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <noscript>
          <style>{`.v-reveal,.v-reveal-mono{opacity:1!important;transform:none!important}.v-dec{background:transparent!important;color:inherit!important}`}</style>
        </noscript>
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <HideOnPortalApp>
          <SiteNav />
        </HideOnPortalApp>
        <main className="flex-1">{children}</main>
        <HideOnPortalApp>
          <ConditionalFooter full={<SiteFooter />} minimal={<CampaignFooter />} />
        </HideOnPortalApp>
        <ConsentBanner />
        <TrackingScripts />
      </body>
    </html>
  );
}

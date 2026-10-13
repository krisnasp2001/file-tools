import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { SITE_CONFIG, SITE_URL } from "@/lib/config/site";
import { TOOL_CATEGORIES } from "@/lib/tools/registry";

export const metadata: Metadata = {
  title: {
    absolute: "File Tools - Free Browser-Based File Utilities",
  },
  description: SITE_CONFIG.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "File Tools - Free Browser-Based File Utilities",
    description: SITE_CONFIG.description,
    url: "/",
  },
};

export default function HomePage() {
  // --- JSON-LD: WebSite (enables Google Sitelinks Searchbox) ---
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    url: SITE_URL,
    description: SITE_CONFIG.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/tools/{search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // --- JSON-LD: SiteNavigationElement (main categories) ---
  const navSchema = {
    "@context": "https://schema.org",
    "@type": "SiteNavigationElement",
    name: TOOL_CATEGORIES.map((c) => c.name),
    url: TOOL_CATEGORIES.map((c) => `${SITE_URL}/categories/${c.id}`),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(navSchema) }}
      />
      <HomePageClient />
    </>
  );
}


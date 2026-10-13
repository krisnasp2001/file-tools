import { notFound } from "next/navigation";
import { getToolBySlug, getAllToolSlugs } from "@/lib/tools/registry";
import { ToolPageClient } from "./ToolPageClient";
import { SITE_URL } from "@/lib/config/site";
import type { Metadata } from "next";

interface ToolPageProps {
  params: Promise<{ tool: string }>;
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { tool: slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) {
    return { title: "Tool Not Found" };
  }

  return {
    title: tool.name,
    description: tool.description,
    alternates: {
      canonical: `/tools/${tool.slug}`,
    },
    openGraph: {
      title: `${tool.name} | File Tools`,
      description: tool.description,
      url: `/tools/${tool.slug}`,
    },
  };
}

export function generateStaticParams() {
  return getAllToolSlugs().map((slug) => ({ tool: slug }));
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { tool: slug } = await params;

  const toolDef = getToolBySlug(slug);
  if (!toolDef || !toolDef.isAvailable) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${toolDef.name} - File Tools`,
    description: toolDef.description,
    url: `${SITE_URL}/tools/${toolDef.slug}`,
    applicationCategory: "UtilityApplication",
    operatingSystem: "Any",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    browserRequirements: "Requires JavaScript and HTML5 capable web browser",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolPageClient slug={slug} />
    </>
  );
}

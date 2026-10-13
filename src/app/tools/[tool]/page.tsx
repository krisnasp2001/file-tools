import { notFound } from "next/navigation";
import { getToolBySlug, getAllToolSlugs, TOOL_CATEGORIES } from "@/lib/tools/registry";
import { ToolPageClient } from "./ToolPageClient";
import { ToolPageShell, ToolFaqSection } from "@/components/tools/ToolPageShell";
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
    keywords: [
      tool.name,
      `${tool.name} free`,
      `${tool.name} online`,
      `${tool.name} no upload`,
      ...tool.inputTypes.map((t) => t.replace(".", "").toUpperCase()),
      ...tool.outputTypes.map((t) => t.replace(".", "").toUpperCase()),
      "file converter",
      "browser-based",
      "client-side",
      "private",
    ],
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

  const category = TOOL_CATEGORIES.find((c) => c.id === toolDef.category);

  // --- JSON-LD: WebApplication ---
  const webAppSchema = {
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

  // --- JSON-LD: BreadcrumbList ---
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      ...(category
        ? [
            {
              "@type": "ListItem",
              position: 2,
              name: `${category.name} Tools`,
              item: `${SITE_URL}/categories/${category.id}`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: toolDef.name,
              item: `${SITE_URL}/tools/${toolDef.slug}`,
            },
          ]
        : [
            {
              "@type": "ListItem",
              position: 2,
              name: toolDef.name,
              item: `${SITE_URL}/tools/${toolDef.slug}`,
            },
          ]),
    ],
  };

  // --- JSON-LD: FAQPage (only if tool has faq data) ---
  const faqSchema =
    toolDef.faq && toolDef.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: toolDef.faq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  // --- JSON-LD: HowTo (only if tool has howTo steps) ---
  const howToSchema =
    toolDef.howTo && toolDef.howTo.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: `How to use ${toolDef.name}`,
          description: toolDef.description,
          tool: [{ "@type": "HowToTool", name: "File Tools" }],
          step: toolDef.howTo.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
          })),
        }
      : null;

  return (
    <>
      {/* ── 1. JSON-LD structured data (injected into <head> by Next.js) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {howToSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
        />
      )}

      {/* ── 2. SSR shell: breadcrumb + h1 + description (Google-crawlable) ── */}
      <ToolPageShell tool={toolDef} category={category} />

      {/* ── 3. Client-side interactive workspace (suppresses its own header) ── */}
      <ToolPageClient slug={slug} hideHeader />

      {/* ── 4. SSR FAQ accordion (Google-crawlable, no JS needed) ── */}
      <ToolFaqSection tool={toolDef} />
    </>
  );
}

import { notFound } from "next/navigation";
import { CategoryPageClient } from "@/components/home/CategoryPageClient";
import { TOOL_CATEGORIES, TOOLS } from "@/lib/tools/registry";
import { SITE_URL } from "@/lib/config/site";
import type { Metadata } from "next";
import type { ToolCategory } from "@/lib/tools/types";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = TOOL_CATEGORIES.find((c) => c.id === category);
  if (!cat) return { title: "Category Not Found" };

  const pageTitle = `${cat.name} Tools - Free Online File Utilities`;
  const pageDescription = `${cat.description} 100% free, private, and client-side in your browser with no upload required.`;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: cat.keywords || [
      `${cat.name.toLowerCase()} tools`,
      `free ${cat.name.toLowerCase()} converter`,
      "file converter online",
      "private file tools",
    ],
    alternates: {
      canonical: `/categories/${cat.id}`,
    },
    openGraph: {
      title: `${pageTitle} | File Tools`,
      description: pageDescription,
      url: `/categories/${cat.id}`,
      siteName: "File Tools",
    },
    twitter: {
      card: "summary_large_image",
      title: `${pageTitle} | File Tools`,
      description: pageDescription,
    },
  };
}

export function generateStaticParams() {
  return TOOL_CATEGORIES.map((c) => ({ category: c.id }));
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const cat = TOOL_CATEGORIES.find((c) => c.id === category);

  if (!cat) notFound();

  const toolsInCategory = TOOLS.filter(
    (t) => t.category === category && t.isAvailable
  );

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
      {
        "@type": "ListItem",
        position: 2,
        name: `${cat!.name} Tools`,
        item: `${SITE_URL}/categories/${cat!.id}`,
      },
    ],
  };

  // --- JSON-LD: ItemList (list of tools in this category) ---
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${cat!.name} Tools - File Tools`,
    description: cat!.description,
    url: `${SITE_URL}/categories/${cat!.id}`,
    numberOfItems: toolsInCategory.length,
    itemListElement: toolsInCategory.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: tool.name,
      description: tool.shortDescription,
      url: `${SITE_URL}/tools/${tool.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <CategoryPageClient categoryId={category as ToolCategory} />
    </>
  );
}


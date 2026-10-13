import { notFound } from "next/navigation";
import { CategoryPageClient } from "@/components/home/CategoryPageClient";
import { TOOL_CATEGORIES } from "@/lib/tools/registry";
import type { Metadata } from "next";
import type { ToolCategory } from "@/lib/tools/types";

interface Props {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const cat = TOOL_CATEGORIES.find((c) => c.id === category);
  if (!cat) return { title: "Category Not Found" };

  return {
    title: `${cat.name} Tools`,
    description: cat.description,
    alternates: {
      canonical: `/categories/${cat.id}`,
    },
    openGraph: {
      title: `${cat.name} Tools | File Tools`,
      description: cat.description,
      url: `/categories/${cat.id}`,
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

  return <CategoryPageClient categoryId={category as ToolCategory} />;
}

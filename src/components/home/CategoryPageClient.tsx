"use client";

import * as React from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  FileText,
  Files,
  Database,
  Clapperboard,
  ArrowRight,
  ArrowLeft,
  FileImage,
  Scissors,
  Merge,
  Search,
  Minimize2,
  Sparkles,
  Code,
  FileEdit,
  Sheet,
  Presentation,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TOOLS, TOOL_CATEGORIES } from "@/lib/tools/registry";
import type { ToolCategory } from "@/lib/tools/types";
import { useTranslation } from "@/lib/i18n/context";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
> = {
  Image: ImageIcon,
  FileText,
  Files,
  Database,
  Clapperboard,
  FileImage,
  Scissors,
  Merge,
  Minimize2,
  Sparkles,
  Code,
  FileEdit,
  Sheet,
  Presentation,
  BookOpen,
};

interface Props {
  categoryId: ToolCategory;
}

export function CategoryPageClient({ categoryId }: Props) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");

  const category = TOOL_CATEGORIES.find((c) => c.id === categoryId)!;
  const allCategoryTools = TOOLS.filter((t) => t.category === categoryId);

  // Localized category name & description
  const catKey = categoryId === "audio-video" ? "audioVideo" : (categoryId as keyof typeof t.categories);
  const catName = t.categories[catKey]?.name || category.name;
  const catDesc = t.categories[catKey]?.description || category.description;

  const filteredTools = React.useMemo(() => {
    if (!searchQuery.trim()) return allCategoryTools;
    const q = searchQuery.toLowerCase();
    return allCategoryTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q)
    );
  }, [allCategoryTools, searchQuery]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Back link */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t.common.home}
        </Link>
      </div>

      {/* Header */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {catName}
        </h1>
        <p className="mt-2 text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
          {catDesc}
        </p>

        {/* Search within category */}
        <div className="mt-6 max-w-md">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400 dark:text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${category.name} tools...`}
              aria-label={`Search ${category.name} tools`}
              className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tools grid */}
      <section aria-labelledby="tools-heading">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800 mb-6">
          <h2
            id="tools-heading"
            className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {filteredTools.length} tool{filteredTools.length !== 1 ? "s" : ""}
            {searchQuery && ` matching "${searchQuery}"`}
          </h2>
        </div>

        {filteredTools.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 dark:text-neutral-500">
            <p className="text-sm">No tools found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => {
              const Icon = ICON_MAP[tool.iconName] ?? FileText;
              const isAvailable = tool.isAvailable;

              const cardContent = (
                <Card
                  className={`flex flex-col justify-between transition-all ${
                    isAvailable
                      ? "cursor-pointer hover:border-neutral-400 hover:shadow-md dark:hover:border-neutral-600"
                      : "opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {tool.name}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {tool.categoryLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {tool.shortDescription}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800/80">
                    {isAvailable ? (
                      <>
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Available
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-900 dark:text-neutral-100">
                          Open tool
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-neutral-400 dark:text-neutral-500">
                          {tool.badge ?? "Coming soon"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-neutral-400 dark:text-neutral-500">
                          Planned
                        </span>
                      </>
                    )}
                  </div>
                </Card>
              );

              return isAvailable ? (
                <Link
                  key={tool.id}
                  href={tool.route}
                  aria-label={`Open ${tool.name} tool`}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-lg block"
                >
                  {cardContent}
                </Link>
              ) : (
                <div
                  key={tool.id}
                  aria-label={`${tool.name} — ${tool.badge ?? "coming soon"}`}
                >
                  {cardContent}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

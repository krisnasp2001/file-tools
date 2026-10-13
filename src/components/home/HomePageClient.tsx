"use client";

import * as React from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  FileText,
  Files,
  Database,
  Clapperboard,
  Search,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TOOLS, TOOL_CATEGORIES } from "@/lib/tools/registry";
import { ToolCategory } from "@/lib/tools/types";
import { useTranslation } from "@/lib/i18n/context";

const CATEGORY_ICON_MAP: Record<
  ToolCategory,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
> = {
  image: ImageIcon,
  pdf: FileText,
  document: Files,
  data: Database,
  "audio-video": Clapperboard,
};

export function HomePageClient() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");

  const filteredTools = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return TOOLS.filter(
      (tool) =>
        tool.name.toLowerCase().includes(q) ||
        tool.shortDescription.toLowerCase().includes(q) ||
        tool.categoryLabel.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Hero Section */}
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl lg:text-5xl dark:text-neutral-50">
          {t.home.heroTitleLine1}
          <br className="hidden sm:inline" />
          {" "}{t.home.heroTitleLine2}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
          {t.home.heroSubtitle}
        </p>

        {/* Visual Search Box */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative flex items-center">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-neutral-400 dark:text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.home.searchPlaceholder}
              aria-label={t.home.searchLabel}
              className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder-neutral-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {t.common.clearAll}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Global Search Results */}
      {showSearchResults && (
        <section className="mt-10" aria-label="Search results">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800 mb-6">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {filteredTools.length} result{filteredTools.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
            </p>
          </div>
          {filteredTools.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
              No tools matched your search.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTools.map((tool) => {
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
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {tool.name}
                        </h3>
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
                          <span className="font-medium text-neutral-400 dark:text-neutral-500">
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
                  <div key={tool.id} aria-label={`${tool.name} — ${tool.badge ?? "coming soon"}`}>
                    {cardContent}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Category Section — each card links to its own page */}
      {!showSearchResults && (
        <section id="tools" className="mt-16" aria-labelledby="categories-heading">
          <div className="border-b border-neutral-200 pb-4 dark:border-neutral-800 mb-6">
            <h2
              id="categories-heading"
              className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100"
            >
              {t.home.exploreCategories}
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {t.common.footerTagline}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOOL_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICON_MAP[category.id];
              const availableCount = TOOLS.filter(
                (t) => t.category === category.id && t.isAvailable
              ).length;
              const totalCount = TOOLS.filter((t) => t.category === category.id).length;

              // Localized category name & description
              const catKey = category.id === "audio-video" ? "audioVideo" : (category.id as keyof typeof t.categories);
              const catName = t.categories[catKey]?.name || category.name;
              const catDesc = t.categories[catKey]?.description || category.description;

              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.id}`}
                  className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 block"
                  aria-label={`Browse ${catName} tools`}
                >
                  <Card className="h-full flex flex-col justify-between transition-all hover:border-neutral-400 hover:shadow-md dark:hover:border-neutral-600">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {catName}
                        </h3>
                      </div>
                      <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                        {catDesc}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800/80">
                      <span className="font-medium text-neutral-400 dark:text-neutral-500">
                        {availableCount > 0
                          ? `${availableCount} / ${totalCount} ${t.common.tools.toLowerCase()}`
                          : `${totalCount} planned`}
                      </span>
                      <span className="inline-flex items-center gap-1 font-medium text-neutral-700 dark:text-neutral-300">
                        {t.common.allTools}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Privacy Section */}
      <section
        id="privacy"
        className="mt-16 rounded-xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/50"
        aria-labelledby="privacy-heading"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-200/80 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="privacy-heading"
              className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl dark:text-neutral-100"
            >
              {t.common.privacyBadge}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {t.common.privacyDescription}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" aria-hidden="true" /> {t.common.clientSideFeature}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t.common.noCloudUpload}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Anchor targets */}
      <div id="about" className="sr-only" aria-hidden="true" />
      <div id="donate" className="sr-only" aria-hidden="true" />
    </div>
  );
}

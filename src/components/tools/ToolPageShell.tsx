import * as React from "react";
import Link from "next/link";
import { ChevronRight, ShieldCheck, Zap, Globe } from "lucide-react";
import type { ToolDefinition, CategoryDefinition } from "@/lib/tools/types";

interface ToolPageShellProps {
  tool: ToolDefinition;
  category?: CategoryDefinition;
}

/**
 * Server-rendered shell for tool pages.
 *
 * This component intentionally has NO "use client" directive so Next.js renders
 * it as static HTML on the server. This makes the tool title, description, and
 * FAQ content immediately visible to Google's crawler — no JavaScript execution
 * required.
 *
 * The interactive workspace (FileDropzone, conversion logic, etc.) lives in the
 * sibling <ToolPageClient> which remains a client component.
 */
export function ToolPageShell({ tool, category }: ToolPageShellProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      {/* ── Breadcrumb (SSR, semantic <nav> for Google) ── */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-xs text-neutral-500 sm:text-sm dark:text-neutral-400"
      >
        <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <li className="inline-flex items-center gap-1.5">
            <Link
              href="/"
              className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-200"
            >
              Home
            </Link>
          </li>
          {category && (
            <li className="inline-flex items-center gap-1.5">
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-600"
                aria-hidden="true"
              />
              <Link
                href={`/categories/${category.id}`}
                className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                {category.name}
              </Link>
            </li>
          )}
          <li className="inline-flex items-center gap-1.5">
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-neutral-400 dark:text-neutral-600"
              aria-hidden="true"
            />
            <span
              className="font-medium text-neutral-900 dark:text-neutral-100"
              aria-current="page"
            >
              {tool.name}
            </span>
          </li>
        </ol>
      </nav>

      {/* ── Tool Header (SSR h1 + description — key for Google) ── */}
      <header className="mb-8 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl dark:text-neutral-50">
            {tool.name}
          </h1>
          {tool.badge && (
            <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {tool.badge}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-400">
          {tool.description}
        </p>

        {/* Trust badges — SSR for LCP & crawlability */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck
              className="h-3.5 w-3.5 text-green-600 dark:text-green-500"
              aria-hidden="true"
            />
            No file uploads — 100% private
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
            Runs in your browser
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
            Free — no account required
          </span>
        </div>

      </header>
    </div>
  );
}

/**
 * Server-rendered FAQ section for a tool page.
 *
 * Rendered as plain HTML <details>/<summary> — no JavaScript needed.
 * Google can read all Q&A content directly from the HTML source.
 */
export function ToolFaqSection({ tool }: { tool: ToolDefinition }) {
  if (!tool.faq || tool.faq.length === 0) return null;

  return (
    <section
      aria-labelledby={`faq-heading-${tool.slug}`}
      className="mx-auto max-w-6xl px-4 pb-12 sm:px-6"
    >
      <div className="border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <h2
          id={`faq-heading-${tool.slug}`}
          className="mb-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100"
        >
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {tool.faq.map((item, idx) => (
            <details
              key={idx}
              className="group rounded-xl border border-neutral-200 bg-white open:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:open:border-neutral-700"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-neutral-800 select-none dark:text-neutral-200">
                <span>{item.question}</span>
                {/* Pure CSS chevron — zero JS */}
                <span className="ml-auto shrink-0 text-neutral-400 transition-transform duration-200 group-open:rotate-180 dark:text-neutral-500">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Server-rendered Related Searches & Keywords section for a tool page.
 * Provides on-page crawlable text and semantic tags to boost Google Search indexing.
 */
export function ToolKeywordsSection({ tool }: { tool: ToolDefinition }) {
  if (!tool.keywords || tool.keywords.length === 0) return null;

  return (
    <section
      aria-labelledby={`keywords-heading-${tool.slug}`}
      className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"
    >
      <div className="border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <h2
          id={`keywords-heading-${tool.slug}`}
          className="mb-3 text-xs font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500"
        >
          Related Searches & Keywords
        </h2>
        <div className="flex flex-wrap gap-2">
          {tool.keywords.map((kw, idx) => (
            <span
              key={idx}
              className="inline-flex items-center rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-600 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-700"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

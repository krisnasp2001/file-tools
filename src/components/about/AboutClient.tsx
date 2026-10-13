"use client";

import * as React from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/context";
import {
  Zap,
  Sparkles,
  Heart,
  MessageSquare,
  Lock,
  ArrowRight,
} from "lucide-react";

export function AboutClient() {
  const { t } = useTranslation();

  const breadcrumbs = [
    { label: t.common.home, href: "/" },
    { label: t.common.about },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumb items={breadcrumbs} className="mb-8" />

      {/* Header / Hero */}
      <header className="mb-12 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {t.about.title}
        </h1>
        <p className="mt-3 text-lg font-medium text-neutral-700 sm:text-xl dark:text-neutral-300">
          {t.about.heroTitle}
        </p>
      </header>

      {/* Main Content Article */}
      <article className="space-y-10 text-neutral-700 dark:text-neutral-300">
        {/* Intro */}
        <section className="space-y-4 text-base leading-relaxed sm:text-lg">
          <p>{t.about.intro1}</p>
          <p>{t.about.intro2}</p>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {t.about.intro3}
          </p>
        </section>

        {/* Why File Tools Exists */}
        <Card className="border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <Zap className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t.about.whyExistsHeading}
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed sm:text-base text-neutral-600 dark:text-neutral-400">
            <p>{t.about.whyExistsP1}</p>
            <p>{t.about.whyExistsP2}</p>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">
              {t.about.whyExistsP3}
            </p>
          </div>
        </Card>

        {/* Privacy Matters */}
        <Card className="border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t.about.privacyMattersHeading}
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed sm:text-base text-neutral-600 dark:text-neutral-400">
            <p>{t.about.privacyMattersP1}</p>
            <p>{t.about.privacyMattersP2}</p>
          </div>
          <div className="mt-5">
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {t.about.viewPrivacyPolicy}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Card>

        {/* A Work in Progress */}
        <Card className="border-neutral-200 bg-white p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t.about.workInProgressHeading}
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed sm:text-base text-neutral-600 dark:text-neutral-400">
            <p>{t.about.workInProgressP1}</p>
            <p>{t.about.workInProgressP2}</p>
            <p>{t.about.workInProgressP3}</p>
          </div>
        </Card>

        {/* Built Independently, Improved Together */}
        <section className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-200/80 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              <Heart className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t.about.builtTogetherHeading}
            </h2>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed sm:text-base text-neutral-600 dark:text-neutral-400">
            <p>{t.about.builtTogetherP1}</p>
            <p>{t.about.builtTogetherP2}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 pt-2">
            <Link
              href="/feedback"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              {t.about.sendFeedback}
            </Link>
            <Link
              href="/donate"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <Heart className="h-4 w-4 text-rose-500" aria-hidden="true" />
              {t.about.supportProject}
            </Link>
          </div>
        </section>

        {/* Closing Motto */}
        <div className="border-t border-neutral-200 pt-8 text-center dark:border-neutral-800">
          <p className="text-base font-semibold tracking-wide text-neutral-900 sm:text-lg dark:text-neutral-100">
            {t.about.closingMotto}
          </p>
        </div>
      </article>
    </div>
  );
}

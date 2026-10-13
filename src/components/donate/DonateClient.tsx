"use client";

import * as React from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/lib/i18n/context";
import {
  Heart,
  Coffee,
  Zap,
  Wrench,
  Globe,
  Shield,
  ExternalLink,
  HandCoins,
  Sparkles,
} from "lucide-react";

const SAWERIA_URL = "https://saweria.co/Coffee4FileTools";

export function DonateClient() {
  const { t } = useTranslation();
  const td = t.donatePage;

  const breadcrumbs = [
    { label: t.common.home, href: "/" },
    { label: t.common.donate },
  ];

  const perks = [
    { icon: Wrench, text: td.perkMaintenance },
    { icon: Zap, text: td.perkNewTools },
    { icon: Globe, text: td.perkHosting },
    { icon: Shield, text: td.perkPrivacy },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumb items={breadcrumbs} className="mb-8" />

      {/* Hero header */}
      <header className="mb-10 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400">
          <Heart className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {td.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          {td.subtitle}
        </p>
      </header>

      <div className="space-y-8">
        {/* "Always optional" notice */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            ✅ {td.alwaysFreeNote}
          </p>
        </div>

        {/* Why donate — perks */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {td.whyHeading}
          </h2>
          <ul className="space-y-3">
            {perks.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* Saweria card */}
        <section
          aria-labelledby="saweria-heading"
          className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          {/* Card accent header */}
          <div className="flex items-center gap-3 border-b border-neutral-100 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Coffee className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="saweria-heading"
                className="text-sm font-semibold text-neutral-900 dark:text-neutral-100"
              >
                Saweria
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                saweria.co/Coffee4FileTools
              </p>
            </div>
            <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              {td.badgePopular}
            </span>
          </div>

          <div className="px-6 py-6">
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {td.saweriaDescription}
            </p>

            <a
              href={SAWERIA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:bg-amber-600 dark:hover:bg-amber-500"
              aria-label={td.donateButtonAriaLabel}
            >
              <HandCoins className="h-4 w-4" aria-hidden="true" />
              {td.donateButton}
              <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            </a>

            <p className="mt-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
              {td.externalNote}
            </p>
          </div>
        </section>

        {/* Future tools teaser */}
        <section className="rounded-xl border border-neutral-200 bg-neutral-50/60 px-5 py-5 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-neutral-500 dark:text-neutral-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {td.futureHeading}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
            {td.futureBody}
          </p>
        </section>

        {/* Closing note */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {td.closingNote}
        </p>
      </div>
    </div>
  );
}

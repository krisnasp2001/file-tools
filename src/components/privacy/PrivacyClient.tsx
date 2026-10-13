"use client";

import * as React from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/lib/i18n/context";
import {
  ServerOff,
  Cpu,
  Cookie,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export function PrivacyClient() {
  const { t } = useTranslation();

  const breadcrumbs = [
    { label: t.common.home, href: "/" },
    { label: t.common.privacy },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumb items={breadcrumbs} className="mb-8" />

      {/* Header */}
      <header className="mb-12 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
            {t.privacyPage.title}
          </h1>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {t.privacyPage.lastUpdated}
          </span>
        </div>
        <p className="mt-3 text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
          {t.privacyPage.subtitle}
        </p>
      </header>

      {/* Table of Contents / Summary Badges */}
      <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3.5 text-xs font-medium text-neutral-700 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>{t.common.clientSideFeature}</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3.5 text-xs font-medium text-neutral-700 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <ServerOff className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>{t.common.noCloudUpload}</span>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3.5 text-xs font-medium text-neutral-700 shadow-xs dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
          <Cookie className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>No ad/tracking cookies</span>
        </div>
      </div>

      <article className="space-y-12 text-sm leading-relaxed sm:text-base text-neutral-700 dark:text-neutral-300">
        {/* Section 1: Approach */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.approachHeading}
          </h2>
          <p>{t.privacyPage.approachP1}</p>
          <p>{t.privacyPage.approachP2}</p>
          <p>{t.privacyPage.approachP3}</p>
        </section>

        {/* Section 2: How files are processed */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.processingHeading}
          </h2>
          <p>{t.privacyPage.processingP1}</p>
          <div className="space-y-3 pt-2">
            <Card className="border-neutral-200 bg-white p-4.5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <p className="text-neutral-600 dark:text-neutral-300">
                  {t.privacyPage.processingListClient}
                </p>
              </div>
            </Card>

            <Card className="border-neutral-200 bg-white p-4.5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <p className="text-neutral-600 dark:text-neutral-300">
                  {t.privacyPage.processingListServer}
                </p>
              </div>
            </Card>

            <Card className="border-neutral-200 bg-white p-4.5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                <p className="text-neutral-600 dark:text-neutral-300">
                  {t.privacyPage.processingListThirdParty}
                </p>
              </div>
            </Card>
          </div>
        </section>

        {/* Section 3: File Storage and Retention */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.storageHeading}
          </h2>
          <p>{t.privacyPage.storageP1}</p>
          <p>{t.privacyPage.storageP2}</p>
        </section>

        {/* Section 4: Technical Information */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.technicalHeading}
          </h2>
          <p>{t.privacyPage.technicalP1}</p>
        </section>

        {/* Section 5: Cookies and Local Storage */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.storageCookiesHeading}
          </h2>
          <p>{t.privacyPage.storageCookiesP1}</p>
          <p>{t.privacyPage.storageCookiesP2}</p>
        </section>

        {/* Section 6: Third-Party Services */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.thirdPartyHeading}
          </h2>
          <p>{t.privacyPage.thirdPartyP1}</p>
        </section>

        {/* Section 7: Donations */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.donationsHeading}
          </h2>
          <p>{t.privacyPage.donationsP1}</p>
        </section>

        {/* Section 8: Changes to this Policy */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.changesHeading}
          </h2>
          <p>{t.privacyPage.changesP1}</p>
        </section>

        {/* Section 9: Contact and Feedback */}
        <section className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/50 space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            {t.privacyPage.contactHeading}
          </h2>
          <p>{t.privacyPage.contactP1}</p>
          <div className="pt-2">
            <Link
              href="/feedback"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {t.common.feedback}
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}

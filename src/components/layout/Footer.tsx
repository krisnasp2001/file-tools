"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50/50 py-10 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex flex-col items-center sm:items-start max-w-sm">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
              File Tools
            </span>
            <p className="mt-1 text-xs text-neutral-500">
              {t.common.footerTagline}
            </p>
            <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              {t.common.footerAttribution}
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm" aria-label="Footer Navigation">
            <Link
              href="/about"
              className="transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:hover:text-neutral-100"
            >
              {t.common.about}
            </Link>
            <Link
              href="/privacy"
              className="transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:hover:text-neutral-100"
            >
              {t.common.privacy}
            </Link>
            <Link
              href="/feedback"
              className="transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:hover:text-neutral-100"
            >
              {t.common.feedback}
            </Link>
            <Link
              href="/donate"
              className="transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:hover:text-neutral-100"
            >
              {t.common.donation}
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-neutral-200/80 pt-6 text-center text-xs text-neutral-500 sm:flex sm:items-center sm:justify-between sm:text-left dark:border-neutral-800">
          <p>© {currentYear} File Tools. {t.common.allRightsReserved}</p>
          <p className="mt-2 sm:mt-0">{t.common.noAdsTracking}</p>
        </div>
      </div>
    </footer>
  );
}

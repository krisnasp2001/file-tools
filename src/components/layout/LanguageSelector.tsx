"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { SUPPORTED_LOCALES, LOCALE_LABELS, Locale } from "@/lib/i18n/config";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useTranslation();

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <label htmlFor="language-selector" className="sr-only">
        Select Language / Pilih Bahasa
      </label>
      <div className="pointer-events-none flex items-center text-neutral-500 dark:text-neutral-400">
        <Globe className="h-4 w-4" aria-hidden="true" />
      </div>
      <select
        id="language-selector"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="rounded-md border border-neutral-200 bg-white/80 py-1 pl-2 pr-7 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/20 dark:border-neutral-800 dark:bg-neutral-900/80 dark:text-neutral-200 dark:hover:border-neutral-700 cursor-pointer"
        aria-label="Language selection"
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc} className="bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200">
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </div>
  );
}

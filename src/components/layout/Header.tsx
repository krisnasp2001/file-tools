"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, Files } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { useTranslation } from "@/lib/i18n/context";

export function Header() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold text-neutral-900 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-md dark:text-neutral-100 dark:hover:text-neutral-300"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900">
            <Files className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-base font-bold tracking-tight sm:text-lg">File Tools</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-6 text-sm font-medium" aria-label="Main Navigation">
            <Link
              href="/#tools"
              className="text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.common.tools}
            </Link>
            <Link
              href="/about"
              className="text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.common.about}
            </Link>
            <Link
              href="/privacy"
              className="text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.common.privacy}
            </Link>
            <Link
              href="/feedback"
              className="text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.common.feedback}
            </Link>
            <Link
              href="/donate"
              className="text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-sm dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              {t.common.donate}
            </Link>
          </nav>
          <LanguageSelector />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <IconButton
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </IconButton>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="border-b border-neutral-200 bg-white px-4 py-4 md:hidden dark:border-neutral-800 dark:bg-neutral-950">
          <nav className="flex flex-col gap-2 text-base font-medium" aria-label="Mobile Navigation">
            <Link
              href="/#tools"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              {t.common.tools}
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              {t.common.about}
            </Link>
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              {t.common.privacy}
            </Link>
            <Link
              href="/feedback"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              {t.common.feedback}
            </Link>
            <Link
              href="/donate"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              {t.common.donate}
            </Link>
            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <LanguageSelector className="w-full justify-between" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

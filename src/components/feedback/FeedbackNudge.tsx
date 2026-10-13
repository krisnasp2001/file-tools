"use client";

/**
 * FeedbackNudge
 *
 * A subtle, non-intrusive prompt that appears at the bottom-right of the
 * screen to invite users to share feedback. It respects user dismissals by
 * storing state in localStorage and will not reappear for COOLDOWN_DAYS after
 * it is dismissed.
 *
 * It never appears on the Feedback page itself.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, MessageSquare } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

const STORAGE_KEY = "file-tools-feedback-nudge";
const COOLDOWN_DAYS = 14;
// Delay before showing the nudge (ms) — avoids jarring the user on load
const SHOW_DELAY_MS = 8000;

function getLastDismissed(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function markDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

function isCooledDown(): boolean {
  const last = getLastDismissed();
  if (last === null) return true;
  const elapsed = Date.now() - last;
  const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return elapsed >= cooldownMs;
}

export function FeedbackNudge() {
  const { t } = useTranslation();
  const tf = t.feedbackPage;
  const pathname = usePathname();

  const [visible, setVisible] = React.useState(false);

  // Don't show on the feedback page itself
  const isFeedbackPage = pathname === "/feedback";

  React.useEffect(() => {
    if (isFeedbackPage) return;
    if (!isCooledDown()) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [isFeedbackPage]);

  function handleDismiss() {
    markDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label={tf.nudgeAriaLabel}
      className="fixed bottom-5 right-5 z-50 w-72 animate-in slide-in-from-bottom-4 fade-in duration-300"
    >
      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
        {/* Subtle accent bar */}
        <div className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-neutral-400 via-neutral-300 to-neutral-400 dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-600" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                {tf.nudgeTitle}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              aria-label={t.common.close}
              className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <p className="mt-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
            {tf.nudgeBody}
          </p>

          {/* CTA */}
          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/feedback"
              onClick={handleDismiss}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              {tf.nudgeCta}
            </Link>
            <button
              onClick={handleDismiss}
              className="text-xs text-neutral-400 underline-offset-2 transition-colors hover:text-neutral-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:hover:text-neutral-300"
            >
              {tf.nudgeDismiss}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

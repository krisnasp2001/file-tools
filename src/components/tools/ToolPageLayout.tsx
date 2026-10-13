import * as React from "react";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { ShieldCheck, Zap } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export interface ToolPageLayoutProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description: string;
  badge?: string;
  workspace: React.ReactNode;
  settings?: React.ReactNode;
  supportingInfo?: React.ReactNode;
  className?: string;
  /** When true, hides the breadcrumb and header because the server-rendered
   * ToolPageShell already rendered them above this component via SSR. */
  hideHeader?: boolean;
}

export function ToolPageLayout({
  breadcrumbs,
  title,
  description,
  badge,
  workspace,
  settings,
  supportingInfo,
  className = "",
  hideHeader = false,
}: ToolPageLayoutProps) {
  const { t } = useTranslation();

  // Localize "Home" in breadcrumb if first item is Home
  const localizedBreadcrumbs = React.useMemo(() => {
    return breadcrumbs.map((crumb, idx) => {
      if (idx === 0 && (crumb.label.toLowerCase() === "home" || crumb.label.toLowerCase() === "beranda")) {
        return { ...crumb, label: t.common.home };
      }
      return crumb;
    });
  }, [breadcrumbs, t.common.home]);

  return (
    <div className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10 ${className}`}>
      {/* 1. Breadcrumb — hidden when SSR shell already rendered it */}
      {!hideHeader && <Breadcrumb items={localizedBreadcrumbs} className="mb-6" />}

      {/* 2. Tool Title & Header — hidden when SSR shell already rendered it */}
      {!hideHeader && (
        <header className="mb-8 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl lg:text-4xl dark:text-neutral-50">
              {title}
            </h1>
            {badge && (
              <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base dark:text-neutral-400">
            {description}
          </p>
        </header>
      )}

      {/* 3. Main Workspace & Responsive Grid */}
      <main>
        {settings ? (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left: Input, Dropzone & Preview Area (approx 7 or 8 columns on desktop) */}
            <div className="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
              {workspace}
            </div>

            {/* Right: Settings & Processing Action Area (approx 4 or 5 columns on desktop) */}
            <div className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
              {settings}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">{workspace}</div>
        )}
      </main>

      {/* 4. Supporting / Educational / Privacy Section */}
      <section className="mt-16 border-t border-neutral-200 pt-10 dark:border-neutral-800">
        {supportingInfo ? (
          supportingInfo
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-6 sm:p-8 dark:border-neutral-800 dark:bg-neutral-900/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-neutral-200/80 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">
                  {t.common.privacyBadge}
                </h2>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm">
                  {t.common.privacyDescription}
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" aria-hidden="true" /> {t.common.clientSideFeature}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t.common.noCloudUpload}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

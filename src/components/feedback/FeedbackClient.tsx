"use client";

import * as React from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useTranslation } from "@/lib/i18n/context";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  ThumbsUp,
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FeedbackType = "Bug Report" | "Feature Request" | "General" | "Praise";

type FeedbackPageKey =
  | "typeBug"
  | "typeFeature"
  | "typeGeneral"
  | "typePraise";

interface FeedbackTypeOption {
  value: FeedbackType;
  labelKey: FeedbackPageKey;
  icon: React.ElementType;
  color: string;
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  {
    value: "Bug Report",
    labelKey: "typeBug",
    icon: Bug,
    color:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400",
  },
  {
    value: "Feature Request",
    labelKey: "typeFeature",
    icon: Lightbulb,
    color:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
  },
  {
    value: "General",
    labelKey: "typeGeneral",
    icon: MessageSquare,
    color:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-400",
  },
  {
    value: "Praise",
    labelKey: "typePraise",
    icon: ThumbsUp,
    color:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeedbackClient() {
  const { t, locale } = useTranslation();
  const tf = t.feedbackPage;

  const [selectedType, setSelectedType] = React.useState<FeedbackType>("General");
  const [tool, setTool] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<
    "idle" | "submitting" | "success" | "error" | "unavailable"
  >("idle");
  const [errorMsg, setErrorMsg] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const breadcrumbs = [
    { label: t.common.home, href: "/" },
    { label: t.common.feedback },
  ];

  const selectedTypeOption = FEEDBACK_TYPES.find(
    (o) => o.value === selectedType
  )!;

  const charCount = message.length;
  const MAX_CHARS = 2000;
  const isOverLimit = charCount > MAX_CHARS;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || isOverLimit) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          tool: tool.trim() || "—",
          message,
          lang: locale,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 503) {
          setStatus("unavailable");
        } else {
          setStatus("error");
          setErrorMsg(data.error ?? tf.errorGeneric);
        }
        return;
      }

      // Email sent server-side — just show success
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg(tf.errorGeneric);
    }
  }

  function handleReset() {
    setStatus("idle");
    setMessage("");
    setTool("");
    setSelectedType("General");
    setErrorMsg("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ------------------------------------------------------------------
  // Render: success state
  // ------------------------------------------------------------------
  if (status === "success") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {tf.successTitle}
        </h1>
        <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
          {tf.successBody}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {tf.sendAnother}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            {t.common.home}
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: unavailable state
  // ------------------------------------------------------------------
  if (status === "unavailable") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {tf.unavailableTitle}
        </h1>
        <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400">
          {tf.unavailableBody}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {t.common.home}
        </Link>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: form
  // ------------------------------------------------------------------
  const SelectedIcon = selectedTypeOption.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumb items={breadcrumbs} className="mb-8" />

      {/* Header */}
      <header className="mb-10 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {tf.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          {tf.subtitle}
        </p>
        {/* Privacy note */}
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          🔒 {tf.privacyNote}
        </p>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* Step 1 — Type */}
        <fieldset>
          <legend className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {tf.typeLabel}
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FEEDBACK_TYPES.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedType(opt.value)}
                  aria-pressed={isSelected}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 sm:text-sm ${
                    isSelected
                      ? `${opt.color} ring-2 ring-offset-1 ring-current`
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600"
                  }`}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tf[opt.labelKey]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Step 2 — Tool (optional) */}
        <div>
          <label
            htmlFor="feedback-tool"
            className="mb-1.5 block text-sm font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {tf.toolLabel}{" "}
            <span className="font-normal text-neutral-500 dark:text-neutral-400">
              ({tf.optional})
            </span>
          </label>
          <div className="relative">
            <select
              id="feedback-tool"
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              className="w-full appearance-none rounded-lg border border-neutral-300 bg-white py-2.5 pl-4 pr-10 text-sm text-neutral-900 shadow-sm transition focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">{tf.toolPlaceholder}</option>
              <option value="Image Converter">Image Converter</option>
              <option value="Audio Converter">Audio Converter</option>
              <option value="Audio Trimmer">Audio Trimmer</option>
              <option value="Video Format Converter">Video Format Converter</option>
              <option value="Video Trimmer">Video Trimmer</option>
              <option value="Video Frame Extractor">Video Frame Extractor</option>
              <option value="Video to Audio">Video to Audio</option>
              <option value="PDF Visual Editor">PDF Visual Editor</option>
              <option value="Other / General">Other / General</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Step 3 — Message */}
        <div>
          <label
            htmlFor="feedback-message"
            className="mb-1.5 block text-sm font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {tf.messageLabel}
          </label>
          <textarea
            id="feedback-message"
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={6}
            maxLength={MAX_CHARS + 200}
            placeholder={tf.messagePlaceholder}
            aria-describedby="feedback-message-hint"
            className={`w-full resize-y rounded-lg border px-4 py-3 text-sm text-neutral-900 shadow-sm transition focus:outline-none focus:ring-2 dark:text-neutral-100 dark:placeholder:text-neutral-500 ${
              isOverLimit
                ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-300 dark:border-rose-600 dark:bg-rose-950/20"
                : "border-neutral-300 bg-white focus:border-neutral-500 focus:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-900"
            }`}
          />
          <div
            id="feedback-message-hint"
            className={`mt-1.5 flex justify-end text-xs ${
              isOverLimit
                ? "text-rose-600 dark:text-rose-400"
                : "text-neutral-400"
            }`}
          >
            {charCount} / {MAX_CHARS}
          </div>
        </div>

        {/* How it works */}
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {tf.howItWorks}
        </p>

        {/* Error banner */}
        {status === "error" && errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={status === "submitting" || !message.trim() || isOverLimit}
            className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            <SelectedIcon className="h-4 w-4" aria-hidden="true" />
            {status === "submitting" ? tf.submitting : tf.submitButton}
            {status !== "submitting" && (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

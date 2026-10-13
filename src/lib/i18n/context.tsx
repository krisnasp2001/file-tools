"use client";

import * as React from "react";
import { Locale, DEFAULT_LOCALE, LOCALE_COOKIE_KEY, LOCALE_STORAGE_KEY } from "./config";
import { Translations } from "./locales/en";
import { getDictionary, interpolate, validateLocale } from "./index";

interface I18nContextValue {
  locale: Locale;
  setLocale: (nextLocale: Locale) => void;
  t: Translations;
  formatText: (template: string, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  // Sync with browser detection and localStorage on mount
  React.useEffect(() => {
    let active = true;
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (stored) {
        const validated = validateLocale(stored);
        queueMicrotask(() => {
          if (active) {
            setLocaleState((prev) => (prev !== validated ? validated : prev));
          }
        });
        return;
      }

      // If no stored preference, detect from navigator.language
      if (typeof navigator !== "undefined" && navigator.language) {
        const detected = validateLocale(navigator.language);
        queueMicrotask(() => {
          if (active) {
            setLocaleState((prev) => (prev !== detected ? detected : prev));
          }
        });
      }
    } catch {
      // Storage access may be restricted
    }
    return () => {
      active = false;
    };
  }, []);

  // Keep document lang attribute in sync with locale
  React.useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = React.useCallback((nextLocale: Locale) => {
    const valid = validateLocale(nextLocale);
    setLocaleState(valid);

    // Persist in localStorage
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, valid);
    } catch {
      // Ignore storage errors
    }

    // Persist in document.cookie for SSR alignment
    try {
      document.cookie = `${LOCALE_COOKIE_KEY}=${valid}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore cookie errors
    }

    // Update document lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = valid;
    }
  }, []);

  const dictionary = React.useMemo(() => getDictionary(locale), [locale]);

  const formatText = React.useCallback(
    (template: string, params?: Record<string, string | number>) => {
      return interpolate(template, params);
    },
    []
  );

  const value = React.useMemo(
    () => ({
      locale,
      setLocale,
      t: dictionary,
      formatText,
    }),
    [locale, setLocale, dictionary, formatText]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = React.useContext(I18nContext);
  if (!context) {
    // Graceful fallback for components outside provider during tests
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: getDictionary(DEFAULT_LOCALE),
      formatText: interpolate,
    };
  }
  return context;
}

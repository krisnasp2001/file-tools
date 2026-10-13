import { Locale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./config";
import { en, Translations } from "./locales/en";
import { id } from "./locales/id";

export const dictionaries: Record<Locale, Translations> = {
  en,
  id,
};

export function getDictionary(locale: Locale): Translations {
  return dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
}

/**
 * Replaces `{paramName}` placeholders inside a translation template string.
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
}

/**
 * Validates and falls back to a supported locale.
 */
export function validateLocale(rawLocale?: string | null): Locale {
  if (!rawLocale) return DEFAULT_LOCALE;
  const clean = rawLocale.toLowerCase().trim();
  if (SUPPORTED_LOCALES.includes(clean as Locale)) {
    return clean as Locale;
  }
  if (clean.startsWith("id")) return "id";
  if (clean.startsWith("en")) return "en";
  return DEFAULT_LOCALE;
}

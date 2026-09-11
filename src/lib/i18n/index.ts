import { en } from "./locales/en";
import { mr } from "./locales/mr";
import { hi } from "./locales/hi";
import { DEFAULT_LOCALE, Locale, SUPPORTED_LOCALES, TranslationDictionary } from "./types";

export * from "./types";

export const dictionaries: Record<Locale, TranslationDictionary> = {
  en,
  mr,
  hi,
};

/**
 * Resolves a nested key string like 'complaints.slaStatus' from a dictionary object.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Replaces placeholders like '{time}' with values from params.
 */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, val]) => {
    return acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(val));
  }, template);
}

/**
 * Translate a key into the target locale with English fallback.
 */
export function getTranslation(
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = DEFAULT_LOCALE
): string {
  const dict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
  let text = getNestedValue(dict as unknown as Record<string, unknown>, key);

  // Fallback to default (English) if missing
  if (!text && locale !== DEFAULT_LOCALE) {
    text = getNestedValue(dictionaries[DEFAULT_LOCALE] as unknown as Record<string, unknown>, key);
  }

  // If still not found, return the key as fallback
  if (!text) {
    return key;
  }

  return interpolate(text, params);
}

/**
 * Helper to get Intl locale string for a Locale code.
 */
export function getIntlLocale(locale: Locale = DEFAULT_LOCALE): string {
  const info = SUPPORTED_LOCALES.find((l) => l.code === locale);
  return info?.intlLocale || "en-IN";
}

/**
 * Format currency in Indian Rupees (INR) with Indian grouping and symbol.
 */
export function formatCurrency(amount: number, locale: Locale = DEFAULT_LOCALE): string {
  const safeAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const intlLocale = getIntlLocale(locale);
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `₹${safeAmount.toFixed(2)}`;
  }
}

/**
 * Format date in Asia/Kolkata timezone with target locale.
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const intlLocale = getIntlLocale(locale);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };

  try {
    return new Intl.DateTimeFormat(intlLocale, defaultOptions).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Format datetime in Asia/Kolkata timezone with target locale.
 */
export function formatDateTime(
  date: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const intlLocale = getIntlLocale(locale);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  };

  try {
    return new Intl.DateTimeFormat(intlLocale, defaultOptions).format(d);
  } catch {
    return d.toLocaleString();
  }
}

/**
 * Format number with Indian number system according to locale.
 */
export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  const safeVal = typeof value === "number" && !isNaN(value) ? value : 0;
  const intlLocale = getIntlLocale(locale);
  try {
    return new Intl.NumberFormat(intlLocale, options).format(safeVal);
  } catch {
    return safeVal.toString();
  }
}


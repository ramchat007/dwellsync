"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  DEFAULT_LOCALE,
  Locale,
  LocaleInfo,
  SUPPORTED_LOCALES,
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
  formatNumber as baseFormatNumber,
  getTranslation,
} from "./index";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatDateTime: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  supportedLocales: readonly LocaleInfo[];
  isChangingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const COOKIE_NAME = "dwellsync_locale";
const STORAGE_KEY = "dwellsync_locale";

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  // 1. Try localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (stored === "en" || stored === "mr" || stored === "hi")) {
    return stored as Locale;
  }

  // 2. Try cookie
  const match = document.cookie.match(new RegExp(`(^| )${COOKIE_NAME}=([^;]+)`));
  if (match && (match[2] === "en" || match[2] === "mr" || match[2] === "hi")) {
    return match[2] as Locale;
  }

  return DEFAULT_LOCALE;
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale || DEFAULT_LOCALE);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  // Sync with client-side storage on mount if initialLocale was not explicitly forced
  useEffect(() => {
    const detected = getInitialLocale();
    if (detected) {
      setLocaleState((prev) => (detected !== prev ? detected : prev));
    }
    // Attempt fetching user's saved preference from profile API
    fetch("/api/user/language")
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data?.preferredLanguage && (data.preferredLanguage === "en" || data.preferredLanguage === "mr" || data.preferredLanguage === "hi")) {
          setLocaleState(data.preferredLanguage);
          localStorage.setItem(STORAGE_KEY, data.preferredLanguage);
          document.cookie = `${COOKIE_NAME}=${data.preferredLanguage}; path=/; max-age=31536000; SameSite=Lax`;
          document.documentElement.lang = data.preferredLanguage;
        }
      })
      .catch(() => {
        // Silently catch unauthenticated or network errors
      });
  }, []);

  const setLocale = useCallback(async (newLocale: Locale) => {
    if (!["en", "mr", "hi"].includes(newLocale)) return;

    // Instant local feedback
    setLocaleState(newLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.cookie = `${COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
    }

    // Persist to database profile
    setIsChangingLanguage(true);
    try {
      await fetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: newLocale }),
      });
    } catch (e) {
      console.warn("Failed to persist language preference to server:", e);
    } finally {
      setIsChangingLanguage(false);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return getTranslation(key, params, locale);
    },
    [locale]
  );

  const formatCurrency = useCallback(
    (amount: number) => {
      return baseFormatCurrency(amount, locale);
    },
    [locale]
  );

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      return baseFormatDate(date, locale, options);
    },
    [locale]
  );

  const formatDateTime = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      return baseFormatDateTime(date, locale, options);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => {
      return baseFormatNumber(value, locale, options);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatCurrency,
      formatDate,
      formatDateTime,
      formatNumber,
      supportedLocales: SUPPORTED_LOCALES,
      isChangingLanguage,
    }),
    [locale, setLocale, t, formatCurrency, formatDate, formatDateTime, formatNumber, isChangingLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}


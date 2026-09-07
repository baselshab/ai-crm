"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { Language, Direction, Translations } from "./types";
import { en } from "./translations/en";
import { ar } from "./translations/ar";

interface LanguageContextType {
  language: Language;
  direction: Direction;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (path: string, fallback?: string) => string;
  translations: Translations;
}

const STORAGE_KEY = "sanad_crm_lang";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default is English as requested
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (savedLang === "ar" || savedLang === "en") {
        setLanguageState(savedLang);
        document.documentElement.setAttribute("dir", savedLang === "ar" ? "rtl" : "ltr");
        document.documentElement.setAttribute("lang", savedLang);
      } else {
        document.documentElement.setAttribute("dir", "ltr");
        document.documentElement.setAttribute("lang", "en");
      }
    } catch {
      // Fallback in case localStorage is disabled
      document.documentElement.setAttribute("dir", "ltr");
      document.documentElement.setAttribute("lang", "en");
    }
    setMounted(true);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage failure
    }
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ar" : "en");
  }, [language, setLanguage]);

  const direction: Direction = language === "ar" ? "rtl" : "ltr";
  const isRTL = direction === "rtl";

  const translations = useMemo(() => {
    return language === "ar" ? ar : en;
  }, [language]);

  /**
   * Helper to resolve nested key path like "dashboard.welcome" or "common.save"
   */
  const t = useCallback(
    (path: string, fallback?: string): string => {
      const parts = path.split(".");
      let current: unknown = translations;

      for (const part of parts) {
        if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return fallback || path;
        }
      }

      return typeof current === "string" ? current : fallback || path;
    },
    [translations]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        isRTL,
        setLanguage,
        toggleLanguage,
        t,
        translations,
      }}
    >
      {/* Ensure initial hydration doesn't mismatch */}
      <div dir={mounted ? direction : "ltr"} className="min-h-full flex flex-col flex-1">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, translations, language, isRTL, direction, toggleLanguage, setLanguage } = useLanguage();
  return { t, tr: translations, language, isRTL, direction, toggleLanguage, setLanguage };
}

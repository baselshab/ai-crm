"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  variant?: "pill" | "subtle" | "compact";
}

export function LanguageToggle({ className, variant = "pill" }: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        title={language === "en" ? "تغيير اللغة إلى العربية" : "Switch language to English"}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-muted text-xs font-semibold text-ink transition shadow-xs cursor-pointer",
          className
        )}
      >
        <Globe className="h-3.5 w-3.5 text-brand-600" />
        <span className="font-mono">{language === "en" ? "العربية" : "EN"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={language === "en" ? "تغيير اللغة إلى العربية (Switch to Arabic)" : "Switch to English (التبديل إلى الإنجليزية)"}
      className={cn(
        "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface hover:bg-surface-muted text-xs font-medium text-ink transition shadow-[var(--shadow-soft)] hover:border-brand-300 cursor-pointer select-none",
        className
      )}
    >
      <Globe className="h-3.5 w-3.5 text-brand-600 transition-transform group-hover:rotate-12 duration-300" />
      <span className="font-semibold text-ink">
        {language === "en" ? "العربية" : "English"}
      </span>
      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-surface-muted text-ink-soft group-hover:text-brand-700">
        {language === "en" ? "AR" : "EN"}
      </span>
    </button>
  );
}

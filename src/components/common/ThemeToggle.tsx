"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "pill";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { tr, isRTL } = useTranslation();

  const title = isDark
    ? (isRTL ? "التبديل إلى الوضع الفاتح" : "Switch to Light Mode")
    : (isRTL ? "التبديل إلى الوضع الداكن" : "Switch to Dark Mode");

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={title}
        aria-label={title}
        className={cn(
          "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-surface hover:bg-surface-muted text-xs font-medium text-ink transition shadow-[var(--shadow-soft)] hover:border-brand-300 cursor-pointer select-none",
          className
        )}
      >
        <span className="relative flex h-4 w-4 items-center justify-center">
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 rotate-0 group-hover:rotate-45" />
          ) : (
            <Moon className="h-4 w-4 text-brand-600 transition-transform duration-300 -rotate-12 group-hover:rotate-0" />
          )}
        </span>
        <span className="font-semibold text-ink">
          {isDark ? tr.common.lightMode : tr.common.darkMode}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={title}
      aria-label={title}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft hover:text-ink hover:bg-surface-muted hover:border-brand-300 transition shadow-xs cursor-pointer",
        className
      )}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px] text-amber-400 transition-all duration-300 rotate-0 scale-100 hover:rotate-45" />
      ) : (
        <Moon className="h-[18px] w-[18px] text-ink-soft transition-all duration-300 -rotate-12 scale-100 hover:text-brand-600 hover:rotate-0" />
      )}
    </button>
  );
}

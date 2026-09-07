"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SanadLogoVariant =
  | "primary"
  | "horizontal"
  | "mark"
  | "white"
  | "white-mark"
  | "mono";

interface SanadLogoProps {
  variant?: SanadLogoVariant;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showTagline?: boolean;
}

export function SanadLogoMark({
  className,
  colorScheme = "gradient",
  size = 36,
}: {
  className?: string;
  colorScheme?: "gradient" | "white" | "mono";
  size?: number;
}) {
  const isWhite = colorScheme === "white";
  const isMono = colorScheme === "mono";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 transition-transform duration-200", className)}
      aria-label="سند | SANAD Logo Mark"
    >
      <defs>
        <linearGradient id="sanad-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38BDF8" />
          <stop offset="50%" stop-color="#0284C7" />
          <stop offset="100%" stop-color="#0369A1" />
        </linearGradient>
        <linearGradient id="sanad-azure" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0EA5E9" />
          <stop offset="70%" stop-color="#0284C7" />
          <stop offset="100%" stop-color="#075985" />
        </linearGradient>
        <linearGradient id="sanad-deep" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0369A1" />
          <stop offset="100%" stop-color="#0C4A6E" />
        </linearGradient>
        <linearGradient id="sanad-beam" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284C7" />
          <stop offset="100%" stop-color="#0369A1" />
        </linearGradient>
        <filter id="sanad-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#0369A1" flood-opacity="0.28" />
        </filter>
      </defs>

      <g filter={!isWhite && !isMono ? "url(#sanad-shadow)" : undefined}>
        {/* Top Arch */}
        <path
          d="M 256 68 L 396 150 C 412 160 420 176 420 196 L 420 236 L 358 200 L 358 184 L 256 124 L 176 172 L 176 220 L 118 186 L 118 174 C 118 154 126 138 142 128 Z"
          fill={isWhite ? "#FFFFFF" : isMono ? "#0F172A" : "url(#sanad-cyan)"}
        />

        {/* Diagonal Beam */}
        <path
          d="M 374 196 L 202 308 L 152 278 L 324 166 Z"
          fill={isWhite ? "#FFFFFF" : isMono ? "#1E293B" : "url(#sanad-beam)"}
          fillOpacity={isWhite ? 0.9 : 1}
        />

        {/* Bottom Arch */}
        <path
          d="M 256 444 L 116 362 C 100 352 92 336 92 316 L 92 276 L 154 312 L 154 328 L 256 388 L 336 340 L 336 292 L 394 326 L 394 338 C 394 358 386 374 370 384 Z"
          fill={isWhite ? "#FFFFFF" : isMono ? "#0F172A" : "url(#sanad-azure)"}
        />

        {/* Shadow Folds */}
        <path
          d="M 358 184 L 420 220 L 374 250 L 324 214 Z"
          fill={isWhite ? "#FFFFFF" : isMono ? "#334155" : "url(#sanad-deep)"}
          fillOpacity={isWhite ? 0.75 : 0.95}
        />
        <path
          d="M 154 328 L 92 292 L 138 262 L 188 298 Z"
          fill={isWhite ? "#FFFFFF" : isMono ? "#334155" : "url(#sanad-deep)"}
          fillOpacity={isWhite ? 0.75 : 0.95}
        />
      </g>
    </svg>
  );
}

export function SanadLogo({
  variant = "horizontal",
  size = "md",
  className,
  showTagline = true,
}: SanadLogoProps) {
  const sizeMap: Record<string, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72,
  };

  const markSize = typeof size === "number" ? size : sizeMap[size] || 40;

  // 1. Standalone Mark Variants
  if (variant === "mark") {
    return <SanadLogoMark size={markSize} className={className} colorScheme="gradient" />;
  }
  if (variant === "white-mark") {
    return <SanadLogoMark size={markSize} className={className} colorScheme="white" />;
  }

  // 2. Primary Centered Stacked Logo
  if (variant === "primary") {
    return (
      <div className={cn("inline-flex flex-col items-center text-center gap-2", className)}>
        <SanadLogoMark size={markSize * 1.5} colorScheme="gradient" />
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 font-display">
            <span className="text-2xl font-bold tracking-tight text-slate-900 font-arabic">سند</span>
            <span className="text-xl font-light text-slate-400">|</span>
            <span className="text-2xl font-extrabold tracking-wider text-slate-900 font-sans">SANAD</span>
          </div>
          {showTagline && (
            <span className="text-[11px] font-semibold tracking-widest text-sky-600 uppercase mt-0.5">
              AI CRM • Support &amp; Unity
            </span>
          )}
        </div>
      </div>
    );
  }

  // 3. White Full Logo (for Dark Backgrounds)
  if (variant === "white") {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <SanadLogoMark size={markSize} colorScheme="white" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white font-arabic">سند</span>
            <span className="text-base font-light text-slate-400">|</span>
            <span className="text-lg font-extrabold tracking-wider text-white font-sans">SANAD</span>
          </div>
          {showTagline && (
            <span className="text-[9px] font-medium tracking-widest text-sky-300 uppercase">
              AI CRM Enterprise
            </span>
          )}
        </div>
      </div>
    );
  }

  // 4. Monochrome Logo (Solid Black)
  if (variant === "mono") {
    return (
      <div className={cn("inline-flex items-center gap-3", className)}>
        <SanadLogoMark size={markSize} colorScheme="mono" />
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-950 font-arabic">سند</span>
            <span className="text-base font-light text-slate-400">|</span>
            <span className="text-lg font-extrabold tracking-wider text-slate-950 font-sans">SANAD</span>
          </div>
          {showTagline && (
            <span className="text-[9px] font-medium tracking-widest text-slate-600 uppercase">
              AI CRM
            </span>
          )}
        </div>
      </div>
    );
  }

  // 5. Default: Horizontal Logo (Ideal for Navbars, Sidebars & TopNav)
  return (
    <div className={cn("inline-flex items-center gap-3 group select-none", className)}>
      <SanadLogoMark size={markSize} colorScheme="gradient" />
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 tracking-tight font-arabic">سند</span>
          <span className="text-sm font-light text-slate-300">|</span>
          <span className="text-lg font-extrabold tracking-wide text-slate-900 font-sans">SANAD</span>
        </div>
        {showTagline && (
          <span className="text-[10px] font-semibold tracking-wider text-sky-600 uppercase">
            AI CRM
          </span>
        )}
      </div>
    </div>
  );
}

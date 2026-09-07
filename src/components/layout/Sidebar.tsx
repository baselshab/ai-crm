"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Contact2,
  KanbanSquare,
  StickyNote,
  CalendarCheck,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  onNavigate?: () => void;
  isMobile?: boolean;
}

export function Sidebar({
  onNavigate,
  isMobile = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { tr, isRTL } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const NAV = [
    { href: "/dashboard", label: tr.nav.dashboard, icon: LayoutGrid },
    { href: "/leads", label: tr.nav.leads, icon: Users },
    { href: "/contacts", label: tr.nav.contacts, icon: Contact2 },
    { href: "/pipeline", label: tr.nav.pipeline, icon: KanbanSquare },
    { href: "/notes", label: tr.nav.notes, icon: StickyNote },
    { href: "/tasks", label: tr.nav.tasks, icon: CalendarCheck },
  ];

  // Expanded on mobile drawer or on hover for desktop
  const isExpanded = isMobile || isHovered;

  const isSettingsActive =
    pathname === "/settings" ||
    pathname.startsWith("/settings");

  return (
    <aside
      onMouseEnter={() => {
        if (!isMobile) setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) setIsHovered(false);
      }}
      className={cn(
        "group/sidebar relative z-30 flex flex-col",
        "h-[calc(100vh-2*clamp(12px,2vh,16px))]",
        "my-[clamp(12px,2vh,16px)]",
        "bg-surface border border-line",
        "rounded-[40px]",
        "transition-[width,padding,box-shadow] duration-300",
        "ease-[cubic-bezier(0.16,1,0.3,1)]",
        "select-none overflow-hidden",

        isMobile
          ? "w-64 p-5 shadow-2xl"
          : cn(
            "py-5 px-[22px]",
            isExpanded
              ? "w-[248px] shadow-2xl"
              : "w-[88px] shadow-sm hover:shadow-xl"
          )
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center pb-5 border-b border-line">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center group/brand overflow-hidden cursor-pointer"
        >
          {/* Static 44px mark container */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <Image
              src="/brand/sanad-mark.svg"
              alt="سند | SANAD"
              width={34}
              height={34}
              className="h-8.5 w-8.5 shrink-0 transition-transform duration-200 group-hover/brand:scale-105"
              priority
            />
          </div>

          {/* Expandable Brand Typography */}
          <div
            className={cn(
              "flex flex-col leading-tight whitespace-nowrap ps-2",
              "transition-all duration-300",
              "ease-[cubic-bezier(0.16,1,0.3,1)]",
              isExpanded
                ? "opacity-100 translate-x-0 max-w-[150px] pointer-events-auto"
                : cn("opacity-0 max-w-0 overflow-hidden pointer-events-none", isRTL ? "translate-x-2" : "-translate-x-2")
            )}
          >
            <div className="flex items-center gap-1.5 font-display">
              <span className="text-base font-bold text-ink">
                سند
              </span>

              <span className="text-xs text-ink-soft/50">
                |
              </span>

              <span className="text-base font-extrabold tracking-wide text-ink">
                SANAD
              </span>
            </div>

            <span className="text-[9px] font-semibold text-sky-600 tracking-wider uppercase -mt-0.5">
              AI CRM
            </span>
          </div>
        </Link>

        {/* Mobile Close Button */}
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="p-1 rounded-lg text-ink-soft hover:bg-surface-muted transition ms-auto lg:hidden cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="mt-5 flex-1 space-y-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" &&
              pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              title={isExpanded ? undefined : label}
              className={cn(
                "group/item flex h-11 items-center",
                "rounded-2xl overflow-hidden cursor-pointer",
                "transition-all duration-300",
                "ease-[cubic-bezier(0.16,1,0.3,1)]",
                isExpanded ? "w-[200px]" : "w-11",
                isActive
                  ? "bg-[#C7EAF6] text-[#0B6680] font-semibold"
                  : "text-ink-soft hover:bg-surface-muted hover:text-ink"
              )}
            >
              {/* Static Icon Container */}
              <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                <Icon className="h-[18px] w-[18px] shrink-0" />
              </div>

              {/* Expandable Label */}
              <span
                className={cn(
                  "whitespace-nowrap text-sm ps-1",
                  "transition-all duration-300",
                  "ease-[cubic-bezier(0.16,1,0.3,1)]",
                  isExpanded
                    ? "opacity-100 translate-x-0 max-w-[140px] pointer-events-auto"
                    : cn("opacity-0 max-w-0 overflow-hidden pointer-events-none", isRTL ? "translate-x-2" : "-translate-x-2")
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-line space-y-2 mt-auto">
        {/* Settings */}
        <Link
          href="/settings"
          onClick={onNavigate}
          title={isExpanded ? undefined : tr.nav.settings}
          className={cn(
            "group/item flex h-11 items-center",
            "rounded-2xl overflow-hidden cursor-pointer",
            "transition-all duration-300",
            "ease-[cubic-bezier(0.16,1,0.3,1)]",
            isExpanded ? "w-[200px]" : "w-11",

            isSettingsActive
              ? "bg-ink text-white shadow-sm font-semibold"
              : "text-ink-soft hover:bg-surface-muted hover:text-ink font-medium"
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <Settings className="h-[18px] w-[18px] shrink-0" />
          </div>

          <span
            className={cn(
              "whitespace-nowrap text-sm ps-1",
              "transition-all duration-300",
              "ease-[cubic-bezier(0.16,1,0.3,1)]",
              isExpanded
                ? "opacity-100 translate-x-0 max-w-[140px] pointer-events-auto"
                : cn("opacity-0 max-w-0 overflow-hidden pointer-events-none", isRTL ? "translate-x-2" : "-translate-x-2")
            )}
          >
            {tr.nav.settings}
          </span>
        </Link>

        {/* Log Out */}
        <button
          onClick={() =>
            signOut({
              callbackUrl: "/login",
            })
          }
          title={isExpanded ? undefined : tr.nav.logout}
          className={cn(
            "group/item flex h-11 items-center",
            "rounded-2xl overflow-hidden cursor-pointer",
            "transition-all duration-300",
            "ease-[cubic-bezier(0.16,1,0.3,1)]",
            "text-ink-soft hover:bg-rose-50 hover:text-rose-600 font-medium",
            isExpanded ? "w-[200px]" : "w-11"
          )}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <LogOut className="h-[18px] w-[18px] shrink-0" />
          </div>

          <span
            className={cn(
              "whitespace-nowrap text-sm ps-1",
              "transition-all duration-300",
              "ease-[cubic-bezier(0.16,1,0.3,1)]",
              isExpanded
                ? "opacity-100 translate-x-0 max-w-[140px] pointer-events-auto"
                : cn("opacity-0 max-w-0 overflow-hidden pointer-events-none", isRTL ? "translate-x-2" : "-translate-x-2")
            )}
          >
            {tr.nav.logout}
          </span>
        </button>
      </div>
    </aside>
  );
}
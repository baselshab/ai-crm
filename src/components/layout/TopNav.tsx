"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Bell, Menu, ChevronDown, User, LogOut } from "lucide-react";
import {
  Avatar,
  IconButton,
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui";
import { signOut } from "next-auth/react";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

export interface TopNavProps {
  onMenuClick?: () => void;
  user?: {
    name?: string | null;
    email?: string | null;
    organizationName?: string | null;
    role?: string | null;
  };
}

export function TopNav({ onMenuClick, user }: TopNavProps) {
  const pathname = usePathname();
  const { tr, isRTL } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-ink-soft hover:bg-surface-muted lg:hidden cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Action cluster */}
        <div className="ms-auto flex items-center gap-2 sm:gap-2.5">
          {/* Language Switcher */}
          <LanguageToggle />

          {/* Dark / Light Theme Toggle */}
          <ThemeToggle />

          {/* Global Search Button */}
          <IconButton
            aria-label={tr.common.search}
            title={isRTL ? "البحث الشامل (Ctrl+K)" : "Global Search (Ctrl+K)"}
            onClick={() => setSearchOpen(true)}
            className="inline-flex cursor-pointer"
          >
            <Search className="h-[18px] w-[18px]" />
          </IconButton>

          {/* Notifications */}
          <IconButton aria-label="Notifications" className="relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute end-2.5 top-2.5 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-surface" />
          </IconButton>

          {/* User Profile Menu */}
          <Dropdown
            align="right"
            trigger={
              <button className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 ps-1 pe-2.5 transition hover:bg-surface-muted cursor-pointer">
                <Avatar name={user?.name || user?.email || "User"} size="sm" />
                <ChevronDown className="h-4 w-4 text-ink-soft" />
              </button>
            }
          >
            <DropdownLabel>
              <span className="font-semibold text-ink block">{user?.name || "User"}</span>
              <span className="text-xs text-ink-soft block truncate">{user?.email}</span>
              {user?.organizationName && (
                <span className="text-[11px] text-brand-600 font-mono mt-0.5 block">{user.organizationName}</span>
              )}
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownItem onClick={() => (window.location.href = "/settings")}>
              <User className="h-4 w-4" /> {tr.nav.workspaceSettings}
            </DropdownItem>
            <DropdownItem danger onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="h-4 w-4" /> {tr.nav.logout}
            </DropdownItem>
          </Dropdown>
        </div>
      </header>

      {/* Global Search / Command Palette Dialog */}
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

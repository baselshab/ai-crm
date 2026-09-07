"use client";

import React, { useState } from "react";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { Toaster } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

export interface AppLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    organizationName?: string | null;
    role?: string | null;
  };
}

export function AppLayout({ children, user }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isRTL } = useTranslation();

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Toaster position={isRTL ? "top-left" : "top-right"} richColors />

      {/* Desktop expandable sidebar */}
      <div className="hidden shrink-0 lg:flex z-30">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up"
            onClick={() => setMobileOpen(false)}
          />
          <div className={cn("absolute top-0 h-full animate-[slidein_.25s_ease]", isRTL ? "right-0" : "left-0")}>
            <Sidebar onNavigate={() => setMobileOpen(false)} isMobile />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="px-4 pt-4 md:px-6 md:pt-5">
          <TopNav onMenuClick={() => setMobileOpen(true)} user={user} />
        </div>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

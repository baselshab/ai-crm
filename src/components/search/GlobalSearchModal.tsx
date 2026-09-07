"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Users,
  Contact2,
  KanbanSquare,
  CalendarCheck,
  StickyNote,
  Settings,
  LayoutGrid,
  ArrowRight,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { searchGlobal, type GlobalSearchResults, type SearchResultItem } from "@/lib/actions/search";
import { useTranslation } from "@/i18n/LanguageContext";
import { cn } from "@/lib/utils";

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { tr, isRTL } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResults>({
    leads: [],
    contacts: [],
    deals: [],
    tasks: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults({ leads: [], contacts: [], deals: [], tasks: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Global ESC key listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ leads: [], contacts: [], deals: [], tasks: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchGlobal(query);
        setResults(res);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (url: string) => {
    onClose();
    router.push(url);
  };

  if (!open) return null;

  const quickNav = [
    { label: tr.nav.dashboard, href: "/dashboard", icon: LayoutGrid },
    { label: tr.nav.leads, href: "/leads", icon: Users },
    { label: tr.nav.contacts, href: "/contacts", icon: Contact2 },
    { label: tr.nav.pipeline, href: "/pipeline", icon: KanbanSquare },
    { label: tr.nav.tasks, href: "/tasks", icon: CalendarCheck },
    { label: tr.nav.notes, href: "/notes", icon: StickyNote },
    { label: tr.nav.settings, href: "/settings", icon: Settings },
  ];

  const filteredNav = query.trim()
    ? quickNav.filter((item) =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : quickNav;

  const totalResultsCount =
    results.leads.length +
    results.contacts.length +
    results.deals.length +
    results.tasks.length;

  const hasSearchQuery = query.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-2xl bg-surface border border-line rounded-3xl shadow-[var(--shadow-pop)] overflow-hidden animate-fade-up flex flex-col max-h-[80vh]",
          "text-ink"
        )}
      >
        {/* Search Header Input */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-line bg-surface">
          <Search className="h-5 w-5 shrink-0 text-ink-soft" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr.common.searchPlaceholder}
            className="flex-1 bg-transparent text-base font-medium text-ink placeholder:text-ink-soft/60 focus:outline-none"
          />
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-brand-500 shrink-0" />
          )}
          {query && !isSearching && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-surface-muted transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-ink-soft bg-surface-muted rounded-md border border-line">
            ESC
          </kbd>
        </div>

        {/* Results / Navigation Body */}
        <div className="overflow-y-auto p-4 space-y-5 no-scrollbar">
          {/* Quick Navigation items (when query matches or when empty) */}
          {(!hasSearchQuery || filteredNav.length > 0) && (
            <div>
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                {tr.common.quickNavigation}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavigate(item.href)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-surface-muted hover:text-brand-600 transition text-start cursor-pointer group"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted group-hover:bg-brand-500/10 group-hover:text-brand-600 text-ink-soft transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* CRM Leads Results */}
          {results.leads.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <span>{tr.nav.leads}</span>
                <span className="text-[10px] font-mono text-brand-600 font-semibold">
                  {results.leads.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.leads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => handleNavigate(lead.url)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted transition text-start cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink group-hover:text-brand-600 truncate">
                          {lead.title}
                        </div>
                        {lead.subtitle && (
                          <div className="text-[11px] text-ink-soft truncate">
                            {lead.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {lead.badge && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-ink-soft border border-line">
                        {lead.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRM Contacts Results */}
          {results.contacts.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <span>{tr.nav.contacts}</span>
                <span className="text-[10px] font-mono text-brand-600 font-semibold">
                  {results.contacts.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleNavigate(contact.url)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted transition text-start cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                        <Contact2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink group-hover:text-brand-600 truncate">
                          {contact.title}
                        </div>
                        {contact.subtitle && (
                          <div className="text-[11px] text-ink-soft truncate">
                            {contact.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {contact.badge && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-ink-soft border border-line">
                        {contact.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRM Deals Results */}
          {results.deals.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <span>{tr.nav.pipeline}</span>
                <span className="text-[10px] font-mono text-brand-600 font-semibold">
                  {results.deals.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.deals.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => handleNavigate(deal.url)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted transition text-start cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                        <KanbanSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink group-hover:text-brand-600 truncate">
                          {deal.title}
                        </div>
                        {deal.subtitle && (
                          <div className="text-[11px] text-ink-soft truncate">
                            {deal.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {deal.badge && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-ink-soft border border-line">
                        {deal.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CRM Tasks Results */}
          {results.tasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <span>{tr.nav.tasks}</span>
                <span className="text-[10px] font-mono text-brand-600 font-semibold">
                  {results.tasks.length}
                </span>
              </div>
              <div className="space-y-1">
                {results.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleNavigate(task.url)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-muted transition text-start cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                        <CalendarCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-ink group-hover:text-brand-600 truncate">
                          {task.title}
                        </div>
                        {task.subtitle && (
                          <div className="text-[11px] text-ink-soft truncate">
                            {task.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {task.badge && (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface-muted text-ink-soft border border-line">
                        {task.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty search state */}
          {hasSearchQuery && !isSearching && totalResultsCount === 0 && filteredNav.length === 0 && (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-ink-soft mb-3">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-ink">
                {tr.common.noResults}
              </p>
              <p className="text-xs text-ink-soft mt-1">
                {isRTL
                  ? `لم يتم العثور على أي نتائج مطابقة لـ "${query}"`
                  : `No results found matching "${query}"`}
              </p>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-surface-muted/50 border-t border-line text-[11px] text-ink-soft">
          <div className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3.5 w-3.5" />
            <span>{isRTL ? "انقر للانتقال" : "Click to navigate"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>{tr.common.pressEscToClose}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

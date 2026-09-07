"use client";

import React from "react";
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
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/contacts", label: "Contacts", icon: Contact2 },
  { href: "/pipeline", label: "Pipeline", icon: KanbanSquare },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/tasks", label: "Follow-ups", icon: CalendarCheck },
];

function RailLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      title={label}
      className={cn(
        "group relative flex h-11 w-11 items-center justify-center rounded-2xl transition cursor-pointer",
        isActive
          ? "brand-gradient text-white shadow-sm"
          : "text-ink-soft hover:bg-surface-muted hover:text-ink"
      )}
    >
      <Icon className="h-5 w-5" />
      {/* Tooltip on hover */}
      <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100 lg:block z-50">
        {label}
      </span>
    </Link>
  );
}

export function IconRail() {
  return (
    <aside className="flex h-full flex-col items-center py-4">
      {/* Brand logo */}

      {/* Primary nav */}
      <nav className="mt-10 flex flex-col items-center gap-3">
        {NAV.map((item) => (
          <RailLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="my-2 h-px w-6 bg-line" />

        <RailLink
          href="/settings"
          label="Settings"
          icon={Settings}
        />

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Log out"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl text-ink-soft transition hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}

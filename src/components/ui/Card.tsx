import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-surface rounded-3xl border border-line shadow-[var(--shadow-card)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4 p-6 pb-0", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-base font-semibold text-ink", className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ink-soft mt-0.5", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export interface SectionHeadingProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  to?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  to,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-muted text-ink-soft">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-sm text-ink-soft">{subtitle}</p>}
        </div>
      </div>
      {action ??
        (to ? (
          <Link
            href={to}
            aria-label="Open"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:bg-surface-muted hover:text-ink active:scale-95"
          >
            <ArrowUpRight className="h-[18px] w-[18px]" />
          </Link>
        ) : null)}
    </div>
  );
}

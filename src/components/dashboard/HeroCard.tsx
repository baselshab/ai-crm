"use client";

import React from "react";
import Image from "next/image";
import { Wifi } from "lucide-react";
import { Card, SectionHeading } from "@/components/ui";
import { currency } from "@/lib/format";
import { useTranslation } from "@/i18n/LanguageContext";

export interface HeroCardProps {
  value?: number;
  label?: string;
  orgName?: string;
}

/**
 * The "credit-card" hero from the reference design: a brand gradient card surfacing
 * total Pipeline Value with account-style framing.
 */
export function HeroCard({ value = 0, label, orgName = "SANAD" }: HeroCardProps) {
  const { tr } = useTranslation();
  const displayLabel = label || tr.dashboard.statsPipelineValue;

  return (
    <Card className="p-6">
      <SectionHeading title={tr.dashboard.revenueGoal} subtitle={tr.dashboard.quickSummary} to="/pipeline" />

      <div className="brand-gradient relative mt-5 overflow-hidden rounded-2xl p-5 text-white shadow-[var(--shadow-soft)]">
        {/* Decorative glow */}
        <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/brand/sanad-mark-white.svg"
              alt="SANAD"
              width={24}
              height={24}
              className="h-6 w-6 opacity-90"
            />
            <span className="font-display text-lg font-extrabold tracking-tight">
              {orgName}
            </span>
          </div>
          <Wifi className="h-6 w-6 rotate-90 opacity-90" />
        </div>

        <p className="relative mt-6 text-sm text-white/70">{displayLabel}</p>
        <p className="relative mt-1 font-display text-3xl font-bold tracking-tight">
          {currency(value)}
        </p>

        <div className="relative mt-6 flex items-center justify-between text-sm">
          <span className="tracking-[0.2em] text-white/80">•••• PIPELINE</span>
          <span className="text-white/70">LIVE</span>
        </div>
      </div>
    </Card>
  );
}

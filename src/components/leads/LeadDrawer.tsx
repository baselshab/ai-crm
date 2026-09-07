"use client";

import React, { useState } from "react";
import {
  Mail,
  Phone,
  Building2,
  Pencil,
  Trash2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Drawer, Button, Badge, Avatar, Spinner } from "@/components/ui";
import { currency, shortDate } from "@/lib/format";
import { STAGE_STYLES, PRIORITY_STYLES } from "@/lib/constants";
import { getLeadAiSummary, type LeadAiSummaryResult } from "@/lib/actions/ai";
import { AiEmailDialog } from "@/components/ai/AiEmailDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LeadItem } from "@/lib/actions/leads";
import { useTranslation } from "@/i18n/LanguageContext";

export interface LeadDrawerProps {
  open: boolean;
  onClose: () => void;
  lead?: LeadItem | null;
  onEdit: (lead: LeadItem) => void;
  onDelete: (lead: LeadItem) => void;
}

/** Detailed slide-over for a single lead with AI Summary and Email Drafting. */
export function LeadDrawer({ open, onClose, lead, onEdit, onDelete }: LeadDrawerProps) {
  const { tr } = useTranslation();
  const [summary, setSummary] = useState<LeadAiSummaryResult | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);

  if (!lead) return null;
  const stage = STAGE_STYLES[lead.status] || STAGE_STYLES.New;

  const runSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await getLeadAiSummary(lead._id);
      if (!res.success) {
        throw new Error(res.error || "Could not summarize lead");
      }
      setSummary(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not summarize lead");
    } finally {
      setLoadingSummary(false);
    }
  };

  const riskTone =
    summary && summary.riskScore >= 66
      ? "text-rose-600"
      : summary && summary.riskScore >= 33
      ? "text-amber-600"
      : "text-brand-700";

  return (
    <>
      <Drawer open={open} onClose={onClose} title={tr.leads.leadDetails}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar name={lead.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-ink">{lead.name}</h2>
            <p className="truncate text-sm text-ink-soft">{lead.company || "—"}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={stage.badge} dot={stage.dot}>
            {tr.stages[lead.status as keyof typeof tr.stages] || lead.status}
          </Badge>
          <Badge className={PRIORITY_STYLES[lead.priority]}>
            {tr.priorities[lead.priority as keyof typeof tr.priorities] || lead.priority}
          </Badge>
          <Badge>{tr.sources[lead.source as keyof typeof tr.sources] || lead.source}</Badge>
        </div>

        {/* Value */}
        <div className="mt-5 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)] border border-line">
          <p className="text-xs uppercase tracking-wide text-ink-soft">{tr.leads.dealValue}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{currency(lead.value)}</p>
        </div>

        {/* Contact info */}
        <div className="mt-4 space-y-2">
          <InfoRow icon={Mail} value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
          <InfoRow icon={Phone} value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
          <InfoRow icon={Building2} value={lead.company} />
        </div>

        {lead.notes && (
          <div className="mt-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-soft)] border border-line">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              {tr.common.notes}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink whitespace-pre-wrap">{lead.notes}</p>
          </div>
        )}

        {/* AI Summary Box */}
        <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-800">
              <Sparkles className="h-4 w-4 text-brand-600" /> {tr.leads.aiSummary}
            </div>
            {!summary && (
              <Button size="sm" variant="secondary" onClick={runSummary} loading={loadingSummary}>
                {tr.leads.analyze}
              </Button>
            )}
          </div>

          {loadingSummary && (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          )}

          {summary && (
            <div className="mt-3 space-y-3 animate-fade-up">
              <p className="text-sm leading-relaxed text-ink">{summary.summary}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-surface p-3 text-center border border-brand-100/80">
                  <p className="text-xs text-ink-soft">{tr.leads.riskScore}</p>
                  <p className={cn("text-lg font-bold", riskTone)}>
                    {summary.riskScore}
                    <span className="text-xs text-ink-soft font-normal">/100</span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-3 text-center border border-brand-100/80">
                  <p className="text-xs text-ink-soft">{tr.leads.suggestedPriority}</p>
                  <p className="text-lg font-bold text-ink">{summary.suggestedPriority}</p>
                </div>
              </div>
              <div className="rounded-xl bg-surface p-3 border border-brand-100/80">
                <p className="text-xs text-ink-soft">{tr.leads.nextBestAction}</p>
                <p className="mt-0.5 text-sm font-medium text-ink">{summary.nextBestAction}</p>
              </div>
            </div>
          )}
        </div>

        {/* Draft AI Email button */}
        <div className="mt-4">
          <Button variant="outline" className="w-full" onClick={() => setEmailOpen(true)}>
            <Wand2 className="h-4 w-4 text-brand-600" /> {tr.leads.draftEmail}
          </Button>
        </div>

        {/* Actions */}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => onEdit(lead)}>
            <Pencil className="h-4 w-4" /> {tr.common.edit}
          </Button>
          <Button variant="danger" onClick={() => onDelete(lead)}>
            <Trash2 className="h-4 w-4" /> {tr.common.delete}
          </Button>
        </div>

        <p className="mt-4 text-center text-xs text-ink-soft">
          {tr.leads.added} {shortDate(lead.createdAt)}
        </p>
      </Drawer>

      {/* AI Email Dialog */}
      <AiEmailDialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        lead={lead}
      />
    </>
  );
}

function InfoRow({
  icon: Icon,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value?: string | null;
  href?: string;
}) {
  if (!value) return null;
  const content = (
    <div className="flex items-center gap-3 rounded-xl px-1 py-1.5 text-sm text-ink transition hover:text-brand-700">
      <Icon className="h-4 w-4 text-ink-soft shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );

  return href ? (
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  );
}

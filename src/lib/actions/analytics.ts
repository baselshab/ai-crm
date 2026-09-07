"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, tenantScope } from "@/lib/tenant";
import { PRISMA_TO_UI_STAGE } from "@/lib/constants";
import { LeadStage, TaskStatus } from "@/generated/prisma/enums";

export interface DashboardStats {
  revenueWon: number;
  pipelineValue: number;
  totalLeads: number;
  totalContacts: number;
  openTasks: number;
  conversionRate: number;
}

export interface PipelineStageStat {
  stage: "New" | "Qualified" | "Proposal" | "Won" | "Lost";
  count: number;
  value: number;
}

export interface TrendItem {
  month: string;
  leads: number;
  won: number;
}

export interface RecentLeadItem {
  id: string;
  name: string;
  company: string | null;
  status: "New" | "Qualified" | "Proposal" | "Won" | "Lost";
  value: number;
  updatedAt: string;
}

export interface DashboardOverviewResult {
  success: boolean;
  stats: DashboardStats;
  pipeline: PipelineStageStat[];
  trend: TrendItem[];
  recentLeads: RecentLeadItem[];
}

export async function getDashboardOverview(): Promise<DashboardOverviewResult> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const [leads, contacts, tasks] = await Promise.all([
    prisma.lead.findMany({
      where: scope.where(),
      include: {
        company: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contact.findMany({
      where: scope.where(),
      select: { id: true },
    }),
    prisma.task.findMany({
      where: scope.where(),
      select: { id: true, status: true },
    }),
  ]);

  const stages: Array<"New" | "Qualified" | "Proposal" | "Won" | "Lost"> = [
    "New",
    "Qualified",
    "Proposal",
    "Won",
    "Lost",
  ];

  const byStage: Record<string, { count: number; value: number }> = {
    New: { count: 0, value: 0 },
    Qualified: { count: 0, value: 0 },
    Proposal: { count: 0, value: 0 },
    Won: { count: 0, value: 0 },
    Lost: { count: 0, value: 0 },
  };

  let totalValue = 0;
  let wonValue = 0;

  for (const l of leads) {
    const uiStage = PRISMA_TO_UI_STAGE[l.stage] || "New";
    const val = Number(l.value || 0);

    byStage[uiStage].count += 1;
    byStage[uiStage].value += val;

    totalValue += val;
    if (l.stage === LeadStage.WON) {
      wonValue += val;
    }
  }

  const won = byStage.Won.count;
  const lost = byStage.Lost.count;
  const closed = won + lost;
  const conversionRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

  // Last 6 months trend
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();
  const months: Array<{ key: string; label: string }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthLabels[d.getMonth()],
    });
  }

  const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
  const trend: TrendItem[] = months.map((m) => ({ month: m.label, leads: 0, won: 0 }));

  for (const l of leads) {
    const d = new Date(l.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (idx[key] !== undefined) {
      trend[idx[key]].leads += 1;
      if (l.stage === LeadStage.WON) {
        trend[idx[key]].won += Number(l.value || 0);
      }
    }
  }

  const recentLeads: RecentLeadItem[] = leads.slice(0, 6).map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company?.name || null,
    status: PRISMA_TO_UI_STAGE[l.stage] || "New",
    value: Number(l.value || 0),
    updatedAt: l.updatedAt.toISOString(),
  }));

  const openTasks = tasks.filter((t) => t.status !== TaskStatus.COMPLETED).length;

  return {
    success: true,
    stats: {
      revenueWon: wonValue,
      pipelineValue: totalValue,
      totalLeads: leads.length,
      totalContacts: contacts.length,
      openTasks,
      conversionRate,
    },
    pipeline: stages.map((s) => ({
      stage: s,
      count: byStage[s].count,
      value: byStage[s].value,
    })),
    trend,
    recentLeads,
  };
}

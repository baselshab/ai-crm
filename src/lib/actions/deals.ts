"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, tenantScope } from "@/lib/tenant";
import { LeadStage, Priority } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export interface PipelineDealItem {
  _id: string;
  id: string;
  name: string;
  title: string;
  value: number;
  status: "New" | "Qualified" | "Proposal" | "Won" | "Lost";
  stage: "New" | "Qualified" | "Proposal" | "Won" | "Lost";
  priority: "Low" | "Medium" | "High";
  company: string | null;
  companyId: string | null;
  contactId: string | null;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealFormInput {
  title: string;
  value: number;
  stage?: string;
  priority?: string;
  company?: string;
  contactId?: string;
  leadId?: string;
}

const UI_TO_PRISMA_STAGE: Record<string, LeadStage> = {
  New: LeadStage.NEW,
  Qualified: LeadStage.QUALIFIED,
  Proposal: LeadStage.PROPOSAL,
  Won: LeadStage.WON,
  Lost: LeadStage.LOST,
};

const PRISMA_TO_UI_STAGE: Record<LeadStage, "New" | "Qualified" | "Proposal" | "Won" | "Lost"> = {
  [LeadStage.NEW]: "New",
  [LeadStage.QUALIFIED]: "Qualified",
  [LeadStage.PROPOSAL]: "Proposal",
  [LeadStage.WON]: "Won",
  [LeadStage.LOST]: "Lost",
};

const UI_TO_PRISMA_PRIORITY: Record<string, Priority> = {
  Low: Priority.LOW,
  Medium: Priority.MEDIUM,
  High: Priority.HIGH,
};

const PRISMA_TO_UI_PRIORITY: Record<Priority, "Low" | "Medium" | "High"> = {
  [Priority.LOW]: "Low",
  [Priority.MEDIUM]: "Medium",
  [Priority.HIGH]: "High",
};

/**
 * Get all pipeline items (Deals, and Leads with pipeline tracking) scoped strictly to tenant.
 */
export async function getPipelineDeals(): Promise<{ deals: PipelineDealItem[] }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  // 1. Fetch all tenant Deals
  const rawDeals = await prisma.deal.findMany({
    where: scope.where(),
    include: {
      company: { select: { id: true, name: true } },
      contact: { select: { id: true, fullName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 2. Also fetch tenant Leads (so items added via Leads also appear on the Pipeline seamlessly)
  const rawLeads = await prisma.lead.findMany({
    where: scope.where(),
    include: {
      company: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const dealsMap = new Map<string, PipelineDealItem>();

  // Map Deals
  rawDeals.forEach((d) => {
    const stageUI = PRISMA_TO_UI_STAGE[d.stage] || "New";
    const priorityUI = PRISMA_TO_UI_PRIORITY[d.priority] || "Medium";
    dealsMap.set(d.id, {
      _id: d.id,
      id: d.id,
      name: d.title,
      title: d.title,
      value: d.value ? Number(d.value) : 0,
      status: stageUI,
      stage: stageUI,
      priority: priorityUI,
      company: d.company?.name || null,
      companyId: d.companyId,
      contactId: d.contactId,
      leadId: d.leadId,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    });
  });

  // Map Leads if they are not already represented by a Deal
  rawLeads.forEach((l) => {
    if (!dealsMap.has(l.id)) {
      const stageUI = PRISMA_TO_UI_STAGE[l.stage] || "New";
      const priorityUI = PRISMA_TO_UI_PRIORITY[l.priority] || "Medium";
      dealsMap.set(l.id, {
        _id: l.id,
        id: l.id,
        name: l.name,
        title: l.name,
        value: l.value ? Number(l.value) : 0,
        status: stageUI,
        stage: stageUI,
        priority: priorityUI,
        company: l.company?.name || null,
        companyId: l.companyId,
        contactId: l.contactId,
        leadId: l.id,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      });
    }
  });

  return { deals: Array.from(dealsMap.values()) };
}

/**
 * Move a deal or lead to a new stage with strict multi-tenant validation.
 */
export async function updatePipelineStage(
  id: string,
  newStageUI: string
): Promise<{ success: boolean; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const prismaStage = UI_TO_PRISMA_STAGE[newStageUI];
  if (!prismaStage) {
    return { success: false, error: "Invalid stage specified." };
  }

  try {
    // 1. Check if Deal exists in tenant
    const deal = await prisma.deal.findFirst({
      where: scope.where({ id }),
    });

    if (deal) {
      await prisma.deal.update({
        where: { id },
        data: { stage: prismaStage },
      });

      // If tied to a lead, also update lead's stage for synchronization
      if (deal.leadId) {
        await prisma.lead.updateMany({
          where: scope.where({ id: deal.leadId }),
          data: { stage: prismaStage },
        });
      }

      revalidatePath("/pipeline");
      revalidatePath("/dashboard");
      return { success: true };
    }

    // 2. If not a Deal, check if it's a Lead in tenant
    const lead = await prisma.lead.findFirst({
      where: scope.where({ id }),
    });

    if (lead) {
      await prisma.lead.update({
        where: { id },
        data: { stage: prismaStage },
      });

      revalidatePath("/pipeline");
      revalidatePath("/leads");
      revalidatePath("/dashboard");
      return { success: true };
    }

    return { success: false, error: "Record not found or unauthorized." };
  } catch (error: unknown) {
    console.error("Update stage error:", error);
    return { success: false, error: "Failed to update pipeline stage." };
  }
}

/**
 * Batch reorder pipeline stage updates.
 */
export async function reorderPipeline(
  updates: { id: string; status: string; order?: number }[]
): Promise<{ success: boolean; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  if (!updates?.length) {
    return { success: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const prismaStage = UI_TO_PRISMA_STAGE[update.status];
        if (!prismaStage) continue;

        // Try updating deal first
        const deal = await tx.deal.findFirst({
          where: scope.where({ id: update.id }),
        });

        if (deal) {
          await tx.deal.update({
            where: { id: update.id },
            data: { stage: prismaStage },
          });
          continue;
        }

        // Otherwise try updating lead
        const lead = await tx.lead.findFirst({
          where: scope.where({ id: update.id }),
        });

        if (lead) {
          await tx.lead.update({
            where: { id: update.id },
            data: { stage: prismaStage },
          });
        }
      }
    });

    revalidatePath("/pipeline");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Reorder pipeline error:", error);
    return { success: false, error: "Failed to persist pipeline reorder." };
  }
}

/**
 * Create a new Deal.
 */
export async function createDeal(
  input: DealFormInput
): Promise<{ success: boolean; deal?: PipelineDealItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const title = input.title?.trim();
  if (!title) {
    return { success: false, error: "Deal title is required." };
  }

  try {
    let companyId: string | null = null;
    if (input.company?.trim()) {
      const companyName = input.company.trim();
      let company = await prisma.company.findFirst({
        where: scope.where({ name: { equals: companyName, mode: "insensitive" as const } }),
      });

      if (!company) {
        company = await prisma.company.create({
          data: scope.create({ name: companyName }),
        });
      }
      companyId = company.id;
    }

    const stage = (input.stage && UI_TO_PRISMA_STAGE[input.stage]) || LeadStage.NEW;
    const priority = (input.priority && UI_TO_PRISMA_PRIORITY[input.priority]) || Priority.MEDIUM;
    const val = Math.max(0, Number(input.value) || 0);

    const deal = await prisma.deal.create({
      data: scope.create({
        title,
        value: val,
        stage,
        priority,
        companyId,
        contactId: input.contactId || null,
        leadId: input.leadId || null,
      }),
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/pipeline");
    revalidatePath("/dashboard");

    const stageUI = PRISMA_TO_UI_STAGE[deal.stage] || "New";
    const priorityUI = PRISMA_TO_UI_PRIORITY[deal.priority] || "Medium";

    return {
      success: true,
      deal: {
        _id: deal.id,
        id: deal.id,
        name: deal.title,
        title: deal.title,
        value: Number(deal.value),
        status: stageUI,
        stage: stageUI,
        priority: priorityUI,
        company: deal.company?.name || null,
        companyId: deal.companyId,
        contactId: deal.contactId,
        leadId: deal.leadId,
        createdAt: deal.createdAt.toISOString(),
        updatedAt: deal.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Create deal error:", error);
    return { success: false, error: "Failed to create deal." };
  }
}

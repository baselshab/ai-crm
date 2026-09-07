"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, tenantScope } from "@/lib/tenant";
import { LeadStage, Priority } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export interface LeadItem {
  _id: string;
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  companyId: string | null;
  status: "New" | "Qualified" | "Proposal" | "Won" | "Lost";
  priority: "Low" | "Medium" | "High";
  source: string;
  value: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFilters {
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
}

export interface LeadFormInput {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  value?: number;
  status?: string;
  priority?: string;
  source?: string;
  notes?: string;
}

// Stage mapping helpers
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

// Priority mapping helpers
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
 * List all leads for the active organization with multi-tenant scoping and optional filters.
 */
export async function getLeads(filters?: LeadFilters): Promise<{ leads: LeadItem[] }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const whereConditions: Record<string, unknown> = scope.where();

  if (filters?.status && UI_TO_PRISMA_STAGE[filters.status]) {
    whereConditions.stage = UI_TO_PRISMA_STAGE[filters.status];
  }

  if (filters?.priority && UI_TO_PRISMA_PRIORITY[filters.priority]) {
    whereConditions.priority = UI_TO_PRISMA_PRIORITY[filters.priority];
  }

  if (filters?.source) {
    whereConditions.source = filters.source;
  }

  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    whereConditions.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { company: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const rawLeads = await prisma.lead.findMany({
    where: whereConditions,
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const leads: LeadItem[] = rawLeads.map((l) => ({
    _id: l.id,
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    company: l.company?.name || null,
    companyId: l.companyId,
    status: PRISMA_TO_UI_STAGE[l.stage] || "New",
    priority: PRISMA_TO_UI_PRIORITY[l.priority] || "Medium",
    source: l.source || "Website",
    value: l.value ? Number(l.value) : 0,
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return { leads };
}

/**
 * Get a single lead with multi-tenant validation.
 */
export async function getLeadById(id: string): Promise<LeadItem | null> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const lead = await prisma.lead.findFirst({
    where: scope.where({ id }),
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (!lead) return null;

  return {
    _id: lead.id,
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company?.name || null,
    companyId: lead.companyId,
    status: PRISMA_TO_UI_STAGE[lead.stage] || "New",
    priority: PRISMA_TO_UI_PRIORITY[lead.priority] || "Medium",
    source: lead.source || "Website",
    value: lead.value ? Number(lead.value) : 0,
    notes: lead.notes,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

/**
 * Create a new lead scoped to the tenant.
 */
export async function createLead(input: LeadFormInput): Promise<{ success: boolean; lead?: LeadItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "Lead name is required." };
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

    const stage = (input.status && UI_TO_PRISMA_STAGE[input.status]) || LeadStage.NEW;
    const priority = (input.priority && UI_TO_PRISMA_PRIORITY[input.priority]) || Priority.MEDIUM;
    const val = input.value !== undefined ? Math.max(0, Number(input.value) || 0) : null;

    const newLead = await prisma.lead.create({
      data: scope.create({
        name,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        stage,
        priority,
        source: input.source?.trim() || "Website",
        value: val,
        notes: input.notes?.trim() || null,
        companyId,
      }),
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");

    return {
      success: true,
      lead: {
        _id: newLead.id,
        id: newLead.id,
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        company: newLead.company?.name || null,
        companyId: newLead.companyId,
        status: PRISMA_TO_UI_STAGE[newLead.stage] || "New",
        priority: PRISMA_TO_UI_PRIORITY[newLead.priority] || "Medium",
        source: newLead.source || "Website",
        value: newLead.value ? Number(newLead.value) : 0,
        notes: newLead.notes,
        createdAt: newLead.createdAt.toISOString(),
        updatedAt: newLead.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Create lead error:", error);
    return { success: false, error: "Failed to create lead. Please check inputs." };
  }
}

/**
 * Update an existing lead with multi-tenant verification.
 */
export async function updateLead(
  id: string,
  input: LeadFormInput
): Promise<{ success: boolean; lead?: LeadItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  // 1. Verify existence within tenant
  const existing = await prisma.lead.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Lead not found or unauthorized." };
  }

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "Lead name is required." };
  }

  try {
    let companyId = existing.companyId;
    if (input.company !== undefined) {
      if (input.company.trim()) {
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
      } else {
        companyId = null;
      }
    }

    const stage = input.status ? UI_TO_PRISMA_STAGE[input.status] || existing.stage : existing.stage;
    const priority = input.priority
      ? UI_TO_PRISMA_PRIORITY[input.priority] || existing.priority
      : existing.priority;
    const val = input.value !== undefined ? Math.max(0, Number(input.value) || 0) : existing.value;

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        name,
        email: input.email !== undefined ? input.email?.trim() || null : existing.email,
        phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
        stage,
        priority,
        source: input.source !== undefined ? input.source?.trim() || "Website" : existing.source,
        value: val,
        notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        companyId,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");

    return {
      success: true,
      lead: {
        _id: updated.id,
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        company: updated.company?.name || null,
        companyId: updated.companyId,
        status: PRISMA_TO_UI_STAGE[updated.stage] || "New",
        priority: PRISMA_TO_UI_PRIORITY[updated.priority] || "Medium",
        source: updated.source || "Website",
        value: updated.value ? Number(updated.value) : 0,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Update lead error:", error);
    return { success: false, error: "Failed to update lead." };
  }
}

/**
 * Delete a lead with multi-tenant verification.
 */
export async function deleteLead(id: string): Promise<{ success: boolean; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const existing = await prisma.lead.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Lead not found or unauthorized." };
  }

  try {
    await prisma.lead.delete({
      where: { id },
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete lead error:", error);
    return { success: false, error: "Failed to delete lead." };
  }
}

/**
 * Bulk delete leads strictly scoped to active tenant.
 */
export async function bulkDeleteLeads(ids: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  if (!ids?.length) {
    return { success: true, count: 0 };
  }

  try {
    const result = await prisma.lead.deleteMany({
      where: scope.where({
        id: { in: ids },
      }),
    });

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { success: true, count: result.count };
  } catch (error: unknown) {
    console.error("Bulk delete error:", error);
    return { success: false, count: 0, error: "Failed to bulk delete leads." };
  }
}

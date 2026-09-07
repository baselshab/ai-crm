"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, tenantScope } from "@/lib/tenant";
import { TaskStatus, Priority } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export interface TaskItem {
  _id: string;
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: "Pending" | "In Progress" | "Completed";
  priority: "Low" | "Medium" | "High";
  relatedLead: {
    _id: string;
    id: string;
    name: string;
    company: string | null;
  } | null;
  leadId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormInput {
  title: string;
  description?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  relatedLead?: string | null;
}

const UI_TO_PRISMA_STATUS: Record<string, TaskStatus> = {
  Pending: TaskStatus.PENDING,
  "In Progress": TaskStatus.IN_PROGRESS,
  Completed: TaskStatus.COMPLETED,
};

const PRISMA_TO_UI_STATUS: Record<TaskStatus, "Pending" | "In Progress" | "Completed"> = {
  [TaskStatus.PENDING]: "Pending",
  [TaskStatus.IN_PROGRESS]: "In Progress",
  [TaskStatus.COMPLETED]: "Completed",
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
 * List all tasks for the active tenant with multi-tenant scoping.
 */
export async function getTasks(filters?: { status?: string }): Promise<{ tasks: TaskItem[] }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const whereConditions: Record<string, unknown> = scope.where();

  if (filters?.status && filters.status !== "all") {
    const prismaStatus = UI_TO_PRISMA_STATUS[filters.status];
    if (prismaStatus) {
      whereConditions.status = prismaStatus;
    }
  }

  const rawTasks = await prisma.task.findMany({
    where: whereConditions,
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          company: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  });

  const tasks: TaskItem[] = rawTasks.map((t) => ({
    _id: t.id,
    id: t.id,
    title: t.title,
    description: t.description,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    status: PRISMA_TO_UI_STATUS[t.status] || "Pending",
    priority: PRISMA_TO_UI_PRIORITY[t.priority] || "Medium",
    relatedLead: t.lead
      ? {
          _id: t.lead.id,
          id: t.lead.id,
          name: t.lead.name,
          company: t.lead.company?.name || null,
        }
      : null,
    leadId: t.leadId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return { tasks };
}

/**
 * Create a new task scoped strictly to the active tenant.
 */
export async function createTask(
  input: TaskFormInput
): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const title = input.title?.trim();
  if (!title) {
    return { success: false, error: "Task title is required." };
  }

  try {
    const status = (input.status && UI_TO_PRISMA_STATUS[input.status]) || TaskStatus.PENDING;
    const priority = (input.priority && UI_TO_PRISMA_PRIORITY[input.priority]) || Priority.MEDIUM;
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;

    let leadId: string | null = null;
    if (input.relatedLead) {
      // Verify lead belongs to active tenant
      const lead = await prisma.lead.findFirst({
        where: scope.where({ id: input.relatedLead }),
      });
      if (lead) leadId = lead.id;
    }

    const newTask = await prisma.task.create({
      data: scope.create({
        title,
        description: input.description?.trim() || null,
        dueDate,
        status,
        priority,
        leadId,
      }),
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      success: true,
      task: {
        _id: newTask.id,
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : null,
        status: PRISMA_TO_UI_STATUS[newTask.status],
        priority: PRISMA_TO_UI_PRIORITY[newTask.priority],
        relatedLead: newTask.lead
          ? {
              _id: newTask.lead.id,
              id: newTask.lead.id,
              name: newTask.lead.name,
              company: newTask.lead.company?.name || null,
            }
          : null,
        leadId: newTask.leadId,
        createdAt: newTask.createdAt.toISOString(),
        updatedAt: newTask.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Create task error:", error);
    return { success: false, error: "Failed to create task." };
  }
}

/**
 * Update an existing task with multi-tenant verification.
 */
export async function updateTask(
  id: string,
  input: Partial<TaskFormInput>
): Promise<{ success: boolean; task?: TaskItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const existing = await prisma.task.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Task not found or unauthorized." };
  }

  try {
    let leadId = existing.leadId;
    if (input.relatedLead !== undefined) {
      if (input.relatedLead) {
        const lead = await prisma.lead.findFirst({
          where: scope.where({ id: input.relatedLead }),
        });
        leadId = lead ? lead.id : null;
      } else {
        leadId = null;
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: input.title !== undefined ? input.title.trim() : existing.title,
        description: input.description !== undefined ? input.description?.trim() || null : existing.description,
        dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : existing.dueDate,
        status: input.status !== undefined ? (UI_TO_PRISMA_STATUS[input.status] || existing.status) : existing.status,
        priority: input.priority !== undefined ? (UI_TO_PRISMA_PRIORITY[input.priority] || existing.priority) : existing.priority,
        leadId,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            company: { select: { name: true } },
          },
        },
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return {
      success: true,
      task: {
        _id: updated.id,
        id: updated.id,
        title: updated.title,
        description: updated.description,
        dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
        status: PRISMA_TO_UI_STATUS[updated.status],
        priority: PRISMA_TO_UI_PRIORITY[updated.priority],
        relatedLead: updated.lead
          ? {
              _id: updated.lead.id,
              id: updated.lead.id,
              name: updated.lead.name,
              company: updated.lead.company?.name || null,
            }
          : null,
        leadId: updated.leadId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Update task error:", error);
    return { success: false, error: "Failed to update task." };
  }
}

/**
 * Delete a task with multi-tenant verification.
 */
export async function deleteTask(id: string): Promise<{ success: boolean; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const existing = await prisma.task.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Task not found or unauthorized." };
  }

  try {
    await prisma.task.delete({
      where: { id },
    });

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete task error:", error);
    return { success: false, error: "Failed to delete task." };
  }
}

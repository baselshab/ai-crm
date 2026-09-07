"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, assertRole, tenantScope } from "@/lib/tenant";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export interface OrganizationDetails {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  members: {
    id: string;
    role: Role;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  }[];
  stats: {
    membersCount: number;
    leadsCount: number;
    contactsCount: number;
    dealsCount: number;
  };
}

/**
 * Get organization profile, team members, and CRM entity counts for the active tenant.
 */
export async function getOrganizationDetails(): Promise<OrganizationDetails> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const organization = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    include: {
      memberships: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!organization) {
    throw new Error("المؤسسة غير موجودة أو تم حذفها.");
  }

  // Multi-tenant scoped counts
  const [leadsCount, contactsCount, dealsCount] = await Promise.all([
    prisma.lead.count({ where: scope.where() }),
    prisma.contact.count({ where: scope.where() }),
    prisma.deal.count({ where: scope.where() }),
  ]);

  return {
    id: organization.id,
    name: organization.name,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
    members: organization.memberships.map((m) => ({
      id: m.id,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    })),
    stats: {
      membersCount: organization.memberships.length,
      leadsCount,
      contactsCount,
      dealsCount,
    },
  };
}

/**
 * Update organization name.
 * Restricted to OWNER and ADMIN.
 */
export async function updateOrganizationName(newName: string) {
  const context = await requireTenant();

  // Enforce RBAC guard
  assertRole(context.role, [Role.OWNER, Role.ADMIN]);

  const trimmedName = newName?.trim();
  if (!trimmedName || trimmedName.length < 2) {
    return { success: false, error: "اسم المؤسسة يجب أن يحتوي على حرفين على الأقل." };
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: context.organizationId },
      data: { name: trimmedName },
    });

    revalidatePath("/dashboard");
    return { success: true, organization: updated };
  } catch (error: unknown) {
    console.error("Update organization error:", error);
    return { success: false, error: "تعذر تحديث اسم المؤسسة. يرجى المحاولة مرة أخرى." };
  }
}

/**
 * Add an existing user to the organization with a specified role.
 * Restricted to OWNER and ADMIN.
 */
export async function addMemberToOrganization(email: string, role: Role = Role.MEMBER) {
  const context = await requireTenant();

  // Enforce RBAC guard
  assertRole(context.role, [Role.OWNER, Role.ADMIN]);

  const cleanEmail = String(email).toLowerCase().trim();
  if (!cleanEmail) {
    return { success: false, error: "يرجى تقديم بريد إلكتروني صالح." };
  }

  try {
    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return {
        success: false,
        error: `المستخدم بالبريد (${cleanEmail}) غير مسجل في النظام. يجب أن ينشئ حساباً أولاً.`,
      };
    }

    // 2. Check if already a member of this tenant
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: context.organizationId,
        },
      },
    });

    if (existingMembership) {
      return {
        success: false,
        error: "المستخدم عضو بالفعل في هذه المنظمة.",
      };
    }

    // 3. Create membership
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: context.organizationId,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      message: `تمت إضافة ${user.name || user.email} بنجاح إلى الفريق بصلاحية (${role}).`,
      membership,
    };
  } catch (error: unknown) {
    console.error("Add member error:", error);
    return { success: false, error: "حدث خطأ أثناء إضافة العضو للمنظمة." };
  }
}

/**
 * Update member role.
 * Restricted strictly to OWNER.
 */
export async function updateMemberRole(membershipId: string, newRole: Role) {
  const context = await requireTenant();

  // Enforce OWNER only
  assertRole(context.role, Role.OWNER);

  try {
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.organizationId !== context.organizationId) {
      return { success: false, error: "العضو غير موجود ضمن هذه المنظمة." };
    }

    // Prevent changing role if it's the current user themselves
    if (membership.userId === context.userId && newRole !== Role.OWNER) {
      return { success: false, error: "لا يمكنك تقليص صلاحيات المالك لنفسك." };
    }

    const updated = await prisma.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
    });

    revalidatePath("/dashboard");
    return { success: true, membership: updated };
  } catch (error: unknown) {
    console.error("Update role error:", error);
    return { success: false, error: "حدث خطأ أثناء تحديث الصلاحية." };
  }
}

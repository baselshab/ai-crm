import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { redirect } from "next/navigation";

export interface TenantContext {
  userId: string;
  organizationId: string;
  role: Role;
  user: {
    id: string;
    email: string;
    name?: string | null;
    organizationId?: string;
    role?: string;
  };
}

/**
 * Role hierarchy weight: OWNER (3) > ADMIN (2) > MEMBER (1)
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

/**
 * Checks if the current role meets the minimum required role or is in the allowed roles list.
 */
export function hasRole(
  currentRole: Role | string | undefined,
  allowedRoles: Role | Role[]
): boolean {
  if (!currentRole) return false;
  const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return allowed.includes(currentRole as Role);
}

/**
 * Granular Permission Matrix for CRM features
 */
export const permissions = {
  canManageOrganization: (role?: Role | string) => role === Role.OWNER,
  canManageMembers: (role?: Role | string) =>
    role === Role.OWNER || role === Role.ADMIN,
  canInviteMembers: (role?: Role | string) =>
    role === Role.OWNER || role === Role.ADMIN,
  canDeleteCRMRecords: (role?: Role | string) =>
    role === Role.OWNER || role === Role.ADMIN,
  canAccessCRM: (role?: Role | string) =>
    Boolean(role && [Role.OWNER, Role.ADMIN, Role.MEMBER].includes(role as Role)),
};

/**
 * Guard that enforces required roles, throwing an Unauthorized Error if the role is insufficient.
 */
export function assertRole(
  currentRole: Role | string | undefined,
  allowedRoles: Role | Role[]
): void {
  if (!hasRole(currentRole, allowedRoles)) {
    const required = Array.isArray(allowedRoles)
      ? allowedRoles.join(" أو ")
      : allowedRoles;
    throw new Error(
      `غير مصرح لك بتنفيذ هذه العملية. يتطلب الدور: (${required}) بينما دورك الحالي هو: (${currentRole || "غير معروف"}).`
    );
  }
}

/**
 * Retrieves the tenant context from the active session.
 * Returns null if the user is unauthenticated or has no active organization membership.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  let organizationId = session.user.organizationId;
  let role = session.user.role as Role | undefined;

  // Fallback: If session JWT doesn't have organizationId, check database directly
  if (!organizationId) {
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (membership) {
      organizationId = membership.organizationId;
      role = membership.role;
    }
  }

  if (!organizationId) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId,
    role: role || Role.MEMBER,
    user: session.user,
  };
}

/**
 * Strict server-side guard for Server Components and Server Actions.
 * Redirects to /login if unauthenticated, or throws if no organization is found.
 */
export async function requireTenant(): Promise<TenantContext> {
  const context = await getTenantContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

/**
 * Tenant-scoped query utility to prevent data leakage between organizations.
 * Ensures organizationId is strictly attached to query conditions and creates.
 */
export function tenantScope(organizationId: string) {
  if (!organizationId) {
    throw new Error("Multi-tenancy violation: organizationId is required.");
  }

  return {
    organizationId,
    /**
     * Injects organizationId into where conditions
     */
    where<T extends Record<string, unknown>>(conditions: T = {} as T): T & { organizationId: string } {
      return {
        ...conditions,
        organizationId,
      };
    },
    /**
     * Injects organizationId into create data payloads
     */
    create<T extends Record<string, unknown>>(data: T): T & { organizationId: string } {
      return {
        ...data,
        organizationId,
      };
    },
  };
}

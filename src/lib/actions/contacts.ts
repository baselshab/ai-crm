"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, tenantScope } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface ContactItem {
  _id: string;
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  companyId: string | null;
  tags: string[];
  notes: string | null;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactFilters {
  search?: string;
  tag?: string;
}

export interface ContactFormInput {
  name: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  notes?: string;
  favorite?: boolean;
}

/**
 * List all contacts for the active tenant with scoping and optional search/tag filters.
 */
export async function getContacts(filters?: ContactFilters): Promise<{ contacts: ContactItem[] }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const whereConditions: Record<string, unknown> = scope.where();

  if (filters?.tag?.trim()) {
    whereConditions.tags = {
      has: filters.tag.trim(),
    };
  }

  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    whereConditions.OR = [
      { fullName: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { company: { name: { contains: q, mode: "insensitive" as const } } },
    ];
  }

  const rawContacts = await prisma.contact.findMany({
    where: whereConditions,
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const contacts: ContactItem[] = rawContacts.map((c) => ({
    _id: c.id,
    id: c.id,
    name: c.fullName,
    title: c.title,
    email: c.email,
    phone: c.phone,
    company: c.company?.name || null,
    companyId: c.companyId,
    tags: c.tags || [],
    notes: c.notes,
    favorite: c.isFavorite,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return { contacts };
}

/**
 * Get a single contact with multi-tenant verification.
 */
export async function getContactById(id: string): Promise<ContactItem | null> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const contact = await prisma.contact.findFirst({
    where: scope.where({ id }),
    include: {
      company: {
        select: { id: true, name: true },
      },
    },
  });

  if (!contact) return null;

  return {
    _id: contact.id,
    id: contact.id,
    name: contact.fullName,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    company: contact.company?.name || null,
    companyId: contact.companyId,
    tags: contact.tags || [],
    notes: contact.notes,
    favorite: contact.isFavorite,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

/**
 * Create a new contact scoped to the tenant.
 */
export async function createContact(
  input: ContactFormInput
): Promise<{ success: boolean; contact?: ContactItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const name = input.name?.trim();
  if (!name) {
    return { success: false, error: "Full name is required." };
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

    const cleanTags = Array.isArray(input.tags)
      ? input.tags.map((t) => t.trim()).filter(Boolean)
      : [];

    const newContact = await prisma.contact.create({
      data: scope.create({
        fullName: name,
        title: input.title?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        tags: cleanTags,
        notes: input.notes?.trim() || null,
        isFavorite: Boolean(input.favorite),
        companyId,
      }),
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/contacts");
    revalidatePath("/dashboard");

    return {
      success: true,
      contact: {
        _id: newContact.id,
        id: newContact.id,
        name: newContact.fullName,
        title: newContact.title,
        email: newContact.email,
        phone: newContact.phone,
        company: newContact.company?.name || null,
        companyId: newContact.companyId,
        tags: newContact.tags,
        notes: newContact.notes,
        favorite: newContact.isFavorite,
        createdAt: newContact.createdAt.toISOString(),
        updatedAt: newContact.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Create contact error:", error);
    return { success: false, error: "Failed to create contact." };
  }
}

/**
 * Update an existing contact with multi-tenant verification.
 */
export async function updateContact(
  id: string,
  input: Partial<ContactFormInput>
): Promise<{ success: boolean; contact?: ContactItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  // 1. Verify existence within active tenant
  const existing = await prisma.contact.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Contact not found or unauthorized." };
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

    const cleanTags = input.tags !== undefined
      ? input.tags.map((t) => t.trim()).filter(Boolean)
      : existing.tags;

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        fullName: input.name !== undefined ? input.name.trim() || existing.fullName : existing.fullName,
        title: input.title !== undefined ? input.title?.trim() || null : existing.title,
        email: input.email !== undefined ? input.email?.trim() || null : existing.email,
        phone: input.phone !== undefined ? input.phone?.trim() || null : existing.phone,
        tags: cleanTags,
        notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
        isFavorite: input.favorite !== undefined ? Boolean(input.favorite) : existing.isFavorite,
        companyId,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    revalidatePath("/contacts");
    revalidatePath("/dashboard");

    return {
      success: true,
      contact: {
        _id: updated.id,
        id: updated.id,
        name: updated.fullName,
        title: updated.title,
        email: updated.email,
        phone: updated.phone,
        company: updated.company?.name || null,
        companyId: updated.companyId,
        tags: updated.tags,
        notes: updated.notes,
        favorite: updated.isFavorite,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Update contact error:", error);
    return { success: false, error: "Failed to update contact." };
  }
}

/**
 * Delete a contact with multi-tenant verification.
 */
export async function deleteContact(id: string): Promise<{ success: boolean; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const existing = await prisma.contact.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Contact not found or unauthorized." };
  }

  try {
    await prisma.contact.delete({
      where: { id },
    });

    revalidatePath("/contacts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete contact error:", error);
    return { success: false, error: "Failed to delete contact." };
  }
}

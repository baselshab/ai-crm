"use server";

import { prisma } from "@/lib/prisma";
import { requireTenant, tenantScope } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface NoteEntityRelation {
  _id: string;
  id: string;
  name: string;
}

export interface NoteItem {
  _id: string;
  id: string;
  content: string;
  pinned: boolean;
  leadId: string | null;
  contactId: string | null;
  dealId: string | null;
  lead: NoteEntityRelation | null;
  contact: NoteEntityRelation | null;
  deal: NoteEntityRelation | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFormInput {
  content: string;
  pinned?: boolean;
  lead?: string | null;
  contactId?: string | null;
  dealId?: string | null;
}

/**
 * List all notes scoped strictly to the current tenant.
 */
export async function getNotes(): Promise<{ notes: NoteItem[] }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const rawNotes = await prisma.note.findMany({
    where: scope.where(),
    include: {
      lead: { select: { id: true, name: true } },
      contact: { select: { id: true, fullName: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: [
      { isPinned: "desc" },
      { createdAt: "desc" },
    ],
  });

  const notes: NoteItem[] = rawNotes.map((n) => ({
    _id: n.id,
    id: n.id,
    content: n.content,
    pinned: n.isPinned,
    leadId: n.leadId,
    contactId: n.contactId,
    dealId: n.dealId,
    lead: n.lead ? { _id: n.lead.id, id: n.lead.id, name: n.lead.name } : null,
    contact: n.contact ? { _id: n.contact.id, id: n.contact.id, name: n.contact.fullName } : null,
    deal: n.deal ? { _id: n.deal.id, id: n.deal.id, name: n.deal.title } : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }));

  return { notes };
}

/**
 * Create a new note scoped to the tenant.
 */
export async function createNote(
  input: NoteFormInput
): Promise<{ success: boolean; note?: NoteItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const content = input.content?.trim();
  if (!content) {
    return { success: false, error: "Note content is required." };
  }

  try {
    let leadId: string | null = null;
    if (input.lead) {
      const lead = await prisma.lead.findFirst({
        where: scope.where({ id: input.lead }),
      });
      if (lead) leadId = lead.id;
    }

    const note = await prisma.note.create({
      data: scope.create({
        content,
        isPinned: Boolean(input.pinned),
        leadId,
        contactId: input.contactId || null,
        dealId: input.dealId || null,
      }),
      include: {
        lead: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    revalidatePath("/notes");
    revalidatePath("/dashboard");

    return {
      success: true,
      note: {
        _id: note.id,
        id: note.id,
        content: note.content,
        pinned: note.isPinned,
        leadId: note.leadId,
        contactId: note.contactId,
        dealId: note.dealId,
        lead: note.lead ? { _id: note.lead.id, id: note.lead.id, name: note.lead.name } : null,
        contact: note.contact ? { _id: note.contact.id, id: note.contact.id, name: note.contact.fullName } : null,
        deal: note.deal ? { _id: note.deal.id, id: note.deal.id, name: note.deal.title } : null,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Create note error:", error);
    return { success: false, error: "Failed to create note." };
  }
}

/**
 * Update a note with multi-tenant verification.
 */
export async function updateNote(
  id: string,
  input: Partial<NoteFormInput>
): Promise<{ success: boolean; note?: NoteItem; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const existing = await prisma.note.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Note not found or unauthorized." };
  }

  try {
    let leadId = existing.leadId;
    if (input.lead !== undefined) {
      if (input.lead) {
        const lead = await prisma.lead.findFirst({
          where: scope.where({ id: input.lead }),
        });
        leadId = lead ? lead.id : null;
      } else {
        leadId = null;
      }
    }

    const updated = await prisma.note.update({
      where: { id },
      data: {
        content: input.content !== undefined ? input.content.trim() : existing.content,
        isPinned: input.pinned !== undefined ? Boolean(input.pinned) : existing.isPinned,
        leadId,
      },
      include: {
        lead: { select: { id: true, name: true } },
        contact: { select: { id: true, fullName: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    revalidatePath("/notes");
    revalidatePath("/dashboard");

    return {
      success: true,
      note: {
        _id: updated.id,
        id: updated.id,
        content: updated.content,
        pinned: updated.isPinned,
        leadId: updated.leadId,
        contactId: updated.contactId,
        dealId: updated.dealId,
        lead: updated.lead ? { _id: updated.lead.id, id: updated.lead.id, name: updated.lead.name } : null,
        contact: updated.contact ? { _id: updated.contact.id, id: updated.contact.id, name: updated.contact.fullName } : null,
        deal: updated.deal ? { _id: updated.deal.id, id: updated.deal.id, name: updated.deal.title } : null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error("Update note error:", error);
    return { success: false, error: "Failed to update note." };
  }
}

/**
 * Delete a note with multi-tenant verification.
 */
export async function deleteNote(id: string): Promise<{ success: boolean; error?: string }> {
  const context = await requireTenant();
  const scope = tenantScope(context.organizationId);

  const existing = await prisma.note.findFirst({
    where: scope.where({ id }),
  });

  if (!existing) {
    return { success: false, error: "Note not found or unauthorized." };
  }

  try {
    await prisma.note.delete({
      where: { id },
    });

    revalidatePath("/notes");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: unknown) {
    console.error("Delete note error:", error);
    return { success: false, error: "Failed to delete note." };
  }
}

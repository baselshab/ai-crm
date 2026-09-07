"use server";

import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";

export interface SearchResultItem {
  id: string;
  type: "lead" | "contact" | "deal" | "task";
  title: string;
  subtitle?: string;
  badge?: string;
  url: string;
}

export interface GlobalSearchResults {
  leads: SearchResultItem[];
  contacts: SearchResultItem[];
  deals: SearchResultItem[];
  tasks: SearchResultItem[];
}

export async function searchGlobal(query: string): Promise<GlobalSearchResults> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return { leads: [], contacts: [], deals: [], tasks: [] };
  }

  const tenant = await getTenantContext();
  if (!tenant) {
    return { leads: [], contacts: [], deals: [], tasks: [] };
  }

  const orgId = tenant.organizationId;

  try {
    const [rawLeads, rawContacts, rawDeals, rawTasks] = await Promise.all([
      // 1. Leads
      prisma.lead.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { name: { contains: cleanQuery, mode: "insensitive" } },
            { email: { contains: cleanQuery, mode: "insensitive" } },
            { company: { name: { contains: cleanQuery, mode: "insensitive" } } },
          ],
        },
        include: { company: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // 2. Contacts
      prisma.contact.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { fullName: { contains: cleanQuery, mode: "insensitive" } },
            { email: { contains: cleanQuery, mode: "insensitive" } },
            { title: { contains: cleanQuery, mode: "insensitive" } },
            { company: { name: { contains: cleanQuery, mode: "insensitive" } } },
          ],
        },
        include: { company: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // 3. Deals
      prisma.deal.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { title: { contains: cleanQuery, mode: "insensitive" } },
            { company: { name: { contains: cleanQuery, mode: "insensitive" } } },
          ],
        },
        include: { company: true },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // 4. Tasks
      prisma.task.findMany({
        where: {
          organizationId: orgId,
          OR: [
            { title: { contains: cleanQuery, mode: "insensitive" } },
            { description: { contains: cleanQuery, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const leads: SearchResultItem[] = rawLeads.map((l) => ({
      id: l.id,
      type: "lead",
      title: l.name,
      subtitle: [l.company?.name, l.email].filter(Boolean).join(" • "),
      badge: l.stage,
      url: `/leads?search=${encodeURIComponent(l.name)}`,
    }));

    const contacts: SearchResultItem[] = rawContacts.map((c) => ({
      id: c.id,
      type: "contact",
      title: c.fullName,
      subtitle: [c.title, c.company?.name || c.email].filter(Boolean).join(" • "),
      badge: c.company?.name || undefined,
      url: `/contacts?search=${encodeURIComponent(c.fullName)}`,
    }));

    const deals: SearchResultItem[] = rawDeals.map((d) => ({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle: d.company?.name ? `${d.company.name} • $${Number(d.value).toLocaleString()}` : `$${Number(d.value).toLocaleString()}`,
      badge: d.stage,
      url: `/pipeline`,
    }));

    const tasks: SearchResultItem[] = rawTasks.map((t) => ({
      id: t.id,
      type: "task",
      title: t.title,
      subtitle: t.status,
      badge: t.priority,
      url: `/tasks`,
    }));

    return { leads, contacts, deals, tasks };
  } catch (error) {
    console.error("searchGlobal error:", error);
    return { leads: [], contacts: [], deals: [], tasks: [] };
  }
}

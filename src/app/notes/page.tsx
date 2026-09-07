import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { getNotes } from "@/lib/actions/notes";
import { getLeads } from "@/lib/actions/leads";
import { AppLayout } from "@/components/layout/AppLayout";
import { NotesClient } from "@/components/notes/NotesClient";

export const metadata = {
  title: "الملاحظات | سند SANAD",
  description: "Capture context, meeting notes, and relationship history across your CRM.",
};

export default async function NotesPage() {
  // 1. Enforce strict multi-tenant authorization
  const tenant = await requireTenant();

  // 2. Fetch tenant profile
  const organization = await getOrganizationDetails();

  // 3. Pre-fetch multi-tenant notes and leads
  const [{ notes }, { leads }] = await Promise.all([
    getNotes(),
    getLeads(),
  ]);

  return (
    <AppLayout
      user={{
        name: tenant.user.name,
        email: tenant.user.email,
        organizationName: organization.name,
        role: tenant.role,
      }}
    >
      <NotesClient initialNotes={notes} initialLeads={leads} />
    </AppLayout>
  );
}

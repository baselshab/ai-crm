import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { getLeads } from "@/lib/actions/leads";
import { AppLayout } from "@/components/layout/AppLayout";
import { LeadsClient } from "@/components/leads/LeadsClient";

export const metadata = {
  title: "العملاء المحتملون | سند SANAD",
  description: "Track and qualify every opportunity in your CRM pipeline.",
};

export default async function LeadsPage() {
  // 1. Enforce strict multi-tenant authorization
  const tenant = await requireTenant();

  // 2. Fetch tenant profile for navigation
  const organization = await getOrganizationDetails();

  // 3. Pre-fetch multi-tenant scoped leads
  const { leads } = await getLeads();

  return (
    <AppLayout
      user={{
        name: tenant.user.name,
        email: tenant.user.email,
        organizationName: organization.name,
        role: tenant.role,
      }}
    >
      <LeadsClient initialLeads={leads} />
    </AppLayout>
  );
}

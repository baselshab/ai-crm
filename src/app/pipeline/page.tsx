import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { getPipelineDeals } from "@/lib/actions/deals";
import { AppLayout } from "@/components/layout/AppLayout";
import { PipelineClient } from "@/components/pipeline/PipelineClient";

export const metadata = {
  title: "خط المبيعات والصفقات | سند SANAD",
  description: "Visual Kanban pipeline to track deals and opportunities across all stages.",
};

export default async function PipelinePage() {
  // 1. Enforce strict multi-tenant authorization
  const tenant = await requireTenant();

  // 2. Fetch tenant profile
  const organization = await getOrganizationDetails();

  // 3. Pre-fetch multi-tenant scoped pipeline deals
  const { deals } = await getPipelineDeals();

  return (
    <AppLayout
      user={{
        name: tenant.user.name,
        email: tenant.user.email,
        organizationName: organization.name,
        role: tenant.role,
      }}
    >
      <PipelineClient initialDeals={deals} />
    </AppLayout>
  );
}

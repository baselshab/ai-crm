import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { AppLayout } from "@/components/layout/AppLayout";
import { SettingsClient } from "@/components/settings/SettingsClient";

export const metadata = {
  title: "Settings & Workspace | SANAD",
  description: "Manage your profile, team members, and organization settings.",
};

export default async function SettingsPage() {
  // 1. Enforce strict multi-tenant authorization
  const tenant = await requireTenant();

  // 2. Fetch scoped organization details & team members
  const organization = await getOrganizationDetails();

  return (
    <AppLayout
      user={{
        name: tenant.user.name,
        email: tenant.user.email,
        organizationName: organization.name,
        role: tenant.role,
      }}
    >
      <SettingsClient tenant={tenant} organization={organization} />
    </AppLayout>
  );
}

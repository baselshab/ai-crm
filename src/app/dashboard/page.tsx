import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { getDashboardOverview } from "@/lib/actions/analytics";
import { getLeads } from "@/lib/actions/leads";
import { getContacts } from "@/lib/actions/contacts";
import { getTasks } from "@/lib/actions/tasks";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata = {
  title: "لوحة التحكم | سند SANAD",
  description: "Executive revenue, pipeline velocity, AI sales insights, and team performance.",
};

export default async function DashboardPage() {
  // 1. Strict multi-tenant context enforcement
  const tenant = await requireTenant();

  // 2. Fetch scoped organization data and analytics in parallel
  const [organization, overview, { leads }, { contacts }, { tasks }] = await Promise.all([
    getOrganizationDetails(),
    getDashboardOverview(),
    getLeads(),
    getContacts(),
    getTasks(),
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
      <div className="space-y-8">
        {/* Main 3-Column Visual Dashboard from Reference Design */}
        <DashboardClient
          initialData={overview}
          initialLeads={leads}
          initialContacts={contacts}
          initialTasks={tasks}
          userName={tenant.user.name || "User"}
          orgName={organization.name}
        />
      </div>
    </AppLayout>
  );
}

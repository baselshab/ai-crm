import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { getTasks } from "@/lib/actions/tasks";
import { getLeads } from "@/lib/actions/leads";
import { AppLayout } from "@/components/layout/AppLayout";
import { TasksClient } from "@/components/tasks/TasksClient";

export const metadata = {
  title: "المهام والمتابعات | سند SANAD",
  description: "Stay on top of commitments, schedule follow-ups, and track task timelines.",
};

export default async function TasksPage() {
  // 1. Enforce strict multi-tenant authorization
  const tenant = await requireTenant();

  // 2. Fetch tenant profile
  const organization = await getOrganizationDetails();

  // 3. Pre-fetch multi-tenant tasks and leads
  const [{ tasks }, { leads }] = await Promise.all([
    getTasks(),
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
      <TasksClient initialTasks={tasks} initialLeads={leads} />
    </AppLayout>
  );
}

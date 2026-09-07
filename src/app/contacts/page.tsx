import { requireTenant } from "@/lib/tenant";
import { getOrganizationDetails } from "@/lib/actions/organization";
import { getContacts } from "@/lib/actions/contacts";
import { AppLayout } from "@/components/layout/AppLayout";
import { ContactsClient } from "@/components/contacts/ContactsClient";

export const metadata = {
  title: "جهات الاتصال | سند SANAD",
  description: "Manage your contacts, relationships, and professional network.",
};

export default async function ContactsPage() {
  // 1. Strict multi-tenant security
  const tenant = await requireTenant();

  // 2. Fetch tenant organization profile
  const organization = await getOrganizationDetails();

  // 3. Pre-fetch multi-tenant scoped contacts
  const { contacts } = await getContacts();

  return (
    <AppLayout
      user={{
        name: tenant.user.name,
        email: tenant.user.email,
        organizationName: organization.name,
        role: tenant.role,
      }}
    >
      <ContactsClient initialContacts={contacts} />
    </AppLayout>
  );
}

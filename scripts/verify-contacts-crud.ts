import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tenantScope } from "../src/lib/tenant";

async function main() {
  console.log("🚀 بدء اختبارات Contacts Module (CRUD & Multi-Tenant Isolation)...\n");

  const timestamp = Date.now();
  const org1Name = `Contacts Test Org 1 ${timestamp}`;
  const org2Name = `Contacts Test Org 2 ${timestamp}`;

  // 1. Setup two test tenants
  const org1 = await prisma.organization.create({ data: { name: org1Name } });
  const org2 = await prisma.organization.create({ data: { name: org2Name } });

  const scope1 = tenantScope(org1.id);
  const scope2 = tenantScope(org2.id);

  try {
    // 2. Test CREATE Contact
    console.log("--- 1. اختبار Create Contact ---");
    const company1 = await prisma.company.create({
      data: scope1.create({ name: "TechNova Corp" }),
    });

    const contact1 = await prisma.contact.create({
      data: scope1.create({
        fullName: "Sarah Connor",
        title: "Chief Technology Officer",
        email: "sarah@technova.com",
        phone: "+1 555 9876",
        tags: ["VIP", "Enterprise", "Engineering"],
        notes: "Key decision maker for upcoming enterprise expansion.",
        isFavorite: true,
        companyId: company1.id,
      }),
      include: { company: true },
    });

    console.log(`✓ تم إنشاء جهة الاتصال بنجاح: "${contact1.fullName}" (${contact1.title})`);
    console.log(`✓ الشركة المرتبطة: "${contact1.company?.name}" | المفضلة: ${contact1.isFavorite ? "نعم" : "لا"}`);
    console.log(`✓ الوسوم (Tags): [${contact1.tags.join(", ")}]`);

    // 3. Test READ/LIST Contacts with Scope
    console.log("\n--- 2. اختبار Read / List Contacts مع العزل ---");
    const org1Contacts = await prisma.contact.findMany({
      where: scope1.where({
        tags: { has: "VIP" },
      }),
      include: { company: true },
    });

    if (org1Contacts.length !== 1 || org1Contacts[0].id !== contact1.id) {
      throw new Error("❌ فشل استرجاع Contacts التابعة للمؤسسة 1!");
    }
    console.log(`✓ تم استرجاع Contacts الموسومة بـ VIP للمؤسسة 1 بنجاح (العدد: ${org1Contacts.length})`);

    // Verify Org 2 cannot see Org 1 contacts
    const org2Contacts = await prisma.contact.findMany({
      where: scope2.where(),
    });

    if (org2Contacts.length !== 0) {
      throw new Error("❌ تسرب أمني! المنظمة 2 استطاعت رؤية جهات اتصال المنظمة 1!");
    }
    console.log("✓ تم التأكد: المنظمة 2 لا ترى أي من بيانات Contacts الخاصة بالمنظمة 1 (Zero Data Leakage)");

    // 4. Test UPDATE Contact
    console.log("\n--- 3. اختبار Update Contact ---");
    const updatedContact = await prisma.contact.update({
      where: { id: contact1.id },
      data: {
        title: "VP of Global Technology",
        isFavorite: false,
        notes: "Title promoted to VP of Global Technology.",
      },
    });

    if (updatedContact.title !== "VP of Global Technology" || updatedContact.isFavorite !== false) {
      throw new Error("❌ فشل تحديث بيانات جهة الاتصال!");
    }
    console.log(`✓ تم تحديث المسمى الوظيفي بنجاح إلى: "${updatedContact.title}" والمفضلة إلى: ${updatedContact.isFavorite}`);

    // 5. Test DELETE Contact
    console.log("\n--- 4. اختبار Delete Contact ---");
    await prisma.contact.delete({
      where: { id: contact1.id },
    });

    const remaining = await prisma.contact.count({ where: scope1.where() });
    if (remaining !== 0) {
      throw new Error("❌ فشل حذف جهة الاتصال!");
    }
    console.log(`✓ تم حذف جهة الاتصال بنجاح. المتبقي للمؤسسة 1: ${remaining}`);

    console.log("\n🎉 جميع اختبارات Contacts CRUD وعزل البيانات اجتازت بنجاح 100%!");
  } finally {
    // Cleanup
    console.log("\nتنظيف الشركات والمنظمات التجريبية...");
    await prisma.contact.deleteMany({
      where: { organizationId: { in: [org1.id, org2.id] } },
    });
    await prisma.company.deleteMany({
      where: { organizationId: { in: [org1.id, org2.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [org1.id, org2.id] } },
    });
    console.log("✓ تم مسح بيانات الاختبار.");
  }
}

main()
  .catch((err) => {
    console.error("خطأ في الاختبار:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

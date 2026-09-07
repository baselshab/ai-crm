import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tenantScope } from "../src/lib/tenant";
import { LeadStage, Priority } from "../src/generated/prisma/enums";

async function main() {
  console.log("🚀 بدء اختبارات Leads Module (CRUD & Multi-Tenant Isolation)...\n");

  const timestamp = Date.now();
  const org1Name = `Leads Test Org 1 ${timestamp}`;
  const org2Name = `Leads Test Org 2 ${timestamp}`;

  // 1. Setup two test tenants
  const org1 = await prisma.organization.create({ data: { name: org1Name } });
  const org2 = await prisma.organization.create({ data: { name: org2Name } });

  const scope1 = tenantScope(org1.id);
  const scope2 = tenantScope(org2.id);

  try {
    // 2. Test CREATE Lead
    console.log("--- 1. اختبار Create Lead ---");
    const company1 = await prisma.company.create({
      data: scope1.create({ name: "Acme Corp" }),
    });

    const lead1 = await prisma.lead.create({
      data: scope1.create({
        name: "John Doe",
        email: "john@acme.com",
        phone: "+1 555 0199",
        stage: LeadStage.QUALIFIED,
        priority: Priority.HIGH,
        source: "Referral",
        value: 25000.0,
        notes: "Enterprise lead from referral.",
        companyId: company1.id,
      }),
      include: { company: true },
    });

    console.log(`✓ تم إنشاء العميل بنجاح: "${lead1.name}" بمؤسسة "${org1Name}"`);
    console.log(`✓ الشركة المرتبطة: "${lead1.company?.name}" | القيمة: $${lead1.value}`);

    // 3. Test READ/LIST Leads with Scope
    console.log("\n--- 2. اختبار Read / List Leads مع العزل ---");
    const org1Leads = await prisma.lead.findMany({
      where: scope1.where({ stage: LeadStage.QUALIFIED }),
      include: { company: true },
    });

    if (org1Leads.length !== 1 || org1Leads[0].id !== lead1.id) {
      throw new Error("❌ فشل استرجاع Leads التابعة للمؤسسة 1!");
    }
    console.log(`✓ تم استرجاع Leads المؤسسة 1 بنجاح (العدد: ${org1Leads.length})`);

    // Verify Org 2 cannot see Org 1 leads
    const org2Leads = await prisma.lead.findMany({
      where: scope2.where(),
    });

    if (org2Leads.length !== 0) {
      throw new Error("❌ تسرب أمني! المنظمة 2 استطاعت رؤية Leads المنظمة 1!");
    }
    console.log("✓ تم التأكد: المنظمة 2 لا ترى أي من بيانات Leads الخاصة بالمنظمة 1 (Zero Data Leakage)");

    // 4. Test UPDATE Lead
    console.log("\n--- 3. اختبار Update Lead ---");
    const updatedLead = await prisma.lead.update({
      where: { id: lead1.id },
      data: {
        stage: LeadStage.WON,
        value: 32000.0,
        notes: "Deal closed and won successfully.",
      },
    });

    if (updatedLead.stage !== LeadStage.WON || Number(updatedLead.value) !== 32000) {
      throw new Error("❌ فشل تحديث بيانات العميل!");
    }
    console.log(`✓ تم تحديث المرحلة بنجاح إلى: ${updatedLead.stage} والقيمة إلى: $${updatedLead.value}`);

    // 5. Test Bulk Create and Bulk Delete
    console.log("\n--- 4. اختبار Bulk Operations ---");
    const bulkLead1 = await prisma.lead.create({
      data: scope1.create({ name: "Bulk Lead 1", email: "bulk1@test.com" }),
    });
    const bulkLead2 = await prisma.lead.create({
      data: scope1.create({ name: "Bulk Lead 2", email: "bulk2@test.com" }),
    });

    const countBefore = await prisma.lead.count({ where: scope1.where() });
    console.log(`✓ إجمالي Leads بعد الإضافة الجماعية: ${countBefore}`);

    // Bulk delete bulkLead1 and bulkLead2
    const deleted = await prisma.lead.deleteMany({
      where: scope1.where({
        id: { in: [bulkLead1.id, bulkLead2.id] },
      }),
    });

    console.log(`✓ تم الحذف الجماعي بنجاح: ${deleted.count} عناصر`);

    // 6. Test Single Delete
    console.log("\n--- 5. اختبار Single Delete ---");
    await prisma.lead.delete({
      where: { id: lead1.id },
    });
    const remaining = await prisma.lead.count({ where: scope1.where() });
    console.log(`✓ تم حذف العميل الفردي بنجاح. المتبقي: ${remaining}`);

    console.log("\n🎉 جميع اختبارات Leads CRUD وعزل البيانات اجتازت بنجاح 100%!");
  } finally {
    // Cleanup
    console.log("\nتنظيف الشركات والمنظمات التجريبية...");
    await prisma.lead.deleteMany({
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

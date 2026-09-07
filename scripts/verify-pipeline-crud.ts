import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tenantScope } from "../src/lib/tenant";
import { LeadStage, Priority } from "../src/generated/prisma/enums";

async function main() {
  console.log("🚀 بدء اختبارات Deals & Pipeline Module (Kanban Stages & Multi-Tenant Isolation)...\n");

  const timestamp = Date.now();
  const org1Name = `Pipeline Test Org 1 ${timestamp}`;
  const org2Name = `Pipeline Test Org 2 ${timestamp}`;

  // 1. Setup two test tenants
  const org1 = await prisma.organization.create({ data: { name: org1Name } });
  const org2 = await prisma.organization.create({ data: { name: org2Name } });

  const scope1 = tenantScope(org1.id);
  const scope2 = tenantScope(org2.id);

  try {
    // 2. Test CREATE Deal
    console.log("--- 1. اختبار Create Deal ---");
    const company1 = await prisma.company.create({
      data: scope1.create({ name: "Cyberdyne Systems" }),
    });

    const deal1 = await prisma.deal.create({
      data: scope1.create({
        title: "Enterprise Defense Contract",
        value: 120000.0,
        stage: LeadStage.NEW,
        priority: Priority.HIGH,
        companyId: company1.id,
      }),
      include: { company: true },
    });

    console.log(`✓ تم إنشاء الصفقة بنجاح: "${deal1.title}"`);
    console.log(`✓ القيمة: $${deal1.value} | المرحلة: ${deal1.stage} | الأولوية: ${deal1.priority}`);
    console.log(`✓ الشركة المرتبطة: "${deal1.company?.name}"`);

    // 3. Test READ/LIST Pipeline Deals with Scope
    console.log("\n--- 2. اختبار Read Pipeline مع عزل المستأجرين ---");
    const org1Deals = await prisma.deal.findMany({
      where: scope1.where(),
      include: { company: true },
    });

    if (org1Deals.length !== 1 || org1Deals[0].id !== deal1.id) {
      throw new Error("❌ فشل استرجاع صفقات المؤسسة 1!");
    }
    console.log(`✓ تم استرجاع صفقات المؤسسة 1 بنجاح (العدد: ${org1Deals.length})`);

    // Verify Org 2 cannot see Org 1 deals
    const org2Deals = await prisma.deal.findMany({
      where: scope2.where(),
    });

    if (org2Deals.length !== 0) {
      throw new Error("❌ خرق أمني! المؤسسة 2 استطاعت رؤية صفقات المؤسسة 1!");
    }
    console.log("✓ تم التأكد: المنظمة 2 لا ترى أي من بيانات Pipeline الخاصة بالمنظمة 1 (Zero Data Leakage)");

    // 4. Test STAGE UPDATE (Kanban Drag & Drop Simulation)
    console.log("\n--- 3. اختبار نقل الصفقات بين المراحل (Kanban Stage Transitions) ---");

    // Move to PROPOSAL
    const movedToProposal = await prisma.deal.update({
      where: { id: deal1.id },
      data: { stage: LeadStage.PROPOSAL },
    });
    if (movedToProposal.stage !== LeadStage.PROPOSAL) {
      throw new Error("❌ فشل نقل الصفقة إلى مرحلة Proposal!");
    }
    console.log(`✓ تم نقل الصفقة بنجاح: NEW -> ${movedToProposal.stage}`);

    // Move to WON
    const movedToWon = await prisma.deal.update({
      where: { id: deal1.id },
      data: { stage: LeadStage.WON },
    });
    if (movedToWon.stage !== LeadStage.WON) {
      throw new Error("❌ فشل نقل الصفقة إلى مرحلة Won!");
    }
    console.log(`✓ تم نقل الصفقة بنجاح: PROPOSAL -> ${movedToWon.stage}`);

    // 5. Test Unauthorized Stage Transition Prevention
    console.log("\n--- 4. اختبار منع التعديل غير المصرح به بين المستأجرين ---");
    const unauthorizedAttempt = await prisma.deal.findFirst({
      where: scope2.where({ id: deal1.id }),
    });

    if (unauthorizedAttempt !== null) {
      throw new Error("❌ خرق أمني! تم العثور على الصفقة ضمن نطاق المؤسسة 2!");
    }
    console.log("✓ تم التأكد: المستأجر 2 لا يستطيع العثور على أو تعديل أي صفقة تابعة للمستأجر 1");

    // 6. Test Deal Cleanup & Metrics Calculation
    console.log("\n--- 5. اختبار حساب مقاييس Pipeline (Metrics) ---");
    const pipelineSum = await prisma.deal.aggregate({
      where: scope1.where(),
      _sum: { value: true },
      _count: true,
    });
    console.log(`✓ إجمالي قيمة Pipeline: $${pipelineSum._sum.value} | عدد الصفقات: ${pipelineSum._count}`);

    console.log("\n🎉 جميع اختبارات Deals & Pipeline اجتازت بنجاح 100%!");
  } finally {
    // Cleanup
    console.log("\nتنظيف البيانات التجريبية...");
    await prisma.deal.deleteMany({
      where: { organizationId: { in: [org1.id, org2.id] } },
    });
    await prisma.company.deleteMany({
      where: { organizationId: { in: [org1.id, org2.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [org1.id, org2.id] } },
    });
    console.log("✓ تم مسح بيانات الاختبار بنجاح.");
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

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tenantScope } from "../src/lib/tenant";
import { TaskStatus, Priority } from "../src/generated/prisma/enums";

async function main() {
  console.log("🚀 بدء اختبارات Tasks & Follow-ups Module (CRUD, Due Dates & Multi-Tenant Isolation)...\n");

  const timestamp = Date.now();
  const org1Name = `Tasks Test Org 1 ${timestamp}`;
  const org2Name = `Tasks Test Org 2 ${timestamp}`;

  // 1. Setup two test tenants
  const org1 = await prisma.organization.create({ data: { name: org1Name } });
  const org2 = await prisma.organization.create({ data: { name: org2Name } });

  const scope1 = tenantScope(org1.id);
  const scope2 = tenantScope(org2.id);

  try {
    // 2. Test CREATE Task
    console.log("--- 1. اختبار Create Task ---");
    const lead1 = await prisma.lead.create({
      data: scope1.create({
        name: "Arthur Dent",
        email: "arthur@galaxy.com",
      }),
    });

    const task1 = await prisma.task.create({
      data: scope1.create({
        title: "Follow up on software demonstration",
        description: "Verify if Arthur has reviewed the architecture slides.",
        dueDate: new Date(Date.now() + 86400000), // tomorrow
        status: TaskStatus.PENDING,
        priority: Priority.HIGH,
        leadId: lead1.id,
      }),
      include: { lead: true },
    });

    console.log(`✓ تم إنشاء المهمة بنجاح: "${task1.title}"`);
    console.log(`✓ الحالة: ${task1.status} | الأولوية: ${task1.priority} | تاريخ الاستحقاق: ${task1.dueDate?.toISOString()}`);
    console.log(`✓ العميل المرتبط: "${task1.lead?.name}"`);

    // 3. Test READ/LIST Tasks with Tenant Scope
    console.log("\n--- 2. اختبار Read Tasks مع عزل المستأجرين ---");
    const org1Tasks = await prisma.task.findMany({
      where: scope1.where(),
      include: { lead: true },
    });

    if (org1Tasks.length !== 1 || org1Tasks[0].id !== task1.id) {
      throw new Error("❌ فشل استرجاع مهام المؤسسة 1!");
    }
    console.log(`✓ تم استرجاع مهام المؤسسة 1 بنجاح (العدد: ${org1Tasks.length})`);

    // Verify Org 2 cannot see Org 1 tasks
    const org2Tasks = await prisma.task.findMany({
      where: scope2.where(),
    });

    if (org2Tasks.length !== 0) {
      throw new Error("❌ خرق أمني! المؤسسة 2 استطاعت رؤية مهام المؤسسة 1!");
    }
    console.log("✓ تم التأكد: المنظمة 2 لا ترى أي من بيانات Tasks الخاصة بالمنظمة 1 (Zero Data Leakage)");

    // 4. Test STATUS TOGGLE (Pending -> Completed)
    console.log("\n--- 3. اختبار تبديل حالة المهمة (Toggle Status) ---");
    const completedTask = await prisma.task.update({
      where: { id: task1.id },
      data: { status: TaskStatus.COMPLETED },
    });

    if (completedTask.status !== TaskStatus.COMPLETED) {
      throw new Error("❌ فشل تحديث حالة المهمة إلى مكتملة!");
    }
    console.log(`✓ تم تحديث حالة المهمة بنجاح إلى: ${completedTask.status}`);

    // 5. Test DELETE Task
    console.log("\n--- 4. اختبار Delete Task ---");
    await prisma.task.delete({
      where: { id: task1.id },
    });

    const remaining = await prisma.task.count({ where: scope1.where() });
    if (remaining !== 0) {
      throw new Error("❌ فشل حذف المهمة!");
    }
    console.log(`✓ تم حذف المهمة بنجاح. المتبقي للمؤسسة 1: ${remaining}`);

    console.log("\n🎉 جميع اختبارات Tasks CRUD والتواريخ وعزل البيانات اجتازت بنجاح 100%!");
  } finally {
    // Cleanup
    console.log("\nتنظيف البيانات التجريبية...");
    await prisma.task.deleteMany({
      where: { organizationId: { in: [org1.id, org2.id] } },
    });
    await prisma.lead.deleteMany({
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

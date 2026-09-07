import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tenantScope } from "../src/lib/tenant";

async function main() {
  console.log("🚀 بدء اختبارات Notes System (CRUD, Pinning, Entity Linking & Multi-Tenant Isolation)...\n");

  const timestamp = Date.now();
  const org1Name = `Notes Test Org 1 ${timestamp}`;
  const org2Name = `Notes Test Org 2 ${timestamp}`;

  // 1. Setup two test tenants
  const org1 = await prisma.organization.create({ data: { name: org1Name } });
  const org2 = await prisma.organization.create({ data: { name: org2Name } });

  const scope1 = tenantScope(org1.id);
  const scope2 = tenantScope(org2.id);

  try {
    // 2. Test CREATE Note with Entity Links
    console.log("--- 1. اختبار Create Note مع ربط الكيانات وتثبيت الملاحظة ---");
    const lead1 = await prisma.lead.create({
      data: scope1.create({
        name: "Elon Reeve",
        email: "elon@space.io",
      }),
    });

    const contact1 = await prisma.contact.create({
      data: scope1.create({
        fullName: "Gwynne Shotwell",
        email: "gwynne@space.io",
      }),
    });

    const note1 = await prisma.note.create({
      data: scope1.create({
        content: "Met during tech symposium. Very interested in enterprise SLA package.",
        isPinned: true,
        leadId: lead1.id,
        contactId: contact1.id,
      }),
      include: {
        lead: true,
        contact: true,
      },
    });

    console.log(`✓ تم إنشاء الملاحظة بنجاح (المحتوى: "${note1.content.substring(0, 40)}...")`);
    console.log(`✓ مثبتة (Pinned): ${note1.isPinned ? "نعم" : "لا"}`);
    console.log(`✓ العميل المرتبط: "${note1.lead?.name}" | جهة الاتصال: "${note1.contact?.fullName}"`);

    // 3. Test READ/LIST Notes with Tenant Scope
    console.log("\n--- 2. اختبار Read Notes مع عزل المستأجرين ---");
    const org1Notes = await prisma.note.findMany({
      where: scope1.where(),
      include: { lead: true, contact: true },
    });

    if (org1Notes.length !== 1 || org1Notes[0].id !== note1.id) {
      throw new Error("❌ فشل استرجاع ملاحظات المؤسسة 1!");
    }
    console.log(`✓ تم استرجاع ملاحظات المؤسسة 1 بنجاح (العدد: ${org1Notes.length})`);

    // Verify Org 2 cannot see Org 1 notes
    const org2Notes = await prisma.note.findMany({
      where: scope2.where(),
    });

    if (org2Notes.length !== 0) {
      throw new Error("❌ خرق أمني! المؤسسة 2 استطاعت رؤية ملاحظات المؤسسة 1!");
    }
    console.log("✓ تم التأكد: المنظمة 2 لا ترى أي من بيانات Notes الخاصة بالمنظمة 1 (Zero Data Leakage)");

    // 4. Test TOGGLE PIN / UPDATE NOTE
    console.log("\n--- 3. اختبار إلغاء التثبيت وتحديث الملاحظة (Unpin & Edit) ---");
    const updatedNote = await prisma.note.update({
      where: { id: note1.id },
      data: {
        isPinned: false,
        content: "Updated follow-up context after call.",
      },
    });

    if (updatedNote.isPinned !== false || updatedNote.content !== "Updated follow-up context after call.") {
      throw new Error("❌ فشل تحديث الملاحظة وإلغاء التثبيت!");
    }
    console.log(`✓ تم إلغاء التثبيت بنجاح (Pinned: ${updatedNote.isPinned}) وتحديث المحتوى.`);

    // 5. Test DELETE Note
    console.log("\n--- 4. اختبار Delete Note ---");
    await prisma.note.delete({
      where: { id: note1.id },
    });

    const remaining = await prisma.note.count({ where: scope1.where() });
    if (remaining !== 0) {
      throw new Error("❌ فشل حذف الملاحظة!");
    }
    console.log(`✓ تم حذف الملاحظة بنجاح. المتبقي للمؤسسة 1: ${remaining}`);

    console.log("\n🎉 جميع اختبارات Notes System CRUD والتثبيت والربط بالكيانات اجتازت بنجاح 100%!");
  } finally {
    // Cleanup
    console.log("\nتنظيف البيانات التجريبية...");
    await prisma.note.deleteMany({
      where: { organizationId: { in: [org1.id, org2.id] } },
    });
    await prisma.contact.deleteMany({
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

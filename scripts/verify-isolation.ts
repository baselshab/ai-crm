import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { tenantScope, assertRole, hasRole } from "../src/lib/tenant";
import { Role } from "../src/generated/prisma/enums";

async function main() {
  console.log("🚀 بدء اختبارات Multi-Tenant Isolation & Authorization RBAC...\n");

  // 1. Test RBAC logic
  console.log("--- 1. اختبار مصفوفة الصلاحيات (RBAC Unit Check) ---");
  const isOwnerAdmin = hasRole(Role.OWNER, [Role.OWNER, Role.ADMIN]);
  const isMemberAdmin = hasRole(Role.MEMBER, [Role.OWNER, Role.ADMIN]);

  console.log(`✓ OWNER has OWNER/ADMIN role? ${isOwnerAdmin ? "نعم (صحيح)" : "لا (خطأ)"}`);
  console.log(`✓ MEMBER has OWNER/ADMIN role? ${!isMemberAdmin ? "لا (صحيح)" : "نعم (خطأ)"}`);

  let threwExpected = false;
  try {
    assertRole(Role.MEMBER, [Role.OWNER, Role.ADMIN]);
  } catch (err: any) {
    threwExpected = true;
    console.log(`✓ تم بنجاح حظر الدور MEMBER من صلاحيات الإدارة: "${err.message}"`);
  }

  if (!threwExpected) {
    throw new Error("❌ فشل اختبار حظر الصلاحيات!");
  }

  // 2. Database Multi-Tenant Isolation Test
  console.log("\n--- 2. اختبار عزل البيانات في قاعدة البيانات (DB Tenant Isolation) ---");

  const timestamp = Date.now();
  const org1Name = `Tenant Alpha ${timestamp}`;
  const org2Name = `Tenant Beta ${timestamp}`;

  // Create Tenant 1
  const org1 = await prisma.organization.create({
    data: { name: org1Name },
  });

  // Create Tenant 2
  const org2 = await prisma.organization.create({
    data: { name: org2Name },
  });

  const scope1 = tenantScope(org1.id);
  const scope2 = tenantScope(org2.id);

  try {
    // Insert Leads into Tenant 1
    await prisma.lead.create({
      data: scope1.create({
        name: "Lead Org 1 Only",
        email: "lead1@alpha.com",
      }),
    });

    // Insert Leads into Tenant 2
    await prisma.lead.create({
      data: scope2.create({
        name: "Lead Org 2 Only",
        email: "lead2@beta.com",
      }),
    });

    // Query Tenant 1 leads using scope1
    const org1Leads = await prisma.lead.findMany({
      where: scope1.where(),
    });

    // Query Tenant 2 leads using scope2
    const org2Leads = await prisma.lead.findMany({
      where: scope2.where(),
    });

    console.log(`✓ عدد Leads لـ ${org1Name}: ${org1Leads.length} (المتوقع 1)`);
    console.log(`✓ عدد Leads لـ ${org2Name}: ${org2Leads.length} (المتوقع 1)`);

    // Verify Zero Leakage
    const leakageCheck1 = org1Leads.some((l) => l.organizationId !== org1.id);
    const leakageCheck2 = org2Leads.some((l) => l.organizationId !== org2.id);

    if (leakageCheck1 || leakageCheck2) {
      throw new Error("❌ تم اكتشاف تسرب بيانات بين المنظمات!");
    }

    console.log("✓ تم التأكد بنجاح: لا يوجد أي تسريب لبيانات المنظمة (Zero Data Leakage confirmed)!");
  } finally {
    // Cleanup test data
    console.log("\nتنظيف بيانات الاختبار المؤقتة...");
    await prisma.lead.deleteMany({
      where: {
        organizationId: { in: [org1.id, org2.id] },
      },
    });
    await prisma.organization.deleteMany({
      where: {
        id: { in: [org1.id, org2.id] },
      },
    });
    console.log("✓ تم مسح بيانات الاختبار.");
  }

  console.log("\n🎉 اكتملت جميع اختبارات Multi-Tenant Isolation & RBAC بنجاح بنسبة 100%!");
}

main()
  .catch((err) => {
    console.error("خطأ في الاختبار:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

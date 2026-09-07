import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Role, LeadStage, Priority, TaskStatus } from "../src/generated/prisma/enums";

/**
 * Idempotent Demo Account Seed Script
 * - Primary User: demo@example.com / Demo1234!
 * - Dedicated Organization: سند للحلول التقنية (Demo Workspace)
 * - Zero impact on existing real users or production data
 * - Re-runnable without duplicates
 */
async function seedDemoData() {
  console.log("==================================================");
  console.log("🌱 بدء تهيئة حساب العرض التجريبي (Demo Account)...");
  console.log("==================================================");

  const DEMO_EMAIL = "demo@example.com";
  const DEMO_PASSWORD = "Demo1234!";
  const DEMO_ORG_NAME = "سند للحلول التقنية (Demo Workspace)";

  // 1. Ensure password hash
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 2. Upsert Demo Primary User
  let demoUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "حساب تجريبي (Demo Account)",
        passwordHash,
      },
    });
    console.log(`✓ تم إنشاء المستخدم التجريبي: ${demoUser.email} (ID: ${demoUser.id})`);
  } else {
    demoUser = await prisma.user.update({
      where: { id: demoUser.id },
      data: {
        name: "حساب تجريبي (Demo Account)",
        passwordHash,
      },
    });
    console.log(`✓ تم تحديث المستخدم التجريبي الموجود: ${demoUser.email}`);
  }

  // 3. Find or Create Demo Organization
  let demoMembership = await prisma.membership.findFirst({
    where: { userId: demoUser.id },
    include: { organization: true },
  });

  let organizationId: string;

  if (!demoMembership) {
    const demoOrg = await prisma.organization.create({
      data: {
        name: DEMO_ORG_NAME,
      },
    });
    organizationId = demoOrg.id;

    await prisma.membership.create({
      data: {
        userId: demoUser.id,
        organizationId: demoOrg.id,
        role: Role.OWNER,
      },
    });
    console.log(`✓ تم إنشاء المنظمة التجريبية: ${demoOrg.name} (ID: ${demoOrg.id})`);
  } else {
    organizationId = demoMembership.organizationId;
    // Update name to reflect demo
    await prisma.organization.update({
      where: { id: organizationId },
      data: { name: DEMO_ORG_NAME },
    });
    console.log(`✓ تم العثور على المنظمة التجريبية: ${DEMO_ORG_NAME} (ID: ${organizationId})`);
  }

  // 4. Secondary Demo Team Members (for realistic team collaboration in Settings)
  const teamMembers = [
    { email: "sarah.demo@example.com", name: "سارة المنصور | مديرة مبيعات", role: Role.ADMIN },
    { email: "omar.demo@example.com", name: "عمر الشريف | تنفيذي مبيعات أول", role: Role.MEMBER },
    { email: "nour.demo@example.com", name: "نور خالد | أخصائية علاقات عملاء", role: Role.MEMBER },
  ];

  const teamUserIds: string[] = [demoUser.id];

  for (const m of teamMembers) {
    let memberUser = await prisma.user.findUnique({ where: { email: m.email } });
    if (!memberUser) {
      memberUser = await prisma.user.create({
        data: {
          email: m.email,
          name: m.name,
          passwordHash,
        },
      });
    }

    teamUserIds.push(memberUser.id);

    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: memberUser.id,
          organizationId,
        },
      },
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          userId: memberUser.id,
          organizationId,
          role: m.role,
        },
      });
    }
  }
  console.log(`✓ تم التحقق من وجود ${teamMembers.length} أعضاء فريق تجريبيين في المنظمة.`);

  // 5. Companies
  const companiesData = [
    "شركة أرامكس للحلول اللوجستية",
    "مجموعة الفطيم القابضة",
    "مؤسسة الابتكار التقني السحابي",
    "شركة تطوير المستقبل للاستثمار العقاري",
    "شركة الرؤية الرقمية لحلول الذكاء الاصطناعي",
    "سلسلة مطاعم الضيافة الحديثة",
    "مجموعة النور للخدمات الطبية",
    "شركة قمة النجاح للاستشارات المالية",
  ];

  const companyMap = new Map<string, string>(); // name -> id
  for (const compName of companiesData) {
    let company = await prisma.company.findFirst({
      where: { organizationId, name: compName },
    });
    if (!company) {
      company = await prisma.company.create({
        data: { organizationId, name: compName },
      });
    }
    companyMap.set(compName, company.id);
  }
  console.log(`✓ تم تجهيز ${companyMap.size} شركات تجارية.`);

  // 6. Contacts
  const contactsData = [
    {
      fullName: "م. خالد بن سلطان العتيبي",
      title: "نائب الرئيس التنفيذي للتقنية (CTO)",
      email: "khaled.sultan@demo.local",
      phone: "+966 50 123 4567",
      companyName: "شركة أرامكس للحلول اللوجستية",
      tags: ["VIP", "صانع قرار", "تقني"],
      notes: "مهتم جداً بتكامل واجهات الربط API وأتمتة العمليات اللوجستية.",
      isFavorite: true,
    },
    {
      fullName: "أ. منى بنت عبد العزيز الراشد",
      title: "مديرة المشتريات وسلاسل الإمداد",
      email: "mona.alrashed@demo.local",
      phone: "+966 54 987 6543",
      companyName: "مجموعة الفطيم القابضة",
      tags: ["مشتريات", "عقود سنوية"],
      notes: "طلبت مراجعة شروط الدفع وجدول الدفعات نصف السنوي.",
      isFavorite: true,
    },
    {
      fullName: "د. طارق محمود الشامي",
      title: "مدير البنية التحتية السحابية",
      email: "tariq.shami@demo.local",
      phone: "+966 56 345 6789",
      companyName: "مؤسسة الابتكار التقني السحابي",
      tags: ["تقني", "سحابي", "أمان"],
      notes: "ناقشنا متطلبات استضافة البيانات والامتثال للأمن السيبراني.",
      isFavorite: false,
    },
    {
      fullName: "أ. ريم عبد الله القحطاني",
      title: "رئيسة قطاع التسويق الرقمي",
      email: "reem.alqahtani@demo.local",
      phone: "+966 55 222 3344",
      companyName: "شركة تطوير المستقبل للاستثمار العقاري",
      tags: ["تسويق", "VIP"],
      notes: "تسعى لربط منصة CRM بالحملات الإعلانية على منصات التواصل.",
      isFavorite: true,
    },
    {
      fullName: "م. حسام الدين زكي",
      title: "مهندس نظم الذكاء الاصطناعي",
      email: "hossam.zaki@demo.local",
      phone: "+966 59 777 8899",
      companyName: "شركة الرؤية الرقمية لحلول الذكاء الاصطناعي",
      tags: ["ذكاء اصطناعي", "تقني"],
      notes: "متحمس لميزات النماذج التوليدية وتحليل سلوك العملاء.",
      isFavorite: false,
    },
    {
      fullName: "أ. فهد منصور الدوسري",
      title: "المدير العام للعمليات والفروع",
      email: "fahad.aldosari@demo.local",
      phone: "+966 53 444 5566",
      companyName: "سلسلة مطاعم الضيافة الحديثة",
      tags: ["عمليات", "توسع"],
      notes: "يرغب في تتبع نقاط البيع وتفاعل العملاء في 35 فرعاً.",
      isFavorite: false,
    },
    {
      fullName: "د. سمر إبراهيم البواردي",
      title: "مديرة الجودة والتحول الرقمي",
      email: "samar.bawardy@demo.local",
      phone: "+966 50 888 9900",
      companyName: "مجموعة النور للخدمات الطبية",
      tags: ["صحة", "VIP", "صانع قرار"],
      notes: "المشروع يهدف لتقليص أوقات انتظار المراجعين وأتمتة المواعيد.",
      isFavorite: true,
    },
    {
      fullName: "أ. زياد مصطفى كمال",
      title: "شريك تنفيذي للاستشارات المالية",
      email: "ziad.kamal@demo.local",
      phone: "+966 54 111 2233",
      companyName: "شركة قمة النجاح للاستشارات المالية",
      tags: ["مالية", "استشارات", "استراتيجي"],
      notes: "يبحث عن نظام يضمن سرية السجلات المالية وإدارة الوصول.",
      isFavorite: true,
    },
    {
      fullName: "أ. هدى ناصر الغامدي",
      title: "أخصائية تطوير أعمال",
      email: "huda.ghamdi@demo.local",
      phone: "+966 55 666 7788",
      companyName: "شركة أرامكس للحلول اللوجستية",
      tags: ["مبيعات", "متابعة"],
      notes: "نقطة الاتصال التشغيلية اليومية مع الفريق.",
      isFavorite: false,
    },
    {
      fullName: "م. بدر يوسف الحربي",
      title: "مدير تقنية المعلومات",
      email: "badr.alharbi@demo.local",
      phone: "+966 58 333 4455",
      companyName: "سلسلة مطاعم الضيافة الحديثة",
      tags: ["تقني", "شبكات"],
      notes: "تم الاتفاق على اجتماع تقني لمراجعة أجهزة الفروع.",
      isFavorite: false,
    },
    {
      fullName: "أ. نادية سالم السبيعي",
      title: "مسؤولة علاقات المستثمرين",
      email: "nadia.subaie@demo.local",
      phone: "+966 56 777 1122",
      companyName: "شركة تطوير المستقبل للاستثمار العقاري",
      tags: ["مستثمرون", "VIP"],
      notes: "طلبت تقريراً تفصيلياً عن معدل العائد الاستثماري للنظام.",
      isFavorite: false,
    },
    {
      fullName: "أ. سلمان تركي الهذلي",
      title: "مدير الحسابات الاستراتيجية",
      email: "salman.hothali@demo.local",
      phone: "+966 50 999 0011",
      companyName: "مجموعة الفطيم القابضة",
      tags: ["صانع قرار", "استراتيجي"],
      notes: "يقود مفاوضات التوسع الإقليمي للمجموعة.",
      isFavorite: false,
    },
    {
      fullName: "م. ليلى فؤاد الصالح",
      title: "مهندسة تطوير حلول الأعمال",
      email: "layla.saleh@demo.local",
      phone: "+966 53 123 7890",
      companyName: "مؤسسة الابتكار التقني السحابي",
      tags: ["تقني", "حلول"],
      notes: "أجرت اختبار التوافق مع أنظمتهم الحالية بنجاح.",
      isFavorite: false,
    },
    {
      fullName: "أ. فيصل أحمد النمري",
      title: "مدير التسويق والمبيعات",
      email: "faisal.namri@demo.local",
      phone: "+966 54 888 2244",
      companyName: "شركة قمة النجاح للاستشارات المالية",
      tags: ["تسويق", "متابعة"],
      notes: "ينسق لحملة ترويجية مشتركة فور الإطلاق.",
      isFavorite: false,
    },
  ];

  const contactMap = new Map<string, string>(); // fullName -> id
  for (const c of contactsData) {
    const compId = companyMap.get(c.companyName) || null;
    let contact = await prisma.contact.findFirst({
      where: { organizationId, fullName: c.fullName },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          organizationId,
          fullName: c.fullName,
          title: c.title,
          email: c.email,
          phone: c.phone,
          companyId: compId,
          tags: c.tags,
          notes: c.notes,
          isFavorite: c.isFavorite,
        },
      });
    } else {
      contact = await prisma.contact.update({
        where: { id: contact.id },
        data: {
          title: c.title,
          email: c.email,
          phone: c.phone,
          companyId: compId,
          tags: c.tags,
          notes: c.notes,
          isFavorite: c.isFavorite,
        },
      });
    }
    contactMap.set(c.fullName, contact.id);
  }
  console.log(`✓ تم تجهيز ${contactMap.size} جهات اتصال.`);

  // 7. Leads (distributed across past 6 months to feed Dashboard charts)
  const now = new Date();
  const getPastDate = (monthsAgo: number, dayOffset = 5) => {
    const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.max(1, dayOffset));
    return d;
  };

  const leadsData = [
    // Month -5
    {
      name: "تطوير منظومة الشحن السريع - أرامكس",
      companyName: "شركة أرامكس للحلول اللوجستية",
      contactName: "م. خالد بن سلطان العتيبي",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      source: "Referral",
      value: 85000,
      notes: "تم توقيع العقد وبدء مرحلة التنفيذ بنجاح.",
      date: getPastDate(5, 12),
    },
    {
      name: "منصة التوسع التجاري - الفطيم",
      companyName: "مجموعة الفطيم القابضة",
      contactName: "أ. سلمان تركي الهذلي",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      source: "Website",
      value: 120000,
      notes: "تم إغلاق الصفقة بالكامل وتحصيل الدفعة الأولى.",
      date: getPastDate(5, 20),
    },
    // Month -4
    {
      name: "استشارات الأمن السيبراني السحابي",
      companyName: "مؤسسة الابتكار التقني السحابي",
      contactName: "د. طارق محمود الشامي",
      stage: LeadStage.WON,
      priority: Priority.MEDIUM,
      source: "LinkedIn",
      value: 65000,
      notes: "اعتماد المشروع النهائي لشهادة الآيزو.",
      date: getPastDate(4, 8),
    },
    {
      name: "تطبيق التوصيل المباشر - الضيافة",
      companyName: "سلسلة مطاعم الضيافة الحديثة",
      contactName: "م. بدر يوسف الحربي",
      stage: LeadStage.LOST,
      priority: Priority.LOW,
      source: "Cold Call",
      value: 40000,
      notes: "قرر العميل تأجيل المشروع بسبب إعادة هيكلة الميزانية.",
      date: getPastDate(4, 18),
    },
    // Month -3
    {
      name: "منظومة التسويق العقاري الذكي",
      companyName: "شركة تطوير المستقبل للاستثمار العقاري",
      contactName: "أ. ريم عبد الله القحطاني",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      source: "Event",
      value: 95000,
      notes: "تفعيل الخدمة لـ 6 مشاريع عقارية كبرى.",
      date: getPastDate(3, 11),
    },
    {
      name: "حلول تحليل البيانات بالذكاء الاصطناعي",
      companyName: "شركة الرؤية الرقمية لحلول الذكاء الاصطناعي",
      contactName: "م. حسام الدين زكي",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      source: "LinkedIn",
      value: 110000,
      notes: "عقد شراكة سنوي لدعم تقنيات الذكاء الاصطناعي.",
      date: getPastDate(3, 24),
    },
    {
      name: "استشارات مالية مؤسسية - قمة النجاح",
      companyName: "شركة قمة النجاح للاستشارات المالية",
      contactName: "أ. فيصل أحمد النمري",
      stage: LeadStage.LOST,
      priority: Priority.LOW,
      source: "Google Search",
      value: 35000,
      notes: "اختار العميل مورد محلي بديل.",
      date: getPastDate(3, 28),
    },
    // Month -2
    {
      name: "نظام إدارة العيادات والمراجعين - النور",
      companyName: "مجموعة النور للخدمات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      source: "Referral",
      value: 140000,
      notes: "تم التوقيع واعتماد خطة الإطلاق التجريبي.",
      date: getPastDate(2, 6),
    },
    {
      name: "بوابة المستثمرين العقاريين",
      companyName: "شركة تطوير المستقبل للاستثمار العقاري",
      contactName: "أ. نادية سالم السبيعي",
      stage: LeadStage.PROPOSAL,
      priority: Priority.MEDIUM,
      source: "Website",
      value: 75000,
      notes: "بانتظار موافقة مجلس الإدارة على العرض المالي.",
      date: getPastDate(2, 16),
    },
    {
      name: "تكامل نقاط البيع السحابية",
      companyName: "سلسلة مطاعم الضيافة الحديثة",
      contactName: "أ. فهد منصور الدوسري",
      stage: LeadStage.QUALIFIED,
      priority: Priority.MEDIUM,
      source: "Website",
      value: 55000,
      notes: "تمت مراجعة المواصفات الفنية وبناء النسخة التجريبية.",
      date: getPastDate(2, 25),
    },
    // Month -1
    {
      name: "عقد الربط اللوجستي الدولي - أرامكس",
      companyName: "شركة أرامكس للحلول اللوجستية",
      contactName: "أ. هدى ناصر الغامدي",
      stage: LeadStage.PROPOSAL,
      priority: Priority.HIGH,
      source: "Referral",
      value: 130000,
      notes: "المقترح الفني قيد المراجعة النهائية مع لجنة المشتريات.",
      date: getPastDate(1, 4),
    },
    {
      name: "منصة تدريب ودعم العملاء بالذكاء الاصطناعي",
      companyName: "شركة الرؤية الرقمية لحلول الذكاء الاصطناعي",
      contactName: "م. حسام الدين زكي",
      stage: LeadStage.PROPOSAL,
      priority: Priority.HIGH,
      source: "LinkedIn",
      value: 90000,
      notes: "تم تقديم العرض التجريبي بحضور فريق الدعم التقني.",
      date: getPastDate(1, 14),
    },
    {
      name: "أتمتة إدارة العقود والمستندات المالية",
      companyName: "شركة قمة النجاح للاستشارات المالية",
      contactName: "أ. زياد مصطفى كمال",
      stage: LeadStage.QUALIFIED,
      priority: Priority.MEDIUM,
      source: "Website",
      value: 80000,
      notes: "تم تحديد نطاق العمل والجدول الزمني المقترح.",
      date: getPastDate(1, 22),
    },
    {
      name: "مشروع البطاقات الذكية وسلاسل الإمداد",
      companyName: "مجموعة الفطيم القابضة",
      contactName: "أ. منى بنت عبد العزيز الراشد",
      stage: LeadStage.LOST,
      priority: Priority.LOW,
      source: "Event",
      value: 45000,
      notes: "تم إلغاء المبادرة لأسباب تنظيمية داخلية لدى العميل.",
      date: getPastDate(1, 28),
    },
    // Current Month (Month 0)
    {
      name: "نظام التتبع الحراري للمستودعات الطبية",
      companyName: "مجموعة النور للخدمات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
      stage: LeadStage.QUALIFIED,
      priority: Priority.HIGH,
      source: "Referral",
      value: 160000,
      notes: "فرصة واعدة جداً، بانتظار استكمال متطلبات أجهزة الاستشعار.",
      date: getPastDate(0, 2),
    },
    {
      name: "منصة المبيعات متعددة القنوات (Omnichannel)",
      companyName: "مجموعة الفطيم القابضة",
      contactName: "أ. منى بنت عبد العزيز الراشد",
      stage: LeadStage.NEW,
      priority: Priority.HIGH,
      source: "Website",
      value: 175000,
      notes: "عميل محتمل جديد تم استلام طلبه عبر الموقع الإلكتروني.",
      date: getPastDate(0, 3),
    },
    {
      name: "أداة تدقيق الامتثال المالي الآلي",
      companyName: "شركة قمة النجاح للاستشارات المالية",
      contactName: "أ. زياد مصطفى كمال",
      stage: LeadStage.NEW,
      priority: Priority.MEDIUM,
      source: "Google Search",
      value: 68000,
      notes: "طلب اجتماع تمهيدي للتعرف على قدرات النظام.",
      date: getPastDate(0, 4),
    },
    {
      name: "خدمات الحوسبة الطرفية السحابية",
      companyName: "مؤسسة الابتكار التقني السحابي",
      contactName: "م. ليلى فؤاد الصالح",
      stage: LeadStage.NEW,
      priority: Priority.MEDIUM,
      source: "LinkedIn",
      value: 52000,
      notes: "استفسار وارد حول إمكانية التشغيل الهجين Hybrid Cloud.",
      date: getPastDate(0, 5),
    },
  ];

  const leadMap = new Map<string, string>(); // name -> id
  for (const l of leadsData) {
    const compId = companyMap.get(l.companyName) || null;
    const contId = contactMap.get(l.contactName) || null;

    let lead = await prisma.lead.findFirst({
      where: { organizationId, name: l.name },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId,
          name: l.name,
          stage: l.stage,
          priority: l.priority,
          source: l.source,
          value: l.value,
          notes: l.notes,
          companyId: compId,
          contactId: contId,
          createdAt: l.date,
          updatedAt: l.date,
        },
      });
    } else {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          stage: l.stage,
          priority: l.priority,
          source: l.source,
          value: l.value,
          notes: l.notes,
          companyId: compId,
          contactId: contId,
          createdAt: l.date,
        },
      });
    }
    leadMap.set(l.name, lead.id);
  }
  console.log(`✓ تم تجهيز ${leadMap.size} عملاء محتملين (Leads) بإحصائيات تاريخية.`);

  // 8. Pipeline Deals (Kanban deals across all 5 stages)
  const dealsData = [
    {
      title: "منصة المبيعات متعددة القنوات - الفطيم",
      stage: LeadStage.NEW,
      priority: Priority.HIGH,
      value: 175000,
      companyName: "مجموعة الفطيم القابضة",
      contactName: "أ. منى بنت عبد العزيز الراشد",
      leadName: "منصة المبيعات متعددة القنوات (Omnichannel)",
    },
    {
      title: "أداة تدقيق الامتثال المالي الآلي - قمة النجاح",
      stage: LeadStage.NEW,
      priority: Priority.MEDIUM,
      value: 68000,
      companyName: "شركة قمة النجاح للاستشارات المالية",
      contactName: "أ. زياد مصطفى كمال",
      leadName: "أداة تدقيق الامتثال المالي الآلي",
    },
    {
      title: "تتبع المستودعات الطبية الذكية - النور",
      stage: LeadStage.QUALIFIED,
      priority: Priority.HIGH,
      value: 160000,
      companyName: "مجموعة النور للخدمات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
      leadName: "نظام التتبع الحراري للمستودعات الطبية",
    },
    {
      title: "تكامل نقاط البيع والفروع - الضيافة",
      stage: LeadStage.QUALIFIED,
      priority: Priority.MEDIUM,
      value: 55000,
      companyName: "سلسلة مطاعم الضيافة الحديثة",
      contactName: "أ. فهد منصور الدوسري",
      leadName: "تكامل نقاط البيع السحابية",
    },
    {
      title: "عقد الربط اللوجستي السنوي - أرامكس",
      stage: LeadStage.PROPOSAL,
      priority: Priority.HIGH,
      value: 130000,
      companyName: "شركة أرامكس للحلول اللوجستية",
      contactName: "أ. هدى ناصر الغامدي",
      leadName: "عقد الربط اللوجستي الدولي - أرامكس",
    },
    {
      title: "منصة تدريب الذكاء الاصطناعي التوليدي",
      stage: LeadStage.PROPOSAL,
      priority: Priority.HIGH,
      value: 90000,
      companyName: "شركة الرؤية الرقمية لحلول الذكاء الاصطناعي",
      contactName: "م. حسام الدين زكي",
      leadName: "منصة تدريب ودعم العملاء بالذكاء الاصطناعي",
    },
    {
      title: "بوابة المستثمرين العقاريين الرقمية",
      stage: LeadStage.PROPOSAL,
      priority: Priority.MEDIUM,
      value: 75000,
      companyName: "شركة تطوير المستقبل للاستثمار العقاري",
      contactName: "أ. نادية سالم السبيعي",
      leadName: "بوابة المستثمرين العقاريين",
    },
    {
      title: "مشروع نظام إدارة المستشفيات - النور",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      value: 140000,
      companyName: "مجموعة النور للخدمات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
      leadName: "نظام إدارة العيادات والمراجعين - النور",
    },
    {
      title: "منظومة التسويق العقاري التفاعلي",
      stage: LeadStage.WON,
      priority: Priority.HIGH,
      value: 95000,
      companyName: "شركة تطوير المستقبل للاستثمار العقاري",
      contactName: "أ. ريم عبد الله القحطاني",
      leadName: "منظومة التسويق العقاري الذكي",
    },
    {
      title: "مشروع البطاقات الذكية اللوجستية",
      stage: LeadStage.LOST,
      priority: Priority.LOW,
      value: 45000,
      companyName: "مجموعة الفطيم القابضة",
      contactName: "أ. منى بنت عبد العزيز الراشد",
      leadName: "مشروع البطاقات الذكية وسلاسل الإمداد",
    },
  ];

  const dealMap = new Map<string, string>(); // title -> id
  for (const d of dealsData) {
    const compId = companyMap.get(d.companyName) || null;
    const contId = contactMap.get(d.contactName) || null;
    const leadId = leadMap.get(d.leadName) || null;

    let deal = await prisma.deal.findFirst({
      where: { organizationId, title: d.title },
    });

    if (!deal) {
      deal = await prisma.deal.create({
        data: {
          organizationId,
          title: d.title,
          stage: d.stage,
          priority: d.priority,
          value: d.value,
          companyId: compId,
          contactId: contId,
          leadId,
        },
      });
    } else {
      deal = await prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: d.stage,
          priority: d.priority,
          value: d.value,
          companyId: compId,
          contactId: contId,
          leadId,
        },
      });
    }
    dealMap.set(d.title, deal.id);
  }
  console.log(`✓ تم تجهيز ${dealMap.size} صفقات في خط المبيعات (Pipeline Kanban).`);

  // 9. Tasks & Follow-ups
  const tasksData = [
    {
      title: "إرسال مسودة العقد المالي والتقني لأرامكس",
      description: "مراجعة بنود اتفاقية مستوى الخدمة SLA وتضمين شروط الصيانة والدعم الفني.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1), // Tomorrow
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      leadName: "عقد الربط اللوجستي الدولي - أرامكس",
      contactName: "م. خالد بن سلطان العتيبي",
    },
    {
      title: "مكالمة متابعة العرض الفني مع مهندسي الذكاء الاصطناعي",
      description: "مناقشة تكامل نماذج LLM والتحليلات البيانية المتقدمة.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      leadName: "منصة تدريب ودعم العملاء بالذكاء الاصطناعي",
      contactName: "م. حسام الدين زكي",
    },
    {
      title: "إعداد العرض التقديمي (Demo) لاجتماع مجلس الإدارة",
      description: "تخصيص لوحة المؤشرات لعرض مؤشرات العائد الاستثماري لشركة الفطيم.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      leadName: "منصة المبيعات متعددة القنوات (Omnichannel)",
      contactName: "أ. منى بنت عبد العزيز الراشد",
    },
    {
      title: "مراجعة متطلبات الربط البرمجي API مع الفريق التقني",
      description: "فحص وثائق الـ Webhooks وآلية مزامنة بيانات العملاء.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4), // 4 days
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      leadName: "تكامل نقاط البيع السحابية",
      contactName: "أ. فهد منصور الدوسري",
    },
    {
      title: "تحديث وثيقة دراسة الجدوى وتكلفة الاشتراكات",
      description: "إضافة خيارات الدفع ربع السنوي وإرسالها لمدير الحسابات المالية.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // 5 days
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      leadName: "أداة تدقيق الامتثال المالي الآلي",
      contactName: "أ. زياد مصطفى كمال",
    },
    {
      title: "جدولة ورشة عمل تعريفية بنظام المستشفيات",
      description: "تدريب المشرفين ورؤساء الأقسام على متابعة تقارير رضا المرضى.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6), // 6 days
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      leadName: "نظام التتبع الحراري للمستودعات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
    },
    {
      title: "مراجعة أداء البوابة العقارية للشهر الأول",
      description: "استخراج تقرير أعداد المراجعين ومعدل التحويل عبر البوابة.",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // Completed past
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      leadName: "منظومة التسويق العقاري الذكي",
      contactName: "أ. ريم عبد الله القحطاني",
    },
    {
      title: "تسليم رخص الاستخدام وتوثيق اعتمادات الأمان",
      description: "إرسال شهادات التشفير وحسابات مديري النظام لفريق أرامكس.",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // Completed past
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      leadName: "تطوير منظومة الشحن السريع - أرامكس",
      contactName: "م. خالد بن سلطان العتيبي",
    },
    {
      title: "متابعة توقيع ملحق العقد الإضافي",
      description: "التنسيق مع الشؤون القانونية بخصوص مدة الضمان والصيانة الوقائية.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      status: TaskStatus.PENDING,
      priority: Priority.LOW,
      leadName: "بوابة المستثمرين العقاريين",
      contactName: "أ. نادية سالم السبيعي",
    },
    {
      title: "إجراء مكالمة ترحيبية بالعميل الجديد",
      description: "الترحيب بفريق الحساب السحابي وشرح قنوات الدعم والتواصل الفوري.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      leadName: "خدمات الحوسبة الطرفية السحابية",
      contactName: "م. ليلى فؤاد الصالح",
    },
    {
      title: "فحص توافق أجهزة الباركود في مستودعات الرياض",
      description: "اختبار قارئات الباركود المحمولة مع واجهة النظام السحابية.",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      leadName: "تطوير منظومة الشحن السريع - أرامكس",
      contactName: "م. خالد بن سلطان العتيبي",
    },
    {
      title: "إرسال استبيان تقييم الرضا ربع السنوي",
      description: "قياس رضا مديري الحسابات وتجميع ملاحظاتهم حول سرعة الاستجابة.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      status: TaskStatus.PENDING,
      priority: Priority.LOW,
      leadName: "منصة التوسع التجاري - الفطيم",
      contactName: "أ. سلمان تركي الهذلي",
    },
    {
      title: "متابعة اعتماد التقرير المالي لشهر أغسطس",
      description: "إرسال الفاتورة الضريبية النهائية وتأكيد استلام الإشعار البنكي.",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      leadName: "استشارات الأمن السيبراني السحابي",
      contactName: "د. طارق محمود الشامي",
    },
    {
      title: "تحضير تقرير المقارنة التنافسية",
      description: "إعداد ملف توضيحي بمزايا سند CRM مقابل الحلول التقليدية.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.MEDIUM,
      leadName: "أداة تدقيق الامتثال المالي الآلي",
      contactName: "أ. زياد مصطفى كمال",
    },
    {
      title: "مراجعة خطة ترحيل البيانات القديمة",
      description: "تأكيد نظافة ملفات الـ Excel ومطابقة الحقول مع حقول سند CRM.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 8),
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      leadName: "نظام التتبع الحراري للمستودعات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
    },
    {
      title: "تأكيد موعد الإطلاق الرسمي للمرحلة الأولى",
      description: "إرسال بريد رسمي بالجدول الزمني النهائي ومسؤوليات كل فريق.",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 12),
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      leadName: "عقد الربط اللوجستي الدولي - أرامكس",
      contactName: "م. خالد بن سلطان العتيبي",
    },
  ];

  let taskCount = 0;
  for (let i = 0; i < tasksData.length; i++) {
    const t = tasksData[i];
    const leadId = leadMap.get(t.leadName) || null;
    const contId = contactMap.get(t.contactName) || null;
    const assignedId = teamUserIds[i % teamUserIds.length];

    let task = await prisma.task.findFirst({
      where: { organizationId, title: t.title },
    });

    if (!task) {
      await prisma.task.create({
        data: {
          organizationId,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate,
          status: t.status,
          priority: t.priority,
          leadId,
          contactId: contId,
          assignedToId: assignedId,
        },
      });
    } else {
      await prisma.task.update({
        where: { id: task.id },
        data: {
          description: t.description,
          dueDate: t.dueDate,
          status: t.status,
          priority: t.priority,
          leadId,
          contactId: contId,
          assignedToId: assignedId,
        },
      });
    }
    taskCount++;
  }
  console.log(`✓ تم تجهيز ${taskCount} مهام ومتابعات مجدولة.`);

  // 10. Notes & Internal Documentation
  const notesData = [
    {
      content: "📌 تم الاجتماع برئيس قطاع التقنية في أرامكس: أبدوا إعجاباً كبيراً بسرعة أداء النظام وتكامله مع قواعد البيانات اللوجستية. نوصي بتسريع إجراءات الربط البرمجي.",
      isPinned: true,
      leadName: "عقد الربط اللوجستي الدولي - أرامكس",
      contactName: "م. خالد بن سلطان العتيبي",
      dealTitle: "عقد الربط اللوجستي السنوي - أرامكس",
    },
    {
      content: "📌 شروط العقد مع مجموعة الفطيم: تفضيل دفع الفواتير نصف سنوي مع تقديم خصم 8% على الاشتراكات السنوية المتجددة. تمت موافقة الإدارة المالية.",
      isPinned: true,
      leadName: "منصة المبيعات متعددة القنوات (Omnichannel)",
      contactName: "أ. منى بنت عبد العزيز الراشد",
      dealTitle: "منصة المبيعات متعددة القنوات - الفطيم",
    },
    {
      content: "📌 متطلبات أمن المعلومات والامتثال الصحي (مجموعة النور): التأكد من تفعيل المصادقة الثنائية وتشفير السجلات الحساسة طبقاً لمعايير الهيئة الوطنية للأمن السيبراني.",
      isPinned: true,
      leadName: "نظام التتبع الحراري للمستودعات الطبية",
      contactName: "د. سمر إبراهيم البواردي",
      dealTitle: "تتبع المستودعات الطبية الذكية - النور",
    },
    {
      content: "ملاحظة فنية: تم تجربة ميزة التوليد الآلي لمسودات البريد الإلكتروني بالذكاء الاصطناعي مع العميل، وكانت نسبة القبول والتعديل طفيفة جداً.",
      isPinned: false,
      leadName: "منصة تدريب ودعم العملاء بالذكاء الاصطناعي",
      contactName: "م. حسام الدين زكي",
      dealTitle: "منصة تدريب الذكاء الاصطناعي التوليدي",
    },
    {
      content: "اجتماع المراجعة مع مديرة التسويق: العميل يطلب ربط لوحة التحكم بحسابات Google Ads وLinkedIn لمعرفة تكلفة اكتساب العميل CAC بدقة.",
      isPinned: false,
      leadName: "منظومة التسويق العقاري الذكي",
      contactName: "أ. ريم عبد الله القحطاني",
      dealTitle: "منظومة التسويق العقاري التفاعلي",
    },
    {
      content: "تم الاتفاق على بدء المرحلة التجريبية (Pilot Phase) في 3 فروع رئيسية لسلسلة المطاعم قبل التعميم على كافة الفروع الـ 35.",
      isPinned: false,
      leadName: "تكامل نقاط البيع السحابية",
      contactName: "أ. فهد منصور الدوسري",
      dealTitle: "تكامل نقاط البيع والفروع - الضيافة",
    },
    {
      content: "تحديث الميزانية المعتمدة لشركة قمة النجاح: تم رصد 80 ألف دولار كميزانية مبدئية مع خيار التوسع في الربع الثاني من العام القادم.",
      isPinned: false,
      leadName: "أداة تدقيق الامتثال المالي الآلي",
      contactName: "أ. زياد مصطفى كمال",
      dealTitle: "أداة تدقيق الامتثال المالي الآلي - قمة النجاح",
    },
    {
      content: "ملاحظة متابعة: العميل أبدى اهتمامه بطلب دورة تدريبية مكثفة لفريق المبيعات الداخلي، تم إدراج ذلك ضمن بنود الدعم الإضافي.",
      isPinned: false,
      leadName: "بوابة المستثمرين العقاريين",
      contactName: "أ. نادية سالم السبيعي",
      dealTitle: "بوابة المستثمرين العقاريين الرقمية",
    },
    {
      content: "تم تسليم توثيق بنية النظام واختبارات الحمل والأداء بنجاح تام، وأكد الفريق الهندسي جاهزية البيئة السحابية للإطلاق.",
      isPinned: false,
      leadName: "استشارات الأمن السيبراني السحابي",
      contactName: "د. طارق محمود الشامي",
      dealTitle: null,
    },
    {
      content: "مكالمة استطلاعية: تم استعراض أبرز مزايا نظام سند CRM، وتم الاتفاق على إرسال مقترح استثماري متكامل نهاية الأسبوع.",
      isPinned: false,
      leadName: "خدمات الحوسبة الطرفية السحابية",
      contactName: "م. ليلى فؤاد الصالح",
      dealTitle: null,
    },
    {
      content: "تم إغلاق الصفقة بنجاح واستلام الدفعة الأولى من مستحقات تطوير منظومة الشحن السريع.",
      isPinned: false,
      leadName: "تطوير منظومة الشحن السريع - أرامكس",
      contactName: "م. خالد بن سلطان العتيبي",
      dealTitle: null,
    },
    {
      content: "تم الانتهاء من ترحيل بيانات جهات الاتصال القديمة ومطابقة أرقام الهواتف والسجلات الضريبية.",
      isPinned: false,
      leadName: "نظام إدارة العيادات والمراجعين - النور",
      contactName: "د. سمر إبراهيم البواردي",
      dealTitle: "مشروع نظام إدارة المستشفيات - النور",
    },
  ];

  let noteCount = 0;
  for (const n of notesData) {
    const leadId = n.leadName ? leadMap.get(n.leadName) || null : null;
    const contId = n.contactName ? contactMap.get(n.contactName) || null : null;
    const dealId = n.dealTitle ? dealMap.get(n.dealTitle) || null : null;

    // Search by partial content matching within demo org
    const prefix = n.content.slice(0, 30);
    let note = await prisma.note.findFirst({
      where: {
        organizationId,
        content: { startsWith: prefix },
      },
    });

    if (!note) {
      await prisma.note.create({
        data: {
          organizationId,
          content: n.content,
          isPinned: n.isPinned,
          leadId,
          contactId: contId,
          dealId,
        },
      });
    } else {
      await prisma.note.update({
        where: { id: note.id },
        data: {
          content: n.content,
          isPinned: n.isPinned,
          leadId,
          contactId: contId,
          dealId,
        },
      });
    }
    noteCount++;
  }
  console.log(`✓ تم تجهيز ${noteCount} ملاحظات وتدوينات داخلية (مع 3 ملاحظات مثبتة).`);

  console.log("\n==================================================");
  console.log("🎉 اكتملت عملية تهيئة البيانات التجريبية بنجاح 100%!");
  console.log("==================================================");
  console.log(`📧 البريد الإلكتروني: ${DEMO_EMAIL}`);
  console.log(`🔑 كلمة المرور:      ${DEMO_PASSWORD}`);
  console.log(`🏢 المنظمة:          ${DEMO_ORG_NAME}`);
  console.log(`📊 ملخص السجلات المُهيأة:`);
  console.log(`   - الشركات:         ${companyMap.size}`);
  console.log(`   - جهات الاتصال:    ${contactMap.size}`);
  console.log(`   - العملاء المحتملين: ${leadMap.size}`);
  console.log(`   - صفقات المبيعات:   ${dealMap.size}`);
  console.log(`   - المهام والمتابعات: ${taskCount}`);
  console.log(`   - الملاحظات:       ${noteCount}`);
  console.log(`   - أعضاء الفريق:     ${teamUserIds.length}`);
  console.log("==================================================\n");
}

seedDemoData()
  .catch((err) => {
    console.error("❌ خطأ أثناء تهيئة البيانات التجريبية:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

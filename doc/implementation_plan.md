# خطة عمل: Organization & Authorization Logic (Multi-Tenant Data Isolation)

الهدف من هذه المرحلة هو وضع الأساس الأمني والمعماري الكامل لـ Multi-Tenancy (تعدد المستأجرين) وضمان العزل التام لبيانات كل منظمة (Organization) مع إدارة الصلاحيات (RBAC: OWNER, ADMIN, MEMBER) قبل البدء في إنشاء كيانات الـ CRM (Leads, Contacts, Deals, Tasks, Notes).

---

## 1. ما سنفعله الآن (Objective)
بناء طبقة الأمان والـ Context الخاصة بتعدد المستأجرين والصلاحيات:
1. إنشاء **Tenant Context & Guard Layer** في `src/lib/tenant.ts`:
   - استخراج وتأكيد هوية المستخدم والمؤسسة الحالية (`requireTenant()`).
   - فحص الصلاحيات بحسب الأدوار (`OWNER`, `ADMIN`, `MEMBER`).
   - توفير حراس صلاحيات (`requireRole(["OWNER", "ADMIN"])`).
2. إنشاء دوال إدارة المؤسسة وفريق العمل (Organization & Team Management Actions):
   - جلب بيانات المنظمة وأعضاء الفريق (`getOrganizationInfo()`).
   - تحديث اسم وإعدادات المنظمة (محمي لصلاحيات `OWNER` و `ADMIN`).
   - دعوة/إضافة عضو جديد لمنظمة وتحديد دوره (`addOrganizationMember()`).
3. توفير نمط استعلامات آمن ومحصور بالمؤسسة (Tenant-Scoped Query Pattern) لمنع أي تسريب بيانات (Zero Data Leakage).
4. كتابة سكربت فحص وتأكيد العزل المتعدد (Multi-Tenant Isolation Test) لتجربة عزل البيانات والتأكد من الصلاحيات.
5. تحديث `PROGRESS.md` لتوثيق إنجاز الخطوة وانتقال المشروع للمرحلة التالية (Core CRM Entities).

---

## 2. لماذا نفعله؟ (Rationale)
- في تطبيقات الـ SaaS الـ B2B، يُعد تسرب البيانات بين المنظمات (Data Leakage) كارثة أمنية خطيرة.
- كل استعلام قادم لـ Leads أو Contacts أو Deals يجب أن يكون مقيداً برمجياً بـ `organizationId`.
- وجود Helper مركزي موثوق ومفحوص بالـ TypeScript يمنع تكرار كود التحقق ويضمن عدم نسيان شرط المنظمة `where: { organizationId }` في أي استعلام أو Action.

---

## 3. الملفات المطلوب إنشاؤها وتعديلها (Proposed Changes)

### [NEW] `src/lib/tenant.ts`
- يحتوي على:
  - `requireTenant()`: يتحقق من الـ Session ويضمن وجود `organizationId` ويعيد `{ user, userId, organizationId, role }`.
  - `hasRole(userRole, allowedRoles)`: فحص الصلاحيات.
  - `requireRole(allowedRoles)`: حارس يرمي خطأ إذا لم يكن للمستخدم الصلاحية المطلوبة.
  - تعريفات الصلاحيات (`Permission` و `RolePermissions`).

### [NEW] `src/lib/actions/organization.ts`
- Server Actions لإدارة المنظمة وفريق العمل مع تطبيق حراس الأمان:
  - `getOrganizationDetails()`
  - `updateOrganizationName(name)`
  - `addMemberToOrganization(email, role)`

### [NEW] `scripts/verify-isolation.ts`
- سكربت اختبار وتحقق عملي من:
  1. عزل المستأجرين: التأكد من أن المنظمة 1 لا تستطيع الوصول أو رؤية بيانات المنظمة 2.
  2. قيود الصلاحيات: التأكد من رفض تعديل إعدادات المنظمة لـ `MEMBER` العادي وسماحها لـ `OWNER`/`ADMIN`.

### [MODIFY] [src/app/dashboard/page.tsx](file:///f:/pro/next-js-projects/ai-crm/src/app/dashboard/page.tsx)
- ربط صفحة لوحة التحكم بالـ `requireTenant()` الحقيقي وعرض أعضاء المنظمة وتفاصيل الدور لإثبات فاعلية الـ Multi-Tenant Context عملياً.

### [MODIFY] [PROGRESS.md](file:///f:/pro/next-js-projects/ai-crm/PROGRESS.md)
- تحديث حالة التقدم والتأشير على اكتمال الـ Organization & Authorization logic.

---

## 4. خطة التحقق والاختبار (Verification Plan)
1. **فحص الـ Compilation و TypeScript**:
   - تشغيل `pnpm tsc --noEmit` أو `npx next build` للتأكد من عدم وجود أخطاء في الأنواع.
2. **فحص العزل البرمجي (Isolation Script)**:
   - تشغيل سكربت الاختبار والتحقق من عدم اختراق بيانات مستأجر لآخر ونجاح الفحوصات.
3. **فحص شاشة الـ Dashboard**:
   - التأكد من قراءة معلومات المؤسسة والأدوار عبر الـ Tenant Context الجديد بسلاسة.

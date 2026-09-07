import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, companyName } = body;

    // 1. Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها (الاسم، البريد، كلمة المرور)." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." },
        { status: 400 }
      );
    }

    // 2. Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مسجل بالفعل." },
        { status: 400 }
      );
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create User + Organization + Membership in a transaction
    const orgName = companyName?.trim() || `${name.trim()}'s Workspace`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
        },
      });

      return { user, organization, membership };
    });

    return NextResponse.json(
      {
        message: "تم إنشاء الحساب والمنظمة بنجاح.",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء التسجيل. يرجى المحاولة لاحقاً." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sanitizeUser,
  parseUserAgent,
  type SessionDevice,
} from '@/lib/auth';
import { parentSignupSchema } from '@/lib/validation';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

function deviceFromBody(body: unknown): SessionDevice {
  const b = (body ?? {}) as Record<string, unknown>;
  const deviceId =
    typeof b.deviceId === 'string' && b.deviceId ? (b.deviceId as string).slice(0, 200) : undefined;
  const userAgent =
    typeof b.userAgent === 'string' ? (b.userAgent as string).slice(0, 500) : undefined;
  const parsed = userAgent ? parseUserAgent(userAgent) : undefined;
  return {
    deviceId,
    userAgent,
    browser: typeof b.browser === 'string' ? (b.browser as string).slice(0, 60) : parsed?.browser,
    os: typeof b.os === 'string' ? (b.os as string).slice(0, 60) : parsed?.os,
    deviceName:
      typeof b.deviceName === 'string' ? (b.deviceName as string).slice(0, 120) : parsed?.deviceName,
  };
}

function normalizePhone(p: string): string {
  return p.replace(/[^0-9]/g, '');
}

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 5, 60 * 1000)) {
    return tooManyRequests();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const parsed = parentSignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'يرجى ملء جميع الحقول بشكل صحيح' },
      { status: 400 }
    );
  }

  try {
    const { name, email, password, phone } = parsed.data;
    const device = deviceFromBody(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const parent = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        phone,
        parentPhone: '',
        role: 'parent',
      },
    });

    // Auto-link students whose declared parent phone matches this parent's phone.
    const phoneDigits = normalizePhone(phone);
    let linked = 0;
    if (phoneDigits) {
      const students = await prisma.user.findMany({
        where: { role: 'student', parentPhone: { not: '' } },
        select: { id: true, parentPhone: true },
      });
      const matches = students.filter((s) => normalizePhone(s.parentPhone) === phoneDigits);
      if (matches.length > 0) {
        await prisma.parentStudent.createMany({
          data: matches.map((s) => ({ parentId: parent.id, studentId: s.id, canEdit: false })),
          skipDuplicates: true,
        });
        linked = matches.length;
      }
    }

    const token = await createSession(parent.id, device);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({ success: true, user: sanitizeUser(parent), linked });
  } catch (error) {
    console.error('Parent signup error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

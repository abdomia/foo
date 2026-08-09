import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createUser, getUserByEmail } from '@/lib/db';
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  parseUserAgent,
  type SessionDevice,
} from '@/lib/auth';
import { signupSchema } from '@/lib/validation';
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

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'يرجى ملء جميع الحقول بشكل صحيح' },
      { status: 400 }
    );
  }

  try {
    const data = parsed.data;
    const device = deviceFromBody(body);

    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً' },
        { status: 409 }
      );
    }

    const user = await createUser({
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      parentPhone: data.parentPhone,
      avatar: data.avatar || undefined,
      grade: data.grade || undefined,
      isSubscribed: false,
    });

    const token = await createSession(user.id, device);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

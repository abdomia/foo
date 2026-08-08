import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createUser, getUserByEmail } from '@/lib/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';
import { signupSchema } from '@/lib/validation';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

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

    const token = await createSession(user.id);
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

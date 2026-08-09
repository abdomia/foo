import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByEmailWithPassword } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import {
  sanitizeUser,
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  parseUserAgent,
  getMaxDevices,
  countActiveDevices,
  deviceHasActiveSession,
  revokeOldestDevice,
  type SessionDevice,
} from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
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
  if (!rateLimit(request, 10, 60 * 1000)) {
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const { email, password } = parsed.data;
    const device = deviceFromBody(body);
    const force = (body as Record<string, unknown>).force === true;
    const user = await getUserByEmailWithPassword(email);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Only bcrypt hashes are accepted. All accounts have been migrated off
    // plaintext passwords; there is no plaintext fallback anymore.
    const passwordValid = await verifyPassword(password, user.password);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Device-limit enforcement (admins bypass).
    if (!user.isAdmin && device.deviceId) {
      const alreadyActive = await deviceHasActiveSession(user.id, device.deviceId);
      if (!alreadyActive) {
        const [count, maxDevices] = await Promise.all([
          countActiveDevices(user.id),
          getMaxDevices(),
        ]);
        if (count >= maxDevices) {
          if (force) {
            await revokeOldestDevice(user.id, device.deviceId);
          } else {
            return NextResponse.json(
              {
                success: false,
                code: 'MAX_DEVICES',
                error: `لقد وصلت إلى الحد الأقصى للأجهزة المسموح بها (${maxDevices})`,
                maxDevices,
                deviceCount: count,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const token = await createSession(user.id, device);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    return NextResponse.json({ success: true, user: sanitizeUser(user) });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

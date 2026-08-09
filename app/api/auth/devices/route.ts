import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { prisma } from '@/lib/db';
import {
  getSessionUser,
  unauthorized,
  getMaxDevices,
  SESSION_COOKIE,
} from '@/lib/auth';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  const [sessions, maxDevices] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { lastActiveAt: 'desc' },
    }),
    getMaxDevices(),
  ]);

  const grouped = new Map<
    string,
    {
      deviceId: string | null;
      deviceName: string | null;
      browser: string | null;
      os: string | null;
      userAgent: string | null;
      lastActiveAt: Date | null;
      sessions: number;
      isCurrent: boolean;
    }
  >();

  for (const s of sessions) {
    const key = s.deviceId ?? '__unknown__';
    const existing = grouped.get(key);
    if (existing) {
      existing.sessions += 1;
      existing.isCurrent = existing.isCurrent || s.tokenHash === currentHash;
      if (!existing.lastActiveAt || (s.lastActiveAt && s.lastActiveAt > existing.lastActiveAt)) {
        existing.lastActiveAt = s.lastActiveAt;
      }
      continue;
    }
    grouped.set(key, {
      deviceId: s.deviceId,
      deviceName: s.deviceName,
      browser: s.browser,
      os: s.os,
      userAgent: s.userAgent,
      lastActiveAt: s.lastActiveAt,
      sessions: 1,
      isCurrent: s.tokenHash === currentHash,
    });
  }

  const devices = Array.from(grouped.values()).map((d) => ({
    deviceId: d.deviceId,
    deviceName: d.deviceName ?? 'جهاز غير معروف',
    browser: d.browser ?? 'متصفح',
    os: d.os ?? 'جهاز',
    userAgent: d.userAgent,
    lastActiveAt: d.lastActiveAt?.toISOString() ?? null,
    sessions: d.sessions,
    isCurrent: d.isCurrent,
  }));

  return NextResponse.json({
    success: true,
    data: {
      devices,
      maxDevices,
      currentDeviceId: sessions.find((s) => s.tokenHash === currentHash)?.deviceId ?? null,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: { deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const targetDeviceId = typeof body.deviceId === 'string' && body.deviceId ? body.deviceId : null;
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE)?.value;
  const currentHash = currentToken ? hashToken(currentToken) : null;

  try {
    const currentDeviceId = currentHash
      ? (await prisma.session.findUnique({
          where: { tokenHash: currentHash },
          select: { deviceId: true },
        }))?.deviceId ?? null
      : null;

    const result = await prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        ...(targetDeviceId ? { deviceId: targetDeviceId } : { deviceId: null }),
      },
    });

    const currentWasRemoved = currentHash != null && currentDeviceId === targetDeviceId;

    return NextResponse.json({
      success: true,
      removed: result.count,
      ...(currentWasRemoved ? { loggedOut: true } : {}),
    });
  } catch (error) {
    console.error('Device revoke error:', error);
    return NextResponse.json({ success: false, error: 'تعذر تسجيل الخروج من الجهاز' }, { status: 500 });
  }
}

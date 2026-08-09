import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';
import type { User as PrismaUser } from '@prisma/client';

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  parentPhone: string;
  avatar?: string;
  grade?: string;
  isSubscribed: boolean;
  subscriptionPlan?: string;
  subscriptionExpiry?: string;
  isAdmin: boolean;
  role: string;
  createdAt: string;
};

export function sanitizeUser(user: PrismaUser): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    parentPhone: user.parentPhone,
    avatar: user.avatar || undefined,
    grade: user.grade || undefined,
    isSubscribed: user.isSubscribed,
    subscriptionPlan: user.subscriptionPlan || undefined,
    subscriptionExpiry: user.subscriptionExpiry?.toISOString() || undefined,
    isAdmin: user.isAdmin,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export interface SessionDevice {
  deviceId?: string;
  deviceName?: string;
  browser?: string;
  os?: string;
  userAgent?: string;
}

export function parseUserAgent(ua: string): { browser: string; os: string; deviceName: string } {
  const browserMap: [RegExp, string][] = [
    [/Edg\//, 'Edge'],
    [/OPR\//, 'Opera'],
    [/Chrome\//, 'Chrome'],
    [/Firefox\//, 'Firefox'],
    [/Safari\//, 'Safari'],
    [/MSIE|Trident/, 'Internet Explorer'],
  ];
  let browser = 'متصفح';
  for (const [re, name] of browserMap) {
    if (re.test(ua)) {
      browser = name;
      break;
    }
  }

  const osMap: [RegExp, string][] = [
    [/Windows/, 'Windows'],
    [/Android/, 'Android'],
    [/iPhone|iPad|iPod/, 'iOS'],
    [/Mac OS X|Macintosh/, 'macOS'],
    [/Linux/, 'Linux'],
  ];
  let os = 'جهاز';
  for (const [re, name] of osMap) {
    if (re.test(ua)) {
      os = name;
      break;
    }
  }

  let deviceName = '';
  if (/iPhone/.test(ua)) deviceName = 'iPhone';
  else if (/iPad/.test(ua)) deviceName = 'iPad';
  else if (/Android/.test(ua)) {
    const m = ua.match(/Android [\d.]+; [^;)]+/);
    if (m) deviceName = m[0].replace(/Android [\d.]+; /, '').trim();
  } else if (/Windows/.test(ua)) deviceName = 'كمبيوتر';
  else if (/Macintosh/.test(ua)) deviceName = 'Mac';
  else if (/Linux/.test(ua)) deviceName = 'Linux';

  return { browser, os, deviceName };
}

export async function createSession(userId: string, device?: SessionDevice): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      deviceId: device?.deviceId || null,
      deviceName: device?.deviceName || null,
      browser: device?.browser || null,
      os: device?.os || null,
      userAgent: device?.userAgent || null,
      lastActiveAt: new Date(),
    },
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session
      .deleteMany({ where: { id: session.id } })
      .catch(() => {});
    return null;
  }

  // Throttled last-activity touch (max once per 5 minutes per session).
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (!session.lastActiveAt || session.lastActiveAt < fiveMinAgo) {
    prisma.session
      .update({ where: { id: session.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});
  }

  return sanitizeUser(session.user);
}

export async function getMaxDevices(): Promise<number> {
  const setting = await prisma.siteSetting.findUnique({ where: { id: 'platform' } });
  const value = setting?.maxDevices;
  return typeof value === 'number' && value > 0 ? value : 3;
}

export async function countActiveDevices(userId: string): Promise<number> {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    select: { deviceId: true },
  });
  const set = new Set<string | null>();
  for (const s of sessions) set.add(s.deviceId ?? null);
  return set.size;
}

export async function deviceHasActiveSession(userId: string, deviceId: string): Promise<boolean> {
  const count = await prisma.session.count({
    where: { userId, deviceId, expiresAt: { gt: new Date() } },
  });
  return count > 0;
}

// Revokes the least-recently-active device (excluding an optional deviceId).
export async function revokeOldestDevice(userId: string, exceptDeviceId?: string) {
  const sessions = await prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastActiveAt: 'asc' },
  });

  const groups = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = s.deviceId ?? '__unknown__';
    if (exceptDeviceId && s.deviceId === exceptDeviceId) continue;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }
  const firstGroup = groups.values().next().value as typeof sessions | undefined;
  if (!firstGroup) return;
  await prisma.session.deleteMany({ where: { id: { in: firstGroup.map((s) => s.id) } } });
}

export function unauthorized(message = 'غير مصرح'):
  NextResponse<{ success: false; error: string }> {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'غير مسموح به'):
  NextResponse<{ success: false; error: string }> {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

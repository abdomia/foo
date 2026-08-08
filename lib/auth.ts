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

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
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

  return sanitizeUser(session.user);
}

export function unauthorized(message = 'غير مصرح'):
  NextResponse<{ success: false; error: string }> {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

export function forbidden(message = 'غير مسموح به'):
  NextResponse<{ success: false; error: string }> {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

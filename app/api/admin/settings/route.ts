import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { z } from 'zod';

const settingsSchema = z.object({
  landingVideoUrl: z.string().trim().min(1).max(500),
  teacherName: z.string().trim().min(1).max(200).optional(),
});

export async function GET() {
  try {
    let settings = await prisma.siteSetting.findUnique({ where: { id: 'platform' } });
    if (!settings) {
      settings = await prisma.siteSetting.create({
        data: { id: 'platform', landingVideoUrl: 'k3sRZvSlBNE' },
      });
    }
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { landingVideoUrl, teacherName } = parsed.data;
    const settings = await prisma.siteSetting.upsert({
      where: { id: 'platform' },
      update: { landingVideoUrl, ...(teacherName !== undefined ? { teacherName } : {}) },
      create: {
        id: 'platform',
        landingVideoUrl,
        ...(teacherName !== undefined ? { teacherName } : {}),
      },
    });
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update settings' });
  }
}

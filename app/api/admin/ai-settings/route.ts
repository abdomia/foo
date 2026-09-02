import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { z } from 'zod';
import { getAiSettings } from '@/lib/ai-assistant/chat';

const schema = z.object({
  aiEnabled: z.boolean().optional(),
  aiDailyLimit: z.number().int().min(1).max(500).optional(),
  aiAllowImages: z.boolean().optional(),
  aiAllowWebSearch: z.boolean().optional(),
  aiAllowYouTube: z.boolean().optional(),
});

// GET /api/admin/ai-settings
export async function GET() {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  try {
    const settings = await getAiSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: 'فشل جلب إعدادات الذكاء الاصطناعي' }, { status: 500 });
  }
}

// POST /api/admin/ai-settings
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const settings = await prisma.siteSetting.upsert({
      where: { id: 'platform' },
      update: {
        ...(data.aiEnabled !== undefined ? { aiEnabled: data.aiEnabled } : {}),
        ...(data.aiDailyLimit !== undefined ? { aiDailyLimit: data.aiDailyLimit } : {}),
        ...(data.aiAllowImages !== undefined ? { aiAllowImages: data.aiAllowImages } : {}),
        ...(data.aiAllowWebSearch !== undefined ? { aiAllowWebSearch: data.aiAllowWebSearch } : {}),
        ...(data.aiAllowYouTube !== undefined ? { aiAllowYouTube: data.aiAllowYouTube } : {}),
      },
      create: {
        id: 'platform',
        ...(data.aiEnabled !== undefined ? { aiEnabled: data.aiEnabled } : {}),
        ...(data.aiDailyLimit !== undefined ? { aiDailyLimit: data.aiDailyLimit } : {}),
        ...(data.aiAllowImages !== undefined ? { aiAllowImages: data.aiAllowImages } : {}),
        ...(data.aiAllowWebSearch !== undefined ? { aiAllowWebSearch: data.aiAllowWebSearch } : {}),
        ...(data.aiAllowYouTube !== undefined ? { aiAllowYouTube: data.aiAllowYouTube } : {}),
      },
    });
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json({ success: false, error: 'فشل حفظ الإعدادات' }, { status: 500 });
  }
}

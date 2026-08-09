import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminAdviceSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');

    const where: Prisma.AdviceWhereInput = { isActive: true };
    if (grade) {
      where.OR = [
        { grade: grade },
        { grade: null },
      ];
    }

    const advice = await prisma.advice.findMany({
      where,
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ success: true, data: advice });
  } catch (error) {
    console.error('Failed to fetch advice:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch advice' }, { status: 500 });
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

  const parsed = adminAdviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { title, content, videoUrl, type = 'text', grade } = parsed.data;

    const lastAdvice = await prisma.advice.findFirst({
      orderBy: { order: 'desc' },
    });

    const newOrder = lastAdvice ? lastAdvice.order + 1 : 0;

    const advice = await prisma.advice.create({
      data: {
        title,
        content: content || '',
        videoUrl: videoUrl || null,
        type,
        grade: grade || null,
        order: newOrder,
      },
    });

    return NextResponse.json({ success: true, data: advice });
  } catch (error) {
    console.error('Failed to create advice:', error);
    return NextResponse.json({ success: false, error: 'Failed to create advice' }, { status: 500 });
  }
}
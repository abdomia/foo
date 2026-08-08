import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminTopicSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');

    const where: any = {};
    if (grade) {
      where.OR = [
        { grade: grade },
        { grade: null },
      ];
    }

    const topics = await prisma.topic.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: grade ? { OR: [{ grade }, { grade: null }] } : {},
          orderBy: { order: 'asc' },
        },
        pdfs: {
          orderBy: { order: 'asc' },
        },
      },
    });
    return NextResponse.json({ success: true, data: topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch topics' }, { status: 500 });
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

  const parsed = adminTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { title, description = '', icon = 'BookOpen', order = 0, grade = null } = parsed.data;

    const topic = await prisma.topic.create({
      data: {
        title,
        description,
        icon,
        grade,
        order,
      },
    });

    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to create topic' }, { status: 500 });
  }
}

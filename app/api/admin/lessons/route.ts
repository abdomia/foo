import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminLessonSchema } from '@/lib/validation';
import { getEffectiveAccessLevel, gateLesson } from '@/lib/content-access';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    if (!topicId) {
      return NextResponse.json({ success: false, error: 'topicId is required' }, { status: 400 });
    }

    const user = await getSessionUser();
    const accessLevel = await getEffectiveAccessLevel(user);

    const lessons = await prisma.lesson.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
    });

    const data = lessons.map((lesson) => gateLesson(lesson, accessLevel));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch lessons' }, { status: 500 });
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

  const parsed = adminLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { title, description = '', videoUrl, duration = '00:00', topicId, order = 0, type = 'explanation', grade = null, accessType = 'FREE' } = parsed.data;

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description,
        videoUrl,
        duration,
        topicId,
        grade,
        order,
        type,
        accessType,
      },
    });

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json({ success: false, error: 'Failed to create lesson' }, { status: 500 });
  }
}

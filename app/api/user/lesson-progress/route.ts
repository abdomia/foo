import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { lessonProgressSchema } from '@/lib/validation';
import { createNotification } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const parsed = lessonProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const { lessonId, progress = 0, watchSeconds, timeSpentSeconds = 0, completed = false } = parsed.data;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    const existingProgress = await prisma.userLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId,
        },
      },
    });

    if (existingProgress) {
      const updated = await prisma.userLessonProgress.update({
        where: { id: existingProgress.id },
        data: {
          progress: Math.max(existingProgress.progress || 0, progress),
          watchSeconds: watchSeconds !== undefined ? watchSeconds : existingProgress.watchSeconds,
          timeSpentSeconds: (existingProgress.timeSpentSeconds || 0) + timeSpentSeconds,
          completed: completed || existingProgress.completed || false,
          completedAt: completed ? new Date() : existingProgress.completedAt,
        },
      });

      if (completed && !existingProgress.completed) {
        await createNotification({
          userId: user.id,
          type: 'achievement',
          title: 'أكملت درساً جديداً',
          body: lesson.title,
          link: `/lesson/${lesson.id}`,
        });
      }

      return NextResponse.json({ success: true, data: updated });
    }

    const newProgress = await prisma.userLessonProgress.create({
      data: {
        userId: user.id,
        lessonId,
        progress,
        watchSeconds: watchSeconds ?? 0,
        timeSpentSeconds,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    if (completed) {
      await createNotification({
        userId: user.id,
        type: 'achievement',
        title: 'أكملت درساً جديداً',
        body: lesson.title,
        link: `/lesson/${lesson.id}`,
      });
    }

    return NextResponse.json({ success: true, data: newProgress });
  } catch (error) {
    console.error('Error tracking progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to track progress' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lessonId');

  if (!lessonId) {
    return NextResponse.json({ success: false, error: 'Lesson ID required' }, { status: 400 });
  }

  try {
    const progress = await prisma.userLessonProgress.findUnique({
      where: {
        userId_lessonId: {
          userId: user.id,
          lessonId,
        },
      },
    });

    return NextResponse.json({ success: true, data: progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch progress' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { lessonProgressSchema } from '@/lib/validation';
import { createNotification } from '@/lib/notifications';
import {
  awardXp,
  checkProgramCompletion,
  checkUnitCompletion,
  touchStreak,
  XP,
} from '@/lib/gamification';
import { syncPlanAfterLessonCompleted } from '@/lib/study-plans/service';

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

    // A lesson can only become completed when progress reaches 100. This is the
    // only transition that grants completion rewards / unit XP.
    const shouldComplete = completed && progress >= 100;
    const clampedProgress = Math.min(100, Math.max(0, progress));

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
          // Progress only ever increases and is clamped to [0, 100].
          progress: Math.max(existingProgress.progress || 0, clampedProgress),
          // Watch position is monotonic to prevent a client rewinding to farm resumes.
          watchSeconds:
            watchSeconds !== undefined
              ? Math.max(existingProgress.watchSeconds || 0, watchSeconds)
              : existingProgress.watchSeconds,
          // Per-request time is already capped by the schema (max 600s).
          timeSpentSeconds: (existingProgress.timeSpentSeconds || 0) + timeSpentSeconds,
          completed: shouldComplete || existingProgress.completed || false,
          completedAt: shouldComplete ? new Date() : existingProgress.completedAt,
        },
      });

      if (shouldComplete && !existingProgress.completed) {
        await createNotification({
          userId: user.id,
          type: 'achievement',
          title: 'أكملت درساً جديداً',
          body: lesson.title,
          link: `/lesson/${lesson.id}`,
        });
        await checkUnitCompletion(user.id, lesson.topicId);
        await checkProgramCompletion(user.id);
        await syncPlanAfterLessonCompleted(user.id, lessonId);
      }

      return NextResponse.json({ success: true, data: updated });
    }

    const newProgress = await prisma.userLessonProgress.create({
      data: {
        userId: user.id,
        lessonId,
        progress: clampedProgress,
        watchSeconds: watchSeconds !== undefined ? Math.max(0, watchSeconds) : 0,
        timeSpentSeconds,
        completed: shouldComplete,
        completedAt: shouldComplete ? new Date() : null,
      },
    });

    // First time watching this lesson: award watch XP and refresh the streak.
    await touchStreak(user.id);
    await awardXp(user.id, XP.LESSON_WATCH, 'lesson_watch');

    if (shouldComplete) {
      await createNotification({
        userId: user.id,
        type: 'achievement',
        title: 'أكملت درساً جديداً',
        body: lesson.title,
        link: `/lesson/${lesson.id}`,
      });
      await checkUnitCompletion(user.id, lesson.topicId);
      await checkProgramCompletion(user.id);
      await syncPlanAfterLessonCompleted(user.id, lessonId);
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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    const lessonProgress = await prisma.userLessonProgress.findMany({
      where: {
        userId: user.id,
        completedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    const quizProgress = await prisma.userQuizProgress.findMany({
      where: {
        userId: user.id,
        completedAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    const videosWatched = lessonProgress.length;
    const questionsSolved = quizProgress.filter(q => !q.passed).length;
    const exercisesCompleted = quizProgress.filter(q => q.passed).length;

    const stats = {
      videosWatched,
      questionsSolved,
      exercisesCompleted,
      thisWeek: {
        videosWatched,
        questionsSolved,
        exercisesCompleted,
      },
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch weekly stats' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { computeStreak, computeXP, computeBadges } from '@/lib/learning';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const [totalLessons, lessonProgress, quizProgress] = await Promise.all([
      prisma.lesson.count(),
      prisma.userLessonProgress.findMany({
        where: { userId: user.id },
        include: {
          lesson: { select: { id: true, title: true } },
        },
      }),
      prisma.userQuizProgress.findMany({
        where: { userId: user.id },
        include: {
          quiz: { select: { id: true, title: true } },
        },
      }),
    ]);

    const completedLessons = lessonProgress.filter((l) => l.completed).length;
    const completionPercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const quizzesTaken = quizProgress.length;
    const quizzesPassed = quizProgress.filter((q) => q.passed).length;
    const averageQuizScore =
      quizzesTaken > 0
        ? Math.round(quizProgress.reduce((acc, q) => acc + q.score, 0) / quizzesTaken)
        : 0;
    const bestQuizScore =
      quizzesTaken > 0 ? Math.max(...quizProgress.map((q) => q.score)) : 0;

    const totalLearningSeconds = lessonProgress.reduce(
      (acc, l) => acc + (l.timeSpentSeconds || 0),
      0
    );
    const learningMinutes = Math.round(totalLearningSeconds / 60);
    const totalHours = Math.round((totalLearningSeconds / 3600) * 10) / 10;

    const activityDates = [
      ...lessonProgress.map((l) => l.completedAt || l.updatedAt),
      ...quizProgress.map((q) => q.completedAt),
    ];
    const streak = computeStreak(activityDates);
    const xp = computeXP(completedLessons, quizzesTaken, quizzesPassed);
    const badges = computeBadges({
      lessonsCompleted: completedLessons,
      quizzesTaken,
      quizzesPassed,
      bestScore: bestQuizScore,
      streak,
      completionPercent,
    });

    const lastWatched = [...lessonProgress].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0];

    const lastLesson = lastWatched
      ? {
          lessonId: lastWatched.lessonId,
          title: lastWatched.lesson.title,
          progress: lastWatched.progress,
          watchSeconds: lastWatched.watchSeconds,
          completed: lastWatched.completed,
          updatedAt: lastWatched.updatedAt.toISOString(),
        }
      : null;

    const recentActivity = [
      ...lessonProgress
        .filter((l) => l.completed)
        .map((l) => ({
          id: `lesson-${l.lessonId}`,
          type: 'lesson' as const,
          title: l.lesson.title,
          date: (l.completedAt || l.updatedAt).toISOString(),
        })),
      ...quizProgress.map((q) => ({
        id: `quiz-${q.quizId}`,
        type: 'quiz' as const,
        title: q.quiz.title,
        date: q.completedAt.toISOString(),
        score: q.score,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    const stats = {
      lessonsCompleted: completedLessons,
      totalLessons,
      completionPercent,
      exercisesCompleted: quizzesPassed,
      quizzesTaken,
      quizzesPassed,
      averageQuizScore,
      bestQuizScore,
      totalHours,
      learningMinutes,
      streak,
      xp,
      badges,
      lastLesson,
      recentActivity,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch progress' }, { status: 500 });
  }
}

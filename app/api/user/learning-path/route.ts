import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { getEffectiveAccessLevel } from '@/lib/content-access';
import { canAccessContent } from '@/lib/subscription';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const accessLevel = await getEffectiveAccessLevel(user);

    const [topics, lessonProgress, quizProgress] = await Promise.all([
      prisma.topic.findMany({
        include: {
          lessons: { orderBy: { order: 'asc' } },
          quizzes: { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { order: 'asc' },
      }),
      prisma.userLessonProgress.findMany({ where: { userId: user.id } }),
      prisma.userQuizProgress.findMany({ where: { userId: user.id } }),
    ]);

    const lpMap = new Map(lessonProgress.map((l) => [l.lessonId, l]));
    const qpMap = new Map(quizProgress.map((q) => [q.quizId, q]));

    let totalLessons = 0;
    let completedLessons = 0;
    let lastLesson: { lessonId: string; title: string; topicId: string } | null = null;
    let lastUpdated = 0;

    const units = topics.map((topic) => {
      const lessons = topic.lessons.map((lesson) => {
        const lp = lpMap.get(lesson.id);
        const locked = !canAccessContent(accessLevel, lesson.accessType || 'FREE');
        const completed = !!lp?.completed;
        totalLessons++;
        if (completed) completedLessons++;

        if (lp && lp.updatedAt.getTime() > lastUpdated) {
          lastUpdated = lp.updatedAt.getTime();
          lastLesson = { lessonId: lesson.id, title: lesson.title, topicId: topic.id };
        }

        return {
          id: lesson.id,
          title: lesson.title,
          duration: lesson.duration,
          type: lesson.type || 'explanation',
          accessType: lesson.accessType || 'FREE',
          locked,
          completed,
          progress: lp?.progress ?? 0,
        };
      });

      const firstIncomplete = lessons.find((l) => !l.completed && !l.locked);
      const completedInUnit = lessons.filter((l) => l.completed).length;
      const unitProgress =
        lessons.length > 0 ? Math.round((completedInUnit / lessons.length) * 100) : 0;

      const quizzes = topic.quizzes.map((quiz) => {
        const qp = qpMap.get(quiz.id);
        const locked = !canAccessContent(accessLevel, quiz.accessType || 'FREE');
        return {
          id: quiz.id,
          title: quiz.title,
          locked,
          passed: !!qp?.passed,
          score: qp ? Math.max(qp.score, qp.bestScore || 0) : 0,
        };
      });

      return {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        icon: topic.icon,
        order: topic.order,
        totalLessons: lessons.length,
        completedLessons: completedInUnit,
        progress: unitProgress,
        lessons,
        quizzes,
        nextLessonId: firstIncomplete?.id ?? null,
      };
    });

    const coursePercent =
      totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const nextLesson =
      (() => {
        for (const unit of units) {
          const l = unit.lessons.find((x) => !x.completed && !x.locked);
          if (l) return { lessonId: l.id, title: l.title, topicTitle: unit.title };
        }
        return null;
      })();

    return NextResponse.json({
      success: true,
      data: {
        units,
        coursePercent,
        totalLessons,
        completedLessons,
        lastLesson,
        nextLesson,
      },
    });
  } catch (error) {
    console.error('Error fetching learning path:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch learning path' },
      { status: 500 }
    );
  }
}

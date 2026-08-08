import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { getEffectiveAccessLevel, gateLesson, gatePdf } from '@/lib/content-access';
import { canAccessContent } from '@/lib/subscription';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const accessLevel = await getEffectiveAccessLevel(user);

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: { topic: true },
    });

    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    const [topicLessons, pdfs, quiz, progress] = await Promise.all([
      prisma.lesson.findMany({
        where: { topicId: lesson.topicId },
        orderBy: { order: 'asc' },
      }),
      prisma.pdf.findMany({
        where: { topicId: lesson.topicId },
        orderBy: { order: 'asc' },
      }),
      prisma.quiz.findFirst({
        where: { topicId: lesson.topicId },
        include: { questions: { orderBy: { order: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.userLessonProgress.findUnique({
        where: {
          userId_lessonId: { userId: user.id, lessonId: id },
        },
      }),
    ]);

    const idx = topicLessons.findIndex((l) => l.id === id);
    const prevLesson = idx > 0 ? topicLessons[idx - 1] : null;
    const nextLesson =
      idx >= 0 && idx < topicLessons.length - 1 ? topicLessons[idx + 1] : null;

    const gated = gateLesson(lesson, accessLevel);
    const quizLocked = quiz ? !canAccessContent(accessLevel, quiz.accessType || 'FREE') : false;

    const data = {
      lesson: {
        id: gated.id,
        title: gated.title,
        description: gated.description,
        videoUrl: gated.videoUrl,
        duration: gated.duration,
        type: gated.type || 'explanation',
        accessType: gated.accessType || 'FREE',
        locked: gated.locked ?? false,
        summary: gated.summary ?? null,
        keyPoints: (gated.keyPoints as string[]) ?? [],
        files: (gated.files as { title: string; url: string; type?: string }[]) ?? [],
      },
      topic: {
        id: lesson.topicId,
        title: lesson.topic.title,
        icon: lesson.topic.icon,
      },
      prevLesson: prevLesson ? { id: prevLesson.id, title: prevLesson.title } : null,
      nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      pdfs: pdfs.map((p) => gatePdf(p, accessLevel)),
      quiz: quiz
        ? {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            locked: quizLocked,
            questionsCount: quiz.questions.length,
            timeLimit: quiz.timeLimit,
            passingScore: quiz.passingScore,
          }
        : null,
      progress: progress
        ? {
            progress: progress.progress,
            watchSeconds: progress.watchSeconds,
            timeSpentSeconds: progress.timeSpentSeconds,
            completed: progress.completed,
          }
        : { progress: 0, watchSeconds: 0, timeSpentSeconds: 0, completed: false },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch lesson' }, { status: 500 });
  }
}

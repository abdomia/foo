import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { quizResultSchema } from '@/lib/validation';
import { canAccessContent, getUserAccessLevel } from '@/lib/subscription';
import { createNotification } from '@/lib/notifications';
import {
  awardBadge,
  awardXp,
  recordAnsweredQuestions,
  touchStreak,
  XP,
} from '@/lib/gamification';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const quizResults = await prisma.userQuizProgress.findMany({
      where: { userId: user.id },
      include: {
        quiz: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: quizResults });
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quiz results' }, { status: 500 });
  }
}

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

  const parsed = quizResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const { quizId, score, passed, answers = [] } = parsed.data;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!quiz) {
      return NextResponse.json({ success: false, error: 'Quiz not found' }, { status: 404 });
    }

    const accessLevel = await getUserAccessLevel(user.id);
    if (!canAccessContent(accessLevel, quiz.accessType)) {
      return NextResponse.json(
        { success: false, error: 'هذا الاختبار يتطلب اشتراكاً' },
        { status: 403 }
      );
    }

    const analysis = quiz.questions.map((q) => {
      const submitted = answers.find((a) => a.id === q.id);
      const correct = String(q.correctAnswer) === (submitted?.selected ?? '');
      return {
        questionId: q.id,
        question: q.question,
        type: q.type,
        difficulty: q.difficulty || 'medium',
        correctAnswer: q.correctAnswer,
        explanation: q.explanation ?? null,
        selected: submitted?.selected ?? null,
        correct,
      };
    });

    const existing = await prisma.userQuizProgress.findUnique({
      where: { userId_quizId: { userId: user.id, quizId } },
    });

    const quizResult = existing
      ? await prisma.userQuizProgress.update({
          where: { id: existing.id },
          data: {
            score,
            passed: existing.passed || passed,
            attempts: existing.attempts + 1,
            bestScore: Math.max(existing.bestScore || 0, score),
            answers: analysis,
            completedAt: new Date(),
          },
        })
      : await prisma.userQuizProgress.create({
          data: {
            userId: user.id,
            quizId,
            score,
            passed,
            attempts: 1,
            bestScore: score,
            answers: analysis,
            completedAt: new Date(),
          },
        });

    // Gamification: streak + XP + counters + badges.
    const correctCount = analysis.filter((a) => a.correct).length;
    await touchStreak(user.id);
    await awardXp(user.id, XP.QUIZ_ATTEMPT, 'quiz_attempt');
    if (correctCount > 0) {
      await awardXp(user.id, XP.CORRECT_ANSWER * correctCount, 'correct_answer');
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { quizzesTaken: { increment: 1 } },
    });
    await recordAnsweredQuestions(user.id, analysis.length);

    if (!existing) {
      await awardBadge(user.id, 'first_quiz');
    }
    if (score === 100) {
      await awardBadge(user.id, 'perfect_score');
    }

    // Notify about the result, plus an achievement on first pass.
    await createNotification({
      userId: user.id,
      type: 'quiz_result',
      title: 'نتيجة اختبارك',
      body: `حصلت على ${score}% في "${quiz.title}"${passed ? ' — مبروك، اجتزت الاختبار!' : ''}`,
      link: '/quizzes',
    });
    if (passed && !existing?.passed) {
      await createNotification({
        userId: user.id,
        type: 'achievement',
        title: 'إنجاز جديد',
        body: `اجتزت اختبار "${quiz.title}" بنجاح`,
        link: '/progress',
      });
    }

    return NextResponse.json({
      success: true,
      data: { ...quizResult, analysis, passed, score },
    });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    return NextResponse.json({ success: false, error: 'Failed to save quiz result' }, { status: 500 });
  }
}

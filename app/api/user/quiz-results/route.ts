import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { quizResultSchema } from '@/lib/validation';
import { canAccessContent, getUserAccessLevel } from '@/lib/subscription';

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
    const { quizId, score, passed } = parsed.data;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
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

    const existing = await prisma.userQuizProgress.findUnique({
      where: { userId_quizId: { userId: user.id, quizId } },
    });

    const quizResult = existing
      ? await prisma.userQuizProgress.update({
          where: { id: existing.id },
          data: { score: Math.max(existing.score, score), passed: existing.passed || passed, completedAt: new Date() },
        })
      : await prisma.userQuizProgress.create({
          data: {
            userId: user.id,
            quizId,
            score,
            passed,
            completedAt: new Date(),
          },
        });

    return NextResponse.json({ success: true, data: quizResult });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    return NextResponse.json({ success: false, error: 'Failed to save quiz result' }, { status: 500 });
  }
}

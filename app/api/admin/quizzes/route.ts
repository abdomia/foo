import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminQuizSchema } from '@/lib/validation';
import { getEffectiveAccessLevel, gateQuiz } from '@/lib/content-access';
import { notifyAllUsers } from '@/lib/notifications';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');

    const user = await getSessionUser();
    const accessLevel = await getEffectiveAccessLevel(user);

    const where: Prisma.QuizWhereInput = {};
    if (grade) {
      where.OR = [
        { grade: grade },
        { grade: null },
      ];
    }

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        topic: {
          select: {
            id: true,
            title: true,
          },
        },
        questions: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = quizzes.map((quiz) => gateQuiz(quiz, accessLevel));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch quizzes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quizzes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = adminQuizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { title, description, topicId, timeLimit, passingScore = 70, questions, grade, accessType = 'FREE' } = parsed.data;

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description,
        grade: grade ?? null,
        topicId,
        timeLimit: timeLimit ?? null,
        passingScore,
        accessType,
        questions: {
          create: questions.map((q, index) => ({
            question: q.question,
            type: q.type || 'multiple-choice',
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty || 'medium',
            explanation: q.explanation ?? null,
            order: index,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    // Notify students in this grade (or everyone if no grade) about the new quiz.
    await notifyAllUsers({
      type: 'new_quiz',
      title: 'اختبار جديد',
      body: title,
      link: '/quizzes',
      grade,
    });

    return NextResponse.json({ success: true, data: quiz });
  } catch (error) {
    console.error('Failed to create quiz:', error);
    return NextResponse.json({ success: false, error: 'Failed to create quiz' }, { status: 500 });
  }
}
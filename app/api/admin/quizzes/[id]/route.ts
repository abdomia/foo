import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminQuizSchema } from '@/lib/validation';

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = adminQuizSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { title, description, timeLimit, passingScore, questions, grade } = parsed.data;

    if (questions) {
      await prisma.question.deleteMany({ where: { quizId: id } });

      await prisma.quiz.update({
        where: { id },
        data: {
          title,
          description,
          grade: grade ?? undefined,
          timeLimit: timeLimit ?? undefined,
          passingScore: passingScore ?? undefined,
          questions: {
            create: questions.map((q, index) => ({
              question: q.question,
              type: q.type || 'multiple-choice',
              options: q.options || [],
              correctAnswer: q.correctAnswer,
              order: index,
            })),
          },
        },
        include: {
          questions: true,
        },
      });
    } else {
      await prisma.quiz.update({
        where: { id },
        data: {
          title,
          description,
          grade: grade ?? undefined,
          timeLimit: timeLimit ?? undefined,
          passingScore: passingScore ?? undefined,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update quiz:', error);
    return NextResponse.json({ success: false, error: 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    await prisma.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quiz:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete quiz' }, { status: 500 });
  }
}
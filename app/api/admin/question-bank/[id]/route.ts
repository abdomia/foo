import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { questionBankSchema } from '@/lib/validation';

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = questionBankSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'السؤال غير موجود' }, { status: 404 });
    }
    if (existing.quizId) {
      return NextResponse.json(
        { success: false, error: 'هذا السؤال مرتبط باختبار ولا يمكن تعديله من بنك الأسئلة' },
        { status: 400 }
      );
    }

    const { question, type, options, correctAnswer, explanation, difficulty, points, tags, topicId, lessonId } =
      parsed.data;

    const updated = await prisma.question.update({
      where: { id },
      data: {
        question: question ?? existing.question,
        type: type ?? existing.type,
        options: options ?? existing.options,
        correctAnswer: correctAnswer ?? existing.correctAnswer,
        explanation: explanation !== undefined ? explanation : existing.explanation,
        difficulty: difficulty ?? existing.difficulty,
        points: points ?? existing.points,
        tags: tags ?? existing.tags,
        topicId: topicId !== undefined ? topicId : existing.topicId,
        lessonId: lessonId !== undefined ? lessonId : existing.lessonId,
      },
      include: {
        topic: { select: { id: true, title: true, grade: true } },
        lesson: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating bank question:', err);
    return NextResponse.json({ success: false, error: 'Failed to update question' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await prisma.question.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'السؤال غير موجود' }, { status: 404 });
    }
    if (existing.quizId) {
      return NextResponse.json(
        { success: false, error: 'هذا السؤال مرتبط باختبار ولا يمكن حذفه من بنك الأسئلة' },
        { status: 400 }
      );
    }

    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting bank question:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete question' }, { status: 500 });
  }
}

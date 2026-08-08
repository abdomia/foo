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

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const difficulty = searchParams.get('difficulty')?.trim();
  const topicId = searchParams.get('topicId')?.trim();
  const lessonId = searchParams.get('lessonId')?.trim();
  const grade = searchParams.get('grade')?.trim();

  try {
    const where: Record<string, unknown> = { quizId: null };

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' as const } },
        { tags: { has: search } },
      ];
    }
    if (difficulty) where.difficulty = difficulty;
    if (topicId) where.topicId = topicId;
    if (lessonId) where.lessonId = lessonId;
    if (grade) where.topic = { grade };

    const questions = await prisma.question.findMany({
      where,
      include: {
        topic: { select: { id: true, title: true, grade: true } },
        lesson: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (err) {
    console.error('Error fetching question bank:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch questions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = questionBankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const {
      question,
      type,
      options,
      correctAnswer,
      explanation,
      difficulty,
      points,
      tags,
      topicId,
      lessonId,
    } = parsed.data;

    const questionRecord = await prisma.question.create({
      data: {
        question,
        type,
        options,
        correctAnswer,
        explanation: explanation ?? null,
        difficulty,
        points,
        tags,
        topicId: topicId ?? null,
        lessonId: lessonId ?? null,
        quizId: null,
      },
      include: {
        topic: { select: { id: true, title: true, grade: true } },
        lesson: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: questionRecord });
  } catch (err) {
    console.error('Error creating bank question:', err);
    return NextResponse.json({ success: false, error: 'Failed to create question' }, { status: 500 });
  }
}

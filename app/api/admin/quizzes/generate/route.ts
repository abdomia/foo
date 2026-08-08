import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { generateQuizSchema } from '@/lib/validation';

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
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

  const parsed = generateQuizSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const {
    title,
    description,
    accessType = 'FREE',
    grade,
    topicId,
    timeLimit,
    passingScore = 70,
    distribution,
  } = parsed.data;

  const total = distribution.easy + distribution.medium + distribution.hard;
  if (total === 0) {
    return NextResponse.json({ success: false, error: 'حدد عدداً من الأسئلة على الأقل' }, { status: 400 });
  }

  try {
    const baseWhere: Record<string, unknown> = { quizId: null, ...(topicId ? { topicId } : {}) };
    const all = await prisma.question.findMany({
      where: baseWhere,
      select: { id: true, difficulty: true },
    });

    const available = {
      easy: all.filter((q) => q.difficulty === 'easy').length,
      medium: all.filter((q) => q.difficulty === 'medium').length,
      hard: all.filter((q) => q.difficulty === 'hard').length,
    };

    const shortfall: string[] = [];
    (['easy', 'medium', 'hard'] as const).forEach((d) => {
      const requested = distribution[d];
      if (requested > available[d]) {
        shortfall.push(`${d === 'easy' ? 'سهل' : d === 'medium' ? 'متوسط' : 'صعب'}: طلب ${requested} ومتوفر ${available[d]}`);
      }
    });

    if (shortfall.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `لا يوجد عدد كافٍ من الأسئلة في بنك الأسئلة — ${shortfall.join('، ')}`,
          available,
        },
        { status: 400 }
      );
    }

    const picked: string[] = [];
    (['easy', 'medium', 'hard'] as const).forEach((d) => {
      const candidates = shuffle(all.filter((q) => q.difficulty === d)).map((q) => q.id);
      picked.push(...candidates.slice(0, distribution[d]));
    });

    const pickedQuestions = await prisma.question.findMany({
      where: { id: { in: picked } },
      include: {
        topic: { select: { id: true } },
        lesson: { select: { id: true } },
      },
    });

    const orderById = new Map(picked.map((id, index) => [id, index]));

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description ?? null,
        accessType,
        grade: grade ?? null,
        topicId,
        timeLimit: timeLimit ?? null,
        passingScore,
        questions: {
          create: pickedQuestions
            .sort((a, b) => (orderById.get(a.id) ?? 0) - (orderById.get(b.id) ?? 0))
            .map((q) => ({
              question: q.question,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty,
              explanation: q.explanation,
              points: q.points,
              tags: q.tags,
              topicId: q.topic?.id ?? null,
              lessonId: q.lesson?.id ?? null,
              order: orderById.get(q.id) ?? 0,
            })),
        },
      },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    return NextResponse.json({
      success: true,
      data: quiz,
      picked: { easy: distribution.easy, medium: distribution.medium, hard: distribution.hard },
    });
  } catch (err) {
    console.error('Error generating quiz:', err);
    return NextResponse.json({ success: false, error: 'Failed to generate quiz' }, { status: 500 });
  }
}

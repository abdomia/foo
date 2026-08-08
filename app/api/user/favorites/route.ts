import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { getEffectiveAccessLevel, gateLesson, gatePdf } from '@/lib/content-access';

const VALID_TYPES = ['lesson', 'pdf', 'question'] as const;
type ItemType = (typeof VALID_TYPES)[number];

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get('itemType') as ItemType | null;
  const itemId = searchParams.get('itemId');

  try {
    // Single status check (used by FavoriteButton)
    if (itemType && itemId) {
      const fav = await prisma.favorite.findUnique({
        where: {
          userId_itemType_itemId: { userId: user.id, itemType, itemId },
        },
      });
      return NextResponse.json({ success: true, data: { favorited: !!fav } });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const accessLevel = await getEffectiveAccessLevel(user);

    const lessonIds = favorites.filter((f) => f.itemType === 'lesson').map((f) => f.itemId);
    const pdfIds = favorites.filter((f) => f.itemType === 'pdf').map((f) => f.itemId);
    const questionIds = favorites.filter((f) => f.itemType === 'question').map((f) => f.itemId);

    const [lessons, pdfs, questions] = await Promise.all([
      lessonIds.length
        ? prisma.lesson.findMany({ where: { id: { in: lessonIds } }, include: { topic: true } })
        : [],
      pdfIds.length ? prisma.pdf.findMany({ where: { id: { in: pdfIds } } }) : [],
      questionIds.length
        ? prisma.question.findMany({
            where: { id: { in: questionIds } },
            include: {
              topic: { select: { id: true, title: true } },
              lesson: { select: { id: true, title: true } },
              quiz: { select: { id: true, title: true } },
            },
          })
        : [],
    ]);

    const lessonMap = new Map(lessons.map((l) => [l.id, l]));
    const pdfMap = new Map(pdfs.map((p) => [p.id, p]));
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    const data = favorites.map((fav) => {
      if (fav.itemType === 'lesson') {
        const lesson = lessonMap.get(fav.itemId);
        if (!lesson) return null;
        const g = gateLesson(lesson, accessLevel);
        return {
          type: 'lesson',
          id: fav.id,
          itemId: fav.itemId,
          title: lesson.title,
          context: lesson.topic?.title ?? null,
          description: lesson.description,
          locked: !!g.locked,
          accessType: lesson.accessType || 'FREE',
          createdAt: fav.createdAt,
          href: `/lesson/${lesson.id}`,
        };
      }
      if (fav.itemType === 'pdf') {
        const pdf = pdfMap.get(fav.itemId);
        if (!pdf) return null;
        const g = gatePdf(pdf, accessLevel);
        return {
          type: 'pdf',
          id: fav.id,
          itemId: fav.itemId,
          title: pdf.title,
          context: null,
          description: pdf.description ?? '',
          locked: !!g.locked,
          accessType: pdf.accessType || 'FREE',
          createdAt: fav.createdAt,
          href: '/pdfs',
        };
      }
      const question = questionMap.get(fav.itemId);
      if (!question) return null;
      const context = [question.topic?.title, question.lesson ? `درس: ${question.lesson.title}` : null, question.quiz ? `اختبار: ${question.quiz.title}` : null]
        .filter(Boolean)
        .join(' — ');
      return {
        type: 'question',
        id: fav.id,
        itemId: fav.itemId,
        title: question.question,
        context: context || null,
        description: question.explanation ?? '',
        difficulty: question.difficulty,
        locked: false,
        accessType: null,
        createdAt: fav.createdAt,
        href: question.quiz ? '/quizzes' : question.lesson ? `/lesson/${question.lesson.id}` : '/lessons',
      };
    });

    return NextResponse.json({ success: true, data: data.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const { itemType, itemId, title, context } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof itemType !== 'string' ||
    !VALID_TYPES.includes(itemType as ItemType) ||
    typeof itemId !== 'string' ||
    !itemId
  ) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    // Verify the item exists before saving it.
    const exists =
      itemType === 'lesson'
        ? await prisma.lesson.findUnique({ where: { id: itemId } })
        : itemType === 'pdf'
          ? await prisma.pdf.findUnique({ where: { id: itemId } })
          : await prisma.question.findUnique({ where: { id: itemId } });
    if (!exists) {
      return NextResponse.json({ success: false, error: 'العنصر غير موجود' }, { status: 404 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_itemType_itemId: { userId: user.id, itemType, itemId } },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: { favorited: true, id: existing.id } });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        itemType,
        itemId,
        title: typeof title === 'string' ? title.slice(0, 300) : '',
        context: typeof context === 'string' ? context.slice(0, 300) : null,
      },
    });

    return NextResponse.json({ success: true, data: { favorited: true, id: favorite.id } });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ success: false, error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const itemType = searchParams.get('itemType') as ItemType | null;
  const itemId = searchParams.get('itemId');

  if (!itemType || !itemId || !VALID_TYPES.includes(itemType)) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    await prisma.favorite.deleteMany({
      where: { userId: user.id, itemType, itemId },
    });
    return NextResponse.json({ success: true, data: { favorited: false } });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove favorite' }, { status: 500 });
  }
}

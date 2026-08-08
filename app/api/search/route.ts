import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getEffectiveAccessLevel, gateLesson, gatePdf, gateQuiz } from '@/lib/content-access';

const LIMIT = 8;

function getTerms(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean);
}

// Score: title matches weigh much more than body matches.
function rankScore(title: string, body: string, terms: string[]): number {
  let score = 0;
  for (const t of terms) {
    const tl = t.toLowerCase();
    if (title.toLowerCase().includes(tl)) score += 5;
    if (body.toLowerCase().includes(tl)) score += 1;
  }
  return score;
}

// Searchable fields that live in JSON columns (keyPoints, files) can't be
// matched in SQL, so we scan them in JS and only include items that pass the
// SQL-level OR filter OR match those extra fields.
function includesTerm(texts: (string | null | undefined)[], terms: string[]): boolean {
  return texts.some((text) =>
    text ? terms.some((t) => text.toLowerCase().includes(t.toLowerCase())) : false
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';
  const typeFilter = searchParams.get('type');

  if (!q) {
    return NextResponse.json({ success: true, data: { query: '', counts: {}, results: {} } });
  }

  const user = await getSessionUser();
  const accessLevel = await getEffectiveAccessLevel(user);
  const terms = getTerms(q);

  // Only show content for the student's grade + general content (grade = null).
  const gradeFilter = user?.grade ? { OR: [{ grade: user.grade }, { grade: null }] } : {};

  const matchField = (field: string) =>
    terms.map((t) => ({ [field]: { contains: t, mode: 'insensitive' as const } }));

  try {
    const results: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    // ---------- Lessons ----------
    if (!typeFilter || typeFilter === 'lesson') {
      const dbLessons = await prisma.lesson.findMany({
        where: {
          ...gradeFilter,
          OR: [...matchField('title'), ...matchField('description'), ...matchField('summary')],
        },
        include: {
          topic: { select: { id: true, title: true, grade: true } },
        },
        orderBy: { order: 'asc' },
        take: LIMIT * 4,
      });

      const keyPoints = (raw: unknown): string[] => {
        if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
        return [];
      };
      const fileTitles = (raw: unknown): string[] => {
        if (Array.isArray(raw))
          return raw
            .map((f) => (typeof f === 'object' && f && 'title' in f ? String((f as { title: string }).title) : ''))
            .filter(Boolean);
        return [];
      };

      const scored = dbLessons
        .map((lesson) => {
          const body = [lesson.description, lesson.summary, ...keyPoints(lesson.keyPoints), ...fileTitles(lesson.files)]
            .join(' ')
            .trim();
          const extraMatch = includesTerm([...keyPoints(lesson.keyPoints), ...fileTitles(lesson.files)], terms);
          return {
            lesson,
            body,
            score: rankScore(lesson.title, body, terms),
            extraMatch,
          };
        })
        .filter((l) => l.score > 0 || l.extraMatch)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);

      const gated = scored.map(({ lesson, body }) => {
        const g = gateLesson(lesson, accessLevel);
        return {
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          summary: lesson.summary,
          snippet: body.slice(0, 180),
          grade: lesson.grade ?? lesson.topic?.grade ?? null,
          topic: lesson.topic ? { id: lesson.topic.id, title: lesson.topic.title } : null,
          locked: !!g.locked,
          accessType: lesson.accessType || 'FREE',
          href: `/lesson/${lesson.id}`,
        };
      });

      results.lessons = gated;
      counts.lessons = gated.length;
    }

    // ---------- Topics ----------
    if (!typeFilter || typeFilter === 'topic') {
      const topics = await prisma.topic.findMany({
        where: { ...gradeFilter, OR: [...matchField('title'), ...matchField('description')] },
        orderBy: { order: 'asc' },
        take: LIMIT,
      });

      const scored = topics
        .map((topic) => ({ topic, score: rankScore(topic.title, topic.description, terms) }))
        .filter((t) => t.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);

      results.topics = scored.map(({ topic }) => ({
        type: 'topic',
        id: topic.id,
        title: topic.title,
        description: topic.description,
        snippet: topic.description.slice(0, 180),
        grade: topic.grade ?? null,
        href: `/lessons`,
      }));
      counts.topics = scored.length;
    }

    // ---------- PDFs ----------
    if (!typeFilter || typeFilter === 'pdf') {
      const pdfs = await prisma.pdf.findMany({
        where: { ...gradeFilter, OR: [...matchField('title'), ...matchField('description')] },
        orderBy: { order: 'asc' },
        take: LIMIT * 2,
      });

      const scored = pdfs
        .map((pdf) => ({ pdf, score: rankScore(pdf.title, pdf.description ?? '', terms) }))
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);

      const gated = scored.map(({ pdf }) => {
        const g = gatePdf(pdf, accessLevel);
        return {
          type: 'pdf',
          id: pdf.id,
          title: pdf.title,
          description: pdf.description ?? '',
          snippet: (pdf.description ?? '').slice(0, 180),
          grade: pdf.grade ?? null,
          locked: !!g.locked,
          accessType: pdf.accessType || 'FREE',
          href: '/pdfs',
        };
      });

      results.pdfs = gated;
      counts.pdfs = gated.length;
    }

    // ---------- Quizzes ----------
    if (!typeFilter || typeFilter === 'quiz') {
      const quizzes = await prisma.quiz.findMany({
        where: { ...gradeFilter, OR: [...matchField('title'), ...matchField('description')] },
        include: {
          topic: { select: { id: true, title: true, grade: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: LIMIT * 2,
      });

      const scored = quizzes
        .map((quiz) => ({ quiz, score: rankScore(quiz.title, quiz.description ?? '', terms) }))
        .filter((qz) => qz.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);

      const gated = scored.map(({ quiz }) => {
        const g = gateQuiz(quiz, accessLevel);
        return {
          type: 'quiz',
          id: quiz.id,
          title: quiz.title,
          description: quiz.description ?? '',
          snippet: (quiz.description ?? '').slice(0, 180),
          grade: quiz.grade ?? quiz.topic?.grade ?? null,
          topic: quiz.topic ? { id: quiz.topic.id, title: quiz.topic.title } : null,
          locked: !!g.locked,
          accessType: quiz.accessType || 'FREE',
          href: '/quizzes',
        };
      });

      results.quizzes = gated;
      counts.quizzes = gated.length;
    }

    // ---------- Questions ----------
    if (!typeFilter || typeFilter === 'question') {
      const questions = await prisma.question.findMany({
        where: { OR: [...matchField('question'), ...matchField('explanation')] },
        include: {
          topic: { select: { id: true, title: true, grade: true } },
          lesson: { select: { id: true, title: true, grade: true, accessType: true } },
          quiz: {
            select: { id: true, title: true, grade: true, accessType: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: LIMIT * 4,
      });

      const scored = questions
        .map((question) => ({
          question,
          score: rankScore(question.question, question.explanation ?? '', terms),
        }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);

      const gated = scored
        .map(({ question, score }) => {
          // Grade filter applied in JS because the context grade lives on
          // the related topic/lesson/quiz.
          const ctxGrade = question.topic?.grade ?? question.lesson?.grade ?? question.quiz?.grade ?? null;
          if (user?.grade && ctxGrade && ctxGrade !== user.grade) return null;

          let locked = false;
          let accessType: string | null = null;
          if (question.quiz) {
            locked = question.quiz.accessType !== 'FREE' && accessLevel === 'FREE';
            accessType = question.quiz.accessType;
          } else if (question.lesson) {
            locked = question.lesson.accessType !== 'FREE' && accessLevel === 'FREE';
            accessType = question.lesson.accessType;
          }

          const context: string[] = [];
          if (question.topic) context.push(question.topic.title);
          if (question.lesson) context.push(`درس: ${question.lesson.title}`);
          if (question.quiz) context.push(`اختبار: ${question.quiz.title}`);

          return {
            type: 'question',
            id: question.id,
            question: question.question,
            options: question.options,
            difficulty: question.difficulty,
            explanation: question.explanation,
            snippet: question.question.slice(0, 180),
            grade: ctxGrade,
            topic: question.topic ? { id: question.topic.id, title: question.topic.title } : null,
            context,
            locked,
            accessType,
            score,
            href: question.quiz ? '/quizzes' : question.lesson ? `/lesson/${question.lesson.id}` : '/lessons',
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      results.questions = gated;
      counts.questions = gated.length;
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    return NextResponse.json({
      success: true,
      data: { query: q, counts, results, total },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search' }, { status: 500 });
  }
}

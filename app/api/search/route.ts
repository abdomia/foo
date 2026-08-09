import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getClassByKey } from '@/lib/classes';
import { getEffectiveAccessLevel, gateLesson, gatePdf, gateQuiz } from '@/lib/content-access';

const LIMIT = 8;
// Fetch a wide batch so JS-side matching (keyPoints/files/JSON fields) and
// scoring still have enough candidates after slicing down to LIMIT.
const BATCH = LIMIT * 10;

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
  // NOTE: this must be combined with the OR match clause via AND, never spread
  // as a sibling `OR` key (that would overwrite the match clause).
  // A stale/invalid grade value (e.g. an old Arabic display name) must never
  // silently hide everything, so fall back to unscoped search when the stored
  // grade is not a recognized class key.
  const grade = user?.grade && getClassByKey(user.grade) ? user.grade : null;
  const gradeClause = grade ? [{ grade }, { grade: null }] : [];

  const matchField = (field: string) =>
    terms.map((t) => ({ [field]: { contains: t, mode: 'insensitive' as const } }));

  // Match against the related topic's title too (topics often carry the real
  // searchable name of a unit/lesson).
  const matchTopicTitle = (field = 'title') =>
    terms.map((t) => ({
      topic: { is: { [field]: { contains: t, mode: 'insensitive' as const } } },
    }));

  try {
    const results: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    // ---------- Lessons ----------
    if (!typeFilter || typeFilter === 'lesson') {
      const where = {
        ...(gradeClause.length ? { AND: [{ OR: gradeClause }] } : {}),
        OR: [
          ...matchField('title'),
          ...matchField('description'),
          ...matchField('summary'),
          ...matchTopicTitle(),
        ],
      };

      const [dbLessons, total] = await Promise.all([
        prisma.lesson.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            summary: true,
            keyPoints: true,
            files: true,
            grade: true,
            accessType: true,
            order: true,
            topicId: true,
            topic: { select: { id: true, title: true, grade: true } },
          },
          orderBy: { order: 'asc' },
          take: BATCH,
        }),
        prisma.lesson.count({ where }),
      ]);

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
          const topicTitle = lesson.topic?.title ?? '';
          const body = [
            lesson.description,
            lesson.summary,
            topicTitle,
            ...keyPoints(lesson.keyPoints),
            ...fileTitles(lesson.files),
          ]
            .join(' ')
            .trim();
          const extraMatch = includesTerm([topicTitle, ...keyPoints(lesson.keyPoints), ...fileTitles(lesson.files)], terms);
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
      counts.lessons = Math.max(total, gated.length);
    }

    // ---------- Topics ----------
    if (!typeFilter || typeFilter === 'topic') {
      const where = {
        ...(gradeClause.length ? { AND: [{ OR: gradeClause }] } : {}),
        OR: [...matchField('title'), ...matchField('description')],
      };

      const [topics, total] = await Promise.all([
        prisma.topic.findMany({
          where,
          orderBy: { order: 'asc' },
          take: BATCH,
        }),
        prisma.topic.count({ where }),
      ]);

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
        href: `/lessons?topic=${topic.id}`,
      }));
      counts.topics = Math.max(total, scored.length);
    }

    // ---------- PDFs ----------
    if (!typeFilter || typeFilter === 'pdf') {
      const where = {
        ...(gradeClause.length ? { AND: [{ OR: gradeClause }] } : {}),
        OR: [...matchField('title'), ...matchField('description'), ...matchTopicTitle()],
      };

      const [pdfs, total] = await Promise.all([
        prisma.pdf.findMany({
          where,
          include: {
            topic: { select: { id: true, title: true, grade: true } },
          },
          orderBy: { order: 'asc' },
          take: BATCH,
        }),
        prisma.pdf.count({ where }),
      ]);

      const scored = pdfs
        .map((pdf) => {
          const topicTitle = pdf.topic?.title ?? '';
          const body = [pdf.description ?? '', topicTitle].join(' ').trim();
          return { pdf, score: rankScore(pdf.title, body, terms) };
        })
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
          href: `/pdfs?highlight=${pdf.id}`,
        };
      });

      results.pdfs = gated;
      counts.pdfs = Math.max(total, gated.length);
    }

    // ---------- Quizzes ----------
    if (!typeFilter || typeFilter === 'quiz') {
      const where = {
        ...(gradeClause.length ? { AND: [{ OR: gradeClause }] } : {}),
        OR: [...matchField('title'), ...matchField('description'), ...matchTopicTitle()],
      };

      const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
          where,
          include: {
            topic: { select: { id: true, title: true, grade: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: BATCH,
        }),
        prisma.quiz.count({ where }),
      ]);

      const scored = quizzes
        .map((quiz) => {
          const topicTitle = quiz.topic?.title ?? '';
          const body = [quiz.description ?? '', topicTitle].join(' ').trim();
          return { quiz, score: rankScore(quiz.title, body, terms) };
        })
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
          href: `/quizzes?quiz=${quiz.id}`,
        };
      });

      results.quizzes = gated;
      counts.quizzes = Math.max(total, gated.length);
    }

    // ---------- Questions ----------
    if (!typeFilter || typeFilter === 'question') {
      // Grade scoping is enforced at the SQL level via the related
      // topic/lesson/quiz. Grade lives on context, not on the question itself.
      const questionGradeClause = grade
        ? [
            { topic: { is: { grade } } },
            { topic: { is: { grade: null } } },
            { lesson: { is: { grade } } },
            { lesson: { is: { grade: null } } },
            { quiz: { is: { grade } } },
            { quiz: { is: { grade: null } } },
            { topicId: null, lessonId: null, quizId: null },
          ]
        : [];

      const where = {
        ...(questionGradeClause.length ? { OR: questionGradeClause } : {}),
        AND: [
          { OR: [...matchField('question'), ...matchField('explanation'), ...matchTopicTitle()] },
        ],
      };

      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          include: {
            topic: { select: { id: true, title: true, grade: true } },
            lesson: { select: { id: true, title: true, grade: true, accessType: true } },
            quiz: {
              select: { id: true, title: true, grade: true, accessType: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: BATCH,
        }),
        prisma.question.count({ where }),
      ]);

      const scored = questions
        .map((question) => {
          const topicTitle = question.topic?.title ?? '';
          const body = [question.explanation ?? '', topicTitle].join(' ').trim();
          return { question, score: rankScore(question.question, body, terms) };
        })
        .filter((x) => x.score > 0)
        // Grade filter applied BEFORE sorting/slicing so a student's own grade
        // is never pushed out of the results by higher-scored foreign rows.
        .filter(({ question }) => {
          if (!grade) return true;
          const ctxGrade = question.topic?.grade ?? question.lesson?.grade ?? question.quiz?.grade ?? null;
          return ctxGrade === null || ctxGrade === grade;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, LIMIT);

      const gated = scored.map(({ question }) => {
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
          grade: question.topic?.grade ?? question.lesson?.grade ?? question.quiz?.grade ?? null,
          topic: question.topic ? { id: question.topic.id, title: question.topic.title } : null,
          context,
          locked,
          accessType,
          href: question.quiz
            ? `/quizzes?quiz=${question.quiz.id}`
            : question.lesson
              ? `/lesson/${question.lesson.id}`
              : question.topic
                ? `/lessons?topic=${question.topic.id}`
                : '/lessons',
        };
      });

      results.questions = gated;
      counts.questions = Math.max(total, gated.length);
    }

    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

    return NextResponse.json(
      {
        success: true,
        data: { query: q, counts, results, total },
      },
      {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search' }, { status: 500 });
  }
}

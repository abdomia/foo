import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

const DAYS = 30;

function dayKey(date: Date): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

interface Bucket {
  day: string;
  count?: number;
  amount?: number;
}

function fillGaps(rows: { day: string; count?: number; amount?: number }[]): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const r of rows) {
    map.set(r.day, { day: r.day, count: r.count ?? 0, amount: r.amount ?? 0 });
  }
  const result: Bucket[] = [];
  const today = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    result.push(map.get(key) ?? { day: key, count: 0, amount: 0 });
  }
  return result;
}

export async function GET() {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ success: false, error: 'غير مسموح به' }, { status: 403 });
  }

  try {
    const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      activeSubscribers,
      revenueAgg,
      pendingPayments,
      totalLessons,
      totalQuizzes,
      totalPdfs,
      activeUsers,
      newUserRows,
      subscriptionRows,
      revenueRows,
      viewedLessons,
      failedQuestions,
      quizPerformance,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { isSubscribed: true } }),
      prisma.payment.aggregate({
        where: { status: 'approved' },
        _sum: { amount: true },
      }),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.lesson.count(),
      prisma.quiz.count(),
      prisma.pdf.count(),
      prisma.user.count({ where: { role: 'student', lastActiveDate: { gte: cutoff } } }),
      prisma.$queryRaw<{ day: string; count: number }[]>
        `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM "User"
         WHERE "createdAt" >= ${cutoff} AND "role" = 'student'
         GROUP BY 1
         ORDER BY 1`,
      prisma.$queryRaw<{ day: string; count: number }[]>
        `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
         FROM "Subscription"
         WHERE "createdAt" >= ${cutoff}
         GROUP BY 1
         ORDER BY 1`,
      prisma.$queryRaw<{ day: string; amount: number }[]>
        `SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day, COALESCE(SUM("amount"), 0)::int AS amount
         FROM "Payment"
         WHERE "status" = 'approved' AND "createdAt" >= ${cutoff}
         GROUP BY 1
         ORDER BY 1`,
      prisma.$queryRaw<{ id: string; title: string; views: number; watch_seconds: number }[]>
        `SELECT l."id", l."title", COUNT(*)::int AS views, COALESCE(SUM(ulp."watchSeconds"), 0)::int AS watch_seconds
         FROM "UserLessonProgress" ulp
         JOIN "Lesson" l ON l."id" = ulp."lessonId"
         WHERE ulp."updatedAt" >= ${cutoff}
         GROUP BY l."id", l."title"
         ORDER BY views DESC
         LIMIT 10`,
      prisma.$queryRaw<{ question_id: string; question: string; total: number; fails: number }[]>
        `SELECT
           (a.value->>'questionId') AS question_id,
           (a.value->>'question') AS question,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE NOT (a.value->>'correct')::boolean)::int AS fails
         FROM "UserQuizProgress" qp
         JOIN LATERAL jsonb_array_elements(qp."answers") AS a(value) ON true
         WHERE qp."answers" IS NOT NULL AND qp."completedAt" >= ${cutoff}
         GROUP BY question_id, question
         ORDER BY fails DESC
         LIMIT 10`,
      prisma.$queryRaw<{ id: string; title: string; attempts: number; avg_score: number; pass_rate: number }[]>
        `SELECT
           q."id", q."title",
           COUNT(*)::int AS attempts,
           ROUND(AVG(qp."score"))::int AS avg_score,
           ROUND(100.0 * COUNT(*) FILTER (WHERE qp."passed") / NULLIF(COUNT(*), 0))::int AS pass_rate
         FROM "UserQuizProgress" qp
         JOIN "Quiz" q ON q."id" = qp."quizId"
         WHERE qp."completedAt" >= ${cutoff}
         GROUP BY q."id", q."title"
         ORDER BY attempts DESC
         LIMIT 10`,
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          cards: {
            totalStudents,
            activeSubscribers,
            revenue: revenueAgg._sum.amount ?? 0,
            pendingPayments,
            totalLessons,
            totalQuizzes,
            totalPdfs,
            activeUsers,
          },
          charts: {
            newUsers: fillGaps(newUserRows.map((r) => ({ day: r.day, count: r.count }))),
            subscriptions: fillGaps(subscriptionRows.map((r) => ({ day: r.day, count: r.count }))),
            revenueTrend: fillGaps(revenueRows.map((r) => ({ day: r.day, amount: r.amount }))),
            mostViewedLessons: viewedLessons.map((l) => ({
              id: l.id,
              title: l.title,
              views: l.views,
              watchSeconds: l.watch_seconds,
            })),
            mostFailedQuestions: failedQuestions.map((q) => ({
              id: q.question_id,
              question: q.question,
              total: q.total,
              fails: q.fails,
              failRate: q.total > 0 ? Math.round((q.fails / q.total) * 100) : 0,
            })),
            quizPerformance: quizPerformance.map((q) => ({
              id: q.id,
              title: q.title,
              attempts: q.attempts,
              avgScore: q.avg_score,
              passRate: q.pass_rate,
            })),
          },
        },
      },
      {
        headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
      }
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'تعذر تحميل الإحصائيات' },
      { status: 500 }
    );
  }
}

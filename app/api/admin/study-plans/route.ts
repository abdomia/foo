import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { getClassByKey } from '@/lib/classes';

export async function GET() {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) {
    return NextResponse.json({ success: false, error: 'غير مسموح به' }, { status: 403 });
  }

  try {
    const [totalPlans, activePlans, completedPlans, archivedPlans, plans, resetsAgg, overworked] =
      await Promise.all([
        prisma.studyPlan.count(),
        prisma.studyPlan.count({ where: { status: 'active' } }),
        prisma.studyPlan.count({ where: { status: 'completed' } }),
        prisma.studyPlan.count({ where: { status: 'archived' } }),
        prisma.studyPlan.findMany({
          include: {
            items: { select: { completed: true, durationMinutes: true } },
          },
        }),
        prisma.studyPlan.aggregate({ _sum: { resetCount: true } }),
        prisma.$queryRaw<{ lesson_id: string; title: string; plans: number }[]>
          `SELECT i."lessonId" AS lesson_id, MAX(l."title") AS title, COUNT(DISTINCT i."planId")::int AS plans
           FROM "StudyPlanItem" i
           JOIN "Lesson" l ON l."id" = i."lessonId"
           WHERE NOT i."completed"
           GROUP BY i."lessonId"
           ORDER BY plans DESC
           LIMIT 10`,
      ]);

    const distinctUsers = new Set(plans.map((p) => p.userId)).size;
    const completedItems = plans.reduce((s, p) => s + p.items.filter((i) => i.completed).length, 0);
    const totalItems = plans.reduce((s, p) => s + p.items.length, 0);
    const avgProgress = plans.length
      ? Math.round(plans.reduce((s, p) => s + p.progressPercent, 0) / plans.length)
      : 0;
    const avgPlanDays = plans.length
      ? Math.round(
          plans.reduce(
            (s, p) => s + Math.round((p.endDate.getTime() - p.startDate.getTime()) / 86400000),
            0
          ) / plans.length
        )
      : 0;

    const byGrade = new Map<string, number>();
    for (const p of plans) byGrade.set(p.grade, (byGrade.get(p.grade) ?? 0) + 1);

    return NextResponse.json({
      success: true,
      data: {
        cards: {
          totalPlans,
          activePlans,
          completedPlans,
          archivedPlans,
          studentsUsing: distinctUsers,
          completionRate: totalItems ? Math.round((completedItems / totalItems) * 100) : 0,
          avgProgress,
          avgPlanDays,
          totalResets: resetsAgg._sum.resetCount ?? 0,
        },
        byGrade: [...byGrade.entries()].map(([grade, count]) => ({
          grade,
          gradeLabel: getClassByKey(grade)?.name ?? grade,
          count,
        })),
        mostStoppedLessons: overworked.map((l) => ({
          id: l.lesson_id,
          title: l.title,
          plans: l.plans,
        })),
      },
    });
  } catch (error) {
    console.error('[admin:study-plans] error:', error);
    return NextResponse.json({ success: false, error: 'تعذر تحميل إحصائيات الخطط' }, { status: 500 });
  }
}

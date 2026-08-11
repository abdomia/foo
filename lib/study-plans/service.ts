// 🤖 خطتي الذكية — Orchestrator
// The single entry point for plan lifecycle: create, read, update, reset,
// regenerate. Combines Content Engine + Planning Engine + (optional) AI +
// Validation, then persists through Prisma in one transaction.

import { prisma } from '@/lib/db';
import { getClassByKey } from '@/lib/classes';
import { createNotification } from '@/lib/notifications';
import { fetchGradeContent, buildVideoMetadata, filterContentForScope } from './content';
import { filterByContentType, buildPlan, computeFeasibility, redistributeRemaining, parseDateKey, toStartOfDay, addDays, dateKey, dailyCap } from './planning';
import { personalizeOrder, applyPrescribedOrder } from './ai';
import { validateGeneratedPlan, flattenPlanItems } from './validate';
import { WEEKDAY_LABELS, type ContentType, type PlanConfig, type PlanItemInput, type StudyIntensity } from './types';

export class StudyPlanError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const PLAN_ERRORS = {
  no_content: 'لا يوجد محتوى مطابق لاختياراتك في هذا الصف',
  insufficient_time: 'الوقت المتاح لا يكفي لإنجاز هذا المحتوى',
  not_found: 'الخطة غير موجودة',
  forbidden: 'غير مصرح لك بهذه الخطة',
  bad_request: 'بيانات غير صالحة',
} as const;

export function planConfigToConfig(input: {
  grade: string;
  startDate: string;
  endDate: string;
  dailyMinutes: number;
  selectedDays: number[];
  contentScope: PlanConfig['contentScope'];
  contentType: ContentType;
  unitIds: string[];
  lessonIds: string[];
  difficultyLevel: PlanConfig['difficultyLevel'];
  priorKnowledge: PlanConfig['priorKnowledge'];
  studyIntensity: StudyIntensity;
}): PlanConfig {
  return {
    grade: input.grade,
    startDate: input.startDate,
    endDate: input.endDate,
    dailyMinutes: input.dailyMinutes,
    selectedDays: input.selectedDays,
    contentScope: input.contentScope,
    contentType: input.contentType,
    unitIds: input.unitIds,
    lessonIds: input.lessonIds,
    difficultyLevel: input.difficultyLevel,
    priorKnowledge: input.priorKnowledge,
    studyIntensity: input.studyIntensity,
  };
}

function defaultTitle(grade: string): string {
  const cls = getClassByKey(grade);
  return cls ? `خطتي الذكية — ${cls.name}` : 'خطتي الذكية';
}

export interface CreatePlanInput extends Omit<Parameters<typeof planConfigToConfig>[0], 'title'> {
  title?: string;
}

// ---------- Core generation pipeline (pure + DB reads, no writes) ----------

async function generateFromConfig(config: PlanConfig, excludeLessonIds: string[] = []): Promise<{
  plan: ReturnType<typeof buildPlan>;
  config: PlanConfig;
  aiUsed: boolean;
}> {
  const content = await fetchGradeContent(config.grade);
  const metadata = buildVideoMetadata(content.lessons);
  const scoped = filterContentForScope(metadata, config.contentScope, config.unitIds, config.lessonIds);
  const contentTyped = filterByContentType(scoped, config.contentType);

  const excluded = new Set(excludeLessonIds);
  const withoutExcluded = contentTyped.filter((m) => !excluded.has(m.id));

  if (withoutExcluded.length === 0) {
    throw new StudyPlanError('no_content', PLAN_ERRORS.no_content);
  }

  const feasibility = computeFeasibility(withoutExcluded, config);
  if (!feasibility.enough) {
    throw new StudyPlanError('insufficient_time', PLAN_ERRORS.insufficient_time, {
      totalMinutes: feasibility.totalMinutes,
      availableMinutes: feasibility.availableMinutes,
      requiredDays: feasibility.requiredDays,
      studyDays: feasibility.studyDays.length,
      dailyCap: dailyCap(config.dailyMinutes, config.studyIntensity),
    });
  }

  // Optional AI ordering (falls back internally).
  const ai = await personalizeOrder(withoutExcluded, config);
  const aiUsed = !ai.usedFallback && ai.orderedLessonIds.length === withoutExcluded.length;
  const prescribed = aiUsed ? applyPrescribedOrder(withoutExcluded, ai.orderedLessonIds) : undefined;

  const plan = buildPlan(withoutExcluded, config, prescribed);
  plan.aiUsed = aiUsed;

  if (plan.insufficient) {
    throw new StudyPlanError('insufficient_time', PLAN_ERRORS.insufficient_time, {
      message: 'بعض الفيديوهات لا تتناسب مع المدة اليومية المتاحة',
    });
  }

  const validated = validateGeneratedPlan(plan, config);
  if (validated.days.length === 0) {
    throw new StudyPlanError('no_content', PLAN_ERRORS.no_content);
  }

  return { plan, config, aiUsed };
}

// ---------- Create ----------

export async function createStudyPlan(userId: string, input: CreatePlanInput) {
  const config = planConfigToConfig(input);
  const { plan, aiUsed } = await generateFromConfig(config);

  const created = await prisma.$transaction(async (tx) => {
    // Creating a new plan archives any existing active plan (History keeps it).
    await tx.studyPlan.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'archived', updatedAt: new Date() },
    });

    const record = await tx.studyPlan.create({
      data: {
        userId,
        title: input.title || defaultTitle(input.grade),
        grade: config.grade,
        startDate: parseDateKey(config.startDate),
        endDate: parseDateKey(config.endDate),
        dailyMinutes: config.dailyMinutes,
        selectedDays: config.selectedDays,
        contentScope: config.contentScope,
        contentType: config.contentType,
        selectedUnitIds: config.unitIds,
        selectedLessonIds: config.lessonIds,
        difficultyLevel: config.difficultyLevel,
        priorKnowledge: config.priorKnowledge,
        studyIntensity: config.studyIntensity,
        status: 'active',
        progressPercent: 0,
        totalVideos: plan.totalVideos,
        explanationVideos: plan.explanationVideos,
        practiceVideos: plan.practiceVideos,
        reviewVideos: plan.reviewVideos,
        examVideos: plan.examVideos,
        totalContentMinutes: plan.totalMinutes,
        aiUsed,
        resetCount: 0,
      },
    });

    const rows = flattenPlanItems(plan.days);
    if (rows.length > 0) {
      await tx.studyPlanItem.createMany({
        data: rows.map((r) => ({
          planId: record.id,
          lessonId: r.item.lessonId,
          scheduledDate: parseDateKey(r.date),
          orderIndex: r.item.orderIndex,
          videoType: r.item.videoType,
          durationMinutes: r.item.durationMinutes,
          completed: false,
          createdAt: new Date(),
        })),
      });
    }

    return record;
  });

  await createNotification({
    userId,
    type: 'study_plan',
    title: 'تم إنشاء خطتك الذكية 🎉',
    body: `${getClassByKey(config.grade)?.name ?? config.grade} — ${plan.totalVideos} فيديو، ${plan.totalMinutes} دقيقة مذاكرة${aiUsed ? ' بترتيب ذكي 🤖' : ''}`,
    link: `/study-plans/${created.id}`,
  });

  return getStudyPlanForUser(created.id, userId);
}

// ---------- Read ----------

function serializeLesson(lesson: { id: string; title: string; videoUrl: string; accessType: string; type: string }) {
  return {
    lessonId: lesson.id,
    title: lesson.title,
    url: lesson.videoUrl,
    accessType: lesson.accessType,
    type: lesson.type,
  };
}

export async function listStudyPlansForUser(userId: string) {
  const plans = await prisma.studyPlan.findMany({
    where: { userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      items: {
        select: { id: true, completed: true, scheduledDate: true },
      },
    },
  });

  return plans.map((p) => {
    const completedCount = p.items.filter((i) => i.completed).length;
    return {
      id: p.id,
      title: p.title,
      grade: p.grade,
      gradeLabel: getClassByKey(p.grade)?.name ?? p.grade,
      status: p.status,
      startDate: dateKey(p.startDate),
      endDate: dateKey(p.endDate),
      dailyMinutes: p.dailyMinutes,
      selectedDays: p.selectedDays,
      progressPercent: p.progressPercent,
      completedCount,
      totalVideos: p.totalVideos,
      totalContentMinutes: p.totalContentMinutes,
      aiUsed: p.aiUsed,
      resetCount: p.resetCount,
      createdAt: p.createdAt.toISOString(),
      completedAt: p.completedAt?.toISOString() ?? null,
    };
  });
}

export async function getStudyPlanForUser(planId: string, userId: string) {
  const plan = await prisma.studyPlan.findFirst({
    where: { id: planId, userId },
    include: {
      items: {
        include: {
          lesson: {
            select: { id: true, title: true, videoUrl: true, accessType: true, type: true },
          },
        },
        orderBy: { scheduledDate: 'asc' },
      },
    },
  });
  if (!plan) return null;

  // Sync completed state from the authoritative UserLessonProgress.
  const progressRows = await prisma.userLessonProgress.findMany({
    where: { userId, lessonId: { in: plan.items.map((i) => i.lessonId) } },
    select: { lessonId: true, completed: true, progress: true },
  });
  const progressMap = new Map(progressRows.map((p) => [p.lessonId, p]));

  const completedLessonIds = new Set<string>();
  const items = plan.items.map((item) => {
    const prog = progressMap.get(item.lessonId);
    const completed = prog?.completed ?? false;
    if (completed) completedLessonIds.add(item.lessonId);
    return {
      id: item.id,
      lesson: serializeLesson(item.lesson),
      scheduledDate: dateKey(item.scheduledDate),
      orderIndex: item.orderIndex,
      videoType: item.videoType,
      durationMinutes: item.durationMinutes,
      completed,
      completedAt: item.completedAt?.toISOString() ?? null,
    };
  });

  const completedCount = completedLessonIds.size;
  const totalVideos = plan.totalVideos || items.length;
  const progressPercent = totalVideos > 0 ? Math.round((completedCount / totalVideos) * 100) : 0;

  // Lag detection.
  const today = toStartOfDay(new Date());
  const expectedItems = items.filter((i) => toStartOfDay(new Date(i.scheduledDate)) <= today);
  const doneExpected = expectedItems.filter((i) => i.completed).length;
  const lag = Math.max(0, expectedItems.length - doneExpected);
  let daysBehind = 0;
  if (lag > 0) {
    const earliestIncomplete = expectedItems.find((i) => !i.completed);
    if (earliestIncomplete) {
      daysBehind = Math.round(
        (today.getTime() - toStartOfDay(new Date(earliestIncomplete.scheduledDate)).getTime()) / 86400000
      );
    }
  }

  // Group items into day blocks for display.
  const dayMap = new Map<string, typeof items>();
  for (const item of items) {
    const arr = dayMap.get(item.scheduledDate) ?? [];
    arr.push(item);
    dayMap.set(item.scheduledDate, arr);
  }
  const days = [...dayMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, dayItems]) => {
      const d = toStartOfDay(new Date(date));
      const totalMinutes = dayItems.reduce((s, i) => s + i.durationMinutes, 0);
      const dayCompleted = dayItems.filter((i) => i.completed).length;
      return {
        date,
        weekday: d.getDay(),
        weekdayLabel: WEEKDAY_LABELS[d.getDay()],
        isToday: dateKey(d) === dateKey(today),
        isPast: d < today,
        totalMinutes,
        completedCount: dayCompleted,
        totalCount: dayItems.length,
        items: [...dayItems].sort((a, b) => a.orderIndex - b.orderIndex),
      };
    });

  const watchedMinutes = plan.totalContentMinutes > 0
    ? Math.min(plan.totalContentMinutes, Math.round((completedCount / Math.max(1, totalVideos)) * plan.totalContentMinutes))
    : 0;
  const remainingMinutes = Math.max(0, plan.totalContentMinutes - watchedMinutes);

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      grade: plan.grade,
      gradeLabel: getClassByKey(plan.grade)?.name ?? plan.grade,
      status: plan.status,
      startDate: dateKey(plan.startDate),
      endDate: dateKey(plan.endDate),
      dailyMinutes: plan.dailyMinutes,
      selectedDays: plan.selectedDays,
      contentScope: plan.contentScope,
      contentType: plan.contentType,
      difficultyLevel: plan.difficultyLevel,
      priorKnowledge: plan.priorKnowledge,
      studyIntensity: plan.studyIntensity,
      progressPercent,
      totalVideos,
      explanationVideos: plan.explanationVideos,
      practiceVideos: plan.practiceVideos,
      reviewVideos: plan.reviewVideos,
      examVideos: plan.examVideos,
      totalContentMinutes: plan.totalContentMinutes,
      aiUsed: plan.aiUsed,
      resetCount: plan.resetCount,
      createdAt: plan.createdAt.toISOString(),
      completedAt: plan.completedAt?.toISOString() ?? null,
    },
    stats: {
      completedCount,
      remainingCount: Math.max(0, totalVideos - completedCount),
      watchedMinutes,
      remainingMinutes,
      lag,
      daysBehind,
      expectedCompleted: expectedItems.length,
    },
    days,
  };
}

// ---------- Update settings (recalculate) ----------

export async function updateStudyPlanSettings(
  planId: string,
  userId: string,
  changes: {
    title?: string;
    endDate?: string;
    dailyMinutes?: number;
    selectedDays?: number[];
    contentType?: ContentType;
    studyIntensity?: StudyIntensity;
  }
) {
  const plan = await prisma.studyPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new StudyPlanError('not_found', PLAN_ERRORS.not_found);

  const newEnd = changes.endDate ? parseDateKey(changes.endDate) : toStartOfDay(plan.endDate);
  const today = toStartOfDay(new Date());
  if (newEnd < today) {
    throw new StudyPlanError('bad_request', 'تاريخ النهاية يجب أن يكون اليوم أو بعده');
  }
  const dailyMinutes = changes.dailyMinutes ?? plan.dailyMinutes;
  const selectedDays = changes.selectedDays ?? plan.selectedDays;
  const intensity = changes.studyIntensity ?? (plan.studyIntensity as StudyIntensity);
  const contentType = changes.contentType ?? (plan.contentType as ContentType);

  const items = await prisma.studyPlanItem.findMany({
    where: { planId },
    include: { lesson: { select: { id: true, type: true, duration: true } } },
    orderBy: { orderIndex: 'asc' },
  });

  const completedIds = new Set(items.filter((i) => i.completed).map((i) => i.id));
  const pending = items
    .filter((i) => !completedIds.has(i.id))
    .map((i): PlanItemInput => ({
      lessonId: i.lessonId,
      videoType: (i.videoType as PlanItemInput['videoType']) || 'explanation',
      durationMinutes: i.durationMinutes,
      orderIndex: i.orderIndex,
    }));

  const startDate = plan.startDate > today ? toStartOfDay(plan.startDate) : today;
  const { days: redistributedDays, overflow } = redistributeRemaining({
    items: pending,
    startDate,
    endDate: newEnd,
    selectedDays,
    dailyMinutes,
    intensity,
  });

  if (overflow.length > 0) {
    throw new StudyPlanError('insufficient_time', PLAN_ERRORS.insufficient_time, {
      message: 'الوقت الجديد لا يكفي لإنهاء المتبقي من الخطة',
      overflowCount: overflow.length,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Re-write only the pending items with new dates.
    await tx.studyPlanItem.deleteMany({ where: { planId, completed: false } });
    const rows = flattenPlanItems(redistributedDays);
    if (rows.length > 0) {
      await tx.studyPlanItem.createMany({
        data: rows.map((r) => ({
          planId,
          lessonId: r.item.lessonId,
          scheduledDate: parseDateKey(r.date),
          orderIndex: r.item.orderIndex,
          videoType: r.item.videoType,
          durationMinutes: r.item.durationMinutes,
          completed: false,
          createdAt: new Date(),
        })),
      });
    }
    return tx.studyPlan.update({
      where: { id: planId },
      data: {
        ...(changes.title !== undefined ? { title: changes.title || null } : {}),
        endDate: newEnd,
        dailyMinutes,
        selectedDays,
        studyIntensity: intensity,
        contentType,
        updatedAt: new Date(),
      },
    });
  });

  return { plan: updated, redistributedCount: pending.length };
}

// ---------- Reset for lag ----------

export async function resetStudyPlanForLag(planId: string, userId: string) {
  const plan = await prisma.studyPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new StudyPlanError('not_found', PLAN_ERRORS.not_found);
  if (plan.status !== 'active') throw new StudyPlanError('bad_request', 'لا يمكن إعادة ضبط خطة منتهية');

  const items = await prisma.studyPlanItem.findMany({
    where: { planId },
    orderBy: { orderIndex: 'asc' },
  });

  const completedIds = new Set(items.filter((i) => i.completed).map((i) => i.id));
  const pending = items
    .filter((i) => !completedIds.has(i.id))
    .map((i): PlanItemInput => ({
      lessonId: i.lessonId,
      videoType: (i.videoType as PlanItemInput['videoType']) || 'explanation',
      durationMinutes: i.durationMinutes,
      orderIndex: i.orderIndex,
    }));

  const today = toStartOfDay(new Date());
  const startDate = addDays(today, 1); // re-distribute from tomorrow
  const endDate = toStartOfDay(plan.endDate);

  const { days: redistributedDays, overflow } = redistributeRemaining({
    items: pending,
    startDate,
    endDate,
    selectedDays: plan.selectedDays,
    dailyMinutes: plan.dailyMinutes,
    intensity: plan.studyIntensity as StudyIntensity,
  });

  if (overflow.length > 0) {
    throw new StudyPlanError('insufficient_time', PLAN_ERRORS.insufficient_time, {
      message: 'لا يوجد وقت كافٍ متبقٍ لإعادة توزيع الخطة',
      overflowCount: overflow.length,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.studyPlanItem.deleteMany({ where: { planId, completed: false } });
    const rows = flattenPlanItems(redistributedDays);
    if (rows.length > 0) {
      await tx.studyPlanItem.createMany({
        data: rows.map((r) => ({
          planId,
          lessonId: r.item.lessonId,
          scheduledDate: parseDateKey(r.date),
          orderIndex: r.item.orderIndex,
          videoType: r.item.videoType,
          durationMinutes: r.item.durationMinutes,
          completed: false,
          createdAt: new Date(),
        })),
      });
    }
    return tx.studyPlan.update({
      where: { id: planId },
      data: {
        resetCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  });

  return { plan: updated, redistributedCount: pending.length };
}

// ---------- Regenerate (keep old in history) ----------

export async function regenerateStudyPlan(planId: string, userId: string) {
  const plan = await prisma.studyPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new StudyPlanError('not_found', PLAN_ERRORS.not_found);

  const config = planConfigToConfig({
    grade: plan.grade,
    startDate: dateKey(plan.startDate),
    endDate: dateKey(plan.endDate),
    dailyMinutes: plan.dailyMinutes,
    selectedDays: plan.selectedDays,
    contentScope: plan.contentScope as PlanConfig['contentScope'],
    contentType: plan.contentType as ContentType,
    unitIds: plan.selectedUnitIds,
    lessonIds: plan.selectedLessonIds,
    difficultyLevel: plan.difficultyLevel as PlanConfig['difficultyLevel'],
    priorKnowledge: plan.priorKnowledge as PlanConfig['priorKnowledge'],
    studyIntensity: plan.studyIntensity as StudyIntensity,
  });

  // Don't re-schedule lessons the student already finished.
  const done = await prisma.userLessonProgress.findMany({
    where: { userId, completed: true },
    select: { lessonId: true },
  });
  const excludeLessonIds = done.map((d) => d.lessonId);

  const { plan: generated, aiUsed } = await generateFromConfig(config, excludeLessonIds);

  const created = await prisma.$transaction(async (tx) => {
    await tx.studyPlan.updateMany({
      where: { userId, status: 'active' },
      data: { status: 'archived', updatedAt: new Date() },
    });

    const record = await tx.studyPlan.create({
      data: {
        userId,
        title: plan.title || defaultTitle(config.grade),
        grade: config.grade,
        startDate: parseDateKey(config.startDate),
        endDate: parseDateKey(config.endDate),
        dailyMinutes: config.dailyMinutes,
        selectedDays: config.selectedDays,
        contentScope: config.contentScope,
        contentType: config.contentType,
        selectedUnitIds: config.unitIds,
        selectedLessonIds: config.lessonIds,
        difficultyLevel: config.difficultyLevel,
        priorKnowledge: config.priorKnowledge,
        studyIntensity: config.studyIntensity,
        status: 'active',
        progressPercent: 0,
        totalVideos: generated.totalVideos,
        explanationVideos: generated.explanationVideos,
        practiceVideos: generated.practiceVideos,
        reviewVideos: generated.reviewVideos,
        examVideos: generated.examVideos,
        totalContentMinutes: generated.totalMinutes,
        aiUsed,
        resetCount: 0,
      },
    });

    const rows = flattenPlanItems(generated.days);
    if (rows.length > 0) {
      await tx.studyPlanItem.createMany({
        data: rows.map((r) => ({
          planId: record.id,
          lessonId: r.item.lessonId,
          scheduledDate: parseDateKey(r.date),
          orderIndex: r.item.orderIndex,
          videoType: r.item.videoType,
          durationMinutes: r.item.durationMinutes,
          completed: false,
          createdAt: new Date(),
        })),
      });
    }
    return record;
  });

  await createNotification({
    userId,
    type: 'study_plan',
    title: 'أعدنا بناء خطتك الذكية 🤖',
    body: `${generated.totalVideos} فيديو متبقي (تم استبعاد ما أنهيته)` + (aiUsed ? ' — بترتيب ذكي جديد' : ''),
    link: `/study-plans/${created.id}`,
  });

  return getStudyPlanForUser(created.id, userId);
}

// ---------- Sync plan after a lesson is completed (auto) ----------

export async function syncPlanAfterLessonCompleted(userId: string, lessonId: string) {
  const plans = await prisma.studyPlan.findMany({
    where: { userId, status: 'active' },
    include: { items: { where: { lessonId } } },
  });
  if (plans.length === 0) return;

  await prisma.studyPlanItem.updateMany({
    where: { planId: { in: plans.map((p) => p.id) }, lessonId, completed: false },
    data: { completed: true, completedAt: new Date() },
  });

  for (const plan of plans) {
    const itemCounts = await prisma.studyPlanItem.groupBy({
      by: ['completed'],
      where: { planId: plan.id },
      _count: true,
    });
    const completedCount =
      itemCounts.find((c) => c.completed)?._count ?? 0;
    const total = itemCounts.reduce((s, c) => s + c._count, 0);
    const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    if (completedCount >= total && plan.status === 'active') {
      await prisma.studyPlan.update({
        where: { id: plan.id },
        data: { status: 'completed', progressPercent: 100, completedAt: new Date(), updatedAt: new Date() },
      });
      await createNotification({
        userId,
        type: 'study_plan',
        title: 'مبروك! 🎉 أكملت خطتك الذكية',
        body: plan.title ?? 'خطتك الذكية',
        link: `/study-plans/${plan.id}`,
      });
    } else {
      await prisma.studyPlan.update({
        where: { id: plan.id },
        data: { progressPercent, updatedAt: new Date() },
      });
    }
  }
}

// ---------- Mark item complete (manual checkbox) ----------

export async function markStudyPlanItem(planId: string, userId: string, itemId: string, completed: boolean) {
  const plan = await prisma.studyPlan.findFirst({ where: { id: planId, userId } });
  if (!plan) throw new StudyPlanError('not_found', PLAN_ERRORS.not_found);

  const item = await prisma.studyPlanItem.findFirst({ where: { id: itemId, planId } });
  if (!item) throw new StudyPlanError('not_found', 'العنصر غير موجود');

  const updated = await prisma.studyPlanItem.update({
    where: { id: itemId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  // Keep UserLessonProgress consistent so plan progress stays authoritative.
  await prisma.userLessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId: item.lessonId } },
    create: {
      userId,
      lessonId: item.lessonId,
      progress: completed ? 100 : 0,
      watchSeconds: 0,
      timeSpentSeconds: 0,
      completed,
      completedAt: completed ? new Date() : null,
    },
    update: {
      progress: completed ? 100 : 0,
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  return updated;
}

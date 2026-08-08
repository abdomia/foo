import { prisma } from '@/lib/db';

export interface TopicReport {
  id: string;
  title: string;
  grade: string | null;
  lessonsCompleted: number;
  totalLessons: number;
  lessonPercent: number;
  quizzesTaken: number;
  averageScore: number;
  bestScore: number;
}

export interface ReportActivity {
  id: string;
  type: 'lesson' | 'quiz';
  title: string;
  date: string;
  score?: number;
}

export interface StudentReport {
  student: {
    id: string;
    name: string;
    grade: string | null;
    avatar: string | null;
    createdAt: string;
    isSubscribed: boolean;
    subscriptionPlan: string | null;
    subscriptionExpiry: string | null;
  };
  completionPercent: number;
  lessonsCompleted: number;
  totalLessons: number;
  quizzesTaken: number;
  quizzesPassed: number;
  averageQuizScore: number;
  bestQuizScore: number;
  learningMinutes: number;
  totalHours: number;
  streak: number;
  xp: number;
  level: number;
  lastActivityAt: string | null;
  lastActivityLabel: string | null;
  bestTopic: { title: string; measure: number; label: string } | null;
  weakestTopic: { title: string; measure: number; label: string } | null;
  topics: TopicReport[];
  recentActivity: ReportActivity[];
}

const MEASURE_LABELS = {
  quiz: 'متوسط الدرجات',
  lesson: 'نسبة إنجاز الدروس',
} as const;

// Aggregates the full learning report for one student. Scoped to the
// student's grade + general (grade = null) content so percentages reflect
// what the student actually sees in the platform.
export async function buildStudentReport(userId: string): Promise<StudentReport> {
  const student = await prisma.user.findUnique({ where: { id: userId } });
  if (!student) {
    throw new Error('Student not found');
  }

  const topicWhere =
    student.grade ? { OR: [{ grade: student.grade }, { grade: null }] } : {};

  const [topics, lessonProgress, quizProgress] = await Promise.all([
    prisma.topic.findMany({
      where: topicWhere,
      include: { lessons: { select: { id: true } } },
      orderBy: { order: 'asc' },
    }),
    prisma.userLessonProgress.findMany({
      where: { userId },
      include: { lesson: { select: { id: true, title: true, topicId: true } } },
    }),
    prisma.userQuizProgress.findMany({
      where: { userId },
      include: { quiz: { select: { id: true, title: true, grade: true, topicId: true } } },
    }),
  ]);

  const scopedLessonIds = new Set(topics.flatMap((t) => t.lessons.map((l) => l.id)));
  const scopedQuizProgress = quizProgress.filter(
    (q) => !student.grade || !q.quiz.grade || q.quiz.grade === student.grade
  );

  const perLesson = new Map<string, (typeof lessonProgress)[number]>();
  for (const lp of lessonProgress) perLesson.set(lp.lessonId, lp);

  const topicRows: TopicReport[] = topics.map((t) => {
    const lessons = t.lessons;
    const completed = lessons.filter((l) => perLesson.get(l.id)?.completed).length;
    const qps = scopedQuizProgress.filter((q) => q.quiz.topicId === t.id);
    const avg = qps.length ? Math.round(qps.reduce((a, q) => a + q.score, 0) / qps.length) : 0;
    const best = qps.length ? Math.max(...qps.map((q) => q.score)) : 0;
    return {
      id: t.id,
      title: t.title,
      grade: t.grade,
      lessonsCompleted: completed,
      totalLessons: lessons.length,
      lessonPercent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
      quizzesTaken: qps.length,
      averageScore: avg,
      bestScore: best,
    };
  });

  const totalLessons = scopedLessonIds.size;
  const completedLessons = lessonProgress.filter(
    (l) => scopedLessonIds.has(l.lessonId) && l.completed
  ).length;
  const completionPercent = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  const quizzesTaken = scopedQuizProgress.length;
  const quizzesPassed = scopedQuizProgress.filter((q) => q.passed).length;
  const averageQuizScore = quizzesTaken
    ? Math.round(scopedQuizProgress.reduce((a, q) => a + q.score, 0) / quizzesTaken)
    : 0;
  const bestQuizScore = quizzesTaken ? Math.max(...scopedQuizProgress.map((q) => q.score)) : 0;

  const totalSeconds = lessonProgress.reduce((a, l) => a + (l.timeSpentSeconds || 0), 0);
  const learningMinutes = Math.round(totalSeconds / 60);
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;

  const activities: { date: Date; title: string; type: 'lesson' | 'quiz'; score?: number }[] = [];
  for (const lp of lessonProgress) {
    if (!scopedLessonIds.has(lp.lessonId)) continue;
    if (!lp.completed) continue;
    activities.push({
      date: lp.completedAt || lp.updatedAt,
      type: 'lesson',
      title: `أكمل درس «${lp.lesson.title}»`,
    });
  }
  for (const qp of scopedQuizProgress) {
    activities.push({
      date: qp.completedAt,
      type: 'quiz',
      title: `حل اختبار «${qp.quiz.title}»`,
      score: qp.score,
    });
  }
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());

  const last = activities[0] ?? null;
  const recentActivity: ReportActivity[] = activities.slice(0, 8).map((a, i) => ({
    id: `${a.type}-${a.date.getTime()}-${i}`,
    type: a.type,
    title: a.title,
    date: a.date.toISOString(),
    score: a.score,
  }));

  const activeTopics = topicRows.filter((t) => t.lessonsCompleted > 0 || t.quizzesTaken > 0);
  const measureOf = (t: TopicReport) => (t.quizzesTaken > 0 ? t.averageScore : t.lessonPercent);
  const labelOf = (t: TopicReport) =>
    t.quizzesTaken > 0 ? MEASURE_LABELS.quiz : MEASURE_LABELS.lesson;

  let bestTopic: StudentReport['bestTopic'] = null;
  let weakestTopic: StudentReport['weakestTopic'] = null;
  if (activeTopics.length > 0) {
    const sorted = [...activeTopics].sort((a, b) => measureOf(b) - measureOf(a));
    bestTopic = {
      title: sorted[0].title,
      measure: measureOf(sorted[0]),
      label: labelOf(sorted[0]),
    };
    if (activeTopics.length > 1) {
      weakestTopic = {
        title: sorted[sorted.length - 1].title,
        measure: measureOf(sorted[sorted.length - 1]),
        label: labelOf(sorted[sorted.length - 1]),
      };
    }
  }

  return {
    student: {
      id: student.id,
      name: student.name,
      grade: student.grade,
      avatar: student.avatar,
      createdAt: student.createdAt.toISOString(),
      isSubscribed: student.isSubscribed,
      subscriptionPlan: student.subscriptionPlan,
      subscriptionExpiry: student.subscriptionExpiry?.toISOString() ?? null,
    },
    completionPercent,
    lessonsCompleted: completedLessons,
    totalLessons,
    quizzesTaken,
    quizzesPassed,
    averageQuizScore,
    bestQuizScore,
    learningMinutes,
    totalHours,
    streak: student.streak,
    xp: student.xp,
    level: student.level,
    lastActivityAt: last ? last.date.toISOString() : null,
    lastActivityLabel: last ? last.title : null,
    bestTopic,
    weakestTopic,
    topics: topicRows,
    recentActivity,
  };
}

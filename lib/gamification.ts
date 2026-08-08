import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { issueProgramCertificate, issueUnitCertificate } from '@/lib/certificates';

// XP rewards per activity.
export const XP = {
  LESSON_WATCH: 10,
  PRACTICE_SOLVED: 5,
  CORRECT_ANSWER: 2,
  QUIZ_ATTEMPT: 20,
  UNIT_COMPLETE: 50,
} as const;

// Badge catalog. Stored in the DB on award (not cosmetic).
const BADGES: Record<string, { name: string; description: string; icon: string }> = {
  first_quiz: { name: 'أول اختبار', description: 'أجبت على أول اختبار في المنصة', icon: 'Target' },
  streak_7: { name: 'سبعة أيام متتالية', description: 'واصلت نشاطك 7 أيام متتالية', icon: 'Flame' },
  questions_100: { name: '100 سؤال', description: 'أجبت على 100 سؤال حتى الآن', icon: 'Brain' },
  first_unit: { name: 'أكملت أول وحدة', description: 'أنهيت جميع دروس أول وحدة', icon: 'Trophy' },
  perfect_score: { name: 'الدرجة الكاملة', description: 'حصلت على 100% في اختبار', icon: 'Crown' },
};

// Cumulative XP required to reach level L: 100 * L * (L - 1) / 2
// Level 2 = 100 XP, Level 3 = 300, Level 4 = 600, Level 5 = 1000 ...
export function levelFromXp(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
}

export function levelInfo(xp: number) {
  const level = levelFromXp(xp);
  const levelStartXp = (100 * level * (level - 1)) / 2;
  const nextLevelXp = (100 * (level + 1) * level) / 2;
  return {
    level,
    totalXp: xp,
    xpIntoLevel: xp - levelStartXp,
    xpForNext: nextLevelXp - levelStartXp,
  };
}

export async function awardXp(userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true },
  });
  if (!user) return;
  const newXp = user.xp + amount;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, level: levelFromXp(newXp) },
    }),
    prisma.xpLog.create({ data: { userId, amount, reason } }),
  ]);
}

export async function awardBadge(userId: string, type: string, link = '/progress') {
  const meta = BADGES[type];
  if (!meta) return null;
  try {
    const badge = await prisma.badge.create({
      data: {
        userId,
        type,
        name: meta.name,
        description: meta.description,
        icon: meta.icon,
      },
    });
    await createNotification({
      userId,
      type: 'achievement',
      title: 'إنجاز جديد',
      body: meta.name,
      link,
    });
    return badge;
  } catch {
    // Already earned (unique userId+type).
    return null;
  }
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function touchStreak(userId: string): Promise<{ streak: number; streakBest: number }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streak: true, streakBest: true, lastActiveDate: true },
  });
  if (!user) return { streak: 0, streakBest: 0 };

  const today = startOfDay(new Date());
  let streak = 1;

  if (user.lastActiveDate) {
    const last = startOfDay(user.lastActiveDate);
    const diffDays = Math.round((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) streak = user.streak || 1;
    else if (diffDays === 1) streak = (user.streak || 0) + 1;
    else streak = 1;
  }

  const streakBest = Math.max(user.streakBest || 0, streak);
  await prisma.user.update({
    where: { id: userId },
    data: { streak, streakBest, lastActiveDate: new Date() },
  });

  if (streak >= 7) {
    await awardBadge(userId, 'streak_7');
  }

  return { streak, streakBest };
}

export async function recordAnsweredQuestions(userId: string, count: number) {
  if (count <= 0) return;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { questionsAnswered: { increment: count } },
    select: { questionsAnswered: true },
  });
  if (user.questionsAnswered >= 100) {
    await awardBadge(userId, 'questions_100');
  }
}

// Called when a lesson first becomes completed. Awards the unit bonus
// (+50 XP) and the "first unit" badge when every lesson in the topic is done.
// Also issues the unit certificate.
export async function checkUnitCompletion(userId: string, topicId: string) {
  const topicLessons = await prisma.lesson.findMany({
    where: { topicId },
    select: { id: true },
  });
  if (topicLessons.length === 0) return;

  const completed = await prisma.userLessonProgress.findMany({
    where: { userId, lessonId: { in: topicLessons.map((l) => l.id) }, completed: true },
    select: { lessonId: true },
  });

  if (completed.length !== topicLessons.length) return;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { title: true },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const certificate = await issueUnitCertificate({
    userId,
    studentName: user?.name ?? 'طالب',
    courseId: topicId,
    courseTitle: topic?.title ?? 'وحدة تعليمية',
    completionPercent: 100,
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { unitsCompleted: { increment: 1 } },
    select: { unitsCompleted: true },
  });

  await awardXp(userId, XP.UNIT_COMPLETE, 'unit_complete');
  await awardBadge(userId, 'first_unit');
  await createNotification({
    userId,
    type: 'achievement',
    title: 'أكملت وحدة كاملة',
    body: topic?.title ?? '',
    link: '/certificates',
  });

  return { unitsCompleted: updated.unitsCompleted, certificate };
}

// Called when a lesson completes. Issues the full program certificate once
// every lesson across all topics is completed.
export async function checkProgramCompletion(userId: string) {
  const [user, allLessons, progress] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, grade: true },
    }),
    prisma.lesson.count(),
    prisma.userLessonProgress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true },
    }),
  ]);
  if (!user || allLessons === 0) return;
  if (progress.length < allLessons) return;

  const completedCount = progress.length;
  const percent = Math.round((completedCount / allLessons) * 100);
  if (percent < 100) return;

  const programTitle = 'البرنامج الكامل';
  const certificate = await issueProgramCertificate({
    userId,
    studentName: user.name,
    courseTitle: programTitle,
    completionPercent: percent,
  });

  await createNotification({
    userId,
    type: 'achievement',
    title: 'شهادة البرنامج متاحة',
    body: 'مبروك! أكملت البرنامج بالكامل',
    link: '/certificates',
  });

  return { certificate };
}

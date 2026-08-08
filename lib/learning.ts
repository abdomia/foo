import type { Badge } from '@/lib/data';

export const XP_PER_LESSON = 10;
export const XP_PER_QUIZ = 5;
export const XP_PER_PASSED_QUIZ = 20;

function toDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Consecutive-day streak counting back from today (or yesterday if no activity today yet).
export function computeStreak(dates: Date[]): number {
  const uniqueDays = new Set<string>();
  dates.forEach((d) => uniqueDays.add(toDayKey(d)));
  if (uniqueDays.size === 0) return 0;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (!uniqueDays.has(toDayKey(today)) && !uniqueDays.has(toDayKey(yesterday))) {
    return 0;
  }

  let cursor = uniqueDays.has(toDayKey(today)) ? today : yesterday;
  let streak = 0;
  while (uniqueDays.has(toDayKey(cursor))) {
    streak++;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeXP(
  completedLessons: number,
  quizzesTaken: number,
  quizzesPassed: number
): number {
  return (
    completedLessons * XP_PER_LESSON +
    quizzesTaken * XP_PER_QUIZ +
    quizzesPassed * XP_PER_PASSED_QUIZ
  );
}

export interface BadgeInput {
  lessonsCompleted: number;
  quizzesTaken: number;
  quizzesPassed: number;
  bestScore: number;
  streak: number;
  completionPercent: number;
}

export function computeBadges(input: BadgeInput): Badge[] {
  return [
    {
      id: 'first-lesson',
      name: 'البداية',
      icon: 'Star',
      earned: input.lessonsCompleted >= 1,
    },
    {
      id: 'five-lessons',
      name: 'متمرن',
      icon: 'Trophy',
      earned: input.lessonsCompleted >= 5,
    },
    {
      id: 'ten-lessons',
      name: 'نشيط',
      icon: 'Award',
      earned: input.lessonsCompleted >= 10,
    },
    {
      id: 'first-quiz',
      name: 'مختبر',
      icon: 'Target',
      earned: input.quizzesTaken >= 1,
    },
    {
      id: 'first-pass',
      name: 'أول نجاح',
      icon: 'CheckCircle2',
      earned: input.quizzesPassed >= 1,
    },
    {
      id: 'perfect-quiz',
      name: 'علامة كاملة',
      icon: 'Sparkles',
      earned: input.bestScore >= 100,
    },
    {
      id: 'week-streak',
      name: 'سبعة أيام',
      icon: 'Flame',
      earned: input.streak >= 7,
    },
    {
      id: 'half-course',
      name: 'نصف المنهج',
      icon: 'TrendingUp',
      earned: input.completionPercent >= 50,
    },
    {
      id: 'full-course',
      name: 'إتمام المنهج',
      icon: 'GraduationCap',
      earned: input.completionPercent >= 100,
    },
  ];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} ثانية`;
  const mins = Math.floor(seconds / 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs} س ${mins % 60} د`;
  return `${mins} دقيقة`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs} س ${mins} د` : `${hrs} ساعات`;
}

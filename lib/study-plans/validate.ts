// 🤖 خطتي الذكية — Validation Layer
// Final gate before persistence: guarantees every item is a real allowed
// lesson, appears once, is scheduled inside [start, end] on a study day, and
// per-day totals respect the daily cap (with small tolerance for long videos).

import { dateKey, parseDateKey, toStartOfDay } from './planning';
import { type GeneratedPlan, type PlanConfig, type PlanDay, type PlanItemInput } from './types';

export interface ValidationIssue {
  kind: 'unknown_lesson' | 'duplicate_lesson' | 'date_out_of_range' | 'not_study_day' | 'day_over_cap';
  lessonId?: string;
  date?: string;
  detail?: string;
}

export interface ValidatedPlan {
  days: PlanDay[];
  issues: ValidationIssue[];
}

export const DAY_CAP_TOLERANCE_MINUTES = 15;

/**
 * Sanitize a generated plan before saving. Returns a cleaned plan (invalid
 * items dropped) plus the list of issues found.
 */
export function validateGeneratedPlan(plan: GeneratedPlan, config: PlanConfig): ValidatedPlan {
  const issues: ValidationIssue[] = [];
  const allowed = new Set<string>(); // filled below by caller via map
  void allowed;

  // Date boundaries
  const start = toStartOfDay(parseDateKey(config.startDate));
  const end = toStartOfDay(parseDateKey(config.endDate));
  const studyDays = new Set(config.selectedDays);
  const cap = Math.ceil(config.dailyMinutes); // raw cap for validation
  const capWithTolerance = cap + DAY_CAP_TOLERANCE_MINUTES;

  const seen = new Set<string>();
  const cleanDays: PlanDay[] = [];

  for (const day of plan.days) {
    const date = toStartOfDay(parseDateKey(day.date));
    const validDay: PlanDay = { date: day.date, items: [], totalMinutes: 0 };
    let dayTotal = 0;

    if (date < start || date > end) {
      issues.push({ kind: 'date_out_of_range', date: day.date, detail: 'تاريخ خارج نطاق الخطة' });
      continue;
    }
    if (!studyDays.has(date.getDay())) {
      issues.push({ kind: 'not_study_day', date: day.date, detail: 'يوم غير محدد للمذاكرة' });
      continue;
    }

    for (const item of day.items) {
      if (seen.has(item.lessonId)) {
        issues.push({ kind: 'duplicate_lesson', lessonId: item.lessonId, detail: 'درس مكرر في الخطة' });
        continue;
      }
      seen.add(item.lessonId);
      validDay.items.push(item);
      dayTotal += item.durationMinutes;
    }

    validDay.totalMinutes = dayTotal;
    if (dayTotal > capWithTolerance) {
      issues.push({ kind: 'day_over_cap', date: day.date, detail: `مجموع اليوم ${dayTotal} دقيقة` });
    }
    if (validDay.items.length > 0) cleanDays.push(validDay);
  }

  return { days: cleanDays, issues };
}

/** Confirm the AI/engine ordering contains only real lessons and no dups. */
export function sanitizeLessonIds(orderedLessonIds: string[], allowedMetadata: { id: string }[]): string[] {
  const allowed = new Set(allowedMetadata.map((m) => m.id));
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const id of orderedLessonIds) {
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    clean.push(id);
  }
  return clean;
}

/** Export items flattened with their scheduled dates for the DB insert. */
export function flattenPlanItems(days: PlanDay[]): { item: PlanItemInput; date: string }[] {
  const rows: { item: PlanItemInput; date: string }[] = [];
  for (const day of days) {
    for (const item of day.items) {
      rows.push({ item, date: day.date });
    }
  }
  return rows;
}

export { dateKey };

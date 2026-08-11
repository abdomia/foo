// 🤖 خطتي الذكية — Planning Engine
// All pure, deterministic calculations. The AI never touches these; the engine
// is the single source of truth for feasibility & day distribution.

import {
  type ContentType,
  type GeneratedPlan,
  type PlanConfig,
  type PlanDay,
  type PlanItemInput,
  type StudyIntensity,
  type VideoMetadata,
} from './types';

// ---------- Date helpers (local-midnight safe) ----------

export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toStartOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(d: Date, days: number): Date {
  const copy = toStartOfDay(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((toStartOfDay(b).getTime() - toStartOfDay(a).getTime()) / 86400000);
}

/** All calendar dates within [start, end] (inclusive) that match selectedDays. */
export function getStudyDates(startDate: Date, endDate: Date, selectedDays: number[]): Date[] {
  const start = toStartOfDay(startDate);
  const end = toStartOfDay(endDate);
  const days = new Set(selectedDays);
  const dates: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (days.has(d.getDay())) dates.push(d);
  }
  return dates;
}

export function formatArabicDate(d: Date): string {
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------- Stats & feasibility ----------

export function computeStats(metadata: VideoMetadata[]) {
  const stats = {
    totalVideos: metadata.length,
    explanationVideos: 0,
    practiceVideos: 0,
    reviewVideos: 0,
    examVideos: 0,
    totalMinutes: 0,
  };
  for (const m of metadata) {
    stats[m.videoType === 'explanation' ? 'explanationVideos' : m.videoType === 'practice' ? 'practiceVideos' : m.videoType === 'review' ? 'reviewVideos' : 'examVideos'] += 1;
    stats.totalMinutes += m.durationMinutes;
  }
  return stats;
}

export interface Feasibility {
  totalMinutes: number;
  studyDays: Date[];
  availableMinutes: number;
  requiredDays: number;
  enough: boolean;
}

export const INTENSITY_FACTOR: Record<StudyIntensity, number> = {
  light: 0.7, // lighter daily load → longer spread
  balanced: 0.85,
  intensive: 1.0,
};

export function computeFeasibility(
  metadata: VideoMetadata[],
  config: PlanConfig
): Feasibility {
  const totalMinutes = metadata.reduce((sum, m) => sum + m.durationMinutes, 0);
  const studyDates = getStudyDates(parseDateKey(config.startDate), parseDateKey(config.endDate), config.selectedDays);
  const dayCap = dailyCap(config.dailyMinutes, config.studyIntensity);
  const availableMinutes = studyDates.length * dayCap;
  const requiredDays = dayCap > 0 ? Math.ceil(totalMinutes / dayCap) : 0;
  return {
    totalMinutes,
    studyDays: studyDates,
    availableMinutes,
    requiredDays,
    enough: studyDates.length >= requiredDays,
  };
}

export function dailyCap(dailyMinutes: number, intensity: StudyIntensity): number {
  return Math.ceil(dailyMinutes * INTENSITY_FACTOR[intensity]);
}

// ---------- Curriculum ordering ----------

export function filterByContentType(metadata: VideoMetadata[], contentType: ContentType): VideoMetadata[] {
  switch (contentType) {
    case 'explanation':
      return metadata.filter((m) => m.videoType === 'explanation');
    case 'practice':
      return metadata.filter((m) => m.videoType === 'practice');
    case 'both':
      return metadata.filter((m) => m.videoType === 'explanation' || m.videoType === 'practice');
    case 'review':
      return metadata;
  }
}

/**
 * Order content pedagogically:
 *  1. group by unit, units sorted by unit order (topic.order)
 *  2. within a unit, lessons sorted by orderIndex
 *  3. for "both" → all شرح videos first, then all تدريب videos (per unit)
 *  4. prerequisites always come before dependents (topological, stable)
 */
export function orderContent(metadata: VideoMetadata[], contentType: ContentType): VideoMetadata[] {
  const base = filterByContentType(metadata, contentType);

  const byUnit = new Map<string, VideoMetadata[]>();
  for (const m of base) {
    const arr = byUnit.get(m.unitId) ?? [];
    arr.push(m);
    byUnit.set(m.unitId, arr);
  }

  const unitOrder = new Map<string, number>();
  [...byUnit.keys()].forEach((id, i) => unitOrder.set(id, i));

  let flat: VideoMetadata[] = [];
  for (const m of base) {
    const m2 = { ...m, _unitIdx: unitOrder.get(m.unitId) ?? 0 };
    void m2;
  }

  const units: VideoMetadata[][] = [...byUnit.values()].sort((a, b) => {
    const oa = Math.min(...a.map((x) => x.orderIndex));
    const ob = Math.min(...b.map((x) => x.orderIndex));
    if (oa !== ob) return oa - ob;
    return a[0].unitTitle.localeCompare(b[0].unitTitle, 'ar');
  });

  for (const unit of units) {
    const sorted = [...unit].sort((a, b) => a.orderIndex - b.orderIndex);
    if (contentType === 'both') {
      const explanations = sorted.filter((m) => m.videoType === 'explanation');
      const practices = sorted.filter((m) => m.videoType === 'practice');
      flat = flat.concat(explanations, practices);
    } else {
      const order: Record<ContentType, VideoMetadata['videoType'][]> = {
        explanation: ['explanation'],
        practice: ['practice'],
        both: ['explanation', 'practice'],
        review: ['explanation', 'practice', 'review', 'exam'],
      };
      for (const t of order[contentType]) {
        flat = flat.concat(sorted.filter((m) => m.videoType === t));
      }
    }
  }

  return topologicalSort(flat);
}

/**
 * Stable topological sort so prerequisites appear before their dependents.
 * Falls back to the input order when a cycle exists.
 */
export function topologicalSort<T extends { id: string; prerequisites: string[] }>(items: T[]): T[] {
  const positions = new Map(items.map((it, i) => [it.id, i]));
  const indeg = new Map(items.map((it) => [it.id, 0]));
  const out = new Map(items.map((it) => [it.id, [] as string[]]));

  for (const it of items) {
    for (const pre of it.prerequisites) {
      if (positions.has(pre)) {
        out.get(pre)!.push(it.id);
        indeg.set(it.id, (indeg.get(it.id) ?? 0) + 1);
      }
    }
  }

  const queue = items.filter((it) => (indeg.get(it.id) ?? 0) === 0).map((it) => it.id);
  const byId = new Map(items.map((it) => [it.id, it]));
  const result: T[] = [];

  while (queue.length) {
    const currentId = queue.shift()!;
    const current = byId.get(currentId)!;
    result.push(current);
    for (const nextId of out.get(currentId) ?? []) {
      indeg.set(nextId, (indeg.get(nextId) ?? 0) - 1);
      if (indeg.get(nextId) === 0) {
        queue.push(nextId);
        queue.sort((a, b) => (positions.get(a) ?? 0) - (positions.get(b) ?? 0));
      }
    }
  }

  // Append anything remaining (cycle) in original order.
  const seen = new Set(result.map((r) => r.id));
  return result.concat(items.filter((it) => !seen.has(it.id)));
}

// ---------- Distribution ----------

export interface DistributionResult {
  days: PlanDay[];
  overflow: PlanItemInput[];
  orderedLessonIds: string[];
}

/**
 * Greedy chronological distribution. Respects the per-day cap (intensity-
 * scaled). A single video longer than the cap is still placed (flagged via
 * overflow) — better than dropping real content.
 */
export function distributeContent(
  ordered: VideoMetadata[],
  studyDates: Date[],
  dailyMinutes: number,
  intensity: StudyIntensity
): DistributionResult {
  const cap = dailyCap(dailyMinutes, intensity);
  const days: PlanDay[] = [];
  const overflow: PlanItemInput[] = [];
  const orderedLessonIds: string[] = [];

  let currentDateIdx = 0;
  let usedToday = 0;
  let currentDay: PlanDay | null = null;

  const startDay = (date: Date): PlanDay => ({ date: dateKey(date), items: [], totalMinutes: 0 });

  for (const meta of ordered) {
    orderedLessonIds.push(meta.id);
    const item: PlanItemInput = {
      lessonId: meta.id,
      videoType: meta.videoType,
      durationMinutes: meta.durationMinutes,
      orderIndex: meta.orderIndex,
    };

    if (!currentDay) {
      if (currentDateIdx >= studyDates.length) {
        overflow.push(item);
        continue;
      }
      currentDay = startDay(studyDates[currentDateIdx]);
      usedToday = 0;
    }

    if (usedToday + item.durationMinutes > cap) {
      // try to roll into the next study day
      if (usedToday > 0 && currentDateIdx + 1 < studyDates.length) {
        days.push(currentDay);
        currentDateIdx += 1;
        currentDay = startDay(studyDates[currentDateIdx]);
        usedToday = 0;
      } else if (currentDateIdx + 1 >= studyDates.length) {
        // no more days: a single long video still gets a slot
        if (usedToday === 0) {
          currentDay.items.push(item);
          currentDay.totalMinutes += item.durationMinutes;
          usedToday += item.durationMinutes;
          continue;
        }
        overflow.push(item);
        continue;
      }
    }

    currentDay.items.push(item);
    currentDay.totalMinutes += item.durationMinutes;
    usedToday += item.durationMinutes;
  }

  if (currentDay && currentDay.items.length > 0) days.push(currentDay);

  return { days, overflow, orderedLessonIds };
}

/**
 * Main plan generation pipeline (engine-side). Returns the full schedule.
 * `prescribedOrder` — when provided (e.g. from AI), the engine distributes in
 * that order while still enforcing caps & dates.
 */
export function buildPlan(
  metadata: VideoMetadata[],
  config: PlanConfig,
  prescribedOrder?: VideoMetadata[]
): GeneratedPlan {
  const feasibility = computeFeasibility(metadata, config);
  const stats = computeStats(metadata);

  let ordered: VideoMetadata[];
  if (prescribedOrder && prescribedOrder.length > 0) {
    const allowed = new Set(metadata.map((m) => m.id));
    ordered = prescribedOrder.filter((m) => allowed.has(m.id));
    // ensure nothing missing
    const seen = new Set(ordered.map((m) => m.id));
    ordered = ordered.concat(metadata.filter((m) => !seen.has(m.id)));
  } else {
    ordered = orderContent(metadata, config.contentType);
  }

  const { days, overflow, orderedLessonIds } = distributeContent(
    ordered,
    feasibility.studyDays,
    config.dailyMinutes,
    config.studyIntensity
  );

  return {
    days,
    orderedLessonIds,
    totalMinutes: stats.totalMinutes,
    totalVideos: stats.totalVideos,
    explanationVideos: stats.explanationVideos,
    practiceVideos: stats.practiceVideos,
    reviewVideos: stats.reviewVideos,
    examVideos: stats.examVideos,
    insufficient: !feasibility.enough || overflow.length > 0,
    aiUsed: false,
  };
}

// ---------- Redistribution (edit / reset for lag) ----------

export interface RedistributeInput {
  items: PlanItemInput[];
  startDate: Date;
  endDate: Date;
  selectedDays: number[];
  dailyMinutes: number;
  intensity: StudyIntensity;
}

/**
 * Re-distribute incomplete items over the remaining study days. Completed
 * items are left untouched by the caller (kept on their original dates).
 */
export function redistributeRemaining(input: RedistributeInput): { days: PlanDay[]; overflow: PlanItemInput[] } {
  const studyDates = getStudyDates(input.startDate, input.endDate, input.selectedDays);
  const sorted = [...input.items].sort((a, b) => a.orderIndex - b.orderIndex);
  const cap = dailyCap(input.dailyMinutes, input.intensity);

  const days: PlanDay[] = [];
  const overflow: PlanItemInput[] = [];

  let dateIdx = 0;
  let usedToday = 0;
  let currentDay: PlanDay | null = null;

  for (const item of sorted) {
    if (!currentDay) {
      if (dateIdx >= studyDates.length) {
        overflow.push(item);
        continue;
      }
      currentDay = { date: dateKey(studyDates[dateIdx]), items: [], totalMinutes: 0 };
      usedToday = 0;
    }
    if (usedToday + item.durationMinutes > cap && usedToday > 0) {
      days.push(currentDay);
      dateIdx += 1;
      if (dateIdx >= studyDates.length) {
        overflow.push(item);
        currentDay = null;
        continue;
      }
      currentDay = { date: dateKey(studyDates[dateIdx]), items: [], totalMinutes: 0 };
      usedToday = 0;
    }
    currentDay.items.push(item);
    currentDay.totalMinutes += item.durationMinutes;
    usedToday += item.durationMinutes;
  }

  if (currentDay && currentDay.items.length > 0) days.push(currentDay);
  return { days, overflow };
}

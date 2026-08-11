// 🤖 خطتي الذكية — Content Engine
// Reads the REAL platform content (topics + lessons) and exposes it as
// normalized video metadata for the planner. Never invents titles or videos.

import { prisma } from '@/lib/db';
import { VIDEO_TYPE_LABELS, type VideoMetadata, type VideoType } from './types';

/** Parse the platform's duration strings ("10m", "10:00", "1:30:00", "90", "1h 30m"). */
export function parseDuration(duration: string | null | undefined): number {
  if (!duration) return 0;
  const s = String(duration).trim().toLowerCase();
  if (!s) return 0;

  // h/m patterns: "1h30m", "1h 30m", "10m"
  const hmsMatch = s.match(/^(\d+)\s*h\s*(\d+)?\s*m?$/);
  if (hmsMatch) {
    const hours = parseInt(hmsMatch[1], 10) || 0;
    const mins = parseInt(hmsMatch[2] || '0', 10) || 0;
    return hours * 60 + mins;
  }

  // colon format: "10:00", "1:30:00"
  const colonMatch = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    const sec = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
    if (h >= 100 && !colonMatch[3]) return h; // e.g. "30:00" treated as 30:00 → 30 min
    return h * 60 + m + (sec > 0 ? 1 : 0);
  }

  // plain minutes: "10", "90"
  const num = parseInt(s, 10);
  if (!Number.isNaN(num) && num > 0 && num <= 600) return num;

  return 0;
}

const VIDEO_TYPE_ALIASES: Record<string, VideoType> = {
  explanation: 'explanation',
  explain: 'explanation',
  شرح: 'explanation',
  'شرح فقط': 'explanation',
  practice: 'practice',
  exercise: 'practice',
  exercises: 'practice',
  'تدريب': 'practice',
  'تدريبات': 'practice',
  'تمرين': 'practice',
  review: 'review',
  revision: 'review',
  'مراجعة': 'review',
  exam: 'exam',
  test: 'exam',
  quiz: 'exam',
  'اختبار': 'exam',
  'امتحان': 'exam',
  final: 'exam',
};

/** Normalize any stored video type to one of the four canonical types. */
export function normalizeVideoType(type: string | null | undefined): VideoType {
  const key = String(type ?? '').trim().toLowerCase();
  return VIDEO_TYPE_ALIASES[key] ?? 'explanation';
}

export interface GradeTopic {
  id: string;
  title: string;
  icon: string;
  order: number;
  lessonCount: number;
}

export interface GradeContent {
  topics: GradeTopic[];
  lessons: (typeof prisma.lesson extends never ? never : LessonRow)[];
}

type LessonRow = Awaited<ReturnType<typeof fetchGradeContentRaw>> extends { lessons: infer L }
  ? L extends Array<infer I>
    ? I
    : never
  : never;

async function fetchGradeContentRaw(grade: string) {
  const topics = await prisma.topic.findMany({
    where: { OR: [{ grade }, { grade: null }] },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  const lessons = await prisma.lesson.findMany({
    where: {
      OR: [{ grade }, { grade: null }, { topicId: { in: topics.map((t) => t.id) } }],
    },
    include: { topic: true },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });

  return { topics, lessons };
}

/** Load the grade's topics + lessons straight from the DB. */
export async function fetchGradeContent(grade: string): Promise<GradeContent> {
  const { topics, lessons } = await fetchGradeContentRaw(grade);
  const topicIds = new Set(topics.map((t) => t.id));

  const filteredLessons = lessons.filter(
    (l) => topicIds.has(l.topicId) || l.grade === grade
  );
  // De-dupe by id (a lesson can match both branches).
  const seen = new Set<string>();
  const uniqueLessons = filteredLessons.filter((l) => {
    if (seen.has(l.id)) return false;
    seen.add(l.id);
    return true;
  });

  return {
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      icon: t.icon,
      order: t.order,
      lessonCount: uniqueLessons.filter((l) => l.topicId === t.id).length,
    })),
    lessons: uniqueLessons,
  };
}

/** Map raw lessons → planner metadata. */
export function buildVideoMetadata(lessons: LessonRow[]): VideoMetadata[] {
  return lessons
    .map((lesson) => {
      const videoType = normalizeVideoType(lesson.type);
      return {
        id: lesson.id,
        title: lesson.title,
        grade: lesson.grade ?? lesson.topic.grade ?? '',
        subject: inferSubject(lesson.topic.title),
        unitId: lesson.topicId,
        unitTitle: lesson.topic.title,
        lessonTitle: lesson.title,
        videoType,
        videoTypeLabel: VIDEO_TYPE_LABELS[videoType],
        durationMinutes: parseDuration(lesson.duration),
        difficulty: normalizeDifficulty(lesson.difficulty),
        orderIndex: lesson.order,
        prerequisites: Array.isArray(lesson.prerequisites) ? lesson.prerequisites : [],
        url: lesson.videoUrl,
        accessType: lesson.accessType,
      };
    })
    .sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.title.localeCompare(b.title, 'ar');
    });
}

function inferSubject(unitTitle: string): 'math' | 'statistics' {
  return /إحصاء|احتمال|statistics|probability/i.test(unitTitle) ? 'statistics' : 'math';
}

export function normalizeDifficulty(difficulty: string | null | undefined): 'easy' | 'medium' | 'hard' {
  const d = String(difficulty ?? '').trim().toLowerCase();
  if (d === 'easy' || d === 'سهل') return 'easy';
  if (d === 'hard' || d === 'صعب') return 'hard';
  return 'medium';
}

/** Filter metadata to the student's chosen scope. */
export function filterContentForScope(
  metadata: VideoMetadata[],
  scope: 'full' | 'units' | 'lessons',
  unitIds: string[],
  lessonIds: string[]
): VideoMetadata[] {
  if (scope === 'lessons') {
    const selected = new Set(lessonIds);
    return metadata.filter((m) => selected.has(m.id));
  }
  if (scope === 'units') {
    const selectedUnits = new Set(unitIds);
    return metadata.filter((m) => selectedUnits.has(m.unitId));
  }
  return metadata;
}

/** Count lessons per topic id (used by the wizard). */
export function countLessonsPerUnit(metadata: VideoMetadata[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of metadata) {
    counts.set(m.unitId, (counts.get(m.unitId) ?? 0) + 1);
  }
  return counts;
}

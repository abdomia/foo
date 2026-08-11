// 🤖 خطتي الذكية — shared types for the AI Study Planner

export type VideoType = 'explanation' | 'practice' | 'review' | 'exam';
export type ContentScope = 'full' | 'units' | 'lessons';
export type ContentType = 'explanation' | 'practice' | 'both' | 'review';
export type StudyIntensity = 'light' | 'balanced' | 'intensive';
export type DifficultyLevel = 'weak' | 'average' | 'good' | 'very_good' | 'excellent';
export type PriorKnowledge = 'none' | 'partial' | 'review';

// A single real video from the platform DB (never invented by AI).
export interface VideoMetadata {
  id: string;
  title: string;
  grade: string;
  subject: 'math' | 'statistics';
  unitId: string;
  unitTitle: string;
  lessonTitle: string;
  videoType: VideoType;
  videoTypeLabel: string;
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  orderIndex: number;
  prerequisites: string[]; // lesson ids
  url: string;
  accessType: string;
}

export interface PlanConfig {
  grade: string;
  startDate: string; // yyyy-mm-dd
  endDate: string; // yyyy-mm-dd
  dailyMinutes: number;
  selectedDays: number[]; // JS Date.getDay() values (0=Sun .. 6=Sat)
  contentScope: ContentScope;
  contentType: ContentType;
  unitIds: string[];
  lessonIds: string[];
  difficultyLevel: DifficultyLevel;
  priorKnowledge: PriorKnowledge;
  studyIntensity: StudyIntensity;
}

export interface PlanItemInput {
  lessonId: string;
  videoType: VideoType;
  durationMinutes: number;
  orderIndex: number;
}

export interface PlanDay {
  date: string; // yyyy-mm-dd
  items: PlanItemInput[];
  totalMinutes: number;
}

export interface GeneratedPlan {
  days: PlanDay[];
  orderedLessonIds: string[];
  totalMinutes: number;
  totalVideos: number;
  explanationVideos: number;
  practiceVideos: number;
  reviewVideos: number;
  examVideos: number;
  insufficient: boolean;
  aiUsed: boolean;
}

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  explanation: 'شرح',
  practice: 'تدريب',
  review: 'مراجعة',
  exam: 'اختبار',
};

export const INTENSITY_LABELS: Record<StudyIntensity, string> = {
  light: 'خطة خفيفة',
  balanced: 'خطة متوازنة',
  intensive: 'خطة مكثفة',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  weak: 'ضعيف',
  average: 'متوسط',
  good: 'جيد',
  very_good: 'جيد جداً',
  excellent: 'ممتاز',
};

export const PRIOR_KNOWLEDGE_LABELS: Record<PriorKnowledge, string> = {
  none: 'لم أدرسه من قبل',
  partial: 'درست جزءاً منه',
  review: 'درست المنهج كاملاً وأريد المراجعة',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  explanation: 'فيديوهات الشرح فقط',
  practice: 'فيديوهات التدريبات فقط',
  both: 'الشرح + التدريبات',
  review: 'مراجعة شاملة',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

// Egyptian week order for the wizard checkboxes.
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

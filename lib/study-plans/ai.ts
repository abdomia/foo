// 🤖 خطتي الذكية — AI Personalization Layer
// Optional advisor. When AI_API_KEY is set, the model proposes the ORDER in
// which the student should watch the videos (explanation-first, easy→hard,
// prerequisites respected, spaced practice). The Planning Engine always does
// the actual day distribution & feasibility — so the AI can never invent
// videos or produce an infeasible schedule. On any failure we fall back to the
// deterministic engine ordering.

import type { PlanConfig, VideoMetadata } from './types';

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

function baseUrl(): string {
  return (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

function model(): string {
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

export interface AiAdvisorResult {
  orderedLessonIds: string[];
  usedFallback: boolean;
}

/**
 * Ask the AI for a personalized viewing order. Returns only lesson ids that
 * exist in the metadata set (strictly validated). Null when AI is off or fails.
 */
export async function personalizeOrder(
  metadata: VideoMetadata[],
  config: PlanConfig
): Promise<AiAdvisorResult> {
  if (!isAiConfigured()) {
    return { orderedLessonIds: [], usedFallback: true };
  }
  if (metadata.length === 0) {
    return { orderedLessonIds: [], usedFallback: true };
  }

  const payload = {
    model: model(),
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'أنت خبير في تخطيط المذاكرة لطلاب المرحلة الإعدادية في مصر. مهمتك: إعادة ترتيب قائمة فيديوهات حقيقية من منصة "الرائد" بحيث يذاكرها الطالب بالترتيب الأمثل. قواعد صارمة: (1) لا تخترع ولا تضيف ولا تحذف أي فيديو — استخدم كل الـ ids الموجودة مرة واحدة بالضبط. (2) فيديو الشرح يجب أن يأتي قبل تدريباته. (3) المتطلب السابق (prerequisite) قبل الدرس الذي يعتمد عليه. (4) ضع الصعب (hard) بعد السهل. أعد JSON فقط بهذا الشكل: {"order":["lesson_id_1","lesson_id_2",...]}.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          student_profile: {
            difficulty_level: config.difficultyLevel,
            prior_knowledge: config.priorKnowledge,
            study_intensity: config.studyIntensity,
          },
          videos: metadata.map((m) => ({
            id: m.id,
            unit: m.unitTitle,
            title: m.lessonTitle,
            type: m.videoType,
            minutes: m.durationMinutes,
            difficulty: m.difficulty,
            prerequisites: m.prerequisites,
          })),
        }),
      },
    ],
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(`${baseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error('[study-plans:ai] HTTP', res.status);
      return { orderedLessonIds: [], usedFallback: true };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return { orderedLessonIds: [], usedFallback: true };
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const order: unknown[] = parsed?.order;
    if (!Array.isArray(order)) {
      return { orderedLessonIds: [], usedFallback: true };
    }

    const allowed = new Set(metadata.map((m) => m.id));
    const byId = new Map(metadata.map((m) => [m.id, m]));

    // Strictly validate: only real ids, no repeats.
    const orderedLessonIds: string[] = [];
    const seen = new Set<string>();
    for (const raw of order) {
      const id = String(raw ?? '');
      if (!allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      orderedLessonIds.push(id);
    }

    // Ensure completeness: any missing videos are appended in engine order.
    for (const m of metadata) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        orderedLessonIds.push(m.id);
        void byId;
      }
    }

    const usedFallback = orderedLessonIds.length === 0 || orderedLessonIds.length !== metadata.length;
    return { orderedLessonIds, usedFallback };
  } catch (error) {
    console.error('[study-plans:ai] falling back to engine order:', error);
    return { orderedLessonIds: [], usedFallback: true };
  }
}

/** Resolve an ordered id list back to real metadata (in that order). */
export function applyPrescribedOrder(metadata: VideoMetadata[], orderedLessonIds: string[]): VideoMetadata[] {
  const byId = new Map(metadata.map((m) => [m.id, m]));
  const allowed = new Set(metadata.map((m) => m.id));
  const ordered: VideoMetadata[] = [];
  const seen = new Set<string>();
  for (const id of orderedLessonIds) {
    if (!allowed.has(id) || seen.has(id)) continue;
    const meta = byId.get(id);
    if (meta) {
      seen.add(id);
      ordered.push(meta);
    }
  }
  for (const m of metadata) {
    if (!seen.has(m.id)) ordered.push(m);
  }
  return ordered;
}

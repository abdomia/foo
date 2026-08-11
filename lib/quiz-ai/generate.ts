import { isAiConfigured, aiConfig } from './config';

export interface AiGeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string | null;
}

function buildSystemPrompt(count: number): string {
  return `أنت خبير في وضع امتحانات للمراحل الدراسية في مصر (إعدادي وثانوي). سيتم تزويدك بمحتوى دراسي (نص من ملف PDF أو نسخة نصية من فيديو يوتيوب). مهمتك: وضع ${count} سؤال اختيار من متعدد (MCQ) باللغة العربية من هذا المحتوى فقط — دون اختلاق أي معلومة غير موجودة فيه.

قواعد صارمة:
1. كل سؤال له 4 خيارات (options) وخيار واحد صحيح فقط (correctAnswer) مطابق حرفياً لأحد الخيارات.
2. وزّع الإجابات الصحيحة عشوائياً بين المواضع.
3. difficulty لكل سؤال: "easy" أو "medium" أو "hard".
4. explanation: شرح مبسط قصير للسؤال (اختياري لكن مستحسن).
5. لا تكرر الأسئلة، ولا تكتب أسئلة خارجة عن المحتوى.
6. أعد JSON فقط بهذا الشكل، بدون أي نص إضافي:
{"questions":[{"question":"نص السؤال؟","options":["أ","ب","ج","د"],"correctAnswer":"أ","difficulty":"medium","explanation":"الشرح"}]}`;
}

function sanitizeJson(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const objectStart = content.indexOf('{');
  const objectEnd = content.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return content.slice(objectStart, objectEnd + 1);
  }
  return content.trim();
}

function normalizeAnswer(correct: unknown, options: string[]): string | null {
  const wanted = String(correct ?? '').trim();
  if (!wanted) return null;
  const exact = options.find((o) => o.trim() === wanted);
  if (exact) return exact.trim();
  const loose = options.find((o) => o.trim().toLowerCase() === wanted.toLowerCase());
  if (loose) return loose.trim();
  // Accept if the model used a different prefix/letter but same meaning (e.g. "أ)" vs "أ").
  const stripped = wanted.replace(/[)\.\s-]+$/g, '').trim();
  const byStripped = options.find((o) => o.trim().replace(/[)\.\s-]+$/g, '').trim() === stripped);
  if (byStripped) return byStripped.trim();
  return null;
}

function validateQuestions(raw: unknown): AiGeneratedQuestion[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: AiGeneratedQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const question = String(rec.question ?? '').trim();
    if (question.length < 5 || question.length > 500) continue;
    const options = Array.isArray(rec.options)
      ? rec.options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    if (options.length < 2 || options.length > 4) continue;
    const correctAnswer = normalizeAnswer(rec.correctAnswer, options);
    if (!correctAnswer) continue;
    const difficulty =
      rec.difficulty === 'easy' || rec.difficulty === 'hard' ? rec.difficulty : 'medium';
    const explanationRaw = String(rec.explanation ?? '').trim();
    const explanation = explanationRaw ? explanationRaw.slice(0, 2000) : null;
    const key = question.replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      question,
      options: options.slice(0, 4),
      correctAnswer,
      difficulty,
      explanation,
    });
  }
  return result;
}

export async function generateQuestionsFromContent(
  content: string,
  count: number
): Promise<AiGeneratedQuestion[]> {
  if (!isAiConfigured()) {
    throw new Error('الذكاء الاصطناعي غير مفعّل. أضف AI_API_KEY في إعدادات النشر.');
  }

  const { baseUrl, model, apiKey } = aiConfig();
  const payload = {
    model,
    temperature: 0.5,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(count) },
      { role: 'user', content: content },
    ],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[quiz-ai] HTTP', res.status, detail.slice(0, 500));
    throw new Error(`فشل الاتصال بالذكاء الاصطناعي (HTTP ${res.status})`);
  }

  const data = await res.json();
  const contentText = data?.choices?.[0]?.message?.content;
  if (typeof contentText !== 'string') {
    throw new Error('لم نحصل على استجابة صالحة من الذكاء الاصطناعي.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitizeJson(contentText));
  } catch {
    throw new Error('استجابة الذكاء الاصطناعي غير قابلة للقراءة. حاول مرة أخرى.');
  }

  const questions = validateQuestions(
    Array.isArray(parsed) ? parsed : (parsed as { questions?: unknown } | null)?.questions
  );

  if (questions.length === 0) {
    throw new Error('لم نتمكن من توليد أسئلة صالحة من هذا المحتوى. حاول مرة أخرى.');
  }

  return questions.slice(0, count);
}

// 🧠 مساعد مستر عبدالرحمن ناصر — Interactive quiz generator (اختبرني)

import { prisma } from '@/lib/db';
import { askModel } from './chat';
import { buildSystemPrompt, gradeLabel, type AssistantContext } from './system-prompt';
import type { AiSettings } from './chat';

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
}

export interface InteractiveQuiz {
  title: string;
  questions: QuizQuestion[];
}

/** Pull real question-bank items from the platform for the student's grade/topic. */
async function loadBankQuestions(grade?: string, topicTitle?: string): Promise<{ q: string; a: string; e?: string }[]> {
  try {
    const where: Record<string, unknown> = {};
    if (grade) where.grade = grade;
    const questions = await prisma.question.findMany({
      where,
      include: { topic: true },
      take: 30,
      orderBy: { createdAt: 'desc' },
    });
    const filtered = topicTitle && questions.length > 10
      ? questions.filter((q) => q.topic?.title?.includes(topicTitle)).slice(0, 10)
      : questions.slice(0, 10);
    return filtered.map((q) => ({
      q: q.question,
      a: q.correctAnswer,
      e: q.explanation || undefined,
    }));
  } catch {
    return [];
  }
}

export async function generateInteractiveQuiz(input: {
  grade?: string;
  topicTitle?: string;
  subject?: string;
  count?: number;
  ctx: AssistantContext;
  settings: AiSettings;
}): Promise<InteractiveQuiz | null> {
  const count = Math.min(10, Math.max(3, input.count || 5));
  const bank = await loadBankQuestions(input.grade, input.topicTitle);

  const system = buildSystemPrompt(input.ctx);
  const userPayload: Record<string, unknown> = {
    task:
      'أنشئ اختباراً تفاعلياً قصيراً في الرياضيات بالعربية المصرية حسب الصف الدراسي والمادة المحددة. أعد JSON فقط بالشكل التالي: {"title":"عنوان الاختبار","questions":[{"question":"السؤال","options":["أ","ب","ج","د"],"answer":0,"explanation":"شرح الإجابة والخطوات"}]} حيث answer هو رقم الخيار الصحيح (يبدأ من 0). أضف أمثلة من بنك أسئلة المنصة عندما تتوفر.',

    grade: input.grade ? gradeLabel(input.grade) : undefined,
    subject: input.subject || 'الرياضيات',
    topic: input.topicTitle || 'عام',
    question_count: count,
    bank_questions: bank.length ? bank : undefined,
  };

  const result = await askModel(
    [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(userPayload) },
    ],
    { temperature: 0.6, maxTokens: 2500 }
  );

  if (!result) return null;

  // Validate & sanitize the JSON output.
  const raw = result.content;
  let parsed: unknown;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : null;
  } catch {
    return null;
  }

  const obj = parsed as { questions?: unknown[]; title?: unknown };
  if (!obj || !Array.isArray(obj.questions)) return null;

  const questions: QuizQuestion[] = [];
  for (const item of obj.questions as Record<string, unknown>[]) {
    const q = item as { question?: unknown; options?: unknown; answer?: unknown; explanation?: unknown };
    if (typeof q.question !== 'string' || !Array.isArray(q.options)) continue;
    const options = q.options.map((o) => String(o)).filter(Boolean);
    if (options.length < 2) continue;
    let answer = typeof q.answer === 'number' ? q.answer : Number(q.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) answer = 0;
    questions.push({
      question: q.question,
      options,
      answer,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    });
  }

  if (questions.length === 0) return null;
  return {
    title: typeof obj.title === 'string' && obj.title ? obj.title : 'اختبر نفسك',
    questions,
  };
}

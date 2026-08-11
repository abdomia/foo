import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { generateFromSourceSchema } from '@/lib/validation';
import { detectSourceType, extractContentFromSource, type SourceType } from '@/lib/quiz-ai/sources';
import { generateQuestionsFromContent } from '@/lib/quiz-ai/generate';
import { notifyAllUsers } from '@/lib/notifications';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = generateFromSourceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const {
    sourceUrl,
    sourceType,
    title,
    description,
    topicId,
    timeLimit,
    passingScore = 70,
    questionCount,
    grade,
    accessType = 'FREE',
  } = parsed.data;

  const type: SourceType | null = sourceType ?? detectSourceType(sourceUrl);
  if (!type) {
    return NextResponse.json(
      {
        success: false,
        error:
          'تعذر تحديد نوع الرابط. استخدم رابط ملف PDF مباشر (ينتهي بـ .pdf) أو رابط فيديو يوتيوب.',
      },
      { status: 400 }
    );
  }

  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) {
    return NextResponse.json({ success: false, error: 'المادة/الموضوع غير موجود' }, { status: 400 });
  }

  try {
    const content = await extractContentFromSource(sourceUrl, type);
    const generated = await generateQuestionsFromContent(content, questionCount);

    const quiz = await prisma.quiz.create({
      data: {
        title,
        description: description ?? null,
        grade: grade ?? null,
        topicId,
        timeLimit: timeLimit ?? null,
        passingScore,
        accessType,
        questions: {
          create: generated.map((q, index) => ({
            question: q.question,
            type: 'multiple-choice',
            options: q.options,
            correctAnswer: q.correctAnswer,
            difficulty: q.difficulty,
            explanation: q.explanation ?? null,
            order: index,
            topicId,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        topic: { select: { id: true, title: true, grade: true } },
      },
    });

    await notifyAllUsers({
      type: 'new_quiz',
      title: 'اختبار جديد',
      body: title,
      link: '/quizzes',
      grade,
    });

    return NextResponse.json({
      success: true,
      data: quiz,
      generatedCount: quiz.questions.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    console.error('[quiz-ai] generate-from-source failed:', err);
    const known = [
      'تعذر تنزيل الملف',
      'لا يشير إلى ملف PDF',
      'تعذر قراءة ملف PDF',
      'لم نستخرج نصاً كافياً',
      'رابط يوتيوب غير صالح',
      'Too Many Requests',
      'لا يحتوي على ترجمة',
      'تعذر جلب نسخة',
      'الذكاء الاصطناعي غير مفعّل',
      'فشل الاتصال',
      'غير قابلة للقراءة',
      'لم نتمكن من توليد',
    ];
    if (known.some((k) => message.includes(k))) {
      return NextResponse.json({ success: false, error: message }, { status: 422 });
    }
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء توليد الاختبار. حاول مرة أخرى.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { getAiSettings, generateAssistantReply, imageSize, type AiSettings } from '@/lib/ai-assistant/chat';
import { isAiConfigured } from '@/lib/ai-assistant/config';
import { generateInteractiveQuiz, type InteractiveQuiz } from '@/lib/ai-assistant/quiz';
import { webSearch } from '@/lib/ai-assistant/sources';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Simple in-memory per-user daily counter + usage ledger in DB kept minimal.
const dailyBuckets = new Map<string, { day: string; count: number }>();

async function quotaLeft(userId: string, settings: AiSettings): Promise<{ left: number }> {
  const key = `${userId}:${dayKey()}`;
  const rec = dailyBuckets.get(key);
  if (!rec || rec.day !== dayKey()) {
    dailyBuckets.set(key, { day: dayKey(), count: 0 });
    return { left: settings.dailyLimit };
  }
  return { left: Math.max(0, settings.dailyLimit - rec.count) };
}

async function consumeQuota(userId: string, settings: AiSettings): Promise<void> {
  const key = `${userId}:${dayKey()}`;
  const rec = dailyBuckets.get(key);
  if (!rec || rec.day !== dayKey()) {
    dailyBuckets.set(key, { day: dayKey(), count: 1 });
    return;
  }
  rec.count += 1;
  if (rec.count > settings.dailyLimit) {
    // Reset at limit so the same request doesn't block further attempts this day.
    rec.count = settings.dailyLimit;
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (!rateLimit(request, 20, 60_000)) return tooManyRequests();

  const settings = await getAiSettings();
  if (!settings.enabled) {
    return NextResponse.json(
      { success: false, error: 'المساعد الذكي متوقف حالياً من قبل الإدارة، حاول لاحقاً' },
      { status: 403 }
    );
  }
  if (!isAiConfigured()) {
    return NextResponse.json(
      { success: false, error: 'لم يتم ضبط مزود الذكاء الاصطناعي بعد، تواصل مع الإدارة' },
      { status: 501 }
    );
  }

  const { left } = await quotaLeft(user.id, settings);
  if (left <= 0) {
    return NextResponse.json(
      { success: false, error: `وصلت للحد اليومي (${settings.dailyLimit} رسالة). ارجع بكرة أو استخدم المصادر بالمنصة.` },
      { status: 429 }
    );
  }

  let body: {
    conversationId?: string;
    message?: string;
    image?: string; // base64 data URL
    mode?: 'chat' | 'quiz';
    topic?: string;
    subject?: string;
    cloneMessages?: { role: 'user' | 'assistant'; content: string }[];
    regenerate?: boolean;
  } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const message = (body.message || '').trim();
  const image = body.image || '';

  if (body.mode === 'quiz') {
    return handleQuiz(user.id, user.grade, body.topic, body.subject || 'الرياضيات', settings, body.conversationId);
  }

  if (!message && !image) {
    return NextResponse.json({ success: false, error: 'اكتب سؤالك أو ارفع صورة المسألة' }, { status: 400 });
  }

  // Image validation.
  if (image) {
    if (!settings.allowImages) {
      return NextResponse.json({ success: false, error: 'رفع الصور غير مفعّل حالياً' }, { status: 403 });
    }
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(image)) {
      return NextResponse.json({ success: false, error: 'صيغة الصورة غير مدعومة' }, { status: 400 });
    }
    if (imageSize(image) > MAX_IMAGE_BYTES) {
      return NextResponse.json({ success: false, error: 'حجم الصورة كبير جداً (الحد 6 ميجا)' }, { status: 413 });
    }
  }

  try {
    // Resolve conversation.
    let conversationId = body.conversationId || '';
    if (conversationId) {
      const owns = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        select: { id: true },
      });
      if (!owns) {
        return NextResponse.json({ success: false, error: 'هذه المحادثة غير متاحة لك' }, { status: 403 });
      }
    } else {
      // Auto title from the first user message.
      const titleRaw = message ? message.replace(/\n+/g, ' ').slice(0, 60) : 'سؤال بصوره';
      const existing = await prisma.conversation.count({ where: { userId: user.id } });
      // Only auto-title the very first conversation; otherwise keep generic.
      const conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: existing === 0 && titleRaw ? titleRaw : 'محادثة جديدة',
          subject: body.subject || 'math',
        },
      });
      conversationId = conversation.id;
    }

    // Persist the user message (with optional image) — unless regenerating.
    const isRegenerate = Boolean(body.regenerate);
    const userMessage = isRegenerate
      ? null
      : await prisma.conversationMessage.create({
          data: {
            conversationId,
            role: 'user',
            content: image ? (message || '[ارفاق صورة لمسألة]') : message,
            contentType: image ? 'image' : 'text',
            imageData: image || null,
          },
        });

    // Build message list for the model.
    let history: { role: 'user' | 'assistant'; content: string }[] =
      Array.isArray(body.cloneMessages) ? body.cloneMessages : [];

    // Ground on earlier turns if not regenerating with prior context.
    if (!isRegenerate && history.length === 0) {
      const prior = await prisma.conversationMessage.findMany({
        where: { conversationId, id: { not: userMessage!.id } },
        orderBy: { createdAt: 'asc' },
        select: { role: true, content: true },
        take: 40,
      });
      history = prior.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    }
    // On regenerate the cloneMessages already include the user's last prompt.
    if (!isRegenerate) {
      history.push({ role: 'user', content: image ? buildImagePrompt(message) : message });
    }

    await consumeQuota(user.id, settings);

    // Optional web search when the student asks for external explanation/search.
    let webResults: { url: string; title: string; snippet: string }[] | undefined;
    const wantsSearch =
      settings.allowWebSearch &&
      /(ابحث|دوّر|بحث|من الإنترنت|اشرحلي من|فيديو|يوتيوب|شرح إضافي|أونلاين)/i.test(message);
    if (!image && wantsSearch) {
      const q = message.slice(0, 120);
      webResults = await webSearch(q, 4);
    }

    const result = await generateAssistantReply({
      messages: history,
      ctx: { studentName: user.name, grade: user.grade || undefined, subject: body.subject || 'الرياضيات' },
      subject: body.subject || 'الرياضيات',
      settings,
      webResults,
    });

    let replyText = '';
    if (!result) {
      replyText =
        'آسف، حصلت مشكلة مؤقتة في الاتصال بالمساعد الذكي. حاول تاني بعد شوية، أو راجع مصادر المنصة من القائمة. 🙏';
    } else {
      replyText = result.content;
    }

    const assistantMessage = await prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: replyText,
        contentType: 'text',
      },
    });

    // Update conversation title if it was auto first message & short.
    if (!body.conversationId && message && conversationId) {
      const conv = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { title: true } });
      if (conv?.title === 'محادثة جديدة' && message) {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { title: message.replace(/\n+/g, ' ').slice(0, 60) || 'محادثة جديدة' },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        userMessageId: userMessage?.id ?? null,
        assistantMessageId: assistantMessage.id,
        reply: replyText,
        left,
      },
    });
  } catch (error) {
    console.error('[ai-assistant:chat] error:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}

function buildImagePrompt(text: string): string {
  const ok = text.trim();
  return ok
    ? `هذه صورة لمسألة رياضيات. المطلوب الذي كتبه الطالب مع الصورة: "${ok}".\n\nاقرأ المسألة من الصورة، حدد المطلوب، واذكر القانون أو الفكرة المطلوبة، ثم الحل خطوة بخطوة، ثم وضح الأخطاء المحتملة، وأخيراً النتيجة النهائية.`
    : 'هذه صورة لمسألة رياضيات. اقرأ المسألة من الصورة، حدد المطلوب، واذكر القانون أو الفكرة المطلوبة، ثم الحل خطوة بخطوة، ثم وضح الأخطاء المحتملة، وأخيراً النتيجة النهائية.';
}

async function handleQuiz(
  userId: string,
  grade: string | undefined,
  topic: string | undefined,
  subject: string,
  settings: AiSettings,
  existingConversationId?: string
) {
  // Reuse the caller's conversation if it belongs to the user.
  let conversationId = existingConversationId || '';
  if (conversationId) {
    const owns = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: { id: true },
    });
    if (!owns) conversationId = '';
  }
  if (!conversationId) {
    const conv = await prisma.conversation.create({
      data: { userId, title: 'اختبر نفسي 🤓', subject },
    });
    conversationId = conv.id;
  }

  await consumeQuota(userId, settings);
  await prisma.conversationMessage.create({
    data: {
      conversationId,
      role: 'user',
      content: `🔎 اختبرني في: ${topic || subject}`,
      contentType: 'text',
    },
  });

  const quiz = await generateInteractiveQuiz({
    grade,
    topicTitle: topic,
    subject,
    ctx: { grade, subject },
    settings,
  });

  const content = quiz ? JSON.stringify(quiz) : JSON.stringify({
    title: 'اختبر نفسك',
    questions: [],
  } satisfies InteractiveQuiz);

  const assistantMsg = await prisma.conversationMessage.create({
    data: {
      conversationId,
      role: 'assistant',
      content,
      contentType: 'quiz',
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      conversationId,
      quizMessageId: assistantMsg.id,
      quiz,
      reply: content,
    },
  });
}

// 🧠 مساعد مستر عبدالرحمن ناصر — Chat engine (server-only)

import { prisma } from '@/lib/db';
import { aiBaseUrl, aiModel, aiApiKey, isAiConfigured } from './config';
import { buildSystemPrompt, gradeLabel, type AssistantContext } from './system-prompt';

export interface AiSettings {
  enabled: boolean;
  dailyLimit: number;
  allowImages: boolean;
  allowWebSearch: boolean;
  allowYouTube: boolean;
}

export async function getAiSettings(): Promise<AiSettings> {
  let s = await prisma.siteSetting.findUnique({ where: { id: 'platform' } });
  if (!s) {
    s = await prisma.siteSetting.create({ data: { id: 'platform' } });
  }
  return {
    enabled: s.aiEnabled,
    dailyLimit: s.aiDailyLimit,
    allowImages: s.aiAllowImages,
    allowWebSearch: s.aiAllowWebSearch,
    allowYouTube: s.aiAllowYouTube,
  };
}

/** Platform content as context so the assistant grounds answers in الرائد first. */
export async function loadPlatformContext(grade?: string, subject?: string): Promise<string> {
  try {
    const topics = await prisma.topic.findMany({
      where: grade ? { grade } : {},
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { grade: grade || undefined },
          select: { title: true, summary: true, type: true },
          take: 20,
        },
      },
      take: 12,
    });

    const blocks: string[] = [];
    for (const t of topics) {
      lines: if (t.lessons.length === 0) break lines;
      const lessonLines = t.lessons
        .filter((l) => l.title)
        .map((l) => {
          const typeLabel =
            l.type === 'practice' ? 'تمرين' : l.type === 'audio_summary' ? 'ملخص صوتي' : 'شرح';
          const summary = l.summary && l.summary.trim() ? ` — ${l.summary.slice(0, 300)}` : '';
          return `- [${typeLabel}] ${l.title}${summary}`;
        })
        .join('\n');
      blocks.push(`### ${t.title}\n${lessonLines}`);
    }

    if (blocks.length === 0) return '';
    const scope = subject ? ` (المادة: ${subject})` : '';
    return `محتوى منصة «الرائد في الرياضيات»${grade ? ` للصف ${gradeLabel(grade)}` : ''}${scope} — استخدمه كمصدر أساسي:\n\n${blocks.join('\n\n')}`;
  } catch {
    return '';
  }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatTools {
  doesWebSearch?: boolean;
  doesYouTube?: boolean;
}

export interface AskResult {
  content: string;
  tokensUsed?: number;
}

// Extract plain text from a potential base64 data URL (for length checks).
export function imageSize(dataUrl: string): number {
  try {
    const base64 = dataUrl.split(',')[1] || '';
    return Math.round((base64.length * 3) / 4);
  } catch {
    return dataUrl.length;
  }
}

/**
 * Non-streaming chat call. Used for quizzes/structured tasks.
 * Returns null on any failure.
 */
export async function askModel(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; tools?: ChatTools } = {}
): Promise<AskResult | null> {
  if (!isAiConfigured()) return null;

  const payload: Record<string, unknown> = {
    model: aiModel(),
    temperature: opts.temperature ?? 0.5,
    max_tokens: opts.maxTokens ?? 1500,
    messages,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(`${aiBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiApiKey()}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.error('[ai-assistant:chat] HTTP', res.status);
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) return null;
    return {
      content,
      tokensUsed: data?.usage?.total_tokens ?? undefined,
    };
  } catch (error) {
    clearTimeout(timer);
    console.error('[ai-assistant:chat] error:', error);
    return null;
  }
}

/** Full assistant reply with platform context. Returns null if AI off/fails. */
export async function generateAssistantReply(input: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  ctx: AssistantContext;
  subject?: string;
  settings: AiSettings;
  tools?: ChatTools;
  webResults?: { url: string; title: string; snippet: string }[];
}): Promise<AskResult | null> {
  const system = buildSystemPrompt(input.ctx);
  const platform = await loadPlatformContext(input.ctx.grade, input.subject);

  const messages: ChatMessage[] = [{ role: 'system', content: system }];
  if (platform) messages.push({ role: 'system', content: platform });

  // Optional: external "شرح إضافي" grounding — clearly marked as external source.
  if (input.webResults && input.webResults.length > 0) {
    const external = input.webResults
      .map((r) => `- ${r.title}\n  ${r.url}\n  ${r.snippet}`)
      .join('\n');
    messages.push({
      role: 'system',
      content:
        'مرجع خارجي (شرح إضافي) تم جلبه من الإنترنت كمساعد فقط. لا تنسب محتواه إلى مستر عبدالرحمن ناصر، وقم بإدراج الرابط كـ«شرح إضافي» إن استشهدت به:\n\n' +
        external,
    });
  }

  for (const m of input.messages) {
    messages.push({ role: m.role, content: m.content });
  }

  return askModel(messages, { tools: input.tools });
}

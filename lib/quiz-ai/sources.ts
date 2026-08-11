import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { fetchTranscript } from 'youtube-transcript';

const MAX_CONTENT_CHARS = 80_000;

export type SourceType = 'pdf' | 'youtube';

export function detectSourceType(rawUrl: string): SourceType | null {
  const url = rawUrl.trim();
  if (/\.pdf($|\?)/i.test(url) || /^https?:\/\/.+\.pdf/i.test(url)) return 'pdf';
  if (
    /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)|youtu\.be\/)/i.test(url)
  ) {
    return 'youtube';
  }
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return null;
}

export function extractYouTubeVideoId(rawUrl: string): string | null {
  const url = rawUrl.trim();
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?.*v=([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  if (/^[\w-]{11}$/.test(url)) return url;
  return null;
}

async function fetchPdfBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/pdf,*/*' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`تعذر تنزيل الملف (HTTP ${res.status})`);
    }
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.includes('pdf') && !url.endsWith('.pdf')) {
      throw new Error('الرابط لا يشير إلى ملف PDF صالح');
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const loadingTask = getDocument({ data: new Uint8Array(buffer), useSystemFonts: true });
  let doc;
  try {
    doc = await loadingTask.promise;
  } catch {
    throw new Error('تعذر قراءة ملف PDF. تأكد أنه ملف PDF سليم وغير محمي بكلمة مرور.');
  }
  try {
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? String(item.str) : ''))
        .join(' ');
      pages.push(pageText);
    }
    await loadingTask.destroy().catch(() => {});
    return pages.join('\n\n');
  } catch {
    await loadingTask.destroy().catch(() => {});
    throw new Error('تعذر قراءة ملف PDF. تأكد أنه ملف PDF سليم وغير محمي بكلمة مرور.');
  }
}

export async function extractPdfText(url: string): Promise<string> {
  const buffer = await fetchPdfBuffer(url);
  const raw = await parsePdfBuffer(buffer);
  const text = raw
    .replace(/\u0000/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 60) {
    throw new Error('لم نستخرج نصاً كافياً من الملف. تأكد أنه PDF نصي وليس صوراً ممسوحة ضوئياً.');
  }
  return text.length > MAX_CONTENT_CHARS ? text.slice(0, MAX_CONTENT_CHARS) : text;
}

export async function extractYoutubeTranscript(url: string): Promise<string> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('رابط يوتيوب غير صالح. استخدم watch?v= أو youtu.be أو shorts.');
  }

  let entries: { text: string }[];
  try {
    entries = await fetchTranscript(videoId);
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (/Too Many Requests|429/i.test(message)) {
      throw new Error('يوتيوب حظر الطلب مؤقتاً (Too Many Requests). حاول مرة أخرى بعد قليل.');
    }
    if (/Disabled|Not Available|unavailable/i.test(message)) {
      throw new Error('الفيديو لا يحتوي على ترجمة/نسخة نصية متاحة.');
    }
    throw new Error('تعذر جلب نسخة الفيديو النصية من يوتيوب.');
  }

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('الفيديو لا يحتوي على ترجمة/نسخة نصية متاحة.');
  }

  const text = entries
    .map((entry) => entry?.text?.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length < 60) {
    throw new Error('لم نستخرج نصاً كافياً من الفيديو.');
  }
  return text.length > MAX_CONTENT_CHARS ? text.slice(0, MAX_CONTENT_CHARS) : text;
}

export async function extractContentFromSource(url: string, type: SourceType): Promise<string> {
  return type === 'pdf' ? extractPdfText(url) : extractYoutubeTranscript(url);
}

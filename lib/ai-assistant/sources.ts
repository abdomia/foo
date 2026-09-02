// 🧠 مساعد مستر عبدالرحمن ناصر — External source helpers (used only when enabled)

import { extractYouTubeVideoId, extractYoutubeTranscript } from '@/lib/quiz-ai/sources';

/** Build a search query URL for the assistant to fetch (Google/Bing text search). */
export function searchQueryUrl(query: string): string {
  return `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
}

export interface WebSourceResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * Lightweight web search via Bing HTML scraping (no extra API key needed).
 * Returns [] on any failure so the assistant degrades gracefully.
 */
export async function webSearch(query: string, limit = 5): Promise<WebSourceResult[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(searchQueryUrl(query), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept-Language': 'ar,en;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];

    const html = await res.text();
    const results: WebSourceResult[] = [];

    // Parse <li class="b_algo"> blocks roughly.
    const liRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/g;
    let match: RegExpExecArray | null;
    let guard = 0;
    while ((match = liRegex.exec(html)) && guard++ < limit) {
      const block = match[1];
      const href = block.match(/<a[^>]*href="([^"]+)"/)?.[1];
      const title = block.match(/<a[^>]*>(.*?)<\/a>/)?.[1];
      const snippet = block.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1];
      if (href && href.startsWith('http') && !href.includes('bing.com')) {
        results.push({
          url: href,
          title: (title || '').replace(/<[^>]+>/g, '').trim().slice(0, 120),
          snippet: (snippet || '').replace(/<[^>]+>/g, '').trim().slice(0, 240),
        });
      }
      if (results.length >= limit) break;
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Try to fetch YouTube transcript for a lesson to use as "شرح إضافي" grounding.
 * Returns trimmed text or null if unavailable.
 */
export async function fetchYouTubeTranscriptForLesson(url: string): Promise<string | null> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  try {
    const text = await extractYoutubeTranscript(url);
    return text.slice(0, 6000);
  } catch {
    return null;
  }
}

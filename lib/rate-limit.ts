import type { NextRequest } from 'next/server';

const buckets = new Map<string, number[]>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function rateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const key = `${clientIp(request)}`;
  const entries = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (entries.length >= limit) {
    buckets.set(key, entries);
    return false;
  }

  entries.push(now);
  buckets.set(key, entries);
  return true;
}

export function tooManyRequests(): Response {
  return Response.json(
    { success: false, error: 'محاولات كثيرة، حاول لاحقاً' },
    { status: 429 }
  );
}

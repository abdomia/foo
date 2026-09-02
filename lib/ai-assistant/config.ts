// 🧠 مساعد مستر عبدالرحمن ناصر — AI config (server-only)

export function aiBaseUrl(): string {
  return (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
}

export function aiModel(): string {
  return process.env.AI_MODEL || 'gpt-4o-mini';
}

export function aiApiKey(): string | undefined {
  return process.env.AI_API_KEY || undefined;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

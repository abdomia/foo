export function isAiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export function aiConfig() {
  return {
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    apiKey: process.env.AI_API_KEY || '',
  };
}

function parseJsonValue<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      // Not JSON — fall through.
    }
  }
  return [];
}

export function normalizeKeyPoints(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseJsonValue<unknown>(value);
    if (parsed.length > 0) {
      return parsed.map((p) => String(p ?? '').trim()).filter(Boolean);
    }
    return value
      .split(/\r?\n|،|;|•|-/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.values(value)
      .map((p) => String(p ?? '').trim())
      .filter(Boolean);
  }
  return parseJsonValue<string>(value);
}

export interface LessonFile {
  title: string;
  url: string;
  type?: string;
}

export function normalizeFiles(value: unknown): LessonFile[] {
  if (typeof value === 'string' && value.trim()) {
    const parsed = parseJsonValue<unknown>(value);
    if (parsed.length > 0) {
      return normalizeFiles(parsed);
    }
    if (/^https?:\/\//i.test(value.trim())) {
      return [{ title: 'ملف الدرس', url: value.trim() }];
    }
    return [];
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (obj.url) {
      return [
        {
          title: String(obj.title ?? 'ملف الدرس'),
          url: String(obj.url),
          type: obj.type ? String(obj.type) : undefined,
        },
      ];
    }
    return [];
  }
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  return items
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      title: String(item.title ?? 'ملف الدرس'),
      url: String(item.url ?? ''),
      type: item.type ? String(item.type) : undefined,
    }))
    .filter((f) => f.url.trim());
}

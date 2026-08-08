import { AccessLevel, canAccessContent, getUserAccessLevel } from '@/lib/subscription';
import type { SafeUser } from '@/lib/auth';

// Metadata stays visible; protected fields are stripped for unauthorized users.

// Admins see everything; anonymous users get FREE.
export async function getEffectiveAccessLevel(user: SafeUser | null): Promise<AccessLevel> {
  if (user?.isAdmin) return 'PREMIUM';
  if (!user) return 'FREE';
  return getUserAccessLevel(user.id);
}

export function gateLesson<T extends { accessType?: string | null }>(lesson: T, level: AccessLevel): T & { locked?: boolean; videoUrl?: string | null } {
  if (canAccessContent(level, lesson.accessType || 'FREE')) return lesson;
  return { ...lesson, videoUrl: null, locked: true };
}

export function gatePdf<T extends { accessType?: string | null }>(pdf: T, level: AccessLevel): T & { locked?: boolean; fileUrl?: string | null } {
  if (canAccessContent(level, pdf.accessType || 'FREE')) return pdf;
  return { ...pdf, fileUrl: null, locked: true };
}

export function gateQuiz<T extends { accessType?: string | null }>(quiz: T, level: AccessLevel): T & { locked?: boolean; questions?: unknown[] } {
  if (canAccessContent(level, quiz.accessType || 'FREE')) return { ...quiz, locked: false };
  return { ...quiz, questions: [], locked: true };
}

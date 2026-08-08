import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { awardXp, recordAnsweredQuestions, touchStreak, XP } from '@/lib/gamification';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const { correct } = (body ?? {}) as Record<string, unknown>;
  if (typeof correct !== 'boolean') {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    await touchStreak(user.id);
    await awardXp(user.id, XP.PRACTICE_SOLVED, 'practice_solved');
    if (correct) {
      await awardXp(user.id, XP.CORRECT_ANSWER, 'correct_answer');
    }
    await recordAnsweredQuestions(user.id, 1);

    return NextResponse.json({
      success: true,
      data: { xpEarned: correct ? XP.PRACTICE_SOLVED + XP.CORRECT_ANSWER : XP.PRACTICE_SOLVED },
    });
  } catch (error) {
    console.error('Error recording practice result:', error);
    return NextResponse.json({ success: false, error: 'Failed to record practice result' }, { status: 500 });
  }
}

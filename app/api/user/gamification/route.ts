import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { levelInfo, touchStreak } from '@/lib/gamification';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    await touchStreak(user.id);

    const [stats, badges, recentXp] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          xp: true,
          level: true,
          streak: true,
          streakBest: true,
          questionsAnswered: true,
          quizzesTaken: true,
          unitsCompleted: true,
        },
      }),
      prisma.badge.findMany({
        where: { userId: user.id },
        orderBy: { awardedAt: 'desc' },
      }),
      prisma.xpLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!stats) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...levelInfo(stats.xp),
        storedLevel: stats.level,
        streak: stats.streak,
        streakBest: stats.streakBest,
        questionsAnswered: stats.questionsAnswered,
        quizzesTaken: stats.quizzesTaken,
        unitsCompleted: stats.unitsCompleted,
        badges,
        recentXp: recentXp.map((log) => ({
          amount: log.amount,
          reason: log.reason,
          createdAt: log.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching gamification data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch gamification data' }, { status: 500 });
  }
}

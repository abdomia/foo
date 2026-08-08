import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        quizProgress: true,
        lessonProgress: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const completedLessons = dbUser.lessonProgress?.filter(l => l.completed).length || 0;
    const completedExercises = dbUser.quizProgress.filter(q => q.passed).length;
    const quizzesTaken = dbUser.quizProgress.length;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentProgress = await prisma.userQuizProgress.count({
      where: {
        userId: user.id,
        completedAt: { gte: sevenDaysAgo },
      },
    });

    const stats = {
      lessonsCompleted: completedLessons,
      exercisesCompleted: completedExercises,
      totalHours: (dbUser.quizProgress.length * 15) / 60,
      quizzesPassed: quizzesTaken,
      streak: recentProgress > 0 ? Math.ceil(recentProgress / 2) : 0,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch progress' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';

export async function GET() {
  const parent = await getSessionUser();
  if (!parent) return unauthorized();
  if (parent.role !== 'parent' && !parent.isAdmin) return forbidden();

  try {
    const links = await prisma.parentStudent.findMany({
      where: { parentId: parent.id, student: { role: 'student' } },
      orderBy: { createdAt: 'asc' },
      select: {
        canEdit: true,
        student: {
          select: {
            id: true,
            name: true,
            grade: true,
            avatar: true,
            isSubscribed: true,
            subscriptionPlan: true,
            subscriptionExpiry: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: links.map((l) => ({
        id: l.student.id,
        name: l.student.name,
        grade: l.student.grade,
        avatar: l.student.avatar,
        isSubscribed: l.student.isSubscribed,
        subscriptionPlan: l.student.subscriptionPlan,
        subscriptionExpiry: l.student.subscriptionExpiry?.toISOString() ?? null,
        canEdit: l.canEdit,
      })),
    });
  } catch (error) {
    console.error('Parent students error:', error);
    return NextResponse.json(
      { success: false, error: 'تعذر تحميل قائمة الأبناء' },
      { status: 500 }
    );
  }
}

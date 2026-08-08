import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { buildStudentReport } from '@/lib/report';

export async function GET(request: NextRequest) {
  const parent = await getSessionUser();
  if (!parent) return unauthorized();
  if (parent.role !== 'parent' && !parent.isAdmin) return forbidden();

  const studentId = new URL(request.url).searchParams.get('studentId');
  if (!studentId) {
    return NextResponse.json(
      { success: false, error: 'studentId مطلوب' },
      { status: 400 }
    );
  }

  try {
    // Parent must be linked to this student to view their report.
    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId } },
      select: { canEdit: true },
    });
    if (!link) return forbidden();

    const [report, certificates] = await Promise.all([
      buildStudentReport(studentId),
      prisma.certificate.findMany({
        where: { userId: studentId },
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          certificateId: true,
          courseTitle: true,
          completionPercent: true,
          issuedAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        canEdit: link.canEdit,
        certificates: certificates.map((c) => ({
          id: c.id,
          certificateId: c.certificateId,
          courseTitle: c.courseTitle,
          completionPercent: c.completionPercent,
          issuedAt: c.issuedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Parent report error:', error);
    return NextResponse.json(
      { success: false, error: 'تعذر تحميل التقرير' },
      { status: 500 }
    );
  }
}

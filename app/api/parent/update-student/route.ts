import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  studentId: z.string().min(1),
  grade: z.string().trim().min(1).max(60).optional(),
});

export async function PATCH(request: NextRequest) {
  const parent = await getSessionUser();
  if (!parent) return unauthorized();
  if (parent.role !== 'parent' && !parent.isAdmin) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const { studentId, grade } = parsed.data;

    const link = await prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId } },
      select: { canEdit: true },
    });
    if (!link) return forbidden();

    // Explicit edit permission required — parents can only view by default.
    if (!link.canEdit) {
      return NextResponse.json(
        { success: false, error: 'ليست لديك صلاحية تعديل بيانات الطالب' },
        { status: 403 }
      );
    }

    const student = await prisma.user.update({
      where: { id: studentId },
      data: grade !== undefined ? { grade } : {},
      select: { id: true, name: true, grade: true },
    });

    return NextResponse.json({ success: true, data: student });
  } catch (error) {
    console.error('Parent update-student error:', error);
    return NextResponse.json(
      { success: false, error: 'تعذر تحديث بيانات الطالب' },
      { status: 500 }
    );
  }
}

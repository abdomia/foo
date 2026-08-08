import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, videoUrl, duration, order, type, grade, accessType } = body;

    const lesson = await prisma.lesson.update({
      where: { id },
      data: {
        title,
        description,
        videoUrl,
        duration: duration ?? undefined,
        grade: grade ?? undefined,
        order: order ?? undefined,
        type: type ?? undefined,
        accessType: accessType ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: lesson });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({ success: false, error: 'Failed to update lesson' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.lesson.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete lesson' }, { status: 500 });
  }
}

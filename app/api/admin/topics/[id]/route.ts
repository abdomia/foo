import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminTopicSchema } from '@/lib/validation';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = adminTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { title, description = '', icon = 'BookOpen', order = 0, grade } = parsed.data;

    const topic = await prisma.topic.update({
      where: { id },
      data: {
        title,
        description,
        icon,
        grade: grade ?? undefined,
        order: order ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to update topic' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  try {
    const { id } = await params;
    await prisma.topic.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete topic' }, { status: 500 });
  }
}

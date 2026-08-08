import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminAdviceSchema } from '@/lib/validation';

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const advice = await prisma.advice.findUnique({
      where: { id },
    });
    
    if (!advice) {
      return NextResponse.json({ success: false, error: 'Advice not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: advice });
  } catch (error) {
    console.error('Failed to fetch advice:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch advice' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = adminAdviceSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { title, content, videoUrl, type, grade, order, isActive } = parsed.data;

    const advice = await prisma.advice.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl ?? null }),
        ...(type !== undefined && { type }),
        ...(grade !== undefined && { grade }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: advice });
  } catch (error) {
    console.error('Failed to update advice:', error);
    return NextResponse.json({ success: false, error: 'Failed to update advice' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.advice.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete advice:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete advice' }, { status: 500 });
  }
}
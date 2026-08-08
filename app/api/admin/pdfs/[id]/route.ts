import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminPdfSchema } from '@/lib/validation';
import { getEffectiveAccessLevel, gatePdf } from '@/lib/content-access';

async function requireAdmin() {
  const admin = await getSessionUser();
  if (!admin) return { error: unauthorized() as NextResponse };
  if (!admin.isAdmin) return { error: forbidden() as NextResponse };
  return { error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    const accessLevel = await getEffectiveAccessLevel(user);
    const pdf = await prisma.pdf.findUnique({
      where: { id },
    });
    if (!pdf) {
      return NextResponse.json({ success: false, error: 'PDF not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: gatePdf(pdf, accessLevel) });
  } catch (error) {
    console.error('Error fetching pdf:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pdf' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  const parsed = adminPdfSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    const { id } = await params;
    const { title, description, fileUrl, order = 0, category = 'explanation', grade = null, topicId, accessType = 'FREE' } = parsed.data;

    const pdf = await prisma.pdf.update({
      where: { id },
      data: {
        title,
        description: description ?? '',
        fileUrl,
        order,
        category,
        grade,
        accessType,
        topicId: topicId ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: pdf });
  } catch (error) {
    console.error('Error updating pdf:', error);
    return NextResponse.json({ success: false, error: 'Failed to update pdf' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.pdf.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pdf:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete pdf' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { adminPdfSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const grade = searchParams.get('grade');

    const where: any = {};
    if (grade) {
      where.OR = [{ grade }, { grade: null }];
    }

    const pdfs = await prisma.pdf.findMany({
      where,
      include: {
        topic: true,
      },
      orderBy: {
        order: 'asc',
      },
    });

    return NextResponse.json({ success: true, data: pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch PDFs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

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
    const { title, description, fileUrl, grade, category = 'explanation', topicId } = parsed.data;

    const lastPdf = await prisma.pdf.findFirst({
      orderBy: { order: 'desc' },
    });
    const newOrder = lastPdf ? lastPdf.order + 1 : 0;

    const pdf = await prisma.pdf.create({
      data: {
        title,
        description: description ?? '',
        fileUrl,
        grade: grade ?? null,
        category,
        topicId: topicId ?? null,
        order: newOrder,
      },
    });

    return NextResponse.json({ success: true, data: pdf });
  } catch (error) {
    console.error('Error creating PDF:', error);
    return NextResponse.json({ success: false, error: 'Failed to create PDF' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'PDF ID required' }, { status: 400 });
    }

    await prisma.pdf.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete PDF' }, { status: 500 });
  }
}
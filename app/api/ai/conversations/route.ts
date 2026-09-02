import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

// GET /api/ai/conversations -> list current user's conversations
// POST /api/ai/conversations -> create a new conversation
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      take: 50,
    });
    return NextResponse.json({ success: true, data: conversations });
  } catch {
    return NextResponse.json({ success: false, error: 'حدث خطأ في جلب المحادثات' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: { title?: string; subject?: string } = {};
  try {
    body = await request.json();
  } catch {
    // ignore
  }

  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title: (body.title || 'محادثة جديدة').slice(0, 200),
        subject: body.subject || 'math',
      },
    });
    return NextResponse.json({ success: true, data: conversation }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'فشل إنشاء المحادثة' }, { status: 500 });
  }
}

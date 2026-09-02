import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// Ensure conversation belongs to current user / admin.
async function ownConversation(id: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const conv = await prisma.conversation.findFirst({ where: { id, userId: user.id } });
  if (!conv && !user.isAdmin) return null;
  return { user, conv };
}

// GET /api/ai/conversations/[id] -> messages of one conversation
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const owner = await ownConversation(id);
  if (!owner) return unauthorized();
  if (!owner.conv && !owner.user.isAdmin) return forbidden();

  try {
    const messages = await prisma.conversationMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        contentType: true,
        feedback: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ success: true, data: messages });
  } catch {
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}

// POST /api/ai/conversations/[id]/feedback -> save 👍/👎 for a message
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: { messageId?: string; feedback?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const feedback = body.feedback === 'up' ? '👍' : body.feedback === 'down' ? '👎' : null;
  if (!body.messageId || !feedback) {
    return NextResponse.json({ success: false, error: 'بيانات غير صالحة' }, { status: 400 });
  }

  try {
    // Message must belong to the same conversation (and by extension the user).
    await prisma.conversationMessage.updateMany({
      where: { id: body.messageId, conversationId: id },
      data: { feedback },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 });
  }
}

// DELETE /api/ai/conversations/[id] -> delete conversation (owner or admin)
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const owner = await ownConversation(id);
  if (!owner) return unauthorized();
  if (!owner.conv && !owner.user.isAdmin) return forbidden();

  try {
    await prisma.conversation.deleteMany({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'لم نتمكن من حذف المحادثة' }, { status: 500 });
  }
}

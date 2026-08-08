import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { notifyAllUsers } from '@/lib/notifications';

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

  const { title, message, grade } = (body ?? {}) as Record<string, unknown>;

  if (typeof title !== 'string' || !title.trim() || title.trim().length > 200) {
    return NextResponse.json({ success: false, error: 'اكتب عنوان الإعلان' }, { status: 400 });
  }

  const gradeValue =
    typeof grade === 'string' && grade.trim() ? grade.trim() : undefined;

  try {
    await notifyAllUsers({
      type: 'announcement',
      title: title.trim(),
      body: typeof message === 'string' && message.trim() ? message.trim() : undefined,
      link: '/',
      grade: gradeValue ?? null,
    });

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (error) {
    console.error('Error sending announcement:', error);
    return NextResponse.json({ success: false, error: 'Failed to send announcement' }, { status: 500 });
  }
}

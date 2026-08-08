import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { avatarSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const parsed = avatarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const updatedUser = await updateUser(user.id, { avatar: parsed.data.avatar });
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, user: updatedUser });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

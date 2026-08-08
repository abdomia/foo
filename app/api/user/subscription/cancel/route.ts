import { NextResponse } from 'next/server';
import { updateUser } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const updatedUser = await updateUser(user.id, {
      isSubscribed: false,
      subscriptionPlan: null,
      subscriptionExpiry: null,
    });

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

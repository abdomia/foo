import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, sanitizeUser } from '@/lib/auth';
import { cancelUserSubscriptions } from '@/lib/subscription';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    await cancelUserSubscriptions(user.id);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: sanitizeUser(updatedUser) });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

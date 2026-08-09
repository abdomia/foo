import { NextResponse } from 'next/server';
import { prisma, getUserById } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    let updated = user;
    if (user.isSubscribed && user.subscriptionExpiry) {
      if (new Date(user.subscriptionExpiry) < new Date()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isSubscribed: false,
            subscriptionPlan: null,
            subscriptionExpiry: null,
          },
        });
        const fresh = await getUserById(user.id);
        if (fresh) updated = fresh;
      }
    }

    return NextResponse.json({ success: true, user: updated });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

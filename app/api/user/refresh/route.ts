import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, sanitizeUser, unauthorized } from '@/lib/auth';

export async function POST() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fullUser) {
      return unauthorized();
    }

    let updated = fullUser;
    if (fullUser.isSubscribed && fullUser.subscriptionExpiry) {
      if (fullUser.subscriptionExpiry < new Date()) {
        updated = await prisma.user.update({
          where: { id: fullUser.id },
          data: {
            isSubscribed: false,
            subscriptionPlan: null,
            subscriptionExpiry: null,
          },
        });
      }
    }

    return NextResponse.json({ success: true, user: sanitizeUser(updated) });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

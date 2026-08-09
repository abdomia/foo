import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, sanitizeUser } from '@/lib/auth';
import { activateCodeSchema } from '@/lib/validation';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { getPlanDurationDays } from '@/lib/subscription';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  if (!rateLimit(request, 5, 60 * 1000)) {
    return tooManyRequests();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  const parsed = activateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'كود غير صالح' },
      { status: 400 }
    );
  }

  try {
    const { code } = parsed.data;
    const now = new Date();

    // Consume the code AND create the subscription inside one transaction so
    // a code can never be marked used without activating the subscription
    // (and never be used twice under concurrent requests).
    const result = await prisma.$transaction(async (tx) => {
      const codeRow = await tx.subscriptionCode.findUnique({ where: { code } });
      if (!codeRow || codeRow.isUsed || now > codeRow.expiresAt) return null;

      const claimed = await tx.subscriptionCode.updateMany({
        where: { code, isUsed: false, expiresAt: { gt: now } },
        data: { isUsed: true, usedBy: user.id, usedAt: now },
      });
      if (claimed.count !== 1) return null;

      const startDate = now;
      const expiryDate = new Date(startDate.getTime() + getPlanDurationDays(codeRow.plan) * 24 * 60 * 60 * 1000);

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          plan: codeRow.plan,
          classKey: null,
          amount: 0,
          paymentId: null,
          status: 'approved',
          startDate,
          expiryDate,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { isSubscribed: true, subscriptionPlan: codeRow.plan, subscriptionExpiry: expiryDate },
      });

      return { subscription, plan: codeRow.plan };
    });

    if (!result) {
      return NextResponse.json({ success: false, error: 'كود التفعيل تم استخدامه بالفعل' }, { status: 400 });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true, user: sanitizeUser(updatedUser!) });
  } catch (error) {
    console.error('Error activating code:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في تفعيل الكود' }, { status: 500 });
  }
}

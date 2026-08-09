import { NextRequest, NextResponse } from 'next/server';
import { useSubscriptionCode as consumeSubscriptionCode, prisma } from '@/lib/db';
import { getSessionUser, unauthorized, sanitizeUser } from '@/lib/auth';
import { activateCodeSchema } from '@/lib/validation';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { activateSubscription } from '@/lib/subscription';

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

    const subscriptionCode = await consumeSubscriptionCode(code, user.id);
    if (!subscriptionCode) {
      return NextResponse.json({ success: false, error: 'كود غير صالح أو منتهي الصلاحية' }, { status: 400 });
    }

    await activateSubscription({
      userId: user.id,
      plan: subscriptionCode.plan,
      classKey: null,
      amount: 0,
      paymentId: null,
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true, user: sanitizeUser(updatedUser!) });
  } catch (error) {
    console.error('Error activating code:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في تفعيل الكود' }, { status: 500 });
  }
}

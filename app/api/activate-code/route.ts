import { NextRequest, NextResponse } from 'next/server';
import { useSubscriptionCode as consumeSubscriptionCode, updateUser } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { activateCodeSchema } from '@/lib/validation';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';

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

    const plan = subscriptionCode.plan;

    const subscriptionExpiry = new Date();
    if (plan === 'monthly') {
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 30);
    } else if (plan === 'semester') {
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 150);
    } else if (plan === 'yearly') {
      subscriptionExpiry.setDate(subscriptionExpiry.getDate() + 365);
    }

    const updatedUser = await updateUser(user.id, {
      isSubscribed: true,
      subscriptionPlan: plan,
      subscriptionExpiry: subscriptionExpiry.toISOString(),
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error activating code:', error);
    return NextResponse.json({ success: false, error: 'حدث خطأ في تفعيل الكود' }, { status: 500 });
  }
}

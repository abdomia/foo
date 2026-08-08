import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { paymentCreateSchema } from '@/lib/validation';
import { getPlanPrice } from '@/lib/classes';
import { createSubscriptionForPayment, getActiveSubscription } from '@/lib/subscription';

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

  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'بيانات غير صالحة' },
      { status: 400 }
    );
  }

  try {
    const { plan, paymentMethod, classKey } = parsed.data;

    const activeSubscription = await getActiveSubscription(user.id);
    if (activeSubscription) {
      return NextResponse.json({ success: false, error: 'لديك اشتراك نشط بالفعل' }, { status: 400 });
    }

    const amount = getPlanPrice(classKey, plan);
    const paymentRef = `IP${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        plan,
        classKey: classKey ?? null,
        paymentMethod,
        transactionId: paymentRef,
        status: 'pending',
      },
    });

    await createSubscriptionForPayment({
      userId: user.id,
      plan,
      classKey,
      amount,
      paymentId: payment.id,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        transactionId: paymentRef,
        amount,
        plan,
        method: 'instapay',
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Error creating instapay payment:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

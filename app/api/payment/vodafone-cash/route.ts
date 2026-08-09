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

    const paymentRef = `VC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Create the payment and its pending subscription atomically — a payment can
    // never exist without its linked subscription (or vice versa).
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
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
        paymentId: created.id,
        status: 'pending',
      }, tx);

      return created;
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        transactionId: paymentRef,
        amount,
        plan,
      },
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to create payment' }, { status: 500 });
  }
}

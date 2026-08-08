import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { paymentCreateSchema } from '@/lib/validation';
import { getPlanPrice } from '@/lib/classes';

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

    if (user.isSubscribed) {
      return NextResponse.json({ success: false, error: 'Already subscribed' }, { status: 400 });
    }

    const amount = getPlanPrice(classKey, plan);

    const paymentRef = `VC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        plan,
        paymentMethod,
        transactionId: paymentRef,
        status: 'pending',
      },
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

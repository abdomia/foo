import { NextRequest, NextResponse } from 'next/server';
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
    const { plan } = parsed.data;
    const amount = getPlanPrice(null, plan);
    const paymentId = 'INSTAPAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    return NextResponse.json({
      success: true,
      paymentId,
      message: 'تم إنشاء عملية الدفع. في الإنتاج سيتم توجيهك لصفحة الدفع.',
      paymentDetails: {
        id: paymentId,
        amount,
        currency: 'EGP',
        status: 'pending',
        method: 'instapay',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

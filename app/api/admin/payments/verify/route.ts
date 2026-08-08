import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  try {
    const body = await request.json();
    const { paymentId, action, adminNotes } = body;

    if (!paymentId) {
      return NextResponse.json({ success: false, error: 'Payment ID required' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: true },
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    // Admin approves/rejects payment
    if (action === 'approve') {
      const plan = payment.plan as 'monthly' | 'yearly';
      const days = plan === 'yearly' ? 365 : 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: 'completed',
            vodafoneRef: adminNotes || 'Approved by admin',
          },
        }),
        prisma.user.update({
          where: { id: payment.userId },
          data: {
            isSubscribed: true,
            subscriptionPlan: plan,
            subscriptionExpiry: expiryDate,
          },
        }),
      ]);

      return NextResponse.json({ success: true, message: 'Payment approved, subscription activated' });
    } else if (action === 'reject') {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'rejected',
          vodafoneRef: adminNotes || 'Rejected by admin',
        },
      });

      return NextResponse.json({ success: true, message: 'Payment rejected' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to process payment' }, { status: 500 });
  }
}
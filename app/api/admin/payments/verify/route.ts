import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';
import { approveSubscription, rejectSubscription } from '@/lib/subscription';

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
    });

    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'approved') {
      return NextResponse.json({ success: false, error: 'Payment already approved' }, { status: 400 });
    }

    // Admin approves/rejects payment
    if (action === 'approve') {
      await approveSubscription({
        userId: payment.userId,
        plan: payment.plan,
        classKey: payment.classKey,
        amount: payment.amount,
        paymentId,
      });

      if (adminNotes) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { vodafoneRef: adminNotes },
        });
      }

      return NextResponse.json({ success: true, message: 'Payment approved, subscription activated' });
    } else if (action === 'reject') {
      await rejectSubscription({ paymentId, userId: payment.userId });

      if (adminNotes) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { vodafoneRef: adminNotes },
        });
      }

      return NextResponse.json({ success: true, message: 'Payment rejected' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to process payment' }, { status: 500 });
  }
}
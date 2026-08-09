import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type AccessLevel = 'FREE' | 'SUBSCRIBER' | 'PREMIUM';
export type SubscriptionStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export const ACCESS_TYPES = ['FREE', 'SUBSCRIBER', 'PREMIUM'] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'pending',
  'under_review',
  'approved',
  'rejected',
  'cancelled',
];

export function getPlanDurationDays(plan: string): number {
  switch (plan) {
    case 'monthly':
      return 30;
    case 'semester':
      return 150;
    case 'yearly':
      return 365;
    default:
      return 30;
  }
}

export function isPremiumPlan(plan: string): boolean {
  return plan === 'semester' || plan === 'yearly';
}

// Latest active (approved, not expired) subscription - DB is the source of truth.
export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: 'approved',
      expiryDate: { gt: new Date() },
    },
    orderBy: { expiryDate: 'desc' },
  });
}

export async function getUserAccessLevel(userId: string): Promise<AccessLevel> {
  const sub = await getActiveSubscription(userId);
  if (!sub) return 'FREE';
  return isPremiumPlan(sub.plan) ? 'PREMIUM' : 'SUBSCRIBER';
}

export function canAccessContent(accessLevel: AccessLevel, accessType: string): boolean {
  if (accessType === 'FREE') return true;
  if (accessType === 'SUBSCRIBER') return accessLevel === 'SUBSCRIBER' || accessLevel === 'PREMIUM';
  if (accessType === 'PREMIUM') return accessLevel === 'PREMIUM';
  return true;
}

// Sync the legacy User cache fields from the DB subscriptions.
export async function syncUserSubscription(userId: string) {
  const sub = await getActiveSubscription(userId);
  await prisma.user.update({
    where: { id: userId },
    data: sub
      ? { isSubscribed: true, subscriptionPlan: sub.plan, subscriptionExpiry: sub.expiryDate }
      : { isSubscribed: false, subscriptionPlan: null, subscriptionExpiry: null },
  });
  return sub;
}

// Create a Subscription row linked to a payment, matching the payment's state.
// Accepts an optional transaction client so callers can group it atomically.
export async function createSubscriptionForPayment(input: {
  userId: string;
  plan: string;
  classKey?: string | null;
  amount: number;
  paymentId: string;
  status?: SubscriptionStatus;
}, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  return client.subscription.create({
    data: {
      userId: input.userId,
      plan: input.plan,
      classKey: input.classKey ?? null,
      amount: input.amount,
      paymentId: input.paymentId,
      status: input.status ?? 'pending',
    },
  });
}

// Approve a subscription atomically: claim the payment (only once), activate
// the linked subscription row (or create it), and sync the User cache — all
// inside a single transaction so no partial state can persist.
export async function approveSubscription(input: {
  userId: string;
  plan: string;
  classKey?: string | null;
  amount: number;
  paymentId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const startDate = new Date();
    const expiryDate = new Date(startDate.getTime() + getPlanDurationDays(input.plan) * 24 * 60 * 60 * 1000);

    // Atomically claim the payment. If another request already approved it,
    // count is 0 and we return the existing subscription (idempotent).
    const claimed = await tx.payment.updateMany({
      where: { id: input.paymentId, status: { not: 'approved' } },
      data: { status: 'approved' },
    });
    if (claimed.count !== 1) {
      return tx.subscription.findUnique({
        where: { paymentId: input.paymentId },
      });
    }

    const existing = await tx.subscription.findUnique({
      where: { paymentId: input.paymentId },
    });

    const subscription = existing
      ? await tx.subscription.update({
          where: { id: existing.id },
          data: { status: 'approved', startDate, expiryDate },
        })
      : await tx.subscription.create({
          data: {
            userId: input.userId,
            plan: input.plan,
            classKey: input.classKey ?? null,
            amount: input.amount,
            paymentId: input.paymentId,
            status: 'approved',
            startDate,
            expiryDate,
          },
        });

    await tx.user.update({
      where: { id: input.userId },
      data: { isSubscribed: true, subscriptionPlan: input.plan, subscriptionExpiry: expiryDate },
    });

    return subscription;
  });
}

// Reject a subscription: mark the linked row rejected and the payment rejected.
export async function rejectSubscription(input: { paymentId: string; userId: string }) {
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { paymentId: input.paymentId, status: { not: 'rejected' } },
      data: { status: 'rejected' },
    }),
    prisma.payment.update({
      where: { id: input.paymentId },
      data: { status: 'rejected' },
    }),
  ]);

  await syncUserSubscription(input.userId);
}

// Activate a subscription without a payment (e.g. activation codes).
// Accepts an optional transaction client for atomic callers.
export async function activateSubscription(input: {
  userId: string;
  plan: string;
  classKey?: string | null;
  amount?: number;
  paymentId?: string | null;
}, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + getPlanDurationDays(input.plan) * 24 * 60 * 60 * 1000);

  const subscription = await client.subscription.create({
    data: {
      userId: input.userId,
      plan: input.plan,
      classKey: input.classKey ?? null,
      amount: input.amount ?? 0,
      paymentId: input.paymentId ?? null,
      status: 'approved',
      startDate,
      expiryDate,
    },
  });

  await client.user.update({
    where: { id: input.userId },
    data: { isSubscribed: true, subscriptionPlan: input.plan, subscriptionExpiry: expiryDate },
  });

  return subscription;
}

// Cancel the user's active/pending subscriptions and clear the cache if needed.
export async function cancelUserSubscriptions(userId: string) {
  await prisma.subscription.updateMany({
    where: { userId, status: { in: ['pending', 'under_review', 'approved'] } },
    data: { status: 'cancelled' },
  });
  await syncUserSubscription(userId);
}

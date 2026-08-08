import { prisma } from '@/lib/db';

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
export async function createSubscriptionForPayment(input: {
  userId: string;
  plan: string;
  classKey?: string | null;
  amount: number;
  paymentId: string;
  status?: SubscriptionStatus;
}) {
  return prisma.subscription.create({
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

// Approve a subscription: activate the row linked to a payment (or create one),
// mark the payment approved and sync the User cache.
export async function approveSubscription(input: {
  userId: string;
  plan: string;
  classKey?: string | null;
  amount: number;
  paymentId: string;
}) {
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + getPlanDurationDays(input.plan) * 24 * 60 * 60 * 1000);

  const existing = await prisma.subscription.findUnique({
    where: { paymentId: input.paymentId },
  });

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: { status: 'approved', startDate, expiryDate },
      })
    : await prisma.subscription.create({
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

  await prisma.payment.update({
    where: { id: input.paymentId },
    data: { status: 'approved' },
  });

  await prisma.user.update({
    where: { id: input.userId },
    data: { isSubscribed: true, subscriptionPlan: input.plan, subscriptionExpiry: expiryDate },
  });

  return subscription;
}

// Reject a subscription: mark the linked row rejected and the payment rejected.
export async function rejectSubscription(input: { paymentId: string; userId: string }) {
  await prisma.subscription.updateMany({
    where: { paymentId: input.paymentId },
    data: { status: 'rejected' },
  });

  await prisma.payment.update({
    where: { id: input.paymentId },
    data: { status: 'rejected' },
  });

  await syncUserSubscription(input.userId);
}

// Activate a subscription without a payment (e.g. activation codes).
export async function activateSubscription(input: {
  userId: string;
  plan: string;
  classKey?: string | null;
  amount?: number;
  paymentId?: string | null;
}) {
  const startDate = new Date();
  const expiryDate = new Date(startDate.getTime() + getPlanDurationDays(input.plan) * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.create({
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

  await prisma.user.update({
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

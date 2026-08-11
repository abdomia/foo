import { prisma } from '@/lib/db';
import { getActiveSubscription } from '@/lib/subscription';

export type NotificationType =
  | 'new_lesson'
  | 'new_quiz'
  | 'new_pdf'
  | 'announcement'
  | 'subscription_expiring'
  | 'quiz_result'
  | 'achievement'
  | 'study_plan';

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 500) ?? null,
      link: input.link ?? null,
    },
  });
}

export async function createManyNotifications(input: {
  userIds: string[];
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  if (input.userIds.length === 0) return;
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title.slice(0, 200),
      body: input.body?.slice(0, 500) ?? null,
      link: input.link ?? null,
    })),
  });
}

// Notify users, optionally scoped to a grade (null grade -> general content),
// subscribers only, or an explicit set of user ids (custom group).
export async function notifyAllUsers(input: {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  grade?: string | null;
  onlySubscribers?: boolean;
  userIds?: string[];
}) {
  const where = {
    ...(input.grade ? { OR: [{ grade: input.grade }, { grade: null }] } : {}),
    ...(input.onlySubscribers ? { isSubscribed: true } : {}),
    ...(input.userIds ? { id: { in: input.userIds } } : {}),
  };
  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });
  await createManyNotifications({
    userIds: users.map((u) => u.id),
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

// Lazily create a "subscription expiring soon" notification if the user's
// active subscription is within EXPIRY_WARNING_DAYS days of expiry.
const EXPIRY_WARNING_DAYS = 7;

export async function ensureSubscriptionExpiryNotification(userId: string) {
  const sub = await getActiveSubscription(userId);
  if (!sub || !sub.expiryDate) return null;

  const daysLeft = Math.ceil((sub.expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (daysLeft > EXPIRY_WARNING_DAYS) return null;

  const existing = await prisma.notification.findFirst({
    where: { userId, type: 'subscription_expiring', read: false },
  });
  if (existing) return existing;

  const planLabel =
    sub.plan === 'monthly' ? 'شهري' : sub.plan === 'yearly' ? 'سنوي' : 'فصل دراسي';
  return createNotification({
    userId,
    type: 'subscription_expiring',
    title: 'اقترب موعد انتهاء اشتراكك',
    body: `اشتراكك (${planLabel}) سينتهي خلال ${daysLeft === 0 ? 'يوم' : `${daysLeft} أيام`}. جدّد اشتراكك حتى لا يتوقف وصولك للمحتوى.`,
    link: '/subscribe',
  });
}

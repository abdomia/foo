import {
  PrismaClient,
  User as PrismaUser,
  SubscriptionCode as PrismaSubscriptionCode,
  Prisma,
} from '@prisma/client';
import { hashPassword } from '@/lib/password';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export type SafeUser = ReturnType<typeof toSafeUser>;

// Fields the rest of the app needs for a User — never fetch the password hash
// when only a SafeUser (session/profile) is required.
const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  parentPhone: true,
  avatar: true,
  grade: true,
  isSubscribed: true,
  subscriptionPlan: true,
  subscriptionExpiry: true,
  isAdmin: true,
  role: true,
  createdAt: true,
} as const;

type SafeUserSelect = Prisma.UserGetPayload<{ select: typeof USER_SAFE_SELECT }>;

function toSafeUser(user: SafeUserSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    parentPhone: user.parentPhone,
    avatar: user.avatar || undefined,
    grade: user.grade || undefined,
    isSubscribed: user.isSubscribed,
    subscriptionPlan: user.subscriptionPlan || undefined,
    subscriptionExpiry: user.subscriptionExpiry?.toISOString() || undefined,
    isAdmin: user.isAdmin,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  return client;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function getUserById(id: string): Promise<SafeUser | null> {
  if (!id) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });
    if (!user) return null;
    return toSafeUser(user);
  } catch (error) {
    console.error('Error getting user by id:', error);
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<SafeUser | null> {
  if (!email) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: USER_SAFE_SELECT,
    });
    if (!user) return null;
    return toSafeUser(user);
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function getUserByEmailWithPassword(email: string): Promise<PrismaUser | null> {
  if (!email) return null;
  try {
    return await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
  parentPhone: string;
  avatar?: string;
  grade?: string;
  isSubscribed: boolean;
}): Promise<SafeUser> {
  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      password: passwordHash,
      phone: data.phone,
      parentPhone: data.parentPhone,
      avatar: data.avatar || null,
      grade: data.grade || null,
      isSubscribed: data.isSubscribed,
    },
  });

  return toSafeUser(user);
}

export async function updateUser(id: string, data: Partial<{
  name: string;
  email: string;
  password: string;
  phone: string;
  parentPhone: string;
  avatar: string;
  isSubscribed: boolean;
  subscriptionPlan: string | null;
  subscriptionExpiry: string | null;
}>): Promise<SafeUser | null> {
  try {
    const updateData: Prisma.UserUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined) updateData.password = await hashPassword(data.password);
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.parentPhone !== undefined) updateData.parentPhone = data.parentPhone;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.isSubscribed !== undefined) updateData.isSubscribed = data.isSubscribed;
    if (data.subscriptionPlan !== undefined) updateData.subscriptionPlan = data.subscriptionPlan;
    if (data.subscriptionExpiry !== undefined) updateData.subscriptionExpiry = data.subscriptionExpiry === null ? null : new Date(data.subscriptionExpiry);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return toSafeUser(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

export async function createSubscriptionCode(data: {
  code: string;
  plan: string;
  expiresAt: Date;
}): Promise<PrismaSubscriptionCode> {
  const subscriptionCode = await prisma.subscriptionCode.create({
    data: {
      code: data.code,
      plan: data.plan,
      expiresAt: data.expiresAt,
    },
  });
  return subscriptionCode;
}

export async function getAllSubscriptionCodes(): Promise<PrismaSubscriptionCode[]> {
  const codes = await prisma.subscriptionCode.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return codes;
}

export async function getSubscriptionCodeByCode(code: string): Promise<PrismaSubscriptionCode | null> {
  const subscriptionCode = await prisma.subscriptionCode.findUnique({
    where: { code },
  });
  if (!subscriptionCode) return null;
  return subscriptionCode;
}

export async function useSubscriptionCode(code: string, userId: string): Promise<PrismaSubscriptionCode | null> {
  const subscriptionCode = await prisma.subscriptionCode.findUnique({
    where: { code },
  });
  if (!subscriptionCode) return null;
  if (subscriptionCode.isUsed) return null;
  if (new Date() > subscriptionCode.expiresAt) return null;

  const updatedCode = await prisma.subscriptionCode.update({
    where: { code },
    data: {
      isUsed: true,
      usedBy: userId,
      usedAt: new Date(),
    },
  });
  return updatedCode;
}

export async function deleteSubscriptionCode(id: string): Promise<boolean> {
  try {
    await prisma.subscriptionCode.delete({
      where: { id },
    });
    return true;
  } catch {
    return false;
  }
}

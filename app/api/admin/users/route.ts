import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSessionUser, unauthorized, forbidden } from '@/lib/auth';

export async function GET() {
  const admin = await getSessionUser();
  if (!admin) return unauthorized();
  if (!admin.isAdmin) return forbidden();

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isSubscribed: true,
        isAdmin: true,
        createdAt: true,
        subscriptionExpiry: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { syncUserSubscription } from '@/lib/subscription';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  // Lazy sync: clear stale subscription cache once it expires.
  if (user.isSubscribed && user.subscriptionExpiry) {
    const expiry = new Date(user.subscriptionExpiry);
    if (expiry <= new Date()) {
      await syncUserSubscription(user.id);
      const synced = await getUserById(user.id);
      if (synced) return NextResponse.json({ success: true, user: synced });
    }
  }

  return NextResponse.json({ success: true, user });
}

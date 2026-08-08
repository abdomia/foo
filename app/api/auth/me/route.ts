import { NextResponse } from 'next/server';
import { getSessionUser, unauthorized } from '@/lib/auth';
import { syncUserSubscription } from '@/lib/subscription';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  // Lazy sync: clear stale subscription cache once it expires.
  if (user.isSubscribed && user.subscriptionExpiry) {
    const expiry = new Date(user.subscriptionExpiry);
    if (expiry <= new Date()) {
      await syncUserSubscription(user.id);
    }
  }

  const freshUser = await getSessionUser();
  return NextResponse.json({ success: true, user: freshUser });
}

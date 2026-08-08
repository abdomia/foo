import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserByEmail, createUser } from '@/lib/db';
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL;

  const cleanUrl = BASE_URL?.replace(/\/$/, '');
  const GOOGLE_REDIRECT_URI = `${cleanUrl}/api/auth/oauth/google/callback`;

  if (error) {
    console.error('Google OAuth error:', error, errorDescription);
    return NextResponse.redirect(new URL(`/auth/login?error=${error}`, request.url));
  }

  if (!code || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !cleanUrl) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth_misconfigured', request.url));
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/auth/login?error=token_failed', request.url));
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userResponse.json();
    if (!userInfo.email) {
      return NextResponse.redirect(new URL('/auth/login?error=no_email', request.url));
    }

    let user = await getUserByEmail(userInfo.email);

    if (!user) {
      user = await createUser({
        name: userInfo.name || userInfo.email.split('@')[0],
        email: userInfo.email,
        password: `google_${userInfo.sub ?? Date.now()}`,
        phone: '00000000000',
        parentPhone: '00000000000',
        avatar: userInfo.picture || undefined,
        isSubscribed: false,
      });
    }

    const token = await createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });

    const redirectUrl = user.isAdmin ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (err) {
    console.error('Google OAuth error:', err);
    return NextResponse.redirect(new URL('/auth/login?error=oauth_failed', request.url));
  }
}

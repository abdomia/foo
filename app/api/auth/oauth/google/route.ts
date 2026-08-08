import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BASE_URL =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_URL ||
    (request.nextUrl.origin !== 'null' ? request.nextUrl.origin : undefined);

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !BASE_URL) {
    return NextResponse.redirect(new URL('/auth/login?error=oauth_not_configured', request.url));
  }

  const cleanUrl = BASE_URL.replace(/\/$/, '');
  const GOOGLE_REDIRECT_URI = `${cleanUrl}/api/auth/oauth/google/callback`;

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  return NextResponse.redirect(authUrl.toString());
}

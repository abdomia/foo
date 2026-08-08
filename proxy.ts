import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PAGES = [
  '/dashboard',
  '/progress',
  '/practice',
  '/lessons',
  '/quizzes',
  '/pdfs',
  '/advice',
  '/admin',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PAGES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const hasSession = request.cookies.has('session');
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/progress/:path*', '/practice/:path*', '/lessons/:path*', '/quizzes/:path*', '/pdfs/:path*', '/advice/:path*', '/admin/:path*'],
};

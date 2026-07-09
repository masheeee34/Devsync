import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let static assets, icons, manifest and API routes pass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json'
  ) {
    return NextResponse.next();
  }

  // Allow login and signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return NextResponse.next();
  }

  // Read configuration cookies
  const dbModeCookie = request.cookies.get('devsync-db-mode');
  const dbMode = dbModeCookie ? dbModeCookie.value : 'local';

  if (dbMode === 'supabase') {
    const sessionTokenCookie = request.cookies.get('devsync-session-token');
    const token = sessionTokenCookie ? sessionTokenCookie.value : null;

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    // Fast local check for JWT expiration
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        const isExpired = payload.exp * 1000 < Date.now();
        if (isExpired) {
          const url = request.nextUrl.clone();
          url.pathname = '/login';
          const response = NextResponse.redirect(url);
          response.cookies.delete('devsync-session-token');
          return response;
        }
      }
    } catch (e) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } else {
    // Local offline mode: check for local profile
    const localProfileCookie = request.cookies.get('devsync-local-profile');
    if (!localProfileCookie || !localProfileCookie.value) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json).*)'],
};

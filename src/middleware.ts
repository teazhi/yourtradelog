/**
 * Next.js Middleware for authentication and route protection.
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, API routes, etc.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  try {
    const {
      updateSession,
      getAuthRedirect,
    } = await import('@/lib/supabase/middleware');

    // Update the Supabase session (refresh tokens if needed)
    const { supabaseResponse, user } = await updateSession(request);

    // Check if we need to redirect based on auth state
    const redirectPath = getAuthRedirect(pathname, !!user);

    if (redirectPath) {
      const redirectUrl = new URL(redirectPath, request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Continue with the request
    return supabaseResponse;
  } catch (error) {
    // If there's an error, allow the request to continue
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

/**
 * Configure which routes the middleware should run on.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

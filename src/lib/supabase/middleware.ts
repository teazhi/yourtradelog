/**
 * Supabase auth middleware utilities for the futures trading journal app.
 * Used to refresh auth tokens and protect routes.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Updates the Supabase session by refreshing the auth token if needed.
 * This should be called from the Next.js middleware.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}

/**
 * Route configuration for auth protection
 */
export const authConfig = {
  // Routes that require authentication
  protectedRoutes: [
    '/dashboard',
    '/trades',
    '/journal',
    '/analytics',
    '/settings',
    '/accounts',
    '/setups',
    '/import',
  ],
  // Routes that are only for unauthenticated users
  authRoutes: ['/login', '/signup', '/forgot-password', '/reset-password'],
  // Routes that are always public
  publicRoutes: ['/', '/about', '/pricing', '/contact', '/privacy', '/terms'],
  // Default redirect for authenticated users trying to access auth routes
  defaultAuthRedirect: '/dashboard',
  // Default redirect for unauthenticated users trying to access protected routes
  defaultUnauthRedirect: '/login',
};

/**
 * Checks if a path matches any of the given route patterns.
 */
export function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some((route) => {
    // Exact match
    if (path === route) return true;
    // Check if path starts with route (for nested routes)
    if (path.startsWith(`${route}/`)) return true;
    return false;
  });
}

/**
 * Determines the appropriate redirect based on auth state and current path.
 */
export function getAuthRedirect(
  path: string,
  isAuthenticated: boolean
): string | null {
  const { protectedRoutes, authRoutes, defaultAuthRedirect, defaultUnauthRedirect } =
    authConfig;

  // User is authenticated but trying to access auth routes (login, signup)
  if (isAuthenticated && matchesRoute(path, authRoutes)) {
    return defaultAuthRedirect;
  }

  // User is not authenticated but trying to access protected routes
  if (!isAuthenticated && matchesRoute(path, protectedRoutes)) {
    // Include the original URL as a redirect parameter
    const redirectUrl = new URL(defaultUnauthRedirect, 'http://localhost');
    redirectUrl.searchParams.set('redirect', path);
    return `${defaultUnauthRedirect}?redirect=${encodeURIComponent(path)}`;
  }

  return null;
}

/**
 * Browser-side Supabase client for the futures trading journal app.
 * This client is used in client components (use client directive).
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for browser/client-side usage.
 * This should be used in React Client Components.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Singleton instance for convenience in simple use cases.
 * For most applications, prefer using createClient() to get a fresh instance.
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function getClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}

/**
 * Type-safe query helpers
 */
export type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Export the Database type for use in other modules
 */
export type { Database };

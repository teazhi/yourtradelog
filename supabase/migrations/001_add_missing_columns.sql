-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- Run this BEFORE 000_complete_setup.sql if you have existing tables
-- ============================================================================

-- Add social columns to trades table if they don't exist
DO $$
BEGIN
  -- Add visibility column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'trades'
                 AND column_name = 'visibility') THEN
    ALTER TABLE public.trades ADD COLUMN visibility TEXT DEFAULT 'private';
  END IF;

  -- Add shared_to_feed column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'trades'
                 AND column_name = 'shared_to_feed') THEN
    ALTER TABLE public.trades ADD COLUMN shared_to_feed BOOLEAN DEFAULT false;
  END IF;

  -- Add share_analysis column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'trades'
                 AND column_name = 'share_analysis') THEN
    ALTER TABLE public.trades ADD COLUMN share_analysis TEXT;
  END IF;
END $$;

-- Add social columns to profiles table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'is_public') THEN
    ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'show_pnl') THEN
    ALTER TABLE public.profiles ADD COLUMN show_pnl BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'show_stats') THEN
    ALTER TABLE public.profiles ADD COLUMN show_stats BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'anonymous_mode') THEN
    ALTER TABLE public.profiles ADD COLUMN anonymous_mode BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'is_mentor') THEN
    ALTER TABLE public.profiles ADD COLUMN is_mentor BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'trading_style') THEN
    ALTER TABLE public.profiles ADD COLUMN trading_style TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'experience_level') THEN
    ALTER TABLE public.profiles ADD COLUMN experience_level TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                 AND table_name = 'profiles'
                 AND column_name = 'favorite_instruments') THEN
    ALTER TABLE public.profiles ADD COLUMN favorite_instruments TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Create index for shared trades if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_trades_shared ON public.trades(shared_to_feed, visibility);

-- Now create the policy for viewing shared trades
DROP POLICY IF EXISTS "Users can view shared trades" ON public.trades;
CREATE POLICY "Users can view shared trades"
  ON public.trades FOR SELECT
  USING (shared_to_feed = true AND visibility = 'public');

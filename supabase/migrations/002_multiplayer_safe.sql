-- ============================================================================
-- MULTIPLAYER TRADING JOURNAL - SAFE MIGRATION
-- This script safely adds multiplayer features without conflicting with existing tables
-- ============================================================================

-- ============================================================================
-- 1. ADD SOCIAL COLUMNS TO PROFILES (safe - uses IF NOT EXISTS)
-- ============================================================================

DO $$
BEGIN
  -- Add columns to profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_public') THEN
    ALTER TABLE public.profiles ADD COLUMN is_public BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_pnl') THEN
    ALTER TABLE public.profiles ADD COLUMN show_pnl BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_stats') THEN
    ALTER TABLE public.profiles ADD COLUMN show_stats BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'anonymous_mode') THEN
    ALTER TABLE public.profiles ADD COLUMN anonymous_mode BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_mentor') THEN
    ALTER TABLE public.profiles ADD COLUMN is_mentor BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trading_style') THEN
    ALTER TABLE public.profiles ADD COLUMN trading_style TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'experience_level') THEN
    ALTER TABLE public.profiles ADD COLUMN experience_level TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'favorite_instruments') THEN
    ALTER TABLE public.profiles ADD COLUMN favorite_instruments TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD SHARING COLUMNS TO TRADES (safe)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'visibility') THEN
    ALTER TABLE public.trades ADD COLUMN visibility TEXT DEFAULT 'private';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'shared_to_feed') THEN
    ALTER TABLE public.trades ADD COLUMN shared_to_feed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'share_analysis') THEN
    ALTER TABLE public.trades ADD COLUMN share_analysis TEXT;
  END IF;
END $$;

-- ============================================================================
-- 3. FOLLOWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create
DROP POLICY IF EXISTS "Users can see their own follows" ON public.follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

CREATE POLICY "Users can see their own follows"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ============================================================================
-- 4. SQUADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  max_members INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public squads are visible to all" ON public.squads;
DROP POLICY IF EXISTS "Users can create squads" ON public.squads;
DROP POLICY IF EXISTS "Owners can update squads" ON public.squads;
DROP POLICY IF EXISTS "Owners can delete squads" ON public.squads;

CREATE POLICY "Public squads are visible to all"
  ON public.squads FOR SELECT
  USING (is_public = true OR owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.squad_members WHERE squad_id = id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create squads"
  ON public.squads FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update squads"
  ON public.squads FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete squads"
  ON public.squads FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- 5. SQUAD MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can see squad members" ON public.squad_members;
DROP POLICY IF EXISTS "Users can join squads" ON public.squad_members;
DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;

CREATE POLICY "Members can see squad members"
  ON public.squad_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = squad_members.squad_id AND sm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.squads s WHERE s.id = squad_members.squad_id AND s.is_public = true
  ));

CREATE POLICY "Users can join squads"
  ON public.squad_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave squads"
  ON public.squad_members FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.squads WHERE id = squad_id AND owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_squad_members_squad ON public.squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user ON public.squad_members(user_id);

-- ============================================================================
-- 6. TRADE REACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'insightful', 'great_entry', 'great_exit', 'learned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, user_id, reaction_type)
);

ALTER TABLE public.trade_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can see reactions on visible trades" ON public.trade_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.trade_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.trade_reactions;

CREATE POLICY "Anyone can see reactions on visible trades"
  ON public.trade_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.trade_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
  ON public.trade_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_reactions_trade ON public.trade_reactions(trade_id);

-- ============================================================================
-- 7. TRADE COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.trade_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_mentor_feedback BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can see comments on visible trades" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can add comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can edit their comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can delete their comments" ON public.trade_comments;

CREATE POLICY "Anyone can see comments on visible trades"
  ON public.trade_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can add comments"
  ON public.trade_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit their comments"
  ON public.trade_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments"
  ON public.trade_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_comments_trade ON public.trade_comments(trade_id);

-- ============================================================================
-- 8. MENTOR RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mentor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'ended')),
  mentor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mentor_id, student_id),
  CHECK (mentor_id != student_id)
);

ALTER TABLE public.mentor_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their mentor relationships" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Students can request mentors" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Both can update relationship" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Both can end relationship" ON public.mentor_relationships;

CREATE POLICY "Users can see their mentor relationships"
  ON public.mentor_relationships FOR SELECT
  USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "Students can request mentors"
  ON public.mentor_relationships FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Both can update relationship"
  ON public.mentor_relationships FOR UPDATE
  USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "Both can end relationship"
  ON public.mentor_relationships FOR DELETE
  USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- ============================================================================
-- 9. WEEKLY STATS TABLE (for leaderboards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  total_pnl DECIMAL(12,2) DEFAULT 0,
  avg_r_multiple DECIMAL(6,3),
  best_trade_pnl DECIMAL(12,2),
  worst_trade_pnl DECIMAL(12,2),
  consistency_score DECIMAL(5,2),
  league_tier TEXT DEFAULT 'bronze' CHECK (league_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public stats visible based on user settings" ON public.weekly_stats;
DROP POLICY IF EXISTS "System can insert stats" ON public.weekly_stats;

CREATE POLICY "Public stats visible based on user settings"
  ON public.weekly_stats FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_id AND (is_public = true OR show_stats = true)
    )
  );

CREATE POLICY "System can insert stats"
  ON public.weekly_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_stats_user ON public.weekly_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON public.weekly_stats(week_start);

-- ============================================================================
-- 10. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_follower', 'trade_reaction', 'trade_comment', 'mentor_request',
    'mentor_feedback', 'squad_invite', 'challenge_started', 'challenge_ended'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their notifications" ON public.notifications;

CREATE POLICY "Users can see their notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 11. UPDATE PROFILES RLS TO ALLOW PUBLIC VIEWING
-- ============================================================================

DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
CREATE POLICY "Public profiles are viewable"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_public = true);

-- ============================================================================
-- 12. UPDATE TRADES RLS TO ALLOW VIEWING SHARED TRADES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view shared trades" ON public.trades;
CREATE POLICY "Users can view shared trades"
  ON public.trades FOR SELECT
  USING (
    auth.uid() = user_id
    OR (shared_to_feed = true AND visibility = 'public')
    OR (shared_to_feed = true AND visibility = 'followers' AND EXISTS (
      SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = trades.user_id
    ))
  );

-- ============================================================================
-- DONE! Multiplayer features are now enabled.
-- ============================================================================

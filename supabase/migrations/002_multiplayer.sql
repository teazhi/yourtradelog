-- ============================================================================
-- MULTIPLAYER TRADING JOURNAL - DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- 1. USER PROFILES (Extended for social features)
-- ============================================================================

-- Add social columns to existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_pnl BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_stats BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymous_mode BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_mentor BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trading_style TEXT; -- 'scalper', 'day_trader', 'swing_trader'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_level TEXT; -- 'beginner', 'intermediate', 'advanced', 'professional'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS favorite_instruments TEXT[] DEFAULT '{}';

-- ============================================================================
-- 2. FOLLOWS SYSTEM
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
-- 3. SQUADS (Trading Groups)
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

-- Squad members junction table
CREATE TABLE IF NOT EXISTS public.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

-- Squad policies
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

-- Squad member policies
CREATE POLICY "Members can see squad members"
  ON public.squad_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.squads s WHERE s.id = squad_id AND s.is_public = true
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
-- 4. TRADE VISIBILITY & SHARING
-- ============================================================================

-- Add visibility to trades table
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'squad', 'followers', 'public'));
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS shared_to_feed BOOLEAN DEFAULT false;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS share_analysis TEXT; -- User's analysis when sharing

-- ============================================================================
-- 5. SOCIAL FEED & INTERACTIONS
-- ============================================================================

-- Trade reactions (likes, insightful, etc.)
CREATE TABLE IF NOT EXISTS public.trade_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'insightful', 'great_entry', 'great_exit', 'learned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, user_id, reaction_type)
);

ALTER TABLE public.trade_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can see reactions on visible trades"
  ON public.trade_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.trade_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
  ON public.trade_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Trade comments
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
CREATE INDEX IF NOT EXISTS idx_trade_reactions_trade ON public.trade_reactions(trade_id);

-- ============================================================================
-- 6. MENTOR/STUDENT RELATIONSHIPS
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
-- 7. LEADERBOARDS & STATS
-- ============================================================================

-- Weekly stats snapshot for leaderboards
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
  consistency_score DECIMAL(5,2), -- Based on daily P&L variance
  league_tier TEXT DEFAULT 'bronze' CHECK (league_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_stats ENABLE ROW LEVEL SECURITY;

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
CREATE INDEX IF NOT EXISTS idx_weekly_stats_league ON public.weekly_stats(league_tier, week_start);

-- ============================================================================
-- 8. SQUAD CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.squad_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  metric TEXT NOT NULL CHECK (metric IN ('total_pnl', 'win_rate', 'avg_r_multiple', 'trade_count', 'consistency')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.squad_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can see challenges"
  ON public.squad_challenges FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.squad_members WHERE squad_id = squad_challenges.squad_id AND user_id = auth.uid()
  ));

CREATE POLICY "Admins can create challenges"
  ON public.squad_challenges FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.squad_members
    WHERE squad_id = squad_challenges.squad_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ));

-- ============================================================================
-- 9. NOTIFICATIONS
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
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.follows WHERE following_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.follows WHERE follower_id = user_uuid;
$$ LANGUAGE SQL STABLE;

-- Function to check if user follows another
CREATE OR REPLACE FUNCTION is_following(follower UUID, target UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.follows WHERE follower_id = follower AND following_id = target);
$$ LANGUAGE SQL STABLE;

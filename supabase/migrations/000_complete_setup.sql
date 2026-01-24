-- ============================================================================
-- COMPLETE DATABASE SETUP FOR TRADING JOURNAL
-- Run this single script to set up everything
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  default_risk_per_trade DECIMAL(10,2),
  daily_loss_limit DECIMAL(10,2),
  weekly_loss_limit DECIMAL(10,2),
  account_size DECIMAL(12,2),
  -- Social/Multiplayer columns
  username TEXT UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT false,
  show_pnl BOOLEAN DEFAULT false,
  show_stats BOOLEAN DEFAULT true,
  anonymous_mode BOOLEAN DEFAULT false,
  is_mentor BOOLEAN DEFAULT false,
  trading_style TEXT,
  experience_level TEXT,
  favorite_instruments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR is_public = true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- 2. SETUPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.setups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  timeframes TEXT[] DEFAULT '{}',
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own setups" ON public.setups;
DROP POLICY IF EXISTS "Users can insert own setups" ON public.setups;
DROP POLICY IF EXISTS "Users can update own setups" ON public.setups;
DROP POLICY IF EXISTS "Users can delete own setups" ON public.setups;

CREATE POLICY "Users can view own setups"
  ON public.setups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own setups"
  ON public.setups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own setups"
  ON public.setups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own setups"
  ON public.setups FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_setups_user_id ON public.setups(user_id);

-- ============================================================================
-- 3. TRADES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  instrument_id UUID,
  setup_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_date TIMESTAMPTZ NOT NULL,
  entry_price DECIMAL(12,4) NOT NULL,
  entry_contracts INTEGER NOT NULL DEFAULT 1,
  exit_date TIMESTAMPTZ,
  exit_price DECIMAL(12,4),
  exit_contracts INTEGER,
  stop_loss DECIMAL(12,4),
  take_profit DECIMAL(12,4),
  planned_risk DECIMAL(10,2),
  gross_pnl DECIMAL(10,2),
  commission DECIMAL(10,2) DEFAULT 0,
  fees DECIMAL(10,2) DEFAULT 0,
  net_pnl DECIMAL(10,2),
  r_multiple DECIMAL(6,3),
  emotions TEXT[] DEFAULT '{}',
  entry_rating INTEGER CHECK (entry_rating >= 1 AND entry_rating <= 5),
  exit_rating INTEGER CHECK (exit_rating >= 1 AND exit_rating <= 5),
  management_rating INTEGER CHECK (management_rating >= 1 AND management_rating <= 5),
  session TEXT,
  notes TEXT,
  lessons TEXT,
  mistakes TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'cancelled')),
  import_source TEXT,
  external_id TEXT,
  -- Social/Sharing columns
  visibility TEXT DEFAULT 'private',
  shared_to_feed BOOLEAN DEFAULT false,
  share_analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can view shared trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON public.trades;

CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared trades"
  ON public.trades FOR SELECT
  USING (shared_to_feed = true AND visibility = 'public');

CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_shared ON public.trades(shared_to_feed, visibility);

-- ============================================================================
-- 4. TRADE SCREENSHOTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trade_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  screenshot_type TEXT DEFAULT 'other',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own screenshots" ON public.trade_screenshots;
DROP POLICY IF EXISTS "Users can insert own screenshots" ON public.trade_screenshots;
DROP POLICY IF EXISTS "Users can update own screenshots" ON public.trade_screenshots;
DROP POLICY IF EXISTS "Users can delete own screenshots" ON public.trade_screenshots;

CREATE POLICY "Users can view own screenshots"
  ON public.trade_screenshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots"
  ON public.trade_screenshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own screenshots"
  ON public.trade_screenshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own screenshots"
  ON public.trade_screenshots FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_screenshots_trade ON public.trade_screenshots(trade_id);

-- ============================================================================
-- 5. DAILY JOURNALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pre_market_notes TEXT,
  post_market_notes TEXT,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 5),
  discipline_rating INTEGER CHECK (discipline_rating >= 1 AND discipline_rating <= 5),
  goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_journals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own journals" ON public.daily_journals;
DROP POLICY IF EXISTS "Users can insert own journals" ON public.daily_journals;
DROP POLICY IF EXISTS "Users can update own journals" ON public.daily_journals;
DROP POLICY IF EXISTS "Users can delete own journals" ON public.daily_journals;

CREATE POLICY "Users can view own journals"
  ON public.daily_journals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journals"
  ON public.daily_journals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journals"
  ON public.daily_journals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journals"
  ON public.daily_journals FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_journals_user_date ON public.daily_journals(user_id, date);

-- ============================================================================
-- 6. FOLLOWS TABLE
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

DROP POLICY IF EXISTS "Users can see follows" ON public.follows;
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

CREATE POLICY "Users can see follows"
  ON public.follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ============================================================================
-- 7. SQUADS TABLE
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

DROP POLICY IF EXISTS "Squads viewable" ON public.squads;
DROP POLICY IF EXISTS "Users can create squads" ON public.squads;
DROP POLICY IF EXISTS "Owners can update squads" ON public.squads;
DROP POLICY IF EXISTS "Owners can delete squads" ON public.squads;

CREATE POLICY "Squads viewable"
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
-- 8. SQUAD MEMBERS TABLE
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
-- 9. TRADE REACTIONS TABLE
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

DROP POLICY IF EXISTS "Anyone can see reactions" ON public.trade_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.trade_reactions;
DROP POLICY IF EXISTS "Users can remove reactions" ON public.trade_reactions;

CREATE POLICY "Anyone can see reactions"
  ON public.trade_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.trade_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove reactions"
  ON public.trade_reactions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_reactions_trade ON public.trade_reactions(trade_id);

-- ============================================================================
-- 10. TRADE COMMENTS TABLE
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

DROP POLICY IF EXISTS "Anyone can see comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can add comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can edit comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can delete comments" ON public.trade_comments;

CREATE POLICY "Anyone can see comments"
  ON public.trade_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can add comments"
  ON public.trade_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit comments"
  ON public.trade_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete comments"
  ON public.trade_comments FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trade_comments_trade ON public.trade_comments(trade_id);

-- ============================================================================
-- 11. MENTOR RELATIONSHIPS TABLE
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

DROP POLICY IF EXISTS "Users can see mentor relationships" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Students can request mentors" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Both can update relationship" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Both can end relationship" ON public.mentor_relationships;

CREATE POLICY "Users can see mentor relationships"
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
-- 12. WEEKLY STATS TABLE
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

DROP POLICY IF EXISTS "Stats viewable" ON public.weekly_stats;
DROP POLICY IF EXISTS "Users can insert stats" ON public.weekly_stats;

CREATE POLICY "Stats viewable"
  ON public.weekly_stats FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = user_id AND (is_public = true OR show_stats = true)
    )
  );

CREATE POLICY "Users can insert stats"
  ON public.weekly_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_stats_user ON public.weekly_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_week ON public.weekly_stats(week_start);

-- ============================================================================
-- 13. NOTIFICATIONS TABLE
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

DROP POLICY IF EXISTS "Users can see notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;

CREATE POLICY "Users can see notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 14. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 15. CREATE PROFILE FOR EXISTING USER (run once)
-- ============================================================================

INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DONE! All tables created successfully.
-- ============================================================================

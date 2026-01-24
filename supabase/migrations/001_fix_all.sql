-- ============================================================================
-- COMPLETE FIX SCRIPT
-- Creates missing tables and adds missing columns to existing tables
-- ============================================================================

-- ============================================================================
-- 1. CREATE PROFILES TABLE (if it doesn't exist)
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
-- 2. CREATE SETUPS TABLE (if it doesn't exist)
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
DROP POLICY IF EXISTS "Users can view their own setups" ON public.setups;
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
-- 3. ADD MISSING COLUMNS TO TRADES TABLE
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'visibility') THEN
    ALTER TABLE public.trades ADD COLUMN visibility TEXT DEFAULT 'private';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'shared_to_feed') THEN
    ALTER TABLE public.trades ADD COLUMN shared_to_feed BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'trades' AND column_name = 'share_analysis') THEN
    ALTER TABLE public.trades ADD COLUMN share_analysis TEXT;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can view shared trades" ON public.trades;
CREATE POLICY "Users can view shared trades"
  ON public.trades FOR SELECT
  USING (shared_to_feed = true AND visibility = 'public');

CREATE INDEX IF NOT EXISTS idx_trades_shared ON public.trades(shared_to_feed, visibility);

-- ============================================================================
-- 4. SOCIAL TABLES - FOLLOWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can follow" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;

CREATE POLICY "Users can view follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================================================
-- 5. SQUADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public squads" ON public.squads;
DROP POLICY IF EXISTS "Squad members can view their squads" ON public.squads;
DROP POLICY IF EXISTS "Users can create squads" ON public.squads;
DROP POLICY IF EXISTS "Owners can update squads" ON public.squads;
DROP POLICY IF EXISTS "Owners can delete squads" ON public.squads;

CREATE POLICY "Anyone can view public squads"
  ON public.squads FOR SELECT
  USING (is_public = true);

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
-- 6. SQUAD MEMBERS TABLE
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

DROP POLICY IF EXISTS "Members can view squad members" ON public.squad_members;
DROP POLICY IF EXISTS "Users can join squads" ON public.squad_members;
DROP POLICY IF EXISTS "Users can leave squads" ON public.squad_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.squad_members;

CREATE POLICY "Members can view squad members"
  ON public.squad_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join squads"
  ON public.squad_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave squads"
  ON public.squad_members FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. TRADE REACTIONS TABLE
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

DROP POLICY IF EXISTS "Anyone can view reactions" ON public.trade_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.trade_reactions;
DROP POLICY IF EXISTS "Users can remove own reactions" ON public.trade_reactions;

CREATE POLICY "Anyone can view reactions"
  ON public.trade_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can add reactions"
  ON public.trade_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.trade_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 8. TRADE COMMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.trade_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.trade_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments on shared trades" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can add comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.trade_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.trade_comments;

CREATE POLICY "Anyone can view comments on shared trades"
  ON public.trade_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can add comments"
  ON public.trade_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.trade_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.trade_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 9. MENTOR RELATIONSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentor_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mentor_id, student_id)
);

ALTER TABLE public.mentor_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mentor relationships" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Students can request mentors" ON public.mentor_relationships;
DROP POLICY IF EXISTS "Participants can update relationship" ON public.mentor_relationships;

CREATE POLICY "Users can view own mentor relationships"
  ON public.mentor_relationships FOR SELECT
  USING (auth.uid() = mentor_id OR auth.uid() = student_id);

CREATE POLICY "Students can request mentors"
  ON public.mentor_relationships FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Participants can update relationship"
  ON public.mentor_relationships FOR UPDATE
  USING (auth.uid() = mentor_id OR auth.uid() = student_id);

-- ============================================================================
-- 10. WEEKLY STATS TABLE (for leaderboard)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  total_pnl DECIMAL(12,2) DEFAULT 0,
  avg_r_multiple DECIMAL(6,3),
  consistency_score DECIMAL(5,2),
  league_tier TEXT DEFAULT 'bronze' CHECK (league_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

ALTER TABLE public.weekly_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all weekly stats" ON public.weekly_stats;
DROP POLICY IF EXISTS "System can insert weekly stats" ON public.weekly_stats;

CREATE POLICY "Users can view all weekly stats"
  ON public.weekly_stats FOR SELECT
  USING (true);

CREATE POLICY "System can insert weekly stats"
  ON public.weekly_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 11. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 12. AUTO-CREATE PROFILE TRIGGER
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
-- 13. CREATE PROFILE FOR EXISTING USERS
-- ============================================================================
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Done!
SELECT 'Migration completed successfully!' as status;

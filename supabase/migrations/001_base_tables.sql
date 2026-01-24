-- ============================================================================
-- BASE TABLES FOR TRADING JOURNAL
-- Run this FIRST before 002_multiplayer.sql
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
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

CREATE POLICY "Users can view their own setups"
  ON public.setups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own setups"
  ON public.setups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own setups"
  ON public.setups FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own setups"
  ON public.setups FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_setups_user_id ON public.setups(user_id);

-- ============================================================================
-- 3. TRADES TABLE (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  instrument_id UUID,
  setup_id UUID,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON public.trades(entry_date);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON public.trades(symbol);

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

CREATE POLICY "Users can view their own screenshots"
  ON public.trade_screenshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own screenshots"
  ON public.trade_screenshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own screenshots"
  ON public.trade_screenshots FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own screenshots"
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

CREATE POLICY "Users can view their own journals"
  ON public.daily_journals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journals"
  ON public.daily_journals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journals"
  ON public.daily_journals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journals"
  ON public.daily_journals FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_journals_user_date ON public.daily_journals(user_id, date);

-- ============================================================================
-- 6. AUTO-CREATE PROFILE ON SIGNUP (Trigger)
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- TradingLog Database Schema for Supabase
-- Run this in the Supabase SQL Editor (Database → SQL Editor → New Query)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  default_risk_per_trade DECIMAL(5, 2) DEFAULT 1.00,
  daily_loss_limit DECIMAL(10, 2),
  weekly_loss_limit DECIMAL(10, 2),
  account_size DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ACCOUNTS TABLE (For tracking multiple trading accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT,
  account_number TEXT,
  starting_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INSTRUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  tick_size DECIMAL(10, 4) NOT NULL,
  tick_value DECIMAL(10, 2) NOT NULL,
  exchange TEXT,
  asset_class TEXT DEFAULT 'futures',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- ============================================================================
-- SETUPS TABLE (Trading strategies/patterns)
-- ============================================================================
CREATE TABLE IF NOT EXISTS setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  timeframes TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRADES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  setup_id UUID REFERENCES setups(id) ON DELETE SET NULL,

  -- Basic trade info
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'cancelled')),

  -- Entry details
  entry_date TIMESTAMPTZ NOT NULL,
  entry_price DECIMAL(18, 6) NOT NULL,
  entry_contracts DECIMAL(18, 6) NOT NULL,

  -- Exit details (nullable for open trades)
  exit_date TIMESTAMPTZ,
  exit_price DECIMAL(18, 6),
  exit_contracts DECIMAL(18, 6),

  -- Risk management
  stop_loss DECIMAL(18, 6),
  take_profit DECIMAL(18, 6),
  planned_risk DECIMAL(10, 2),

  -- Financials
  gross_pnl DECIMAL(18, 2),
  commission DECIMAL(18, 2) DEFAULT 0,
  fees DECIMAL(18, 2) DEFAULT 0,
  net_pnl DECIMAL(18, 2),
  r_multiple DECIMAL(8, 4),

  -- Psychology/emotion tags (stored as text arrays)
  emotions TEXT[] DEFAULT '{}',
  mistakes TEXT[] DEFAULT '{}',

  -- Trade quality ratings (1-5)
  entry_rating INTEGER CHECK (entry_rating BETWEEN 1 AND 5),
  exit_rating INTEGER CHECK (exit_rating BETWEEN 1 AND 5),
  management_rating INTEGER CHECK (management_rating BETWEEN 1 AND 5),

  -- Session tracking
  session TEXT,

  -- Notes and review
  notes TEXT,
  lessons TEXT,

  -- Import tracking
  import_source TEXT,
  external_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TRADE SCREENSHOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS trade_screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  screenshot_type TEXT DEFAULT 'other' CHECK (screenshot_type IN ('entry', 'exit', 'setup', 'result', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DAILY JOURNALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pre_market_notes TEXT,
  post_market_notes TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  discipline_rating INTEGER CHECK (discipline_rating BETWEEN 1 AND 5),
  goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- DAILY RISK SNAPSHOTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  starting_balance DECIMAL(15, 2) NOT NULL,
  ending_balance DECIMAL(15, 2) NOT NULL,
  daily_pnl DECIMAL(15, 2) NOT NULL,
  max_drawdown DECIMAL(15, 2),
  trades_taken INTEGER DEFAULT 0,
  win_count INTEGER DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  largest_win DECIMAL(15, 2),
  largest_loss DECIMAL(15, 2),
  daily_limit_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- IMPORT HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  trades_imported INTEGER DEFAULT 0,
  trades_skipped INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_entry_date ON trades(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_user_date ON trades(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_trades_setup_id ON trades(setup_id);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_instruments_user_id ON instruments(user_id);
CREATE INDEX IF NOT EXISTS idx_setups_user_id ON setups(user_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_trade_id ON trade_screenshots(trade_id);
CREATE INDEX IF NOT EXISTS idx_daily_journals_user_date ON daily_journals(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_risk_snapshots_user_date ON daily_risk_snapshots(user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Users can only see their own data
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Accounts policies
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Instruments policies
CREATE POLICY "Users can view own instruments" ON instruments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own instruments" ON instruments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own instruments" ON instruments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own instruments" ON instruments
  FOR DELETE USING (auth.uid() = user_id);

-- Setups policies
CREATE POLICY "Users can view own setups" ON setups
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own setups" ON setups
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own setups" ON setups
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own setups" ON setups
  FOR DELETE USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Trade screenshots policies
CREATE POLICY "Users can view own screenshots" ON trade_screenshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own screenshots" ON trade_screenshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own screenshots" ON trade_screenshots
  FOR DELETE USING (auth.uid() = user_id);

-- Daily journals policies
CREATE POLICY "Users can view own journals" ON daily_journals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journals" ON daily_journals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journals" ON daily_journals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journals" ON daily_journals
  FOR DELETE USING (auth.uid() = user_id);

-- Daily risk snapshots policies
CREATE POLICY "Users can view own risk snapshots" ON daily_risk_snapshots
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk snapshots" ON daily_risk_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own risk snapshots" ON daily_risk_snapshots
  FOR UPDATE USING (auth.uid() = user_id);

-- Import history policies
CREATE POLICY "Users can view own import history" ON import_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import history" ON import_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own import history" ON import_history
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTION: Update timestamp on row update
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER instruments_updated_at
  BEFORE UPDATE ON instruments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER setups_updated_at
  BEFORE UPDATE ON setups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_journals_updated_at
  BEFORE UPDATE ON daily_journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER daily_risk_snapshots_updated_at
  BEFORE UPDATE ON daily_risk_snapshots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER import_history_updated_at
  BEFORE UPDATE ON import_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTION: Create profile on user signup
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

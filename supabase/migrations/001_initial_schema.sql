-- Futures Trading Journal - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Profile Extension
-- ============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  default_risk_per_trade DECIMAL(5,2) DEFAULT 1.00,
  daily_loss_limit DECIMAL(10,2),
  weekly_loss_limit DECIMAL(10,2),
  account_size DECIMAL(15,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Trading Accounts (Multi-account support)
-- ============================================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  broker TEXT,
  account_number TEXT,
  starting_balance DECIMAL(15,2) NOT NULL,
  current_balance DECIMAL(15,2),
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Instrument Definitions
-- ============================================================================
CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  tick_size DECIMAL(10,4) NOT NULL,
  tick_value DECIMAL(10,2) NOT NULL,
  exchange TEXT,
  asset_class TEXT DEFAULT 'futures',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- ============================================================================
-- Trade Setups/Strategies
-- ============================================================================
CREATE TABLE setups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rules TEXT,
  timeframes TEXT[],
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Main Trades Table
-- ============================================================================
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  instrument_id UUID REFERENCES instruments(id) ON DELETE SET NULL,
  setup_id UUID REFERENCES setups(id) ON DELETE SET NULL,

  -- Trade identification
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),

  -- Entry details
  entry_date TIMESTAMPTZ NOT NULL,
  entry_price DECIMAL(15,4) NOT NULL,
  entry_contracts INTEGER NOT NULL,

  -- Exit details (nullable for open trades)
  exit_date TIMESTAMPTZ,
  exit_price DECIMAL(15,4),
  exit_contracts INTEGER,

  -- Risk management
  stop_loss DECIMAL(15,4),
  take_profit DECIMAL(15,4),
  planned_risk DECIMAL(10,2),

  -- Results (calculated or entered)
  gross_pnl DECIMAL(15,2),
  commission DECIMAL(10,2) DEFAULT 0,
  fees DECIMAL(10,2) DEFAULT 0,
  net_pnl DECIMAL(15,2),

  -- R-multiple tracking
  r_multiple DECIMAL(10,2),

  -- Psychology/emotion tags
  emotions TEXT[],

  -- Trade quality ratings (1-5)
  entry_rating INTEGER CHECK (entry_rating BETWEEN 1 AND 5),
  exit_rating INTEGER CHECK (exit_rating BETWEEN 1 AND 5),
  management_rating INTEGER CHECK (management_rating BETWEEN 1 AND 5),

  -- Session tracking
  session TEXT CHECK (session IN ('asian', 'london', 'new_york', 'overnight', 'pre_market', 'regular_hours', 'after_hours')),

  -- Notes and review
  notes TEXT,
  lessons TEXT,
  mistakes TEXT[],

  -- Trade state
  status TEXT DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'cancelled')),

  -- Metadata
  import_source TEXT,
  external_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Trade Screenshots
-- ============================================================================
CREATE TABLE trade_screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  screenshot_type TEXT CHECK (screenshot_type IN ('entry', 'exit', 'setup', 'result', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Daily Journal Entries
-- ============================================================================
CREATE TABLE daily_journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  pre_market_notes TEXT,
  post_market_notes TEXT,
  mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
  focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
  discipline_rating INTEGER CHECK (discipline_rating BETWEEN 1 AND 5),
  goals TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- Daily Risk Snapshots
-- ============================================================================
CREATE TABLE daily_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  starting_balance DECIMAL(15,2),
  ending_balance DECIMAL(15,2),
  daily_pnl DECIMAL(15,2),
  max_drawdown DECIMAL(15,2),
  trades_taken INTEGER,
  win_count INTEGER,
  loss_count INTEGER,
  largest_win DECIMAL(15,2),
  largest_loss DECIMAL(15,2),
  daily_limit_hit BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- Import History
-- ============================================================================
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  trades_imported INTEGER,
  trades_skipped INTEGER,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_entry_date ON trades(entry_date DESC);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_setup_id ON trades(setup_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_screenshots_trade_id ON trade_screenshots(trade_id);
CREATE INDEX idx_daily_journals_user_date ON daily_journals(user_id, date DESC);
CREATE INDEX idx_risk_snapshots_user_date ON daily_risk_snapshots(user_id, date DESC);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for accounts
CREATE POLICY "Users can manage own accounts" ON accounts
  FOR ALL USING (auth.uid() = user_id);

-- Policies for instruments
CREATE POLICY "Users can manage own instruments" ON instruments
  FOR ALL USING (auth.uid() = user_id);

-- Policies for setups
CREATE POLICY "Users can manage own setups" ON setups
  FOR ALL USING (auth.uid() = user_id);

-- Policies for trades
CREATE POLICY "Users can manage own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

-- Policies for screenshots
CREATE POLICY "Users can manage own screenshots" ON trade_screenshots
  FOR ALL USING (auth.uid() = user_id);

-- Policies for daily journals
CREATE POLICY "Users can manage own journals" ON daily_journals
  FOR ALL USING (auth.uid() = user_id);

-- Policies for risk snapshots
CREATE POLICY "Users can manage own snapshots" ON daily_risk_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- Policies for import history
CREATE POLICY "Users can manage own imports" ON import_history
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Functions
-- ============================================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setups_updated_at
  BEFORE UPDATE ON setups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_journals_updated_at
  BEFORE UPDATE ON daily_journals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Default Data (insert for each new user via function)
-- ============================================================================

-- Function to insert default instruments for new users
CREATE OR REPLACE FUNCTION insert_default_instruments(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO instruments (user_id, symbol, name, tick_size, tick_value, exchange, asset_class) VALUES
    (p_user_id, 'ES', 'E-mini S&P 500', 0.25, 12.50, 'CME', 'Index'),
    (p_user_id, 'NQ', 'E-mini NASDAQ 100', 0.25, 5.00, 'CME', 'Index'),
    (p_user_id, 'YM', 'E-mini Dow', 1.00, 5.00, 'CBOT', 'Index'),
    (p_user_id, 'RTY', 'E-mini Russell 2000', 0.10, 5.00, 'CME', 'Index'),
    (p_user_id, 'MES', 'Micro E-mini S&P 500', 0.25, 1.25, 'CME', 'Index'),
    (p_user_id, 'MNQ', 'Micro E-mini NASDAQ 100', 0.25, 0.50, 'CME', 'Index'),
    (p_user_id, 'MYM', 'Micro E-mini Dow', 1.00, 0.50, 'CBOT', 'Index');
END;
$$ LANGUAGE plpgsql;

-- Modify the handle_new_user function to also insert default instruments
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);

  -- Insert default instruments
  PERFORM insert_default_instruments(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Minimal setup: Just the trades table
-- Run this in Supabase SQL Editor: Database → SQL Editor → New Query

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing trades table and policies if they exist
DROP POLICY IF EXISTS "Users can view own trades" ON trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
DROP POLICY IF EXISTS "Users can update own trades" ON trades;
DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
DROP TABLE IF EXISTS trades CASCADE;

-- Create the trades table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  instrument_id UUID,
  setup_id UUID,

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

-- Create indexes for performance
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_entry_date ON trades(entry_date DESC);
CREATE INDEX idx_trades_symbol ON trades(symbol);

-- Enable Row Level Security
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - users can only access their own trades
CREATE POLICY "Users can view own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades" ON trades
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the table was created
SELECT 'Trades table created successfully!' as status;

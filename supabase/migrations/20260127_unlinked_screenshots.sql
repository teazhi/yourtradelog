-- Migration: Add unlinked screenshots support
-- This allows users to upload screenshots during trading and link them to trades later

-- First, ensure the journal_screenshots table exists
CREATE TABLE IF NOT EXISTS journal_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  screenshot_type TEXT NOT NULL DEFAULT 'general',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trade_id column if it doesn't exist (for linking screenshots to trades later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'journal_screenshots' AND column_name = 'trade_id'
  ) THEN
    ALTER TABLE journal_screenshots ADD COLUMN trade_id UUID REFERENCES trades(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_journal_screenshots_user_date ON journal_screenshots(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_screenshots_user_type ON journal_screenshots(user_id, screenshot_type);
CREATE INDEX IF NOT EXISTS idx_journal_screenshots_trade_id ON journal_screenshots(trade_id);

-- Enable RLS
ALTER TABLE journal_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS policies (if not already created)
DO $$
BEGIN
  -- Drop existing policies if they exist (to avoid conflicts)
  DROP POLICY IF EXISTS "Users can view own journal screenshots" ON journal_screenshots;
  DROP POLICY IF EXISTS "Users can insert own journal screenshots" ON journal_screenshots;
  DROP POLICY IF EXISTS "Users can update own journal screenshots" ON journal_screenshots;
  DROP POLICY IF EXISTS "Users can delete own journal screenshots" ON journal_screenshots;

  -- Create new policies
  CREATE POLICY "Users can view own journal screenshots"
    ON journal_screenshots FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert own journal screenshots"
    ON journal_screenshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own journal screenshots"
    ON journal_screenshots FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own journal screenshots"
    ON journal_screenshots FOR DELETE
    USING (auth.uid() = user_id);
END $$;

-- Grant permissions
GRANT ALL ON journal_screenshots TO authenticated;

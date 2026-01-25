-- ============================================================================
-- JOURNAL SCREENSHOTS TABLE
-- ============================================================================

-- Create journal_screenshots table for storing daily trading screenshots
-- Uses the same storage bucket as trade_screenshots (trade-screenshots)
CREATE TABLE IF NOT EXISTS journal_screenshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  screenshot_type TEXT DEFAULT 'other',
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_journal_screenshots_user_date
  ON journal_screenshots(user_id, date);

-- Enable Row Level Security
ALTER TABLE journal_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

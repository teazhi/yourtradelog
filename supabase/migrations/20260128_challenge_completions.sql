-- Track challenge completions to prevent XP farming
-- Each completion is recorded with the date/week it was completed

CREATE TABLE IF NOT EXISTS challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly')),
  -- For daily challenges: YYYY-MM-DD format
  -- For weekly challenges: YYYY-WW format (year and week number)
  period_key TEXT NOT NULL,
  xp_awarded INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure a user can only complete a challenge once per period
  UNIQUE(user_id, challenge_id, period_key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user_period
  ON challenge_completions(user_id, period_key);

CREATE INDEX IF NOT EXISTS idx_challenge_completions_user_type
  ON challenge_completions(user_id, challenge_type);

-- Enable RLS
ALTER TABLE challenge_completions ENABLE ROW LEVEL SECURITY;

-- Users can only see/insert their own completions
CREATE POLICY "Users can view own challenge completions"
  ON challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge completions"
  ON challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No updates or deletes allowed (prevents manipulation)
-- Completions are immutable once recorded

-- Personal Trading Rules System
-- Allows users to define their own trading rules and track daily compliance

-- ============================================================================
-- User Rules Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('risk', 'discipline', 'process', 'mindset', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_rules_user_id ON user_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rules_active ON user_rules(user_id, is_active);

-- RLS Policies for user_rules
ALTER TABLE user_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rules"
  ON user_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rules"
  ON user_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules"
  ON user_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules"
  ON user_rules FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- User Rule Checks Table (Daily Compliance Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_rule_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES user_rules(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  followed BOOLEAN NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one check per rule per day
  UNIQUE(rule_id, check_date)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_rule_checks_user_id ON user_rule_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rule_checks_rule_id ON user_rule_checks(rule_id);
CREATE INDEX IF NOT EXISTS idx_user_rule_checks_date ON user_rule_checks(check_date);
CREATE INDEX IF NOT EXISTS idx_user_rule_checks_user_date ON user_rule_checks(user_id, check_date);

-- RLS Policies for user_rule_checks
ALTER TABLE user_rule_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rule checks"
  ON user_rule_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rule checks"
  ON user_rule_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rule checks"
  ON user_rule_checks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rule checks"
  ON user_rule_checks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Trigger to update updated_at on user_rules
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_rules_updated_at
  BEFORE UPDATE ON user_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rules_updated_at();

-- ============================================================================
-- Function to calculate rule streak
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rule_streak(p_rule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_record RECORD;
BEGIN
  -- Get checks ordered by date descending
  FOR check_record IN
    SELECT followed, check_date
    FROM user_rule_checks
    WHERE rule_id = p_rule_id
    ORDER BY check_date DESC
  LOOP
    IF check_record.followed THEN
      current_streak := current_streak + 1;
    ELSE
      EXIT; -- Streak broken
    END IF;
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function to calculate all rules streak for a user (all rules followed on same day)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_all_rules_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE;
  rules_count INTEGER;
  followed_count INTEGER;
BEGIN
  -- Get total active rules count
  SELECT COUNT(*) INTO rules_count
  FROM user_rules
  WHERE user_id = p_user_id AND is_active = true;

  -- If no rules, return 0
  IF rules_count = 0 THEN
    RETURN 0;
  END IF;

  -- Check each day going backwards
  FOR check_date IN
    SELECT DISTINCT urc.check_date
    FROM user_rule_checks urc
    JOIN user_rules ur ON urc.rule_id = ur.id
    WHERE urc.user_id = p_user_id AND ur.is_active = true
    ORDER BY urc.check_date DESC
  LOOP
    -- Count how many rules were followed on this day
    SELECT COUNT(*) INTO followed_count
    FROM user_rule_checks urc
    JOIN user_rules ur ON urc.rule_id = ur.id
    WHERE urc.user_id = p_user_id
      AND ur.is_active = true
      AND urc.check_date = check_date
      AND urc.followed = true;

    -- If all rules were followed, increment streak
    IF followed_count >= rules_count THEN
      current_streak := current_streak + 1;
    ELSE
      EXIT; -- Streak broken
    END IF;
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;

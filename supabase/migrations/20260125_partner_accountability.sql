-- ============================================================================
-- Partner Accountability System Migration
-- Created: 2026-01-25
-- Description: Complete database schema for partner challenges, rules, and accountability
-- ============================================================================

-- ============================================================================
-- 1. ACCOUNTABILITY PARTNERS TABLE (already exists, but ensure proper structure)
-- ============================================================================

-- Add username column to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE profiles ADD COLUMN username text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Ensure accountability_partners table exists with proper structure
CREATE TABLE IF NOT EXISTS accountability_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure no duplicate partnerships
  CONSTRAINT unique_partnership UNIQUE (user_id, partner_id),
  -- Prevent self-partnerships
  CONSTRAINT no_self_partnership CHECK (user_id != partner_id)
);

-- Indexes for accountability_partners
CREATE INDEX IF NOT EXISTS accountability_partners_user_id_idx ON accountability_partners(user_id);
CREATE INDEX IF NOT EXISTS accountability_partners_partner_id_idx ON accountability_partners(partner_id);
CREATE INDEX IF NOT EXISTS accountability_partners_status_idx ON accountability_partners(status);

-- ============================================================================
-- 2. PARTNER TRADING RULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES accountability_partners(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  stake_amount decimal(10, 2) NOT NULL DEFAULT 0 CHECK (stake_amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_rules_partnership_id_idx ON partner_rules(partnership_id);
CREATE INDEX IF NOT EXISTS partner_rules_is_active_idx ON partner_rules(is_active);

-- ============================================================================
-- 3. RULE VIOLATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_rule_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES partner_rules(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- who violated
  reported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- who reported (usually self)
  notes text,
  amount_owed decimal(10, 2) NOT NULL,
  is_settled boolean NOT NULL DEFAULT false,
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_rule_violations_rule_id_idx ON partner_rule_violations(rule_id);
CREATE INDEX IF NOT EXISTS partner_rule_violations_user_id_idx ON partner_rule_violations(user_id);
CREATE INDEX IF NOT EXISTS partner_rule_violations_is_settled_idx ON partner_rule_violations(is_settled);

-- ============================================================================
-- 4. PARTNER CHALLENGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES accountability_partners(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL DEFAULT 'custom' CHECK (
    challenge_type IN ('green_days', 'journal_streak', 'profit_target', 'no_violations', 'discipline_streak', 'custom')
  ),
  metric text, -- what's being measured (e.g., 'profitable_days', 'journal_entries', 'pnl')
  target_value decimal(10, 2) NOT NULL,
  stake_amount decimal(10, 2) NOT NULL DEFAULT 0 CHECK (stake_amount >= 0),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  winner_id uuid REFERENCES profiles(id),
  outcome text CHECK (outcome IN ('user1_won', 'user2_won', 'tie', 'both_won', 'both_lost', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ensure end date is after start date
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_challenges_partnership_id_idx ON partner_challenges(partnership_id);
CREATE INDEX IF NOT EXISTS partner_challenges_status_idx ON partner_challenges(status);
CREATE INDEX IF NOT EXISTS partner_challenges_dates_idx ON partner_challenges(start_date, end_date);

-- ============================================================================
-- 5. CHALLENGE PROGRESS TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES partner_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  progress_value decimal(10, 2) NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),

  -- One progress record per user per challenge
  CONSTRAINT unique_user_challenge_progress UNIQUE (challenge_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_challenge_progress_challenge_id_idx ON partner_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS partner_challenge_progress_user_id_idx ON partner_challenge_progress(user_id);

-- ============================================================================
-- 6. DAILY CHECK-INS
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES accountability_partners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_type text NOT NULL CHECK (check_in_type IN ('pre_market', 'post_market')),

  -- Pre-market fields
  checked_calendar boolean DEFAULT false,
  marked_levels boolean DEFAULT false,
  has_bias boolean DEFAULT false,
  set_max_loss boolean DEFAULT false,
  trading_plan text,

  -- Post-market fields
  daily_pnl decimal(10, 2),
  followed_rules boolean,
  session_notes text,

  created_at timestamptz NOT NULL DEFAULT now(),

  -- One check-in per type per day per user
  CONSTRAINT unique_daily_check_in UNIQUE (partnership_id, user_id, check_in_date, check_in_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_check_ins_partnership_id_idx ON partner_check_ins(partnership_id);
CREATE INDEX IF NOT EXISTS partner_check_ins_user_id_idx ON partner_check_ins(user_id);
CREATE INDEX IF NOT EXISTS partner_check_ins_date_idx ON partner_check_ins(check_in_date);

-- ============================================================================
-- 7. SETTLEMENTS (Money owed tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partnership_id uuid NOT NULL REFERENCES accountability_partners(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL, -- 'rule_violation', 'challenge_loss', 'manual'
  reference_id uuid, -- ID of the violation or challenge
  reference_type text, -- 'violation', 'challenge'
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'forgiven', 'disputed')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_settlements_partnership_id_idx ON partner_settlements(partnership_id);
CREATE INDEX IF NOT EXISTS partner_settlements_from_user_idx ON partner_settlements(from_user_id);
CREATE INDEX IF NOT EXISTS partner_settlements_to_user_idx ON partner_settlements(to_user_id);
CREATE INDEX IF NOT EXISTS partner_settlements_status_idx ON partner_settlements(status);

-- ============================================================================
-- 8. PARTNER NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partnership_id uuid REFERENCES accountability_partners(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (
    notification_type IN (
      'partner_request', 'partner_accepted', 'partner_declined', 'partnership_ended',
      'new_challenge', 'challenge_accepted', 'challenge_progress', 'challenge_completed',
      'new_rule', 'rule_violation', 'violation_settled',
      'check_in_reminder', 'partner_checked_in',
      'settlement_requested', 'settlement_paid'
    )
  ),
  title text NOT NULL,
  message text,
  reference_id uuid, -- ID of related entity
  reference_type text, -- 'challenge', 'rule', 'violation', 'settlement', etc.
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_notifications_user_id_idx ON partner_notifications(user_id);
CREATE INDEX IF NOT EXISTS partner_notifications_is_read_idx ON partner_notifications(is_read);
CREATE INDEX IF NOT EXISTS partner_notifications_created_at_idx ON partner_notifications(created_at DESC);

-- ============================================================================
-- 9. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE accountability_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_rule_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_notifications ENABLE ROW LEVEL SECURITY;

-- Accountability Partners Policies
CREATE POLICY "Users can view their own partnerships" ON accountability_partners
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create partnership requests" ON accountability_partners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their partnerships" ON accountability_partners
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can delete their partnerships" ON accountability_partners
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = partner_id);

-- Partner Rules Policies
CREATE POLICY "Partners can view rules" ON partner_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accountability_partners ap
      WHERE ap.id = partner_rules.partnership_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can create rules" ON partner_rules
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM accountability_partners ap
      WHERE ap.id = partnership_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
      AND ap.status = 'active'
    )
  );

CREATE POLICY "Rule creators can update rules" ON partner_rules
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Rule creators can delete rules" ON partner_rules
  FOR DELETE USING (auth.uid() = created_by);

-- Rule Violations Policies
CREATE POLICY "Partners can view violations" ON partner_rule_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partner_rules pr
      JOIN accountability_partners ap ON ap.id = pr.partnership_id
      WHERE pr.id = partner_rule_violations.rule_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can report violations" ON partner_rule_violations
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Violators can update their violations" ON partner_rule_violations
  FOR UPDATE USING (auth.uid() = user_id);

-- Challenges Policies
CREATE POLICY "Partners can view challenges" ON partner_challenges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accountability_partners ap
      WHERE ap.id = partner_challenges.partnership_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can create challenges" ON partner_challenges
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM accountability_partners ap
      WHERE ap.id = partnership_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
      AND ap.status = 'active'
    )
  );

CREATE POLICY "Challenge creators can update challenges" ON partner_challenges
  FOR UPDATE USING (auth.uid() = created_by);

-- Challenge Progress Policies
CREATE POLICY "Partners can view progress" ON partner_challenge_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM partner_challenges pc
      JOIN accountability_partners ap ON ap.id = pc.partnership_id
      WHERE pc.id = partner_challenge_progress.challenge_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can update their own progress" ON partner_challenge_progress
  FOR ALL USING (auth.uid() = user_id);

-- Check-ins Policies
CREATE POLICY "Partners can view check-ins" ON partner_check_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accountability_partners ap
      WHERE ap.id = partner_check_ins.partnership_id
      AND (ap.user_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own check-ins" ON partner_check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check-ins" ON partner_check_ins
  FOR UPDATE USING (auth.uid() = user_id);

-- Settlements Policies
CREATE POLICY "Involved users can view settlements" ON partner_settlements
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Debtors can create settlements" ON partner_settlements
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Involved users can update settlements" ON partner_settlements
  FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Notifications Policies
CREATE POLICY "Users can view their notifications" ON partner_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON partner_notifications
  FOR INSERT WITH CHECK (true); -- Will be called from server/functions

CREATE POLICY "Users can update their notifications" ON partner_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to get partnership by either user
CREATE OR REPLACE FUNCTION get_active_partnership(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  partner_id uuid,
  status text,
  created_at timestamptz,
  partner_profile jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ap.id,
    ap.user_id,
    ap.partner_id,
    ap.status,
    ap.created_at,
    jsonb_build_object(
      'id', CASE WHEN ap.user_id = p_user_id THEN p2.id ELSE p1.id END,
      'username', CASE WHEN ap.user_id = p_user_id THEN p2.username ELSE p1.username END,
      'display_name', CASE WHEN ap.user_id = p_user_id THEN p2.display_name ELSE p1.display_name END,
      'avatar_url', CASE WHEN ap.user_id = p_user_id THEN p2.avatar_url ELSE p1.avatar_url END
    ) as partner_profile
  FROM accountability_partners ap
  JOIN profiles p1 ON p1.id = ap.user_id
  JOIN profiles p2 ON p2.id = ap.partner_id
  WHERE (ap.user_id = p_user_id OR ap.partner_id = p_user_id)
  AND ap.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate money owed between partners
CREATE OR REPLACE FUNCTION get_partner_balance(p_partnership_id uuid)
RETURNS TABLE (
  user1_id uuid,
  user2_id uuid,
  user1_owes decimal,
  user2_owes decimal,
  net_balance decimal
) AS $$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  v_user1_violations decimal := 0;
  v_user2_violations decimal := 0;
  v_user1_challenge_losses decimal := 0;
  v_user2_challenge_losses decimal := 0;
  v_user1_settlements decimal := 0;
  v_user2_settlements decimal := 0;
BEGIN
  -- Get the two users
  SELECT user_id, partner_id INTO v_user1_id, v_user2_id
  FROM accountability_partners WHERE id = p_partnership_id;

  -- Sum unsettled violations for each user
  SELECT COALESCE(SUM(amount_owed), 0) INTO v_user1_violations
  FROM partner_rule_violations prv
  JOIN partner_rules pr ON pr.id = prv.rule_id
  WHERE pr.partnership_id = p_partnership_id
  AND prv.user_id = v_user1_id
  AND prv.is_settled = false;

  SELECT COALESCE(SUM(amount_owed), 0) INTO v_user2_violations
  FROM partner_rule_violations prv
  JOIN partner_rules pr ON pr.id = prv.rule_id
  WHERE pr.partnership_id = p_partnership_id
  AND prv.user_id = v_user2_id
  AND prv.is_settled = false;

  -- Sum pending settlements
  SELECT COALESCE(SUM(amount), 0) INTO v_user1_settlements
  FROM partner_settlements
  WHERE partnership_id = p_partnership_id
  AND from_user_id = v_user1_id
  AND status = 'pending';

  SELECT COALESCE(SUM(amount), 0) INTO v_user2_settlements
  FROM partner_settlements
  WHERE partnership_id = p_partnership_id
  AND from_user_id = v_user2_id
  AND status = 'pending';

  RETURN QUERY SELECT
    v_user1_id,
    v_user2_id,
    v_user1_violations + v_user1_challenge_losses - v_user1_settlements,
    v_user2_violations + v_user2_challenge_losses - v_user2_settlements,
    (v_user1_violations + v_user1_challenge_losses - v_user1_settlements) -
    (v_user2_violations + v_user2_challenge_losses - v_user2_settlements);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_partner_notification(
  p_user_id uuid,
  p_partnership_id uuid,
  p_type text,
  p_title text,
  p_message text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO partner_notifications (
    user_id, partnership_id, notification_type, title, message, reference_id, reference_type
  ) VALUES (
    p_user_id, p_partnership_id, p_type, p_title, p_message, p_reference_id, p_reference_type
  ) RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DROP TRIGGER IF EXISTS update_accountability_partners_updated_at ON accountability_partners;
CREATE TRIGGER update_accountability_partners_updated_at
  BEFORE UPDATE ON accountability_partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_rules_updated_at ON partner_rules;
CREATE TRIGGER update_partner_rules_updated_at
  BEFORE UPDATE ON partner_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_challenges_updated_at ON partner_challenges;
CREATE TRIGGER update_partner_challenges_updated_at
  BEFORE UPDATE ON partner_challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_settlements_updated_at ON partner_settlements;
CREATE TRIGGER update_partner_settlements_updated_at
  BEFORE UPDATE ON partner_settlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 12. REALTIME SUBSCRIPTIONS
-- ============================================================================

-- Enable realtime for partner tables
ALTER PUBLICATION supabase_realtime ADD TABLE accountability_partners;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_rule_violations;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_challenge_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_check_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_settlements;
ALTER PUBLICATION supabase_realtime ADD TABLE partner_notifications;

-- Secure Challenge Completion System
-- This function validates challenge completion server-side before awarding XP
-- Users cannot manipulate this - it queries actual data to verify

-- Drop existing function if exists
DROP FUNCTION IF EXISTS complete_challenge(TEXT, TEXT, TEXT);

-- Create secure function to complete a challenge
-- This function:
-- 1. Verifies the user is authenticated
-- 2. Checks if the challenge was already completed for this period
-- 3. Validates the challenge is actually complete by querying real data
-- 4. Awards XP only if validation passes
CREATE OR REPLACE FUNCTION complete_challenge(
  p_challenge_id TEXT,
  p_challenge_type TEXT,
  p_period_key TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_xp_to_award INTEGER;
  v_is_valid BOOLEAN := FALSE;
  v_current_xp INTEGER;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_new_title TEXT;
  v_already_completed BOOLEAN;
  v_today DATE;
  v_week_start DATE;
  -- Stats for validation
  v_journal_today BOOLEAN;
  v_journals_this_week INTEGER;
  v_trades_reviewed_today INTEGER;
  v_trades_reviewed_week INTEGER;
  v_notes_today INTEGER;
  v_has_pre_market BOOLEAN;
  v_has_post_market BOOLEAN;
  v_weekly_review_done BOOLEAN;
  v_lessons_today INTEGER;
  v_lessons_week INTEGER;
  v_trades_with_setup INTEGER;
  v_trades_with_sl INTEGER;
  v_all_trades_have_notes BOOLEAN;
  v_week_trade_count INTEGER;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if already completed
  SELECT EXISTS(
    SELECT 1 FROM challenge_completions
    WHERE user_id = v_user_id
    AND challenge_id = p_challenge_id
    AND period_key = p_period_key
  ) INTO v_already_completed;

  IF v_already_completed THEN
    RETURN json_build_object('success', false, 'error', 'Challenge already completed for this period');
  END IF;

  -- Calculate dates
  v_today := CURRENT_DATE;
  v_week_start := v_today - EXTRACT(DOW FROM v_today)::INTEGER;

  -- Gather actual stats from database for validation
  -- Check journal today
  SELECT EXISTS(
    SELECT 1 FROM daily_journals
    WHERE user_id = v_user_id
    AND date = v_today
    AND (
      (pre_market_notes IS NOT NULL AND pre_market_notes != '') OR
      (post_market_notes IS NOT NULL AND post_market_notes != '') OR
      (lessons_learned IS NOT NULL AND lessons_learned != '')
    )
  ) INTO v_journal_today;

  -- Count journals this week
  SELECT COUNT(*) FROM daily_journals
  WHERE user_id = v_user_id
  AND date >= v_week_start
  AND (
    (pre_market_notes IS NOT NULL AND pre_market_notes != '') OR
    (post_market_notes IS NOT NULL AND post_market_notes != '')
  ) INTO v_journals_this_week;

  -- Check pre-market notes today
  SELECT EXISTS(
    SELECT 1 FROM daily_journals
    WHERE user_id = v_user_id
    AND date = v_today
    AND pre_market_notes IS NOT NULL
    AND pre_market_notes != ''
  ) INTO v_has_pre_market;

  -- Check post-market notes today
  SELECT EXISTS(
    SELECT 1 FROM daily_journals
    WHERE user_id = v_user_id
    AND date = v_today
    AND post_market_notes IS NOT NULL
    AND post_market_notes != ''
  ) INTO v_has_post_market;

  -- Check weekly review
  SELECT EXISTS(
    SELECT 1 FROM daily_journals
    WHERE user_id = v_user_id
    AND date >= v_week_start
    AND (
      (weekly_review_notes IS NOT NULL AND weekly_review_notes != '') OR
      (weekly_wins IS NOT NULL AND weekly_wins != '') OR
      (weekly_improvements IS NOT NULL AND weekly_improvements != '')
    )
  ) INTO v_weekly_review_done;

  -- Count trades reviewed today (with ratings)
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND created_at >= v_today
  AND (entry_rating IS NOT NULL OR exit_rating IS NOT NULL OR management_rating IS NOT NULL)
  INTO v_trades_reviewed_today;

  -- Count trades reviewed this week
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND entry_date >= v_week_start
  AND (entry_rating IS NOT NULL OR exit_rating IS NOT NULL OR management_rating IS NOT NULL)
  INTO v_trades_reviewed_week;

  -- Count trades with notes today
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND created_at >= v_today
  AND notes IS NOT NULL AND notes != ''
  INTO v_notes_today;

  -- Count trades with lessons today
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND created_at >= v_today
  AND lessons IS NOT NULL AND lessons != ''
  INTO v_lessons_today;

  -- Count trades with lessons this week
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND entry_date >= v_week_start
  AND lessons IS NOT NULL AND lessons != ''
  INTO v_lessons_week;

  -- Count trades with setups this week
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND entry_date >= v_week_start
  AND setup_id IS NOT NULL
  INTO v_trades_with_setup;

  -- Count trades with stop losses this week
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND entry_date >= v_week_start
  AND stop_loss IS NOT NULL
  INTO v_trades_with_sl;

  -- Count all trades this week and check if all have notes
  SELECT COUNT(*) FROM trades
  WHERE user_id = v_user_id
  AND entry_date >= v_week_start
  INTO v_week_trade_count;

  IF v_week_trade_count > 0 THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM trades
      WHERE user_id = v_user_id
      AND entry_date >= v_week_start
      AND (notes IS NULL OR notes = '')
    ) INTO v_all_trades_have_notes;
  ELSE
    v_all_trades_have_notes := FALSE;
  END IF;

  -- Validate based on challenge ID and set XP
  CASE p_challenge_id
    -- Daily challenges
    WHEN 'write_journal' THEN
      v_is_valid := v_journal_today;
      v_xp_to_award := 15;
    WHEN 'add_notes' THEN
      v_is_valid := v_notes_today >= 1;
      v_xp_to_award := 20;
    WHEN 'review_trade' THEN
      v_is_valid := v_trades_reviewed_today >= 1;
      v_xp_to_award := 15;
    WHEN 'pre_market_prep' THEN
      v_is_valid := v_has_pre_market;
      v_xp_to_award := 20;
    WHEN 'post_market_review' THEN
      v_is_valid := v_has_post_market;
      v_xp_to_award := 20;
    WHEN 'document_lesson' THEN
      v_is_valid := v_lessons_today >= 1;
      v_xp_to_award := 25;
    WHEN 'use_setup' THEN
      v_is_valid := v_trades_with_setup >= 1;
      v_xp_to_award := 15;
    WHEN 'risk_management' THEN
      v_is_valid := v_trades_with_sl >= 1;
      v_xp_to_award := 20;
    WHEN 'mindful_trading' THEN
      v_is_valid := v_trades_reviewed_today >= 2;
      v_xp_to_award := 25;
    WHEN 'focus_session' THEN
      v_is_valid := v_notes_today >= 2;
      v_xp_to_award := 30;
    -- Weekly challenges
    WHEN 'weekly_journal' THEN
      v_is_valid := v_journals_this_week >= 3;
      v_xp_to_award := 40;
    WHEN 'weekly_review' THEN
      v_is_valid := v_weekly_review_done;
      v_xp_to_award := 50;
    WHEN 'review_trades' THEN
      v_is_valid := v_trades_reviewed_week >= 5;
      v_xp_to_award := 45;
    WHEN 'document_lessons' THEN
      v_is_valid := v_lessons_week >= 3;
      v_xp_to_award := 35;
    WHEN 'consistent_logging' THEN
      v_is_valid := v_all_trades_have_notes AND v_week_trade_count > 0;
      v_xp_to_award := 60;
    WHEN 'setup_master' THEN
      v_is_valid := v_trades_with_setup >= 5;
      v_xp_to_award := 40;
    WHEN 'risk_discipline' THEN
      v_is_valid := v_trades_with_sl >= 5;
      v_xp_to_award := 50;
    WHEN 'pattern_hunter' THEN
      v_is_valid := v_trades_reviewed_week >= 6;
      v_xp_to_award := 55;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Unknown challenge ID');
  END CASE;

  -- If validation failed, return error
  IF NOT v_is_valid THEN
    RETURN json_build_object('success', false, 'error', 'Challenge requirements not met');
  END IF;

  -- Insert completion record
  INSERT INTO challenge_completions (user_id, challenge_id, challenge_type, period_key, xp_awarded)
  VALUES (v_user_id, p_challenge_id, p_challenge_type, p_period_key, v_xp_to_award);

  -- Get current XP
  SELECT COALESCE(total_xp, 0) INTO v_current_xp
  FROM profiles
  WHERE id = v_user_id;

  -- Calculate new XP and level
  v_new_xp := v_current_xp + v_xp_to_award;

  -- Determine level based on XP
  SELECT level, title INTO v_new_level, v_new_title
  FROM (
    VALUES
      (1, 'Rookie', 0),
      (2, 'Apprentice', 100),
      (3, 'Novice Trader', 250),
      (4, 'Journeyman', 500),
      (5, 'Skilled Trader', 850),
      (6, 'Experienced', 1300),
      (7, 'Veteran', 1900),
      (8, 'Expert Trader', 2600),
      (9, 'Master Trader', 3500),
      (10, 'Elite Trader', 4600),
      (11, 'Champion', 6000),
      (12, 'Legend', 7700),
      (13, 'Grandmaster', 9700),
      (14, 'Trading Sage', 12000),
      (15, 'Market Wizard', 15000)
  ) AS levels(level, title, min_xp)
  WHERE min_xp <= v_new_xp
  ORDER BY min_xp DESC
  LIMIT 1;

  -- Update profile
  UPDATE profiles
  SET total_xp = v_new_xp,
      current_level = v_new_level,
      trader_title = v_new_title,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN json_build_object(
    'success', true,
    'xp_awarded', v_xp_to_award,
    'new_total_xp', v_new_xp,
    'new_level', v_new_level,
    'new_title', v_new_title
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION complete_challenge(TEXT, TEXT, TEXT) TO authenticated;

-- Revoke direct insert on challenge_completions from regular users
-- They must use the function instead
REVOKE INSERT ON challenge_completions FROM authenticated;
REVOKE UPDATE ON challenge_completions FROM authenticated;
REVOKE DELETE ON challenge_completions FROM authenticated;

-- Only allow select for viewing history
GRANT SELECT ON challenge_completions TO authenticated;

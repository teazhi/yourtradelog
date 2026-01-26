/**
 * Partner Accountability System Types
 * Complete type definitions for the partner feature
 */

// ============================================================================
// Base Types
// ============================================================================

export type PartnershipStatus = 'pending' | 'active' | 'declined' | 'ended';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type ChallengeType = 'green_days' | 'journal_streak' | 'profit_target' | 'no_violations' | 'discipline_streak' | 'custom';
export type ChallengeOutcome = 'user1_won' | 'user2_won' | 'tie' | 'both_won' | 'both_lost' | 'cancelled';
export type CheckInType = 'pre_market' | 'post_market';
export type SettlementStatus = 'pending' | 'paid' | 'forgiven' | 'disputed';
export type SettlementReason = 'rule_violation' | 'challenge_loss' | 'manual';

export type PartnerNotificationType =
  | 'partner_request'
  | 'partner_accepted'
  | 'partner_declined'
  | 'partnership_ended'
  | 'new_challenge'
  | 'challenge_accepted'
  | 'challenge_progress'
  | 'challenge_completed'
  | 'new_rule'
  | 'rule_violation'
  | 'violation_settled'
  | 'check_in_reminder'
  | 'partner_checked_in'
  | 'settlement_requested'
  | 'settlement_paid';

// ============================================================================
// Partner Profile (minimal for display)
// ============================================================================

export interface PartnerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// ============================================================================
// Accountability Partnership
// ============================================================================

export interface AccountabilityPartnership {
  id: string;
  user_id: string;
  partner_id: string;
  status: PartnershipStatus;
  created_at: string;
  updated_at: string;
  // Joined data
  partner_profile?: PartnerProfile;
}

export interface PartnershipInsert {
  user_id: string;
  partner_id: string;
  status?: PartnershipStatus;
}

export interface PartnershipUpdate {
  status?: PartnershipStatus;
}

// ============================================================================
// Partner Rules
// ============================================================================

export interface PartnerRule {
  id: string;
  partnership_id: string;
  created_by: string;
  title: string;
  description: string | null;
  stake_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  my_violations?: number;
  partner_violations?: number;
  total_owed_by_me?: number;
  total_owed_to_me?: number;
}

export interface PartnerRuleInsert {
  partnership_id: string;
  created_by: string;
  title: string;
  description?: string;
  stake_amount: number;
  is_active?: boolean;
}

export interface PartnerRuleUpdate {
  title?: string;
  description?: string;
  stake_amount?: number;
  is_active?: boolean;
}

// ============================================================================
// Rule Violations
// ============================================================================

export interface RuleViolation {
  id: string;
  rule_id: string;
  user_id: string;
  reported_by: string;
  notes: string | null;
  amount_owed: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
  // Joined data
  rule?: PartnerRule;
  user_profile?: PartnerProfile;
}

export interface RuleViolationInsert {
  rule_id: string;
  user_id: string;
  reported_by: string;
  notes?: string;
  amount_owed: number;
}

export interface RuleViolationUpdate {
  is_settled?: boolean;
  settled_at?: string;
  notes?: string;
}

// ============================================================================
// Partner Challenges
// ============================================================================

export interface PartnerChallenge {
  id: string;
  partnership_id: string;
  created_by: string;
  title: string;
  description: string | null;
  challenge_type: ChallengeType;
  metric: string | null;
  target_value: number;
  stake_amount: number;
  start_date: string;
  end_date: string;
  status: ChallengeStatus;
  winner_id: string | null;
  outcome: ChallengeOutcome | null;
  created_at: string;
  updated_at: string;
  // Computed/joined
  my_progress?: number;
  partner_progress?: number;
  days_remaining?: number;
  is_my_challenge?: boolean;
  i_am_winning?: boolean;
}

export interface PartnerChallengeInsert {
  partnership_id: string;
  created_by: string;
  title: string;
  description?: string;
  challenge_type: ChallengeType;
  metric?: string;
  target_value: number;
  stake_amount: number;
  start_date: string;
  end_date: string;
  status?: ChallengeStatus;
}

export interface PartnerChallengeUpdate {
  title?: string;
  description?: string;
  target_value?: number;
  stake_amount?: number;
  start_date?: string;
  end_date?: string;
  status?: ChallengeStatus;
  winner_id?: string;
  outcome?: ChallengeOutcome;
}

// ============================================================================
// Challenge Progress
// ============================================================================

export interface ChallengeProgress {
  id: string;
  challenge_id: string;
  user_id: string;
  progress_value: number;
  last_updated: string;
}

export interface ChallengeProgressUpsert {
  challenge_id: string;
  user_id: string;
  progress_value: number;
}

// ============================================================================
// Daily Check-Ins
// ============================================================================

export interface PartnerCheckIn {
  id: string;
  partnership_id: string;
  user_id: string;
  check_in_date: string;
  check_in_type: CheckInType;
  // Pre-market fields
  checked_calendar: boolean;
  marked_levels: boolean;
  has_bias: boolean;
  set_max_loss: boolean;
  trading_plan: string | null;
  // Post-market fields
  daily_pnl: number | null;
  followed_rules: boolean | null;
  session_notes: string | null;
  created_at: string;
}

export interface PartnerCheckInInsert {
  partnership_id: string;
  user_id: string;
  check_in_date?: string;
  check_in_type: CheckInType;
  checked_calendar?: boolean;
  marked_levels?: boolean;
  has_bias?: boolean;
  set_max_loss?: boolean;
  trading_plan?: string;
  daily_pnl?: number;
  followed_rules?: boolean;
  session_notes?: string;
}

export interface PartnerCheckInUpdate {
  checked_calendar?: boolean;
  marked_levels?: boolean;
  has_bias?: boolean;
  set_max_loss?: boolean;
  trading_plan?: string;
  daily_pnl?: number;
  followed_rules?: boolean;
  session_notes?: string;
}

// ============================================================================
// Settlements
// ============================================================================

export interface PartnerSettlement {
  id: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  reason: SettlementReason;
  reference_id: string | null;
  reference_type: string | null;
  status: SettlementStatus;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  from_user?: PartnerProfile;
  to_user?: PartnerProfile;
}

export interface PartnerSettlementInsert {
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  reason: SettlementReason;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
}

export interface PartnerSettlementUpdate {
  status?: SettlementStatus;
  paid_at?: string;
  notes?: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface PartnerNotification {
  id: string;
  user_id: string;
  partnership_id: string | null;
  notification_type: PartnerNotificationType;
  title: string;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PartnerNotificationInsert {
  user_id: string;
  partnership_id?: string;
  notification_type: PartnerNotificationType;
  title: string;
  message?: string;
  reference_id?: string;
  reference_type?: string;
}

// ============================================================================
// Aggregate Types (for UI)
// ============================================================================

export interface PartnerBalance {
  user1_id: string;
  user2_id: string;
  user1_owes: number;
  user2_owes: number;
  net_balance: number; // positive = user1 owes user2
}

export interface PartnerStats {
  total_challenges: number;
  challenges_won: number;
  challenges_lost: number;
  win_rate: number;
  total_earned: number;
  total_lost: number;
  net_profit: number;
  current_streak: number;
  longest_streak: number;
  total_violations: number;
  total_violation_amount: number;
}

export interface TodayStatus {
  pre_market_done: boolean;
  post_market_done: boolean;
  my_check_in?: PartnerCheckIn;
  partner_check_in?: PartnerCheckIn;
}

// ============================================================================
// Preset Types
// ============================================================================

export interface RulePreset {
  title: string;
  description?: string;
  stake: number;
}

export interface ChallengePreset {
  title: string;
  description: string;
  type: ChallengeType;
  target: number;
  duration: number; // days
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PartnerDashboardData {
  partnership: AccountabilityPartnership | null;
  partner_profile: PartnerProfile | null;
  pending_requests: AccountabilityPartnership[];
  rules: PartnerRule[];
  active_challenges: PartnerChallenge[];
  past_challenges: PartnerChallenge[];
  today_status: TodayStatus;
  balance: PartnerBalance | null;
  stats: PartnerStats;
  notifications: PartnerNotification[];
}

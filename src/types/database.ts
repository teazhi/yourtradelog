/**
 * Database types for the futures trading journal app.
 * These types match the Supabase database schema.
 */

// ============================================================================
// Profile Types
// ============================================================================

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  default_risk_per_trade: number | null;
  daily_loss_limit: number | null;
  weekly_loss_limit: number | null;
  account_size: number | null;
  // Commission settings
  prop_firm: string | null;
  commission_per_contract: number | null;
  commission_per_trade: number | null;
  // XP and Leveling
  total_xp: number;
  current_level: number;
  trader_title: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  timezone?: string;
  default_risk_per_trade?: number | null;
  daily_loss_limit?: number | null;
  weekly_loss_limit?: number | null;
  account_size?: number | null;
  prop_firm?: string | null;
  commission_per_contract?: number | null;
  commission_per_trade?: number | null;
  // XP and Leveling
  total_xp?: number;
  current_level?: number;
  trader_title?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  timezone?: string;
  default_risk_per_trade?: number | null;
  daily_loss_limit?: number | null;
  weekly_loss_limit?: number | null;
  account_size?: number | null;
  prop_firm?: string | null;
  commission_per_contract?: number | null;
  commission_per_trade?: number | null;
  // XP and Leveling
  total_xp?: number;
  current_level?: number;
  trader_title?: string;
  updated_at?: string;
}

// ============================================================================
// Account Types
// ============================================================================

export interface Account {
  id: string;
  user_id: string;
  name: string;
  broker: string | null;
  account_number: string | null;
  starting_balance: number;
  current_balance: number;
  is_default: boolean;
  // Per-account trading settings
  prop_firm: string | null;
  commission_per_contract: number | null;
  commission_per_trade: number | null;
  default_risk_per_trade: number | null;
  daily_loss_limit: number | null;
  weekly_loss_limit: number | null;
  created_at: string;
  updated_at: string;
}

export interface AccountInsert {
  id?: string;
  user_id: string;
  name: string;
  broker?: string | null;
  account_number?: string | null;
  starting_balance?: number;
  current_balance?: number;
  is_default?: boolean;
  // Per-account trading settings
  prop_firm?: string | null;
  commission_per_contract?: number | null;
  commission_per_trade?: number | null;
  default_risk_per_trade?: number | null;
  daily_loss_limit?: number | null;
  weekly_loss_limit?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface AccountUpdate {
  id?: string;
  user_id?: string;
  name?: string;
  broker?: string | null;
  account_number?: string | null;
  starting_balance?: number;
  current_balance?: number;
  is_default?: boolean;
  // Per-account trading settings
  prop_firm?: string | null;
  commission_per_contract?: number | null;
  commission_per_trade?: number | null;
  default_risk_per_trade?: number | null;
  daily_loss_limit?: number | null;
  weekly_loss_limit?: number | null;
  updated_at?: string;
}

// ============================================================================
// Instrument Types
// ============================================================================

export interface Instrument {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  tick_size: number;
  tick_value: number;
  exchange: string | null;
  asset_class: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InstrumentInsert {
  id?: string;
  user_id: string;
  symbol: string;
  name: string;
  tick_size: number;
  tick_value: number;
  exchange?: string | null;
  asset_class?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InstrumentUpdate {
  id?: string;
  user_id?: string;
  symbol?: string;
  name?: string;
  tick_size?: number;
  tick_value?: number;
  exchange?: string | null;
  asset_class?: string | null;
  is_active?: boolean;
  updated_at?: string;
}

// ============================================================================
// Setup Types
// ============================================================================

export interface Setup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules: string | null;
  timeframes: string[];
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetupInsert {
  id?: string;
  user_id: string;
  name: string;
  description?: string | null;
  rules?: string | null;
  timeframes?: string[];
  color?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SetupUpdate {
  id?: string;
  user_id?: string;
  name?: string;
  description?: string | null;
  rules?: string | null;
  timeframes?: string[];
  color?: string | null;
  is_active?: boolean;
  updated_at?: string;
}

// ============================================================================
// Trade Types
// ============================================================================

export interface Trade {
  id: string;
  user_id: string;
  account_id: string | null;
  instrument_id: string | null;
  setup_id: string | null;
  symbol: string;
  side: 'long' | 'short';
  entry_date: string;
  entry_price: number;
  entry_contracts: number;
  exit_date: string | null;
  exit_price: number | null;
  exit_contracts: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  planned_risk: number | null;
  gross_pnl: number | null;
  commission: number | null;
  fees: number | null;
  net_pnl: number | null;
  r_multiple: number | null;
  emotions: string[];
  entry_rating: number | null;
  exit_rating: number | null;
  management_rating: number | null;
  session: string | null;
  notes: string | null;
  lessons: string | null;
  mistakes: string[];
  status: 'open' | 'closed' | 'cancelled';
  import_source: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradeInsert {
  id?: string;
  user_id: string;
  account_id?: string | null;
  instrument_id?: string | null;
  setup_id?: string | null;
  symbol: string;
  side: 'long' | 'short';
  entry_date: string;
  entry_price: number;
  entry_contracts: number;
  exit_date?: string | null;
  exit_price?: number | null;
  exit_contracts?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  planned_risk?: number | null;
  gross_pnl?: number | null;
  commission?: number | null;
  fees?: number | null;
  net_pnl?: number | null;
  r_multiple?: number | null;
  emotions?: string[];
  entry_rating?: number | null;
  exit_rating?: number | null;
  management_rating?: number | null;
  session?: string | null;
  notes?: string | null;
  lessons?: string | null;
  mistakes?: string[];
  status?: 'open' | 'closed' | 'cancelled';
  import_source?: string | null;
  external_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TradeUpdate {
  id?: string;
  user_id?: string;
  account_id?: string | null;
  instrument_id?: string | null;
  setup_id?: string | null;
  symbol?: string;
  side?: 'long' | 'short';
  entry_date?: string;
  entry_price?: number;
  entry_contracts?: number;
  exit_date?: string | null;
  exit_price?: number | null;
  exit_contracts?: number | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  planned_risk?: number | null;
  gross_pnl?: number | null;
  commission?: number | null;
  fees?: number | null;
  net_pnl?: number | null;
  r_multiple?: number | null;
  emotions?: string[];
  entry_rating?: number | null;
  exit_rating?: number | null;
  management_rating?: number | null;
  session?: string | null;
  notes?: string | null;
  lessons?: string | null;
  mistakes?: string[];
  status?: 'open' | 'closed' | 'cancelled';
  import_source?: string | null;
  external_id?: string | null;
  updated_at?: string;
}

// ============================================================================
// Trade Screenshot Types
// ============================================================================

// Screenshot types for futures day trading
export type ScreenshotType =
  | 'pre-market'   // Pre-market analysis
  | 'entry'        // Entry point
  | 'runner'       // Runner/scale out
  | 'exit'         // Exit point
  | 'post-trade'   // Post-trade review
  | 'htf'          // Higher timeframe context
  | 'ltf'          // Lower timeframe context
  | 'orderflow'    // Order flow / footprint
  | 'dom'          // DOM / depth of market
  | 'other';       // Other

export interface TradeScreenshot {
  id: string;
  trade_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  screenshot_type: ScreenshotType;
  notes: string | null;
  created_at: string;
}

export interface TradeScreenshotInsert {
  id?: string;
  trade_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  screenshot_type?: ScreenshotType;
  notes?: string | null;
  created_at?: string;
}

export interface TradeScreenshotUpdate {
  id?: string;
  trade_id?: string;
  user_id?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  screenshot_type?: ScreenshotType;
  notes?: string | null;
}

// ============================================================================
// Daily Journal Types
// ============================================================================

export interface DailyJournal {
  id: string;
  user_id: string;
  date: string;
  pre_market_notes: string | null;
  post_market_notes: string | null;
  mood_rating: number | null;
  focus_rating: number | null;
  discipline_rating: number | null;
  goals: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyJournalInsert {
  id?: string;
  user_id: string;
  date: string;
  pre_market_notes?: string | null;
  post_market_notes?: string | null;
  mood_rating?: number | null;
  focus_rating?: number | null;
  discipline_rating?: number | null;
  goals?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface DailyJournalUpdate {
  id?: string;
  user_id?: string;
  date?: string;
  pre_market_notes?: string | null;
  post_market_notes?: string | null;
  mood_rating?: number | null;
  focus_rating?: number | null;
  discipline_rating?: number | null;
  goals?: string[];
  updated_at?: string;
}

// ============================================================================
// Daily Risk Snapshot Types
// ============================================================================

export interface DailyRiskSnapshot {
  id: string;
  user_id: string;
  date: string;
  starting_balance: number;
  ending_balance: number;
  daily_pnl: number;
  max_drawdown: number | null;
  trades_taken: number;
  win_count: number;
  loss_count: number;
  largest_win: number | null;
  largest_loss: number | null;
  daily_limit_hit: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyRiskSnapshotInsert {
  id?: string;
  user_id: string;
  date: string;
  starting_balance: number;
  ending_balance: number;
  daily_pnl: number;
  max_drawdown?: number | null;
  trades_taken?: number;
  win_count?: number;
  loss_count?: number;
  largest_win?: number | null;
  largest_loss?: number | null;
  daily_limit_hit?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DailyRiskSnapshotUpdate {
  id?: string;
  user_id?: string;
  date?: string;
  starting_balance?: number;
  ending_balance?: number;
  daily_pnl?: number;
  max_drawdown?: number | null;
  trades_taken?: number;
  win_count?: number;
  loss_count?: number;
  largest_win?: number | null;
  largest_loss?: number | null;
  daily_limit_hit?: boolean;
  updated_at?: string;
}

// ============================================================================
// Import History Types
// ============================================================================

export interface ImportHistory {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  trades_imported: number;
  trades_skipped: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportHistoryInsert {
  id?: string;
  user_id: string;
  file_name: string;
  file_size: number;
  trades_imported?: number;
  trades_skipped?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ImportHistoryUpdate {
  id?: string;
  user_id?: string;
  file_name?: string;
  file_size?: number;
  trades_imported?: number;
  trades_skipped?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  updated_at?: string;
}

// ============================================================================
// Database Schema Type (for Supabase client)
// ============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      accounts: {
        Row: Account;
        Insert: AccountInsert;
        Update: AccountUpdate;
        Relationships: [];
      };
      instruments: {
        Row: Instrument;
        Insert: InstrumentInsert;
        Update: InstrumentUpdate;
        Relationships: [];
      };
      setups: {
        Row: Setup;
        Insert: SetupInsert;
        Update: SetupUpdate;
        Relationships: [];
      };
      trades: {
        Row: Trade;
        Insert: TradeInsert;
        Update: TradeUpdate;
        Relationships: [];
      };
      trade_screenshots: {
        Row: TradeScreenshot;
        Insert: TradeScreenshotInsert;
        Update: TradeScreenshotUpdate;
        Relationships: [];
      };
      daily_journals: {
        Row: DailyJournal;
        Insert: DailyJournalInsert;
        Update: DailyJournalUpdate;
        Relationships: [];
      };
      daily_risk_snapshots: {
        Row: DailyRiskSnapshot;
        Insert: DailyRiskSnapshotInsert;
        Update: DailyRiskSnapshotUpdate;
        Relationships: [];
      };
      import_history: {
        Row: ImportHistory;
        Insert: ImportHistoryInsert;
        Update: ImportHistoryUpdate;
        Relationships: [];
      };
      // Partner Accountability Tables
      accountability_partners: {
        Row: AccountabilityPartnerRow;
        Insert: AccountabilityPartnerInsert;
        Update: AccountabilityPartnerUpdate;
        Relationships: [];
      };
      partner_rules: {
        Row: PartnerRuleRow;
        Insert: PartnerRuleInsertDb;
        Update: PartnerRuleUpdateDb;
        Relationships: [];
      };
      partner_rule_violations: {
        Row: PartnerRuleViolationRow;
        Insert: PartnerRuleViolationInsertDb;
        Update: PartnerRuleViolationUpdateDb;
        Relationships: [];
      };
      partner_challenges: {
        Row: PartnerChallengeRow;
        Insert: PartnerChallengeInsertDb;
        Update: PartnerChallengeUpdateDb;
        Relationships: [];
      };
      partner_challenge_progress: {
        Row: PartnerChallengeProgressRow;
        Insert: PartnerChallengeProgressInsertDb;
        Update: PartnerChallengeProgressUpdateDb;
        Relationships: [];
      };
      partner_check_ins: {
        Row: PartnerCheckInRow;
        Insert: PartnerCheckInInsertDb;
        Update: PartnerCheckInUpdateDb;
        Relationships: [];
      };
      partner_settlements: {
        Row: PartnerSettlementRow;
        Insert: PartnerSettlementInsertDb;
        Update: PartnerSettlementUpdateDb;
        Relationships: [];
      };
      partner_notifications: {
        Row: PartnerNotificationRow;
        Insert: PartnerNotificationInsertDb;
        Update: PartnerNotificationUpdateDb;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ============================================================================
// Partner Accountability Types (Database Schema)
// ============================================================================

export interface AccountabilityPartnerRow {
  id: string;
  user_id: string;
  partner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AccountabilityPartnerInsert {
  id?: string;
  user_id: string;
  partner_id: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountabilityPartnerUpdate {
  id?: string;
  user_id?: string;
  partner_id?: string;
  status?: string;
  updated_at?: string;
}

export interface PartnerRuleRow {
  id: string;
  partnership_id: string;
  created_by: string;
  title: string;
  description: string | null;
  stake_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PartnerRuleInsertDb {
  id?: string;
  partnership_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  stake_amount: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerRuleUpdateDb {
  id?: string;
  partnership_id?: string;
  created_by?: string;
  title?: string;
  description?: string | null;
  stake_amount?: number;
  is_active?: boolean;
  updated_at?: string;
}

export interface PartnerRuleViolationRow {
  id: string;
  rule_id: string;
  user_id: string;
  reported_by: string;
  notes: string | null;
  amount_owed: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
}

export interface PartnerRuleViolationInsertDb {
  id?: string;
  rule_id: string;
  user_id: string;
  reported_by: string;
  notes?: string | null;
  amount_owed: number;
  is_settled?: boolean;
  settled_at?: string | null;
  created_at?: string;
}

export interface PartnerRuleViolationUpdateDb {
  id?: string;
  rule_id?: string;
  user_id?: string;
  reported_by?: string;
  notes?: string | null;
  amount_owed?: number;
  is_settled?: boolean;
  settled_at?: string | null;
}

export interface PartnerChallengeRow {
  id: string;
  partnership_id: string;
  created_by: string;
  title: string;
  description: string | null;
  challenge_type: string;
  metric: string | null;
  target_value: number;
  stake_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  winner_id: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerChallengeInsertDb {
  id?: string;
  partnership_id: string;
  created_by: string;
  title: string;
  description?: string | null;
  challenge_type: string;
  metric?: string | null;
  target_value: number;
  stake_amount: number;
  start_date: string;
  end_date: string;
  status?: string;
  winner_id?: string | null;
  outcome?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerChallengeUpdateDb {
  id?: string;
  partnership_id?: string;
  created_by?: string;
  title?: string;
  description?: string | null;
  challenge_type?: string;
  metric?: string | null;
  target_value?: number;
  stake_amount?: number;
  start_date?: string;
  end_date?: string;
  status?: string;
  winner_id?: string | null;
  outcome?: string | null;
  updated_at?: string;
}

export interface PartnerChallengeProgressRow {
  id: string;
  challenge_id: string;
  user_id: string;
  progress_value: number;
  last_updated: string;
}

export interface PartnerChallengeProgressInsertDb {
  id?: string;
  challenge_id: string;
  user_id: string;
  progress_value: number;
  last_updated?: string;
}

export interface PartnerChallengeProgressUpdateDb {
  id?: string;
  challenge_id?: string;
  user_id?: string;
  progress_value?: number;
  last_updated?: string;
}

export interface PartnerCheckInRow {
  id: string;
  partnership_id: string;
  user_id: string;
  check_in_date: string;
  check_in_type: string;
  checked_calendar: boolean | null;
  marked_levels: boolean | null;
  has_bias: boolean | null;
  set_max_loss: boolean | null;
  trading_plan: string | null;
  daily_pnl: number | null;
  followed_rules: boolean | null;
  session_notes: string | null;
  created_at: string;
}

export interface PartnerCheckInInsertDb {
  id?: string;
  partnership_id: string;
  user_id: string;
  check_in_date?: string;
  check_in_type: string;
  checked_calendar?: boolean | null;
  marked_levels?: boolean | null;
  has_bias?: boolean | null;
  set_max_loss?: boolean | null;
  trading_plan?: string | null;
  daily_pnl?: number | null;
  followed_rules?: boolean | null;
  session_notes?: string | null;
  created_at?: string;
}

export interface PartnerCheckInUpdateDb {
  id?: string;
  partnership_id?: string;
  user_id?: string;
  check_in_date?: string;
  check_in_type?: string;
  checked_calendar?: boolean | null;
  marked_levels?: boolean | null;
  has_bias?: boolean | null;
  set_max_loss?: boolean | null;
  trading_plan?: string | null;
  daily_pnl?: number | null;
  followed_rules?: boolean | null;
  session_notes?: string | null;
}

export interface PartnerSettlementRow {
  id: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  reason: string;
  reference_id: string | null;
  reference_type: string | null;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerSettlementInsertDb {
  id?: string;
  partnership_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  reason: string;
  reference_id?: string | null;
  reference_type?: string | null;
  status?: string;
  paid_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PartnerSettlementUpdateDb {
  id?: string;
  partnership_id?: string;
  from_user_id?: string;
  to_user_id?: string;
  amount?: number;
  reason?: string;
  reference_id?: string | null;
  reference_type?: string | null;
  status?: string;
  paid_at?: string | null;
  notes?: string | null;
  updated_at?: string;
}

export interface PartnerNotificationRow {
  id: string;
  user_id: string;
  partnership_id: string | null;
  notification_type: string;
  title: string;
  message: string | null;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PartnerNotificationInsertDb {
  id?: string;
  user_id: string;
  partnership_id?: string | null;
  notification_type: string;
  title: string;
  message?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  is_read?: boolean;
  created_at?: string;
}

export interface PartnerNotificationUpdateDb {
  id?: string;
  user_id?: string;
  partnership_id?: string | null;
  notification_type?: string;
  title?: string;
  message?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  is_read?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

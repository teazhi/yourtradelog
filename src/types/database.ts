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
  display_name: string | null;
  timezone: string;
  default_risk_per_trade: number | null;
  daily_loss_limit: number | null;
  weekly_loss_limit: number | null;
  account_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  display_name?: string | null;
  timezone?: string;
  default_risk_per_trade?: number | null;
  daily_loss_limit?: number | null;
  weekly_loss_limit?: number | null;
  account_size?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string;
  display_name?: string | null;
  timezone?: string;
  default_risk_per_trade?: number | null;
  daily_loss_limit?: number | null;
  weekly_loss_limit?: number | null;
  account_size?: number | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
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

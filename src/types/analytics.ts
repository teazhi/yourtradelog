/**
 * Analytics types for the futures trading journal app.
 */

import { EmotionTag, MistakeTag, Session, Side } from './trade';

// ============================================================================
// Performance Metrics
// ============================================================================

export interface PerformanceMetrics {
  // Overall stats
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  loss_rate: number;

  // P&L metrics
  total_gross_pnl: number;
  total_net_pnl: number;
  total_commission: number;
  total_fees: number;
  average_win: number;
  average_loss: number;
  largest_win: number;
  largest_loss: number;
  profit_factor: number;
  expected_value: number;

  // Risk metrics
  average_r_multiple: number;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  recovery_factor: number;
  sharpe_ratio: number | null;

  // Trade duration
  average_hold_time_minutes: number;
  average_winner_hold_time: number;
  average_loser_hold_time: number;

  // Rating averages
  average_entry_rating: number | null;
  average_exit_rating: number | null;
  average_management_rating: number | null;
}

export interface PeriodComparison {
  current: PerformanceMetrics;
  previous: PerformanceMetrics;
  change: {
    total_trades: number;
    win_rate: number;
    total_net_pnl: number;
    profit_factor: number;
    average_r_multiple: number;
  };
  change_percent: {
    total_trades: number;
    win_rate: number;
    total_net_pnl: number;
    profit_factor: number;
    average_r_multiple: number;
  };
}

// ============================================================================
// Time-Based Analysis
// ============================================================================

export interface TimeAnalysis {
  by_hour: HourlyStats[];
  by_day_of_week: DayOfWeekStats[];
  by_session: SessionStats[];
  by_month: MonthlyStats[];
}

export interface HourlyStats {
  hour: number; // 0-23
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  average_r_multiple: number;
}

export interface DayOfWeekStats {
  day: number; // 0 = Sunday, 6 = Saturday
  day_name: string;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  average_r_multiple: number;
}

export interface SessionStats {
  session: Session;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  average_r_multiple: number;
  average_hold_time: number;
}

export interface MonthlyStats {
  year: number;
  month: number;
  month_name: string;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  profit_factor: number;
  max_drawdown: number;
  trading_days: number;
}

// ============================================================================
// Symbol Analysis
// ============================================================================

export interface SymbolAnalysis {
  symbol: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  largest_win: number;
  largest_loss: number;
  profit_factor: number;
  average_r_multiple: number;
  long_trades: number;
  short_trades: number;
  long_win_rate: number;
  short_win_rate: number;
}

export interface DirectionAnalysis {
  side: Side;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  average_r_multiple: number;
  profit_factor: number;
}

// ============================================================================
// Setup Analysis
// ============================================================================

export interface SetupAnalysis {
  setup_id: string;
  setup_name: string;
  setup_color: string | null;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  profit_factor: number;
  average_r_multiple: number;
  best_performing_symbol: string | null;
  best_performing_session: Session | null;
  average_entry_rating: number | null;
  average_exit_rating: number | null;
}

// ============================================================================
// Emotion & Psychology Analysis
// ============================================================================

export interface EmotionAnalysis {
  emotion: EmotionTag;
  total_trades: number;
  win_rate: number;
  total_pnl: number;
  average_pnl: number;
  average_r_multiple: number;
  frequency_percent: number;
}

export interface MistakeAnalysis {
  mistake: MistakeTag;
  total_occurrences: number;
  total_pnl_impact: number;
  average_pnl_when_made: number;
  frequency_percent: number;
  most_common_with_emotion: EmotionTag | null;
  most_common_session: Session | null;
}

export interface PsychologyMetrics {
  emotional_consistency_score: number; // 0-100
  discipline_score: number; // 0-100
  most_profitable_emotional_state: EmotionTag | null;
  least_profitable_emotional_state: EmotionTag | null;
  most_costly_mistake: MistakeTag | null;
  mistake_frequency: number; // percentage of trades with mistakes
  average_rating_on_wins: number;
  average_rating_on_losses: number;
}

// ============================================================================
// Risk Analysis
// ============================================================================

export interface RiskAnalysis {
  current_drawdown: number;
  current_drawdown_percent: number;
  max_drawdown: number;
  max_drawdown_percent: number;
  max_drawdown_date: string | null;
  days_in_drawdown: number;
  average_risk_per_trade: number;
  average_risk_percent: number;
  risk_adjusted_return: number;
  calmar_ratio: number | null;
  sortino_ratio: number | null;
  var_95: number | null; // Value at Risk 95%
  var_99: number | null; // Value at Risk 99%
}

export interface DrawdownPeriod {
  start_date: string;
  end_date: string | null;
  peak_balance: number;
  trough_balance: number;
  drawdown_amount: number;
  drawdown_percent: number;
  recovery_date: string | null;
  recovery_days: number | null;
}

// ============================================================================
// Equity & Balance
// ============================================================================

export interface EquityPoint {
  date: string;
  balance: number;
  daily_pnl: number;
  cumulative_pnl: number;
  trades_count: number;
  drawdown_percent: number;
}

export interface EquityCurve {
  points: EquityPoint[];
  starting_balance: number;
  ending_balance: number;
  peak_balance: number;
  trough_balance: number;
  total_return: number;
  total_return_percent: number;
}

// ============================================================================
// Trade Distribution
// ============================================================================

export interface PnlDistribution {
  buckets: PnlBucket[];
  mean: number;
  median: number;
  standard_deviation: number;
  skewness: number;
  kurtosis: number;
}

export interface PnlBucket {
  range_start: number;
  range_end: number;
  count: number;
  percentage: number;
}

export interface RMultipleDistribution {
  buckets: RMultipleBucket[];
  average: number;
  median: number;
  positive_expectancy: boolean;
}

export interface RMultipleBucket {
  range_start: number;
  range_end: number;
  count: number;
  percentage: number;
}

// ============================================================================
// Streak Analysis
// ============================================================================

export interface StreakAnalysis {
  current_streak: Streak;
  longest_win_streak: Streak;
  longest_loss_streak: Streak;
  average_win_streak: number;
  average_loss_streak: number;
}

export interface Streak {
  type: 'win' | 'loss' | 'none';
  count: number;
  total_pnl: number;
  start_date: string | null;
  end_date: string | null;
}

// ============================================================================
// Dashboard Summary
// ============================================================================

export interface DashboardSummary {
  // Today's stats
  today: DailySnapshot;
  // This week's stats
  this_week: WeeklySnapshot;
  // This month's stats
  this_month: MonthlySnapshot;
  // All time stats
  all_time: PerformanceMetrics;
  // Recent trades
  recent_trades: RecentTrade[];
  // Open trades
  open_trades_count: number;
  open_trades_unrealized_pnl: number;
  // Risk status
  daily_limit_status: LimitStatus;
  weekly_limit_status: LimitStatus;
}

export interface DailySnapshot {
  date: string;
  total_trades: number;
  win_rate: number;
  net_pnl: number;
  largest_win: number;
  largest_loss: number;
  current_drawdown: number;
  limit_remaining: number | null;
}

export interface WeeklySnapshot {
  start_date: string;
  end_date: string;
  total_trades: number;
  win_rate: number;
  net_pnl: number;
  trading_days: number;
  average_daily_pnl: number;
  best_day_pnl: number;
  worst_day_pnl: number;
}

export interface MonthlySnapshot {
  year: number;
  month: number;
  total_trades: number;
  win_rate: number;
  net_pnl: number;
  trading_days: number;
  profit_factor: number;
  max_drawdown: number;
}

export interface RecentTrade {
  id: string;
  symbol: string;
  side: Side;
  entry_date: string;
  net_pnl: number | null;
  r_multiple: number | null;
  status: 'open' | 'closed' | 'cancelled';
}

export interface LimitStatus {
  limit: number | null;
  used: number;
  remaining: number | null;
  percentage_used: number | null;
  is_exceeded: boolean;
}

// ============================================================================
// Report Types
// ============================================================================

export interface PerformanceReport {
  period: {
    start_date: string;
    end_date: string;
    trading_days: number;
  };
  metrics: PerformanceMetrics;
  time_analysis: TimeAnalysis;
  symbol_analysis: SymbolAnalysis[];
  setup_analysis: SetupAnalysis[];
  emotion_analysis: EmotionAnalysis[];
  risk_analysis: RiskAnalysis;
  equity_curve: EquityCurve;
  drawdown_periods: DrawdownPeriod[];
}

export interface ComparisonReport {
  period_a: PerformanceReport;
  period_b: PerformanceReport;
  comparison: PeriodComparison;
  improvements: string[];
  areas_of_concern: string[];
}

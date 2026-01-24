/**
 * Trade-related types and enums for the futures trading journal app.
 */

// ============================================================================
// Enums
// ============================================================================

export enum Side {
  Long = 'long',
  Short = 'short',
}

export enum TradeStatus {
  Open = 'open',
  Closed = 'closed',
  Cancelled = 'cancelled',
}

export enum Session {
  Asian = 'asian',
  London = 'london',
  NewYork = 'new_york',
  Overnight = 'overnight',
  PreMarket = 'pre_market',
  RegularHours = 'regular_hours',
  AfterHours = 'after_hours',
}

export enum ScreenshotType {
  Entry = 'entry',
  Exit = 'exit',
  Setup = 'setup',
  Result = 'result',
  Other = 'other',
}

export enum EmotionTag {
  // Positive emotions
  Confident = 'confident',
  Calm = 'calm',
  Focused = 'focused',
  Patient = 'patient',
  Disciplined = 'disciplined',
  // Negative emotions
  Fearful = 'fearful',
  Greedy = 'greedy',
  Anxious = 'anxious',
  Impatient = 'impatient',
  Frustrated = 'frustrated',
  Overconfident = 'overconfident',
  FOMO = 'fomo',
  Revenge = 'revenge',
  Hopeful = 'hopeful',
  Hesitant = 'hesitant',
  // Neutral
  Neutral = 'neutral',
  Uncertain = 'uncertain',
}

export enum MistakeTag {
  // Entry mistakes
  EnteredTooEarly = 'entered_too_early',
  EnteredTooLate = 'entered_too_late',
  WrongDirection = 'wrong_direction',
  NoSetup = 'no_setup',
  ChasedEntry = 'chased_entry',
  // Exit mistakes
  ExitedTooEarly = 'exited_too_early',
  ExitedTooLate = 'exited_too_late',
  MovedStopLoss = 'moved_stop_loss',
  NoStopLoss = 'no_stop_loss',
  // Position sizing mistakes
  Oversized = 'oversized',
  Undersized = 'undersized',
  AddedToLoser = 'added_to_loser',
  // Discipline mistakes
  BrokeRules = 'broke_rules',
  RevengeTraded = 'revenge_traded',
  Overtraded = 'overtraded',
  IgnoredPlan = 'ignored_plan',
  TradedTired = 'traded_tired',
  TradedDistracted = 'traded_distracted',
  // Analysis mistakes
  MisreadChart = 'misread_chart',
  WrongTimeframe = 'wrong_timeframe',
  IgnoredContext = 'ignored_context',
  MissedNews = 'missed_news',
}

export enum Timeframe {
  M1 = '1m',
  M2 = '2m',
  M3 = '3m',
  M5 = '5m',
  M10 = '10m',
  M15 = '15m',
  M30 = '30m',
  H1 = '1h',
  H2 = '2h',
  H4 = '4h',
  D1 = '1d',
  W1 = '1w',
}

// ============================================================================
// Legacy Type Aliases (for backward compatibility)
// ============================================================================

export type TradeDirection = 'long' | 'short';

// ============================================================================
// Trade Display Types
// ============================================================================

export interface TradeWithRelations {
  id: string;
  user_id: string;
  account_id: string | null;
  instrument_id: string | null;
  setup_id: string | null;
  symbol: string;
  side: Side;
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
  emotions: EmotionTag[];
  entry_rating: number | null;
  exit_rating: number | null;
  management_rating: number | null;
  session: Session | null;
  notes: string | null;
  lessons: string | null;
  mistakes: MistakeTag[];
  status: TradeStatus;
  import_source: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  account?: {
    id: string;
    name: string;
    broker: string | null;
  } | null;
  instrument?: {
    id: string;
    symbol: string;
    name: string;
    tick_size: number;
    tick_value: number;
  } | null;
  setup?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  screenshots?: TradeScreenshotSummary[];
}

export interface TradeScreenshotSummary {
  id: string;
  file_path: string;
  file_name: string;
  screenshot_type: ScreenshotType;
}

// ============================================================================
// Trade Symbol Types
// ============================================================================

export interface TradeSymbol {
  symbol: string;
  name?: string;
  tickValue?: number;
  tickSize?: number;
}

// ============================================================================
// Trade Form Types
// ============================================================================

export interface TradeFormData {
  account_id: string | null;
  instrument_id: string | null;
  setup_id: string | null;
  symbol: string;
  side: Side;
  entry_date: string;
  entry_price: number;
  entry_contracts: number;
  exit_date: string | null;
  exit_price: number | null;
  exit_contracts: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  planned_risk: number | null;
  commission: number | null;
  fees: number | null;
  emotions: EmotionTag[];
  entry_rating: number | null;
  exit_rating: number | null;
  management_rating: number | null;
  session: Session | null;
  notes: string | null;
  lessons: string | null;
  mistakes: MistakeTag[];
  status: TradeStatus;
}

export interface TradeQuickEntry {
  symbol: string;
  side: Side;
  entry_price: number;
  entry_contracts: number;
  stop_loss?: number;
  take_profit?: number;
  setup_id?: string;
}

// ============================================================================
// Trade Calculation Types
// ============================================================================

export interface TradeCalculations {
  gross_pnl: number;
  net_pnl: number;
  r_multiple: number | null;
  ticks: number;
  points: number;
  hold_duration_minutes: number | null;
  risk_reward_ratio: number | null;
}

export interface TradeRisk {
  planned_risk_amount: number;
  actual_risk_amount: number;
  risk_per_contract: number;
  max_loss: number;
  risk_percent_of_account: number;
}

// ============================================================================
// Trade Filter Types
// ============================================================================

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  symbols?: string[];
  sides?: Side[];
  statuses?: TradeStatus[];
  sessions?: Session[];
  setupIds?: string[];
  accountIds?: string[];
  emotions?: EmotionTag[];
  mistakes?: MistakeTag[];
  minPnl?: number;
  maxPnl?: number;
  minRMultiple?: number;
  maxRMultiple?: number;
  hasNotes?: boolean;
  hasScreenshots?: boolean;
}

export interface TradeSortOptions {
  field:
    | 'entry_date'
    | 'exit_date'
    | 'symbol'
    | 'net_pnl'
    | 'r_multiple'
    | 'entry_contracts';
  direction: 'asc' | 'desc';
}

// ============================================================================
// Import Types
// ============================================================================

export interface TradeImportRow {
  symbol: string;
  side: string;
  entry_date: string;
  entry_time?: string;
  entry_price: number;
  quantity: number;
  exit_date?: string;
  exit_time?: string;
  exit_price?: number;
  commission?: number;
  fees?: number;
  pnl?: number;
  external_id?: string;
}

export interface TradeImportResult {
  success: boolean;
  trade?: TradeFormData;
  error?: string;
  row_number: number;
  raw_data: TradeImportRow;
}

export enum ImportSource {
  Manual = 'manual',
  CSV = 'csv',
  NinjaTrader = 'ninjatrader',
  TradeStation = 'tradestation',
  ThinkorSwim = 'thinkorswim',
  Tradovate = 'tradovate',
  Sierra = 'sierra',
}

// ============================================================================
// Legacy Trade Interface (for backward compatibility)
// ============================================================================

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: TradeDirection;
  quantity: number;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryDate: Date | string;
  exitDate: Date | string | null;
  status: 'open' | 'closed' | 'cancelled';
  grossPnL: number | null;
  commission: number;
  netPnL: number | null;
  notes?: string;
  tags?: string[];
  strategy?: string;
  setup?: string;
  emotion?: string;
  rating?: number;
  screenshots?: string[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================================================
// Equity and Statistics Types
// ============================================================================

export interface EquityPoint {
  date: Date | string;
  equity: number;
  tradeId?: string;
}

export interface DrawdownPeriod {
  startDate: Date | string;
  endDate: Date | string | null;
  peakEquity: number;
  troughEquity: number;
  drawdownAmount: number;
  drawdownPercent: number;
  durationMs: number | null;
  isOngoing: boolean;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averageWinner: number;
  averageLoser: number;
  winLossRatio: number;
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  largestWinner: number;
  largestLoser: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  averageHoldingTime: number | null;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isClosedTrade(trade: Trade): boolean {
  return trade.status === 'closed' && trade.netPnL !== null;
}

export function isWinningTrade(trade: Trade): boolean {
  return trade.netPnL !== null && trade.netPnL > 0;
}

export function isLosingTrade(trade: Trade): boolean {
  return trade.netPnL !== null && trade.netPnL < 0;
}

export function isBreakEvenTrade(trade: Trade): boolean {
  return trade.netPnL !== null && trade.netPnL === 0;
}

/**
 * Application constants for the futures trading journal app.
 */

import { EmotionTag, MistakeTag, Session, Timeframe } from '@/types/trade';

// ============================================================================
// Default Futures Instruments
// ============================================================================

export interface FuturesInstrument {
  symbol: string;
  name: string;
  tickSize: number;
  tickValue: number;
  exchange: string;
  assetClass: string;
  contractSize: number;
  marginRequirement?: number;
  tradingHours?: string;
}

export const DEFAULT_FUTURES_INSTRUMENTS: FuturesInstrument[] = [
  // E-mini S&P 500
  {
    symbol: 'ES',
    name: 'E-mini S&P 500',
    tickSize: 0.25,
    tickValue: 12.5,
    exchange: 'CME',
    assetClass: 'Index',
    contractSize: 50,
    marginRequirement: 12650,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // E-mini NASDAQ 100
  {
    symbol: 'NQ',
    name: 'E-mini NASDAQ 100',
    tickSize: 0.25,
    tickValue: 5.0,
    exchange: 'CME',
    assetClass: 'Index',
    contractSize: 20,
    marginRequirement: 16500,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // E-mini Dow
  {
    symbol: 'YM',
    name: 'E-mini Dow ($5)',
    tickSize: 1.0,
    tickValue: 5.0,
    exchange: 'CBOT',
    assetClass: 'Index',
    contractSize: 5,
    marginRequirement: 8800,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // E-mini Russell 2000
  {
    symbol: 'RTY',
    name: 'E-mini Russell 2000',
    tickSize: 0.1,
    tickValue: 5.0,
    exchange: 'CME',
    assetClass: 'Index',
    contractSize: 50,
    marginRequirement: 6600,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Micro E-mini S&P 500
  {
    symbol: 'MES',
    name: 'Micro E-mini S&P 500',
    tickSize: 0.25,
    tickValue: 1.25,
    exchange: 'CME',
    assetClass: 'Index',
    contractSize: 5,
    marginRequirement: 1265,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Micro E-mini NASDAQ 100
  {
    symbol: 'MNQ',
    name: 'Micro E-mini NASDAQ 100',
    tickSize: 0.25,
    tickValue: 0.5,
    exchange: 'CME',
    assetClass: 'Index',
    contractSize: 2,
    marginRequirement: 1650,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Micro E-mini Dow
  {
    symbol: 'MYM',
    name: 'Micro E-mini Dow ($0.50)',
    tickSize: 1.0,
    tickValue: 0.5,
    exchange: 'CBOT',
    assetClass: 'Index',
    contractSize: 0.5,
    marginRequirement: 880,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Micro E-mini Russell 2000
  {
    symbol: 'M2K',
    name: 'Micro E-mini Russell 2000',
    tickSize: 0.1,
    tickValue: 0.5,
    exchange: 'CME',
    assetClass: 'Index',
    contractSize: 5,
    marginRequirement: 660,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Crude Oil
  {
    symbol: 'CL',
    name: 'Crude Oil',
    tickSize: 0.01,
    tickValue: 10.0,
    exchange: 'NYMEX',
    assetClass: 'Energy',
    contractSize: 1000,
    marginRequirement: 6600,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Gold
  {
    symbol: 'GC',
    name: 'Gold',
    tickSize: 0.1,
    tickValue: 10.0,
    exchange: 'COMEX',
    assetClass: 'Metals',
    contractSize: 100,
    marginRequirement: 9350,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Natural Gas
  {
    symbol: 'NG',
    name: 'Natural Gas',
    tickSize: 0.001,
    tickValue: 10.0,
    exchange: 'NYMEX',
    assetClass: 'Energy',
    contractSize: 10000,
    marginRequirement: 2750,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
  // Euro FX
  {
    symbol: '6E',
    name: 'Euro FX',
    tickSize: 0.00005,
    tickValue: 6.25,
    exchange: 'CME',
    assetClass: 'Currency',
    contractSize: 125000,
    marginRequirement: 2200,
    tradingHours: 'Sun-Fri 6:00pm - 5:00pm ET',
  },
];

// ============================================================================
// Emotion Tags
// ============================================================================

export const POSITIVE_EMOTIONS: EmotionTag[] = [
  EmotionTag.Confident,
  EmotionTag.Calm,
  EmotionTag.Focused,
  EmotionTag.Patient,
  EmotionTag.Disciplined,
];

export const NEGATIVE_EMOTIONS: EmotionTag[] = [
  EmotionTag.Fearful,
  EmotionTag.Greedy,
  EmotionTag.Anxious,
  EmotionTag.Impatient,
  EmotionTag.Frustrated,
  EmotionTag.Overconfident,
  EmotionTag.FOMO,
  EmotionTag.Revenge,
  EmotionTag.Hopeful,
  EmotionTag.Hesitant,
];

export const NEUTRAL_EMOTIONS: EmotionTag[] = [
  EmotionTag.Neutral,
  EmotionTag.Uncertain,
];

export const ALL_EMOTIONS: EmotionTag[] = [
  ...POSITIVE_EMOTIONS,
  ...NEGATIVE_EMOTIONS,
  ...NEUTRAL_EMOTIONS,
];

export const EMOTION_LABELS: Record<EmotionTag, string> = {
  [EmotionTag.Confident]: 'Confident',
  [EmotionTag.Calm]: 'Calm',
  [EmotionTag.Focused]: 'Focused',
  [EmotionTag.Patient]: 'Patient',
  [EmotionTag.Disciplined]: 'Disciplined',
  [EmotionTag.Fearful]: 'Fearful',
  [EmotionTag.Greedy]: 'Greedy',
  [EmotionTag.Anxious]: 'Anxious',
  [EmotionTag.Impatient]: 'Impatient',
  [EmotionTag.Frustrated]: 'Frustrated',
  [EmotionTag.Overconfident]: 'Overconfident',
  [EmotionTag.FOMO]: 'FOMO',
  [EmotionTag.Revenge]: 'Revenge Trading',
  [EmotionTag.Hopeful]: 'Hopeful',
  [EmotionTag.Hesitant]: 'Hesitant',
  [EmotionTag.Neutral]: 'Neutral',
  [EmotionTag.Uncertain]: 'Uncertain',
};

// ============================================================================
// Mistake Tags
// ============================================================================

export const ENTRY_MISTAKES: MistakeTag[] = [
  MistakeTag.EnteredTooEarly,
  MistakeTag.EnteredTooLate,
  MistakeTag.WrongDirection,
  MistakeTag.NoSetup,
  MistakeTag.ChasedEntry,
];

export const EXIT_MISTAKES: MistakeTag[] = [
  MistakeTag.ExitedTooEarly,
  MistakeTag.ExitedTooLate,
  MistakeTag.MovedStopLoss,
  MistakeTag.NoStopLoss,
];

export const POSITION_SIZING_MISTAKES: MistakeTag[] = [
  MistakeTag.Oversized,
  MistakeTag.Undersized,
  MistakeTag.AddedToLoser,
];

export const DISCIPLINE_MISTAKES: MistakeTag[] = [
  MistakeTag.BrokeRules,
  MistakeTag.RevengeTraded,
  MistakeTag.Overtraded,
  MistakeTag.IgnoredPlan,
  MistakeTag.TradedTired,
  MistakeTag.TradedDistracted,
];

export const ANALYSIS_MISTAKES: MistakeTag[] = [
  MistakeTag.MisreadChart,
  MistakeTag.WrongTimeframe,
  MistakeTag.IgnoredContext,
  MistakeTag.MissedNews,
];

export const ALL_MISTAKES: MistakeTag[] = [
  ...ENTRY_MISTAKES,
  ...EXIT_MISTAKES,
  ...POSITION_SIZING_MISTAKES,
  ...DISCIPLINE_MISTAKES,
  ...ANALYSIS_MISTAKES,
];

export const MISTAKE_LABELS: Record<MistakeTag, string> = {
  [MistakeTag.EnteredTooEarly]: 'Entered Too Early',
  [MistakeTag.EnteredTooLate]: 'Entered Too Late',
  [MistakeTag.WrongDirection]: 'Wrong Direction',
  [MistakeTag.NoSetup]: 'No Valid Setup',
  [MistakeTag.ChasedEntry]: 'Chased Entry',
  [MistakeTag.ExitedTooEarly]: 'Exited Too Early',
  [MistakeTag.ExitedTooLate]: 'Exited Too Late',
  [MistakeTag.MovedStopLoss]: 'Moved Stop Loss',
  [MistakeTag.NoStopLoss]: 'No Stop Loss',
  [MistakeTag.Oversized]: 'Position Too Large',
  [MistakeTag.Undersized]: 'Position Too Small',
  [MistakeTag.AddedToLoser]: 'Added to Losing Position',
  [MistakeTag.BrokeRules]: 'Broke Trading Rules',
  [MistakeTag.RevengeTraded]: 'Revenge Traded',
  [MistakeTag.Overtraded]: 'Overtraded',
  [MistakeTag.IgnoredPlan]: 'Ignored Trading Plan',
  [MistakeTag.TradedTired]: 'Traded While Tired',
  [MistakeTag.TradedDistracted]: 'Traded While Distracted',
  [MistakeTag.MisreadChart]: 'Misread Chart',
  [MistakeTag.WrongTimeframe]: 'Wrong Timeframe',
  [MistakeTag.IgnoredContext]: 'Ignored Market Context',
  [MistakeTag.MissedNews]: 'Missed Important News',
};

// ============================================================================
// Session Types
// ============================================================================

export const SESSION_LABELS: Record<Session, string> = {
  [Session.Asian]: 'Asian Session',
  [Session.London]: 'London Session',
  [Session.NewYork]: 'New York Session',
  [Session.Overnight]: 'Overnight',
  [Session.PreMarket]: 'Pre-Market',
  [Session.RegularHours]: 'Regular Hours',
  [Session.AfterHours]: 'After Hours',
};

export const SESSION_TIMES: Record<Session, { start: string; end: string }> = {
  [Session.Asian]: { start: '18:00', end: '03:00' },
  [Session.London]: { start: '03:00', end: '11:00' },
  [Session.NewYork]: { start: '08:00', end: '17:00' },
  [Session.Overnight]: { start: '18:00', end: '08:00' },
  [Session.PreMarket]: { start: '04:00', end: '09:30' },
  [Session.RegularHours]: { start: '09:30', end: '16:00' },
  [Session.AfterHours]: { start: '16:00', end: '20:00' },
};

// ============================================================================
// Timeframe Labels
// ============================================================================

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  [Timeframe.M1]: '1 Minute',
  [Timeframe.M2]: '2 Minutes',
  [Timeframe.M3]: '3 Minutes',
  [Timeframe.M5]: '5 Minutes',
  [Timeframe.M10]: '10 Minutes',
  [Timeframe.M15]: '15 Minutes',
  [Timeframe.M30]: '30 Minutes',
  [Timeframe.H1]: '1 Hour',
  [Timeframe.H2]: '2 Hours',
  [Timeframe.H4]: '4 Hours',
  [Timeframe.D1]: 'Daily',
  [Timeframe.W1]: 'Weekly',
};

// ============================================================================
// Rating Labels
// ============================================================================

export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

// ============================================================================
// App Defaults
// ============================================================================

export const APP_DEFAULTS = {
  timezone: 'America/New_York',
  defaultRiskPerTrade: 1, // 1% of account
  dailyLossLimit: 3, // 3% of account
  weeklyLossLimit: 6, // 6% of account
  defaultCommission: 4.5, // per contract round trip
  maxScreenshotsPerTrade: 10,
  maxFileSizeMB: 5,
  defaultDateFormat: 'MM/dd/yyyy',
  defaultTimeFormat: 'HH:mm:ss',
  defaultCurrency: 'USD',
};

// ============================================================================
// Supported Brokers
// ============================================================================

export const SUPPORTED_BROKERS = [
  { value: 'tradovate', label: 'Tradovate' },
];

// ============================================================================
// Prop Firms with Commission Structures
// ============================================================================

export interface PropFirm {
  id: string;
  name: string;
  commissionPerContract: number; // Per side (will be multiplied by 2 for round-trip)
  commissionPerTrade: number; // Per side (will be multiplied by 2 for round-trip)
  description?: string;
  website?: string;
}

// Note: Commission rates are estimates for ES/NQ futures and may vary by:
// - Specific instrument (micros are typically lower)
// - Platform (Rithmic vs Tradovate vs proprietary)
// - Account type (evaluation vs funded)
// Users should verify with their prop firm for exact rates.
export const PROP_FIRMS: PropFirm[] = [
  {
    id: 'custom',
    name: 'Custom / Personal Account',
    commissionPerContract: 0,
    commissionPerTrade: 0,
    description: 'Set your own commission rates',
  },
  {
    id: 'topstep',
    name: 'Topstep (Standard)',
    commissionPerContract: 1.85, // $1.85 per side ($3.70 round turn) on standard platforms
    commissionPerTrade: 0,
    description: '$1.85/side ($3.70 RT) - standard Tradovate/Rithmic',
    website: 'https://topstep.com',
  },
  {
    id: 'topstep-x',
    name: 'Topstep (TopstepX - Commission Free)',
    commissionPerContract: 0, // TopstepX platform is commission-free
    commissionPerTrade: 0,
    description: 'Commission-free on TopstepX platform',
    website: 'https://topstep.com',
  },
  {
    id: 'apex',
    name: 'Apex Trader Funding',
    commissionPerContract: 1.55, // $1.55 per side on Tradovate for ES/NQ
    commissionPerTrade: 0,
    description: '~$1.55/side on Tradovate, ~$1.99/side on Rithmic',
    website: 'https://apextraderfunding.com',
  },
  {
    id: 'takeprofittrader',
    name: 'Take Profit Trader',
    commissionPerContract: 2.50, // $5 round-trip = $2.50 per side
    commissionPerTrade: 0,
    description: '$2.50/side ($5 round-trip) for all products',
    website: 'https://takeprofittrader.com',
  },
  {
    id: 'earn2trade',
    name: 'Earn2Trade',
    commissionPerContract: 1.40, // ~$1.40 per side average for ES
    commissionPerTrade: 0,
    description: '~$1.40/side for ES (varies $0.82-$2.76 by asset)',
    website: 'https://earn2trade.com',
  },
  {
    id: 'myfundedfutures',
    name: 'My Funded Futures',
    commissionPerContract: 2.13, // $4.26 round-trip = $2.13 per side for ES
    commissionPerTrade: 0,
    description: '~$2.13/side for ES on Tradovate',
    website: 'https://myfundedfutures.com',
  },
  {
    id: 'lucidtrading',
    name: 'Lucid Trading (E-mini)',
    commissionPerContract: 1.75, // $1.75 per side for ES, NQ, RTY, YM
    commissionPerTrade: 0,
    description: '$1.75/side for E-mini (ES, NQ, RTY, YM)',
    website: 'https://lucidtrading.com',
  },
  {
    id: 'lucidtrading-micro',
    name: 'Lucid Trading (Micro)',
    commissionPerContract: 0.50, // $0.50 per side for MES, MNQ, M2K, MYM
    commissionPerTrade: 0,
    description: '$0.50/side for Micros (MES, MNQ, M2K, MYM)',
    website: 'https://lucidtrading.com',
  },
  {
    id: 'tradeday',
    name: 'TradeDay',
    commissionPerContract: 1.55, // Similar to other Rithmic-based firms
    commissionPerTrade: 0,
    description: '~$1.55/side (estimate)',
    website: 'https://tradeday.com',
  },
  {
    id: 'bulenox',
    name: 'Bulenox',
    commissionPerContract: 1.05, // ~$2.09 round-trip = $1.05 per side for ES
    commissionPerTrade: 0,
    description: '~$1.05/side for ES ($2.09 round-trip)',
    website: 'https://bulenox.com',
  },
];

// ============================================================================
// Date/Time Helpers
// ============================================================================

export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ============================================================================
// Pagination
// ============================================================================

export const PAGINATION_DEFAULTS = {
  pageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
};

// ============================================================================
// Chart Colors
// ============================================================================

export const CHART_COLORS = {
  profit: '#22c55e', // Green
  loss: '#ef4444', // Red
  breakeven: '#6b7280', // Gray
  primary: '#3b82f6', // Blue
  secondary: '#8b5cf6', // Purple
  accent: '#f59e0b', // Amber
  background: '#f3f4f6', // Light gray
  grid: '#e5e7eb', // Border gray
};

// ============================================================================
// API Routes
// ============================================================================

export const API_ROUTES = {
  trades: '/api/trades',
  accounts: '/api/accounts',
  instruments: '/api/instruments',
  setups: '/api/setups',
  journals: '/api/journals',
  analytics: '/api/analytics',
  import: '/api/import',
  export: '/api/export',
  screenshots: '/api/screenshots',
  profile: '/api/profile',
};

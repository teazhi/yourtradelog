/**
 * Type Definitions for YourTradeLog
 *
 * This module exports all type definitions used throughout the application.
 *
 * @module types
 */

// Database types
export type {
  Database,
  Profile,
  ProfileInsert,
  ProfileUpdate,
  Account,
  AccountInsert,
  AccountUpdate,
  Instrument,
  InstrumentInsert,
  InstrumentUpdate,
  Setup,
  SetupInsert,
  SetupUpdate,
  TradeScreenshot,
  TradeScreenshotInsert,
  TradeScreenshotUpdate,
  DailyJournal,
  DailyJournalInsert,
  DailyJournalUpdate,
  DailyRiskSnapshot,
  DailyRiskSnapshotInsert,
  DailyRiskSnapshotUpdate,
  ImportHistory,
  ImportHistoryInsert,
  ImportHistoryUpdate,
  Tables,
  TablesInsert,
  TablesUpdate,
} from './database';

// Trade types
export type {
  Trade,
  TradeDirection,
  TradeSymbol,
  TradeWithRelations,
  TradeScreenshotSummary,
  TradeFormData,
  TradeQuickEntry,
  TradeCalculations,
  TradeRisk,
  TradeFilters,
  TradeSortOptions,
  TradeImportRow,
  TradeImportResult,
  EquityPoint,
  DrawdownPeriod,
  TradeStatistics,
} from './trade';

// Trade enums
export {
  Side,
  TradeStatus,
  Session,
  ScreenshotType,
  EmotionTag,
  MistakeTag,
  Timeframe,
  ImportSource,
} from './trade';

// Type guards
export {
  isClosedTrade,
  isWinningTrade,
  isLosingTrade,
  isBreakEvenTrade,
} from './trade';

// Analytics types
export type {
  PerformanceMetrics,
  PeriodComparison,
  TimeAnalysis,
  HourlyStats,
  DayOfWeekStats,
  SessionStats,
  MonthlyStats,
  SymbolAnalysis,
  DirectionAnalysis,
  SetupAnalysis,
  EmotionAnalysis,
  MistakeAnalysis,
  PsychologyMetrics,
  RiskAnalysis,
  DrawdownPeriod as AnalyticsDrawdownPeriod,
  EquityCurve,
  EquityPoint as AnalyticsEquityPoint,
  PnlDistribution,
  PnlBucket,
  RMultipleDistribution,
  RMultipleBucket,
  StreakAnalysis,
  Streak,
  DashboardSummary,
  DailySnapshot,
  WeeklySnapshot,
  MonthlySnapshot,
  RecentTrade,
  LimitStatus,
  PerformanceReport,
  ComparisonReport,
} from './analytics';

// Setup types
export type {
  SetupConfig,
  SetupRules,
  SetupFormData,
  SetupWithStats,
  SetupSummary,
  SetupTemplate,
  SetupValidation,
  SetupValidationError,
} from './setup';

export { SetupCategory, SETUP_TEMPLATES, SETUP_COLORS, validateSetup } from './setup';

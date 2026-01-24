/**
 * Trading Calculations Module
 *
 * This module exports all calculation utilities for trading statistics,
 * risk management, and data formatting.
 *
 * @module calculations
 */

// Statistics calculations
export {
  calculateWinRate,
  calculateProfitFactor,
  calculateExpectancy,
  calculateAverageWinner,
  calculateAverageLoser,
  calculateWinLossRatio,
  calculateTotalPnL,
  calculateTotalTrades,
  calculateConsecutiveWins,
  calculateConsecutiveLosses,
  calculateBestTrade,
  calculateWorstTrade,
  calculateAllStatistics,
} from "./statistics";

// Risk management calculations
export {
  calculateRMultiple,
  calculateMaxDrawdown,
  calculateCurrentDrawdown,
  calculatePositionSize,
  calculateRiskAmount,
  calculateDailyPnL,
  calculateEquityCurve,
  calculateDrawdownPeriods,
  calculateSharpeRatio,
  calculateAverageRMultiple,
} from "./risk";

// Formatting utilities
export {
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatTime,
  formatDateTime,
  formatDuration,
  formatRMultiple,
  formatPnL,
  formatDirection,
  formatStatus,
  truncateText,
  formatRatio,
} from "./formatters";

// Re-export types
export type { DateFormat } from "./formatters";

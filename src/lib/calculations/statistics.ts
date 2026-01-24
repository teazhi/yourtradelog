/**
 * Trading Statistics Calculations
 *
 * This module provides functions for calculating various trading performance
 * statistics including win rate, profit factor, expectancy, and streak analysis.
 *
 * @module statistics
 */

import type { Trade } from "@/types/trade";
import { isClosedTrade, isWinningTrade, isLosingTrade } from "@/types/trade";

/**
 * Filters trades to only include closed trades with valid P&L
 *
 * @param trades - Array of trades to filter
 * @returns Array of closed trades with valid netPnL
 */
function getClosedTrades(trades: Trade[]): Trade[] {
  return trades.filter(isClosedTrade);
}

/**
 * Calculates the win rate (percentage of winning trades)
 *
 * @param trades - Array of trades to analyze
 * @returns Win rate as a percentage (0-100), or 0 if no trades
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: -50 }, { netPnL: 75 }];
 * calculateWinRate(trades); // Returns 66.67
 */
export function calculateWinRate(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  const winningTrades = closedTrades.filter(isWinningTrade);
  return (winningTrades.length / closedTrades.length) * 100;
}

/**
 * Calculates the profit factor (gross profit / gross loss)
 *
 * A profit factor > 1 indicates a profitable system.
 * A profit factor of 2 means you make $2 for every $1 lost.
 *
 * @param trades - Array of trades to analyze
 * @returns Profit factor ratio, or 0 if no losses, or Infinity if no losses but has profits
 *
 * @example
 * const trades = [{ netPnL: 200 }, { netPnL: -100 }];
 * calculateProfitFactor(trades); // Returns 2.0
 */
export function calculateProfitFactor(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  const grossProfit = closedTrades
    .filter(isWinningTrade)
    .reduce((sum, trade) => sum + (trade.netPnL as number), 0);

  const grossLoss = Math.abs(
    closedTrades
      .filter(isLosingTrade)
      .reduce((sum, trade) => sum + (trade.netPnL as number), 0)
  );

  if (grossLoss === 0) {
    return grossProfit > 0 ? Infinity : 0;
  }

  return grossProfit / grossLoss;
}

/**
 * Calculates the expectancy (average expected profit/loss per trade)
 *
 * Expectancy = (Win Rate * Average Winner) - (Loss Rate * Average Loser)
 *
 * @param trades - Array of trades to analyze
 * @returns Expected value per trade in currency, or 0 if no trades
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: -50 }, { netPnL: 100 }, { netPnL: -50 }];
 * calculateExpectancy(trades); // Returns 25 (average of 100, -50, 100, -50)
 */
export function calculateExpectancy(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  const totalPnL = closedTrades.reduce(
    (sum, trade) => sum + (trade.netPnL as number),
    0
  );

  return totalPnL / closedTrades.length;
}

/**
 * Calculates the average winning trade amount
 *
 * @param trades - Array of trades to analyze
 * @returns Average profit of winning trades, or 0 if no winning trades
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: 200 }, { netPnL: -50 }];
 * calculateAverageWinner(trades); // Returns 150
 */
export function calculateAverageWinner(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);
  const winners = closedTrades.filter(isWinningTrade);

  if (winners.length === 0) {
    return 0;
  }

  const totalWinnings = winners.reduce(
    (sum, trade) => sum + (trade.netPnL as number),
    0
  );

  return totalWinnings / winners.length;
}

/**
 * Calculates the average losing trade amount
 *
 * @param trades - Array of trades to analyze
 * @returns Average loss of losing trades (as a positive number), or 0 if no losing trades
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: -50 }, { netPnL: -100 }];
 * calculateAverageLoser(trades); // Returns 75
 */
export function calculateAverageLoser(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);
  const losers = closedTrades.filter(isLosingTrade);

  if (losers.length === 0) {
    return 0;
  }

  const totalLosses = losers.reduce(
    (sum, trade) => sum + (trade.netPnL as number),
    0
  );

  return Math.abs(totalLosses / losers.length);
}

/**
 * Calculates the win/loss ratio (average winner / average loser)
 *
 * A ratio > 1 means winners are larger than losers on average.
 *
 * @param trades - Array of trades to analyze
 * @returns Win/loss ratio, or 0 if insufficient data, or Infinity if no losses
 *
 * @example
 * const trades = [{ netPnL: 200 }, { netPnL: -100 }];
 * calculateWinLossRatio(trades); // Returns 2.0
 */
export function calculateWinLossRatio(trades: Trade[]): number {
  const avgWinner = calculateAverageWinner(trades);
  const avgLoser = calculateAverageLoser(trades);

  if (avgLoser === 0) {
    return avgWinner > 0 ? Infinity : 0;
  }

  return avgWinner / avgLoser;
}

/**
 * Calculates the total net P&L across all trades
 *
 * @param trades - Array of trades to analyze
 * @returns Total net profit/loss in currency
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: -50 }, { netPnL: 75 }];
 * calculateTotalPnL(trades); // Returns 125
 */
export function calculateTotalPnL(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  return closedTrades.reduce(
    (sum, trade) => sum + (trade.netPnL as number),
    0
  );
}

/**
 * Calculates the total number of closed trades
 *
 * @param trades - Array of trades to count
 * @returns Number of closed trades
 *
 * @example
 * const trades = [{ status: 'closed' }, { status: 'open' }, { status: 'closed' }];
 * calculateTotalTrades(trades); // Returns 2
 */
export function calculateTotalTrades(trades: Trade[]): number {
  return getClosedTrades(trades).length;
}

/**
 * Calculates the longest consecutive winning streak
 *
 * Trades are analyzed in chronological order by entry date.
 *
 * @param trades - Array of trades to analyze
 * @returns Length of the longest winning streak
 *
 * @example
 * const trades = [
 *   { entryDate: '2024-01-01', netPnL: 100 },
 *   { entryDate: '2024-01-02', netPnL: 50 },
 *   { entryDate: '2024-01-03', netPnL: -25 },
 *   { entryDate: '2024-01-04', netPnL: 75 }
 * ];
 * calculateConsecutiveWins(trades); // Returns 2
 */
export function calculateConsecutiveWins(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  // Sort by entry date
  const sortedTrades = [...closedTrades].sort((a, b) => {
    const dateA = new Date(a.entryDate).getTime();
    const dateB = new Date(b.entryDate).getTime();
    return dateA - dateB;
  });

  let maxStreak = 0;
  let currentStreak = 0;

  for (const trade of sortedTrades) {
    if (isWinningTrade(trade)) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Calculates the longest consecutive losing streak
 *
 * Trades are analyzed in chronological order by entry date.
 *
 * @param trades - Array of trades to analyze
 * @returns Length of the longest losing streak
 *
 * @example
 * const trades = [
 *   { entryDate: '2024-01-01', netPnL: 100 },
 *   { entryDate: '2024-01-02', netPnL: -50 },
 *   { entryDate: '2024-01-03', netPnL: -25 },
 *   { entryDate: '2024-01-04', netPnL: 75 }
 * ];
 * calculateConsecutiveLosses(trades); // Returns 2
 */
export function calculateConsecutiveLosses(trades: Trade[]): number {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return 0;
  }

  // Sort by entry date
  const sortedTrades = [...closedTrades].sort((a, b) => {
    const dateA = new Date(a.entryDate).getTime();
    const dateB = new Date(b.entryDate).getTime();
    return dateA - dateB;
  });

  let maxStreak = 0;
  let currentStreak = 0;

  for (const trade of sortedTrades) {
    if (isLosingTrade(trade)) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return maxStreak;
}

/**
 * Finds the trade with the highest P&L (best trade)
 *
 * @param trades - Array of trades to analyze
 * @returns The trade with the highest netPnL, or null if no trades
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: 500 }, { netPnL: -50 }];
 * calculateBestTrade(trades); // Returns trade with netPnL: 500
 */
export function calculateBestTrade(trades: Trade[]): Trade | null {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return null;
  }

  return closedTrades.reduce((best, trade) => {
    if (!best) return trade;
    return (trade.netPnL as number) > (best.netPnL as number) ? trade : best;
  }, null as Trade | null);
}

/**
 * Finds the trade with the lowest P&L (worst trade)
 *
 * @param trades - Array of trades to analyze
 * @returns The trade with the lowest netPnL, or null if no trades
 *
 * @example
 * const trades = [{ netPnL: 100 }, { netPnL: 500 }, { netPnL: -200 }];
 * calculateWorstTrade(trades); // Returns trade with netPnL: -200
 */
export function calculateWorstTrade(trades: Trade[]): Trade | null {
  const closedTrades = getClosedTrades(trades);

  if (closedTrades.length === 0) {
    return null;
  }

  return closedTrades.reduce((worst, trade) => {
    if (!worst) return trade;
    return (trade.netPnL as number) < (worst.netPnL as number) ? trade : worst;
  }, null as Trade | null);
}

/**
 * Calculates comprehensive statistics for a set of trades
 *
 * @param trades - Array of trades to analyze
 * @returns Object containing all calculated statistics
 */
export function calculateAllStatistics(trades: Trade[]): {
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
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  consecutiveWins: number;
  consecutiveLosses: number;
} {
  const closedTrades = getClosedTrades(trades);
  const winners = closedTrades.filter(isWinningTrade);
  const losers = closedTrades.filter(isLosingTrade);
  const breakEven = closedTrades.filter(
    (t) => t.netPnL !== null && t.netPnL === 0
  );

  const grossProfit = winners.reduce(
    (sum, trade) => sum + (trade.netPnL as number),
    0
  );
  const grossLoss = Math.abs(
    losers.reduce((sum, trade) => sum + (trade.netPnL as number), 0)
  );

  return {
    totalTrades: closedTrades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakEvenTrades: breakEven.length,
    winRate: calculateWinRate(trades),
    profitFactor: calculateProfitFactor(trades),
    expectancy: calculateExpectancy(trades),
    averageWinner: calculateAverageWinner(trades),
    averageLoser: calculateAverageLoser(trades),
    winLossRatio: calculateWinLossRatio(trades),
    totalPnL: calculateTotalPnL(trades),
    grossProfit,
    grossLoss,
    bestTrade: calculateBestTrade(trades),
    worstTrade: calculateWorstTrade(trades),
    consecutiveWins: calculateConsecutiveWins(trades),
    consecutiveLosses: calculateConsecutiveLosses(trades),
  };
}

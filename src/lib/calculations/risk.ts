/**
 * Risk Management Calculations
 *
 * This module provides functions for calculating risk-related metrics
 * including R-multiples, drawdowns, position sizing, and equity curves.
 *
 * @module risk
 */

import type { Trade, EquityPoint, DrawdownPeriod } from "@/types/trade";
import { isClosedTrade } from "@/types/trade";

/**
 * Calculates the R-multiple for a trade
 *
 * R-multiple measures the trade result in terms of risk units.
 * A 2R trade means you made twice what you risked.
 * A -1R trade means you lost exactly what you risked.
 *
 * For long trades: R = (exit - entry) / (entry - stopLoss)
 * For short trades: R = (entry - exit) / (stopLoss - entry)
 *
 * @param trade - The trade to calculate R-multiple for
 * @returns The R-multiple value, or null if insufficient data
 *
 * @example
 * const trade = { direction: 'long', entryPrice: 100, exitPrice: 110, stopLoss: 95 };
 * calculateRMultiple(trade); // Returns 2.0 (risked 5, made 10)
 */
export function calculateRMultiple(trade: Trade): number | null {
  if (
    trade.exitPrice === null ||
    trade.stopLoss === null ||
    trade.entryPrice === trade.stopLoss
  ) {
    return null;
  }

  const entryPrice = trade.entryPrice;
  const exitPrice = trade.exitPrice;
  const stopLoss = trade.stopLoss;

  if (trade.direction === "long") {
    const risk = entryPrice - stopLoss;
    if (risk <= 0) return null; // Invalid stop loss for long
    const reward = exitPrice - entryPrice;
    return reward / risk;
  } else {
    // short
    const risk = stopLoss - entryPrice;
    if (risk <= 0) return null; // Invalid stop loss for short
    const reward = entryPrice - exitPrice;
    return reward / risk;
  }
}

/**
 * Calculates the maximum drawdown from an equity curve
 *
 * Maximum drawdown is the largest peak-to-trough decline in the equity curve,
 * expressed as a percentage of the peak value.
 *
 * @param equityCurve - Array of equity points with date and equity value
 * @returns Maximum drawdown as a percentage (0-100), or 0 if insufficient data
 *
 * @example
 * const curve = [
 *   { equity: 10000 },
 *   { equity: 12000 },  // peak
 *   { equity: 9000 },   // trough (25% drawdown from peak)
 *   { equity: 11000 }
 * ];
 * calculateMaxDrawdown(curve); // Returns 25.0
 */
export function calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
  if (equityCurve.length < 2) {
    return 0;
  }

  let maxDrawdown = 0;
  let peak = equityCurve[0].equity;

  for (const point of equityCurve) {
    if (point.equity > peak) {
      peak = point.equity;
    }

    if (peak > 0) {
      const drawdown = ((peak - point.equity) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown;
}

/**
 * Calculates the current drawdown from the most recent peak
 *
 * @param equityCurve - Array of equity points with date and equity value
 * @param currentEquity - The current equity value
 * @returns Current drawdown as a percentage (0-100), or 0 if at or above peak
 *
 * @example
 * const curve = [{ equity: 10000 }, { equity: 12000 }];
 * calculateCurrentDrawdown(curve, 11000); // Returns 8.33
 */
export function calculateCurrentDrawdown(
  equityCurve: EquityPoint[],
  currentEquity: number
): number {
  if (equityCurve.length === 0) {
    return 0;
  }

  // Find the peak equity in the curve
  const peak = Math.max(...equityCurve.map((point) => point.equity));

  // Consider current equity for the peak
  const actualPeak = Math.max(peak, currentEquity);

  if (actualPeak <= 0) {
    return 0;
  }

  if (currentEquity >= actualPeak) {
    return 0;
  }

  return ((actualPeak - currentEquity) / actualPeak) * 100;
}

/**
 * Calculates the position size based on risk parameters
 *
 * This uses the fixed fractional position sizing method:
 * Position Size = (Account Size * Risk Percent) / (Stop Distance * Tick Value)
 *
 * @param accountSize - Total account value in currency
 * @param riskPercent - Percentage of account to risk (e.g., 1 for 1%)
 * @param stopDistance - Distance to stop loss in ticks/points
 * @param tickValue - Dollar value per tick/point
 * @returns Number of contracts/shares to trade, floored to whole number
 *
 * @example
 * // $50,000 account, risking 1%, stop is 10 ticks away, $12.50 per tick
 * calculatePositionSize(50000, 1, 10, 12.50); // Returns 4
 */
export function calculatePositionSize(
  accountSize: number,
  riskPercent: number,
  stopDistance: number,
  tickValue: number
): number {
  if (
    accountSize <= 0 ||
    riskPercent <= 0 ||
    stopDistance <= 0 ||
    tickValue <= 0
  ) {
    return 0;
  }

  const riskAmount = accountSize * (riskPercent / 100);
  const riskPerContract = stopDistance * tickValue;

  return Math.floor(riskAmount / riskPerContract);
}

/**
 * Calculates the dollar amount at risk
 *
 * @param accountSize - Total account value in currency
 * @param riskPercent - Percentage of account to risk (e.g., 1 for 1%)
 * @returns Dollar amount at risk
 *
 * @example
 * calculateRiskAmount(50000, 2); // Returns 1000
 */
export function calculateRiskAmount(
  accountSize: number,
  riskPercent: number
): number {
  if (accountSize <= 0 || riskPercent <= 0) {
    return 0;
  }

  return accountSize * (riskPercent / 100);
}

/**
 * Calculates the total P&L for a specific day
 *
 * @param trades - Array of trades to analyze
 * @param date - The date to calculate P&L for (Date object or string)
 * @returns Total net P&L for the specified day
 *
 * @example
 * const trades = [
 *   { exitDate: '2024-01-15', netPnL: 100 },
 *   { exitDate: '2024-01-15', netPnL: -50 },
 *   { exitDate: '2024-01-16', netPnL: 200 }
 * ];
 * calculateDailyPnL(trades, '2024-01-15'); // Returns 50
 */
export function calculateDailyPnL(
  trades: Trade[],
  date: Date | string
): number {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const closedTrades = trades.filter(isClosedTrade);

  return closedTrades
    .filter((trade) => {
      if (!trade.exitDate) return false;
      const tradeDate = new Date(trade.exitDate);
      tradeDate.setHours(0, 0, 0, 0);
      return tradeDate.getTime() === targetDate.getTime();
    })
    .reduce((sum, trade) => sum + (trade.netPnL as number), 0);
}

/**
 * Generates an equity curve from a series of trades
 *
 * The equity curve shows the account balance over time as trades are closed.
 * Trades are processed in chronological order by exit date.
 *
 * @param trades - Array of trades to process
 * @param startingBalance - Initial account balance before trades
 * @returns Array of equity points showing balance progression
 *
 * @example
 * const trades = [
 *   { exitDate: '2024-01-01', netPnL: 100 },
 *   { exitDate: '2024-01-02', netPnL: -50 }
 * ];
 * calculateEquityCurve(trades, 10000);
 * // Returns [
 * //   { date: startDate, equity: 10000 },
 * //   { date: '2024-01-01', equity: 10100, tradeId: '...' },
 * //   { date: '2024-01-02', equity: 10050, tradeId: '...' }
 * // ]
 */
export function calculateEquityCurve(
  trades: Trade[],
  startingBalance: number
): EquityPoint[] {
  const closedTrades = trades
    .filter(isClosedTrade)
    .filter((trade) => trade.exitDate !== null);

  if (closedTrades.length === 0) {
    return [
      {
        date: new Date().toISOString(),
        equity: startingBalance,
      },
    ];
  }

  // Sort trades by exit date
  const sortedTrades = [...closedTrades].sort((a, b) => {
    const dateA = new Date(a.exitDate as string | Date).getTime();
    const dateB = new Date(b.exitDate as string | Date).getTime();
    return dateA - dateB;
  });

  // Create starting point
  const firstTradeDate = new Date(
    sortedTrades[0].exitDate as string | Date
  );
  const startDate = new Date(firstTradeDate);
  startDate.setDate(startDate.getDate() - 1);

  const curve: EquityPoint[] = [
    {
      date: startDate.toISOString(),
      equity: startingBalance,
    },
  ];

  let currentEquity = startingBalance;

  for (const trade of sortedTrades) {
    currentEquity += trade.netPnL as number;
    curve.push({
      date: trade.exitDate as string,
      equity: currentEquity,
      tradeId: trade.id,
    });
  }

  return curve;
}

/**
 * Identifies all drawdown periods in an equity curve
 *
 * A drawdown period starts when equity drops below a previous peak
 * and ends when equity recovers to a new peak.
 *
 * @param equityCurve - Array of equity points to analyze
 * @returns Array of drawdown period objects
 *
 * @example
 * const curve = [
 *   { date: '2024-01-01', equity: 10000 },
 *   { date: '2024-01-02', equity: 12000 },  // Peak 1
 *   { date: '2024-01-03', equity: 10000 },  // Drawdown starts
 *   { date: '2024-01-04', equity: 9000 },   // Trough
 *   { date: '2024-01-05', equity: 13000 }   // Recovery + new peak
 * ];
 * calculateDrawdownPeriods(curve);
 * // Returns [{
 * //   startDate: '2024-01-02',
 * //   endDate: '2024-01-05',
 * //   peakEquity: 12000,
 * //   troughEquity: 9000,
 * //   drawdownAmount: 3000,
 * //   drawdownPercent: 25,
 * //   durationMs: ...,
 * //   isOngoing: false
 * // }]
 */
export function calculateDrawdownPeriods(
  equityCurve: EquityPoint[]
): DrawdownPeriod[] {
  if (equityCurve.length < 2) {
    return [];
  }

  const periods: DrawdownPeriod[] = [];
  let peak = equityCurve[0].equity;
  let peakDate = equityCurve[0].date;
  let currentDrawdown: {
    startDate: Date | string;
    peakEquity: number;
    troughEquity: number;
    troughDate: Date | string;
  } | null = null;

  for (let i = 1; i < equityCurve.length; i++) {
    const point = equityCurve[i];

    if (point.equity > peak) {
      // New peak - close any existing drawdown period
      if (currentDrawdown !== null) {
        const startTime = new Date(currentDrawdown.startDate).getTime();
        const endTime = new Date(point.date).getTime();

        periods.push({
          startDate: currentDrawdown.startDate,
          endDate: point.date,
          peakEquity: currentDrawdown.peakEquity,
          troughEquity: currentDrawdown.troughEquity,
          drawdownAmount: currentDrawdown.peakEquity - currentDrawdown.troughEquity,
          drawdownPercent:
            ((currentDrawdown.peakEquity - currentDrawdown.troughEquity) /
              currentDrawdown.peakEquity) *
            100,
          durationMs: endTime - startTime,
          isOngoing: false,
        });
        currentDrawdown = null;
      }

      peak = point.equity;
      peakDate = point.date;
    } else if (point.equity < peak) {
      // In drawdown
      if (currentDrawdown === null) {
        // Start new drawdown period
        currentDrawdown = {
          startDate: peakDate,
          peakEquity: peak,
          troughEquity: point.equity,
          troughDate: point.date,
        };
      } else if (point.equity < currentDrawdown.troughEquity) {
        // New trough in existing drawdown
        currentDrawdown.troughEquity = point.equity;
        currentDrawdown.troughDate = point.date;
      }
    }
  }

  // Check if there's an ongoing drawdown at the end
  if (currentDrawdown !== null) {
    const startTime = new Date(currentDrawdown.startDate).getTime();
    const lastPoint = equityCurve[equityCurve.length - 1];
    const endTime = new Date(lastPoint.date).getTime();

    periods.push({
      startDate: currentDrawdown.startDate,
      endDate: null,
      peakEquity: currentDrawdown.peakEquity,
      troughEquity: currentDrawdown.troughEquity,
      drawdownAmount: currentDrawdown.peakEquity - currentDrawdown.troughEquity,
      drawdownPercent:
        ((currentDrawdown.peakEquity - currentDrawdown.troughEquity) /
          currentDrawdown.peakEquity) *
        100,
      durationMs: endTime - startTime,
      isOngoing: true,
    });
  }

  return periods;
}

/**
 * Calculates the Sharpe Ratio for a series of trades
 *
 * Sharpe Ratio = (Average Return - Risk-Free Rate) / Standard Deviation of Returns
 *
 * @param trades - Array of trades to analyze
 * @param riskFreeRate - Annual risk-free rate (default 0.02 for 2%)
 * @param periodsPerYear - Number of trading periods per year (default 252 for daily)
 * @returns The Sharpe Ratio, or 0 if insufficient data
 */
export function calculateSharpeRatio(
  trades: Trade[],
  riskFreeRate: number = 0.02,
  periodsPerYear: number = 252
): number {
  const closedTrades = trades.filter(isClosedTrade);

  if (closedTrades.length < 2) {
    return 0;
  }

  const returns = closedTrades.map((trade) => trade.netPnL as number);

  // Calculate average return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate standard deviation
  const squaredDiffs = returns.map((r) => Math.pow(r - avgReturn, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return 0;
  }

  // Annualize the metrics
  const annualizedReturn = avgReturn * periodsPerYear;
  const annualizedStdDev = stdDev * Math.sqrt(periodsPerYear);

  return (annualizedReturn - riskFreeRate) / annualizedStdDev;
}

/**
 * Calculates the average R-multiple across all trades with valid R values
 *
 * @param trades - Array of trades to analyze
 * @returns Average R-multiple, or 0 if no valid R values
 */
export function calculateAverageRMultiple(trades: Trade[]): number {
  const rValues = trades
    .map(calculateRMultiple)
    .filter((r): r is number => r !== null);

  if (rValues.length === 0) {
    return 0;
  }

  return rValues.reduce((sum, r) => sum + r, 0) / rValues.length;
}

"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, Scale, Zap, Flame } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar as CalendarComponent,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatPercentage, formatDuration } from "@/lib/calculations/formatters";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";
import { useAccount } from "@/components/providers/account-provider";

// Analytics components
import { EquityCurve } from "@/components/analytics/equity-curve";
import { WinRateChart } from "@/components/analytics/win-rate-chart";
import { PnLByDay } from "@/components/analytics/pnl-by-day";
import { PnLByTime } from "@/components/analytics/pnl-by-time";
import { SetupPerformance } from "@/components/analytics/setup-performance";
import { EmotionAnalysis } from "@/components/analytics/emotion-analysis";
import { StatsSummary } from "@/components/analytics/stats-summary";

type DateRange = "7d" | "30d" | "90d" | "ytd" | "1y" | "all" | "custom";

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
  { value: "ytd", label: "Year to Date" },
  { value: "1y", label: "Last Year" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

// Helper to calculate date range
function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date();

  switch (range) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "90d":
      start.setDate(end.getDate() - 90);
      break;
    case "ytd":
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
    case "all":
      start = new Date(2000, 0, 1); // Far past date
      break;
    case "custom":
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd };
      }
      start.setDate(end.getDate() - 30);
      break;
  }

  return { start, end };
}

// Calculate all analytics from trades
function calculateAnalytics(trades: Trade[]) {
  const closedTrades = trades.filter(t => t.status === "closed");

  // Basic stats
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
  const wins = closedTrades.filter(t => (t.net_pnl || 0) > 0);
  const losses = closedTrades.filter(t => (t.net_pnl || 0) < 0);
  const breakeven = closedTrades.filter(t => (t.net_pnl || 0) === 0);

  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

  const totalWins = wins.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.net_pnl || 0), 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  const avgWin = wins.length > 0 ? totalWins / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLosses / losses.length : 0;

  // R-Multiple calculation (if available)
  const tradesWithR = closedTrades.filter(t => t.r_multiple !== null);
  const averageR = tradesWithR.length > 0
    ? tradesWithR.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / tradesWithR.length
    : 0;

  // Max Drawdown calculation
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  const sortedByDate = [...closedTrades].sort(
    (a, b) => new Date(a.exit_date || a.entry_date).getTime() - new Date(b.exit_date || b.entry_date).getTime()
  );

  for (const trade of sortedByDate) {
    cumulative += trade.net_pnl || 0;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }

  // Equity curve data
  cumulative = 0;
  const equityData = sortedByDate.map(trade => {
    cumulative += trade.net_pnl || 0;
    return {
      date: (trade.exit_date || trade.entry_date).split("T")[0],
      equity: cumulative,
    };
  });

  // Aggregate equity by date
  const equityByDate: Record<string, number> = {};
  equityData.forEach(point => {
    equityByDate[point.date] = point.equity;
  });
  const equityCurve = Object.entries(equityByDate).map(([date, equity]) => ({ date, equity }));

  // Win rate data
  const winRateData = {
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
  };

  // P&L by day of week
  const pnlByDayMap: Record<string, { pnl: number; trades: number; wins: number }> = {
    Mon: { pnl: 0, trades: 0, wins: 0 },
    Tue: { pnl: 0, trades: 0, wins: 0 },
    Wed: { pnl: 0, trades: 0, wins: 0 },
    Thu: { pnl: 0, trades: 0, wins: 0 },
    Fri: { pnl: 0, trades: 0, wins: 0 },
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  closedTrades.forEach(trade => {
    const date = new Date(trade.exit_date || trade.entry_date);
    const dayName = dayNames[date.getDay()];
    if (pnlByDayMap[dayName]) {
      pnlByDayMap[dayName].pnl += trade.net_pnl || 0;
      pnlByDayMap[dayName].trades += 1;
      if ((trade.net_pnl || 0) > 0) pnlByDayMap[dayName].wins += 1;
    }
  });

  const pnlByDay = Object.entries(pnlByDayMap).map(([day, data]) => ({
    day,
    pnl: data.pnl,
    trades: data.trades,
    winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
  }));

  // P&L by hour
  const pnlByHourMap: Record<number, { pnl: number; trades: number; wins: number }> = {};

  closedTrades.forEach(trade => {
    const date = new Date(trade.entry_date);
    const hour = date.getHours();
    if (!pnlByHourMap[hour]) {
      pnlByHourMap[hour] = { pnl: 0, trades: 0, wins: 0 };
    }
    pnlByHourMap[hour].pnl += trade.net_pnl || 0;
    pnlByHourMap[hour].trades += 1;
    if ((trade.net_pnl || 0) > 0) pnlByHourMap[hour].wins += 1;
  });

  const pnlByTime = Object.entries(pnlByHourMap)
    .map(([hour, data]) => ({
      hour: `${hour}:00`,
      pnl: data.pnl,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  // Setup performance (using setup_id)
  const setupMap: Record<string, { name: string; pnl: number; trades: number; wins: number }> = {};

  closedTrades.forEach(trade => {
    const setupId = trade.setup_id || "unknown";
    if (!setupMap[setupId]) {
      setupMap[setupId] = { name: setupId, pnl: 0, trades: 0, wins: 0 };
    }
    setupMap[setupId].pnl += trade.net_pnl || 0;
    setupMap[setupId].trades += 1;
    if ((trade.net_pnl || 0) > 0) setupMap[setupId].wins += 1;
  });

  const setupPerformance = Object.entries(setupMap)
    .filter(([id]) => id !== "unknown" && id !== "null")
    .map(([id, data]) => ({
      id,
      name: data.name,
      totalPnL: data.pnl,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      avgPnL: data.trades > 0 ? data.pnl / data.trades : 0,
    }));

  // Emotion analysis
  const emotionMap: Record<string, { pnl: number; trades: number; wins: number }> = {};

  closedTrades.forEach(trade => {
    if (trade.emotions && trade.emotions.length > 0) {
      trade.emotions.forEach(emotion => {
        if (!emotionMap[emotion]) {
          emotionMap[emotion] = { pnl: 0, trades: 0, wins: 0 };
        }
        emotionMap[emotion].pnl += trade.net_pnl || 0;
        emotionMap[emotion].trades += 1;
        if ((trade.net_pnl || 0) > 0) emotionMap[emotion].wins += 1;
      });
    }
  });

  const emotionAnalysis = Object.entries(emotionMap).map(([emotion, data]) => ({
    emotion,
    pnl: data.pnl,
    trades: data.trades,
    winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    avgPnL: data.trades > 0 ? data.pnl / data.trades : 0,
  }));

  // Monthly performance
  const monthlyMap: Record<string, { pnl: number; trades: number; wins: number; losses: number }> = {};

  closedTrades.forEach(trade => {
    const date = new Date(trade.exit_date || trade.entry_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
    }
    monthlyMap[monthKey].pnl += trade.net_pnl || 0;
    monthlyMap[monthKey].trades += 1;
    if ((trade.net_pnl || 0) > 0) monthlyMap[monthKey].wins += 1;
    if ((trade.net_pnl || 0) < 0) monthlyMap[monthKey].losses += 1;
  });

  const monthlyPerformance = Object.entries(monthlyMap)
    .map(([month, data]) => ({
      month,
      pnl: data.pnl,
      trades: data.trades,
      wins: data.wins,
      losses: data.losses,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Instrument performance
  const instrumentMap: Record<string, { pnl: number; trades: number; wins: number; volume: number }> = {};

  closedTrades.forEach(trade => {
    const symbol = trade.symbol || "Unknown";
    if (!instrumentMap[symbol]) {
      instrumentMap[symbol] = { pnl: 0, trades: 0, wins: 0, volume: 0 };
    }
    instrumentMap[symbol].pnl += trade.net_pnl || 0;
    instrumentMap[symbol].trades += 1;
    instrumentMap[symbol].volume += trade.entry_contracts || 1;
    if ((trade.net_pnl || 0) > 0) instrumentMap[symbol].wins += 1;
  });

  const instrumentPerformance = Object.entries(instrumentMap)
    .map(([symbol, data]) => ({
      symbol,
      pnl: data.pnl,
      trades: data.trades,
      volume: data.volume,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      avgPnL: data.trades > 0 ? data.pnl / data.trades : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  // ============================================================================
  // NEW ANALYTICS: Streak Analysis
  // ============================================================================
  let currentStreak = 0;
  let currentStreakType: 'win' | 'loss' | null = null;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  sortedByDate.forEach(trade => {
    const isWin = (trade.net_pnl || 0) > 0;
    const isLoss = (trade.net_pnl || 0) < 0;

    if (isWin) {
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak;
    } else if (isLoss) {
      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak;
    } else {
      // Breakeven doesn't break streaks
    }
  });

  // Calculate current streak from most recent trades
  for (let i = sortedByDate.length - 1; i >= 0; i--) {
    const trade = sortedByDate[i];
    const isWin = (trade.net_pnl || 0) > 0;
    const isLoss = (trade.net_pnl || 0) < 0;

    if (currentStreakType === null) {
      if (isWin) {
        currentStreakType = 'win';
        currentStreak = 1;
      } else if (isLoss) {
        currentStreakType = 'loss';
        currentStreak = 1;
      }
    } else if (currentStreakType === 'win' && isWin) {
      currentStreak++;
    } else if (currentStreakType === 'loss' && isLoss) {
      currentStreak++;
    } else if (isWin || isLoss) {
      break;
    }
  }

  const streakAnalysis = {
    currentStreak,
    currentStreakType,
    longestWinStreak,
    longestLossStreak,
    avgWinStreak: wins.length > 0 ? longestWinStreak / Math.max(1, Math.ceil(wins.length / longestWinStreak)) : 0,
    avgLossStreak: losses.length > 0 ? longestLossStreak / Math.max(1, Math.ceil(losses.length / longestLossStreak)) : 0,
  };

  // ============================================================================
  // NEW ANALYTICS: Hold Time Analysis
  // ============================================================================
  const tradesWithHoldTime = closedTrades.filter(t => t.exit_date && t.entry_date);

  const calculateHoldTimeMs = (trade: Trade) => {
    if (!trade.exit_date || !trade.entry_date) return 0;
    return new Date(trade.exit_date).getTime() - new Date(trade.entry_date).getTime();
  };

  const winnersWithHoldTime = tradesWithHoldTime.filter(t => (t.net_pnl || 0) > 0);
  const losersWithHoldTime = tradesWithHoldTime.filter(t => (t.net_pnl || 0) < 0);

  const avgHoldTimeWinners = winnersWithHoldTime.length > 0
    ? winnersWithHoldTime.reduce((sum, t) => sum + calculateHoldTimeMs(t), 0) / winnersWithHoldTime.length
    : 0;

  const avgHoldTimeLosers = losersWithHoldTime.length > 0
    ? losersWithHoldTime.reduce((sum, t) => sum + calculateHoldTimeMs(t), 0) / losersWithHoldTime.length
    : 0;

  const avgHoldTimeAll = tradesWithHoldTime.length > 0
    ? tradesWithHoldTime.reduce((sum, t) => sum + calculateHoldTimeMs(t), 0) / tradesWithHoldTime.length
    : 0;

  // Hold time buckets (in minutes)
  const holdTimeBuckets: Record<string, { pnl: number; trades: number; wins: number }> = {
    '< 5m': { pnl: 0, trades: 0, wins: 0 },
    '5-15m': { pnl: 0, trades: 0, wins: 0 },
    '15-30m': { pnl: 0, trades: 0, wins: 0 },
    '30m-1h': { pnl: 0, trades: 0, wins: 0 },
    '1-2h': { pnl: 0, trades: 0, wins: 0 },
    '2h+': { pnl: 0, trades: 0, wins: 0 },
  };

  tradesWithHoldTime.forEach(trade => {
    const holdTimeMinutes = calculateHoldTimeMs(trade) / 60000;
    let bucket: string;

    if (holdTimeMinutes < 5) bucket = '< 5m';
    else if (holdTimeMinutes < 15) bucket = '5-15m';
    else if (holdTimeMinutes < 30) bucket = '15-30m';
    else if (holdTimeMinutes < 60) bucket = '30m-1h';
    else if (holdTimeMinutes < 120) bucket = '1-2h';
    else bucket = '2h+';

    holdTimeBuckets[bucket].pnl += trade.net_pnl || 0;
    holdTimeBuckets[bucket].trades += 1;
    if ((trade.net_pnl || 0) > 0) holdTimeBuckets[bucket].wins += 1;
  });

  const holdTimeAnalysis = {
    avgHoldTimeAll,
    avgHoldTimeWinners,
    avgHoldTimeLosers,
    buckets: Object.entries(holdTimeBuckets).map(([bucket, data]) => ({
      bucket,
      pnl: data.pnl,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      avgPnL: data.trades > 0 ? data.pnl / data.trades : 0,
    })),
  };

  // ============================================================================
  // NEW ANALYTICS: Trade Size Analysis
  // ============================================================================
  const sizeMap: Record<string, { pnl: number; trades: number; wins: number }> = {};

  closedTrades.forEach(trade => {
    const contracts = trade.entry_contracts || 1;
    const sizeKey = contracts === 1 ? '1' : contracts <= 2 ? '2' : contracts <= 5 ? '3-5' : contracts <= 10 ? '6-10' : '10+';

    if (!sizeMap[sizeKey]) {
      sizeMap[sizeKey] = { pnl: 0, trades: 0, wins: 0 };
    }
    sizeMap[sizeKey].pnl += trade.net_pnl || 0;
    sizeMap[sizeKey].trades += 1;
    if ((trade.net_pnl || 0) > 0) sizeMap[sizeKey].wins += 1;
  });

  const tradeSizeAnalysis = Object.entries(sizeMap)
    .map(([size, data]) => ({
      size,
      pnl: data.pnl,
      trades: data.trades,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      avgPnL: data.trades > 0 ? data.pnl / data.trades : 0,
    }))
    .sort((a, b) => {
      const order = ['1', '2', '3-5', '6-10', '10+'];
      return order.indexOf(a.size) - order.indexOf(b.size);
    });

  // Average contracts for winners vs losers
  const avgContractsWinners = wins.length > 0
    ? wins.reduce((sum, t) => sum + (t.entry_contracts || 1), 0) / wins.length
    : 0;

  const avgContractsLosers = losses.length > 0
    ? losses.reduce((sum, t) => sum + (t.entry_contracts || 1), 0) / losses.length
    : 0;

  // ============================================================================
  // NEW ANALYTICS: Side Analysis (Long vs Short)
  // ============================================================================
  const longTrades = closedTrades.filter(t => t.side === 'long');
  const shortTrades = closedTrades.filter(t => t.side === 'short');

  const longWins = longTrades.filter(t => (t.net_pnl || 0) > 0);
  const shortWins = shortTrades.filter(t => (t.net_pnl || 0) > 0);

  const longPnL = longTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
  const shortPnL = shortTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);

  const sideAnalysis = {
    long: {
      trades: longTrades.length,
      wins: longWins.length,
      losses: longTrades.filter(t => (t.net_pnl || 0) < 0).length,
      pnl: longPnL,
      winRate: longTrades.length > 0 ? (longWins.length / longTrades.length) * 100 : 0,
      avgPnL: longTrades.length > 0 ? longPnL / longTrades.length : 0,
      avgWin: longWins.length > 0 ? longWins.reduce((sum, t) => sum + (t.net_pnl || 0), 0) / longWins.length : 0,
      avgLoss: longTrades.filter(t => (t.net_pnl || 0) < 0).length > 0
        ? Math.abs(longTrades.filter(t => (t.net_pnl || 0) < 0).reduce((sum, t) => sum + (t.net_pnl || 0), 0)) / longTrades.filter(t => (t.net_pnl || 0) < 0).length
        : 0,
    },
    short: {
      trades: shortTrades.length,
      wins: shortWins.length,
      losses: shortTrades.filter(t => (t.net_pnl || 0) < 0).length,
      pnl: shortPnL,
      winRate: shortTrades.length > 0 ? (shortWins.length / shortTrades.length) * 100 : 0,
      avgPnL: shortTrades.length > 0 ? shortPnL / shortTrades.length : 0,
      avgWin: shortWins.length > 0 ? shortWins.reduce((sum, t) => sum + (t.net_pnl || 0), 0) / shortWins.length : 0,
      avgLoss: shortTrades.filter(t => (t.net_pnl || 0) < 0).length > 0
        ? Math.abs(shortTrades.filter(t => (t.net_pnl || 0) < 0).reduce((sum, t) => sum + (t.net_pnl || 0), 0)) / shortTrades.filter(t => (t.net_pnl || 0) < 0).length
        : 0,
    },
  };

  // Performance metrics for stats summary
  const performanceMetrics = {
    totalTrades: closedTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: breakeven.length,
    winRate,
    totalPnL,
    grossProfit: totalWins,
    grossLoss: totalLosses,
    profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    averageWin: avgWin,
    averageLoss: avgLoss,
    largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.net_pnl || 0)) : 0,
    largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.net_pnl || 0)) : 0,
    averageR,
    maxDrawdown,
    expectancy: closedTrades.length > 0 ? totalPnL / closedTrades.length : 0,
  };

  return {
    summary: {
      totalPnL,
      winRate,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
      totalTrades: closedTrades.length,
      averageR,
      maxDrawdown,
    },
    equityCurve,
    winRateData,
    pnlByDay,
    pnlByTime,
    setupPerformance,
    emotionAnalysis,
    performanceMetrics,
    monthlyPerformance,
    instrumentPerformance,
    // New analytics
    streakAnalysis,
    holdTimeAnalysis,
    tradeSizeAnalysis,
    avgContractsWinners,
    avgContractsLosers,
    sideAnalysis,
  };
}

export default function AnalyticsPage() {
  const { selectedAccountId, showAllAccounts } = useAccount();
  const [dateRange, setDateRange] = React.useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = React.useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = React.useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Track analytics page views for the "Data Driven" achievement
  React.useEffect(() => {
    // Only track on client side and once per session
    if (typeof window !== 'undefined') {
      const sessionKey = 'analytics_view_tracked_this_session';
      const alreadyTracked = sessionStorage.getItem(sessionKey);

      if (!alreadyTracked) {
        const currentViews = parseInt(localStorage.getItem('analytics_page_views') || '0', 10);
        localStorage.setItem('analytics_page_views', String(currentViews + 1));
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, []);

  // Fetch trades
  React.useEffect(() => {
    async function fetchTrades() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setTrades([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false });

        if (error) {
          console.error("Error fetching trades:", error);
          setTrades([]);
        } else {
          setTrades(data || []);
        }
      } catch (err) {
        console.error("Exception fetching trades:", err);
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrades();
  }, []);

  // Filter trades by account first
  const accountFilteredTrades = React.useMemo(() => {
    if (showAllAccounts || !selectedAccountId) {
      return trades;
    }
    return trades.filter(t => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId, showAllAccounts]);

  // Filter trades by date range
  const filteredTrades = React.useMemo(() => {
    const { start, end } = getDateRange(dateRange, customStartDate, customEndDate);
    return accountFilteredTrades.filter(trade => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date);
      return tradeDate >= start && tradeDate <= end;
    });
  }, [accountFilteredTrades, dateRange, customStartDate, customEndDate]);

  // Calculate analytics
  const analytics = React.useMemo(() => {
    return calculateAnalytics(filteredTrades);
  }, [filteredTrades]);

  const selectedRangeLabel =
    dateRangeOptions.find((opt) => opt.value === dateRange)?.label || "Select Range";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (trades.length === 0) {
    return (
      <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance analysis and insights
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2">No trades to analyze</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Import or add trades to see your performance analytics, equity curves,
              win rate charts, and more.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary } = analytics;

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive performance analysis and insights
          </p>
        </div>

        {/* Date Range Selector */}
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>{selectedRangeLabel}</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex">
              <div className="border-r p-2">
                <div className="space-y-1">
                  {dateRangeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={dateRange === option.value ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => {
                        setDateRange(option.value);
                        if (option.value !== "custom") {
                          setShowDatePicker(false);
                        }
                      }}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
              {dateRange === "custom" && (
                <div className="p-2">
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium mb-1">Start Date</p>
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        disabled={(date) =>
                          date > new Date() || (customEndDate ? date > customEndDate : false)
                        }
                        initialFocus
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1">End Date</p>
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        disabled={(date) =>
                          date > new Date() ||
                          (customStartDate ? date < customStartDate : false)
                        }
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => setShowDatePicker(false)}
                      disabled={!customStartDate || !customEndDate}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.totalPnL >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {summary.totalPnL >= 0 ? "+" : ""}
              {formatCurrency(summary.totalPnL)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(summary.winRate)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.profitFactor > 0 ? summary.profitFactor.toFixed(2) : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalTrades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg R-Multiple</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.averageR >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {summary.averageR !== 0 ? (
                <>
                  {summary.averageR >= 0 ? "+" : ""}
                  {summary.averageR.toFixed(2)}R
                </>
              ) : (
                "—"
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {summary.maxDrawdown > 0 ? formatPercentage(summary.maxDrawdown) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="instruments">Instruments</TabsTrigger>
          <TabsTrigger value="time">Time</TabsTrigger>
          <TabsTrigger value="setups">Setups</TabsTrigger>
          <TabsTrigger value="psychology">Psychology</TabsTrigger>
          <TabsTrigger value="detailed">Stats</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <EquityCurve data={analytics.equityCurve} />
            <WinRateChart data={analytics.winRateData} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <PnLByDay data={analytics.pnlByDay} />
            <PnLByTime data={analytics.pnlByTime} />
          </div>
        </TabsContent>

        {/* Advanced Analytics Tab */}
        <TabsContent value="advanced" className="space-y-6">
          {/* Streak Analysis */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Flame className={`h-4 w-4 ${analytics.streakAnalysis.currentStreakType === 'win' ? 'text-green-500' : analytics.streakAnalysis.currentStreakType === 'loss' ? 'text-red-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${analytics.streakAnalysis.currentStreakType === 'win' ? 'text-green-500' : analytics.streakAnalysis.currentStreakType === 'loss' ? 'text-red-500' : ''}`}>
                  {analytics.streakAnalysis.currentStreak > 0 ? (
                    <>
                      {analytics.streakAnalysis.currentStreak} {analytics.streakAnalysis.currentStreakType === 'win' ? 'W' : 'L'}
                    </>
                  ) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.streakAnalysis.currentStreakType === 'win' ? 'Winning streak' : analytics.streakAnalysis.currentStreakType === 'loss' ? 'Losing streak' : 'No active streak'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Win Streak</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {analytics.streakAnalysis.longestWinStreak > 0 ? analytics.streakAnalysis.longestWinStreak : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Consecutive wins</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Longest Loss Streak</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {analytics.streakAnalysis.longestLossStreak > 0 ? analytics.streakAnalysis.longestLossStreak : '—'}
                </div>
                <p className="text-xs text-muted-foreground">Consecutive losses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hold Time</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.holdTimeAnalysis.avgHoldTimeAll > 0 ? formatDuration(analytics.holdTimeAnalysis.avgHoldTimeAll) : '—'}
                </div>
                <p className="text-xs text-muted-foreground">All trades</p>
              </CardContent>
            </Card>
          </div>

          {/* Side Analysis (Long vs Short) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Long vs Short Performance
              </CardTitle>
              <CardDescription>Compare your performance between long and short trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Long Performance */}
                <div className={`rounded-lg border p-4 ${analytics.sideAnalysis.long.pnl >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowUpRight className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-semibold">Long Trades</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Total P&L</span>
                      <span className={`text-xl font-bold ${analytics.sideAnalysis.long.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {analytics.sideAnalysis.long.pnl >= 0 ? '+' : ''}{formatCurrency(analytics.sideAnalysis.long.pnl)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Win Rate</span>
                      <span className="text-xl font-bold">{analytics.sideAnalysis.long.winRate.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Trades</span>
                      <span className="font-medium">{analytics.sideAnalysis.long.trades}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">W/L</span>
                      <span className="font-medium">{analytics.sideAnalysis.long.wins}/{analytics.sideAnalysis.long.losses}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Avg Win</span>
                      <span className="font-medium text-green-500">+{formatCurrency(analytics.sideAnalysis.long.avgWin)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Avg Loss</span>
                      <span className="font-medium text-red-500">-{formatCurrency(analytics.sideAnalysis.long.avgLoss)}</span>
                    </div>
                  </div>
                </div>

                {/* Short Performance */}
                <div className={`rounded-lg border p-4 ${analytics.sideAnalysis.short.pnl >= 0 ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowDownRight className="h-5 w-5 text-red-600" />
                    <span className="text-lg font-semibold">Short Trades</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Total P&L</span>
                      <span className={`text-xl font-bold ${analytics.sideAnalysis.short.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {analytics.sideAnalysis.short.pnl >= 0 ? '+' : ''}{formatCurrency(analytics.sideAnalysis.short.pnl)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Win Rate</span>
                      <span className="text-xl font-bold">{analytics.sideAnalysis.short.winRate.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Trades</span>
                      <span className="font-medium">{analytics.sideAnalysis.short.trades}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">W/L</span>
                      <span className="font-medium">{analytics.sideAnalysis.short.wins}/{analytics.sideAnalysis.short.losses}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Avg Win</span>
                      <span className="font-medium text-green-500">+{formatCurrency(analytics.sideAnalysis.short.avgWin)}</span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Avg Loss</span>
                      <span className="font-medium text-red-500">-{formatCurrency(analytics.sideAnalysis.short.avgLoss)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hold Time Analysis */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Hold Time Comparison
                </CardTitle>
                <CardDescription>How long you hold winning vs losing trades</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Winners Avg Hold</span>
                    </div>
                    <span className="text-lg font-bold text-green-500">
                      {analytics.holdTimeAnalysis.avgHoldTimeWinners > 0 ? formatDuration(analytics.holdTimeAnalysis.avgHoldTimeWinners) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Losers Avg Hold</span>
                    </div>
                    <span className="text-lg font-bold text-red-500">
                      {analytics.holdTimeAnalysis.avgHoldTimeLosers > 0 ? formatDuration(analytics.holdTimeAnalysis.avgHoldTimeLosers) : '—'}
                    </span>
                  </div>
                  {analytics.holdTimeAnalysis.avgHoldTimeWinners > 0 && analytics.holdTimeAnalysis.avgHoldTimeLosers > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {analytics.holdTimeAnalysis.avgHoldTimeWinners > analytics.holdTimeAnalysis.avgHoldTimeLosers
                        ? "You hold winners longer than losers - good discipline!"
                        : "You hold losers longer than winners - consider cutting losses faster."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>P&L by Hold Time</CardTitle>
                <CardDescription>Performance across different hold durations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.holdTimeAnalysis.buckets.map(bucket => (
                    <div key={bucket.bucket} className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-16">{bucket.bucket}</span>
                        <span className="text-xs text-muted-foreground">{bucket.trades} trades</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs">{bucket.winRate.toFixed(0)}% WR</span>
                        <span className={`font-medium ${bucket.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {bucket.pnl >= 0 ? '+' : ''}{formatCurrency(bucket.pnl)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trade Size Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Trade Size Analysis
              </CardTitle>
              <CardDescription>Performance by position size (contracts)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  {analytics.tradeSizeAnalysis.map(size => (
                    <div key={size.size} className={`flex items-center justify-between p-3 rounded-lg border ${size.pnl >= 0 ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                      <div>
                        <span className="font-medium">{size.size} contract{size.size !== '1' ? 's' : ''}</span>
                        <span className="text-xs text-muted-foreground ml-2">({size.trades} trades)</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${size.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {size.pnl >= 0 ? '+' : ''}{formatCurrency(size.pnl)}
                        </span>
                        <span className="text-xs text-muted-foreground block">{size.winRate.toFixed(0)}% win rate</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <h4 className="font-medium mb-3">Size Insights</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg contracts (winners)</span>
                        <span className="font-medium">{analytics.avgContractsWinners.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg contracts (losers)</span>
                        <span className="font-medium">{analytics.avgContractsLosers.toFixed(1)}</span>
                      </div>
                      {analytics.tradeSizeAnalysis.length > 0 && (
                        <div className="pt-2 border-t">
                          <span className="text-sm text-muted-foreground">Best performing size:</span>
                          <span className="font-medium ml-2">
                            {analytics.tradeSizeAnalysis.sort((a, b) => b.winRate - a.winRate)[0]?.size || '—'} contracts
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Performance Tab */}
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance</CardTitle>
              <CardDescription>
                Your trading results broken down by month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.monthlyPerformance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.monthlyPerformance.slice(-6).map(month => {
                      const monthDate = new Date(month.month + "-01");
                      const monthName = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                      return (
                        <div
                          key={month.month}
                          className={`rounded-lg border p-4 ${
                            month.pnl >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{monthName}</span>
                            <span className={`font-bold ${month.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {month.pnl >= 0 ? "+" : ""}{formatCurrency(month.pnl)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="block text-xs">Trades</span>
                              <span className="font-medium text-foreground">{month.trades}</span>
                            </div>
                            <div>
                              <span className="block text-xs">Win Rate</span>
                              <span className="font-medium text-foreground">{month.winRate.toFixed(0)}%</span>
                            </div>
                            <div>
                              <span className="block text-xs">W/L</span>
                              <span className="font-medium text-foreground">{month.wins}/{month.losses}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {analytics.monthlyPerformance.length > 6 && (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium">Month</th>
                            <th className="text-right p-3 font-medium">P&L</th>
                            <th className="text-right p-3 font-medium">Trades</th>
                            <th className="text-right p-3 font-medium">Win Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.monthlyPerformance.slice(0, -6).reverse().map(month => {
                            const monthDate = new Date(month.month + "-01");
                            const monthName = monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
                            return (
                              <tr key={month.month} className="border-t">
                                <td className="p-3">{monthName}</td>
                                <td className={`p-3 text-right font-medium ${month.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                  {month.pnl >= 0 ? "+" : ""}{formatCurrency(month.pnl)}
                                </td>
                                <td className="p-3 text-right">{month.trades}</td>
                                <td className="p-3 text-right">{month.winRate.toFixed(0)}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No monthly data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instruments Tab */}
        <TabsContent value="instruments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instrument Performance</CardTitle>
              <CardDescription>
                Compare your performance across different instruments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.instrumentPerformance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.instrumentPerformance.map(instrument => (
                      <div
                        key={instrument.symbol}
                        className={`rounded-lg border p-4 ${
                          instrument.pnl >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold">{instrument.symbol}</span>
                          <span className={`text-lg font-bold ${instrument.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {instrument.pnl >= 0 ? "+" : ""}{formatCurrency(instrument.pnl)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="block text-xs text-muted-foreground">Trades</span>
                            <span className="font-medium">{instrument.trades}</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Win Rate</span>
                            <span className="font-medium">{instrument.winRate.toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Volume</span>
                            <span className="font-medium">{instrument.volume} contracts</span>
                          </div>
                          <div>
                            <span className="block text-xs text-muted-foreground">Avg P&L</span>
                            <span className={`font-medium ${instrument.avgPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {instrument.avgPnL >= 0 ? "+" : ""}{formatCurrency(instrument.avgPnL)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No instrument data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Analysis Tab */}
        <TabsContent value="time" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <PnLByDay data={analytics.pnlByDay} />
            <PnLByTime data={analytics.pnlByTime} />
          </div>
          <EquityCurve data={analytics.equityCurve} />
        </TabsContent>

        {/* Setups Tab */}
        <TabsContent value="setups" className="space-y-4">
          <SetupPerformance data={analytics.setupPerformance} />
          <div className="grid gap-4 md:grid-cols-2">
            <WinRateChart data={analytics.winRateData} />
            <Card>
              <CardHeader>
                <CardTitle>Setup Insights</CardTitle>
                <CardDescription>
                  Key takeaways from your setup performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.setupPerformance.length > 0 ? (
                  <>
                    {analytics.setupPerformance
                      .sort((a, b) => b.winRate - a.winRate)
                      .slice(0, 1)
                      .map(setup => (
                        <div key={setup.id} className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                          <h4 className="font-semibold text-green-500 mb-2">
                            Top Performing Setup
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{setup.name}</span> has
                            a {setup.winRate.toFixed(1)}% win rate with {formatCurrency(setup.totalPnL)} total P&L.
                          </p>
                        </div>
                      ))}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No setup data available. Tag your trades with setups to see performance analysis.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Psychology Tab */}
        <TabsContent value="psychology" className="space-y-4">
          <EmotionAnalysis data={analytics.emotionAnalysis} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Emotional Patterns</CardTitle>
                <CardDescription>
                  Insights from your psychological data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analytics.emotionAnalysis.length > 0 ? (
                  <>
                    {analytics.emotionAnalysis
                      .sort((a, b) => b.winRate - a.winRate)
                      .slice(0, 1)
                      .map(emotion => (
                        <div key={emotion.emotion} className="rounded-lg bg-green-500/10 p-4 border border-green-500/20">
                          <h4 className="font-semibold text-green-500 mb-2">
                            Best Emotional State
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            You perform best when feeling{" "}
                            <span className="font-medium text-foreground capitalize">{emotion.emotion}</span>{" "}
                            with a {emotion.winRate.toFixed(1)}% win rate.
                          </p>
                        </div>
                      ))}
                    {analytics.emotionAnalysis
                      .sort((a, b) => a.pnl - b.pnl)
                      .slice(0, 1)
                      .filter(e => e.pnl < 0)
                      .map(emotion => (
                        <div key={emotion.emotion} className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
                          <h4 className="font-semibold text-red-500 mb-2">
                            Costly Emotion
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground capitalize">{emotion.emotion}</span>{" "}
                            has cost you {formatCurrency(Math.abs(emotion.pnl))} with a {emotion.winRate.toFixed(0)}% win rate.
                          </p>
                        </div>
                      ))}
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No emotion data available. Tag your trades with emotions to see psychological analysis.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>
                  Steps to improve your trading psychology
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <span className="text-sm">
                      Take a 30-minute break after any losing trade to avoid
                      revenge trading
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <span className="text-sm">
                      Journal your emotional state before each trade
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <span className="text-sm">
                      Set a daily loss limit and stop trading when reached
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                    <span className="text-sm">
                      Practice mindfulness or deep breathing before entering
                      trades
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Detailed Stats Tab */}
        <TabsContent value="detailed" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <StatsSummary data={analytics.performanceMetrics} />
            <div className="space-y-4">
              <EquityCurve data={analytics.equityCurve} />
              <WinRateChart data={analytics.winRateData} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

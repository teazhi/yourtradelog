"use client";

import * as React from "react";
import Link from "next/link";
import { Upload, Plus } from "lucide-react";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentTrades } from "@/components/dashboard/recent-trades";
import { EquityChart } from "@/components/dashboard/equity-chart";
import { DailyPnL } from "@/components/dashboard/daily-pnl";
import { PositionSizer } from "@/components/dashboard/position-sizer";
import { DailyQuote } from "@/components/dashboard/daily-quote";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";
import { Spinner, Button } from "@/components/ui";
import { useAccount } from "@/components/providers/account-provider";

export default function DashboardPage() {
  const { selectedAccountId, showAllAccounts } = useAccount();
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch trades from Supabase
  React.useEffect(() => {
    async function fetchTrades() {
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

  // Filter trades by selected account
  const filteredTrades = React.useMemo(() => {
    if (showAllAccounts || !selectedAccountId) {
      return trades;
    }
    return trades.filter(t => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId, showAllAccounts]);

  // Transform trades for dashboard components
  const recentTrades = React.useMemo(() => {
    return filteredTrades
      .filter(t => t.status === "closed")
      .slice(0, 8)
      .map(t => ({
        id: t.id,
        symbol: t.symbol,
        direction: t.side as "long" | "short",
        entryDate: t.entry_date,
        exitDate: t.exit_date || t.entry_date,
        pnl: t.net_pnl || 0,
        status: (t.net_pnl || 0) > 0 ? "win" as const : (t.net_pnl || 0) < 0 ? "loss" as const : "breakeven" as const,
      }));
  }, [filteredTrades]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const closedTrades = filteredTrades.filter(t => t.status === "closed");
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
    const wins = closedTrades.filter(t => (t.net_pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.net_pnl || 0) < 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.net_pnl || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.net_pnl || 0), 0) / losses.length) : 0;
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : wins.length > 0 ? Infinity : 0;

    return {
      totalPnL,
      winRate,
      totalTrades: closedTrades.length,
      profitFactor: isFinite(profitFactor) ? profitFactor : 0,
    };
  }, [filteredTrades]);

  // Calculate daily P&L for chart
  const dailyPnL = React.useMemo(() => {
    // Include trades that are closed OR have a net_pnl value
    const closedTrades = filteredTrades.filter(t => t.status === "closed" || t.net_pnl !== null);
    const pnlByDate: Record<string, number> = {};

    closedTrades.forEach(trade => {
      // Use exit_date if available, otherwise fall back to entry_date
      const dateStr = trade.exit_date || trade.entry_date;
      const date = dateStr.split("T")[0];
      pnlByDate[date] = (pnlByDate[date] || 0) + (trade.net_pnl || 0);
    });

    // Get last 30 days with data
    const dates = Object.keys(pnlByDate).sort().slice(-30);
    return dates.map(date => ({
      date,
      pnl: pnlByDate[date],
    }));
  }, [filteredTrades]);

  // Calculate equity curve
  const equityCurve = React.useMemo(() => {
    const closedTrades = filteredTrades
      .filter(t => t.status === "closed" && t.exit_date)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());

    let cumulative = 0;
    const curve = closedTrades.map(trade => {
      cumulative += trade.net_pnl || 0;
      return {
        date: trade.exit_date!.split("T")[0],
        equity: cumulative,
      };
    });

    // Aggregate by date (keep last value for each date)
    const byDate: Record<string, number> = {};
    curve.forEach(point => {
      byDate[point.date] = point.equity;
    });

    return Object.entries(byDate).map(([date, equity]) => ({ date, equity }));
  }, [filteredTrades]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Welcome back! Here&apos;s an overview of your trading performance.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Link href="/import">
            <Button size="icon" className="h-9 w-9 sm:w-auto sm:px-3">
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Import Trades</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Daily Motivational Quote (only on trading days) */}
      <DailyQuote />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Daily P&L */}
      <DailyPnL data={dailyPnL} />

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 items-start">
        {/* Left Column: Equity Chart + Position Sizer */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <EquityChart data={equityCurve} />
          <PositionSizer />
        </div>

        {/* Recent Trades */}
        <RecentTrades trades={recentTrades} />
      </div>
    </div>
  );
}

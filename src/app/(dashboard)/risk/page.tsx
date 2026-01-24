"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  BarChart3,
  Shield,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Spinner,
} from "@/components/ui";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";
import { PositionSizer } from "@/components/risk/position-sizer";
import { DailyLimitTracker } from "@/components/risk/daily-limit-tracker";
import { DrawdownChart } from "@/components/risk/drawdown-chart";
import { createClient } from "@/lib/supabase/client";
import { Trade, Profile, Account } from "@/types/database";

interface RiskMetrics {
  startingBalance: number;
  currentBalance: number;
  totalPnL: number;
  totalReturn: number;
  weeklyPnL: number;
  monthlyPnL: number;
  dailyPnL: number;
  maxDrawdown: number;
  currentDrawdown: number;
  avgWinningDay: number;
  avgLosingDay: number;
  profitableDays: number;
  totalTradingDays: number;
  largestWin: number;
  largestLoss: number;
  avgRMultiple: number;
  tradesToday: number;
}

export default function RiskPage() {
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [defaultAccount, setDefaultAccount] = React.useState<Account | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch trades, profile, and accounts from Supabase
  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setTrades([]);
          setIsLoading(false);
          return;
        }

        // Fetch trades, profile, and default account in parallel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [tradesRes, profileRes, accountsRes] = await Promise.all([
          supabase
            .from("trades")
            .select("*")
            .eq("user_id", user.id)
            .order("entry_date", { ascending: true }),
          (supabase
            .from("profiles") as any)
            .select("*")
            .eq("id", user.id)
            .single(),
          (supabase
            .from("accounts") as any)
            .select("*")
            .eq("user_id", user.id)
            .eq("is_default", true)
            .single(),
        ]);

        if (tradesRes.error) {
          console.error("Error fetching trades:", tradesRes.error);
          setTrades([]);
        } else {
          setTrades(tradesRes.data || []);
        }

        if (profileRes?.data) {
          setProfile(profileRes.data as Profile);
        }

        if (accountsRes?.data) {
          setDefaultAccount(accountsRes.data as Account);
        }
      } catch (err) {
        console.error("Exception fetching data:", err);
        setTrades([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate risk metrics from trades
  const metrics: RiskMetrics = React.useMemo(() => {
    const closedTrades = trades.filter(t => t.status === "closed");
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Group trades by day
    const tradesByDay: Record<string, Trade[]> = {};
    closedTrades.forEach((trade) => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date).toISOString().split("T")[0];
      if (!tradesByDay[tradeDate]) {
        tradesByDay[tradeDate] = [];
      }
      tradesByDay[tradeDate].push(trade);
    });

    // Calculate daily P&L
    const dailyPnL: { date: string; pnl: number }[] = [];
    Object.entries(tradesByDay).forEach(([date, dayTrades]) => {
      dailyPnL.push({
        date,
        pnl: dayTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0),
      });
    });

    // Sort by date
    dailyPnL.sort((a, b) => a.date.localeCompare(b.date));

    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
    // Use account balance if available, otherwise fall back to profile account_size, then default
    const startingBalance = defaultAccount?.starting_balance || profile?.account_size || 50000;
    const currentBalance = defaultAccount?.current_balance || (startingBalance + totalPnL);

    // Week and month P&L
    const weeklyPnL = closedTrades
      .filter(t => new Date(t.exit_date || t.entry_date) >= startOfWeek)
      .reduce((sum, t) => sum + (t.net_pnl || 0), 0);

    const monthlyPnL = closedTrades
      .filter(t => new Date(t.exit_date || t.entry_date) >= startOfMonth)
      .reduce((sum, t) => sum + (t.net_pnl || 0), 0);

    const todaysPnL = dailyPnL.find(d => d.date === today)?.pnl || 0;
    const tradesToday = tradesByDay[today]?.length || 0;

    // Calculate drawdown
    let peak = startingBalance;
    let maxDrawdown = 0;
    let runningEquity = startingBalance;

    dailyPnL.forEach(({ pnl }) => {
      runningEquity += pnl;
      peak = Math.max(peak, runningEquity);
      const drawdown = peak > 0 ? ((peak - runningEquity) / peak) * 100 : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    });

    const currentDrawdown = peak > 0 ? ((peak - currentBalance) / peak) * 100 : 0;

    // Calculate winning/losing days
    const winningDays = dailyPnL.filter(d => d.pnl > 0);
    const losingDays = dailyPnL.filter(d => d.pnl < 0);

    const avgWinningDay = winningDays.length > 0
      ? winningDays.reduce((sum, d) => sum + d.pnl, 0) / winningDays.length
      : 0;
    const avgLosingDay = losingDays.length > 0
      ? losingDays.reduce((sum, d) => sum + d.pnl, 0) / losingDays.length
      : 0;

    // Largest win/loss
    const largestWin = closedTrades.length > 0
      ? Math.max(...closedTrades.map(t => t.net_pnl || 0))
      : 0;
    const largestLoss = closedTrades.length > 0
      ? Math.min(...closedTrades.map(t => t.net_pnl || 0))
      : 0;

    // Average R-multiple
    const tradesWithR = closedTrades.filter(t => t.r_multiple !== null && t.r_multiple !== undefined);
    const avgRMultiple = tradesWithR.length > 0
      ? tradesWithR.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / tradesWithR.length
      : 0;

    return {
      startingBalance,
      currentBalance,
      totalPnL,
      totalReturn: startingBalance > 0 ? (totalPnL / startingBalance) * 100 : 0,
      weeklyPnL,
      monthlyPnL,
      dailyPnL: todaysPnL,
      maxDrawdown,
      currentDrawdown,
      avgWinningDay,
      avgLosingDay,
      profitableDays: winningDays.length,
      totalTradingDays: dailyPnL.length,
      largestWin,
      largestLoss,
      avgRMultiple,
      tradesToday,
    };
  }, [trades, profile, defaultAccount]);

  // Calculate drawdown data for chart
  const drawdownData = React.useMemo(() => {
    const closedTrades = trades.filter(t => t.status === "closed");

    // Group trades by day
    const tradesByDay: Record<string, number> = {};
    closedTrades.forEach((trade) => {
      const tradeDate = new Date(trade.exit_date || trade.entry_date).toISOString().split("T")[0];
      if (!tradesByDay[tradeDate]) {
        tradesByDay[tradeDate] = 0;
      }
      tradesByDay[tradeDate] += trade.net_pnl || 0;
    });

    // Sort by date
    const sortedDates = Object.keys(tradesByDay).sort();

    let equity = metrics.startingBalance;
    let peak = equity;

    return sortedDates.map(date => {
      equity += tradesByDay[date];
      peak = Math.max(peak, equity);
      const drawdown = peak - equity;
      const drawdownPercent = peak > 0 ? (drawdown / peak) * 100 : 0;

      return {
        date,
        equity,
        peak,
        drawdown,
        drawdownPercent,
      };
    });
  }, [trades, metrics.startingBalance]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading risk data...</p>
        </div>
      </div>
    );
  }

  const data = metrics;
  const dayWinRate = data.totalTradingDays > 0 ? (data.profitableDays / data.totalTradingDays) * 100 : 0;

  // Empty state
  if (trades.filter(t => t.status === "closed").length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
          <p className="text-muted-foreground">
            Monitor your risk exposure and calculate position sizes
          </p>
        </div>

        {/* Position Sizer - always useful */}
        <div className="grid gap-6 lg:grid-cols-2">
          <DailyLimitTracker
            dailyLimit={profile?.daily_loss_limit || 500}
            currentPnL={0}
            tradesToday={0}
            maxTrades={6}
          />
          <PositionSizer
            defaultAccountSize={defaultAccount?.current_balance || profile?.account_size || 50000}
            defaultRiskPercent={profile?.default_risk_per_trade || 1}
            defaultTickValue={12.5}
          />
        </div>

        {/* Empty state for other cards */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Trade Data Yet</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Import or add trades to see your risk metrics, drawdown analysis, and performance statistics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-muted-foreground">
          Monitor your risk exposure and calculate position sizes
        </p>
      </div>

      {/* Account Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Starting Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.startingBalance)}
            </div>
            <p className="text-xs text-muted-foreground">Initial account value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current account value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {data.totalPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                data.totalPnL >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {data.totalPnL >= 0 ? "+" : ""}
              {formatCurrency(data.totalPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.totalReturn >= 0 ? "+" : ""}
              {formatPercentage(data.totalReturn)} return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              -{data.maxDrawdown.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Largest peak-to-trough decline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Metrics Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Limit Tracker */}
        <DailyLimitTracker
          dailyLimit={profile?.daily_loss_limit || 500}
          currentPnL={data.dailyPnL}
          tradesToday={data.tradesToday}
          maxTrades={6}
        />

        {/* Position Sizer */}
        <PositionSizer
          defaultAccountSize={data.currentBalance}
          defaultRiskPercent={profile?.default_risk_per_trade || 1}
          defaultTickValue={12.5}
        />
      </div>

      {/* Drawdown Chart */}
      <DrawdownChart data={drawdownData} maxDrawdownLimit={10} />

      {/* Risk Metrics Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Metrics</CardTitle>
          <CardDescription>
            Key performance and risk indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Avg R-Multiple</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  data.avgRMultiple >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {data.avgRMultiple !== 0 ? (
                  <>
                    {data.avgRMultiple >= 0 ? "+" : ""}
                    {data.avgRMultiple.toFixed(2)}R
                  </>
                ) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Average risk multiple
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Day Win Rate</p>
              <p className="text-2xl font-bold">{dayWinRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                {data.profitableDays}/{data.totalTradingDays} profitable days
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Current Drawdown</p>
              <p className="text-2xl font-bold text-orange-500">
                -{data.currentDrawdown.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground">From recent peak</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Total Trading Days</p>
              <p className="text-2xl font-bold">{data.totalTradingDays}</p>
              <p className="text-xs text-muted-foreground">
                Days with trades
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Win/Loss Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Winning Day Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm text-muted-foreground">Avg Winning Day</p>
                <p className="text-xl font-bold text-green-500">
                  +{formatCurrency(data.avgWinningDay)}
                </p>
              </div>
              <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm text-muted-foreground">Largest Win</p>
                <p className="text-xl font-bold text-green-500">
                  +{formatCurrency(data.largestWin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Losing Day Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm text-muted-foreground">Avg Losing Day</p>
                <p className="text-xl font-bold text-red-500">
                  {formatCurrency(data.avgLosingDay)}
                </p>
              </div>
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm text-muted-foreground">Largest Loss</p>
                <p className="text-xl font-bold text-red-500">
                  {formatCurrency(data.largestLoss)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period P&L Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Period Performance</CardTitle>
          <CardDescription>P&L across different time periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">Today</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  data.dailyPnL >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {data.dailyPnL >= 0 ? "+" : ""}
                {formatCurrency(data.dailyPnL)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  data.weeklyPnL >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {data.weeklyPnL >= 0 ? "+" : ""}
                {formatCurrency(data.weeklyPnL)}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p
                className={cn(
                  "text-xl font-bold",
                  data.monthlyPnL >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {data.monthlyPnL >= 0 ? "+" : ""}
                {formatCurrency(data.monthlyPnL)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

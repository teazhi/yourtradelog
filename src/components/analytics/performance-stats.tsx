"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  BarChart3,
  Award,
  AlertTriangle,
  Percent,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";
import type { PerformanceMetrics } from "@/types/analytics";

interface PerformanceStatsProps {
  data?: PerformanceMetrics;
}

// Mock data for demonstration
const mockPerformanceMetrics: PerformanceMetrics = {
  // Overall stats
  total_trades: 127,
  winning_trades: 74,
  losing_trades: 48,
  breakeven_trades: 5,
  win_rate: 58.27,
  loss_rate: 37.8,
  // P&L metrics
  total_gross_pnl: 14250,
  total_net_pnl: 12543.67,
  total_commission: 1270,
  total_fees: 436.33,
  average_win: 285.5,
  average_loss: -178.25,
  largest_win: 1850,
  largest_loss: -920,
  profit_factor: 2.14,
  expected_value: 98.77,
  // Risk metrics
  average_r_multiple: 0.85,
  max_consecutive_wins: 8,
  max_consecutive_losses: 4,
  max_drawdown: 3250,
  max_drawdown_percent: 6.5,
  recovery_factor: 3.86,
  sharpe_ratio: 1.72,
  // Trade duration
  average_hold_time_minutes: 45,
  average_winner_hold_time: 52,
  average_loser_hold_time: 28,
  // Rating averages
  average_entry_rating: 3.8,
  average_exit_rating: 3.5,
  average_management_rating: 3.6,
};

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  description?: string;
}

function StatCard({ title, value, subValue, icon, trend, description }: StatCardProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-green-500";
    if (trend === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getTrendColor()}`}>{value}</div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function PerformanceStats({ data = mockPerformanceMetrics }: PerformanceStatsProps) {
  const winLossRatio =
    data.average_loss !== 0
      ? Math.abs(data.average_win / data.average_loss)
      : 0;

  return (
    <div className="space-y-4">
      {/* Key Performance Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Win Rate"
          value={formatPercentage(data.win_rate)}
          subValue={`${data.winning_trades} of ${data.total_trades} trades`}
          icon={<Percent className="h-4 w-4" />}
          trend={data.win_rate >= 50 ? "up" : "down"}
        />
        <StatCard
          title="Profit Factor"
          value={data.profit_factor.toFixed(2)}
          subValue={data.profit_factor >= 1.5 ? "Strong edge" : data.profit_factor >= 1 ? "Positive edge" : "No edge"}
          icon={<BarChart3 className="h-4 w-4" />}
          trend={data.profit_factor >= 1 ? "up" : "down"}
        />
        <StatCard
          title="Expectancy"
          value={formatCurrency(data.expected_value)}
          subValue="per trade"
          icon={<Activity className="h-4 w-4" />}
          trend={data.expected_value >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Sharpe Ratio"
          value={data.sharpe_ratio?.toFixed(2) || "N/A"}
          subValue={
            data.sharpe_ratio
              ? data.sharpe_ratio >= 2
                ? "Excellent"
                : data.sharpe_ratio >= 1
                ? "Good"
                : "Below average"
              : undefined
          }
          icon={<Award className="h-4 w-4" />}
          trend={data.sharpe_ratio && data.sharpe_ratio >= 1 ? "up" : "neutral"}
        />
      </div>

      {/* Win/Loss Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Average Win"
          value={formatCurrency(data.average_win)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Average Loss"
          value={formatCurrency(data.average_loss)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
        />
        <StatCard
          title="Largest Win"
          value={formatCurrency(data.largest_win)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Largest Loss"
          value={formatCurrency(data.largest_loss)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
        />
      </div>

      {/* Trade Counts and Risk */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Trades"
          value={data.total_trades}
          icon={<Target className="h-4 w-4" />}
          trend="neutral"
        />
        <StatCard
          title="Winning Trades"
          value={data.winning_trades}
          subValue={formatPercentage(data.win_rate)}
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Losing Trades"
          value={data.losing_trades}
          subValue={formatPercentage(data.loss_rate)}
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
        />
        <StatCard
          title="Max Drawdown"
          value={formatCurrency(data.max_drawdown)}
          subValue={formatPercentage(data.max_drawdown_percent)}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend="down"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Win/Loss Ratio"
          value={`${winLossRatio.toFixed(2)}:1`}
          description="Avg win size vs avg loss size"
          icon={<BarChart3 className="h-4 w-4" />}
          trend={winLossRatio >= 1 ? "up" : "down"}
        />
        <StatCard
          title="Avg R-Multiple"
          value={`${data.average_r_multiple >= 0 ? "+" : ""}${data.average_r_multiple.toFixed(2)}R`}
          icon={<Activity className="h-4 w-4" />}
          trend={data.average_r_multiple >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Max Win Streak"
          value={data.max_consecutive_wins}
          subValue="consecutive wins"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="up"
        />
        <StatCard
          title="Max Loss Streak"
          value={data.max_consecutive_losses}
          subValue="consecutive losses"
          icon={<TrendingDown className="h-4 w-4" />}
          trend="down"
        />
      </div>
    </div>
  );
}

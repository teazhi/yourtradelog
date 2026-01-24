"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Separator } from "@/components/ui";
import {
  TrendingUp,
  Target,
  Award,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/calculations/formatters";

interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  totalPnL: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageR: number;
  maxDrawdown: number;
  expectancy: number;
}

interface StatsSummaryProps {
  data?: PerformanceMetrics;
}

interface StatItemProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  valueColor?: string;
}

function StatItem({ label, value, subValue, icon, valueColor }: StatItemProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <span className={`font-medium ${valueColor || ""}`}>{value}</span>
        {subValue && (
          <div className="text-xs text-muted-foreground">{subValue}</div>
        )}
      </div>
    </div>
  );
}

export function StatsSummary({ data }: StatsSummaryProps) {
  // Empty state
  if (!data || data.totalTrades === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Statistics
          </CardTitle>
          <CardDescription>
            Comprehensive performance metrics and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No trade data yet. Add trades to see detailed statistics.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lossRate = data.totalTrades > 0
    ? (data.losingTrades / data.totalTrades) * 100
    : 0;

  const winLossRatio = data.averageLoss !== 0
    ? Math.abs(data.averageWin / data.averageLoss)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Detailed Statistics
        </CardTitle>
        <CardDescription>
          Comprehensive performance metrics and analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trade Overview */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Trade Overview
          </h4>
          <div className="space-y-1 rounded-lg bg-muted/50 p-3">
            <StatItem
              label="Total Trades"
              value={data.totalTrades}
            />
            <StatItem
              label="Winning Trades"
              value={data.winningTrades}
              subValue={formatPercentage(data.winRate)}
              valueColor="text-green-500"
            />
            <StatItem
              label="Losing Trades"
              value={data.losingTrades}
              subValue={formatPercentage(lossRate)}
              valueColor="text-red-500"
            />
            <StatItem
              label="Breakeven Trades"
              value={data.breakevenTrades}
            />
          </div>
        </div>

        <Separator />

        {/* P&L Metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            P&L Metrics
          </h4>
          <div className="space-y-1 rounded-lg bg-muted/50 p-3">
            <StatItem
              label="Total Net P&L"
              value={formatCurrency(data.totalPnL)}
              valueColor={data.totalPnL >= 0 ? "text-green-500" : "text-red-500"}
            />
            <StatItem
              label="Gross Profit"
              value={formatCurrency(data.grossProfit)}
              valueColor="text-green-500"
            />
            <StatItem
              label="Gross Loss"
              value={formatCurrency(-data.grossLoss)}
              valueColor="text-red-500"
            />
            <Separator className="my-2" />
            <StatItem
              label="Average Win"
              value={formatCurrency(data.averageWin)}
              valueColor="text-green-500"
            />
            <StatItem
              label="Average Loss"
              value={formatCurrency(-data.averageLoss)}
              valueColor="text-red-500"
            />
            <StatItem
              label="Win/Loss Ratio"
              value={winLossRatio.toFixed(2)}
            />
            <StatItem
              label="Largest Win"
              value={formatCurrency(data.largestWin)}
              valueColor="text-green-500"
            />
            <StatItem
              label="Largest Loss"
              value={formatCurrency(data.largestLoss)}
              valueColor="text-red-500"
            />
          </div>
        </div>

        <Separator />

        {/* Performance Ratios */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Award className="h-4 w-4" />
            Performance Ratios
          </h4>
          <div className="space-y-1 rounded-lg bg-muted/50 p-3">
            <StatItem
              label="Profit Factor"
              value={data.profitFactor > 0 ? data.profitFactor.toFixed(2) : "—"}
              valueColor={data.profitFactor >= 1 ? "text-green-500" : "text-red-500"}
            />
            <StatItem
              label="Expectancy"
              value={formatCurrency(data.expectancy)}
              subValue="per trade"
              valueColor={data.expectancy >= 0 ? "text-green-500" : "text-red-500"}
            />
            <StatItem
              label="Average R-Multiple"
              value={data.averageR !== 0 ? `${data.averageR >= 0 ? "+" : ""}${data.averageR.toFixed(2)}R` : "—"}
              valueColor={data.averageR >= 0 ? "text-green-500" : "text-red-500"}
            />
          </div>
        </div>

        <Separator />

        {/* Risk Metrics */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Metrics
          </h4>
          <div className="space-y-1 rounded-lg bg-muted/50 p-3">
            <StatItem
              label="Max Drawdown"
              value={data.maxDrawdown > 0 ? formatPercentage(data.maxDrawdown) : "—"}
              valueColor="text-red-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Clock, Target, Calendar } from "lucide-react";
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogDescription,
  CustomDialogContent,
  Badge,
  cn,
} from "@/components/ui";
import { formatCurrency, formatTime } from "@/lib/calculations/formatters";

interface Trade {
  id: string;
  instrument: string;
  direction: "long" | "short";
  entryTime: Date;
  exitTime: Date;
  pnl: number;
  rMultiple: number;
  setup?: string;
}

interface DaySummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  trades?: Trade[];
  dailyPnL?: number;
  dailyGoal?: number;
}

export function DaySummary({
  open,
  onOpenChange,
  date,
  trades = [],
  dailyPnL,
  dailyGoal = 500,
}: DaySummaryProps) {
  const totalPnL =
    dailyPnL ?? trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);
  const winRate =
    trades.length > 0
      ? (winningTrades.length / trades.length) * 100
      : 0;

  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;

  const avgLoss =
    losingTrades.length > 0
      ? Math.abs(
          losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
        )
      : 0;

  const goalProgress = dailyGoal > 0 ? (totalPnL / dailyGoal) * 100 : 0;

  if (!date) return null;

  // Empty state - no trades for this day
  if (trades.length === 0) {
    return (
      <CustomDialog open={open} onOpenChange={onOpenChange}>
        <CustomDialogHeader>
          <CustomDialogTitle>
            <span className="hidden sm:inline">{format(date, "EEEE, MMMM d, yyyy")}</span>
            <span className="sm:hidden">{format(date, "EEE, MMM d, yyyy")}</span>
          </CustomDialogTitle>
          <CustomDialogDescription>No trades on this day</CustomDialogDescription>
        </CustomDialogHeader>
        <CustomDialogContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No trades were recorded on this day.
            </p>
          </div>
        </CustomDialogContent>
      </CustomDialog>
    );
  }

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader>
        <CustomDialogTitle>
          <span className="hidden sm:inline">{format(date, "EEEE, MMMM d, yyyy")}</span>
          <span className="sm:hidden">{format(date, "EEE, MMM d, yyyy")}</span>
        </CustomDialogTitle>
        <CustomDialogDescription>Daily trading summary and trades</CustomDialogDescription>
      </CustomDialogHeader>

      <CustomDialogContent className="space-y-3 sm:space-y-4">
        {/* Daily Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Daily P&L</p>
            <p
              className={cn(
                "text-base sm:text-lg font-bold",
                totalPnL >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {totalPnL >= 0 ? "+" : ""}
              {formatCurrency(totalPnL)}
            </p>
          </div>
          <div className="rounded-lg border p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Trades</p>
            <p className="text-base sm:text-lg font-bold">{trades.length}</p>
          </div>
          <div className="rounded-lg border p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p>
            <p className="text-base sm:text-lg font-bold">{winRate.toFixed(0)}%</p>
          </div>
          <div className="rounded-lg border p-2 sm:p-3">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Goal Progress</p>
            <p
              className={cn(
                "text-base sm:text-lg font-bold",
                goalProgress >= 100
                  ? "text-green-500"
                  : goalProgress >= 50
                  ? "text-yellow-500"
                  : "text-muted-foreground"
              )}
            >
              {goalProgress.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Win/Loss Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium text-green-600">
                {winningTrades.length} Win{winningTrades.length !== 1 && "s"}
              </p>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Avg: {formatCurrency(avgWin)}
            </p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium text-red-600">
                {losingTrades.length} Loss{losingTrades.length !== 1 && "es"}
              </p>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Avg: {formatCurrency(avgLoss)}
            </p>
          </div>
        </div>

        {/* Trades List */}
        <div className="space-y-2">
          <h3 className="text-sm sm:text-base font-medium">Trades</h3>
          <div className="max-h-[200px] sm:max-h-[250px] space-y-2 overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-lg border p-2 sm:p-3 gap-2"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full flex-shrink-0",
                      trade.direction === "long"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {trade.direction === "long" ? (
                      <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-medium truncate">{trade.instrument}</p>
                      <Badge
                        variant={
                          trade.direction === "long" ? "default" : "secondary"
                        }
                        className="text-[10px] sm:text-xs px-1.5 sm:px-2"
                      >
                        {trade.direction.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                      <span className="truncate">
                        {formatTime(trade.entryTime, false)} - {formatTime(trade.exitTime, false)}
                      </span>
                      {trade.setup && (
                        <span className="hidden sm:flex items-center gap-1">
                          <span>|</span>
                          <Target className="h-3 w-3" />
                          {trade.setup}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={cn(
                      "text-sm sm:text-base font-medium",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {trade.pnl >= 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </p>
                  {trade.rMultiple !== 0 && (
                    <p
                      className={cn(
                        "text-[10px] sm:text-xs",
                        trade.rMultiple >= 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {trade.rMultiple >= 0 ? "+" : ""}
                      {trade.rMultiple.toFixed(2)}R
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CustomDialogContent>
    </CustomDialog>
  );
}

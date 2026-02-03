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
          <CustomDialogTitle>{format(date, "EEEE, MMMM d, yyyy")}</CustomDialogTitle>
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
        <CustomDialogTitle>{format(date, "EEEE, MMMM d, yyyy")}</CustomDialogTitle>
        <CustomDialogDescription>Daily trading summary and trades</CustomDialogDescription>
      </CustomDialogHeader>

      <CustomDialogContent className="space-y-4">
        {/* Daily Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Daily P&L</p>
            <p
              className={cn(
                "text-lg font-bold",
                totalPnL >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {totalPnL >= 0 ? "+" : ""}
              {formatCurrency(totalPnL)}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="text-lg font-bold">{trades.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold">{winRate.toFixed(0)}%</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Goal Progress</p>
            <p
              className={cn(
                "text-lg font-bold",
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
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-sm font-medium text-green-600">
                {winningTrades.length} Winning Trade{winningTrades.length !== 1 && "s"}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Avg Win: {formatCurrency(avgWin)}
            </p>
          </div>
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-red-600">
                {losingTrades.length} Losing Trade{losingTrades.length !== 1 && "s"}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Avg Loss: {formatCurrency(avgLoss)}
            </p>
          </div>
        </div>

        {/* Trades List */}
        <div className="space-y-2">
          <h3 className="font-medium">Trades</h3>
          <div className="max-h-[250px] space-y-2 overflow-y-auto">
            {trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      trade.direction === "long"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {trade.direction === "long" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{trade.instrument}</p>
                      <Badge
                        variant={
                          trade.direction === "long" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {trade.direction.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTime(trade.entryTime, false)} -{" "}
                      {formatTime(trade.exitTime, false)}
                      {trade.setup && (
                        <>
                          <span className="mx-1">|</span>
                          <Target className="h-3 w-3" />
                          {trade.setup}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-medium",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {trade.pnl >= 0 ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </p>
                  {trade.rMultiple !== 0 && (
                    <p
                      className={cn(
                        "text-xs",
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

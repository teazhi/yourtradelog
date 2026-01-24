"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
  cn,
} from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";

interface DailyLimitTrackerProps {
  dailyLimit?: number;
  currentPnL?: number;
  tradesToday?: number;
  maxTrades?: number;
}

export function DailyLimitTracker({
  dailyLimit = 500,
  currentPnL = -125,
  tradesToday = 3,
  maxTrades = 6,
}: DailyLimitTrackerProps) {
  // Calculate loss limit progress
  const lossAmount = Math.min(0, currentPnL);
  const lossProgress = dailyLimit > 0 ? (Math.abs(lossAmount) / dailyLimit) * 100 : 0;
  const remainingRisk = dailyLimit - Math.abs(lossAmount);

  // Determine status
  const getStatus = () => {
    if (lossProgress >= 100) return "exceeded";
    if (lossProgress >= 75) return "danger";
    if (lossProgress >= 50) return "warning";
    return "safe";
  };

  const status = getStatus();

  const statusConfig = {
    safe: {
      color: "text-green-500",
      bgColor: "bg-green-500",
      icon: CheckCircle,
      message: "Trading within limits",
    },
    warning: {
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
      icon: AlertTriangle,
      message: "Approaching daily limit - trade carefully",
    },
    danger: {
      color: "text-orange-500",
      bgColor: "bg-orange-500",
      icon: AlertTriangle,
      message: "Near daily limit - consider stopping",
    },
    exceeded: {
      color: "text-red-500",
      bgColor: "bg-red-500",
      icon: XCircle,
      message: "Daily loss limit exceeded - stop trading",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Trade count progress
  const tradeProgress = maxTrades > 0 ? (tradesToday / maxTrades) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Loss Limit</CardTitle>
        <CardDescription>Track your daily risk exposure</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Banner */}
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border p-4",
            status === "safe" && "border-green-500/30 bg-green-500/10",
            status === "warning" && "border-yellow-500/30 bg-yellow-500/10",
            status === "danger" && "border-orange-500/30 bg-orange-500/10",
            status === "exceeded" && "border-red-500/30 bg-red-500/10"
          )}
        >
          <StatusIcon className={cn("h-5 w-5", config.color)} />
          <span className={cn("text-sm font-medium", config.color)}>
            {config.message}
          </span>
        </div>

        {/* Loss Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Loss Limit Progress</span>
            <span className="font-medium">
              {formatCurrency(Math.abs(lossAmount))} / {formatCurrency(dailyLimit)}
            </span>
          </div>
          <Progress
            value={Math.min(lossProgress, 100)}
            className={cn(
              "h-3",
              status === "safe" && "[&>div]:bg-green-500",
              status === "warning" && "[&>div]:bg-yellow-500",
              status === "danger" && "[&>div]:bg-orange-500",
              status === "exceeded" && "[&>div]:bg-red-500"
            )}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Daily P&L</p>
            <p
              className={cn(
                "text-lg font-bold",
                currentPnL >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {currentPnL >= 0 ? "+" : ""}
              {formatCurrency(currentPnL)}
            </p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Remaining Risk</p>
            <p
              className={cn(
                "text-lg font-bold",
                remainingRisk > 0 ? "text-foreground" : "text-red-500"
              )}
            >
              {formatCurrency(Math.max(0, remainingRisk))}
            </p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground">Trades Today</p>
            <p className="text-lg font-bold">
              {tradesToday}/{maxTrades}
            </p>
          </div>
        </div>

        {/* Trade Count Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trade Count</span>
            <span className="text-xs text-muted-foreground">
              {maxTrades - tradesToday} trades remaining
            </span>
          </div>
          <Progress
            value={tradeProgress}
            className="h-2"
          />
        </div>

        {/* Quick Reference */}
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Risk per remaining trade
          </p>
          <p className="text-lg font-bold">
            {maxTrades - tradesToday > 0
              ? formatCurrency(remainingRisk / (maxTrades - tradesToday))
              : formatCurrency(0)}
          </p>
          <p className="text-xs text-muted-foreground">
            Recommended max risk per trade to stay within limits
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { Button, cn } from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";

export interface DayTradeData {
  date: Date;
  pnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
}

interface TradingCalendarProps {
  tradeData?: DayTradeData[];
  onDayClick?: (date: Date, data?: DayTradeData) => void;
  selectedDate?: Date | null;
}

export function TradingCalendar({
  tradeData = [],
  onDayClick,
  selectedDate,
}: TradingCalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getDayData = (date: Date): DayTradeData | undefined => {
    return tradeData.find((d) => isSameDay(d.date, date));
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  // Calculate monthly stats
  const monthlyData = tradeData.filter((d) =>
    isSameMonth(d.date, currentMonth)
  );
  const monthlyPnL = monthlyData.reduce((sum, d) => sum + d.pnl, 0);
  const totalTrades = monthlyData.reduce((sum, d) => sum + d.tradeCount, 0);
  const totalWins = monthlyData.reduce((sum, d) => sum + d.winCount, 0);
  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const tradingDays = monthlyData.length;
  const profitableDays = monthlyData.filter((d) => d.pnl > 0).length;

  // Full names for desktop, single letters for mobile
  const weekDaysFull = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDaysShort = ["S", "M", "T", "W", "T", "F", "S"];

  // Empty state - no trades at all
  if (tradeData.length === 0) {
    return (
      <div className="space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-8 w-8 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg sm:text-xl font-semibold min-w-[140px] sm:min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs"
          >
            Today
          </Button>
        </div>

        {/* Monthly Stats Summary - Empty */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly P&L</p>
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground mt-1">—</p>
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Trades</p>
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground mt-1">0</p>
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Win Rate</p>
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground mt-1">—</p>
          </div>
          <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Profitable Days</p>
            <p className="text-lg sm:text-2xl font-bold text-muted-foreground mt-1">0/0</p>
          </div>
        </div>

        {/* Empty Calendar Grid */}
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 bg-muted/30">
            {weekDaysFull.map((day, index) => (
              <div
                key={day}
                className="py-2 sm:py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{weekDaysShort[index]}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);
              const isLastRow = index >= calendarDays.length - 7;
              const isLastCol = (index + 1) % 7 === 0;

              return (
                <div
                  key={index}
                  className={cn(
                    "relative min-h-[60px] sm:min-h-[90px] p-1.5 sm:p-2 transition-colors",
                    !isLastRow && "border-b border-border/30",
                    !isLastCol && "border-r border-border/30",
                    !isCurrentMonth && "bg-muted/20"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-medium",
                      !isCurrentMonth && "text-muted-foreground/50",
                      isTodayDate && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state message */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            No trade data yet. Import or add trades to see your calendar view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreviousMonth}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentMonth(new Date())}
          className="text-xs"
        >
          Today
        </Button>
      </div>

      {/* Monthly Stats Summary */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
        <div className={cn(
          "rounded-xl border p-3 sm:p-4 transition-colors",
          monthlyPnL >= 0
            ? "bg-green-500/5 border-green-500/20"
            : "bg-red-500/5 border-red-500/20"
        )}>
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly P&L</p>
            {monthlyPnL !== 0 && (
              monthlyPnL > 0
                ? <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                : <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
            )}
          </div>
          <p
            className={cn(
              "text-lg sm:text-2xl font-bold mt-1",
              monthlyPnL >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {monthlyPnL >= 0 ? "+" : ""}
            {formatCurrency(monthlyPnL)}
          </p>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Trades</p>
          <p className="text-lg sm:text-2xl font-bold mt-1">{totalTrades}</p>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Win Rate</p>
          <p className={cn(
            "text-lg sm:text-2xl font-bold mt-1",
            winRate >= 50 ? "text-green-500" : winRate > 0 ? "text-amber-500" : ""
          )}>
            {winRate.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl bg-card border border-border/50 p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Profitable Days</p>
          <p className="text-lg sm:text-2xl font-bold mt-1">
            <span className={profitableDays > 0 ? "text-green-500" : ""}>{profitableDays}</span>
            <span className="text-muted-foreground font-normal text-sm sm:text-lg">/{tradingDays}</span>
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-xl border border-border/50 overflow-hidden bg-card">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 bg-muted/30">
          {weekDaysFull.map((day, index) => (
            <div
              key={day}
              className="py-2 sm:py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{weekDaysShort[index]}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayData = getDayData(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const isLastRow = index >= calendarDays.length - 7;
            const isLastCol = (index + 1) % 7 === 0;

            // Determine background color based on P&L
            let bgClass = "";
            if (dayData && isCurrentMonth) {
              if (dayData.pnl > 0) {
                bgClass = "bg-green-500/10 hover:bg-green-500/20";
              } else if (dayData.pnl < 0) {
                bgClass = "bg-red-500/10 hover:bg-red-500/20";
              } else {
                bgClass = "bg-muted/30 hover:bg-muted/50";
              }
            }

            // Format currency compactly for mobile
            const formatCompactCurrency = (value: number) => {
              const absValue = Math.abs(value);
              if (absValue >= 1000) {
                return `${value >= 0 ? '+' : '-'}$${(absValue / 1000).toFixed(1)}k`;
              }
              return `${value >= 0 ? '+' : '-'}$${absValue.toFixed(0)}`;
            };

            return (
              <button
                key={index}
                onClick={() => onDayClick?.(day, dayData)}
                disabled={!isCurrentMonth}
                className={cn(
                  "relative min-h-[60px] sm:min-h-[90px] p-1 sm:p-2 text-left transition-all duration-150 overflow-hidden",
                  !isLastRow && "border-b border-border/30",
                  !isLastCol && "border-r border-border/30",
                  !isCurrentMonth && "bg-muted/20 cursor-default",
                  isCurrentMonth && !dayData && "hover:bg-muted/30",
                  isSelected && "ring-2 ring-primary ring-inset",
                  bgClass
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full text-[10px] sm:text-sm font-medium transition-colors",
                    !isCurrentMonth && "text-muted-foreground/50",
                    isTodayDate && "bg-primary text-primary-foreground",
                    isCurrentMonth && !isTodayDate && "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {dayData && isCurrentMonth && (
                  <div className="mt-0.5 sm:mt-1.5 space-y-0 overflow-hidden">
                    <p
                      className={cn(
                        "text-[10px] sm:text-sm font-semibold tabular-nums leading-tight truncate",
                        dayData.pnl > 0 ? "text-green-500" : dayData.pnl < 0 ? "text-red-500" : "text-muted-foreground"
                      )}
                    >
                      <span className="sm:hidden">{formatCompactCurrency(dayData.pnl)}</span>
                      <span className="hidden sm:inline">{dayData.pnl >= 0 ? "+" : ""}{formatCurrency(dayData.pnl)}</span>
                    </p>
                    <p className="text-[9px] sm:text-xs text-muted-foreground leading-tight truncate">
                      <span className="sm:hidden">{dayData.tradeCount}t</span>
                      <span className="hidden sm:inline">{dayData.tradeCount} {dayData.tradeCount === 1 ? "trade" : "trades"}</span>
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-green-500/30" />
          <span>Profit</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-red-500/30" />
          <span>Loss</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm bg-muted" />
          <span>Break Even</span>
        </div>
      </div>
    </div>
  );
}

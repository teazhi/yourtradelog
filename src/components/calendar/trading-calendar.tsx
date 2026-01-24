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
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
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

  const getDayColorClass = (data?: DayTradeData): string => {
    if (!data) return "";
    if (data.pnl > 0) return "bg-green-500/20 hover:bg-green-500/30";
    if (data.pnl < 0) return "bg-red-500/20 hover:bg-red-500/30";
    return "bg-gray-500/20 hover:bg-gray-500/30";
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

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Empty state - no trades at all
  if (tradeData.length === 0) {
    return (
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Monthly Stats Summary - Empty */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Monthly P&L</p>
            <p className="text-lg font-bold text-muted-foreground">—</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Total Trades</p>
            <p className="text-lg font-bold text-muted-foreground">0</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-lg font-bold text-muted-foreground">—</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">Profitable Days</p>
            <p className="text-lg font-bold text-muted-foreground">0/0</p>
          </div>
        </div>

        {/* Empty Calendar Grid */}
        <div className="rounded-lg border">
          {/* Week Day Headers */}
          <div className="grid grid-cols-7 border-b">
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={index}
                  className={cn(
                    "relative min-h-[80px] border-b border-r p-2 text-left",
                    !isCurrentMonth && "bg-muted/30 text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
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
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No trade data yet. Import or add trades to see your calendar view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monthly Stats Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Monthly P&L</p>
          <p
            className={cn(
              "text-lg font-bold",
              monthlyPnL >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {monthlyPnL >= 0 ? "+" : ""}
            {formatCurrency(monthlyPnL)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Total Trades</p>
          <p className="text-lg font-bold">{totalTrades}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-lg font-bold">{winRate.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-sm text-muted-foreground">Profitable Days</p>
          <p className="text-lg font-bold">
            {profitableDays}/{tradingDays}
          </p>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-lg border">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-medium text-muted-foreground"
            >
              {day}
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

            return (
              <button
                key={index}
                onClick={() => onDayClick?.(day, dayData)}
                disabled={!isCurrentMonth}
                className={cn(
                  "relative min-h-[80px] border-b border-r p-2 text-left transition-colors",
                  !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                  isCurrentMonth && "hover:bg-accent",
                  isSelected && "ring-2 ring-primary ring-inset",
                  getDayColorClass(dayData)
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                    isTodayDate && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {dayData && isCurrentMonth && (
                  <div className="mt-1 space-y-0.5">
                    <p
                      className={cn(
                        "text-xs font-medium",
                        dayData.pnl >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {dayData.pnl >= 0 ? "+" : ""}
                      {formatCurrency(dayData.pnl)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayData.tradeCount} trade{dayData.tradeCount !== 1 && "s"}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-green-500/30" />
          <span>Profitable Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-red-500/30" />
          <span>Loss Day</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-gray-500/30" />
          <span>Break Even</span>
        </div>
      </div>
    </div>
  );
}

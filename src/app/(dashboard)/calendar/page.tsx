"use client";

import * as React from "react";
import { TradingCalendar, DayTradeData } from "@/components/calendar/trading-calendar";
import { DaySummary } from "@/components/calendar/day-summary";
import { Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch trades from Supabase
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

  // Helper to extract date parts from ISO string without timezone conversion
  const extractLocalDate = (isoString: string): { year: number; month: number; day: number } => {
    // Parse the date part directly from the ISO string to avoid timezone issues
    // ISO strings are like "2025-01-23T15:30:00.000Z" - we want "2025-01-23"
    const datePart = isoString.split("T")[0];
    const [year, month, day] = datePart.split("-").map(Number);
    return { year, month: month - 1, day }; // month is 0-indexed for Date constructor
  };

  // Transform trades into calendar day data
  const tradeData: DayTradeData[] = React.useMemo(() => {
    const dayMap: Record<string, DayTradeData> = {};

    trades.filter(t => t.status === "closed").forEach((trade) => {
      const dateStr = trade.exit_date || trade.entry_date;
      const { year, month, day } = extractLocalDate(dateStr);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!dayMap[dateKey]) {
        dayMap[dateKey] = {
          // Create date at noon local time to avoid timezone edge cases
          date: new Date(year, month, day, 12, 0, 0),
          pnl: 0,
          tradeCount: 0,
          winCount: 0,
          lossCount: 0,
        };
      }

      dayMap[dateKey].pnl += trade.net_pnl || 0;
      dayMap[dateKey].tradeCount += 1;
      if ((trade.net_pnl || 0) > 0) {
        dayMap[dateKey].winCount += 1;
      } else if ((trade.net_pnl || 0) < 0) {
        dayMap[dateKey].lossCount += 1;
      }
    });

    return Object.values(dayMap);
  }, [trades]);

  // Get trades for selected day
  const selectedDayTrades = React.useMemo(() => {
    if (!selectedDate) return [];
    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();

    return trades
      .filter((trade) => {
        const dateStr = trade.exit_date || trade.entry_date;
        const { year, month, day } = extractLocalDate(dateStr);
        return year === selectedYear && month === selectedMonth && day === selectedDay;
      })
      .map((trade) => ({
        id: trade.id,
        instrument: trade.symbol,
        direction: trade.side as "long" | "short",
        entryTime: new Date(trade.entry_date),
        exitTime: new Date(trade.exit_date || trade.entry_date),
        pnl: trade.net_pnl || 0,
        rMultiple: trade.r_multiple || 0,
        setup: trade.setup_id || undefined,
      }));
  }, [trades, selectedDate]);

  const handleDayClick = (date: Date, data?: DayTradeData) => {
    setSelectedDate(date);
    if (data) {
      setDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Trading Calendar</h1>
        <p className="text-muted-foreground">
          View your trading performance by day. Click on a trading day to see details.
        </p>
      </div>

      {/* Trading Calendar */}
      <TradingCalendar
        tradeData={tradeData}
        onDayClick={handleDayClick}
        selectedDate={selectedDate}
      />

      {/* Day Summary Dialog */}
      <DaySummary
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        trades={selectedDayTrades}
      />
    </div>
  );
}

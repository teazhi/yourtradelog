"use client";

import * as React from "react";
import { Quote, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/components/ui";
import { getDailyQuote, getRandomQuote, TRADING_QUOTES } from "@/lib/constants/motivational-quotes";

interface DailyQuoteProps {
  className?: string;
  showOnlyOnTradingDays?: boolean;
}

export function DailyQuote({ className, showOnlyOnTradingDays = true }: DailyQuoteProps) {
  const [quote, setQuote] = React.useState<typeof TRADING_QUOTES[number] | null>(null);
  const [isTradingDay, setIsTradingDay] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  React.useEffect(() => {
    // Check if today is a trading day (Mon-Fri by default, or custom from localStorage)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Get trading days from localStorage (if set by discipline page)
    let tradingDays: number[] = [1, 2, 3, 4, 5]; // Default: Monday-Friday
    try {
      const savedTradingDays = localStorage.getItem("discipline_trading_days");
      if (savedTradingDays) {
        tradingDays = JSON.parse(savedTradingDays);
      }
    } catch (e) {
      console.error("Error loading trading days:", e);
    }

    const isTrading = tradingDays.includes(dayOfWeek);
    setIsTradingDay(isTrading);

    // Get the daily quote (consistent throughout the day)
    if (isTrading || !showOnlyOnTradingDays) {
      setQuote(getDailyQuote(today));
    }
  }, [showOnlyOnTradingDays]);

  // Refresh to get a random quote
  const handleRefresh = () => {
    setIsRefreshing(true);
    const newQuote = getRandomQuote();
    setQuote(newQuote);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Don't show on non-trading days (if configured)
  if (showOnlyOnTradingDays && !isTradingDay) {
    return null;
  }

  if (!quote) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4",
        className
      )}
    >
      {/* Decorative elements */}
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-primary/5 blur-xl" />

      <div className="relative flex items-start gap-3">
        {/* Quote icon */}
        <div className="flex-shrink-0 rounded-full bg-primary/10 p-2">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>

        {/* Quote content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-relaxed text-foreground/90 italic">
            "{quote.quote}"
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            — {quote.author}
          </p>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          title="Get another quote"
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              isRefreshing && "animate-spin"
            )}
          />
        </button>
      </div>
    </div>
  );
}

// Compact version for sidebar or smaller areas
export function DailyQuoteCompact({ className }: { className?: string }) {
  const [quote, setQuote] = React.useState<typeof TRADING_QUOTES[number] | null>(null);
  const [isTradingDay, setIsTradingDay] = React.useState(false);

  React.useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    let tradingDays: number[] = [1, 2, 3, 4, 5];
    try {
      const savedTradingDays = localStorage.getItem("discipline_trading_days");
      if (savedTradingDays) {
        tradingDays = JSON.parse(savedTradingDays);
      }
    } catch (e) {
      console.error("Error loading trading days:", e);
    }

    const isTrading = tradingDays.includes(dayOfWeek);
    setIsTradingDay(isTrading);

    if (isTrading) {
      setQuote(getDailyQuote(today));
    }
  }, []);

  if (!isTradingDay || !quote) {
    return null;
  }

  return (
    <div className={cn("text-center px-4 py-3", className)}>
      <Quote className="h-4 w-4 text-primary/50 mx-auto mb-2" />
      <p className="text-xs text-muted-foreground italic leading-relaxed">
        "{quote.quote.length > 100 ? quote.quote.substring(0, 100) + '...' : quote.quote}"
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        — {quote.author}
      </p>
    </div>
  );
}

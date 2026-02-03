"use client";

import * as React from "react";
import { Quote, RefreshCw, Sparkles, X } from "lucide-react";
import { cn, Popover, PopoverContent, PopoverTrigger, toast } from "@/components/ui";
import { getDailyQuote, getRandomQuote, TRADING_QUOTES } from "@/lib/constants/motivational-quotes";
import { createClient } from "@/lib/supabase/client";
import { getLevelFromXP, checkLevelUp } from "@/lib/leveling";

const QUOTE_XP_REWARD = 5; // XP for reading the daily quote

interface DailyQuoteProps {
  className?: string;
  showOnlyOnTradingDays?: boolean;
}

export function DailyQuote({ className, showOnlyOnTradingDays = true }: DailyQuoteProps) {
  const [quote, setQuote] = React.useState<typeof TRADING_QUOTES[number] | null>(null);
  const [isTradingDay, setIsTradingDay] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [xpClaimed, setXpClaimed] = React.useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    // Check if today is a trading day (Mon-Fri by default, or custom from localStorage)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const todayKey = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if quote was dismissed today
    try {
      const dismissedDate = localStorage.getItem("daily_quote_dismissed");
      if (dismissedDate === todayKey) {
        setIsDismissed(true);
      }
    } catch (e) {
      console.error("Error checking dismissed state:", e);
    }

    // Check if XP was already claimed today
    try {
      const xpClaimedDate = localStorage.getItem("daily_quote_xp_claimed");
      if (xpClaimedDate === todayKey) {
        setXpClaimed(true);
      }
    } catch (e) {
      console.error("Error checking XP claimed state:", e);
    }

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

  // Dismiss the quote for today
  const handleDismiss = () => {
    const todayKey = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem("daily_quote_dismissed", todayKey);
    } catch (e) {
      console.error("Error saving dismissed state:", e);
    }
    setIsDismissed(true);
  };

  // Bring back the quote
  const handleShow = () => {
    try {
      localStorage.removeItem("daily_quote_dismissed");
    } catch (e) {
      console.error("Error removing dismissed state:", e);
    }
    setIsDismissed(false);
  };

  // Award XP for reading the daily quote (once per day)
  const claimQuoteXP = async () => {
    if (xpClaimed) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Get current XP
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("total_xp")
        .eq("id", user.id)
        .single();

      const currentXP = profile?.total_xp || 0;
      const newTotalXP = currentXP + QUOTE_XP_REWARD;
      const newLevel = getLevelFromXP(newTotalXP);
      const leveledUp = checkLevelUp(currentXP, newTotalXP);

      // Update profile with new XP
      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          total_xp: newTotalXP,
          current_level: newLevel.level,
          trader_title: newLevel.title,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error awarding quote XP:", error);
        return;
      }

      // Mark as claimed for today
      const todayKey = new Date().toISOString().split('T')[0];
      localStorage.setItem("daily_quote_xp_claimed", todayKey);
      setXpClaimed(true);

      // Show toast
      if (leveledUp) {
        toast.success(`+${QUOTE_XP_REWARD} XP! 🎉 Level up! You're now a ${newLevel.title}!`);
      } else {
        toast.success(`+${QUOTE_XP_REWARD} XP for daily motivation!`);
      }
    } catch (e) {
      console.error("Error claiming quote XP:", e);
    }
  };

  // Handle popover open - claim XP on first open
  const handlePopoverOpen = (open: boolean) => {
    setIsPopoverOpen(open);
    if (open && !xpClaimed) {
      claimQuoteXP();
    }
  };

  // Show a small button to bring back the quote if dismissed
  if (isDismissed) {
    return (
      <button
        onClick={handleShow}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
          className
        )}
        title="Show daily quote"
      >
        <Sparkles className="h-3 w-3" />
        <span className="hidden sm:inline">Show Quote</span>
      </button>
    );
  }

  // Don't show on non-trading days (if configured)
  if (showOnlyOnTradingDays && !isTradingDay) {
    return null;
  }

  if (!quote) {
    return null;
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={handlePopoverOpen}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-3 cursor-pointer hover:border-primary/30 transition-colors",
            className
          )}
        >
          <div className="relative flex items-center gap-2">
            {/* Quote icon */}
            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />

            {/* Quote content - single line with ellipsis on large screens */}
            <p className="flex-1 min-w-0 text-xs text-foreground/80 italic truncate">
              "{quote.quote}" <span className="text-muted-foreground not-italic">— {quote.author}</span>
            </p>

            {/* Action buttons */}
            <div className="flex-shrink-0 flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Get another quote"
              >
                <RefreshCw
                  className={cn(
                    "h-3 w-3",
                    isRefreshing && "animate-spin"
                  )}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss();
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                title="Hide for today"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-4"
        align="start"
        sideOffset={8}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Daily Quote</span>
            </div>
            {!xpClaimed && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                +{QUOTE_XP_REWARD} XP
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed italic text-foreground/90">
            "{quote.quote}"
          </p>
          <p className="text-xs text-muted-foreground text-right">
            — {quote.author}
          </p>
        </div>
      </PopoverContent>
    </Popover>
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

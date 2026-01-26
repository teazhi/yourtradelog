"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, startOfDay, addDays, subDays, startOfWeek, getDay, parseISO } from "date-fns";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Sun,
  Moon,
  Target,
  Plus,
  X,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  BarChart3,
  Clock,
  Zap,
  Brain,
  ExternalLink,
  ImageIcon,
  Trophy,
  Flame,
  BookOpen,
  Upload,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Calendar as CalendarComponent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  Badge,
  Input,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";
import { JournalScreenshots } from "@/components/journal/journal-screenshots";
import { JournalDailyScreenshots } from "@/components/journal/journal-daily-screenshots";
import { TradeTable } from "@/components/trades/trade-table";

// Common mistakes for futures day traders
const COMMON_MISTAKES = [
  "Overtrading",
  "Revenge trading",
  "Moving stop loss",
  "No stop loss",
  "FOMO entry",
  "Chasing price",
  "Trading against trend",
  "Position too large",
  "Exited too early",
  "Held too long",
  "Ignored key level",
  "Traded during news",
  "Broke daily loss limit",
  "Traded without plan",
  "Emotional decision",
];

// What went well options
const WHAT_WENT_WELL = [
  "Followed trading plan",
  "Proper position sizing",
  "Honored stop loss",
  "Took profits at target",
  "Waited for setup",
  "Managed risk well",
  "Stayed patient",
  "Cut losses quickly",
  "Read market correctly",
  "Good entry timing",
  "Stayed disciplined",
  "Avoided overtrading",
];

// Star Rating component
function StarRating({
  value,
  onChange,
  disabled = false,
  label,
  icon: Icon,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  label: string;
  icon?: React.ElementType;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={cn(
              "p-0.5 transition-colors",
              disabled && "cursor-not-allowed opacity-50"
            )}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(value === star ? null : star)}
          >
            <Star
              className={cn(
                "h-5 w-5 transition-colors",
                (hovered !== null ? star <= hovered : star <= (value || 0))
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              )}
            />
          </button>
        ))}
        {value && (
          <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
        )}
      </div>
    </div>
  );
}

// Tag selector component
function TagSelector({
  label,
  options,
  selected,
  onChange,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  icon?: React.ElementType;
  variant?: "default" | "success" | "destructive";
}) {
  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const variantClasses = {
    default: "bg-primary/10 text-primary border-primary/30",
    success: "bg-green-500/10 text-green-600 border-green-500/30",
    destructive: "bg-red-500/10 text-red-600 border-red-500/30",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium">{label}</span>
        {selected.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {selected.length} selected
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggleTag(option)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full border transition-all",
              selected.includes(option)
                ? variantClasses[variant]
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

// Journal data interface
interface JournalData {
  id?: string;
  user_id: string;
  date: string;
  // Pre-market
  pre_market_notes: string | null;
  market_bias: string | null;
  key_levels: string | null;
  daily_goals: string[];
  max_loss_limit: number | null;
  max_trades_limit: number | null;
  // Post-market
  post_market_notes: string | null;
  what_went_well: string[];
  mistakes_made: string[];
  lessons_learned: string | null;
  // Ratings
  mood_rating: number | null;
  focus_rating: number | null;
  discipline_rating: number | null;
  execution_rating: number | null;
  // Meta
  created_at?: string;
  updated_at?: string;
}

function JournalPageContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  // Initialize with today's date
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => startOfDay(new Date()));

  // Update selectedDate when URL param changes
  React.useEffect(() => {
    if (dateParam) {
      try {
        const parsedDate = startOfDay(parseISO(dateParam));
        setSelectedDate(parsedDate);
      } catch {
        // Invalid date, keep current
      }
    } else {
      // No date param, use today
      setSelectedDate(startOfDay(new Date()));
    }
  }, [dateParam]);
  const [journal, setJournal] = React.useState<JournalData | null>(null);
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("pre-market");

  // Form state
  const [preMarketNotes, setPreMarketNotes] = React.useState("");
  const [marketBias, setMarketBias] = React.useState<string | null>(null);
  const [keyLevels, setKeyLevels] = React.useState("");
  const [dailyGoals, setDailyGoals] = React.useState<string[]>([]);
  const [newGoal, setNewGoal] = React.useState("");
  const [maxLossLimit, setMaxLossLimit] = React.useState<string>("");
  const [maxTradesLimit, setMaxTradesLimit] = React.useState<string>("");

  const [postMarketNotes, setPostMarketNotes] = React.useState("");
  const [whatWentWell, setWhatWentWell] = React.useState<string[]>([]);
  const [mistakesMade, setMistakesMade] = React.useState<string[]>([]);
  const [lessonsLearned, setLessonsLearned] = React.useState("");

  const [moodRating, setMoodRating] = React.useState<number | null>(null);
  const [focusRating, setFocusRating] = React.useState<number | null>(null);
  const [disciplineRating, setDisciplineRating] = React.useState<number | null>(null);
  const [executionRating, setExecutionRating] = React.useState<number | null>(null);

  // Weekly review state (for Saturdays)
  const [weeklyTrades, setWeeklyTrades] = React.useState<Trade[]>([]);
  const [weeklyReviewNotes, setWeeklyReviewNotes] = React.useState("");
  const [weeklyWins, setWeeklyWins] = React.useState("");
  const [weeklyImprovements, setWeeklyImprovements] = React.useState("");
  const [nextWeekGoals, setNextWeekGoals] = React.useState<string[]>([]);
  const [newWeeklyGoal, setNewWeeklyGoal] = React.useState("");
  const [weeklyRating, setWeeklyRating] = React.useState<number | null>(null);

  // Format date for database query (YYYY-MM-DD)
  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Check if selected date is Saturday or Sunday (review days)
  // Use selectedDate directly since it's already a proper Date object
  const dayOfWeek = getDay(selectedDate);
  const isWeekendReview = dayOfWeek === 6 || dayOfWeek === 0; // Saturday = 6, Sunday = 0

  // Fetch journal and trades for selected date
  React.useEffect(() => {
    async function fetchData() {
      // Capture current values at start of effect to avoid stale closures
      const currentDateKey = format(selectedDate, "yyyy-MM-dd");

      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setJournal(null);
          setTrades([]);
          setWeeklyTrades([]);
          setIsLoading(false);
          return;
        }

        // Fetch journal entry for this date
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: journalData, error: journalError } = await (supabase
          .from("daily_journals") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("date", currentDateKey)
          .single();

        if (journalError && journalError.code !== "PGRST116") {
          console.error("Error fetching journal:", journalError);
        }

        // Fetch trades for this date
        const startOfDayStr = `${currentDateKey}T00:00:00.000Z`;
        const endOfDayStr = `${currentDateKey}T23:59:59.999Z`;

        const { data: tradesData, error: tradesError } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .gte("entry_date", startOfDayStr)
          .lte("entry_date", endOfDayStr)
          .order("entry_date", { ascending: true });

        if (tradesError) {
          console.error("Error fetching trades:", tradesError);
        }

        // If it's Saturday or Sunday, also fetch the whole week's trades (Mon-Fri)
        const currentDayOfWeek = getDay(selectedDate);
        const isWeekend = currentDayOfWeek === 6 || currentDayOfWeek === 0;
        if (isWeekend) {
          // Get the Monday of THIS week (weekend's week, so Mon-Fri just ended)
          // Use selectedDate directly - it's already a proper local Date object
          const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

          // Use date range that includes Mon-Fri (up to but not including Saturday)
          const weekStartStr = format(weekStart, "yyyy-MM-dd");
          // For both Saturday and Sunday, we want Mon-Fri trades, so end at Saturday
          const weekEnd = currentDayOfWeek === 0
            ? selectedDate // Sunday - selectedDate IS Sunday, so < Sunday excludes Sat
            : addDays(selectedDate, 1); // Saturday - add 1 to get Sunday
          const weekEndStr = format(weekEnd, "yyyy-MM-dd");

          const { data: weeklyTradesData, error: weeklyError } = await supabase
            .from("trades")
            .select("*")
            .eq("user_id", user.id)
            .gte("entry_date", weekStartStr)
            .lt("entry_date", weekEndStr)
            .order("entry_date", { ascending: true });

          setWeeklyTrades(weeklyTradesData || []);
        } else {
          setWeeklyTrades([]);
        }

        // Set journal data
        if (journalData) {
          setJournal(journalData as JournalData);
          setPreMarketNotes(journalData.pre_market_notes || "");
          setMarketBias((journalData as JournalData).market_bias || null);
          setKeyLevels((journalData as JournalData).key_levels || "");
          setDailyGoals(journalData.goals || []);
          setMaxLossLimit((journalData as JournalData).max_loss_limit?.toString() || "");
          setMaxTradesLimit((journalData as JournalData).max_trades_limit?.toString() || "");
          setPostMarketNotes(journalData.post_market_notes || "");
          setWhatWentWell((journalData as JournalData).what_went_well || []);
          setMistakesMade((journalData as JournalData).mistakes_made || []);
          setLessonsLearned((journalData as JournalData).lessons_learned || "");
          setMoodRating(journalData.mood_rating);
          setFocusRating(journalData.focus_rating);
          setDisciplineRating(journalData.discipline_rating);
          setExecutionRating((journalData as JournalData).execution_rating || null);
        } else {
          setJournal(null);
          resetForm();
        }

        setTrades(tradesData || []);

        setHasChanges(false);
      } catch (err) {
        console.error("Exception fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [selectedDate]);

  const resetForm = () => {
    setPreMarketNotes("");
    setMarketBias(null);
    setKeyLevels("");
    setDailyGoals([]);
    setMaxLossLimit("");
    setMaxTradesLimit("");
    setPostMarketNotes("");
    setWhatWentWell([]);
    setMistakesMade([]);
    setLessonsLearned("");
    setMoodRating(null);
    setFocusRating(null);
    setDisciplineRating(null);
    setExecutionRating(null);
    // Weekly review fields
    setWeeklyReviewNotes("");
    setWeeklyWins("");
    setWeeklyImprovements("");
    setNextWeekGoals([]);
    setWeeklyRating(null);
  };

  // Track changes
  React.useEffect(() => {
    if (!isLoading) {
      setHasChanges(true);
    }
  }, [
    preMarketNotes, marketBias, keyLevels, dailyGoals, maxLossLimit, maxTradesLimit,
    postMarketNotes, whatWentWell, mistakesMade, lessonsLearned,
    moodRating, focusRating, disciplineRating, executionRating,
    weeklyReviewNotes, weeklyWins, weeklyImprovements, nextWeekGoals, weeklyRating,
    isLoading
  ]);

  // Save journal entry
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast("You must be logged in to save journal entries");
        return;
      }

      // Prepare journal data with all fields
      const journalPayload = {
        user_id: user.id,
        date: dateKey,
        // Pre-market fields
        pre_market_notes: preMarketNotes || null,
        market_bias: marketBias || null,
        key_levels: keyLevels || null,
        max_loss_limit: maxLossLimit ? parseFloat(maxLossLimit) : null,
        max_trades_limit: maxTradesLimit ? parseInt(maxTradesLimit) : null,
        goals: dailyGoals,
        // Post-market fields
        post_market_notes: postMarketNotes || null,
        what_went_well: whatWentWell,
        mistakes_made: mistakesMade,
        lessons_learned: lessonsLearned || null,
        // Ratings
        mood_rating: moodRating,
        focus_rating: focusRating,
        discipline_rating: disciplineRating,
        execution_rating: executionRating,
        // Weekly review fields (for weekend entries)
        weekly_review_notes: weeklyReviewNotes || null,
        weekly_wins: weeklyWins || null,
        weekly_improvements: weeklyImprovements || null,
        next_week_goals: nextWeekGoals,
        weekly_rating: weeklyRating,
      };

      if (journal?.id) {
        // Update existing journal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase
          .from("daily_journals") as any)
          .update(journalPayload)
          .eq("id", journal.id);

        if (error) throw error;
      } else {
        // Create new journal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase
          .from("daily_journals") as any)
          .insert(journalPayload)
          .select()
          .single();

        if (error) throw error;
        setJournal(data as JournalData);
      }

      setHasChanges(false);
      toast("Journal saved successfully!");
    } catch (error) {
      console.error("Error saving journal:", error);
      toast("Failed to save journal. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add a goal
  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setDailyGoals([...dailyGoals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  // Remove a goal
  const handleRemoveGoal = (index: number) => {
    setDailyGoals(dailyGoals.filter((_, i) => i !== index));
  };

  // Add weekly goal
  const handleAddWeeklyGoal = () => {
    if (newWeeklyGoal.trim()) {
      setNextWeekGoals([...nextWeekGoals, newWeeklyGoal.trim()]);
      setNewWeeklyGoal("");
    }
  };

  // Remove weekly goal
  const handleRemoveWeeklyGoal = (index: number) => {
    setNextWeekGoals(nextWeekGoals.filter((_, i) => i !== index));
  };

  // Delete a trade
  const handleDeleteTrade = async (tradeId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeId);

      if (error) {
        console.error("Error deleting trade:", error);
        toast.error("Failed to delete trade");
      } else {
        // Remove from local state
        setTrades(prev => prev.filter(t => t.id !== tradeId));
        toast.success("Trade deleted successfully");
      }
    } catch (err) {
      console.error("Exception deleting trade:", err);
      toast.error("An error occurred while deleting");
    }
  };

  // Calculate daily stats
  const closedTrades = trades.filter((t) => t.status === "closed");
  const dailyPnL = closedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
  const winCount = closedTrades.filter((t) => (t.net_pnl || 0) > 0).length;
  const lossCount = closedTrades.filter((t) => (t.net_pnl || 0) < 0).length;
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0;
  const avgWin = winCount > 0
    ? closedTrades.filter((t) => (t.net_pnl || 0) > 0).reduce((sum, t) => sum + (t.net_pnl || 0), 0) / winCount
    : 0;
  const avgLoss = lossCount > 0
    ? Math.abs(closedTrades.filter((t) => (t.net_pnl || 0) < 0).reduce((sum, t) => sum + (t.net_pnl || 0), 0) / lossCount)
    : 0;
  const largestWin = closedTrades.length > 0 ? Math.max(...closedTrades.map(t => t.net_pnl || 0), 0) : 0;
  const largestLoss = closedTrades.length > 0 ? Math.min(...closedTrades.map(t => t.net_pnl || 0), 0) : 0;

  // Weekly stats (for Saturday review)
  // Include trades that are closed OR have a net_pnl (in case status isn't set)
  const weeklyClosedTrades = weeklyTrades.filter((t) => t.status === "closed" || t.net_pnl !== null);
  const weeklyPnL = weeklyClosedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
  const weeklyWinCount = weeklyClosedTrades.filter((t) => (t.net_pnl || 0) > 0).length;
  const weeklyLossCount = weeklyClosedTrades.filter((t) => (t.net_pnl || 0) < 0).length;
  const weeklyWinRate = weeklyClosedTrades.length > 0 ? (weeklyWinCount / weeklyClosedTrades.length) * 100 : 0;
  const weeklyLargestWin = weeklyClosedTrades.length > 0 ? Math.max(...weeklyClosedTrades.map(t => t.net_pnl || 0), 0) : 0;
  const weeklyLargestLoss = weeklyClosedTrades.length > 0 ? Math.min(...weeklyClosedTrades.map(t => t.net_pnl || 0), 0) : 0;
  const weeklyAvgWin = weeklyWinCount > 0
    ? weeklyClosedTrades.filter((t) => (t.net_pnl || 0) > 0).reduce((sum, t) => sum + (t.net_pnl || 0), 0) / weeklyWinCount
    : 0;
  const weeklyAvgLoss = weeklyLossCount > 0
    ? Math.abs(weeklyClosedTrades.filter((t) => (t.net_pnl || 0) < 0).reduce((sum, t) => sum + (t.net_pnl || 0), 0) / weeklyLossCount)
    : 0;
  const weeklyProfitFactor = weeklyAvgLoss > 0 ? (weeklyAvgWin * weeklyWinCount) / (weeklyAvgLoss * weeklyLossCount) : 0;

  // Group weekly trades by day
  const tradesByDay = weeklyTrades.reduce((acc, trade) => {
    const day = format(new Date(trade.entry_date), "EEEE");
    if (!acc[day]) acc[day] = [];
    acc[day].push(trade);
    return acc;
  }, {} as Record<string, Trade[]>);

  // Navigate dates
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(startOfDay(new Date()));

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const isFutureDate = selectedDate > new Date();

  // Determine which tab to show based on time of day
  React.useEffect(() => {
    if (isToday) {
      const hour = new Date().getHours();
      // Before 9:30 AM ET (market open) - show pre-market
      // After 4:00 PM ET (market close) - show post-market
      if (hour < 9) {
        setActiveTab("pre-market");
      } else if (hour >= 16) {
        setActiveTab("post-market");
      }
    }
  }, [isToday]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {isWeekendReview ? "Weekly Review" : "Trading Journal"}
            </h1>
            {isWeekendReview && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                <CalendarDays className="h-3 w-3 mr-1" />
                Review Day
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {isWeekendReview
              ? "Reflect on your week, celebrate wins, and plan for improvement."
              : "Document your trading day, track mistakes, and build consistency."}
          </p>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[200px] justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {format(selectedDate, "EEE, MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            disabled={isFutureDate}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isToday && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>
      </div>

      {/* Conditional: Saturday Weekly Review vs Regular Daily Journal */}
      {isWeekendReview ? (
        <>
          {/* Weekly Performance Summary */}
          <Card className={cn(
            "border-l-4",
            weeklyPnL > 0 ? "border-l-green-500" : weeklyPnL < 0 ? "border-l-red-500" : "border-l-gray-300"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <CardTitle>Weekly Performance</CardTitle>
              </div>
              <CardDescription>
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d")} - {format(subDays(selectedDate, 1), "MMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-1">Weekly P&L</p>
                  <p className={cn(
                    "text-3xl font-bold",
                    weeklyPnL >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {weeklyPnL >= 0 ? "+" : ""}{weeklyPnL.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Trades</p>
                  <p className="text-xl font-semibold">{weeklyTrades.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-xl font-semibold">{weeklyWinRate.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-green-600" /> Wins
                  </p>
                  <p className="text-xl font-semibold text-green-600">{weeklyWinCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3 text-red-600" /> Losses
                  </p>
                  <p className="text-xl font-semibold text-red-600">{weeklyLossCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Profit Factor</p>
                  <p className={cn(
                    "text-xl font-semibold",
                    weeklyProfitFactor >= 1 ? "text-green-600" : "text-red-600"
                  )}>
                    {weeklyProfitFactor > 0 ? weeklyProfitFactor.toFixed(2) : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Avg Win/Loss</p>
                  <p className="text-lg font-medium">
                    <span className="text-green-600">${weeklyAvgWin.toFixed(0)}</span>
                    {" / "}
                    <span className="text-red-600">${weeklyAvgLoss.toFixed(0)}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Review Content */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Reflection (Journal) */}
            <div className="space-y-6">
              {/* Weekly Wins */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <CardTitle>What Went Well This Week</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Celebrate your wins! What did you do well? What habits served you? What patterns worked?"
                    className="min-h-[120px]"
                    value={weeklyWins}
                    onChange={(e) => setWeeklyWins(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <CardTitle>Areas for Improvement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="What mistakes did you repeat? What rules did you break? What could you do better next week?"
                    className="min-h-[120px]"
                    value={weeklyImprovements}
                    onChange={(e) => setWeeklyImprovements(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Next Week Goals */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <CardTitle>Goals for Next Week</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a specific goal for next week..."
                      value={newWeeklyGoal}
                      onChange={(e) => setNewWeeklyGoal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddWeeklyGoal()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddWeeklyGoal}
                      disabled={!newWeeklyGoal.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {nextWeekGoals.length > 0 && (
                    <div className="space-y-2">
                      {nextWeekGoals.map((goal, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <Target className="h-4 w-4 text-blue-500" />
                          <span className="flex-1 text-sm">{goal}</span>
                          <button
                            onClick={() => handleRemoveWeeklyGoal(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Weekly Rating */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <CardTitle>Rate Your Week</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <StarRating
                    label="Overall Weekly Performance"
                    value={weeklyRating}
                    onChange={setWeeklyRating}
                    icon={Trophy}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Stats & Trades */}
            <div className="space-y-6">
              {/* Daily Breakdown */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <CardTitle>Daily Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {weeklyTrades.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No trades this week</p>
                  ) : (
                    <div className="space-y-3">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                        const dayTrades = tradesByDay[day] || [];
                        const dayPnL = dayTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
                        const dayWins = dayTrades.filter(t => (t.net_pnl || 0) > 0).length;
                        const dayLosses = dayTrades.filter(t => (t.net_pnl || 0) < 0).length;

                        return (
                          <div
                            key={day}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg",
                              dayTrades.length > 0 ? "bg-muted/50" : "bg-muted/20"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-medium w-24">{day}</span>
                              <span className="text-sm text-muted-foreground">
                                {dayTrades.length} trade{dayTrades.length !== 1 ? "s" : ""}
                              </span>
                              {dayTrades.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({dayWins}W / {dayLosses}L)
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "font-semibold",
                              dayPnL > 0 ? "text-green-600" : dayPnL < 0 ? "text-red-600" : "text-muted-foreground"
                            )}>
                              {dayPnL !== 0 ? (dayPnL > 0 ? "+" : "") + dayPnL.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Best & Worst Trades */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <CardTitle>Notable Trades</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {weeklyClosedTrades.length > 0 ? (
                    <>
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">Best Trade</p>
                        {(() => {
                          const bestTrade = weeklyClosedTrades.reduce((best, t) =>
                            (t.net_pnl || 0) > (best.net_pnl || 0) ? t : best
                          );
                          return (
                            <Link href={`/trades/${bestTrade.id}`} className="block">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                                <div>
                                  <span className="font-medium">{bestTrade.symbol}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {format(new Date(bestTrade.entry_date), "EEEE")}
                                  </span>
                                </div>
                                <span className="font-bold text-green-600">
                                  +${(bestTrade.net_pnl || 0).toFixed(2)}
                                </span>
                              </div>
                            </Link>
                          );
                        })()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-2">Worst Trade</p>
                        {(() => {
                          const worstTrade = weeklyClosedTrades.reduce((worst, t) =>
                            (t.net_pnl || 0) < (worst.net_pnl || 0) ? t : worst
                          );
                          return (
                            <Link href={`/trades/${worstTrade.id}`} className="block">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                                <div>
                                  <span className="font-medium">{worstTrade.symbol}</span>
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {format(new Date(worstTrade.entry_date), "EEEE")}
                                  </span>
                                </div>
                                <span className="font-bold text-red-600">
                                  ${(worstTrade.net_pnl || 0).toFixed(2)}
                                </span>
                              </div>
                            </Link>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No closed trades this week</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Weekly Notes */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-500" />
                <CardTitle>Additional Notes & Insights</CardTitle>
              </div>
              <CardDescription>
                Any other thoughts, observations, or plans for your trading journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Market observations, strategy ideas, personal notes..."
                className="min-h-[150px]"
                value={weeklyReviewNotes}
                onChange={(e) => setWeeklyReviewNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Save Button and View Trades */}
          <div className="flex items-center justify-between">
            <Link href="/trades">
              <Button variant="outline" size="lg" className="px-6 py-3">
                <BarChart3 className="mr-2 h-5 w-5" />
                View All Trades
              </Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges} size="lg" className="px-6 py-3">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save Weekly Review
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Daily Performance Summary */}
          <Card className={cn(
            "border-l-4",
            dailyPnL > 0 ? "border-l-green-500" : dailyPnL < 0 ? "border-l-red-500" : "border-l-gray-300"
          )}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <p className="text-sm text-muted-foreground mb-1">Net P&L</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    dailyPnL >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {dailyPnL >= 0 ? "+" : ""}{dailyPnL.toLocaleString("en-US", { style: "currency", currency: "USD" })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Trades</p>
                  <p className="text-xl font-semibold">{trades.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
              <p className="text-xl font-semibold">{winRate.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" /> Wins
              </p>
              <p className="text-xl font-semibold text-green-600">{winCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-red-600" /> Losses
              </p>
              <p className="text-xl font-semibold text-red-600">{lossCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Largest Win</p>
              <p className="text-lg font-medium text-green-600">
                +${largestWin.toFixed(0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Largest Loss</p>
              <p className="text-lg font-medium text-red-600">
                ${largestLoss.toFixed(0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Journal Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pre-market" className="gap-2">
              <Sun className="h-4 w-4" />
              Pre-Market
            </TabsTrigger>
            <TabsTrigger value="post-market" className="gap-2">
              <Moon className="h-4 w-4" />
              Post-Market
            </TabsTrigger>
            <TabsTrigger value="trades" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Trades ({trades.length})
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Screenshots
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Pre-Market Tab */}
        <TabsContent value="pre-market" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Game Plan */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  <CardTitle>Today's Game Plan</CardTitle>
                </div>
                <CardDescription>
                  Set your intentions before the market opens
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Market Bias */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Market Bias</span>
                  <div className="flex gap-2">
                    {["Bullish", "Bearish", "Neutral", "Choppy"].map((bias) => (
                      <Button
                        key={bias}
                        type="button"
                        variant={marketBias === bias ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMarketBias(marketBias === bias ? null : bias)}
                        className={cn(
                          marketBias === bias && bias === "Bullish" && "bg-green-600 hover:bg-green-700",
                          marketBias === bias && bias === "Bearish" && "bg-red-600 hover:bg-red-700",
                          marketBias === bias && bias === "Neutral" && "bg-gray-600 hover:bg-gray-700",
                          marketBias === bias && bias === "Choppy" && "bg-yellow-600 hover:bg-yellow-700"
                        )}
                      >
                        {bias}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Key Levels */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Key Levels to Watch</span>
                  <Textarea
                    placeholder="Support: 4500, 4480&#10;Resistance: 4520, 4550&#10;POC: 4510"
                    className="min-h-[100px] font-mono text-sm"
                    value={keyLevels}
                    onChange={(e) => setKeyLevels(e.target.value)}
                  />
                </div>

                {/* Pre-Market Notes */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Pre-Market Notes</span>
                  <Textarea
                    placeholder="Market conditions, overnight action, news events, setups I'm watching..."
                    className="min-h-[120px]"
                    value={preMarketNotes}
                    onChange={(e) => setPreMarketNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Goals & Rules */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <CardTitle>Goals & Risk Rules</CardTitle>
                </div>
                <CardDescription>
                  Define your daily limits and objectives
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Daily Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Max Loss Limit</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        placeholder="500"
                        className="pl-7"
                        value={maxLossLimit}
                        onChange={(e) => setMaxLossLimit(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Max Trades</span>
                    <Input
                      type="number"
                      placeholder="5"
                      value={maxTradesLimit}
                      onChange={(e) => setMaxTradesLimit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Daily Goals */}
                <div className="space-y-3">
                  <span className="text-sm font-medium">Today's Goals</span>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a specific goal..."
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddGoal}
                      disabled={!newGoal.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {dailyGoals.length > 0 && (
                    <div className="space-y-2">
                      {dailyGoals.map((goal, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 text-sm">{goal}</span>
                          <button
                            onClick={() => handleRemoveGoal(index)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Starting Mood */}
                <div className="pt-2">
                  <StarRating
                    label="Starting Mood"
                    value={moodRating}
                    onChange={setMoodRating}
                    icon={Brain}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pre-Market Screenshots */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-blue-500" />
                <CardTitle>Pre-Market Charts</CardTitle>
              </div>
              <CardDescription>
                Upload screenshots of your pre-market analysis, key levels, and market structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JournalDailyScreenshots date={dateKey} type="pre_market" maxScreenshots={5} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Post-Market Tab */}
        <TabsContent value="post-market" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Review */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <CardTitle>End of Day Review</CardTitle>
                </div>
                <CardDescription>
                  Reflect on your trading performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* What Went Well */}
                <TagSelector
                  label="What Went Well"
                  options={WHAT_WENT_WELL}
                  selected={whatWentWell}
                  onChange={setWhatWentWell}
                  icon={CheckCircle2}
                  variant="success"
                />

                {/* Mistakes Made */}
                <TagSelector
                  label="Mistakes Made"
                  options={COMMON_MISTAKES}
                  selected={mistakesMade}
                  onChange={setMistakesMade}
                  icon={AlertTriangle}
                  variant="destructive"
                />

                {/* Post-Market Notes */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Post-Market Notes</span>
                  <Textarea
                    placeholder="How did the day go? What patterns did you notice? Market behavior analysis..."
                    className="min-h-[120px]"
                    value={postMarketNotes}
                    onChange={(e) => setPostMarketNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lessons & Ratings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <CardTitle>Lessons & Self-Assessment</CardTitle>
                </div>
                <CardDescription>
                  Capture insights and rate your performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Lessons Learned */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Key Lessons / Insights</span>
                  <Textarea
                    placeholder="What did you learn today? What will you do differently tomorrow?"
                    className="min-h-[100px]"
                    value={lessonsLearned}
                    onChange={(e) => setLessonsLearned(e.target.value)}
                  />
                </div>

                {/* Self-Assessment Ratings */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <StarRating
                    label="Focus Level"
                    value={focusRating}
                    onChange={setFocusRating}
                    icon={Target}
                  />
                  <StarRating
                    label="Discipline"
                    value={disciplineRating}
                    onChange={setDisciplineRating}
                    icon={CheckCircle2}
                  />
                  <StarRating
                    label="Execution Quality"
                    value={executionRating}
                    onChange={setExecutionRating}
                    icon={Zap}
                  />
                  <StarRating
                    label="Overall Mood"
                    value={moodRating}
                    onChange={setMoodRating}
                    icon={Brain}
                  />
                </div>

                {/* Goal Review */}
                {dailyGoals.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <span className="text-sm font-medium">Did you achieve your goals?</span>
                    <div className="space-y-1">
                      {dailyGoals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">•</span>
                          <span>{goal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Post-Market Screenshots */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-indigo-500" />
                <CardTitle>Post-Market Charts</CardTitle>
              </div>
              <CardDescription>
                Upload screenshots of your end-of-day review, trade analysis, and market recap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JournalDailyScreenshots date={dateKey} type="post_market" maxScreenshots={5} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trades Tab */}
        <TabsContent value="trades" className="space-y-4">
          {trades.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No trades on this day</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Trades taken on {format(selectedDate, "MMMM d, yyyy")} will appear here.
                </p>
                <div className="flex gap-3">
                  <Link href="/trades/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trade
                    </Button>
                  </Link>
                  <Link href={`/import?date=${dateKey}`}>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Trades
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header with Add Trade button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {trades.length} trade{trades.length !== 1 ? "s" : ""} on {format(selectedDate, "MMMM d, yyyy")}
                </p>
                <div className="flex gap-2">
                  <Link href={`/import?date=${dateKey}`}>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </Link>
                  <Link href="/trades/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Trade
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Full Trade Table */}
              <TradeTable
                trades={trades}
                onDelete={handleDeleteTrade}
                pageSize={trades.length}
                currentPage={1}
                totalCount={trades.length}
              />
            </div>
          )}
        </TabsContent>

        {/* Screenshots Tab */}
        <TabsContent value="screenshots">
          <JournalScreenshots date={dateKey} />
        </TabsContent>
      </Tabs>
        </>
      )}
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading journal...</p>
        </div>
      </div>
    }>
      <JournalPageContent />
    </Suspense>
  );
}

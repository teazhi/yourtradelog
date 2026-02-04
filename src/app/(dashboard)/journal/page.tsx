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
  Zap,
  Brain,
  ImageIcon,
  Trophy,
  Flame,
  BookOpen,
  Upload,
  Settings,
  Shield,
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
import { useAccount } from "@/components/providers/account-provider";
import {
  POSITIVE_EMOTIONS,
  NEGATIVE_EMOTIONS,
  NEUTRAL_EMOTIONS,
  EMOTION_LABELS,
} from "@/lib/constants";
import { EmotionTag } from "@/types/trade";
import { JournalScreenshots } from "@/components/journal/journal-screenshots";
import { JournalDailyScreenshots } from "@/components/journal/journal-daily-screenshots";
import { UnlinkedScreenshots } from "@/components/journal/unlinked-screenshots";
import { TradeTable } from "@/components/trades/trade-table";
import { ShareToX } from "@/components/journal/share-to-x";
import { DisciplineChecklist } from "@/components/discipline/discipline-checklist";
import {
  CustomDialog,
  CustomDialogContent,
  CustomDialogDescription,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/ui/custom-dialog";

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
  onChangeComplete,
  disabled = false,
  label,
  icon: Icon,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onChangeComplete?: () => void;
  disabled?: boolean;
  label: string;
  icon?: React.ElementType;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  const handleClick = (star: number) => {
    onChange(value === star ? null : star);
    // Trigger save after rating change (use direct callback, not auto-save)
    if (onChangeComplete) {
      setTimeout(onChangeComplete, 150);
    }
  };

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
            onClick={() => handleClick(star)}
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

// Tag selector component with custom options support
function TagSelector({
  label,
  options,
  selected,
  onChange,
  onChangeComplete,
  icon: Icon,
  variant = "default",
  customOptions = [],
  onCustomOptionsChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  onChangeComplete?: () => void;
  icon?: React.ElementType;
  variant?: "default" | "success" | "destructive";
  customOptions?: string[];
  onCustomOptionsChange?: (options: string[]) => void;
}) {
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [newOption, setNewOption] = React.useState("");

  const allOptions = [...options, ...customOptions];

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
    // Trigger save after tag selection (use direct callback, not auto-save)
    if (onChangeComplete) {
      setTimeout(onChangeComplete, 150);
    }
  };

  const addCustomOption = () => {
    const trimmed = newOption.trim();
    if (trimmed && !allOptions.includes(trimmed) && onCustomOptionsChange) {
      const updated = [...customOptions, trimmed];
      onCustomOptionsChange(updated);
      // Also select the newly added option
      onChange([...selected, trimmed]);
      setNewOption("");
      if (onChangeComplete) {
        setTimeout(onChangeComplete, 150);
      }
    }
  };

  const removeCustomOption = (option: string) => {
    if (onCustomOptionsChange) {
      onCustomOptionsChange(customOptions.filter((o) => o !== option));
      // Also remove from selected if it was selected
      if (selected.includes(option)) {
        onChange(selected.filter((s) => s !== option));
      }
      if (onChangeComplete) {
        setTimeout(onChangeComplete, 150);
      }
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
          <Badge variant="secondary" className="ml-1">
            {selected.length} selected
          </Badge>
        )}
        {onCustomOptionsChange && (
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "ml-auto p-1.5 rounded-md transition-colors",
              isEditMode
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={isEditMode ? "Done editing" : "Edit options"}
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Add new option input */}
      {isEditMode && onCustomOptionsChange && (
        <div className="flex gap-2">
          <Input
            placeholder="Add custom option..."
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomOption();
              }
            }}
            className="text-sm h-8"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomOption}
            disabled={!newOption.trim() || allOptions.includes(newOption.trim())}
            className="h-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Preset options */}
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => !isEditMode && toggleTag(option)}
            className={cn(
              "px-3 py-1.5 text-xs rounded-full border transition-all",
              selected.includes(option)
                ? variantClasses[variant]
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
              isEditMode && "opacity-60 cursor-default"
            )}
          >
            {option}
          </button>
        ))}

        {/* Custom options - show delete button in edit mode */}
        {customOptions.map((option) => (
          <div key={option} className="relative group">
            <button
              type="button"
              onClick={() => !isEditMode && toggleTag(option)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full border transition-all",
                selected.includes(option)
                  ? variantClasses[variant]
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                isEditMode && "pr-7"
              )}
            >
              {option}
            </button>
            {isEditMode && (
              <button
                type="button"
                onClick={() => removeCustomOption(option)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30"
                title="Remove custom option"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditMode && customOptions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Click the X on custom options to remove them. Preset options cannot be removed.
        </p>
      )}
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
  const { selectedAccountId, showAllAccounts, accounts } = useAccount();

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

  // Daily emotions - will be applied to all trades from this day
  const [dailyEmotions, setDailyEmotions] = React.useState<string[]>([]);

  // Share to feed dialog state
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [shareTradeId, setShareTradeId] = React.useState<string | null>(null);
  const [shareComment, setShareComment] = React.useState("");
  const [isSharing, setIsSharing] = React.useState(false);

  // Screenshot refresh key - increment to trigger JournalScreenshots refresh
  const [screenshotRefreshKey, setScreenshotRefreshKey] = React.useState(0);

  // Weekly review state (for Saturdays)
  const [weeklyTrades, setWeeklyTrades] = React.useState<Trade[]>([]);
  const [weeklyReviewNotes, setWeeklyReviewNotes] = React.useState("");
  const [weeklyWins, setWeeklyWins] = React.useState("");
  const [weeklyImprovements, setWeeklyImprovements] = React.useState("");
  const [nextWeekGoals, setNextWeekGoals] = React.useState<string[]>([]);
  const [newWeeklyGoal, setNewWeeklyGoal] = React.useState("");
  const [weeklyRating, setWeeklyRating] = React.useState<number | null>(null);

  // Custom options for "What Went Well" and "Mistakes Made"
  const [customWhatWentWell, setCustomWhatWentWell] = React.useState<string[]>([]);
  const [customMistakes, setCustomMistakes] = React.useState<string[]>([]);

  // Load custom options from localStorage on mount
  React.useEffect(() => {
    try {
      const savedWhatWentWell = localStorage.getItem("journal_custom_what_went_well");
      const savedMistakes = localStorage.getItem("journal_custom_mistakes");
      if (savedWhatWentWell) {
        setCustomWhatWentWell(JSON.parse(savedWhatWentWell));
      }
      if (savedMistakes) {
        setCustomMistakes(JSON.parse(savedMistakes));
      }
    } catch (e) {
      console.error("Error loading custom options from localStorage:", e);
    }
  }, []);

  // Save custom options to localStorage when they change
  const handleCustomWhatWentWellChange = React.useCallback((options: string[]) => {
    setCustomWhatWentWell(options);
    try {
      localStorage.setItem("journal_custom_what_went_well", JSON.stringify(options));
    } catch (e) {
      console.error("Error saving custom options to localStorage:", e);
    }
  }, []);

  const handleCustomMistakesChange = React.useCallback((options: string[]) => {
    setCustomMistakes(options);
    try {
      localStorage.setItem("journal_custom_mistakes", JSON.stringify(options));
    } catch (e) {
      console.error("Error saving custom options to localStorage:", e);
    }
  }, []);

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

        // Extract existing emotions from trades (if any trade has emotions, use those)
        if (tradesData && tradesData.length > 0) {
          const existingEmotions = new Set<string>();
          tradesData.forEach((trade: Trade) => {
            if (trade.emotions && trade.emotions.length > 0) {
              trade.emotions.forEach(e => existingEmotions.add(e));
            }
          });
          if (existingEmotions.size > 0) {
            setDailyEmotions(Array.from(existingEmotions));
          }
        }

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
    setDailyEmotions([]);
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
    dailyEmotions,
    isLoading
  ]);

  // Auto-save on blur (only if there are changes)
  const handleAutoSave = async () => {
    if (!hasChanges || isSaving) return;
    await handleSave();
  };

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

      // Apply emotions to all trades from this day (if emotions are selected and trades exist)
      if (dailyEmotions.length > 0 && trades.length > 0) {
        const tradeIds = trades.map(t => t.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: emotionsError } = await (supabase
          .from("trades") as any)
          .update({ emotions: dailyEmotions })
          .in("id", tradeIds);

        if (emotionsError) {
          console.error("Error applying emotions to trades:", emotionsError);
        } else {
          // Update local state
          setTrades(prev => prev.map(t => ({ ...t, emotions: dailyEmotions })));
        }
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
      setTimeout(() => handleSave(), 150);
    }
  };

  // Remove a goal
  const handleRemoveGoal = (index: number) => {
    setDailyGoals(dailyGoals.filter((_, i) => i !== index));
    setTimeout(() => handleSave(), 150);
  };

  // Add weekly goal
  const handleAddWeeklyGoal = () => {
    if (newWeeklyGoal.trim()) {
      setNextWeekGoals([...nextWeekGoals, newWeeklyGoal.trim()]);
      setNewWeeklyGoal("");
      setTimeout(() => handleSave(), 150);
    }
  };

  // Remove weekly goal
  const handleRemoveWeeklyGoal = (index: number) => {
    setNextWeekGoals(nextWeekGoals.filter((_, i) => i !== index));
    setTimeout(() => handleSave(), 150);
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

  // Open share dialog
  const handleShareTrade = (tradeId: string) => {
    setShareTradeId(tradeId);
    setShareComment("");
    setShowShareDialog(true);
  };

  // Confirm share to feed with comment
  const handleConfirmShare = async () => {
    if (!shareTradeId) return;

    setIsSharing(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from("trades") as any)
        .update({
          visibility: "public",
          shared_to_feed: true,
          share_analysis: shareComment || null,
        })
        .eq("id", shareTradeId);

      if (error) {
        console.error("Error sharing trade:", error);
        toast.error("Failed to share trade");
      } else {
        // Update local state
        setTrades(prev => prev.map(t =>
          t.id === shareTradeId
            ? { ...t, visibility: "public", shared_to_feed: true, share_analysis: shareComment || null } as Trade
            : t
        ));
        toast.success("Trade shared to feed!");
        setShowShareDialog(false);
        setShareTradeId(null);
        setShareComment("");
      }
    } catch (err) {
      console.error("Exception sharing trade:", err);
      toast.error("An error occurred while sharing");
    } finally {
      setIsSharing(false);
    }
  };

  // Unshare a trade from the feed
  const handleUnshareTrade = async (tradeId: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from("trades") as any)
        .update({
          visibility: "private",
          shared_to_feed: false,
          share_analysis: null,
        })
        .eq("id", tradeId);

      if (error) {
        console.error("Error unsharing trade:", error);
        toast.error("Failed to unshare trade");
      } else {
        // Update local state
        setTrades(prev => prev.map(t =>
          t.id === tradeId
            ? { ...t, visibility: "private", shared_to_feed: false, share_analysis: null } as Trade
            : t
        ));
        toast.success("Trade removed from feed");
      }
    } catch (err) {
      console.error("Exception unsharing trade:", err);
      toast.error("An error occurred while unsharing");
    }
  };

  // Filter trades by selected account
  const accountFilteredTrades = React.useMemo(() => {
    if (showAllAccounts || !selectedAccountId) {
      return trades;
    }
    return trades.filter(t => t.account_id === selectedAccountId);
  }, [trades, selectedAccountId, showAllAccounts]);

  // Filter weekly trades by selected account
  const accountFilteredWeeklyTrades = React.useMemo(() => {
    if (showAllAccounts || !selectedAccountId) {
      return weeklyTrades;
    }
    return weeklyTrades.filter(t => t.account_id === selectedAccountId);
  }, [weeklyTrades, selectedAccountId, showAllAccounts]);

  // Calculate daily stats using account-filtered trades
  const closedTrades = accountFilteredTrades.filter((t) => t.status === "closed");
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

  // Weekly stats (for Saturday review) - using account filtered trades
  // Include trades that are closed OR have a net_pnl (in case status isn't set)
  const weeklyClosedTrades = accountFilteredWeeklyTrades.filter((t) => t.status === "closed" || t.net_pnl !== null);
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

  // Group weekly trades by day (using account filtered trades)
  const tradesByDay = accountFilteredWeeklyTrades.reduce((acc, trade) => {
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
                  <p className="text-xl font-semibold">{accountFilteredWeeklyTrades.length}</p>
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
                    onBlur={handleAutoSave}
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
                    onBlur={handleAutoSave}
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
                    onChangeComplete={() => handleSave()}
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
                  <CardDescription>
                    Click on a trade to view that day's journal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {accountFilteredWeeklyTrades.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No trades this week</p>
                  ) : (
                    <div className="space-y-2">
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => {
                        const dayTrades = tradesByDay[day] || [];
                        const dayPnL = dayTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
                        const dayWins = dayTrades.filter(t => (t.net_pnl || 0) > 0).length;
                        const dayLosses = dayTrades.filter(t => (t.net_pnl || 0) < 0).length;

                        // Get the date for the first trade of this day (for navigation)
                        const dayDate = dayTrades.length > 0
                          ? format(new Date(dayTrades[0].entry_date), "yyyy-MM-dd")
                          : null;

                        return (
                          <div key={day} className="space-y-1">
                            {/* Day Header - Clickable to go to that day's journal */}
                            {dayDate ? (
                              <Link
                                href={`/journal?date=${dayDate}`}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-lg transition-colors",
                                  dayTrades.length > 0
                                    ? "bg-muted/50 hover:bg-muted cursor-pointer"
                                    : "bg-muted/20"
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
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-semibold",
                                    dayPnL > 0 ? "text-green-600" : dayPnL < 0 ? "text-red-600" : "text-muted-foreground"
                                  )}>
                                    {dayPnL !== 0 ? (dayPnL > 0 ? "+" : "") + dayPnL.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "-"}
                                  </span>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </Link>
                            ) : (
                              <div className={cn(
                                "flex items-center justify-between p-3 rounded-lg",
                                "bg-muted/20"
                              )}>
                                <div className="flex items-center gap-3">
                                  <span className="font-medium w-24 text-muted-foreground">{day}</span>
                                  <span className="text-sm text-muted-foreground">No trades</span>
                                </div>
                                <span className="text-muted-foreground">-</span>
                              </div>
                            )}

                            {/* Individual Trades for the day - shown below the day header */}
                            {dayTrades.length > 0 && (
                              <div className="ml-4 space-y-1">
                                {dayTrades.slice(0, 5).map((trade) => {
                                  const tradeDate = format(new Date(trade.entry_date), "yyyy-MM-dd");
                                  return (
                                    <Link
                                      key={trade.id}
                                      href={`/journal?date=${tradeDate}`}
                                      className="flex items-center justify-between p-2 rounded-md bg-background/50 hover:bg-background border border-transparent hover:border-border transition-colors text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "w-1.5 h-1.5 rounded-full",
                                          (trade.net_pnl || 0) > 0 ? "bg-green-500" :
                                          (trade.net_pnl || 0) < 0 ? "bg-red-500" : "bg-gray-400"
                                        )} />
                                        <span className="font-medium">{trade.symbol}</span>
                                        <span className={cn(
                                          "text-xs px-1.5 py-0.5 rounded",
                                          trade.side === "long"
                                            ? "bg-green-500/10 text-green-600"
                                            : "bg-red-500/10 text-red-600"
                                        )}>
                                          {trade.side?.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {format(new Date(trade.entry_date), "h:mm a")}
                                        </span>
                                      </div>
                                      <span className={cn(
                                        "font-medium",
                                        (trade.net_pnl || 0) > 0 ? "text-green-600" :
                                        (trade.net_pnl || 0) < 0 ? "text-red-600" : "text-muted-foreground"
                                      )}>
                                        {(trade.net_pnl || 0) >= 0 ? "+" : ""}${(trade.net_pnl || 0).toFixed(2)}
                                      </span>
                                    </Link>
                                  );
                                })}
                                {dayTrades.length > 5 && (
                                  <Link
                                    href={`/journal?date=${dayDate}`}
                                    className="block text-center text-xs text-primary hover:underline py-1"
                                  >
                                    +{dayTrades.length - 5} more trades
                                  </Link>
                                )}
                              </div>
                            )}
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
                  <CardDescription>
                    Click to view the journal for that day
                  </CardDescription>
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
                          const tradeDate = format(new Date(bestTrade.entry_date), "yyyy-MM-dd");
                          return (
                            <Link href={`/journal?date=${tradeDate}`} className="block">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{bestTrade.symbol}</span>
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    bestTrade.side === "long"
                                      ? "bg-green-500/20 text-green-700"
                                      : "bg-red-500/20 text-red-700"
                                  )}>
                                    {bestTrade.side?.toUpperCase()}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(bestTrade.entry_date), "EEEE")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-green-600">
                                    +${(bestTrade.net_pnl || 0).toFixed(2)}
                                  </span>
                                  <ChevronRight className="h-4 w-4 text-green-600/50" />
                                </div>
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
                          const tradeDate = format(new Date(worstTrade.entry_date), "yyyy-MM-dd");
                          return (
                            <Link href={`/journal?date=${tradeDate}`} className="block">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{worstTrade.symbol}</span>
                                  <span className={cn(
                                    "text-xs px-1.5 py-0.5 rounded",
                                    worstTrade.side === "long"
                                      ? "bg-green-500/20 text-green-700"
                                      : "bg-red-500/20 text-red-700"
                                  )}>
                                    {worstTrade.side?.toUpperCase()}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {format(new Date(worstTrade.entry_date), "EEEE")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-red-600">
                                    ${(worstTrade.net_pnl || 0).toFixed(2)}
                                  </span>
                                  <ChevronRight className="h-4 w-4 text-red-600/50" />
                                </div>
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
                onBlur={handleAutoSave}
              />
            </CardContent>
          </Card>

          {/* View Trades and Share */}
          <div className="flex items-center justify-between">
            <Link href="/trades">
              <Button variant="outline" size="lg" className="px-6 py-3">
                <BarChart3 className="mr-2 h-5 w-5" />
                View All Trades
              </Button>
            </Link>
            <ShareToX
              weeklyPnL={weeklyPnL}
              weeklyWinRate={weeklyWinRate}
              weeklyTradeCount={accountFilteredWeeklyTrades.length}
              date={format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM d") + " - " + format(subDays(selectedDate, 1), "MMM d")}
              isWeekendReview={true}
              lessonsLearned={weeklyReviewNotes}
            />
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
                  <p className="text-xl font-semibold">{accountFilteredTrades.length}</p>
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
              Trades ({accountFilteredTrades.length})
            </TabsTrigger>
            <TabsTrigger value="discipline" className="gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>Discipline</span>
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            </TabsTrigger>
            <TabsTrigger value="screenshots" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Screenshots
            </TabsTrigger>
          </TabsList>

          <ShareToX
            dailyPnL={dailyPnL}
            winRate={winRate}
            winCount={winCount}
            lossCount={lossCount}
            tradeCount={closedTrades.length}
            date={format(selectedDate, "MMM d, yyyy")}
            isWeekendReview={false}
            lessonsLearned={lessonsLearned}
            whatWentWell={whatWentWell}
          />
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
                        onClick={() => {
                          setMarketBias(marketBias === bias ? null : bias);
                          // Use handleSave directly since we know a change just happened
                          // handleAutoSave won't work reliably due to hasChanges state timing
                          setTimeout(() => handleSave(), 100);
                        }}
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
                    onBlur={handleAutoSave}
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
                    onBlur={handleAutoSave}
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
                        onBlur={handleAutoSave}
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
                      onBlur={handleAutoSave}
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
                    onChangeComplete={() => handleSave()}
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
                  onChangeComplete={() => handleSave()}
                  icon={CheckCircle2}
                  variant="success"
                  customOptions={customWhatWentWell}
                  onCustomOptionsChange={handleCustomWhatWentWellChange}
                />

                {/* Mistakes Made */}
                <TagSelector
                  label="Mistakes Made"
                  options={COMMON_MISTAKES}
                  selected={mistakesMade}
                  onChange={setMistakesMade}
                  onChangeComplete={() => handleSave()}
                  icon={AlertTriangle}
                  variant="destructive"
                  customOptions={customMistakes}
                  onCustomOptionsChange={handleCustomMistakesChange}
                />

                {/* Daily Emotions - Applied to all trades */}
                {trades.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      <span className="text-sm font-medium">Today's Emotional State</span>
                      <Badge variant="outline" className="text-xs">
                        Applied to {trades.length} trade{trades.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the emotions you experienced while trading today. These will be applied to all your trades for psychology analysis.
                    </p>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium">Positive</div>
                      <div className="flex flex-wrap gap-1.5">
                        {POSITIVE_EMOTIONS.map((emotion) => (
                          <button
                            key={emotion}
                            type="button"
                            onClick={() => {
                              const newEmotions = dailyEmotions.includes(emotion)
                                ? dailyEmotions.filter(e => e !== emotion)
                                : [...dailyEmotions, emotion];
                              setDailyEmotions(newEmotions);
                              setTimeout(() => handleSave(), 150);
                            }}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-full border transition-all",
                              dailyEmotions.includes(emotion)
                                ? "bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400"
                                : "bg-muted/50 border-transparent hover:border-green-500/30 hover:bg-green-500/10"
                            )}
                          >
                            {EMOTION_LABELS[emotion]}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium pt-1">Negative</div>
                      <div className="flex flex-wrap gap-1.5">
                        {NEGATIVE_EMOTIONS.map((emotion) => (
                          <button
                            key={emotion}
                            type="button"
                            onClick={() => {
                              const newEmotions = dailyEmotions.includes(emotion)
                                ? dailyEmotions.filter(e => e !== emotion)
                                : [...dailyEmotions, emotion];
                              setDailyEmotions(newEmotions);
                              setTimeout(() => handleSave(), 150);
                            }}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-full border transition-all",
                              dailyEmotions.includes(emotion)
                                ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                                : "bg-muted/50 border-transparent hover:border-red-500/30 hover:bg-red-500/10"
                            )}
                          >
                            {EMOTION_LABELS[emotion]}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium pt-1">Neutral</div>
                      <div className="flex flex-wrap gap-1.5">
                        {NEUTRAL_EMOTIONS.map((emotion) => (
                          <button
                            key={emotion}
                            type="button"
                            onClick={() => {
                              const newEmotions = dailyEmotions.includes(emotion)
                                ? dailyEmotions.filter(e => e !== emotion)
                                : [...dailyEmotions, emotion];
                              setDailyEmotions(newEmotions);
                              setTimeout(() => handleSave(), 150);
                            }}
                            className={cn(
                              "px-2.5 py-1 text-xs rounded-full border transition-all",
                              dailyEmotions.includes(emotion)
                                ? "bg-gray-500/20 border-gray-500/50 text-gray-600 dark:text-gray-400"
                                : "bg-muted/50 border-transparent hover:border-gray-500/30 hover:bg-gray-500/10"
                            )}
                          >
                            {EMOTION_LABELS[emotion]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Post-Market Notes */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Post-Market Notes</span>
                  <Textarea
                    placeholder="How did the day go? What patterns did you notice? Market behavior analysis..."
                    className="min-h-[120px]"
                    value={postMarketNotes}
                    onChange={(e) => setPostMarketNotes(e.target.value)}
                    onBlur={handleAutoSave}
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
                    onBlur={handleAutoSave}
                  />
                </div>

                {/* Self-Assessment Ratings */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <StarRating
                    label="Focus Level"
                    value={focusRating}
                    onChange={setFocusRating}
                    onChangeComplete={() => handleSave()}
                    icon={Target}
                  />
                  <StarRating
                    label="Discipline"
                    value={disciplineRating}
                    onChange={setDisciplineRating}
                    onChangeComplete={() => handleSave()}
                    icon={CheckCircle2}
                  />
                  <StarRating
                    label="Execution Quality"
                    value={executionRating}
                    onChange={setExecutionRating}
                    onChangeComplete={() => handleSave()}
                    icon={Zap}
                  />
                  <StarRating
                    label="Overall Mood"
                    value={moodRating}
                    onChange={setMoodRating}
                    onChangeComplete={() => handleSave()}
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
          {accountFilteredTrades.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No trades on this day</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Trades taken on {format(selectedDate, "MMMM d, yyyy")} will appear here.
                </p>
                <Link href={`/import?date=${dateKey}`}>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Trades
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header with Add Trade button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {accountFilteredTrades.length} trade{accountFilteredTrades.length !== 1 ? "s" : ""} on {format(selectedDate, "MMMM d, yyyy")}
                </p>
                <Link href={`/import?date=${dateKey}`}>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </Link>
              </div>

              {/* Full Trade Table */}
              <TradeTable
                trades={accountFilteredTrades}
                onDelete={handleDeleteTrade}
                onShare={handleShareTrade}
                onUnshare={handleUnshareTrade}
                pageSize={accountFilteredTrades.length}
                currentPage={1}
                totalCount={accountFilteredTrades.length}
                accounts={accounts}
              />
            </div>
          )}
        </TabsContent>

        {/* Screenshots Tab */}
        {/* Discipline Tab */}
        <TabsContent value="discipline" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <CardTitle>Discipline Check-in</CardTitle>
              </div>
              <CardDescription>
                Track your rule compliance for {format(selectedDate, "MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DisciplineChecklist date={selectedDate} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screenshots" className="space-y-6">
          {/* Unlinked Screenshots - upload now, link later */}
          <UnlinkedScreenshots
            date={dateKey}
            onScreenshotLinked={() => setScreenshotRefreshKey(k => k + 1)}
          />

          {/* Trade Screenshots - linked to specific trades */}
          <JournalScreenshots date={dateKey} refreshKey={screenshotRefreshKey} />
        </TabsContent>
      </Tabs>
        </>
      )}

      {/* Share to Feed Dialog */}
      <CustomDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Share to Feed</CustomDialogTitle>
            <CustomDialogDescription>
              Add an optional comment to share with your trade
            </CustomDialogDescription>
          </CustomDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="What's the story behind this trade? Share your thought process, lessons learned, or any insights..."
              value={shareComment}
              onChange={(e) => setShareComment(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This will be visible to everyone on the public feed.
            </p>
          </div>
          <CustomDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowShareDialog(false);
                setShareTradeId(null);
                setShareComment("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmShare} disabled={isSharing}>
              {isSharing ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Share to Feed
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>
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

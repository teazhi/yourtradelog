"use client";

import * as React from "react";
import { format, parseISO, startOfDay, addDays, subDays } from "date-fns";
import {
  Calendar,
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
  Brain,
  TrendingUp,
  TrendingDown,
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
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { DailyJournal, Trade } from "@/types/database";

// Star Rating component
function StarRating({
  value,
  onChange,
  disabled = false,
  label,
}: {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  label: string;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
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

export default function JournalPage() {
  const [selectedDate, setSelectedDate] = React.useState<Date>(
    startOfDay(new Date())
  );
  const [journal, setJournal] = React.useState<DailyJournal | null>(null);
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Form state
  const [preMarketNotes, setPreMarketNotes] = React.useState("");
  const [postMarketNotes, setPostMarketNotes] = React.useState("");
  const [moodRating, setMoodRating] = React.useState<number | null>(null);
  const [focusRating, setFocusRating] = React.useState<number | null>(null);
  const [disciplineRating, setDisciplineRating] = React.useState<number | null>(
    null
  );
  const [goals, setGoals] = React.useState<string[]>([]);
  const [newGoal, setNewGoal] = React.useState("");

  // Format date for database query (YYYY-MM-DD)
  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Fetch journal and trades for selected date
  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setJournal(null);
          setTrades([]);
          setIsLoading(false);
          return;
        }

        // Fetch journal entry for this date
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: journalData, error: journalError } = await (supabase
          .from("daily_journals") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("date", dateKey)
          .single();

        if (journalError && journalError.code !== "PGRST116") {
          // PGRST116 = no rows returned
          console.error("Error fetching journal:", journalError);
        }

        // Fetch trades for this date
        const startOfDayStr = `${dateKey}T00:00:00.000Z`;
        const endOfDayStr = `${dateKey}T23:59:59.999Z`;

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

        // Set journal data
        if (journalData) {
          setJournal(journalData);
          setPreMarketNotes(journalData.pre_market_notes || "");
          setPostMarketNotes(journalData.post_market_notes || "");
          setMoodRating(journalData.mood_rating);
          setFocusRating(journalData.focus_rating);
          setDisciplineRating(journalData.discipline_rating);
          setGoals(journalData.goals || []);
        } else {
          setJournal(null);
          setPreMarketNotes("");
          setPostMarketNotes("");
          setMoodRating(null);
          setFocusRating(null);
          setDisciplineRating(null);
          setGoals([]);
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
  }, [dateKey]);

  // Track changes
  React.useEffect(() => {
    if (!isLoading) {
      const currentValues = {
        preMarketNotes,
        postMarketNotes,
        moodRating,
        focusRating,
        disciplineRating,
        goals: JSON.stringify(goals),
      };

      const originalValues = {
        preMarketNotes: journal?.pre_market_notes || "",
        postMarketNotes: journal?.post_market_notes || "",
        moodRating: journal?.mood_rating || null,
        focusRating: journal?.focus_rating || null,
        disciplineRating: journal?.discipline_rating || null,
        goals: JSON.stringify(journal?.goals || []),
      };

      setHasChanges(
        JSON.stringify(currentValues) !== JSON.stringify(originalValues)
      );
    }
  }, [
    preMarketNotes,
    postMarketNotes,
    moodRating,
    focusRating,
    disciplineRating,
    goals,
    journal,
    isLoading,
  ]);

  // Save journal entry
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to save journal entries");
        return;
      }

      const journalData = {
        user_id: user.id,
        date: dateKey,
        pre_market_notes: preMarketNotes || null,
        post_market_notes: postMarketNotes || null,
        mood_rating: moodRating,
        focus_rating: focusRating,
        discipline_rating: disciplineRating,
        goals,
      };

      if (journal?.id) {
        // Update existing journal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase
          .from("daily_journals") as any)
          .update(journalData)
          .eq("id", journal.id);

        if (error) throw error;
      } else {
        // Create new journal
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase
          .from("daily_journals") as any)
          .insert(journalData)
          .select()
          .single();

        if (error) throw error;
        setJournal(data as DailyJournal);
      }

      setHasChanges(false);
      toast.success("Journal saved successfully");
    } catch (error) {
      console.error("Error saving journal:", error);
      toast.error("Failed to save journal");
    } finally {
      setIsSaving(false);
    }
  };

  // Add a goal
  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  // Remove a goal
  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  // Calculate daily P&L
  const dailyPnL = trades
    .filter((t) => t.status === "closed")
    .reduce((sum, t) => sum + (t.net_pnl || 0), 0);

  const winCount = trades.filter(
    (t) => t.status === "closed" && (t.net_pnl || 0) > 0
  ).length;
  const lossCount = trades.filter(
    (t) => t.status === "closed" && (t.net_pnl || 0) < 0
  ).length;

  // Navigate dates
  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(startOfDay(new Date()));

  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const isFutureDate = selectedDate > new Date();

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
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Daily Journal</h1>
          <p className="text-muted-foreground">
            Track your mindset, goals, and reflections for each trading day.
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
                {format(selectedDate, "EEEE, MMMM d, yyyy")}
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

      {/* Daily Summary */}
      {trades.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Trading Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net P&L</p>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    dailyPnL >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {dailyPnL >= 0 ? "+" : ""}
                  {dailyPnL.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Trades</p>
                <p className="text-2xl font-bold">{trades.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Wins</p>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">{winCount}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Losses</p>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <p className="text-2xl font-bold text-red-600">{lossCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pre-Market Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <CardTitle>Pre-Market Preparation</CardTitle>
            </div>
            <CardDescription>
              Set your intentions and prepare mentally before the market opens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Goals */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Today's Goals</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a goal for today..."
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
              {goals.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="flex items-center gap-1 py-1"
                    >
                      {goal}
                      <button
                        onClick={() => handleRemoveGoal(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Pre-Market Notes */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Pre-Market Notes</span>
              <Textarea
                placeholder="What's your game plan for today? Key levels to watch? Market conditions?"
                className="min-h-[120px] resize-y"
                value={preMarketNotes}
                onChange={(e) => setPreMarketNotes(e.target.value)}
              />
            </div>

            {/* Mood Rating */}
            <StarRating
              label="Starting Mood"
              value={moodRating}
              onChange={setMoodRating}
            />
          </CardContent>
        </Card>

        {/* Post-Market Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              <CardTitle>Post-Market Review</CardTitle>
            </div>
            <CardDescription>
              Reflect on your trading day and identify areas for improvement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Post-Market Notes */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Post-Market Notes</span>
              <Textarea
                placeholder="How did today go? What worked? What didn't? Key lessons learned?"
                className="min-h-[120px] resize-y"
                value={postMarketNotes}
                onChange={(e) => setPostMarketNotes(e.target.value)}
              />
            </div>

            {/* Ratings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <StarRating
                label="Focus Level"
                value={focusRating}
                onChange={setFocusRating}
              />
              <StarRating
                label="Discipline"
                value={disciplineRating}
                onChange={setDisciplineRating}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Journal
            </>
          )}
        </Button>
      </div>

      {/* Today's Trades */}
      {trades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Trades</CardTitle>
            <CardDescription>
              {trades.length} trade{trades.length !== 1 ? "s" : ""} taken on{" "}
              {format(selectedDate, "MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={trade.side === "long" ? "default" : "secondary"}
                      className={cn(
                        trade.side === "long"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      )}
                    >
                      {trade.side.toUpperCase()}
                    </Badge>
                    <div>
                      <p className="font-medium">{trade.symbol}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(trade.entry_date), "h:mm a")}
                        {trade.exit_date &&
                          ` - ${format(new Date(trade.exit_date), "h:mm a")}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {trade.status === "closed" && trade.net_pnl !== null && (
                      <p
                        className={cn(
                          "font-bold",
                          trade.net_pnl >= 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {trade.net_pnl >= 0 ? "+" : ""}
                        {trade.net_pnl.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </p>
                    )}
                    {trade.status === "open" && (
                      <Badge variant="outline">Open</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

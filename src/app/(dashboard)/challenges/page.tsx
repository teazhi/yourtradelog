"use client";

import * as React from "react";
import {
  Target,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Circle,
  Clock,
  Zap,
  Award,
  RefreshCw,
  BookOpen,
  PenTool,
  BarChart3,
  Eye,
  Brain,
  Shield,
  Lightbulb,
  ClipboardCheck,
  Focus,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  cn,
  Progress,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import {
  getLevelFromXP,
  getNextLevel,
  getLevelProgress,
  getXPToNextLevel,
  formatXP,
  TRADER_LEVELS,
  type TraderLevel,
} from "@/lib/leveling";

interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  type: "daily" | "weekly";
  target: number;
  unit: string;
  xp: number;
  checkProgress: (stats: ChallengeStats) => number;
}

interface ChallengeStats {
  journalToday: boolean;
  journalsThisWeek: number;
  reviewedTrades: number;
  reviewedTradesToday: number;
  notesAddedToday: number;
  hasPreMarketNote: boolean;
  hasPostMarketNote: boolean;
  weeklyReviewCompleted: boolean;
  lessonsDocumented: number;
  lessonsDocumentedToday: number;
  allTradesHaveNotes: boolean;
  tradesWithSetup: number;
  tradesWithStopLoss: number;
  screenshotsAdded: number;
}

interface ActiveChallenge extends Challenge {
  progress: number;
  completed: boolean;
  claimed?: boolean; // XP has been awarded for this challenge
}

// Seeded random number generator based on date
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Get today's date as a seed (same challenges for everyone on the same day)
function getTodaySeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

// Shuffle array with seed
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// All possible daily challenges - we'll rotate through these
const ALL_DAILY_CHALLENGES: Challenge[] = [
  {
    id: "write_journal",
    name: "Reflective Trader",
    description: "Write a journal entry today",
    icon: PenTool,
    type: "daily",
    target: 1,
    unit: "entry",
    xp: 15,
    checkProgress: (stats) => stats.journalToday ? 1 : 0,
  },
  {
    id: "add_notes",
    name: "Detailed Logger",
    description: "Add notes to your trades today",
    icon: BookOpen,
    type: "daily",
    target: 1,
    unit: "trade with notes",
    xp: 20,
    checkProgress: (stats) => Math.min(stats.notesAddedToday, 1),
  },
  {
    id: "review_trade",
    name: "Trade Analyst",
    description: "Rate a past trade's entry, exit, or management",
    icon: Target,
    type: "daily",
    target: 1,
    unit: "trade reviewed",
    xp: 15,
    checkProgress: (stats) => Math.min(stats.reviewedTradesToday, 1),
  },
  {
    id: "pre_market_prep",
    name: "Prepared Trader",
    description: "Complete your pre-market preparation",
    icon: Zap,
    type: "daily",
    target: 1,
    unit: "pre-market note",
    xp: 20,
    checkProgress: (stats) => stats.hasPreMarketNote ? 1 : 0,
  },
  {
    id: "post_market_review",
    name: "End of Day Review",
    description: "Write your post-market analysis",
    icon: Eye,
    type: "daily",
    target: 1,
    unit: "post-market note",
    xp: 20,
    checkProgress: (stats) => stats.hasPostMarketNote ? 1 : 0,
  },
  {
    id: "document_lesson",
    name: "Lesson Learned",
    description: "Document a lesson from one of your trades",
    icon: Lightbulb,
    type: "daily",
    target: 1,
    unit: "lesson",
    xp: 25,
    checkProgress: (stats) => Math.min(stats.lessonsDocumentedToday, 1),
  },
  {
    id: "use_setup",
    name: "Setup Discipline",
    description: "Tag a trade with a setup/strategy",
    icon: ClipboardCheck,
    type: "daily",
    target: 1,
    unit: "trade with setup",
    xp: 15,
    checkProgress: (stats) => Math.min(stats.tradesWithSetup, 1),
  },
  {
    id: "risk_management",
    name: "Risk Manager",
    description: "Set a stop loss on a trade",
    icon: Shield,
    type: "daily",
    target: 1,
    unit: "trade with stop loss",
    xp: 20,
    checkProgress: (stats) => Math.min(stats.tradesWithStopLoss, 1),
  },
  {
    id: "mindful_trading",
    name: "Mindful Trader",
    description: "Review 2 past trades to identify patterns",
    icon: Brain,
    type: "daily",
    target: 2,
    unit: "trades reviewed",
    xp: 25,
    checkProgress: (stats) => Math.min(stats.reviewedTradesToday, 2),
  },
  {
    id: "focus_session",
    name: "Focused Analysis",
    description: "Add detailed notes to 2 trades",
    icon: Focus,
    type: "daily",
    target: 2,
    unit: "trades with notes",
    xp: 30,
    checkProgress: (stats) => Math.min(stats.notesAddedToday, 2),
  },
];

// Number of daily challenges to show each day
const DAILY_CHALLENGES_COUNT = 3;

// All possible weekly challenges
const ALL_WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: "weekly_journal",
    name: "Weekly Reflection",
    description: "Write 3 journal entries this week",
    icon: PenTool,
    type: "weekly",
    target: 3,
    unit: "entries",
    xp: 40,
    checkProgress: (stats) => stats.journalsThisWeek,
  },
  {
    id: "weekly_review",
    name: "Week in Review",
    description: "Complete your weekly review on the weekend",
    icon: Calendar,
    type: "weekly",
    target: 1,
    unit: "weekly review",
    xp: 50,
    checkProgress: (stats) => stats.weeklyReviewCompleted ? 1 : 0,
  },
  {
    id: "review_trades",
    name: "Trade Analyst",
    description: "Review and rate 5 past trades this week",
    icon: Award,
    type: "weekly",
    target: 5,
    unit: "trades reviewed",
    xp: 45,
    checkProgress: (stats) => stats.reviewedTrades,
  },
  {
    id: "document_lessons",
    name: "Continuous Learner",
    description: "Document lessons learned from 3 trades",
    icon: TrendingUp,
    type: "weekly",
    target: 3,
    unit: "lessons documented",
    xp: 35,
    checkProgress: (stats) => stats.lessonsDocumented,
  },
  {
    id: "consistent_logging",
    name: "Disciplined Logger",
    description: "Log notes on all your trades this week",
    icon: BarChart3,
    type: "weekly",
    target: 1,
    unit: "week complete",
    xp: 60,
    checkProgress: (stats) => stats.allTradesHaveNotes ? 1 : 0,
  },
  {
    id: "setup_master",
    name: "Setup Master",
    description: "Tag 5 trades with setups this week",
    icon: ClipboardCheck,
    type: "weekly",
    target: 5,
    unit: "trades tagged",
    xp: 40,
    checkProgress: (stats) => stats.tradesWithSetup,
  },
  {
    id: "risk_discipline",
    name: "Risk Discipline",
    description: "Set stop losses on 5 trades this week",
    icon: Shield,
    type: "weekly",
    target: 5,
    unit: "trades with SL",
    xp: 50,
    checkProgress: (stats) => stats.tradesWithStopLoss,
  },
  {
    id: "pattern_hunter",
    name: "Pattern Hunter",
    description: "Review and rate 3 winning AND 3 losing trades",
    icon: Brain,
    type: "weekly",
    target: 6,
    unit: "trades reviewed",
    xp: 55,
    checkProgress: (stats) => stats.reviewedTrades,
  },
];

// Number of weekly challenges to show
const WEEKLY_CHALLENGES_COUNT = 4;

// Get week number for seeding weekly challenges
function getWeekSeed(): number {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return today.getFullYear() * 100 + weekNumber;
}

// Get period key for tracking challenge completions
function getDailyPeriodKey(): string {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getWeeklyPeriodKey(): string {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((today.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${today.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`; // YYYY-WXX
}

interface ChallengeCompletion {
  challenge_id: string;
  period_key: string;
}

export default function ChallengesPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<ChallengeStats>({
    journalToday: false,
    journalsThisWeek: 0,
    reviewedTrades: 0,
    reviewedTradesToday: 0,
    notesAddedToday: 0,
    hasPreMarketNote: false,
    hasPostMarketNote: false,
    weeklyReviewCompleted: false,
    lessonsDocumented: 0,
    lessonsDocumentedToday: 0,
    allTradesHaveNotes: false,
    tradesWithSetup: 0,
    tradesWithStopLoss: 0,
    screenshotsAdded: 0,
  });
  const [sessionXP, setSessionXP] = React.useState(0); // XP earned this session (newly awarded)
  const [totalXP, setTotalXP] = React.useState(0); // Total XP from database
  const [currentLevel, setCurrentLevel] = React.useState<TraderLevel>(TRADER_LEVELS[0]);
  const [showLevelUp, setShowLevelUp] = React.useState(false);
  const [newLevelReached, setNewLevelReached] = React.useState<TraderLevel | null>(null);
  const [completedChallengeIds, setCompletedChallengeIds] = React.useState<Set<string>>(new Set()); // Already claimed

  // Get today's rotating challenges
  const dailyChallengesForToday = React.useMemo(() => {
    const seed = getTodaySeed();
    const shuffled = shuffleWithSeed(ALL_DAILY_CHALLENGES, seed);
    return shuffled.slice(0, DAILY_CHALLENGES_COUNT);
  }, []);

  // Get this week's rotating challenges
  const weeklyChallengesForThisWeek = React.useMemo(() => {
    const seed = getWeekSeed();
    const shuffled = shuffleWithSeed(ALL_WEEKLY_CHALLENGES, seed);
    return shuffled.slice(0, WEEKLY_CHALLENGES_COUNT);
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchChallengeStats();
    }
  }, [mounted]);

  const fetchChallengeStats = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's profile for XP data
      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("total_xp, current_level, trader_title")
        .eq("id", user.id)
        .single();

      const storedXP = profile?.total_xp || 0;
      setTotalXP(storedXP);
      setCurrentLevel(getLevelFromXP(storedXP));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Get start of week (Sunday)
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekStartStr = weekStart.toISOString();

      // Fetch today's trades with more fields
      const { data: todayTrades } = await supabase
        .from("trades")
        .select("id, notes, lessons, setup_id, stop_loss, entry_rating, exit_rating, management_rating")
        .eq("user_id", user.id)
        .gte("created_at", todayStr);

      // Fetch this week's trades with more fields
      const { data: weekTrades } = await supabase
        .from("trades")
        .select("id, notes, lessons, setup_id, stop_loss, entry_rating, exit_rating, management_rating")
        .eq("user_id", user.id)
        .gte("entry_date", weekStartStr);

      // Fetch today's journal with content check
      const { data: todayJournal } = await (supabase
        .from("daily_journals") as any)
        .select("id, pre_market_notes, post_market_notes, lessons_learned, trade_notes")
        .eq("user_id", user.id)
        .eq("date", today.toISOString().split('T')[0]);

      // Fetch this week's journals
      const { data: weekJournals } = await (supabase
        .from("daily_journals") as any)
        .select("id, pre_market_notes, post_market_notes, weekly_review_notes, weekly_wins, weekly_improvements, trade_notes")
        .eq("user_id", user.id)
        .gte("date", weekStart.toISOString().split('T')[0]);

      // Fetch reviewed trades this week (trades with ratings)
      const { count: reviewedCount } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("entry_date", weekStartStr)
        .not("entry_rating", "is", null);

      // Check if today's journal has pre-market notes
      const hasPreMarketNote = todayJournal?.some((j: any) =>
        j.pre_market_notes && j.pre_market_notes.trim().length > 0
      ) || false;

      // Check if today's journal has post-market notes
      const hasPostMarketNote = todayJournal?.some((j: any) =>
        j.post_market_notes && j.post_market_notes.trim().length > 0
      ) || false;

      // Helper to check if trade_notes has content
      const hasTradeNotesContent = (tradeNotes: any[]): boolean => {
        if (!Array.isArray(tradeNotes)) return false;
        return tradeNotes.some((t: any) =>
          (t.notes && t.notes.trim().length > 0) ||
          (t.lessons && t.lessons.trim().length > 0) ||
          (Array.isArray(t.whatWentWell) && t.whatWentWell.length > 0) ||
          (Array.isArray(t.mistakesMade) && t.mistakesMade.length > 0)
        );
      };

      // Check if journal has content (for journalToday)
      const journalToday = todayJournal?.some((j: any) =>
        (j.pre_market_notes && j.pre_market_notes.trim().length > 0) ||
        (j.post_market_notes && j.post_market_notes.trim().length > 0) ||
        (j.lessons_learned && j.lessons_learned.trim().length > 0) ||
        hasTradeNotesContent(j.trade_notes)
      ) || false;

      // Count journals with content this week
      const journalsThisWeek = (weekJournals || []).filter((j: any) =>
        (j.pre_market_notes && j.pre_market_notes.trim().length > 0) ||
        (j.post_market_notes && j.post_market_notes.trim().length > 0) ||
        j.weekly_review_notes || j.weekly_wins || j.weekly_improvements ||
        hasTradeNotesContent(j.trade_notes)
      ).length;

      // Check if weekly review is completed (weekend journal with review content)
      const weeklyReviewCompleted = (weekJournals || []).some((j: any) =>
        (j.weekly_review_notes && j.weekly_review_notes.trim().length > 0) ||
        (j.weekly_wins && j.weekly_wins.trim().length > 0) ||
        (j.weekly_improvements && j.weekly_improvements.trim().length > 0)
      );

      // Count trades with notes today
      const notesAddedToday = (todayTrades || []).filter((t: any) =>
        t.notes && t.notes.trim() !== ""
      ).length;

      // Count trades with lessons documented this week
      const lessonsDocumented = (weekTrades || []).filter((t: any) =>
        t.lessons && t.lessons.trim() !== ""
      ).length;

      // Count trades with lessons documented today
      const lessonsDocumentedToday = (todayTrades || []).filter((t: any) =>
        t.lessons && t.lessons.trim() !== ""
      ).length;

      // Check if all trades this week have notes
      const allTradesHaveNotes = (weekTrades || []).length > 0 &&
        (weekTrades || []).every((t: any) => t.notes && t.notes.trim() !== "");

      // Count trades with setups this week
      const tradesWithSetup = (weekTrades || []).filter((t: any) =>
        t.setup_id !== null
      ).length;

      // Count trades with stop losses this week
      const tradesWithStopLoss = (weekTrades || []).filter((t: any) =>
        t.stop_loss !== null
      ).length;

      // Count trades reviewed today
      const reviewedTradesToday = (todayTrades || []).filter((t: any) =>
        t.entry_rating !== null || t.exit_rating !== null || t.management_rating !== null
      ).length;

      const newStats: ChallengeStats = {
        journalToday,
        journalsThisWeek,
        reviewedTrades: reviewedCount || 0,
        reviewedTradesToday,
        notesAddedToday,
        hasPreMarketNote,
        hasPostMarketNote,
        weeklyReviewCompleted,
        lessonsDocumented,
        lessonsDocumentedToday,
        allTradesHaveNotes,
        tradesWithSetup,
        tradesWithStopLoss,
        screenshotsAdded: 0, // TODO: implement when screenshots are added
      };

      setStats(newStats);

      // Get period keys for today and this week
      const dailyPeriodKey = getDailyPeriodKey();
      const weeklyPeriodKey = getWeeklyPeriodKey();

      // Fetch already completed challenges for current periods
      const { data: existingCompletions } = await (supabase
        .from("challenge_completions") as any)
        .select("challenge_id, period_key")
        .eq("user_id", user.id)
        .in("period_key", [dailyPeriodKey, weeklyPeriodKey]);

      // Build set of already completed challenge IDs for current periods
      const alreadyCompleted = new Set<string>();
      (existingCompletions || []).forEach((c: ChallengeCompletion) => {
        alreadyCompleted.add(`${c.challenge_id}-${c.period_key}`);
      });
      setCompletedChallengeIds(alreadyCompleted);

      // Find newly completed challenges that haven't been claimed yet
      const newlyCompleted: { challenge: Challenge; periodKey: string }[] = [];

      // Check daily challenges
      dailyChallengesForToday.forEach(challenge => {
        const progress = challenge.checkProgress(newStats);
        const completionKey = `${challenge.id}-${dailyPeriodKey}`;
        if (progress >= challenge.target && !alreadyCompleted.has(completionKey)) {
          newlyCompleted.push({ challenge, periodKey: dailyPeriodKey });
        }
      });

      // Check weekly challenges
      weeklyChallengesForThisWeek.forEach(challenge => {
        const progress = challenge.checkProgress(newStats);
        const completionKey = `${challenge.id}-${weeklyPeriodKey}`;
        if (progress >= challenge.target && !alreadyCompleted.has(completionKey)) {
          newlyCompleted.push({ challenge, periodKey: weeklyPeriodKey });
        }
      });

      // Award XP for newly completed challenges using secure RPC function
      if (newlyCompleted.length > 0) {
        let totalNewXP = 0;
        let latestTotalXP = storedXP;
        let latestLevel = getLevelFromXP(storedXP);
        const previousLevel = latestLevel;

        // Call secure RPC function for each completed challenge
        // The function validates server-side before awarding XP
        for (const { challenge, periodKey } of newlyCompleted) {
          const { data, error } = await (supabase.rpc as any)('complete_challenge', {
            p_challenge_id: challenge.id,
            p_challenge_type: challenge.type,
            p_period_key: periodKey
          });

          // Response is JSON: { success, xp_awarded, new_total_xp, new_level, new_title } or { success: false, error }
          const result = data as { success: boolean; xp_awarded?: number; new_total_xp?: number; error?: string } | null;

          if (!error && result?.success) {
            totalNewXP += result.xp_awarded || 0;
            latestTotalXP = result.new_total_xp || latestTotalXP;
            latestLevel = getLevelFromXP(latestTotalXP);
            // Add to local completed set
            alreadyCompleted.add(`${challenge.id}-${periodKey}`);
          } else if (error) {
            console.error('Error completing challenge:', challenge.id, error);
          }
        }

        if (totalNewXP > 0) {
          setSessionXP(totalNewXP);

          // Check for level up
          if (latestLevel.level > previousLevel.level) {
            setNewLevelReached(latestLevel);
            setShowLevelUp(true);
          }

          setTotalXP(latestTotalXP);
          setCurrentLevel(latestLevel);
          setCompletedChallengeIds(alreadyCompleted);

          toast.success(`+${totalNewXP} XP earned!`);
        }
      }
    } catch (err) {
      console.error("Error fetching challenge stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveChallenges = (challenges: Challenge[], periodKey: string): ActiveChallenge[] => {
    return challenges.map(challenge => {
      const progress = challenge.checkProgress(stats);
      const completionKey = `${challenge.id}-${periodKey}`;
      const claimed = completedChallengeIds.has(completionKey);
      return {
        ...challenge,
        progress,
        completed: progress >= challenge.target,
        claimed, // XP has already been awarded
      };
    });
  };

  const dailyChallenges = getActiveChallenges(dailyChallengesForToday, getDailyPeriodKey());
  const weeklyChallenges = getActiveChallenges(weeklyChallengesForThisWeek, getWeeklyPeriodKey());

  const completedDaily = dailyChallenges.filter(c => c.completed).length;
  const completedWeekly = weeklyChallenges.filter(c => c.completed).length;

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const nextLevel = getNextLevel(currentLevel.level);
  const levelProgress = getLevelProgress(totalXP);
  const xpToNext = getXPToNextLevel(totalXP);

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Level Up Modal */}
      {showLevelUp && newLevelReached && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center animate-in zoom-in-95 duration-300">
            <CardContent className="pt-8 pb-6">
              <div className="text-6xl mb-4">{newLevelReached.badge}</div>
              <h2 className="text-2xl font-bold mb-2">Level Up!</h2>
              <p className={cn("text-xl font-semibold mb-1", newLevelReached.color)}>
                {newLevelReached.title}
              </p>
              <p className="text-muted-foreground mb-4">
                You've reached Level {newLevelReached.level}!
              </p>
              <Button onClick={() => setShowLevelUp(false)}>
                Continue Trading
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground">
          Complete daily and weekly challenges to build good trading habits and level up
        </p>
      </div>

      {/* Level & XP Card */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 text-white overflow-hidden">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Level Badge */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-4xl shadow-lg">
                {currentLevel.badge}
              </div>
              <div>
                <div className="text-sm text-slate-400 uppercase tracking-wide">Level {currentLevel.level}</div>
                <div className={cn("text-2xl font-bold", currentLevel.color.replace("text-", "text-"))}>{currentLevel.title}</div>
                <div className="text-lg font-semibold text-amber-400">{formatXP(totalXP)} XP</div>
              </div>
            </div>

            {/* Progress to Next Level */}
            <div className="flex-1">
              {nextLevel ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progress to {nextLevel.title}</span>
                    <span className="text-slate-300">{xpToNext} XP to go</span>
                  </div>
                  <Progress value={levelProgress} className="h-3 bg-slate-700 [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-orange-500" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{formatXP(currentLevel.minXP)} XP</span>
                    <span>{formatXP(nextLevel.minXP)} XP</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2">
                  <span className="text-amber-400 font-semibold">Max Level Reached!</span>
                  <p className="text-sm text-slate-400">You're a true Market Wizard</p>
                </div>
              )}
            </div>

            {/* Session XP */}
            {sessionXP > 0 && (
              <div className="text-center md:text-right">
                <div className="text-sm text-slate-400">Earned Today</div>
                <div className="text-xl font-bold text-green-400">+{sessionXP} XP</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Challenge Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{completedDaily}/{DAILY_CHALLENGES_COUNT}</div>
            <div className="text-sm text-muted-foreground">Daily Challenges</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{completedWeekly}/{WEEKLY_CHALLENGES_COUNT}</div>
            <div className="text-sm text-muted-foreground">Weekly Challenges</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Challenges */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Daily Challenges</h2>
          </div>
          <Badge variant="outline">
            Resets at midnight
          </Badge>
        </div>
        <div className="grid gap-4">
          {dailyChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </div>

      {/* Weekly Challenges */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Weekly Challenges</h2>
          </div>
          <Badge variant="outline">
            Resets on Sunday
          </Badge>
        </div>
        <div className="grid gap-4">
          {weeklyChallenges.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: ActiveChallenge }) {
  const progressPercent = Math.min(100, (challenge.progress / challenge.target) * 100);
  const isClaimed = challenge.claimed;
  const isReady = challenge.completed && !isClaimed;

  return (
    <Card className={cn(
      "transition-all",
      isClaimed && "bg-green-500/5 border-green-500/30",
      isReady && "bg-amber-500/5 border-amber-500/30 animate-pulse"
    )}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            isClaimed ? "bg-green-500/20" : isReady ? "bg-amber-500/20" : "bg-muted"
          )}>
            {isClaimed ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : isReady ? (
              <Zap className="h-6 w-6 text-amber-500" />
            ) : (
              <challenge.icon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{challenge.name}</h3>
                {isClaimed && (
                  <Badge className="bg-green-500 text-white">Claimed!</Badge>
                )}
                {isReady && (
                  <Badge className="bg-amber-500 text-white animate-bounce">Ready!</Badge>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  isClaimed && "text-green-500 border-green-500",
                  isReady && "text-amber-500 border-amber-500"
                )}
              >
                {isClaimed ? "✓ " : ""}+{challenge.xp} XP
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{challenge.progress} / {challenge.target} {challenge.unit}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress
                value={progressPercent}
                className={cn(
                  "h-2",
                  isClaimed && "[&>div]:bg-green-500",
                  isReady && "[&>div]:bg-amber-500"
                )}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

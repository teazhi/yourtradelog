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
  notesAddedToday: number;
  hasPreMarketNote: boolean;
  weeklyReviewCompleted: boolean;
  lessonsDocumented: number;
  allTradesHaveNotes: boolean;
}

interface ActiveChallenge extends Challenge {
  progress: number;
  completed: boolean;
}

const DAILY_CHALLENGES: Challenge[] = [
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
    checkProgress: (stats) => Math.min(stats.reviewedTrades, 1),
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
];

const WEEKLY_CHALLENGES: Challenge[] = [
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
    description: "Review and rate 3 past trades",
    icon: Award,
    type: "weekly",
    target: 3,
    unit: "trades reviewed",
    xp: 45,
    checkProgress: (stats) => stats.reviewedTrades,
  },
  {
    id: "document_lessons",
    name: "Continuous Learner",
    description: "Document lessons learned from your trades",
    icon: TrendingUp,
    type: "weekly",
    target: 2,
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
];

export default function ChallengesPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<ChallengeStats>({
    journalToday: false,
    journalsThisWeek: 0,
    reviewedTrades: 0,
    notesAddedToday: 0,
    hasPreMarketNote: false,
    weeklyReviewCompleted: false,
    lessonsDocumented: 0,
    allTradesHaveNotes: false,
  });
  const [totalXP, setTotalXP] = React.useState(0);

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

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Get start of week (Sunday)
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekStartStr = weekStart.toISOString();

      // Fetch today's trades
      const { data: todayTrades } = await supabase
        .from("trades")
        .select("id, notes, lessons")
        .eq("user_id", user.id)
        .gte("created_at", todayStr);

      // Fetch this week's trades
      const { data: weekTrades } = await supabase
        .from("trades")
        .select("id, notes, lessons")
        .eq("user_id", user.id)
        .gte("entry_date", weekStartStr);

      // Fetch today's journal with content check
      const { data: todayJournal } = await (supabase
        .from("daily_journals") as any)
        .select("id, pre_market_notes, post_market_notes, lessons_learned")
        .eq("user_id", user.id)
        .eq("date", today.toISOString().split('T')[0]);

      // Fetch this week's journals
      const { data: weekJournals } = await (supabase
        .from("daily_journals") as any)
        .select("id, pre_market_notes, weekly_review_notes, weekly_wins, weekly_improvements")
        .eq("user_id", user.id)
        .gte("date", weekStart.toISOString().split('T')[0]);

      // Fetch reviewed trades (trades with ratings)
      const { count: reviewedCount } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("entry_rating", "is", null);

      // Check if today's journal has pre-market notes
      const hasPreMarketNote = todayJournal?.some((j: any) =>
        j.pre_market_notes && j.pre_market_notes.trim().length > 0
      ) || false;

      // Check if journal has content (for journalToday)
      const journalToday = todayJournal?.some((j: any) =>
        (j.pre_market_notes && j.pre_market_notes.trim().length > 0) ||
        (j.post_market_notes && j.post_market_notes.trim().length > 0) ||
        (j.lessons_learned && j.lessons_learned.trim().length > 0)
      ) || false;

      // Count journals with content this week
      const journalsThisWeek = (weekJournals || []).filter((j: any) =>
        (j.pre_market_notes && j.pre_market_notes.trim().length > 0) ||
        j.weekly_review_notes || j.weekly_wins || j.weekly_improvements
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

      // Check if all trades this week have notes
      const allTradesHaveNotes = (weekTrades || []).length > 0 &&
        (weekTrades || []).every((t: any) => t.notes && t.notes.trim() !== "");

      const newStats: ChallengeStats = {
        journalToday,
        journalsThisWeek,
        reviewedTrades: reviewedCount || 0,
        notesAddedToday,
        hasPreMarketNote,
        weeklyReviewCompleted,
        lessonsDocumented,
        allTradesHaveNotes,
      };

      setStats(newStats);

      // Calculate total XP from completed challenges
      let xp = 0;
      [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].forEach(challenge => {
        const progress = challenge.checkProgress(newStats);
        if (progress >= challenge.target) {
          xp += challenge.xp;
        }
      });
      setTotalXP(xp);
    } catch (err) {
      console.error("Error fetching challenge stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getActiveChallenges = (challenges: Challenge[]): ActiveChallenge[] => {
    return challenges.map(challenge => {
      const progress = challenge.checkProgress(stats);
      return {
        ...challenge,
        progress,
        completed: progress >= challenge.target,
      };
    });
  };

  const dailyChallenges = getActiveChallenges(DAILY_CHALLENGES);
  const weeklyChallenges = getActiveChallenges(WEEKLY_CHALLENGES);

  const completedDaily = dailyChallenges.filter(c => c.completed).length;
  const completedWeekly = weeklyChallenges.filter(c => c.completed).length;

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Challenges</h1>
        <p className="text-muted-foreground">
          Complete daily and weekly challenges to build good trading habits
        </p>
      </div>

      {/* XP & Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="pt-6 text-center">
            <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-3xl font-bold text-green-600">{totalXP} XP</div>
            <div className="text-sm text-muted-foreground">Earned This Week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{completedDaily}/{DAILY_CHALLENGES.length}</div>
            <div className="text-sm text-muted-foreground">Daily Challenges</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{completedWeekly}/{WEEKLY_CHALLENGES.length}</div>
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

  return (
    <Card className={cn(
      "transition-all",
      challenge.completed && "bg-green-500/5 border-green-500/30"
    )}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center",
            challenge.completed ? "bg-green-500/20" : "bg-muted"
          )}>
            {challenge.completed ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <challenge.icon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{challenge.name}</h3>
                {challenge.completed && (
                  <Badge className="bg-green-500 text-white">Complete!</Badge>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                +{challenge.xp} XP
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{challenge.progress} / {challenge.target} {challenge.unit}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className={cn("h-2", challenge.completed && "[&>div]:bg-green-500")} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

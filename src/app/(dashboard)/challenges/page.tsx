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
  tradesToday: number;
  tradesThisWeek: number;
  journalToday: boolean;
  journalsThisWeek: number;
  reviewedTrades: number;
  notesAddedToday: number;
  greenDaysThisWeek: number;
}

interface ActiveChallenge extends Challenge {
  progress: number;
  completed: boolean;
}

const DAILY_CHALLENGES: Challenge[] = [
  {
    id: "log_trade",
    name: "Active Trader",
    description: "Log at least 1 trade today",
    icon: Target,
    type: "daily",
    target: 1,
    unit: "trade",
    xp: 10,
    checkProgress: (stats) => stats.tradesToday,
  },
  {
    id: "log_3_trades",
    name: "Busy Day",
    description: "Log 3 trades today",
    icon: Zap,
    type: "daily",
    target: 3,
    unit: "trades",
    xp: 25,
    checkProgress: (stats) => stats.tradesToday,
  },
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
    description: "Add notes to at least 2 trades today",
    icon: BookOpen,
    type: "daily",
    target: 2,
    unit: "trades with notes",
    xp: 20,
    checkProgress: (stats) => stats.notesAddedToday,
  },
];

const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: "weekly_5_trades",
    name: "Consistent Trader",
    description: "Log at least 5 trades this week",
    icon: Calendar,
    type: "weekly",
    target: 5,
    unit: "trades",
    xp: 50,
    checkProgress: (stats) => stats.tradesThisWeek,
  },
  {
    id: "weekly_10_trades",
    name: "Power Week",
    description: "Log 10 trades this week",
    icon: TrendingUp,
    type: "weekly",
    target: 10,
    unit: "trades",
    xp: 75,
    checkProgress: (stats) => stats.tradesThisWeek,
  },
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
    id: "green_week",
    name: "Green Streak",
    description: "Have 3 profitable days this week",
    icon: BarChart3,
    type: "weekly",
    target: 3,
    unit: "green days",
    xp: 100,
    checkProgress: (stats) => stats.greenDaysThisWeek,
  },
  {
    id: "review_trades",
    name: "Trade Analyst",
    description: "Review and rate 5 past trades",
    icon: Award,
    type: "weekly",
    target: 5,
    unit: "trades reviewed",
    xp: 60,
    checkProgress: (stats) => stats.reviewedTrades,
  },
];

export default function ChallengesPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<ChallengeStats>({
    tradesToday: 0,
    tradesThisWeek: 0,
    journalToday: false,
    journalsThisWeek: 0,
    reviewedTrades: 0,
    notesAddedToday: 0,
    greenDaysThisWeek: 0,
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
        .select("id, notes, net_pnl, entry_date")
        .eq("user_id", user.id)
        .gte("created_at", todayStr);

      // Fetch this week's trades
      const { data: weekTrades } = await supabase
        .from("trades")
        .select("id, net_pnl, entry_date")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .gte("entry_date", weekStartStr);

      // Fetch today's journal
      const { data: todayJournal } = await supabase
        .from("daily_journals")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today.toISOString().split('T')[0]);

      // Fetch this week's journals
      const { count: weekJournals } = await supabase
        .from("daily_journals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("date", weekStart.toISOString().split('T')[0]);

      // Fetch reviewed trades (trades with ratings)
      const { count: reviewedCount } = await supabase
        .from("trades")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("entry_rating", "is", null);

      // Calculate green days this week
      const dailyPnl: Record<string, number> = {};
      (weekTrades || []).forEach((t: any) => {
        const date = new Date(t.entry_date).toISOString().split('T')[0];
        dailyPnl[date] = (dailyPnl[date] || 0) + (t.net_pnl || 0);
      });
      const greenDaysThisWeek = Object.values(dailyPnl).filter(pnl => pnl > 0).length;

      // Count trades with notes today
      const notesAddedToday = (todayTrades || []).filter((t: any) => t.notes && t.notes.trim() !== "").length;

      setStats({
        tradesToday: todayTrades?.length || 0,
        tradesThisWeek: weekTrades?.length || 0,
        journalToday: (todayJournal?.length || 0) > 0,
        journalsThisWeek: weekJournals || 0,
        reviewedTrades: reviewedCount || 0,
        notesAddedToday,
        greenDaysThisWeek,
      });

      // Calculate total XP from completed challenges
      let xp = 0;
      [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES].forEach(challenge => {
        const progress = challenge.checkProgress({
          tradesToday: todayTrades?.length || 0,
          tradesThisWeek: weekTrades?.length || 0,
          journalToday: (todayJournal?.length || 0) > 0,
          journalsThisWeek: weekJournals || 0,
          reviewedTrades: reviewedCount || 0,
          notesAddedToday,
          greenDaysThisWeek,
        });
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

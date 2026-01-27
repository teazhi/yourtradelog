"use client";

import * as React from "react";
import {
  Trophy,
  Flame,
  Target,
  Calendar,
  Star,
  Award,
  Zap,
  Shield,
  Crown,
  Medal,
  Rocket,
  CheckCircle2,
  Lock,
  BookOpen,
  Repeat,
  Sunrise,
  Moon,
  Brain,
  GraduationCap,
  Lightbulb,
  Camera,
  PenTool,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  cn,
  Progress,
  CelebrationModal,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requirement: number;
  type: "trades" | "streak" | "pnl" | "journal" | "consistency" | "learning" | "special";
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface UserStats {
  totalTrades: number;
  currentStreak: number;
  longestStreak: number;
  totalPnl: number;
  journalEntries: number;
  greenDays: number;
  perfectWeeks: number;
  weeklyReviews: number;
  setups: number;
  tradesWithScreenshots: number;
  hasPreMarketNote: boolean;
  hasPostMarketReview: boolean;
  analyticsViews: number;
}

const ACHIEVEMENTS: Achievement[] = [
  // Trade Logging Achievements - reward consistent logging behavior
  { id: "first_trade", name: "First Steps", description: "Log your first trade", icon: Rocket, color: "text-blue-500", requirement: 1, type: "trades", tier: "bronze" },
  { id: "trades_10", name: "Building Habits", description: "Log 10 trades", icon: Target, color: "text-blue-500", requirement: 10, type: "trades", tier: "bronze" },
  { id: "trades_50", name: "Committed Logger", description: "Log 50 trades", icon: Target, color: "text-gray-400", requirement: 50, type: "trades", tier: "silver" },
  { id: "trades_100", name: "Century Club", description: "Log 100 trades", icon: Trophy, color: "text-yellow-500", requirement: 100, type: "trades", tier: "gold" },
  { id: "trades_500", name: "Trading Historian", description: "Log 500 trades", icon: Crown, color: "text-purple-500", requirement: 500, type: "trades", tier: "platinum" },

  // Streak Achievements - reward consistency
  { id: "streak_3", name: "Momentum", description: "Log trades 3 days in a row", icon: Flame, color: "text-orange-500", requirement: 3, type: "streak", tier: "bronze" },
  { id: "streak_7", name: "Week Warrior", description: "Log trades 7 days in a row", icon: Flame, color: "text-orange-500", requirement: 7, type: "streak", tier: "silver" },
  { id: "streak_30", name: "Monthly Dedication", description: "Log trades 30 days in a row", icon: Flame, color: "text-red-500", requirement: 30, type: "streak", tier: "gold" },
  { id: "streak_100", name: "Unstoppable", description: "Log trades 100 days in a row", icon: Zap, color: "text-yellow-400", requirement: 100, type: "streak", tier: "platinum" },

  // Journal Achievements - reward self-reflection
  { id: "journal_1", name: "Self-Reflection", description: "Write your first journal entry", icon: BookOpen, color: "text-indigo-500", requirement: 1, type: "journal", tier: "bronze" },
  { id: "journal_7", name: "Reflective Trader", description: "Write 7 journal entries", icon: BookOpen, color: "text-indigo-500", requirement: 7, type: "journal", tier: "bronze" },
  { id: "journal_30", name: "Thoughtful Analyst", description: "Write 30 journal entries", icon: PenTool, color: "text-indigo-500", requirement: 30, type: "journal", tier: "silver" },
  { id: "journal_100", name: "Master Journaler", description: "Write 100 journal entries", icon: Brain, color: "text-purple-500", requirement: 100, type: "journal", tier: "gold" },

  // Green Day Achievements - celebrate profitable days without judging strategy
  { id: "green_1", name: "First Green Day", description: "Have your first profitable day", icon: Calendar, color: "text-green-500", requirement: 1, type: "pnl", tier: "bronze" },
  { id: "green_10", name: "Double Digits", description: "Have 10 profitable days", icon: Calendar, color: "text-green-500", requirement: 10, type: "pnl", tier: "bronze" },
  { id: "green_25", name: "Quarter Century", description: "Have 25 profitable days", icon: Calendar, color: "text-green-500", requirement: 25, type: "pnl", tier: "silver" },
  { id: "green_50", name: "Half Century", description: "Have 50 profitable days", icon: Award, color: "text-yellow-500", requirement: 50, type: "pnl", tier: "gold" },
  { id: "green_100", name: "Triple Digits", description: "Have 100 profitable days", icon: Crown, color: "text-purple-500", requirement: 100, type: "pnl", tier: "platinum" },

  // Consistency Achievements - reward showing up regardless of outcome
  { id: "weekly_review_1", name: "Week in Review", description: "Complete your first weekly review", icon: Repeat, color: "text-cyan-500", requirement: 1, type: "consistency", tier: "bronze" },
  { id: "weekly_review_4", name: "Monthly Reviewer", description: "Complete 4 weekly reviews", icon: Repeat, color: "text-cyan-500", requirement: 4, type: "consistency", tier: "silver" },
  { id: "weekly_review_12", name: "Quarterly Commitment", description: "Complete 12 weekly reviews", icon: Shield, color: "text-cyan-500", requirement: 12, type: "consistency", tier: "gold" },

  // Learning Achievements - reward analysis and improvement behavior
  { id: "setup_1", name: "Setup Student", description: "Create your first setup", icon: Lightbulb, color: "text-amber-500", requirement: 1, type: "learning", tier: "bronze" },
  { id: "setup_5", name: "Strategy Builder", description: "Create 5 different setups", icon: Lightbulb, color: "text-amber-500", requirement: 5, type: "learning", tier: "silver" },
  { id: "screenshot_10", name: "Visual Learner", description: "Add screenshots to 10 trades", icon: Camera, color: "text-pink-500", requirement: 10, type: "learning", tier: "bronze" },
  { id: "screenshot_50", name: "Chart Archivist", description: "Add screenshots to 50 trades", icon: Camera, color: "text-pink-500", requirement: 50, type: "learning", tier: "silver" },

  // Special Achievements
  { id: "early_bird", name: "Early Bird", description: "Log a pre-market journal note", icon: Sunrise, color: "text-orange-400", requirement: 1, type: "special", tier: "bronze" },
  { id: "night_owl", name: "Night Owl", description: "Complete a post-market review", icon: Moon, color: "text-indigo-400", requirement: 1, type: "special", tier: "bronze" },
  { id: "perfect_week", name: "Perfect Week", description: "Journal and log trades every trading day for a week", icon: Medal, color: "text-yellow-500", requirement: 1, type: "special", tier: "gold" },
  { id: "data_driven", name: "Data Driven", description: "Use the analytics page 10 times", icon: GraduationCap, color: "text-emerald-500", requirement: 10, type: "special", tier: "silver" },
];

const TIER_COLORS = {
  bronze: "bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-700",
  silver: "bg-gray-100 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600",
  gold: "bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700",
  platinum: "bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-700",
};

export default function AchievementsPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<UserStats>({
    totalTrades: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPnl: 0,
    journalEntries: 0,
    greenDays: 0,
    perfectWeeks: 0,
    weeklyReviews: 0,
    setups: 0,
    tradesWithScreenshots: 0,
    hasPreMarketNote: false,
    hasPostMarketReview: false,
    analyticsViews: 0,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchStats();
    }
  }, [mounted]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all trades with screenshots info
      const { data: trades } = await supabase
        .from("trades")
        .select("id, entry_date, net_pnl, status")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .order("entry_date", { ascending: true });

      // Fetch journal entries with all relevant content fields
      const { data: journals } = await supabase
        .from("daily_journals")
        .select("id, pre_market_notes, post_market_notes, lessons_learned, weekly_review_notes, weekly_wins, weekly_improvements, goals, what_went_well, mistakes_made, mood_rating, focus_rating, discipline_rating, execution_rating")
        .eq("user_id", user.id);

      // Fetch setups count
      const { count: setupsCount } = await supabase
        .from("setups")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      // Fetch trades with screenshots (count distinct trades that have at least one screenshot)
      const { data: screenshotData } = await supabase
        .from("trade_screenshots")
        .select("trade_id")
        .eq("user_id", user.id);

      // Count unique trades that have screenshots
      const uniqueTradesWithScreenshots = new Set(screenshotData?.map((s: any) => s.trade_id) || []);
      const screenshotCount = uniqueTradesWithScreenshots.size;

      // Helper function to check if a journal has meaningful content
      const hasJournalContent = (j: any): boolean => {
        // Check text fields for non-empty content
        const hasTextContent =
          (j.pre_market_notes && j.pre_market_notes.trim().length > 0) ||
          (j.post_market_notes && j.post_market_notes.trim().length > 0) ||
          (j.lessons_learned && j.lessons_learned.trim().length > 0) ||
          (j.weekly_review_notes && j.weekly_review_notes.trim().length > 0) ||
          (j.weekly_wins && j.weekly_wins.trim().length > 0) ||
          (j.weekly_improvements && j.weekly_improvements.trim().length > 0);

        // Check array fields for non-empty content
        const hasArrayContent =
          (Array.isArray(j.goals) && j.goals.length > 0) ||
          (Array.isArray(j.what_went_well) && j.what_went_well.length > 0) ||
          (Array.isArray(j.mistakes_made) && j.mistakes_made.length > 0);

        // Check ratings (any rating set counts as content)
        const hasRatings =
          j.mood_rating !== null ||
          j.focus_rating !== null ||
          j.discipline_rating !== null ||
          j.execution_rating !== null;

        return hasTextContent || hasArrayContent || hasRatings;
      };

      // Count journals that have actual content
      const journalCount = journals?.filter((j: any) => hasJournalContent(j)).length || 0;

      // Count weekly reviews that have content (weekly review specific fields or general content)
      const weeklyReviewCount = journals?.filter((j: any) => {
        const hasWeeklyContent =
          (j.weekly_review_notes && j.weekly_review_notes.trim().length > 0) ||
          (j.weekly_wins && j.weekly_wins.trim().length > 0) ||
          (j.weekly_improvements && j.weekly_improvements.trim().length > 0);
        return hasWeeklyContent;
      }).length || 0;

      const hasPreMarketNote = journals?.some((j: any) => j.pre_market_notes && j.pre_market_notes.trim().length > 0) || false;
      const hasPostMarketReview = journals?.some((j: any) => j.post_market_notes && j.post_market_notes.trim().length > 0) || false;

      let totalTrades = 0;
      let currentStreak = 0;
      let longestStreak = 0;
      let totalPnl = 0;
      let greenDays = 0;

      if (trades && trades.length > 0) {
        totalTrades = trades.length;
        totalPnl = trades.reduce((sum: number, t: any) => sum + (t.net_pnl || 0), 0);

        // Calculate streaks based on trading days
        const tradeDates = [...new Set(trades.map((t: any) =>
          new Date(t.entry_date).toISOString().split('T')[0]
        ))].sort();

        let tempStreak = 1;

        // Calculate consecutive trading days
        for (let i = 1; i < tradeDates.length; i++) {
          const prevDate = new Date(tradeDates[i - 1]);
          const currDate = new Date(tradeDates[i]);
          const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
        longestStreak = Math.max(longestStreak, tempStreak);

        // Check if current streak is active (traded today or yesterday)
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const lastTradeDate = tradeDates[tradeDates.length - 1];

        if (lastTradeDate === today || lastTradeDate === yesterday) {
          currentStreak = tempStreak;
        }

        // Calculate green days (profitable days)
        const dailyPnl: Record<string, number> = {};
        trades.forEach((t: any) => {
          const date = new Date(t.entry_date).toISOString().split('T')[0];
          dailyPnl[date] = (dailyPnl[date] || 0) + (t.net_pnl || 0);
        });
        greenDays = Object.values(dailyPnl).filter(pnl => pnl > 0).length;
      }

      // Calculate perfect weeks (simplified - 5 green days counts as 1 perfect week)
      const perfectWeeks = greenDays >= 5 ? Math.floor(greenDays / 5) : 0;

      setStats({
        totalTrades,
        currentStreak,
        longestStreak,
        totalPnl,
        journalEntries: journalCount,
        greenDays,
        perfectWeeks,
        weeklyReviews: weeklyReviewCount,
        setups: setupsCount || 0,
        tradesWithScreenshots: screenshotCount || 0,
        hasPreMarketNote,
        hasPostMarketReview,
        analyticsViews: 0, // Would need to track this separately
      });
    } catch (err) {
      // Silently handle errors
    } finally {
      setIsLoading(false);
    }
  };

  const getProgress = (achievement: Achievement): number => {
    switch (achievement.type) {
      case "trades":
        return Math.min(100, (stats.totalTrades / achievement.requirement) * 100);
      case "streak":
        return Math.min(100, (stats.longestStreak / achievement.requirement) * 100);
      case "pnl":
        return Math.min(100, (stats.greenDays / achievement.requirement) * 100);
      case "journal":
        return Math.min(100, (stats.journalEntries / achievement.requirement) * 100);
      case "consistency":
        return Math.min(100, (stats.weeklyReviews / achievement.requirement) * 100);
      case "learning":
        // Handle different learning achievements
        if (achievement.id.startsWith("setup_")) {
          return Math.min(100, (stats.setups / achievement.requirement) * 100);
        }
        if (achievement.id.startsWith("screenshot_")) {
          return Math.min(100, (stats.tradesWithScreenshots / achievement.requirement) * 100);
        }
        return 0;
      case "special":
        // Handle individual special achievements
        if (achievement.id === "early_bird") {
          return stats.hasPreMarketNote ? 100 : 0;
        }
        if (achievement.id === "night_owl") {
          return stats.hasPostMarketReview ? 100 : 0;
        }
        if (achievement.id === "perfect_week") {
          return stats.perfectWeeks >= achievement.requirement ? 100 : 0;
        }
        if (achievement.id === "data_driven") {
          return Math.min(100, (stats.analyticsViews / achievement.requirement) * 100);
        }
        return 0;
      default:
        return 0;
    }
  };

  const isUnlocked = (achievement: Achievement): boolean => {
    return getProgress(achievement) >= 100;
  };

  const getCurrentValue = (achievement: Achievement): number | string => {
    switch (achievement.type) {
      case "trades":
        return stats.totalTrades;
      case "streak":
        return stats.longestStreak;
      case "pnl":
        return stats.greenDays;
      case "journal":
        return stats.journalEntries;
      case "consistency":
        return stats.weeklyReviews;
      case "learning":
        if (achievement.id.startsWith("setup_")) {
          return stats.setups;
        }
        if (achievement.id.startsWith("screenshot_")) {
          return stats.tradesWithScreenshots;
        }
        return 0;
      case "special":
        if (achievement.id === "early_bird") {
          return stats.hasPreMarketNote ? "✓" : "—";
        }
        if (achievement.id === "night_owl") {
          return stats.hasPostMarketReview ? "✓" : "—";
        }
        if (achievement.id === "perfect_week") {
          return stats.perfectWeeks;
        }
        if (achievement.id === "data_driven") {
          return stats.analyticsViews;
        }
        return 0;
      default:
        return 0;
    }
  };

  const unlockedCount = ACHIEVEMENTS.filter(a => isUnlocked(a)).length;

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
        <h1 className="text-3xl font-bold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground">
          Track your progress and earn badges as you grow as a trader
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{unlockedCount}/{ACHIEVEMENTS.length}</div>
            <div className="text-sm text-muted-foreground">Unlocked</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{stats.currentStreak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Target className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <div className="text-sm text-muted-foreground">Trades Logged</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BookOpen className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <div className="text-2xl font-bold">{stats.journalEntries}</div>
            <div className="text-sm text-muted-foreground">Journal Entries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{stats.greenDays}</div>
            <div className="text-sm text-muted-foreground">Green Days</div>
          </CardContent>
        </Card>
      </div>

      {/* Current Streak Banner */}
      {stats.currentStreak >= 3 && (
        <Card className="mb-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">🔥 {stats.currentStreak} Day Streak!</h3>
                  <p className="text-sm text-muted-foreground">Keep it going! Log a trade today to maintain your streak.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Longest streak</div>
                <div className="font-semibold">{stats.longestStreak} days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Achievements Grid */}
      <div className="space-y-6">
        {(["bronze", "silver", "gold", "platinum"] as const).map((tier) => {
          const tierAchievements = ACHIEVEMENTS.filter(a => a.tier === tier);
          const tierUnlocked = tierAchievements.filter(a => isUnlocked(a)).length;

          return (
            <div key={tier}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold capitalize">{tier}</h2>
                <Badge variant="outline" className="text-xs">
                  {tierUnlocked}/{tierAchievements.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {tierAchievements.map((achievement) => {
                  const unlocked = isUnlocked(achievement);
                  const progress = getProgress(achievement);
                  const currentValue = getCurrentValue(achievement);

                  return (
                    <Card
                      key={achievement.id}
                      className={cn(
                        "transition-all",
                        unlocked ? TIER_COLORS[tier] : "opacity-60"
                      )}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center",
                            unlocked ? "bg-background" : "bg-muted"
                          )}>
                            {unlocked ? (
                              <achievement.icon className={cn("h-6 w-6", achievement.color)} />
                            ) : (
                              <Lock className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{achievement.name}</h3>
                              {unlocked && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            {!unlocked && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>
                                    {typeof currentValue === "string"
                                      ? currentValue
                                      : `${currentValue} / ${achievement.requirement}`}
                                  </span>
                                  <span>{Math.round(progress)}%</span>
                                </div>
                                <Progress value={progress} className="h-1.5" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


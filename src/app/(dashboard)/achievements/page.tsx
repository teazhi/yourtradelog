"use client";

import * as React from "react";
import {
  Trophy,
  Flame,
  Target,
  TrendingUp,
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
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requirement: number;
  type: "trades" | "streak" | "winrate" | "pnl" | "journal" | "special";
  tier: "bronze" | "silver" | "gold" | "platinum";
}

interface UserStats {
  totalTrades: number;
  currentStreak: number;
  longestStreak: number;
  winRate: number;
  totalPnl: number;
  journalEntries: number;
  greenDays: number;
  perfectWeeks: number;
}

const ACHIEVEMENTS: Achievement[] = [
  // Trade Count Achievements
  { id: "first_trade", name: "First Steps", description: "Log your first trade", icon: Rocket, color: "text-blue-500", requirement: 1, type: "trades", tier: "bronze" },
  { id: "trades_10", name: "Getting Started", description: "Log 10 trades", icon: Target, color: "text-blue-500", requirement: 10, type: "trades", tier: "bronze" },
  { id: "trades_50", name: "Committed Trader", description: "Log 50 trades", icon: Target, color: "text-gray-400", requirement: 50, type: "trades", tier: "silver" },
  { id: "trades_100", name: "Century Club", description: "Log 100 trades", icon: Trophy, color: "text-yellow-500", requirement: 100, type: "trades", tier: "gold" },
  { id: "trades_500", name: "Trading Veteran", description: "Log 500 trades", icon: Crown, color: "text-purple-500", requirement: 500, type: "trades", tier: "platinum" },

  // Streak Achievements
  { id: "streak_3", name: "Momentum", description: "Log trades 3 days in a row", icon: Flame, color: "text-orange-500", requirement: 3, type: "streak", tier: "bronze" },
  { id: "streak_7", name: "Week Warrior", description: "Log trades 7 days in a row", icon: Flame, color: "text-orange-500", requirement: 7, type: "streak", tier: "silver" },
  { id: "streak_30", name: "Monthly Master", description: "Log trades 30 days in a row", icon: Flame, color: "text-red-500", requirement: 30, type: "streak", tier: "gold" },
  { id: "streak_100", name: "Unstoppable", description: "Log trades 100 days in a row", icon: Zap, color: "text-yellow-400", requirement: 100, type: "streak", tier: "platinum" },

  // Win Rate Achievements
  { id: "winrate_50", name: "Break Even Beater", description: "Achieve 50% win rate (min 20 trades)", icon: TrendingUp, color: "text-green-500", requirement: 50, type: "winrate", tier: "bronze" },
  { id: "winrate_60", name: "Consistent Winner", description: "Achieve 60% win rate (min 20 trades)", icon: TrendingUp, color: "text-green-500", requirement: 60, type: "winrate", tier: "silver" },
  { id: "winrate_70", name: "Sharp Shooter", description: "Achieve 70% win rate (min 20 trades)", icon: Star, color: "text-yellow-500", requirement: 70, type: "winrate", tier: "gold" },

  // Green Day Achievements
  { id: "green_5", name: "Green Week", description: "Have 5 profitable days", icon: Calendar, color: "text-green-500", requirement: 5, type: "pnl", tier: "bronze" },
  { id: "green_20", name: "Green Month", description: "Have 20 profitable days", icon: Calendar, color: "text-green-500", requirement: 20, type: "pnl", tier: "silver" },
  { id: "green_50", name: "Profit Machine", description: "Have 50 profitable days", icon: Award, color: "text-yellow-500", requirement: 50, type: "pnl", tier: "gold" },

  // Journal Achievements
  { id: "journal_7", name: "Reflective Trader", description: "Write 7 journal entries", icon: Shield, color: "text-indigo-500", requirement: 7, type: "journal", tier: "bronze" },
  { id: "journal_30", name: "Thoughtful Analyst", description: "Write 30 journal entries", icon: Shield, color: "text-indigo-500", requirement: 30, type: "journal", tier: "silver" },

  // Special Achievements
  { id: "perfect_week", name: "Perfect Week", description: "5 green days in a single week", icon: Medal, color: "text-yellow-500", requirement: 1, type: "special", tier: "gold" },
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
    winRate: 0,
    totalPnl: 0,
    journalEntries: 0,
    greenDays: 0,
    perfectWeeks: 0,
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

      // Fetch all trades
      const { data: trades } = await supabase
        .from("trades")
        .select("entry_date, net_pnl, status")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .order("entry_date", { ascending: true });

      // Fetch journal entries
      const { count: journalCount } = await supabase
        .from("daily_journals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (trades && trades.length > 0) {
        const totalTrades = trades.length;
        const wins = trades.filter((t: any) => (t.net_pnl || 0) > 0).length;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
        const totalPnl = trades.reduce((sum: number, t: any) => sum + (t.net_pnl || 0), 0);

        // Calculate streaks based on trading days
        const tradeDates = [...new Set(trades.map((t: any) =>
          new Date(t.entry_date).toISOString().split('T')[0]
        ))].sort();

        let currentStreak = 0;
        let longestStreak = 0;
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
        const greenDays = Object.values(dailyPnl).filter(pnl => pnl > 0).length;

        // Calculate perfect weeks (5 green days in a week)
        // Simplified: just count if we have enough green days for at least one perfect week
        const perfectWeeks = greenDays >= 5 ? Math.floor(greenDays / 5) : 0;

        setStats({
          totalTrades,
          currentStreak,
          longestStreak,
          winRate,
          totalPnl,
          journalEntries: journalCount || 0,
          greenDays,
          perfectWeeks,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
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
      case "winrate":
        return stats.totalTrades >= 20 ? Math.min(100, (stats.winRate / achievement.requirement) * 100) : 0;
      case "pnl":
        return Math.min(100, (stats.greenDays / achievement.requirement) * 100);
      case "journal":
        return Math.min(100, (stats.journalEntries / achievement.requirement) * 100);
      case "special":
        return stats.perfectWeeks >= achievement.requirement ? 100 : 0;
      default:
        return 0;
    }
  };

  const isUnlocked = (achievement: Achievement): boolean => {
    return getProgress(achievement) >= 100;
  };

  const getCurrentValue = (achievement: Achievement): number => {
    switch (achievement.type) {
      case "trades":
        return stats.totalTrades;
      case "streak":
        return stats.longestStreak;
      case "winrate":
        return Math.round(stats.winRate);
      case "pnl":
        return stats.greenDays;
      case "journal":
        return stats.journalEntries;
      case "special":
        return stats.perfectWeeks;
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
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Achievements</h1>
        <p className="text-muted-foreground mt-2">
          Track your progress and earn badges as you grow as a trader
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
            <div className="text-sm text-muted-foreground">Total Trades</div>
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
                                  <span>{currentValue} / {achievement.requirement}</span>
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

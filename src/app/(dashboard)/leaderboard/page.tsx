"use client";

import * as React from "react";
import {
  Trophy,
  Medal,
  TrendingUp,
  Target,
  Percent,
  BarChart3,
  Crown,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatRMultiple } from "@/lib/calculations/formatters";

type LeaderboardMetric = "total_pnl" | "win_rate" | "avg_r_multiple" | "consistency" | "trade_count";
type TimePeriod = "week" | "month" | "all_time";
type LeagueTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  anonymous_mode: boolean;
  league_tier: LeagueTier;
  metric_value: number;
  total_trades: number;
  win_count: number;
  is_current_user: boolean;
}

const METRICS: { value: LeaderboardMetric; label: string; icon: React.ElementType }[] = [
  { value: "total_pnl", label: "Total P&L", icon: TrendingUp },
  { value: "win_rate", label: "Win Rate", icon: Percent },
  { value: "avg_r_multiple", label: "Avg R-Multiple", icon: Target },
  { value: "consistency", label: "Consistency", icon: BarChart3 },
  { value: "trade_count", label: "Trade Count", icon: Trophy },
];

const LEAGUE_COLORS: Record<LeagueTier, string> = {
  bronze: "text-orange-700 bg-orange-100 border-orange-300",
  silver: "text-slate-600 bg-slate-100 border-slate-300",
  gold: "text-yellow-700 bg-yellow-100 border-yellow-300",
  platinum: "text-cyan-700 bg-cyan-100 border-cyan-300",
  diamond: "text-purple-700 bg-purple-100 border-purple-300",
};

const LEAGUE_ICONS: Record<LeagueTier, React.ReactNode> = {
  bronze: <Medal className="h-4 w-4" />,
  silver: <Medal className="h-4 w-4" />,
  gold: <Medal className="h-4 w-4" />,
  platinum: <Crown className="h-4 w-4" />,
  diamond: <Crown className="h-4 w-4" />,
};

export default function LeaderboardPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [entries, setEntries] = React.useState<LeaderboardEntry[]>([]);
  const [metric, setMetric] = React.useState<LeaderboardMetric>("total_pnl");
  const [period, setPeriod] = React.useState<TimePeriod>("week");
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = React.useState<LeaderboardEntry | null>(null);

  // Prevent hydration mismatch with Radix UI components
  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchLeaderboard();
    }
  }, [metric, period, mounted]);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      switch (period) {
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        default:
          startDate = new Date("2000-01-01");
      }

      // Fetch all closed trades
      const { data: trades, error: tradesError } = await supabase
        .from("trades")
        .select("user_id, net_pnl, r_multiple, entry_date")
        .eq("status", "closed")
        .gte("entry_date", startDate.toISOString());

      if (tradesError) {
        console.error("Error fetching trades:", tradesError);
        setEntries([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set((trades || []).map((t: any) => t.user_id))];

      if (userIds.length === 0) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      // Fetch profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, anonymous_mode, is_public, show_stats")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setEntries([]);
        return;
      }

      // Create a map of profiles by user ID
      const profileMap: Record<string, any> = {};
      for (const profile of (profiles || []) as any[]) {
        profileMap[profile.id] = profile;
      }

      // Aggregate stats per user
      const userStats: Record<string, {
        user_id: string;
        profile: any;
        total_pnl: number;
        total_trades: number;
        win_count: number;
        r_multiples: number[];
      }> = {};

      for (const trade of (trades || []) as any[]) {
        const profile = profileMap[trade.user_id];

        // Include users who have:
        // 1. is_public = true (they want to be visible), OR
        // 2. show_stats = true (they want stats shown, default is true), OR
        // 3. show_stats is null/undefined (default behavior - show on leaderboard)
        // Only exclude if explicitly set is_public=false AND show_stats=false
        const isPublic = profile?.is_public === true;
        const showStats = profile?.show_stats !== false; // true if true, null, or undefined

        if (!isPublic && !showStats) continue;

        if (!userStats[trade.user_id]) {
          userStats[trade.user_id] = {
            user_id: trade.user_id,
            profile,
            total_pnl: 0,
            total_trades: 0,
            win_count: 0,
            r_multiples: [],
          };
        }

        userStats[trade.user_id].total_trades++;
        userStats[trade.user_id].total_pnl += trade.net_pnl || 0;
        if ((trade.net_pnl || 0) > 0) {
          userStats[trade.user_id].win_count++;
        }
        if (trade.r_multiple !== null) {
          userStats[trade.user_id].r_multiples.push(trade.r_multiple);
        }
      }

      // Calculate metrics and sort
      const leaderboard: LeaderboardEntry[] = Object.values(userStats)
        .filter(s => s.total_trades >= 5) // Minimum 5 trades to qualify
        .map(s => {
          const winRate = s.total_trades > 0 ? (s.win_count / s.total_trades) * 100 : 0;
          const avgR = s.r_multiples.length > 0
            ? s.r_multiples.reduce((a, b) => a + b, 0) / s.r_multiples.length
            : 0;

          // Calculate consistency (lower variance = higher consistency)
          const pnlVariance = calculateConsistency(s.r_multiples);

          // Determine league tier based on total P&L
          let league_tier: LeagueTier = "bronze";
          if (s.total_pnl >= 10000) league_tier = "diamond";
          else if (s.total_pnl >= 5000) league_tier = "platinum";
          else if (s.total_pnl >= 2000) league_tier = "gold";
          else if (s.total_pnl >= 500) league_tier = "silver";

          let metricValue: number;
          switch (metric) {
            case "total_pnl": metricValue = s.total_pnl; break;
            case "win_rate": metricValue = winRate; break;
            case "avg_r_multiple": metricValue = avgR; break;
            case "consistency": metricValue = pnlVariance; break;
            case "trade_count": metricValue = s.total_trades; break;
          }

          return {
            rank: 0,
            user_id: s.user_id,
            username: s.profile?.username,
            display_name: s.profile?.display_name,
            avatar_url: s.profile?.avatar_url,
            anonymous_mode: s.profile?.anonymous_mode || false,
            league_tier,
            metric_value: metricValue,
            total_trades: s.total_trades,
            win_count: s.win_count,
            is_current_user: s.user_id === user?.id,
          };
        })
        .sort((a, b) => {
          // For consistency, lower is better
          if (metric === "consistency") return a.metric_value - b.metric_value;
          return b.metric_value - a.metric_value;
        })
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setEntries(leaderboard.slice(0, 100));

      // Find current user's rank
      const userEntry = leaderboard.find(e => e.is_current_user);
      setCurrentUserRank(userEntry || null);
    } catch (err) {
      console.error("Exception fetching leaderboard:", err);
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMetricValue = (value: number, metric: LeaderboardMetric) => {
    switch (metric) {
      case "total_pnl":
        return formatCurrency(value);
      case "win_rate":
        return `${value.toFixed(1)}%`;
      case "avg_r_multiple":
        return formatRMultiple(value);
      case "consistency":
        return value.toFixed(2);
      case "trade_count":
        return value.toString();
    }
  };

  // Prevent hydration issues by not rendering Radix components until mounted
  if (!mounted) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground mt-2">
            See how you rank against other traders
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground mt-2">
          See how you rank against other traders
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Select value={metric} onValueChange={(v) => setMetric(v as LeaderboardMetric)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRICS.map(m => (
              <SelectItem key={m.value} value={m.value}>
                <div className="flex items-center gap-2">
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all_time">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Current User Rank */}
      {currentUserRank && (
        <Card className="mb-6 border-primary">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-primary">#{currentUserRank.rank}</div>
              <div className="text-sm text-muted-foreground">Your current rank</div>
              <div className="ml-auto text-xl font-semibold">
                {formatMetricValue(currentUserRank.metric_value, metric)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No traders with enough trades to rank yet. Keep trading!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {entries.map((entry) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  metric={metric}
                  formatValue={formatMetricValue}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LeaderboardRow({
  entry,
  metric,
  formatValue,
}: {
  entry: LeaderboardEntry;
  metric: LeaderboardMetric;
  formatValue: (value: number, metric: LeaderboardMetric) => string;
}) {
  const displayName = entry.anonymous_mode
    ? "Anonymous Trader"
    : entry.display_name || entry.username || "Trader";

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-slate-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-500" />;
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
        entry.is_current_user && "bg-primary/5"
      )}
    >
      <div className="w-12 flex justify-center">
        {getRankDisplay(entry.rank)}
      </div>

      <Avatar>
        {!entry.anonymous_mode && (
          <AvatarImage src={entry.avatar_url || undefined} />
        )}
        <AvatarFallback>
          {entry.anonymous_mode ? "?" : displayName[0]}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{displayName}</span>
          {entry.is_current_user && (
            <Badge variant="outline" className="text-xs">You</Badge>
          )}
          <Badge
            variant="outline"
            className={cn("text-xs capitalize", LEAGUE_COLORS[entry.league_tier])}
          >
            {LEAGUE_ICONS[entry.league_tier]}
            <span className="ml-1">{entry.league_tier}</span>
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {entry.total_trades} trades · {((entry.win_count / entry.total_trades) * 100).toFixed(0)}% win rate
        </div>
      </div>

      <div className="text-right">
        <div className="text-xl font-bold">
          {formatValue(entry.metric_value, metric)}
        </div>
        <div className="text-sm text-muted-foreground">
          {METRICS.find(m => m.value === metric)?.label}
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate consistency score
function calculateConsistency(rMultiples: number[]): number {
  if (rMultiples.length < 2) return 100;

  const mean = rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length;
  const variance = rMultiples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rMultiples.length;
  const stdDev = Math.sqrt(variance);

  // Return inverse of stdDev (lower variance = higher consistency score)
  // Normalize to 0-100 scale
  return Math.max(0, 100 - (stdDev * 20));
}

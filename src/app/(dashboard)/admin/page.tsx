"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Shield,
  Users,
  TrendingUp,
  Zap,
  Activity,
  BarChart3,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Mail,
  Clock,
  Target,
  Flame,
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
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { getLevelFromXP, formatXP } from "@/lib/leveling";

// Admin email - only this user can access the admin panel
const ADMIN_EMAIL = "zhuot03@gmail.com";

interface UserStats {
  id: string;
  email: string;
  display_name: string | null;
  total_xp: number;
  current_level: number;
  trader_title: string;
  created_at: string;
  tradeCount: number;
  totalPnL: number;
  winRate: number;
  lastActive: string | null;
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [users, setUsers] = React.useState<UserStats[]>([]);
  const [sortField, setSortField] = React.useState<keyof UserStats>("total_xp");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");
  const [expandedUser, setExpandedUser] = React.useState<string | null>(null);

  // Summary stats
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [totalTrades, setTotalTrades] = React.useState(0);
  const [totalXPAwarded, setTotalXPAwarded] = React.useState(0);
  const [activeToday, setActiveToday] = React.useState(0);

  const fetchData = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.email !== ADMIN_EMAIL) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await (supabase
        .from("profiles") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setIsLoading(false);
        return;
      }

      // Fetch trade counts and stats for each user
      const userStatsPromises = (profiles || []).map(async (profile: any) => {
        // Get trade stats
        const { data: trades } = await (supabase
          .from("trades") as any)
          .select("pnl, entry_date")
          .eq("user_id", profile.id);

        const tradeList = trades || [];
        const tradeCount = tradeList.length;
        const totalPnL = tradeList.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
        const winningTrades = tradeList.filter((t: any) => t.pnl > 0).length;
        const winRate = tradeCount > 0 ? (winningTrades / tradeCount) * 100 : 0;

        // Get last trade date as last active
        const sortedTrades = [...tradeList].sort((a: any, b: any) =>
          new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        );
        const lastActive = sortedTrades[0]?.entry_date || null;

        return {
          id: profile.id,
          email: profile.email,
          display_name: profile.display_name,
          total_xp: profile.total_xp || 0,
          current_level: profile.current_level || 1,
          trader_title: profile.trader_title || "Rookie",
          created_at: profile.created_at,
          tradeCount,
          totalPnL,
          winRate,
          lastActive,
        };
      });

      const userStats = await Promise.all(userStatsPromises);
      setUsers(userStats);

      // Calculate summary stats
      setTotalUsers(userStats.length);
      setTotalTrades(userStats.reduce((sum, u) => sum + u.tradeCount, 0));
      setTotalXPAwarded(userStats.reduce((sum, u) => sum + u.total_xp, 0));

      // Active today (had a trade today)
      const today = format(new Date(), "yyyy-MM-dd");
      const activeCount = userStats.filter(u =>
        u.lastActive && u.lastActive.startsWith(today)
      ).length;
      setActiveToday(activeCount);

    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort users
  const sortedUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [users, sortField, sortDirection]);

  const handleSort = (field: keyof UserStats) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: keyof UserStats }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="container max-w-6xl py-6 px-4 sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              You don't have permission to access the admin panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-500" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Monitor user activity and platform statistics
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <BarChart3 className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{totalTrades.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Trades</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{formatXP(totalXPAwarded)}</div>
            <div className="text-xs text-muted-foreground">Total XP Awarded</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold">{activeToday}</div>
            <div className="text-xs text-muted-foreground">Active Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
          <CardDescription>
            Click on column headers to sort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th
                    className="text-left py-3 px-2 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center gap-1">
                      User <SortIcon field="email" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("total_xp")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      XP <SortIcon field="total_xp" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("tradeCount")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Trades <SortIcon field="tradeCount" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("totalPnL")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      P&L <SortIcon field="totalPnL" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("winRate")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Win % <SortIcon field="winRate" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-2 font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Joined <SortIcon field="created_at" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => {
                  const level = getLevelFromXP(user.total_xp);
                  const isExpanded = expandedUser === user.id;

                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        className={cn(
                          "border-b hover:bg-muted/30 cursor-pointer transition-colors",
                          isExpanded && "bg-muted/20"
                        )}
                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{level.badge}</span>
                            <div>
                              <div className="font-medium">
                                {user.display_name || user.email.split("@")[0]}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="font-medium">{formatXP(user.total_xp)}</div>
                          <div className="text-xs text-muted-foreground">
                            Lvl {level.level}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-medium">
                          {user.tradeCount}
                        </td>
                        <td className={cn(
                          "py-3 px-2 text-right font-medium",
                          user.totalPnL >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                          ${user.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={cn(
                            "font-medium",
                            user.winRate >= 50 ? "text-green-500" : "text-red-500"
                          )}>
                            {user.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/10">
                          <td colSpan={6} className="py-4 px-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> Email
                                </div>
                                <div className="font-medium">{user.email}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1">
                                  <Target className="h-3 w-3" /> Title
                                </div>
                                <div className="font-medium">{user.trader_title}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> Last Active
                                </div>
                                <div className="font-medium">
                                  {user.lastActive
                                    ? format(new Date(user.lastActive), "MMM d, yyyy")
                                    : "Never"
                                  }
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-1 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Member for
                                </div>
                                <div className="font-medium">
                                  {Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

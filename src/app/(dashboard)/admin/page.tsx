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
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Mail,
  Clock,
  Target,
  Calendar,
  AlertCircle,
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

type SortField = "email" | "total_xp" | "tradeCount" | "totalPnL" | "winRate" | "created_at";

export default function AdminPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [users, setUsers] = React.useState<UserStats[]>([]);
  const [sortField, setSortField] = React.useState<SortField>("total_xp");
  const [sortAsc, setSortAsc] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<string>("");

  // Summary stats
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [totalTrades, setTotalTrades] = React.useState(0);
  const [totalXPAwarded, setTotalXPAwarded] = React.useState(0);
  const [activeToday, setActiveToday] = React.useState(0);

  const fetchData = React.useCallback(async () => {
    setError(null);
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
        setError(`Error fetching profiles: ${profilesError.message}`);
        setIsLoading(false);
        return;
      }

      // Note: Due to RLS, we can only see our own trades
      // For a proper admin panel, you'd need to create a database function with SECURITY DEFINER
      // or add an admin RLS policy

      // For now, we'll show profile data which should be accessible
      const userStats: UserStats[] = (profiles || []).map((profile: any) => {
        return {
          id: profile.id,
          email: profile.email || "No email",
          display_name: profile.display_name,
          total_xp: profile.total_xp || 0,
          current_level: profile.current_level || 1,
          trader_title: profile.trader_title || "Rookie",
          created_at: profile.created_at,
          // These will be 0 due to RLS - need admin function to get real data
          tradeCount: 0,
          totalPnL: 0,
          winRate: 0,
          lastActive: null,
        };
      });

      // Try to fetch ALL trades (requires admin RLS policy)
      const { data: adminTrades, error: tradesError } = await (supabase
        .from("trades") as any)
        .select("pnl, user_id, entry_date");

      const debugMsg = `Trades query: ${adminTrades?.length || 0} trades found. Error: ${tradesError?.message || 'none'}. Profiles: ${profiles?.length || 0}`;
      console.log("Admin trades query result:", {
        tradesCount: adminTrades?.length || 0,
        error: tradesError,
        sampleTrade: adminTrades?.[0]
      });
      setDebugInfo(debugMsg);

      // If we got trades, try to aggregate by user
      if (adminTrades && adminTrades.length > 0) {
        const tradesByUser: Record<string, { count: number; pnl: number; wins: number; lastDate: string | null }> = {};

        adminTrades.forEach((trade: any) => {
          if (!tradesByUser[trade.user_id]) {
            tradesByUser[trade.user_id] = { count: 0, pnl: 0, wins: 0, lastDate: null };
          }
          tradesByUser[trade.user_id].count++;
          tradesByUser[trade.user_id].pnl += trade.pnl || 0;
          if ((trade.pnl || 0) > 0) {
            tradesByUser[trade.user_id].wins++;
          }
          if (!tradesByUser[trade.user_id].lastDate || trade.entry_date > tradesByUser[trade.user_id].lastDate) {
            tradesByUser[trade.user_id].lastDate = trade.entry_date;
          }
        });

        // Update user stats with trade data
        userStats.forEach((user) => {
          const trades = tradesByUser[user.id];
          if (trades) {
            user.tradeCount = trades.count;
            user.totalPnL = trades.pnl;
            user.winRate = trades.count > 0 ? (trades.wins / trades.count) * 100 : 0;
            user.lastActive = trades.lastDate;
          }
        });
      }

      setUsers(userStats);

      // Calculate summary stats
      setTotalUsers(userStats.length);
      setTotalTrades(userStats.reduce((sum, u) => sum + u.tradeCount, 0));
      setTotalXPAwarded(userStats.reduce((sum, u) => sum + u.total_xp, 0));

      // Active today
      const today = format(new Date(), "yyyy-MM-dd");
      const activeCount = userStats.filter(u =>
        u.lastActive && u.lastActive.startsWith(today)
      ).length;
      setActiveToday(activeCount);

    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort users
  const sortedUsers = React.useMemo(() => {
    const sorted = [...users].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "email":
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case "total_xp":
          aVal = a.total_xp;
          bVal = b.total_xp;
          break;
        case "tradeCount":
          aVal = a.tradeCount;
          bVal = b.tradeCount;
          break;
        case "totalPnL":
          aVal = a.totalPnL;
          bVal = b.totalPnL;
          break;
        case "winRate":
          aVal = a.winRate;
          bVal = b.winRate;
          break;
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [users, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortAsc
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
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

      {/* Error Alert */}
      {error && (
        <Card className="border-red-500 bg-red-500/10">
          <CardContent className="pt-4 flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="border-blue-500/50 bg-blue-500/10">
        <CardContent className="pt-4 text-sm text-blue-600 dark:text-blue-400">
          <strong>Debug:</strong> {debugInfo || "Loading..."}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalUsers}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <BarChart3 className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalTrades.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Trades</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{formatXP(totalXPAwarded)}</div>
            <div className="text-xs text-muted-foreground">Total XP</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Activity className="h-5 w-5 text-purple-500 mx-auto mb-1" />
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
            Click column headers to sort
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th
                    className="text-left py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors rounded-tl-lg"
                    onClick={() => handleSort("email")}
                  >
                    <div className="flex items-center">
                      User <SortIcon field="email" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("total_xp")}
                  >
                    <div className="flex items-center justify-end">
                      XP <SortIcon field="total_xp" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("tradeCount")}
                  >
                    <div className="flex items-center justify-end">
                      Trades <SortIcon field="tradeCount" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("totalPnL")}
                  >
                    <div className="flex items-center justify-end">
                      P&L <SortIcon field="totalPnL" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("winRate")}
                  >
                    <div className="flex items-center justify-end">
                      Win % <SortIcon field="winRate" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors rounded-tr-lg"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center justify-end">
                      Joined <SortIcon field="created_at" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user, index) => {
                  const level = getLevelFromXP(user.total_xp);

                  return (
                    <tr
                      key={user.id}
                      className={cn(
                        "border-b hover:bg-muted/30 transition-colors",
                        index % 2 === 0 ? "bg-background" : "bg-muted/20"
                      )}
                    >
                      <td className="py-3 px-3">
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
                      <td className="py-3 px-3 text-right">
                        <div className="font-medium">{formatXP(user.total_xp)}</div>
                        <div className="text-xs text-muted-foreground">
                          Lvl {level.level}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {user.tradeCount}
                      </td>
                      <td className={cn(
                        "py-3 px-3 text-right font-medium",
                        user.totalPnL > 0 ? "text-green-500" : user.totalPnL < 0 ? "text-red-500" : ""
                      )}>
                        ${user.totalPnL.toFixed(2)}
                      </td>
                      <td className={cn(
                        "py-3 px-3 text-right font-medium",
                        user.winRate >= 50 ? "text-green-500" : user.winRate > 0 ? "text-red-500" : ""
                      )}>
                        {user.winRate.toFixed(1)}%
                      </td>
                      <td className="py-3 px-3 text-right text-muted-foreground">
                        {format(new Date(user.created_at), "MMM d, yyyy")}
                      </td>
                    </tr>
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

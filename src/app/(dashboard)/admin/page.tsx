"use client";

import * as React from "react";
import { format, differenceInDays } from "date-fns";
import {
  Shield,
  Users,
  Zap,
  Activity,
  BarChart3,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  UserCheck,
  UserX,
  Clock,
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

type UserStatus = "active" | "inactive" | "churned" | "new";

interface UserStats {
  id: string;
  email: string;
  display_name: string | null;
  total_xp: number;
  current_level: number;
  trader_title: string;
  created_at: string;
  tradeCount: number;
  lastActive: string | null;
  daysSinceActive: number | null;
  status: UserStatus;
}

type SortField = "email" | "total_xp" | "tradeCount" | "lastActive" | "status" | "created_at";

// Get user status based on activity
function getUserStatus(lastActive: string | null, createdAt: string): { status: UserStatus; daysSinceActive: number | null } {
  const now = new Date();
  const created = new Date(createdAt);
  const daysSinceCreated = differenceInDays(now, created);

  // New user (joined within last 7 days and no trades yet)
  if (!lastActive && daysSinceCreated <= 7) {
    return { status: "new", daysSinceActive: null };
  }

  if (!lastActive) {
    // Never traded - churned if account is old
    return { status: "churned", daysSinceActive: null };
  }

  const lastActiveDate = new Date(lastActive);
  const daysSinceActive = differenceInDays(now, lastActiveDate);

  if (daysSinceActive <= 7) {
    return { status: "active", daysSinceActive };
  } else if (daysSinceActive <= 30) {
    return { status: "inactive", daysSinceActive };
  } else {
    return { status: "churned", daysSinceActive };
  }
}

function getStatusBadge(status: UserStatus) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Active</Badge>;
    case "inactive":
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">Inactive</Badge>;
    case "churned":
      return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">Churned</Badge>;
    case "new":
      return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30">New</Badge>;
  }
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthorized, setIsAuthorized] = React.useState(false);
  const [users, setUsers] = React.useState<UserStats[]>([]);
  const [sortField, setSortField] = React.useState<SortField>("lastActive");
  const [sortAsc, setSortAsc] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Summary stats
  const [totalUsers, setTotalUsers] = React.useState(0);
  const [totalTrades, setTotalTrades] = React.useState(0);
  const [activeUsers, setActiveUsers] = React.useState(0);
  const [inactiveUsers, setInactiveUsers] = React.useState(0);
  const [churnedUsers, setChurnedUsers] = React.useState(0);
  const [newUsers, setNewUsers] = React.useState(0);

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

      // For now, we'll show profile data which should be accessible
      const userStats: UserStats[] = (profiles || []).map((profile: any) => {
        const { status, daysSinceActive } = getUserStatus(null, profile.created_at);
        return {
          id: profile.id,
          email: profile.email || "No email",
          display_name: profile.display_name,
          total_xp: profile.total_xp || 0,
          current_level: profile.current_level || 1,
          trader_title: profile.trader_title || "Rookie",
          created_at: profile.created_at,
          tradeCount: 0,
          lastActive: null,
          daysSinceActive,
          status,
        };
      });

      // Try to fetch ALL trades (requires admin RLS policy)
      const { data: adminTrades } = await (supabase
        .from("trades") as any)
        .select("net_pnl, user_id, entry_date");

      // If we got trades, aggregate by user
      if (adminTrades && adminTrades.length > 0) {
        const tradesByUser: Record<string, { count: number; lastDate: string | null }> = {};

        adminTrades.forEach((trade: any) => {
          if (!tradesByUser[trade.user_id]) {
            tradesByUser[trade.user_id] = { count: 0, lastDate: null };
          }
          tradesByUser[trade.user_id].count++;
          const userTrades = tradesByUser[trade.user_id];
          if (!userTrades.lastDate || trade.entry_date > userTrades.lastDate) {
            userTrades.lastDate = trade.entry_date;
          }
        });

        // Update user stats with trade data
        userStats.forEach((user) => {
          const trades = tradesByUser[user.id];
          if (trades) {
            user.tradeCount = trades.count;
            user.lastActive = trades.lastDate;
            const { status, daysSinceActive } = getUserStatus(trades.lastDate, user.created_at);
            user.status = status;
            user.daysSinceActive = daysSinceActive;
          }
        });
      }

      setUsers(userStats);

      // Calculate summary stats
      setTotalUsers(userStats.length);
      setTotalTrades(userStats.reduce((sum, u) => sum + u.tradeCount, 0));

      // Count by status
      const statusCounts = userStats.reduce((acc, u) => {
        acc[u.status] = (acc[u.status] || 0) + 1;
        return acc;
      }, {} as Record<UserStatus, number>);

      setActiveUsers(statusCounts.active || 0);
      setInactiveUsers(statusCounts.inactive || 0);
      setChurnedUsers(statusCounts.churned || 0);
      setNewUsers(statusCounts.new || 0);

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
    const statusOrder: Record<UserStatus, number> = {
      active: 0,
      new: 1,
      inactive: 2,
      churned: 3,
    };

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
        case "lastActive":
          // Sort by days since active (null = very old)
          aVal = a.daysSinceActive ?? 9999;
          bVal = b.daysSinceActive ?? 9999;
          break;
        case "status":
          aVal = statusOrder[a.status];
          bVal = statusOrder[b.status];
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
            Monitor user engagement and platform activity
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Users className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalUsers}</div>
            <div className="text-xs text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <BarChart3 className="h-5 w-5 text-purple-500 mx-auto mb-1" />
            <div className="text-2xl font-bold">{totalTrades.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Trades</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-3 text-center">
            <UserCheck className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
            <div className="text-xs text-muted-foreground">Active (7d)</div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="pt-4 pb-3 text-center">
            <Zap className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600">{newUsers}</div>
            <div className="text-xs text-muted-foreground">New Users</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="pt-4 pb-3 text-center">
            <Clock className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-yellow-600">{inactiveUsers}</div>
            <div className="text-xs text-muted-foreground">Inactive (7-30d)</div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-4 pb-3 text-center">
            <UserX className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">{churnedUsers}</div>
            <div className="text-xs text-muted-foreground">Churned (30d+)</div>
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
            Click column headers to sort • Active = traded in last 7 days • Inactive = 7-30 days • Churned = 30+ days
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
                    className="text-center py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center justify-center">
                      Status <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    className="text-right py-3 px-3 font-medium cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort("lastActive")}
                  >
                    <div className="flex items-center justify-end">
                      Last Active <SortIcon field="lastActive" />
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
                    onClick={() => handleSort("total_xp")}
                  >
                    <div className="flex items-center justify-end">
                      XP <SortIcon field="total_xp" />
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
                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {user.lastActive ? (
                          <div>
                            <div className="font-medium">
                              {format(new Date(user.lastActive), "MMM d, yyyy")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.daysSinceActive === 0
                                ? "Today"
                                : user.daysSinceActive === 1
                                  ? "Yesterday"
                                  : `${user.daysSinceActive} days ago`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        {user.tradeCount}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-medium">{formatXP(user.total_xp)}</div>
                        <div className="text-xs text-muted-foreground">
                          Lvl {level.level}
                        </div>
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

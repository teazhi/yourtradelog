"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Users,
  UserPlus,
  MessageCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Send,
  Bell,
  CheckCircle2,
  XCircle,
  Handshake,
  BookOpen,
  List,
  BarChart3,
  Eye,
  ChevronRight,
  Star,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Input,
  cn,
  toast,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import {
  CustomDialog,
  CustomDialogContent,
  CustomDialogDescription,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/ui/custom-dialog";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/calculations/formatters";

interface Partner {
  id: string;
  user_id: string;
  partner_id: string;
  status: "pending" | "active" | "declined";
  created_at: string;
  partner_profile?: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PartnerStats {
  trades_this_week: number;
  pnl_this_week: number;
  win_rate: number;
  streak: number;
  journal_entries_this_week: number;
  green_days_this_week: number;
}

interface PartnerJournal {
  id: string;
  date: string;
  pre_market_notes: string | null;
  post_market_notes: string | null;
  mood_rating: number | null;
  focus_rating: number | null;
  discipline_rating: number | null;
  goals: string[];
}

interface PartnerTrade {
  id: string;
  symbol: string;
  side: string;
  entry_date: string;
  exit_date: string | null;
  net_pnl: number | null;
  status: string;
  quantity: number;
  setup_name: string | null;
  emotion_tags: string[];
}

interface PendingRequest {
  id: string;
  user_id: string;
  requester_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function AccountabilityPartnerPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [partner, setPartner] = React.useState<Partner | null>(null);
  const [pendingRequests, setPendingRequests] = React.useState<PendingRequest[]>([]);
  const [isFindDialogOpen, setIsFindDialogOpen] = React.useState(false);
  const [searchUsername, setSearchUsername] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<any>(null);

  // Stats
  const [myStats, setMyStats] = React.useState<PartnerStats>({
    trades_this_week: 0,
    pnl_this_week: 0,
    win_rate: 0,
    streak: 0,
    journal_entries_this_week: 0,
    green_days_this_week: 0,
  });
  const [partnerStats, setPartnerStats] = React.useState<PartnerStats>({
    trades_this_week: 0,
    pnl_this_week: 0,
    win_rate: 0,
    streak: 0,
    journal_entries_this_week: 0,
    green_days_this_week: 0,
  });

  // Partner's data
  const [partnerJournals, setPartnerJournals] = React.useState<PartnerJournal[]>([]);
  const [partnerTrades, setPartnerTrades] = React.useState<PartnerTrade[]>([]);
  const [activeTab, setActiveTab] = React.useState("overview");

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchPartnerData();
    }
  }, [mounted]);

  const getWeekStart = () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  const calculateStats = async (userId: string, supabase: any): Promise<PartnerStats> => {
    const weekStart = getWeekStart();

    // Fetch trades
    const { data: trades } = await supabase
      .from("trades")
      .select("net_pnl, entry_date, status")
      .eq("user_id", userId)
      .eq("status", "closed")
      .gte("entry_date", weekStart.toISOString());

    // Fetch journals
    const { count: journalCount } = await supabase
      .from("daily_journals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", weekStart.toISOString().split('T')[0]);

    const tradesArray = trades || [];
    const wins = tradesArray.filter((t: any) => (t.net_pnl || 0) > 0).length;
    const totalPnl = tradesArray.reduce((sum: number, t: any) => sum + (t.net_pnl || 0), 0);

    // Calculate green days
    const dailyPnl: Record<string, number> = {};
    tradesArray.forEach((t: any) => {
      const date = new Date(t.entry_date).toISOString().split('T')[0];
      dailyPnl[date] = (dailyPnl[date] || 0) + (t.net_pnl || 0);
    });
    const greenDays = Object.values(dailyPnl).filter(pnl => pnl > 0).length;

    // Calculate streak (simplified)
    const tradeDates: string[] = [...new Set(tradesArray.map((t: any) =>
      new Date(t.entry_date).toISOString().split('T')[0]
    ))].sort() as string[];

    let streak = tradeDates.length > 0 ? 1 : 0;
    for (let i = tradeDates.length - 1; i > 0; i--) {
      const currDate = new Date(tradeDates[i] as string);
      const prevDate = new Date(tradeDates[i - 1] as string);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return {
      trades_this_week: tradesArray.length,
      pnl_this_week: totalPnl,
      win_rate: tradesArray.length > 0 ? (wins / tradesArray.length) * 100 : 0,
      streak,
      journal_entries_this_week: journalCount || 0,
      green_days_this_week: greenDays,
    };
  };

  const fetchPartnerData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Fetch my stats
      const myStatsData = await calculateStats(user.id, supabase);
      setMyStats(myStatsData);

      // Fetch active partnership
      const { data: partnerships } = await supabase
        .from("accountability_partners")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq("status", "active")
        .limit(1);

      if (partnerships && partnerships.length > 0) {
        const partnership = partnerships[0] as any;
        const partnerId = partnership.user_id === user.id ? partnership.partner_id : partnership.user_id;

        // Fetch partner profile
        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", partnerId)
          .single();

        setPartner({
          ...partnership,
          partner_profile: partnerProfile,
        });

        // Fetch partner stats
        const partnerStatsData = await calculateStats(partnerId, supabase);
        setPartnerStats(partnerStatsData);

        // Fetch partner's recent journals (last 7 days)
        const weekStart = getWeekStart();
        const { data: journals } = await supabase
          .from("daily_journals")
          .select("id, date, pre_market_notes, post_market_notes, mood_rating, focus_rating, discipline_rating, goals")
          .eq("user_id", partnerId)
          .gte("date", weekStart.toISOString().split('T')[0])
          .order("date", { ascending: false })
          .limit(7);

        setPartnerJournals((journals || []) as PartnerJournal[]);

        // Fetch partner's recent trades (last 7 days)
        const { data: trades } = await supabase
          .from("trades")
          .select("id, symbol, side, entry_date, exit_date, net_pnl, status, quantity, setup_name, emotion_tags")
          .eq("user_id", partnerId)
          .gte("entry_date", weekStart.toISOString())
          .order("entry_date", { ascending: false })
          .limit(20);

        setPartnerTrades((trades || []) as PartnerTrade[]);
      }

      // Fetch pending requests (where I'm the partner being requested)
      const { data: requests } = await supabase
        .from("accountability_partners")
        .select("id, user_id")
        .eq("partner_id", user.id)
        .eq("status", "pending");

      if (requests && requests.length > 0) {
        const requesterIds = requests.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", requesterIds);

        const requestsWithProfiles = requests.map((r: any) => ({
          ...r,
          requester_profile: (profiles as any[])?.find(p => p.id === r.user_id),
        }));

        setPendingRequests(requestsWithProfiles);
      }
    } catch (err) {
      console.error("Error fetching partner data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchForPartner = async () => {
    if (!searchUsername.trim()) return;
    setIsSearching(true);
    setSearchResult(null);

    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .eq("username", searchUsername.toLowerCase())
        .single();

      if (profile) {
        setSearchResult(profile);
      } else {
        toast.error("User not found");
      }
    } catch (err) {
      toast.error("User not found");
    } finally {
      setIsSearching(false);
    }
  };

  const sendPartnerRequest = async () => {
    if (!searchResult || !currentUserId) return;

    try {
      const supabase = createClient();

      // Check if request already exists
      const { data: existing } = await supabase
        .from("accountability_partners")
        .select("id")
        .or(`and(user_id.eq.${currentUserId},partner_id.eq.${searchResult.id}),and(user_id.eq.${searchResult.id},partner_id.eq.${currentUserId})`)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error("Partnership request already exists");
        return;
      }

      const { error } = await (supabase.from("accountability_partners") as any).insert({
        user_id: currentUserId,
        partner_id: searchResult.id,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Partnership request sent!");
      setIsFindDialogOpen(false);
      setSearchUsername("");
      setSearchResult(null);
    } catch (err) {
      console.error("Error sending request:", err);
      toast.error("Failed to send request");
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      const supabase = createClient();

      if (accept) {
        await (supabase.from("accountability_partners") as any)
          .update({ status: "active" })
          .eq("id", requestId);
        toast.success("Partnership accepted!");
      } else {
        await supabase
          .from("accountability_partners")
          .delete()
          .eq("id", requestId);
        toast.success("Request declined");
      }

      fetchPartnerData();
    } catch (err) {
      console.error("Error responding to request:", err);
      toast.error("Failed to respond to request");
    }
  };

  const endPartnership = async () => {
    if (!partner) return;

    try {
      const supabase = createClient();
      await supabase
        .from("accountability_partners")
        .delete()
        .eq("id", partner.id);

      toast.success("Partnership ended");
      setPartner(null);
      setPartnerJournals([]);
      setPartnerTrades([]);
    } catch (err) {
      console.error("Error ending partnership:", err);
      toast.error("Failed to end partnership");
    }
  };

  const StatComparison = ({ label, myValue, partnerValue, format: formatFn, higherIsBetter = true }: {
    label: string;
    myValue: number;
    partnerValue: number;
    format?: (v: number) => string;
    higherIsBetter?: boolean;
  }) => {
    const formatValue = formatFn || ((v: number) => v.toString());
    const iAmWinning = higherIsBetter ? myValue > partnerValue : myValue < partnerValue;
    const isTied = myValue === partnerValue;

    return (
      <div className="flex items-center justify-between py-3 border-b last:border-0">
        <div className="flex-1 text-center">
          <div className={cn(
            "text-lg font-bold",
            !isTied && iAmWinning && "text-green-500"
          )}>
            {formatValue(myValue)}
          </div>
        </div>
        <div className="flex-1 text-center text-sm text-muted-foreground">{label}</div>
        <div className="flex-1 text-center">
          <div className={cn(
            "text-lg font-bold",
            !isTied && !iAmWinning && "text-green-500"
          )}>
            {formatValue(partnerValue)}
          </div>
        </div>
      </div>
    );
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Accountability Partner</h1>
        <p className="text-muted-foreground">
          Partner with another trader to stay accountable and motivated
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              Partnership Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={request.requester_profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {request.requester_profile?.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {request.requester_profile?.display_name || request.requester_profile?.username || "Unknown"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Wants to be your accountability partner
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => respondToRequest(request.id, false)}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => respondToRequest(request.id, true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {partner ? (
        // Active Partnership
        <div className="space-y-6">
          {/* Partner Header */}
          <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-green-500">
                    <AvatarImage src={partner.partner_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xl bg-green-500/20">
                      {partner.partner_profile?.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-semibold">
                        {partner.partner_profile?.display_name || partner.partner_profile?.username || "Partner"}
                      </h3>
                      <Badge className="bg-green-500">
                        <Handshake className="h-3 w-3 mr-1" />
                        Partner
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">@{partner.partner_profile?.username}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={endPartnership}>
                  End Partnership
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="journals">
                <BookOpen className="h-4 w-4 mr-2" />
                Journals
              </TabsTrigger>
              <TabsTrigger value="trades">
                <List className="h-4 w-4 mr-2" />
                Trades
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Weekly Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This Week's Comparison</CardTitle>
                  <CardDescription>See how you both are doing this week</CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-4 border-b mb-2">
                    <div className="flex-1 text-center">
                      <div className="font-semibold">You</div>
                    </div>
                    <div className="flex-1 text-center text-muted-foreground text-sm">vs</div>
                    <div className="flex-1 text-center">
                      <div className="font-semibold">{partner.partner_profile?.display_name || "Partner"}</div>
                    </div>
                  </div>

                  <StatComparison
                    label="Trades"
                    myValue={myStats.trades_this_week}
                    partnerValue={partnerStats.trades_this_week}
                  />
                  <StatComparison
                    label="P&L"
                    myValue={myStats.pnl_this_week}
                    partnerValue={partnerStats.pnl_this_week}
                    format={formatCurrency}
                  />
                  <StatComparison
                    label="Win Rate"
                    myValue={myStats.win_rate}
                    partnerValue={partnerStats.win_rate}
                    format={(v) => `${v.toFixed(0)}%`}
                  />
                  <StatComparison
                    label="Green Days"
                    myValue={myStats.green_days_this_week}
                    partnerValue={partnerStats.green_days_this_week}
                  />
                  <StatComparison
                    label="Journal Entries"
                    myValue={myStats.journal_entries_this_week}
                    partnerValue={partnerStats.journal_entries_this_week}
                  />
                  <StatComparison
                    label="Streak"
                    myValue={myStats.streak}
                    partnerValue={partnerStats.streak}
                  />
                </CardContent>
              </Card>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold">{partnerStats.trades_this_week}</div>
                    <div className="text-sm text-muted-foreground">Partner's Trades</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold">{partnerStats.journal_entries_this_week}</div>
                    <div className="text-sm text-muted-foreground">Journal Entries</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Flame className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold">{partnerStats.streak}</div>
                    <div className="text-sm text-muted-foreground">Day Streak</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold">{partnerStats.green_days_this_week}</div>
                    <div className="text-sm text-muted-foreground">Green Days</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Journals Tab */}
            <TabsContent value="journals" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {partner.partner_profile?.display_name || "Partner"}'s Recent Journals
                  </CardTitle>
                  <CardDescription>View your partner's journal entries to stay in sync</CardDescription>
                </CardHeader>
                <CardContent>
                  {partnerJournals.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No journal entries this week</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {partnerJournals.map((journal) => (
                        <Card key={journal.id} className="bg-muted/30">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(new Date(journal.date), "EEEE, MMMM d")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {journal.mood_rating && (
                                  <Badge variant="outline" className="text-xs">
                                    Mood: {journal.mood_rating}/5
                                  </Badge>
                                )}
                                {journal.discipline_rating && (
                                  <Badge variant="outline" className="text-xs">
                                    Discipline: {journal.discipline_rating}/5
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {journal.goals && journal.goals.length > 0 && (
                              <div className="mb-3">
                                <div className="text-sm font-medium mb-1">Goals:</div>
                                <div className="flex flex-wrap gap-1">
                                  {journal.goals.map((goal, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {goal}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {journal.pre_market_notes && (
                              <div className="mb-3">
                                <div className="text-sm font-medium mb-1">Pre-Market Notes:</div>
                                <p className="text-sm text-muted-foreground bg-background p-2 rounded">
                                  {journal.pre_market_notes}
                                </p>
                              </div>
                            )}

                            {journal.post_market_notes && (
                              <div>
                                <div className="text-sm font-medium mb-1">Post-Market Notes:</div>
                                <p className="text-sm text-muted-foreground bg-background p-2 rounded">
                                  {journal.post_market_notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trades Tab */}
            <TabsContent value="trades" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <List className="h-5 w-5" />
                    {partner.partner_profile?.display_name || "Partner"}'s Recent Trades
                  </CardTitle>
                  <CardDescription>See what trades your partner has been taking</CardDescription>
                </CardHeader>
                <CardContent>
                  {partnerTrades.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No trades this week</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {partnerTrades.map((trade) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-8 rounded-full",
                              trade.side === "long" ? "bg-green-500" : "bg-red-500"
                            )} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{trade.symbol}</span>
                                <Badge variant="outline" className="text-xs">
                                  {trade.side.toUpperCase()}
                                </Badge>
                                {trade.setup_name && (
                                  <Badge variant="secondary" className="text-xs">
                                    {trade.setup_name}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(trade.entry_date), "MMM d, h:mm a")} · {trade.quantity} contracts
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {trade.status === "closed" && trade.net_pnl !== null ? (
                              <div className={cn(
                                "font-bold flex items-center gap-1",
                                trade.net_pnl >= 0 ? "text-green-500" : "text-red-500"
                              )}>
                                {trade.net_pnl >= 0 ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4" />
                                )}
                                {formatCurrency(trade.net_pnl)}
                              </div>
                            ) : (
                              <Badge variant="outline">Open</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        // No Partner - Find One
        <div className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Find an Accountability Partner</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Partner with another trader to share your progress, view each other's journals and trades, and hold each other accountable.
              </p>
              <Button onClick={() => setIsFindDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Find a Partner
              </Button>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Eye className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <h3 className="font-semibold mb-1">View Journals</h3>
                <p className="text-sm text-muted-foreground">
                  Read your partner's daily journal entries and reflections
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <List className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                <h3 className="font-semibold mb-1">See Trades</h3>
                <p className="text-sm text-muted-foreground">
                  View your partner's recent trades and learn from each other
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                <h3 className="font-semibold mb-1">Compare Stats</h3>
                <p className="text-sm text-muted-foreground">
                  Weekly stat comparisons to stay motivated and competitive
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Find Partner Dialog */}
      <CustomDialog open={isFindDialogOpen} onOpenChange={setIsFindDialogOpen}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Find an Accountability Partner</CustomDialogTitle>
            <CustomDialogDescription>
              Search for a trader by their username to send a partnership request
            </CustomDialogDescription>
          </CustomDialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchForPartner()}
              />
              <Button onClick={searchForPartner} disabled={isSearching}>
                {isSearching ? <Spinner className="h-4 w-4" /> : "Search"}
              </Button>
            </div>

            {searchResult && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={searchResult.avatar_url || undefined} />
                        <AvatarFallback>
                          {searchResult.display_name?.[0] || searchResult.username?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {searchResult.display_name || searchResult.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          @{searchResult.username}
                        </div>
                      </div>
                    </div>
                    <Button onClick={sendPartnerRequest}>
                      <Send className="h-4 w-4 mr-2" />
                      Send Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setIsFindDialogOpen(false)}>
              Cancel
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>
    </div>
  );
}

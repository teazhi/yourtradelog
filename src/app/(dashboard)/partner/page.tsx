"use client";

import * as React from "react";
import { format, formatDistanceToNow } from "date-fns";
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
  Star,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Target,
  Zap,
  Award,
  PartyPopper,
  MessageSquare,
  Plus,
  Check,
  X,
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
  Textarea,
  Progress,
  CelebrationModal,
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

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  type: "journal" | "trades" | "green_days" | "win_rate" | "custom";
  my_progress: number;
  partner_progress: number;
  start_date: string;
  end_date: string;
  created_by: string;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_celebration?: boolean;
}

// Pre-defined challenge templates
const CHALLENGE_TEMPLATES = [
  { title: "Journal Every Day", description: "Write in your journal every trading day", target: 5, type: "journal" as const },
  { title: "5 Green Days", description: "Have 5 profitable trading days this week", target: 5, type: "green_days" as const },
  { title: "10 Trades", description: "Complete at least 10 trades this week", target: 10, type: "trades" as const },
  { title: "60% Win Rate", description: "Achieve a 60% or higher win rate", target: 60, type: "win_rate" as const },
];

export default function AccountabilityPartnerPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [partner, setPartner] = React.useState<Partner | null>(null);
  const [pendingRequests, setPendingRequests] = React.useState<PendingRequest[]>([]);
  const [isFindDialogOpen, setIsFindDialogOpen] = React.useState(false);
  const [searchUsername, setSearchUsername] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Challenges
  const [challenges, setChallenges] = React.useState<Challenge[]>([
    {
      id: "1",
      title: "Journal Every Day",
      description: "Write in your journal every trading day this week",
      target: 5,
      type: "journal",
      my_progress: 3,
      partner_progress: 4,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: "me",
    },
    {
      id: "2",
      title: "5 Green Days",
      description: "Have 5 profitable trading days",
      target: 5,
      type: "green_days",
      my_progress: 2,
      partner_progress: 3,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: "partner",
    },
  ]);
  const [isNewChallengeOpen, setIsNewChallengeOpen] = React.useState(false);
  const [newChallenge, setNewChallenge] = React.useState<{
    title: string;
    description: string;
    target: number;
    type: "journal" | "trades" | "green_days" | "win_rate" | "custom";
  }>({ title: "", description: "", target: 5, type: "custom" });
  const [celebration, setCelebration] = React.useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });

  // Messages
  const [messages, setMessages] = React.useState<Message[]>([
    { id: "1", sender_id: "partner", content: "Great job on hitting your journal streak! 🔥", created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: "2", sender_id: "me", content: "Thanks! Your consistency is inspiring me to keep going.", created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    { id: "3", sender_id: "partner", content: "Let's both aim for 5 green days this week!", created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), is_celebration: false },
  ]);
  const [newMessage, setNewMessage] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Celebrations/Achievements
  const [recentAchievements, setRecentAchievements] = React.useState([
    { id: "1", user: "partner", title: "7-Day Journal Streak", icon: Flame, date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: "2", user: "me", title: "First $500 Day", icon: Trophy, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  ]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchPartnerData();
    }
  }, [mounted]);

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getWeekStart = () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calculateStats = async (userId: string, supabase: any): Promise<PartnerStats> => {
    const weekStart = getWeekStart();

    const { data: trades } = await supabase
      .from("trades")
      .select("net_pnl, entry_date, status")
      .eq("user_id", userId)
      .eq("status", "closed")
      .gte("entry_date", weekStart.toISOString());

    const { count: journalCount } = await supabase
      .from("daily_journals")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("date", weekStart.toISOString().split('T')[0]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tradesArray = trades || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wins = tradesArray.filter((t: any) => (t.net_pnl || 0) > 0).length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPnl = tradesArray.reduce((sum: number, t: any) => sum + (t.net_pnl || 0), 0);

    const dailyPnl: Record<string, number> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tradesArray.forEach((t: any) => {
      const date = new Date(t.entry_date).toISOString().split('T')[0];
      dailyPnl[date] = (dailyPnl[date] || 0) + (t.net_pnl || 0);
    });
    const greenDays = Object.values(dailyPnl).filter(pnl => pnl > 0).length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

      const myStatsData = await calculateStats(user.id, supabase);
      setMyStats(myStatsData);

      const { data: partnerships } = await supabase
        .from("accountability_partners")
        .select("*")
        .or(`user_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq("status", "active")
        .limit(1);

      if (partnerships && partnerships.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const partnership = partnerships[0] as any;
        const partnerId = partnership.user_id === user.id ? partnership.partner_id : partnership.user_id;

        const { data: partnerProfile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", partnerId)
          .single();

        setPartner({
          ...partnership,
          partner_profile: partnerProfile,
        });

        const partnerStatsData = await calculateStats(partnerId, supabase);
        setPartnerStats(partnerStatsData);

        const weekStart = getWeekStart();
        const { data: journals } = await supabase
          .from("daily_journals")
          .select("id, date, pre_market_notes, post_market_notes, mood_rating, focus_rating, discipline_rating, goals")
          .eq("user_id", partnerId)
          .gte("date", weekStart.toISOString().split('T')[0])
          .order("date", { ascending: false })
          .limit(7);

        setPartnerJournals((journals || []) as PartnerJournal[]);

        const { data: trades } = await supabase
          .from("trades")
          .select("id, symbol, side, entry_date, exit_date, net_pnl, status, quantity, setup_name, emotion_tags")
          .eq("user_id", partnerId)
          .gte("entry_date", weekStart.toISOString())
          .order("entry_date", { ascending: false })
          .limit(20);

        setPartnerTrades((trades || []) as PartnerTrade[]);
      }

      const { data: requests } = await supabase
        .from("accountability_partners")
        .select("id, user_id")
        .eq("partner_id", user.id)
        .eq("status", "pending");

      if (requests && requests.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requesterIds = requests.map((r: any) => r.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", requesterIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const requestsWithProfiles = requests.map((r: any) => ({
          ...r,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          requester_profile: (profiles as any[])?.find(p => p.id === r.user_id),
        }));

        setPendingRequests(requestsWithProfiles);
      }
    } catch {
      // Silent fail
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
    } catch {
      toast.error("User not found");
    } finally {
      setIsSearching(false);
    }
  };

  const sendPartnerRequest = async () => {
    if (!searchResult || !currentUserId) return;

    try {
      const supabase = createClient();

      const { data: existing } = await supabase
        .from("accountability_partners")
        .select("id")
        .or(`and(user_id.eq.${currentUserId},partner_id.eq.${searchResult.id}),and(user_id.eq.${searchResult.id},partner_id.eq.${currentUserId})`)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error("Partnership request already exists");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch {
      toast.error("Failed to send request");
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      const supabase = createClient();

      if (accept) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch {
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
    } catch {
      toast.error("Failed to end partnership");
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      sender_id: "me",
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage("");
    toast.success("Message sent!");
  };

  const sendCelebration = (achievement: string) => {
    const message: Message = {
      id: Date.now().toString(),
      sender_id: "me",
      content: `🎉 Congrats on "${achievement}"! Keep crushing it!`,
      created_at: new Date().toISOString(),
      is_celebration: true,
    };

    setMessages([...messages, message]);
    toast.success("Celebration sent!");
  };

  const createChallenge = () => {
    if (!newChallenge.title.trim()) {
      toast.error("Please enter a challenge title");
      return;
    }

    const challenge: Challenge = {
      id: Date.now().toString(),
      ...newChallenge,
      my_progress: 0,
      partner_progress: 0,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: "me",
    };

    setChallenges([...challenges, challenge]);
    setNewChallenge({ title: "", description: "", target: 5, type: "custom" });
    setIsNewChallengeOpen(false);
    toast.success("Challenge created!");
  };

  const useTemplate = (template: typeof CHALLENGE_TEMPLATES[0]) => {
    setNewChallenge({
      title: template.title,
      description: template.description,
      target: template.target,
      type: template.type,
    });
  };

  const incrementProgress = (challengeId: string) => {
    setChallenges(prev => prev.map(c => {
      if (c.id === challengeId) {
        const newProgress = Math.min(c.my_progress + 1, c.target);
        // Check if this completes the challenge
        if (newProgress === c.target && c.my_progress < c.target) {
          // Trigger celebration
          setTimeout(() => {
            setCelebration({
              show: true,
              title: "Challenge Complete! 🎉",
              message: `You completed "${c.title}"! Keep up the amazing work!`,
            });
          }, 300);
        }
        return { ...c, my_progress: newProgress };
      }
      return c;
    }));
  };

  const closeCelebration = () => {
    setCelebration({ show: false, title: "", message: "" });
  };

  // Progress Ring Component
  const ProgressRing = ({ progress, size = 80, strokeWidth = 8, color = "green" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    const colorClass = color === "green" ? "stroke-green-500" : color === "blue" ? "stroke-blue-500" : "stroke-purple-500";

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            className="stroke-muted"
            strokeWidth={strokeWidth}
            fill="none"
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <circle
            className={cn("transition-all duration-500", colorClass)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{Math.round(progress)}%</span>
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
    <div className="flex flex-1 flex-col gap-6">
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
        <div className="space-y-6">
          {/* Partner Header with Visual Stats */}
          <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-teal-500/5 overflow-hidden">
            <CardContent className="py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Partner Info */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-4 border-green-500">
                      <AvatarImage src={partner.partner_profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-2xl bg-green-500/20">
                        {partner.partner_profile?.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                      <Handshake className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-bold">
                        {partner.partner_profile?.display_name || partner.partner_profile?.username || "Partner"}
                      </h3>
                    </div>
                    <p className="text-muted-foreground">@{partner.partner_profile?.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        <Flame className="h-3 w-3 mr-1" />
                        {partnerStats.streak} day streak
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Stats Visual */}
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <ProgressRing progress={partnerStats.win_rate} color="green" />
                    <p className="text-sm text-muted-foreground mt-2">Win Rate</p>
                  </div>
                  <div className="text-center">
                    <ProgressRing progress={(partnerStats.journal_entries_this_week / 5) * 100} color="blue" />
                    <p className="text-sm text-muted-foreground mt-2">Journal</p>
                  </div>
                  <div className="text-center">
                    <ProgressRing progress={(partnerStats.green_days_this_week / 5) * 100} color="purple" />
                    <p className="text-sm text-muted-foreground mt-2">Green Days</p>
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={endPartnership}>
                  End Partnership
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="challenges">
                <Target className="h-4 w-4 mr-2" />
                Challenges
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
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
              {/* Recent Achievements */}
              {recentAchievements.length > 0 && (
                <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentAchievements.map((achievement) => (
                        <div key={achievement.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              achievement.user === "me" ? "bg-green-500/20" : "bg-blue-500/20"
                            )}>
                              <achievement.icon className={cn(
                                "h-5 w-5",
                                achievement.user === "me" ? "text-green-500" : "text-blue-500"
                              )} />
                            </div>
                            <div>
                              <p className="font-medium">{achievement.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {achievement.user === "me" ? "You" : partner.partner_profile?.display_name} • {formatDistanceToNow(new Date(achievement.date), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                          {achievement.user === "partner" && (
                            <Button size="sm" variant="outline" onClick={() => sendCelebration(achievement.title)}>
                              <PartyPopper className="h-4 w-4 mr-1" />
                              Celebrate
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weekly Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">This Week&apos;s Battle</CardTitle>
                  <CardDescription>See how you stack up against each other</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between pb-4 border-b mb-4">
                    <div className="flex-1 text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarFallback className="bg-green-500/20">You</AvatarFallback>
                      </Avatar>
                      <div className="font-semibold">You</div>
                    </div>
                    <div className="flex-1 text-center">
                      <Zap className="h-8 w-8 mx-auto text-yellow-500" />
                      <div className="text-sm text-muted-foreground">VS</div>
                    </div>
                    <div className="flex-1 text-center">
                      <Avatar className="h-12 w-12 mx-auto mb-2">
                        <AvatarImage src={partner.partner_profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-500/20">
                          {partner.partner_profile?.display_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="font-semibold">{partner.partner_profile?.display_name}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Trades", myValue: myStats.trades_this_week, partnerValue: partnerStats.trades_this_week },
                      { label: "P&L", myValue: myStats.pnl_this_week, partnerValue: partnerStats.pnl_this_week, format: formatCurrency },
                      { label: "Win Rate", myValue: myStats.win_rate, partnerValue: partnerStats.win_rate, format: (v: number) => `${v.toFixed(0)}%` },
                      { label: "Green Days", myValue: myStats.green_days_this_week, partnerValue: partnerStats.green_days_this_week },
                      { label: "Journal Entries", myValue: myStats.journal_entries_this_week, partnerValue: partnerStats.journal_entries_this_week },
                    ].map((stat) => {
                      const total = stat.myValue + stat.partnerValue || 1;
                      const myPercent = (stat.myValue / total) * 100;
                      const formatFn = stat.format || ((v: number) => v.toString());

                      return (
                        <div key={stat.label} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className={cn("font-medium", stat.myValue > stat.partnerValue && "text-green-500")}>
                              {formatFn(stat.myValue)}
                            </span>
                            <span className="text-muted-foreground">{stat.label}</span>
                            <span className={cn("font-medium", stat.partnerValue > stat.myValue && "text-green-500")}>
                              {formatFn(stat.partnerValue)}
                            </span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div
                              className="bg-green-500 transition-all duration-500"
                              style={{ width: `${myPercent}%` }}
                            />
                            <div
                              className="bg-blue-500 transition-all duration-500"
                              style={{ width: `${100 - myPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Challenges Tab */}
            <TabsContent value="challenges" className="space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Weekly Challenges</h3>
                  <p className="text-sm text-muted-foreground">Compete with your partner on weekly goals</p>
                </div>
                <Button onClick={() => setIsNewChallengeOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Challenge
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((challenge) => {
                  const myProgress = (challenge.my_progress / challenge.target) * 100;
                  const partnerProgress = (challenge.partner_progress / challenge.target) * 100;

                  return (
                    <Card key={challenge.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{challenge.title}</CardTitle>
                            <CardDescription>{challenge.description}</CardDescription>
                          </div>
                          <Badge variant="outline">
                            <Target className="h-3 w-3 mr-1" />
                            {challenge.target}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>You</span>
                            <span className="font-medium">{challenge.my_progress}/{challenge.target}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={myProgress} className={cn("h-2 flex-1", myProgress >= 100 && "animate-glow-pulse [&>div]:bg-green-500")} />
                            {myProgress < 100 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 p-0"
                                onClick={() => incrementProgress(challenge.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{partner.partner_profile?.display_name}</span>
                            <span className="font-medium">{challenge.partner_progress}/{challenge.target}</span>
                          </div>
                          <Progress value={partnerProgress} className={cn("h-2", partnerProgress >= 100 ? "[&>div]:bg-green-500" : "[&>div]:bg-blue-500")} />
                        </div>
                        {myProgress >= 100 && partnerProgress >= 100 ? (
                          <div className="flex items-center justify-center gap-2 text-green-500 text-sm font-medium animate-pulse">
                            <Trophy className="h-4 w-4" />
                            Both completed! 🎉
                          </div>
                        ) : myProgress >= 100 ? (
                          <div className="flex items-center justify-center gap-2 text-green-500 text-sm font-medium">
                            <Trophy className="h-4 w-4" />
                            You completed it! 🏆
                          </div>
                        ) : partnerProgress >= 100 ? (
                          <div className="flex items-center justify-center gap-2 text-blue-500 text-sm">
                            <Flame className="h-4 w-4" />
                            Partner finished first!
                          </div>
                        ) : myProgress > partnerProgress ? (
                          <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
                            <TrendingUp className="h-4 w-4" />
                            You&apos;re in the lead!
                          </div>
                        ) : partnerProgress > myProgress ? (
                          <div className="flex items-center justify-center gap-2 text-orange-500 text-sm">
                            <Zap className="h-4 w-4" />
                            Catch up!
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="mt-6">
              <Card className="h-[500px] flex flex-col">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Chat with {partner.partner_profile?.display_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender_id === "me" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-4 py-2",
                          message.sender_id === "me"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted",
                          message.is_celebration && "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
                        )}
                      >
                        <p>{message.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          message.sender_id === "me" ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </CardContent>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Journals Tab */}
            <TabsContent value="journals" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {partner.partner_profile?.display_name}&apos;s Recent Journals
                  </CardTitle>
                  <CardDescription>View your partner&apos;s journal entries to stay in sync</CardDescription>
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
                    {partner.partner_profile?.display_name}&apos;s Recent Trades
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
          <Card className="border-2 border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 mx-auto mb-6 flex items-center justify-center">
                <Users className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Find an Accountability Partner</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Partner with another trader to share your progress, compete in challenges, and hold each other accountable.
              </p>
              <Button size="lg" onClick={() => setIsFindDialogOpen(true)}>
                <UserPlus className="h-5 w-5 mr-2" />
                Find a Partner
              </Button>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-green-500/20 mx-auto mb-3 flex items-center justify-center">
                  <Eye className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold mb-1">View Journals</h3>
                <p className="text-sm text-muted-foreground">
                  Read your partner&apos;s daily reflections
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 mx-auto mb-3 flex items-center justify-center">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold mb-1">Weekly Challenges</h3>
                <p className="text-sm text-muted-foreground">
                  Compete on goals together
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 mx-auto mb-3 flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold mb-1">Direct Chat</h3>
                <p className="text-sm text-muted-foreground">
                  Message and celebrate wins
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 mx-auto mb-3 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-yellow-500" />
                </div>
                <h3 className="font-semibold mb-1">Compare Stats</h3>
                <p className="text-sm text-muted-foreground">
                  Weekly stat battles
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

      {/* New Challenge Dialog */}
      <CustomDialog open={isNewChallengeOpen} onOpenChange={setIsNewChallengeOpen}>
        <CustomDialogContent className="max-w-lg">
          <CustomDialogHeader>
            <CustomDialogTitle>Create a Challenge</CustomDialogTitle>
            <CustomDialogDescription>
              Challenge your partner to a weekly goal
            </CustomDialogDescription>
          </CustomDialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick Templates */}
            <div>
              <p className="text-sm font-medium mb-2">Quick Templates</p>
              <div className="grid grid-cols-2 gap-2">
                {CHALLENGE_TEMPLATES.map((template, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto py-2"
                    onClick={() => useTemplate(template)}
                  >
                    <Target className="h-4 w-4 mr-2 shrink-0" />
                    <span className="truncate">{template.title}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Challenge Title</label>
                <Input
                  placeholder="e.g., No Revenge Trades"
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe the challenge..."
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Target</label>
                <Input
                  type="number"
                  min={1}
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge({ ...newChallenge, target: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
          </div>

          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setIsNewChallengeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createChallenge}>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Celebration Modal */}
      <CelebrationModal
        open={celebration.show}
        onClose={closeCelebration}
        title={celebration.title}
        message={celebration.message}
        icon={<div className="text-6xl">🏆</div>}
      />
    </div>
  );
}

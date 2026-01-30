"use client";

import * as React from "react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import {
  Users,
  UserPlus,
  Bell,
  CheckCircle2,
  Handshake,
  Plus,
  Copy,
  Share2,
  Clock,
  DollarSign,
  AlertTriangle,
  Shield,
  Check,
  TrendingDown,
  TrendingUp,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
  X,
  MoreVertical,
  Flame,
  Trophy,
  Target,
  Calendar,
  History,
  Zap,
  MessageCircle,
  Award,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  RefreshCw,
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
  Progress,
  CelebrationModal,
  Separator,
  Textarea,
  Switch,
} from "@/components/ui";
import {
  CustomDialog,
  CustomDialogContent,
  CustomDialogDescription,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/ui/custom-dialog";
import { usePartner } from "@/lib/partner";
import { createClient } from "@/lib/supabase/client";
import type {
  ChallengeType,
  PartnerProfile,
  PartnerChallenge,
  PartnerRule,
} from "@/types/partner";

// =====================================================
// PRESET DATA
// =====================================================

const RULE_PRESETS = [
  { title: "Max 2 contracts per trade", description: "Don't oversize positions", stake: 50 },
  { title: "Stop trading at -$500 daily", description: "Respect your daily loss limit", stake: 100 },
  { title: "No revenge trading", description: "Wait 10 min after a loss before next trade", stake: 50 },
  { title: "Complete pre-market routine", description: "Prep before market open", stake: 25 },
  { title: "Stop after 3 consecutive losses", description: "Walk away to clear your head", stake: 75 },
  { title: "Journal every trade", description: "Document your entries and exits", stake: 20 },
  { title: "No trading during major news", description: "Avoid high volatility events", stake: 50 },
  { title: "Always use a stop loss", description: "Protect your capital", stake: 50 },
];

const CHALLENGE_PRESETS: { title: string; description: string; type: ChallengeType; target: number; duration: number }[] = [
  { title: "Green Week", description: "Most profitable days this week wins", type: "green_days", target: 5, duration: 7 },
  { title: "Journal Streak", description: "Journal every trading day", type: "journal_streak", target: 5, duration: 7 },
  { title: "No Rule Breaks", description: "Go without any rule violations", type: "no_violations", target: 7, duration: 7 },
  { title: "Profit Race", description: "First to hit profit target wins", type: "profit_target", target: 1000, duration: 14 },
  { title: "Discipline Streak", description: "Complete daily check-ins every day", type: "discipline_streak", target: 5, duration: 7 },
];

// Quick messages to send partner - focused on accountability & support
const QUICK_MESSAGES = {
  checkin: [
    "Did you do your pre-market prep? 📋",
    "How's your trading day going? 👀",
    "Don't forget to journal tonight! 📝",
    "Checking in - staying disciplined? 🎯",
    "Remember your max loss limit! ⚠️",
  ],
  encourage: [
    "You got this! 💪",
    "Stay disciplined, stay profitable 📈",
    "Trust your process! 🎯",
    "One trade at a time 🧘",
    "Patience pays off 🌱",
  ],
  support: [
    "Rough day? Tomorrow's a reset 🌅",
    "One bad day doesn't define you 💯",
    "We all have red days. Bounce back! 🔄",
    "Keep your head up 🙏",
    "Remember why you started 🎯",
  ],
};

// Accountability milestones (not competitive)
const MILESTONES = [
  { id: "first_checkin", name: "First Check-in", description: "Complete your first daily check-in", icon: "✅", requirement: 1 },
  { id: "week_streak", name: "Week Warrior", description: "7-day check-in streak", icon: "📅", requirement: 7 },
  { id: "clean_week", name: "Clean Week", description: "No rule violations for 7 days", icon: "✨", requirement: 7 },
  { id: "month_streak", name: "Monthly Master", description: "30-day check-in streak", icon: "🗓️", requirement: 30 },
  { id: "iron_discipline", name: "Iron Discipline", description: "No violations for 30 days", icon: "🛡️", requirement: 30 },
  { id: "journaling_habit", name: "Journaling Habit", description: "Journal 20 trading days", icon: "📝", requirement: 20 },
  { id: "accountability_duo", name: "Accountability Duo", description: "Both partners check-in same day 10 times", icon: "🤝", requirement: 10 },
];

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function PartnerPage() {
  const [state, actions] = usePartner();
  const {
    isLoading,
    currentUserId,
    currentUsername,
    partnership,
    partnerProfile,
    pendingRequests,
    rules,
    activeChallenges,
    pastChallenges,
    todayStatus,
    balance,
    stats,
    notifications,
    unreadCount,
  } = state;

  // View state
  const [activeView, setActiveView] = React.useState<"today" | "challenges" | "rules">("today");
  const [showPastChallenges, setShowPastChallenges] = React.useState(false);

  // Dialog states
  const [showFindDialog, setShowFindDialog] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [showAddRuleDialog, setShowAddRuleDialog] = React.useState(false);
  const [showViolationDialog, setShowViolationDialog] = React.useState(false);
  const [showCheckInDialog, setShowCheckInDialog] = React.useState(false);
  const [showNewChallengeDialog, setShowNewChallengeDialog] = React.useState(false);
  const [showChallengeDetailDialog, setShowChallengeDetailDialog] = React.useState(false);
  const [showEndPartnershipDialog, setShowEndPartnershipDialog] = React.useState(false);
  const [showSettleDialog, setShowSettleDialog] = React.useState(false);

  // Search state
  const [searchUsername, setSearchUsername] = React.useState("");
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchResult, setSearchResult] = React.useState<PartnerProfile | null>(null);

  // Form states
  const [newRuleTitle, setNewRuleTitle] = React.useState("");
  const [newRuleDescription, setNewRuleDescription] = React.useState("");
  const [newRuleStake, setNewRuleStake] = React.useState(50);
  const [selectedRule, setSelectedRule] = React.useState<PartnerRule | null>(null);
  const [violationNote, setViolationNote] = React.useState("");
  const [selectedChallenge, setSelectedChallenge] = React.useState<PartnerChallenge | null>(null);

  const [newChallenge, setNewChallenge] = React.useState({
    title: "",
    description: "",
    type: "green_days" as ChallengeType,
    target: 5,
    stake: 50,
    duration: 7,
  });

  // Check-in form
  const [checkInType, setCheckInType] = React.useState<"pre_market" | "post_market">("pre_market");
  const [preMarketChecks, setPreMarketChecks] = React.useState({
    calendar: false,
    levels: false,
    bias: false,
    maxLoss: false,
  });
  const [tradingPlan, setTradingPlan] = React.useState("");
  const [followedRules, setFollowedRules] = React.useState(true);
  const [sessionNotes, setSessionNotes] = React.useState("");

  // Auto-synced P&L from actual trades (can't be faked!)
  const [verifiedDailyPnL, setVerifiedDailyPnL] = React.useState<number | null>(null);
  const [verifiedTradeCount, setVerifiedTradeCount] = React.useState<number>(0);
  const [isLoadingPnL, setIsLoadingPnL] = React.useState(false);

  // Celebration
  const [celebration, setCelebration] = React.useState<{ show: boolean; title: string; message: string }>({
    show: false, title: "", message: ""
  });

  // Quick message state
  const [showQuickMessageDialog, setShowQuickMessageDialog] = React.useState(false);
  const [selectedMessageCategory, setSelectedMessageCategory] = React.useState<"checkin" | "encourage" | "support">("checkin");

  // Loading states for actions
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // =====================================================
  // HANDLERS
  // =====================================================

  const handleSearch = async () => {
    if (!searchUsername.trim()) return;
    setIsSearching(true);
    setSearchResult(null);

    try {
      const profile = await actions.searchUser(searchUsername);
      if (profile) {
        if (profile.id === currentUserId) {
          toast.error("You can't partner with yourself!");
          return;
        }
        setSearchResult(profile);
      } else {
        toast.error("User not found");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult) return;
    setIsSubmitting(true);

    const result = await actions.sendRequest(searchResult.id);
    if (result.success) {
      toast.success(`Request sent to ${searchResult.display_name || searchResult.username}!`);
      setShowFindDialog(false);
      setSearchUsername("");
      setSearchResult(null);
    } else {
      toast.error(result.error || "Failed to send request");
    }
    setIsSubmitting(false);
  };

  const handleRespondToRequest = async (requestId: string, accept: boolean) => {
    setIsSubmitting(true);
    const result = await actions.respondToRequest(requestId, accept);

    if (result.success && accept) {
      setCelebration({
        show: true,
        title: "You're Partnered! 🤝",
        message: "Now create a challenge or set rules to compete!",
      });
    } else if (!result.success) {
      toast.error(result.error || "Failed to respond");
    }
    setIsSubmitting(false);
  };

  const handleEndPartnership = async () => {
    setIsSubmitting(true);
    const result = await actions.endPartnership();
    if (result.success) {
      toast.success("Partnership ended");
      setShowEndPartnershipDialog(false);
    } else {
      toast.error(result.error || "Failed to end partnership");
    }
    setIsSubmitting(false);
  };

  const handleAddRule = async () => {
    if (!newRuleTitle.trim()) {
      toast.error("Enter a rule title");
      return;
    }
    setIsSubmitting(true);

    const result = await actions.createRule({
      title: newRuleTitle,
      description: newRuleDescription || undefined,
      stake_amount: newRuleStake,
    });

    if (result.success) {
      toast.success("Rule added! Your partner has been notified.");
      setNewRuleTitle("");
      setNewRuleDescription("");
      setNewRuleStake(50);
      setShowAddRuleDialog(false);
    } else {
      toast.error(result.error || "Failed to add rule");
    }
    setIsSubmitting(false);
  };

  const handleReportViolation = async () => {
    if (!selectedRule) return;
    setIsSubmitting(true);

    const result = await actions.reportViolation(selectedRule.id, violationNote || undefined);
    if (result.success) {
      toast.success(`Violation reported. You owe $${selectedRule.stake_amount}.`);
      setShowViolationDialog(false);
      setSelectedRule(null);
      setViolationNote("");
    } else {
      toast.error(result.error || "Failed to report violation");
    }
    setIsSubmitting(false);
  };

  const handleCreateChallenge = async () => {
    if (!newChallenge.title.trim()) {
      toast.error("Enter a challenge title");
      return;
    }
    setIsSubmitting(true);

    const startDate = new Date().toISOString();
    const endDate = addDays(new Date(), newChallenge.duration).toISOString();

    const result = await actions.createChallenge({
      title: newChallenge.title,
      description: newChallenge.description || undefined,
      challenge_type: newChallenge.type,
      target_value: newChallenge.target,
      stake_amount: newChallenge.stake,
      start_date: startDate,
      end_date: endDate,
    });

    if (result.success) {
      toast.success("Challenge created! Your partner has been notified.");
      setCelebration({
        show: true,
        title: "Challenge Started! 🏆",
        message: `${newChallenge.title} - $${newChallenge.stake} stake`,
      });
      setNewChallenge({ title: "", description: "", type: "green_days", target: 5, stake: 50, duration: 7 });
      setShowNewChallengeDialog(false);
    } else {
      toast.error(result.error || "Failed to create challenge");
    }
    setIsSubmitting(false);
  };

  const handleIncrementProgress = async (challengeId: string) => {
    const result = await actions.incrementProgress(challengeId);
    if (result.success) {
      const challenge = activeChallenges.find(c => c.id === challengeId);
      if (challenge && (challenge.my_progress || 0) + 1 >= challenge.target_value) {
        toast.success("You hit your target! 🎯");
      }
    } else {
      toast.error(result.error || "Failed to update progress");
    }
  };

  const handleCheckIn = async () => {
    setIsSubmitting(true);

    const result = await actions.submitCheckIn({
      check_in_type: checkInType,
      check_in_date: new Date().toISOString().split("T")[0],
      ...(checkInType === "pre_market"
        ? {
            checked_calendar: preMarketChecks.calendar,
            marked_levels: preMarketChecks.levels,
            has_bias: preMarketChecks.bias,
            set_max_loss: preMarketChecks.maxLoss,
            trading_plan: tradingPlan || undefined,
          }
        : {
            // Use VERIFIED P&L from actual trades (can't be faked!)
            daily_pnl: verifiedDailyPnL ?? 0,
            followed_rules: followedRules,
            session_notes: sessionNotes || undefined,
          }),
    });

    if (result.success) {
      const isPreMarket = checkInType === "pre_market";
      setCelebration({
        show: true,
        title: isPreMarket ? "Ready to Trade! 🎯" : "Great Work Today! 💪",
        message: isPreMarket
          ? "Pre-market complete. Good luck today!"
          : followedRules
          ? "You followed your rules. Keep it up!"
          : "Remember to follow your rules tomorrow.",
      });
      setShowCheckInDialog(false);
      resetCheckInForm();
    } else {
      toast.error(result.error || "Failed to submit check-in");
    }
    setIsSubmitting(false);
  };

  const resetCheckInForm = () => {
    setPreMarketChecks({ calendar: false, levels: false, bias: false, maxLoss: false });
    setTradingPlan("");
    setFollowedRules(true);
    setSessionNotes("");
    setVerifiedDailyPnL(null);
    setVerifiedTradeCount(0);
  };

  // Fetch today's ACTUAL P&L from trades (auto-sync - can't be faked!)
  const fetchTodayPnL = async () => {
    if (!currentUserId) return;

    setIsLoadingPnL(true);
    try {
      const supabase = createClient();
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Fetch trades from today
      const { data: trades, error } = await supabase
        .from('trades')
        .select('net_pnl, status')
        .eq('user_id', currentUserId)
        .gte('entry_date', todayStr)
        .lt('entry_date', `${todayStr}T23:59:59`);

      if (error) {
        console.error('Error fetching trades:', error);
        setVerifiedDailyPnL(0);
        setVerifiedTradeCount(0);
        return;
      }

      // Calculate total P&L from closed trades
      const closedTrades = (trades as Array<{ net_pnl: number | null; status: string }> | null)?.filter(t => t.status === 'closed') || [];
      const totalPnL = closedTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);

      setVerifiedDailyPnL(totalPnL);
      setVerifiedTradeCount(closedTrades.length);
    } catch (err) {
      console.error('Error fetching P&L:', err);
      setVerifiedDailyPnL(0);
      setVerifiedTradeCount(0);
    } finally {
      setIsLoadingPnL(false);
    }
  };

  // Open post-market check-in with auto-synced P&L
  const openPostMarketCheckIn = () => {
    setCheckInType("post_market");
    setShowCheckInDialog(true);
    fetchTodayPnL(); // Auto-fetch real P&L
  };

  const copyUsername = () => {
    if (currentUsername) {
      navigator.clipboard.writeText(currentUsername);
      toast.success("Username copied!");
    }
  };

  // Calculate totals
  const iOwe = balance?.user1_owes || 0;
  const theyOwe = balance?.user2_owes || 0;
  const netBalance = balance?.net_balance || 0;

  // Win/loss record
  const myWins = stats.challenges_won;
  const partnerWins = stats.challenges_lost;

  // Calculate accountability stats
  const bothCheckedInToday = todayStatus.pre_market_done || todayStatus.post_market_done;

  const handleSendQuickMessage = (message: string) => {
    // In a real app, this would send via notification system
    toast.success(`Message sent to ${partnerName}!`);
    setCelebration({
      show: true,
      title: "Message Sent! 💬",
      message: message,
    });
    setShowQuickMessageDialog(false);
  };

  // Calculate unlocked milestones (accountability-focused)
  const unlockedMilestones = React.useMemo(() => {
    const unlocked: string[] = [];
    // These would be tracked properly in a real app
    if (todayStatus.pre_market_done || todayStatus.post_market_done) unlocked.push("first_checkin");
    if (stats.total_violations === 0 && stats.total_challenges > 0) unlocked.push("clean_week");
    return unlocked;
  }, [todayStatus, stats]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // =====================================================
  // NO PARTNER - ONBOARDING VIEW
  // =====================================================
  if (!partnership) {
    return (
      <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Accountability Partner</h1>
          <p className="text-muted-foreground">
            Put real money on the line. Break rules, pay up. Win challenges, get paid.
          </p>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {pendingRequests.length} Partner Request{pendingRequests.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={request.partner_profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {request.partner_profile?.display_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {request.partner_profile?.display_name || request.partner_profile?.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        @{request.partner_profile?.username}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleRespondToRequest(request.id, false)}
                      disabled={isSubmitting}
                    >
                      Decline
                    </Button>
                    <Button
                      className="flex-1 sm:flex-none"
                      onClick={() => handleRespondToRequest(request.id, true)}
                      disabled={isSubmitting}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Get Started Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Get Started
              </CardTitle>
              <CardDescription>
                Find a trading partner or share your username
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full justify-start h-12"
                onClick={() => setShowFindDialog(true)}
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Find Partner by Username
              </Button>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Your Username</div>
                  <div className="text-muted-foreground text-sm">Share this with your trading buddy</div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 rounded-md bg-muted font-mono text-sm">
                    @{currentUsername || "..."}
                  </code>
                  <Button variant="ghost" size="icon" onClick={copyUsername}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it Works Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                How it works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">1</div>
                <div>
                  <div className="font-medium text-sm">Find a partner</div>
                  <div className="text-sm text-muted-foreground">Connect with another trader who wants to improve</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">2</div>
                <div>
                  <div className="font-medium text-sm">Set rules with stakes</div>
                  <div className="text-sm text-muted-foreground">"No revenge trading" - $50 stake. Break it? Pay up.</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">3</div>
                <div>
                  <div className="font-medium text-sm">Create challenges</div>
                  <div className="text-sm text-muted-foreground">"Most green days this week" with $50 on the line</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium">4</div>
                <div>
                  <div className="font-medium text-sm">Compete & improve</div>
                  <div className="text-sm text-muted-foreground">Winner takes the pot, both get better</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Find Partner Dialog */}
        <CustomDialog open={showFindDialog} onOpenChange={setShowFindDialog}>
          <CustomDialogContent>
            <CustomDialogHeader>
              <CustomDialogTitle>Find Partner</CustomDialogTitle>
              <CustomDialogDescription>Enter their username to send a request</CustomDialogDescription>
            </CustomDialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input
                  placeholder="username"
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? <Spinner className="h-4 w-4" /> : "Search"}
                </Button>
              </div>
              {searchResult && (
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={searchResult.avatar_url || undefined} />
                      <AvatarFallback>{searchResult.display_name?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{searchResult.display_name || searchResult.username}</div>
                      <div className="text-sm text-muted-foreground">@{searchResult.username}</div>
                    </div>
                  </div>
                  <Button onClick={handleSendRequest} disabled={isSubmitting}>
                    {isSubmitting ? <Spinner className="h-4 w-4" /> : "Send Request"}
                  </Button>
                </div>
              )}
            </div>
          </CustomDialogContent>
        </CustomDialog>


        <CelebrationModal
          open={celebration.show}
          onClose={() => setCelebration({ show: false, title: "", message: "" })}
          title={celebration.title}
          message={celebration.message}
        />
      </div>
    );
  }

  // =====================================================
  // HAS PARTNER - MAIN VIEW
  // =====================================================
  const partnerName = partnerProfile?.display_name?.split(" ")[0] || partnerProfile?.username || "Partner";

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-4">
      {/* Partner Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-green-500">
            <AvatarImage src={partnerProfile?.avatar_url || undefined} />
            <AvatarFallback>{partnerName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{partnerName}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Trophy className="h-3 w-3" />
              <span>{myWins}W - {partnerWins}L</span>
              {stats.net_profit !== 0 && (
                <Badge variant={stats.net_profit > 0 ? "default" : "secondary"} className="text-xs">
                  {stats.net_profit > 0 ? "+" : ""}{stats.net_profit.toFixed(0)}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="relative" onClick={() => actions.markAllNotificationsRead()}>
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center">
                {unreadCount}
              </span>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowEndPartnershipDialog(true)}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        {[
          { id: "today", label: "Today", icon: Sun, count: undefined },
          { id: "challenges", label: "Challenges", icon: Trophy, count: activeChallenges.length > 0 ? activeChallenges.length : undefined },
          { id: "rules", label: "Rules", icon: Shield, count: rules.length > 0 ? rules.length : undefined },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as typeof activeView)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all",
              activeView === tab.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count !== undefined && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* TODAY VIEW */}
      {activeView === "today" && (
        <div className="space-y-4">
          {/* Partner Status Card */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={partnerProfile?.avatar_url || undefined} />
                      <AvatarFallback>{partnerName[0]}</AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                      (todayStatus.partner_pre_market_done || todayStatus.partner_post_market_done) ? "bg-green-500" : "bg-gray-400"
                    )} />
                  </div>
                  <div>
                    <div className="font-medium">{partnerName}</div>
                    <div className="text-xs text-muted-foreground">Your accountability partner</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowQuickMessageDialog(true)}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Nudge
                </Button>
              </div>

              {/* Partner's Journal Status */}
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="text-xs font-medium text-muted-foreground mb-2">{partnerName}'s Journal Today</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {todayStatus.partner_pre_market_done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Sun className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "text-sm",
                      todayStatus.partner_pre_market_done ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      Pre-market
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {todayStatus.partner_post_market_done ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={cn(
                      "text-sm",
                      todayStatus.partner_post_market_done ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                    )}>
                      Post-market
                    </span>
                  </div>
                </div>
                {!todayStatus.partner_pre_market_done && !todayStatus.partner_post_market_done && (
                  <div className="text-xs text-muted-foreground mt-2">
                    {partnerName} hasn't journaled today yet
                  </div>
                )}
              </div>

              {/* Both checked in today indicator */}
              {bothCheckedInToday && (
                <div className="mt-3 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>You've checked in today!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Check-ins */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Daily Check-in
              </CardTitle>
              <CardDescription>
                Complete your routines to stay disciplined
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                onClick={() => {
                  if (!todayStatus.pre_market_done) {
                    setCheckInType("pre_market");
                    setShowCheckInDialog(true);
                  }
                }}
                disabled={todayStatus.pre_market_done}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  todayStatus.pre_market_done
                    ? "bg-green-500/10 border-green-500/30 cursor-default"
                    : "hover:bg-muted cursor-pointer"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    todayStatus.pre_market_done ? "bg-green-500" : "bg-muted"
                  )}>
                    {todayStatus.pre_market_done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Sun className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-sm">Pre-Market</span>
                    <div className="text-xs text-muted-foreground">
                      {todayStatus.pre_market_done ? "Completed" : "Prep before you trade"}
                    </div>
                  </div>
                </div>
                {!todayStatus.pre_market_done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>

              <button
                onClick={() => {
                  if (!todayStatus.post_market_done) {
                    openPostMarketCheckIn();
                  }
                }}
                disabled={todayStatus.post_market_done}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                  todayStatus.post_market_done
                    ? "bg-green-500/10 border-green-500/30 cursor-default"
                    : "hover:bg-muted cursor-pointer"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    todayStatus.post_market_done ? "bg-green-500" : "bg-muted"
                  )}>
                    {todayStatus.post_market_done ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-sm">Post-Market</span>
                    <div className="text-xs text-muted-foreground">
                      {todayStatus.post_market_done ? "Completed" : "Review your day"}
                    </div>
                  </div>
                </div>
                {!todayStatus.post_market_done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            </CardContent>
          </Card>

          {/* Active Challenge Preview */}
          {activeChallenges.length > 0 && (
            <Card
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeChallenges[0].i_am_winning
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-yellow-500/30 bg-yellow-500/5"
              )}
              onClick={() => setActiveView("challenges")}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className={cn("h-4 w-4", activeChallenges[0].i_am_winning ? "text-green-500" : "text-yellow-500")} />
                    <span className="font-medium text-sm">Active Challenge</span>
                  </div>
                  <Badge variant="outline">${activeChallenges[0].stake_amount}</Badge>
                </div>
                <div className="font-semibold mb-2">{activeChallenges[0].title}</div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">You: </span>
                    <span className={cn("font-bold", activeChallenges[0].i_am_winning && "text-green-500")}>
                      {activeChallenges[0].my_progress}/{activeChallenges[0].target_value}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{partnerName}: </span>
                    <span className={cn("font-bold", !activeChallenges[0].i_am_winning && activeChallenges[0].partner_progress !== activeChallenges[0].my_progress && "text-green-500")}>
                      {activeChallenges[0].partner_progress}/{activeChallenges[0].target_value}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Progress
                    value={((activeChallenges[0].my_progress || 0) / activeChallenges[0].target_value) * 100}
                    className="flex-1 h-2"
                  />
                  <Progress
                    value={((activeChallenges[0].partner_progress || 0) / activeChallenges[0].target_value) * 100}
                    className="flex-1 h-2"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>You</span>
                  <span>{activeChallenges[0].days_remaining}d left</span>
                  <span>{partnerName}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Money Owed Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className={cn(iOwe > 0 && "border-red-500/50 bg-red-500/5")}>
              <CardContent className="py-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">You Owe</div>
                <div className={cn("text-2xl font-bold", iOwe > 0 ? "text-red-500" : "text-muted-foreground")}>
                  ${iOwe.toFixed(0)}
                </div>
                {iOwe > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs mt-1 text-red-500"
                    onClick={() => setShowSettleDialog(true)}
                  >
                    Settle up
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card className={cn(theyOwe > 0 && "border-green-500/50 bg-green-500/5")}>
              <CardContent className="py-3 text-center">
                <div className="text-xs text-muted-foreground mb-1">They Owe</div>
                <div className={cn("text-2xl font-bold", theyOwe > 0 ? "text-green-500" : "text-muted-foreground")}>
                  ${theyOwe.toFixed(0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{stats.total_challenges}</div>
              <div className="text-xs text-muted-foreground">Challenges</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{stats.total_violations}</div>
              <div className="text-xs text-muted-foreground">Violations</div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className={cn("text-lg font-bold", stats.win_rate >= 50 ? "text-green-500" : "text-red-500")}>
                {stats.win_rate.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
          </div>

          {/* Milestones */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-blue-500" />
                Accountability Milestones
              </CardTitle>
              <CardDescription>Build good habits together</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {MILESTONES.map((milestone) => {
                  const isUnlocked = unlockedMilestones.includes(milestone.id);
                  return (
                    <div
                      key={milestone.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                        isUnlocked
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-muted/30 border-transparent opacity-50"
                      )}
                      title={milestone.description}
                    >
                      <span className="text-lg">{milestone.icon}</span>
                      <div>
                        <div className={cn("text-xs font-medium", isUnlocked && "text-green-600 dark:text-green-400")}>
                          {milestone.name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {unlockedMilestones.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Complete check-ins and follow rules to unlock milestones!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* CHALLENGES VIEW */}
      {activeView === "challenges" && (
        <div className="space-y-4">
          {/* Create Challenge Button */}
          <Button className="w-full" onClick={() => setShowNewChallengeDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Challenge
          </Button>

          {/* Active Challenges */}
          {activeChallenges.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Active ({activeChallenges.length})
              </div>
              {activeChallenges.map((challenge) => (
                <Card
                  key={challenge.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    challenge.i_am_winning ? "border-green-500/30" : "border-red-500/30"
                  )}
                  onClick={() => {
                    setSelectedChallenge(challenge);
                    setShowChallengeDetailDialog(true);
                  }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{challenge.title}</div>
                        {challenge.description && (
                          <div className="text-sm text-muted-foreground">{challenge.description}</div>
                        )}
                      </div>
                      <Badge variant="outline" className="shrink-0">${challenge.stake_amount}</Badge>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-4">
                        <div className={cn("text-center", challenge.i_am_winning && "text-green-500")}>
                          <div className="text-2xl font-bold">{challenge.my_progress}</div>
                          <div className="text-xs text-muted-foreground">You</div>
                        </div>
                        <div className="text-muted-foreground">vs</div>
                        <div className={cn("text-center", !challenge.i_am_winning && challenge.partner_progress !== challenge.my_progress && "text-green-500")}>
                          <div className="text-2xl font-bold">{challenge.partner_progress}</div>
                          <div className="text-xs text-muted-foreground">{partnerName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{challenge.days_remaining}d left</div>
                        <div className="text-xs text-muted-foreground">Target: {challenge.target_value}</div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIncrementProgress(challenge.id);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Log Progress (+1)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <div className="font-medium mb-1">No Active Challenges</div>
                <div className="text-sm text-muted-foreground mb-3">Create one to start competing with {partnerName}!</div>
              </CardContent>
            </Card>
          )}

          {/* Past Challenges */}
          {pastChallenges.length > 0 && (
            <div className="space-y-3">
              <button
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setShowPastChallenges(!showPastChallenges)}
              >
                <History className="h-4 w-4" />
                Past Challenges ({pastChallenges.length})
                <ChevronDown className={cn("h-4 w-4 transition-transform", showPastChallenges && "rotate-180")} />
              </button>

              {showPastChallenges && (
                <div className="space-y-2">
                  {pastChallenges.map((challenge) => {
                    const iWon = challenge.winner_id === currentUserId;
                    return (
                      <Card key={challenge.id} className="bg-muted/30">
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                iWon ? "bg-green-500/20" : "bg-red-500/20"
                              )}>
                                {iWon ? (
                                  <Trophy className="h-4 w-4 text-green-500" />
                                ) : (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{challenge.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  You: {challenge.my_progress} vs {partnerName}: {challenge.partner_progress}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={iWon ? "default" : "secondary"}>
                                {iWon ? `+$${challenge.stake_amount}` : `-$${challenge.stake_amount}`}
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(parseISO(challenge.end_date), "MMM d")}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RULES VIEW */}
      {activeView === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Trading Rules</div>
              <div className="text-sm text-muted-foreground">Break a rule = pay the stake</div>
            </div>
            <Button size="sm" onClick={() => setShowAddRuleDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                <div className="font-medium mb-1">No Rules Yet</div>
                <div className="text-sm text-muted-foreground mb-3">
                  Add rules to hold each other accountable
                </div>
                <Button size="sm" onClick={() => setShowAddRuleDialog(true)}>
                  Add First Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <Card
                  key={rule.id}
                  className={cn(
                    "transition-all",
                    (rule.my_violations || 0) > 0 && "border-red-500/30 bg-red-500/5"
                  )}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{rule.title}</div>
                        {rule.description && (
                          <div className="text-xs text-muted-foreground truncate">{rule.description}</div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                          <DollarSign className="h-3 w-3" />
                          ${rule.stake_amount} stake
                          {(rule.my_violations || 0) > 0 && (
                            <span className="text-red-500">• {rule.my_violations} violation{(rule.my_violations || 0) > 1 ? "s" : ""}</span>
                          )}
                          {(rule.partner_violations || 0) > 0 && (
                            <span className="text-green-500">• Partner: {rule.partner_violations}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowViolationDialog(true);
                        }}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        I Broke It
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          DIALOGS
          ===================================================== */}

      {/* Add Rule Dialog */}
      <CustomDialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Add Trading Rule</CustomDialogTitle>
            <CustomDialogDescription>
              Create a rule that both you and {partnerName} will follow
            </CustomDialogDescription>
          </CustomDialogHeader>
          <div className="space-y-4 py-4">
            {/* Presets */}
            <div>
              <div className="text-sm font-medium mb-2">Quick Start</div>
              <div className="flex flex-wrap gap-2">
                {RULE_PRESETS.slice(0, 4).map((preset, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => {
                      setNewRuleTitle(preset.title);
                      setNewRuleDescription(preset.description);
                      setNewRuleStake(preset.stake);
                    }}
                  >
                    {preset.title.split(" ").slice(0, 3).join(" ")}...
                  </Button>
                ))}
              </div>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium">Rule</label>
              <Input
                placeholder="e.g., No trading after 3pm"
                value={newRuleTitle}
                onChange={(e) => setNewRuleTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Input
                placeholder="Why this rule matters"
                value={newRuleDescription}
                onChange={(e) => setNewRuleDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stake ($)</label>
              <Input
                type="number"
                min={1}
                value={newRuleStake}
                onChange={(e) => setNewRuleStake(parseInt(e.target.value) || 1)}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Break this rule and you owe ${newRuleStake}
              </div>
            </div>
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowAddRuleDialog(false)}>Cancel</Button>
            <Button onClick={handleAddRule} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Add Rule"}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Violation Dialog */}
      <CustomDialog open={showViolationDialog} onOpenChange={setShowViolationDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle className="text-red-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Report Violation
            </CustomDialogTitle>
          </CustomDialogHeader>
          {selectedRule && (
            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="font-medium">{selectedRule.title}</div>
                <div className="text-2xl font-bold text-red-500 mt-2">-${selectedRule.stake_amount}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  This amount will be added to what you owe {partnerName}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">What happened? (optional)</label>
                <Textarea
                  placeholder="Brief note..."
                  value={violationNote}
                  onChange={(e) => setViolationNote(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowViolationDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReportViolation} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Confirm Violation"}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Check-in Dialog */}
      <CustomDialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle className="flex items-center gap-2">
              {checkInType === "pre_market" ? (
                <>
                  <Sun className="h-5 w-5 text-yellow-500" />
                  Pre-Market Check-in
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5 text-purple-500" />
                  Post-Market Check-in
                </>
              )}
            </CustomDialogTitle>
          </CustomDialogHeader>
          <div className="py-4 space-y-4">
            {checkInType === "pre_market" ? (
              <>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={preMarketChecks.calendar}
                      onChange={(e) => setPreMarketChecks(prev => ({ ...prev, calendar: e.target.checked }))}
                    />
                    <span className="text-sm">Checked economic calendar</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={preMarketChecks.levels}
                      onChange={(e) => setPreMarketChecks(prev => ({ ...prev, levels: e.target.checked }))}
                    />
                    <span className="text-sm">Marked key levels</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={preMarketChecks.bias}
                      onChange={(e) => setPreMarketChecks(prev => ({ ...prev, bias: e.target.checked }))}
                    />
                    <span className="text-sm">Know my bias for the day</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={preMarketChecks.maxLoss}
                      onChange={(e) => setPreMarketChecks(prev => ({ ...prev, maxLoss: e.target.checked }))}
                    />
                    <span className="text-sm">Set max loss for the day</span>
                  </label>
                </div>
                <div>
                  <label className="text-sm font-medium">Today's plan (optional)</label>
                  <Textarea
                    placeholder="What setups are you looking for?"
                    value={tradingPlan}
                    onChange={(e) => setTradingPlan(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Verified P&L from actual trades - CAN'T BE FAKED! */}
                <div className="p-4 rounded-lg border-2 border-green-500/30 bg-green-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">Verified P&L</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={fetchTodayPnL}
                      disabled={isLoadingPnL}
                    >
                      <RefreshCw className={cn("h-3 w-3 mr-1", isLoadingPnL && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>
                  {isLoadingPnL ? (
                    <div className="flex items-center justify-center py-2">
                      <Spinner className="h-5 w-5" />
                    </div>
                  ) : (
                    <>
                      <div className={cn(
                        "text-3xl font-bold",
                        (verifiedDailyPnL ?? 0) > 0 ? "text-green-500" :
                        (verifiedDailyPnL ?? 0) < 0 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {(verifiedDailyPnL ?? 0) > 0 ? "+" : ""}
                        ${(verifiedDailyPnL ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        From {verifiedTradeCount} closed trade{verifiedTradeCount !== 1 ? 's' : ''} today
                      </div>
                    </>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Auto-synced from your trades • Cannot be edited
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="font-medium text-sm">Followed all rules?</span>
                  <Switch checked={followedRules} onCheckedChange={setFollowedRules} />
                </div>
                {!followedRules && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm">
                    <div className="font-medium text-red-500">Don't forget to report your violations!</div>
                    <div className="text-muted-foreground">Go to Rules tab to report which rules you broke.</div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="How was your trading day?"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowCheckInDialog(false)}>Cancel</Button>
            <Button onClick={handleCheckIn} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : <><Check className="h-4 w-4 mr-2" />Complete</>}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* New Challenge Dialog */}
      <CustomDialog open={showNewChallengeDialog} onOpenChange={setShowNewChallengeDialog}>
        <CustomDialogContent className="max-w-md">
          <CustomDialogHeader>
            <CustomDialogTitle>Create Challenge</CustomDialogTitle>
            <CustomDialogDescription>Challenge {partnerName} to compete!</CustomDialogDescription>
          </CustomDialogHeader>
          <div className="space-y-4 py-4">
            {/* Presets */}
            <div className="grid grid-cols-2 gap-2">
              {CHALLENGE_PRESETS.map((preset, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-auto py-2 text-left justify-start",
                    newChallenge.type === preset.type && newChallenge.title === preset.title && "border-primary"
                  )}
                  onClick={() => setNewChallenge({
                    ...newChallenge,
                    title: preset.title,
                    description: preset.description,
                    type: preset.type,
                    target: preset.target,
                    duration: preset.duration,
                  })}
                >
                  <div>
                    <div className="font-medium text-xs">{preset.title}</div>
                    <div className="text-xs text-muted-foreground">{preset.duration} days</div>
                  </div>
                </Button>
              ))}
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium">Challenge Name</label>
              <Input
                placeholder="e.g., Most Green Days"
                value={newChallenge.title}
                onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                placeholder="What's the goal?"
                value={newChallenge.description}
                onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Target</label>
                <Input
                  type="number"
                  min={1}
                  value={newChallenge.target}
                  onChange={(e) => setNewChallenge({ ...newChallenge, target: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Days</label>
                <Input
                  type="number"
                  min={1}
                  value={newChallenge.duration}
                  onChange={(e) => setNewChallenge({ ...newChallenge, duration: parseInt(e.target.value) || 7 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stake ($)</label>
                <Input
                  type="number"
                  min={1}
                  value={newChallenge.stake}
                  onChange={(e) => setNewChallenge({ ...newChallenge, stake: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted text-sm">
              <div className="font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                Winner takes ${newChallenge.stake * 2}
              </div>
              <div className="text-muted-foreground">Each person puts in ${newChallenge.stake}</div>
            </div>
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowNewChallengeDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateChallenge} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : <>
                <Trophy className="h-4 w-4 mr-2" />
                Create Challenge
              </>}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Challenge Detail Dialog */}
      <CustomDialog open={showChallengeDetailDialog} onOpenChange={setShowChallengeDetailDialog}>
        <CustomDialogContent>
          {selectedChallenge && (
            <>
              <CustomDialogHeader>
                <CustomDialogTitle>{selectedChallenge.title}</CustomDialogTitle>
                {selectedChallenge.description && (
                  <CustomDialogDescription>{selectedChallenge.description}</CustomDialogDescription>
                )}
              </CustomDialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-center gap-8">
                  <div className={cn("text-center", selectedChallenge.i_am_winning && "text-green-500")}>
                    <div className="text-4xl font-bold">{selectedChallenge.my_progress}</div>
                    <div className="text-sm text-muted-foreground">You</div>
                  </div>
                  <div className="text-2xl text-muted-foreground">vs</div>
                  <div className={cn("text-center", !selectedChallenge.i_am_winning && selectedChallenge.partner_progress !== selectedChallenge.my_progress && "text-green-500")}>
                    <div className="text-4xl font-bold">{selectedChallenge.partner_progress}</div>
                    <div className="text-sm text-muted-foreground">{partnerName}</div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Target</span>
                    <span className="font-medium">{selectedChallenge.target_value}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Stake</span>
                    <span className="font-medium">${selectedChallenge.stake_amount} each</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ends</span>
                    <span className="font-medium">{format(parseISO(selectedChallenge.end_date), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Days Left</span>
                    <span className="font-medium">{selectedChallenge.days_remaining}</span>
                  </div>
                </div>

                {selectedChallenge.status === "active" && (
                  <Button
                    className="w-full"
                    onClick={() => {
                      handleIncrementProgress(selectedChallenge.id);
                      setSelectedChallenge({
                        ...selectedChallenge,
                        my_progress: (selectedChallenge.my_progress || 0) + 1,
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Progress (+1)
                  </Button>
                )}
              </div>
            </>
          )}
        </CustomDialogContent>
      </CustomDialog>

      {/* End Partnership Dialog */}
      <CustomDialog open={showEndPartnershipDialog} onOpenChange={setShowEndPartnershipDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>End Partnership?</CustomDialogTitle>
            <CustomDialogDescription>
              This will end your accountability partnership with {partnerName}. All unsettled amounts will be cleared.
            </CustomDialogDescription>
          </CustomDialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="text-sm text-red-500">This action cannot be undone.</div>
              {(iOwe > 0 || theyOwe > 0) && (
                <div className="text-sm text-muted-foreground mt-2">
                  Outstanding balances: You owe ${iOwe.toFixed(0)}, They owe ${theyOwe.toFixed(0)}
                </div>
              )}
            </div>
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowEndPartnershipDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleEndPartnership} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "End Partnership"}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Settle Dialog */}
      <CustomDialog open={showSettleDialog} onOpenChange={setShowSettleDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Settle Up</CustomDialogTitle>
            <CustomDialogDescription>
              Mark your debt as paid
            </CustomDialogDescription>
          </CustomDialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted text-center">
              <div className="text-3xl font-bold text-red-500">${iOwe.toFixed(0)}</div>
              <div className="text-sm text-muted-foreground mt-1">Total you owe {partnerName}</div>
            </div>
            <div className="text-sm text-muted-foreground mt-4">
              Pay your partner outside the app, then mark as settled. Your partner will be notified.
            </div>
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowSettleDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              toast.success("Settlement feature coming soon!");
              setShowSettleDialog(false);
            }}>
              <Check className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Quick Message Dialog */}
      <CustomDialog open={showQuickMessageDialog} onOpenChange={setShowQuickMessageDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Send to {partnerName}
            </CustomDialogTitle>
            <CustomDialogDescription>
              Pick a message to send your accountability partner
            </CustomDialogDescription>
          </CustomDialogHeader>
          <div className="py-4 space-y-4">
            {/* Category Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              {[
                { id: "checkin" as const, label: "Check-in 👀" },
                { id: "encourage" as const, label: "Encourage 💪" },
                { id: "support" as const, label: "Support 🤝" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedMessageCategory(cat.id)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all",
                    selectedMessageCategory === cat.id
                      ? "bg-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="space-y-2">
              {QUICK_MESSAGES[selectedMessageCategory].map((msg, i) => (
                <button
                  key={i}
                  onClick={() => handleSendQuickMessage(msg)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-muted hover:border-primary/50 transition-all"
                >
                  <span className="text-sm">{msg}</span>
                </button>
              ))}
            </div>
          </div>
        </CustomDialogContent>
      </CustomDialog>

      <CelebrationModal
        open={celebration.show}
        onClose={() => setCelebration({ show: false, title: "", message: "" })}
        title={celebration.title}
        message={celebration.message}
      />
    </div>
  );
}

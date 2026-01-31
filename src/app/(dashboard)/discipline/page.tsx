"use client";

import * as React from "react";
import { format, subDays, startOfDay, parseISO, getDay } from "date-fns";
import {
  Shield,
  Plus,
  Check,
  X,
  Flame,
  Trophy,
  Target,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Edit2,
  Trash2,
  Zap,
  Calendar,
  TrendingUp,
  Star,
  Settings,
  CalendarDays,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Textarea,
  Spinner,
  Progress,
  cn,
  toast,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import type { UserRule, UserRuleCheck, UserRuleWithCheck } from "@/types/database";

// Rule category colors and labels
const CATEGORY_CONFIG = {
  risk: { label: "Risk Management", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  discipline: { label: "Discipline", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  process: { label: "Process", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  mindset: { label: "Mindset", color: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
  other: { label: "Other", color: "bg-gray-500/10 text-gray-600 border-gray-500/30" },
};

// Preset rules for quick setup
const PRESET_RULES = [
  { title: "Max 2 contracts per trade", description: "Don't oversize positions", category: "risk" },
  { title: "Stop trading at daily loss limit", description: "Respect your max loss for the day", category: "risk" },
  { title: "Always use a stop loss", description: "Protect your capital on every trade", category: "risk" },
  { title: "No revenge trading", description: "Wait at least 10 minutes after a loss", category: "discipline" },
  { title: "Stop after 3 consecutive losses", description: "Walk away to clear your head", category: "discipline" },
  { title: "No trading during major news", description: "Avoid high volatility events", category: "discipline" },
  { title: "Complete pre-market routine", description: "Review levels and plan before trading", category: "process" },
  { title: "Journal every trade", description: "Document entries, exits, and lessons", category: "process" },
  { title: "Wait for A+ setups only", description: "Don't force trades, be patient", category: "process" },
  { title: "Stay calm after winning trades", description: "Don't get overconfident", category: "mindset" },
  { title: "Accept losses as part of the game", description: "Focus on process, not outcomes", category: "mindset" },
];

// XP rewards
const XP_REWARDS = {
  dailyCheckIn: 10,        // XP for checking in all rules for the day
  perfectDay: 25,          // XP for following all rules
  weekStreak: 100,         // XP for 7-day streak
  monthStreak: 500,        // XP for 30-day streak
};

// Days of the week configuration
const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
];

// Default trading days (Monday-Friday)
const DEFAULT_TRADING_DAYS = [1, 2, 3, 4, 5];

export default function DisciplinePage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [rules, setRules] = React.useState<UserRuleWithCheck[]>([]);
  const [todayChecks, setTodayChecks] = React.useState<Record<string, UserRuleCheck>>({});
  const [overallStreak, setOverallStreak] = React.useState(0);
  const [totalXpEarned, setTotalXpEarned] = React.useState(0);

  // Dialog states
  const [showAddRuleDialog, setShowAddRuleDialog] = React.useState(false);
  const [showEditRuleDialog, setShowEditRuleDialog] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [selectedRule, setSelectedRule] = React.useState<UserRule | null>(null);

  // Form states
  const [newRuleTitle, setNewRuleTitle] = React.useState("");
  const [newRuleDescription, setNewRuleDescription] = React.useState("");
  const [newRuleCategory, setNewRuleCategory] = React.useState<string>("discipline");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Trading days state (0=Sunday, 6=Saturday)
  const [tradingDays, setTradingDays] = React.useState<number[]>(DEFAULT_TRADING_DAYS);
  const [showTradingDaysSettings, setShowTradingDaysSettings] = React.useState(false);

  // Load trading days from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("discipline_trading_days");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTradingDays(parsed);
        }
      }
    } catch (e) {
      console.error("Error loading trading days:", e);
    }
  }, []);

  // Save trading days to localStorage
  const handleToggleTradingDay = (day: number) => {
    const newDays = tradingDays.includes(day)
      ? tradingDays.filter((d) => d !== day)
      : [...tradingDays, day].sort((a, b) => a - b);

    setTradingDays(newDays);
    localStorage.setItem("discipline_trading_days", JSON.stringify(newDays));
  };

  // Check if today is a trading day
  const todayDayOfWeek = getDay(new Date());
  const isTradingDay = tradingDays.includes(todayDayOfWeek);

  // Get today's date string
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");

  // Fetch rules and today's checks
  const fetchData = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch active rules
      const { data: rulesData, error: rulesError } = await (supabase
        .from("user_rules") as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (rulesError) {
        console.error("Error fetching rules:", rulesError);
        setRules([]);
        setIsLoading(false);
        return;
      }

      const rulesList = (rulesData || []) as UserRule[];

      // Fetch today's checks
      const { data: checksData } = await (supabase
        .from("user_rule_checks") as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("check_date", today);

      const checksList = (checksData || []) as UserRuleCheck[];
      const checksMap: Record<string, UserRuleCheck> = {};
      checksList.forEach((check) => {
        checksMap[check.rule_id] = check;
      });
      setTodayChecks(checksMap);

      // Fetch historical checks for streak calculation
      const thirtyDaysAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data: historicalChecks } = await (supabase
        .from("user_rule_checks") as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("check_date", thirtyDaysAgo)
        .order("check_date", { ascending: false });

      const allChecks = (historicalChecks || []) as UserRuleCheck[];

      // Calculate stats for each rule
      const rulesWithStats: UserRuleWithCheck[] = rulesList.map((rule) => {
        const ruleChecks = allChecks.filter((c) => c.rule_id === rule.id);
        const followedChecks = ruleChecks.filter((c) => c.followed);

        // Calculate current streak
        let currentStreak = 0;
        const sortedChecks = [...ruleChecks].sort(
          (a, b) => new Date(b.check_date).getTime() - new Date(a.check_date).getTime()
        );
        for (const check of sortedChecks) {
          if (check.followed) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate longest streak (simplified - just use current for now)
        let longestStreak = currentStreak;
        let tempStreak = 0;
        for (const check of sortedChecks.reverse()) {
          if (check.followed) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        return {
          ...rule,
          todayCheck: checksMap[rule.id],
          currentStreak,
          longestStreak,
          totalFollowed: followedChecks.length,
          totalChecks: ruleChecks.length,
        };
      });

      setRules(rulesWithStats);

      // Calculate overall streak (days where ALL rules were followed)
      const dateGroups: Record<string, { total: number; followed: number }> = {};
      allChecks.forEach((check) => {
        if (!dateGroups[check.check_date]) {
          dateGroups[check.check_date] = { total: 0, followed: 0 };
        }
        dateGroups[check.check_date].total++;
        if (check.followed) {
          dateGroups[check.check_date].followed++;
        }
      });

      // Count consecutive perfect days
      let streak = 0;
      const sortedDates = Object.keys(dateGroups).sort().reverse();
      for (const date of sortedDates) {
        const dayStats = dateGroups[date];
        if (dayStats.followed === rulesList.length && dayStats.total === rulesList.length) {
          streak++;
        } else {
          break;
        }
      }
      setOverallStreak(streak);

      // Calculate total XP earned from discipline
      let xp = 0;
      // XP for check-ins
      xp += Object.keys(dateGroups).length * XP_REWARDS.dailyCheckIn;
      // XP for perfect days
      const perfectDays = Object.values(dateGroups).filter(
        (d) => d.followed === rulesList.length && d.total === rulesList.length
      ).length;
      xp += perfectDays * XP_REWARDS.perfectDay;
      // XP for streaks
      if (streak >= 7) xp += Math.floor(streak / 7) * XP_REWARDS.weekStreak;
      if (streak >= 30) xp += Math.floor(streak / 30) * XP_REWARDS.monthStreak;
      setTotalXpEarned(xp);
    } catch (error) {
      console.error("Error fetching discipline data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle rule check toggle
  const handleToggleCheck = async (rule: UserRuleWithCheck, followed: boolean) => {
    if (!userId) return;

    try {
      const supabase = createClient();

      if (todayChecks[rule.id]) {
        // Update existing check
        const { error } = await (supabase
          .from("user_rule_checks") as any)
          .update({ followed })
          .eq("id", todayChecks[rule.id].id);

        if (error) throw error;
      } else {
        // Create new check
        const { error } = await (supabase
          .from("user_rule_checks") as any)
          .insert({
            user_id: userId,
            rule_id: rule.id,
            check_date: today,
            followed,
          });

        if (error) throw error;
      }

      // Refresh data
      await fetchData();

      if (followed) {
        toast.success("Rule followed! Keep it up!");
      }
    } catch (error: any) {
      console.error("Error updating check:", error);
      const message = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to update: ${message}`);
    }
  };

  // Handle add rule
  const handleAddRule = async () => {
    if (!userId || !newRuleTitle.trim()) {
      toast.error("Please enter a rule title");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await (supabase
        .from("user_rules") as any)
        .insert({
          user_id: userId,
          title: newRuleTitle.trim(),
          description: newRuleDescription.trim() || null,
          category: newRuleCategory,
          display_order: rules.length,
        });

      if (error) throw error;

      toast.success("Rule added!");
      setShowAddRuleDialog(false);
      setNewRuleTitle("");
      setNewRuleDescription("");
      setNewRuleCategory("discipline");
      await fetchData();
    } catch (error: any) {
      console.error("Error adding rule:", error);
      const message = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to add rule: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit rule
  const handleEditRule = async () => {
    if (!selectedRule || !newRuleTitle.trim()) {
      toast.error("Please enter a rule title");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      const { error } = await (supabase
        .from("user_rules") as any)
        .update({
          title: newRuleTitle.trim(),
          description: newRuleDescription.trim() || null,
          category: newRuleCategory,
        })
        .eq("id", selectedRule.id);

      if (error) throw error;

      toast.success("Rule updated!");
      setShowEditRuleDialog(false);
      setSelectedRule(null);
      await fetchData();
    } catch (error: any) {
      console.error("Error updating rule:", error);
      const message = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to update rule: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete rule
  const handleDeleteRule = async () => {
    if (!selectedRule) return;

    setIsSubmitting(true);
    try {
      const supabase = createClient();

      // Soft delete - just mark as inactive
      const { error } = await (supabase
        .from("user_rules") as any)
        .update({ is_active: false })
        .eq("id", selectedRule.id);

      if (error) throw error;

      toast.success("Rule removed");
      setShowDeleteConfirm(false);
      setSelectedRule(null);
      await fetchData();
    } catch (error: any) {
      console.error("Error deleting rule:", error);
      const message = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to remove rule: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open edit dialog with rule data
  const openEditDialog = (rule: UserRule) => {
    setSelectedRule(rule);
    setNewRuleTitle(rule.title);
    setNewRuleDescription(rule.description || "");
    setNewRuleCategory(rule.category);
    setShowEditRuleDialog(true);
  };

  // Use preset rule
  const usePresetRule = (preset: typeof PRESET_RULES[0]) => {
    setNewRuleTitle(preset.title);
    setNewRuleDescription(preset.description);
    setNewRuleCategory(preset.category);
  };

  // Calculate today's progress
  const todayProgress = rules.length > 0
    ? (Object.values(todayChecks).filter((c) => c.followed).length / rules.length) * 100
    : 0;

  const allRulesChecked = rules.length > 0 && Object.keys(todayChecks).length === rules.length;
  const allRulesFollowed = allRulesChecked && Object.values(todayChecks).every((c) => c.followed);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-500" />
          Discipline Tracker
        </h1>
        <p className="text-muted-foreground">
          Set your trading rules, track daily compliance, and build consistency.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className={cn("h-5 w-5", overallStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
            </div>
            <div className={cn("text-2xl font-bold", overallStreak > 0 ? "text-orange-500" : "text-muted-foreground")}>
              {overallStreak}
            </div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{rules.length}</div>
            <div className="text-xs text-muted-foreground">Active Rules</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold">{Math.round(todayProgress)}%</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{totalXpEarned}</div>
            <div className="text-xs text-muted-foreground">XP Earned</div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Days Settings */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Trading Days
              </CardTitle>
              <CardDescription>
                Select which days you trade
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTradingDaysSettings(!showTradingDaysSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        {showTradingDaysSettings && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.value}
                  size="sm"
                  variant={tradingDays.includes(day.value) ? "default" : "outline"}
                  className={cn(
                    "w-12 h-10",
                    tradingDays.includes(day.value) && "bg-blue-500 hover:bg-blue-600"
                  )}
                  onClick={() => handleToggleTradingDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Streaks and check-ins only apply on your trading days. Today is {isTradingDay ? "a trading day" : "not a trading day"}.
            </p>
          </CardContent>
        )}
        {!showTradingDaysSettings && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Trading on:</span>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.filter((d) => tradingDays.includes(d.value)).map((day) => (
                  <Badge key={day.value} variant="secondary" className="text-xs">
                    {day.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Today's Check-in */}
      <Card className={cn(
        allRulesFollowed && isTradingDay && "border-green-500/50 bg-green-500/5",
        !isTradingDay && "border-muted bg-muted/30"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Check-in
              </CardTitle>
              <CardDescription>
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </CardDescription>
            </div>
            {!isTradingDay ? (
              <Badge variant="secondary">
                <CalendarDays className="h-3 w-3 mr-1" />
                Non-Trading Day
              </Badge>
            ) : allRulesFollowed ? (
              <Badge className="bg-green-500">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Perfect Day!
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!isTradingDay ? (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <div className="font-medium mb-1">Not a Trading Day</div>
              <div className="text-sm text-muted-foreground mb-4">
                Enjoy your day off! Your streak will continue on your next trading day.
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowTradingDaysSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Adjust Trading Days
              </Button>
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <div className="font-medium mb-1">No rules yet</div>
              <div className="text-sm text-muted-foreground mb-4">
                Add your first trading rule to start tracking your discipline
              </div>
              <Button onClick={() => setShowAddRuleDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const isChecked = !!todayChecks[rule.id];
                const isFollowed = todayChecks[rule.id]?.followed;
                const categoryConfig = CATEGORY_CONFIG[rule.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;

                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-all",
                      isFollowed && "bg-green-500/10 border-green-500/30",
                      isChecked && !isFollowed && "bg-red-500/10 border-red-500/30",
                      !isChecked && "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rule.title}</span>
                        <Badge variant="outline" className={cn("text-xs", categoryConfig.color)}>
                          {categoryConfig.label}
                        </Badge>
                      </div>
                      {rule.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                          {rule.description}
                        </div>
                      )}
                      {rule.currentStreak > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          <span className="text-xs text-orange-500">{rule.currentStreak} day streak</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isChecked ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleToggleCheck(rule, false)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 bg-green-500 hover:bg-green-600"
                            onClick={() => handleToggleCheck(rule, true)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            isFollowed ? "bg-green-500" : "bg-red-500"
                          )}
                        >
                          {isFollowed ? (
                            <Check className="h-4 w-4 text-white" />
                          ) : (
                            <X className="h-4 w-4 text-white" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {rules.length > 0 && isTradingDay && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Today's Progress</span>
                <span className="font-medium">
                  {Object.values(todayChecks).filter((c) => c.followed).length} / {rules.length} rules followed
                </span>
              </div>
              <Progress value={todayProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Your Rules</CardTitle>
              <CardDescription>
                Define the rules that will make you a better trader
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setShowAddRuleDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No rules defined yet. Add some rules to start tracking your discipline!
            </div>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => {
                const categoryConfig = CATEGORY_CONFIG[rule.category as keyof typeof CATEGORY_CONFIG] || CATEGORY_CONFIG.other;
                const complianceRate = rule.totalChecks > 0
                  ? Math.round((rule.totalFollowed / rule.totalChecks) * 100)
                  : 0;

                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{rule.title}</span>
                        <Badge variant="outline" className={cn("text-xs", categoryConfig.color)}>
                          {categoryConfig.label}
                        </Badge>
                      </div>
                      {rule.description && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {rule.description}
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {complianceRate}% compliance
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-orange-500" />
                          {rule.currentStreak} day streak
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          Best: {rule.longestStreak} days
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openEditDialog(rule)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => {
                          setSelectedRule(rule);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* XP Rewards Info */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            XP Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="font-bold text-yellow-500">+{XP_REWARDS.dailyCheckIn}</div>
              <div className="text-xs text-muted-foreground">Daily check-in</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="font-bold text-yellow-500">+{XP_REWARDS.perfectDay}</div>
              <div className="text-xs text-muted-foreground">Perfect day</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="font-bold text-yellow-500">+{XP_REWARDS.weekStreak}</div>
              <div className="text-xs text-muted-foreground">7-day streak</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-background/50">
              <div className="font-bold text-yellow-500">+{XP_REWARDS.monthStreak}</div>
              <div className="text-xs text-muted-foreground">30-day streak</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <CustomDialog open={showAddRuleDialog} onOpenChange={setShowAddRuleDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Add Trading Rule</CustomDialogTitle>
            <CustomDialogDescription>
              Define a rule you want to follow consistently
            </CustomDialogDescription>
          </CustomDialogHeader>
          <div className="space-y-4 py-4">
            {/* Presets */}
            <div>
              <div className="text-sm font-medium mb-2">Quick Start</div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {PRESET_RULES.map((preset, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => usePresetRule(preset)}
                  >
                    {preset.title.length > 25 ? preset.title.slice(0, 25) + "..." : preset.title}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Rule Title *</label>
                  <Input
                    placeholder="e.g., No trading after 3pm"
                    value={newRuleTitle}
                    onChange={(e) => setNewRuleTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Why is this rule important?"
                    value={newRuleDescription}
                    onChange={(e) => setNewRuleDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowAddRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRule} disabled={isSubmitting || !newRuleTitle.trim()}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Add Rule"}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Edit Rule Dialog */}
      <CustomDialog open={showEditRuleDialog} onOpenChange={setShowEditRuleDialog}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Edit Rule</CustomDialogTitle>
          </CustomDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Rule Title *</label>
              <Input
                placeholder="e.g., No trading after 3pm"
                value={newRuleTitle}
                onChange={(e) => setNewRuleTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Why is this rule important?"
                value={newRuleDescription}
                onChange={(e) => setNewRuleDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={newRuleCategory} onValueChange={setNewRuleCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowEditRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditRule} disabled={isSubmitting || !newRuleTitle.trim()}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Save Changes"}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Delete Confirmation Dialog */}
      <CustomDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Remove Rule?</CustomDialogTitle>
            <CustomDialogDescription>
              Are you sure you want to remove "{selectedRule?.title}"? Your historical check-in data will be preserved.
            </CustomDialogDescription>
          </CustomDialogHeader>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule} disabled={isSubmitting}>
              {isSubmitting ? <Spinner className="h-4 w-4" /> : "Remove Rule"}
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>
    </div>
  );
}

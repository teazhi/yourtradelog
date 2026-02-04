"use client";

import * as React from "react";
import { format, startOfDay, getDay } from "date-fns";
import {
  Shield,
  Check,
  X,
  Flame,
  CheckCircle2,
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
  Progress,
  cn,
  toast,
} from "@/components/ui";
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

// Default trading days (Monday-Friday)
const DEFAULT_TRADING_DAYS = [1, 2, 3, 4, 5];

interface DisciplineChecklistProps {
  compact?: boolean;
  date?: Date;
  onCheckComplete?: () => void;
}

export function DisciplineChecklist({
  compact = false,
  date = new Date(),
  onCheckComplete
}: DisciplineChecklistProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [rules, setRules] = React.useState<UserRuleWithCheck[]>([]);
  const [todayChecks, setTodayChecks] = React.useState<Record<string, UserRuleCheck>>({});
  const [tradingDays, setTradingDays] = React.useState<number[]>(DEFAULT_TRADING_DAYS);

  const dateStr = format(startOfDay(date), "yyyy-MM-dd");
  const dayOfWeek = getDay(date);
  const isTradingDay = tradingDays.includes(dayOfWeek);

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

  // Fetch rules and checks
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

      // Fetch checks for the selected date
      const { data: checksData } = await (supabase
        .from("user_rule_checks") as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("check_date", dateStr);

      const checksList = (checksData || []) as UserRuleCheck[];
      const checksMap: Record<string, UserRuleCheck> = {};
      checksList.forEach((check) => {
        checksMap[check.rule_id] = check;
      });
      setTodayChecks(checksMap);

      // Map rules with their checks
      const rulesWithChecks: UserRuleWithCheck[] = rulesList.map((rule) => ({
        ...rule,
        todayCheck: checksMap[rule.id],
        currentStreak: 0,
        longestStreak: 0,
        totalFollowed: 0,
        totalChecks: 0,
      }));

      setRules(rulesWithChecks);
    } catch (error) {
      console.error("Error fetching discipline data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dateStr]);

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
            check_date: dateStr,
            followed,
          });

        if (error) throw error;
      }

      // Refresh data
      await fetchData();

      if (followed) {
        toast.success("Rule followed!");
      }

      // Notify parent of completion
      if (onCheckComplete) {
        onCheckComplete();
      }
    } catch (error: any) {
      console.error("Error updating check:", error);
      const message = error?.message || error?.code || 'Unknown error';
      toast.error(`Failed to update: ${message}`);
    }
  };

  // Calculate progress
  const todayProgress = rules.length > 0
    ? (Object.values(todayChecks).filter((c) => c.followed).length / rules.length) * 100
    : 0;

  const allRulesChecked = rules.length > 0 && Object.keys(todayChecks).length === rules.length;
  const allRulesFollowed = allRulesChecked && Object.values(todayChecks).every((c) => c.followed);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center", compact ? "h-32" : "h-64")}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isTradingDay) {
    return (
      <div className={cn("text-center py-6", compact && "py-4")}>
        <CalendarDays className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
        <div className="font-medium text-sm">Not a Trading Day</div>
        <div className="text-xs text-muted-foreground mt-1">
          Discipline check-ins are for trading days only.
        </div>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className={cn("text-center py-6", compact && "py-4")}>
        <Shield className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
        <div className="font-medium text-sm">No Rules Set</div>
        <div className="text-xs text-muted-foreground mt-1">
          Add rules in the Discipline page to track your compliance.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      {allRulesFollowed && (
        <div className="flex justify-center">
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            All Rules Followed!
          </Badge>
        </div>
      )}

      {/* Rules List */}
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
                !isChecked && "hover:bg-muted/50",
                compact && "p-2"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
                    {rule.title}
                  </span>
                  {!compact && (
                    <Badge variant="outline" className={cn("text-xs", categoryConfig.color)}>
                      {categoryConfig.label}
                    </Badge>
                  )}
                </div>
                {!compact && rule.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {rule.description}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isChecked ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "text-red-500 hover:bg-red-500/10",
                        compact ? "h-7 w-7 p-0" : "h-8"
                      )}
                      onClick={() => handleToggleCheck(rule, false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className={cn(
                        "bg-green-500 hover:bg-green-600",
                        compact ? "h-7 w-7 p-0" : "h-8"
                      )}
                      onClick={() => handleToggleCheck(rule, true)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <div
                    className={cn(
                      "rounded-full flex items-center justify-center",
                      isFollowed ? "bg-green-500" : "bg-red-500",
                      compact ? "w-6 h-6" : "w-8 h-8"
                    )}
                  >
                    {isFollowed ? (
                      <Check className={cn("text-white", compact ? "h-3 w-3" : "h-4 w-4")} />
                    ) : (
                      <X className={cn("text-white", compact ? "h-3 w-3" : "h-4 w-4")} />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {Object.values(todayChecks).filter((c) => c.followed).length} / {rules.length}
          </span>
        </div>
        <Progress value={todayProgress} className="h-2" />
      </div>
    </div>
  );
}

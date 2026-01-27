"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Heart,
  Lightbulb,
  Target,
  TrendingUp,
  Users,
  Globe,
  Sparkles,
  Clock,
  BarChart3,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Spinner,
  Tabs,
  TabsList,
  TabsTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { SharedTrade, ReactionType, SocialProfile } from "@/types/social";
import { formatCurrency, formatRMultiple, formatDate } from "@/lib/calculations/formatters";

const REACTIONS: { type: ReactionType; icon: React.ElementType; label: string }[] = [
  { type: "like", icon: Heart, label: "Like" },
  { type: "insightful", icon: Lightbulb, label: "Insightful" },
  { type: "great_entry", icon: Target, label: "Great Entry" },
  { type: "great_exit", icon: TrendingUp, label: "Great Exit" },
  { type: "learned", icon: Sparkles, label: "Learned" },
];

interface FeedTrade extends Omit<SharedTrade, 'reaction_counts'> {
  user: SocialProfile;
  reaction_counts: Record<ReactionType, number> & { total: number };
  user_reactions: ReactionType[];
  comment_count: number;
}

export default function FeedPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [trades, setTrades] = React.useState<FeedTrade[]>([]);
  const [feedType, setFeedType] = React.useState<"following" | "public" | "squad">("public");
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchFeed();
    }
  }, [feedType, mounted]);

  const fetchFeed = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // For now, fetch all public trades
      // In production, you'd filter by feedType and user's follows/squads
      let query = supabase
        .from("trades")
        .select("*")
        .eq("shared_to_feed", true)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);

      if (feedType === "following" && user) {
        // Get following IDs first
        const { data: followData } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        const followingIds = (followData as { following_id: string }[] | null)?.map(f => f.following_id) || [];
        if (followingIds.length > 0) {
          query = query.in("user_id", followingIds);
        } else {
          setTrades([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching feed:", error);
        setTrades([]);
      } else if (!data || data.length === 0) {
        setTrades([]);
      } else {
        // Get unique user IDs and fetch their profiles
        const userIds = [...new Set((data as any[]).map(t => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, anonymous_mode")
          .in("id", userIds);

        // Create a map of profiles by user ID
        const profileMap: Record<string, any> = {};
        for (const profile of (profiles || []) as any[]) {
          profileMap[profile.id] = profile;
        }

        // Fetch reactions and comments for each trade
        const tradesWithMeta = await Promise.all(
          (data as any[]).map(async (trade: any) => {
            // Get reaction counts
            const { data: reactions } = await supabase
              .from("trade_reactions")
              .select("reaction_type, user_id")
              .eq("trade_id", trade.id);

            const reactionCounts: Record<ReactionType, number> = {
              like: 0,
              insightful: 0,
              great_entry: 0,
              great_exit: 0,
              learned: 0,
            };

            const userReactions: ReactionType[] = [];
            (reactions as any[] || []).forEach((r: any) => {
              reactionCounts[r.reaction_type as ReactionType]++;
              if (r.user_id === user?.id) {
                userReactions.push(r.reaction_type);
              }
            });

            // Get comment count
            const { count: commentCount } = await supabase
              .from("trade_comments")
              .select("*", { count: "exact", head: true })
              .eq("trade_id", trade.id);

            return {
              ...trade,
              user: profileMap[trade.user_id] || { username: null, display_name: "Anonymous", avatar_url: null, anonymous_mode: true },
              reaction_counts: reactionCounts,
              user_reactions: userReactions,
              comment_count: commentCount || 0,
            };
          })
        );

        setTrades(tradesWithMeta);
      }
    } catch (err) {
      console.error("Exception fetching feed:", err);
      setTrades([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReaction = async (tradeId: string, reactionType: ReactionType) => {
    if (!currentUserId) {
      toast.error("Please log in to react");
      return;
    }

    const supabase = createClient();
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    const hasReaction = trade.user_reactions.includes(reactionType);

    if (hasReaction) {
      // Remove reaction
      await supabase
        .from("trade_reactions")
        .delete()
        .eq("trade_id", tradeId)
        .eq("user_id", currentUserId)
        .eq("reaction_type", reactionType);

      setTrades(prev =>
        prev.map(t =>
          t.id === tradeId
            ? {
                ...t,
                reaction_counts: {
                  ...t.reaction_counts,
                  [reactionType]: t.reaction_counts[reactionType] - 1,
                },
                user_reactions: t.user_reactions.filter(r => r !== reactionType),
              }
            : t
        )
      );
    } else {
      // Add reaction
      await (supabase.from("trade_reactions") as any).insert({
        trade_id: tradeId,
        user_id: currentUserId,
        reaction_type: reactionType,
      });

      setTrades(prev =>
        prev.map(t =>
          t.id === tradeId
            ? {
                ...t,
                reaction_counts: {
                  ...t.reaction_counts,
                  [reactionType]: t.reaction_counts[reactionType] + 1,
                },
                user_reactions: [...t.user_reactions, reactionType],
              }
            : t
        )
      );
    }
  };

  const handleDeleteFromFeed = async (tradeId: string) => {
    if (!currentUserId) {
      toast.error("Please log in");
      return;
    }

    try {
      const supabase = createClient();

      // Update the trade to remove it from the feed (not delete the trade itself)
      const { error } = await (supabase
        .from("trades") as any)
        .update({
          shared_to_feed: false,
          share_analysis: null,
          visibility: "private"
        })
        .eq("id", tradeId)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error removing from feed:", error);
        toast.error("Failed to remove from feed");
        return;
      }

      // Remove from local state
      setTrades(prev => prev.filter(t => t.id !== tradeId));
      toast.success("Removed from feed");
    } catch (err) {
      console.error("Exception removing from feed:", err);
      toast.error("Failed to remove from feed");
    }
  };

  // Prevent hydration issues
  if (!mounted) {
    return (
      <div className="container max-w-6xl py-6 px-4 sm:px-6">
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Trade Feed</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            See what other traders are sharing
          </p>
        </div>

        {/* Feed Filter Tabs */}
        <Tabs value={feedType} onValueChange={(v) => setFeedType(v as any)}>
          <TabsList>
            <TabsTrigger value="public" className="gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Public</span>
            </TabsTrigger>
            <TabsTrigger value="following" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Following</span>
            </TabsTrigger>
            <TabsTrigger value="squad" className="gap-1.5">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Squads</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Feed Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : trades.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No trades yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {feedType === "following"
                ? "No trades from people you follow yet. Try following more traders!"
                : feedType === "squad"
                ? "No trades from your squads yet."
                : "No public trades yet. Be the first to share!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onReaction={handleReaction}
              onDelete={handleDeleteFromFeed}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TradeCard({
  trade,
  onReaction,
  onDelete,
  currentUserId,
}: {
  trade: FeedTrade;
  onReaction: (tradeId: string, type: ReactionType) => void;
  onDelete: (tradeId: string) => void;
  currentUserId: string | null;
}) {
  const isWin = (trade.net_pnl || 0) > 0;
  const isLoss = (trade.net_pnl || 0) < 0;
  const displayName = trade.user?.anonymous_mode
    ? "Anonymous Trader"
    : trade.user?.display_name || trade.user?.username || "Trader";

  const totalReactions = Object.values(trade.reaction_counts).reduce((a, b) => a + b, 0);
  const isOwnTrade = currentUserId === trade.user_id;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Trade Result Banner */}
      <div
        className={cn(
          "h-1",
          isWin && "bg-green-500",
          isLoss && "bg-red-500",
          !isWin && !isLoss && "bg-muted"
        )}
      />

      <CardContent className="p-4 space-y-3">
        {/* User Info & Trade Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8">
              {!trade.user?.anonymous_mode && (
                <AvatarImage src={trade.user?.avatar_url || undefined} />
              )}
              <AvatarFallback className="text-xs">
                {trade.user?.anonymous_mode ? "?" : displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(trade.created_at, "short")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isWin && "border-green-500/50 text-green-600 bg-green-500/10",
                isLoss && "border-red-500/50 text-red-600 bg-red-500/10"
              )}
            >
              {isWin ? "Win" : isLoss ? "Loss" : "Break Even"}
            </Badge>
            {isOwnTrade && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(trade.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove from Feed
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Trade Details */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
          <div
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full shrink-0",
              trade.side === "long"
                ? "bg-green-500/20"
                : "bg-red-500/20"
            )}
          >
            {trade.side === "long" ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">
              {trade.symbol}{" "}
              <span className="text-muted-foreground font-normal text-sm capitalize">
                {trade.side}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {formatCurrency(trade.entry_price)} → {trade.exit_price ? formatCurrency(trade.exit_price) : "Open"}
            </div>
          </div>
          <div className="text-right shrink-0">
            {trade.net_pnl !== null && (
              <div
                className={cn(
                  "font-bold",
                  isWin && "text-green-600",
                  isLoss && "text-red-600"
                )}
              >
                {isWin ? "+" : ""}
                {formatCurrency(trade.net_pnl)}
              </div>
            )}
            {trade.r_multiple !== null && (
              <div className={cn(
                "text-xs",
                trade.r_multiple >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatRMultiple(trade.r_multiple)}
              </div>
            )}
          </div>
        </div>

        {/* Analysis */}
        {trade.share_analysis && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {trade.share_analysis}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-0.5">
            {REACTIONS.slice(0, 3).map(({ type, icon: Icon, label }) => {
              const count = trade.reaction_counts[type];
              const hasReacted = trade.user_reactions.includes(type);
              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2 gap-1",
                    hasReacted && "text-primary bg-primary/10"
                  )}
                  onClick={() => onReaction(trade.id, type)}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              );
            })}
            {totalReactions > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                {totalReactions > 3 ? `+${totalReactions - 3}` : ""}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5" asChild>
            <Link href={`/trades/${trade.id}`}>
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="text-xs">
                {trade.comment_count > 0 ? trade.comment_count : "Comment"}
              </span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

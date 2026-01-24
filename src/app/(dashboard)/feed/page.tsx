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
  Filter,
  Users,
  Globe,
  Sparkles,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
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

  const getTotalReactions = (trade: FeedTrade) => {
    return Object.values(trade.reaction_counts).reduce((a, b) => a + b, 0);
  };

  // Prevent hydration issues
  if (!mounted) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Trade Feed</h1>
          <p className="text-muted-foreground mt-2">
            See what other traders are sharing
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Trade Feed</h1>
        <p className="text-muted-foreground mt-2">
          See what other traders are sharing
        </p>
      </div>

      {/* Feed Tabs */}
      <Tabs value={feedType} onValueChange={(v) => setFeedType(v as any)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="public">
            <Globe className="h-4 w-4 mr-2" />
            Public
          </TabsTrigger>
          <TabsTrigger value="following">
            <Users className="h-4 w-4 mr-2" />
            Following
          </TabsTrigger>
          <TabsTrigger value="squad">
            <Users className="h-4 w-4 mr-2" />
            Squads
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feed Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : trades.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {feedType === "following"
                ? "No trades from people you follow yet. Try following more traders!"
                : feedType === "squad"
                ? "No trades from your squads yet."
                : "No public trades yet. Be the first to share!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onReaction={handleReaction}
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
  currentUserId,
}: {
  trade: FeedTrade;
  onReaction: (tradeId: string, type: ReactionType) => void;
  currentUserId: string | null;
}) {
  const isWin = (trade.net_pnl || 0) > 0;
  const isLoss = (trade.net_pnl || 0) < 0;
  const displayName = trade.user?.anonymous_mode
    ? "Anonymous Trader"
    : trade.user?.display_name || trade.user?.username || "Trader";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              {!trade.user?.anonymous_mode && (
                <AvatarImage src={trade.user?.avatar_url || undefined} />
              )}
              <AvatarFallback>
                {trade.user?.anonymous_mode ? "?" : displayName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{displayName}</div>
              <div className="text-sm text-muted-foreground">
                {formatDate(trade.created_at, "medium")}
              </div>
            </div>
          </div>
          <Badge variant={isWin ? "default" : isLoss ? "destructive" : "secondary"}>
            {isWin ? "Win" : isLoss ? "Loss" : "Break Even"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Trade Info */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              trade.side === "long"
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            )}
          >
            {trade.side === "long" ? (
              <ArrowUpRight className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowDownRight className="h-5 w-5 text-red-600" />
            )}
          </div>
          <div>
            <div className="font-semibold text-lg">
              {trade.symbol}{" "}
              <span className="text-muted-foreground font-normal capitalize">
                {trade.side}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Entry: {formatCurrency(trade.entry_price)}
              {trade.exit_price && ` → Exit: ${formatCurrency(trade.exit_price)}`}
            </div>
          </div>
          <div className="ml-auto text-right">
            {trade.net_pnl !== null && (
              <div
                className={cn(
                  "text-xl font-bold",
                  isWin && "text-green-600",
                  isLoss && "text-red-600"
                )}
              >
                {isWin ? "+" : ""}
                {formatCurrency(trade.net_pnl)}
              </div>
            )}
            {trade.r_multiple !== null && (
              <div className="text-sm text-muted-foreground">
                {formatRMultiple(trade.r_multiple)}
              </div>
            )}
          </div>
        </div>

        {/* Analysis */}
        {trade.share_analysis && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm">{trade.share_analysis}</p>
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1">
            {REACTIONS.map(({ type, icon: Icon, label }) => {
              const count = trade.reaction_counts[type];
              const hasReacted = trade.user_reactions.includes(type);
              return (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 px-2",
                    hasReacted && "text-primary bg-primary/10"
                  )}
                  onClick={() => onReaction(trade.id, type)}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                  {count > 0 && <span className="ml-1 text-xs">{count}</span>}
                </Button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/trades/${trade.id}`}>
              <MessageSquare className="h-4 w-4 mr-1" />
              {trade.comment_count > 0 ? trade.comment_count : "Comment"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

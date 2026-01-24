"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Plus,
  ArrowLeft,
  Calendar,
  Target,
  TrendingUp,
  Percent,
  BarChart3,
  Crown,
  Medal,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Spinner,
  toast,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatRMultiple } from "@/lib/calculations/formatters";

type ChallengeMetric = "total_pnl" | "win_rate" | "avg_r_multiple" | "trade_count" | "consistency";
type ChallengeStatus = "upcoming" | "active" | "completed";

interface Challenge {
  id: string;
  squad_id: string;
  name: string;
  description: string | null;
  metric: ChallengeMetric;
  start_date: string;
  end_date: string;
  created_by: string;
  winner_id: string | null;
  created_at: string;
}

interface ChallengeStanding {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  value: number;
  rank: number;
}

interface ChallengeWithStandings extends Challenge {
  standings: ChallengeStanding[];
  status: ChallengeStatus;
}

const METRICS: { value: ChallengeMetric; label: string; icon: React.ElementType }[] = [
  { value: "total_pnl", label: "Total P&L", icon: TrendingUp },
  { value: "win_rate", label: "Win Rate", icon: Percent },
  { value: "avg_r_multiple", label: "Avg R-Multiple", icon: Target },
  { value: "trade_count", label: "Trade Count", icon: BarChart3 },
];

export default function SquadChallengesPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;

  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [squadName, setSquadName] = React.useState("");
  const [challenges, setChallenges] = React.useState<ChallengeWithStandings[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);

  const [newChallenge, setNewChallenge] = React.useState({
    name: "",
    description: "",
    metric: "total_pnl" as ChallengeMetric,
    duration: "7", // days
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && squadId) {
      fetchChallenges();
    }
  }, [mounted, squadId]);

  const fetchChallenges = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch squad name
      const { data: squadData } = await supabase
        .from("squads")
        .select("name")
        .eq("id", squadId)
        .single();

      if (squadData) {
        setSquadName((squadData as any).name);
      }

      // Fetch squad members
      const { data: membersData } = await supabase
        .from("squad_members")
        .select("user_id")
        .eq("squad_id", squadId);

      const memberIds = (membersData as any[])?.map(m => m.user_id) || [];

      // Check if squad_challenges table exists, if not just show empty
      // For now, we'll simulate challenges since the table might not exist
      // In production, you'd create the table and fetch real data

      // Simulate some challenges for demo
      const now = new Date();
      const simulatedChallenges: ChallengeWithStandings[] = [];

      // If we have members, create a sample active challenge
      if (memberIds.length > 0) {
        // Fetch profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", memberIds);

        // Fetch recent trades for standings
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const standings: ChallengeStanding[] = [];
        for (const memberId of memberIds) {
          const profile = (profiles as any[])?.find(p => p.id === memberId);

          const { data: trades } = await supabase
            .from("trades")
            .select("net_pnl, r_multiple")
            .eq("user_id", memberId)
            .eq("status", "closed")
            .gte("entry_date", weekAgo.toISOString());

          const totalPnl = (trades as any[])?.reduce((sum, t) => sum + (t.net_pnl || 0), 0) || 0;

          standings.push({
            user_id: memberId,
            username: profile?.username,
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url,
            value: totalPnl,
            rank: 0,
          });
        }

        // Sort and assign ranks
        standings.sort((a, b) => b.value - a.value);
        standings.forEach((s, i) => s.rank = i + 1);

        // Create a sample "Weekly P&L Challenge"
        const startDate = new Date(weekAgo);
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 7);

        simulatedChallenges.push({
          id: "weekly-pnl",
          squad_id: squadId,
          name: "Weekly P&L Challenge",
          description: "Who can earn the most P&L this week?",
          metric: "total_pnl",
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          created_by: memberIds[0],
          winner_id: null,
          created_at: startDate.toISOString(),
          standings,
          status: "active",
        });
      }

      setChallenges(simulatedChallenges);
    } catch (err) {
      console.error("Error fetching challenges:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!newChallenge.name.trim()) {
      toast.error("Challenge name is required");
      return;
    }

    setIsCreating(true);
    try {
      // In a full implementation, this would create a challenge in the database
      // For now, just show a success message
      toast.success("Challenge created! (Demo mode)");
      setIsCreateOpen(false);
      setNewChallenge({
        name: "",
        description: "",
        metric: "total_pnl",
        duration: "7",
      });
      fetchChallenges();
    } catch (err) {
      console.error("Error creating challenge:", err);
      toast.error("Failed to create challenge");
    } finally {
      setIsCreating(false);
    }
  };

  const formatMetricValue = (value: number, metric: ChallengeMetric) => {
    switch (metric) {
      case "total_pnl":
        return formatCurrency(value);
      case "win_rate":
        return `${value.toFixed(1)}%`;
      case "avg_r_multiple":
        return formatRMultiple(value);
      case "trade_count":
        return value.toString();
      default:
        return value.toFixed(2);
    }
  };

  const getStatusBadge = (status: ChallengeStatus) => {
    switch (status) {
      case "upcoming":
        return <Badge variant="secondary">Upcoming</Badge>;
      case "active":
        return <Badge variant="default" className="bg-green-600">Active</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/squads/${squadId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Challenges</h1>
          <p className="text-muted-foreground">{squadName}</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Challenge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Challenge</DialogTitle>
              <DialogDescription>
                Start a new competition for your squad
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Challenge Name</Label>
                <Input
                  placeholder="e.g., Weekly P&L Battle"
                  value={newChallenge.name}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  placeholder="What's this challenge about?"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select
                  value={newChallenge.metric}
                  onValueChange={(v) => setNewChallenge(prev => ({ ...prev, metric: v as ChallengeMetric }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRICS.map(m => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex items-center gap-2">
                          <m.icon className="h-4 w-4" />
                          {m.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={newChallenge.duration}
                  onValueChange={(v) => setNewChallenge(prev => ({ ...prev, duration: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 Week</SelectItem>
                    <SelectItem value="14">2 Weeks</SelectItem>
                    <SelectItem value="30">1 Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChallenge} disabled={isCreating}>
                {isCreating && <Spinner className="h-4 w-4 mr-2" />}
                Create Challenge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Challenges List */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No challenges yet</h3>
            <p className="text-muted-foreground mb-4">
              Start a challenge to compete with your squad members!
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Challenge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {challenges.map((challenge) => {
            const metricInfo = METRICS.find(m => m.value === challenge.metric);
            const MetricIcon = metricInfo?.icon || TrendingUp;

            return (
              <Card key={challenge.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle>{challenge.name}</CardTitle>
                        {getStatusBadge(challenge.status)}
                      </div>
                      {challenge.description && (
                        <CardDescription>{challenge.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MetricIcon className="h-4 w-4" />
                      {metricInfo?.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {challenge.standings.slice(0, 5).map((standing) => (
                      <div
                        key={standing.user_id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          standing.rank === 1 && "bg-yellow-50 dark:bg-yellow-950/20",
                          standing.rank === 2 && "bg-slate-50 dark:bg-slate-950/20",
                          standing.rank === 3 && "bg-orange-50 dark:bg-orange-950/20",
                          standing.user_id === currentUserId && "ring-2 ring-primary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center">
                            {standing.rank === 1 ? (
                              <Crown className="h-5 w-5 text-yellow-500 mx-auto" />
                            ) : standing.rank <= 3 ? (
                              <Medal className={cn(
                                "h-5 w-5 mx-auto",
                                standing.rank === 2 && "text-slate-400",
                                standing.rank === 3 && "text-orange-400"
                              )} />
                            ) : (
                              <span className="text-muted-foreground font-medium">
                                #{standing.rank}
                              </span>
                            )}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={standing.avatar_url || undefined} />
                            <AvatarFallback>
                              {standing.display_name?.[0] || standing.username?.[0] || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">
                              {standing.display_name || standing.username || "Anonymous"}
                            </span>
                            {standing.user_id === currentUserId && (
                              <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          "font-bold",
                          challenge.metric === "total_pnl" && standing.value >= 0 && "text-green-600",
                          challenge.metric === "total_pnl" && standing.value < 0 && "text-red-600"
                        )}>
                          {formatMetricValue(standing.value, challenge.metric)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

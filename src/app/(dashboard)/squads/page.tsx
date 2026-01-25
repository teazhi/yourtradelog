"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Lock,
  Globe,
  Trophy,
  TrendingUp,
  Crown,
  Copy,
  Check,
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
} from "@/components/ui";
import { CustomSwitch } from "@/components/ui/custom-switch";
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogDescription,
  CustomDialogContent,
  CustomDialogFooter,
} from "@/components/ui/custom-dialog";
import { createClient } from "@/lib/supabase/client";
import { Squad, SquadMember } from "@/types/social";

interface SquadWithMeta extends Squad {
  member_count: number;
  is_member: boolean;
  user_role?: string;
}

export default function SquadsPage() {
  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [mySquads, setMySquads] = React.useState<SquadWithMeta[]>([]);
  const [publicSquads, setPublicSquads] = React.useState<SquadWithMeta[]>([]);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isJoinOpen, setIsJoinOpen] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState("");
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  // Create squad form
  const [newSquad, setNewSquad] = React.useState({
    name: "",
    description: "",
    is_public: false,
  });
  const [isCreating, setIsCreating] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchSquads();
    }
  }, [mounted]);

  const fetchSquads = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch squad memberships for user
      const { data: memberData } = await supabase
        .from("squad_members")
        .select("squad_id, role")
        .eq("user_id", user.id);

      const mySquadsList: SquadWithMeta[] = [];

      if (memberData && memberData.length > 0) {
        // Get squad IDs
        const squadIds = (memberData as any[]).map(m => m.squad_id);

        // Fetch squad details
        const { data: squadsData } = await supabase
          .from("squads")
          .select("*")
          .in("id", squadIds);

        // Create a map of member roles
        const roleMap: Record<string, string> = {};
        for (const member of memberData as any[]) {
          roleMap[member.squad_id] = member.role;
        }

        // Build the squads list with member counts
        for (const squad of (squadsData || []) as any[]) {
          const { count } = await supabase
            .from("squad_members")
            .select("*", { count: "exact", head: true })
            .eq("squad_id", squad.id);

          mySquadsList.push({
            ...squad,
            member_count: count || 0,
            is_member: true,
            user_role: roleMap[squad.id],
          });
        }
      }
      setMySquads(mySquadsList);

      // Fetch public squads user is NOT a member of
      const mySquadIds = mySquadsList.map(s => s.id);
      let publicQuery = supabase
        .from("squads")
        .select("*")
        .eq("is_public", true)
        .limit(20);

      if (mySquadIds.length > 0) {
        publicQuery = publicQuery.not("id", "in", `(${mySquadIds.join(",")})`);
      }

      const { data: publicData } = await publicQuery;

      const publicSquadsList: SquadWithMeta[] = [];
      for (const squad of (publicData || []) as any[]) {
        const { count } = await supabase
          .from("squad_members")
          .select("*", { count: "exact", head: true })
          .eq("squad_id", squad.id);

        publicSquadsList.push({
          ...squad,
          member_count: count || 0,
          is_member: false,
        });
      }
      setPublicSquads(publicSquadsList);
    } catch (err) {
      console.error("Exception fetching squads:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSquad = async () => {
    if (!newSquad.name.trim()) {
      toast.error("Squad name is required");
      return;
    }

    setIsCreating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to create a squad");
        setIsCreating(false);
        return;
      }

      // Create the squad
      const { data: squad, error: squadError } = await (supabase
        .from("squads") as any)
        .insert({
          name: newSquad.name,
          description: newSquad.description || null,
          owner_id: user.id,
          is_public: newSquad.is_public,
        })
        .select()
        .single();

      if (squadError) {
        toast.error("Failed to create squad: " + (squadError.message || "Unknown error"));
        setIsCreating(false);
        return;
      }

      // Add creator as owner member
      await (supabase.from("squad_members") as any).insert({
        squad_id: squad.id,
        user_id: user.id,
        role: "owner",
      });

      toast.success("Squad created!");
      setIsCreateOpen(false);
      setNewSquad({ name: "", description: "", is_public: false });
      fetchSquads();
    } catch {
      toast.error("Failed to create squad");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to join a squad");
        return;
      }

      // Find squad by invite code
      const { data: squadData } = await supabase
        .from("squads")
        .select("*")
        .eq("invite_code", inviteCode.toLowerCase().trim())
        .single();

      const squad = squadData as { id: string; name: string; max_members: number } | null;

      if (!squad) {
        toast.error("Invalid invite code");
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from("squad_members")
        .select("id")
        .eq("squad_id", squad.id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        toast.error("You're already a member of this squad");
        return;
      }

      // Check member limit
      const { count } = await supabase
        .from("squad_members")
        .select("*", { count: "exact", head: true })
        .eq("squad_id", squad.id);

      if ((count || 0) >= squad.max_members) {
        toast.error("This squad is full");
        return;
      }

      // Join the squad
      await (supabase.from("squad_members") as any).insert({
        squad_id: squad.id,
        user_id: user.id,
        role: "member",
      });

      toast.success(`Joined ${squad.name}!`);
      setIsJoinOpen(false);
      setInviteCode("");
      fetchSquads();
    } catch (err) {
      console.error("Exception joining squad:", err);
      toast.error("Failed to join squad");
    }
  };

  const handleJoinPublicSquad = async (squadId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to join a squad");
        return;
      }

      await (supabase.from("squad_members") as any).insert({
        squad_id: squadId,
        user_id: user.id,
        role: "member",
      });

      toast.success("Joined squad!");
      fetchSquads();
    } catch (err) {
      console.error("Exception joining squad:", err);
      toast.error("Failed to join squad");
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Trading Squads</h1>
          <p className="text-muted-foreground mt-2">
            Team up with other traders to learn and compete together
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsJoinOpen(true)}>
            <Search className="h-4 w-4 mr-2" />
            Join by Code
          </Button>

          <CustomDialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <CustomDialogHeader>
              <CustomDialogTitle>Join a Squad</CustomDialogTitle>
              <CustomDialogDescription>
                Enter the invite code shared by the squad owner
              </CustomDialogDescription>
            </CustomDialogHeader>
            <CustomDialogContent>
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input
                  placeholder="Enter code..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
            </CustomDialogContent>
            <CustomDialogFooter>
              <Button variant="outline" onClick={() => setIsJoinOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleJoinByCode}>Join Squad</Button>
            </CustomDialogFooter>
          </CustomDialog>

          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Squad
          </Button>

          <CustomDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <CustomDialogHeader>
              <CustomDialogTitle>Create a Squad</CustomDialogTitle>
              <CustomDialogDescription>
                Start a new trading group and invite others to join
              </CustomDialogDescription>
            </CustomDialogHeader>
            <CustomDialogContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Squad Name</Label>
                  <Input
                    placeholder="e.g., Futures Traders NYC"
                    value={newSquad.name}
                    onChange={(e) => setNewSquad(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What's your squad about?"
                    value={newSquad.description}
                    onChange={(e) => setNewSquad(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Public Squad</Label>
                    <p className="text-sm text-muted-foreground">
                      Anyone can find and join your squad
                    </p>
                  </div>
                  <CustomSwitch
                    checked={newSquad.is_public}
                    onCheckedChange={(checked) => setNewSquad(prev => ({ ...prev, is_public: checked }))}
                  />
                </div>
              </div>
            </CustomDialogContent>
            <CustomDialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateSquad} disabled={isCreating}>
                {isCreating ? <Spinner className="h-4 w-4 mr-2" /> : null}
                Create Squad
              </Button>
            </CustomDialogFooter>
          </CustomDialog>
        </div>
      </div>

      {/* My Squads */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">My Squads</h2>
        {mySquads.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                You're not in any squads yet. Create one or join an existing squad!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mySquads.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                showInviteCode={squad.user_role === "owner" || squad.user_role === "admin"}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public Squads */}
      {publicSquads.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Discover Public Squads</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {publicSquads.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                onJoin={() => handleJoinPublicSquad(squad.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SquadCard({
  squad,
  showInviteCode = false,
  onJoin,
}: {
  squad: SquadWithMeta;
  showInviteCode?: boolean;
  onJoin?: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(squad.invite_code);
    setCopied(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={squad.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {squad.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {squad.name}
                {squad.user_role === "owner" && (
                  <Crown className="h-4 w-4 text-yellow-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {squad.is_public ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                <span>{squad.member_count} / {squad.max_members} members</span>
              </div>
            </div>
          </div>
          {squad.is_member ? (
            <Badge variant="secondary">Member</Badge>
          ) : (
            <Button size="sm" onClick={onJoin}>
              Join
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {squad.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {squad.description}
          </p>
        )}

        {showInviteCode && (
          <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
            <code className="text-sm font-mono flex-1">{squad.invite_code}</code>
            <Button variant="ghost" size="sm" onClick={copyInviteCode}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {squad.is_member && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/squads/${squad.id}`}>
                <Users className="h-4 w-4 mr-2" />
                View Squad
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/squads/${squad.id}/challenges`}>
                <Trophy className="h-4 w-4 mr-2" />
                Challenges
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

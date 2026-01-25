"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Crown,
  Shield,
  Copy,
  Check,
  ArrowLeft,
  Settings,
  LogOut,
  Trophy,
  TrendingUp,
  Globe,
  Lock,
  UserPlus,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Spinner,
  toast,
  cn,
  Separator,
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

interface SquadMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  joined_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  stats?: {
    total_trades: number;
    win_rate: number;
    total_pnl: number;
  };
}

interface Squad {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  is_public: boolean;
  invite_code: string;
  max_members: number;
  created_at: string;
}

// Custom Dropdown component to avoid Radix hydration issues
function CustomDropdown({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg z-50">
          <div onClick={() => setIsOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  onClick,
  children,
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent cursor-pointer text-left",
        className
      )}
    >
      {children}
    </button>
  );
}

function DropdownSeparator() {
  return <div className="border-t my-1" />;
}

export default function SquadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const squadId = params.id as string;

  const [mounted, setMounted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [squad, setSquad] = React.useState<Squad | null>(null);
  const [members, setMembers] = React.useState<SquadMember[]>([]);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted && squadId) {
      fetchSquadDetails();
    }
  }, [mounted, squadId]);

  const fetchSquadDetails = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch squad details
      const { data: squadData, error: squadError } = await supabase
        .from("squads")
        .select("*")
        .eq("id", squadId)
        .single();

      if (squadError || !squadData) {
        toast.error("Squad not found");
        router.push("/squads");
        return;
      }

      setSquad(squadData as Squad);

      // Fetch members
      const { data: membersData } = await supabase
        .from("squad_members")
        .select("id, user_id, role, joined_at")
        .eq("squad_id", squadId)
        .order("role", { ascending: true })
        .order("joined_at", { ascending: true });

      if (membersData && membersData.length > 0) {
        const membersList = membersData as SquadMember[];

        // Check current user's role
        const currentMember = membersList.find(m => m.user_id === user?.id);
        setCurrentUserRole(currentMember?.role || null);

        // Fetch profiles for all members
        const userIds = membersList.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);

        // Fetch stats for each member (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const membersWithData: SquadMember[] = [];
        for (const member of membersList) {
          const profile = (profiles as any[])?.find(p => p.id === member.user_id);

          // Fetch trades for stats
          const { data: trades } = await supabase
            .from("trades")
            .select("net_pnl")
            .eq("user_id", member.user_id)
            .eq("status", "closed")
            .gte("entry_date", thirtyDaysAgo.toISOString());

          const totalTrades = trades?.length || 0;
          const wins = (trades as any[])?.filter(t => (t.net_pnl || 0) > 0).length || 0;
          const totalPnl = (trades as any[])?.reduce((sum, t) => sum + (t.net_pnl || 0), 0) || 0;

          membersWithData.push({
            ...member,
            profile,
            stats: {
              total_trades: totalTrades,
              win_rate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
              total_pnl: totalPnl,
            },
          });
        }

        // Sort: owner first, then admins, then members by P&L
        membersWithData.sort((a, b) => {
          const roleOrder = { owner: 0, admin: 1, member: 2 };
          if (roleOrder[a.role] !== roleOrder[b.role]) {
            return roleOrder[a.role] - roleOrder[b.role];
          }
          return (b.stats?.total_pnl || 0) - (a.stats?.total_pnl || 0);
        });

        setMembers(membersWithData);
      }
    } catch (err) {
      console.error("Error fetching squad details:", err);
      toast.error("Failed to load squad");
    } finally {
      setIsLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (squad) {
      navigator.clipboard.writeText(squad.invite_code);
      setCopied(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLeaveSquad = async () => {
    if (!currentUserId || !squad) return;

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("squad_members")
        .delete()
        .eq("squad_id", squad.id)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error leaving squad:", error);
        toast.error("Failed to leave squad");
        return;
      }

      toast.success("You have left the squad");
      router.push("/squads");
    } catch (err) {
      console.error("Error leaving squad:", err);
      toast.error("Failed to leave squad");
    }
  };

  const handleDeleteSquad = async () => {
    if (!squad || currentUserRole !== "owner") return;

    try {
      const supabase = createClient();

      // Delete all members first
      await supabase
        .from("squad_members")
        .delete()
        .eq("squad_id", squad.id);

      // Delete the squad
      await supabase
        .from("squads")
        .delete()
        .eq("id", squad.id);

      toast.success("Squad deleted");
      router.push("/squads");
    } catch (err) {
      console.error("Error deleting squad:", err);
      toast.error("Failed to delete squad");
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (!squad || !["owner", "admin"].includes(currentUserRole || "")) return;
    if (memberUserId === squad.owner_id) {
      toast.error("Cannot remove the squad owner");
      return;
    }

    try {
      const supabase = createClient();

      await supabase
        .from("squad_members")
        .delete()
        .eq("id", memberId);

      toast.success("Member removed");
      fetchSquadDetails();
    } catch (err) {
      console.error("Error removing member:", err);
      toast.error("Failed to remove member");
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    if (!squad || currentUserRole !== "owner") return;

    try {
      const supabase = createClient();

      await (supabase.from("squad_members") as any)
        .update({ role: "admin" })
        .eq("id", memberId);

      toast.success("Member promoted to admin");
      fetchSquadDetails();
    } catch (err) {
      console.error("Error promoting member:", err);
      toast.error("Failed to promote member");
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="container max-w-4xl py-8 text-center">
        <p className="text-muted-foreground">Squad not found</p>
        <Button asChild className="mt-4">
          <Link href="/squads">Back to Squads</Link>
        </Button>
      </div>
    );
  }

  const isOwnerOrAdmin = ["owner", "admin"].includes(currentUserRole || "");

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/squads">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{squad.name}</h1>
            {squad.is_public ? (
              <Badge variant="secondary">
                <Globe className="h-3 w-3 mr-1" />
                Public
              </Badge>
            ) : (
              <Badge variant="outline">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </div>
          {squad.description && (
            <p className="text-muted-foreground mt-1">{squad.description}</p>
          )}
        </div>

        {currentUserRole && (
          <CustomDropdown
            trigger={
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            }
          >
            {currentUserRole === "owner" && (
              <>
                <DropdownItem>
                  <Settings className="h-4 w-4" />
                  Squad Settings
                </DropdownItem>
                <DropdownSeparator />
              </>
            )}
            {currentUserRole !== "owner" && (
              <DropdownItem
                onClick={() => setIsLeaveDialogOpen(true)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-4 w-4" />
                Leave Squad
              </DropdownItem>
            )}
            {currentUserRole === "owner" && (
              <DropdownItem
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Trash2 className="h-4 w-4" />
                Delete Squad
              </DropdownItem>
            )}
          </CustomDropdown>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{members.length}</div>
            <div className="text-sm text-muted-foreground">Members</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {formatCurrency(members.reduce((sum, m) => sum + (m.stats?.total_pnl || 0), 0))}
            </div>
            <div className="text-sm text-muted-foreground">Squad P&L (30d)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {members.reduce((sum, m) => sum + (m.stats?.total_trades || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Trades (30d)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <UserPlus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{squad.max_members - members.length}</div>
            <div className="text-sm text-muted-foreground">Spots Left</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Code (for owners/admins) */}
      {isOwnerOrAdmin && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Invite Code</CardTitle>
            <CardDescription>Share this code with others to invite them</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted rounded-lg p-3 font-mono text-lg">
                {squad.invite_code}
              </code>
              <Button onClick={copyInviteCode}>
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>{members.length} / {squad.max_members} members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member, index) => (
              <div key={member.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profile?.display_name?.[0] || member.profile?.username?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.profile?.display_name || member.profile?.username || "Anonymous"}
                        </span>
                        {member.role === "owner" && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {member.role === "admin" && (
                          <Shield className="h-4 w-4 text-blue-500" />
                        )}
                        {member.user_id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">You</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {member.stats?.total_trades || 0} trades · {(member.stats?.win_rate || 0).toFixed(0)}% win rate
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "font-semibold",
                      (member.stats?.total_pnl || 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(member.stats?.total_pnl || 0)}
                    </span>
                    {isOwnerOrAdmin && member.user_id !== currentUserId && member.role !== "owner" && (
                      <CustomDropdown
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                      >
                        {currentUserRole === "owner" && member.role === "member" && (
                          <DropdownItem onClick={() => handlePromoteToAdmin(member.id)}>
                            <Shield className="h-4 w-4" />
                            Promote to Admin
                          </DropdownItem>
                        )}
                        <DropdownItem
                          onClick={() => handleRemoveMember(member.id, member.user_id)}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove from Squad
                        </DropdownItem>
                      </CustomDropdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leave Squad Dialog */}
      <CustomDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Leave Squad</CustomDialogTitle>
            <CustomDialogDescription>
              Are you sure you want to leave {squad.name}? You&apos;ll need an invite code to rejoin.
            </CustomDialogDescription>
          </CustomDialogHeader>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLeaveSquad}>
              Leave Squad
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>

      {/* Delete Squad Dialog */}
      <CustomDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <CustomDialogContent>
          <CustomDialogHeader>
            <CustomDialogTitle>Delete Squad</CustomDialogTitle>
            <CustomDialogDescription>
              Are you sure you want to delete {squad.name}? This action cannot be undone and all members will be removed.
            </CustomDialogDescription>
          </CustomDialogHeader>
          <CustomDialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSquad}>
              Delete Squad
            </Button>
          </CustomDialogFooter>
        </CustomDialogContent>
      </CustomDialog>
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  MessageCircle,
  Calendar,
  TrendingUp,
  Send,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Handshake,
  ArrowRight,
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
  Textarea,
  cn,
  toast,
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

interface Partner {
  id: string;
  user_id: string;
  partner_id: string;
  status: "pending" | "active" | "declined";
  created_at: string;
  partner_profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  partner_stats?: {
    trades_this_week: number;
    pnl_this_week: number;
    streak: number;
  };
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
  const [myStats, setMyStats] = React.useState({
    trades_this_week: 0,
    pnl_this_week: 0,
    streak: 0,
  });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (mounted) {
      fetchPartnerData();
    }
  }, [mounted]);

  const fetchPartnerData = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

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
          .select("username, display_name, avatar_url")
          .eq("id", partnerId)
          .single();

        // Fetch partner stats
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        const { data: partnerTrades } = await supabase
          .from("trades")
          .select("net_pnl, entry_date")
          .eq("user_id", partnerId)
          .eq("status", "closed")
          .gte("entry_date", weekStart.toISOString());

        const partnerStats = {
          trades_this_week: partnerTrades?.length || 0,
          pnl_this_week: (partnerTrades as any[])?.reduce((sum, t) => sum + (t.net_pnl || 0), 0) || 0,
          streak: 0, // Would need more complex calculation
        };

        setPartner({
          ...partnership,
          partner_profile: partnerProfile,
          partner_stats: partnerStats,
        });
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

      // Fetch my stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data: myTrades } = await supabase
        .from("trades")
        .select("net_pnl")
        .eq("user_id", user.id)
        .eq("status", "closed")
        .gte("entry_date", weekStart.toISOString());

      setMyStats({
        trades_this_week: myTrades?.length || 0,
        pnl_this_week: (myTrades as any[])?.reduce((sum, t) => sum + (t.net_pnl || 0), 0) || 0,
        streak: 0,
      });
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
    } catch (err) {
      console.error("Error ending partnership:", err);
      toast.error("Failed to end partnership");
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Accountability Partner</h1>
        <p className="text-muted-foreground mt-2">
          Partner with another trader to stay accountable and motivated
        </p>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card className="mb-8 border-blue-500/30 bg-blue-500/5">
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
          <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Handshake className="h-5 w-5 text-green-500" />
                  Your Accountability Partner
                </CardTitle>
                <Badge className="bg-green-500">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={partner.partner_profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xl">
                    {partner.partner_profile?.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {partner.partner_profile?.display_name || partner.partner_profile?.username || "Partner"}
                  </h3>
                  <p className="text-muted-foreground">@{partner.partner_profile?.username}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">This Week's Progress</CardTitle>
              <CardDescription>Compare your trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* My Stats */}
                <div className="space-y-4">
                  <h4 className="font-medium text-center">You</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{myStats.trades_this_week}</div>
                      <div className="text-sm text-muted-foreground">Trades</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className={cn(
                        "text-2xl font-bold",
                        myStats.pnl_this_week >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {formatCurrency(myStats.pnl_this_week)}
                      </div>
                      <div className="text-sm text-muted-foreground">P&L</div>
                    </div>
                  </div>
                </div>

                {/* Partner Stats */}
                <div className="space-y-4">
                  <h4 className="font-medium text-center">
                    {partner.partner_profile?.display_name || "Partner"}
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{partner.partner_stats?.trades_this_week || 0}</div>
                      <div className="text-sm text-muted-foreground">Trades</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className={cn(
                        "text-2xl font-bold",
                        (partner.partner_stats?.pnl_this_week || 0) >= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {formatCurrency(partner.partner_stats?.pnl_this_week || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">P&L</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={endPartnership}>
              End Partnership
            </Button>
          </div>
        </div>
      ) : (
        // No Partner - Find One
        <div className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Find an Accountability Partner</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Partner with another trader to share your progress, stay motivated, and hold each other accountable.
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
                <TrendingUp className="h-8 w-8 mx-auto mb-3 text-green-500" />
                <h3 className="font-semibold mb-1">Stay Consistent</h3>
                <p className="text-sm text-muted-foreground">
                  Having someone to check in with helps maintain good habits
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-3 text-blue-500" />
                <h3 className="font-semibold mb-1">Share Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Discuss trades and learn from each other's experiences
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-3 text-purple-500" />
                <h3 className="font-semibold mb-1">Weekly Check-ins</h3>
                <p className="text-sm text-muted-foreground">
                  Compare weekly progress and celebrate wins together
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

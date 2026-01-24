"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  Shield,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  Award,
  Save,
  Camera,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Spinner,
  toast,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { CustomSwitch } from "@/components/ui/custom-switch";
import { createClient } from "@/lib/supabase/client";
import { SocialProfile, TradingStyle, ExperienceLevel } from "@/types/social";
import { DEFAULT_FUTURES_INSTRUMENTS } from "@/lib/constants";

const TRADING_STYLES: { value: TradingStyle; label: string }[] = [
  { value: "scalper", label: "Scalper" },
  { value: "day_trader", label: "Day Trader" },
  { value: "swing_trader", label: "Swing Trader" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Beginner (< 1 year)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "advanced", label: "Advanced (3-5 years)" },
  { value: "professional", label: "Professional (5+ years)" },
];

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [profile, setProfile] = React.useState<Partial<SocialProfile>>({});
  const [stats, setStats] = React.useState({
    followerCount: 0,
    followingCount: 0,
    totalTrades: 0,
    winRate: 0,
  });

  React.useEffect(() => {
    async function fetchProfile() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Fetch profile
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        }

        if (data) {
          setProfile(data);
        } else {
          // Create default profile
          setProfile({
            id: user.id,
            email: user.email || "",
            username: null,
            display_name: null,
            bio: null,
            is_public: false,
            show_pnl: false,
            show_stats: true,
            anonymous_mode: false,
            is_mentor: false,
            trading_style: null,
            experience_level: null,
            favorite_instruments: [],
          });
        }

        // Fetch stats
        const { count: followerCount } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", user.id);

        const { count: followingCount } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", user.id);

        const { data: trades } = await supabase
          .from("trades")
          .select("net_pnl")
          .eq("user_id", user.id)
          .eq("status", "closed");

        const totalTrades = trades?.length || 0;
        const wins = (trades as { net_pnl: number | null }[] | null)?.filter(t => (t.net_pnl || 0) > 0).length || 0;
        const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

        setStats({
          followerCount: followerCount || 0,
          followingCount: followingCount || 0,
          totalTrades,
          winRate,
        });
      } catch (err) {
        console.error("Exception fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Check username uniqueness if changed
      if (profile.username) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", profile.username)
          .neq("id", user.id)
          .single();

        if (existing) {
          toast.error("Username is already taken");
          setIsSaving(false);
          return;
        }
      }

      const { error } = await (supabase
        .from("profiles") as any)
        .upsert({
          id: user.id,
          email: user.email,
          username: profile.username || null,
          display_name: profile.display_name || null,
          bio: profile.bio || null,
          is_public: profile.is_public || false,
          show_pnl: profile.show_pnl || false,
          show_stats: profile.show_stats ?? true,
          anonymous_mode: profile.anonymous_mode || false,
          is_mentor: profile.is_mentor || false,
          trading_style: profile.trading_style || null,
          experience_level: profile.experience_level || null,
          favorite_instruments: profile.favorite_instruments || [],
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Error saving profile:", error);
        toast.error("Failed to save profile");
      } else {
        toast.success("Profile saved!");
      }
    } catch (err) {
      console.error("Exception saving profile:", err);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = (field: keyof SocialProfile, value: unknown) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const toggleInstrument = (symbol: string) => {
    const current = profile.favorite_instruments || [];
    if (current.includes(symbol)) {
      updateProfile("favorite_instruments", current.filter(s => s !== symbol));
    } else {
      updateProfile("favorite_instruments", [...current, symbol]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile and privacy settings
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.followerCount}</div>
            <div className="text-sm text-muted-foreground">Followers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.followingCount}</div>
            <div className="text-sm text-muted-foreground">Following</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.totalTrades}</div>
            <div className="text-sm text-muted-foreground">Total Trades</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="trading">
            <TrendingUp className="h-4 w-4 mr-2" />
            Trading Info
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Public Profile</CardTitle>
              <CardDescription>
                This information will be visible to other traders
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl">
                    {profile.display_name?.[0] || profile.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Change Avatar
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="@username"
                    value={profile.username || ""}
                    onChange={(e) => updateProfile("username", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and underscores only
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">Display Name</Label>
                  <Input
                    id="display_name"
                    placeholder="Your name"
                    value={profile.display_name || ""}
                    onChange={(e) => updateProfile("display_name", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell other traders about yourself..."
                  value={profile.bio || ""}
                  onChange={(e) => updateProfile("bio", e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>
                Control what others can see about you and your trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to find and view your profile
                  </p>
                </div>
                <CustomSwitch
                  checked={profile.is_public || false}
                  onCheckedChange={(checked) => updateProfile("is_public", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show P&L</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your actual profit/loss amounts
                  </p>
                </div>
                <CustomSwitch
                  checked={profile.show_pnl || false}
                  onCheckedChange={(checked) => updateProfile("show_pnl", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Show Stats</Label>
                  <p className="text-sm text-muted-foreground">
                    Display win rate, R-multiple, and other statistics
                  </p>
                </div>
                <CustomSwitch
                  checked={profile.show_stats ?? true}
                  onCheckedChange={(checked) => updateProfile("show_stats", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Anonymous Mode</Label>
                    <Badge variant="secondary">Stealth</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Hide your identity on leaderboards and public trades
                  </p>
                </div>
                <CustomSwitch
                  checked={profile.anonymous_mode || false}
                  onCheckedChange={(checked) => updateProfile("anonymous_mode", checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label className="text-base">Mentor Mode</Label>
                    <Badge variant="outline" className="text-green-600 border-green-600">Mentor</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Accept student requests and provide feedback on trades
                  </p>
                </div>
                <CustomSwitch
                  checked={profile.is_mentor || false}
                  onCheckedChange={(checked) => updateProfile("is_mentor", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trading Info Tab */}
        <TabsContent value="trading">
          <Card>
            <CardHeader>
              <CardTitle>Trading Information</CardTitle>
              <CardDescription>
                Share your trading style and experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Trading Style</Label>
                  <Select
                    value={profile.trading_style || ""}
                    onValueChange={(v) => updateProfile("trading_style", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your style" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADING_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Experience Level</Label>
                  <Select
                    value={profile.experience_level || ""}
                    onValueChange={(v) => updateProfile("experience_level", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Favorite Instruments</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select the instruments you trade most often
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_FUTURES_INSTRUMENTS.map((instrument) => {
                    const isSelected = profile.favorite_instruments?.includes(instrument.symbol);
                    return (
                      <Badge
                        key={instrument.symbol}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleInstrument(instrument.symbol)}
                      >
                        {instrument.symbol}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}

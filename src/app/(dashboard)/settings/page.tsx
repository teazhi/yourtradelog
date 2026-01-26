"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  User,
  Settings2,
  Palette,
  CreditCard,
  Layers,
  Plus,
  Trash2,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Input,
  Label,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Spinner,
  cn,
  toast,
} from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";
import { createClient } from "@/lib/supabase/client";

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
];

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  timezone: string;
  default_risk_per_trade: number | null;
  daily_loss_limit: number | null;
  weekly_loss_limit: number | null;
  account_size: number | null;
}

interface Account {
  id: string;
  name: string;
  broker: string | null;
  starting_balance: number;
  current_balance: number;
  is_default: boolean;
}

interface Instrument {
  id: string;
  symbol: string;
  name: string;
  tick_size: number;
  tick_value: number;
  is_active: boolean;
}

function ProfileSettings({ profile, onUpdate }: { profile: Profile | null; onUpdate: (p: Partial<Profile>) => void }) {
  const [displayName, setDisplayName] = React.useState(profile?.display_name || "");
  const [timezone, setTimezone] = React.useState(profile?.timezone || "America/New_York");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setTimezone(profile.timezone || "America/New_York");
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from("profiles") as any)
        .update({ display_name: displayName, timezone })
        .eq("id", profile?.id);

      if (error) {
        toast.error("Failed to save profile");
      } else {
        onUpdate({ display_name: displayName, timezone });
        toast.success("Profile saved");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal details and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={profile?.email || ""} disabled className="bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Used for displaying trade times and calendar events</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
      </CardContent>
    </Card>
  );
}

function TradingSettings({ profile, onUpdate }: { profile: Profile | null; onUpdate: (p: Partial<Profile>) => void }) {
  const [riskPercent, setRiskPercent] = React.useState(profile?.default_risk_per_trade || 1);
  const [dailyLimit, setDailyLimit] = React.useState(profile?.daily_loss_limit || 500);
  const [weeklyLimit, setWeeklyLimit] = React.useState(profile?.weekly_loss_limit || 1500);
  const [accountSize, setAccountSize] = React.useState(profile?.account_size || 50000);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setRiskPercent(profile.default_risk_per_trade || 1);
      setDailyLimit(profile.daily_loss_limit || 500);
      setWeeklyLimit(profile.weekly_loss_limit || 1500);
      setAccountSize(profile.account_size || 50000);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase
        .from("profiles") as any)
        .update({
          default_risk_per_trade: riskPercent,
          daily_loss_limit: dailyLimit,
          weekly_loss_limit: weeklyLimit,
          account_size: accountSize,
        })
        .eq("id", profile?.id);

      if (error) {
        toast.error("Failed to save settings");
      } else {
        onUpdate({ default_risk_per_trade: riskPercent, daily_loss_limit: dailyLimit, weekly_loss_limit: weeklyLimit, account_size: accountSize });
        toast.success("Settings saved");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Settings</CardTitle>
        <CardDescription>Configure your default trading parameters and risk limits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Risk Management</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountSize">Account Size ($)</Label>
              <Input id="accountSize" type="number" value={accountSize} onChange={(e) => setAccountSize(Number(e.target.value))} min={0} step={1000} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultRisk">Default Risk Per Trade (%)</Label>
              <Input id="defaultRisk" type="number" value={riskPercent} onChange={(e) => setRiskPercent(Number(e.target.value))} min={0} max={100} step={0.25} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Loss Limit ($)</Label>
              <Input id="dailyLimit" type="number" value={dailyLimit} onChange={(e) => setDailyLimit(Number(e.target.value))} min={0} step={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeklyLimit">Weekly Loss Limit ($)</Label>
              <Input id="weeklyLimit" type="number" value={weeklyLimit} onChange={(e) => setWeeklyLimit(Number(e.target.value))} min={0} step={100} />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
      </CardContent>
    </Card>
  );
}

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize how the app looks and feels</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <Label>Theme</Label>
          <div className="grid grid-cols-3 gap-4">
            <Button variant={theme === "light" ? "default" : "outline"} className="flex flex-col items-center gap-2 h-auto py-4" onClick={() => setTheme("light")}>
              <Sun className="h-5 w-5" /><span>Light</span>
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} className="flex flex-col items-center gap-2 h-auto py-4" onClick={() => setTheme("dark")}>
              <Moon className="h-5 w-5" /><span>Dark</span>
            </Button>
            <Button variant={theme === "system" ? "default" : "outline"} className="flex flex-col items-center gap-2 h-auto py-4" onClick={() => setTheme("system")}>
              <Monitor className="h-5 w-5" /><span>System</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountsSettings({ accounts, onRefresh }: { accounts: Account[]; onRefresh: () => void }) {
  const [newName, setNewName] = React.useState("");
  const [newBroker, setNewBroker] = React.useState("");
  const [newBalance, setNewBalance] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleAdd = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not logged in"); return; }

      const { error } = await (supabase.from("accounts") as any).insert({
        user_id: user.id,
        name: newName,
        broker: newBroker || null,
        starting_balance: parseFloat(newBalance) || 0,
        current_balance: parseFloat(newBalance) || 0,
        is_default: accounts.length === 0,
      });

      if (error) { toast.error("Failed to add account"); return; }
      toast.success("Account added");
      setNewName(""); setNewBroker(""); setNewBalance("");
      setDialogOpen(false);
      onRefresh();
    } catch { toast.error("Failed to add account"); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase.from("accounts") as any).update({ is_default: false }).eq("user_id", user.id);
      await (supabase.from("accounts") as any).update({ is_default: true }).eq("id", id);
      toast.success("Default account updated");
      onRefresh();
    } catch { toast.error("Failed to update default"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("accounts") as any).delete().eq("id", id);
      if (error) { toast.error("Failed to delete account"); return; }
      toast.success("Account deleted");
      onRefresh();
    } catch { toast.error("Failed to delete account"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Trading Accounts</CardTitle>
            <CardDescription>Manage your connected trading accounts</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Account</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Trading Account</DialogTitle>
                <DialogDescription>Add a new trading account to track your performance</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Name</Label>
                  <Input id="accountName" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., Main Trading Account" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="broker">Broker/Platform</Label>
                  <Input id="broker" value={newBroker} onChange={(e) => setNewBroker(e.target.value)} placeholder="e.g., NinjaTrader" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">Starting Balance</Label>
                  <Input id="balance" type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} placeholder="50000" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={!newName}>Add Account</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No accounts yet. Add your first trading account.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{account.name}</p>
                      {account.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{account.broker || "No broker"} - {formatCurrency(account.current_balance)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!account.is_default && (
                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(account.id)}>Set Default</Button>
                  )}
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(account.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InstrumentsSettings({ instruments, onRefresh }: { instruments: Instrument[]; onRefresh: () => void }) {
  const [newSymbol, setNewSymbol] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newTickSize, setNewTickSize] = React.useState("");
  const [newTickValue, setNewTickValue] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleAdd = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Not logged in"); return; }

      const { error } = await (supabase.from("instruments") as any).insert({
        user_id: user.id,
        symbol: newSymbol.toUpperCase(),
        name: newName,
        tick_size: parseFloat(newTickSize) || 0.25,
        tick_value: parseFloat(newTickValue) || 12.5,
        is_active: true,
      });

      if (error) { toast.error("Failed to add instrument"); return; }
      toast.success("Instrument added");
      setNewSymbol(""); setNewName(""); setNewTickSize(""); setNewTickValue("");
      setDialogOpen(false);
      onRefresh();
    } catch { toast.error("Failed to add instrument"); }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("instruments") as any).update({ is_active: !isActive }).eq("id", id);
      if (error) { toast.error("Failed to update"); return; }
      onRefresh();
    } catch { toast.error("Failed to update"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("instruments") as any).delete().eq("id", id);
      if (error) { toast.error("Failed to delete"); return; }
      toast.success("Instrument deleted");
      onRefresh();
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Instruments</CardTitle>
            <CardDescription>Configure the instruments you trade</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Instrument</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Instrument</DialogTitle>
                <DialogDescription>Add a new instrument to trade</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input id="symbol" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} placeholder="e.g., ES" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g., E-mini S&P 500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tickSize">Tick Size</Label>
                    <Input id="tickSize" type="number" value={newTickSize} onChange={(e) => setNewTickSize(e.target.value)} placeholder="0.25" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tickValue">Tick Value ($)</Label>
                    <Input id="tickValue" type="number" value={newTickValue} onChange={(e) => setNewTickValue(e.target.value)} placeholder="12.5" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={!newSymbol || !newName}>Add Instrument</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {instruments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No instruments yet. Add your first instrument.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {instruments.map((instrument) => (
              <div key={instrument.id} className={cn("flex items-center justify-between rounded-lg border p-4", !instrument.is_active && "opacity-60")}>
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{instrument.symbol}</p>
                      {!instrument.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{instrument.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p>Tick: {instrument.tick_size}</p>
                    <p className="text-muted-foreground">Value: {formatCurrency(instrument.tick_value)}</p>
                  </div>
                  <Switch checked={instrument.is_active} onCheckedChange={() => handleToggleActive(instrument.id, instrument.is_active)} />
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(instrument.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [instruments, setInstruments] = React.useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [profileRes, accountsRes, instrumentsRes] = await Promise.all([
        (supabase.from("profiles") as any).select("*").eq("id", user.id).single(),
        (supabase.from("accounts") as any).select("*").eq("user_id", user.id).order("created_at"),
        (supabase.from("instruments") as any).select("*").eq("user_id", user.id).order("symbol"),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (accountsRes.data) setAccounts(accountsRes.data as Account[]);
      if (instrumentsRes.data) setInstruments(instrumentsRes.data as Instrument[]);
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleProfileUpdate = (updates: Partial<Profile>) => {
    if (profile) setProfile({ ...profile, ...updates });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /><span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="trading" className="gap-2">
            <Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Trading</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" /><span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <CreditCard className="h-4 w-4" /><span className="hidden sm:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="instruments" className="gap-2">
            <Layers className="h-4 w-4" /><span className="hidden sm:inline">Instruments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile"><ProfileSettings profile={profile} onUpdate={handleProfileUpdate} /></TabsContent>
        <TabsContent value="trading"><TradingSettings profile={profile} onUpdate={handleProfileUpdate} /></TabsContent>
        <TabsContent value="appearance"><AppearanceSettings /></TabsContent>
        <TabsContent value="accounts"><AccountsSettings accounts={accounts} onRefresh={fetchData} /></TabsContent>
        <TabsContent value="instruments"><InstrumentsSettings instruments={instruments} onRefresh={fetchData} /></TabsContent>
      </Tabs>
    </div>
  );
}

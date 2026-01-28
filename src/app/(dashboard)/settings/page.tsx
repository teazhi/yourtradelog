"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { dispatchProfileUpdate } from "@/components/layout/profile-completion-banner";
import { PROP_FIRMS } from "@/lib/constants";

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
  prop_firm: string | null;
  commission_per_contract: number | null;
  commission_per_trade: number | null;
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

// Navigation sections for the sidebar
const SETTINGS_SECTIONS = [
  { id: "general", label: "General", icon: User, description: "Profile and preferences" },
  { id: "trading", label: "Trading", icon: Settings2, description: "Risk management" },
  { id: "accounts", label: "Accounts", icon: CreditCard, description: "Trading accounts" },
  { id: "instruments", label: "Instruments", icon: Layers, description: "Tradable assets" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Theme settings" },
] as const;

type SectionId = typeof SETTINGS_SECTIONS[number]["id"];

// Sidebar navigation component
function SettingsNav({
  activeSection,
  onSectionChange
}: {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}) {
  return (
    <nav className="space-y-1">
      {SETTINGS_SECTIONS.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;

        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className={cn("font-medium text-sm", isActive && "text-primary-foreground")}>
                {section.label}
              </p>
              <p className={cn(
                "text-xs truncate",
                isActive ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {section.description}
              </p>
            </div>
            <ChevronRight className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              isActive && "rotate-90"
            )} />
          </button>
        );
      })}
    </nav>
  );
}

// Mobile section selector
function MobileSectionSelect({
  activeSection,
  onSectionChange
}: {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}) {
  const currentSection = SETTINGS_SECTIONS.find(s => s.id === activeSection);
  const Icon = currentSection?.icon || User;

  return (
    <Select value={activeSection} onValueChange={(value) => onSectionChange(value as SectionId)}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <SelectValue placeholder="Select section" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {SETTINGS_SECTIONS.map((section) => {
          const SectionIcon = section.icon;
          return (
            <SelectItem key={section.id} value={section.id}>
              <div className="flex items-center gap-2">
                <SectionIcon className="h-4 w-4" />
                <span>{section.label}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Danger Zone Section (only shown in General settings)
function DangerZone() {
  const router = useRouter();
  const [confirmText, setConfirmText] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteAccount = async () => {
    if (confirmText !== "DELETE") return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Not logged in");
        return;
      }

      // Delete all user data in order (due to foreign key constraints)
      await (supabase.from("trade_screenshots") as any).delete().eq("user_id", user.id);
      await (supabase.from("journal_screenshots") as any).delete().eq("user_id", user.id);
      await (supabase.from("daily_journals") as any).delete().eq("user_id", user.id);
      await (supabase.from("trades") as any).delete().eq("user_id", user.id);
      await (supabase.from("accounts") as any).delete().eq("user_id", user.id);
      await (supabase.from("instruments") as any).delete().eq("user_id", user.id);
      await (supabase.from("partner_requests") as any).delete().or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      await (supabase.from("partnerships") as any).delete().or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      await (supabase.from("profiles") as any).delete().eq("id", user.id);

      const { data: files } = await supabase.storage.from("trade-screenshots").list(user.id);
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.id}/${f.name}`);
        await supabase.storage.from("trade-screenshots").remove(filePaths);
      }

      await supabase.auth.signOut();

      toast.success("Account deleted successfully");
      router.push("/");
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account. Please contact support.");
    } finally {
      setIsDeleting(false);
      setDialogOpen(false);
    }
  };

  return (
    <div className="mt-12 pt-8 border-t">
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="mt-4">
                  Delete Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Delete Account
                  </DialogTitle>
                  <DialogDescription>
                    This action is permanent and cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium mb-2">All your data will be permanently deleted:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• All trades and trade history</li>
                      <li>• All journal entries and notes</li>
                      <li>• All screenshots and attachments</li>
                      <li>• Your profile and settings</li>
                      <li>• Partner connections and data</li>
                    </ul>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="confirm">
                      Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                    </Label>
                    <Input
                      id="confirm"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="font-mono"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== "DELETE" || isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Deleting...
                      </>
                    ) : (
                      "Delete My Account"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}

// General Settings Section (Profile + Timezone)
function GeneralSettings({
  profile,
  onUpdate
}: {
  profile: Profile | null;
  onUpdate: (p: Partial<Profile>) => void;
}) {
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
        dispatchProfileUpdate();
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">General Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile information and basic preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Information</CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Regional Settings</CardTitle>
          <CardDescription>Timezone for trade times and calendar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <DangerZone />
    </div>
  );
}

// Trading Settings Section
function TradingSettings({
  profile,
  onUpdate
}: {
  profile: Profile | null;
  onUpdate: (p: Partial<Profile>) => void;
}) {
  const [riskPercent, setRiskPercent] = React.useState(profile?.default_risk_per_trade || 1);
  const [dailyLimit, setDailyLimit] = React.useState(profile?.daily_loss_limit || 500);
  const [weeklyLimit, setWeeklyLimit] = React.useState(profile?.weekly_loss_limit || 1500);
  const [accountSize, setAccountSize] = React.useState(profile?.account_size || 50000);
  const [propFirm, setPropFirm] = React.useState(profile?.prop_firm || "custom");
  const [commissionPerContract, setCommissionPerContract] = React.useState(profile?.commission_per_contract || 0);
  const [commissionPerTrade, setCommissionPerTrade] = React.useState(profile?.commission_per_trade || 0);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (profile) {
      setRiskPercent(profile.default_risk_per_trade || 1);
      setDailyLimit(profile.daily_loss_limit || 500);
      setWeeklyLimit(profile.weekly_loss_limit || 1500);
      setAccountSize(profile.account_size || 50000);
      setPropFirm(profile.prop_firm || "custom");
      setCommissionPerContract(profile.commission_per_contract || 0);
      setCommissionPerTrade(profile.commission_per_trade || 0);
    }
  }, [profile]);

  // Handle prop firm selection - auto-fill commission rates
  const handlePropFirmChange = (firmId: string) => {
    setPropFirm(firmId);
    const selectedFirm = PROP_FIRMS.find(f => f.id === firmId);
    if (selectedFirm && firmId !== "custom") {
      // Set the commission rates from the prop firm
      setCommissionPerContract(selectedFirm.commissionPerContract);
      setCommissionPerTrade(selectedFirm.commissionPerTrade);
    }
  };

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
          prop_firm: propFirm,
          commission_per_contract: commissionPerContract,
          commission_per_trade: commissionPerTrade,
        })
        .eq("id", profile?.id);

      if (error) {
        toast.error("Failed to save settings");
      } else {
        onUpdate({
          default_risk_per_trade: riskPercent,
          daily_loss_limit: dailyLimit,
          weekly_loss_limit: weeklyLimit,
          account_size: accountSize,
          prop_firm: propFirm,
          commission_per_contract: commissionPerContract,
          commission_per_trade: commissionPerTrade,
        });
        toast.success("Settings saved");
        dispatchProfileUpdate();
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Get the current selected prop firm details
  const selectedPropFirm = PROP_FIRMS.find(f => f.id === propFirm);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Trading Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your default trading parameters and risk limits
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Size</CardTitle>
          <CardDescription>Your total trading capital</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="accountSize">Account Size ($)</Label>
            <Input
              id="accountSize"
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
              min={0}
              step={1000}
            />
            <p className="text-xs text-muted-foreground">
              Used to calculate risk percentages
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Risk Management</CardTitle>
          <CardDescription>Set your risk limits to protect your capital</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="defaultRisk">Risk Per Trade (%)</Label>
              <Input
                id="defaultRisk"
                type="number"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                min={0}
                max={100}
                step={0.25}
              />
              <p className="text-xs text-muted-foreground">
                Default: 1-2% recommended
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Loss Limit ($)</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                min={0}
                step={50}
              />
              <p className="text-xs text-muted-foreground">
                Stop trading for the day
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeklyLimit">Weekly Loss Limit ($)</Label>
              <Input
                id="weeklyLimit"
                type="number"
                value={weeklyLimit}
                onChange={(e) => setWeeklyLimit(Number(e.target.value))}
                min={0}
                step={100}
              />
              <p className="text-xs text-muted-foreground">
                Stop trading for the week
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission & Fees</CardTitle>
          <CardDescription>
            Set your default commission structure for accurate P&L calculations on imported trades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prop Firm Selector */}
          <div className="space-y-2">
            <Label htmlFor="propFirm">Prop Firm / Account Type</Label>
            <Select value={propFirm} onValueChange={handlePropFirmChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select your prop firm" />
              </SelectTrigger>
              <SelectContent>
                {PROP_FIRMS.map((firm) => (
                  <SelectItem key={firm.id} value={firm.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span>{firm.name}</span>
                      {firm.id !== "custom" && (
                        <span className="text-xs text-muted-foreground">
                          ${firm.commissionPerContract}/side
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPropFirm && selectedPropFirm.id !== "custom" && (
              <p className="text-xs text-muted-foreground">
                {selectedPropFirm.description}
              </p>
            )}
          </div>

          <Separator />

          {/* Manual Commission Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commissionPerContract">Per Contract / Per Side ($)</Label>
              <Input
                id="commissionPerContract"
                type="number"
                value={commissionPerContract}
                onChange={(e) => {
                  setCommissionPerContract(Number(e.target.value));
                  // Switch to custom if user manually edits
                  if (propFirm !== "custom") setPropFirm("custom");
                }}
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Fee charged per contract per side
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionPerTrade">Per Trade / Per Side ($)</Label>
              <Input
                id="commissionPerTrade"
                type="number"
                value={commissionPerTrade}
                onChange={(e) => {
                  setCommissionPerTrade(Number(e.target.value));
                  // Switch to custom if user manually edits
                  if (propFirm !== "custom") setPropFirm("custom");
                }}
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Flat fee per trade per side
              </p>
            </div>
          </div>

          {/* Example calculation */}
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Example:</strong> For a 2-contract trade, your round-trip fees would be:
              <span className="font-mono text-foreground block mt-1">
                (2 × ${commissionPerContract.toFixed(2)} × 2 sides) + (${commissionPerTrade.toFixed(2)} × 2 sides) = ${((commissionPerContract * 2 * 2) + (commissionPerTrade * 2)).toFixed(2)}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// Appearance Settings Section
function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize how the app looks and feels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme</CardTitle>
          <CardDescription>Select your preferred color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            <button
              onClick={() => setTheme("light")}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                theme === "light" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Sun className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                theme === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                theme === "dark" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Moon className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={cn(
                "flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all",
                theme === "system"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full",
                theme === "system" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Monitor className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">System</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Accounts Settings Section
function AccountsSettings({
  accounts,
  onRefresh
}: {
  accounts: Account[];
  onRefresh: () => void;
}) {
  const [newName, setNewName] = React.useState("");
  const [newBroker, setNewBroker] = React.useState("");
  const [newBalance, setNewBalance] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleAdd = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not logged in");
        return;
      }

      const { error } = await (supabase.from("accounts") as any).insert({
        user_id: user.id,
        name: newName,
        broker: newBroker || null,
        starting_balance: parseFloat(newBalance) || 0,
        current_balance: parseFloat(newBalance) || 0,
        is_default: accounts.length === 0,
      });

      if (error) {
        toast.error("Failed to add account");
        return;
      }
      toast.success("Account added");
      setNewName("");
      setNewBroker("");
      setNewBalance("");
      setDialogOpen(false);
      onRefresh();
    } catch {
      toast.error("Failed to add account");
    }
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
    } catch {
      toast.error("Failed to update default");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("accounts") as any).delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete account");
        return;
      }
      toast.success("Account deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete account");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Trading Accounts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your connected trading accounts and brokers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trading Account</DialogTitle>
              <DialogDescription>
                Add a new trading account to track your performance
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Main Trading Account"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker">Broker/Platform</Label>
                <Input
                  id="broker"
                  value={newBroker}
                  onChange={(e) => setNewBroker(e.target.value)}
                  placeholder="e.g., NinjaTrader"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Starting Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="50000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!newName}>
                Add Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No accounts yet</p>
              <p className="text-sm mt-1">Add your first trading account to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <Card key={account.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{account.name}</p>
                        {account.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {account.broker || "No broker"} · {formatCurrency(account.current_balance)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!account.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Instruments Settings Section
function InstrumentsSettings({
  instruments,
  onRefresh
}: {
  instruments: Instrument[];
  onRefresh: () => void;
}) {
  const [newSymbol, setNewSymbol] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newTickSize, setNewTickSize] = React.useState("");
  const [newTickValue, setNewTickValue] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const handleAdd = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not logged in");
        return;
      }

      const { error } = await (supabase.from("instruments") as any).insert({
        user_id: user.id,
        symbol: newSymbol.toUpperCase(),
        name: newName,
        tick_size: parseFloat(newTickSize) || 0.25,
        tick_value: parseFloat(newTickValue) || 12.5,
        is_active: true,
      });

      if (error) {
        toast.error("Failed to add instrument");
        return;
      }
      toast.success("Instrument added");
      setNewSymbol("");
      setNewName("");
      setNewTickSize("");
      setNewTickValue("");
      setDialogOpen(false);
      onRefresh();
    } catch {
      toast.error("Failed to add instrument");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("instruments") as any)
        .update({ is_active: !isActive })
        .eq("id", id);
      if (error) {
        toast.error("Failed to update");
        return;
      }
      onRefresh();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("instruments") as any).delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete");
        return;
      }
      toast.success("Instrument deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Instruments</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the instruments you trade with tick sizes and values
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Instrument
            </Button>
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
                  <Input
                    id="symbol"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value)}
                    placeholder="e.g., ES"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., E-mini S&P 500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tickSize">Tick Size</Label>
                  <Input
                    id="tickSize"
                    type="number"
                    value={newTickSize}
                    onChange={(e) => setNewTickSize(e.target.value)}
                    placeholder="0.25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tickValue">Tick Value ($)</Label>
                  <Input
                    id="tickValue"
                    type="number"
                    value={newTickValue}
                    onChange={(e) => setNewTickValue(e.target.value)}
                    placeholder="12.5"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAdd} disabled={!newSymbol || !newName}>
                Add Instrument
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {instruments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No instruments yet</p>
              <p className="text-sm mt-1">Add your first instrument to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {instruments.map((instrument) => (
            <Card key={instrument.id} className={cn(!instrument.is_active && "opacity-60")}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{instrument.symbol}</p>
                        {!instrument.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{instrument.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p>Tick: {instrument.tick_size}</p>
                      <p className="text-muted-foreground">
                        Value: {formatCurrency(instrument.tick_value)}
                      </p>
                    </div>
                    <Switch
                      checked={instrument.is_active}
                      onCheckedChange={() => handleToggleActive(instrument.id, instrument.is_active)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(instrument.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Main Settings Page
export default function SettingsPage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [instruments, setInstruments] = React.useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeSection, setActiveSection] = React.useState<SectionId>("general");

  const fetchData = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

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

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // Render the active section content
  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return <GeneralSettings profile={profile} onUpdate={handleProfileUpdate} />;
      case "trading":
        return <TradingSettings profile={profile} onUpdate={handleProfileUpdate} />;
      case "accounts":
        return <AccountsSettings accounts={accounts} onRefresh={fetchData} />;
      case "instruments":
        return <InstrumentsSettings instruments={instruments} onRefresh={fetchData} />;
      case "appearance":
        return <AppearanceSettings />;
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-6xl py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Mobile section selector */}
      <div className="mb-6 lg:hidden">
        <MobileSectionSelect
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>

      {/* Desktop layout with sidebar */}
      <div className="flex gap-8">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6">
            <SettingsNav
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}

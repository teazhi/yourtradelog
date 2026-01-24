"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Archive,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Target,
  Search,
  Trash2,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  cn,
  toast,
} from "@/components/ui";
import { formatCurrency } from "@/lib/calculations/formatters";
import { createClient } from "@/lib/supabase/client";

interface SetupStats {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  avgRMultiple: number;
  totalPnL: number;
}

interface Setup {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  timeframes: string[];
  color: string;
  is_active: boolean;
  created_at: string;
  stats: SetupStats;
}

function SetupCard({
  setup,
  onArchive,
  onRestore,
  onDelete,
}: {
  setup: Setup;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const isProfitable = setup.stats.totalPnL >= 0;
  const isArchived = !setup.is_active;

  return (
    <Card className={cn(isArchived && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{setup.name}</CardTitle>
              {isArchived && (
                <Badge variant="outline" className="text-xs">
                  Archived
                </Badge>
              )}
            </div>
            <CardDescription>{setup.description || "No description"}</CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isArchived ? (
                <DropdownMenuItem onClick={onRestore}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tags */}
        {setup.timeframes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {setup.timeframes.map((tf) => (
              <Badge key={tf} variant="secondary" className="text-xs">
                {tf}
              </Badge>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="font-semibold">{setup.stats.totalTrades}</p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-semibold">
              {setup.stats.totalTrades > 0 ? `${setup.stats.winRate.toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Profit Factor</p>
            <p className="font-semibold">
              {setup.stats.profitFactor > 0 ? setup.stats.profitFactor.toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Avg R</p>
            <p
              className={cn(
                "font-semibold",
                setup.stats.avgRMultiple >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {setup.stats.totalTrades > 0
                ? `${setup.stats.avgRMultiple >= 0 ? "+" : ""}${setup.stats.avgRMultiple.toFixed(2)}R`
                : "—"}
            </p>
          </div>
        </div>

        {/* Total P&L */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border p-3",
            setup.stats.totalTrades === 0
              ? "border-muted"
              : isProfitable
              ? "border-green-500/30 bg-green-500/5"
              : "border-red-500/30 bg-red-500/5"
          )}
        >
          <div className="flex items-center gap-2">
            {setup.stats.totalTrades === 0 ? (
              <Target className="h-4 w-4 text-muted-foreground" />
            ) : isProfitable ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">Total P&L</span>
          </div>
          <span
            className={cn(
              "text-lg font-bold",
              setup.stats.totalTrades === 0
                ? "text-muted-foreground"
                : isProfitable
                ? "text-green-500"
                : "text-red-500"
            )}
          >
            {setup.stats.totalTrades === 0
              ? "—"
              : `${isProfitable ? "+" : ""}${formatCurrency(setup.stats.totalPnL)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AddSetupDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (setup: { name: string; description: string; timeframes: string[]; rules: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [timeframes, setTimeframes] = React.useState("");
  const [rules, setRules] = React.useState("");

  const handleSubmit = () => {
    onAdd({
      name,
      description,
      timeframes: timeframes.split(",").map((s) => s.trim()).filter(Boolean),
      rules,
    });
    setName("");
    setDescription("");
    setTimeframes("");
    setRules("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Setup</DialogTitle>
          <DialogDescription>
            Create a new trading setup template to track your strategies
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Setup Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Opening Range Breakout"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the setup"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeframes">Timeframes (comma separated)</Label>
            <Input
              id="timeframes"
              value={timeframes}
              onChange={(e) => setTimeframes(e.target.value)}
              placeholder="e.g., 5min, 15min, 1hr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rules">Trading Rules</Label>
            <Textarea
              id="rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Enter your setup rules and criteria..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name}>
            Add Setup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SetupsPage() {
  const [setups, setSetups] = React.useState<Setup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setSetups([]);
          setIsLoading(false);
          return;
        }

        const { data: setupsData, error: setupsError } = await supabase
          .from("setups")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (setupsError) {
          console.error("Error fetching setups:", setupsError);
          setSetups([]);
          setIsLoading(false);
          return;
        }

        const { data: tradesData } = await (supabase
          .from("trades") as any)
          .select("setup_id, net_pnl, r_multiple, status")
          .eq("user_id", user.id)
          .eq("status", "closed");

        interface TradeData { setup_id: string | null; net_pnl: number | null; r_multiple: number | null; status: string; }
        const setupsWithStats: Setup[] = (setupsData || []).map((setup: any) => {
          const setupTrades = ((tradesData || []) as TradeData[]).filter((t) => t.setup_id === setup.id);
          const wins = setupTrades.filter((t) => (t.net_pnl || 0) > 0);
          const losses = setupTrades.filter((t) => (t.net_pnl || 0) < 0);
          const grossProfit = wins.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
          const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.net_pnl || 0), 0));
          const totalPnL = setupTrades.reduce((sum, t) => sum + (t.net_pnl || 0), 0);
          const avgR = setupTrades.length > 0
            ? setupTrades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / setupTrades.length
            : 0;

          return {
            id: setup.id,
            name: setup.name,
            description: setup.description,
            rules: setup.rules,
            timeframes: setup.timeframes || [],
            color: setup.color || "#3B82F6",
            is_active: setup.is_active,
            created_at: setup.created_at,
            stats: {
              totalTrades: setupTrades.length,
              winRate: setupTrades.length > 0 ? (wins.length / setupTrades.length) * 100 : 0,
              profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
              avgRMultiple: avgR,
              totalPnL,
            },
          };
        });

        setSetups(setupsWithStats);
      } catch (err) {
        console.error("Exception fetching setups:", err);
        setSetups([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const activeSetups = setups.filter((s) => s.is_active);
  const archivedSetups = setups.filter((s) => !s.is_active);

  const filterSetups = (setupList: Setup[]) => {
    return setupList.filter((setup) => {
      const matchesSearch =
        setup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (setup.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  };

  const handleAddSetup = async (newSetup: { name: string; description: string; timeframes: string[]; rules: string }) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to add a setup");
        return;
      }

      const { data, error } = await (supabase
        .from("setups") as any)
        .insert({
          user_id: user.id,
          name: newSetup.name,
          description: newSetup.description,
          timeframes: newSetup.timeframes,
          rules: newSetup.rules,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding setup:", error);
        toast.error("Failed to add setup");
        return;
      }

      const setupWithStats: Setup = {
        ...data,
        stats: { totalTrades: 0, winRate: 0, profitFactor: 0, avgRMultiple: 0, totalPnL: 0 },
      };

      setSetups([setupWithStats, ...setups]);
      toast.success("Setup added successfully");
    } catch (err) {
      console.error("Exception adding setup:", err);
      toast.error("Failed to add setup");
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("setups") as any).update({ is_active: false }).eq("id", id);
      if (error) { toast.error("Failed to archive setup"); return; }
      setSetups(setups.map((s) => (s.id === id ? { ...s, is_active: false } : s)));
      toast.success("Setup archived");
    } catch { toast.error("Failed to archive setup"); }
  };

  const handleRestore = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("setups") as any).update({ is_active: true }).eq("id", id);
      if (error) { toast.error("Failed to restore setup"); return; }
      setSetups(setups.map((s) => (s.id === id ? { ...s, is_active: true } : s)));
      toast.success("Setup restored");
    } catch { toast.error("Failed to restore setup"); }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("setups") as any).delete().eq("id", id);
      if (error) { toast.error("Failed to delete setup"); return; }
      setSetups(setups.filter((s) => s.id !== id));
      toast.success("Setup deleted");
    } catch { toast.error("Failed to delete setup"); }
  };

  const totalTrades = activeSetups.reduce((sum, s) => sum + s.stats.totalTrades, 0);
  const totalPnL = activeSetups.reduce((sum, s) => sum + s.stats.totalPnL, 0);
  const avgWinRate = activeSetups.length > 0
    ? activeSetups.reduce((sum, s) => sum + s.stats.winRate, 0) / activeSetups.length
    : 0;
  const profitableSetups = activeSetups.filter((s) => s.stats.totalPnL > 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading setups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Setups</h1>
          <p className="text-muted-foreground">Manage your trading setups and track their performance</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Setup
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Setups</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSetups.length}</div>
            <p className="text-xs text-muted-foreground">{profitableSetups} profitable</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrades}</div>
            <p className="text-xs text-muted-foreground">Across all setups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSetups.length > 0 ? `${avgWinRate.toFixed(1)}%` : "—"}</div>
            <p className="text-xs text-muted-foreground">Average across setups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {totalPnL >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalPnL >= 0 ? "text-green-500" : "text-red-500")}>
              {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)}
            </div>
            <p className="text-xs text-muted-foreground">All setup P&L combined</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search setups..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active ({activeSetups.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedSetups.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {filterSetups(activeSetups).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Target className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No setups found</h3>
                <p className="text-muted-foreground">{searchQuery ? "Try adjusting your search" : "Create your first setup to start tracking"}</p>
                {!searchQuery && (
                  <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />Add Setup
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filterSetups(activeSetups).map((setup) => (
                <SetupCard key={setup.id} setup={setup} onArchive={() => handleArchive(setup.id)} onRestore={() => handleRestore(setup.id)} onDelete={() => handleDelete(setup.id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          {filterSetups(archivedSetups).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Archive className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No archived setups</h3>
                <p className="text-muted-foreground">Setups you archive will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filterSetups(archivedSetups).map((setup) => (
                <SetupCard key={setup.id} setup={setup} onArchive={() => handleArchive(setup.id)} onRestore={() => handleRestore(setup.id)} onDelete={() => handleDelete(setup.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddSetupDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdd={handleAddSetup} />
    </div>
  );
}

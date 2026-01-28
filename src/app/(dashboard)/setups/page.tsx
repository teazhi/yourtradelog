"use client";

import * as React from "react";
import {
  Plus,
  Archive,
  MoreHorizontal,
  TrendingUp,
  Target,
  Search,
  Trash2,
  RotateCcw,
  FileText,
  ChevronDown,
  ChevronUp,
  Pencil,
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
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogDescription,
  CustomDialogContent,
  CustomDialogFooter,
} from "@/components/ui/custom-dialog";
import { createClient } from "@/lib/supabase/client";

interface Setup {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  is_active: boolean;
  created_at: string;
  // Stats from database columns
  total_trades: number;
  win_rate: number;
  profit_factor: number;
  avg_r_multiple: number;
}

function SetupCard({
  setup,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  setup: Setup;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isArchived = !setup.is_active;
  const hasStats = setup.total_trades > 0;
  const avgR = setup.avg_r_multiple || 0;
  const rulesLines = setup.rules ? setup.rules.split('\n').filter(line => line.trim()) : [];
  const hasMoreRules = rulesLines.length > 3;

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
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="font-semibold">{setup.total_trades || 0}</p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-semibold">
              {hasStats ? `${(setup.win_rate || 0).toFixed(1)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Profit Factor</p>
            <p className="font-semibold">
              {(setup.profit_factor || 0) > 0 ? (setup.profit_factor || 0).toFixed(2) : "—"}
            </p>
          </div>
          <div className="rounded-lg border p-2 text-center">
            <p className="text-xs text-muted-foreground">Avg R</p>
            <p
              className={cn(
                "font-semibold",
                avgR >= 0 ? "text-green-500" : "text-red-500"
              )}
            >
              {hasStats
                ? `${avgR >= 0 ? "+" : ""}${avgR.toFixed(2)}R`
                : "—"}
            </p>
          </div>
        </div>

        {/* Rules Preview */}
        {setup.rules && (
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Rules
            </p>
            <div className="text-sm space-y-1">
              {(expanded ? rulesLines : rulesLines.slice(0, 3)).map((line, i) => (
                <p key={i} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span className={expanded ? "" : "line-clamp-1"}>{line.trim()}</span>
                </p>
              ))}
            </div>
            {hasMoreRules && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show {rulesLines.length - 3} more rules
                  </>
                )}
              </button>
            )}
          </div>
        )}
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
  onAdd: (setup: { name: string; description: string; rules: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rules, setRules] = React.useState("");

  const handleSubmit = () => {
    onAdd({
      name,
      description,
      rules,
    });
    setName("");
    setDescription("");
    setRules("");
    onOpenChange(false);
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader>
        <CustomDialogTitle>Add New Setup</CustomDialogTitle>
        <CustomDialogDescription>
          Create a new trading setup template to track your strategies
        </CustomDialogDescription>
      </CustomDialogHeader>
      <CustomDialogContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="setup-name">Setup Name</Label>
          <Input
            id="setup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Opening Range Breakout"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-description">Description</Label>
          <Input
            id="setup-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the setup"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-rules">Trading Rules</Label>
          <Textarea
            id="setup-rules"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Enter each rule on a new line, e.g.:
Wait for price above VWAP
Entry on pullback to EMA
Stop loss below swing low"
            rows={5}
          />
          <p className="text-xs text-muted-foreground">Enter each rule on a separate line</p>
        </div>
      </CustomDialogContent>
      <CustomDialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!name}>
          Add Setup
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}

function EditSetupDialog({
  open,
  onOpenChange,
  setup,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setup: Setup | null;
  onSave: (id: string, updates: { name: string; description: string; rules: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [rules, setRules] = React.useState("");

  // Update local state when setup changes
  React.useEffect(() => {
    if (setup) {
      setName(setup.name);
      setDescription(setup.description || "");
      setRules(setup.rules || "");
    }
  }, [setup]);

  const handleSubmit = () => {
    if (!setup) return;
    onSave(setup.id, {
      name,
      description,
      rules,
    });
    onOpenChange(false);
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader>
        <CustomDialogTitle>Edit Setup</CustomDialogTitle>
        <CustomDialogDescription>
          Update your trading setup details
        </CustomDialogDescription>
      </CustomDialogHeader>
      <CustomDialogContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-setup-name">Setup Name</Label>
          <Input
            id="edit-setup-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Opening Range Breakout"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-setup-description">Description</Label>
          <Input
            id="edit-setup-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the setup"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-setup-rules">Trading Rules</Label>
          <Textarea
            id="edit-setup-rules"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Enter each rule on a new line, e.g.:
Wait for price above VWAP
Entry on pullback to EMA
Stop loss below swing low"
            rows={5}
          />
          <p className="text-xs text-muted-foreground">Enter each rule on a separate line</p>
        </div>
      </CustomDialogContent>
      <CustomDialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!name}>
          Save Changes
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}

export default function SetupsPage() {
  const [setups, setSetups] = React.useState<Setup[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingSetup, setEditingSetup] = React.useState<Setup | null>(null);

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

        const { data: setupsData, error: setupsError } = await (supabase
          .from("setups") as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (setupsError) {
          console.error("Error fetching setups:", setupsError);
          setSetups([]);
          setIsLoading(false);
          return;
        }

        // Map directly from database - stats are already in the table
        setSetups((setupsData || []) as Setup[]);
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

  const handleAddSetup = async (newSetup: { name: string; description: string; rules: string }) => {
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
          description: newSetup.description || null,
          rules: newSetup.rules || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding setup:", error);
        toast.error(`Failed to add setup: ${error.message || 'Unknown error'}`);
        return;
      }

      setSetups([data as Setup, ...setups]);
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

  const handleEdit = (setup: Setup) => {
    setEditingSetup(setup);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async (id: string, updates: { name: string; description: string; rules: string }) => {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("setups") as any)
        .update({
          name: updates.name,
          description: updates.description || null,
          rules: updates.rules || null,
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to update setup");
        return;
      }

      setSetups(setups.map((s) =>
        s.id === id
          ? { ...s, name: updates.name, description: updates.description || null, rules: updates.rules || null }
          : s
      ));
      toast.success("Setup updated");
    } catch {
      toast.error("Failed to update setup");
    }
  };

  const totalTrades = activeSetups.reduce((sum, s) => sum + (s.total_trades || 0), 0);
  const avgWinRate = activeSetups.length > 0
    ? activeSetups.reduce((sum, s) => sum + (s.win_rate || 0), 0) / activeSetups.length
    : 0;
  const avgProfitFactor = activeSetups.length > 0
    ? activeSetups.reduce((sum, s) => sum + (s.profit_factor || 0), 0) / activeSetups.length
    : 0;

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
    <div className="container max-w-6xl py-6 px-4 sm:px-6 space-y-6">
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
            <p className="text-xs text-muted-foreground">{archivedSetups.length} archived</p>
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
            <CardTitle className="text-sm font-medium">Avg Profit Factor</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgProfitFactor > 0 ? avgProfitFactor.toFixed(2) : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Average across setups</p>
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
                <SetupCard key={setup.id} setup={setup} onEdit={() => handleEdit(setup)} onArchive={() => handleArchive(setup.id)} onRestore={() => handleRestore(setup.id)} onDelete={() => handleDelete(setup.id)} />
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
                <SetupCard key={setup.id} setup={setup} onEdit={() => handleEdit(setup)} onArchive={() => handleArchive(setup.id)} onRestore={() => handleRestore(setup.id)} onDelete={() => handleDelete(setup.id)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddSetupDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onAdd={handleAddSetup} />
      <EditSetupDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} setup={editingSetup} onSave={handleSaveEdit} />
    </div>
  );
}

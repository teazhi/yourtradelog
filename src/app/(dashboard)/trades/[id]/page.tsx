"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  AlertTriangle,
  FileQuestion,
  Save,
  X,
  CalendarIcon,
  Share2,
  Globe,
  Users,
  Lock,
  Eye,
} from "lucide-react";
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Spinner,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ToggleGroup,
  ToggleGroupItem,
  Calendar as CalendarComponent,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
  toast,
  Label,
} from "@/components/ui";
import { Trade } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { TradeScreenshots } from "@/components/trades/trade-screenshots";
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatRMultiple,
  formatDuration,
} from "@/lib/calculations/formatters";
import {
  EMOTION_LABELS,
  SESSION_LABELS,
  MISTAKE_LABELS,
  ALL_EMOTIONS,
  ALL_MISTAKES,
  DEFAULT_FUTURES_INSTRUMENTS,
} from "@/lib/constants";
import { EmotionTag, Session, MistakeTag } from "@/types/trade";

// Editable field wrapper
function EditableField({
  label,
  value,
  isEditing,
  children,
}: {
  label: string;
  value: React.ReactNode;
  isEditing: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      {isEditing ? children : <p className="font-medium">{value || "-"}</p>}
    </div>
  );
}

// Star rating component (editable)
function StarRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
}) {
  const [hovered, setHovered] = React.useState<number | null>(null);

  if (disabled || !onChange) {
    if (!value) return <span className="text-muted-foreground">-</span>;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-0.5 transition-colors"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={cn(
              "h-5 w-5 transition-colors",
              (hovered !== null ? star <= hovered : star <= (value || 0))
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
      {value && (
        <button
          type="button"
          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          Clear
        </button>
      )}
    </div>
  );
}

// Tag selector for emotions/mistakes
function TagSelector({
  options,
  labels,
  selected,
  onChange,
  variant = "default",
}: {
  options: string[];
  labels: Record<string, string>;
  selected: string[];
  onChange: (selected: string[]) => void;
  variant?: "default" | "warning";
}) {
  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Badge
            key={option}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              isSelected && variant === "warning" && "bg-orange-500 border-orange-500",
              !isSelected && variant === "warning" && "text-orange-600 border-orange-300 hover:bg-orange-50"
            )}
            onClick={() => toggle(option)}
          >
            {labels[option] || option}
          </Badge>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "profit" | "loss";
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-semibold",
          variant === "profit" && "text-green-600 dark:text-green-400",
          variant === "loss" && "text-red-600 dark:text-red-400"
        )}
      >
        {value}
      </div>
      {subValue && (
        <div className="text-sm text-muted-foreground">{subValue}</div>
      )}
    </div>
  );
}

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trade, setTrade] = React.useState<Trade | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(searchParams.get("edit") === "true");
  const [isSaving, setIsSaving] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [isSharing, setIsSharing] = React.useState(false);
  const [shareAnalysis, setShareAnalysis] = React.useState("");
  const [shareVisibility, setShareVisibility] = React.useState<"public" | "followers" | "squad">("public");

  // Edit state
  const [editData, setEditData] = React.useState<Partial<Trade>>({});

  // Fetch the trade from Supabase
  React.useEffect(() => {
    async function fetchTrade() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setTrade(null);
          setIsLoading(false);
          return;
        }

        const tradeId = params.id as string;
        const { data, error } = await supabase
          .from("trades")
          .select("*")
          .eq("id", tradeId)
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching trade:", error);
          setTrade(null);
        } else {
          setTrade(data);
          setEditData(data);
        }
      } catch (err) {
        console.error("Exception fetching trade:", err);
        setTrade(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (params.id) {
      fetchTrade();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!trade) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", trade.id);

      if (error) {
        console.error("Error deleting trade:", error);
        toast.error("Failed to delete trade");
      } else {
        toast.success("Trade deleted successfully");
        router.push("/trades");
      }
    } catch (err) {
      console.error("Exception deleting trade:", err);
      toast.error("Failed to delete trade");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!trade) return;

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Calculate P&L if we have entry and exit prices
      let grossPnl = editData.gross_pnl;
      let netPnl = editData.net_pnl;
      let rMultiple = editData.r_multiple;

      if (editData.exit_price && editData.entry_price && editData.entry_contracts) {
        const priceDiff = editData.side === "long"
          ? editData.exit_price - editData.entry_price
          : editData.entry_price - editData.exit_price;

        const tickValue = 12.50;
        const tickSize = 0.25;
        const ticks = priceDiff / tickSize;
        grossPnl = ticks * tickValue * editData.entry_contracts;

        const totalFees = (editData.commission || 0) + (editData.fees || 0);
        netPnl = grossPnl - totalFees;

        if (editData.stop_loss && editData.entry_price) {
          const stopDistance = Math.abs(editData.entry_price - editData.stop_loss);
          const stopTicks = stopDistance / tickSize;
          const riskAmount = stopTicks * tickValue * editData.entry_contracts;
          if (riskAmount > 0) {
            rMultiple = netPnl / riskAmount;
          }
        }
      }

      const updateData = {
        symbol: editData.symbol,
        side: editData.side,
        entry_date: editData.entry_date,
        entry_price: editData.entry_price,
        entry_contracts: editData.entry_contracts,
        exit_date: editData.exit_date,
        exit_price: editData.exit_price,
        exit_contracts: editData.exit_contracts,
        stop_loss: editData.stop_loss,
        take_profit: editData.take_profit,
        gross_pnl: grossPnl,
        commission: editData.commission || 0,
        fees: editData.fees || 0,
        net_pnl: netPnl,
        r_multiple: rMultiple,
        setup_id: editData.setup_id,
        session: editData.session,
        emotions: editData.emotions || [],
        mistakes: editData.mistakes || [],
        entry_rating: editData.entry_rating,
        exit_rating: editData.exit_rating,
        management_rating: editData.management_rating,
        notes: editData.notes,
        lessons: editData.lessons,
        status: editData.exit_price ? "closed" : "open",
        updated_at: new Date().toISOString(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase
        .from("trades") as any)
        .update(updateData)
        .eq("id", trade.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating trade:", error);
        toast.error("Failed to save changes");
      } else {
        setTrade(data);
        setEditData(data);
        setIsEditing(false);
        toast.success("Changes saved");
      }
    } catch (err) {
      console.error("Exception updating trade:", err);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData(trade || {});
    setIsEditing(false);
  };

  const handleShareToFeed = async () => {
    if (!trade) return;

    setIsSharing(true);
    try {
      const supabase = createClient();

      const { error } = await (supabase
        .from("trades") as any)
        .update({
          visibility: shareVisibility,
          shared_to_feed: true,
          share_analysis: shareAnalysis || null,
        })
        .eq("id", trade.id);

      if (error) {
        console.error("Error sharing trade:", error);
        toast.error("Failed to share trade");
      } else {
        toast.success("Trade shared to feed!");
        setIsShareOpen(false);
        setShareAnalysis("");
        // Update local trade state
        setTrade(prev => prev ? {
          ...prev,
          visibility: shareVisibility,
          shared_to_feed: true,
          share_analysis: shareAnalysis || null,
        } as Trade : null);
      }
    } catch (err) {
      console.error("Exception sharing trade:", err);
      toast.error("Failed to share trade");
    } finally {
      setIsSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!trade) return;

    try {
      const supabase = createClient();

      const { error } = await (supabase
        .from("trades") as any)
        .update({
          visibility: "private",
          shared_to_feed: false,
          share_analysis: null,
        })
        .eq("id", trade.id);

      if (error) {
        console.error("Error unsharing trade:", error);
        toast.error("Failed to unshare trade");
      } else {
        toast.success("Trade removed from feed");
        setTrade(prev => prev ? {
          ...prev,
          visibility: "private",
          shared_to_feed: false,
          share_analysis: null,
        } as Trade : null);
      }
    } catch (err) {
      console.error("Exception unsharing trade:", err);
      toast.error("Failed to unshare trade");
    }
  };

  const updateField = (field: keyof Trade, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading trade details...</p>
        </div>
      </div>
    );
  }

  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Trade not found</h2>
        <p className="text-muted-foreground mt-2">
          The trade you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild className="mt-4">
          <Link href="/trades">Back to trades</Link>
        </Button>
      </div>
    );
  }

  const displayData = isEditing ? editData : trade;
  const isWin = trade.net_pnl !== null && trade.net_pnl > 0;
  const isLoss = trade.net_pnl !== null && trade.net_pnl < 0;
  const isOpen = trade.status === "open";

  const holdDuration =
    trade.exit_date && trade.entry_date
      ? new Date(trade.exit_date).getTime() - new Date(trade.entry_date).getTime()
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/trades">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to trades</span>
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full",
                  trade.side === "long"
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                )}
              >
                {trade.side === "long" ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {trade.symbol}{" "}
                  <span className="capitalize text-muted-foreground font-normal">
                    {trade.side}
                  </span>
                </h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {formatDate(trade.entry_date, "long")}
                  {trade.session && (
                    <>
                      <span className="text-muted-foreground/50">|</span>
                      {SESSION_LABELS[trade.session as Session]}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          {isOpen ? (
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
            >
              Open
            </Badge>
          ) : (
            <Badge variant={isWin ? "default" : isLoss ? "destructive" : "secondary"}>
              {isWin ? "Winner" : isLoss ? "Loser" : "Break Even"}
            </Badge>
          )}

          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <>
              {/* Share Button */}
              {(trade as any).shared_to_feed ? (
                <Button variant="outline" size="sm" onClick={handleUnshare}>
                  <Eye className="mr-2 h-4 w-4" />
                  Shared
                </Button>
              ) : (
                <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Share to Feed</DialogTitle>
                      <DialogDescription>
                        Share this trade with the community. Add your analysis to help others learn.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Visibility</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={shareVisibility === "public" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShareVisibility("public")}
                          >
                            <Globe className="mr-2 h-4 w-4" />
                            Public
                          </Button>
                          <Button
                            type="button"
                            variant={shareVisibility === "followers" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShareVisibility("followers")}
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Followers
                          </Button>
                          <Button
                            type="button"
                            variant={shareVisibility === "squad" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShareVisibility("squad")}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Squad Only
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Your Analysis (optional)</Label>
                        <Textarea
                          placeholder="Share your thought process, what you learned, or tips for others..."
                          value={shareAnalysis}
                          onChange={(e) => setShareAnalysis(e.target.value)}
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsShareOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleShareToFeed} disabled={isSharing}>
                        {isSharing ? (
                          <Spinner className="mr-2 h-4 w-4" />
                        ) : (
                          <Share2 className="mr-2 h-4 w-4" />
                        )}
                        Share to Feed
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete this
                      trade from your journal.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Key Stats - Always visible */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <StatCard
              label="Net P&L"
              value={
                trade.net_pnl !== null
                  ? `${trade.net_pnl > 0 ? "+" : ""}${formatCurrency(trade.net_pnl)}`
                  : "-"
              }
              subValue={
                trade.gross_pnl !== null
                  ? `Gross: ${formatCurrency(trade.gross_pnl)}`
                  : undefined
              }
              icon={trade.net_pnl && trade.net_pnl > 0 ? TrendingUp : TrendingDown}
              variant={
                trade.net_pnl === null
                  ? "default"
                  : trade.net_pnl > 0
                  ? "profit"
                  : trade.net_pnl < 0
                  ? "loss"
                  : "default"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <StatCard
              label="R-Multiple"
              value={trade.r_multiple !== null ? formatRMultiple(trade.r_multiple) : "-"}
              subValue={trade.planned_risk ? `Risk: ${formatCurrency(trade.planned_risk)}` : undefined}
              variant={
                trade.r_multiple === null
                  ? "default"
                  : trade.r_multiple > 0
                  ? "profit"
                  : trade.r_multiple < 0
                  ? "loss"
                  : "default"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <StatCard
              label="Position Size"
              value={`${trade.entry_contracts || 1} contract${(trade.entry_contracts || 1) !== 1 ? "s" : ""}`}
              subValue={trade.setup_id ? `Setup: ${trade.setup_id}` : undefined}
              icon={Target}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <StatCard
              label="Hold Time"
              value={holdDuration ? formatDuration(holdDuration) : "-"}
              subValue={trade.exit_date ? `Exit: ${formatTime(trade.exit_date, false)}` : "Still open"}
              icon={Clock}
            />
          </CardContent>
        </Card>
      </div>

      {/* Trade Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Entry & Exit */}
        <Card>
          <CardHeader>
            <CardTitle>Trade Execution</CardTitle>
            <CardDescription>Entry and exit details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Symbol & Side (only in edit mode) */}
            {isEditing && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Symbol</p>
                    <Select
                      value={editData.symbol}
                      onValueChange={(v) => updateField("symbol", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEFAULT_FUTURES_INSTRUMENTS.map((i) => (
                          <SelectItem key={i.symbol} value={i.symbol}>
                            {i.symbol} - {i.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Side</p>
                    <ToggleGroup
                      type="single"
                      value={editData.side}
                      onValueChange={(v) => v && updateField("side", v)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="long" className="data-[state=on]:bg-green-100 data-[state=on]:text-green-700">
                        <ArrowUpRight className="mr-1 h-4 w-4" /> Long
                      </ToggleGroupItem>
                      <ToggleGroupItem value="short" className="data-[state=on]:bg-red-100 data-[state=on]:text-red-700">
                        <ArrowDownRight className="mr-1 h-4 w-4" /> Short
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Entry */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Entry</h4>
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="Price"
                  value={trade.entry_price ? formatCurrency(trade.entry_price) : "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.entry_price || ""}
                    onChange={(e) => updateField("entry_price", parseFloat(e.target.value) || 0)}
                  />
                </EditableField>

                <EditableField
                  label="Date & Time"
                  value={`${formatDate(trade.entry_date, "short")} at ${formatTime(trade.entry_date, false)}`}
                  isEditing={isEditing}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editData.entry_date ? format(new Date(editData.entry_date), "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={editData.entry_date ? new Date(editData.entry_date) : undefined}
                        onSelect={(d) => d && updateField("entry_date", d.toISOString())}
                      />
                    </PopoverContent>
                  </Popover>
                </EditableField>

                <EditableField
                  label="Contracts"
                  value={trade.entry_contracts?.toString() || "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    min="1"
                    value={editData.entry_contracts || ""}
                    onChange={(e) => updateField("entry_contracts", parseInt(e.target.value) || 1)}
                  />
                </EditableField>
              </div>
            </div>

            <Separator />

            {/* Exit */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Exit</h4>
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="Price"
                  value={trade.exit_price ? formatCurrency(trade.exit_price) : "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.exit_price || ""}
                    onChange={(e) => updateField("exit_price", parseFloat(e.target.value) || null)}
                    placeholder="Still open"
                  />
                </EditableField>

                <EditableField
                  label="Date & Time"
                  value={trade.exit_date ? `${formatDate(trade.exit_date, "short")} at ${formatTime(trade.exit_date, false)}` : "Still open"}
                  isEditing={isEditing}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editData.exit_date ? format(new Date(editData.exit_date), "PPP") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={editData.exit_date ? new Date(editData.exit_date) : undefined}
                        onSelect={(d) => updateField("exit_date", d?.toISOString() || null)}
                      />
                    </PopoverContent>
                  </Popover>
                </EditableField>
              </div>
            </div>

            <Separator />

            {/* Risk Management */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Risk Management</h4>
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="Stop Loss"
                  value={trade.stop_loss ? formatCurrency(trade.stop_loss) : "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.stop_loss || ""}
                    onChange={(e) => updateField("stop_loss", parseFloat(e.target.value) || null)}
                  />
                </EditableField>

                <EditableField
                  label="Take Profit"
                  value={trade.take_profit ? formatCurrency(trade.take_profit) : "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.take_profit || ""}
                    onChange={(e) => updateField("take_profit", parseFloat(e.target.value) || null)}
                  />
                </EditableField>
              </div>
            </div>

            <Separator />

            {/* Costs */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Costs</h4>
              <div className="grid grid-cols-2 gap-4">
                <EditableField
                  label="Commission"
                  value={trade.commission ? formatCurrency(trade.commission) : "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.commission || ""}
                    onChange={(e) => updateField("commission", parseFloat(e.target.value) || 0)}
                  />
                </EditableField>

                <EditableField
                  label="Fees"
                  value={trade.fees ? formatCurrency(trade.fees) : "-"}
                  isEditing={isEditing}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={editData.fees || ""}
                    onChange={(e) => updateField("fees", parseFloat(e.target.value) || 0)}
                  />
                </EditableField>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality & Psychology */}
        <Card>
          <CardHeader>
            <CardTitle>Quality & Psychology</CardTitle>
            <CardDescription>Execution ratings and emotional state</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Session & Setup */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Session</p>
                {isEditing ? (
                  <Select
                    value={editData.session || ""}
                    onValueChange={(v) => updateField("session", v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SESSION_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">
                    {trade.session ? SESSION_LABELS[trade.session as Session] : "-"}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Setup</p>
                {isEditing ? (
                  <Input
                    placeholder="e.g., Breakout, Reversal"
                    value={editData.setup_id || ""}
                    onChange={(e) => updateField("setup_id", e.target.value || null)}
                  />
                ) : (
                  <p className="font-medium">{trade.setup_id || "-"}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Ratings */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Quality Ratings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Entry Quality</span>
                  <StarRating
                    value={displayData.entry_rating ?? null}
                    onChange={isEditing ? (v) => updateField("entry_rating", v) : undefined}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Exit Quality</span>
                  <StarRating
                    value={displayData.exit_rating ?? null}
                    onChange={isEditing ? (v) => updateField("exit_rating", v) : undefined}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Trade Management</span>
                  <StarRating
                    value={displayData.management_rating ?? null}
                    onChange={isEditing ? (v) => updateField("management_rating", v) : undefined}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Emotions */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Emotions During Trade</h4>
              {isEditing ? (
                <TagSelector
                  options={ALL_EMOTIONS}
                  labels={EMOTION_LABELS}
                  selected={editData.emotions || []}
                  onChange={(v) => updateField("emotions", v)}
                />
              ) : trade.emotions && trade.emotions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trade.emotions.map((emotion) => (
                    <Badge key={emotion} variant="secondary">
                      {EMOTION_LABELS[emotion as EmotionTag] || emotion}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No emotions recorded</p>
              )}
            </div>

            <Separator />

            {/* Mistakes */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Mistakes Identified
              </h4>
              {isEditing ? (
                <TagSelector
                  options={ALL_MISTAKES}
                  labels={MISTAKE_LABELS}
                  selected={editData.mistakes || []}
                  onChange={(v) => updateField("mistakes", v)}
                  variant="warning"
                />
              ) : trade.mistakes && trade.mistakes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trade.mistakes.map((mistake) => (
                    <Badge key={mistake} variant="outline" className="text-orange-600 border-orange-300">
                      {MISTAKE_LABELS[mistake as MistakeTag] || mistake}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">No mistakes identified</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes & Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notes & Lessons
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Trade Notes</h4>
            {isEditing ? (
              <Textarea
                placeholder="What happened during this trade? What was your thought process?"
                className="min-h-[100px]"
                value={editData.notes || ""}
                onChange={(e) => updateField("notes", e.target.value || null)}
              />
            ) : trade.notes ? (
              <p className="whitespace-pre-wrap">{trade.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes recorded</p>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Lessons Learned</h4>
            {isEditing ? (
              <Textarea
                placeholder="What did you learn from this trade? What would you do differently?"
                className="min-h-[100px]"
                value={editData.lessons || ""}
                onChange={(e) => updateField("lessons", e.target.value || null)}
              />
            ) : trade.lessons ? (
              <p className="whitespace-pre-wrap">{trade.lessons}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No lessons recorded</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Screenshots */}
      <TradeScreenshots tradeId={trade.id} />
    </div>
  );
}

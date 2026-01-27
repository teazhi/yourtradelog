"use client";

import * as React from "react";
import {
  Image as ImageIcon,
  Loader2,
  X,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Trade, TradeScreenshot } from "@/types/database";
import Link from "next/link";

interface JournalScreenshotsProps {
  date: string; // YYYY-MM-DD format
  refreshKey?: number; // Increment to trigger refresh
}

interface TradeWithScreenshots extends Trade {
  screenshots: TradeScreenshot[];
}

const SCREENSHOT_TYPES = [
  { value: "pre-market", label: "Pre-Market" },
  { value: "entry", label: "Entry" },
  { value: "runner", label: "Runner" },
  { value: "exit", label: "Exit" },
  { value: "post-trade", label: "Post-Trade" },
  { value: "htf", label: "HTF Context" },
  { value: "ltf", label: "LTF Context" },
  { value: "orderflow", label: "Order Flow" },
  { value: "dom", label: "DOM" },
  { value: "other", label: "Other" },
] as const;

export function JournalScreenshots({ date, refreshKey = 0 }: JournalScreenshotsProps) {
  const [tradesWithScreenshots, setTradesWithScreenshots] = React.useState<TradeWithScreenshots[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");

  // Inline type editing state
  const [editingTagId, setEditingTagId] = React.useState<string | null>(null);

  // Fetch trades and their screenshots for the date
  // Re-fetch when refreshKey changes (triggered when screenshots are linked)
  React.useEffect(() => {
    async function fetchTradesAndScreenshots() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Fetch trades for the selected date
        // We need to match trades where entry_date starts with the date
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59.999`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: trades, error: tradesError } = await (supabase
          .from("trades") as any)
          .select("*")
          .eq("user_id", user.id)
          .gte("entry_date", startOfDay)
          .lte("entry_date", endOfDay)
          .order("entry_date", { ascending: true });

        if (tradesError) {
          console.error("Error fetching trades:", tradesError);
          setIsLoading(false);
          return;
        }

        if (!trades || trades.length === 0) {
          setTradesWithScreenshots([]);
          setIsLoading(false);
          return;
        }

        // Fetch screenshots for all trades
        const tradeIds = trades.map((t: Trade) => t.id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: screenshots, error: screenshotsError } = await (supabase
          .from("trade_screenshots") as any)
          .select("*")
          .eq("user_id", user.id)
          .in("trade_id", tradeIds)
          .order("created_at", { ascending: true });

        if (screenshotsError) {
          console.error("Error fetching screenshots:", screenshotsError);
        }

        // Group screenshots by trade
        const screenshotsByTrade = new Map<string, TradeScreenshot[]>();
        (screenshots || []).forEach((s: TradeScreenshot) => {
          const existing = screenshotsByTrade.get(s.trade_id) || [];
          existing.push(s);
          screenshotsByTrade.set(s.trade_id, existing);
        });

        // Combine trades with their screenshots
        const combined: TradeWithScreenshots[] = trades.map((trade: Trade) => ({
          ...trade,
          screenshots: screenshotsByTrade.get(trade.id) || [],
        }));

        setTradesWithScreenshots(combined);
      } catch (err) {
        console.error("Exception fetching trades and screenshots:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTradesAndScreenshots();
  }, [date, refreshKey]);

  // Get image URL
  const getImageUrl = (screenshot: TradeScreenshot) => {
    const supabase = createClient();
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("trade-screenshots")
      .getPublicUrl(screenshot.file_path);
    return publicUrl;
  };

  // Open preview
  const openPreview = (screenshot: TradeScreenshot, tradeName: string) => {
    const url = getImageUrl(screenshot);
    setPreviewImage(url);
    const typeLabel = SCREENSHOT_TYPES.find(t => t.value === screenshot.screenshot_type)?.label || screenshot.screenshot_type;
    setPreviewTitle(`${tradeName} - ${typeLabel}`);
  };

  // Handle inline type change
  const handleTypeChange = async (screenshot: TradeScreenshot, newType: string) => {
    try {
      const supabase = createClient();

      const { error } = await (supabase
        .from("trade_screenshots") as any)
        .update({ screenshot_type: newType })
        .eq("id", screenshot.id);

      if (error) throw error;

      // Update local state
      setTradesWithScreenshots(trades =>
        trades.map(trade => ({
          ...trade,
          screenshots: trade.screenshots.map(s =>
            s.id === screenshot.id
              ? { ...s, screenshot_type: newType }
              : s
          ),
        }))
      );

      setEditingTagId(null);
      toast.success("Type updated");
    } catch (error) {
      console.error("Error updating screenshot type:", error);
      toast.error("Failed to update type");
    }
  };

  // Delete screenshot
  const handleDelete = async (screenshot: TradeScreenshot) => {
    try {
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("trade-screenshots")
        .remove([screenshot.file_path]);

      if (storageError) {
        console.error("Error deleting from storage:", storageError);
      }

      // Delete from database
      const { error: dbError } = await (supabase
        .from("trade_screenshots") as any)
        .delete()
        .eq("id", screenshot.id);

      if (dbError) throw dbError;

      // Update local state
      setTradesWithScreenshots(trades =>
        trades.map(trade => ({
          ...trade,
          screenshots: trade.screenshots.filter(s => s.id !== screenshot.id),
        }))
      );

      toast.success("Screenshot deleted");
    } catch (error) {
      console.error("Error deleting screenshot:", error);
      toast.error("Failed to delete screenshot");
    }
  };

  // Format trade name
  const getTradeLabel = (trade: Trade, index: number) => {
    const pnl = trade.net_pnl ?? trade.gross_pnl ?? 0;
    const pnlFormatted = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
    return `Trade ${index + 1}: ${trade.symbol} ${trade.side.charAt(0).toUpperCase() + trade.side.slice(1)} ${pnlFormatted}`;
  };

  // Count total screenshots
  const totalScreenshots = tradesWithScreenshots.reduce(
    (sum, t) => sum + t.screenshots.length,
    0
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Trade Screenshots
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Trade Screenshots
          </CardTitle>
          <CardDescription>
            {tradesWithScreenshots.length === 0
              ? "No trades for this day"
              : `${totalScreenshots} screenshot${totalScreenshots !== 1 ? "s" : ""} from ${tradesWithScreenshots.length} trade${tradesWithScreenshots.length !== 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tradesWithScreenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No trades found for this day
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Screenshots will appear here when you have trades with uploaded images
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {tradesWithScreenshots.map((trade, index) => {
                const pnl = trade.net_pnl ?? trade.gross_pnl ?? 0;
                const isProfit = pnl >= 0;

                return (
                  <div key={trade.id} className="space-y-3">
                    {/* Trade Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full",
                          isProfit ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {isProfit ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">
                            Trade {index + 1}: {trade.symbol}{" "}
                            <Badge variant="outline" className="ml-1 text-xs">
                              {trade.side.charAt(0).toUpperCase() + trade.side.slice(1)}
                            </Badge>
                          </h4>
                          <p className={cn(
                            "text-sm font-medium",
                            isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {isProfit ? "+" : "-"}${Math.abs(pnl).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <Link href={`/trades/${trade.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ExternalLink className="h-3 w-3" />
                          View Trade
                        </Button>
                      </Link>
                    </div>

                    {/* Screenshots Grid */}
                    {trade.screenshots.length === 0 ? (
                      <div className="flex items-center justify-center py-6 text-center bg-muted/30 rounded-lg border border-dashed">
                        <p className="text-sm text-muted-foreground">
                          No screenshots uploaded for this trade
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {trade.screenshots.map((screenshot) => (
                          <div
                            key={screenshot.id}
                            className="group relative aspect-video rounded-lg border bg-muted overflow-hidden"
                          >
                            {/* Image - clickable for preview */}
                            <div
                              className="absolute inset-0 cursor-pointer"
                              onClick={() => openPreview(screenshot, `Trade ${index + 1}: ${trade.symbol}`)}
                            >
                              <img
                                src={getImageUrl(screenshot)}
                                alt={screenshot.file_name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            </div>

                            {/* Overlay on hover with delete button */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 pointer-events-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(screenshot);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Type badge - clickable to edit */}
                            {editingTagId === screenshot.id ? (
                              <div
                                className="absolute top-2 left-2 z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <select
                                  value={screenshot.screenshot_type}
                                  onChange={(e) => handleTypeChange(screenshot, e.target.value)}
                                  onBlur={() => setEditingTagId(null)}
                                  autoFocus
                                  className="h-7 px-2 text-xs rounded-md border border-input bg-background font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                  {SCREENSHOT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                      {type.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="absolute top-2 left-2 text-xs px-2 py-0.5 font-medium cursor-pointer hover:bg-secondary/80 pointer-events-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTagId(screenshot.id);
                                }}
                              >
                                {SCREENSHOT_TYPES.find(t => t.value === screenshot.screenshot_type)?.label || screenshot.screenshot_type}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Separator between trades */}
                    {index < tradesWithScreenshots.length - 1 && (
                      <div className="border-b pt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-background rounded-lg p-4 max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{previewTitle}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto">
              <img
                src={previewImage}
                alt={previewTitle}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

    </>
  );
}

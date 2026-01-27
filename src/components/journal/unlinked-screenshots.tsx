"use client";

import * as React from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
  ZoomIn,
  Link2,
  Check,
  Clock,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { Trade } from "@/types/database";
import { compressImage } from "@/lib/image-compression";

// Unlinked screenshot stored in journal_screenshots with trade_id = null
interface UnlinkedScreenshot {
  id: string;
  user_id: string;
  date: string;
  screenshot_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  caption: string | null;
  trade_id: string | null;
  created_at: string;
}

interface UnlinkedScreenshotsProps {
  date: string; // YYYY-MM-DD format
  onScreenshotLinked?: () => void; // Callback when a screenshot is linked to a trade
}

const SCREENSHOT_TYPES = [
  { value: "entry", label: "Entry" },
  { value: "runner", label: "Runner" },
  { value: "exit", label: "Exit" },
  { value: "htf", label: "HTF Context" },
  { value: "ltf", label: "LTF Context" },
  { value: "orderflow", label: "Order Flow" },
  { value: "dom", label: "DOM" },
  { value: "other", label: "Other" },
] as const;

export function UnlinkedScreenshots({ date, onScreenshotLinked }: UnlinkedScreenshotsProps) {
  const [screenshots, setScreenshots] = React.useState<UnlinkedScreenshot[]>([]);
  const [trades, setTrades] = React.useState<Trade[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>("");
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = React.useState<UnlinkedScreenshot | null>(null);
  const [selectedTradeId, setSelectedTradeId] = React.useState<string>("");
  const [selectedType, setSelectedType] = React.useState<string>("entry");
  const [isLinking, setIsLinking] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch unlinked screenshots and trades for this date
  React.useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Fetch unlinked screenshots (screenshot_type = 'unlinked' or trade_id is null with type 'pending_link')
        const { data: screenshotData, error: screenshotError } = await (supabase
          .from("journal_screenshots") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("date", date)
          .eq("screenshot_type", "pending_link")
          .order("created_at", { ascending: true });

        if (screenshotError) {
          console.error("Error fetching unlinked screenshots:", screenshotError);
        } else {
          setScreenshots((screenshotData || []) as UnlinkedScreenshot[]);
        }

        // Fetch trades for this date
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59.999`;

        const { data: tradesData, error: tradesError } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id)
          .gte("entry_date", startOfDay)
          .lte("entry_date", endOfDay)
          .order("entry_date", { ascending: true });

        if (tradesError) {
          console.error("Error fetching trades:", tradesError);
        } else {
          setTrades((tradesData || []) as Trade[]);
        }
      } catch (err) {
        console.error("Exception fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [date]);

  // Handle file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newScreenshots: UnlinkedScreenshot[] = [];
    let successCount = 0;
    const errors: string[] = [];

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to upload screenshots");
        setIsUploading(false);
        return;
      }

      const filesToUpload = Array.from(files);

      for (let i = 0; i < filesToUpload.length; i++) {
        let file = filesToUpload[i];
        setUploadProgress(`Processing ${i + 1} of ${filesToUpload.length}...`);

        // Validate file type
        if (!file.type.startsWith("image/")) {
          errors.push(`${file.name}: Not an image file`);
          continue;
        }

        // Validate file size (10MB max before compression)
        const maxSizeBytes = 10 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
          errors.push(`${file.name}: Too large (${fileSizeMB}MB, max 10MB)`);
          continue;
        }

        try {
          // Compress image before upload
          setUploadProgress(`Compressing ${i + 1} of ${filesToUpload.length}...`);
          const originalSize = file.size;
          file = await compressImage(file);
          const savedBytes = originalSize - file.size;
          if (savedBytes > 0) {
            console.log(`Saved ${(savedBytes / 1024).toFixed(1)}KB on ${file.name}`);
          }

          setUploadProgress(`Uploading ${i + 1} of ${filesToUpload.length}...`);

          // Generate unique filename (use .jpg since compression converts to JPEG)
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `${date}/unlinked-${Date.now()}-${i}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from("trade-screenshots")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
            });

          if (uploadError) {
            if (uploadError.message.includes("Bucket not found")) {
              toast.error("Screenshot storage not configured. Please contact support.");
              setIsUploading(false);
              return;
            }
            errors.push(`${file.name}: ${uploadError.message}`);
            continue;
          }

          // Save to database as unlinked (pending_link type)
          const { data: screenshotData, error: dbError } = await (supabase
            .from("journal_screenshots") as any)
            .insert({
              user_id: user.id,
              date: date,
              screenshot_type: "pending_link",
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              trade_id: null,
            })
            .select()
            .single();

          if (dbError) {
            errors.push(`${file.name}: Database error - ${dbError.message}`);
            continue;
          }

          newScreenshots.push(screenshotData as UnlinkedScreenshot);
          successCount++;
        } catch (err) {
          errors.push(`${file.name}: Upload failed`);
        }
      }

      if (newScreenshots.length > 0) {
        setScreenshots([...screenshots, ...newScreenshots]);
      }

      // Show appropriate feedback
      if (successCount > 0 && errors.length === 0) {
        toast.success(`${successCount} screenshot${successCount > 1 ? "s" : ""} uploaded`);
      } else if (successCount > 0 && errors.length > 0) {
        toast.info(`${successCount} uploaded, ${errors.length} failed`);
        errors.slice(0, 2).forEach(err => toast.error(err));
      } else if (errors.length > 0) {
        errors.slice(0, 2).forEach(err => toast.error(err));
      }
    } catch (error) {
      console.error("Error uploading screenshots:", error);
      toast.error("Failed to upload screenshots");
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle linking screenshot to trade
  const handleLinkToTrade = async () => {
    if (!selectedScreenshot || !selectedTradeId) return;

    setIsLinking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Create entry in trade_screenshots table
      const insertData = {
        trade_id: selectedTradeId,
        user_id: user.id,
        file_path: selectedScreenshot.file_path,
        file_name: selectedScreenshot.file_name,
        file_size: selectedScreenshot.file_size || 0,
        screenshot_type: selectedType,
      };

      const { error: insertError } = await (supabase
        .from("trade_screenshots") as any)
        .insert(insertData);

      if (insertError) {
        console.error("Insert error details:", insertError);
        throw insertError;
      }

      // Delete from journal_screenshots (unlinked)
      const { error: deleteError } = await (supabase
        .from("journal_screenshots") as any)
        .delete()
        .eq("id", selectedScreenshot.id);

      if (deleteError) {
        console.error("Error deleting from journal_screenshots:", deleteError);
      }

      // Update local state
      setScreenshots(screenshots.filter(s => s.id !== selectedScreenshot.id));

      const linkedTrade = trades.find(t => t.id === selectedTradeId);
      toast.success(`Screenshot linked to ${linkedTrade?.symbol || "trade"}`);

      // Notify parent to refresh trade screenshots
      onScreenshotLinked?.();

      // Close dialog
      setLinkDialogOpen(false);
      setSelectedScreenshot(null);
      setSelectedTradeId("");
      setSelectedType("entry");
    } catch (error) {
      console.error("Error linking screenshot:", error);
      toast.error("Failed to link screenshot to trade");
    } finally {
      setIsLinking(false);
    }
  };

  // Handle delete
  const handleDelete = async (screenshot: UnlinkedScreenshot) => {
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
        .from("journal_screenshots") as any)
        .delete()
        .eq("id", screenshot.id);

      if (dbError) throw dbError;

      setScreenshots(screenshots.filter((s) => s.id !== screenshot.id));
      toast.success("Screenshot deleted");
    } catch (error) {
      console.error("Error deleting screenshot:", error);
      toast.error("Failed to delete screenshot");
    }
  };

  // Get image URL
  const getImageUrl = (screenshot: UnlinkedScreenshot) => {
    const supabase = createClient();
    const { data: { publicUrl } } = supabase.storage
      .from("trade-screenshots")
      .getPublicUrl(screenshot.file_path);
    return publicUrl;
  };

  // Open preview
  const openPreview = (screenshot: UnlinkedScreenshot) => {
    const url = getImageUrl(screenshot);
    setPreviewImage(url);
    setPreviewTitle(screenshot.caption || screenshot.file_name);
  };

  // Open link dialog
  const openLinkDialog = (screenshot: UnlinkedScreenshot) => {
    setSelectedScreenshot(screenshot);
    setSelectedTradeId("");
    setSelectedType("entry");
    setLinkDialogOpen(true);
  };

  // Format trade label for dropdown
  const getTradeLabel = (trade: Trade) => {
    const pnl = trade.net_pnl ?? 0;
    const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
    const time = new Date(trade.entry_date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${trade.symbol} ${trade.side} @ ${time} (${pnlStr})`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Unlinked Screenshots
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Unlinked Screenshots
                {screenshots.length > 0 && (
                  <Badge variant="secondary">{screenshots.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Upload screenshots now, link them to trades later
              </CardDescription>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadProgress || "Uploading..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Screenshots
                  </>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {screenshots.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                Upload screenshots as you trade
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Link them to specific trades after you import your trades
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="relative aspect-video rounded-lg border bg-muted overflow-hidden"
                >
                  {/* Image */}
                  <div className="absolute inset-0">
                    <img
                      src={getImageUrl(screenshot)}
                      alt={screenshot.file_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Pending badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending Link
                  </Badge>

                  {/* Action buttons - always visible at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs bg-white hover:bg-gray-100 text-gray-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openLinkDialog(screenshot);
                        }}
                        disabled={trades.length === 0}
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Link to Trade
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-white hover:bg-gray-100 text-gray-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openPreview(screenshot);
                        }}
                      >
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleDelete(screenshot);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No trades message */}
          {screenshots.length > 0 && trades.length === 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>No trades found for this day.</strong> Import your trades to link these screenshots.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Modal (custom implementation instead of Dialog for reliability) */}
      {linkDialogOpen && selectedScreenshot && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
          onClick={() => setLinkDialogOpen(false)}
        >
          <div
            className="relative bg-background rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Link Screenshot to Trade</h3>
                <p className="text-sm text-muted-foreground">
                  Select which trade this screenshot belongs to
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLinkDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* Preview */}
              <div className="aspect-video rounded-lg border bg-muted overflow-hidden">
                <img
                  src={getImageUrl(selectedScreenshot)}
                  alt={selectedScreenshot.file_name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Trade selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Trade</label>
                <select
                  value={selectedTradeId}
                  onChange={(e) => setSelectedTradeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Choose a trade...</option>
                  {trades.map((trade) => {
                    const pnl = trade.net_pnl ?? 0;
                    const prefix = pnl >= 0 ? "▲" : "▼";
                    return (
                      <option key={trade.id} value={trade.id}>
                        {prefix} {getTradeLabel(trade)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Screenshot type selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Screenshot Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {SCREENSHOT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleLinkToTrade}
                disabled={!selectedTradeId || isLinking}
              >
                {isLinking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Link to Trade
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80"
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

"use client";

import * as React from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
  ZoomIn,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { TradeScreenshot } from "@/types/database";
import { APP_DEFAULTS } from "@/lib/constants";

interface TradeScreenshotsProps {
  tradeId: string;
  readOnly?: boolean;
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

type ScreenshotType = (typeof SCREENSHOT_TYPES)[number]["value"];

export function TradeScreenshots({
  tradeId,
  readOnly = false,
}: TradeScreenshotsProps) {
  const [screenshots, setScreenshots] = React.useState<TradeScreenshot[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>("");
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");
  const [editingTagId, setEditingTagId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch screenshots
  React.useEffect(() => {
    async function fetchScreenshots() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase
          .from("trade_screenshots") as any)
          .select("*")
          .eq("trade_id", tradeId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching screenshots:", error);
        } else {
          setScreenshots((data || []) as TradeScreenshot[]);
        }
      } catch (err) {
        console.error("Exception fetching screenshots:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScreenshots();
  }, [tradeId]);

  // Handle multiple file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = APP_DEFAULTS.maxScreenshotsPerTrade - screenshots.length;
    if (remainingSlots <= 0) {
      toast.error(
        `Maximum ${APP_DEFAULTS.maxScreenshotsPerTrade} screenshots allowed per trade`
      );
      return;
    }

    // Limit files to remaining slots
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.info(`Only uploading ${remainingSlots} of ${files.length} files (limit reached)`);
    }

    setIsUploading(true);
    const newScreenshots: TradeScreenshot[] = [];
    let successCount = 0;
    const errors: string[] = [];

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to upload screenshots");
        setIsUploading(false);
        return;
      }

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadProgress(`Uploading ${i + 1} of ${filesToUpload.length}...`);

        // Validate file type
        if (!file.type.startsWith("image/")) {
          errors.push(`${file.name}: Not an image file`);
          continue;
        }

        // Validate file size
        const maxSizeBytes = APP_DEFAULTS.maxFileSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
          errors.push(`${file.name}: Too large (${fileSizeMB}MB, max ${APP_DEFAULTS.maxFileSizeMB}MB)`);
          continue;
        }

        try {
          // Generate unique filename - default to "other" type, user can change after
          const fileExt = file.name.split(".").pop();
          const fileName = `${tradeId}/${Date.now()}-${i}-other.${fileExt}`;
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

          // Save to database
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: screenshotData, error: dbError } = await (supabase
            .from("trade_screenshots") as any)
            .insert({
              trade_id: tradeId,
              user_id: user.id,
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              screenshot_type: "other",
            })
            .select()
            .single();

          if (dbError) {
            errors.push(`${file.name}: Database error`);
            continue;
          }

          newScreenshots.push(screenshotData as TradeScreenshot);
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
        // Show first few errors
        errors.slice(0, 3).forEach(err => toast.error(err));
        if (errors.length > 3) {
          toast.error(`...and ${errors.length - 3} more errors`);
        }
      } else if (errors.length > 0) {
        // All failed - show errors
        errors.slice(0, 3).forEach(err => toast.error(err));
        if (errors.length > 3) {
          toast.error(`...and ${errors.length - 3} more errors`);
        }
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

  // Handle tag/type change
  const handleTypeChange = async (screenshot: TradeScreenshot, newType: ScreenshotType) => {
    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from("trade_screenshots") as any)
        .update({ screenshot_type: newType })
        .eq("id", screenshot.id);

      if (error) throw error;

      setScreenshots(screenshots.map(s =>
        s.id === screenshot.id
          ? { ...s, screenshot_type: newType }
          : s
      ));
      setEditingTagId(null);
      toast.success("Tag updated");
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("Failed to update tag");
    }
  };

  // Handle delete
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase
        .from("trade_screenshots") as any)
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
  const openPreview = (screenshot: TradeScreenshot) => {
    const url = getImageUrl(screenshot);
    setPreviewImage(url);
    setPreviewTitle(
      `${screenshot.screenshot_type.charAt(0).toUpperCase() + screenshot.screenshot_type.slice(1)} - ${screenshot.file_name}`
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Screenshots
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
                <ImageIcon className="h-5 w-5" />
                Screenshots
              </CardTitle>
              <CardDescription>
                {screenshots.length} of {APP_DEFAULTS.maxScreenshotsPerTrade}{" "}
                screenshots
              </CardDescription>
            </div>
            {!readOnly &&
              screenshots.length < APP_DEFAULTS.maxScreenshotsPerTrade && (
                <div className="flex items-center gap-2">
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
                        Upload
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
              )}
          </div>
        </CardHeader>
        <CardContent>
          {screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No screenshots uploaded yet
              </p>
              {!readOnly && (
                <p className="text-xs text-muted-foreground mt-1">
                  Upload entry, exit, or setup charts for this trade
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="group relative aspect-video rounded-lg border bg-muted overflow-hidden"
                >
                  {/* Image - clickable for preview */}
                  <div
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => openPreview(screenshot)}
                  >
                    <img
                      src={getImageUrl(screenshot)}
                      alt={screenshot.file_name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(screenshot);
                      }}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    {!readOnly && (
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
                    )}
                  </div>

                  {/* Type badge - clickable to edit */}
                  {editingTagId === screenshot.id ? (
                    <div
                      className="absolute top-2 left-2 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        value={screenshot.screenshot_type}
                        onValueChange={(value) => handleTypeChange(screenshot, value as ScreenshotType)}
                        onOpenChange={(open) => {
                          if (!open) setEditingTagId(null);
                        }}
                        defaultOpen
                      >
                        <SelectTrigger className="h-8 w-[130px] text-sm bg-background font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCREENSHOT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="text-sm">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "absolute top-2 left-2 text-sm px-3 py-1 cursor-pointer hover:bg-secondary/80 font-medium",
                        !readOnly && "pointer-events-auto"
                      )}
                      onClick={(e) => {
                        if (!readOnly) {
                          e.stopPropagation();
                          setEditingTagId(screenshot.id);
                        }
                      }}
                    >
                      {SCREENSHOT_TYPES.find(t => t.value === screenshot.screenshot_type)?.label || screenshot.screenshot_type}
                    </Badge>
                  )}
                </div>
              ))}
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

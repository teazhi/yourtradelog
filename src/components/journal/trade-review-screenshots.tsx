"use client";

import * as React from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Button,
  Input,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compression";

interface TradeReviewScreenshot {
  id: string;
  user_id: string;
  date: string;
  screenshot_type: string;
  trade_review_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  caption: string | null;
  created_at: string;
}

interface TradeReviewScreenshotsProps {
  date: string; // YYYY-MM-DD format
  tradeReviewId: string; // The trade review's UUID
  maxScreenshots?: number;
}

export function TradeReviewScreenshots({
  date,
  tradeReviewId,
  maxScreenshots = 4,
}: TradeReviewScreenshotsProps) {
  const [screenshots, setScreenshots] = React.useState<TradeReviewScreenshot[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewScreenshot, setPreviewScreenshot] = React.useState<TradeReviewScreenshot | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [editingCaptionId, setEditingCaptionId] = React.useState<string | null>(null);
  const [captionInput, setCaptionInput] = React.useState("");
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);

  // Fetch screenshots for this trade review
  React.useEffect(() => {
    async function fetchScreenshots() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        // Fetch screenshots linked to this trade review by trade_review_id
        // Also fetch any using the old screenshot_type format for backwards compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase
          .from("journal_screenshots") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("date", date)
          .or(`trade_review_id.eq.${tradeReviewId},screenshot_type.eq.trade_review_${tradeReviewId}`)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching trade review screenshots:", error);
          return;
        }

        setScreenshots(data || []);
      } catch (error) {
        console.error("Error fetching trade review screenshots:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScreenshots();
  }, [date, tradeReviewId]);

  // Handle file upload
  const handleFileUpload = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxScreenshots - screenshots.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxScreenshots} screenshots per trade`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please sign in to upload screenshots");
        return;
      }

      for (const file of filesToUpload) {
        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image file`);
          continue;
        }

        // Compress image
        const compressedFile = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
        });

        // Generate unique file path
        const fileExt = file.name.split(".").pop() || "jpg";
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/journal/${date}/trade_review/${tradeReviewId}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("trade-screenshots")
          .upload(filePath, compressedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Create database record with trade_review_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newScreenshot, error: dbError } = await (supabase
          .from("journal_screenshots") as any)
          .insert({
            user_id: user.id,
            date: date,
            screenshot_type: "trade_review",
            trade_review_id: tradeReviewId,
            file_path: filePath,
            file_name: file.name,
            file_size: compressedFile.size,
          })
          .select()
          .single();

        if (dbError) {
          console.error("Database error:", dbError);
          toast.error(`Failed to save ${file.name}`);
          continue;
        }

        setScreenshots((prev) => [...prev, newScreenshot]);
      }

      toast.success("Screenshot uploaded");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload screenshot");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle delete
  const handleDelete = async (screenshot: TradeReviewScreenshot) => {
    try {
      const supabase = createClient();

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("trade-screenshots")
        .remove([screenshot.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }

      // Delete from database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: dbError } = await (supabase
        .from("journal_screenshots") as any)
        .delete()
        .eq("id", screenshot.id);

      if (dbError) {
        console.error("Database delete error:", dbError);
        toast.error("Failed to delete screenshot");
        return;
      }

      setScreenshots((prev) => prev.filter((s) => s.id !== screenshot.id));
      toast.success("Screenshot deleted");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete screenshot");
    }
  };

  // Handle caption save
  const handleCaptionSave = async (screenshot: TradeReviewScreenshot) => {
    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase
        .from("journal_screenshots") as any)
        .update({ caption: captionInput.trim() || null })
        .eq("id", screenshot.id);

      if (error) throw error;

      setScreenshots(screenshots.map(s =>
        s.id === screenshot.id
          ? { ...s, caption: captionInput.trim() || null }
          : s
      ));
      setEditingCaptionId(null);
      setCaptionInput("");
      toast.success("Caption saved");
    } catch (error) {
      console.error("Error updating caption:", error);
      toast.error("Failed to save caption");
    }
  };

  // Get public URL for screenshot
  const getScreenshotUrl = (filePath: string) => {
    const supabase = createClient();
    const { data } = supabase.storage.from("trade-screenshots").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Navigation for preview modal
  const currentPreviewIndex = previewScreenshot
    ? screenshots.findIndex(s => s.id === previewScreenshot.id)
    : -1;

  const goToPrevious = () => {
    if (currentPreviewIndex > 0) {
      setPreviewScreenshot(screenshots[currentPreviewIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentPreviewIndex < screenshots.length - 1) {
      setPreviewScreenshot(screenshots[currentPreviewIndex + 1]);
    }
  };

  // Keyboard navigation for preview
  React.useEffect(() => {
    if (!previewScreenshot) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "Escape") {
        setPreviewScreenshot(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewScreenshot, currentPreviewIndex, screenshots]);

  // Touch swipe support for mobile
  const touchStartX = React.useRef<number | null>(null);
  const touchEndX = React.useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isSwipe = Math.abs(distance) > minSwipeDistance;

    if (isSwipe) {
      if (distance > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
      if (imageFiles.length > 0) {
        handleFileUpload(imageFiles);
      } else {
        toast.error("Please drop image files only");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Screenshots</span>
          <span className="text-xs text-muted-foreground">
            ({screenshots.length}/{maxScreenshots})
          </span>
        </div>
        {screenshots.length > 0 && screenshots.length < maxScreenshots && (
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-3 w-3" />
                Upload
              </>
            )}
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
        disabled={isUploading}
      />

      {/* Droppable container */}
      <div
        ref={dropZoneRef}
        className={cn(
          "rounded-lg transition-colors",
          isDragging && "ring-2 ring-primary bg-primary/5"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {screenshots.length === 0 ? (
          /* Empty state - show upload prompt */
          <div
            className={cn(
              "flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <ImageIcon className={cn(
                  "h-6 w-6 mb-2",
                  isDragging ? "text-primary" : "text-muted-foreground/50"
                )} />
                <p className={cn(
                  "text-sm",
                  isDragging ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {isDragging ? "Drop images here" : "Drag & drop or click to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 10MB
                </p>
              </>
            )}
          </div>
        ) : (
          /* Screenshot grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="group relative aspect-video rounded-lg overflow-hidden border bg-muted/30"
              >
                {/* Image - clickable for preview */}
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => setPreviewScreenshot(screenshot)}
                >
                  <img
                    src={getScreenshotUrl(screenshot.file_path)}
                    alt={screenshot.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>

                {/* Overlay on hover */}
                <div className={cn(
                  "absolute inset-0 bg-black/50 transition-opacity pointer-events-none flex items-center justify-center gap-2",
                  deleteConfirmId === screenshot.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  {deleteConfirmId === screenshot.id ? (
                    /* Delete confirmation */
                    <div className="flex flex-col items-center gap-2 pointer-events-auto">
                      <p className="text-white text-xs font-medium">Delete?</p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(screenshot);
                            setDeleteConfirmId(null);
                          }}
                        >
                          Yes
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmId(null);
                          }}
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Normal hover actions */
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewScreenshot(screenshot);
                        }}
                      >
                        <ZoomIn className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7 pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(screenshot.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Caption - click to edit */}
                {editingCaptionId === screenshot.id ? (
                  <div
                    className="absolute bottom-0 left-0 right-0 p-2 bg-black/70"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex gap-1">
                      <Input
                        value={captionInput}
                        onChange={(e) => setCaptionInput(e.target.value)}
                        placeholder="Add caption..."
                        className="h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCaptionSave(screenshot);
                          } else if (e.key === "Escape") {
                            setEditingCaptionId(null);
                            setCaptionInput("");
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => handleCaptionSave(screenshot)}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : screenshot.caption ? (
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/60 text-white text-xs truncate cursor-pointer hover:bg-black/70"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCaptionId(screenshot.id);
                      setCaptionInput(screenshot.caption || "");
                    }}
                  >
                    {screenshot.caption}
                  </div>
                ) : (
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/40 text-white/70 text-xs truncate cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCaptionId(screenshot.id);
                      setCaptionInput("");
                    }}
                  >
                    + Add caption
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewScreenshot && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-2 sm:p-4"
          onClick={() => setPreviewScreenshot(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setPreviewScreenshot(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image counter */}
          {screenshots.length > 1 && (
            <div className="absolute top-4 left-4 text-white/70 text-sm">
              {currentPreviewIndex + 1} / {screenshots.length}
            </div>
          )}

          {/* Previous arrow - hidden on mobile (use swipe) */}
          {currentPreviewIndex > 0 && (
            <Button
              size="lg"
              variant="ghost"
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12 p-0 hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
          )}

          {/* Next arrow - hidden on mobile (use swipe) */}
          {currentPreviewIndex < screenshots.length - 1 && (
            <Button
              size="lg"
              variant="ghost"
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-10 w-10 sm:h-12 sm:w-12 p-0 hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </Button>
          )}

          {/* Image */}
          <img
            src={getScreenshotUrl(previewScreenshot.file_path)}
            alt={previewScreenshot.file_name}
            className="max-w-full max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption display */}
          {previewScreenshot.caption && (
            <div
              className="mt-4 px-4 py-2 bg-black/60 rounded-lg max-w-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white text-sm">{previewScreenshot.caption}</p>
            </div>
          )}
          {/* File name as fallback if no caption */}
          {!previewScreenshot.caption && (
            <div
              className="mt-4 px-4 py-2 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/50 text-xs">{previewScreenshot.file_name}</p>
            </div>
          )}

          {/* Dot indicators - larger on mobile for touch */}
          {screenshots.length > 1 && (
            <div
              className="flex gap-3 sm:gap-2 mt-4"
              onClick={(e) => e.stopPropagation()}
            >
              {screenshots.map((s, idx) => (
                <button
                  key={s.id}
                  className={cn(
                    "w-3 h-3 sm:w-2 sm:h-2 rounded-full transition-colors",
                    idx === currentPreviewIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
                  )}
                  onClick={() => setPreviewScreenshot(screenshots[idx])}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Trash2,
  ZoomIn,
  Sun,
  Moon,
  BarChart3,
  Target,
  Newspaper,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  cn,
  toast,
} from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image-compression";

// Screenshot type definition for journal
interface JournalScreenshot {
  id: string;
  user_id: string;
  date: string;
  screenshot_type: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  caption: string | null;
  created_at: string;
}

interface JournalDailyScreenshotsProps {
  date: string; // YYYY-MM-DD format
  type: "pre_market" | "post_market";
  maxScreenshots?: number;
}

const SCREENSHOT_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  pre_market: { label: "Pre-Market", icon: Sun },
  post_market: { label: "Post-Market", icon: Moon },
  market_structure: { label: "Market Structure", icon: BarChart3 },
  key_levels: { label: "Key Levels", icon: Target },
  news: { label: "News/Calendar", icon: Newspaper },
  general: { label: "General", icon: ImageIcon },
};

export function JournalDailyScreenshots({
  date,
  type,
  maxScreenshots = 5,
}: JournalDailyScreenshotsProps) {
  const [screenshots, setScreenshots] = React.useState<JournalScreenshot[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<string>("");
  const [previewImage, setPreviewImage] = React.useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");
  const [editingCaptionId, setEditingCaptionId] = React.useState<string | null>(null);
  const [captionInput, setCaptionInput] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const typeConfig = SCREENSHOT_TYPE_LABELS[type] || SCREENSHOT_TYPE_LABELS.general;
  const TypeIcon = typeConfig.icon;

  // Fetch screenshots for this date and type
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
          .from("journal_screenshots") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("date", date)
          .eq("screenshot_type", type)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching journal screenshots:", error);
        } else {
          setScreenshots((data || []) as JournalScreenshot[]);
        }
      } catch (err) {
        console.error("Exception fetching journal screenshots:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchScreenshots();
  }, [date, type]);

  // Handle file upload
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxScreenshots - screenshots.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${maxScreenshots} screenshots allowed`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast.info(`Only uploading ${remainingSlots} of ${files.length} files (limit reached)`);
    }

    setIsUploading(true);
    const newScreenshots: JournalScreenshot[] = [];
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

          // Generate unique filename
          const fileExt = file.name.split(".").pop() || "jpg";
          const fileName = `${date}/${type}-${Date.now()}-${i}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          // Upload to Supabase Storage (using trade-screenshots bucket for now)
          // In production, you'd create a separate journal-screenshots bucket
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
            .from("journal_screenshots") as any)
            .insert({
              user_id: user.id,
              date: date,
              screenshot_type: type,
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
            })
            .select()
            .single();

          if (dbError) {
            errors.push(`${file.name}: Database error - ${dbError.message}`);
            continue;
          }

          newScreenshots.push(screenshotData as JournalScreenshot);
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

  // Handle caption update
  const handleCaptionSave = async (screenshot: JournalScreenshot) => {
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

  // Handle delete
  const handleDelete = async (screenshot: JournalScreenshot) => {
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
  const getImageUrl = (screenshot: JournalScreenshot) => {
    const supabase = createClient();
    const {
      data: { publicUrl },
    } = supabase.storage
      .from("trade-screenshots")
      .getPublicUrl(screenshot.file_path);
    return publicUrl;
  };

  // Open preview
  const openPreview = (screenshot: JournalScreenshot) => {
    const url = getImageUrl(screenshot);
    setPreviewImage(url);
    setPreviewTitle(screenshot.caption || screenshot.file_name);
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{typeConfig.label} Screenshots</span>
            <Badge variant="secondary" className="text-xs">
              {screenshots.length}/{maxScreenshots}
            </Badge>
          </div>
          {screenshots.length < maxScreenshots && (
            <div>
              <Button
                variant="outline"
                size="sm"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    {uploadProgress || "Uploading..."}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-3 w-3" />
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

        {screenshots.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Click to upload {typeConfig.label.toLowerCase()} charts
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG up to 10MB
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                    className="h-7 w-7 pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(screenshot);
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
                      handleDelete(screenshot);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
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

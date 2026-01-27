/**
 * Image compression utility for reducing file sizes before upload
 * Uses canvas-based compression to reduce storage costs
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, default 0.8
  maxSizeKB?: number; // Target max size in KB
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  maxSizeKB: 500, // Target 500KB max
};

/**
 * Compress an image file using canvas
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<File> - The compressed file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for small files (under 100KB)
  if (file.size < 100 * 1024) {
    return file;
  }

  // Skip compression for non-image files
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip compression for GIFs (to preserve animation)
  if (file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      const maxWidth = opts.maxWidth!;
      const maxHeight = opts.maxHeight!;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Round dimensions
      width = Math.round(width);
      height = Math.round(height);

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw image with white background (for transparent PNGs)
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Try to achieve target size by adjusting quality
      let quality = opts.quality!;
      const maxSizeBytes = (opts.maxSizeKB || 500) * 1024;

      const tryCompress = (q: number): Promise<Blob> => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                res(blob);
              } else {
                // Fallback: return original file as blob
                res(new Blob([file], { type: file.type }));
              }
            },
            "image/jpeg",
            q
          );
        });
      };

      const compress = async () => {
        let blob = await tryCompress(quality);

        // If still too large, reduce quality iteratively
        while (blob.size > maxSizeBytes && quality > 0.3) {
          quality -= 0.1;
          blob = await tryCompress(quality);
        }

        // Create new file with original name but .jpg extension
        const fileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
        const compressedFile = new File([blob], fileName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        // Only use compressed version if it's actually smaller
        if (compressedFile.size < file.size) {
          console.log(
            `Compressed ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`
          );
          resolve(compressedFile);
        } else {
          console.log(`Compression skipped for ${file.name}: original is smaller`);
          resolve(file);
        }
      };

      compress().catch(reject);
    };

    img.onerror = () => {
      // If image loading fails, return original file
      console.warn(`Could not load image for compression: ${file.name}`);
      resolve(file);
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images
 * @param files - Array of files to compress
 * @param options - Compression options
 * @param onProgress - Optional progress callback
 * @returns Promise<File[]> - Array of compressed files
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const compressed: File[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i + 1, files.length);
    const file = await compressImage(files[i], options);
    compressed.push(file);
  }

  return compressed;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Calculate total size savings
 */
export function calculateSavings(
  originalFiles: File[],
  compressedFiles: File[]
): { originalSize: number; compressedSize: number; savedBytes: number; savedPercent: number } {
  const originalSize = originalFiles.reduce((sum, f) => sum + f.size, 0);
  const compressedSize = compressedFiles.reduce((sum, f) => sum + f.size, 0);
  const savedBytes = originalSize - compressedSize;
  const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

  return { originalSize, compressedSize, savedBytes, savedPercent };
}

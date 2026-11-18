/**
 * Client-side image compression and downscaling utility.
 * Shrinks large photos (> 1MB) to max 1920px at 0.85 JPEG quality in <50ms.
 * Safely falls back to original File on any browser limitation or error.
 */
export async function compressImage(
  file,
  {
    maxDimension = 1920,
    quality = 0.85,
    maxBytes = 1024 * 1024, // 1 MB threshold
  } = {}
) {
  // Only compress standard static image formats above maxBytes
  if (
    !file ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size <= maxBytes
  ) {
    return file;
  }

  // Ensure execution environment supports DOM and Canvas
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    let targetWidth = width;
    let targetHeight = height;

    if (width > maxDimension || height > maxDimension) {
      if (width >= height) {
        targetWidth = maxDimension;
        targetHeight = Math.round((height * maxDimension) / width);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((width * maxDimension) / height);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob || blob.size >= file.size) {
      // If compressed version is somehow larger or failed, return original
      return file;
    }

    // Preserve original file name with .jpg extension
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[imageCompressor] Client-side image compression skipped:", err);
    return file;
  }
}

export default compressImage;

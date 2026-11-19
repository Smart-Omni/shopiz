/**
 * Optimizes an image URL for small displays (thumbnails, order cards, tables).
 * Supports Google Drive CDN (lh3), Unsplash, Shopee CDN, and raw URLs.
 *
 * @param {string} url - Original image URL
 * @param {number} size - Target square size in pixels (default 120)
 * @returns {string} Optimized thumbnail URL
 */
export function getThumbnailUrl(url, size = 120) {
  if (!url || typeof url !== "string") return "";

  // 1. Google Drive CDN (lh3.googleusercontent.com)
  if (url.includes("lh3.googleusercontent.com")) {
    const base = url.split("=")[0];
    return `${base}=s${size}-c`;
  }

  // 2. Unsplash CDN
  if (url.includes("images.unsplash.com")) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", String(size));
      u.searchParams.set("q", "75");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    } catch {
      return url;
    }
  }

  // 3. Shopee CDN
  if (url.includes("cf.shopee.vn") && !url.includes("_tn")) {
    return `${url}_tn`;
  }

  return url;
}

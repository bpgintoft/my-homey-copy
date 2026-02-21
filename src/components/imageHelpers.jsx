/**
 * Generates a thumbnail URL for faster loading
 * Attempts to use URL-based image resizing if supported by the CDN
 */
export function getThumbnailUrl(originalUrl, width = 400) {
  if (!originalUrl) return originalUrl;
  
  try {
    const url = new URL(originalUrl);
    
    // Check if it's a Base44/Supabase storage URL
    if (url.hostname.includes('supabase')) {
      // Supabase supports transform parameters
      url.searchParams.set('width', width.toString());
      url.searchParams.set('quality', '80');
      return url.toString();
    }
    
    // Check for Cloudflare Images
    if (url.hostname.includes('imagedelivery.net')) {
      // Cloudflare Images: replace /public with /w={width}
      return originalUrl.replace('/public', `/w=${width}`);
    }
    
    // For other CDNs, return original but will use lazy loading
    return originalUrl;
  } catch {
    return originalUrl;
  }
}

/**
 * Generates a medium-sized URL for card displays
 */
export function getMediumUrl(originalUrl, width = 800) {
  return getThumbnailUrl(originalUrl, width);
}
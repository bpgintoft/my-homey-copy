export const getOptimizedImageUrl = (url, width = 400) => {
  if (!url) return url;
  
  // Check if it's a Supabase URL
  if (url.includes('supabase.co')) {
    // Add width parameter for image optimization
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=80`;
  }
  
  return url;
};

// Get thumbnail size (mobile)
export const getThumbnailUrl = (url) => getOptimizedImageUrl(url, 300);

// Get medium size (tablet/expanded views)
export const getMediumUrl = (url) => getOptimizedImageUrl(url, 600);

// Get large size (desktop)
export const getLargeUrl = (url) => getOptimizedImageUrl(url, 1000);
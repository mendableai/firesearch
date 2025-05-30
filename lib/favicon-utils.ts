// Favicon utilities with error tracking to prevent repeated failures
const failedDomains = new Set<string>();

export function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    
    // If we've already seen this domain fail, return fallback immediately
    if (failedDomains.has(domain)) {
      return getDefaultFavicon();
    }
    
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return getDefaultFavicon();
  }
}

export function getDefaultFavicon(size: number = 20): string {
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="none"%3E%3Crect width="${size}" height="${size}" rx="${size < 20 ? 2 : 4}" fill="%23E5E7EB"/%3E%3C/svg%3E`;
}

export function markFaviconFailed(url: string): void {
  try {
    const domain = new URL(url).hostname;
    failedDomains.add(domain);
  } catch {
    // Invalid URL, ignore
  }
}
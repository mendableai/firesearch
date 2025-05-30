/* eslint-disable @typescript-eslint/no-explicit-any */
import FirecrawlApp from '@mendable/firecrawl-js';

export class FirecrawlClient {
  private client: FirecrawlApp;

  constructor(providedApiKey?: string) {
    const apiKey = providedApiKey || process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY is required - either provide it or set it as an environment variable');
    }
    this.client = new FirecrawlApp({ apiKey });
  }

  async scrapeUrl(url: string, timeoutMs: number = 15000) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Scraping timeout')), timeoutMs);
      });
      
      // Race the scraping against the timeout
      const scrapePromise = this.client.scrapeUrl(url, {
        formats: ['markdown', 'html'],
      });
      
      const result = await Promise.race([scrapePromise, timeoutPromise]) as any;
      
      if ('success' in result && !result.success) {
        throw new Error(result.error || 'Scrape failed');
      }
      
      return {
        markdown: (result as any).markdown || '',
        html: (result as any).html || '',
        metadata: (result as any).metadata || {},
        success: true,
      };
    } catch (error: any) {
      
      // Handle timeout errors
      if (error?.message === 'Scraping timeout') {
        return {
          markdown: '',
          html: '',
          metadata: {
            error: 'Scraping took too long and was stopped',
            timeout: true,
          },
          success: false,
          error: 'timeout',
        };
      }
      
      // Handle 403 errors gracefully
      if (error?.statusCode === 403 || error?.message?.includes('403')) {
        return {
          markdown: '',
          html: '',
          metadata: {
            error: 'This website is not supported by Firecrawl',
            statusCode: 403,
          },
          success: false,
          error: 'unsupported',
        };
      }
      
      // Return error info for other failures
      return {
        markdown: '',
        html: '',
        metadata: {
          error: error?.message || 'Failed to scrape URL',
          statusCode: error?.statusCode,
        },
        success: false,
        error: 'failed',
      };
    }
  }

  async mapUrl(url: string, options?: { search?: string; limit?: number }) {
    try {
      const result = await this.client.mapUrl(url, {
        search: options?.search,
        limit: options?.limit || 10,
      });
      
      if ('success' in result && !result.success) {
        throw new Error((result as any).error || 'Map failed');
      }
      
      return {
        links: (result as any).links || [],
        metadata: (result as any).metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }

  async search(query: string, options?: { limit?: number; scrapeOptions?: any }) {
    try {
      // Search with scrape - this gets us content immediately!
      const searchParams: any = {
        limit: options?.limit || 10,
      };
      
      // Add scrapeOptions to get content with search results
      if (options?.scrapeOptions !== false) {
        searchParams.scrapeOptions = {
          formats: ['markdown'],
          ...options?.scrapeOptions
        };
      }
      
      
      const result = await this.client.search(query, searchParams);
      
      
      // Handle the actual Firecrawl v1 API response format
      if (result && typeof result === 'object' && 'success' in result) {
        if (!(result as any).success) {
          throw new Error((result as any).error || 'Search failed');
        }
      }
      
      // Extract data - search with scrape returns data with content
      const data = (result as any)?.data || [];
      
      // Transform to include scraped content
      const enrichedData = data.map((item: any) => {
        // Try to extract favicon from metadata or construct default
        let favicon = item.metadata?.favicon || null;
        if (!favicon && item.metadata?.ogImage) {
          favicon = item.metadata.ogImage;
        } else if (!favicon && item.url) {
          // Default favicon URL
          const domain = new URL(item.url).hostname;
          favicon = `https://${domain}/favicon.ico`;
        }
        
        return {
          url: item.url,
          title: item.title || item.metadata?.title || 'Untitled',
          description: item.description || item.metadata?.description || '',
          markdown: item.markdown || '',
          html: item.html || '',
          links: item.links || [],
          screenshot: item.screenshot || null,
          metadata: {
            ...item.metadata,
            favicon: favicon,
            screenshot: item.screenshot
          },
          scraped: true, // Mark as already scraped
          content: item.markdown || '', // For compatibility
          favicon: favicon // Add at top level for easy access
        };
      });
      
      return {
        data: enrichedData,
        results: enrichedData, // For backward compatibility
        metadata: (result as any)?.metadata || {},
      };
    } catch (error) {
      throw error;
    }
  }
}
// Search Engine Configuration
export const SEARCH_CONFIG = {
  // Search Settings for Book Summaries
  MAX_BOOK_SUMMARY_QUERIES: 8,       // Max number of different search query variations for a book
  MAX_SOURCES_PER_BOOK_QUERY: 5,   // Max sources Firecrawl returns for each of those ~8 queries
                                     // Aiming for 8 queries * 3-5 sources/query = 24-40 potential sources initially
  MIN_SOURCES_FOR_BOOK_SUMMARY: 10, // Minimum unique sources required before attempting synthesis
  MAX_SOURCES_FOR_SYNTHESIS: 25,   // Max sources to pass to the LLM for final summary generation (to manage context window)

  // Content Processing
  MIN_CONTENT_LENGTH_FOR_SOURCE: 250, // Minimum markdown characters for a source to be considered useful
  MIN_CONTENT_LENGTH_FOR_SUMMARY: 100, // Minimum content length for a source to attempt to make a mini-summary for it
  SUMMARY_CHAR_LIMIT: 150,       // Character limit for individual source summaries (used in `summarizeSourceForBook`)
  CONTEXT_PREVIEW_LENGTH: 500,   // Preview length for previous conversation context
  // ANSWER_CHECK_PREVIEW: 2500, // Less relevant for book summary
  // MAX_SOURCES_TO_CHECK: 10,   // Less relevant for book summary
  
  // Retry Logic (may need adjustment for book summary context)
  MAX_RETRIES: 1,                // Maximum retry attempts for a single failed operation (e.g. a single Firecrawl search)
  // MAX_SEARCH_ATTEMPTS: 3,     // Less relevant as we generate a batch of queries upfront
  // MIN_ANSWER_CONFIDENCE: 0.3, // Less relevant
  // EARLY_TERMINATION_CONFIDENCE: 0.8, // Less relevant
  
  // Timeouts
  SCRAPE_TIMEOUT: 15000,         // Timeout for scraping operations (ms) - Firecrawl search includes scrape
  
  // Performance
  SOURCE_ANIMATION_DELAY: 50,    // Delay between source animations (ms)
  PARALLEL_SUMMARY_GENERATION: true, // Generate individual source summaries in parallel
} as const;

// You can also export individual configs for different components
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,       // Default animation duration (ms)
  SOURCE_FADE_DELAY: 50,         // Delay between source animations (ms)
  MESSAGE_CYCLE_DELAY: 2000,     // Delay for cycling through messages (ms)
} as const;

// Model Configuration
export const MODEL_CONFIG = {
  FAST_MODEL: "gpt-4o-mini",     // Fast model for quick operations (like source pre-summarization)
  QUALITY_MODEL: "gpt-4o",       // High-quality model for final book summary synthesis
  TEMPERATURE: 0.1,              // Model temperature (0 = deterministic, slight increase for more varied summaries if needed)
} as const;
// LLM Provider Types
export type LLMProvider = 'openai' | 'anthropic' | 'grok' | 'openrouter' | 'google' | 'custom';

export interface ModelInfo {
  id: string;
  name: string;
  actualName: string;
  inputPrice: number;       // per 1M tokens
  cachedInputPrice: number; // per 1M tokens (cached)
  outputPrice: number;      // per 1M tokens
  contextWindow?: number;
  description?: string;
}

export interface LLMProviderConfig {
  id: LLMProvider;
  name: string;
  enabled: boolean;
  description: string;
  models: {
    fast: string;
    quality: string;
  };
  availableModels?: ModelInfo[];
  apiKeyEnv?: string;
  baseUrl?: string;
  comingSoon?: boolean;
}

// Available LLM Providers
export const LLM_PROVIDERS: Record<LLMProvider, LLMProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    enabled: true,
    description: 'GPT-4o and GPT-4o-mini models',
    models: {
      fast: 'gpt-4o-mini',
      quality: 'gpt-4.1'
    },
    availableModels: [
      {
        id: 'gpt-4.1',
        name: 'GPT-4.1',
        actualName: 'gpt-4.1-2025-04-14',
        inputPrice: 2.00,
        cachedInputPrice: 0.50,
        outputPrice: 8.00,
        contextWindow: 128000,
        description: 'Latest and most capable GPT-4.1 model'
      },
      {
        id: 'gpt-4.1-mini',
        name: 'GPT-4.1 Mini',
        actualName: 'gpt-4.1-mini-2025-04-14',
        inputPrice: 0.40,
        cachedInputPrice: 0.10,
        outputPrice: 1.60,
        contextWindow: 128000,
        description: 'Efficient GPT-4.1 variant for most tasks'
      },
      {
        id: 'gpt-4.1-nano',
        name: 'GPT-4.1 Nano',
        actualName: 'gpt-4.1-nano-2025-04-14',
        inputPrice: 0.10,
        cachedInputPrice: 0.025,
        outputPrice: 0.40,
        contextWindow: 128000,
        description: 'Ultra-efficient model for simple tasks'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        actualName: 'gpt-4o-2024-08-06',
        inputPrice: 2.50,
        cachedInputPrice: 1.25,
        outputPrice: 10.00,
        contextWindow: 128000,
        description: 'Multimodal model with vision capabilities'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        actualName: 'gpt-4o-mini-2024-07-18',
        inputPrice: 0.15,
        cachedInputPrice: 0.075,
        outputPrice: 0.60,
        contextWindow: 128000,
        description: 'Fast and cost-effective for common tasks'
      },
      {
        id: 'o3',
        name: 'o3',
        actualName: 'o3-2025-04-16',
        inputPrice: 10.00,
        cachedInputPrice: 2.50,
        outputPrice: 40.00,
        contextWindow: 200000,
        description: 'Advanced reasoning model for complex problems'
      },
      {
        id: 'o4-mini',
        name: 'o4-mini',
        actualName: 'o4-mini-2025-04-16',
        inputPrice: 1.10,
        cachedInputPrice: 0.275,
        outputPrice: 4.40,
        contextWindow: 128000,
        description: 'Compact reasoning model for efficient inference'
      }
    ],
    apiKeyEnv: 'OPENAI_API_KEY'
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    enabled: false,
    description: 'Claude 3.5 Sonnet and Claude 3 Haiku',
    models: {
      fast: 'claude-3-haiku-20240307',
      quality: 'claude-3-5-sonnet-20241022'
    },
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    comingSoon: true
  },
  grok: {
    id: 'grok',
    name: 'Grok (xAI)',
    enabled: false,
    description: 'Grok-beta and Grok-vision-beta',
    models: {
      fast: 'grok-beta',
      quality: 'grok-beta'
    },
    apiKeyEnv: 'GROK_API_KEY',
    comingSoon: true
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    enabled: false,
    description: 'Access to multiple models via OpenRouter',
    models: {
      fast: 'openai/gpt-4o-mini',
      quality: 'openai/gpt-4o'
    },
    apiKeyEnv: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    comingSoon: true
  },
  google: {
    id: 'google',
    name: 'Google',
    enabled: false,
    description: 'Gemini Pro and Gemini Flash',
    models: {
      fast: 'gemini-1.5-flash',
      quality: 'gemini-1.5-pro'
    },
    apiKeyEnv: 'GOOGLE_API_KEY',
    comingSoon: true
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    enabled: false,
    description: 'Custom OpenAI-compatible endpoint',
    models: {
      fast: 'custom-fast-model',
      quality: 'custom-quality-model'
    },
    comingSoon: true
  }
} as const;

// Search Engine Configuration
export const SEARCH_CONFIG = {
  // Search Settings
  MAX_SEARCH_QUERIES: 4,        // Maximum number of search queries to generate
  MAX_SOURCES_PER_SEARCH: 6,     // Maximum sources to return per search query
  MAX_SOURCES_TO_SCRAPE: 6,      // Maximum sources to scrape for additional content
  
  // Content Processing
  MIN_CONTENT_LENGTH: 100,       // Minimum content length to consider valid
  SUMMARY_CHAR_LIMIT: 100,       // Character limit for source summaries
  CONTEXT_PREVIEW_LENGTH: 500,   // Preview length for previous context
  ANSWER_CHECK_PREVIEW: 2500,    // Content preview length for answer checking
  MAX_SOURCES_TO_CHECK: 10,      // Maximum sources to check for answers
  
  // Retry Logic
  MAX_RETRIES: 2,                // Maximum retry attempts for failed operations
  MAX_SEARCH_ATTEMPTS: 3,        // Maximum attempts to find answers via search
  MIN_ANSWER_CONFIDENCE: 0.3,    // Minimum confidence (0-1) that a question was answered
  EARLY_TERMINATION_CONFIDENCE: 0.8, // Confidence level to skip additional searches
  
  // Timeouts
  SCRAPE_TIMEOUT: 15000,         // Timeout for scraping operations (ms)
  
  // Performance
  SOURCE_ANIMATION_DELAY: 50,    // Delay between source animations (ms) - reduced from 150
  PARALLEL_SUMMARY_GENERATION: true, // Generate summaries in parallel
} as const;

// You can also export individual configs for different components
export const UI_CONFIG = {
  ANIMATION_DURATION: 300,       // Default animation duration (ms)
  SOURCE_FADE_DELAY: 50,         // Delay between source animations (ms)
  MESSAGE_CYCLE_DELAY: 2000,     // Delay for cycling through messages (ms)
} as const;

// Model Configuration - Now supports dynamic provider selection
export const MODEL_CONFIG = {
  FAST_MODEL: "gpt-4o-mini",     // Fast model for quick operations
  QUALITY_MODEL: "gpt-4.1",      // High-quality model for final synthesis
  TEMPERATURE: 0,                // Model temperature (0 = deterministic)
  PROVIDER: 'openai' as LLMProvider, // Current LLM provider
} as const;

// Settings Interface
export interface AppSettings {
  llm: {
    provider: LLMProvider;
    customModels?: {
      fast: string;
      quality: string;
    };
    customBaseUrl?: string;
    temperature: number;
  };
  apiKeys: {
    firecrawl?: string;
    openai?: string;
    anthropic?: string;
    grok?: string;
    openrouter?: string;
    google?: string;
    custom?: string;
  };
  search: typeof SEARCH_CONFIG;
  ui: typeof UI_CONFIG;
}

// Default Settings
export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    provider: 'openai',
    temperature: MODEL_CONFIG.TEMPERATURE,
  },
  apiKeys: {},
  search: SEARCH_CONFIG,
  ui: UI_CONFIG,
};

// Helper function to get current provider config
export function getCurrentProviderConfig(settings?: AppSettings): LLMProviderConfig {
  const provider = settings?.llm.provider || DEFAULT_SETTINGS.llm.provider;
  return LLM_PROVIDERS[provider];
}

// Helper function to get current models
export function getCurrentModels(settings?: AppSettings) {
  const providerConfig = getCurrentProviderConfig(settings);
  const customModels = settings?.llm.customModels;
  
  return {
    fast: customModels?.fast || providerConfig.models.fast,
    quality: customModels?.quality || providerConfig.models.quality,
  };
}
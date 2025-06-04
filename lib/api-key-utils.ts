import { type LLMProvider } from './config';

/**
 * Check if an API key exists in environment variables
 */
export async function checkEnvApiKey(provider: LLMProvider): Promise<boolean> {
  try {
    const response = await fetch('/api/check-env');
    const data = await response.json();
    
    switch (provider) {
      case 'openai':
        return data.OPENAI_API_KEY;
      case 'anthropic':
        return data.ANTHROPIC_API_KEY;
      case 'grok':
        return data.GROK_API_KEY;
      case 'openrouter':
        return data.OPENROUTER_API_KEY;
      case 'google':
        return data.GOOGLE_API_KEY;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get the effective API key (env takes precedence over settings)
 */
export function getEffectiveApiKey(provider: LLMProvider, settingsApiKey?: string): {
  apiKey?: string;
  source: 'env' | 'settings' | 'none';
} {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side: check environment variables
    const envKey = getEnvApiKey(provider);
    if (envKey) {
      return { apiKey: envKey, source: 'env' };
    }
  }
  
  // Client-side or no env key: use settings
  if (settingsApiKey) {
    return { apiKey: settingsApiKey, source: 'settings' };
  }
  
  return { source: 'none' };
}

/**
 * Get API key from environment variables (server-side only)
 */
function getEnvApiKey(provider: LLMProvider): string | undefined {
  if (typeof window !== 'undefined') return undefined;
  
  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY;
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY;
    case 'grok':
      return process.env.GROK_API_KEY;
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY;
    case 'google':
      return process.env.GOOGLE_API_KEY;
    default:
      return undefined;
  }
}

/**
 * Mask an API key for display
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return '••••••••';
  return apiKey.slice(0, 4) + '••••••••' + apiKey.slice(-4);
} 
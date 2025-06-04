import { AppSettings, DEFAULT_SETTINGS, getCurrentModels, getCurrentProviderConfig } from './config';

/**
 * Get current settings from localStorage (client-side only)
 * For server-side, returns default settings
 */
export function getCurrentSettings(): AppSettings {
  if (typeof window === 'undefined') {
    // Server-side: return default settings
    return DEFAULT_SETTINGS;
  }
  
  try {
    const savedSettings = localStorage.getItem('firesearch-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Get the current models based on settings
 */
export function getCurrentModelsFromSettings(): { fast: string; quality: string } {
  const settings = getCurrentSettings();
  return getCurrentModels(settings);
}

/**
 * Get the current provider configuration
 */
export function getCurrentProviderFromSettings() {
  const settings = getCurrentSettings();
  return getCurrentProviderConfig(settings);
}

/**
 * Get the current temperature setting
 */
export function getCurrentTemperature(): number {
  const settings = getCurrentSettings();
  return settings.llm.temperature;
}

/**
 * Get search configuration from settings
 */
export function getSearchConfigFromSettings() {
  const settings = getCurrentSettings();
  return settings.search;
}

/**
 * Get UI configuration from settings
 */
export function getUIConfigFromSettings() {
  const settings = getCurrentSettings();
  return settings.ui;
} 
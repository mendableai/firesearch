'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, Zap, Search, Eye, RotateCcw, Key, AlertCircle, CheckCircle, DollarSign, MapPin, Clock, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings-context';
import { LLM_PROVIDERS, type LLMProvider, type ModelInfo } from '@/lib/config';
import { checkEnvApiKey, maskApiKey } from '@/lib/api-key-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, resetSettings, isLoading } = useSettings();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [envApiKeys, setEnvApiKeys] = useState<Record<LLMProvider, boolean>>({
    openai: false,
    anthropic: false,
    grok: false,
    openrouter: false,
    google: false,
    custom: false,
  });
  const [firecrawlEnvKey, setFirecrawlEnvKey] = useState(false);

  // Check environment API keys on component mount
  useEffect(() => {
    const checkAllEnvKeys = async () => {
      const providers: LLMProvider[] = ['openai', 'anthropic', 'grok', 'openrouter', 'google'];
      const results: Record<LLMProvider, boolean> = {
        openai: false,
        anthropic: false,
        grok: false,
        openrouter: false,
        google: false,
        custom: false,
      };
      
      for (const provider of providers) {
        results[provider] = await checkEnvApiKey(provider);
      }
      
      setEnvApiKeys(results);

      // Check Firecrawl API key
      try {
        const response = await fetch('/api/check-env');
        const envStatus = await response.json();
        setFirecrawlEnvKey(!!envStatus.FIRECRAWL_API_KEY);
      } catch (error) {
        console.error('Error checking Firecrawl API key:', error);
      }
    };
    
    checkAllEnvKeys();
  }, []);

  const handleProviderChange = (provider: LLMProvider) => {
    updateSettings({
      llm: {
        ...settings.llm,
        provider,
      },
    });
  };

  const handleModelChange = (type: 'fast' | 'quality', modelId: string) => {
    updateSettings({
      llm: {
        ...settings.llm,
        customModels: {
          fast: type === 'fast' ? modelId : settings.llm.customModels?.fast || currentProvider.models.fast,
          quality: type === 'quality' ? modelId : settings.llm.customModels?.quality || currentProvider.models.quality,
        },
      },
    });
  };

  const handleTemperatureChange = (value: number) => {
    updateSettings({
      llm: {
        ...settings.llm,
        temperature: value,
      },
    });
  };

  const handleApiKeyChange = (provider: LLMProvider, value: string) => {
    updateSettings({
      apiKeys: {
        ...settings.apiKeys,
        [provider]: value || undefined,
      },
    });
  };

  const handleFirecrawlApiKeyChange = (value: string) => {
    updateSettings({
      apiKeys: {
        ...settings.apiKeys,
        firecrawl: value || undefined,
      },
    });
  };

  const handleCustomBaseUrlChange = (value: string) => {
    updateSettings({
      llm: {
        ...settings.llm,
        customBaseUrl: value,
      },
    });
  };

  const handleSearchConfigChange = (key: keyof typeof settings.search, value: number | boolean) => {
    updateSettings({
      search: {
        ...settings.search,
        [key]: value,
      },
    });
  };

  const handleUIConfigChange = (key: keyof typeof settings.ui, value: number) => {
    updateSettings({
      ui: {
        ...settings.ui,
        [key]: value,
      },
    });
  };

  const currentProvider = LLM_PROVIDERS[settings.llm.provider];
  const isCustomProvider = settings.llm.provider === 'custom';

    const ModelPricingCard = ({ model, isSelected, onSelect }: { 
    model: ModelInfo; 
    isSelected: boolean; 
    onSelect: () => void;
  }) => (
    <div 
      className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg ${
        isSelected 
          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{model.name}</h4>
          <p className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md mt-1 font-mono">
            {model.actualName}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 px-2 py-1 rounded-lg">
          <DollarSign className="h-3 w-3 text-green-600" />
          <span className="text-xs font-bold text-green-700 dark:text-green-400">
            ${model.inputPrice.toFixed(2)}/${model.outputPrice.toFixed(2)}
          </span>
        </div>
      </div>
      {model.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{model.description}</p>
      )}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
            <div className="text-xs text-gray-500 dark:text-gray-400">Input</div>
            <div className="font-medium text-sm">${model.inputPrice}/1M</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border">
            <div className="text-xs text-gray-500 dark:text-gray-400">Output</div>
            <div className="font-medium text-sm">${model.outputPrice}/1M</div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-800">
          <div className="flex justify-between items-center">
            <span className="text-xs text-orange-700 dark:text-orange-400 font-medium">Cached Input</span>
            <span className="font-bold text-sm text-orange-800 dark:text-orange-300">${model.cachedInputPrice}/1M</span>
          </div>
        </div>
      </div>
      {model.contextWindow && (
        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <span>Context Window:</span>
            <span className="font-medium">{model.contextWindow.toLocaleString()} tokens</span>
          </div>
        </div>
      )}
    </div>
  );

  const ApiKeySection = ({ provider }: { provider: LLMProvider }) => {
    const hasEnvKey = envApiKeys[provider];
    const settingsKey = settings.apiKeys[provider];
    
    return (
      <div className="space-y-2">
        <Label htmlFor={`${provider}-api-key`}>
          {LLM_PROVIDERS[provider].name} API Key
        </Label>
        <div className="space-y-2">
          {hasEnvKey && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <CheckCircle className="h-4 w-4" />
              <span>API key detected in environment variables (takes precedence)</span>
            </div>
          )}
          <Input
            id={`${provider}-api-key`}
            type="password"
            placeholder={hasEnvKey ? "Environment key is being used" : "Enter your API key"}
            value={settingsKey || ''}
            onChange={(e) => handleApiKeyChange(provider, e.target.value)}
            disabled={hasEnvKey}
          />
          {settingsKey && !hasEnvKey && (
            <div className="text-xs text-muted-foreground">
              Key ending in: {maskApiKey(settingsKey).slice(-4)}
            </div>
          )}
          {!hasEnvKey && !settingsKey && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" />
              <span>API key required for this provider</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const FirecrawlApiKeySection = () => {
    const hasEnvKey = firecrawlEnvKey;
    const settingsKey = settings.apiKeys.firecrawl;
    
    return (
      <div className="space-y-2">
        <Label htmlFor="firecrawl-api-key">
          Firecrawl API Key
        </Label>
        <div className="space-y-2">
          {hasEnvKey && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
              <CheckCircle className="h-4 w-4" />
              <span>API key detected in environment variables (takes precedence)</span>
            </div>
          )}
          <Input
            id="firecrawl-api-key"
            type="password"
            placeholder={hasEnvKey ? "Environment key is being used" : "Enter your Firecrawl API key"}
            value={settingsKey || ''}
            onChange={(e) => handleFirecrawlApiKeyChange(e.target.value)}
            disabled={hasEnvKey}
          />
          {settingsKey && !hasEnvKey && (
            <div className="text-xs text-muted-foreground">
              Key ending in: {maskApiKey(settingsKey).slice(-4)}
            </div>
          )}
          {!hasEnvKey && !settingsKey && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
              <AlertCircle className="h-4 w-4" />
              <span>Firecrawl API key required for web search functionality</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Used for web scraping and content extraction. Get your API key from{' '}
          <a 
            href="https://firecrawl.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            firecrawl.dev
          </a>
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-muted/50">
            <TabsTrigger value="llm" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
              <Zap className="h-4 w-4" />
              LLM Provider
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
              <Search className="h-4 w-4" />
              Search Engine
            </TabsTrigger>
            <TabsTrigger value="ui" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
              <Eye className="h-4 w-4" />
              User Interface
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900">
              <MapPin className="h-4 w-4" />
              Roadmap
            </TabsTrigger>
          </TabsList>

          {/* LLM Provider Settings */}
          <TabsContent value="llm" className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Language Model Provider</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={settings.llm.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(LLM_PROVIDERS).map((provider) => (
                        <SelectItem
                          key={provider.id}
                          value={provider.id}
                          disabled={provider.comingSoon}
                        >
                          <div className="flex items-center gap-2">
                            {provider.name}
                            {provider.comingSoon && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                Coming Soon
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentProvider.description}
                  </p>
                </div>

                <Separator />

                <div>
                  <Label htmlFor="temperature">
                    Model Temperature: {settings.llm.temperature}
                  </Label>
                  <div className="mt-2">
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.llm.temperature}
                      onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative (0)</span>
                    <span>Balanced (1)</span>
                    <span>Creative (2)</span>
                  </div>
                </div>

                {/* Model Selection */}
                {currentProvider.availableModels && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Model Selection</h4>
                      
                      <div>
                        <Label htmlFor="fast-model">Fast Model (for quick operations)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          {currentProvider.availableModels.map((model) => (
                            <ModelPricingCard
                              key={`fast-${model.id}`}
                              model={model}
                              isSelected={
                                (settings.llm.customModels?.fast || currentProvider.models.fast) === model.id
                              }
                              onSelect={() => handleModelChange('fast', model.id)}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="quality-model">Quality Model (for final synthesis)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          {currentProvider.availableModels.map((model) => (
                            <ModelPricingCard
                              key={`quality-${model.id}`}
                              model={model}
                              isSelected={
                                (settings.llm.customModels?.quality || currentProvider.models.quality) === model.id
                              }
                              onSelect={() => handleModelChange('quality', model.id)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isCustomProvider && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Custom Provider Configuration</h4>
                      <div>
                        <Label htmlFor="customBaseUrl">Base URL</Label>
                        <Input
                          id="customBaseUrl"
                          placeholder="https://api.example.com/v1"
                          value={settings.llm.customBaseUrl || ''}
                          onChange={(e) => handleCustomBaseUrlChange(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Current Configuration
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Fast Model:</span>
                      <code className="text-blue-900 dark:text-blue-100">
                        {settings.llm.customModels?.fast || currentProvider.models.fast}
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Quality Model:</span>
                      <code className="text-blue-900 dark:text-blue-100">
                        {settings.llm.customModels?.quality || currentProvider.models.quality}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api-keys" className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg">
                  <Key className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">API Key Management</h3>
              </div>
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How API Keys Work
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Environment variables take precedence over settings</li>
                    <li>• API keys stored in settings are encrypted in your browser</li>
                    <li>• Keys are never sent to our servers, only to the respective AI providers</li>
                  </ul>
                </div>

                <FirecrawlApiKeySection />

                {Object.values(LLM_PROVIDERS)
                  .filter(provider => !provider.comingSoon && provider.apiKeyEnv)
                  .map((provider) => (
                    <ApiKeySection key={provider.id} provider={provider.id} />
                  ))}
              </div>
            </div>
          </TabsContent>

          {/* Search Engine Settings */}
          <TabsContent value="search" className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Search Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxQueries">Max Search Queries</Label>
                  <Input
                    id="maxQueries"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.search.MAX_SEARCH_QUERIES}
                    onChange={(e) =>
                      handleSearchConfigChange('MAX_SEARCH_QUERIES', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxSources">Max Sources per Search</Label>
                  <Input
                    id="maxSources"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.search.MAX_SOURCES_PER_SEARCH}
                    onChange={(e) =>
                      handleSearchConfigChange('MAX_SOURCES_PER_SEARCH', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="maxScrape">Max Sources to Scrape</Label>
                  <Input
                    id="maxScrape"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.search.MAX_SOURCES_TO_SCRAPE}
                    onChange={(e) =>
                      handleSearchConfigChange('MAX_SOURCES_TO_SCRAPE', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="minContent">Min Content Length</Label>
                  <Input
                    id="minContent"
                    type="number"
                    min="50"
                    max="1000"
                    value={settings.search.MIN_CONTENT_LENGTH}
                    onChange={(e) =>
                      handleSearchConfigChange('MIN_CONTENT_LENGTH', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="summaryLimit">Summary Character Limit</Label>
                  <Input
                    id="summaryLimit"
                    type="number"
                    min="50"
                    max="500"
                    value={settings.search.SUMMARY_CHAR_LIMIT}
                    onChange={(e) =>
                      handleSearchConfigChange('SUMMARY_CHAR_LIMIT', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="scrapeTimeout">Scrape Timeout (ms)</Label>
                  <Input
                    id="scrapeTimeout"
                    type="number"
                    min="5000"
                    max="60000"
                    step="1000"
                    value={settings.search.SCRAPE_TIMEOUT}
                    onChange={(e) =>
                      handleSearchConfigChange('SCRAPE_TIMEOUT', parseInt(e.target.value))
                    }
                  />
                </div>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <h4 className="font-medium">Advanced Options</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="parallelSummary">Parallel Summary Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate summaries in parallel for faster processing
                    </p>
                  </div>
                  <Switch
                    id="parallelSummary"
                    checked={settings.search.PARALLEL_SUMMARY_GENERATION}
                    onCheckedChange={(checked) =>
                      handleSearchConfigChange('PARALLEL_SUMMARY_GENERATION', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* UI Settings */}
          <TabsContent value="ui" className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">User Interface</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="animationDuration">Animation Duration (ms)</Label>
                  <Input
                    id="animationDuration"
                    type="number"
                    min="100"
                    max="1000"
                    step="50"
                    value={settings.ui.ANIMATION_DURATION}
                    onChange={(e) =>
                      handleUIConfigChange('ANIMATION_DURATION', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="sourceFadeDelay">Source Fade Delay (ms)</Label>
                  <Input
                    id="sourceFadeDelay"
                    type="number"
                    min="0"
                    max="500"
                    step="10"
                    value={settings.ui.SOURCE_FADE_DELAY}
                    onChange={(e) =>
                      handleUIConfigChange('SOURCE_FADE_DELAY', parseInt(e.target.value))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="messageCycleDelay">Message Cycle Delay (ms)</Label>
                  <Input
                    id="messageCycleDelay"
                    type="number"
                    min="500"
                    max="5000"
                    step="100"
                    value={settings.ui.MESSAGE_CYCLE_DELAY}
                    onChange={(e) =>
                      handleUIConfigChange('MESSAGE_CYCLE_DELAY', parseInt(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Roadmap */}
          <TabsContent value="roadmap" className="space-y-6">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Development Roadmap</h3>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Planned Features
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    These features are actively being developed and will be available in upcoming releases.
                  </p>
                </div>

                <div className="grid gap-4">
                  {/* LLM Provider Expansions */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      LLM Provider Expansions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">OpenRouter Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Access to multiple AI models through OpenRouter&apos;s unified API
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <svg height="16" style={{flexShrink: 0, lineHeight: 1}} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <title>Gemini</title>
                            <defs>
                              <linearGradient id="lobe-icons-gemini-fill" x1="0%" x2="68.73%" y1="100%" y2="30.395%">
                                <stop offset="0%" stopColor="#1C7DFF"></stop>
                                <stop offset="52.021%" stopColor="#1C69FF"></stop>
                                <stop offset="100%" stopColor="#F0DCD6"></stop>
                              </linearGradient>
                            </defs>
                            <path d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12" fill="url(#lobe-icons-gemini-fill)" fillRule="nonzero"></path>
                          </svg>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Google Gemini Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Integration with Google&apos;s Gemini Pro and Flash models
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <svg width="16" height="16" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black dark:text-white flex-shrink-0">
                            <path d="M395.479 633.828L735.91 381.105C752.599 368.715 776.454 373.548 784.406 392.792C826.26 494.285 807.561 616.253 724.288 699.996C641.016 783.739 525.151 802.104 419.247 760.277L303.556 814.143C469.49 928.202 670.987 899.995 796.901 773.282C896.776 672.843 927.708 535.937 898.785 412.476L899.047 412.739C857.105 231.37 909.358 158.874 1016.4 10.6326C1018.93 7.11771 1021.47 3.60279 1024 0L883.144 141.651V141.212L395.392 633.916" fill="currentColor"/>
                            <path d="M325.226 695.251C206.128 580.84 226.662 403.776 328.285 301.668C403.431 226.097 526.549 195.254 634.026 240.596L749.454 186.994C728.657 171.88 702.007 155.623 671.424 144.2C533.19 86.9942 367.693 115.465 255.323 228.382C147.234 337.081 113.244 504.215 171.613 646.833C215.216 753.423 143.739 828.818 71.7385 904.916C46.2237 931.893 20.6216 958.87 0 987.429L325.139 695.339" fill="currentColor"/>
                          </svg>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Grok AI Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Support for xAI&apos;s Grok models with real-time capabilities
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <svg fill="currentColor" fill-rule="evenodd" style={{flexShrink: 0, lineHeight: 1}} viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" className="text-orange-500">
                            <title>Anthropic</title>
                            <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"></path>
                          </svg>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Anthropic Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Claude 4 Sonnet and other Anthropic models integration
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 201 201" width="16" height="16">
                            <path fill="#F54F35" d="M0 0h201v201H0V0Z" />
                            <path fill="#FEFBFB" d="m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z" />
                          </svg>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Groq Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Ultra-fast inference with Llama, Mixtral, and Gemma models
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" style={{flex: "none", lineHeight: 1}} viewBox="0 0 24 24" width="16" height="16">
                            <path fill="#4D6BFE" d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078.253.253 0 0 1-.114-.358c.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
                          </svg>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Deepseek Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Advanced reasoning models with competitive performance and cost efficiency
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Local LLM Provider Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Support for local models via Ollama, LM Studio, and other local inference servers
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Self-hosted Firecrawl Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Connect to your own Firecrawl instance for enhanced security and compliance
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Experience Enhancements */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Star className="h-4 w-4 text-blue-500" />
                      Chat Page 2.0
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Discussion the Research</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Interactive discussions about search results with follow-up questions
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">View Active Model</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Real-time display of which models are being used for each search
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Search History</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Browse and revisit previous searches with full context
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Search Analytics</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Insights into search patterns, cost tracking, and performance metrics
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Real-Time Cost Calculator</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Live cost tracking showing exactly how much each search request costs you
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Manual Settings Confirmation</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Explicit save actions for settings changes with confirmation dialogs
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interface & Theme Improvements */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      Interface & Theme Enhancements
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode & Light Mode Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Enhanced theme system with automatic detection and custom themes
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Responsive Design</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Optimized mobile experience with touch-friendly interactions
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-orange-500" />
                      Advanced Features
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Multi-Language Support</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Search and interface localization for global users
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Export & Share</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Export search results to PDF, share research findings easily
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Voice Search</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Speech-to-text input for hands-free research experience
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Custom Search Agents</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Create specialized research agents for specific domains
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* User Experience Improvements */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      User Experience Improvements
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Recommended Modes</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Smart suggestions for optimal model and settings combinations
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                          <h5 className="font-medium text-gray-900 dark:text-gray-100">Client-Side Improvements</h5>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Enhanced performance, caching, and offline capabilities
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    🚀 Stay Updated
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Follow our progress on GitHub and join our community for the latest updates on these exciting features!
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <div className="text-sm text-muted-foreground">
            Your settings are securely stored in your browser&apos;s local storage. We take your privacy seriously - your API keys are kept private and never transmitted to our servers.
          </div>
          <div className="flex gap-2">
            {showResetConfirm ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    resetSettings();
                    setShowResetConfirm(false);
                  }}
                >
                  Confirm Reset
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResetConfirm(true)}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Defaults
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
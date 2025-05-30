'use server';

import { createStreamableValue } from 'ai/rsc';
import { FirecrawlClient } from '@/lib/firecrawl';
import { LangGraphSearchEngine as SearchEngine, SearchEvent } from '@/lib/langgraph-search-engine';

export async function search(query: string, context?: { query: string; response: string }[], apiKey?: string) {
  const stream = createStreamableValue<SearchEvent>();
  
  // Create FirecrawlClient with API key if provided
  const firecrawl = new FirecrawlClient(apiKey);
  const searchEngine = new SearchEngine(firecrawl);

  // Run search in background
  (async () => {
    try {
      // Stream events as they happen
      await searchEngine.search(query, (event) => {
        stream.update(event);
      }, context);
      
      stream.done();
    } catch (error) {
      stream.error(error);
    }
  })();

  return { stream: stream.value };
}
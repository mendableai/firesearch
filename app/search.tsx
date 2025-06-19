'use server';

import { createStreamableValue } from 'ai/rsc';
import { FirecrawlClient } from '@/lib/firecrawl';
import { LangGraphSearchEngine as SearchEngine, SearchEvent } from '@/lib/langgraph-search-engine';

interface BookSearchParams {
  bookName: string;
  author?: string;
  context?: { query: string; response: string }[];
  apiKey?: string;
}

export async function search({ bookName, author, context, apiKey }: BookSearchParams) {
  const stream = createStreamableValue<SearchEvent>();
  
  // Create FirecrawlClient with API key if provided
  const firecrawl = new FirecrawlClient(apiKey);
  const searchEngine = new SearchEngine(firecrawl);

  // Run search in background
  (async () => {
    try {
      // Stream events as they happen
      // The searchEngine will internally use bookName and author to generate queries
      await searchEngine.search(bookName, author, (event) => {
        stream.update(event);
      }, context);
      
      stream.done();
    } catch (error) {
      stream.error(error);
    }
  })();

  return { stream: stream.value };
}
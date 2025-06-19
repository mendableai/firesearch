import { StateGraph, END, START, Annotation, MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { FirecrawlClient } from './firecrawl';
import { ContextProcessor } from './context-processor';
import { SEARCH_CONFIG, MODEL_CONFIG } from './config';

// Event types remain the same for frontend compatibility
export type SearchPhase = 
  | 'understanding'
  | 'planning' 
  | 'searching'
  | 'analyzing'
  | 'synthesizing'
  | 'complete'
  | 'error';

export type SearchEvent = 
  | { type: 'phase-update'; phase: SearchPhase; message: string }
  | { type: 'thinking'; message: string }
  | { type: 'searching'; query: string; index: number; total: number }
  | { type: 'found'; sources: Source[]; query: string }
  | { type: 'scraping'; url: string; index: number; total: number; query: string } // query here is the user's original query for context
  | { type: 'content-chunk'; chunk: string }
  | { type: 'final-result'; content: string; sources: Source[]; followUpQuestions?: string[] }
  | { type: 'error'; error: string; errorType?: ErrorType }
  | { type: 'source-processing'; url: string; title: string; stage: 'browsing' | 'extracting' | 'analyzing' }
  | { type: 'source-complete'; url: string; summary: string };

export type ErrorType = 'search' | 'scrape' | 'llm' | 'unknown';

export interface Source {
  url: string;
  title: string;
  content?: string;
  quality?: number; // Optional: could be relevance score to a specific query
  summary?: string; // Optional: short summary of the source content
}

export interface SearchResult {
  url: string;
  title: string;
  content?: string; // Markdown content from Firecrawl search
  markdown?: string; // Ensure markdown is prioritized
}

export interface SearchStep {
  id: SearchPhase | string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  startTime?: number;
}

// Proper LangGraph state using Annotation with reducers
const SearchStateAnnotation = Annotation.Root({
  // Input fields
  bookName: Annotation<string>({ // New: Book Name
    reducer: (_, y) => y ?? "",
    default: () => ""
  }),
  author: Annotation<string | undefined>({ // New: Author (optional)
    reducer: (_, y) => y,
    default: () => undefined
  }),
  query: Annotation<string>({ // Retained for internal use, like the main topic for LLMs
    reducer: (_, y) => y ?? "",
    default: () => ""
  }),
  context: Annotation<{ query: string; response: string }[] | undefined>({
    reducer: (_, y) => y,
    default: () => undefined
  }),
  
  // Process fields
  understanding: Annotation<string | undefined>({ // What the agent understands it needs to do
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  searchQueries: Annotation<string[] | undefined>({ // The list of queries to execute
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  currentSearchIndex: Annotation<number>({ // Index for iterating through searchQueries
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  
  // Results fields - with proper array reducers
  sources: Annotation<Source[]>({ // Aggregated sources from all search queries
    reducer: (existing: Source[], update: Source[] | undefined) => {
      if (!update) return existing;
      const sourceMap = new Map<string, Source>();
      [...existing, ...update].forEach(source => {
        // If new source has content and existing one doesn't, or new one is simply preferred
        const existingSource = sourceMap.get(source.url);
        if (!existingSource || (source.content && !existingSource.content) || source.content) {
          sourceMap.set(source.url, source);
        }
      });
      return Array.from(sourceMap.values());
    },
    default: () => []
  }),
  scrapedSources: Annotation<Source[]>({ // Sources that needed explicit scraping (not used much if search scrapes)
    reducer: (existing: Source[], update: Source[] | undefined) => {
      if (!update) return existing;
      // Similar deduplication/update logic as sources
      const sourceMap = new Map<string, Source>();
      [...existing, ...update].forEach(source => {
         const existingSource = sourceMap.get(source.url);
        if (!existingSource || (source.content && !existingSource.content) || source.content) {
          sourceMap.set(source.url, source);
        }
      });
      return Array.from(sourceMap.values());
    },
    default: () => []
  }),
  processedSources: Annotation<Source[] | undefined>({ // Sources after filtering/ranking for synthesis
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  finalAnswer: Annotation<string | undefined>({ // The final generated book summary
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  followUpQuestions: Annotation<string[] | undefined>({ // Potentially "Key Themes" or similar for books
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  
  // Answer tracking - This might be less relevant for book summaries
  // subQueries: Annotation<Array<{
  //   question: string; // e.g., "What is the plot?"
  //   searchQuery: string; // The actual query used for this sub-question
  //   answered: boolean;
  //   answer?: string;
  //   confidence: number;
  //   sources: string[]; // URLs
  // }> | undefined>({
  //   reducer: (x, y) => y ?? x,
  //   default: () => undefined
  // }),
  searchAttempt: Annotation<number>({ // Could be used if initial searches don't yield enough
    reducer: (x, y) => y ?? x,
    default: () => 0
  }),
  
  // Control fields
  phase: Annotation<SearchPhase>({
    reducer: (x, y) => y ?? x,
    default: () => 'understanding' as SearchPhase
  }),
  error: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  errorType: Annotation<ErrorType | undefined>({
    reducer: (x, y) => y ?? x,
    default: () => undefined
  }),
  maxRetries: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => SEARCH_CONFIG.MAX_RETRIES
  }),
  retryCount: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0
  })
});

type SearchState = typeof SearchStateAnnotation.State;

// Define config type for proper event handling
interface GraphConfig {
  configurable?: {
    eventCallback?: (event: SearchEvent) => void;
    checkpointId?: string; // For potential future use with LangGraph persistence
  };
}

export class LangGraphSearchEngine {
  private firecrawl: FirecrawlClient;
  private contextProcessor: ContextProcessor;
  private graph: ReturnType<typeof this.buildGraph>;
  private llm: ChatOpenAI; // For non-streaming tasks
  private streamingLlm: ChatOpenAI; // For streaming the final answer
  private checkpointer?: MemorySaver;

  constructor(firecrawl: FirecrawlClient, options?: { enableCheckpointing?: boolean }) {
    this.firecrawl = firecrawl;
    this.contextProcessor = new ContextProcessor();
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    
    this.llm = new ChatOpenAI({
      modelName: MODEL_CONFIG.FAST_MODEL,
      temperature: MODEL_CONFIG.TEMPERATURE,
      openAIApiKey: apiKey,
    });
    
    this.streamingLlm = new ChatOpenAI({
      modelName: MODEL_CONFIG.QUALITY_MODEL, // Use quality model for the summary
      temperature: MODEL_CONFIG.TEMPERATURE,
      streaming: true,
      openAIApiKey: apiKey,
    });

    if (options?.enableCheckpointing) {
      this.checkpointer = new MemorySaver();
    }
    
    this.graph = this.buildGraph();
  }

  getInitialSteps(): SearchStep[] {
    // These steps can be generic and still apply
    return [
      { id: 'understanding', label: 'Understanding request', status: 'pending' },
      { id: 'planning', label: 'Planning search strategy', status: 'pending' },
      { id: 'searching', label: 'Gathering information', status: 'pending' },
      { id: 'analyzing', label: 'Analyzing sources', status: 'pending' },
      { id: 'synthesizing', label: 'Generating summary', status: 'pending' },
      { id: 'complete', label: 'Complete', status: 'pending' }
    ];
  }

  private buildGraph() {
    const analyzeBookRequest = this.analyzeBookRequest.bind(this);
    const scoreContentRelevance = this.scoreContentRelevance.bind(this);
    const summarizeSourceForBook = this.summarizeSourceForBook.bind(this);
    const generateStreamingBookSummary = this.generateStreamingBookSummary.bind(this);
    const generateKeyThemes = this.generateKeyThemes.bind(this); // New method for "follow-up"
    const firecrawl = this.firecrawl;
    const contextProcessor = this.contextProcessor; // May need adjustment or less emphasis
    
    const workflow = new StateGraph(SearchStateAnnotation)
      .addNode("understand", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        if (eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'understanding', message: 'Understanding book request...' });
        }
        
        try {
          // The "query" for analysis will be the book title and author
          const understanding = await analyzeBookRequest(state.bookName, state.author, state.context);
          if (eventCallback) {
            eventCallback({ type: 'thinking', message: understanding });
          }
          return { understanding, query: `Summary of "${state.bookName}"${state.author ? ` by ${state.author}` : ''}`, phase: 'planning' as SearchPhase };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Failed to understand request', errorType: 'llm' as ErrorType, phase: 'error' as SearchPhase };
        }
      })
      
      .addNode("plan", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        if (eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'planning', message: 'Devising search plan for the book...' });
        }
        
        try {
          const bookName = state.bookName;
          const author = state.author;
          
          let searchQueries: string[] = [
            `"${bookName}" summary`,
            `"${bookName}" book review`,
            `"${bookName}" detailed summary`,
            `"${bookName}" analysis`,
            `"${bookName}" key takeaways`,
            `best summaries of "${bookName}"`,
          ];
          if (author) {
            searchQueries.push(`"${bookName}" by ${author} summary`);
            searchQueries.push(`"${bookName}" by ${author} review`);
            searchQueries.push(`"${bookName}" by ${author} detailed analysis`);
          }
          // Ensure we don't exceed MAX_SEARCH_QUERIES from config, though we might want more for books
          searchQueries = searchQueries.slice(0, SEARCH_CONFIG.MAX_BOOK_SUMMARY_QUERIES);


          if (eventCallback) {
            eventCallback({ type: 'thinking', message: `Planning to search with ${searchQueries.length} different queries to gather comprehensive information about "${bookName}".` });
          }
          
          return {
            searchQueries,
            currentSearchIndex: 0,
            phase: 'searching' as SearchPhase
          };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Failed to plan search strategy', errorType: 'llm'as ErrorType, phase: 'error'as SearchPhase };
        }
      })

      .addNode("search", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        const searchQueries = state.searchQueries || [];
        const currentIndex = state.currentSearchIndex || 0;
        
        if (currentIndex === 0 && eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'searching', message: 'Gathering information from various sources...' });
        }
        
        if (currentIndex >= searchQueries.length) {
          // All planned searches are done, move to scraping/analyzing
          // If Firecrawl's search includes scraping, 'scrape' node might be light
          return { phase: 'scrape' as SearchPhase };
        }
        
        const currentQuery = searchQueries[currentIndex];
        if (eventCallback) {
          eventCallback({ type: 'searching', query: currentQuery, index: currentIndex + 1, total: searchQueries.length });
        }
        
        try {
          const results = await firecrawl.search(currentQuery, {
            limit: SEARCH_CONFIG.MAX_SOURCES_PER_BOOK_QUERY, // Configurable: sources per specific query
            scrapeOptions: { formats: ['markdown'] } // Crucial: get content directly
          });
          
          const newSources: Source[] = results.data
            .filter((r: SearchResult) => r.markdown && r.markdown.length > SEARCH_CONFIG.MIN_CONTENT_LENGTH_FOR_SOURCE) // Filter out very short/empty pages
            .map((r: SearchResult) => ({
              url: r.url,
              title: r.title,
              content: r.markdown || r.content || '', // Prefer markdown
              quality: 0 // Will be scored later
          }));
          
          if (eventCallback) {
            eventCallback({ type: 'found', sources: newSources, query: currentQuery });
          }

          // Parallel processing of sources (scoring and initial summary)
          await Promise.all(newSources.map(async (source) => {
            if (eventCallback) {
              eventCallback({ type: 'source-processing', url: source.url, title: source.title, stage: 'browsing' });
            }
            source.quality = scoreContentRelevance(source.content || '', state.bookName, state.author);
            if (source.content && source.content.length > SEARCH_CONFIG.MIN_CONTENT_LENGTH_FOR_SUMMARY) {
              const summary = await summarizeSourceForBook(source.content, state.bookName, currentQuery);
              if (summary && !summary.toLowerCase().includes('no specific information')) {
                source.summary = summary;
                if (eventCallback) {
                  eventCallback({ type: 'source-complete', url: source.url, summary: summary });
                }
              }
            }
          }));
          
          return {
            sources: newSources, // newSources will be merged with existing by the reducer
            currentSearchIndex: currentIndex + 1
          };
        } catch (error) {
          console.warn(`Search for query "${currentQuery}" failed:`, error);
          // Still increment index to try next query, report error if needed via event
          if (eventCallback) {
            eventCallback({ type: 'error', error: `Search for "${currentQuery}" failed.`, errorType: 'search' });
          }
          return {
            currentSearchIndex: currentIndex + 1,
            // error: `Search for query "${currentQuery}" failed.`, // Avoid setting global error yet
            // errorType: 'search' as ErrorType
          };
        }
      })
      
      .addNode("scrape", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        // This node might be less critical if Firecrawl search already scrapes.
        // It could be used for sources found via other means or if initial scrape was shallow.
        // For now, we assume search node gets enough content.
        if (eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'analyzing', message: 'Consolidating information...' });
        }
        // Directly pass to analyzing, assuming search node did its job
        return {
          scrapedSources: state.sources, // Pass all good sources from search
          phase: 'analyzing' as SearchPhase
        };
      })
      
      .addNode("analyze", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        if (eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'analyzing', message: 'Selecting best information for summary...' });
        }
        
        const allSources = state.sources || []; // Reducer already deduped and merged sources
        
        if (allSources.length < SEARCH_CONFIG.MIN_SOURCES_FOR_BOOK_SUMMARY) {
          // Not enough sources, could try to broaden search if implemented, or error out
          if (eventCallback) {
            eventCallback({ type: 'thinking', message: `Found ${allSources.length} sources. Ideally, we need at least ${SEARCH_CONFIG.MIN_SOURCES_FOR_BOOK_SUMMARY} for a good summary.` });
          }
          // For now, proceed if some sources exist, otherwise error.
          if (allSources.length === 0) {
            return { error: `Could not find enough information about "${state.bookName}" to generate a summary.`, errorType: 'search' as ErrorType, phase: 'error' as SearchPhase };
          }
        } else if (eventCallback) {
            eventCallback({ type: 'thinking', message: `Gathered information from ${allSources.length} sources for "${state.bookName}".`});
        }

        try {
          // The contextProcessor might need to be adapted for book summaries.
          // For now, we can assume it filters/ranks sources based on relevance and content quality.
          // The "query" for processSources should be the general book topic.
          const processedSources = await contextProcessor.processSources(
            state.query, // state.query is `Summary of "Book Name" by Author`
            allSources,
            state.searchQueries || [] // Pass original search queries for context
          );
          
          return {
            processedSources: processedSources.length > 0 ? processedSources : allSources, // Fallback to allSources if processing returns empty
            phase: 'synthesizing' as SearchPhase
          };
        } catch (error) {
          console.error("Error processing sources:", error);
          // Fallback to using all gathered sources if processing fails
          return {
            processedSources: allSources,
            phase: 'synthesizing' as SearchPhase
          };
        }
      })
      
      .addNode("synthesize", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        if (eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'synthesizing', message: `Crafting detailed summary for "${state.bookName}"...` });
        }
        
        try {
          const sourcesToUse = state.processedSources || state.sources || [];
          if (sourcesToUse.length === 0) {
            return { error: "No information available to synthesize the summary.", errorType: 'llm' as ErrorType, phase: 'error' as SearchPhase };
          }
          
          const summary = await generateStreamingBookSummary(
            state.bookName,
            state.author,
            sourcesToUse,
            (chunk) => {
              if (eventCallback) {
                eventCallback({ type: 'content-chunk', chunk });
              }
            },
            state.context // Pass conversation context if any
          );
          
          // Generate key themes (replaces follow-up questions for books)
          const keyThemes = await generateKeyThemes(state.bookName, summary, sourcesToUse);
          
          return {
            finalAnswer: summary,
            followUpQuestions: keyThemes, // Re-using this field for key themes
            phase: 'complete' as SearchPhase
          };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Failed to generate book summary', errorType: 'llm' as ErrorType, phase: 'error' as SearchPhase };
        }
      })
      
      .addNode("handleError", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        if (eventCallback) {
          eventCallback({ type: 'error', error: state.error || 'An unknown error occurred', errorType: state.errorType });
        }
        // For book summaries, retrying might involve different strategies not yet implemented.
        // For now, we'll end on error.
        return { phase: 'error' as SearchPhase }; // Ends the process
      })
      
      .addNode("complete", async (state: SearchState, config?: GraphConfig): Promise<Partial<SearchState>> => {
        const eventCallback = config?.configurable?.eventCallback;
        if (eventCallback) {
          eventCallback({ type: 'phase-update', phase: 'complete', message: 'Book summary generation complete!' });
          eventCallback({
            type: 'final-result',
            content: state.finalAnswer || '',
            sources: state.sources || [], // All unique sources found
            followUpQuestions: state.followUpQuestions // Key themes
          });
        }
        return { phase: 'complete' as SearchPhase };
      });

    workflow
      .addEdge(START, "understand")
      .addConditionalEdges("understand", (state: SearchState) => state.phase === 'error' ? "handleError" : "plan")
      .addConditionalEdges("plan", (state: SearchState) => state.phase === 'error' ? "handleError" : "search")
      .addConditionalEdges("search", (state: SearchState) => {
        if (state.phase === 'error') return "handleError"; // Should be rare here, individual query errors handled inside
        if ((state.currentSearchIndex || 0) < (state.searchQueries?.length || 0)) {
          return "search"; // Continue with next search query
        }
        return "scrape"; // All searches done, move to scrape/analyze
      })
      .addConditionalEdges("scrape", (state: SearchState) => state.phase === 'error' ? "handleError" : "analyze") // scrape is now a pass-through
      .addConditionalEdges("analyze", (state: SearchState) => state.phase === 'error' ? "handleError" : "synthesize")
      .addConditionalEdges("synthesize", (state: SearchState) => state.phase === 'error' ? "handleError" : "complete")
      .addEdge("handleError", END) // Error leads to end
      .addEdge("complete", END);

    return workflow.compile(this.checkpointer ? { checkpointer: this.checkpointer } : undefined);
  }

  async search(
    bookName: string, // Changed from query
    author: string | undefined, // New parameter
    onEvent: (event: SearchEvent) => void,
    context?: { query: string; response: string }[], // Context from previous interactions (if any)
    checkpointId?: string
  ): Promise<void> {
    try {
      const initialState: SearchState = {
        bookName,
        author,
        query: `Summary of "${bookName}"${author ? ` by ${author}` : ''}`, // Internal query representation
        context,
        sources: [],
        scrapedSources: [],
        processedSources: undefined,
        phase: 'understanding',
        currentSearchIndex: 0,
        maxRetries: SEARCH_CONFIG.MAX_RETRIES, // This might be less relevant now
        retryCount: 0,
        understanding: undefined,
        searchQueries: undefined,
        finalAnswer: undefined,
        followUpQuestions: undefined, // Will hold key themes
        error: undefined,
        errorType: undefined,
        // subQueries: undefined, // Not using subQueries in the same way
        searchAttempt: 0
      };

      const config: GraphConfig = {
        configurable: {
          eventCallback: onEvent,
          ...(checkpointId && this.checkpointer ? { thread_id: checkpointId } : {})
        }
      };
      // Increased recursion limit might still be useful if graph is deep
      await this.graph.invoke(initialState, { ...config, recursionLimit: 35 });
    } catch (error) {
      onEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Book summary generation failed',
        errorType: 'unknown'
      });
    }
  }

  private getCurrentDateContext(): string {
    const now = new Date();
    return `Today's date is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }

  private async analyzeBookRequest(bookName: string, author?: string, context?: { query: string; response: string }[]): Promise<string> {
    let contextPrompt = '';
    if (context && context.length > 0) {
      contextPrompt = '\n\nPrevious conversation for context:\n';
      context.forEach(c => {
        contextPrompt += `User: ${c.query}\nAssistant: ${c.response.substring(0, SEARCH_CONFIG.CONTEXT_PREVIEW_LENGTH)}...\n\n`;
      });
    }
    const queryDescription = `User wants a detailed summary for the book titled "${bookName}"` + (author ? ` by ${author}` : '') + ".";
    
    const messages = [
      new SystemMessage(`${this.getCurrentDateContext()}
You are an AI assistant tasked with generating a book summary.
Confirm your understanding of the request. State that you will gather information from multiple online sources to create a comprehensive summary.
Keep it concise and professional.`),
      new HumanMessage(`${queryDescription}${contextPrompt}`)
    ];
    
    const response = await this.llm.invoke(messages);
    return response.content.toString();
  }

  // Simplified scoring: relevance to book title and author
  private scoreContentRelevance(content: string, bookName: string, author?: string): number {
    const contentLower = content.toLowerCase();
    const bookNameLower = bookName.toLowerCase();
    let score = 0;

    if (contentLower.includes(bookNameLower)) {
      score += 0.5;
    }
    // More sophisticated scoring could count occurrences, proximity etc.
    // For now, simple presence is a basic check.

    if (author) {
      const authorLower = author.toLowerCase();
      if (contentLower.includes(authorLower)) {
        score += 0.3;
      }
    }
    // Add points if terms like "summary", "review", "chapter", "plot" appear
    const summaryKeywords = ["summary", "review", "plot", "chapter", "analysis", "takeaway"];
    if (summaryKeywords.some(keyword => contentLower.includes(keyword))) {
        score += 0.2;
    }
    return Math.min(score, 1);
  }

  // Adapted summarization for book context
  private async summarizeSourceForBook(content: string, bookName: string, originalSearchQuery: string): Promise<string> {
    try {
      const messages = [
        new SystemMessage(`${this.getCurrentDateContext()}
You are tasked with extracting a key piece of information relevant to the book "${bookName}" from the provided text.
The text was found using the search query: "${originalSearchQuery}".
Focus on information that would be useful for a book summary (e.g., plot points, character descriptions, main themes, author's arguments, key facts or examples if non-fiction).

Instructions:
- Return ONE concise sentence (max ${SEARCH_CONFIG.SUMMARY_CHAR_LIMIT} characters).
- If the text provides a direct quote related to the book's themes or critical reception, that's valuable.
- If it mentions specific chapter content or plot details, extract that.
- If no highly relevant information for a summary of "${bookName}" is found, state "No specific summary points found in this excerpt."
- Do not invent information. Stick to the provided text.`),
        new HumanMessage(`Book: "${bookName}"\nOriginal Search Query: "${originalSearchQuery}"\n\nContent to summarize: ${content.slice(0, 3000)}`) // Increased slice for better context
      ];
      
      const response = await this.llm.invoke(messages);
      return response.content.toString().trim();
    } catch (error) {
      console.warn("Source summarization for book failed:", error);
      return ''; // Return empty on error
    }
  }

import { ATOMIC_HABITS_EXAMPLE_SUMMARY } from './prompt-examples'; // Import the example

// This is the new core function for generating the book summary.
// It will incorporate the "Atomic Habits" example in its prompt.
private async generateStreamingBookSummary(
  bookName: string,
  author: string | undefined,
  sources: Source[],
  onChunk: (chunk: string) => void,
  context?: { query: string; response: string }[]
): Promise<string> {
  const sourcesText = sources
    .slice(0, SEARCH_CONFIG.MAX_SOURCES_FOR_SYNTHESIS) // Limit sources for the prompt
    .map((s, i) => {
      let sourceEntry = `[Source ${i + 1}: ${s.title} (${s.url})]\n`;
      if (s.summary) { // Prefer using the pre-generated summary of the source
          sourceEntry += `Key information from this source: ${s.summary}\n`;
      }
      if (s.content) {
           // Add a snippet of the content for more direct info, especially if summary is missing/short
          sourceEntry += `Content excerpt: ${s.content.substring(0, 1500)}...\n`; // Slightly longer excerpt
      } else {
          sourceEntry += "[No content excerpt available]\n";
      }
      return sourceEntry;
    })
    .join('\n---\n');

  const bookTopic = `the book "${bookName}"` + (author ? ` by ${author}` : '');

  let contextPrompt = '';
  if (context && context.length > 0) {
    contextPrompt = '\n\nPrevious conversation for context (if relevant):\n';
    context.forEach(c => {
      contextPrompt += `User: ${c.query}\nAssistant: ${c.response.substring(0, 300)}...\n\n`;
    });
  }

  const systemPrompt = `${this.getCurrentDateContext()}
You are an expert book summarizer. Your task is to generate a comprehensive, detailed, long-form summary for ${bookTopic}, similar in style, length, and structure to the provided example.
The summary should be substantial, aiming for a 30-minute read time, which means several thousand words.

INSTRUCTIONS:
1.  **Understand the Sources:** Carefully review the provided source materials. These contain summaries, reviews, analyses, and potentially excerpts from various websites.
2.  **Synthesize, Don't Copy:** Create an ORIGINAL and COHERENT summary by synthesizing the information. Do NOT directly copy-paste sentences or paragraphs from the sources. Rephrase and integrate ideas smoothly.
3.  **Structure:** Organize the summary logically. Use Markdown for clear formatting:
    *   Use H1 (#) for the main book title (if you reiterate it) and major sections like "Introduction", "Conclusion".
    *   Use H2 (##) for main parts or chapters of the book's ideas.
    *   Use H3 (###) and H4 (####) for sub-sections and finer details.
    *   Use blockquotes (>) for any direct quotes FROM THE BOOK ITSELF (if such quotes are clearly identifiable in the provided source materials and attributed to the book's author). If quoting a reviewer or a summary website, make that clear or avoid it.
    *   Use bold text (**) for emphasis on key terms, concepts, or chapter titles within your summary.
    *   Use bulleted lists (-) or numbered lists (1.) for key points, steps, rules, or examples discussed in the book.
4.  **Content and Tone:**
    *   Start with an engaging introduction: Hook the reader, introduce the book, its author, and its central premise or importance.
    *   Systematically cover the main ideas, arguments, concepts, plot points (for fiction), characters (for fiction), and themes of the book.
    *   For non-fiction: Explain core principles, methodologies, and provide illustrative examples if these are detailed in the sources.
    *   For fiction: Outline the main plot arcs, describe key characters and their development, and discuss major literary themes and symbolism.
    *   Maintain a knowledgeable, engaging, yet objective and analytical tone. Your voice should be that of an expert guide to the book.
    *   Conclude with a section that summarizes the book's main message, its overall impact or significance, and perhaps who would benefit most from reading the original book. A "personal application" or "how I'm using this book" section, like in the example, can be very effective if the source material provides enough information to inspire it.
5.  **Length and Detail:** Aim for a very substantial summary. The example provided for "Atomic Habits" is a benchmark for the expected depth, detail, and length. This means multiple layered sections, detailed explanations of concepts, and thorough coverage of the book's content as reflected in the sources. A "30-minute read" implies a word count likely in the 4000-7000 range. Be comprehensive.
6.  **Originality:** Your primary goal is to create a NEW summary based on the *information* from the sources, not to combine existing summaries. The example shows how to structure an original, long-form piece.
7.  **Use the Example as a Guide:** The provided "Atomic Habits" summary is your GOLD STANDARD for style, structure, sectioning, use of formatting, depth of explanation, and overall flow. Emulate its comprehensiveness.

EXAMPLE SUMMARY (This is your guide for style, structure, and length):
--- START OF EXAMPLE ---
${ATOMIC_HABITS_EXAMPLE_SUMMARY}
--- END OF EXAMPLE ---

Now, generate the detailed, long-form book summary for ${bookTopic} based on the following sources. Ensure the output is well-structured Markdown.
${contextPrompt}
Sources:
${sourcesText}
`;

  const messages = [
    new SystemMessage(systemPrompt),
    new HumanMessage(`Please generate the detailed book summary for "${bookName}"` + (author ? ` by ${author}` : '') + ".")
  ];

  let fullText = '';
  try {
    const stream = await this.streamingLlm.stream(messages);
    for await (const chunk of stream) {
      const content = chunk.content;
      if (typeof content === 'string') {
        fullText += content;
        onChunk(content);
      }
    }
  } catch (error) {
    console.error("Streaming LLM call failed for book summary:", error);
    const errorMsg = `\n\n[Error generating the book summary: ${error instanceof Error ? error.message : "An unknown error occurred during LLM streaming."}]`;
    onChunk(errorMsg);
    // Do not throw here if you want the graph to potentially handle it or finish "gracefully" with an error message.
    // However, for critical failure in synthesis, throwing might be appropriate if handled by an error node.
    // For now, let's append error and return, allowing flow to 'complete'.
    fullText += errorMsg;
  }

  return fullText;
}

// Replaces generateFollowUpQuestions for book summaries
  private async generateKeyThemes(
    bookName: string,
    summary: string, // The generated summary
    _sources: Source[] // Sources might be used for more context if needed
  ): Promise<string[]> {
    try {
      const messages = [
        new SystemMessage(`${this.getCurrentDateContext()}
Based on the book "${bookName}" and its provided summary, identify 3-5 key themes or major takeaways from the book.
These should be distinct and significant aspects that a reader would find important.

Instructions:
- Generate 3 to 5 key themes.
- Each theme should be a concise phrase or short sentence.
- Return only the themes, one per line, no numbering or bullets.
- Keep each theme under 100 characters.

Example (for a hypothetical book on leadership):
The importance of empathetic communication
Building trust through transparency
Fostering a growth mindset in teams
Leading by example`),
        new HumanMessage(`Book: "${bookName}"\n\nGenerated Summary (excerpt): ${summary.length > 1500 ? summary.slice(0, 1500) + '...' : summary}`)
      ];
      
      const response = await this.llm.invoke(messages);
      const themes = response.content.toString()
        .split('\n')
        .map(q => q.trim().replace(/^[-*]\s*/, '')) // Remove bullets/dashes
        .filter(q => q.length > 0 && q.length < 100)
        .slice(0, 5); // Max 5 themes
      
      return themes.length > 0 ? themes : [];
    } catch (error) {
      console.warn("Failed to generate key themes:", error);
      return []; // Return empty array on error
    }
  }

  // Methods like extractSubQueries, checkAnswersInSources, generateAlternativeSearchQueries
  // are less relevant in their current form for the book summary task.
  // They would need significant adaptation if we wanted to, for example,
  // ensure specific aspects of a book (plot, characters, themes) are covered.
  // For now, the multiple broad search queries and a powerful synthesis prompt are the primary strategy.
}
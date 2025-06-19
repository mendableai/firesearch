'use client';

import { useState, useEffect, useRef } from 'react';
import { search } from './search';
import { readStreamableValue } from 'ai/rsc';
import { SearchDisplay } from './search-display';
import { SearchEvent, Source } from '@/lib/langgraph-search-engine';
import { MarkdownRenderer } from './markdown-renderer';
import { CitationTooltip } from './citation-tooltip';
import Image from 'next/image';
import { getFaviconUrl, getDefaultFavicon, markFaviconFailed } from '@/lib/favicon-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Helper component for sources list
function SourcesList({ sources }: { sources: Source[] }) {
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);
  const [expandedSourceIndex, setExpandedSourceIndex] = useState<number | null>(null);
  
  return (
    <>
      {/* Sources button with favicon preview */}
      <div className="mt-6 flex items-center gap-3">
        <div className="flex -space-x-2">
          {(() => {
            // Get unique domains
            const uniqueDomains = new Map<string, Source>();
            sources.forEach(source => {
              try {
                const domain = new URL(source.url).hostname;
                if (!uniqueDomains.has(domain)) {
                  uniqueDomains.set(domain, source);
                }
              } catch {}
            });
            const uniqueSources = Array.from(uniqueDomains.values());
            
            return (
              <>
                {uniqueSources.slice(0, 5).map((source, i) => (
                  <Image 
                    key={i}
                    src={getFaviconUrl(source.url)} 
                    alt=""
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-white"
                    style={{ zIndex: 5 - i }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.src = getDefaultFavicon(24);
                      markFaviconFailed(source.url);
                    }}
                  />
                ))}
                {uniqueSources.length > 5 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">+{uniqueSources.length - 5}</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <button
          onClick={() => setShowSourcesPanel(true)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-2"
        >
          <span>View {sources.length} sources & page contents</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Click-away overlay */}
      {showSourcesPanel && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowSourcesPanel(false)}
        />
      )}
      
      {/* Sources Panel */}
      <div className={`fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
        showSourcesPanel ? 'translate-x-0' : 'translate-x-full'
      } z-40 overflow-y-auto scrollbar-hide`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Sources ({sources.length})</h3>
            <button
              onClick={() => setShowSourcesPanel(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-2">
            {sources.map((source, i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden transition-colors">
                <div 
                  className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${expandedSourceIndex === i ? '' : 'rounded-lg'}`}
                  onClick={() => setExpandedSourceIndex(expandedSourceIndex === i ? null : i)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-orange-600 mt-0.5">[{i + 1}]</span>
                    <Image 
                      src={getFaviconUrl(source.url)} 
                      alt=""
                      width={20}
                      height={20}
                      className="w-5 h-5 mt-0.5 flex-shrink-0"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.src = getDefaultFavicon(20);
                        markFaviconFailed(source.url);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-sm text-gray-900 dark:text-gray-100 hover:text-orange-600 dark:hover:text-orange-400 line-clamp-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {source.title}
                      </a>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {new URL(source.url).hostname}
                      </p>
                    </div>
                    <svg 
                      className={`w-4 h-4 text-gray-400 transition-transform ${expandedSourceIndex === i ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {expandedSourceIndex === i && source.content && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {source.content.length.toLocaleString()} characters
                      </span>
                    </div>
                    <div className="p-4 max-h-96 overflow-y-auto scrollbar-hide">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={source.content} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function Chat() {
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string | React.ReactNode;
    isSearch?: boolean; // Indicates if this message is part of the search process display
    searchResults?: string; // Store raw search results string for context if needed
    bookName?: string; // To display what book was searched for
    author?: string;
  }>>([]);
  const [bookNameInput, setBookNameInput] = useState('');
  const [authorInput, setAuthorInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  // const [showSuggestions, setShowSuggestions] = useState(false); // Suggestions not used for book summary
  // const [hasShownSuggestions, setHasShownSuggestions] = useState(false);
  const [firecrawlApiKey, setFirecrawlApiKey] = useState<string>('');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);
  const [, setIsCheckingEnv] = useState<boolean>(true); // To manage env check state
  const [pendingSearch, setPendingSearch] = useState<{ bookName: string; author?: string } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);


  // Check for environment variables on mount
  useEffect(() => {
    const checkEnvironment = async () => {
      setIsCheckingEnv(true);
      try {
        const response = await fetch('/api/check-env');
        const data = await response.json();
        
        if (data.environmentStatus) {
          setHasApiKey(data.environmentStatus.FIRECRAWL_API_KEY);
        }
      } catch (error) {
        console.error('Failed to check environment:', error);
        setHasApiKey(false); // Assume no key if check fails
      } finally {
        setIsCheckingEnv(false);
      }
    };

    checkEnvironment();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const saveApiKeyAndSearch = () => {
    if (firecrawlApiKey.trim()) {
      setHasApiKey(true);
      setShowApiKeyModal(false);
      toast.success('API key saved! Starting your book summary generation...');
      
      if (pendingSearch) {
        performSearch(pendingSearch.bookName, pendingSearch.author);
        setPendingSearch(null);
      }
    }
  };

  // Listen for follow-up question (key theme) events
  useEffect(() => {
    const handleFollowUp = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const theme = customEvent.detail.question; // Re-using 'question' for theme
      // For book summaries, clicking a theme might mean asking a new question about it
      // For now, let's just set it in the input field for a new search if desired
      // Or it could trigger a more specific search related to that theme + book.
      // For simplicity, we'll just log it or potentially set it for a new input.
      // User can then refine or search.
      // setBookNameInput(`${messages[messages.length-1]?.bookName} - ${theme}`); // Example: prefill
      // setAuthorInput(messages[messages.length-1]?.author || '');
      toast.info(`Exploring theme: ${theme}. You can ask a new question related to this theme and the book.`);
    };

    document.addEventListener('followUpQuestion', handleFollowUp);
    return () => {
      document.removeEventListener('followUpQuestion', handleFollowUp);
    };
  }, [messages]);

  const performSearch = async (bookName: string, author?: string) => {
    setIsSearching(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const events: SearchEvent[] = [];
    
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: <SearchDisplay events={events} />, // Shows "Understanding request..." etc.
      isSearch: true,
      bookName, // Store for context
      author
    }]);

    try {
      const conversationContext: Array<{ query: string; response: string }> = [];
      // Context building might be less relevant for first summary of a book.
      // Could be used if user asks follow-up questions about the summary later.
      // For now, keeping it simple.
      
      const { stream } = await search({
        bookName,
        author,
        context: conversationContext,
        apiKey: firecrawlApiKey || undefined
      });
      let finalContent = '';
      
      let streamingStarted = false;
      const resultMsgId = (Date.now() + 2).toString();
      
      for await (const event of readStreamableValue(stream)) {
        if (event) {
          events.push(event);
          
          if (event.type === 'content-chunk') {
            const currentStreamedContent = events
              .filter(e => e.type === 'content-chunk')
              .map(e => e.type === 'content-chunk' ? e.chunk : '')
              .join('');
            
            if (!streamingStarted) {
              streamingStarted = true;
              setMessages(prev => [...prev, {
                id: resultMsgId,
                role: 'assistant',
                content: <MarkdownRenderer content={currentStreamedContent} streaming={true} />,
                isSearch: false,
                bookName,
                author
              }]);
            } else {
              setMessages(prev => prev.map(msg => 
                msg.id === resultMsgId 
                  ? { ...msg, content: <MarkdownRenderer content={currentStreamedContent} streaming={true} /> }
                  : msg
              ));
            }
          }
          
          if (event.type === 'final-result') {
            finalContent = event.content;
            setMessages(prev => prev.map(msg => 
              msg.id === resultMsgId 
                ? {
                    ...msg,
                    content: (
                      <div className="space-y-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={finalContent} />
                        </div>
                        <CitationTooltip sources={event.sources || []} />
                        
                        {event.followUpQuestions && event.followUpQuestions.length > 0 && (
                          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Key Themes / Further Exploration
                            </h3>
                            <div className="space-y-2">
                              {event.followUpQuestions.map((theme, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    const evt = new CustomEvent('followUpQuestion', { 
                                      detail: { question: theme }, // Re-using 'question' for theme
                                      bubbles: true 
                                    });
                                    document.dispatchEvent(evt);
                                  }}
                                  className="block w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors group"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                                      {theme}
                                    </span>
                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <SourcesList sources={event.sources || []} />
                      </div>
                    ),
                    searchResults: finalContent // Store the full summary text
                  }
                : msg
            ));
          }
          
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMsgId 
              ? { ...msg, content: <SearchDisplay events={[...events]} />, searchResults: finalContent }
              : msg
          ));
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setMessages(prev => prev.filter(msg => msg.id !== assistantMsgId));
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during summary generation.';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: (
          <div className="p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-700 dark:text-red-300 font-medium">Summary Generation Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errorMessage}</p>
            {(errorMessage.includes('API key') || errorMessage.includes('OPENAI_API_KEY')) && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                Please ensure all required API keys are set:
                <br />• OPENAI_API_KEY (for GPT models)
                <br />• FIRECRAWL_API_KEY (can be provided via UI if not in .env)
              </p>
            )}
          </div>
        ),
        isSearch: false, bookName, author
      }]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookNameInput.trim() || isSearching) return;

    const currentBookName = bookNameInput;
    const currentAuthor = authorInput.trim() || undefined;

    setBookNameInput('');
    setAuthorInput('');

    if (!hasApiKey) {
      setPendingSearch({ bookName: currentBookName, author: currentAuthor });
      setShowApiKeyModal(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: `Book: ${currentBookName}` + (currentAuthor ? ` by ${currentAuthor}` : ''),
        isSearch: false,
        bookName: currentBookName,
        author: currentAuthor
      }]);
      return;
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'user',
      content: `Generate summary for: ${currentBookName}` + (currentAuthor ? ` by ${currentAuthor}` : ''),
      isSearch: false, // User message itself isn't a search display
      bookName: currentBookName,
      author: currentAuthor
    }]);

    await performSearch(currentBookName, currentAuthor);
  };

  return (
    <div className="flex flex-col flex-1">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="bookName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Book Name
                </label>
                <Input
                  id="bookName"
                  type="text"
                  value={bookNameInput}
                  onChange={(e) => setBookNameInput(e.target.value)}
                  placeholder="e.g., Atomic Habits"
                  className="w-full h-12 rounded-lg border-zinc-200 dark:border-zinc-800"
                  disabled={isSearching}
                />
              </div>
              <div>
                <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Author (Optional)
                </label>
                <Input
                  id="authorName"
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="e.g., James Clear"
                  className="w-full h-12 rounded-lg border-zinc-200 dark:border-zinc-800"
                  disabled={isSearching}
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !bookNameInput.trim()}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
              >
                {isSearching ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Generate Book Summary'
                )}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scrollbar-hide px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`${
                    msg.role === 'user' 
                      ? 'flex justify-end' 
                      : 'w-full' // Assistant messages take full width
                  }`}
                >
                  {msg.role === 'user' ? (
                    <div className="max-w-2xl">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 text-right">You</div>
                      <span className="inline-block px-5 py-3 rounded-2xl bg-[#FBFAF9] dark:bg-zinc-800 text-[#36322F] dark:text-zinc-100">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                     <div className="w-full">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          AI Summary Generator {msg.bookName ? `for "${msg.bookName}"` : ''}
                        </div>
                        {msg.content}
                      </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Input form at the bottom */}
          <div className="bg-white dark:bg-zinc-950 px-4 sm:px-6 lg:px-8 py-4 border-t dark:border-zinc-800">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="text"
                  value={bookNameInput}
                  onChange={(e) => setBookNameInput(e.target.value)}
                  placeholder="Book Name (e.g., Sapiens)"
                  className="flex-grow h-12 rounded-lg border-zinc-200 dark:border-zinc-800"
                  disabled={isSearching}
                />
                <Input
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="Author (Optional, e.g., Yuval Noah Harari)"
                  className="flex-grow h-12 rounded-lg border-zinc-200 dark:border-zinc-800"
                  disabled={isSearching}
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !bookNameInput.trim()}
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    Generate Book Summary
                  </>
                )}
              </Button>
            </form>
          </div>
        </>
      )}

      {/* API Key Modal */}
      <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle>Firecrawl API Key Required</DialogTitle>
            <DialogDescription>
              To generate book summaries, a Firecrawl API key is recommended for web crawling. You can get one for free. If it's set in your server environment (.env), this step might be optional.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Button
                onClick={() => window.open('https://www.firecrawl.dev/app/api-keys', '_blank')}
                className="w-full"
                variant="code"
              >
                Get your free API key from Firecrawl →
              </Button>
            </div>
            <div className="space-y-2">
              <label htmlFor="apiKey" className="text-sm font-medium">
                Enter your Firecrawl API key (Optional if set in .env)
              </label>
              <Input
                id="apiKey"
                type="password"
                value={firecrawlApiKey}
                onChange={(e) => setFirecrawlApiKey(e.target.value)}
                placeholder="fc-..."
                className="w-full"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="code"
              onClick={() => {
                setShowApiKeyModal(false);
                // If user cancels, and there was a pending search, try it without client-side key
                if (pendingSearch) {
                  toast.info("Attempting search without client-side API key...");
                  performSearch(pendingSearch.bookName, pendingSearch.author);
                  setPendingSearch(null);
                }
              }}
            >
              Cancel / Use Env Key
            </Button>
            <Button 
              variant="orange"
              onClick={saveApiKeyAndSearch}
              disabled={!firecrawlApiKey.trim()}
            >
              Save and Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
'use client';

import { SearchEvent, SearchStep, SearchPhase } from '@/lib/langgraph-search-engine';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { MarkdownRenderer } from './markdown-renderer';
import { getFaviconUrl, getDefaultFavicon, markFaviconFailed } from '@/lib/favicon-utils';

// Component for animated thinking line that cycles through messages
function AnimatedThinkingLine({ messages }: { messages: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (messages.length <= 1) return;
    
    // Detect if this is a "speed run" (many source names)
    const isSpeedRun = messages.some(msg => msg.includes('Analyzing') && messages.length > 5);
    const cycleDelay = isSpeedRun ? 600 : 2000; // Faster for speed runs
    const fadeDelay = isSpeedRun ? 100 : 300;
    
    const cycleMessages = () => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          // Stop at the last message if it's a speed run
          if (isSpeedRun && next >= messages.length - 1) {
            setIsComplete(true);
            return messages.length - 1; // Stay on last message
          }
          return next % messages.length;
        });
        setIsVisible(true);
      }, fadeDelay);
    };
    
    if (!isComplete) {
      const interval = setInterval(cycleMessages, cycleDelay);
      return () => clearInterval(interval);
    }
  }, [messages, isComplete]);
  
  // Extract URL from message if it's an "Analyzing" message
  const currentMessage = messages[currentIndex];
  const analyzingMatch = currentMessage.match(/Analyzing (.+)\.\.\./);
  const currentUrl = analyzingMatch ? analyzingMatch[1] : null;
  
  return (
    <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
      <div className="w-5 h-5 mt-0.5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {currentUrl ? (
          <Image 
            src={getFaviconUrl(currentUrl)} 
            alt=""
            width={20}
            height={20}
            className={`w-5 h-5 rounded transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = getDefaultFavicon(20);
              markFaviconFailed(currentUrl);
            }}
          />
        ) : (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>
      <span className={`text-sm transition-opacity ${isVisible ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDuration: isVisible ? '150ms' : '150ms' }}>
        {currentMessage}
      </span>
    </div>
  );
}

// Component for found sources group with collapse/expand
function FoundSourcesGroup({ 
  event, 
  sources, 
  defaultExpanded, 
  completedPhases, 
  currentPhase, 
  events 
}: {
  event: SearchEvent;
  sources: {
    url: string;
    title: string;
    stage: 'browsing' | 'extracting' | 'analyzing' | 'complete';
    summary?: string;
  }[];
  defaultExpanded: boolean;
  completedPhases: Set<string>;
  currentPhase: SearchPhase | null;
  events: SearchEvent[];
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  // Auto-collapse when a new search starts
  useEffect(() => {
    setIsExpanded(defaultExpanded);
  }, [defaultExpanded]);
  
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {renderEvent(event, completedPhases, currentPhase, false, events)}
        </div>
        {sources.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
            aria-label={isExpanded ? "Collapse sources" : "Expand sources"}
          >
            <svg 
              className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
      <div 
        className={`ml-7 mt-1 overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded && sources.length > 0 ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-1">
          {sources.map((source, index) => (
            <div
              key={source.url}
              className="animate-slide-down"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              <SourceProcessingLine
                url={source.url}
                stage={source.stage}
                summary={source.summary}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Component for animated source processing line
function SourceProcessingLine({ url, stage, summary }: { 
  url: string; 
  stage: 'browsing' | 'extracting' | 'analyzing' | 'complete';
  summary?: string;
}) {
  // const stages = ['browsing', 'extracting', 'analyzing', 'complete'];
  // const _currentStageIndex = stages.indexOf(stage);
  
  
  const stageLabels = {
    browsing: 'Browsing',
    extracting: 'Extracting',
    analyzing: 'Analyzing',
    complete: 'Complete'
  };
  
  return (
    <div className="group flex items-start gap-2 text-xs py-1 animate-fade-in">
      <Image 
        src={getFaviconUrl(url)} 
        alt=""
        width={16}
        height={16}
        className="w-4 h-4 rounded flex-shrink-0 mt-0.5"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.src = getDefaultFavicon(16);
          markFaviconFailed(url);
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-600 dark:text-gray-400 truncate">
          {new URL(url).hostname}
        </div>
        {stage === 'complete' ? (
          summary ? (
            <div className="text-gray-500 dark:text-gray-500 mt-0.5">
              {summary}
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-500 dark:text-gray-500">
                Complete
              </span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-gray-500 dark:text-gray-500">
              {stageLabels[stage as keyof typeof stageLabels]}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchDisplay({ events }: { events: SearchEvent[] }) {
  const [steps, setSteps] = useState<SearchStep[]>([]);
  const [, setStreamedContent] = useState('');
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [, setSearchQueries] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<SearchPhase | null>(null);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<number>(Date.now());
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const stepsScrollRef = useRef<HTMLDivElement>(null);
  
  // Track source processing states
  const [sourceStates, setSourceStates] = useState<Map<string, {
    url: string;
    title: string;
    stage: 'browsing' | 'extracting' | 'analyzing' | 'complete';
    summary?: string;
  }>>(new Map());
  
  // Format seconds into mm:ss or just ss
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Initialize steps and start timer
  useEffect(() => {
    if (steps.length === 0 && events.length > 0) {
      setSteps([
        { id: 'understanding', label: 'Understanding request', status: 'pending' },
        { id: 'planning', label: 'Planning search', status: 'pending' },
        { id: 'searching', label: 'Searching sources', status: 'pending' },
        { id: 'analyzing', label: 'Analyzing content', status: 'pending' },
        { id: 'synthesizing', label: 'Synthesizing answer', status: 'pending' },
        { id: 'complete', label: 'Complete', status: 'pending' }
      ]);
      // Start timer immediately
      setStartTime(Date.now());
    }
  }, [events.length, steps.length]);

  // Update timer every second
  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        if (!showFinalResult) {
          setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [startTime, showFinalResult]);

  // Update steps based on events - only show current and completed steps
  useEffect(() => {
    // Extract search queries from events
    const searchEvents = events.filter(e => e.type === 'searching');
    const uniqueQueries = [...new Set(searchEvents.map(e => e.type === 'searching' ? e.query : ''))];
    setSearchQueries(uniqueQueries);
    
    const latestPhaseEvent = events.findLast(e => e.type === 'phase-update');
    if (latestPhaseEvent?.type === 'phase-update') {
      setCurrentPhase(latestPhaseEvent.phase);
      
      // Mark previous phases as completed
      const phases: SearchPhase[] = ['understanding', 'planning', 'searching', 'analyzing', 'synthesizing', 'complete'];
      const currentPhaseIndex = phases.indexOf(latestPhaseEvent.phase);
      if (currentPhaseIndex > 0) {
        setCompletedPhases(prev => {
          const newCompleted = new Set(prev);
          for (let i = 0; i < currentPhaseIndex; i++) {
            newCompleted.add(phases[i]);
          }
          return newCompleted;
        });
      }
      
      setSteps(() => {
        const baseSteps = [
          { id: 'understanding', label: 'Understanding request', status: 'pending' },
          { id: 'planning', label: 'Planning search', status: 'pending' },
          { id: 'searching', label: 'Searching sources', status: 'pending' }
        ] as SearchStep[];
        
        // Add dynamic search query steps if we're in or past the searching phase
        if (['searching', 'analyzing', 'synthesizing', 'complete'].includes(latestPhaseEvent.phase) && uniqueQueries.length > 0) {
          uniqueQueries.forEach((query, idx) => {
            const queryLabel = query.length > 25 ? query.substring(0, 25) + '\u2026' : query;
            baseSteps.push({
              id: `search-${idx}`,
              label: queryLabel,
              status: 'pending'
            });
          });
        }
        
        // Add remaining steps
        baseSteps.push(
          { id: 'analyzing', label: 'Analyzing content', status: 'pending' },
          { id: 'synthesizing', label: 'Synthesizing answer', status: 'pending' },
          { id: 'complete', label: 'Complete', status: 'pending' }
        );
        
        // Update status based on current phase
        const phases: SearchPhase[] = ['understanding', 'planning', 'searching', 'analyzing', 'synthesizing', 'complete'];
        const currentPhaseIndex = phases.indexOf(latestPhaseEvent.phase);
        
        baseSteps.forEach((step) => {
          if (step.id.startsWith('search-')) {
            // Check if this specific search is complete by looking for a 'found' event
            const searchIndex = parseInt(step.id.split('-')[1]);
            const searchQuery = uniqueQueries[searchIndex];
            const foundEvent = events.find(e => 
              e.type === 'found' && e.query.toLowerCase().trim() === searchQuery.toLowerCase().trim()
            );
            
            if (foundEvent) {
              step.status = 'completed';
            } else if (currentPhaseIndex >= 2) { // We're in or past searching phase
              step.status = 'active';
            } else {
              step.status = 'pending';
            }
          } else {
            const stepPhaseIndex = phases.indexOf(step.id as SearchPhase);
            if (stepPhaseIndex < currentPhaseIndex) {
              step.status = 'completed';
            } else if (stepPhaseIndex === currentPhaseIndex) {
              step.status = 'active';
            }
          }
        });
        
        return baseSteps;
      });
    }
  }, [events]);

  // Handle streaming content and extract research info
  useEffect(() => {
    const contentChunks = events.filter(e => e.type === 'content-chunk');
    if (contentChunks.length > 0) {
      const content = contentChunks.map(e => e.type === 'content-chunk' ? e.chunk : '').join('');
      setStreamedContent(content);
    }
    
    const finalResult = events.find(e => e.type === 'final-result');
    if (finalResult) {
      setShowFinalResult(true);
    }
    
    // Update last event time
    if (events.length > 0) {
      setLastEventTime(Date.now());
    }
    
    // Count total sources found
    const foundEvents = events.filter(e => e.type === 'found');
    const totalSourcesFound = foundEvents.reduce((acc, event) => {
      return acc + (event.type === 'found' ? event.sources.length : 0);
    }, 0);
    setScrapedCount(totalSourcesFound);
    
    // Update source processing states
    events.forEach(event => {
      if (event.type === 'source-processing') {
        setSourceStates(prev => {
          const newMap = new Map(prev);
          newMap.set(event.url, {
            url: event.url,
            title: event.title,
            stage: event.stage,
            summary: prev.get(event.url)?.summary
          });
          return newMap;
        });
      } else if (event.type === 'source-complete') {
        setSourceStates(prev => {
          const newMap = new Map(prev);
          const existing = prev.get(event.url);
          newMap.set(event.url, {
            url: event.url,
            title: existing?.title || '',
            stage: 'complete',
            summary: event.summary
          });
          return newMap;
        });
      }
    });
  }, [events]);

  // Check if we're stalled (no events for more than 3 seconds)
  const [, setIsStalled] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - lastEventTime;
      setIsStalled(timeSinceLastEvent > 3000 && !showFinalResult && currentPhase === 'searching');
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastEventTime, showFinalResult, currentPhase]);

  // Auto-scroll messages when new events arrive
  useEffect(() => {
    if (messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [events]);

  // Auto-scroll steps when they update
  useEffect(() => {
    if (stepsScrollRef.current) {
      stepsScrollRef.current.scrollTop = stepsScrollRef.current.scrollHeight;
    }
  }, [steps]);

  const latestResult = events.findLast(e => e.type === 'final-result');
  
  // Show final result if complete - only show the research box, not the content
  if (showFinalResult && latestResult?.type === 'final-result') {
    return (
      <div className="flex h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex flex-col">
          {/* Fixed progress header */}
          <div className="p-4 pb-2">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Complete
                </h4>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-500">Sources found</span>
                <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                  {scrapedCount}
                </span>
              </div>
            </div>
          </div>
          
          {/* Scrollable steps area */}
          <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4">
            <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
              <div className="relative pl-6">
                {steps.map((step, index) => (
                  <div key={step.id} className="relative flex items-start gap-2 mb-6">
                    <div className="absolute left-[-24px] flex-shrink-0 mt-0.5">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-sm">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <p className="text-xs leading-tight text-gray-700 dark:text-gray-300">
                        {step.label}
                      </p>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div 
                        className="absolute left-[-14px] top-[20px] h-[calc(100%+8px)] w-0.5 bg-orange-500"
                        style={{ opacity: 1 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-auto scrollbar-hide">
          <div className="max-w-4xl">
            <div className="space-y-3">
              {events.filter(e => e.type !== 'content-chunk' && e.type !== 'final-result').map((event, i) => (
                <div key={i} className="text-sm">
                  {renderEvent(event, completedPhases, currentPhase, false, events)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show search progress
  return (
    <div className="flex h-[500px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Steps sidebar - vertical progress */}
      <div className="w-56 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0 flex flex-col">
        {/* Fixed progress header */}
        <div className="p-4 pb-2">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Progress
              </h4>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                {formatTime(elapsedSeconds)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-500">Sources found</span>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-400">
                {scrapedCount}
              </span>
            </div>
          </div>
        </div>
        
        {/* Scrollable steps area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-4" ref={stepsScrollRef}>
          <div className="relative border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
            <div className="relative pl-6">
          {/* Steps */}
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="relative animate-fade-in opacity-0"
              style={{
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'forwards'
              }}
            >
              {/* Step content */}
              <div className="relative flex items-start gap-2 mb-6">
                {/* Checkmark on the left */}
                <div className="absolute left-[-24px] flex-shrink-0 mt-0.5">
                  {step.status === 'completed' ? (
                    <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow-sm animate-scale-in">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  ) : step.status === 'active' ? (
                    <div className="w-5 h-5 rounded-full bg-orange-400 animate-pulse shadow-sm" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  )}
                </div>
                
                {/* Label */}
                <div className="flex-1">
                  <p className={`text-xs leading-tight transition-all ${
                    step.status === 'active' 
                      ? 'font-medium text-gray-900 dark:text-gray-100' 
                      : step.status === 'completed'
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  {step.status === 'active' && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Processing...
                    </p>
                  )}
                </div>
              </div>
              
              {/* Connecting line - positioned after content */}
              {index < steps.length - 1 && (
                <div 
                  className={`absolute left-[-14px] top-[20px] h-[calc(100%+8px)] w-0.5 transition-all duration-300 ${
                    index < steps.filter(s => s.status === 'completed').length
                      ? 'bg-orange-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ opacity: 1 }}
                />
              )}
            </div>
          ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main content area - takes remaining space */}
      <div className="flex-1 p-8 overflow-y-auto scrollbar-hide" ref={messagesScrollRef}>
        <div className="max-w-4xl">
          <div className="space-y-3">
            {/* Group events with their source processing */}
            {(() => {
              const displayGroups: { event: SearchEvent; sourceProcessing?: unknown[] }[] = [];
              let currentFoundEvent: SearchEvent | null = null;
              let currentSources: unknown[] = [];
              
              events.forEach((event) => {
                if (event.type === 'content-chunk' || event.type === 'final-result') return;
                
                if (event.type === 'found') {
                  // Save any pending sources before starting new group
                  if (currentFoundEvent && currentSources.length > 0) {
                    displayGroups.push({ event: currentFoundEvent, sourceProcessing: [...currentSources] });
                    currentSources = [];
                  }
                  currentFoundEvent = event;
                } else if ((event.type === 'source-processing' || event.type === 'source-complete') && currentFoundEvent) {
                  // Don't accumulate, we'll get the current state from sourceStates map
                } else {
                  // Save any pending found event with its sources
                  if (currentFoundEvent) {
                    displayGroups.push({ event: currentFoundEvent, sourceProcessing: [...currentSources] });
                    currentFoundEvent = null;
                    currentSources = [];
                  }
                  // Add non-found event
                  displayGroups.push({ event });
                }
              });
              
              // Don't forget the last group
              if (currentFoundEvent) {
                displayGroups.push({ event: currentFoundEvent, sourceProcessing: currentSources });
              }
              
              // Track the latest "found" event to know which sources should be expanded
              const latestFoundIndex = displayGroups.findLastIndex(g => g.event.type === 'found');
              
              return displayGroups.map((group, i) => {
                if (group.event.type === 'found') {
                  // Get the URLs from this specific found event
                  const foundUrls = new Set(group.event.sources.map(s => s.url));
                  
                  // Get the current state of sources that match these URLs
                  const sourcesForThisQuery = Array.from(sourceStates.entries())
                    .filter(([url]) => foundUrls.has(url))
                    .map(([, source]) => source);
                  
                  // Only expand sources for the current/latest search
                  const isCurrentSearch = i === latestFoundIndex;
                  
                  return (
                    <FoundSourcesGroup
                      key={i}
                      event={group.event}
                      sources={sourcesForThisQuery}
                      defaultExpanded={isCurrentSearch}
                      completedPhases={completedPhases}
                      currentPhase={currentPhase}
                      events={events}
                    />
                  );
                }
                
                return (
                  <div key={i} className="animate-fade-in">
                    {renderEvent(group.event, completedPhases, currentPhase, false, events)}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderEvent(event: SearchEvent, _completedPhases: Set<string>, currentPhase: SearchPhase | null = null, _showLoadingIndicator = false, events: SearchEvent[] = []) { // eslint-disable-line @typescript-eslint/no-unused-vars
  switch (event.type) {
    case 'thinking':
      // Single line animated display
      const messages = event.message.split('|');
      const isAnimated = messages.length > 1;
      
      if (isAnimated) {
        return (
          <AnimatedThinkingLine messages={messages} />
        );
      }
      
      // Check if this is the initial understanding (contains markdown headers)
      const isInitialThinking = event.message.includes('###') || event.message.includes('**');
      
      if (isInitialThinking) {
        return (
          <div className="text-gray-500 dark:text-gray-400 text-sm">
            <MarkdownRenderer content={event.message} />
          </div>
        );
      }
      
      // Check if this is a processing message that should show a spinner
      const isProcessing = event.message.includes('Processing') && event.message.includes('sources');
      const isAnalyzing = event.message.includes('Analyzing content from');
      
      if (isProcessing || isAnalyzing) {
        // Check for single source URL (for individual processing)
        const singleSourceMatch = event.message.match(/\|SOURCE:(.+)$/);
        const singleSourceUrl = singleSourceMatch?.[1];
        const displayMessage = singleSourceUrl ? event.message.replace(/\|SOURCE:.+$/, '') : event.message;
        
        return (
          <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
            {singleSourceUrl ? (
              // Show favicon for individual source
              <Image 
                src={getFaviconUrl(singleSourceUrl)} 
                alt=""
                width={20}
                height={20}
                className="w-5 h-5 mt-0.5 rounded flex-shrink-0"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = getDefaultFavicon(20);
                  markFaviconFailed(singleSourceUrl);
                }}
              />
            ) : (
              // Show spinner for general processing
              <div className="w-5 h-5 mt-0.5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            <span className="text-sm">{displayMessage}</span>
          </div>
        );
      }
      
      return (
        <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
          <div className="w-5 h-5 mt-0.5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-sm">{event.message}</span>
        </div>
      );
    
    case 'searching':
      // Check if this search has completed by looking for a matching 'found' event
      const searchingQuery = event.query.toLowerCase().trim();
      const searchCompleted = events.some(e => {
        if (e.type !== 'found') return false;
        const foundQuery = e.query.toLowerCase().trim();
        return foundQuery === searchingQuery;
      });
      
      return (
        <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
          <div className="w-5 h-5 mt-0.5 rounded bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
            {searchCompleted ? (
              <svg className="w-3 h-3 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
          <span className="text-sm">
            Search {event.index} of {event.total}: <span className="font-medium text-gray-900 dark:text-gray-100">&quot;{event.query}&quot;</span>
            {!searchCompleted && <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">Finding sources...</span>}
          </span>
        </div>
      );
    
    case 'found':
      return (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span>Found <span className="font-bold text-gray-900 dark:text-gray-100">{event.sources.length} sources</span> for &quot;{event.query}&quot;</span>
          </div>
        </div>
      );
    
    case 'scraping':
      return (
        <div className="flex items-start gap-3">
          <Image 
            src={getFaviconUrl(event.url)} 
            alt=""
            width={20}
            height={20}
            className="w-5 h-5 mt-0.5 flex-shrink-0 rounded"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = getDefaultFavicon(20);
              markFaviconFailed(event.url);
            }}
          />
          <div className="flex-1">
            <div className="text-sm text-gray-900 dark:text-gray-100">
              Browsing <span className="font-medium text-orange-600 dark:text-orange-400">{new URL(event.url).hostname}</span> for &quot;{event.query}&quot;
            </div>
          </div>
        </div>
      );
    
    case 'phase-update':
      // Check if this phase has been completed (we've moved past it)
      const phases: SearchPhase[] = ['understanding', 'planning', 'searching', 'analyzing', 'synthesizing', 'complete'];
      const eventPhaseIndex = phases.indexOf(event.phase);
      const currentPhaseIndex = currentPhase ? phases.indexOf(currentPhase) : -1;
      const isCompleted = currentPhaseIndex > eventPhaseIndex || event.phase === 'complete';
      
      return (
        <div className="flex items-start gap-3 text-gray-900 dark:text-gray-100 font-medium">
          <div className="w-5 h-5 mt-0.5 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {isCompleted ? (
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 animate-spin text-gray-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </div>
          <span className="text-sm">{event.message}</span>
        </div>
      );
    
    case 'error':
      return (
        <div className="flex items-start gap-3 text-red-600 dark:text-red-400">
          <div className="w-5 h-5 mt-0.5 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-sm">
            <span className="font-medium">Error: </span>
            <span>{event.error}</span>
            {event.errorType && <span className="text-xs ml-2">({event.errorType})</span>}
          </div>
        </div>
      );
    
    case 'source-processing':
    case 'source-complete':
      // This will be handled by the SourceProcessingLine component
      return null;
    
    default:
      return null;
  }
}
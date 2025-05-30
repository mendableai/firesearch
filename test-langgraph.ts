import { LangGraphSearchEngine, SearchEvent } from './lib/langgraph-search-engine';
import { FirecrawlClient } from './lib/firecrawl';

async function testSearch() {
  console.log('🚀 Testing LangGraph implementation in hosted-tools...\n');
  
  // Check for API keys
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  if (!process.env.FIRECRAWL_API_KEY) {
    console.error('❌ Error: FIRECRAWL_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  // Initialize services
  const firecrawl = new FirecrawlClient(process.env.FIRECRAWL_API_KEY);
  const searchEngine = new LangGraphSearchEngine(firecrawl);
  
  // Collect events for analysis
  const events: SearchEvent[] = [];
  const phaseChanges: string[] = [];
  let foundCount = 0;
  let scrapedCount = 0;
  
  console.log('📝 Initial steps:');
  console.log(searchEngine.getInitialSteps());
  console.log('\n');
  
  // Test search
  await searchEngine.search(
    "What is LangGraph and how does it work?",
    (event) => {
      events.push(event);
      
      // Log different event types
      switch (event.type) {
        case 'phase-update':
          phaseChanges.push(event.phase);
          console.log(`\n🔄 Phase: ${event.phase} - ${event.message}`);
          break;
        case 'thinking':
          console.log(`💭 ${event.message}`);
          break;
        case 'searching':
          console.log(`🔍 Search ${event.index}/${event.total}: "${event.query}"`);
          break;
        case 'found':
          foundCount += event.sources.length;
          console.log(`📋 Found ${event.sources.length} sources for "${event.query}"`);
          break;
        case 'scraping':
          scrapedCount++;
          console.log(`🌐 Scraping ${event.index}/${event.total}: ${event.url}`);
          break;
        case 'content-chunk':
          // Just count chunks, don't log each one
          break;
        case 'final-result':
          console.log(`\n✅ Final result received with ${event.sources.length} sources`);
          console.log(`Answer preview: ${event.content.substring(0, 100)}...`);
          if (event.followUpQuestions && event.followUpQuestions.length > 0) {
            console.log('\n📌 Follow-up questions:');
            event.followUpQuestions.forEach((q, i) => {
              console.log(`   ${i + 1}. ${q}`);
            });
          }
          break;
        case 'error':
          console.log(`❌ Error: ${event.error} (Type: ${event.errorType})`);
          break;
      }
    }
  );
  
  console.log('\n📊 Summary:');
  console.log(`Total events: ${events.length}`);
  console.log(`Phase changes: ${phaseChanges.join(' → ')}`);
  console.log(`Web pages found: ${foundCount}`);
  console.log(`Pages analyzed: ${scrapedCount}`);
  console.log(`Content chunks: ${events.filter(e => e.type === 'content-chunk').length}`);
  
  // Test with context
  console.log('\n\n🔄 Testing with context...\n');
  
  await searchEngine.search(
    "Can you tell me more about its key features?",
    (event) => {
      if (event.type === 'phase-update') {
        console.log(`Phase: ${event.phase}`);
      } else if (event.type === 'final-result' && event.followUpQuestions) {
        console.log('\nFollow-up questions:', event.followUpQuestions);
      }
    },
    [{
      query: "What is LangGraph?",
      response: "LangGraph is a library for building stateful, multi-actor applications..."
    }]
  );
  
  console.log('\n✅ Test completed!');
}

// Run the test
testSearch().catch(console.error);
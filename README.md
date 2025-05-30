# Firesearch - AI-Powered Deep Research Tool

Comprehensive web research powered by [Firecrawl](https://www.firecrawl.dev/) and Anthropic Claude 4.

## Technologies

- **Firecrawl**: Multi-source web content extraction
- **Anthropic Claude 4**: Advanced answer synthesis and research
- **OpenAI GPT-4o**: Search planning and follow-up generation
- **Next.js 15**: Modern React framework with App Router

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmendableai%2Ffirecrawl%2Ftree%2Fmain%2Fexamples&env=FIRECRAWL_API_KEY,OPENAI_API_KEY,ANTHROPIC_API_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN&envDescription=API%20keys%20required%20to%20run%20this%20application)

## Setup

### Required API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| Firecrawl | Web scraping and content extraction | [firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys) |
| OpenAI | Search planning and summarization | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Anthropic | Answer synthesis with Claude 4 | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| Upstash Redis | Rate limiting (production only) | [upstash.com](https://upstash.com) |

### Quick Start

1. Clone this repository
2. Create a `.env.local` file with your API keys:
   ```
   FIRECRAWL_API_KEY=your_firecrawl_key
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   
   # For production - enables rate limiting (50 req/IP/day)
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   
   # For production - redirects homepage to firecrawl.dev
   PRODUCTION_ENV=true
   ```
3. Install dependencies: `npm install` or `yarn install`
4. Run the development server: `npm run dev` or `yarn dev`

## Security Features

- **Rate Limiting**: 50 requests per IP address per day to prevent abuse
- **Timeout Protection**: 15-second timeout for slow-loading websites
- **Error Handling**: Graceful fallbacks for inaccessible sources

## How It Works

1. **Understanding**: Analyzes your query to identify key research needs
2. **Planning**: Generates multiple search queries for comprehensive coverage
3. **Searching**: Finds relevant sources across the web
4. **Analyzing**: Extracts and evaluates content from multiple sources
5. **Synthesizing**: Combines findings into a well-cited, comprehensive answer

## Example Queries

- "Who are the founders of Firecrawl?"
- "When did NVIDIA release the RTX 4080 Super?"
- "Compare the latest iPhone, Samsung Galaxy, and Google Pixel flagship features"
- "What are the latest developments in quantum computing?"
- "Explain how transformer models work in machine learning"

## License

MIT License
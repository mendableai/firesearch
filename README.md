# Firesearch - AI-Powered Deep Research Tool

Comprehensive web research powered by [Firecrawl](https://www.firecrawl.dev/) and [LangGraph](https://www.langchain.com/langgraph)

## Technologies

- **Firecrawl**: Multi-source web content extraction
- **OpenAI GPT-4o**: Search planning and follow-up generation
- **Next.js 15**: Modern React framework with App Router

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmendableai%2Ffirecrawl%2Ftree%2Fmain%2Fexamples&env=FIRECRAWL_API_KEY,OPENAI_API_KEY&envDescription=API%20keys%20required%20to%20run%20this%20application)

## Setup

### Required API Keys

| Service | Purpose | Get Key |
|---------|---------|---------|
| Firecrawl | Web scraping and content extraction | [firecrawl.dev/app/api-keys](https://www.firecrawl.dev/app/api-keys) |
| OpenAI | Search planning and summarization | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

### Quick Start

1. Clone this repository
2. Create a `.env.local` file with your API keys:
   ```
   FIRECRAWL_API_KEY=your_firecrawl_key
   OPENAI_API_KEY=your_openai_key
   ```
3. Install dependencies: `npm install` or `yarn install`
4. Run the development server: `npm run dev` or `yarn dev`

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

## License

MIT License
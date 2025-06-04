import { NextResponse } from 'next/server';

export async function GET() {
  
  const environmentStatus = {
    FIRECRAWL_API_KEY: !!process.env.FIRECRAWL_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    GROK_API_KEY: !!process.env.GROK_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
  };

  console.log('Environment status response:', environmentStatus);
  return NextResponse.json(environmentStatus);
} 
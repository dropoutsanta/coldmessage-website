import { FirecrawlResponse } from '../types';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';

export interface ScrapedWebsite {
  markdown: string;
  title: string;
  description: string;
  url: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapedWebsite> {
  // Ensure URL has protocol
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  
  console.log(`[WebsiteScraper] Scraping ${fullUrl}...`);

  const response = await fetch(FIRECRAWL_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: fullUrl,
      formats: ['markdown'],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[WebsiteScraper] Error: ${response.status} - ${errorText}`);
    throw new Error(`Failed to scrape website: ${response.status}`);
  }

  const result: FirecrawlResponse = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to scrape website');
  }

  console.log(`[WebsiteScraper] Successfully scraped ${fullUrl}`);

  return {
    markdown: result.data.markdown || result.data.content || '',
    title: result.data.metadata?.title || result.data.metadata?.ogTitle || '',
    description: result.data.metadata?.description || result.data.metadata?.ogDescription || '',
    url: fullUrl,
  };
}

// Extract company name from domain
export function extractCompanyName(domain: string): string {
  let cleanDomain = domain.replace(/^https?:\/\//, '');
  cleanDomain = cleanDomain.replace(/^www\./, '');
  const parts = cleanDomain.split('.');
  const name = parts[0] || 'Company';
  return name.charAt(0).toUpperCase() + name.slice(1);
}


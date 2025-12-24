import Anthropic from '@anthropic-ai/sdk';
import { ScrapedWebsite } from '../websiteScraper';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Geographic focus analysis
 */
export interface GeographicFocus {
  primaryMarkets: string[]; // e.g., ["United States", "United Kingdom"]
  officeLocations: string[]; // Physical office locations mentioned
  evidenceSignals: string[]; // What signals led to this conclusion
  confidence: 'high' | 'medium' | 'low';
  reasoning: string; // Brief explanation of geographic determination
}

/**
 * Structured company profile output from Agent 1
 */
export interface CompanyProfile {
  name: string;
  domain: string;
  tagline: string;
  
  // What they do
  productOrService: string;
  problemTheySolve: string;
  howTheySolveIt: string;
  
  // Who they serve
  targetMarket: string;
  existingCustomerTypes: string[];
  caseStudiesOrTestimonials: string[];
  
  // Geographic focus
  geography: GeographicFocus;
  
  // Positioning
  industry: string;
  competitiveAdvantage: string;
  pricingModel: string; // freemium, enterprise, SMB, etc.
  
  // Signals
  companyMaturity: 'early-stage' | 'growth' | 'established' | 'enterprise';
  salesMotion: 'self-serve' | 'sales-led' | 'hybrid' | 'unknown';
}

/**
 * Result from company profiler including debug info
 */
export interface CompanyProfilerResult {
  profile: CompanyProfile;
  debug: {
    prompt: string;
    response: string;
  };
}

/**
 * Agent 1: Company Profiler
 * 
 * Focused task: Analyze the website content and extract a structured
 * understanding of what this company does and who they serve.
 * 
 * Does NOT decide ICP or LinkedIn filters - just observes and structures.
 */
export async function profileCompany(
  scrapedWebsite: ScrapedWebsite,
  domain: string
): Promise<CompanyProfilerResult> {
  console.log(`[Agent1:CompanyProfiler] Analyzing ${domain}...`);
  const startTime = Date.now();

  const prompt = `You are a company research analyst. Your job is to analyze a company's website and extract a structured profile of who they are, what they do, and WHERE they focus their business.

## Website Data

URL: ${scrapedWebsite.url}
Title: ${scrapedWebsite.title}
Meta Description: ${scrapedWebsite.description}

## Website Content

${scrapedWebsite.markdown.slice(0, 10000)}

## Your Task

Analyze this website and extract a structured company profile. Focus on OBSERVABLE facts from the website - don't infer or assume things not present.

### Geographic Analysis (CRITICAL)

Pay close attention to geographic signals. Look for:
- **Office locations**: Addresses, "headquartered in", footer location info
- **Customer testimonials/case studies**: What countries/regions are customers from?
- **Pricing & currency**: USD, EUR, GBP, etc. - this hints at primary market
- **Phone numbers**: Country codes (+1 for US, +44 for UK, etc.)
- **Legal/compliance mentions**: GDPR (EU focus), SOC2 (US focus), etc.
- **Regional messaging**: "Serving UK businesses", "America's #1", etc.
- **Language/spelling**: British vs American English
- **Partner/integration mentions**: Regional partners or integrations
- **Domain TLD**: .com (global/US), .co.uk (UK), .de (Germany), etc.

If NO geographic signals are present, default to the company's likely headquarters region based on domain TLD, or mark as "Global" with low confidence.

Respond with ONLY valid JSON in this exact format:

{
  "name": "Company Name",
  "domain": "${domain}",
  "tagline": "Their main tagline or headline",
  
  "productOrService": "What they sell (be specific - is it software, a service, a platform?)",
  "problemTheySolve": "The core problem they address for customers",
  "howTheySolveIt": "Brief description of their solution approach",
  
  "targetMarket": "Who the website says they serve (e.g., 'small business owners', 'enterprise sales teams')",
  "existingCustomerTypes": ["Type 1", "Type 2"],
  "caseStudiesOrTestimonials": ["Brief description of any customer examples mentioned"],
  
  "geography": {
    "primaryMarkets": ["Country or region 1", "Country or region 2"],
    "officeLocations": ["City, Country if mentioned"],
    "evidenceSignals": ["Signal 1: what you observed", "Signal 2: what you observed"],
    "confidence": "high | medium | low",
    "reasoning": "1-2 sentence explanation of why you believe these are the primary markets"
  },
  
  "industry": "The industry they operate in",
  "competitiveAdvantage": "What makes them different (from their messaging)",
  "pricingModel": "freemium | enterprise | SMB | usage-based | unknown",
  
  "companyMaturity": "early-stage | growth | established | enterprise",
  "salesMotion": "self-serve | sales-led | hybrid | unknown"
}

Be factual. If something isn't clear from the website, say "unknown" or leave the array empty. For geography, always provide your best assessment with appropriate confidence level.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('[Agent1:CompanyProfiler] Failed to parse response as JSON');
  }

  const profile: CompanyProfile = JSON.parse(jsonMatch[0]);
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Agent1:CompanyProfiler] Complete in ${elapsed}s - ${profile.name}`);

  return {
    profile,
    debug: {
      prompt,
      response: responseText,
    },
  };
}


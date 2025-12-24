import Anthropic from '@anthropic-ai/sdk';
import { ICPPersona } from './icpBrainstormer';
import { ICPSettings, LinkedInGeoLocation, LinkedInIndustry } from '../../types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Output from Agent 4
 */
export interface LinkedInFilterResult {
  filters: ICPSettings;
  debug: {
    prompt: string;
    response: string;
  };
}

/**
 * Geographic focus from company profiler
 */
export interface GeographyContext {
  primaryMarkets: string[];
  officeLocations: string[];
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Company context subset for filter builder
 * Only the fields relevant for making filter decisions
 */
export interface CompanyContext {
  targetMarket: string;
  industry: string;
  competitiveAdvantage: string;
  salesMotion?: string;
  geography?: GeographyContext;
}

/**
 * Agent 4: LinkedIn Filter Builder
 * 
 * Focused task: Translate a selected ICP persona into exact LinkedIn
 * Sales Navigator filters with proper IDs.
 * 
 * This agent is a LinkedIn specialist - it knows the filter system,
 * the IDs, and how to translate human descriptions into search parameters.
 */
export async function buildLinkedInFilters(
  persona: ICPPersona,
  preferredLocations?: string[], // Optional user preference
  selectionReasoning?: string, // Why this persona was chosen
  companyContext?: CompanyContext // Company context for smarter filter decisions
): Promise<LinkedInFilterResult> {
  console.log(`[Agent4:LinkedInFilterBuilder] Building filters for "${persona.name}"...`);
  const startTime = Date.now();

  const prompt = `You are a LinkedIn Sales Navigator expert. Your job is to translate an ICP persona into exact LinkedIn search filters.

## Why This Persona Was Selected

${selectionReasoning || 'No selection reasoning provided'}

## Company Context (The company sending cold emails)

${companyContext ? `
Target Market: ${companyContext.targetMarket}
Industry: ${companyContext.industry}
Competitive Advantage: ${companyContext.competitiveAdvantage}
Sales Motion: ${companyContext.salesMotion || 'Unknown'}

### Geographic Focus (CRITICAL for location selection)
${companyContext.geography ? `
Primary Markets: ${companyContext.geography.primaryMarkets.join(', ')}
Office Locations: ${companyContext.geography.officeLocations.join(', ') || 'Not specified'}
Geographic Confidence: ${companyContext.geography.confidence}
Reasoning: ${companyContext.geography.reasoning}

⚠️ USE THE PRIMARY MARKETS ABOVE as your default locations. Do NOT default to "US, UK, Canada" unless that matches the company's actual geographic focus.
` : 'No geographic data available - default to United States, Canada, United Kingdom'}

Use this context to sanity-check your filter choices. For example:
- If the company is in "healthcare SaaS", consider healthcare-related industries, not just generic SaaS
- If competitive advantage mentions "enterprise-grade", lean toward larger company sizes
- If target market is "small business owners", don't over-filter to Fortune 500
- If primary markets are "Germany, France, Netherlands", select those geos, NOT the US
` : 'No company context provided'}

## ICP Persona

Name: ${persona.name}
Titles: ${persona.titles.join(', ')}
Seniority: ${persona.seniority}
Department: ${persona.department}
Company Size: ${persona.companySize}
Company Stage: ${persona.companyStage}
Industries: ${persona.industries.join(', ')}
${preferredLocations ? `Preferred Locations: ${preferredLocations.join(', ')}` : 'Locations: Default to United States, Canada, United Kingdom'}

## LinkedIn Sales Navigator Filter Reference

### Seniority Levels (use for filtering by role level)
- Owner: 1
- Partner: 2
- CXO: 3
- VP: 4
- Director: 5
- Manager: 6
- Senior: 7
- Entry: 8

### Company Size (COMPANY_HEADCOUNT)
- Self-employed: A
- 1-10: B
- 11-50: C
- 51-200: D
- 201-500: E
- 501-1000: F
- 1001-5000: G
- 5001-10000: H
- 10001+: I

### Geography IDs (commonly used)
- North America: 102221843
- Europe: 100506914
- Asia: 102393603
- United States: 103644278
- United Kingdom: 101165590
- Canada: 101174742
- Germany: 101282230
- France: 105015875
- Australia: 101452733
- Netherlands: 102890719
- Ireland: 104738515
- Singapore: 102454443
- India: 102713980
- Brazil: 106057199

### Industry IDs (commonly used)
- Software Development: 4
- Technology, Information and Media: 6
- IT Services and IT Consulting: 96
- Financial Services: 43
- Advertising Services: 80
- Business Consulting and Services: 94
- Hospitals and Health Care: 14
- Retail: 27
- Real Estate: 44
- Manufacturing: 112
- Education: 68
- Marketing Services: 1862
- Staffing and Recruiting: 104
- Legal Services: 10
- Insurance: 42
- Telecommunications: 8
- Venture Capital and Private Equity: 106
- Investment Banking: 45
- E-Learning Providers: 1446
- Online and Mail Order Retail: 47

## Your Task

Translate this ICP into LinkedIn filters. Be strategic:

1. **Titles** - Use the exact titles from the persona, these will be used for keyword/title search
2. **Company Size** - Map to the appropriate headcount ranges (you can select multiple)
3. **Industries** - Select 2-4 most relevant industries with their IDs
4. **Locations** - Select 2-4 most relevant geos with their IDs

Respond with ONLY valid JSON:

{
  "titles": ["VP of Sales", "Head of Sales", "Sales Director"],
  "companySize": "51-200 employees",
  "industries": [
    { "id": "4", "text": "Software Development" },
    { "id": "96", "text": "IT Services and IT Consulting" }
  ],
  "locations": [
    { "id": "103644278", "text": "United States" },
    { "id": "101174742", "text": "Canada" }
  ]
}

Use the EXACT IDs from the reference above. If an industry or location isn't listed, use your knowledge of LinkedIn's ID system.`;

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
    throw new Error('[Agent4:LinkedInFilterBuilder] Failed to parse response as JSON');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Validate and structure the response
  const filters: ICPSettings = {
    titles: parsed.titles || persona.titles,
    companySize: parsed.companySize || persona.companySize,
    industries: (parsed.industries || []).map((ind: LinkedInIndustry) => ({
      id: ind.id,
      text: ind.text,
    })),
    locations: (parsed.locations || []).map((loc: LinkedInGeoLocation) => ({
      id: loc.id,
      text: loc.text,
    })),
  };
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Agent4:LinkedInFilterBuilder] Complete in ${elapsed}s`);
  console.log(`[Agent4:LinkedInFilterBuilder] Titles: ${filters.titles.join(', ')}`);
  
  // Get industry/location texts safely
  const industryTexts = filters.industries.map(i => 
    typeof i === 'object' && 'text' in i ? i.text : String(i)
  );
  const locationTexts = filters.locations.map(l => 
    typeof l === 'object' && 'text' in l ? l.text : String(l)
  );
  console.log(`[Agent4:LinkedInFilterBuilder] Industries: ${industryTexts.join(', ')}`);
  console.log(`[Agent4:LinkedInFilterBuilder] Locations: ${locationTexts.join(', ')}`);

  return {
    filters,
    debug: {
      prompt,
      response: responseText,
    },
  };
}


import { ICPSettings, LinkedInGeoLocation, LinkedInIndustry } from '../types';

/**
 * LinkedIn Sales Navigator URL Builder
 * 
 * Supports two search modes:
 * - People Search: https://www.linkedin.com/sales/search/people?query=...
 * - Company Search: https://www.linkedin.com/sales/search/company?query=...
 * 
 * Filter types differ between modes:
 * 
 * PEOPLE SEARCH:
 * - CURRENT_TITLE: Job titles
 * - FUNCTION: Job function (Sales, Engineering, etc.)
 * - SENIORITY_LEVEL: C-Suite, VP, Director, Manager, etc.
 * - COMPANY_HEADCOUNT: Company size ranges
 * - INDUSTRY: Industry categories
 * - REGION: Person's geographic location
 * - COMPANY_HEADQUARTERS: Company HQ location
 * - CURRENT_COMPANY: Specific companies
 * 
 * COMPANY SEARCH:
 * - COMPANY_HEADCOUNT: Company size ranges
 * - INDUSTRY: Industry categories
 * - REGION: Company location
 */

export type SearchMode = 'people' | 'company';

// Seniority level mappings (people search only)
const SENIORITY_LEVELS: Record<string, { id: string; text: string }> = {
  'owner': { id: '1', text: 'Owner' },
  'partner': { id: '2', text: 'Partner' },
  'cxo': { id: '3', text: 'CXO' },
  'vp': { id: '4', text: 'VP' },
  'director': { id: '5', text: 'Director' },
  'manager': { id: '6', text: 'Manager' },
  'senior': { id: '7', text: 'Senior' },
  'entry': { id: '8', text: 'Entry' },
  'training': { id: '9', text: 'Training' },
};

// Company size mappings (headcount ranges)
const COMPANY_SIZES: Record<string, { id: string; text: string }> = {
  'self-employed': { id: 'A', text: 'Self-employed' },
  '1-10': { id: 'B', text: '1-10' },
  '11-50': { id: 'C', text: '11-50' },
  '51-200': { id: 'D', text: '51-200' },
  '201-500': { id: 'E', text: '201-500' },
  '501-1000': { id: 'F', text: '501-1000' },
  '1001-5000': { id: 'G', text: '1001-5000' },
  '5001-10000': { id: 'H', text: '5001-10000' },
  '10001+': { id: 'I', text: '10001+' },
};

// Industry mappings (common industries)
const INDUSTRIES: Record<string, { id: string; text: string }> = {
  'technology': { id: '6', text: 'Technology, Information and Media' },
  'software': { id: '4', text: 'Software Development' },
  'saas': { id: '4', text: 'Software Development' },
  'it services': { id: '96', text: 'IT Services and IT Consulting' },
  'marketing': { id: '80', text: 'Advertising Services' },
  'agency': { id: '80', text: 'Advertising Services' },
  'finance': { id: '43', text: 'Financial Services' },
  'healthcare': { id: '14', text: 'Hospitals and Health Care' },
  'e-commerce': { id: '27', text: 'Retail' },
  'real estate': { id: '44', text: 'Real Estate' },
  'manufacturing': { id: '112', text: 'Manufacturing' },
  'consulting': { id: '94', text: 'Business Consulting and Services' },
  'education': { id: '68', text: 'Education' },
  'professional services': { id: '94', text: 'Business Consulting and Services' },
};

// Region/Geography mappings (used for both REGION and COMPANY_HEADQUARTERS)
const REGIONS: Record<string, { id: string; text: string }> = {
  // Continents/Regions
  'north america': { id: '102221843', text: 'North America' },
  'europe': { id: '100506914', text: 'Europe' },
  'asia': { id: '102393603', text: 'Asia' },
  // Countries
  'united states': { id: '103644278', text: 'United States' },
  'usa': { id: '103644278', text: 'United States' },
  'us': { id: '103644278', text: 'United States' },
  'canada': { id: '101174742', text: 'Canada' },
  'united kingdom': { id: '101165590', text: 'United Kingdom' },
  'uk': { id: '101165590', text: 'United Kingdom' },
  'australia': { id: '101452733', text: 'Australia' },
  'germany': { id: '101282230', text: 'Germany' },
  'france': { id: '105015875', text: 'France' },
  'global': { id: '', text: '' }, // No filter = global
  // US States
  'california': { id: '102095887', text: 'California, United States' },
  'new york': { id: '105080838', text: 'New York, United States' },
  'texas': { id: '102748797', text: 'Texas, United States' },
  'florida': { id: '101318387', text: 'Florida, United States' },
  'washington': { id: '103977389', text: 'Washington, United States' },
  'massachusetts': { id: '103994340', text: 'Massachusetts, United States' },
};

// Title keywords to seniority mapping
const TITLE_TO_SENIORITY: Record<string, string[]> = {
  'ceo': ['cxo', 'owner'],
  'cto': ['cxo'],
  'cfo': ['cxo'],
  'cmo': ['cxo'],
  'coo': ['cxo'],
  'founder': ['owner', 'cxo'],
  'co-founder': ['owner', 'cxo'],
  'president': ['cxo'],
  'vp': ['vp'],
  'vice president': ['vp'],
  'director': ['director'],
  'head of': ['director', 'vp'],
  'manager': ['manager'],
  'owner': ['owner'],
  'partner': ['partner'],
};

interface Filter {
  type: string;
  values: Array<{ id: string; text: string; selectionType: string }>;
}

/**
 * Build a LinkedIn Sales Navigator PEOPLE search URL from ICP settings
 */
export function buildPeopleSearchUrl(icp: ICPSettings): string {
  const filters: Filter[] = [];

  // 1. Process titles - add as CURRENT_TITLE filter
  if (icp.titles.length > 0) {
    const titleValues = icp.titles.map(title => ({
      id: '', // CURRENT_TITLE uses text-based matching, not IDs
      text: title,
      selectionType: 'INCLUDED',
    }));
    
    filters.push({
      type: 'CURRENT_TITLE',
      values: titleValues,
    });
  }

  // 2. Extract seniority levels from titles
  const seniorityIds = new Set<string>();
  
  for (const title of icp.titles) {
    const lowerTitle = title.toLowerCase();
    
    for (const [keyword, seniorities] of Object.entries(TITLE_TO_SENIORITY)) {
      if (lowerTitle.includes(keyword)) {
        seniorities.forEach(s => seniorityIds.add(s));
      }
    }
  }

  // Add seniority filter if we found any
  if (seniorityIds.size > 0) {
    const seniorityValues = Array.from(seniorityIds)
      .map(s => SENIORITY_LEVELS[s])
      .filter(Boolean)
      .map(s => ({ id: s.id, text: s.text, selectionType: 'INCLUDED' }));
    
    if (seniorityValues.length > 0) {
      filters.push({
        type: 'SENIORITY_LEVEL',
        values: seniorityValues,
      });
    }
  }

  // 4. Process company size
  if (icp.companySize) {
    const sizeValues = parseCompanySize(icp.companySize);
    if (sizeValues.length > 0) {
      filters.push({
        type: 'COMPANY_HEADCOUNT',
        values: sizeValues,
      });
    }
  }

  // 5. Process industries
  if (icp.industries.length > 0) {
    const industryValues = parseIndustries(icp.industries);
    if (industryValues.length > 0) {
      filters.push({
        type: 'INDUSTRY',
        values: industryValues,
      });
    }
  }

  // 6. Process locations - for people search, use both REGION and COMPANY_HEADQUARTERS
  if (icp.locations.length > 0) {
    const regionValues = parseLocations(icp.locations);
    
    if (regionValues.length > 0) {
      // Add REGION filter (person's location)
      filters.push({
        type: 'REGION',
        values: regionValues,
      });
      
      // Also add COMPANY_HEADQUARTERS filter (company HQ location)
      filters.push({
        type: 'COMPANY_HEADQUARTERS',
        values: regionValues,
      });
    }
  }

  return buildUrl('people', filters);
}

/**
 * Build a LinkedIn Sales Navigator COMPANY search URL from ICP settings
 */
export function buildCompanySearchUrl(icp: ICPSettings): string {
  const filters: Filter[] = [];

  // 1. Process company size
  if (icp.companySize) {
    const sizeValues = parseCompanySize(icp.companySize);
    if (sizeValues.length > 0) {
      filters.push({
        type: 'COMPANY_HEADCOUNT',
        values: sizeValues,
      });
    }
  }

  // 2. Process industries
  if (icp.industries.length > 0) {
    const industryValues = parseIndustries(icp.industries);
    if (industryValues.length > 0) {
      filters.push({
        type: 'INDUSTRY',
        values: industryValues,
      });
    }
  }

  // 3. Process locations - for company search, use REGION only
  if (icp.locations.length > 0) {
    const regionValues = parseLocations(icp.locations);
    if (regionValues.length > 0) {
      filters.push({
        type: 'REGION',
        values: regionValues,
      });
    }
  }

  return buildUrl('company', filters);
}

/**
 * Build a Sales Navigator URL (legacy function for backwards compatibility)
 * Defaults to people search
 */
export function buildSalesNavigatorUrl(icp: ICPSettings, mode: SearchMode = 'people'): string {
  if (mode === 'company') {
    return buildCompanySearchUrl(icp);
  }
  return buildPeopleSearchUrl(icp);
}

// Helper functions

function parseCompanySize(companySize: string): Array<{ id: string; text: string; selectionType: string }> {
  const sizeRange = companySize.toLowerCase();
  const matchedSizes: Array<{ id: string; text: string; selectionType: string }> = [];
  
  for (const [key, value] of Object.entries(COMPANY_SIZES)) {
    if (sizeRange.includes(key) || sizeRange.includes(value.text.toLowerCase())) {
      matchedSizes.push({ ...value, selectionType: 'INCLUDED' });
    }
  }
  
  // If no exact match, try to parse range like "10-200 employees"
  if (matchedSizes.length === 0) {
    const rangeMatch = sizeRange.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1]);
      const max = parseInt(rangeMatch[2]);
      
      // Add all size ranges that overlap
      for (const [key, value] of Object.entries(COMPANY_SIZES)) {
        if (key === 'self-employed') continue;
        const [rangeMin, rangeMax] = key.split('-').map(s => parseInt(s.replace('+', '999999')));
        if (rangeMin <= max && rangeMax >= min) {
          matchedSizes.push({ ...value, selectionType: 'INCLUDED' });
        }
      }
    }
  }
  
  return matchedSizes;
}

function parseIndustries(industries: string[] | LinkedInIndustry[]): Array<{ id: string; text: string; selectionType: string }> {
  const industryValues: Array<{ id: string; text: string; selectionType: string }> = [];
  
  for (const industry of industries) {
    // Check if it's already a structured object with id
    if (typeof industry === 'object' && 'id' in industry && 'text' in industry) {
      // Already has LinkedIn ID - use directly
      if (!industryValues.some(v => v.id === industry.id)) {
        industryValues.push({ id: industry.id, text: industry.text, selectionType: 'INCLUDED' });
      }
    } else if (typeof industry === 'string') {
      // Legacy string format - try to match from our dictionary
      const lowerIndustry = industry.toLowerCase();
      const matched = INDUSTRIES[lowerIndustry];
      if (matched) {
        if (!industryValues.some(v => v.id === matched.id)) {
          industryValues.push({ ...matched, selectionType: 'INCLUDED' });
        }
      } else {
        // Unknown industry - log warning but skip
        console.warn(`[SalesNavUrlBuilder] Unknown industry: "${industry}" - skipping. Consider using structured format with LinkedIn ID.`);
      }
    }
  }
  
  return industryValues;
}

function parseLocations(locations: string[] | LinkedInGeoLocation[]): Array<{ id: string; text: string; selectionType: string }> {
  const regionValues: Array<{ id: string; text: string; selectionType: string }> = [];
  
  for (const location of locations) {
    // Check if it's already a structured object with id
    if (typeof location === 'object' && 'id' in location && 'text' in location) {
      // Already has LinkedIn geo ID - use directly
      if (location.id && !regionValues.some(v => v.id === location.id)) {
        regionValues.push({ id: location.id, text: location.text, selectionType: 'INCLUDED' });
      }
    } else if (typeof location === 'string') {
      // Legacy string format - try to match from our dictionary
      const lowerLocation = location.toLowerCase();
      const matched = REGIONS[lowerLocation];
      if (matched && matched.id) {
        if (!regionValues.some(v => v.id === matched.id)) {
          regionValues.push({ ...matched, selectionType: 'INCLUDED' });
        }
      } else {
        // Unknown location - log warning but skip
        console.warn(`[SalesNavUrlBuilder] Unknown location: "${location}" - skipping. Consider using structured format with LinkedIn geo ID.`);
      }
    }
  }
  
  return regionValues;
}

function buildUrl(mode: SearchMode, filters: Filter[]): string {
  const baseUrl = mode === 'company' 
    ? 'https://www.linkedin.com/sales/search/company'
    : 'https://www.linkedin.com/sales/search/people';

  // Build filters string
  let query: string;
  
  if (filters.length > 0) {
    const filtersStr = filters.map(f => {
      const valuesStr = f.values
        .map(v => {
          // CURRENT_TITLE uses text-only matching (no ID)
          if (f.type === 'CURRENT_TITLE') {
            return `(text:${v.text},selectionType:${v.selectionType})`;
          }
          return `(id:${v.id},text:${v.text},selectionType:${v.selectionType})`;
        })
        .join(',');
      return `(type:${f.type},values:List(${valuesStr}))`;
    }).join(',');
    
    query = `(filters:List(${filtersStr}))`;
  } else {
    query = '()';
  }
  
  // URL encode the query
  const encodedQuery = encodeURIComponent(query);
  
  // Generate session ID
  const sessionId = Buffer.from(Math.random().toString() + Date.now().toString())
    .toString('base64')
    .slice(0, 24);
  const encodedSessionId = encodeURIComponent(sessionId);
  
  const url = `${baseUrl}?query=${encodedQuery}&sessionId=${encodedSessionId}&viewAllFilters=true`;

  console.log(`[SalesNavUrlBuilder] Mode: ${mode}`);
  console.log(`[SalesNavUrlBuilder] Raw query: ${query}`);
  console.log(`[SalesNavUrlBuilder] URL: ${url}`);

  return url;
}

/**
 * Parse a Sales Navigator URL back to ICP settings (for debugging)
 */
export function parseSalesNavigatorUrl(url: string): Partial<ICPSettings> {
  const icp: Partial<ICPSettings> = {
    titles: [],
    industries: [],
    locations: [],
  };

  try {
    const urlObj = new URL(url);
    const query = urlObj.searchParams.get('query') || '';
    
    // Extract keywords
    const keywordsMatch = query.match(/keywords:([^,)]+)/);
    if (keywordsMatch) {
      icp.titles = decodeURIComponent(keywordsMatch[1]).split(' OR ').map(s => s.trim());
    }
  } catch (e) {
    console.error('[SalesNavUrlBuilder] Error parsing URL:', e);
  }

  return icp;
}


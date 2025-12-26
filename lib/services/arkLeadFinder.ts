/**
 * AI Ark People Search API Client
 * 
 * Alternative lead source to Apify's LinkedIn Sales Navigator scraper.
 * Uses AI Ark's database of 400M+ enriched profiles.
 * 
 * Advantages:
 * - Instant response (no polling needed)
 * - Richer data (skills, education, company financials)
 * - Not dependent on LinkedIn scraping
 * 
 * API Docs: https://docs.ai-ark.com/reference/people-search-1
 * 
 * Environment Variables:
 * - AI_ARK_TOKEN: Your AI Ark API token (required)
 * - AI_ARK_API_URL: Override the API URL if needed (optional)
 */

import { LinkedInLead, ICPSettings, LinkedInGeoLocation, LinkedInIndustry } from '../types';
import { LeadSearchResult } from './leadFinder';

// Default API URL from OpenAPI spec - can be overridden via AI_ARK_API_URL env var
// Base URL: https://api.ai-ark.com/api/developer-portal
// Endpoint: POST /v1/people
const DEFAULT_AI_ARK_API_URL = 'https://api.ai-ark.com/api/developer-portal/v1/people';

function getArkApiUrl(): string {
  return process.env.AI_ARK_API_URL || DEFAULT_AI_ARK_API_URL;
}

/**
 * AI Ark API response types (based on OpenAPI spec)
 */
interface ArkPerson {
  id?: string;
  identifier?: string;
  
  // Profile information
  profile?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    headline?: string;
    title?: string;
    picture?: { source?: string };
    summary?: string;
  };
  
  // Links
  link?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
  };
  
  // Location
  location?: {
    country?: string;
    state?: string;
    city?: string;
    default?: string;
    short?: string;
  };
  
  industry?: string;
  skills?: string[];
  
  // Education
  educations?: Array<{
    school?: { name?: string };
    degree_name?: string;
    field_of_study?: string;
  }>;
  
  // Work experience
  position_groups?: Array<{
    company?: {
      id?: string;
      name?: string;
      logo?: string;
      url?: string;
    };
    date?: { start?: string; end?: string | null };
    profile_positions?: Array<{
      company?: string;
      title?: string;
      employment_type?: string;
      location?: string;
      date?: { start?: string; end?: string | null };
    }>;
  }>;
  
  // Current company info
  company?: {
    id?: string;
    summary?: {
      name?: string;
      description?: string;
      industry?: string;
      staff?: { total?: number; range?: { start?: number; end?: number } };
      logo?: { source?: string };
    };
    link?: {
      website?: string;
      domain?: string;
      linkedin?: string;
    };
    location?: {
      headquarter?: {
        country?: string;
        city?: string;
      };
    };
  };
  
  // Department/Seniority
  department?: {
    departments?: string[];
    functions?: string[];
    seniority?: string;
  };
}

interface ArkSearchResponse {
  content?: ArkPerson[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
  // Error response structure
  timestamp?: string;
  status?: number;
  error?: string;
  path?: string;
}

/**
 * Map company size string to AI Ark employee size ranges
 * Returns array of {start, end} objects per OpenAPI spec
 */
function mapCompanySizeToArkRanges(companySize: string): Array<{start: number; end: number}> {
  const size = companySize.toLowerCase();
  const ranges: Array<{start: number; end: number}> = [];
  
  // Standard size ranges from OpenAPI spec
  const standardRanges = [
    { key: '1-10', start: 1, end: 10 },
    { key: '11-50', start: 11, end: 50 },
    { key: '51-200', start: 51, end: 200 },
    { key: '201-500', start: 201, end: 500 },
    { key: '501-1000', start: 501, end: 1000 },
    { key: '1001-5000', start: 1001, end: 5000 },
    { key: '5001-10000', start: 5001, end: 10000 },
    { key: '10001+', start: 10001, end: 100000 },
  ];
  
  // Match keywords to ranges
  if (size.includes('1-10') || size.includes('self-employed')) {
    ranges.push({ start: 1, end: 10 });
  }
  if (size.includes('11-50') || size.includes('small')) {
    ranges.push({ start: 1, end: 10 }, { start: 11, end: 50 });
  }
  if (size.includes('51-200') || size.includes('medium') || size.includes('mid')) {
    ranges.push({ start: 51, end: 200 }, { start: 201, end: 500 });
  }
  if (size.includes('501-1000') || size.includes('large')) {
    ranges.push({ start: 501, end: 1000 }, { start: 1001, end: 5000 });
  }
  if (size.includes('enterprise') || size.includes('10000')) {
    ranges.push({ start: 5001, end: 10000 }, { start: 10001, end: 100000 });
  }
  
  // Parse numeric ranges like "50-500"
  if (ranges.length === 0) {
    const rangeMatch = size.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1]);
      const max = parseInt(rangeMatch[2]);
      
      // Find overlapping standard ranges
      for (const range of standardRanges) {
        if (range.start <= max && range.end >= min) {
          ranges.push({ start: range.start, end: range.end });
        }
      }
      
      // If no overlaps, use the parsed range directly
      if (ranges.length === 0) {
        ranges.push({ start: min, end: max });
      }
    }
  }
  
  // Deduplicate ranges
  return ranges.filter((range, index, self) => 
    index === self.findIndex(r => r.start === range.start && r.end === range.end)
  );
}

/**
 * Extract location strings for AI Ark API
 */
function mapLocationsToArk(locations: string[] | LinkedInGeoLocation[]): string[] {
  return locations.map(loc => {
    if (typeof loc === 'object' && 'text' in loc) {
      return loc.text;
    }
    return loc as string;
  });
}

/**
 * Extract industry strings for AI Ark API
 */
function mapIndustriesToArk(industries: string[] | LinkedInIndustry[]): string[] {
  return industries.map(ind => {
    if (typeof ind === 'object' && 'text' in ind) {
      return ind.text;
    }
    return ind as string;
  });
}

/**
 * Normalize AI Ark person to LinkedInLead format
 * This ensures downstream code (emailWriter, etc.) works unchanged
 */
function normalizeToLinkedInLead(person: ArkPerson): LinkedInLead {
  // Find current position from position_groups
  const currentPositionGroup = person.position_groups?.find(pg => 
    pg.date?.end === null || !pg.date?.end
  ) || person.position_groups?.[0];
  const currentPosition = currentPositionGroup?.profile_positions?.[0];
  
  // Extract LinkedIn profile ID from URL
  const linkedinUrl = person.link?.linkedin || '';
  const profileIdMatch = linkedinUrl.match(/linkedin\.com\/in\/([^/]+)/);
  const profileId = profileIdMatch?.[1] || person.identifier || person.id || '';
  
  return {
    about: person.profile?.summary || person.profile?.headline || '',
    company: person.company?.summary?.name || currentPositionGroup?.company?.name || currentPosition?.company || '',
    company_id: person.company?.id || currentPositionGroup?.company?.id || '',
    first_name: person.profile?.first_name || '',
    full_name: person.profile?.full_name || `${person.profile?.first_name || ''} ${person.profile?.last_name || ''}`.trim(),
    job_title: person.profile?.title || currentPosition?.title || person.profile?.headline || '',
    last_name: person.profile?.last_name || '',
    linkedin_url: linkedinUrl,
    location: person.location?.default || person.location?.short || 
              [person.location?.city, person.location?.state, person.location?.country].filter(Boolean).join(', '),
    profile_id: profileId,
    
    // Additional fields
    profile_picture: person.profile?.picture?.source,
    headline: person.profile?.headline,
    current_company: person.company?.summary?.name || currentPositionGroup?.company?.name,
    current_title: person.profile?.title || currentPosition?.title,
    positions: person.position_groups?.flatMap(pg => 
      pg.profile_positions?.map(pos => ({
        title: pos.title || '',
        company: pos.company || pg.company?.name || '',
        company_id: pg.company?.id,
        is_current: !pg.date?.end,
        start_date: pos.date?.start || pg.date?.start,
        end_date: (pos.date?.end || pg.date?.end) ?? undefined,  // Convert null to undefined
      })) || []
    ),
  };
}

/**
 * Search for people using AI Ark People Search API
 * 
 * @param icpSettings - ICP filter settings (titles, industries, locations, company size)
 * @param limit - Maximum number of results to return
 * @returns LeadSearchResult with normalized leads
 */
export async function searchPeopleWithArk(
  icpSettings: ICPSettings,
  limit: number = 25
): Promise<LeadSearchResult> {
  const token = process.env.AI_ARK_TOKEN;
  
  if (!token) {
    console.error('[ArkLeadFinder] AI_ARK_TOKEN environment variable is not set');
    return {
      requestId: 'ark-error',
      status: 'error',
      message: 'AI Ark API token not configured. Set AI_ARK_TOKEN environment variable.',
      leads: [],
    };
  }

  console.log('[ArkLeadFinder] Searching with AI Ark API...');
  console.log('[ArkLeadFinder] Filters:', {
    titles: icpSettings.titles,
    industries: icpSettings.industries,
    locations: icpSettings.locations,
    companySize: icpSettings.companySize,
  });

  try {
    // Build the request body per OpenAPI spec
    // Required: page (0-based), size (max 100)
    const requestBody: Record<string, unknown> = {
      page: 0,  // 0-based pagination
      size: Math.min(limit, 100),  // Max 100 per request
    };

    // Contact filters (person-level) - uses nested any/all with include/exclude
    const contactFilters: Record<string, unknown> = {};
    
    // Job titles filter using experience.current.title
    if (icpSettings.titles && icpSettings.titles.length > 0) {
      contactFilters.experience = {
        current: {
          title: {
            any: {
              include: {
                mode: 'SMART',
                content: icpSettings.titles,
              },
            },
          },
        },
      };
    }
    
    // Location filter
    if (icpSettings.locations && icpSettings.locations.length > 0) {
      contactFilters.location = {
        any: {
          include: mapLocationsToArk(icpSettings.locations),
        },
      };
    }

    if (Object.keys(contactFilters).length > 0) {
      requestBody.contact = contactFilters;
    }

    // Account filters (company-level)
    const accountFilters: Record<string, unknown> = {};
    
    // Industry filter
    if (icpSettings.industries && icpSettings.industries.length > 0) {
      const arkIndustries = mapIndustriesToArk(icpSettings.industries);
      accountFilters.industry = {
        any: {
          include: arkIndustries.map(i => i.toLowerCase()),
        },
      };
    }
    
    // Employee size filter - uses RANGE type with start/end ranges
    if (icpSettings.companySize) {
      const sizeRanges = mapCompanySizeToArkRanges(icpSettings.companySize);
      if (sizeRanges.length > 0) {
        accountFilters.employeeSize = {
          type: 'RANGE',
          range: sizeRanges,
        };
      }
    }

    if (Object.keys(accountFilters).length > 0) {
      requestBody.account = accountFilters;
    }

    const apiUrl = getArkApiUrl();
    console.log('[ArkLeadFinder] API URL:', apiUrl);
    console.log('[ArkLeadFinder] Request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TOKEN': token,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ArkLeadFinder] API error: ${response.status} - ${errorText}`);
      return {
        requestId: 'ark-error',
        status: 'error',
        message: `AI Ark API error: ${response.status} - ${errorText}`,
        leads: [],
      };
    }

    const data: ArkSearchResponse = await response.json();
    
    // Check for error response (404 or other errors)
    if (data.error || data.status === 404) {
      console.error('[ArkLeadFinder] API returned error:', data.error);
      return {
        requestId: 'ark-error',
        status: 'error',
        message: data.error || 'Data not found',
        leads: [],
      };
    }

    // Response uses 'content' array per OpenAPI spec
    if (!data.content || data.content.length === 0 || data.empty) {
      console.log('[ArkLeadFinder] No results found');
      return {
        requestId: 'ark-empty',
        status: 'complete',
        message: 'No leads found matching the criteria',
        leads: [],
        totalCount: 0,
      };
    }

    console.log(`[ArkLeadFinder] Found ${data.content.length} leads (total: ${data.totalElements})`);
    
    // Log sample lead for debugging
    if (data.content[0]) {
      console.log('[ArkLeadFinder] Sample lead raw:', JSON.stringify(data.content[0], null, 2));
    }

    // Normalize leads to LinkedInLead format
    const normalizedLeads = data.content.map(normalizeToLinkedInLead);
    
    console.log('[ArkLeadFinder] Sample normalized lead:', JSON.stringify(normalizedLeads[0], null, 2));

    return {
      requestId: 'ark-complete',
      status: 'complete',
      leads: normalizedLeads,
      totalCount: data.totalElements || normalizedLeads.length,
    };

  } catch (error) {
    console.error('[ArkLeadFinder] Error calling AI Ark API:', error);
    return {
      requestId: 'ark-error',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error calling AI Ark API',
      leads: [],
    };
  }
}

/**
 * Check if AI Ark is configured and available
 */
export function isArkConfigured(): boolean {
  return !!process.env.AI_ARK_TOKEN;
}

/**
 * Check if we should use AI Ark based on LEAD_SOURCE env variable
 * LEAD_SOURCE=0 or undefined: Use Apify (default)
 * LEAD_SOURCE=1: Use AI Ark
 */
export function shouldUseArk(): boolean {
  return process.env.LEAD_SOURCE === '1';
}


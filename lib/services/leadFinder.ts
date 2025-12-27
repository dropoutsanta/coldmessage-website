import { ApifyClient } from 'apify-client';
import { LinkedInLead, ApifySearchResult, ICPSettings } from '../types';
import { buildSalesNavigatorUrl } from './salesNavUrlBuilder';
import { searchPeopleWithArk, shouldUseArk, isArkConfigured } from './arkLeadFinder';
import { icypeasClient } from './icypeas';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const ACTOR_ID = 'freshdata/linkedin-sales-navigator-scraper';

export interface LeadSearchResult {
  requestId: string;
  status: 'initiated' | 'processing' | 'complete' | 'error';
  leads?: LinkedInLead[];
  totalCount?: number;
  totalPages?: number;  // Pagination metadata (for AI Ark)
  message?: string;
}

/**
 * Unified lead finder that dispatches to the appropriate source based on LEAD_SOURCE env variable
 * 
 * LEAD_SOURCE=0 or undefined: Use Apify/LinkedIn Sales Navigator (default)
 * LEAD_SOURCE=1: Use AI Ark People Search API
 * 
 * @param icpSettings - ICP filter settings
 * @param salesNavigatorUrl - Optional Sales Navigator URL (only used for Apify)
 * @param limit - Maximum number of leads to return
 */
export async function findLeads(
  icpSettings: ICPSettings,
  salesNavigatorUrl?: string,
  limit: number = 25
): Promise<LeadSearchResult> {
  // Check if we should use AI Ark
  if (shouldUseArk()) {
    console.log('[LeadFinder] Using AI Ark as lead source (LEAD_SOURCE=1)');
    
    if (!isArkConfigured()) {
      console.error('[LeadFinder] AI_ARK_TOKEN not configured but LEAD_SOURCE=1');
      return {
        requestId: 'config-error',
        status: 'error',
        message: 'AI Ark selected but AI_ARK_TOKEN not configured',
        leads: [],
      };
    }
    
    // AI Ark doesn't support Sales Navigator URLs, uses ICP directly
    if (salesNavigatorUrl) {
      console.log('[LeadFinder] Note: Sales Navigator URL ignored when using AI Ark');
    }
    
    // AI Ark returns results synchronously - no polling needed!
    return searchPeopleWithArk(icpSettings, limit);
  }
  
  // Default: Use Apify/LinkedIn Sales Navigator
  console.log('[LeadFinder] Using Apify as lead source (LEAD_SOURCE=0 or undefined)');
  
  // If a Sales Navigator URL is provided, use it directly
  if (salesNavigatorUrl) {
    const result = await initializeLeadSearch(salesNavigatorUrl, limit);
    
    // If initiated, wait for results
    if (result.status === 'initiated' && result.requestId) {
      return waitForLeadResults(result.requestId);
    }
    
    return result;
  }
  
  // Otherwise, build URL from ICP settings
  const url = buildSalesNavigatorUrl(icpSettings);
  const result = await initializeLeadSearch(url, limit);
  
  // If initiated, wait for results
  if (result.status === 'initiated' && result.requestId) {
    return waitForLeadResults(result.requestId);
  }
  
  return result;
}

/**
 * Initialize a LinkedIn Sales Navigator search
 * Requires a Sales Navigator URL with search filters
 */
export async function initializeLeadSearch(
  salesNavigatorUrl: string,
  limit: number = 25
): Promise<LeadSearchResult> {
  console.log(`[LeadFinder] Initializing search with limit ${limit}...`);

  try {
    const run = await apifyClient.actor(ACTOR_ID).call({
      sales_url: salesNavigatorUrl,
      limit: limit,
    });

    // Get results from the run's dataset
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    
    const result = items[0] as ApifySearchResult | undefined;

    if (result?.request_id) {
      console.log(`[LeadFinder] Search initiated with request_id: ${result.request_id}`);
      return {
        requestId: result.request_id,
        status: 'initiated',
        message: result.message,
      };
    }

    throw new Error('No request_id returned from search');
  } catch (error) {
    console.error('[LeadFinder] Error initializing search:', error);
    throw error;
  }
}

/**
 * Fetch results from an existing search
 */
export async function fetchLeadResults(
  requestId: string,
  page: number = 1
): Promise<LeadSearchResult> {
  console.log(`[LeadFinder] Fetching results for ${requestId}, page ${page}...`);

  try {
    const run = await apifyClient.actor(ACTOR_ID).call({
      request_id: requestId,
      page: page,
    });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const result = items[0] as ApifySearchResult | undefined;

    if (!result) {
      throw new Error('No results returned');
    }

    if (result.status === 'processing' || result.status === 'pending') {
      console.log(`[LeadFinder] Search still ${result.status}...`);
      return {
        requestId: requestId,
        status: 'processing',
        message: result.message,
      };
    }

    if (result.data && result.data.length > 0) {
      console.log(`[LeadFinder] Found ${result.data.length} leads`);
      
      // DEBUG: Log the raw data structure to understand what fields are available
      // This helps diagnose issues where secondary positions are returned instead of primary
      if (result.data[0]) {
        console.log(`[LeadFinder] Sample lead raw fields:`, JSON.stringify(result.data[0], null, 2));
      }
      
      return {
        requestId: requestId,
        status: 'complete',
        leads: result.data,
        totalCount: result.total_count,
      };
    }

    return {
      requestId: requestId,
      status: 'processing',
      message: 'Waiting for results...',
    };
  } catch (error) {
    console.error('[LeadFinder] Error fetching results:', error);
    throw error;
  }
}

/**
 * Poll for results with retry logic
 * LinkedIn searches can take 1-5 minutes for the queue to process
 * Note: Each poll spins up a new Actor container, so we poll less frequently
 */
export async function waitForLeadResults(
  requestId: string,
  maxAttempts: number = 15,  // Reduced - each attempt costs $$
  delayMs: number = 30000   // 30 seconds between polls (Actor takes ~3s to run anyway)
): Promise<LeadSearchResult> {
  const totalWaitTime = (maxAttempts * delayMs) / 1000 / 60;
  console.log(`[LeadFinder] Waiting for results (max ${maxAttempts} attempts, ~${totalWaitTime.toFixed(1)} min timeout)...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const elapsedMin = ((attempt - 1) * delayMs / 1000 / 60).toFixed(1);
    console.log(`[LeadFinder] Attempt ${attempt}/${maxAttempts} (${elapsedMin} min elapsed)...`);
    
    try {
      const result = await fetchLeadResults(requestId);
      
      if (result.status === 'complete' && result.leads) {
        console.log(`[LeadFinder] ✓ Search complete! Found ${result.leads.length} leads`);
        return result;
      }
      
      // Log the current status for visibility
      if (result.message) {
        console.log(`[LeadFinder] Status: ${result.message}`);
      }
    } catch (fetchError) {
      console.error(`[LeadFinder] Fetch error on attempt ${attempt}:`, fetchError);
      // Continue polling - transient errors are common
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  // Return empty result instead of throwing - let the caller handle fallback
  console.warn(`[LeadFinder] Search timed out after ${totalWaitTime.toFixed(1)} minutes`);
  return {
    requestId,
    status: 'error',
    message: 'Search timed out - LinkedIn may be slow or the search is too broad',
    leads: [],
  };
}

/**
 * Build a Sales Navigator URL from ICP settings
 * Uses the salesNavUrlBuilder service
 */
export function buildSalesNavUrl(icp: ICPSettings): string {
  return buildSalesNavigatorUrl(icp);
}

/**
 * Find leads with email addresses using the "tango dance" between AI Ark and Icypeas
 * 
 * This function:
 * 1. Fetches batches of leads from AI Ark (with pagination)
 * 2. Enriches each batch with Icypeas to find email addresses
 * 3. Keeps only leads where email was found
 * 4. Continues until target count is reached or source is exhausted
 * 
 * @param icpSettings - ICP filter settings
 * @param targetCount - Target number of leads WITH emails to return
 * @returns LeadSearchResult with enriched leads (email field populated)
 */
export async function findLeadsWithEmails(
  icpSettings: ICPSettings,
  targetCount: number
): Promise<LeadSearchResult> {
  // This function only works with AI Ark (needs pagination)
  if (!shouldUseArk()) {
    console.warn('[LeadFinder] findLeadsWithEmails() requires AI Ark (LEAD_SOURCE=1). Falling back to regular findLeads().');
    return findLeads(icpSettings, undefined, targetCount);
  }

  if (!isArkConfigured()) {
    return {
      requestId: 'config-error',
      status: 'error',
      message: 'AI Ark selected but AI_ARK_TOKEN not configured',
      leads: [],
    };
  }

  console.log(`[LeadFinder] Starting email enrichment tango - target: ${targetCount} leads with emails`);

  const enrichedLeads: LinkedInLead[] = [];
  let page = 0;
  let totalPages = 1;
  const batchSize = 100; // AI Ark max per page

  while (enrichedLeads.length < targetCount && page < totalPages) {
    console.log(`[LeadFinder] Fetching page ${page} from AI Ark (${enrichedLeads.length}/${targetCount} leads with emails so far)...`);

    // 1. Fetch batch from AI Ark
    const batch = await searchPeopleWithArk(icpSettings, batchSize, page);
    
    if (batch.status === 'error' || !batch.leads || batch.leads.length === 0) {
      console.warn(`[LeadFinder] No leads returned from AI Ark at page ${page}. Stopping.`);
      break;
    }

    // Update totalPages from response
    if (batch.totalPages !== undefined) {
      totalPages = batch.totalPages;
    }

    console.log(`[LeadFinder] Fetched ${batch.leads.length} leads from AI Ark. Enriching with Icypeas...`);

    // 2. Enrich with Icypeas (parallel batches of 10)
    const enriched = await icypeasClient.enrichLeadsBatch(batch.leads, 10, 100);

    // 3. Keep only leads with emails
    const withEmails = enriched.filter(lead => lead.email);
    console.log(`[LeadFinder] Found emails for ${withEmails.length}/${batch.leads.length} leads in this batch`);

    enrichedLeads.push(...withEmails);

    // If we've reached the target, break early
    if (enrichedLeads.length >= targetCount) {
      console.log(`[LeadFinder] ✓ Target reached! Found ${enrichedLeads.length} leads with emails`);
      break;
    }

    // If no more pages, break
    if (page >= totalPages - 1) {
      console.log(`[LeadFinder] Source exhausted. Found ${enrichedLeads.length} leads with emails (target: ${targetCount})`);
      break;
    }

    page++;
  }

  // Return capped at target count
  const finalLeads = enrichedLeads.slice(0, targetCount);

  return {
    requestId: 'enriched',
    status: 'complete',
    leads: finalLeads,
    totalCount: finalLeads.length,
    message: `Found ${finalLeads.length} leads with emails (target: ${targetCount})`,
  };
}


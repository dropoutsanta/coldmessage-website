import { ApifyClient } from 'apify-client';
import { LinkedInLead, ApifySearchResult, ICPSettings } from '../types';
import { buildSalesNavigatorUrl } from './salesNavUrlBuilder';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const ACTOR_ID = 'freshdata/linkedin-sales-navigator-scraper';

export interface LeadSearchResult {
  requestId: string;
  status: 'initiated' | 'processing' | 'complete' | 'error';
  leads?: LinkedInLead[];
  totalCount?: number;
  message?: string;
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


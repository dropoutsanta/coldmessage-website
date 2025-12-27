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
  let totalLeadsFetched = 0;
  let consecutiveEmptyBatches = 0;
  
  // Smart batch sizing: request ~2x target to account for email discovery rate (~50%)
  // but cap at 100 (AI Ark max). For small targets, don't over-fetch.
  const batchSize = Math.min(100, Math.max(10, targetCount * 2));
  
  // Safety limits to prevent runaway API calls
  const MAX_PAGES = 10;  // Never fetch more than 10 pages
  const MAX_EMPTY_BATCHES = 3;  // Stop if 3 consecutive batches have 0 emails
  
  // ABSOLUTE HARD CAP - prevents runaway costs regardless of targetCount
  // Default 200 leads from AI Ark = ~$6 at $0.03/lead
  // Override with MAX_ARK_LEADS env var
  const ABSOLUTE_MAX_ARK_LEADS = process.env.MAX_ARK_LEADS 
    ? parseInt(process.env.MAX_ARK_LEADS, 10) 
    : 200;
  const MAX_LEADS = Math.min(ABSOLUTE_MAX_ARK_LEADS, targetCount * 10);
  
  console.log(`[LeadFinder] Batch size: ${batchSize} (target: ${targetCount}, max AI Ark leads: ${MAX_LEADS}, max pages: ${MAX_PAGES})`);

  while (enrichedLeads.length < targetCount && page < totalPages) {
    // Safety check: max pages
    if (page >= MAX_PAGES) {
      console.warn(`[LeadFinder] ⚠️ Hit MAX_PAGES limit (${MAX_PAGES}). Stopping to prevent runaway API calls.`);
      break;
    }
    
    // Safety check: max leads fetched
    if (totalLeadsFetched >= MAX_LEADS) {
      console.warn(`[LeadFinder] ⚠️ Hit MAX_LEADS limit (${MAX_LEADS}). Stopping to prevent runaway API calls.`);
      break;
    }
    
    // Safety check: consecutive empty batches (Icypeas probably down or out of credits)
    if (consecutiveEmptyBatches >= MAX_EMPTY_BATCHES) {
      console.warn(`[LeadFinder] ⚠️ ${MAX_EMPTY_BATCHES} consecutive batches with 0 emails. Icypeas may be down or out of credits. Stopping.`);
      break;
    }
    
    console.log(`[LeadFinder] Fetching page ${page} from AI Ark (${enrichedLeads.length}/${targetCount} leads with emails so far)...`);

    // 1. Fetch batch from AI Ark
    const batch = await searchPeopleWithArk(icpSettings, batchSize, page);
    
    if (batch.status === 'error' || !batch.leads || batch.leads.length === 0) {
      console.warn(`[LeadFinder] No leads returned from AI Ark at page ${page}. Stopping.`);
      break;
    }
    
    totalLeadsFetched += batch.leads.length;

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
    
    // Track consecutive empty batches
    if (withEmails.length === 0) {
      consecutiveEmptyBatches++;
    } else {
      consecutiveEmptyBatches = 0;  // Reset counter
    }

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
  
  // Estimated costs: AI Ark ~$0.03/lead, Icypeas ~$0.01/lookup
  const estimatedArkCost = (totalLeadsFetched * 0.03).toFixed(2);
  const estimatedIcypeasCost = (totalLeadsFetched * 0.01).toFixed(2);
  console.log(`[LeadFinder] Summary: Fetched ${totalLeadsFetched} leads from AI Ark (~$${estimatedArkCost}), ${enrichedLeads.length} with emails. Icypeas lookups: ${totalLeadsFetched} (~$${estimatedIcypeasCost})`);

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


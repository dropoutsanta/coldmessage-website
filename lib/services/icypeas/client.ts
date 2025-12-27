import {
  IcypeasEmailSearchRequest,
  IcypeasEmailSearchResponse,
  IcypeasSearchResultResponse,
  IcypeasSearchStatus,
} from './types';

const ICYPEAS_API_URL = process.env.ICYPEAS_API_URL || 'https://app.icypeas.com/api';
const ICYPEAS_API_KEY = process.env.ICYPEAS_API_KEY;

if (!ICYPEAS_API_KEY) {
  console.warn('ICYPEAS_API_KEY is not set. Icypeas API calls will fail.');
}

class IcypeasClient {
  private apiUrl: string;
  private apiKey: string | undefined;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100; // 100ms between requests = max 10/sec

  constructor() {
    this.apiUrl = ICYPEAS_API_URL;
    this.apiKey = ICYPEAS_API_KEY;
  }

  /**
   * Throttle requests to avoid rate limiting
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minRequestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retries: number = 3
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('ICYPEAS_API_KEY is not configured');
    }

    await this.throttle();

    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retries > 0) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      const backoffMs = Math.max(retryAfter * 1000, 2000 * (4 - retries)); // Exponential backoff
      console.log(`[Icypeas] Rate limited. Waiting ${backoffMs}ms before retry (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return this.request<T>(endpoint, options, retries - 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Icypeas API error (${response.status}): ${errorText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Initiate an email search
   * Returns a search ID that can be used to poll for results
   */
  async searchEmail(
    firstname: string,
    lastname: string,
    domainOrCompany: string
  ): Promise<IcypeasEmailSearchResponse> {
    const requestBody: IcypeasEmailSearchRequest = {
      firstname,
      lastname,
      domainOrCompany,
    };

    return this.request<IcypeasEmailSearchResponse>(
      '/email-search',
      {
        method: 'POST',
        body: JSON.stringify(requestBody),
      }
    );
  }

  /**
   * Get the result of a search by ID
   * Use this to poll for results after initiating a search
   */
  async getSearchResult(id: string): Promise<IcypeasSearchResultResponse> {
    return this.request<IcypeasSearchResultResponse>(
      '/bulk-single-searchs/read',
      {
        method: 'POST',
        body: JSON.stringify({ id }),
      }
    );
  }

  /**
   * Find an email address (convenience method that handles polling)
   * Polls until status is DEBITED or max attempts reached
   * 
   * @param firstname - Person's first name
   * @param lastname - Person's last name
   * @param domainOrCompany - Company domain (e.g., "acme.com") or company name
   * @param maxAttempts - Maximum number of polling attempts (default: 10)
   * @param pollDelayMs - Delay between polls in milliseconds (default: 1000)
   * @returns Email address if found, null otherwise
   */
  async findEmail(
    firstname: string,
    lastname: string,
    domainOrCompany: string,
    maxAttempts: number = 10,
    pollDelayMs: number = 1000
  ): Promise<string | null> {
    try {
      // Initiate search
      const searchResponse = await this.searchEmail(firstname, lastname, domainOrCompany);
      
      // API returns { success: true, item: { _id: "...", status: "NONE" } }
      const searchId = searchResponse.item?._id;

      if (!searchId) {
        // Log full response for debugging - could indicate credits exhausted or API error
        console.warn(`[Icypeas] No search ID returned for ${firstname} ${lastname} at ${domainOrCompany}. Response:`, JSON.stringify(searchResponse));
        return null;
      }

      // Poll for results
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollDelayMs));

        const result = await this.getSearchResult(searchId);
        
        // API returns { success: true, items: [{ _id, status, results: { emails: [{email, certainty}] } }] }
        const item = result.items?.[0];
        
        if (!item) {
          console.warn(`[Icypeas] No item in poll response for ${firstname} ${lastname} at ${domainOrCompany}`);
          continue;
        }

        // FOUND or NOT_FOUND means search is complete
        if (item.status === 'FOUND') {
          const email = item.results?.emails?.[0]?.email;
          if (email) {
            return email;
          }
          // Status is FOUND but no email in results
          return null;
        }
        
        if (item.status === 'NOT_FOUND') {
          // Search completed but no email found
          return null;
        }

        // DEBITED means credits were used - check for email in results
        if (item.status === 'DEBITED') {
          const email = item.results?.emails?.[0]?.email;
          return email || null;
        }

        // DEBITED_NOT_FOUND means credits used but no email found
        if (item.status === 'DEBITED_NOT_FOUND') {
          return null;
        }

        // If still processing, continue polling
        if (item.status === 'NONE' || item.status === 'SCHEDULED' || item.status === 'IN_PROGRESS') {
          continue;
        }

        // Unknown status, log and assume failure
        console.warn(`[Icypeas] Unknown status "${item.status}" for ${firstname} ${lastname} at ${domainOrCompany}`);
        return null;
      }

      // Max attempts reached
      console.warn(`[Icypeas] Max polling attempts reached for ${firstname} ${lastname} at ${domainOrCompany}`);
      return null;
    } catch (error) {
      console.error(`[Icypeas] Error finding email for ${firstname} ${lastname} at ${domainOrCompany}:`, error);
      return null;
    }
  }

  /**
   * Enrich multiple leads with emails in parallel batches
   * Respects Icypeas 10 RPS rate limit via per-request throttling
   * 
   * @param leads - Array of leads to enrich
   * @param batchSize - Number of concurrent requests (default: 5)
   * @param batchDelayMs - Delay between batches in milliseconds (default: 500ms)
   * @returns Array of leads with email field populated (if found)
   */
  async enrichLeadsBatch<T extends { first_name: string; last_name: string; company?: string; company_domain?: string; email?: string }>(
    leads: T[],
    batchSize: number = 5,
    batchDelayMs: number = 500
  ): Promise<T[]> {
    const enrichedLeads: T[] = [];

    // Process in batches
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (lead) => {
        // Skip if already has email
        if (lead.email) {
          return lead;
        }

        // Use company_domain if available, otherwise extract from company name
        const domain = lead.company_domain || this.extractDomain(lead.company || '');
        
        if (!domain) {
          console.warn(`[Icypeas] No domain found for ${lead.first_name} ${lead.last_name} at ${lead.company}`);
          return lead;
        }

        const email = await this.findEmail(lead.first_name, lead.last_name, domain);
        
        return {
          ...lead,
          email: email || undefined,
        };
      });

      const batchResults = await Promise.all(batchPromises);
      enrichedLeads.push(...batchResults);

      // Delay between batches to respect rate limit (except for last batch)
      if (i + batchSize < leads.length) {
        await new Promise(resolve => setTimeout(resolve, batchDelayMs));
      }
    }

    return enrichedLeads;
  }

  /**
   * Extract domain from company name or URL
   * Handles various formats: "acme.com", "https://www.acme.com", "Acme Inc"
   */
  private extractDomain(company: string): string | null {
    if (!company) return null;

    // If it's already a domain (contains .com, .io, etc.)
    const domainMatch = company.match(/([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/);
    if (domainMatch) {
      return domainMatch[0].toLowerCase();
    }

    // If it's a URL, extract domain
    try {
      const url = new URL(company.startsWith('http') ? company : `https://${company}`);
      return url.hostname.replace(/^www\./, '');
    } catch {
      // Not a valid URL, return company name as fallback
      // Icypeas accepts company names too
      return company.trim();
    }
  }
}

export const icypeasClient = new IcypeasClient();


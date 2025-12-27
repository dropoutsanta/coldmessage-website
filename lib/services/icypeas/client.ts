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

  constructor() {
    this.apiUrl = ICYPEAS_API_URL;
    this.apiKey = ICYPEAS_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('ICYPEAS_API_KEY is not configured');
    }

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
      const searchId = searchResponse._id;

      if (!searchId) {
        console.warn(`[Icypeas] No search ID returned for ${firstname} ${lastname} at ${domainOrCompany}`);
        return null;
      }

      // If already complete, return email
      if (searchResponse.status === 'DEBITED' && searchResponse.email) {
        return searchResponse.email;
      }

      // Poll for results
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollDelayMs));

        const result = await this.getSearchResult(searchId);

        if (result.status === 'DEBITED') {
          if (result.email) {
            return result.email;
          }
          // Status is DEBITED but no email - search completed but email not found
          return null;
        }

        // If still processing, continue polling
        if (result.status === 'NONE' || result.status === 'SCHEDULED' || result.status === 'IN_PROGRESS') {
          continue;
        }

        // Unknown status, assume failure
        console.warn(`[Icypeas] Unknown status "${result.status}" for ${firstname} ${lastname} at ${domainOrCompany}`);
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
   * Respects 10 requests/second rate limit
   * 
   * @param leads - Array of leads to enrich
   * @param batchSize - Number of concurrent requests (default: 10)
   * @param batchDelayMs - Delay between batches in milliseconds (default: 100)
   * @returns Array of leads with email field populated (if found)
   */
  async enrichLeadsBatch<T extends { first_name: string; last_name: string; company?: string; company_domain?: string; email?: string }>(
    leads: T[],
    batchSize: number = 10,
    batchDelayMs: number = 100
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

